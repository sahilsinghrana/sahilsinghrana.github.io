import { Vector3 } from "three";

// Static visibility graph, shared by both walkers. Searches happen only when a
// destination changes; fixed-step motion only consumes the stored waypoints.
export function createPropRoutes(navigation, obstacles, walker) {
  const nodes = [];
  for (const obstacle of obstacles) {
    // Departure paths need the same fine clearances as garden arrival paths.
    // Include flower/lamp waypoints so a walker can leave an interior pocket.
    if (obstacle.roverOnly) continue;
    const up = obstacle.normal;
    const tangent = new Vector3(1, 0, 0).addScaledVector(up, -up.x).normalize();
    const side = new Vector3().crossVectors(up, tangent).normalize();
    const radius =
      (obstacle.halfWidth
        ? Math.hypot(obstacle.halfWidth, obstacle.halfDepth)
        : obstacle.radius) +
      walker.radius +
      (obstacle.name === "GardenDetail" ? 0.006 : 0.024);
    const samples = obstacle.name === "GardenDetail" ? 8 : 12;
    for (let i = 0; i < samples; i++) {
      const turn = (i * Math.PI * 2) / samples;
      const point = up
        .clone()
        .multiplyScalar(Math.cos(radius))
        .addScaledVector(tangent, Math.sin(radius) * Math.cos(turn))
        .addScaledVector(side, Math.sin(radius) * Math.sin(turn))
        .normalize();
      point.gardenDetail = obstacle.name === "GardenDetail";
      if (navigation.isStaticClear(point, walker)) nodes.push(point);
    }
  }
  const count = nodes.length;
  const edges = new Float64Array(count * count).fill(Infinity);
  for (let a = 0; a < count; a++)
    for (let b = a + 1; b < count; b++) {
      if (navigation.segmentClear(nodes[a], nodes[b], walker))
        edges[a * count + b] = edges[b * count + a] = nodes[a].angleTo(
          nodes[b],
        );
    }
  const distances = new Float64Array(count),
    parent = new Int16Array(count);
  const visited = new Uint8Array(count),
    endings = new Float64Array(count);
  const reversed = new Int16Array(count);
  return {
    nodes,
    plan(from, to, agent, route) {
      if (navigation.segmentClear(from, to, agent)) return 0;
      visited.fill(0);
      distances.fill(Infinity);
      parent.fill(-1);
      for (let i = 0; i < count; i++) {
        if (navigation.segmentClear(from, nodes[i], agent))
          distances[i] = from.angleTo(nodes[i]);
        endings[i] = navigation.segmentClear(nodes[i], to, agent)
          ? nodes[i].angleTo(to)
          : Infinity;
      }
      let end = -1,
        bestEnd = Infinity;
      for (let step = 0; step < count; step++) {
        let closest = -1,
          best = Infinity;
        for (let i = 0; i < count; i++)
          if (!visited[i] && distances[i] < best) {
            closest = i;
            best = distances[i];
          }
        if (closest < 0 || best >= bestEnd) break;
        if (best + endings[closest] < bestEnd) {
          end = closest;
          bestEnd = best + endings[closest];
        }
        visited[closest] = 1;
        for (let i = 0; i < count; i++) {
          const next = best + edges[closest * count + i];
          if (next < distances[i]) {
            distances[i] = next;
            parent[i] = closest;
          }
        }
      }
      if (end < 0) return -1;
      let length = 0;
      for (let i = end; i >= 0; i = parent[i]) reversed[length++] = i;
      if (length > route.length) return -1;
      for (let i = 0; i < length; i++) route[i] = reversed[length - i - 1];
      return length;
    },
  };
}
