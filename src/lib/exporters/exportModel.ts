import * as THREE from "three";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type ExportFormat = "obj" | "gltf" | "stl";

/**
 * Filter to determine whether a Three.js object represents physical furniture geometry
 * or viewport-only helpers (such as Drei Edges billboard quads, selection wireframes,
 * invisible click planes, snap detectors, and 2D drawing proxies).
 */
export function isExportableObject(obj: THREE.Object3D): boolean {
  if (!obj) return false;

  // Exclude HTML overlays or Drei helper objects
  if (obj.type === "Html" || (obj as any).isHtml) return false;

  // Exclude Drei Edges / LineSegments2 / Line overlays
  if (
    obj.type === "LineSegments" ||
    obj.type === "Line" ||
    (obj as any).isLine ||
    (obj as any).isLineSegments ||
    (obj as any).isLineSegments2 ||
    (obj as any).geometry?.isLineSegmentsGeometry ||
    (obj as any).geometry?.type === "LineSegmentsGeometry" ||
    (obj as any).geometry?.type === "WireframeGeometry2" ||
    (obj as any).geometry?.attributes?._instanceStart !== undefined ||
    (obj as any).material?.isLineMaterial ||
    (obj as any).material?.type === "LineMaterial"
  ) {
    return false;
  }

  // Exclude explicit ignore flags & technical drawing proxies
  if (obj.userData?.exportIgnore === true) return false;
  if (obj.userData?.isHandleDrawing === true) return false;
  if (typeof obj.userData?.unitName === "string" && obj.userData.unitName.includes("selection")) return false;

  if ((obj as THREE.Mesh).isMesh) {
    const mesh = obj as THREE.Mesh;
    const geom = mesh.geometry;
    if (!geom) return false;

    // Filter billboard quad templates (such as LineSegmentsGeometry template [-1,-1,0] to [1,2,0])
    const pos = geom.attributes?.position;
    if (pos && pos.count <= 8) {
      if (geom.attributes._instanceStart !== undefined) return false;
      geom.computeBoundingBox();
      const bbox = geom.boundingBox;
      if (
        bbox &&
        Math.abs(bbox.min.x - -1) < 1e-4 &&
        Math.abs(bbox.max.x - 1) < 1e-4 &&
        Math.abs(bbox.min.y - -1) < 1e-4 &&
        Math.abs(bbox.max.y - 2) < 1e-4
      ) {
        return false;
      }
    }

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    // Filter out invisible objects, 0-opacity interaction planes, snap boxes, and selection overlays
    const isEffectivelyInvisible = materials.every((m) => {
      if (!m || m.visible === false) return true;
      // All selection outlines, snap zones, and click planes in this app use transparent MeshBasicMaterial
      if (m.type === "MeshBasicMaterial" && m.transparent) return true;
      // In general, non-glass meshes with opacity < 0.25 are helper/selection overlays
      if (m.transparent && m.opacity < 0.25) return true;
      return false;
    });

    if (isEffectivelyInvisible) return false;
  }

  return true;
}

/**
 * Creates a clean clone of the furniture hierarchy containing only physical geometry,
 * removing all viewport outlines, selection boxes, and invisible planes.
 */
export function cleanModelForExport(source: THREE.Object3D): THREE.Object3D {
  source.updateMatrixWorld(true);
  const clone = source.clone(true);
  const materialClones = new Map<THREE.Material, THREE.Material>();

  const toRemove: THREE.Object3D[] = [];
  clone.traverse((child) => {
    if (!isExportableObject(child)) {
      toRemove.push(child);
    } else if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        const fixMat = (m: THREE.Material): THREE.Material => {
          const cached = materialClones.get(m);
          if (cached) return cached;
          const c = m.clone();
          materialClones.set(m, c);
          if ("wireframe" in c) {
            (c as any).wireframe = false;
          }
          // If material was set to low opacity solely due to viewport wireframe mode, restore full opacity
          if (
            "opacity" in c &&
            c.name !== "Cadance_Smoked_Glass" &&
            (c as any).opacity < 1.0 &&
            (c as any).opacity > 0.05
          ) {
            (c as any).opacity = 1.0;
            c.transparent = false;
          }
          return c;
        };

        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(fixMat);
        } else {
          mesh.material = fixMat(mesh.material);
        }
      }
    }
  });

  for (const obj of toRemove) {
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  }

  clone.updateMatrixWorld(true);
  return clone;
}

/**
 * GLTF preserves every Three.js parent node. Furniture is assembled from many
 * tiny renderer groups, which turns into an unnecessarily deep SketchUp tree.
 * Bake world transforms into geometry and merge compatible same-material meshes
 * into a single flat export root.
 */
export function flattenModelForGltf(source: THREE.Object3D): THREE.Group {
  source.updateMatrixWorld(true);
  const root = new THREE.Group();
  root.name = source.name || "Furniture";

  const batches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  const unmerged: THREE.Mesh[] = [];

  source.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry || !isExportableObject(mesh)) return;

    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);

    if (Array.isArray(mesh.material)) {
      unmerged.push(new THREE.Mesh(geometry, mesh.material));
      return;
    }

    geometry.clearGroups();

    const schema = Object.entries(geometry.attributes)
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized}:${attribute.array.constructor.name}`)
      .sort()
      .join(",");
    const key = `${mesh.material.uuid}|${schema}|${Boolean(geometry.index)}`;
    const batch = batches.get(key);
    if (batch) batch.geometries.push(geometry);
    else batches.set(key, { material: mesh.material, geometries: [geometry] });
  });

  for (const batch of batches.values()) {
    const geometry = batch.geometries.length === 1
      ? batch.geometries[0]
      : mergeGeometries(batch.geometries, false);
    if (geometry) {
      const mesh = new THREE.Mesh(geometry, batch.material);
      mesh.name = batch.material.name || `Furniture_${root.children.length + 1}`;
      root.add(mesh);
    } else {
      // Preserve geometry if a Three.js geometry variant cannot be merged.
      for (const fallbackGeometry of batch.geometries) {
        const mesh = new THREE.Mesh(fallbackGeometry, batch.material);
        mesh.name = `${batch.material.name || "Furniture"}_${root.children.length + 1}`;
        root.add(mesh);
      }
    }
  }

  for (const mesh of unmerged) {
    mesh.name = `${Array.isArray(mesh.material) ? "Furniture" : mesh.material.name || "Furniture"}_${root.children.length + 1}`;
    root.add(mesh);
  }

  return root;
}

export async function exportFurnitureModel(
  object: THREE.Object3D,
  filename: string,
  format: ExportFormat = "obj"
) {
  if (typeof window === "undefined" || !object) return;

  const sanitizedName = (filename || "parametric_furniture")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");

  const cleanObject = cleanModelForExport(object);

  if (format === "obj") {
    const exporter = new OBJExporter();
    const result = exporter.parse(cleanObject);
    const blob = new Blob([result], { type: "text/plain" });
    triggerDownload(blob, `${sanitizedName}.obj`);
  } else if (format === "stl") {
    const exporter = new STLExporter();
    const result = exporter.parse(cleanObject, { binary: true });
    const blob = new Blob([result], { type: "application/octet-stream" });
    triggerDownload(blob, `${sanitizedName}.stl`);
  } else if (format === "gltf") {
    const exporter = new GLTFExporter();
    const flatObject = flattenModelForGltf(cleanObject);
    exporter.parse(
      flatObject,
      (gltf) => {
        const isBinary = gltf instanceof ArrayBuffer;
        const blob = isBinary
          ? new Blob([gltf], { type: "application/octet-stream" })
          : new Blob([JSON.stringify(gltf, null, 2)], {
              type: "application/json",
            });
        const ext = isBinary ? "glb" : "gltf";
        triggerDownload(blob, `${sanitizedName}.${ext}`);
      },
      (error) => {
        console.error("GLTF export error:", error);
      },
      { binary: true }
    );
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
