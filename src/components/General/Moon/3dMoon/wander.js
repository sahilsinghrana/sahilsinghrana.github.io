import { Quaternion, Vector3 } from "three";

// Analytic spherical steering; fixed steps make seeded runs independent of refresh
// rate. Three.js vector/scene-graph patterns: threejs.org/manual/pages/scenegraph.html.
export function createRandom(seed) {
  // Per-scene version of Three.js MathUtils.seededRandom's Mulberry32 generator.
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createWalker(
  normal,
  { radius = 0.035, speed = 0.03, boundAngle = Math.PI, heading = 0 } = {},
) {
  const up = normal.clone().normalize();
  const forward = new Vector3(Math.cos(heading), Math.sin(heading), 0);
  forward.addScaledVector(up, -forward.dot(up));
  if (forward.lengthSq() < 1e-10) {
    forward.set(Math.abs(up.y) < 0.9 ? 0 : 1, Math.abs(up.y) < 0.9 ? 1 : 0, 0);
    forward.addScaledVector(up, -forward.dot(up));
  }
  forward.normalize();
  return {
    normal: up,
    mode: "wander",
    arrived: false,
    arrivalRadius: 0.012,
    lookTarget: up.clone(),
    softPartner: null,
    softObstacle: null,
    forward,
    radius,
    speed,
    boundCos: Math.cos(boundAngle),
    target: up.clone(),
    distance: 0,
    turnDistance: 0,
    velocity: 0,
    yawVelocity: 0,
    avoidance: null,
    avoidanceSide: 1,
    gaitDistance: 0,
    turning: false,
    moving: false,
    pause: 0.5,
    retargetIn: 0,
    collisions: 0,
    blocked: false,
  };
}

// Signed angular distance to the actual footprint. Rectangles use the object's
// surface tangent frame, not a large enclosing circle that hides its doorway.
export function obstacleGap(normal, obstacle) {
  if (!obstacle.halfWidth)
    return (
      Math.acos(Math.max(-1, Math.min(1, normal.dot(obstacle.normal)))) -
      obstacle.radius
    );
  const up = normal.dot(obstacle.normal);
  const x =
    Math.abs(Math.atan2(normal.dot(obstacle.axisX), up)) - obstacle.halfWidth;
  const y =
    Math.abs(Math.atan2(normal.dot(obstacle.axisY), up)) - obstacle.halfDepth;
  return (
    Math.hypot(Math.max(0, x), Math.max(0, y)) + Math.min(Math.max(x, y), 0)
  );
}

const applies = (obstacle, agent) =>
  !(obstacle.roverOnly && agent.radius < 0.06) &&
  !(obstacle.peopleOnly && agent.radius >= 0.06);

export function createWanderSimulation(agents, obstacles, seed) {
  const random = createRandom(seed);
  const blockers = [...obstacles, ...agents];
  const desired = new Vector3();
  const away = new Vector3();
  const candidate = new Vector3();
  const lookahead = new Vector3();
  const side = new Vector3();
  const rotation = new Quaternion();
  const routeSample = new Vector3();
  let accumulator = 0;
  const STEP = 1 / 60;

  function clear(normal, agent, margin = 0, allowEscape = false) {
    if (
      normal.z < agent.boundCos &&
      !(allowEscape && normal.z > agent.normal.z)
    )
      return false;
    for (const obstacle of obstacles) {
      if (!applies(obstacle, agent)) continue;
      const limit = agent.radius + margin;
      const next = obstacleGap(normal, obstacle);
      if (
        next < limit - 1e-10 &&
        !(
          allowEscape &&
          obstacleGap(agent.normal, obstacle) < limit &&
          next > obstacleGap(agent.normal, obstacle) + 1e-10
        )
      )
        return false;
    }
    for (const other of agents) {
      const limit = Math.cos(agent.radius + other.radius + margin);
      const next = normal.dot(other.normal);
      if (
        other !== agent &&
        next > limit &&
        !(
          allowEscape &&
          agent.normal.dot(other.normal) > limit &&
          next < agent.normal.dot(other.normal) - 1e-10
        )
      )
        return false;
    }
    return true;
  }

  function chooseTarget(agent) {
    for (let attempt = 0; attempt < 24; attempt++) {
      // Walkers explore a broad cap around the base. The rover can select any
      // hemisphere, and occasionally visits the base instead of avoiding it.
      const bound =
        agent.boundCos < -0.99 && random() < 0.25
          ? Math.cos(0.8)
          : agent.boundCos;
      const z = bound + random() * (1 - bound);
      const angle = random() * Math.PI * 2;
      const spread = Math.sqrt(1 - z * z);
      agent.target.set(Math.cos(angle) * spread, Math.sin(angle) * spread, z);
      if (clear(agent.target, agent, 0.035)) return;
    }
    agent.target.set(0, 0, 1);
  }
  agents.forEach(chooseTarget);

  function avoid(agent) {
    const buffer = agent.radius > 0.06 ? 0.3 : 0.14;
    let nearest = null;
    let nearestGap = Infinity;
    for (const obstacle of blockers) {
      if (obstacle === agent || obstacle === agent.softPartner) continue;
      if (!applies(obstacle, agent)) continue;
      // The prevalidated garden graph supplies clearance through narrow gaps;
      // soft personal-space buffers must not seal those gaps. Hard checks stay.
      if (agent.gardenRoute && obstacle.peopleOnly) continue;
      // Only soften the inspected object's clearance on the final approach.
      // Hard collision checks still apply, and distant routes still detour.
      if (
        obstacle.normal === agent.softObstacle &&
        agent.normal.dot(agent.target) > Math.cos(0.12)
      )
        continue;
      const gap = obstacleGap(agent.normal, obstacle) - agent.radius;
      away
        .copy(obstacle.normal)
        .addScaledVector(agent.normal, -obstacle.normal.dot(agent.normal));
      if (
        gap < buffer &&
        gap < nearestGap &&
        (gap < 0 || away.dot(desired) > 0)
      ) {
        nearest = obstacle;
        nearestGap = gap;
      }
    }
    if (!nearest) {
      agent.avoidance = null;
      return;
    }
    away
      .copy(agent.normal)
      .multiplyScalar(agent.normal.dot(nearest.normal))
      .sub(nearest.normal)
      .normalize();
    side.crossVectors(agent.normal, away).normalize();
    if (agent.avoidance !== nearest) {
      agent.avoidance = nearest;
      agent.avoidanceSide = side.dot(desired) >= 0 ? 1 : -1;
    }
    // Commit to one side until the obstacle is behind the goal direction.
    // A tangent detour avoids the unstable equilibrium of summed repulsion.
    side.multiplyScalar(agent.avoidanceSide);
    const urgency = Math.max(0, Math.min(1, (buffer - nearestGap) / buffer));
    side
      .addScaledVector(away, Math.max(0.15, 0.7 - nearestGap / buffer))
      .normalize();
    const goalBlend =
      agent.mode === "arrive"
        ? Math.max(
            0,
            Math.min(
              1,
              (Math.acos(
                Math.max(-1, Math.min(1, agent.normal.dot(agent.target))),
              ) -
                agent.arrivalRadius) /
                0.108,
            ),
          )
        : 1;
    desired.lerp(side, urgency * goalBlend).normalize();
  }

  function step(agent) {
    agent.retargetIn = Math.max(0, agent.retargetIn - STEP);
    if (agent.mode === "wander" && agent.pause > 0) {
      agent.pause -= STEP;
      agent.velocity = 0;
      agent.yawVelocity = 0;
      agent.moving = false;
      agent.turning = false;
      return;
    }
    const remaining = Math.acos(
      Math.max(-1, Math.min(1, agent.normal.dot(agent.target))),
    );
    if (agent.mode === "wander" && remaining < 0.035) {
      agent.pause = 0.8 + random() * 2;
      chooseTarget(agent);
      agent.moving = false;
      agent.turning = false;
      return;
    }
    if (agent.mode === "arrive" && remaining < agent.arrivalRadius)
      agent.arrived = true;
    const holding = agent.mode === "hold" || agent.arrived;
    const aim = holding ? agent.lookTarget : agent.target;
    desired.copy(aim).addScaledVector(agent.normal, -aim.dot(agent.normal));
    if (desired.lengthSq() < 1e-10) desired.copy(agent.forward);
    desired.normalize();
    if (!holding) avoid(agent);
    if (
      !holding &&
      !(agent.mode === "arrive" && remaining < 0.16) &&
      agent.normal.z < agent.boundCos + 0.08
    ) {
      away
        .set(0, 0, 1)
        .addScaledVector(agent.normal, -agent.normal.z)
        .normalize();
      desired.addScaledVector(away, 3);
    }
    desired.addScaledVector(agent.normal, -desired.dot(agent.normal));
    if (desired.lengthSq() < 1e-10)
      desired.crossVectors(agent.normal, agent.forward);
    desired.normalize();
    const turn = Math.acos(
      Math.max(-1, Math.min(1, agent.forward.dot(desired))),
    );
    side.crossVectors(agent.forward, desired);
    const sign = side.dot(agent.normal) >= 0 ? 1 : -1;
    const rover = agent.radius > 0.06;
    const maxYaw = rover ? 0.26 : holding ? 2.2 : 1.4;
    const targetYaw =
      sign * Math.min(maxYaw, turn * (rover ? 2 : holding ? 6 : 3));
    const yawStep = (rover ? 0.45 : holding ? 8 : 4) * STEP;
    agent.yawVelocity += Math.max(
      -yawStep,
      Math.min(yawStep, targetYaw - agent.yawVelocity),
    );
    const yaw = agent.yawVelocity * STEP;
    rotation.setFromAxisAngle(agent.normal, yaw);
    agent.turning = Math.abs(yaw) > 1e-4;
    agent.turnDistance += yaw;
    agent.forward.applyQuaternion(rotation).normalize();
    // Brake before sharp changes of heading; accelerate into the new route.
    const alignment = Math.max(0, agent.forward.dot(desired));
    // Constant-deceleration stopping distance avoids the exponential, visibly
    // slow crawl produced by scaling speed over the final 0.08 radians.
    const arrivalBrake =
      agent.mode === "arrive"
        ? Math.min(
            1,
            Math.sqrt(
              2 *
                (rover ? 0.035 : 0.09) *
                Math.max(0, remaining - agent.arrivalRadius),
            ) / agent.speed,
          )
        : 1;
    const targetSpeed = holding
      ? 0
      : agent.speed * alignment * alignment * arrivalBrake;
    const speedStep = (rover ? 0.035 : 0.09) * STEP;
    agent.velocity += Math.max(
      -speedStep,
      Math.min(speedStep, targetSpeed - agent.velocity),
    );
    const angle = agent.velocity * STEP;
    candidate
      .copy(agent.normal)
      .multiplyScalar(Math.cos(angle))
      .addScaledVector(agent.forward, Math.sin(angle))
      .normalize();
    const ahead =
      angle +
      (holding
        ? 0
        : agent.mode === "arrive"
          ? Math.min(0.008, remaining)
          : 0.012);
    lookahead
      .copy(agent.normal)
      .multiplyScalar(Math.cos(ahead))
      .addScaledVector(agent.forward, Math.sin(ahead))
      .normalize();
    if (
      !clear(candidate, agent, 0, true) ||
      !clear(lookahead, agent, 0, true)
    ) {
      if (!agent.blocked) agent.collisions++;
      agent.blocked = true;
      agent.moving = false;
      agent.velocity = 0;
      if (agent.turning) agent.gaitDistance += 0.02 * STEP;
      if (agent.mode === "wander" && agent.retargetIn === 0) {
        chooseTarget(agent);
        agent.retargetIn = 6;
      }
      return;
    }
    rotation.setFromUnitVectors(agent.normal, candidate);
    agent.forward.applyQuaternion(rotation).normalize();
    agent.normal.copy(candidate);
    agent.distance += angle;
    agent.gaitDistance += angle;
    agent.moving = angle > 1e-7;
    agent.blocked = false;
  }
  const simulation = {
    agents,
    obstacles,
    beforeStep: null,
    isClear: clear,
    isStaticClear(normal, agent) {
      return (
        normal.z >= agent.boundCos &&
        obstacles.every(
          (obstacle) =>
            !applies(obstacle, agent) ||
            obstacleGap(normal, obstacle) >= agent.radius + 0.004,
        )
      );
    },
    segmentClear(from, to, agent) {
      const distance = Math.acos(Math.max(-1, Math.min(1, from.dot(to))));
      const count = Math.max(1, Math.ceil(distance / 0.012));
      for (let i = 0; i <= count; i++) {
        routeSample
          .copy(from)
          .lerp(to, i / count)
          .normalize();
        if (!simulation.isStaticClear(routeSample, agent)) return false;
      }
      return true;
    },
    arrive(agent, normal, facing = normal) {
      if (!clear(normal, agent)) return false;
      agent.mode = "arrive";
      agent.target.copy(normal);
      agent.lookTarget.copy(facing);
      agent.arrived = false;
      agent.pause = 0;
      return true;
    },
    hold(agent, facing) {
      agent.mode = "hold";
      agent.lookTarget.copy(facing);
      agent.pause = 0;
    },
    wander(agent) {
      agent.mode = "wander";
      agent.arrived = false;
      agent.softPartner = null;
      agent.softObstacle = null;
      agent.gardenRoute = false;
      agent.pause = 0;
      chooseTarget(agent);
    },
    update(deltaSeconds) {
      accumulator += Math.max(0, Math.min(0.05, deltaSeconds));
      while (accumulator + 1e-10 >= STEP) {
        simulation.beforeStep?.(STEP);
        for (const agent of agents) step(agent);
        accumulator -= STEP;
      }
    },
  };
  return simulation;
}
