import * as THREE from "three";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export type ExportFormat = "obj" | "gltf" | "stl";

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

  if (format === "obj") {
    const exporter = new OBJExporter();
    const result = exporter.parse(object);
    const blob = new Blob([result], { type: "text/plain" });
    triggerDownload(blob, `${sanitizedName}.obj`);
  } else if (format === "stl") {
    const exporter = new STLExporter();
    const result = exporter.parse(object, { binary: true });
    const blob = new Blob([result], { type: "application/octet-stream" });
    triggerDownload(blob, `${sanitizedName}.stl`);
  } else if (format === "gltf") {
    const exporter = new GLTFExporter();
    exporter.parse(
      object,
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
