import { Vector3 } from "three";
import { createRandom } from "./wander.js";

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
  let nodMask = 0;
  let disposed = false;
  let nextTourAt = 0;
  let nextOpportunityAt = 0;
  let rocketStreak = 0;
  let tourStarted = 0;
  let tourShowingAt = 0;
  let tourDuration = 0;
  let tourFlower = 0;
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
    tangent
      .set(0, 0, 1)
      .addScaledVector(interest.normal, -interest.normal.z)
      .normalize();
    lateral.crossVectors(interest.normal, tangent).normalize();
    const radius = interest.radius + walker.radius + 0.035;
    for (let i = 0; i < 12; i++) {
      const turn = (i * Math.PI) / 6;
      points.push(
        interest.normal
          .clone()
          .multiplyScalar(Math.cos(radius))
          .addScaledVector(tangent, Math.sin(radius) * Math.cos(turn))
          .addScaledVector(lateral, Math.sin(radius) * Math.sin(turn))
          .normalize(),
      );
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
      pose: { weight: 0, lean: 0, tilt: 0, hand: 0, nod: 0, chest: 0, wave: 0 },
    };
  }
  const male = actor(boy, rocket, between(8, 16));
  const female = actor(girl, garden, between(5, 12));
  const actors = [male, female];
  const rocketViews = male.views;
  const houseViews = views(house, boy);
  const guestViews = views(garden, boy);

  function enter(record, state, duration) {
    record.state = state;
    record.since = time;
    record.until = time + duration;
    record.stalled = 0;
    record.progress = record.walker.distance;
    record.bestRemaining = Infinity;
    record.variant = (record.variant + 1 + Math.floor(random() * 2)) % 3;
  }
  function wander(record) {
    navigation.wander(record.walker);
    // Occasionally wander near a social interest, rather than relying on two
    // independent broad random walks to happen to meet. The full bounds stay open.
    const anchor =
      record === female && random() < 0.55
        ? boy.normal
        : record === male && garden && random() < 0.3
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
          record === female ? between(0.2, 0.45) : between(0.35, 0.55);
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
    enter(
      record,
      "wander",
      record === female ? between(10, 22) : between(20, 40),
    );
  }
  function endVisit(record) {
    record.completedAt = time;
    record.nextInspectAt =
      time + (record === female ? between(15, 30) : between(35, 65));
    wander(record);
  }
  function inspectDestination(record) {
    if (!record.interest) return false;
    const start = Math.floor(random() * 12);
    let selected = -1;
    let best = Infinity;
    for (let i = 0; i < 12; i++) {
      const index = (start + i) % 12;
      if (index === record.lastView) continue;
      const point = record.views[index];
      if (!navigation.isClear(point, record.walker, 0.015)) continue;
      const score = angle(record.walker.normal, point) + i * 0.003;
      if (score < best) {
        best = score;
        selected = index;
      }
    }
    if (selected < 0) return false;
    record.lastView = selected;
    const point = record.views[selected];
    let nearest = Infinity;
    for (const focus of record.interest.focuses) {
      const distance = point.distanceToSquared(focus);
      if (distance < nearest) {
        nearest = distance;
        record.focus.copy(focus);
      }
    }
    record.gazeNormal.copy(record.focus).normalize();
    record.walker.softObstacle = record.interest.normal;
    record.bestRemaining = Infinity;
    return navigation.arrive(record.walker, point, record.gazeNormal);
  }
  function startInspection(record, first = false) {
    if (record === male && house) {
      record.interest =
        !first && (random() < 0.4 || rocketStreak >= 2) ? house : rocket;
      record.views = record.interest === house ? houseViews : rocketViews;
    }
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
    facing.copy(boy.normal).add(girl.normal).normalize();
    tangent
      .copy(girl.normal)
      .addScaledVector(facing, -girl.normal.dot(facing))
      .normalize();
    meetingGirl
      .copy(facing)
      .multiplyScalar(Math.cos(0.06))
      .addScaledVector(tangent, Math.sin(0.06))
      .normalize();
    meetingBoy
      .copy(facing)
      .multiplyScalar(Math.cos(0.06))
      .addScaledVector(tangent, -Math.sin(0.06))
      .normalize();
    return (
      navigation.isClear(meetingGirl, girl, 0.005) &&
      navigation.isClear(meetingBoy, boy, 0.005)
    );
  }
  function greeting() {
    if (!reserveMeeting()) return false;
    enter(female, "wave", between(1.8, 2.6));
    enter(male, "acknowledge", 30);
    male.acknowledgmentAt = time + between(0.4, 0.9);
    navigation.hold(girl, boy.normal);
    girl.softPartner = boy;
    boy.softPartner = girl;
    stats.waves++;
    return true;
  }
  function socialDestination(mover = girl, anchor = boy, spacing = 0.12) {
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
    const cooldown = aborted ? between(8, 15) : between(18, 35);
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
    const socialWeight = canTalk ? 0.35 : 0;
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
      separation >= 0.1 &&
      separation <= 0.15 &&
      aligned(girl, boy.normal) &&
      aligned(boy, girl.normal)
    );
  }
  function beginTalk() {
    talkStarted = time;
    talkDuration = between(7, 12);
    exchanges = 2 + Math.floor(random() * 2);
    nodMask = Math.floor(random() * 8);
    for (const record of actors) enter(record, "conversation", talkDuration);
    navigation.hold(girl, boy.normal);
    navigation.hold(boy, girl.normal);
    stats.conversations++;
  }
  function startTour() {
    if (!garden || !inspectDestination(female)) return false;
    tourGirl.copy(girl.target);
    let selected = -1;
    let best = Infinity;
    for (let index = 0; index < guestViews.length; index++) {
      const point = guestViews[index];
      const spacing = angle(tourGirl, point);
      if (
        spacing < 0.11 ||
        spacing > 0.22 ||
        !navigation.isClear(point, boy, 0.01)
      )
        continue;
      const distance = point.distanceToSquared(boy.normal);
      if (distance < best) {
        best = distance;
        selected = index;
      }
    }
    if (selected < 0) return false;
    tourBoy.copy(guestViews[selected]);
    tourStarted = time;
    tourShowingAt = 0;
    tourFlower = Math.floor(random() * garden.focuses.length);
    girl.softPartner = boy;
    boy.softPartner = girl;
    boy.softObstacle = garden.normal;
    enter(female, "leadGarden", 90);
    enter(male, "followGarden", 90);
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
      female.state !== "showGarden"
    )
      return false;
    if (time - tourStarted >= 90 && female.state !== "showGarden") {
      endTour(true);
      return true;
    }
    if (female.state === "leadGarden") {
      const distance = angle(girl.normal, boy.normal);
      if (angle(girl.normal, tourGirl) < 0.02 && girl.velocity < 0.003) {
        enter(female, "waitGarden", 90);
        navigation.hold(girl, female.gazeNormal);
        enter(male, "joinGarden", 90);
        if (!navigation.arrive(boy, tourBoy, female.gazeNormal)) {
          endTour(true);
          return true;
        }
      } else {
        if (distance > 0.3 && girl.mode !== "hold")
          navigation.hold(girl, female.gazeNormal);
        else if (distance < 0.2 && girl.mode === "hold")
          navigation.arrive(girl, tourGirl, female.gazeNormal);
        if (time >= male.nextDestinationAt) {
          socialDestination(boy, girl, 0.14);
          male.nextDestinationAt = time + 0.5;
        }
      }
    } else if (female.state === "waitGarden") {
      if (boy.arrived && boy.velocity < 0.003 && !boy.turning) {
        tourShowingAt = time;
        tourDuration = between(12, 18);
        enter(female, "showGarden", tourDuration);
        enter(male, "gardenGuest", tourDuration);
        stats.gardenTours++;
        stats.gardenVisits++;
      }
    } else if (time >= tourShowingAt + tourDuration) {
      endTour();
      return true;
    }
    if (female.state === "showGarden") {
      const which =
        (tourFlower + (time - tourShowingAt >= tourDuration * 0.5 ? 1 : 0)) %
        garden.focuses.length;
      for (const record of actors) {
        record.focus.copy(garden.focuses[which]);
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
          navigation.hold(record.walker, record.gazeNormal);
          enter(
            record,
            record === female
              ? "garden"
              : record.interest === house
                ? "house"
                : "rocket",
            between(8, 14),
          );
          if (record === female) stats.gardenVisits++;
          else if (record.interest === house) {
            stats.houseVisits++;
            rocketStreak = 0;
          } else {
            stats.rocketVisits++;
            rocketStreak++;
          }
        } else if (time >= record.until) {
          stats.aborts++;
          endVisit(record);
        } else if (record.stalled >= 3) {
          if (record.retries++ >= 2 || !inspectDestination(record)) {
            stats.aborts++;
            endVisit(record);
          }
          record.stalled = 0;
        }
      } else if (time >= record.until) {
        if (INSPECTION.has(record.state)) endVisit(record);
        else choose(record);
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
    if (record.state === "wave") {
      record.focus.copy(boy.normal).multiplyScalar(1.063);
      const phase = clamp(
        (time - record.since) / (record.until - record.since),
        0,
        1,
      );
      wave =
        Math.sin(phase * Math.PI) * (0.8 + 0.2 * Math.sin(phase * Math.PI * 5));
    } else if (inspecting) {
      const phase = clamp(
        (time - record.since) / (record.until - record.since),
        0,
        1,
      );
      const gesturePhase = (phase * 3 + record.variant) % 3;
      hand =
        gesturePhase > 1 && gesturePhase < 2
          ? Math.sin((gesturePhase - 1) * Math.PI)
          : 0;
      chest =
        record === female && gesturePhase < 1
          ? Math.sin(gesturePhase * Math.PI)
          : 0;
    } else if (talking) {
      record.focus
        .copy(record === female ? boy.normal : girl.normal)
        .multiplyScalar(1.063);
      const phase =
        clamp((time - talkStarted) / talkDuration, 0, 0.9999) * exchanges;
      const turn = Math.floor(phase);
      const local = phase - turn;
      const envelope =
        local > 0.15 && local < 0.7
          ? Math.sin(((local - 0.15) / 0.55) * Math.PI)
          : 0;
      const speaker = turn % 2 === 0 ? female : male;
      if (record === speaker) hand = envelope;
      else if (nodMask & (1 << turn)) nod = envelope * 0.045;
    }
    if (record.state === "showGarden") {
      const local = (((time - tourShowingAt) / tourDuration) * 2) % 1;
      hand =
        local > 0.15 && local < 0.8
          ? Math.sin(((local - 0.15) / 0.65) * Math.PI)
          : 0;
      chest = 0;
    }
    if (record.state === "gardenGuest") {
      nod = female.pose.hand * 0.035;
      hand = 0;
      chest = 0;
    }
    const active = inspecting || talking || record.state === "wave";
    const blend = 1 - Math.exp(-dt / 0.16);
    const output = record.pose;
    output.weight += ((active ? 1 : 0) - output.weight) * blend;
    output.hand += (hand - output.hand) * blend;
    output.wave += (wave - output.wave) * blend;
    output.chest += (chest - output.chest) * blend;
    output.lean +=
      ((inspecting ? 0.04 + hand * 0.04 : 0) - output.lean) * blend;
    output.tilt +=
      ((record.state === "garden" || record.state === "showGarden" ? 0.07 : 0) -
        output.tilt) *
      blend;
    output.nod += (nod - output.nod) * blend;
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
          record.state === "travelRocket"
        ) {
          const remaining = angle(record.walker.normal, record.walker.target);
          if (
            remaining < record.bestRemaining - 0.003 ||
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
