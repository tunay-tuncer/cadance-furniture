"use client";

import React, { Suspense, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  PerspectiveCamera,
  OrthographicCamera,
  Environment,
  Lightformer,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import FurnitureMesh, { FurnitureParams, getFurnitureAssemblyDimensions } from "./FurnitureMesh";
import CadanceViewCube from "./CadanceViewCube";

interface ModelerCanvasProps {
  params: FurnitureParams;
  groupRef: React.RefObject<THREE.Group | null>;
  onModelReady?: () => void;
  showGrid: boolean;
  isParallel: boolean;
  setIsParallel: (val: boolean) => void;
  onSelectUnit?: (id: string) => void;
  onSelectUnits?: (ids: string[]) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onAddDivision?: (unitId: string, type: "vertical" | "horizontal") => void;
  onSelectDivision?: (div: import("./FurnitureMesh").SelectedDivision | null) => void;
  onSelectDivisions?: (divs: import("./FurnitureMesh").SelectedDivision[]) => void;
  onRemoveDivision?: (div: import("./FurnitureMesh").SelectedDivision) => void;
}

// Default orbit pivot point at furniture vertical midpoint (~450mm from floor)
const DEFAULT_TARGET: [number, number, number] = [0, 0.45, 0];

// Instant Marquee Box Selection Bridge inside 3D Scene
function BoxSelectHandler({
  groupRef,
  onSelectUnits,
  onSelectDivision,
  onSelectDivisions,
  boxSelectorRef,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  onSelectUnits?: (ids: string[]) => void;
  onSelectDivision?: (div: import("./FurnitureMesh").SelectedDivision | null) => void;
  onSelectDivisions?: (divs: import("./FurnitureMesh").SelectedDivision[]) => void;
  boxSelectorRef: React.MutableRefObject<((rect: [number, number, number, number]) => void) | null>;
}) {
  const { camera, size } = useThree();

  useEffect(() => {
    boxSelectorRef.current = ([minX, minY, maxX, maxY]) => {
      const root = groupRef.current;
      if (!root) return;
      const matchedIds: string[] = [];
      const checkedUnits = new Set<string>();
      const matchedDivisions: import("./FurnitureMesh").SelectedDivision[] = [];
      const seenDivisions = new Set<string>();

      const isInside = (obj: THREE.Object3D) => {
        const bbox = new THREE.Box3().setFromObject(obj);
        if (bbox.isEmpty()) return false;

        const center = new THREE.Vector3();
        bbox.getCenter(center);
        const projCenter = center.clone().project(camera);
        if (projCenter.z < 1) {
          const sx = ((projCenter.x + 1) / 2) * size.width;
          const sy = ((-projCenter.y + 1) / 2) * size.height;
          if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
            return true;
          }
        }

        const corners = [
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.min.z),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.min.z),
          new THREE.Vector3(bbox.min.x, bbox.max.y, bbox.min.z),
          new THREE.Vector3(bbox.max.x, bbox.min.y, bbox.min.z),
          new THREE.Vector3(bbox.min.x, bbox.min.y, bbox.max.z),
          new THREE.Vector3(bbox.max.x, bbox.max.y, bbox.max.z),
        ];

        for (const corner of corners) {
          const proj = corner.project(camera);
          if (proj.z < 1) {
            const px = ((proj.x + 1) / 2) * size.width;
            const py = ((-proj.y + 1) / 2) * size.height;
            if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
              return true;
            }
          }
        }
        return false;
      };

      root.traverse((obj) => {
        // Check for division meshes first
        const division = obj.userData?.division as import("./FurnitureMesh").SelectedDivision | undefined;
        if (division) {
          const key = `${division.unitId}-${division.type}-${division.index}-${division.colIndex ?? ""}`;
          if (!seenDivisions.has(key)) {
            seenDivisions.add(key);
            if (isInside(obj)) {
              matchedDivisions.push(division);
              return;
            }
          }
        }

        // Check for unit items (cabinets, wardrobes)
        const unitId = obj.userData?.unitId;
        if (unitId && typeof unitId === "string" && !checkedUnits.has(unitId)) {
          checkedUnits.add(unitId);
          if (isInside(obj)) {
            matchedIds.push(unitId);
          }
        }
      });

      if (matchedDivisions.length > 0) {
        onSelectDivision?.(matchedDivisions[0]);
        onSelectDivisions?.(matchedDivisions);
      } else if (matchedIds.length > 0) {
        onSelectUnits?.(matchedIds);
      }
    };

    return () => {
      boxSelectorRef.current = null;
    };
  }, [camera, size, groupRef, onSelectUnits, onSelectDivision, onSelectDivisions, boxSelectorRef]);

  return null;
}

// Controller component to manage seamless Perspective <-> Orthographic synchronization
function CameraSyncController({
  isParallel,
  setIsParallel,
  controlsRef,
  perspRef,
  orthoRef,
}: {
  isParallel: boolean;
  setIsParallel: (val: boolean) => void;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  perspRef: React.RefObject<THREE.PerspectiveCamera | null>;
  orthoRef: React.RefObject<THREE.OrthographicCamera | null>;
}) {
  const { set, size, invalidate } = useThree();
  const prevParallelRef = useRef(isParallel);

  // Synchronize transforms smoothly ONLY when projection mode actually changes
  useEffect(() => {
    if (prevParallelRef.current === isParallel) return;
    prevParallelRef.current = isParallel;

    const controls = controlsRef.current;
    const persp = perspRef.current;
    const ortho = orthoRef.current;
    if (!persp || !ortho) return;

    if (isParallel) {
      // Switch active camera to Orthographic
      const target = controls?.target ? controls.target.clone() : new THREE.Vector3(0, 0.45, 0);
      const dist = Math.max(1.2, persp.position.distanceTo(target));

      ortho.position.copy(persp.position);
      ortho.quaternion.copy(persp.quaternion);
      ortho.up.copy(persp.up);

      // Frustum calculation to match visual scale
      const fovRad = THREE.MathUtils.degToRad(persp.fov);
      const visibleHeight = 2 * dist * Math.tan(fovRad / 2);
      const aspect = size.width / Math.max(1, size.height);
      ortho.left = (-visibleHeight * aspect) / 2;
      ortho.right = (visibleHeight * aspect) / 2;
      ortho.top = visibleHeight / 2;
      ortho.bottom = -visibleHeight / 2;
      ortho.zoom = 1;
      ortho.updateProjectionMatrix();

      set({ camera: ortho });
      if (controls) {
        controls.object = ortho;
        controls.update();
      }
    } else {
      // Switch active camera to Perspective
      persp.position.copy(ortho.position);
      persp.quaternion.copy(ortho.quaternion);
      persp.up.copy(ortho.up);
      persp.aspect = size.width / Math.max(1, size.height);
      persp.updateProjectionMatrix();

      set({ camera: persp });
      if (controls) {
        controls.object = persp;
        controls.update();
      }
    }
    invalidate();
  }, [isParallel, size, set, invalidate, controlsRef, perspRef, orthoRef]);

  // Keep camera aspect ratios updated on viewport resize without moving position
  useEffect(() => {
    const persp = perspRef.current;
    const ortho = orthoRef.current;
    const aspect = size.width / Math.max(1, size.height);
    if (persp) {
      persp.aspect = aspect;
      persp.updateProjectionMatrix();
    }
    if (ortho) {
      const visibleH = ortho.top - ortho.bottom;
      ortho.left = (-visibleH * aspect) / 2;
      ortho.right = (visibleH * aspect) / 2;
      ortho.updateProjectionMatrix();
    }
  }, [size, perspRef, orthoRef]);

  // OrbitControls listener: when user starts rotating, automatically revert to Perspective
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const handleStart = () => {
      // OrbitControls states: 0 = ROTATE, 3 = TOUCH_ROTATE
      const ctrlState = (controls as unknown as { state?: number }).state;
      if ((ctrlState === 0 || ctrlState === 3) && isParallel) {
        setIsParallel(false);
      }
    };

    controls.addEventListener("start", handleStart);
    return () => {
      controls.removeEventListener("start", handleStart);
    };
  }, [controlsRef, isParallel, setIsParallel]);

  return null;
}

export default function ModelerCanvas({
  params,
  groupRef,
  onModelReady,
  showGrid,
  isParallel,
  setIsParallel,
  onSelectUnit,
  onSelectUnits,
  onAddAdjacentUnit,
  onSelectWardrobeUnit,
  onAddAdjacentWardrobeUnit,
  onAddDivision,
  onSelectDivision: propOnSelectDivision,
  onSelectDivisions: propOnSelectDivisions,
  onRemoveDivision,
}: ModelerCanvasProps) {
  const onSelectDivision = propOnSelectDivision || params.onSelectDivision;
  const onSelectDivisions = propOnSelectDivisions || params.onSelectDivisions;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const perspRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoRef = useRef<THREE.OrthographicCamera | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isBoxSelectTool = params.activeTool === "box-select";
  const assemblyDimensions = useMemo(() => getFurnitureAssemblyDimensions(params), [params]);
  const marqueeOverlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isSelectingRef = useRef(false);
  const boxSelectorRef = useRef<((rect: [number, number, number, number]) => void) | null>(null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isBoxSelectTool || e.button !== 0) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    isSelectingRef.current = true;
    dragStartRef.current = { x, y };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (marqueeOverlayRef.current) {
      marqueeOverlayRef.current.style.display = "block";
      marqueeOverlayRef.current.style.left = `${x}px`;
      marqueeOverlayRef.current.style.top = `${y}px`;
      marqueeOverlayRef.current.style.width = "0px";
      marqueeOverlayRef.current.style.height = "0px";
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSelectingRef.current || !dragStartRef.current) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const minX = Math.min(dragStartRef.current.x, x);
    const maxX = Math.max(dragStartRef.current.x, x);
    const minY = Math.min(dragStartRef.current.y, y);
    const maxY = Math.max(dragStartRef.current.y, y);

    if (marqueeOverlayRef.current) {
      marqueeOverlayRef.current.style.left = `${minX}px`;
      marqueeOverlayRef.current.style.top = `${minY}px`;
      marqueeOverlayRef.current.style.width = `${maxX - minX}px`;
      marqueeOverlayRef.current.style.height = `${maxY - minY}px`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isSelectingRef.current) return;
    isSelectingRef.current = false;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (marqueeOverlayRef.current) {
      marqueeOverlayRef.current.style.display = "none";
    }

    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const minX = Math.min(start.x, currentX);
    const maxX = Math.max(start.x, currentX);
    const minY = Math.min(start.y, currentY);
    const maxY = Math.max(start.y, currentY);

    if (maxX - minX > 8 && maxY - minY > 8) {
      boxSelectorRef.current?.([minX, minY, maxX, maxY]);
    }
  };

  // When a view is selected on the ViewCube (face or isometric corner),
  // switch projection to Parallel (Orthographic)
  const handleSelectView = () => {
    setIsParallel(true);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: isBoxSelectTool ? "crosshair" : "default",
        userSelect: "none",
      }}
    >
      <Canvas
        shadows
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        style={{ width: "100%", height: "100%", background: "#0d0d12" }}
      >
        {/* Both cameras are retained and synchronized to prevent any transform loss */}
        <PerspectiveCamera
          ref={perspRef}
          makeDefault={!isParallel}
          position={[2.4, 1.8, 2.4]}
          fov={45}
          near={0.1}
          far={100}
        />
        <OrthographicCamera
          ref={orthoRef}
          makeDefault={isParallel}
          position={[2.4, 1.8, 2.4]}
          near={-50}
          far={100}
        />

        <Suspense fallback={null}>
          {/* Studio Lighting */}
          <ambientLight intensity={0.65} />
          <directionalLight
            position={[5, 8, 5]}
            intensity={1.4}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={20}
            shadow-bias={-0.0001}
          />
          <directionalLight
            position={[-5, 3, -4]}
            intensity={0.4}
            color="#93c5fd"
          />

          {/* Zero-latency procedural studio environment for realistic PBR reflections, chrome & mirror */}
          <Environment resolution={256}>
            <group rotation={[-Math.PI / 4, -0.6, 0]}>
              {/* Overhead softbox */}
              <Lightformer form="rect" intensity={1.8} position={[0, 5, -2]} scale={[10, 5, 1]} target={[0, 0, 0]} />
              {/* Warm key light */}
              <Lightformer form="rect" intensity={2.2} color="#fff7ed" position={[5, 2, 4]} scale={[4, 6, 1]} target={[0, 0, 0]} />
              {/* Cool rim light */}
              <Lightformer form="rect" intensity={1.4} color="#e0f2fe" position={[-5, 2, -3]} scale={[6, 4, 1]} target={[0, 0, 0]} />
            </group>
          </Environment>

          {/* 
            FURNITURE TOUCHING GRID AT Y = 0 BY DEFAULT:
            All furniture geometries start exactly at y = 0 up to y = height.
            Plinth / legs touch the ground grid flush.
          */}
          <group position={[0, 0, 0]}>
            <FurnitureMesh
              params={params}
              groupRef={groupRef}
              onModelReady={onModelReady}
              onSelectUnit={onSelectUnit}
              onSelectUnits={onSelectUnits}
              onAddAdjacentUnit={onAddAdjacentUnit}
              onSelectWardrobeUnit={onSelectWardrobeUnit}
              onAddAdjacentWardrobeUnit={onAddAdjacentWardrobeUnit}
              onAddDivision={onAddDivision}
              onSelectDivision={onSelectDivision}
              onSelectDivisions={onSelectDivisions}
              onRemoveDivision={onRemoveDivision}
            />
          </group>

          {/* Architectural Floor Grid at Y = 0 */}
          {showGrid && (
            <Grid
              position={[0, -0.0002, 0]}
              args={[12, 12]}
              cellSize={0.1}
              cellThickness={0.7}
              cellColor="#262a35"
              sectionSize={1.0}
              sectionThickness={1.2}
              sectionColor="#475569"
              fadeDistance={8}
              fadeStrength={1.2}
            />
          )}

          {/* Viewport Orbit Controls (Disabled when dragging Box Selection) */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enabled={!isBoxSelectTool}
            target={DEFAULT_TARGET}
            minDistance={0.4}
            maxDistance={8}
            maxPolarAngle={Math.PI / 2 + 0.05} // Prevent camera going under floor
            dampingFactor={0.08}
          />

          {/* Camera Projection Synchronization Controller */}
          <CameraSyncController
            isParallel={isParallel}
            setIsParallel={setIsParallel}
            controlsRef={controlsRef}
            perspRef={perspRef}
            orthoRef={orthoRef}
          />

          {/* High-Performance Marquee Box Selection Handler */}
          <BoxSelectHandler
            groupRef={groupRef}
            onSelectUnits={onSelectUnits}
            onSelectDivision={onSelectDivision}
            onSelectDivisions={onSelectDivisions}
            boxSelectorRef={boxSelectorRef}
          />

          {/* 
            INTERACTIVE CAD VIEWCUBE:
            - Click any face for Orthographic (Top, Front, Right, etc.) in Parallel projection
            - Click any vertex/corner for Isometric view in Parallel projection
            - Rotates back to Perspective when dragging in 3D canvas
          */}
          <GizmoHelper alignment="bottom-right" margin={[85, 85]}>
            <CadanceViewCube onSelectView={handleSelectView} />
          </GizmoHelper>
        </Suspense>
      </Canvas>

      {params.showDimensions && (
        <div
          aria-label="Furniture dimensions"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 20,
            display: "flex",
            gap: 6,
            pointerEvents: "none",
          }}
        >
          {[
            ["W", assemblyDimensions.width],
            ["H", assemblyDimensions.height],
            ["D", assemblyDimensions.depth],
          ].map(([label, value]) => (
            <span
              key={label}
              style={{
                padding: "4px 7px",
                borderRadius: 5,
                border: "1px solid rgba(59, 130, 246, 0.55)",
                background: "rgba(13, 17, 23, 0.92)",
                color: "#bfdbfe",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 10,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {label}: {Math.round(Number(value))} mm
            </span>
          ))}
        </div>
      )}

      {/* 2D Marquee Selection Overlay Box (GPU accelerated, DOM-ref updated) */}
      <div
        ref={marqueeOverlayRef}
        style={{
          display: "none",
          position: "absolute",
          border: "1.5px dashed #38bdf8",
          backgroundColor: "rgba(56, 189, 248, 0.16)",
          boxShadow: "0 0 15px rgba(56, 189, 248, 0.35)",
          pointerEvents: "none",
          zIndex: 40,
          borderRadius: "3px",
        }}
      />
    </div>
  );
}
