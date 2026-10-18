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
const SOCIAL_IDLE = new Set(["wander", "rest", "sit"]);
const FEMALE_SOCIAL_IDLE = new Set(["wander", "rest", "sit", "playful"]);
const INSPECTION = new Set(["garden", "rocket", "house"]);
const ENGAGED = new Set([
  "flipApproach",
  "backflip",
  "watchFlip",
  "conversation",
  "gardenCall",
  "travelDance",
  "gardenDance",
  "gardenClap",
  "travelFlag",
  "flag",
  "joinFlag",
  "flagGuest",
  "stroll",
  "strollDepart",
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
  const performanceRandom = createRandom(seed ^ 0x1e8c79);
  const flagRandom = createRandom(seed ^ 0x431fc9);
  const gestureRandom = createRandom(seed ^ 0x734ab9);
  const playfulRandom = createRandom(seed ^ 0x735b1e);
  const flipRandom = createRandom(seed ^ 0x29c8a17);
  let flipPhase = "none";
  let flipStarted = 0;
  let nextFlipAt = 35 + flipRandom() * 35;
  let nextFlipCheck = 0;
  let nextStrollAt = 0;
  let strollWalkingAt = 0;
  let strollDuration = 0;
  let flipRetargetAt = 0;
  let flipFlight = 1.4;
  const varietyRandom = createRandom(seed ^ 0x3af574);
  let nextSoloOpportunity = 90 + varietyRandom() * 70;
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
  let playBlockedUntil = 0;
  let lastChatAt = -Infinity;
  let lastSocialOutcome = "";
  let previousSocialOutcome = "";
  const novelty = (activity) =>
    activity === lastSocialOutcome
      ? 0.2
      : activity === previousSocialOutcome
        ? 0.65
        : 1;
  function rememberOutcome(activity) {
    previousSocialOutcome = lastSocialOutcome;
    lastSocialOutcome = activity;
  }
  let nextPlayOpportunity = 0;
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
    style: 0,
  }));
  let disposed = false;
  let nextTourAt = 0;
  let nextOpportunityAt = 0;
  let nextMaleOpportunity = 0;
  let nextWaveAt = 8;
  let yieldPhase = "none";
  let yieldStarted = 0;
  let nextYieldAt = 0;
  let obstructedFor = 0;
  const yieldSpot = new Vector3();
  const yieldResume = Array.from({ length: 2 }, () => ({
    mode: "hold",
    target: new Vector3(),
    facing: new Vector3(),
    focus: new Vector3(),
  }));
  let performancePhase = "none";
  let performanceStarted = 0;
  let performanceSawFlowersAt = -1;
  let nextPerformanceAt = 30;
  let nextPerformanceCheck = 0;
  const danceSpot = new Vector3();
  const performanceFlowerFocus = new Vector3();
  const lampInterest = garden?.features?.find(
    (feature) => feature.kind === "lamp",
  );
  let nextBoyVisitAt = 6;
  let nextFlagAt = 45 + flagRandom() * 35;
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
    distantBoyApproaches: 0,
    gardenCalls: 0,
    gardenPerformances: 0,
    calls: 0,
    seatedRests: 0,
    flowerTouches: 0,
    flagVisits: 0,
    flagCompanions: 0,
    strolls: 0,
    conversations: 0,
    backflips: 0,
    flipApproaches: 0,
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
      featureVisits: new Map(
        (interest?.features || []).map((feature) => [feature, 0]),
      ),
      lastSeat: -1,
      previousSeat: -1,
      selectedSeat: -1,
      longApproach: false,
      waveHop: false,
      waveHopAt: 1,
      calling: false,
      playfulWait: false,
      nextPlayAt: 18,
      playVariant: 0,
      playTempo: 1,
      playLead: 1,
      danceSteps: new Uint8Array(16),
      danceEnds: new Float32Array(16),
      gestureStyle: 0,
      approachDistance: 0,
      cruiseSpeed: walker.speed,
      pairSpeed: 0,
      pairSide: 0,
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
        danceStep: 0,
        danceSide: 0,
        danceLiftLeft: 0,
        danceLiftRight: 0,
        shoulder: 0,
        turn: 0,
        roll: 0,
        flip: 0,
        flipTuck: 0,
        crouch: 0,
        sit: 0,
        touch: 0,
        salute: 0,
        clap: 0,
        push: 0,
        arc: 0,
        wrist: 0,
      },
    };
  }
  const male = actor(boy, rocket, between(2, 10));
  const female = actor(girl, garden, between(2, 10));
  const actors = [male, female];
  const pairDirection = new Vector3();
  const pairLateral = new Vector3();
  const pairPoint = new Vector3();
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
  // Reserve clear stage choices around the actual central lamp, not the seat.
  const danceViews = [];
  if (lampInterest) {
    const forward = new Vector3(1, 0, 0)
      .addScaledVector(lampInterest.normal, -lampInterest.normal.x)
      .normalize();
    const side = new Vector3()
      .crossVectors(lampInterest.normal, forward)
      .normalize();
    for (let i = 0; i < 16; i++) {
      const turn = (i * Math.PI) / 8;
      const radius = i % 2 ? 0.12 : 0.09;
      const point = lampInterest.normal
        .clone()
        .multiplyScalar(Math.cos(radius))
        .addScaledVector(forward, Math.sin(radius) * Math.cos(turn))
        .addScaledVector(side, Math.sin(radius) * Math.sin(turn))
        .normalize();
      if (navigation.isStaticClear(point, girl, 0.012)) danceViews.push(point);
    }
  }
  const danceNodeOffset = female.views.length + seatNodes.length;
  const stageRoute = new Int16Array(128);
  let danceViewIndex = -1;
  const gardenRoutes = garden?.features
    ? createGardenRoutes(
        navigation,
        [...female.views, ...seatNodes, ...danceViews],
        garden.normal,
        boy,
      )
    : null;

  function playContext() {
    if (performancePhase !== "none" && performancePhase !== "dance")
      return false;
    if (
      time < playBlockedUntil ||
      (flag && angle(girl.normal, flag.normal) < 0.38)
    )
      return false;
    const nearBoy =
      angle(girl.normal, boy.normal) < 0.28 &&
      navigation.segmentClear(girl.normal, boy.normal, girl);
    const inGarden = garden && angle(girl.normal, garden.normal) < 0.31;
    return nearBoy || inGarden;
  }
  function startPlay() {
    if (
      time < female.nextPlayAt ||
      !playContext() ||
      !navigation.isClear(girl.normal, girl, 0.006)
    )
      return false;
    female.nextPlayAt = time + 25 + gestureRandom() * 20;
    navigation.hold(girl, boy.normal);
    female.focus.copy(boy.normal).multiplyScalar(eyeRadius(boy));
    enter(female, "playful", 3.5 + gestureRandom() * 0.7);
    female.playfulWait = true;
    return true;
  }
  function enter(record, state, duration) {
    record.pairSpeed = 0;
    record.pairSide = 0;
    if (state === "gardenDance") {
      // Sample choreography once, independently of navigation. Every short
      // phrase has a different step from its two immediate predecessors.
      let end = 0;
      const spinIndex =
        playfulRandom() < 0.4 ? 1 + Math.floor(playfulRandom() * 2) : -1;
      for (let i = 0; i < record.danceSteps.length; i++) {
        let step = i === spinIndex ? 6 : Math.floor(playfulRandom() * 6);
        while (
          (i > 0 && step === record.danceSteps[i - 1]) ||
          (i > 1 && step === record.danceSteps[i - 2])
        )
          step = (step + 1) % 6;
        record.danceSteps[i] = step;
        end += step === 6 ? 1.25 : 0.72 + playfulRandom() * 0.3;
        record.danceEnds[i] = end;
      }
      record.playLead = playfulRandom() < 0.5 ? -1 : 1;
    }
    record.playfulWait =
      record === female &&
      playContext() &&
      (state === "waiting" ||
        state === "waitGarden" ||
        state === "acceptHouse") &&
      gestureRandom() < 0.75;
    if (record.playfulWait || state === "playful") {
      record.playVariant =
        (record.playVariant + 1 + Math.floor(playfulRandom() * 4)) % 5;
      // A full-body pivot needs clearance throughout its swept footprint.
      if (
        record.playVariant === 4 &&
        !navigation.isClear(record.walker.normal, record.walker, 0.012)
      )
        record.playVariant = 3;
      record.playTempo = 0.9 + playfulRandom() * 0.25;
      record.playLead = playfulRandom() < 0.5 ? -1 : 1;
    }
    if (
      INSPECTION.has(state) ||
      state === "showGarden" ||
      state === "gardenGuest"
    ) {
      record.lastInspectedPosition.copy(record.walker.target);
      record.hasInspectedPosition = true;
    }
    record.gestureStyle =
      (record.gestureStyle + 1 + Math.floor(gestureRandom() * 3)) % 4;
    if (
      (state === "garden" ||
        state === "showGarden" ||
        state === "gardenGuest") &&
      record.lastFeature?.kind === "flower"
    ) {
      record.lastFlower = record.lastFeature;
      record.featureVisits.set(
        record.lastFeature,
        (record.featureVisits.get(record.lastFeature) || 0) + 1,
      );
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
    record.routeLength = 0;
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
        (record.featureVisits.get(point.feature) || 0) * 0.08 +
        (point.feature.touches?.length && !point.canTouch ? 0.12 : 0);
      if (score < best) {
        if (record === female && record.interest === garden && gardenRoutes) {
          const length = gardenRoutes.plan(
            record.walker.normal,
            index,
            record.route,
          );
          if (!length) continue;
          record.routeLength = length;
        }
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
    if (record === female && record.interest === garden && gardenRoutes) {
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
      const missingRocket = stats.rocketVisits === 0 && time > 120;
      record.interest =
        !missingRocket && (random() < 0.4 || rocketStreak >= 2)
          ? house
          : rocket;
      record.views = record.interest === house ? houseViews : rocketViews;
    }
    record.visitDuration =
      record === female
        ? between(8, 15)
        : record.interest === rocket
          ? between(3, 5)
          : between(5, 10);
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
        let total = 0;
        for (const flower of tourFlowers)
          if (tourFlowers.length === 1 || flower !== record.lastFlower)
            total +=
              ((record.featureVisits.get(flower) || 0) === 0 ? 10 : 1) /
              (1 + (record.featureVisits.get(flower) || 0)) ** 2;
        let pick = random() * total,
          index = 0;
        for (; index < tourFlowers.length - 1; index++) {
          const flower = tourFlowers[index];
          if (tourFlowers.length > 1 && flower === record.lastFlower) continue;
          pick -=
            ((record.featureVisits.get(flower) || 0) === 0 ? 10 : 1) /
            (1 + (record.featureVisits.get(flower) || 0)) ** 2;
          if (pick <= 0) break;
        }
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
    if (performancePhase !== "none" || flipPhase !== "none") return false;
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
    if (!aborted) lastChatAt = time;
    if (aborted) stats.aborts++;
    const cooldown = between(3, 8);
    for (const record of actors) {
      record.nextTalkAt = time + cooldown;
      record.walker.softPartner = null;
      record.runUntil = 0;
    }
    if (
      !aborted &&
      time >= nextStrollAt &&
      random() < 0.5 * novelty("stroll") &&
      startStroll()
    ) {
      rememberOutcome("stroll");
      boyInitiated = false;
      return;
    }
    if (!aborted && gestureRandom() < 0.45 * novelty("play") && startPlay()) {
      rememberOutcome("play");
      boyInitiated = false;
      wander(male);
      return;
    }
    const showHouse = boyInitiated || (house && random() < 0.3);
    boyInitiated = false;
    if (
      !aborted &&
      showHouse &&
      time >= nextHouseTourAt &&
      random() < 0.75 * novelty("house") &&
      startHouseTour()
    ) {
      rememberOutcome("house");
      return;
    }
    if (
      !aborted &&
      garden &&
      time >= nextTourAt &&
      random() < (stats.gardenTours === 0 ? 0.65 : 0.4) * novelty("garden") &&
      startTour()
    ) {
      rememberOutcome("garden");
      return;
    }
    if (!aborted) rememberOutcome("independent");
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
  function quietApproach(preferBoy = false) {
    const separation = angle(boy.normal, girl.normal);
    if (
      preferBoy &&
      separation > 0.35 &&
      separation < 1.3 &&
      socialDestination(boy, girl)
    ) {
      boyInitiated = true;
      male.longApproach = true;
      male.nextDestinationAt = time + 0.8;
      nextBoyVisitAt = time + between(8, 16);
      male.runUntil = time + 1;
      enter(male, "approachGirl", 50);
      stats.boyApproaches++;
      stats.distantBoyApproaches++;
      return true;
    }
    if (
      time >= nextBoyVisitAt &&
      (female.state !== "garden" || !pendingFeature(female)) &&
      (preferBoy || random() < 0.8) &&
      reserveMeeting()
    ) {
      boyInitiated = true;
      male.longApproach = false;
      nextBoyVisitAt = time + between(8, 16);
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
      turn.style = Math.floor(gestureRandom() * 4);
    }
    for (const record of actors) enter(record, "conversation", talkDuration);
    navigation.hold(girl, boy.normal);
    navigation.hold(boy, girl.normal);
    stats.conversations++;
  }
  function startRest(record, near = null) {
    if (!gardenRoutes || !seats.length) return false;
    const continuing = record.state === "travelRest";
    if (!continuing) {
      record.restUntil = time + 60;
      record.retries = 0;
    }
    record.visitEnd = Infinity;
    const start = Math.floor(random() * seats.length);
    const avoidPrevious = random() < 0.5;
    const partner = record === male ? female : male;
    for (let offset = 0; offset < seats.length * 2; offset++) {
      const index = (start + offset) % seats.length;
      if (
        offset < seats.length &&
        seats.length > 1 &&
        (index === record.lastSeat ||
          (avoidPrevious && seats.length > 2 && index === record.previousSeat))
      )
        continue;
      const seat = seats[index];
      if (near && angle(seat.normal, near) > 0.32) continue;
      if (angle(record.walker.normal, seat.normal) > 0.6) continue;
      if (
        (partner.state === "sit" || partner.state === "travelRest") &&
        partner.goal.angleTo(seat.normal) < 0.08
      )
        continue;
      if (!navigation.isClear(seat.normal, record.walker, 0.004)) continue;
      record.selectedSeat = index;
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
      if (
        house.axisY &&
        point.dot(house.axisY) - house.normal.dot(house.axisY) < 0.045
      )
        continue;
      if (!navigation.isClear(point, boy, 0.004)) continue;
      for (let j = 0; j < houseGuestViews.length; j++) {
        const other = houseGuestViews[j];
        if (
          house.axisY &&
          other.dot(house.axisY) - house.normal.dot(house.axisY) < 0.045
        )
          continue;
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
    enter(male, "inviteHouse", between(1.2, 1.8));
    enter(female, "acceptHouse", 90);
    return true;
  }
  function endHouseTour(aborted = false) {
    if (aborted) stats.aborts++;
    nextHouseTourAt = time + between(80, 140);
    nextBoyVisitAt = time + between(8, 16);
    boy.softPartner = girl.softPartner = null;
    for (const record of actors) {
      record.nextTalkAt = time + between(3, 8);
      wander(record);
    }
  }
  function walkAlongside(guide, companion, destination, focus) {
    guide.pairSpeed = companion.pairSpeed = 0;
    const leader = guide.walker,
      guest = companion.walker;
    if (
      angle(leader.normal, destination) < 0.12 ||
      angle(leader.normal, guest.normal) > 0.32
    )
      return false;
    pairDirection
      .copy(navigation.nextWaypoint(leader))
      .addScaledVector(
        leader.normal,
        -navigation.nextWaypoint(leader).dot(leader.normal),
      );
    if (pairDirection.lengthSq() < 1e-8) return false;
    pairDirection.normalize();
    pairLateral.crossVectors(leader.normal, pairDirection).normalize();
    const longitudinal = guest.normal.dot(pairDirection);
    const speed = Math.min(guide.cruiseSpeed, companion.cruiseSpeed);
    guide.pairSpeed = speed * clamp(1 + longitudinal * 8, 0.45, 1);
    companion.pairSpeed = speed * clamp(1 - longitudinal * 8, 0.6, 1.15);
    if (longitudinal > 0.045) {
      navigation.hold(guest, navigation.nextWaypoint(leader));
      return true;
    }
    if (companion.pairSide && time < companion.nextDestinationAt) return true;
    const preferred =
      companion.pairSide || (guest.normal.dot(pairLateral) >= 0 ? 1 : -1);
    for (let attempt = 0; attempt < 2; attempt++) {
      const side = preferred * (attempt ? -1 : 1);
      pairPoint
        .copy(leader.normal)
        .multiplyScalar(Math.cos(0.085))
        .addScaledVector(pairLateral, side * Math.sin(0.085))
        .addScaledVector(pairDirection, 0.012)
        .normalize();
      if (
        !navigation.isClear(pairPoint, guest, 0.004) ||
        !navigation.arrive(guest, pairPoint, focus)
      )
        continue;
      companion.pairSide = side;
      companion.nextDestinationAt = time + 0.5;
      leader.softPartner = guest;
      guest.softPartner = leader;
      return true;
    }
    // A narrow obstacle takes precedence over the formation. Existing routes
    // keep both bodies safe, and the lateral formation is retried after it.
    guide.pairSpeed = companion.pairSpeed = 0;
    companion.pairSide = 0;
    return false;
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
        navigation.arrive(boy, male.goal, houseDirection);
        navigation.arrive(girl, female.goal, houseDirection);
      } else if (time - male.since > 9) endHouseTour(true);
      return true;
    }
    if (male.state === "leadHouse") {
      const paired = walkAlongside(male, female, male.goal, houseDirection);
      for (const record of actors) {
        if (paired && record === female) continue;
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
      const boyTravelling = angle(boy.normal, male.goal) >= 0.006;
      if (boyTravelling && separation > 0.28 && boy.mode !== "hold")
        navigation.hold(boy, girl.normal);
      else if (boyTravelling && separation < 0.19 && boy.mode === "hold")
        navigation.arrive(boy, male.goal, houseDirection);
      if (
        !paired &&
        time >= female.nextDestinationAt &&
        (girl.mode === "hold" || girl.arrived || female.pairSide !== 0) &&
        angle(girl.normal, female.goal) > 0.006
      ) {
        female.pairSide = 0;
        navigation.arrive(girl, female.goal, houseDirection);
      }
      for (const record of actors) {
        if (
          angle(record.walker.normal, record.goal) < 0.006 &&
          record.walker.arrived
        )
          navigation.hold(record.walker, houseDirection);
      }
      if (
        angle(boy.normal, male.goal) < 0.006 &&
        angle(girl.normal, female.goal) < 0.006 &&
        aligned(boy, houseDirection) &&
        aligned(girl, houseDirection)
      ) {
        const duration = between(2.5, 4);
        enter(male, "showHouse", duration);
        enter(female, "houseGuest", duration);
        navigation.hold(boy, houseDirection);
        navigation.hold(girl, houseDirection);
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
        time - male.since > (male.until - male.since) * 0.65 &&
        time - male.since < (male.until - male.since) * 0.9
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
        const waypoint = female.routeLength
          ? gardenRoutes.nodes[female.route[female.routeIndex]]
          : tourGirl;
        navigation.arrive(girl, waypoint, female.gazeNormal);
        navigation.arrive(
          boy,
          male.routeLength
            ? gardenRoutes.nodes[male.route[male.routeIndex]]
            : tourBoy,
          female.gazeNormal,
        );
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
        const paired = walkAlongside(female, male, tourGirl, female.gazeNormal);
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
        if (!paired && time >= male.nextDestinationAt) {
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
    // Their separation is the lateral axis; travel perpendicular to it.
    tangent.crossVectors(girl.normal, boy.normal);
    if (tangent.lengthSq() < 1e-6) return false;
    tangent.normalize();
    for (let attempt = 0; attempt < 2; attempt++) {
      const turn = attempt * Math.PI;
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
      strollDuration = between(3, 5);
      strollWalkingAt = 0;
      if (!navigation.arrive(girl, meetingGirl)) continue;
      if (!navigation.arrive(boy, meetingBoy)) {
        navigation.hold(girl, boy.normal);
        continue;
      }
      boy.softPartner = girl;
      girl.softPartner = boy;
      for (const record of actors) {
        record.goal.copy(record === female ? meetingGirl : meetingBoy);
        navigation.hold(record.walker, record.goal);
        record.runUntil = 0;
        record.walker.arrivalRadius = 0.008;
        record.walker.softObstacle = null;
        record.walker.gardenRoute = false;
        enter(record, "strollDepart", 4);
      }
      nextStrollAt = time + between(30, 50);
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
      nextFlagAt = time + between(140, 210);
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
    playBlockedUntil = time + 25;
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
      const paired =
        female.state === "travelFlag" &&
        separation < 0.2 &&
        walkAlongside(female, male, female.goal, flagFacing);
      if (!paired) male.pairSpeed = female.pairSpeed = 0;
      if (!paired && time >= male.nextDestinationAt) {
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
  function endPerformance(aborted = false) {
    if (aborted) {
      stats.aborts++;
      stats.lastPerformanceAbort = `${performancePhase}:${male.state}:${female.state}:${male.stalled.toFixed(1)}:${female.stalled.toFixed(1)}:${(time - performanceStarted).toFixed(1)}`;
    }
    performancePhase = "none";
    nextPerformanceAt = time + 100 + performanceRandom() * 70;
    for (const record of actors) {
      record.runUntil = 0;
      record.nextTalkAt = time + between(3, 8);
      wander(record);
    }
  }
  function startPerformance() {
    if (
      !lampInterest ||
      !gardenRoutes ||
      !seats.length ||
      !socialAvailable(male) ||
      female.lastFeature?.kind !== "flower" ||
      angle(boy.normal, garden.normal) < 0.5 ||
      angle(girl.normal, lampInterest.normal) > 0.24 ||
      angle(boy.normal, girl.normal) > 1.15 ||
      !navigation.isClear(girl.normal, girl, 0.006) ||
      (flag && angle(girl.normal, flag.normal) < 0.38) ||
      time < playBlockedUntil
    )
      return false;
    if (!danceViews.length || !startRest(male, lampInterest.normal))
      return false;
    // Keep the stage in the lamp's central clearing, with the rock as audience.
    const seat = male.goal;
    let found = false;
    const offset = Math.floor(performanceRandom() * danceViews.length);
    for (let i = 0; i < danceViews.length; i++) {
      const index = (offset + i) % danceViews.length;
      candidate.copy(danceViews[index]);
      if (
        angle(candidate, seat) > 0.12 &&
        angle(candidate, seat) < 0.32 &&
        navigation.isClear(candidate, girl, 0.012) &&
        gardenRoutes.plan(girl.normal, danceNodeOffset + index, stageRoute) >
          0 &&
        (!flag || angle(candidate, flag.normal) > 0.38)
      ) {
        danceSpot.copy(candidate);
        danceViewIndex = danceNodeOffset + index;
        found = true;
        break;
      }
    }
    if (!found) {
      wander(male);
      return false;
    }
    performancePhase = "call";
    boy.softPartner = girl;
    girl.softPartner = boy;
    performanceStarted = time;
    performanceSawFlowersAt = -1;
    male.runUntil = time + 1;
    performanceFlowerFocus.copy(female.focus);
    enter(female, "gardenCall", 3.5 + performanceRandom() * 1.5);
    female.waveHop = performanceRandom() < 0.6;
    female.waveHopAt = 0.9;
    stats.gardenCalls++;
    return true;
  }
  function updatePerformance() {
    if (performancePhase === "none") return false;
    boy.softPartner = girl;
    girl.softPartner = boy;
    if (
      time - performanceStarted > 90 ||
      male.stalled > 5 ||
      female.stalled > 5
    ) {
      endPerformance(true);
      return true;
    }
    if (performancePhase === "call") {
      if (time >= female.until) {
        female.focus.copy(performanceFlowerFocus);
        enter(female, "travelGarden", Math.max(1, female.visitUntil - time));
        performancePhase = "wait";
      }
    }
    if (
      performancePhase === "wait" &&
      female.state === "garden" &&
      performanceSawFlowersAt < 0
    )
      performanceSawFlowersAt = time;
    if (
      performancePhase === "wait" &&
      female.state === "wander" &&
      time >= female.nextInspectAt
    )
      startInspection(female);
    if (performancePhase === "call" || performancePhase === "wait") {
      male.runUntil = boy.normal.angleTo(male.goal) > 0.15 ? time + 0.8 : 0;
      if (male.state === "sit") {
        male.until = time + 25;
        if (
          performancePhase === "wait" &&
          performanceSawFlowersAt >= 0 &&
          time - performanceSawFlowersAt >= 1.2
        ) {
          girl.arrivalRadius = 0.004;
          female.routeLength = gardenRoutes.plan(
            girl.normal,
            danceViewIndex,
            female.route,
          );
          female.routeIndex = 0;
          girl.gardenRoute = true;
          if (
            !female.routeLength ||
            !navigation.isClear(danceSpot, girl, 0.012) ||
            !navigation.arrive(
              girl,
              gardenRoutes.nodes[female.route[0]],
              boy.normal,
            )
          ) {
            endPerformance(true);
            return true;
          }
          female.goal.copy(danceSpot);
          enter(female, "travelDance", 35);
          performancePhase = "travel";
        }
      } else if (male.state !== "travelRest") {
        endPerformance(true);
        return true;
      }
      return false;
    }
    if (performancePhase === "travel") {
      male.until = time + 20;
      if (time >= female.until) {
        endPerformance(true);
        return true;
      }
      if (girl.arrived && girl.velocity < 0.003) {
        if (female.routeIndex + 1 < female.routeLength) {
          female.routeIndex++;
          if (
            !navigation.arrive(
              girl,
              gardenRoutes.nodes[female.route[female.routeIndex]],
              boy.normal,
            )
          )
            endPerformance(true);
          return true;
        }
        navigation.hold(girl, boy.normal);
        navigation.hold(boy, girl.normal);
        const duration = 5 + performanceRandom() * 3.8;
        female.playVariant =
          (female.playVariant + 1 + Math.floor(performanceRandom() * 3)) % 4;
        enter(female, "gardenDance", duration);
        enter(male, "gardenClap", duration);
        performancePhase = "dance";
        stats.gardenPerformances++;
      }
      return true;
    }
    if (performancePhase === "dance") {
      if (time >= female.until) endPerformance();
      return true;
    }
    return false;
  }
  function finishYield() {
    const duration = time - yieldStarted;
    yieldPhase = "none";
    nextYieldAt = time + 12;
    boy.softPartner = girl.softPartner = null;
    for (let i = 0; i < actors.length; i++) {
      const record = actors[i],
        saved = yieldResume[i];
      record.since += duration;
      record.until += duration;
      record.visitUntil += duration;
      if (Number.isFinite(record.visitEnd)) record.visitEnd += duration;
      record.stalled = 0;
      record.bestRemaining = Infinity;
      record.focus.copy(saved.focus);
      if (saved.mode === "hold") navigation.hold(record.walker, saved.facing);
      else if (saved.mode === "arrive") {
        if (!navigation.arrive(record.walker, saved.target, saved.facing))
          wander(record);
      } else {
        navigation.wander(record.walker);
        record.walker.target.copy(saved.target);
      }
    }
  }
  function updateYield() {
    if (yieldPhase !== "none") {
      if (time - yieldStarted > 5) {
        finishYield();
        return true;
      }
      boy.softPartner = girl;
      girl.softPartner = boy;
      if (yieldPhase === "gesture" && time - yieldStarted >= 0.55) {
        if (!navigation.arrive(boy, yieldSpot, girl.normal)) finishYield();
        else yieldPhase = "step";
      } else if (yieldPhase === "step" && boy.arrived && boy.velocity < 0.003)
        finishYield();
      return true;
    }
    if (
      time < nextYieldAt ||
      performancePhase !== "none" ||
      !available(male) ||
      !(
        female.state === "wander" ||
        female.state === "travelGarden" ||
        female.state === "travelFlag"
      ) ||
      girl.mode === "hold"
    ) {
      obstructedFor = 0;
      return false;
    }
    // Let ordinary moving pedestrians pass naturally; reserve this interruption
    // for a persistent blockage by a nearly stationary boy.
    if (boy.velocity > 0.008 || time - female.since < 1) {
      obstructedFor = 0;
      return false;
    }
    const distance = angle(boy.normal, girl.normal);
    facing
      .copy(boy.normal)
      .addScaledVector(girl.normal, -boy.normal.dot(girl.normal))
      .normalize();
    if (
      distance > boy.radius + girl.radius + 0.045 ||
      distance < 0.001 ||
      facing.dot(girl.forward) < 0.75 ||
      (!girl.blocked && girl.velocity > girl.speed * 0.65)
    ) {
      obstructedFor = 0;
      return false;
    }
    obstructedFor += DECISION_STEP;
    if (obstructedFor < 1.2) return false;
    obstructedFor = 0;
    lateral.crossVectors(boy.normal, girl.forward).normalize();
    let found = false;
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? -1 : 1;
      const offset = 0.06 + Math.floor(i / 2) * 0.025;
      candidate
        .copy(boy.normal)
        .multiplyScalar(Math.cos(offset))
        .addScaledVector(lateral, side * Math.sin(offset))
        .normalize();
      if (
        navigation.isClear(candidate, boy, 0.006) &&
        navigation.segmentClear(boy.normal, candidate, boy, true)
      ) {
        yieldSpot.copy(candidate);
        found = true;
        break;
      }
    }
    if (!found) {
      nextYieldAt = time + 3;
      return false;
    }
    for (let i = 0; i < actors.length; i++) {
      const walker = actors[i].walker,
        saved = yieldResume[i];
      saved.mode = walker.mode;
      saved.target.copy(walker.target);
      saved.facing.copy(walker.lookTarget);
      saved.focus.copy(actors[i].focus);
    }
    yieldStarted = time;
    yieldPhase = "gesture";
    stats.girlPasses = (stats.girlPasses || 0) + 1;
    navigation.hold(girl, boy.normal);
    navigation.hold(boy, girl.normal);
    return true;
  }
  function clearFlipSpot(point) {
    if (
      !navigation.isClear(point, boy, 0.04) ||
      (flag && angle(point, flag.normal) < 0.38)
    )
      return false;
    if (garden?.features)
      for (const feature of garden.features) {
        if (
          feature.kind === "rock" &&
          angle(point, feature.normal) <
            (feature.supportRadius || feature.radius || 0.02) +
              boy.radius +
              0.025
        )
          return false;
      }
    return true;
  }
  function pickFlipSpot() {
    tangent
      .copy(boy.normal)
      .addScaledVector(girl.normal, -boy.normal.dot(girl.normal));
    if (tangent.lengthSq() < 1e-8)
      tangent.set(1, 0, 0).addScaledVector(girl.normal, -girl.normal.x);
    tangent.normalize();
    lateral.crossVectors(girl.normal, tangent).normalize();
    for (let i = 0; i < 12; i++) {
      const turn = ((i % 2 ? -1 : 1) * Math.ceil(i / 2) * Math.PI) / 6;
      candidate
        .copy(girl.normal)
        .multiplyScalar(Math.cos(0.19))
        .addScaledVector(tangent, Math.sin(0.19) * Math.cos(turn))
        .addScaledVector(lateral, Math.sin(0.19) * Math.sin(turn))
        .normalize();
      if (
        clearFlipSpot(candidate) &&
        navigation.segmentClear(girl.normal, candidate, girl) &&
        navigation.arrive(boy, candidate, girl.normal)
      ) {
        return true;
      }
    }
    return false;
  }
  function endBackflip() {
    const watched = female.state === "watchFlip";
    flipPhase = "none";
    nextFlipAt = time + 75 + flipRandom() * 65;
    male.runUntil = 0;
    male.pose.flip = male.pose.flipTuck = male.pose.crouch = male.pose.hop = 0;
    wander(male);
    if (watched) wander(female);
    for (const record of actors)
      record.nextTalkAt = time + 3 + flipRandom() * 5;
  }
  function updateBackflip() {
    if (flipPhase === "none") return false;
    if (flipPhase === "show") {
      if (time >= male.until) endBackflip();
      return true;
    }
    male.runUntil = angle(boy.normal, girl.normal) > 0.38 ? time + 0.6 : 0;
    if (
      time - flipStarted > 35 ||
      male.stalled > 4 ||
      (female.state !== "watchFlip" && !available(female))
    ) {
      endBackflip();
      return true;
    }
    if (
      female.state !== "watchFlip" &&
      angle(boy.normal, girl.normal) < 0.3 &&
      navigation.segmentClear(girl.normal, boy.normal, girl)
    ) {
      enter(female, "watchFlip", 35);
      navigation.hold(girl, boy.normal);
    }
    if (time >= flipRetargetAt && female.state !== "watchFlip") {
      flipRetargetAt = time + 0.8;
      if (!pickFlipSpot()) {
        endBackflip();
        return true;
      }
    }
    if (female.state === "watchFlip") {
      girl.lookTarget.copy(boy.normal);
      if (boy.arrived && boy.velocity < 0.003) {
        if (!clearFlipSpot(boy.normal)) {
          endBackflip();
          return true;
        }
        navigation.hold(boy, girl.normal);
        if (aligned(boy, girl.normal) && aligned(girl, boy.normal)) {
          flipFlight = 1.25 + flipRandom() * 0.3;
          enter(male, "backflip", 0.45 + flipFlight + 0.8);
          enter(female, "watchFlip", 0.45 + flipFlight + 0.8);
          flipPhase = "show";
          stats.backflips++;
        }
      }
      return true;
    }
    return false;
  }
  function decisions() {
    stats.decisions++;
    if (updateYield()) return;
    if (updateBackflip()) return;
    if (updatePerformance()) return;
    if (
      flipPhase === "none" &&
      performancePhase === "none" &&
      time >= nextFlipAt &&
      time >= nextFlipCheck &&
      !male.initial &&
      !female.initial &&
      SOCIAL_IDLE.has(male.state) &&
      (female.state === "wander" ||
        (female.state === "garden" && !pendingFeature(female))) &&
      time >= playBlockedUntil &&
      (!flag || angle(girl.normal, flag.normal) > 0.38) &&
      angle(boy.normal, girl.normal) > 0.12 &&
      angle(boy.normal, girl.normal) < 1.1
    ) {
      nextFlipCheck = time + 6 + flipRandom() * 7;
      if (flipRandom() < 0.55 && pickFlipSpot()) {
        flipPhase = "approach";
        flipStarted = time;
        flipRetargetAt = time + 0.8;
        enter(male, "flipApproach", 35);
        stats.flipApproaches++;
      }
    }
    // Frequent social invitations must not indefinitely starve his own visits.
    if (
      performancePhase === "none" &&
      male.state === "wander" &&
      !male.initial &&
      time >= nextSoloOpportunity &&
      time >= male.nextInspectAt
    ) {
      nextSoloOpportunity = time + 120 + varietyRandom() * 100;
      startInspection(male);
    }
    if (
      performancePhase === "none" &&
      lampInterest &&
      female.state === "travelGarden" &&
      time >= nextPerformanceAt &&
      time >= nextPerformanceCheck
    ) {
      nextPerformanceCheck = time + 3;
      if (performanceRandom() < 0.45 && startPerformance()) return;
    }
    if (
      performancePhase === "none" &&
      time >= nextWaveAt &&
      !(time >= nextBoyVisitAt && angle(boy.normal, girl.normal) > 0.45) &&
      socialAvailable(male) &&
      socialAvailable(female) &&
      !female.initial &&
      !male.initial &&
      time >= female.nextTalkAt &&
      time >= male.nextTalkAt
    ) {
      nextWaveAt = time + 8 + performanceRandom() * 6;
      if (mutuallyVisible(false) && performanceRandom() < 0.7 && greeting())
        return;
    }
    if (female.state === "strollDepart" || female.state === "stroll") {
      if (
        female.state === "strollDepart" &&
        girl.mode === "hold" &&
        boy.mode === "hold" &&
        aligned(girl, female.goal) &&
        aligned(boy, male.goal)
      ) {
        navigation.arrive(girl, female.goal);
        navigation.arrive(boy, male.goal);
      }
      // Do not spend the requested walking time turning away from the chat.
      if (!strollWalkingAt && boy.velocity > 0.008 && girl.velocity > 0.008) {
        strollWalkingAt = time;
        for (const record of actors) enter(record, "stroll", strollDuration);
        stats.strolls++;
      }
      if (
        time >= female.until ||
        (!strollWalkingAt && time - female.since > 4) ||
        (boy.blocked && male.stalled > 1.2) ||
        (girl.blocked && female.stalled > 1.2) ||
        angle(boy.normal, girl.normal) > 0.2
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
      performancePhase === "none" &&
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
    if (female.state === "playful" && !playContext()) wander(female);
    if (
      female.state === "wander" &&
      time >= female.nextPlayAt &&
      time >= nextPlayOpportunity
    ) {
      nextPlayOpportunity = time + 2 + gestureRandom() * 3;
      const chance = time - lastChatAt < 12 ? 0.7 : 0.45;
      if (
        playContext() &&
        gestureRandom() < chance &&
        navigation.isClear(girl.normal, girl, 0.006)
      ) {
        startPlay();
      }
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
      if (time >= male.until || (boy.blocked && male.stalled >= 5)) {
        if (male.longApproach) {
          male.longApproach = false;
          male.runUntil = 0;
          male.nextTalkAt = time + between(3, 8);
          stats.aborts++;
          wander(male);
          return;
        }
        finishSocial(true);
        return;
      }
      if (male.longApproach && time >= male.nextDestinationAt) {
        socialDestination(boy, girl);
        male.nextDestinationAt = time + 0.8;
      }
      if (
        angle(boy.normal, girl.normal) < 0.22 &&
        available(female) &&
        (!male.longApproach || reserveMeeting())
      ) {
        if (male.longApproach) {
          male.longApproach = false;
          navigation.arrive(boy, meetingBoy, girl.normal);
          navigation.hold(girl, boy.normal);
        }
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
      if (!male.longApproach) return;
    }
    if (
      time >= nextBoyVisitAt &&
      time >= nextMaleOpportunity &&
      socialAvailable(male) &&
      socialAvailable(female) &&
      (SOCIAL_IDLE.has(male.state) ||
        (INSPECTION.has(male.state) && time - male.since > 2.5)) &&
      (FEMALE_SOCIAL_IDLE.has(female.state) ||
        (female.state === "garden" &&
          time - female.since > 2.5 &&
          !pendingFeature(female))) &&
      (female.state !== "playful" || time - female.since > 2) &&
      !male.initial &&
      !female.initial &&
      time >= male.nextTalkAt &&
      time >= female.nextTalkAt &&
      angle(boy.normal, girl.normal) < 1.3
    ) {
      nextMaleOpportunity = time + between(2, 4);
      if (
        random() < (angle(boy.normal, girl.normal) > 0.35 ? 0.95 : 0.55) &&
        quietApproach(true)
      )
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
            record.previousSeat = record.lastSeat;
            record.lastSeat = record.selectedSeat;
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
    let clap = 0;
    let push = 0;
    let arc = 0,
      wrist = 0;
    let touch = 0;
    let salute = 0;
    let spread = 0,
      dance = 0;
    let danceSide = 0,
      danceLiftLeft = 0,
      danceLiftRight = 0,
      shoulder = 0,
      danceArmPhase = 0;
    let turn = 0;
    let flip = 0,
      flipTuck = 0,
      crouch = 0;
    let playfulStep = 0,
      playfulLean = 0,
      playfulTilt = 0,
      playfulRoll = 0;
    const elapsed = time - record.since;
    const inviting =
      record.state === "inviteGarden" ||
      record.state === "acceptGarden" ||
      record.state === "inviteHouse" ||
      record.state === "acceptHouse";
    const walkingTogether =
      record.state === "stroll" ||
      record.state === "strollDepart" ||
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
    if (record.state === "wave" || record.state === "gardenCall") {
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
          arc = Math.sin(local * Math.PI * 2) * (record === female ? 1 : 0.6);
          wrist = Math.sin(local * Math.PI) * (turn.style % 2 ? 0.65 : -0.45);
          // Different destinations and curved paths for beats, open palms,
          // close-to-chest explanation, and outward invitation gestures.
          if (turn.style === 0) chest = envelope * 0.65;
          if (turn.style === 1)
            spread = envelope * (record === female ? 0.85 : 0.5);
          if (turn.style === 2) arc *= -1;
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
      const glance =
        (elapsed * (0.85 + record.gestureStyle * 0.08) +
          (record === male ? 1.1 : 0)) %
        3.3;
      if (glance < 0.75) {
        record.focus
          .copy(record.walker.normal)
          .multiplyScalar(eyeRadius(record.walker))
          .addScaledVector(record.walker.forward, 0.16);
      } else if (
        record.state === "stroll" ||
        record.state === "strollDepart" ||
        record.state === "joinFlag" ||
        (elapsed + (record === male ? 2 : 0)) % 7 > 5.8
      )
        record.focus
          .copy(record === female ? boy.normal : girl.normal)
          .multiplyScalar(eyeRadius(record === female ? boy : girl));
      else record.focus.copy(sharedFocus);
      const local =
        (record.state === "stroll" || record.state === "strollDepart"
          ? elapsed
          : time - (visitingHouse ? houseTourStarted : tourStarted)) % 2.2;
      const speaker =
        Math.floor(
          (record.state === "stroll" || record.state === "strollDepart"
            ? elapsed
            : time - (visitingHouse ? houseTourStarted : tourStarted)) / 2.2,
        ) %
          2 ===
        (record === female ? 0 : 1);
      if (local > 0.3 && local < 1.45) {
        const stroke = Math.sin(((local - 0.3) / 1.15) * Math.PI);
        if (speaker) {
          hand = stroke * 0.65;
          spread = record.variant === 1 ? stroke * 0.7 : 0;
        } else nod = stroke * (record === male ? 0.13 : 0.08);
        record.focus
          .copy(record === female ? boy.normal : girl.normal)
          .multiplyScalar(eyeRadius(record === female ? boy : girl));
      }
      yaw = Math.sin(glance * 2) * 0.045;
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
      (record.playfulWait || record.state === "gardenDance") &&
      playContext() &&
      record.walker.mode === "hold" &&
      record.walker.velocity < 0.003 &&
      elapsed > (record.state === "gardenDance" ? 0 : 0.4) &&
      elapsed <
        (record.state === "gardenDance" ? record.until - record.since : 3.6)
    ) {
      const local = elapsed - (record.state === "gardenDance" ? 0 : 0.4);
      const envelope = Math.min(
        1,
        local * 3,
        ((record.state === "gardenDance" ? record.until - record.since : 3.2) -
          local) *
          3,
      );
      const variant = record.playVariant;
      dance =
        envelope * (0.65 + Math.sin(local * (variant === 1 ? 4 : 3)) * 0.15);
      hand = envelope * (0.65 + Math.sin(local * 5) * 0.18);
      shake = Math.sin(local * 3.5) * 0.13 * envelope;
      if (record.state === "gardenDance") {
        let index = 0;
        while (index < 15 && local >= record.danceEnds[index]) index++;
        if (!record.danceEnds[0]) index = Math.floor(local / 0.85);
        const start = record.danceEnds[0]
          ? index > 0
            ? record.danceEnds[index - 1]
            : 0
          : index * 0.85;
        // The fallback also supports isolated pose previews without an entry.
        const duration = record.danceEnds[0]
          ? record.danceEnds[index] - start
          : 0.85;
        const phase = Math.min(1, (local - start) / duration);
        const phrase = record.danceEnds[0]
          ? record.danceSteps[index]
          : (variant + Math.floor(local / 0.85)) % 6;
        const beat = phase * Math.PI * 2;
        const pulse = Math.sin(phase * Math.PI) ** 2 * envelope;
        const lead = record.playLead * (index % 2 ? -1 : 1);
        const response = Math.sin(beat - 0.5) * pulse;
        // Side tap, heel dig, shuffle, spring, twist, and diagonal reach.
        // Each resolves at planted feet before the next phrase begins.
        playfulStep = Math.sin(beat) * envelope * (phrase === 2 ? 1 : 0.65);
        danceSide = (phrase === 0 || phrase === 5 ? 0.0022 : 0.0006) * pulse;
        const lift = (phrase === 1 ? 0.0045 : 0.003) * pulse;
        danceLiftLeft = lead < 0 ? lift : 0;
        danceLiftRight = lead > 0 ? lift : 0;
        spread = (phrase === 4 ? 0.25 : phrase === 5 ? 0.95 : 0.65) * envelope;
        chest = phrase === 1 ? pulse * 0.35 : 0;
        arc = response * (phrase === 5 ? 1.3 : 0.85) * lead;
        shift = response * 0.0028 * lead;
        yaw = response * (phrase === 4 ? 0.22 : 0.12) * lead;
        playfulRoll = Math.sin(beat + 0.4) * pulse * 0.105 * lead;
        playfulLean = pulse * (phrase === 1 ? 0.08 : 0.035);
        playfulTilt = Math.sin(beat - 0.8) * pulse * 0.16 * lead;
        nod = Math.sin(beat + 0.8) * pulse * 0.15;
        shake = Math.sin(beat - 0.3) * pulse * 0.15 * lead;
        shoulder = response * 0.0024 * lead;
        crouch = pulse * (phrase === 3 ? 0.003 : 0.0012);
        hop = phrase === 3 ? Math.sin(phase * Math.PI) * 0.012 * envelope : 0;
        danceArmPhase = beat + phrase * 0.7;
        wrist = Math.sin(beat - 0.7) * pulse * 0.8;
        if (phrase === 6) {
          // A compact full-turn flourish: gather the arms, pivot, then open.
          turn = lead * Math.PI * 2 * (phase * phase * (3 - 2 * phase));
          playfulStep = danceSide = danceLiftLeft = danceLiftRight = hop = 0;
          shift = yaw = playfulRoll = 0;
          chest = pulse * 0.8;
          spread = (1 - pulse) * 0.7 * envelope;
          playfulLean = pulse * 0.025;
          playfulTilt = pulse * 0.08 * lead;
          crouch = pulse * 0.002;
        }
      } else {
        const phase = local * record.playTempo;
        const lead = record.playLead;
        // Anticipation, a distinct short action, then a quiet recovery. The
        // feet and upper body use offset phases instead of one shared sine.
        const beat = Math.sin(phase * 3.8);
        const response = Math.sin(phase * 3.8 - 0.65);
        shift = response * envelope * 0.0018 * lead;
        yaw = Math.sin(phase * 2.6 - 0.3) * envelope * 0.11 * lead;
        playfulTilt = Math.sin(phase * 2.6 + 0.4) * envelope * 0.09 * lead;
        playfulRoll = response * envelope * 0.055;
        playfulLean =
          (0.5 + 0.5 * Math.sin(phase * 3 - 0.5)) * envelope * 0.025;
        nod = Math.sin(phase * 3.1 + 0.5) * envelope * 0.08;
        hop = 0;
        if (variant === 0) {
          // A side-to-side toe tap with alternating open hands.
          playfulStep = beat * envelope * 0.8;
          spread = (0.45 + response * 0.2) * envelope;
          chest = 0;
          arc = response * envelope * 0.8;
        } else if (variant === 1) {
          // A quick delighted bounce, then one hand settles before the other.
          playfulStep = Math.sin(phase * 4.6) * envelope * 0.45;
          const jump = (local - 0.55) / 0.6;
          if (jump > 0 && jump < 1)
            hop = Math.sin(jump * Math.PI) * 0.012 * envelope;
          spread = 0.7 * envelope;
          chest = 0;
          arc = Math.sin(phase * 4.2) * envelope;
        } else if (variant === 2) {
          // A smaller shoulder tease: hands near the chest, head tilts back.
          playfulStep = beat * envelope * 0.2;
          chest = (0.65 + response * 0.15) * envelope;
          spread = 0.15 * envelope;
          arc = Math.sin(phase * 2.7 - 0.8) * envelope * 0.5;
          playfulRoll *= 1.4;
        } else if (variant === 3) {
          // A light shuffle and diagonal arm flourish with a small hop.
          playfulStep = Math.sin(phase * 5) * envelope;
          spread = (0.6 + beat * 0.25) * envelope;
          chest = 0;
          arc = Math.sin(phase * 3.1 + 0.8) * envelope;
          const jump = (local - 1.05) / 0.55;
          if (jump > 0 && jump < 1)
            hop = Math.sin(jump * Math.PI) * 0.007 * envelope;
        } else {
          const progress = Math.max(0, Math.min(1, (local - 0.4) / 1.25));
          const gather = Math.sin(progress * Math.PI) ** 2;
          turn =
            lead * Math.PI * 2 * (progress * progress * (3 - 2 * progress));
          playfulStep = hop = shift = yaw = playfulRoll = 0;
          chest = gather * 0.85;
          spread = (1 - gather) * 0.7 * envelope;
          arc = Math.sin(progress * Math.PI * 2) * 0.65;
          crouch = gather * 0.002;
          shoulder = Math.sin(progress * Math.PI * 2) * 0.0015;
        }
        wrist = Math.sin(phase * 3.6 - 0.9) * envelope * 0.55;
      }
    }
    if (record.state === "gardenDance")
      record.focus
        .copy(boy.normal)
        .multiplyScalar(eyeRadius(boy) - male.pose.sit * 0.024);
    if (record.state === "gardenClap") {
      record.focus.copy(girl.normal).multiplyScalar(eyeRadius(girl));
      clap = Math.min(1, elapsed * 4, (record.until - time) * 4);
      nod = Math.sin(elapsed * 2.5) * 0.07;
    }
    if (record.state === "sit" || record.state === "gardenClap") {
      chest = record === male ? 0.2 : 0.35;
      hand = record === male ? 0.08 : 0.14;
      arc = Math.sin(elapsed * (record === male ? 0.7 : 1.1)) * 0.18;
    }
    if (INSPECTION.has(record.state) && !record.touchActive) {
      arc =
        Math.sin(elapsed * 1.7 + record.gestureStyle) *
        (record === male ? 0.3 : 0.55);
      wrist =
        Math.sin(elapsed * 1.2 + record.gestureStyle) *
        (record === male ? 0.2 : 0.4);
      if (record.gestureStyle === 1) {
        pointing = false;
        chest = hand * 0.6;
      }
    }
    if (!talking) {
      left = record.variant % 2 === 0 ? hand : 0;
      right = record.variant % 2 === 1 ? hand : 0;
      if (dance > 0 || (record.state === "wave" && record.calling)) {
        left = hand;
        right =
          hand * (0.65 + 0.2 * Math.cos(elapsed * 3 + record.playVariant));
        if (record.state === "gardenDance") {
          left = hand * (0.65 + 0.35 * Math.sin(danceArmPhase));
          right = hand * (0.65 + 0.35 * Math.sin(danceArmPhase - 1.8));
        }
        if (record.playfulWait && record.state !== "gardenDance") {
          const phase = elapsed * record.playTempo * 3.8;
          left = hand * (0.55 + 0.4 * Math.sin(phase));
          right = hand * (0.55 + 0.4 * Math.sin(phase - 1.3));
          if (record.playLead < 0) {
            const swap = left;
            left = right;
            right = swap;
          }
        }
      }
      if (touch > 0) {
        left = record.touchArm === 0 ? hand : 0;
        right = record.touchArm === 1 ? hand : 0;
      }
      if (walkingTogether && hand > 0) {
        const lead = record.gestureStyle % 2;
        left = hand * (lead === 0 ? 1 : 0.2);
        right =
          hand * (lead === 1 ? 1 : record.gestureStyle === 3 ? 0.7 : 0.15);
        arc = Math.sin(elapsed * 3.2 + record.variant) * hand * 0.6;
      }
    }
    if (pointing) {
      pointLeft = left;
      pointRight = right;
    }
    if (record.state === "backflip") {
      const air = (elapsed - 0.45) / flipFlight;
      const progress = clamp((air - 0.1) / 0.8, 0, 1);
      flip = progress * progress * (3 - 2 * progress);
      if (air > 0 && air < 1) {
        hop = 4 * air * (1 - air) * 0.12;
        const tuckPhase = clamp((air - 0.12) / 0.76, 0, 1);
        flipTuck = Math.sin(tuckPhase * Math.PI) ** 2;
      }
      if (elapsed < 0.45) crouch = Math.sin((elapsed / 0.45) * Math.PI) * 0.004;
      else if (air >= 1 && air < 1.4)
        crouch = Math.sin(((air - 1) / 0.4) * Math.PI) * 0.003;
      left = right = hand = air > 0 && air < 1 ? 0.7 : 0.3;
      chest = flipTuck * 0.85;
      spread = air < 0 ? 0.25 : 0.05;
      nod = shake = 0;
      record.focus.copy(girl.normal).multiplyScalar(eyeRadius(girl));
    } else if (record.state === "watchFlip") {
      record.focus.copy(boy.normal).multiplyScalar(1 + 0.046 + male.pose.hop);
      nod = Math.sin(elapsed * 2.7) * 0.045;
      if (male.state === "backflip" && time - male.since > 0.45 + flipFlight)
        clap = 0.8;
      else {
        left = 0.25;
        right = 0.15;
        chest = 0.2;
      }
    } else if (record.state === "flipApproach") {
      record.focus.copy(girl.normal).multiplyScalar(eyeRadius(girl));
      left = hand = 0.18;
    }
    if (yieldPhase !== "none") {
      record.focus
        .copy(record === female ? boy.normal : girl.normal)
        .multiplyScalar(eyeRadius(record === female ? boy : girl));
      push =
        record === female
          ? Math.sin(Math.min(1, (time - yieldStarted) / 1.1) * Math.PI)
          : 0;
      left = right = hand = push * 0.8;
      pointLeft = pointRight = touch = wave = salute = 0;
      nod = record === male ? Math.sin((time - yieldStarted) * 5) * 0.09 : 0;
      spread = 0;
    }
    const active =
      record.state === "backflip" ||
      record.state === "watchFlip" ||
      record.state === "flipApproach" ||
      yieldPhase !== "none" ||
      atFlag ||
      record.state === "travelFlag" ||
      inspecting ||
      talking ||
      inviting ||
      walkingTogether ||
      record.state === "wave" ||
      record.state === "gardenCall" ||
      record.state === "gardenClap" ||
      dance > 0 ||
      record.state === "sit";
    const blend =
      1 -
      Math.exp(
        -dt / (record.state === "gardenDance" ? 0.075 : talking ? 0.09 : 0.16),
      );
    const output = record.pose;
    output.weight += ((active ? 1 : 0) - output.weight) * blend;
    output.hand += (hand - output.hand) * blend;
    output.wave += (wave - output.wave) * blend;
    output.chest += (chest - output.chest) * blend;
    output.lean +=
      ((inspecting ? 0.04 + hand * 0.04 : playfulLean) - output.lean) * blend;
    output.tilt +=
      ((inspecting
        ? Math.sin(elapsed * 0.8 + record.variant) * 0.06
        : playfulTilt) -
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
    const danceStep = playfulStep;
    output.danceStep += (danceStep - output.danceStep) * blend;
    output.danceSide += (danceSide - output.danceSide) * blend;
    output.danceLiftLeft += (danceLiftLeft - output.danceLiftLeft) * blend;
    output.danceLiftRight += (danceLiftRight - output.danceLiftRight) * blend;
    if (record.state === "gardenDance" && hop === 0) {
      // Blending alternating feet must not create an unintended aerial phase.
      const support = Math.min(output.danceLiftLeft, output.danceLiftRight);
      output.danceLiftLeft -= support;
      output.danceLiftRight -= support;
    }
    output.shoulder += (shoulder - output.shoulder) * blend;
    // Follow an unwrapped angular target. On interruption recover to forward
    // by the shortest arc instead of snapping or unwinding a complete turn.
    const turnDelta = Math.atan2(
      Math.sin(turn - output.turn),
      Math.cos(turn - output.turn),
    );
    output.turn += Math.max(-dt * 9, Math.min(dt * 9, turnDelta));
    output.turn = Math.atan2(Math.sin(output.turn), Math.cos(output.turn));
    output.roll += (playfulRoll - output.roll) * blend;
    output.flip = flip;
    output.flipTuck = flipTuck;
    output.crouch += (crouch - output.crouch) * blend;
    output.sit +=
      ((record.state === "sit" || record.state === "gardenClap" ? 1 : 0) -
        output.sit) *
      blend;
    output.touch += (touch - output.touch) * blend;
    output.salute += (salute - output.salute) * blend;
    output.clap += (clap - output.clap) * blend;
    output.push += (push - output.push) * blend;
    output.arc += (arc - output.arc) * blend;
    output.wrist += (wrist - output.wrist) * blend;
    // A bounded ballistic hop has a definite landing, without a floating tail.
    output.hop = hop;
  }
  return {
    actors,
    stats,
    cancelBackflip() {
      if (flipPhase !== "none") endBackflip();
    },
    get time() {
      return time;
    },
    step(dt) {
      if (disposed) return;
      time += dt;
      for (const record of actors) {
        const targetSpeed =
          record.pairSpeed ||
          (record.state === "stroll" || record.state === "strollDepart"
            ? Math.min(male.cruiseSpeed, female.cruiseSpeed)
            : record.cruiseSpeed * (time < record.runUntil ? 1.95 : 1));
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
            (record.walker.routeValidated &&
              record.walker.moving &&
              record.walker.distance > record.progress + 0.0001) ||
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
