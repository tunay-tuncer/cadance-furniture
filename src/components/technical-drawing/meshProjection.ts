import * as THREE from "three";
import type { ViewGeometry, DrawingLine, DimensionLineData } from "./technicalDrawingUtils";

export type ProjectedDrawingViews = Record<"front" | "top" | "side" | "iso", ViewGeometry>;

type ProjectionKind = keyof ProjectedDrawingViews;
type ProjectedPoint = { u: number; v: number; depth: number };
type ProjectedTriangle = [ProjectedPoint, ProjectedPoint, ProjectedPoint];
type ProjectedEdge = [ProjectedPoint, ProjectedPoint];
type DepthTriangle = { points: ProjectedTriangle; area: number };

const EMPTY_VIEW: ViewGeometry = { width: 1, height: 1, rects: [], lines: [], circles: [], dimensions: [] };

function isIgnoredDrawingMesh(mesh: THREE.Mesh): boolean {
  for (let ancestor: THREE.Object3D | null = mesh; ancestor; ancestor = ancestor.parent) {
    if (ancestor.userData?.drawingIgnore === true) return true;
  }
  return Boolean(mesh.userData?.unitName?.includes("selection"));
}

function isDrawingMesh(mesh: THREE.Mesh): boolean {
  if (isIgnoredDrawingMesh(mesh)) return false;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some(
    (material) => material.visible !== false && !("wireframe" in material && material.wireframe) &&
      !(material.type === "MeshBasicMaterial" && material.transparent)
  );
}

function isOpaqueModelMesh(mesh: THREE.Mesh): boolean {
  if (isIgnoredDrawingMesh(mesh)) return false;
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some(
    (material) => material.visible !== false && !material.transparent && material.opacity >= 1 &&
      !("wireframe" in material && material.wireframe)
  );
}

/**
 * Project the actual rendered furniture meshes into orthographic and isometric
 * line views. Exact projected-triangle depth tests remove edges hidden behind
 * opaque surfaces without raster gaps or pixel-neighborhood clipping.
 */
export function projectFurnitureMeshes(
  root: THREE.Group | null,
  isoAngle = 45,
  isoElevation = 30,
  unit: "mm" | "cm" = "mm",
): ProjectedDrawingViews | null {
  if (!root) return null;

  root.updateMatrixWorld(true);

  const sourceMeshes: THREE.Mesh[] = [];
  root.traverseVisible((object) => {
    const candidate = object as THREE.Mesh;
    const isEdgeOverlay = candidate.geometry?.type === "LineSegmentsGeometry";
    if (candidate.isMesh && !isEdgeOverlay && candidate.geometry?.getAttribute("position") && isDrawingMesh(candidate)) {
      sourceMeshes.push(candidate);
    }
  });
  if (sourceMeshes.length === 0) return null;

  const angle = THREE.MathUtils.degToRad(isoAngle);
  const elevation = THREE.MathUtils.degToRad(isoElevation);
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const cosB = Math.cos(elevation);
  const sinB = Math.sin(elevation);

  const projectPoint = (point: THREE.Vector3, kind: ProjectionKind): ProjectedPoint => {
    // FurnitureMesh uses metres; technical drawings use millimetres.
    const x = point.x * 1000;
    const y = point.y * 1000;
    const z = point.z * 1000;
    if (kind === "front") return { u: x, v: y, depth: z };
    if (kind === "top") return { u: x, v: z, depth: y };
    if (kind === "side") return { u: z, v: y, depth: x };

    const rx = x * cosA + z * sinA;
    const rz = -x * sinA + z * cosA;
    return {
      u: rx,
      v: y * cosB - rz * sinB,
      depth: y * sinB + rz * cosB,
    };
  };

  const triangleSets: Record<ProjectionKind, ProjectedTriangle[]> = { front: [], top: [], side: [], iso: [] };
  const occlusionTriangleSets: Record<ProjectionKind, ProjectedTriangle[]> = { front: [], top: [], side: [], iso: [] };
  const edgeSets: Record<ProjectionKind, ProjectedEdge[]> = { front: [], top: [], side: [], iso: [] };
  const localPoint = new THREE.Vector3();

  for (const mesh of sourceMeshes) {
    const meshOccludes = isOpaqueModelMesh(mesh);
    const positions = mesh.geometry.getAttribute("position") as THREE.BufferAttribute;
    const worldVertices: THREE.Vector3[] = [];
    for (let i = 0; i < positions.count; i++) {
      localPoint.fromBufferAttribute(positions, i);
      worldVertices.push(localPoint.clone().applyMatrix4(mesh.matrixWorld));
    }

    const indices = mesh.geometry.index;
    const triangleIndex = (index: number) => indices ? indices.getX(index) : index;
    const triangleCount = indices ? indices.count : positions.count;
    const kinds: ProjectionKind[] = ["front", "top", "side", "iso"];

    for (const kind of kinds) {
      const projected = worldVertices.map((vertex) => projectPoint(vertex, kind));
      const cameraDirection = kind === "front"
        ? new THREE.Vector3(0, 0, 1)
        : kind === "top"
          ? new THREE.Vector3(0, 1, 0)
          : kind === "side"
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(-sinA * cosB, sinB, cosA * cosB);
      const edgeMap = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; normals: THREE.Vector3[] }>();

      const pointKey = (point: THREE.Vector3) =>
        `${Math.round(point.x * 100000)},${Math.round(point.y * 100000)},${Math.round(point.z * 100000)}`;

      const addTriangleEdge = (from: number, to: number, normal: THREE.Vector3) => {
        const fromPoint = worldVertices[from];
        const toPoint = worldVertices[to];
        if (!fromPoint || !toPoint) return;
        const fromKey = pointKey(fromPoint);
        const toKey = pointKey(toPoint);
        const ordered = fromKey < toKey;
        const key = ordered ? `${fromKey}|${toKey}` : `${toKey}|${fromKey}`;
        let edge = edgeMap.get(key);
        if (!edge) {
          edge = { a: (ordered ? fromPoint : toPoint).clone(), b: (ordered ? toPoint : fromPoint).clone(), normals: [] };
          edgeMap.set(key, edge);
        }
        edge.normals.push(normal);
      };

      for (let i = 0; i + 2 < triangleCount; i += 3) {
        const ia = triangleIndex(i), ib = triangleIndex(i + 1), ic = triangleIndex(i + 2);
        const a = projected[ia], b = projected[ib], c = projected[ic];
        const worldA = worldVertices[ia], worldB = worldVertices[ib], worldC = worldVertices[ic];
        if (!a || !b || !c || !worldA || !worldB || !worldC) continue;
        const triangle: ProjectedTriangle = [a, b, c];
        triangleSets[kind].push(triangle);
        if (meshOccludes) occlusionTriangleSets[kind].push(triangle);
        const faceNormal = worldB.clone().sub(worldA).cross(worldC.clone().sub(worldA)).normalize();
        addTriangleEdge(ia, ib, faceNormal);
        addTriangleEdge(ib, ic, faceNormal);
        addTriangleEdge(ic, ia, faceNormal);
      }

      const projectedEdges = edgeSets[kind];
      const sharpEdgeThreshold = Math.cos(THREE.MathUtils.degToRad(20));
      for (const edge of edgeMap.values()) {
        const facesTowardCamera = edge.normals.map((normal) => normal.dot(cameraDirection) > 1e-5);
        const hasTowardFace = facesTowardCamera.some(Boolean);
        const hasAwayFace = facesTowardCamera.some((isFacing) => !isFacing);
        const isSilhouette = (hasTowardFace && hasAwayFace) || (edge.normals.length === 1 && hasTowardFace);
        const isSharp = edge.normals.some((normal, index) =>
          edge.normals.slice(index + 1).some((other) => normal.dot(other) < sharpEdgeThreshold)
        );
        // Back-facing creases are never visible edges, even when raster sampling
        // misses the surface that should occlude them.
        if (hasTowardFace && (isSilhouette || isSharp)) {
          projectedEdges.push([
            projectPoint(edge.a, kind),
            projectPoint(edge.b, kind),
          ]);
        }
      }
    }
  }

  const buildView = (kind: ProjectionKind): ViewGeometry => {
    const triangles = triangleSets[kind];
    const edges = edgeSets[kind];
    const projectedPoints = triangles.flatMap((triangle) => triangle);
    if (projectedPoints.length === 0) return EMPTY_VIEW;

    let minU = Infinity;
    let minV = Infinity;
    let maxU = -Infinity;
    let maxV = -Infinity;
    for (const point of projectedPoints) {
      minU = Math.min(minU, point.u);
      minV = Math.min(minV, point.v);
      maxU = Math.max(maxU, point.u);
      maxV = Math.max(maxV, point.v);
    }

    const width = Math.max(1, maxU - minU);
    const height = Math.max(1, maxV - minV);
    const sampleScale = 1534 / Math.max(width, height);
    const binCount = 80;
    const depthBins: DepthTriangle[][] = Array.from(
      { length: binCount * binCount },
      () => [],
    );
    const binX = (u: number) => Math.max(0, Math.min(binCount - 1,
      Math.floor(((u - minU) / width) * binCount)));
    const binY = (v: number) => Math.max(0, Math.min(binCount - 1,
      Math.floor(((maxV - v) / height) * binCount)));

    // Index projected triangles into a coarse spatial grid, then test their
    // exact barycentric depth at each edge sample. This avoids the broken,
    // dotted edges caused by treating an adjacent raster pixel as occlusion.
    for (const points of occlusionTriangleSets[kind]) {
      const [a, b, c] = points;
      const area = (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
      if (Math.abs(area) < 1e-10) continue;
      const x0 = binX(Math.min(a.u, b.u, c.u));
      const x1 = binX(Math.max(a.u, b.u, c.u));
      const y0 = binY(Math.max(a.v, b.v, c.v));
      const y1 = binY(Math.min(a.v, b.v, c.v));
      const depthTriangle = { points, area };
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          depthBins[y * binCount + x].push(depthTriangle);
        }
      }
    }

    const nearestDepthAt = (u: number, v: number) => {
      let nearestDepth = -Infinity;
      const candidates = depthBins[binY(v) * binCount + binX(u)];
      for (const { points, area } of candidates) {
        const [a, b, c] = points;
        const wa = ((b.u - u) * (c.v - v) - (b.v - v) * (c.u - u)) / area;
        const wb = ((c.u - u) * (a.v - v) - (c.v - v) * (a.u - u)) / area;
        const wc = 1 - wa - wb;
        if (wa < -1e-8 || wb < -1e-8 || wc < -1e-8) continue;
        nearestDepth = Math.max(nearestDepth, wa * a.depth + wb * b.depth + wc * c.depth);
      }
      return nearestDepth;
    };

    const lines: DrawingLine[] = [];
    const seenSegments = new Set<string>();
    const depthTolerance = 0.05;
    let lineId = 0;

    for (const [a, b] of edges) {
      const projectedLength = Math.hypot(b.u - a.u, b.v - a.v);
      const pixelLength = projectedLength * sampleScale;
      const samples = Math.max(2, Math.ceil(pixelLength * 2.5));
      let fragmentStart: number | null = null;

      const finishFragment = (endSample: number) => {
        if (fragmentStart === null) return;
        const startSample = fragmentStart;
        fragmentStart = null;
        if (endSample <= startSample) return;
        const startRatio = startSample / samples;
        const endRatio = endSample / samples;
        const x1 = a.u + (b.u - a.u) * startRatio - minU;
        const y1 = a.v + (b.v - a.v) * startRatio - minV;
        const x2 = a.u + (b.u - a.u) * endRatio - minU;
        const y2 = a.v + (b.v - a.v) * endRatio - minV;
        const key = [x1, y1, x2, y2].map((value) => Math.round(value * 4) / 4).join(":");
        const reverseKey = [x2, y2, x1, y1].map((value) => Math.round(value * 4) / 4).join(":");
        if (!seenSegments.has(key) && !seenSegments.has(reverseKey)) {
          seenSegments.add(key);
          lines.push({ id: `${kind}-mesh-${++lineId}`, x1, y1, x2, y2, type: "outline" });
        }
      };

      for (let sample = 0; sample <= samples; sample++) {
        const ratio = sample / samples;
        const u = a.u + (b.u - a.u) * ratio;
        const v = a.v + (b.v - a.v) * ratio;
        const nearestDepth = nearestDepthAt(u, v);
        const edgeDepth = a.depth + (b.depth - a.depth) * ratio;
        const visible = !Number.isFinite(nearestDepth) || edgeDepth >= nearestDepth - depthTolerance;
        if (visible && fragmentStart === null) fragmentStart = sample;
        if (!visible) finishFragment(sample - 1);
      }
      finishFragment(samples);
    }

    const dimensions: DimensionLineData[] = [];
    const formatValue = (value: number) => {
      const displayed = unit === "cm" ? value / 10 : value;
      const rounded = unit === "cm"
        ? (Number.isInteger(displayed) ? displayed.toString() : displayed.toFixed(1))
        : Math.round(displayed).toString();
      return `${rounded} ${unit}`;
    };

    if (kind !== "iso") {
      const isPlan = kind === "top";
      const horizontalValue = width;
      dimensions.push({
        id: `${kind}-overall-width`,
        x1: 0,
        y1: -45,
        x2: width,
        y2: -45,
        refX1: 0,
        refY1: 0,
        refX2: width,
        refY2: 0,
        value: horizontalValue,
        text: formatValue(horizontalValue),
        orientation: "horizontal",
      });

      const verticalOffset = 45;
      dimensions.push({
        id: `${kind}-overall-${isPlan ? "depth" : "height"}`,
        x1: width + verticalOffset,
        y1: 0,
        x2: width + verticalOffset,
        y2: height,
        refX1: width,
        refY1: 0,
        refX2: width,
        refY2: height,
        value: height,
        text: formatValue(height),
        orientation: "vertical",
      });
    }

    return { width, height, rects: [], lines, circles: [], dimensions };
  };

  return {
    front: buildView("front"),
    top: buildView("top"),
    side: buildView("side"),
    iso: buildView("iso"),
  };
}
