"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Edges, Html } from "@react-three/drei";

export interface KitchenCabinetUnit {
  id: string;
  name: string;
  type: "base" | "wall"; // base floor unit vs wall/upper suspended unit
  width: number;  // mm (e.g. 600)
  height: number; // mm (e.g. 720)
  depth: number;  // mm (e.g. 600 for base, 350 for wall)
  doorType: "none" | "singleLeft" | "singleRight" | "double" | "flipUp";
  drawerCount: number; // 0, 1, 2, 3, 4
  drawerHeightsMode?: "equal" | "standard" | "custom";
  drawerHeights?: number[]; // mm for each drawer, e.g. [140, 280, 280]
  internalShelves: number;
  handleType: "bar" | "knob" | "edgePull" | "cutout" | "hidden";
  handleFinish: "black" | "steel" | "brass";
}

export interface WardrobeUnit {
  id: string;
  name: string;
  type: "main" | "top"; // main wardrobe bay vs top overhead unit
  width: number; // mm
  height: number; // mm
  depth: number; // mm

  // Doors & Mirrors
  doorType: "sliding" | "hingedSingle" | "hingedDouble" | "open";
  doorOpenPercent?: number; // 0 to 100%
  hasMirror?: boolean;
  mirrorType?: "full" | "center";

  // Drawers
  hasDrawers?: boolean;
  drawerType?: "externalBottom" | "internal";
  drawerCount?: number;
  drawerHeight?: number;
  drawerOpenPercent?: number;

  // Interior organization
  hasClothesHangerRail?: boolean;
  internalShelves: number;
  hasInternalDivider?: boolean;

  // Handles & Hardware
  handleType?: "bar" | "knob" | "edgePull" | "cutout" | "hidden";
  handleFinish?: "black" | "steel" | "brass";
}

export interface FurnitureParams {
  name: string;
  category: "Table" | "Shelf" | "Cabinet" | "Wardrobe" | "Desk" | "Custom";
  width: number;  // mm (e.g. 1200)
  height: number; // mm (e.g. 750)
  depth: number;  // mm (e.g. 600)
  materialType: "oak" | "walnut" | "plywood" | "blackSteel" | "whiteStudio";
  showDimensions?: boolean;
  wireframe?: boolean;

  // Board & Construction Specs
  boardThickness?: number; // mm (e.g. 18, 25, 30, 40)
  hasBackPanel?: boolean;  // solid back panel or open back
  topOverhang?: number;    // mm (tabletop overhang beyond apron, can be 0)

  // Base / Plinth / Leg Configuration
  baseType?: "plinth" | "legs" | "floating" | "trestle";
  plinthHeight?: number;   // mm (e.g. 80mm)
  plinthRecess?: number;   // mm (e.g. 40mm)
  legType?: "square" | "tapered" | "round" | "trestle";
  legThickness?: number;   // mm (e.g. 45mm)
  legInset?: number;       // mm (offset from edges)

  // Office Desk Vertical Pedestal Option
  deskDrawerType?: "apron" | "pedestal"; // horizontal under top vs vertical pedestal tower
  pedestalSide?: "left" | "right";
  pedestalWidth?: number; // mm (e.g. 400)
  pedestalDrawerCount?: number; // 2, 3, 4

  // Drawers
  hasDrawers?: boolean;
  drawerCount?: number;    // 0 to 4
  drawerHeight?: number;   // mm
  drawerOpenPercent?: number; // 0 to 100% open in 3D

  // Doors & Lids
  doorType?: "none" | "singleLeft" | "singleRight" | "double" | "flipUp";
  doorOpenPercent?: number; // 0 to 100% (or 0° to 90°)
  doorStyle?: "slab" | "shaker" | "glass";

  // Handles & Hardware
  handleType?: "bar" | "knob" | "edgePull" | "cutout" | "hidden";
  handleFinish?: "black" | "steel" | "brass";

  // Internal Divisions & Shelving
  internalColumns?: number; // 1 to 5 vertical dividers
  internalShelves?: number; // 1 to 6 horizontal shelves
  shelfLayout?: "grid" | "staggered";

  // Kitchen Cabinet Assembly Multi-Unit System
  kitchenUnits?: KitchenCabinetUnit[];
  selectedUnitId?: string;
  onSelectUnit?: (id: string) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;

  // Wardrobe Multi-Section Modular System
  wardrobeUnits?: WardrobeUnit[];
  selectedWardrobeUnitId?: string;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
}

interface FurnitureMeshProps {
  params: FurnitureParams;
  groupRef: React.RefObject<THREE.Group | null>;
  onSelectUnit?: (id: string) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
}

const MATERIAL_PRESETS = {
  oak: {
    color: "#b8905e",
    roughness: 0.6,
    metalness: 0.05,
    name: "Natural Oak",
  },
  walnut: {
    color: "#4a3525",
    roughness: 0.5,
    metalness: 0.05,
    name: "American Walnut",
  },
  plywood: {
    color: "#dec8a2",
    roughness: 0.7,
    metalness: 0.02,
    name: "Birch Plywood",
  },
  blackSteel: {
    color: "#1c1f26",
    roughness: 0.35,
    metalness: 0.45,
    name: "Matte Steel",
  },
  whiteStudio: {
    color: "#e6e8ec",
    roughness: 0.45,
    metalness: 0.05,
    name: "Matte White",
  },
};

const HANDLE_FINISHES = {
  black: { color: "#18181b", metalness: 0.85, roughness: 0.25 },
  steel: { color: "#cbd5e1", metalness: 0.95, roughness: 0.2 },
  brass: { color: "#eab308", metalness: 0.8, roughness: 0.3 },
};

export default function FurnitureMesh({
  params,
  groupRef,
  onSelectUnit,
  onAddAdjacentUnit,
  onSelectWardrobeUnit,
  onAddAdjacentWardrobeUnit,
}: FurnitureMeshProps) {
  const {
    width,
    height,
    depth,
    category,
    materialType,
    showDimensions,
    wireframe,
    boardThickness = category === "Table" || category === "Desk" ? 30 : 18,
    topOverhang = 25,
    hasBackPanel = category === "Cabinet",
    baseType = category === "Cabinet" ? "plinth" : "legs",
    plinthHeight = 80,
    plinthRecess = 40,
    legType = "square",
    legThickness = 50,
    legInset = 25,
    deskDrawerType = "apron",
    pedestalSide = "right",
    pedestalWidth = 400,
    pedestalDrawerCount = 3,
    hasDrawers = category === "Desk",
    drawerCount = 1,
    drawerOpenPercent = 0,
        doorOpenPercent = 0,
    handleType = "bar",
    handleFinish = "black",
    internalColumns = 1,
    internalShelves = category === "Shelf" ? 3 : 2,
    shelfLayout = "grid",
    kitchenUnits,
    selectedUnitId,
    wardrobeUnits,
    selectedWardrobeUnitId,
  } = params;

  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [hoveredWardrobeUnit, setHoveredWardrobeUnit] = useState<string | null>(null);

  // Convert mm to meters for Three.js units (1 unit = 1 meter = 1000mm)
  const w = width / 1000;
  const h = height / 1000;
  const d = depth / 1000;
  const t = Math.max(0.012, boardThickness / 1000);

  const matConfig = MATERIAL_PRESETS[materialType] || MATERIAL_PRESETS.oak;
  const handleConfig = HANDLE_FINISHES[handleFinish] || HANDLE_FINISHES.black;

  const mainMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: matConfig.color,
        roughness: matConfig.roughness,
        metalness: matConfig.metalness,
        wireframe: Boolean(wireframe),
      }),
    [matConfig, wireframe]
  );

  const handleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: handleConfig.color,
        roughness: handleConfig.roughness,
        metalness: handleConfig.metalness,
      }),
    [handleConfig]
  );

  const edgeColor = wireframe ? "#2972f5" : "#1a1c23";

  const mirrorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8e2ec",
        roughness: 0.04,
        metalness: 0.96,
        wireframe: Boolean(wireframe),
      }),
    [wireframe]
  );

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        roughness: 0.15,
        metalness: 0.92,
        wireframe: Boolean(wireframe),
      }),
    [wireframe]
  );

  // Reusable Hardware Handle Renderer
  const renderHandle = (
    pos: [number, number, number],
    isVertical: boolean = true,
    doorOffset: number = 0,
    hType: FurnitureParams["handleType"] = handleType,
    hFinish: FurnitureParams["handleFinish"] = handleFinish
  ) => {
    if (hType === "hidden") return null;

    const specificHandleMat =
      hFinish === handleFinish
        ? handleMaterial
        : new THREE.MeshStandardMaterial({
            color: HANDLE_FINISHES[hFinish]?.color || "#18181b",
            metalness: 0.9,
            roughness: 0.25,
          });

    if (hType === "knob") {
      return (
        <group position={[pos[0] + doorOffset, pos[1], pos[2]]}>
          <mesh position={[0, 0, 0.012]} material={specificHandleMat} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.02, 16]} />
          </mesh>
        </group>
      );
    }

    if (hType === "edgePull") {
      return (
        <mesh
          position={[pos[0] + doorOffset, pos[1], pos[2] + 0.006]}
          material={specificHandleMat}
          castShadow
        >
          <boxGeometry args={[0.08, 0.008, 0.018]} />
        </mesh>
      );
    }

    if (hType === "cutout") {
      return (
        <mesh position={[pos[0] + doorOffset, pos[1], pos[2] + 0.002]}>
          <boxGeometry args={[0.09, 0.024, 0.006]} />
          <meshBasicMaterial color="#0e1017" />
        </mesh>
      );
    }

    // Default: Bar Pull
    const barLen = 0.12;
    const barThick = 0.008;
    return (
      <group position={[pos[0] + doorOffset, pos[1], pos[2] + 0.018]}>
        <mesh material={specificHandleMat} castShadow>
          <boxGeometry
            args={
              isVertical
                ? [barThick, barLen, barThick]
                : [barLen, barThick, barThick]
            }
          />
        </mesh>
        <mesh
          position={
            isVertical ? [0, barLen * 0.35, -0.01] : [barLen * 0.35, 0, -0.01]
          }
          material={specificHandleMat}
        >
          <boxGeometry args={[barThick, barThick, 0.018]} />
        </mesh>
        <mesh
          position={
            isVertical
              ? [0, -barLen * 0.35, -0.01]
              : [-barLen * 0.35, 0, -0.01]
          }
          material={specificHandleMat}
        >
          <boxGeometry args={[barThick, barThick, 0.018]} />
        </mesh>
      </group>
    );
  };

  // 1. TABLE / DESK RENDERER
  const renderTable = () => {
    // FIX 1: Allow topOverhang to be 0! Using ?? instead of ||
    const oHang = (topOverhang ?? 25) / 1000;
    const legThick = (legThickness / 1000) || 0.05;
    const legIns = (legInset / 1000) || 0.025;
    const legH = Math.max(0.1, h - t);

    const cornerX = w / 2 - oHang - legIns - legThick / 2;
    const cornerZ = d / 2 - oHang - legIns - legThick / 2;

    const drawerH = Math.min(0.14, legH * 0.32);
    const drawerD = d * 0.75;
    const slideDist = ((drawerOpenPercent || 0) / 100) * (drawerD * 0.7);

    // Office Desk Pedestal Calculations
    const isPedestal = (category === "Desk" || category === "Table") && deskDrawerType === "pedestal" && hasDrawers;
    const pedW = (pedestalWidth ?? 400) / 1000;
    const pedSide = pedestalSide ?? "right";
    const pedCenterX = pedSide === "left" ? -w / 2 + oHang + pedW / 2 : w / 2 - oHang - pedW / 2;
    const pedH = legH;

    return (
      <group>
        {/* Tabletop resting flush at y = h - t/2 */}
        <mesh
          position={[0, h - t / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w, t, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>

        {/* Office Vertical Pedestal Tower (if enabled) */}
        {isPedestal ? (
          <group>
            {/* Pedestal Carcase Box on chosen side */}
            <group position={[pedCenterX, pedH / 2, 0]}>
              {/* Outer Left Side */}
              <mesh position={[-pedW / 2 + t / 2, 0, 0]} material={mainMaterial} castShadow>
                <boxGeometry args={[t, pedH, d * 0.85]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              {/* Outer Right Side */}
              <mesh position={[pedW / 2 - t / 2, 0, 0]} material={mainMaterial} castShadow>
                <boxGeometry args={[t, pedH, d * 0.85]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              {/* Bottom Base */}
              <mesh position={[0, -pedH / 2 + t / 2, 0]} material={mainMaterial} castShadow>
                <boxGeometry args={[pedW - t * 2, t, d * 0.85]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              {/* Back Board */}
              <mesh position={[0, 0, -d * 0.85 / 2 + t / 2]} material={mainMaterial}>
                <boxGeometry args={[pedW - t * 2, pedH, t]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>

              {/* Vertically Stacked Pedestal Drawers */}
              {Array.from({ length: pedestalDrawerCount || 3 }).map((_, pdi) => {
                const count = pedestalDrawerCount || 3;
                const dBoxH = (pedH - t) / count - 0.008;
                const dBoxY = -pedH / 2 + t + dBoxH / 2 + pdi * (dBoxH + 0.008);

                return (
                  <group
                    key={`pedDrawer-${pdi}`}
                    position={[0, dBoxY, d * 0.85 / 2 + slideDist]}
                  >
                    {/* Front */}
                    <mesh castShadow receiveShadow material={mainMaterial}>
                      <boxGeometry args={[pedW - t * 2 - 0.006, dBoxH, 0.018]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {/* Drawer Box */}
                    <mesh
                      position={[0, -dBoxH / 2 + 0.005, -drawerD * 0.45]}
                      material={mainMaterial}
                    >
                      <boxGeometry args={[pedW - t * 2 - 0.03, 0.01, drawerD * 0.9]} />
                    </mesh>
                    {renderHandle([0, 0, 0.01], false)}
                  </group>
                );
              })}
            </group>

            {/* Opposite Side Table Legs (Leaving open seating legroom!) */}
            {[-cornerZ, cornerZ].map((lz, lzi) => {
              const oppX = pedSide === "left" ? cornerX : -cornerX;
              return (
                <mesh
                  key={`oppLeg-${lzi}`}
                  position={[oppX, legH / 2, lz]}
                  castShadow
                  receiveShadow
                  material={mainMaterial}
                >
                  <boxGeometry args={[legThick, legH, legThick]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              );
            })}
          </group>
        ) : legType === "trestle" ? (
          // FIX 2: Trestle stretcher beam touches both vertical parts with NO gap
          (() => {
            const trestleX1 = -w / 2 + oHang + 0.06;
            const trestleX2 = w / 2 - oHang - 0.06;
            const span = trestleX2 - trestleX1;

            return (
              <group>
                {[trestleX1, trestleX2].map((tx, ti) => (
                  <group key={`trestle-${ti}`}>
                    {/* Bottom Runner touching floor at y = 0 */}
                    <mesh
                      position={[tx, 0.025, 0]}
                      castShadow
                      receiveShadow
                      material={mainMaterial}
                    >
                      <boxGeometry args={[0.06, 0.05, d * 0.78]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {/* Top Mounting Plate */}
                    <mesh
                      position={[tx, h - t - 0.02, 0]}
                      castShadow
                      material={mainMaterial}
                    >
                      <boxGeometry args={[0.06, 0.04, d * 0.72]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {/* 2 Vertical Struts */}
                    {[-d * 0.28, d * 0.28].map((tz, tzi) => (
                      <mesh
                        key={`strut-${ti}-${tzi}`}
                        position={[tx, legH / 2, tz]}
                        castShadow
                        receiveShadow
                        material={mainMaterial}
                      >
                        <boxGeometry args={[0.05, legH - 0.07, 0.05]} />
                        <Edges threshold={15} color={edgeColor} />
                      </mesh>
                    ))}
                  </group>
                ))}
                {/* Center Stretcher Beam touching both trestles seamlessly */}
                <mesh
                  position={[0, 0.12, 0]}
                  castShadow
                  receiveShadow
                  material={mainMaterial}
                >
                  <boxGeometry args={[span, 0.05, 0.04]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              </group>
            );
          })()
        ) : (
          // 4 Corner Legs
          [-cornerX, cornerX].map((lx, lxi) =>
            [-cornerZ, cornerZ].map((lz, lzi) => (
              <mesh
                key={`leg-${lxi}-${lzi}`}
                position={[lx, legH / 2, lz]}
                castShadow
                receiveShadow
                material={mainMaterial}
              >
                {legType === "round" ? (
                  <cylinderGeometry
                    args={[legThick / 2, legThick / 2, legH, 16]}
                  />
                ) : legType === "tapered" ? (
                  <cylinderGeometry
                    args={[legThick * 0.45, legThick * 0.22, legH, 4]}
                  />
                ) : (
                  <boxGeometry args={[legThick, legH, legThick]} />
                )}
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            ))
          )
        )}

        {/* Apron & Horizontal Drawers (when not pedestal) */}
        {!isPedestal && hasDrawers && drawerCount > 0 ? (
          <group>
            {/* Side Apron Rails */}
            {[-cornerX, cornerX].map((ax, axi) => (
              <mesh
                key={`sideApron-${axi}`}
                position={[ax > 0 ? ax - legThick / 2 : ax + legThick / 2, h - t - drawerH / 2, 0]}
                material={mainMaterial}
              >
                <boxGeometry args={[0.02, drawerH, cornerZ * 2]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            ))}
            {/* Back Apron Rail */}
            <mesh
              position={[0, h - t - drawerH / 2, -cornerZ]}
              material={mainMaterial}
            >
              <boxGeometry args={[cornerX * 2, drawerH, 0.02]} />
              <Edges threshold={15} color={edgeColor} />
            </mesh>

            {/* Horizontal Drawers across front */}
            {Array.from({ length: Math.min(3, drawerCount) }).map((_, di) => {
              const totalDrawers = Math.min(3, drawerCount);
              const drawerSpan = (cornerX * 2) - 0.02;
              const dWidth = drawerSpan / totalDrawers - 0.015;
              const dCenterX =
                -cornerX + 0.01 + dWidth / 2 + di * (dWidth + 0.015);
              const drawerY = h - t - drawerH / 2;

              return (
                <group
                  key={`drawer-${di}`}
                  position={[dCenterX, drawerY, cornerZ + slideDist]}
                >
                  <mesh
                    position={[0, 0, 0]}
                    castShadow
                    receiveShadow
                    material={mainMaterial}
                  >
                    <boxGeometry args={[dWidth, drawerH - 0.01, 0.018]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                  <mesh
                    position={[0, -drawerH / 2 + 0.006, -drawerD / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[dWidth - 0.03, 0.01, drawerD]} />
                  </mesh>
                  <mesh
                    position={[-dWidth / 2 + 0.012, 0, -drawerD / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[0.012, drawerH * 0.75, drawerD]} />
                  </mesh>
                  <mesh
                    position={[dWidth / 2 - 0.012, 0, -drawerD / 2]}
                    material={mainMaterial}
                  >
                    <boxGeometry args={[0.012, drawerH * 0.75, drawerD]} />
                  </mesh>
                  {renderHandle([0, 0, 0.01], false)}
                </group>
              );
            })}
          </group>
        ) : (
          !isPedestal && legType !== "trestle" && (
            <group>
              <mesh
                position={[0, h - t - 0.035, cornerZ]}
                material={mainMaterial}
              >
                <boxGeometry args={[cornerX * 2, 0.06, 0.02]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              <mesh
                position={[0, h - t - 0.035, -cornerZ]}
                material={mainMaterial}
              >
                <boxGeometry args={[cornerX * 2, 0.06, 0.02]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              <mesh
                position={[cornerX, h - t - 0.035, 0]}
                material={mainMaterial}
              >
                <boxGeometry args={[0.02, 0.06, cornerZ * 2]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
              <mesh
                position={[-cornerX, h - t - 0.035, 0]}
                material={mainMaterial}
              >
                <boxGeometry args={[0.02, 0.06, cornerZ * 2]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            </group>
          )
        )}
      </group>
    );
  };

  // 2. MODULAR KITCHEN CABINET SYSTEM RENDERER
  const renderKitchenCabinetSystem = () => {
    // Default units if none defined
    const units: KitchenCabinetUnit[] = kitchenUnits && kitchenUnits.length > 0 ? kitchenUnits : [
      {
        id: "base-1",
        name: "Base Cabinet 1",
        type: "base",
        width: 600,
        height: 720,
        depth: 600,
        doorType: "singleLeft",
        drawerCount: 0,
        internalShelves: 2,
        handleType: "bar",
        handleFinish: "black",
      },
      {
        id: "base-2",
        name: "Base Cabinet 2",
        type: "base",
        width: 800,
        height: 720,
        depth: 600,
        doorType: "double",
        drawerCount: 0,
        internalShelves: 2,
        handleType: "bar",
        handleFinish: "black",
      },
      {
        id: "wall-1",
        name: "Upper Wall Cabinet 1",
        type: "wall",
        width: 600,
        height: 720,
        depth: 350,
        doorType: "singleLeft",
        drawerCount: 0,
        internalShelves: 2,
        handleType: "bar",
        handleFinish: "black",
      },
      {
        id: "wall-2",
        name: "Upper Wall Cabinet 2",
        type: "wall",
        width: 800,
        height: 720,
        depth: 350,
        doorType: "double",
        drawerCount: 0,
        internalShelves: 2,
        handleType: "bar",
        handleFinish: "black",
      },
    ];

    const baseUnits = units.filter((u) => u.type === "base");
    const wallUnits = units.filter((u) => u.type === "wall");

    const totalBaseW = baseUnits.reduce((acc, u) => acc + u.width / 1000, 0);
    const totalWallW = wallUnits.reduce((acc, u) => acc + u.width / 1000, 0);

    const baseStartLeftX = -totalBaseW / 2;
    const wallStartLeftX = -totalWallW / 2;

    const plinthH = baseType === "floating" ? 0 : plinthHeight / 1000;
    const plinthRec = plinthRecess / 1000;

    const angleRad = ((doorOpenPercent || 0) / 100) * (Math.PI / 2);

    return (
      <group>
        {/* Continuous Plinth across all base cabinets touching floor at y = 0 */}
        {baseUnits.length > 0 && baseType === "plinth" && plinthH > 0 && (
          <group>
            {/* Front continuous plinth board */}
            <mesh
              position={[0, plinthH / 2, 0.3 - plinthRec]}
              castShadow
              material={mainMaterial}
            >
              <boxGeometry args={[totalBaseW - 0.02, plinthH, 0.018]} />
              <Edges threshold={15} color={edgeColor} />
            </mesh>
            {/* Side returns */}
            {[-totalBaseW / 2 + 0.01, totalBaseW / 2 - 0.01].map((px, pi) => (
              <mesh
                key={`plinthSide-${pi}`}
                position={[px, plinthH / 2, 0.3 - plinthRec - (0.6 - plinthRec) / 2]}
                material={mainMaterial}
              >
                <boxGeometry args={[0.018, plinthH, 0.6 - plinthRec - 0.02]} />
              </mesh>
            ))}
          </group>
        )}

        {/* Render Base Cabinets */}
        {(() => {
          let currX = baseStartLeftX;
          return baseUnits.map((unit) => {
            const uW = unit.width / 1000;
            const uH = unit.height / 1000;
            const uD = unit.depth / 1000;
            const centerX = currX + uW / 2;
            currX += uW;

            const isSelected = selectedUnitId === unit.id;
            const isHovered = hoveredUnit === unit.id;
            const innerH = uH - t * 2;
            const innerD = uD - 0.02;

            // Uneven Drawer Heights Calculation
            let drawerHeightsArr: number[] = [];
            if (unit.drawerCount > 0) {
              if (unit.drawerHeights && unit.drawerHeights.length === unit.drawerCount) {
                drawerHeightsArr = unit.drawerHeights.map((dh) => dh / 1000);
              } else if (unit.drawerHeightsMode === "standard" && unit.drawerCount === 3) {
                drawerHeightsArr = [0.14, (innerH - 0.14) / 2, (innerH - 0.14) / 2];
              } else {
                drawerHeightsArr = Array(unit.drawerCount).fill(innerH / unit.drawerCount);
              }
            }

            return (
              <group
                key={unit.id}
                position={[centerX, plinthH, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUnit?.(unit.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredUnit(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  if (hoveredUnit === unit.id) setHoveredUnit(null);
                }}
              >
                {/* Active Selection Outline Highlight */}
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.01, uH + 0.01, uD + 0.01]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} />
                  </mesh>
                )}

                {/* Carcase Panels */}
                {/* Top */}
                <mesh position={[0, uH - t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Bottom */}
                <mesh position={[0, t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Left */}
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Right */}
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                {/* Back */}
                {hasBackPanel && (
                  <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={mainMaterial}>
                    <boxGeometry args={[uW - t * 2, uH - t * 2, 0.01]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                )}

                {/* Internal Shelves */}
                {unit.drawerCount === 0 &&
                  Array.from({ length: unit.internalShelves || 2 }).map((_, si) => {
                    const shelfSpacing = innerH / ((unit.internalShelves || 2) + 1);
                    const shelfY = t + (si + 1) * shelfSpacing;
                    return (
                      <mesh key={`shelf-${si}`} position={[0, shelfY, 0]} material={mainMaterial}>
                        <boxGeometry args={[uW - t * 2, t, innerD * 0.95]} />
                        <Edges threshold={15} color={edgeColor} />
                      </mesh>
                    );
                  })}

                {/* Uneven Drawers */}
                {unit.drawerCount > 0 &&
                  (() => {
                    let accY = t;
                    const slideDist = ((drawerOpenPercent || 0) / 100) * (uD * 0.6);

                    return drawerHeightsArr.map((dh, dxi) => {
                      const centerY = accY + dh / 2;
                      accY += dh;

                      return (
                        <group
                          key={`unevenDrawer-${dxi}`}
                          position={[0, centerY, uD / 2 + slideDist]}
                        >
                          <mesh material={mainMaterial} castShadow>
                            <boxGeometry args={[uW - 0.008, dh - 0.006, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          {/* Box */}
                          <mesh
                            position={[0, -dh / 2 + 0.005, -innerD * 0.4]}
                            material={mainMaterial}
                          >
                            <boxGeometry args={[uW - t * 2 - 0.02, 0.01, innerD * 0.8]} />
                          </mesh>
                          {renderHandle([0, 0, 0.01], false, 0, unit.handleType, unit.handleFinish)}
                        </group>
                      );
                    });
                  })()}

                {/* Doors */}
                {unit.drawerCount === 0 && unit.doorType !== "none" && (
                  <group>
                    {unit.doorType === "singleLeft" ? (
                      <group position={[-uW / 2, uH / 2, uD / 2]} rotation={[0, -angleRad, 0]}>
                        <mesh position={[uW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                          <boxGeometry args={[uW - 0.004, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([uW - 0.04, 0, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : unit.doorType === "singleRight" ? (
                      <group position={[uW / 2, uH / 2, uD / 2]} rotation={[0, angleRad, 0]}>
                        <mesh position={[-uW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                          <boxGeometry args={[uW - 0.004, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([-uW + 0.04, 0, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : unit.doorType === "flipUp" ? (
                      <group position={[0, uH - t, uD / 2]} rotation={[-angleRad, 0, 0]}>
                        <mesh position={[0, -innerH / 2, 0.009]} material={mainMaterial} castShadow>
                          <boxGeometry args={[uW - 0.004, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([0, -innerH + 0.04, 0.02], false, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : (
                      // Double Doors
                      <group>
                        <group position={[-uW / 2, uH / 2, uD / 2]} rotation={[0, -angleRad, 0]}>
                          <mesh position={[uW / 4, 0, 0.009]} material={mainMaterial} castShadow>
                            <boxGeometry args={[uW / 2 - 0.003, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          {renderHandle([uW / 2 - 0.035, 0, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                        </group>
                        <group position={[uW / 2, uH / 2, uD / 2]} rotation={[0, angleRad, 0]}>
                          <mesh position={[-uW / 4, 0, 0.009]} material={mainMaterial} castShadow>
                            <boxGeometry args={[uW / 2 - 0.003, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          {renderHandle([-uW / 2 + 0.035, 0, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                        </group>
                      </group>
                    )}
                  </group>
                )}

                {/* Hover Add Adjacent Unit CAD Snap Buttons */}
                {isHovered && (
                  <group>
                    {/* Add Right Button */}
                    <Html position={[uW / 2 + 0.04, uH / 2, 0]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "right");
                        }}
                        style={{
                          background: "#2972f5",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add adjacent Base Cabinet to the right"
                      >
                        + Right
                      </button>
                    </Html>
                    {/* Add Left Button */}
                    <Html position={[-uW / 2 - 0.04, uH / 2, 0]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "left");
                        }}
                        style={{
                          background: "#2972f5",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add adjacent Base Cabinet to the left"
                      >
                        + Left
                      </button>
                    </Html>
                    {/* Add Wall Unit on top */}
                    <Html position={[0, uH + 0.05, 0]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "top");
                        }}
                        style={{
                          background: "#10b981",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add Upper Wall Cabinet above this unit"
                      >
                        + Wall Unit
                      </button>
                    </Html>
                  </group>
                )}
              </group>
            );
          });
        })()}

        {/* Render Upper Wall Cabinets (Suspended above base units) */}
        {(() => {
          let currX = wallStartLeftX;
          // Standard kitchen wall cabinet height: bottom at plinthH + 0.72m (base) + 0.55m (backsplash clearance) = plinthH + 1.27m
          const wallY = plinthH + 0.72 + 0.55;

          return wallUnits.map((unit) => {
            const uW = unit.width / 1000;
            const uH = unit.height / 1000;
            const uD = unit.depth / 1000;
            const centerX = currX + uW / 2;
            currX += uW;

            // Flush back with back wall at Z = -0.3 + uD/2
            const centerZ = -0.3 + uD / 2;

            const isSelected = selectedUnitId === unit.id;
            const isHovered = hoveredUnit === unit.id;
            const innerH = uH - t * 2;

            return (
              <group
                key={unit.id}
                position={[centerX, wallY, centerZ]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectUnit?.(unit.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredUnit(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  if (hoveredUnit === unit.id) setHoveredUnit(null);
                }}
              >
                {/* Active Selection Outline Highlight */}
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.01, uH + 0.01, uD + 0.01]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.06} />
                  </mesh>
                )}

                {/* Wall Carcase Panels */}
                <mesh position={[0, uH - t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={mainMaterial}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.01]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>

                {/* Shelves */}
                {Array.from({ length: unit.internalShelves || 2 }).map((_, si) => {
                  const shelfSpacing = innerH / ((unit.internalShelves || 2) + 1);
                  const shelfY = t + (si + 1) * shelfSpacing;
                  return (
                    <mesh key={`wallShelf-${si}`} position={[0, shelfY, 0]} material={mainMaterial}>
                      <boxGeometry args={[uW - t * 2, t, uD * 0.95]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                  );
                })}

                {/* Doors */}
                {unit.doorType !== "none" && (
                  <group>
                    {unit.doorType === "singleLeft" ? (
                      <group position={[-uW / 2, uH / 2, uD / 2]} rotation={[0, -angleRad, 0]}>
                        <mesh position={[uW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                          <boxGeometry args={[uW - 0.004, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([uW - 0.04, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : unit.doorType === "singleRight" ? (
                      <group position={[uW / 2, uH / 2, uD / 2]} rotation={[0, angleRad, 0]}>
                        <mesh position={[-uW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                          <boxGeometry args={[uW - 0.004, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([-uW + 0.04, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : unit.doorType === "flipUp" ? (
                      <group position={[0, uH - t, uD / 2]} rotation={[-angleRad, 0, 0]}>
                        <mesh position={[0, -innerH / 2, 0.009]} material={mainMaterial} castShadow>
                          <boxGeometry args={[uW - 0.004, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([0, -innerH + 0.04, 0.02], false, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : (
                      // Double Doors
                      <group>
                        <group position={[-uW / 2, uH / 2, uD / 2]} rotation={[0, -angleRad, 0]}>
                          <mesh position={[uW / 4, 0, 0.009]} material={mainMaterial} castShadow>
                            <boxGeometry args={[uW / 2 - 0.003, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          {renderHandle([uW / 2 - 0.035, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                        </group>
                        <group position={[uW / 2, uH / 2, uD / 2]} rotation={[0, angleRad, 0]}>
                          <mesh position={[-uW / 4, 0, 0.009]} material={mainMaterial} castShadow>
                            <boxGeometry args={[uW / 2 - 0.003, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          {renderHandle([-uW / 2 + 0.035, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                        </group>
                      </group>
                    )}
                  </group>
                )}

                {/* Hover Add Adjacent Wall Unit */}
                {isHovered && (
                  <group>
                    <Html position={[uW / 2 + 0.04, uH / 2, 0]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "right");
                        }}
                        style={{
                          background: "#2972f5",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add adjacent Wall Unit to the right"
                      >
                        + Right
                      </button>
                    </Html>
                    <Html position={[-uW / 2 - 0.04, uH / 2, 0]} center>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "left");
                        }}
                        style={{
                          background: "#2972f5",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
                          whiteSpace: "nowrap",
                        }}
                        title="Add adjacent Wall Unit to the left"
                      >
                        + Left
                      </button>
                    </Html>
                  </group>
                )}
              </group>
            );
          });
        })()}
      </group>
    );
  };

  // 3. SHELF RENDERER (Clean: No doors, no handles, consistent division layout)
  const renderShelf = () => {
    const cols = Math.max(1, Math.min(5, internalColumns || 2));
    const rows = Math.max(1, Math.min(6, internalShelves || 3));
    const bayW = (w - (cols + 1) * t) / cols;

    return (
      <group>
        {/* Outer Left Upright */}
        <mesh
          position={[-w / 2 + t / 2, h / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[t, h, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>
        {/* Outer Right Upright */}
        <mesh
          position={[w / 2 - t / 2, h / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[t, h, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>

        {/* Top & Bottom Horizontal Boards */}
        <mesh
          position={[0, h - t / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w - t * 2, t, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>
        <mesh
          position={[0, t / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w - t * 2, t, d]} />
          <Edges threshold={15} color={edgeColor} />
        </mesh>

        {/* Internal Vertical Divider Columns */}
        {cols > 1 &&
          Array.from({ length: cols - 1 }).map((_, ci) => {
            const divX = -w / 2 + t + (ci + 1) * (bayW + t) - t / 2;
            return (
              <mesh
                key={`shelfCol-${ci}`}
                position={[divX, h / 2, 0]}
                castShadow
                receiveShadow
                material={mainMaterial}
              >
                <boxGeometry args={[t, h - t * 2, d]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            );
          })}

        {/* Horizontal Shelf Tiers per Column (Grid vs Staggered Asymmetrical) */}
        {Array.from({ length: cols }).map((_, ci) => {
          const colX = -w / 2 + t + bayW / 2 + ci * (bayW + t);
          const isOffset = shelfLayout === "staggered" && ci % 2 === 1;
          const tierHeight = (h - t * 2) / (rows + 1);

          return (
            <group key={`colShelves-${ci}`}>
              {Array.from({ length: rows }).map((_, ri) => {
                const shelfY =
                  t + (ri + 1) * tierHeight + (isOffset ? tierHeight * 0.35 : 0);
                if (shelfY >= h - t - 0.05) return null;

                return (
                  <mesh
                    key={`shelf-${ci}-${ri}`}
                    position={[colX, shelfY, 0]}
                    castShadow
                    receiveShadow
                    material={mainMaterial}
                  >
                    <boxGeometry args={[bayW, t, d]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              })}
            </group>
          );
        })}

        {/* Solid Back Panel (if enabled) */}
        {hasBackPanel && (
          <mesh
            position={[0, h / 2, -d / 2 + 0.005]}
            material={mainMaterial}
          >
            <boxGeometry args={[w - t * 2, h - t * 2, 0.008]} />
            <Edges threshold={15} color={edgeColor} />
          </mesh>
        )}
      </group>
    );
  };


  // 4. MODULAR WARDROBE SYSTEM RENDERER
  const renderWardrobeSystem = () => {
    const rawUnits: WardrobeUnit[] = wardrobeUnits && wardrobeUnits.length > 0 ? wardrobeUnits : [
      {
        id: "wardrobe-1",
        name: "Main Section 1 (Hanging & Drawers)",
        type: "main",
        width: 900,
        height: 2100,
        depth: 600,
        doorType: "sliding",
        doorOpenPercent: 0,
        hasMirror: false,
        mirrorType: "full",
        hasDrawers: true,
        drawerType: "externalBottom",
        drawerCount: 2,
        drawerOpenPercent: 0,
        hasClothesHangerRail: true,
        internalShelves: 1,
        hasInternalDivider: false,
        handleType: "edgePull",
        handleFinish: "black",
      },
      {
        id: "wardrobe-2",
        name: "Main Section 2 (Shelves & Mirror)",
        type: "main",
        width: 900,
        height: 2100,
        depth: 600,
        doorType: "sliding",
        doorOpenPercent: 0,
        hasMirror: true,
        mirrorType: "full",
        hasDrawers: false,
        drawerType: "internal",
        drawerCount: 0,
        drawerOpenPercent: 0,
        hasClothesHangerRail: false,
        internalShelves: 4,
        hasInternalDivider: false,
        handleType: "edgePull",
        handleFinish: "black",
      },
      {
        id: "wardrobe-top-1",
        name: "Top Bridge 1",
        type: "top",
        width: 900,
        height: 450,
        depth: 600,
        doorType: "hingedDouble",
        doorOpenPercent: 0,
        hasMirror: false,
        internalShelves: 1,
        drawerCount: 0,
        handleType: "edgePull",
        handleFinish: "black",
      },
      {
        id: "wardrobe-top-2",
        name: "Top Bridge 2",
        type: "top",
        width: 900,
        height: 450,
        depth: 600,
        doorType: "hingedDouble",
        doorOpenPercent: 0,
        hasMirror: false,
        internalShelves: 1,
        drawerCount: 0,
        handleType: "edgePull",
        handleFinish: "black",
      },
    ];

    const mainUnits = rawUnits.filter((u) => u.type !== "top");
    const topUnits = rawUnits.filter((u) => u.type === "top");

    // Continuous plinth / toe kick spanning all main wardrobe divisions
    const totalMainW = mainUnits.reduce((acc, u) => acc + u.width / 1000, 0);
    const mainStartLeftX = -totalMainW / 2;
    const plinthH = (plinthHeight ?? 80) / 1000;
    const plinthRec = (plinthRecess ?? 30) / 1000;
    const wardrobeD = (depth || 600) / 1000;

    return (
      <group>
        {/* Continuous Plinth Base at Y = 0 */}
        {mainUnits.length > 0 && plinthH > 0 && (
          <group>
            {/* Front plinth fascia board */}
            <mesh
              position={[0, plinthH / 2, wardrobeD / 2 - plinthRec - 0.009]}
              castShadow
              material={mainMaterial}
            >
              <boxGeometry args={[totalMainW - 0.01, plinthH, 0.018]} />
              <Edges threshold={15} color={edgeColor} />
            </mesh>
            {/* Side returns */}
            {[-totalMainW / 2 + 0.009, totalMainW / 2 - 0.009].map((px, pi) => (
              <mesh
                key={`wardrobePlinthSide-${pi}`}
                position={[px, plinthH / 2, -plinthRec / 2]}
                material={mainMaterial}
              >
                <boxGeometry args={[0.018, plinthH, wardrobeD - plinthRec - 0.02]} />
              </mesh>
            ))}
          </group>
        )}

        {/* Main Wardrobe Divisions / Sections */}
        {(() => {
          let currX = mainStartLeftX;
          return mainUnits.map((unit) => {
            const uW = unit.width / 1000;
            const uH = unit.height / 1000;
            const uD = unit.depth / 1000;
            const centerX = currX + uW / 2;
            currX += uW;

            const isSelected = selectedWardrobeUnitId === unit.id;
            const isHovered = hoveredWardrobeUnit === unit.id;
            const innerH = uH - t * 2;
            const innerD = uD - 0.02;

            // Drawers calculation
            const hasDrawers = Boolean(unit.hasDrawers && (unit.drawerCount || 0) > 0);
            const drawerCount = unit.drawerCount || 2;
            const isExternalDrawers = hasDrawers && unit.drawerType === "externalBottom";
            const drawerUnitHeight = unit.drawerHeight ? unit.drawerHeight / 1000 : 0.22;
            const totalDrawerHeight = isExternalDrawers ? Math.min(innerH * 0.45, drawerUnitHeight * drawerCount) : 0;
            const doorAreaH = innerH - totalDrawerHeight;
            const drawerOpenDist = ((unit.drawerOpenPercent ?? 0) / 100) * (uD * 0.65);
            const doorOpenPercent = unit.doorOpenPercent ?? 0;

            return (
              <group
                key={unit.id}
                position={[centerX, plinthH, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWardrobeUnit?.(unit.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredWardrobeUnit(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  if (hoveredWardrobeUnit === unit.id) setHoveredWardrobeUnit(null);
                }}
              >
                {/* Active Selection Glow Box */}
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.012, uH + 0.012, uD + 0.012]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.07} />
                  </mesh>
                )}

                {/* Carcass: Top, Bottom, Left, Right, Solid Back */}
                <mesh position={[0, uH - t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={mainMaterial}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                </mesh>

                {/* Optional Internal Vertical Divider */}
                {unit.hasInternalDivider && (
                  <mesh position={[0, uH / 2, 0]} material={mainMaterial} castShadow>
                    <boxGeometry args={[t, uH - t * 2, innerD]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                )}

                {/* Internal Shelves */}
                {unit.internalShelves > 0 && (
                  <group>
                    {Array.from({ length: unit.internalShelves }).map((_, si) => {
                      const startY = t + totalDrawerHeight;
                      const availH = uH - t - startY;
                      const shelfY = startY + (availH / (unit.internalShelves + 1)) * (si + 1);
                      const shelfW = unit.hasInternalDivider ? (uW - t * 3) / 2 : (uW - t * 2);
                      const shelfX = unit.hasInternalDivider ? uW / 4 : 0;
                      return (
                        <mesh
                          key={`wardrobeShelf-${si}`}
                          position={[shelfX, shelfY, 0]}
                          material={mainMaterial}
                          castShadow
                        >
                          <boxGeometry args={[shelfW, t, innerD]} />
                          <Edges threshold={15} color={edgeColor} />
                        </mesh>
                      );
                    })}
                  </group>
                )}

                {/* Clothes Hanging Rail with Chrome Rod & Clothes Hangers */}
                {unit.hasClothesHangerRail && (
                  <group position={[unit.hasInternalDivider ? -uW / 4 : 0, uH - t - 0.22, 0]}>
                    {(() => {
                      const railW = unit.hasInternalDivider ? (uW - t * 3) / 2 - 0.02 : uW - t * 2 - 0.02;
                      return (
                        <group>
                          <mesh rotation={[0, 0, Math.PI / 2]} material={chromeMaterial} castShadow>
                            <cylinderGeometry args={[0.014, 0.014, railW, 24]} />
                          </mesh>
                          {[-railW / 2, railW / 2].map((bx, bi) => (
                            <mesh key={`bracket-${bi}`} position={[bx, 0, 0]} material={chromeMaterial}>
                              <boxGeometry args={[0.01, 0.04, 0.04]} />
                            </mesh>
                          ))}
                          {[-railW * 0.3, -railW * 0.1, railW * 0.1, railW * 0.3].map((hx, hi) => (
                            <group key={`hanger-${hi}`} position={[hx, -0.06, 0]}>
                              <mesh material={mainMaterial} castShadow>
                                <boxGeometry args={[0.34, 0.012, 0.012]} />
                              </mesh>
                              <mesh position={[-0.08, 0.04, 0]} rotation={[0, 0, -0.45]} material={mainMaterial}>
                                <boxGeometry args={[0.2, 0.014, 0.014]} />
                              </mesh>
                              <mesh position={[0.08, 0.04, 0]} rotation={[0, 0, 0.45]} material={mainMaterial}>
                                <boxGeometry args={[0.2, 0.014, 0.014]} />
                              </mesh>
                              <mesh position={[0, 0.07, 0]} material={chromeMaterial}>
                                <torusGeometry args={[0.022, 0.004, 8, 16, Math.PI * 1.3]} />
                              </mesh>
                            </group>
                          ))}
                        </group>
                      );
                    })()}
                  </group>
                )}

                {/* External Bottom Drawers */}
                {isExternalDrawers && (
                  <group position={[0, t, 0]}>
                    <mesh position={[0, totalDrawerHeight, 0]} material={mainMaterial} castShadow>
                      <boxGeometry args={[uW - t * 2, t, innerD]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    {Array.from({ length: drawerCount }).map((_, di) => {
                      const dh = totalDrawerHeight / drawerCount;
                      const drawerY = di * dh + dh / 2;
                      return (
                        <group
                          key={`extDrawer-${di}`}
                          position={[0, drawerY, uD / 2 + drawerOpenDist]}
                        >
                          <mesh material={mainMaterial} castShadow>
                            <boxGeometry args={[uW - 0.006, dh - 0.005, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          <mesh position={[0, -0.01, -innerD * 0.45]} material={mainMaterial}>
                            <boxGeometry args={[uW - t * 2 - 0.03, dh * 0.8, innerD * 0.85]} />
                          </mesh>
                          {renderHandle([0, 0, 0.01], false, 0, unit.handleType || "edgePull", unit.handleFinish || "black")}
                        </group>
                      );
                    })}
                  </group>
                )}

                {/* Internal Concealed Drawers */}
                {hasDrawers && !isExternalDrawers && (
                  <group position={[0, t + 0.05, 0]}>
                    {Array.from({ length: drawerCount }).map((_, di) => {
                      const dh = 0.16;
                      const drawerY = di * (dh + 0.02);
                      return (
                        <group
                          key={`intDrawer-${di}`}
                          position={[0, drawerY, uD / 2 - 0.06 + drawerOpenDist]}
                        >
                          <mesh material={mainMaterial} castShadow>
                            <boxGeometry args={[uW - t * 2 - 0.02, dh, 0.016]} />
                            <Edges threshold={15} color={edgeColor} />
                          </mesh>
                          <mesh position={[0, 0, -innerD * 0.45]} material={mainMaterial}>
                            <boxGeometry args={[uW - t * 2 - 0.04, dh * 0.85, innerD * 0.85]} />
                          </mesh>
                          {renderHandle([0, 0, 0.01], false, 0, "cutout", unit.handleFinish || "black")}
                        </group>
                      );
                    })}
                  </group>
                )}

                {/* DOORS & FACADE */}
                {unit.doorType !== "open" && (
                  <group position={[0, t + totalDrawerHeight + doorAreaH / 2, uD / 2]}>
                    {unit.doorType === "sliding" ? (
                      <group>
                        {/* Upper metal guide track */}
                        <mesh position={[0, doorAreaH / 2 + 0.01, 0.015]} material={chromeMaterial}>
                          <boxGeometry args={[uW + 0.002, 0.02, 0.045]} />
                        </mesh>
                        {/* Lower metal guide track */}
                        <mesh position={[0, -doorAreaH / 2 - 0.01, 0.015]} material={chromeMaterial}>
                          <boxGeometry args={[uW + 0.002, 0.016, 0.045]} />
                        </mesh>

                        {/* Sliding Door Panel 1 (Left / Rear track) */}
                        {(() => {
                          const panelW = uW / 2 + 0.025;
                          const panelH = doorAreaH - 0.006;
                          return (
                            <group position={[-uW / 4, 0, 0.008]}>
                              <mesh material={mainMaterial} castShadow>
                                <boxGeometry args={[panelW, panelH, 0.018]} />
                                <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                              </mesh>
                              {renderHandle([panelW / 2 - 0.03, 0, 0.012], true, 0, unit.handleType || "edgePull", unit.handleFinish || "black")}
                            </group>
                          );
                        })()}

                        {/* Sliding Door Panel 2 (Right / Front track) - Slides on doorOpenPercent */}
                        {(() => {
                          const panelW = uW / 2 + 0.025;
                          const panelH = doorAreaH - 0.006;
                          const slideOffset = -(panelW * 0.85) * (doorOpenPercent / 100);
                          const hasMirrorOnDoor = unit.hasMirror;
                          return (
                            <group position={[uW / 4 + slideOffset, 0, 0.028]}>
                              <mesh material={mainMaterial} castShadow>
                                <boxGeometry args={[panelW, panelH, 0.018]} />
                                <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                              </mesh>

                              {/* Mirror Option */}
                              {hasMirrorOnDoor && (
                                <group position={[0, 0, 0.011]}>
                                  <mesh material={chromeMaterial}>
                                    <boxGeometry
                                      args={[
                                        unit.mirrorType === "center" ? panelW * 0.75 + 0.01 : panelW - 0.04,
                                        panelH - 0.06,
                                        0.006,
                                      ]}
                                    />
                                  </mesh>
                                  <mesh position={[0, 0, 0.004]} material={mirrorMaterial}>
                                    <boxGeometry
                                      args={[
                                        unit.mirrorType === "center" ? panelW * 0.75 : panelW - 0.06,
                                        panelH - 0.08,
                                        0.004,
                                      ]}
                                    />
                                    <Edges threshold={15} color="#cbd5e1" />
                                  </mesh>
                                </group>
                              )}

                              {renderHandle([-panelW / 2 + 0.03, 0, 0.012], true, 0, unit.handleType || "edgePull", unit.handleFinish || "black")}
                            </group>
                          );
                        })()}
                      </group>
                    ) : unit.doorType === "hingedSingle" ? (
                      (() => {
                        const angleRad = (doorOpenPercent / 100) * (Math.PI / 2);
                        const hasMirrorOnDoor = unit.hasMirror;
                        return (
                          <group position={[-uW / 2, 0, 0]} rotation={[0, -angleRad, 0]}>
                            <mesh position={[uW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                              <boxGeometry args={[uW - 0.004, doorAreaH, 0.018]} />
                              <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                            </mesh>

                            {hasMirrorOnDoor && (
                              <group position={[uW / 2, 0, 0.02]}>
                                <mesh position={[0, 0, 0.003]} material={mirrorMaterial}>
                                  <boxGeometry args={[uW - 0.08, doorAreaH - 0.08, 0.004]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                              </group>
                            )}

                            {renderHandle([uW - 0.04, 0, 0.02], true, 0, unit.handleType || "bar", unit.handleFinish || "black")}
                          </group>
                        );
                      })()
                    ) : (
                      (() => {
                        const angleRad = (doorOpenPercent / 100) * (Math.PI / 2);
                        const halfW = uW / 2;
                        const hasMirrorOnDoor = unit.hasMirror;
                        return (
                          <group>
                            {/* Left Door */}
                            <group position={[-halfW, 0, 0]} rotation={[0, -angleRad, 0]}>
                              <mesh position={[halfW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                                <boxGeometry args={[halfW - 0.003, doorAreaH, 0.018]} />
                                <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                              </mesh>
                              {hasMirrorOnDoor && (
                                <mesh position={[halfW / 2, 0, 0.021]} material={mirrorMaterial}>
                                  <boxGeometry args={[halfW - 0.06, doorAreaH - 0.08, 0.004]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                              )}
                              {renderHandle([halfW - 0.035, 0, 0.02], true, 0, unit.handleType || "bar", unit.handleFinish || "black")}
                            </group>
                            {/* Right Door */}
                            <group position={[halfW, 0, 0]} rotation={[0, angleRad, 0]}>
                              <mesh position={[-halfW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                                <boxGeometry args={[halfW - 0.003, doorAreaH, 0.018]} />
                                <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                              </mesh>
                              {hasMirrorOnDoor && (
                                <mesh position={[-halfW / 2, 0, 0.021]} material={mirrorMaterial}>
                                  <boxGeometry args={[halfW - 0.06, doorAreaH - 0.08, 0.004]} />
                                  <Edges threshold={15} color="#cbd5e1" />
                                </mesh>
                              )}
                              {renderHandle([-halfW + 0.035, 0, 0.02], true, 0, unit.handleType || "bar", unit.handleFinish || "black")}
                            </group>
                          </group>
                        );
                      })()
                    )}
                  </group>
                )}

                {/* 3D Snap Buttons on Hover: Left, Right, Top */}
                {isHovered && (
                  <group>
                    <Html position={[-uW / 2 - 0.04, uH / 2, uD / 2]} center>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentWardrobeUnit?.(unit.id, "left");
                        }}
                        style={{
                          background: "#0d0d12",
                          border: "1px solid #38bdf8",
                          borderRadius: "4px",
                          color: "#38bdf8",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 7px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        }}
                      >
                        + Add Left
                      </button>
                    </Html>

                    <Html position={[uW / 2 + 0.04, uH / 2, uD / 2]} center>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentWardrobeUnit?.(unit.id, "right");
                        }}
                        style={{
                          background: "#0d0d12",
                          border: "1px solid #38bdf8",
                          borderRadius: "4px",
                          color: "#38bdf8",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 7px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        }}
                      >
                        + Add Right
                      </button>
                    </Html>

                    <Html position={[0, uH + 0.06, uD / 2]} center>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentWardrobeUnit?.(unit.id, "top");
                        }}
                        style={{
                          background: "#0d0d12",
                          border: "1px solid #a855f7",
                          borderRadius: "4px",
                          color: "#c084fc",
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "3px 7px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.8)",
                        }}
                      >
                        + Add Top Unit
                      </button>
                    </Html>
                  </group>
                )}
              </group>
            );
          });
        })()}

        {/* Top Overhead Cabinets */}
        {(() => {
          let currTopX = mainStartLeftX;
          const mainH = (mainUnits[0]?.height || 2100) / 1000;
          return topUnits.map((topU) => {
            const uW = topU.width / 1000;
            const uH = topU.height / 1000;
            const uD = topU.depth / 1000;
            const centerX = currTopX + uW / 2;
            currTopX += uW;

            const isSelected = selectedWardrobeUnitId === topU.id;
            const topY = plinthH + mainH;

            return (
              <group
                key={topU.id}
                position={[centerX, topY, 0]}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWardrobeUnit?.(topU.id);
                }}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  setHoveredWardrobeUnit(topU.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  if (hoveredWardrobeUnit === topU.id) setHoveredWardrobeUnit(null);
                }}
              >
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.01, uH + 0.01, uD + 0.01]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.07} />
                  </mesh>
                )}

                <mesh position={[0, uH - t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, t / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={mainMaterial} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={mainMaterial}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.008]} />
                </mesh>

                {topU.doorType !== "open" && (
                  <group position={[0, uH / 2, uD / 2]}>
                    <mesh material={mainMaterial} castShadow>
                      <boxGeometry args={[uW - 0.006, uH - t * 2, 0.018]} />
                      <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                    </mesh>
                    {renderHandle([uW / 2 - 0.04, 0, 0.012], true, 0, topU.handleType || "edgePull", topU.handleFinish || "black")}
                  </group>
                )}
              </group>
            );
          });
        })()}
      </group>
    );
  };

  return (
    <group ref={groupRef}>
      {category === "Cabinet"
        ? renderKitchenCabinetSystem()
        : category === "Shelf"
        ? renderShelf()
        : category === "Wardrobe"
        ? renderWardrobeSystem()
        : renderTable()}

      {/* Sleek CAD Dimension Tags */}
      {showDimensions && (
        <group>
          <Html position={[0, h + 0.06, d / 2 + 0.02]} center>
            <div
              style={{
                background: "rgba(13, 13, 18, 0.9)",
                border: "1px solid rgba(41, 114, 245, 0.5)",
                borderRadius: "4px",
                padding: "2px 7px",
                color: "#93c5fd",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.7)",
                userSelect: "none",
              }}
            >
              W: {width} mm
            </div>
          </Html>

          <Html position={[w / 2 + 0.05, h / 2, d / 2 + 0.02]} center>
            <div
              style={{
                background: "rgba(13, 13, 18, 0.9)",
                border: "1px solid rgba(41, 114, 245, 0.5)",
                borderRadius: "4px",
                padding: "2px 7px",
                color: "#93c5fd",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.7)",
                userSelect: "none",
              }}
            >
              H: {height} mm
            </div>
          </Html>

          <Html position={[-w / 2 - 0.05, 0.05, 0]} center>
            <div
              style={{
                background: "rgba(13, 13, 18, 0.9)",
                border: "1px solid rgba(41, 114, 245, 0.5)",
                borderRadius: "4px",
                padding: "2px 7px",
                color: "#93c5fd",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                pointerEvents: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.7)",
                userSelect: "none",
              }}
            >
              D: {depth} mm
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
