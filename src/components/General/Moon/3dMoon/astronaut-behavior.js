import { Vector3 } from "three";
import { createRandom } from "./wander.js";
import { createGardenRoutes } from "./garden-routes.js";

// Activity selection above steering, following Reynolds' steering hierarchy and
// the FSM example at threejs.org/manual/pages/game.html. No independent timers.
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, a.dot(b))));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const INSPECTION = new Set(["garden", "rocket", "house"]);
const ENGAGED = new Set([
  "conversation",
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
]);

export function createAstronautBehavior({
  navigation,
  boy,
  girl,
  garden,
  rocket,
  house,
  seed,
}) {
  const random = createRandom(seed ^ 0x51e8b39);
  const gestureRandom = createRandom(seed ^ 0x734ab9);
  const between = (min, max) => min + random() * (max - min);
  const tangent = new Vector3();
  const lateral = new Vector3();
  const candidate = new Vector3();
  const facing = new Vector3();
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
  }));
  let disposed = false;
  let nextTourAt = 0;
  let nextOpportunityAt = 0;
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
    conversations: 0,
    aborts: 0,
  };

  function views(interest, walker) {
    if (!interest) return [];
    const points = [];
    const features = interest.features || [
      { normal: interest.normal, radius: interest.radius },
    ];
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
          boundary + walker.radius + (interest.features ? 0.018 : 0.02);
        const point = feature.normal
          .clone()
          .multiplyScalar(Math.cos(radius))
          .addScaledVector(tangent, Math.sin(radius) * Math.cos(turn))
          .addScaledVector(lateral, Math.sin(radius) * Math.sin(turn))
          .normalize();
        point.feature = feature;
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
      },
    };
  }
  const male = actor(boy, rocket, between(8, 16));
  const female = actor(girl, garden, between(5, 12));
  const actors = [male, female];
  const rocketViews = male.views;
  const houseViews = views(house, boy);
  const guestViews = garden?.features ? female.views : views(garden, boy);
  const tourFlowers =
    garden?.features?.filter((feature) => feature.kind === "flower") || [];
  const gardenRoutes = garden?.features
    ? createGardenRoutes(navigation, female.views, garden.normal, boy)
    : null;

  function enter(record, state, duration) {
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
    // Occasionally wander near a social interest, rather than relying on two
    // independent broad random walks to happen to meet. The full bounds stay open.
    const anchor =
      record === female && random() < 0.75
        ? boy.normal
        : record === male && garden && random() < 0.4
          ? garden.normal
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
          record === female ? between(0.16, 0.32) : between(0.35, 0.55);
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
      time + (record === female ? between(10, 18) : between(15, 28));
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
        (point.feature === record.lastFeature ? 0.18 : 0);
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
  function startInspection(record, first = false) {
    if (record === male && house) {
      record.interest =
        !first && (random() < 0.4 || rocketStreak >= 2) ? house : rocket;
      record.views = record.interest === house ? houseViews : rocketViews;
    }
    record.visitDuration =
      record === female ? between(18, 35) : between(12, 24);
    record.stopsRemaining = Math.ceil(record.visitDuration / 4);
    record.visitEnd = Infinity;
    record.featureCount = 0;
    record.visitFeatures.fill(null);
    record.featureSeen.fill(0);
    if (record === female && garden?.features) {
      record.featureCount = 1 + Math.floor(random() * 4);
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
        for (const feature of garden.features)
          if (!record.visitFeatures.includes(feature))
            total +=
              feature.kind === "flower" ? 3 : feature.kind === "lamp" ? 2 : 0.5;
        let roll = random() * total;
        for (const feature of garden.features) {
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
    record.visitUntil = time + 90;
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
      90,
    );
  }
  function available(record) {
    return !ENGAGED.has(record.state);
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
  function mutuallyVisible() {
    const separation = angle(boy.normal, girl.normal);
    if (
      separation < 0.22 ||
      separation > 0.65 ||
      !sees(boy, girl.normal) ||
      !sees(girl, boy.normal)
    )
      return false;
    eyeA.copy(girl.normal).multiplyScalar(1.063);
    eyeDelta.copy(boy.normal).multiplyScalar(1.063).sub(eyeA);
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
      .multiplyScalar(Math.cos(0.04))
      .addScaledVector(tangent, Math.sin(0.04))
      .normalize();
    meetingBoy
      .copy(facing)
      .multiplyScalar(Math.cos(0.04))
      .addScaledVector(tangent, -Math.sin(0.04))
      .normalize();
    return (
      navigation.isClear(meetingGirl, girl, 0.005) &&
      navigation.isClear(meetingBoy, boy, 0.005)
    );
  }
  function greeting() {
    if (!reserveMeeting()) return false;
    enter(female, "wave", between(3.5, 5.5));
    enter(male, "acknowledge", 30);
    male.acknowledgmentAt = time + between(0.4, 0.9);
    female.waveHop = gestureRandom() < 0.5;
    female.waveHopAt = 0.8 + gestureRandom() * 1.2;
    male.responded = false;
    navigation.arrive(girl, meetingGirl, boy.normal);
    girl.softPartner = boy;
    boy.softPartner = girl;
    stats.waves++;
    return true;
  }
  function socialDestination(mover = girl, anchor = boy, spacing = 0.08) {
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
      if (navigation.isClear(candidate, mover, 0.005))
        return navigation.arrive(mover, candidate, anchor.normal);
    }
    return false;
  }
  function finishSocial(aborted = false) {
    if (aborted) stats.aborts++;
    const cooldown = aborted ? between(6, 10) : between(10, 18);
    for (const record of actors) {
      record.nextTalkAt = time + cooldown;
      record.walker.softPartner = null;
    }
    if (
      !aborted &&
      garden &&
      time >= nextTourAt &&
      random() < (stats.gardenTours === 0 ? 0.65 : 0.4) &&
      startTour()
    )
      return;
    wander(female);
    if (
      male.state === "waiting" ||
      male.state === "acknowledge" ||
      male.state === "conversation" ||
      male.state === "meeting"
    )
      wander(male);
  }
  function choose(record) {
    if (record.initial) {
      record.initial = false;
      if (record.interest) {
        startInspection(record, true);
        return;
      }
    }
    const canInspect = record.interest && time >= record.nextInspectAt;
    const canTalk =
      record === female &&
      available(male) &&
      !male.state.startsWith("travel") &&
      time >= record.nextTalkAt &&
      time >= male.nextTalkAt &&
      angle(boy.normal, girl.normal) <= 0.75;
    const inspectionWeight = canInspect ? (record === female ? 0.5 : 0.35) : 0;
    const socialWeight = canTalk ? 0.8 : 0;
    const idleWeight = record === male ? 0.1 : 0;
    const roll =
      random() *
      ((record === female ? 0.15 : 0.55) +
        inspectionWeight +
        socialWeight +
        idleWeight);
    if (roll < inspectionWeight) startInspection(record);
    else if (roll < inspectionWeight + socialWeight) {
      if (socialDestination()) {
        enter(record, "approach", 20);
        record.nextDestinationAt = time + 0.5;
      } else wander(record);
    } else if (roll < inspectionWeight + socialWeight + idleWeight) {
      navigation.hold(record.walker, record.walker.target);
      enter(record, "rest", between(3, 7));
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
      separation >= 0.075 &&
      separation <= 0.09 &&
      aligned(girl, boy.normal) &&
      aligned(boy, girl.normal)
    );
  }
  function beginTalk() {
    talkStarted = time;
    talkDuration = between(16, 28);
    exchanges = Math.min(talkTurns.length, Math.round(talkDuration / 1.5));
    for (let i = 0; i < exchanges; i++) {
      const turn = talkTurns[i];
      const period = talkDuration / exchanges;
      turn.start = i * period + 0.12 + gestureRandom() * 0.12;
      turn.duration = Math.min(period - 0.28, 0.85 + gestureRandom() * 0.35);
      turn.arm = gestureRandom() < 0.5 ? 0 : 1;
      turn.both = gestureRandom() < 0.22;
      turn.nod = gestureRandom() < 0.5;
    }
    for (const record of actors) enter(record, "conversation", talkDuration);
    navigation.hold(girl, boy.normal);
    navigation.hold(boy, girl.normal);
    stats.conversations++;
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
      tourStops = 1 + Math.floor(random() * 3);
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
        tourDuration = between(6, 9);
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
          record.focus.copy(partner.normal).multiplyScalar(1.063);
        else record.focus.copy(tourFocus);
        record.gazeNormal.copy(record.focus).normalize();
        navigation.hold(record.walker, record.gazeNormal);
      }
    }
    return true;
  }
  function decisions() {
    stats.decisions++;
    if (female.state === "conversation") {
      if (time >= talkStarted + talkDuration) finishSocial();
      return;
    }
    if (updateTour()) return;
    if (
      ((female.state === "wander" && time - female.since > 3) ||
        (female.state === "garden" && time - female.since > 5)) &&
      available(male) &&
      !female.initial &&
      time >= female.nextTalkAt &&
      time >= male.nextTalkAt &&
      time >= nextOpportunityAt
    ) {
      nextOpportunityAt = time + between(1.5, 3);
      if (mutuallyVisible() && random() < 0.75 && greeting()) return;
      if (
        female.state === "wander" &&
        INSPECTION.has(male.state) &&
        angle(girl.normal, boy.normal) < 0.7 &&
        random() < 0.5 &&
        socialDestination()
      ) {
        enter(female, "approach", 20);
        female.nextDestinationAt = time + 0.5;
        return;
      }
    }
    if (female.state === "wave" || female.state === "meeting") {
      if (male.state === "acknowledge" && time >= male.acknowledgmentAt)
        navigation.hold(boy, girl.normal);
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
      if (
        time >= female.until ||
        (girl.blocked && time - female.since > 3 && female.stalled >= 3)
      ) {
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
        record.state === "travelHouse"
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
            Math.max(0.5, Math.min(between(4, 7), record.visitEnd - time)),
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
        } else if (time >= record.until || time >= record.visitEnd) {
          if (time >= record.until) stats.aborts++;
          endVisit(record);
        } else if (record.stalled >= 3) {
          if (record.retries++ >= 2 || !inspectDestination(record)) {
            stats.aborts++;
            endVisit(record);
          }
          record.stalled = 0;
        }
      } else if (time >= record.until) {
        if (INSPECTION.has(record.state)) {
          if (
            --record.stopsRemaining > 0 &&
            time < record.visitEnd - 3 &&
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
      record.state === "gardenGuest";
    const talking = record.state === "conversation";
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
      stance = 0;
    const elapsed = time - record.since;
    const inviting =
      record.state === "inviteGarden" || record.state === "acceptGarden";
    const walkingTogether =
      record.state === "leadGarden" || record.state === "followGarden";
    let pointing = false;
    if (record.state === "wave") {
      record.focus.copy(boy.normal).multiplyScalar(1.063);
      const phase = clamp(
        (time - record.since) / (record.until - record.since),
        0,
        1,
      );
      wave =
        Math.min(1, phase * 6, (1 - phase) * 6) *
        (0.88 + 0.12 * Math.cos(phase * Math.PI * 6));
    } else if (inspecting) {
      const phase = clamp(
        (time - record.since) / (record.until - record.since),
        0,
        1,
      );
      const gesturePhase = (phase * 2 + record.variant) % 3;
      hand =
        gesturePhase > 1 && gesturePhase < 2
          ? Math.sin((gesturePhase - 1) * Math.PI)
          : 0;
      pointing = record.lastFeature?.kind !== "rock" && hand > 0;
      chest =
        record === female && gesturePhase < 1
          ? Math.sin(gesturePhase * Math.PI)
          : 0;
    } else if (talking) {
      record.focus
        .copy(record === female ? boy.normal : girl.normal)
        .multiplyScalar(1.063);
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
        } else if (turn.nod) nod = Math.sin(local * Math.PI * 2) * 0.045;
      }
      shift = Math.sin(elapsed * 0.48 + record.variant) * 0.0014;
      yaw = Math.sin(elapsed * 0.7 + record.variant) * 0.045;
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
    if (record.state === "showGarden") {
      const local = (time - tourShowingAt) / tourDuration;
      hand =
        local > 0.08 && local < 0.5
          ? Math.sin(((local - 0.08) / 0.42) * Math.PI)
          : 0;
      pointing = true;
      chest = 0;
    }
    if (record.state === "gardenGuest") {
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
      record.focus.copy(tourFocus);
      const start = record === female ? 0.25 : 1.1;
      const local = clamp((elapsed - start) / 1.4, 0, 1);
      hand = Math.sin(local * Math.PI) * (record === female ? 1 : 0.65);
      pointing = true;
      nod =
        record === male && elapsed > 0.8 && elapsed < 1.3
          ? Math.sin((elapsed - 0.8) * Math.PI * 2) * 0.05
          : 0;
    }
    if (walkingTogether) {
      if ((elapsed + (record === male ? 2 : 0)) % 7 > 5.8)
        record.focus
          .copy(record === female ? boy.normal : girl.normal)
          .multiplyScalar(1.063);
      else record.focus.copy(tourFocus);
    }
    if (!talking) {
      left = record.variant % 2 === 0 ? hand : 0;
      right = record.variant % 2 === 1 ? hand : 0;
    }
    if (pointing) {
      pointLeft = left;
      pointRight = right;
    }
    const active =
      inspecting ||
      talking ||
      inviting ||
      walkingTogether ||
      record.state === "wave";
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
        if (
          record.state === "travelGarden" ||
          record.state === "travelRocket" ||
          record.state === "travelHouse" ||
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
      if (decisionTime + 1e-10 >= 0.2) {
        decisionTime -= 0.2;
        decisions();
      }
      for (const record of actors) pose(record, dt);
    },
    dispose() {
      disposed = true;
      boy.softPartner = girl.softPartner = null;
      boy.softObstacle = girl.softObstacle = null;
    },
  };
}
