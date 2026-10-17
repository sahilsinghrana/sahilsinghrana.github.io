import { Vector3 } from "three";
import { createRandom } from "./wander.js";
import { createGardenRoutes } from "./garden-routes.js";

// Activity selection above steering, following Reynolds' steering hierarchy and
// the FSM example at threejs.org/manual/pages/game.html. No independent timers.
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const eyeRadius = (walker) => 1 + (walker.eyeHeight ?? 0.063);
const DECISION_STEP = 0.2;
const MAX_CHAT_SECONDS = 10;
const INSPECTION = new Set(["garden", "rocket", "house"]);
const ENGAGED = new Set([
  "conversation",
  "travelFlag",
  "flag",
  "joinFlag",
  "flagGuest",
  "stroll",
  "approach",
  "acknowledge",
  "waiting",
  "wave",
  "meeting",
  "leadGarden",
  "followGarden",
  "joinGarden",
  "waitGarden",
  "showGarden",
  "gardenGuest",
  "inviteGarden",
  "acceptGarden",
  "approachGirl",
  "inviteHouse",
  "acceptHouse",
  "leadHouse",
  "followHouse",
  "showHouse",
  "houseGuest",
]);

export function createAstronautBehavior({
  navigation,
  boy,
  girl,
  garden,
  rocket,
  house,
  flag,
  seed,
}) {
  const random = createRandom(seed ^ 0x51e8b39);
  const flagRandom = createRandom(seed ^ 0x431fc9);
  const gestureRandom = createRandom(seed ^ 0x734ab9);
  const conversationDistance = Math.max(
    0.064,
    boy.radius + girl.radius + 0.008,
  );
  const between = (min, max) => min + random() * (max - min);
  const tangent = new Vector3();
  const lateral = new Vector3();
  const candidate = new Vector3();
  const facing = new Vector3();
  const touchForward = new Vector3();
  const touchShoulder = new Vector3();
  const touchSide = new Vector3();
  const touchDirection = new Vector3();
  let time = 0;
  let decisionTime = 0;
  let talkStarted = 0;
  let talkDuration = 0;
  let exchanges = 0;
  const talkTurns = Array.from({ length: 24 }, () => ({
    start: 0,
    duration: 1,
    arm: 0,
    both: false,
    nod: false,
    spread: false,
  }));
  let disposed = false;
  let nextTourAt = 0;
  let nextOpportunityAt = 0;
  let nextBoyVisitAt = 12;
  let nextFlagAt = 15 + flagRandom() * 20;
  let flagJoined = false;
  let flagStarted = 0;
  const flagFacing = flag?.focuses[0].clone().normalize();
  let boyInitiated = false;
  let houseTourStarted = 0;
  let nextHouseTourAt = 0;
  const houseFocus = new Vector3();
  const houseDirection = new Vector3();
  let rocketStreak = 0;
  let tourStarted = 0;
  let tourShowingAt = 0;
  let tourDuration = 0;
  let tourStops = 0;
  let tourCounted = false;
  const tourFocus = new Vector3();
  const meetingGirl = new Vector3();
  const meetingBoy = new Vector3();
  const tourGirl = new Vector3();
  const tourBoy = new Vector3();
  const eyeA = new Vector3(),
    eyeDelta = new Vector3(),
    closest = new Vector3();
  const stats = {
    decisions: 0,
    gardenVisits: 0,
    rocketVisits: 0,
    houseVisits: 0,
    waves: 0,
    gardenTours: 0,
    houseTours: 0,
    boyApproaches: 0,
    calls: 0,
    seatedRests: 0,
    flowerTouches: 0,
    flagVisits: 0,
    flagCompanions: 0,
    strolls: 0,
    conversations: 0,
    aborts: 0,
  };

  function views(interest, walker) {
    if (!interest) return [];
    const points = [];
    const features = interest.features?.filter(
      (feature) => feature.kind !== "rock",
    ) || [{ normal: interest.normal, radius: interest.radius }];
    for (const feature of features) {
      tangent
        .set(1, 0, 0)
        .addScaledVector(feature.normal, -feature.normal.x)
        .normalize();
      lateral.crossVectors(feature.normal, tangent).normalize();
      const count = interest.features ? 8 : 12;
      for (let i = 0; i < count; i++) {
        const turn = (i * Math.PI * 2) / count;
        candidate
          .copy(tangent)
          .multiplyScalar(Math.cos(turn))
          .addScaledVector(lateral, Math.sin(turn));
        let boundary = feature.radius;
        if (interest.halfWidth)
          boundary = Math.min(
            interest.halfWidth /
              Math.max(1e-5, Math.abs(candidate.dot(interest.axisX))),
            interest.halfDepth /
              Math.max(1e-5, Math.abs(candidate.dot(interest.axisY))),
          );
        const radius =
          boundary +
          (feature.touches?.length
            ? Math.max(walker.radius, boy.radius, girl.radius)
            : walker.radius) +
          (feature.touches?.length
            ? 0.0045
            : interest.features
              ? 0.014
              : 0.012);
        const point = feature.normal
          .clone()
          .multiplyScalar(Math.cos(radius))
          .addScaledVector(tangent, Math.sin(radius) * Math.cos(turn))
          .addScaledVector(lateral, Math.sin(radius) * Math.sin(turn))
          .normalize();
        point.feature = feature;
        point.canTouch = false;
        if (feature.touches?.length) {
          const size = (walker.eyeHeight || 0.079 * 0.8) / 0.079;
          touchDirection.copy(feature.focus).normalize();
          touchDirection
            .addScaledVector(point, -touchDirection.dot(point))
            .normalize();
          for (let arm = 0; arm < 2; arm++) {
            touchSide.crossVectors(point, touchDirection).normalize();
            touchForward
              .copy(touchDirection)
              .multiplyScalar(Math.cos(0.6))
              .addScaledVector(touchSide, (arm ? -1 : 1) * Math.sin(0.6));
            touchSide.crossVectors(point, touchForward).normalize();
            touchShoulder
              .copy(point)
              .multiplyScalar(1 + 0.063 * Math.cos(0.07) * size)
              .addScaledVector(touchSide, (arm ? 1 : -1) * 0.018 * size)
              .addScaledVector(touchForward, 0.063 * Math.sin(0.07) * size);
            if (
              feature.touches.some(
                (touch) => touch.distanceTo(touchShoulder) <= 0.0353 * size,
              )
            )
              point.canTouch = true;
          }
        }
        points.push(point);
      }
    }
    return points;
  }
  function actor(walker, interest, first) {
    return {
      walker,
      interest,
      views: views(interest, walker),
      state: "wander",
      since: 0,
      until: first,
      initial: true,
      nextInspectAt: 0,
      nextTalkAt: 0,
      lastView: -1,
      previousView: -1,
      lastInspectedPosition: new Vector3(),
      hasInspectedPosition: false,
      lastFeature: null,
      route: new Int16Array(128),
      routeLength: 0,
      routeIndex: 0,
      goal: new Vector3(),
      stopsRemaining: 0,
      visitUntil: 0,
      visitCounted: false,
      visitStarted: 0,
      visitDuration: 0,
      visitEnd: Infinity,
      visitFeatures: new Array(4).fill(null),
      featureCount: 0,
      featureSeen: new Uint8Array(4),
      lastFlower: null,
      waveHop: false,
      waveHopAt: 1,
      calling: false,
      playfulWait: false,
      nextPlayAt: 18,
      approachDistance: 0,
      cruiseSpeed: walker.speed,
      runUntil: 0,
      restUntil: 0,
      nextRestAt: between(70, 120),
      touchActive: false,
      touchTarget: new Vector3(),
      touchFacing: new Vector3(),
      touchArm: 0,
      responded: false,
      goalIndex: -1,
      variant: 0,
      focus: new Vector3(),
      gazeNormal: new Vector3(),
      progress: 0,
      bestRemaining: Infinity,
      stalled: 0,
      retries: 0,
      nextDestinationAt: 0,
      acknowledgmentAt: 0,
      completedAt: -1,
      pose: {
        weight: 0,
        lean: 0,
        tilt: 0,
        hand: 0,
        nod: 0,
        chest: 0,
        wave: 0,
        left: 0,
        right: 0,
        pointLeft: 0,
        pointRight: 0,
        shift: 0,
        yaw: 0,
        stance: 0,
        shake: 0,
        hop: 0,
        spread: 0,
        dance: 0,
        sit: 0,
        touch: 0,
        salute: 0,
      },
    };
  }
  const male = actor(boy, rocket, between(2, 10));
  const female = actor(girl, garden, between(2, 10));
  const actors = [male, female];
  const flagViews = views(flag ? { ...flag, radius: 0.15 } : null, girl);
  const rocketViews = male.views;
  const houseViews = views(house, boy);
  const houseGuestViews = views(house, girl);
  const guestViews = garden?.features ? female.views : views(garden, boy);
  const tourFlowers =
    garden?.features?.filter((feature) => feature.kind === "flower") || [];
  const gardenActivities =
    garden?.features?.filter((feature) => feature.kind !== "rock") || [];
  const seats =
    garden?.features?.filter(
      (feature) =>
        feature.kind === "rock" &&
        navigation.isStaticClear(feature.normal, boy) &&
        navigation.isStaticClear(feature.normal, girl),
    ) || [];
  const seatNodes = seats.map((seat) => seat.normal);
  const gardenRoutes = garden?.features
    ? createGardenRoutes(
        navigation,
        [...female.views, ...seatNodes],
        garden.normal,
        boy,
      )
    : null;

  function enter(record, state, duration) {
    record.playfulWait =
      record === female &&
      (state === "waiting" ||
        state === "waitGarden" ||
        state === "acceptHouse") &&
      gestureRandom() < 0.75;
    if (
      INSPECTION.has(state) ||
      state === "showGarden" ||
      state === "gardenGuest"
    ) {
      record.lastInspectedPosition.copy(record.walker.target);
      record.hasInspectedPosition = true;
    }
    record.state = state;
    record.since = time;
    record.until = time + duration;
    record.stalled = 0;
    record.progress = record.walker.distance;
    record.bestRemaining = Infinity;
    record.variant = (record.variant + 1 + Math.floor(gestureRandom() * 2)) % 3;
  }
  function wander(record) {
    navigation.wander(record.walker);
    // Favor nearby independent walks so social opportunities remain reachable.
    // Neither partner is held here; inspections and the full bounds stay open.
    const anchor =
      record === female && random() < 0.95
        ? boy.normal
        : record === male && random() < 0.9
          ? girl.normal
          : null;
    if (anchor) {
      tangent.set(0, 0, 1).addScaledVector(anchor, -anchor.z);
      if (tangent.lengthSq() < 1e-8)
        tangent.set(1, 0, 0).addScaledVector(anchor, -anchor.x);
      tangent.normalize();
      lateral.crossVectors(anchor, tangent).normalize();
      for (let i = 0; i < 12; i++) {
        const turn = between(0, Math.PI * 2);
        const radius =
          record === female ? between(0.09, 0.16) : between(0.14, 0.24);
        candidate
          .copy(anchor)
          .multiplyScalar(Math.cos(radius))
          .addScaledVector(tangent, Math.sin(radius) * Math.cos(turn))
          .addScaledVector(lateral, Math.sin(radius) * Math.sin(turn))
          .normalize();
        if (navigation.isClear(candidate, record.walker, 0.015)) {
          record.walker.target.copy(candidate);
          break;
        }
      }
    }
    enter(record, "wander", record === female ? between(5, 9) : between(8, 14));
  }
  function endVisit(record) {
    record.completedAt = time;
    record.nextInspectAt =
      time + (record === female ? between(20, 35) : between(25, 40));
    wander(record);
  }
  function inspectDestination(record) {
    if (!record.interest) return false;
    const count = record.views.length;
    const start = Math.floor(random() * count);
    let selected = -1;
    let best = Infinity;
    for (let i = 0; i < count; i++) {
      const index = (start + i) % count;
      if (index === record.lastView || index === record.previousView) continue;
      const point = record.views[index];
      if (
        record.hasInspectedPosition &&
        point.distanceToSquared(record.lastInspectedPosition) < 1e-10
      )
        continue;
      if (record.featureCount && !record.visitFeatures.includes(point.feature))
        continue;
      if (pendingFeature(record)) {
        const slot = record.visitFeatures.indexOf(point.feature);
        if (slot < 0 || record.featureSeen[slot]) continue;
      }
      if (!navigation.isClear(point, record.walker, 0.004)) continue;
      const score =
        angle(record.walker.normal, point) +
        i * 0.012 +
        (point.feature === record.lastFeature ? 0.18 : 0) +
        (point.feature.touches?.length && !point.canTouch ? 0.12 : 0);
      if (score < best) {
        best = score;
        selected = index;
      }
    }
    if (selected < 0) return false;
    record.previousView = record.lastView;
    record.lastView = selected;
    const point = record.views[selected];
    record.lastFeature = point.feature;
    let nearest = Infinity;
    for (const focus of record.interest.focuses) {
      const distance = point.distanceToSquared(focus);
      if (distance < nearest) {
        nearest = distance;
        record.focus.copy(focus);
      }
    }
    if (point.feature.focus) record.focus.copy(point.feature.focus);
    record.gazeNormal.copy(record.focus).normalize();
    record.walker.softObstacle = record.interest.normal;
    record.walker.arrivalRadius = record.lastFeature.touches?.length
      ? 0.0008
      : 0.003;
    record.bestRemaining = Infinity;
    record.goal.copy(point);
    record.goalIndex = selected;
    record.routeIndex = 0;
    record.routeLength = 0;
    if (record === female && record.interest === garden && gardenRoutes) {
      record.routeLength = gardenRoutes.plan(
        record.walker.normal,
        selected,
        record.route,
      );
      if (!record.routeLength) return false;
      record.walker.gardenRoute = true;
      return navigation.arrive(
        record.walker,
        gardenRoutes.nodes[record.route[0]],
        record.gazeNormal,
      );
    }
    return navigation.arrive(record.walker, point, record.gazeNormal);
  }
  function startInspection(record) {
    if (record === male && house) {
      record.interest = random() < 0.4 || rocketStreak >= 2 ? house : rocket;
      record.views = record.interest === house ? houseViews : rocketViews;
    }
    record.visitDuration = record === female ? between(8, 15) : between(5, 10);
    record.stopsRemaining = Math.ceil(record.visitDuration / 4);
    record.visitEnd = Infinity;
    record.featureCount = 0;
    record.visitFeatures.fill(null);
    record.featureSeen.fill(0);
    if (record === female && garden?.features) {
      record.featureCount = Math.min(
        gardenActivities.length,
        random() < 0.65 ? 1 : random() < 0.65 ? 2 : 3,
      );
      if (tourFlowers.length && random() < 0.85) {
        let index = Math.floor(random() * tourFlowers.length);
        if (tourFlowers[index] === record.lastFlower)
          index = (index + 1) % tourFlowers.length;
        record.visitFeatures[0] = tourFlowers[index];
        if (record.featureCount > 1 && tourFlowers.length > 1 && random() < 0.8)
          record.visitFeatures[1] =
            tourFlowers[(index + 1) % tourFlowers.length];
      }
      for (let slot = 0; slot < record.featureCount; slot++) {
        if (record.visitFeatures[slot]) continue;
        let total = 0;
        for (const feature of gardenActivities)
          if (!record.visitFeatures.includes(feature))
            total +=
              feature.kind === "flower" ? 3 : feature.kind === "lamp" ? 2 : 0.5;
        let roll = random() * total;
        for (const feature of gardenActivities) {
          if (record.visitFeatures.includes(feature)) continue;
          roll -=
            feature.kind === "flower" ? 3 : feature.kind === "lamp" ? 2 : 0.5;
          if (roll <= 0) {
            record.visitFeatures[slot] = feature;
            break;
          }
        }
      }
    }
    record.stopsRemaining = Math.max(
      record.stopsRemaining,
      record.featureCount,
    );
    record.visitUntil = time + 60;
    record.visitCounted = false;
    if (!inspectDestination(record)) {
      wander(record);
      return;
    }
    record.retries = 0;
    enter(
      record,
      record === female
        ? "travelGarden"
        : record.interest === house
          ? "travelHouse"
          : "travelRocket",
      60,
    );
  }
  function prepareTouch(record) {
    record.touchActive = false;
    if (
      record !== female ||
      !record.lastFeature?.touches?.length ||
      gestureRandom() > 0.55
    )
      return;
    const scale = (record.walker.eyeHeight || 0.079 * 0.8) / 0.079;
    lateral
      .crossVectors(record.walker.normal, record.walker.forward)
      .normalize();
    let best = Infinity;
    for (const point of record.lastFeature.touches) {
      for (let arm = 0; arm < 2; arm++) {
        lateral
          .crossVectors(record.walker.normal, record.walker.forward)
          .normalize();
        touchForward
          .copy(record.walker.forward)
          .multiplyScalar(Math.cos(0.6))
          .addScaledVector(lateral, (arm ? -1 : 1) * Math.sin(0.6));
        lateral.crossVectors(record.walker.normal, touchForward).normalize();
        tangent
          .copy(record.walker.normal)
          .multiplyScalar(1 + 0.063 * Math.cos(0.07) * scale)
          .addScaledVector(lateral, (arm ? 1 : -1) * 0.018 * scale)
          .addScaledVector(touchForward, 0.063 * Math.sin(0.07) * scale);
        candidate.copy(point).sub(tangent).normalize();
        facing.copy(point).addScaledVector(candidate, -0.0038 * scale);
        const reach = facing.distanceTo(tangent);
        if (reach <= 0.0315 * scale && reach < best) {
          best = reach;
          record.touchActive = true;
          record.touchTarget.copy(facing);
          record.touchFacing.copy(touchForward);
          record.touchArm = arm;
        }
      }
    }
    if (record.touchActive) {
      record.touchFacing
        .multiplyScalar(0.2)
        .add(record.walker.normal)
        .normalize();
      navigation.hold(record.walker, record.touchFacing);
      stats.flowerTouches++;
    }
  }
  function available(record) {
    return !ENGAGED.has(record.state);
  }
  function socialAvailable(record) {
    return (
      available(record) &&
      record.state !== "travelRest" &&
      record.state !== "stand" &&
      !(record.state === "sit" && time - record.since < 4)
    );
  }
  function pendingFeature(record) {
    for (let slot = 0; slot < record.featureCount; slot++)
      if (!record.featureSeen[slot]) return true;
    return false;
  }
  function sees(walker, target) {
    facing
      .copy(target)
      .addScaledVector(walker.normal, -target.dot(walker.normal))
      .normalize();
    return walker.forward.dot(facing) > Math.cos((65 * Math.PI) / 180);
  }
  function mutuallyVisible(requireFacing = true) {
    const separation = angle(boy.normal, girl.normal);
    if (
      separation < 0.22 ||
      separation > 0.65 ||
      (requireFacing && (!sees(boy, girl.normal) || !sees(girl, boy.normal)))
    )
      return false;
    eyeA.copy(girl.normal).multiplyScalar(eyeRadius(girl));
    eyeDelta.copy(boy.normal).multiplyScalar(eyeRadius(boy)).sub(eyeA);
    const lengthSq = eyeDelta.lengthSq();
    let t = clamp(-eyeA.dot(eyeDelta) / lengthSq, 0, 1);
    closest.copy(eyeA).addScaledVector(eyeDelta, t);
    if (closest.lengthSq() < 1) return false;
    for (const obstacle of navigation.obstacles) {
      closest.copy(obstacle.normal).multiplyScalar(1.063).sub(eyeA);
      t = closest.dot(eyeDelta) / lengthSq;
      if (t <= 0.05 || t >= 0.95) continue;
      closest
        .copy(eyeA)
        .addScaledVector(eyeDelta, t)
        .addScaledVector(obstacle.normal, -1.063);
      if (closest.length() < Math.sin(obstacle.radius + 0.01)) return false;
    }
    return true;
  }
  function reserveMeeting() {
    boy.arrivalRadius = girl.arrivalRadius = 0.002;
    facing.copy(boy.normal).add(girl.normal).normalize();
    tangent
      .copy(girl.normal)
      .addScaledVector(facing, -girl.normal.dot(facing))
      .normalize();
    meetingGirl
      .copy(facing)
      .multiplyScalar(Math.cos(conversationDistance / 2))
      .addScaledVector(tangent, Math.sin(conversationDistance / 2))
      .normalize();
    meetingBoy
      .copy(facing)
      .multiplyScalar(Math.cos(conversationDistance / 2))
      .addScaledVector(tangent, -Math.sin(conversationDistance / 2))
      .normalize();
    return (
      navigation.isClear(meetingGirl, girl, 0.005) &&
      navigation.isClear(meetingBoy, boy, 0.005)
    );
  }
  function greeting(insistent = false) {
    if (!reserveMeeting()) return false;
    boyInitiated = false;
    female.calling = insistent;
    male.runUntil = time + between(4, 7);
    if (insistent) stats.calls++;
    enter(female, "wave", between(3.5, 5.5));
    enter(male, "acknowledge", 30);
    male.acknowledgmentAt = time + between(0.4, 0.9);
    female.waveHop = insistent || gestureRandom() < 0.5;
    female.waveHopAt = 0.8 + gestureRandom() * 1.2;
    male.responded = false;
    navigation.arrive(girl, meetingGirl, boy.normal);
    girl.softPartner = boy;
    boy.softPartner = girl;
    stats.waves++;
    return true;
  }
  function socialDestination(
    mover = girl,
    anchor = boy,
    spacing = conversationDistance,
  ) {
    mover.gardenRoute = false;
    mover.arrivalRadius = 0.002;
    tangent
      .copy(mover.normal)
      .addScaledVector(anchor.normal, -mover.normal.dot(anchor.normal));
    if (tangent.lengthSq() < 1e-10) tangent.copy(anchor.forward);
    tangent.normalize();
    lateral.crossVectors(anchor.normal, tangent).normalize();
    for (let i = 0; i < 9; i++) {
      const turn =
        i === 0 ? 0 : (Math.ceil(i / 2) * (i % 2 ? 1 : -1) * Math.PI) / 8;
      candidate
        .copy(anchor.normal)
        .multiplyScalar(Math.cos(spacing))
        .addScaledVector(tangent, Math.sin(spacing) * Math.cos(turn))
        .addScaledVector(lateral, Math.sin(spacing) * Math.sin(turn))
        .normalize();
      if (navigation.isClear(candidate, mover, 0.005)) {
        mover.softObstacle = anchor.softObstacle;
        mover.gardenRoute =
          !!gardenRoutes &&
          navigation.segmentClear(mover.normal, candidate, mover);
        return navigation.arrive(mover, candidate, anchor.normal);
      }
    }
    return false;
  }
  function finishSocial(aborted = false) {
    if (aborted) stats.aborts++;
    const cooldown = between(3, 8);
    for (const record of actors) {
      record.nextTalkAt = time + cooldown;
      record.walker.softPartner = null;
      record.runUntil = 0;
    }
    const showHouse = boyInitiated || (house && random() < 0.3);
    boyInitiated = false;
    if (
      !aborted &&
      showHouse &&
      time >= nextHouseTourAt &&
      random() < 0.75 &&
      startHouseTour()
    )
      return;
    if (
      !aborted &&
      garden &&
      time >= nextTourAt &&
      random() < (stats.gardenTours === 0 ? 0.65 : 0.4) &&
      startTour()
    )
      return;
    if (!aborted && random() < 0.35 && startStroll()) return;
    wander(female);
    if (
      male.state === "waiting" ||
      male.state === "acknowledge" ||
      male.state === "conversation" ||
      male.state === "meeting" ||
      male.state === "approachGirl"
    )
      wander(male);
  }
  function quietApproach() {
    if (
      time >= nextBoyVisitAt &&
      (female.state !== "garden" || !pendingFeature(female)) &&
      random() < 0.8 &&
      reserveMeeting()
    ) {
      boyInitiated = true;
      nextBoyVisitAt = time + between(18, 32);
      stats.boyApproaches++;
      if (angle(boy.normal, girl.normal) > 0.18)
        male.runUntil = time + between(5, 9);
      enter(male, "approachGirl", 25);
      enter(female, "acknowledge", 25);
      female.acknowledgmentAt = time + between(0.4, 0.9);
      boy.softPartner = girl;
      girl.softPartner = boy;
      navigation.hold(girl, boy.normal);
      navigation.arrive(boy, meetingBoy, girl.normal);
      return true;
    }
    if (!socialDestination()) return false;
    boyInitiated = false;
    enter(female, "approach", 20);
    female.approachDistance = angle(girl.normal, boy.normal);
    female.nextDestinationAt = time + 0.5;
    return true;
  }
  function choose(record) {
    if (record.initial) {
      record.initial = false;
      if (record.interest && random() < 0.6) {
        startInspection(record);
        return;
      }
      wander(record);
      return;
    }
    const canInspect = record.interest && time >= record.nextInspectAt;
    const canTalk =
      record === female &&
      socialAvailable(male) &&
      !male.state.startsWith("travel") &&
      time >= record.nextTalkAt &&
      time >= male.nextTalkAt &&
      angle(boy.normal, girl.normal) <= 0.5;
    const inspectionWeight = canInspect ? (record === female ? 0.3 : 0.35) : 0;
    const socialWeight = canTalk ? 2.4 : 0;
    const idleWeight = seats.length ? (record === male ? 0.02 : 0.015) : 0;
    const roll =
      random() *
      ((record === female ? 0.15 : 0.55) +
        inspectionWeight +
        socialWeight +
        idleWeight);
    if (roll < inspectionWeight) startInspection(record);
    else if (roll < inspectionWeight + socialWeight) {
      if (!quietApproach()) wander(record);
    } else if (roll < inspectionWeight + socialWeight + idleWeight) {
      if (!startRest(record)) wander(record);
    } else wander(record);
  }
  function aligned(walker, target) {
    facing
      .copy(target)
      .addScaledVector(walker.normal, -target.dot(walker.normal))
      .normalize();
    return (
      walker.forward.dot(facing) > Math.cos(0.35) && walker.velocity < 0.003
    );
  }
  function readyToTalk() {
    const separation = angle(girl.normal, boy.normal);
    return (
      separation >= conversationDistance - 0.005 &&
      separation <= conversationDistance + 0.01 &&
      aligned(girl, boy.normal) &&
      aligned(boy, girl.normal)
    );
  }
  function beginTalk() {
    talkStarted = time;
    const length = random();
    talkDuration =
      length < 0.4
        ? between(3, 5)
        : length < 0.85
          ? between(5, 8)
          : between(8, 10);
    // Leave one decision interval of headroom so the observed state, including
    // its 5 Hz completion check, also obeys the ten-second limit.
    talkDuration = Math.min(talkDuration, MAX_CHAT_SECONDS - DECISION_STEP);
    exchanges = Math.min(
      talkTurns.length,
      Math.max(2, Math.round(talkDuration / 1.35)),
    );
    for (let i = 0; i < exchanges; i++) {
      const turn = talkTurns[i];
      const period = talkDuration / exchanges;
      turn.start = i * period + 0.12 + gestureRandom() * 0.12;
      turn.duration = Math.min(period - 0.28, 0.85 + gestureRandom() * 0.35);
      turn.arm = gestureRandom() < 0.5 ? 0 : 1;
      turn.both = gestureRandom() < 0.22;
      turn.nod = gestureRandom() < 0.75;
      turn.spread = gestureRandom() < 0.4;
    }
    for (const record of actors) enter(record, "conversation", talkDuration);
    navigation.hold(girl, boy.normal);
    navigation.hold(boy, girl.normal);
    stats.conversations++;
  }
  function startRest(record) {
    if (!gardenRoutes || !seats.length) return false;
    const continuing = record.state === "travelRest";
    if (!continuing) {
      record.restUntil = time + 60;
      record.retries = 0;
    }
    record.visitEnd = Infinity;
    const start = Math.floor(random() * seats.length);
    const partner = record === male ? female : male;
    for (let offset = 0; offset < seats.length; offset++) {
      const index = (start + offset) % seats.length;
      const seat = seats[index];
      if (angle(record.walker.normal, seat.normal) > 0.6) continue;
      if (
        (partner.state === "sit" || partner.state === "travelRest") &&
        partner.goal.angleTo(seat.normal) < 0.08
      )
        continue;
      if (!navigation.isClear(seat.normal, record.walker, 0.004)) continue;
      record.goalIndex = female.views.length + index;
      record.routeLength = gardenRoutes.plan(
        record.walker.normal,
        record.goalIndex,
        record.route,
      );
      if (!record.routeLength) continue;
      record.routeIndex = 0;
      record.goal.copy(seat.normal);
      record.focus.copy(garden.focuses[0]);
      record.gazeNormal.copy(record.focus).normalize();
      record.walker.gardenRoute = true;
      record.walker.arrivalRadius = 0.004;
      if (
        navigation.arrive(
          record.walker,
          gardenRoutes.nodes[record.route[0]],
          record.gazeNormal,
        )
      ) {
        if (!continuing) record.nextRestAt = time + between(240, 360);
        enter(record, "travelRest", Math.max(0, record.restUntil - time));
        return true;
      }
    }
    return false;
  }
  function startHouseTour() {
    if (!house) return false;
    let selected = -1;
    let guest = -1;
    let best = Infinity;
    for (let i = 0; i < houseViews.length; i++) {
      const point = houseViews[i];
      if (!navigation.isClear(point, boy, 0.004)) continue;
      for (let j = 0; j < houseGuestViews.length; j++) {
        const other = houseGuestViews[j];
        const spacing = angle(point, other);
        if (
          spacing < 0.085 ||
          spacing > 0.125 ||
          !navigation.isClear(other, girl, 0.004) ||
          !navigation.segmentClear(point, other, boy)
        )
          continue;
        const score = angle(boy.normal, point) + angle(girl.normal, other);
        if (score < best) {
          best = score;
          selected = i;
          guest = j;
        }
      }
    }
    if (selected < 0) return false;
    male.goal.copy(houseViews[selected]);
    female.goal.copy(houseGuestViews[guest]);
    // Look at the entrance, window, or porch fixture, not the habitat's center.
    houseFocus.copy(house.focuses[Math.floor(random() * house.focuses.length)]);
    houseDirection.copy(houseFocus).normalize();
    houseTourStarted = time;
    boy.gardenRoute = girl.gardenRoute = false;
    boy.softObstacle = girl.softObstacle = house.normal;
    boy.softPartner = girl;
    girl.softPartner = boy;
    for (const record of actors) {
      record.focus.copy(houseFocus);
      record.retries = 0;
      navigation.hold(record.walker, houseDirection);
    }
    enter(male, "inviteHouse", between(2.2, 3.2));
    enter(female, "acceptHouse", 90);
    return true;
  }
  function endHouseTour(aborted = false) {
    if (aborted) stats.aborts++;
    nextHouseTourAt = time + between(80, 140);
    nextBoyVisitAt = time + between(18, 32);
    boy.softPartner = girl.softPartner = null;
    for (const record of actors) {
      record.nextTalkAt = time + between(3, 8);
      wander(record);
    }
  }
  function updateHouseTour() {
    if (
      male.state !== "inviteHouse" &&
      male.state !== "leadHouse" &&
      male.state !== "showHouse"
    )
      return false;
    if (male.state !== "showHouse" && time - houseTourStarted > 90) {
      endHouseTour(true);
      return true;
    }
    if (male.state === "inviteHouse") {
      if (
        time >= male.until &&
        aligned(boy, houseDirection) &&
        aligned(girl, houseDirection)
      ) {
        enter(male, "leadHouse", 90);
        enter(female, "followHouse", 90);
        female.nextDestinationAt = time + 0.7;
        navigation.arrive(boy, male.goal, houseDirection);
      } else if (time - male.since > 9) endHouseTour(true);
      return true;
    }
    if (male.state === "leadHouse") {
      for (const record of actors) {
        if (record.stalled >= 3) {
          if (record.retries++ >= 2) {
            endHouseTour(true);
            return true;
          }
          record.stalled = 0;
          record.bestRemaining = Infinity;
          navigation.arrive(record.walker, record.goal, houseDirection);
        }
      }
      const separation = angle(boy.normal, girl.normal);
      const boyTravelling = angle(boy.normal, male.goal) >= 0.012;
      if (boyTravelling && separation > 0.28 && boy.mode !== "hold")
        navigation.hold(boy, girl.normal);
      else if (boyTravelling && separation < 0.19 && boy.mode === "hold")
        navigation.arrive(boy, male.goal, houseDirection);
      if (
        time >= female.nextDestinationAt &&
        girl.mode === "hold" &&
        angle(girl.normal, female.goal) > 0.012
      )
        navigation.arrive(girl, female.goal, houseDirection);
      for (const record of actors) {
        if (
          angle(record.walker.normal, record.goal) < 0.012 &&
          record.walker.arrived
        )
          navigation.hold(record.walker, houseDirection);
      }
      if (
        angle(boy.normal, male.goal) < 0.012 &&
        angle(girl.normal, female.goal) < 0.012 &&
        aligned(boy, houseDirection) &&
        aligned(girl, houseDirection)
      ) {
        const duration = between(5, 8);
        enter(male, "showHouse", duration);
        enter(female, "houseGuest", duration);
        stats.houseTours++;
      }
    } else if (time >= male.until) {
      endHouseTour();
      return true;
    }
    for (const record of actors) {
      const partner = record === male ? girl : boy;
      if (
        male.state === "showHouse" &&
        time - male.since > 4 &&
        time - male.since < 5.5
      )
        record.focus.copy(partner.normal).multiplyScalar(eyeRadius(partner));
      else record.focus.copy(houseFocus);
    }
    return true;
  }
  function startTour(continuing = false) {
    female.featureCount = 0;
    female.visitFeatures.fill(null);
    if (tourFlowers.length) {
      let index = Math.floor(random() * tourFlowers.length);
      if (tourFlowers[index] === female.lastFeature)
        index = (index + 1) % tourFlowers.length;
      female.featureCount = 1;
      female.visitFeatures[0] = tourFlowers[index];
    }
    if (!garden || !inspectDestination(female)) return false;
    tourGirl.copy(female.goal);
    tourFocus.copy(female.focus);
    let selected = -1;
    let best = Infinity;
    for (let index = 0; index < guestViews.length; index++) {
      if (index === male.lastView || index === male.previousView) continue;
      const point = guestViews[index];
      if (
        male.hasInspectedPosition &&
        point.distanceToSquared(male.lastInspectedPosition) < 1e-10
      )
        continue;
      const spacing = angle(tourGirl, point);
      if (
        spacing < 0.09 ||
        spacing > 0.18 ||
        !navigation.isClear(point, boy, 0.004)
      )
        continue;
      const distance =
        point.distanceToSquared(boy.normal) +
        (point.feature === female.lastFeature ? 0 : 0.1);
      if (distance < best) {
        best = distance;
        selected = index;
      }
    }
    if (selected < 0) return false;
    tourBoy.copy(guestViews[selected]);
    male.previousView = male.lastView;
    male.lastView = selected;
    male.routeLength = gardenRoutes
      ? gardenRoutes.plan(boy.normal, selected, male.route)
      : 0;
    male.routeIndex = 0;
    if (gardenRoutes && !male.routeLength) return false;
    boy.gardenRoute = !!gardenRoutes;
    male.goal.copy(tourBoy);
    male.goalIndex = selected;
    tourStarted = time;
    tourShowingAt = 0;
    girl.softPartner = boy;
    boy.softPartner = girl;
    boy.softObstacle = garden.normal;
    female.retries = male.retries = 0;
    if (!continuing) {
      tourStops = 1 + Math.floor(random() * 2);
      tourCounted = false;
    }
    enter(
      female,
      continuing ? "leadGarden" : "inviteGarden",
      continuing ? 90 : between(2.2, 3.2),
    );
    enter(male, continuing ? "followGarden" : "acceptGarden", 90);
    if (!continuing) {
      navigation.hold(girl, female.gazeNormal);
      navigation.hold(boy, female.gazeNormal);
      male.focus.copy(tourFocus);
    }
    male.nextDestinationAt = time;
    return true;
  }
  function endTour(aborted = false) {
    if (aborted) stats.aborts++;
    nextTourAt = time + between(80, 140);
    boy.softPartner = girl.softPartner = null;
    for (const record of actors) record.nextTalkAt = time + between(3, 8);
    endVisit(female);
    wander(male);
  }
  function updateTour() {
    if (
      female.state !== "leadGarden" &&
      female.state !== "waitGarden" &&
      female.state !== "showGarden" &&
      female.state !== "inviteGarden"
    )
      return false;
    if (time - tourStarted >= 90 && female.state !== "showGarden") {
      endTour(true);
      return true;
    }
    for (const record of actors) {
      if (
        !gardenRoutes ||
        record.walker.mode !== "arrive" ||
        record.stalled < 3
      )
        continue;
      if (record.retries++ >= 2) {
        endTour(true);
        return true;
      }
      record.routeLength = gardenRoutes.plan(
        record.walker.normal,
        record.goalIndex,
        record.route,
      );
      record.routeIndex = 0;
      record.stalled = 0;
      record.bestRemaining = Infinity;
      if (record.routeLength)
        navigation.arrive(
          record.walker,
          gardenRoutes.nodes[record.route[0]],
          female.gazeNormal,
        );
    }
    if (female.state === "inviteGarden") {
      if (
        time >= female.until &&
        aligned(girl, female.gazeNormal) &&
        aligned(boy, female.gazeNormal)
      ) {
        enter(female, "leadGarden", 90);
        enter(male, "followGarden", 90);
        male.nextDestinationAt = time + 0.8;
        const waypoint = female.routeLength
          ? gardenRoutes.nodes[female.route[female.routeIndex]]
          : tourGirl;
        navigation.arrive(girl, waypoint, female.gazeNormal);
      } else if (time - female.since > 9) endTour(true);
      return true;
    }
    if (female.state === "leadGarden") {
      if (girl.arrived && female.routeIndex + 1 < female.routeLength) {
        female.routeIndex++;
        navigation.arrive(
          girl,
          gardenRoutes.nodes[female.route[female.routeIndex]],
          female.gazeNormal,
        );
      }
      const distance = angle(girl.normal, boy.normal);
      if (
        girl.arrived &&
        angle(girl.normal, tourGirl) < 0.012 &&
        girl.velocity < 0.003
      ) {
        enter(female, "waitGarden", 90);
        navigation.hold(girl, female.gazeNormal);
        enter(male, "joinGarden", 90);
        if (gardenRoutes) {
          male.routeLength = gardenRoutes.plan(
            boy.normal,
            male.goalIndex,
            male.route,
          );
          male.routeIndex = 0;
          if (!male.routeLength) {
            endTour(true);
            return true;
          }
        }
        const destination = male.routeLength
          ? gardenRoutes.nodes[male.route[0]]
          : tourBoy;
        if (!navigation.arrive(boy, destination, female.gazeNormal)) {
          endTour(true);
          return true;
        }
      } else {
        if (distance > 0.3 && girl.mode !== "hold")
          navigation.hold(girl, female.gazeNormal);
        else if (distance < 0.2 && girl.mode === "hold")
          navigation.arrive(
            girl,
            female.routeLength
              ? gardenRoutes.nodes[female.route[female.routeIndex]]
              : tourGirl,
            female.gazeNormal,
          );
        if (time >= male.nextDestinationAt) {
          if (boy.arrived && male.routeIndex + 1 < male.routeLength)
            male.routeIndex++;
          const waypoint = male.routeLength
            ? gardenRoutes.nodes[male.route[male.routeIndex]]
            : tourBoy;
          if (boy.mode === "hold" || boy.arrived)
            navigation.arrive(boy, waypoint, female.gazeNormal);
          male.nextDestinationAt = time + 0.5;
        }
      }
    } else if (female.state === "waitGarden") {
      if (time - female.since > 25) {
        endTour(true);
        return true;
      }
      if (boy.arrived && male.routeIndex + 1 < male.routeLength) {
        male.routeIndex++;
        navigation.arrive(
          boy,
          gardenRoutes.nodes[male.route[male.routeIndex]],
          female.gazeNormal,
        );
      }
      if (boy.arrived && boy.velocity < 0.003 && !boy.turning) {
        tourShowingAt = time;
        tourDuration = between(4, 6);
        enter(female, "showGarden", tourDuration);
        enter(male, "gardenGuest", tourDuration);
        if (!tourCounted) {
          stats.gardenTours++;
          tourCounted = true;
        }
        stats.gardenVisits++;
      }
    } else if (time >= tourShowingAt + tourDuration) {
      if (--tourStops <= 0 || !startTour(true)) endTour();
      return true;
    }
    if (female.state === "showGarden") {
      const local = (time - tourShowingAt) / tourDuration;
      for (const record of actors) {
        const partner = record === female ? boy : girl;
        if (local > 0.55 && local < 0.75)
          record.focus.copy(partner.normal).multiplyScalar(eyeRadius(partner));
        else record.focus.copy(tourFocus);
        record.gazeNormal.copy(record.focus).normalize();
        navigation.hold(record.walker, record.gazeNormal);
      }
    }
    return true;
  }
  function startStroll() {
    // Parallel short destinations preserve personal space and keep the pair
    // side by side. Reject a blocked corridor before starting either walker.
    tangent.copy(girl.forward).add(boy.forward);
    tangent.addScaledVector(girl.normal, -tangent.dot(girl.normal));
    if (tangent.lengthSq() < 1e-6)
      tangent.crossVectors(girl.normal, boy.normal);
    tangent.normalize();
    for (let attempt = 0; attempt < 6; attempt++) {
      const turn = (attempt * Math.PI) / 3;
      lateral.crossVectors(girl.normal, tangent).normalize();
      facing
        .copy(tangent)
        .multiplyScalar(Math.cos(turn))
        .addScaledVector(lateral, Math.sin(turn));
      meetingGirl.copy(girl.normal).addScaledVector(facing, 0.16).normalize();
      meetingBoy.copy(boy.normal).addScaledVector(facing, 0.16).normalize();
      if (
        !navigation.isClear(meetingGirl, girl) ||
        !navigation.isClear(meetingBoy, boy) ||
        !navigation.segmentClear(girl.normal, meetingGirl, girl) ||
        !navigation.segmentClear(boy.normal, meetingBoy, boy)
      )
        continue;
      const duration = between(3, 5);
      boy.softPartner = girl;
      girl.softPartner = boy;
      if (
        !navigation.arrive(girl, meetingGirl) ||
        !navigation.arrive(boy, meetingBoy)
      )
        continue;
      for (const record of actors) enter(record, "stroll", duration);
      stats.strolls++;
      return true;
    }
    return false;
  }
  function startFlag() {
    const start = Math.floor(random() * flagViews.length);
    for (let i = 0; i < flagViews.length; i++) {
      const point = flagViews[(start + i) % flagViews.length];
      if (!navigation.isClear(point, girl, 0.006)) continue;
      girl.arrivalRadius = 0.004;
      if (!navigation.arrive(girl, point, flagFacing)) continue;
      female.goal.copy(point);
      female.focus.copy(flag.focuses[0]);
      enter(female, "travelFlag", 60);
      flagStarted = time;
      nextFlagAt = time + between(65, 100);
      flagJoined =
        socialAvailable(male) &&
        angle(boy.normal, girl.normal) < 0.8 &&
        random() < 0.65;
      if (flagJoined) {
        enter(male, "joinFlag", 60);
        male.nextDestinationAt = 0;
        boy.softPartner = girl;
        girl.softPartner = boy;
        stats.flagCompanions++;
      }
      return true;
    }
    nextFlagAt = time + between(8, 15);
    return false;
  }
  function endFlag() {
    if (
      flagJoined &&
      time >= male.nextTalkAt &&
      time >= female.nextTalkAt &&
      random() < 0.6 &&
      reserveMeeting()
    ) {
      flagJoined = false;
      male.runUntil = 0;
      enter(female, "meeting", 20);
      enter(male, "meeting", 20);
      navigation.arrive(girl, meetingGirl, boy.normal);
      navigation.arrive(boy, meetingBoy, girl.normal);
      return;
    }
    wander(female);
    if (flagJoined) {
      male.runUntil = 0;
      wander(male);
    }
    flagJoined = false;
  }
  function updateFlag() {
    if (female.state !== "travelFlag" && female.state !== "flag") return false;
    if (
      time - flagStarted > 60 ||
      female.stalled > 4 ||
      (female.state === "flag" && time >= female.until)
    ) {
      endFlag();
      return false;
    }
    const separation = angle(boy.normal, girl.normal);
    if (flagJoined && male.state === "joinFlag") {
      // Catch up to the guide first. Only jog while separated; braking and the
      // planted-foot gait still use measured travel distance.
      male.runUntil = separation > 0.18 ? time + 0.5 : 0;
      if (time >= male.nextDestinationAt) {
        if (!socialDestination(boy, girl, 0.085) && boy.blocked)
          male.stalled += DECISION_STEP;
        male.nextDestinationAt = time + 0.75;
      }
      male.focus.copy(female.state === "flag" ? flag.focuses[0] : girl.normal);
      if (female.state !== "flag") male.focus.multiplyScalar(eyeRadius(girl));
      if (female.state === "flag" && separation < 0.12) {
        navigation.hold(boy, flagFacing);
        male.runUntil = 0;
        enter(male, "flagGuest", Math.max(1, female.until - time));
      }
      if (male.stalled > 4) {
        flagJoined = false;
        wander(male);
      }
    }
    if (female.state === "travelFlag") {
      // Give a joining partner a brief catch-up opportunity, then keep leading.
      if (flagJoined && separation > 0.23 && time - flagStarted < 8)
        navigation.hold(girl, boy.normal);
      else if (girl.mode === "hold")
        navigation.arrive(girl, female.goal, flagFacing);
      if (girl.arrived && girl.velocity < 0.003) {
        navigation.hold(girl, flagFacing);
        enter(female, "flag", between(4, 7));
        stats.flagVisits++;
      }
    }
    return flagJoined;
  }
  function decisions() {
    stats.decisions++;
    if (female.state === "stroll") {
      if (
        time >= female.until ||
        boy.blocked ||
        girl.blocked ||
        angle(boy.normal, girl.normal) > 0.17
      ) {
        for (const record of actors) {
          record.nextTalkAt = time + between(3, 8);
          wander(record);
        }
      }
      return;
    }
    if (updateFlag()) return;
    if (
      flag &&
      female.state === "wander" &&
      !female.initial &&
      time >= nextFlagAt &&
      startFlag()
    )
      return;
    if (female.state === "conversation") {
      if (time + 1e-9 >= talkStarted + talkDuration) finishSocial();
      return;
    }
    if (updateHouseTour() || updateTour()) return;
    if (
      female.state === "wander" &&
      time >= female.nextPlayAt &&
      navigation.isClear(girl.normal, girl, 0.012)
    ) {
      female.nextPlayAt = time + 25 + gestureRandom() * 20;
      navigation.hold(girl, boy.normal);
      female.focus.copy(boy.normal).multiplyScalar(eyeRadius(boy));
      enter(female, "playful", 3.5 + gestureRandom() * 0.7);
      female.playfulWait = true;
    }
    for (const record of actors) {
      if (
        record.state === "wander" &&
        !record.initial &&
        time >= record.nextRestAt
      ) {
        record.nextRestAt = time + between(15, 25);
        startRest(record);
      }
    }
    if (male.state === "approachGirl") {
      if (time >= male.until || (boy.blocked && male.stalled >= 3)) {
        finishSocial(true);
        return;
      }
      if (angle(boy.normal, girl.normal) < 0.22 && available(female)) {
        enter(female, "acknowledge", 20);
        female.acknowledgmentAt = time + between(0.3, 0.8);
        boy.softPartner = girl;
        girl.softPartner = boy;
      }
      if (female.state === "acknowledge" && time >= female.acknowledgmentAt) {
        navigation.arrive(girl, meetingGirl, boy.normal);
        enter(female, "waiting", 20);
      }
      if (angle(boy.normal, girl.normal) > 0.16) male.runUntil = time + 0.5;
      if (female.state === "waiting") girl.lookTarget.copy(boy.normal);
      if (female.state === "waiting" && readyToTalk()) beginTalk();
      return;
    }
    if (
      ((female.state === "wander" && time - female.since > 1.5) ||
        (female.state === "garden" &&
          time - female.since > 2.5 &&
          !pendingFeature(female))) &&
      socialAvailable(male) &&
      !female.initial &&
      time >= female.nextTalkAt &&
      time >= male.nextTalkAt &&
      time >= nextOpportunityAt
    ) {
      nextOpportunityAt = time + between(0.6, 1.2);
      if (mutuallyVisible() && random() < 0.85 && greeting()) return;
      if (
        female.state === "wander" &&
        (INSPECTION.has(male.state) ||
          male.state === "wander" ||
          male.state === "rest") &&
        angle(girl.normal, boy.normal) < 0.7 &&
        random() < 0.85 &&
        quietApproach()
      ) {
        return;
      }
    }
    if (female.state === "wave" || female.state === "meeting") {
      if (
        male.state === "acknowledge" &&
        time >= male.acknowledgmentAt &&
        !male.responded
      ) {
        navigation.arrive(boy, meetingBoy, girl.normal);
        male.responded = true;
      }
      girl.lookTarget.copy(boy.normal);
      boy.lookTarget.copy(girl.normal);
      if (female.state === "wave" && time >= female.until) {
        enter(female, "meeting", 30);
        enter(male, "meeting", 30);
        navigation.arrive(girl, meetingGirl, boy.normal);
        navigation.arrive(boy, meetingBoy, girl.normal);
      }
      if (female.state === "meeting") {
        girl.lookTarget.copy(boy.normal);
        boy.lookTarget.copy(girl.normal);
        if (time >= female.until) {
          finishSocial(true);
          return;
        }
        if (readyToTalk()) beginTalk();
      }
      return;
    }
    if (female.state === "approach") {
      // A visible, unanswered approach becomes one clear silent call instead
      // of chasing a slightly faster walker until the activity times out.
      if (
        time - female.since > 5 &&
        male.state !== "waiting" &&
        angle(girl.normal, boy.normal) > female.approachDistance * 0.85 &&
        mutuallyVisible(false) &&
        greeting(true)
      )
        return;
      if (
        time >= female.until ||
        (girl.blocked && time - female.since > 3 && female.stalled >= 3)
      ) {
        if (mutuallyVisible(false) && greeting(true)) return;
        finishSocial(true);
        return;
      }
      if (angle(girl.normal, boy.normal) < 0.22 && available(male)) {
        enter(male, "acknowledge", 20);
        male.acknowledgmentAt = time + between(0.3, 0.8);
        boy.softPartner = girl;
        girl.softPartner = boy;
      }
      if (male.state === "acknowledge" && time >= male.acknowledgmentAt) {
        navigation.hold(boy, girl.normal);
        enter(male, "waiting", 20);
      }
      if (male.state === "waiting") boy.lookTarget.copy(girl.normal);
      if (time >= female.nextDestinationAt) {
        if (!socialDestination()) {
          finishSocial(true);
          return;
        }
        female.nextDestinationAt = time + 0.5;
      }
      if (male.state === "waiting" && readyToTalk()) beginTalk();
    }
    for (const record of actors) {
      if (
        record.state === "approach" ||
        record.state === "waiting" ||
        record.state === "acknowledge" ||
        record.state === "conversation" ||
        !available(record)
      )
        continue;
      if (
        record.state === "travelGarden" ||
        record.state === "travelRocket" ||
        record.state === "travelHouse" ||
        record.state === "travelRest"
      ) {
        if (
          record.walker.arrived &&
          record.walker.velocity < 0.003 &&
          !record.walker.turning
        ) {
          if (record.routeIndex + 1 < record.routeLength) {
            record.routeIndex++;
            if (
              !navigation.arrive(
                record.walker,
                gardenRoutes.nodes[record.route[record.routeIndex]],
                record.gazeNormal,
              )
            )
              record.stalled = 3;
            continue;
          }
          navigation.hold(record.walker, record.gazeNormal);
          if (record.state === "travelRest") {
            enter(record, "sit", between(5, 12));
            stats.seatedRests++;
            continue;
          }
          const featureSlot = record.visitFeatures.indexOf(record.lastFeature);
          prepareTouch(record);
          if (featureSlot >= 0) record.featureSeen[featureSlot] = 1;
          if (record.lastFeature?.kind === "flower")
            record.lastFlower = record.lastFeature;
          if (!record.visitCounted) {
            record.visitStarted = time;
            record.visitEnd = time + record.visitDuration;
          }
          enter(
            record,
            record === female
              ? "garden"
              : record.interest === house
                ? "house"
                : "rocket",
            Math.max(
              record.touchActive ? 3 : 1.5,
              Math.min(between(1.5, 3), record.visitEnd - time),
            ),
          );
          if (record.visitCounted) continue;
          record.visitCounted = true;
          if (record === female) stats.gardenVisits++;
          else if (record.interest === house) {
            stats.houseVisits++;
            rocketStreak = 0;
          } else {
            stats.rocketVisits++;
            rocketStreak++;
          }
        } else if (
          time >= record.until ||
          (time >= record.visitEnd && !pendingFeature(record))
        ) {
          if (time >= record.until) stats.aborts++;
          endVisit(record);
        } else if (record.stalled >= 3) {
          if (record.state === "travelRest") {
            const retry = record.retries + 1;
            if (retry > 2 || !startRest(record)) wander(record);
            else record.retries = retry;
            continue;
          }
          if (record.retries++ >= 2 || !inspectDestination(record)) {
            stats.aborts++;
            endVisit(record);
          }
          record.stalled = 0;
        }
      } else if (time >= record.until) {
        if (record.state === "sit") {
          enter(record, "stand", 0.7);
          continue;
        }
        if (INSPECTION.has(record.state)) {
          if (
            --record.stopsRemaining > 0 &&
            (pendingFeature(record) || time < record.visitEnd - 3) &&
            time < record.visitUntil &&
            inspectDestination(record)
          ) {
            enter(
              record,
              record === female
                ? "travelGarden"
                : record.interest === house
                  ? "travelHouse"
                  : "travelRocket",
              Math.max(0, record.visitUntil - time),
            );
          } else endVisit(record);
        } else choose(record);
      }
    }
  }
  function pose(record, dt) {
    const inspecting =
      INSPECTION.has(record.state) ||
      record.state === "showGarden" ||
      record.state === "gardenGuest" ||
      record.state === "showHouse" ||
      record.state === "houseGuest";
    const talking = record.state === "conversation";
    const atFlag = record.state === "flag" || record.state === "flagGuest";
    let hand = 0;
    let chest = 0;
    let nod = 0;
    let wave = 0;
    let left = 0,
      right = 0,
      pointLeft = 0,
      pointRight = 0;
    let shift = 0,
      yaw = 0,
      stance = 0,
      shake = 0,
      hop = 0;
    let touch = 0;
    let salute = 0;
    let spread = 0,
      dance = 0;
    const elapsed = time - record.since;
    const inviting =
      record.state === "inviteGarden" ||
      record.state === "acceptGarden" ||
      record.state === "inviteHouse" ||
      record.state === "acceptHouse";
    const walkingTogether =
      record.state === "stroll" ||
      record.state === "joinFlag" ||
      record.state === "leadGarden" ||
      record.state === "followGarden" ||
      record.state === "leadHouse" ||
      record.state === "followHouse";
    const visitingHouse =
      record.state.endsWith("House") || record.state === "houseGuest";
    const guide = visitingHouse ? male : female;
    const sharedFocus = visitingHouse ? houseFocus : tourFocus;
    let pointing = false;
    if (record.state === "wave") {
      record.focus.copy(boy.normal).multiplyScalar(eyeRadius(boy));
      const phase = clamp(
        (time - record.since) / (record.until - record.since),
        0,
        1,
      );
      wave =
        Math.min(1, phase * 6, (1 - phase) * 6) *
        (0.88 + 0.12 * Math.cos(phase * Math.PI * 6));
      const jump = (elapsed - record.waveHopAt) / 0.85;
      if (record.waveHop && jump > 0 && jump < 1)
        hop = 4 * jump * (1 - jump) * 0.018;
    } else if (inspecting) {
      const phase = clamp(
        (time - record.since) / (record.until - record.since),
        0,
        1,
      );
      const gesturePhase = (phase * 2 + record.variant) % 3;
      hand =
        gesturePhase > 1 && gesturePhase < 2
          ? Math.sin((gesturePhase - 1) * Math.PI) *
            (record === male ? 0.28 : 0.7)
          : 0;
      pointing = record.lastFeature?.kind !== "rock" && hand > 0;
      if (
        record === female &&
        record.touchActive &&
        record.state === "garden"
      ) {
        touch =
          phase > 0.2 && phase < 0.8
            ? Math.sin(((phase - 0.2) / 0.6) * Math.PI)
            : 0;
        hand = touch;
        pointing = false;
      }
      chest =
        record === female && gesturePhase < 1
          ? Math.sin(gesturePhase * Math.PI)
          : 0;
      if (record.touchActive && record.state === "garden") chest = 0;
      shift = Math.sin(elapsed * 0.8 + record.variant) * 0.0012;
      if (record === female) {
        spread = Math.sin(elapsed * 1.2) ** 2 * 0.3;
        nod = Math.sin(elapsed * 1.4 + record.variant) * 0.055;
        yaw = Math.sin(elapsed * 0.9) * 0.045;
      }
      if (
        elapsed > 1.3 &&
        elapsed < 2.1 &&
        navigation.isClear(record.walker.normal, record.walker, 0.002)
      )
        stance = Math.sin(((elapsed - 1.3) * Math.PI) / 0.8) * 0.0015;
    } else if (talking) {
      record.focus
        .copy(record === female ? boy.normal : girl.normal)
        .multiplyScalar(eyeRadius(record === female ? boy : girl));
      for (let i = 0; i < exchanges; i++) {
        const turn = talkTurns[i];
        const local = (time - talkStarted - turn.start) / turn.duration;
        if (local < 0 || local > 1) continue;
        const envelope = Math.sin(local * Math.PI) ** 1.4;
        const speaker = i % 2 === 0 ? female : male;
        if (record === speaker) {
          hand = envelope * (record === female ? 1 : 0.76);
          left = turn.arm === 0 || turn.both ? hand : 0;
          right =
            turn.arm === 1 || turn.both ? hand * (turn.both ? 0.82 : 1) : 0;
          if (turn.nod) {
            nod =
              Math.sin(local * Math.PI * 2) * (record === male ? 0.09 : 0.07);
            if (record === female)
              shake = Math.sin(local * Math.PI * 2) * 0.085;
          }
          if (turn.spread) spread = envelope;
        } else if (turn.nod) {
          nod = Math.sin(local * Math.PI * 2) * (record === male ? 0.17 : 0.12);
          if (record === female) shake = Math.sin(local * Math.PI * 2) * 0.18;
        }
      }
      shift = Math.sin(elapsed * 0.48 + record.variant) * 0.0014;
      yaw = Math.sin(elapsed * 0.7 + record.variant) * 0.045;
      const glance = (elapsed + record.variant * 0.9) % 5.5;
      if (glance > 4.7)
        yaw += Math.sin(((glance - 4.7) / 0.8) * Math.PI) * 0.12;
      // A tiny one-foot adjustment, entirely inside the reserved body footprint.
      // It is sparse and phase-offset, rather than an idle walking cycle.
      const adjustment = (elapsed + record.variant * 1.7) % 8;
      if (
        adjustment > 5.5 &&
        adjustment < 6.4 &&
        navigation.isClear(record.walker.normal, record.walker, 0.002)
      )
        stance = Math.sin(((adjustment - 5.5) * Math.PI) / 0.9) * 0.002;
    }
    if (record.state === "showGarden" || record.state === "showHouse") {
      const local =
        record.state === "showHouse"
          ? elapsed / (record.until - record.since)
          : (time - tourShowingAt) / tourDuration;
      hand =
        local > 0.08 && local < 0.5
          ? Math.sin(((local - 0.08) / 0.42) * Math.PI)
          : 0;
      pointing = true;
      chest = 0;
    }
    if (record.state === "gardenGuest" || record.state === "houseGuest") {
      nod =
        elapsed > 2 && elapsed < 2.7
          ? Math.sin(((elapsed - 2) * Math.PI) / 0.7) * 0.06
          : 0;
      hand =
        elapsed > 3.5 && elapsed < 4.4
          ? Math.sin(((elapsed - 3.5) * Math.PI) / 0.9) * 0.55
          : 0;
      chest = 0;
    }
    if (inviting) {
      record.focus.copy(sharedFocus);
      const start = record === guide ? 0.25 : 1.1;
      const local = clamp((elapsed - start) / 1.4, 0, 1);
      hand = Math.sin(local * Math.PI) * (record === guide ? 1 : 0.65);
      pointing = true;
      nod =
        record !== guide && elapsed > 0.8 && elapsed < 1.3
          ? Math.sin((elapsed - 0.8) * Math.PI * 2) * 0.05
          : 0;
    }
    if (walkingTogether) {
      if (
        record.state === "stroll" ||
        record.state === "joinFlag" ||
        (elapsed + (record === male ? 2 : 0)) % 7 > 5.8
      )
        record.focus
          .copy(record === female ? boy.normal : girl.normal)
          .multiplyScalar(eyeRadius(record === female ? boy : girl));
      else record.focus.copy(sharedFocus);
      const local =
        (time - (visitingHouse ? houseTourStarted : tourStarted)) % 2.2;
      const speaker =
        Math.floor(
          (time - (visitingHouse ? houseTourStarted : tourStarted)) / 2.2,
        ) %
          2 ===
        (record === female ? 0 : 1);
      if (local > 0.3 && local < 1.45) {
        const stroke = Math.sin(((local - 0.3) / 1.15) * Math.PI);
        if (speaker) {
          hand = stroke * 0.65;
          spread = record.variant === 1 ? stroke * 0.7 : 0;
        } else nod = stroke * 0.1;
        record.focus
          .copy(record === female ? boy.normal : girl.normal)
          .multiplyScalar(eyeRadius(record === female ? boy : girl));
      }
    }
    if (atFlag) {
      record.focus.copy(flag.focuses[0]);
      salute =
        record === female
          ? Math.min(
              1,
              Math.max(0, elapsed - 0.5) * 2,
              Math.max(0, record.until - time) * 2,
            )
          : 0;
      nod = record === male ? Math.sin(elapsed * 2) * 0.045 : 0;
    }
    if (record.state === "wave" && record.calling) {
      hand = Math.sin((Math.min(1, elapsed / 0.7) * Math.PI) / 2) * 0.8;
      spread = 0.85;
      shake = Math.sin(elapsed * 5) * 0.17;
    }
    if (
      record.playfulWait &&
      record.walker.mode === "hold" &&
      record.walker.velocity < 0.003 &&
      elapsed > 0.4 &&
      elapsed < 3.6
    ) {
      const local = elapsed - 0.4;
      const envelope = Math.min(1, local * 3, (3.2 - local) * 3);
      dance = envelope * (0.75 + Math.sin(local * 3) * 0.15);
      hand = envelope * (0.72 + Math.sin(local * 5) * 0.18);
      spread = dance;
      shake = Math.sin(local * 3.5) * 0.13 * envelope;
      nod = Math.sin(local * 4) * 0.08 * envelope;
      const bounce = local % 1.4;
      if (bounce < 0.5)
        hop = Math.sin((bounce * Math.PI) / 0.5) * 0.012 * envelope;
    }
    if (record.state === "sit") {
      chest = 0.35;
      hand = 0.12;
    }
    if (!talking) {
      left = record.variant % 2 === 0 ? hand : 0;
      right = record.variant % 2 === 1 ? hand : 0;
      if (dance > 0 || (record.state === "wave" && record.calling)) {
        left = hand;
        right = hand * 0.82;
      }
      if (touch > 0) {
        left = record.touchArm === 0 ? hand : 0;
        right = record.touchArm === 1 ? hand : 0;
      }
    }
    if (pointing) {
      pointLeft = left;
      pointRight = right;
    }
    const active =
      atFlag ||
      record.state === "travelFlag" ||
      inspecting ||
      talking ||
      inviting ||
      walkingTogether ||
      record.state === "wave" ||
      dance > 0 ||
      record.state === "sit";
    const blend = 1 - Math.exp(-dt / (talking ? 0.09 : 0.16));
    const output = record.pose;
    output.weight += ((active ? 1 : 0) - output.weight) * blend;
    output.hand += (hand - output.hand) * blend;
    output.wave += (wave - output.wave) * blend;
    output.chest += (chest - output.chest) * blend;
    output.lean +=
      ((inspecting ? 0.04 + hand * 0.04 : 0) - output.lean) * blend;
    output.tilt +=
      ((inspecting ? Math.sin(elapsed * 0.8 + record.variant) * 0.06 : 0) -
        output.tilt) *
      blend;
    output.nod += (nod - output.nod) * blend;
    output.left += (left - output.left) * blend;
    output.right += (right - output.right) * blend;
    output.pointLeft += (pointLeft - output.pointLeft) * blend;
    output.pointRight += (pointRight - output.pointRight) * blend;
    output.shift += (shift - output.shift) * blend;
    output.yaw += (yaw - output.yaw) * blend;
    output.stance += (stance - output.stance) * blend;
    output.shake += (shake - output.shake) * blend;
    output.spread += (spread - output.spread) * blend;
    output.dance += (dance - output.dance) * blend;
    output.sit += ((record.state === "sit" ? 1 : 0) - output.sit) * blend;
    output.touch += (touch - output.touch) * blend;
    output.salute += (salute - output.salute) * blend;
    // A bounded ballistic hop has a definite landing, without a floating tail.
    output.hop = hop;
  }
  return {
    actors,
    stats,
    get time() {
      return time;
    },
    step(dt) {
      if (disposed) return;
      time += dt;
      for (const record of actors) {
        const targetSpeed =
          record.cruiseSpeed * (time < record.runUntil ? 1.95 : 1);
        record.walker.speed +=
          (targetSpeed - record.walker.speed) * (1 - Math.exp(-dt * 6));
        if (
          record.state === "travelGarden" ||
          record.state === "travelRocket" ||
          record.state === "travelHouse" ||
          record.state === "travelRest" ||
          record.state === "joinGarden" ||
          record.state === "leadGarden"
        ) {
          const remaining = angle(record.walker.normal, record.walker.target);
          if (
            remaining < record.bestRemaining - 0.0005 ||
            record.walker.arrived
          ) {
            record.bestRemaining = remaining;
            record.stalled = 0;
          } else if (!record.walker.turning || record.walker.moving)
            record.stalled += dt;
        } else if (
          record.walker.moving &&
          record.walker.distance > record.progress + 0.0001
        )
          record.stalled = 0;
        else if (record.walker.blocked) record.stalled += dt;
        record.progress = record.walker.distance;
      }
      decisionTime += dt;
      if (decisionTime + 1e-10 >= DECISION_STEP) {
        decisionTime -= DECISION_STEP;
        decisions();
      }
      for (const record of actors) pose(record, dt);
    },
    dispose() {
      disposed = true;
      for (const record of actors) {
        record.runUntil = 0;
        record.walker.speed = record.cruiseSpeed;
      }
      boy.softPartner = girl.softPartner = null;
      boy.softObstacle = girl.softObstacle = null;
    },
  };
}
