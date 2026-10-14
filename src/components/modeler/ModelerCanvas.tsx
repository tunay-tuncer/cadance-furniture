"use client";

import React, { Suspense, useRef, useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  PerspectiveCamera,
  OrthographicCamera,
} from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import FurnitureMesh, { FurnitureParams } from "./FurnitureMesh";
import CadanceViewCube from "./CadanceViewCube";

interface ModelerCanvasProps {
  params: FurnitureParams;
  groupRef: React.RefObject<THREE.Group | null>;
  showGrid: boolean;
  isParallel: boolean;
  setIsParallel: (val: boolean) => void;
  onSelectUnit?: (id: string) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
}

// Default orbit pivot point at furniture vertical midpoint (~450mm from floor)
const DEFAULT_TARGET: [number, number, number] = [0, 0.45, 0];

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
  showGrid,
  isParallel,
  setIsParallel,
  onSelectUnit,
  onAddAdjacentUnit,
  onSelectWardrobeUnit,
  onAddAdjacentWardrobeUnit,
}: ModelerCanvasProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const perspRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthoRef = useRef<THREE.OrthographicCamera | null>(null);

  // When a view is selected on the ViewCube (face or isometric corner),
  // switch projection to Parallel (Orthographic)
  const handleSelectView = () => {
    setIsParallel(true);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
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

          {/* 
            FURNITURE TOUCHING GRID AT Y = 0 BY DEFAULT:
            All furniture geometries start exactly at y = 0 up to y = height.
            Plinth / legs touch the ground grid flush.
          */}
          <group position={[0, 0, 0]}>
            <FurnitureMesh
              params={params}
              groupRef={groupRef}
              onSelectUnit={onSelectUnit}
              onAddAdjacentUnit={onAddAdjacentUnit}
              onSelectWardrobeUnit={onSelectWardrobeUnit}
              onAddAdjacentWardrobeUnit={onAddAdjacentWardrobeUnit}
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
              sectionColor="#bd3737ff"
              fadeDistance={8}
              fadeStrength={1.2}
            />
          )}

          {/* Viewport Orbit Controls */}
          <OrbitControls
            ref={controlsRef}
            makeDefault
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
    </div>
  );
}
