// A tiny precomputed visibility graph for the garden only. No navmesh, scene
// traversal, or per-step search. Route storage belongs to each actor.
export function createGardenRoutes(navigation, views, normal, walker) {
  // Include safe outer prop waypoints, so a house between the walker and every
  // garden entrance cannot make all entry links disappear.
  const nodes = [...views, ...(navigation.propRouteNodes || [])];
  const tangent = normal.clone().cross(walker.forward).normalize();
  const side = normal.clone().cross(tangent).normalize();
  for (let i = 0; i < 16; i++) {
    const turn = (i * Math.PI) / 8;
    nodes.push(
      normal
        .clone()
        .multiplyScalar(Math.cos(0.29))
        .addScaledVector(tangent, Math.sin(0.29) * Math.cos(turn))
        .addScaledVector(side, Math.sin(0.29) * Math.sin(turn))
        .normalize(),
    );
  }
  const count = nodes.length;
  const edges = new Float64Array(count * count).fill(Infinity);
  const valid = nodes.map((point) => navigation.isStaticClear(point, walker));
  for (let a = 0; a < count; a++)
    for (let b = a + 1; b < count; b++) {
      if (
        valid[a] &&
        valid[b] &&
        navigation.segmentClear(nodes[a], nodes[b], walker)
      ) {
        const distance = nodes[a].angleTo(nodes[b]);
        edges[a * count + b] = edges[b * count + a] = distance;
      }
    }
  const distance = new Float64Array(count);
  const parent = new Int16Array(count);
  const visited = new Uint8Array(count);
  const reversed = new Int16Array(count);
  return {
    nodes,
    plan(from, destination, route) {
      if (navigation.segmentClear(from, nodes[destination], walker)) {
        route[0] = destination;
        return 1;
      }
      visited.fill(0);
      distance.fill(Infinity);
      parent.fill(-1);
      for (let i = 0; i < count; i++)
        if (valid[i] && navigation.segmentClear(from, nodes[i], walker))
          distance[i] = from.angleTo(nodes[i]);
      for (let step = 0; step < count; step++) {
        let closest = -1;
        let best = Infinity;
        for (let i = 0; i < count; i++)
          if (!visited[i] && distance[i] < best) {
            closest = i;
            best = distance[i];
          }
        if (closest < 0) return 0;
        if (closest === destination) {
          let length = 0;
          for (let i = closest; i >= 0; i = parent[i]) reversed[length++] = i;
          for (let i = 0; i < length; i++) route[i] = reversed[length - i - 1];
          return length;
        }
        visited[closest] = 1;
        for (let i = 0; i < count; i++) {
          const next = best + edges[closest * count + i];
          if (next < distance[i]) {
            distance[i] = next;
            parent[i] = closest;
          }
        }
      }
      return 0;
    },
  };
}
