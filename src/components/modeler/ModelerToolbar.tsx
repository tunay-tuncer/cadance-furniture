"use client";

import React from "react";
import {
  MdGridOn,
  MdGridOff,
  MdStraighten,
  MdLayers,
  MdCameraAlt,
} from "react-icons/md";
import styles from "./modeler.module.css";

interface ModelerToolbarProps {
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showDimensions: boolean;
  setShowDimensions: React.Dispatch<React.SetStateAction<boolean>>;
  wireframe: boolean;
  setWireframe: React.Dispatch<React.SetStateAction<boolean>>;
  isParallel: boolean;
  setIsParallel: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function ModelerToolbar({
  showGrid,
  setShowGrid,
  showDimensions,
  setShowDimensions,
  wireframe,
  setWireframe,
  isParallel,
  setIsParallel,
}: ModelerToolbarProps) {
  return (
    <div className={styles.viewportToolbar}>
      <button
        type="button"
        onClick={() => setShowGrid((v) => !v)}
        className={`${styles.toolBtn} ${showGrid ? styles.toolBtnActive : ""}`}
        title="Toggle Floor Grid"
      >
        {showGrid ? <MdGridOn size={15} /> : <MdGridOff size={15} />}
        <span>Grid</span>
      </button>

      <button
        type="button"
        onClick={() => setShowDimensions((v) => !v)}
        className={`${styles.toolBtn} ${showDimensions ? styles.toolBtnActive : ""}`}
        title="Toggle Dimension Labels"
      >
        <MdStraighten size={15} />
        <span>Dimensions</span>
      </button>

      <button
        type="button"
        onClick={() => setWireframe((v) => !v)}
        className={`${styles.toolBtn} ${wireframe ? styles.toolBtnActive : ""}`}
        title="Toggle Wireframe Mode"
      >
        <MdLayers size={15} />
        <span>Wireframe</span>
      </button>

      {/* Projection Mode Toggle / Indicator */}
      <button
        type="button"
        onClick={() => setIsParallel((v) => !v)}
        className={`${styles.toolBtn} ${isParallel ? styles.toolBtnActive : ""}`}
        title={
          isParallel
            ? "Current: Parallel (Orthographic). Click or rotate view to switch to Perspective"
            : "Current: Perspective. Click a ViewCube face/vertex or click here for Parallel"
        }
      >
        <MdCameraAlt size={15} />
        <span>{isParallel ? "PARALLEL (ORTHO)" : "PERSPECTIVE"}</span>
      </button>
    </div>
  );
}
