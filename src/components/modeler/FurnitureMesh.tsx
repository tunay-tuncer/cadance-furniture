"use client";

import React, { useMemo, useState } from "react";
import * as THREE from "three";
import { Edges, Html } from "@react-three/drei";

export interface SelectedDivision {
  unitId: string;
  type: "shelf" | "partition" | "drawer";
  index?: number;
  colIndex?: number;
}

export type MaterialPreset = "oak" | "walnut" | "plywood" | "blackSteel" | "whiteStudio";

export interface KitchenCabinetUnit {
  id: string;
  name: string;
  type: "base" | "wall" | "corner-base"; // base floor unit vs wall/upper suspended unit vs 90° corner base
  orientation?: "straight" | "corner-right" | "corner-left"; // orientation & turn direction
  materialType?: MaterialPreset; // individual cabinet material override
  doorOpenPercent?: number; // individual door open state (0-100%)
  doorStyle?: "slab" | "shaker" | "glass";
  hasBackPanel?: boolean;
  width: number;  // mm (e.g. 600 or 900 for corner)
  height: number; // mm (e.g. 720)
  depth: number;  // mm (e.g. 600 or 900 for corner, 350 for wall)
  doorType: "none" | "singleLeft" | "singleRight" | "double" | "flipUp" | "cornerDouble";
  drawerCount: number; // 0, 1, 2, 3, 4
  drawerHeightsMode?: "equal" | "standard" | "custom";
  drawerHeights?: number[]; // mm for each drawer, e.g. [140, 280, 280]
  internalShelves: number;
  handleType: "bar" | "knob" | "edgePull" | "cutout" | "hidden" | "cncJProfile";
  handleFinish: "black" | "steel" | "brass";
}

export interface WardrobeUnit {
  id: string;
  name: string;
  type: "main" | "top";
  materialType?: MaterialPreset; // main wardrobe bay vs top overhead unit
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
  handleType?: "bar" | "knob" | "edgePull" | "cutout" | "hidden" | "cncJProfile";
  handleFinish?: "black" | "steel" | "brass";
}

export interface TechnicalDrawingSettings {
  drawingTitle?: string;
  clientName?: string;
  designer?: string;
  drawingNumber?: string;
  revision?: string;
  status?: string;
  notes?: string;
  pageSize?: "A3" | "A4";
  orientation?: "landscape" | "portrait";
  scaleMode?: "auto" | "1:10" | "1:15" | "1:20" | "1:25" | "1:50" | "custom";
  customScale?: number;
  showDimensions?: boolean;
  isoAngle?: number; // degrees (0-360), default 45
  isoElevation?: number; // degrees (15-45), default 30
  unit?: "mm" | "cm"; // drawing dimension unit (default "mm")
  viewTitles?: {
    top?: string;
    front?: string;
    side?: string;
    iso?: string;
  };
}

export interface FurnitureParams {
  name: string;
  category: "Table" | "Shelf" | "Cabinet" | "Wardrobe" | "Desk" | "Custom";
  activeTool?: "select" | "select-division" | "box-select" | "add-base" | "add-v-division" | "add-h-division";
  selectedUnitIds?: string[];
  onSelectUnits?: (ids: string[]) => void;
  width: number;  // mm (e.g. 1200)
  height: number; // mm (e.g. 750)
  depth: number;  // mm (e.g. 600)
  materialType: "oak" | "walnut" | "plywood" | "blackSteel" | "whiteStudio";
  showDimensions?: boolean;
  wireframe?: boolean;

  // 2D Technical Drawing Settings
  drawingSettings?: TechnicalDrawingSettings;

  // Board & Construction Specs
  boardThickness?: number; // mm (default 18mm)
  tableTopThickness?: number; // mm (for table/desk top board thickness, default 18mm)
  apronHeight?: number; // mm (height/width of apron rail, default 65mm)
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
  handleType?: "bar" | "knob" | "edgePull" | "cutout" | "hidden" | "cncJProfile";
  handleFinish?: "black" | "steel" | "brass";

  // Internal Divisions & Shelving
  internalColumns?: number; // 1 to 5 vertical dividers
  internalShelves?: number; // 1 to 6 horizontal shelves
  shelfLayout?: "grid" | "staggered";
  shelfColumnOffsets?: number[]; // mm offset for each vertical divider column
  shelfRowOffsets?: number[];    // mm offset for each horizontal shelf tier
  selectedDivision?: SelectedDivision | null;
  onSelectDivision?: (div: SelectedDivision | null) => void;
  onRemoveDivision?: (div: SelectedDivision) => void;

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
  onAddDivision?: (unitId: string, type: "vertical" | "horizontal") => void;
}

interface FurnitureMeshProps {
  params: FurnitureParams;
  groupRef: React.RefObject<THREE.Group | null>;
  onSelectUnit?: (id: string) => void;
  onSelectUnits?: (ids: string[]) => void;
  onAddAdjacentUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onSelectWardrobeUnit?: (id: string) => void;
  onAddAdjacentWardrobeUnit?: (sourceId: string, direction: "left" | "right" | "top") => void;
  onAddDivision?: (unitId: string, type: "vertical" | "horizontal") => void;
  onSelectDivision?: (div: SelectedDivision | null) => void;
  onRemoveDivision?: (div: SelectedDivision) => void;
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


let hoverCabinetTimer: ReturnType<typeof setTimeout> | null = null;
let hoverWardrobeTimer: ReturnType<typeof setTimeout> | null = null;

export default function FurnitureMesh({
  params,
  groupRef,
  onSelectUnit,
  onSelectUnits: propOnSelectUnits,
  onAddAdjacentUnit,
  onSelectWardrobeUnit,
  onAddAdjacentWardrobeUnit,
  onAddDivision,
  onSelectDivision: propOnSelectDivision,
  onRemoveDivision: propOnRemoveDivision,
}: FurnitureMeshProps) {
  const onSelectDivision = propOnSelectDivision || params.onSelectDivision;
  const onRemoveDivision = propOnRemoveDivision || params.onRemoveDivision;
  const selectedDivision = params.selectedDivision;
  const activeTool = params.activeTool || "select";
  const onSelectUnits = propOnSelectUnits || params.onSelectUnits;
  const [hoveredSnap, setHoveredSnap] = useState<{ unitId: string; side: "left" | "right" } | null>(null);
  const {
    width,
    height,
    depth,
    category,
    materialType,
    showDimensions,
    wireframe,
    boardThickness = 18,
    tableTopThickness = 18,
    apronHeight = 65,
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
    shelfColumnOffsets,
    shelfRowOffsets,
    kitchenUnits,
    selectedUnitId,
    wardrobeUnits,
    selectedWardrobeUnitId,
  } = params;

  const selectedUnitIds = params.selectedUnitIds && params.selectedUnitIds.length > 0
    ? params.selectedUnitIds
    : (selectedUnitId ? [selectedUnitId] : []);

  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [hoveredWardrobeUnit, setHoveredWardrobeUnit] = useState<string | null>(null);
  const handleHoverCabinet = (id: string) => {
    if (hoverCabinetTimer) clearTimeout(hoverCabinetTimer);
    setHoveredUnit(id);
  };

  const handleLeaveCabinet = () => {
    if (hoverCabinetTimer) clearTimeout(hoverCabinetTimer);
    hoverCabinetTimer = setTimeout(() => {
      setHoveredUnit(null);
    }, 450);
  };

  const handleHoverWardrobe = (id: string) => {
    if (hoverWardrobeTimer) clearTimeout(hoverWardrobeTimer);
    setHoveredWardrobeUnit(id);
  };

  const handleLeaveWardrobe = () => {
    if (hoverWardrobeTimer) clearTimeout(hoverWardrobeTimer);
    hoverWardrobeTimer = setTimeout(() => {
      setHoveredWardrobeUnit(null);
    }, 450);
  };


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
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    [matConfig, wireframe]
  );

  const materialsPresetMap = useMemo(() => {
    const map: Record<string, THREE.MeshStandardMaterial> = {};
    for (const [key, cfg] of Object.entries(MATERIAL_PRESETS)) {
      map[key] = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: cfg.roughness,
        metalness: cfg.metalness,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      });
    }
    return map;
  }, [wireframe]);

  const getUnitMaterial = (unitMat?: MaterialPreset) => {
    if (unitMat && materialsPresetMap[unitMat]) {
      return materialsPresetMap[unitMat];
    }
    return mainMaterial;
  };

  const handleMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: handleConfig.color,
        roughness: handleConfig.roughness,
        metalness: handleConfig.metalness,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.2 : 1.0,
      }),
    [handleConfig, wireframe]
  );

  const edgeColor = wireframe ? "#38bdf8" : "#1a1c23";

  const mirrorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d8e2ec",
        roughness: 0.04,
        metalness: 0.96,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    [wireframe]
  );

  const chromeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e2e8f0",
        roughness: 0.15,
        metalness: 0.92,
        wireframe: false,
        transparent: Boolean(wireframe),
        opacity: wireframe ? 0.08 : 1.0,
        depthWrite: !wireframe,
      }),
    [wireframe]
  );

  // Integrated CNC Milled J-Profile Door Geometry (Continuous Single Geometry)
  const createCncMilledJProfileGeometry = useMemo(() => {
    return (width: number, height: number, thickness: number, invertY: boolean = false) => {
      const T = Math.max(0.012, thickness);
      const H = height;
      const W = width;

      const shape = new THREE.Shape();
      const lipThick = Math.min(0.007, T * 0.38);
      const pocketDepth = Math.min(0.026, H * 0.15); // 26mm deep finger recess
      const rearHeight = H - pocketDepth + 0.005;

      // Profile in (thickness, height) space
      shape.moveTo(0, 0); // bottom rear
      shape.lineTo(0, rearHeight); // up rear face
      shape.lineTo(T - lipThick - 0.004, rearHeight); // step into finger channel
      shape.lineTo(T - lipThick - 0.004, H - pocketDepth); // channel bottom
      shape.lineTo(T - lipThick, H - pocketDepth); // across bottom of recess
      shape.lineTo(T - lipThick, H); // up inner wall of lip
      shape.lineTo(T, H); // top of front lip
      shape.lineTo(T, 0); // front face down to bottom
      shape.closePath();

      const geom = new THREE.ExtrudeGeometry(shape, {
        steps: 1,
        depth: W,
        bevelEnabled: false,
      });

      geom.rotateY(-Math.PI / 2);
      if (invertY) {
        geom.rotateX(Math.PI);
      }
      geom.center();
      geom.computeVertexNormals();
      return geom;
    };
  }, []);

  const CncDoorMesh = ({
    width: dw,
    height: dh,
    thickness: dt = 0.018,
    material: dmat,
    edgeColor: dec,
    isSelected: dis,
    invertY: diy = false,
    position: dpos = [0, 0, 0],
  }: {
    width: number;
    height: number;
    thickness?: number;
    material: THREE.Material;
    edgeColor: string;
    isSelected?: boolean;
    invertY?: boolean;
    position?: [number, number, number];
  }) => {
    const geom = useMemo(
      () => createCncMilledJProfileGeometry(dw, dh, dt, diy),
      [dw, dh, dt, diy]
    );

    return (
      <mesh position={dpos} geometry={geom} material={dmat} castShadow receiveShadow>
        <Edges threshold={15} color={dis ? "#60a5fa" : dec} />
      </mesh>
    );
  };

  // Reusable Hardware Handle Renderer
  const renderHandle = (
    pos: [number, number, number],
    isVertical: boolean = true,
    doorOffset: number = 0,
    hType: FurnitureParams["handleType"] = handleType,
    hFinish: FurnitureParams["handleFinish"] = handleFinish
  ) => {
    if (hType === "hidden" || hType === "cncJProfile") return null;

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
    // Top Board Thickness option (independent of legs / apron)
    const topT = Math.max(0.012, (tableTopThickness ?? 25) / 1000);
    const oHang = (topOverhang ?? 25) / 1000;
    const legThick = (legThickness / 1000) || 0.05;
    const legIns = (legInset / 1000) || 0.025;
    const legH = Math.max(0.1, h - topT);

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
        {/* Tabletop resting flush at y = h - topT/2 */}
        <mesh
          position={[0, h - topT / 2, 0]}
          castShadow
          receiveShadow
          material={mainMaterial}
        >
          <boxGeometry args={[w, topT, d]} />
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
                      position={[tx, h - topT - 0.02, 0]}
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
                position={[ax > 0 ? ax - legThick / 2 : ax + legThick / 2, h - topT - drawerH / 2, 0]}
                material={mainMaterial}
              >
                <boxGeometry args={[t, drawerH, cornerZ * 2]} />
                <Edges threshold={15} color={edgeColor} />
              </mesh>
            ))}
            {/* Back Apron Rail */}
            <mesh
              position={[0, h - topT - drawerH / 2, -cornerZ]}
              material={mainMaterial}
            >
              <boxGeometry args={[cornerX * 2, drawerH, t]} />
              <Edges threshold={15} color={edgeColor} />
            </mesh>

            {/* Horizontal Drawers across front */}
            {Array.from({ length: Math.min(3, drawerCount) }).map((_, di) => {
              const totalDrawers = Math.min(3, drawerCount);
              const drawerSpan = (cornerX * 2) - 0.02;
              const dWidth = drawerSpan / totalDrawers - 0.015;
              const dCenterX =
                -cornerX + 0.01 + dWidth / 2 + di * (dWidth + 0.015);
              const drawerY = h - topT - drawerH / 2;

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
          !isPedestal && legType !== "trestle" && (() => {
            const apronH = Math.max(0.03, (apronHeight ?? 65) / 1000);
            const apronY = h - topT - apronH / 2;
            return (
              <group>
                <mesh
                  position={[0, apronY, cornerZ]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[cornerX * 2, apronH, t]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                <mesh
                  position={[0, apronY, -cornerZ]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[cornerX * 2, apronH, t]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                <mesh
                  position={[cornerX, apronY, 0]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[t, apronH, cornerZ * 2]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
                <mesh
                  position={[-cornerX, apronY, 0]}
                  material={mainMaterial}
                >
                  <boxGeometry args={[t, apronH, cornerZ * 2]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              </group>
            );
          })()
        )}
      </group>
    );
  };

  // 2. MODULAR KITCHEN CABINET SYSTEM RENDERER (Supports L-Shaped Layout, Corner Base & Per-Cabinet Materials)
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

    const baseUnits = units.filter((u) => u.type === "base" || u.type === "corner-base");
    const wallUnits = units.filter((u) => u.type === "wall");

    const plinthH = baseType === "floating" ? 0 : plinthHeight / 1000;
    const plinthRec = plinthRecess / 1000;
    const globalAngleRad = ((doorOpenPercent || 0) / 100) * ((85 * Math.PI) / 180);

    const D_STD = 0.60; // Standard 600mm base cabinet depth

    // -------------------------------------------------------------
    // BASE CABINETS RUN LAYOUT (Supports Linear & 90° L-Shaped Runs)
    // -------------------------------------------------------------
    interface BaseLayoutItem {
      unit: KitchenCabinetUnit;
      pos: [number, number, number];
      rotY: number;
      uW: number;
      uH: number;
      uD: number;
      isCorner: boolean;
      runIndex: number; // 0 = straight along X, 1 = turned along Z
    }

    const layoutBaseItems: BaseLayoutItem[] = [];
    let curRun = 0;
    let cursorX = 0;
    let cursorZ = 0;
    let cornerOuterX = 0;
    let cornerOuterZ = -D_STD / 2;

    for (let i = 0; i < baseUnits.length; i++) {
      const u = baseUnits[i];
      const isCorner = u.type === "corner-base" || u.orientation === "corner-right" || u.orientation === "corner-left";
      const uW = u.width / 1000;
      const uH = u.height / 1000;
      const uD = isCorner ? (u.depth ? u.depth / 1000 : 0.9) : (u.depth ? u.depth / 1000 : D_STD);

      if (!isCorner && curRun === 0) {
        // Straight unit on primary run (along X, facing +Z)
        const cx = cursorX + uW / 2;
        const cz = 0;
        cursorX += uW;
        layoutBaseItems.push({
          unit: u,
          pos: [cx, plinthH, cz],
          rotY: 0,
          uW,
          uH,
          uD: D_STD,
          isCorner: false,
          runIndex: 0,
        });
      } else if (isCorner) {
        // 90° L-Corner unit placed at end of Run 0
        const cornerW = uW || 0.9;
        const cornerD = uD || 0.9;
        cornerOuterX = cursorX + cornerW;
        cornerOuterZ = -D_STD / 2;

        const cx = cursorX + cornerW / 2;
        const cz = cornerOuterZ + cornerD / 2;

        layoutBaseItems.push({
          unit: u,
          pos: [cx, plinthH, cz],
          rotY: 0,
          uW: cornerW,
          uH,
          uD: cornerD,
          isCorner: true,
          runIndex: 0,
        });

        // Switch next cabinets to Run 1 (along +Z)
        curRun = 1;
        cursorZ = cornerOuterZ + cornerD;
      } else if (!isCorner && curRun === 1) {
        // Straight unit on turned Run 1 (along +Z, facing -X into room)
        const cz = cursorZ + uW / 2;
        cursorZ += uW;
        const cx = cornerOuterX - D_STD / 2;

        layoutBaseItems.push({
          unit: u,
          pos: [cx, plinthH, cz],
          rotY: -Math.PI / 2,
          uW,
          uH,
          uD: D_STD,
          isCorner: false,
          runIndex: 1,
        });
      }
    }

    // Centering calculation: offset entire run so visual center is at (0, 0, 0)
    let bMinX = Infinity, bMaxX = -Infinity, bMinZ = Infinity, bMaxZ = -Infinity;
    for (const item of layoutBaseItems) {
      if (item.isCorner) {
        bMinX = Math.min(bMinX, item.pos[0] - item.uW / 2);
        bMaxX = Math.max(bMaxX, item.pos[0] + item.uW / 2);
        bMinZ = Math.min(bMinZ, item.pos[2] - item.uD / 2);
        bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uD / 2);
      } else if (item.runIndex === 0) {
        bMinX = Math.min(bMinX, item.pos[0] - item.uW / 2);
        bMaxX = Math.max(bMaxX, item.pos[0] + item.uW / 2);
        bMinZ = Math.min(bMinZ, item.pos[2] - item.uD / 2);
        bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uD / 2);
      } else {
        bMinX = Math.min(bMinX, item.pos[0] - item.uD / 2);
        bMaxX = Math.max(bMaxX, item.pos[0] + item.uD / 2);
        bMinZ = Math.min(bMinZ, item.pos[2] - item.uW / 2);
        bMaxZ = Math.max(bMaxZ, item.pos[2] + item.uW / 2);
      }
    }
    if (!isFinite(bMinX)) { bMinX = 0; bMaxX = 0; bMinZ = 0; bMaxZ = 0; }
    const centerOffX = (bMinX + bMaxX) / 2;
    const centerOffZ = (bMinZ + bMaxZ) / 2;

    // Apply centering offset to base items
    const centeredBaseItems = layoutBaseItems.map((item) => ({
      ...item,
      pos: [item.pos[0] - centerOffX, item.pos[1], item.pos[2] - centerOffZ] as [number, number, number],
    }));

    // Multi-Selection helper handler
    const handleUnitSelect = (e: { stopPropagation: () => void; shiftKey?: boolean }, unitId: string) => {
      e.stopPropagation();
      if (e.shiftKey) {
        const cur = selectedUnitIds;
        const next = cur.includes(unitId)
          ? cur.filter((id) => id !== unitId)
          : [...cur, unitId];
        const finalIds = next.length > 0 ? next : [unitId];
        if (onSelectUnits) {
          onSelectUnits(finalIds);
        } else {
          onSelectUnit?.(finalIds[finalIds.length - 1]);
        }
      } else {
        if (onSelectUnits) {
          onSelectUnits([unitId]);
        } else {
          onSelectUnit?.(unitId);
        }
      }
    };

    // -------------------------------------------------------------
    // UPPER WALL UNITS LAYOUT
    // -------------------------------------------------------------
    const totalWallW = wallUnits.reduce((acc, u) => acc + u.width / 1000, 0);
    const wallStartLeftX = -totalWallW / 2;
    const wallY = plinthH + 0.72 + 0.55;

    return (
      <group>
        {/* Continuous Plinth Boards Underneath */}
        {centeredBaseItems.length > 0 && plinthH > 0 && baseType === "plinth" && (
          <group>
            {centeredBaseItems.map((item, bi) => {
              const uMat = getUnitMaterial(item.unit.materialType);
              if (item.isCorner) {
                // L-Corner Plinth
                const w1 = item.uW - D_STD + 0.04;
                const d1 = item.uD - D_STD + 0.04;
                return (
                  <group key={`corPlinth-${bi}`} position={item.pos}>
                    <mesh position={[-item.uW / 2 + (item.uW - D_STD) / 2, -plinthH / 2, -item.uD / 2 + D_STD - plinthRec]} material={uMat}>
                      <boxGeometry args={[w1, plinthH, 0.018]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    <mesh position={[item.uW / 2 - D_STD + plinthRec, -plinthH / 2, item.uD / 2 - (item.uD - D_STD) / 2]} material={uMat}>
                      <boxGeometry args={[0.018, plinthH, d1]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                  </group>
                );
              } else if (item.runIndex === 0) {
                // Plinth along Run 0
                return (
                  <mesh
                    key={`plinthRun0-${bi}`}
                    position={[item.pos[0], plinthH / 2, item.pos[2] + D_STD / 2 - plinthRec]}
                    material={uMat}
                    castShadow
                  >
                    <boxGeometry args={[item.uW - 0.005, plinthH, 0.018]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              } else {
                // Plinth along Run 1 (facing -X)
                return (
                  <mesh
                    key={`plinthRun1-${bi}`}
                    position={[item.pos[0] - D_STD / 2 + plinthRec, plinthH / 2, item.pos[2]]}
                    material={uMat}
                    castShadow
                  >
                    <boxGeometry args={[0.018, plinthH, item.uW - 0.005]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                );
              }
            })}
          </group>
        )}

        {/* Corner Feet / Legs Mode */}
        {centeredBaseItems.length > 0 && plinthH > 0 && baseType === "legs" && (
          <group>
            {centeredBaseItems.map((item, bi) => {
              const uW = item.uW;
              const uD = item.uD;
              const legInsetX = 0.045;
              const legInsetZFront = plinthRec + 0.02;
              const legInsetZBack = 0.045;
              const legPositions: [number, number][] = [
                [-uW / 2 + legInsetX, uD / 2 - legInsetZFront],
                [uW / 2 - legInsetX, uD / 2 - legInsetZFront],
                [-uW / 2 + legInsetX, -uD / 2 + legInsetZBack],
                [uW / 2 - legInsetX, -uD / 2 + legInsetZBack],
              ];
              return (
                <group key={`legs-${bi}`} position={item.pos} rotation={[0, item.rotY, 0]}>
                  {legPositions.map(([lx, lz], li) => (
                    <group key={`leg-${bi}-${li}`} position={[lx, -plinthH, lz]}>
                      <mesh position={[0, plinthH / 2, 0]} material={chromeMaterial} castShadow>
                        <cylinderGeometry args={[0.02, 0.02, plinthH, 16]} />
                      </mesh>
                      <mesh position={[0, 0.005, 0]} material={chromeMaterial}>
                        <cylinderGeometry args={[0.026, 0.026, 0.01, 16]} />
                      </mesh>
                    </group>
                  ))}
                </group>
              );
            })}
          </group>
        )}

        {/* ------------------------------------------------------------- */}
        {/* RENDER ALL BASE CABINET UNITS (Straight & L-Corner)           */}
        {/* ------------------------------------------------------------- */}
        {centeredBaseItems.map((item, ui) => {
          const { unit, pos, rotY, uW, uH, uD, isCorner } = item;
          const uMat = getUnitMaterial(unit.materialType);
          const isSelected = selectedUnitIds.includes(unit.id);
          const isHovered = hoveredUnit === unit.id;
          const unitDoorAngle = unit.doorOpenPercent !== undefined
            ? ((unit.doorOpenPercent) / 100) * ((85 * Math.PI) / 180)
            : globalAngleRad;

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

          if (isCorner) {
            // =========================================================
            // 90° CORNER BASE CABINET RENDERER
            // =========================================================
            return (
              <group
                key={unit.id}
                userData={{ unitId: unit.id, unitName: unit.name }}
                position={pos}
                rotation={[0, rotY, 0]}
                onClick={(e) => handleUnitSelect(e, unit.id)}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  handleHoverCabinet(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  handleLeaveCabinet();
                }}
              >
                {/* Active Multi-Selection Bounding Wireframe & Glow */}
                {isSelected && (
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[uW + 0.015, uH + 0.015, uD + 0.015]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
                  </mesh>
                )}

                {/* Multi-Selection Badge Tag */}
                {isSelected && selectedUnitIds.length > 1 && (
                  <Html position={[0, uH + 0.08, 0]} center>
                    <span style={{
                      background: "rgba(2, 132, 199, 0.95)",
                      color: "#fff",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      whiteSpace: "nowrap",
                    }}>
                      ✓ {unit.name}
                    </span>
                  </Html>
                )}

                {/* Carcase Panels - L-Shaped Bottom */}
                <mesh position={[0, t / 2, -uD / 2 + D_STD / 2]} material={uMat} castShadow>
                  <boxGeometry args={[uW, t, D_STD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - D_STD / 2, t / 2, -uD / 2 + D_STD + (uD - D_STD) / 2]} material={uMat} castShadow>
                  <boxGeometry args={[D_STD, t, uD - D_STD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>

                {/* Carcase Panels - Top Stretchers / Countertop Support */}
                <mesh position={[0, uH - t / 2, -uD / 2 + D_STD / 2]} material={uMat} castShadow>
                  <boxGeometry args={[uW, t, D_STD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - D_STD / 2, uH - t / 2, -uD / 2 + D_STD + (uD - D_STD) / 2]} material={uMat} castShadow>
                  <boxGeometry args={[D_STD, t, uD - D_STD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>

                {/* Outer Left Side End (Joint to Run 0) */}
                <mesh position={[-uW / 2 + t / 2, uH / 2, -uD / 2 + D_STD / 2]} material={uMat} castShadow>
                  <boxGeometry args={[t, uH - t * 2, D_STD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>

                {/* Outer Turned Side End (Joint to Run 1) */}
                <mesh position={[uW / 2 - D_STD / 2, uH / 2, uD / 2 - t / 2]} material={uMat} castShadow>
                  <boxGeometry args={[D_STD, uH - t * 2, t]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>

                {/* Solid Back Wall 1 (along X) */}
                {(unit.hasBackPanel !== false) && (
                  <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={uMat}>
                    <boxGeometry args={[uW - t * 2, uH - t * 2, 0.01]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                )}

                {/* Solid Back Wall 2 (along Z) */}
                {(unit.hasBackPanel !== false) && (
                  <mesh position={[uW / 2 - 0.005, uH / 2, 0]} material={uMat}>
                    <boxGeometry args={[0.01, uH - t * 2, uD - t * 2]} />
                    <Edges threshold={15} color={edgeColor} />
                  </mesh>
                )}

                {/* Internal L-Corner Shelf */}
                {unit.internalShelves > 0 && (
                  <group position={[0, uH / 2, 0]}>
                    <mesh position={[0, 0, -uD / 2 + D_STD / 2]} material={uMat}>
                      <boxGeometry args={[uW - t * 2, t, D_STD - 0.03]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                    <mesh position={[uW / 2 - D_STD / 2, 0, -uD / 2 + D_STD + (uD - D_STD) / 2]} material={uMat}>
                      <boxGeometry args={[D_STD - 0.03, t, uD - D_STD - 0.01]} />
                      <Edges threshold={15} color={edgeColor} />
                    </mesh>
                  </group>
                )}

                {/* Corner Doors: 2 Doors Meeting at the Inside Corner */}
                {unit.doorType !== "none" && (
                  <group>
                    {/* Door 1: Facing +Z (hinged at left) */}
                    <group
                      position={[-uW / 2 + t, uH / 2, -uD / 2 + D_STD + 0.009]}
                      rotation={[0, -unitDoorAngle, 0]}
                    >
                      <mesh position={[(uW - D_STD - 0.008) / 2, 0, 0]} material={uMat} castShadow>
                        <boxGeometry args={[uW - D_STD - 0.008, innerH, 0.018]} />
                        <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                      </mesh>
                      {renderHandle([uW - D_STD - 0.035, innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                    </group>

                    {/* Door 2: Facing -X (hinged at turned top) */}
                    <group
                      position={[uW / 2 - D_STD - 0.009, uH / 2, uD / 2 - t]}
                      rotation={[0, unitDoorAngle, 0]}
                    >
                      <mesh position={[0, 0, -(uD - D_STD - 0.008) / 2]} material={uMat} castShadow>
                        <boxGeometry args={[0.018, innerH, uD - D_STD - 0.008]} />
                        <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                      </mesh>
                      {renderHandle([-0.02, innerH * 0.25, -(uD - D_STD - 0.035)], true, 0, unit.handleType, unit.handleFinish)}
                    </group>
                  </group>
                )}

                {/* Hover Action: Continue Run 1 along Turned Z */}
                {activeTool === "add-base" && isHovered && (
                  <group position={[uW / 2 - D_STD / 2, uH / 2, uD / 2 + 0.08]}>
                    <Html center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddAdjacentUnit?.(unit.id, "right");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #10b981, #059669)",
                          color: "#fff",
                          padding: "5px 11px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 14px rgba(16,185,129,0.7)",
                          border: "1px solid rgba(255,255,255,0.4)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➕ Click to Place Base on Turned Run
                      </div>
                    </Html>
                  </group>
                )}
              </group>
            );
          }

          // =========================================================
          // STRAIGHT BASE CABINET RENDERER
          // =========================================================
          const prevItem = centeredBaseItems[ui - 1];
          const nextItem = centeredBaseItems[ui + 1];

          let effectiveAngle = unitDoorAngle;
          if (prevItem && !prevItem.isCorner && unit.doorType === "singleLeft" && prevItem.unit.doorType !== "none" && unitDoorAngle > 0) {
            effectiveAngle = Math.min(unitDoorAngle, (75 * Math.PI) / 180);
          }
          if (nextItem && !nextItem.isCorner && unit.doorType === "singleRight" && nextItem.unit.doorType !== "none" && unitDoorAngle > 0) {
            effectiveAngle = Math.min(unitDoorAngle, (75 * Math.PI) / 180);
          }

          return (
            <group
              key={unit.id}
              userData={{ unitId: unit.id, unitName: unit.name }}
              position={pos}
              rotation={[0, rotY, 0]}
              onClick={(e) => handleUnitSelect(e, unit.id)}
              onPointerOver={(e) => {
                e.stopPropagation();
                handleHoverCabinet(unit.id);
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                handleLeaveCabinet();
              }}
            >
              {/* Active Selection Outline Highlight */}
              {isSelected && (
                <mesh position={[0, uH / 2, 0]}>
                  <boxGeometry args={[uW + 0.015, uH + 0.015, uD + 0.015]} />
                  <Edges threshold={1} color="#38bdf8" />
                  <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
                </mesh>
              )}

              {/* Multi-Selection Badge Tag */}
              {isSelected && selectedUnitIds.length > 1 && (
                <Html position={[0, uH + 0.08, 0]} center>
                  <span style={{
                    background: "rgba(2, 132, 199, 0.95)",
                    color: "#fff",
                    padding: "2px 7px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: 700,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    whiteSpace: "nowrap",
                  }}>
                    ✓ {unit.name}
                  </span>
                </Html>
              )}

              {/* Carcase Panels */}
              {/* Top */}
              <mesh position={[0, uH - t / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[uW, t, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Bottom */}
              <mesh position={[0, t / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[uW, t, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Left */}
              <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[t, uH - t * 2, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Right */}
              <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={uMat} castShadow>
                <boxGeometry args={[t, uH - t * 2, uD]} />
                <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
              </mesh>
              {/* Back */}
              {(unit.hasBackPanel !== false) && (
                <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={uMat}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.01]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>
              )}

              {/* Internal Shelves */}
              {unit.drawerCount === 0 && (unit.internalShelves ?? 0) > 0 &&
                Array.from({ length: unit.internalShelves ?? 0 }).map((_, si) => {
                  const count = unit.internalShelves ?? 0;
                  const shelfSpacing = innerH / (count + 1);
                  const shelfY = t + (si + 1) * shelfSpacing;
                  const isDivSelected =
                    selectedDivision?.unitId === unit.id &&
                    selectedDivision?.type === "shelf" &&
                    selectedDivision?.index === si;

                  return (
                    <group key={`shelf-${si}`} position={[0, shelfY, 0]}>
                      <mesh
                        material={uMat}
                        onClick={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            onSelectDivision?.({ unitId: unit.id, type: "shelf", index: si });
                          }
                        }}
                        onPointerOver={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            document.body.style.cursor = "pointer";
                          }
                        }}
                        onPointerOut={() => {
                          document.body.style.cursor = "default";
                        }}
                      >
                        <boxGeometry args={[uW - t * 2, t, innerD * 0.95]} />
                        <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                        {isDivSelected && (
                          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                        )}
                      </mesh>
                      {isDivSelected && (
                        <Html position={[0, 0.04, innerD * 0.4]} center>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveDivision?.({ unitId: unit.id, type: "shelf", index: si });
                            }}
                            style={{
                              background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.4)",
                              borderRadius: "5px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(220,38,38,0.6)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🗑️ Delete Shelf {si + 1}
                          </button>
                        </Html>
                      )}
                    </group>
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
                        {unit.handleType === "cncJProfile" ? (
                          <CncDoorMesh
                            width={uW - 0.008}
                            height={dh - 0.006}
                            thickness={0.018}
                            material={uMat}
                            edgeColor={isSelected ? "#60a5fa" : edgeColor}
                          />
                        ) : (
                          <mesh material={uMat} castShadow>
                            <boxGeometry args={[uW - 0.008, dh - 0.006, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                        )}
                        {/* Drawer pull handle */}
                        {unit.handleType !== "cncJProfile" &&
                          renderHandle([0, 0, 0.02], false, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    );
                  });
                })()}

              {/* Cabinet Hinged Doors */}
              {unit.drawerCount === 0 && unit.doorType !== "none" && (
                <group>
                  {unit.doorType === "singleLeft" ? (
                    <group
                      position={[-uW / 2 + 0.004, uH / 2, uD / 2]}
                      rotation={[0, -effectiveAngle, 0]}
                    >
                      {unit.handleType === "cncJProfile" ? (
                        <CncDoorMesh
                          width={uW - 0.008}
                          height={innerH}
                          thickness={0.018}
                          material={uMat}
                          edgeColor={isSelected ? "#60a5fa" : edgeColor}
                          position={[(uW - 0.008) / 2, 0, 0.009]}
                        />
                      ) : (
                        <mesh position={[(uW - 0.008) / 2, 0, 0.009]} material={uMat} castShadow>
                          <boxGeometry args={[uW - 0.008, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                      )}
                      {renderHandle([uW - 0.04, innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                    </group>
                  ) : unit.doorType === "singleRight" ? (
                    <group
                      position={[uW / 2 - 0.004, uH / 2, uD / 2]}
                      rotation={[0, effectiveAngle, 0]}
                    >
                      {unit.handleType === "cncJProfile" ? (
                        <CncDoorMesh
                          width={uW - 0.008}
                          height={innerH}
                          thickness={0.018}
                          material={uMat}
                          edgeColor={isSelected ? "#60a5fa" : edgeColor}
                          position={[-(uW - 0.008) / 2, 0, 0.009]}
                        />
                      ) : (
                        <mesh position={[-(uW - 0.008) / 2, 0, 0.009]} material={uMat} castShadow>
                          <boxGeometry args={[uW - 0.008, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                      )}
                      {renderHandle([-uW + 0.04, innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                    </group>
                  ) : unit.doorType === "double" ? (
                    <group>
                      <group position={[-uW / 2 + 0.004, uH / 2, uD / 2]} rotation={[0, -effectiveAngle, 0]}>
                        {unit.handleType === "cncJProfile" ? (
                          <CncDoorMesh
                            width={uW / 2 - 0.006}
                            height={innerH}
                            thickness={0.018}
                            material={uMat}
                            edgeColor={isSelected ? "#60a5fa" : edgeColor}
                            position={[(uW / 2 - 0.006) / 2, 0, 0.009]}
                          />
                        ) : (
                          <mesh position={[(uW / 2 - 0.006) / 2, 0, 0.009]} material={uMat} castShadow>
                            <boxGeometry args={[uW / 2 - 0.006, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                        )}
                        {renderHandle([uW / 2 - 0.035, innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                      <group position={[uW / 2 - 0.004, uH / 2, uD / 2]} rotation={[0, effectiveAngle, 0]}>
                        {unit.handleType === "cncJProfile" ? (
                          <CncDoorMesh
                            width={uW / 2 - 0.006}
                            height={innerH}
                            thickness={0.018}
                            material={uMat}
                            edgeColor={isSelected ? "#60a5fa" : edgeColor}
                            position={[-(uW / 2 - 0.006) / 2, 0, 0.009]}
                          />
                        ) : (
                          <mesh position={[-(uW / 2 - 0.006) / 2, 0, 0.009]} material={uMat} castShadow>
                            <boxGeometry args={[uW / 2 - 0.006, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                        )}
                        {renderHandle([-uW / 2 + 0.035, innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    </group>
                  ) : null}
                </group>
              )}

              {/* Add Adjacent Unit / Division Snapping on Hover */}
              {activeTool === "add-base" && isHovered && (
                <group>
                  {/* Right Snap Detector (Continues current run) */}
                  <group position={[uW / 2 + 0.04, uH / 2, 0]}>
                    <mesh
                      onPointerOver={(e) => { e.stopPropagation(); setHoveredSnap({ unitId: unit.id, side: "right" }); }}
                      onPointerOut={(e) => { e.stopPropagation(); setHoveredSnap(null); }}
                    >
                      <boxGeometry args={[0.08, uH, uD]} />
                      <meshBasicMaterial color="#38bdf8" transparent opacity={hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "right" ? 0.35 : 0.12} />
                      <Edges threshold={1} color="#38bdf8" />
                    </mesh>
                    <Html position={[0, 0, uD / 2 + 0.04]} center>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddAdjacentUnit?.(unit.id, "right");
                          }}
                          style={{
                            background: "#2972f5",
                            color: "#fff",
                            padding: "4px 9px",
                            borderRadius: "5px",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                            border: "1px solid rgba(255,255,255,0.3)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          ➕ Add Base Right
                        </div>
                        {item.runIndex === 0 && !centeredBaseItems.some((b) => b.isCorner) && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddAdjacentUnit?.(unit.id, "right"); // Will be converted or placed as corner
                            }}
                            style={{
                              background: "linear-gradient(135deg, #10b981, #059669)",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 14px rgba(16,185,129,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🔄 Add 90° L-Turn
                          </div>
                        )}
                      </div>
                    </Html>
                  </group>
                </group>
              )}

              {/* Mode 2: Vertical Division on Hover */}
              {activeTool === "add-v-division" && isHovered && (
                <group>
                  <mesh position={[0, uH / 2, 0]}>
                    <boxGeometry args={[0.018, uH - t * 2, innerD]} />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                    <Edges threshold={1} color="#38bdf8" />
                  </mesh>
                  <Html position={[0, uH + 0.04, uD / 2]} center>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddDivision?.(unit.id, "vertical");
                      }}
                      style={{
                        background: "linear-gradient(135deg, #0284c7, #2563eb)",
                        color: "#fff",
                        padding: "4px 9px",
                        borderRadius: "5px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(2,132,199,0.7)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      ➗ Click to Add Vertical Split
                    </div>
                  </Html>
                </group>
              )}

              {/* Mode 3: Horizontal Division (Shelf) on Hover */}
              {activeTool === "add-h-division" && isHovered && (
                <group>
                  {(() => {
                    const nextCount = (unit.internalShelves ?? 0) + 1;
                    const previewY = t + ((uH - t * 2) / (nextCount + 1)) * nextCount;
                    return (
                      <group position={[0, previewY, 0]}>
                        <mesh>
                          <boxGeometry args={[uW - t * 2, 0.018, innerD]} />
                          <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
                          <Edges threshold={1} color="#10b981" />
                        </mesh>
                        <Html position={[0, 0.04, uD / 2]} center>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddDivision?.(unit.id, "horizontal");
                            }}
                            style={{
                              background: "linear-gradient(135deg, #059669, #10b981)",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(16,185,129,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            📚 Click to Add Shelf (#{nextCount})
                          </div>
                        </Html>
                      </group>
                    );
                  })()}
                </group>
              )}
            </group>
          );
        })}

        {/* ------------------------------------------------------------- */}
        {/* RENDER UPPER WALL CABINETS (With Individual Materials)        */}
        {/* ------------------------------------------------------------- */}
        {(() => {
          let currX = wallStartLeftX;

          return wallUnits.map((unit) => {
            const uW = unit.width / 1000;
            const uH = unit.height / 1000;
            const uD = unit.depth / 1000;
            const centerX = currX + uW / 2;
            currX += uW;
            const centerZ = -0.3 + uD / 2;

            const uMat = getUnitMaterial(unit.materialType);
            const isSelected = selectedUnitIds.includes(unit.id);
            const isHovered = hoveredUnit === unit.id;
            const innerH = uH - t * 2;
            const unitDoorAngle = unit.doorOpenPercent !== undefined
              ? ((unit.doorOpenPercent) / 100) * ((85 * Math.PI) / 180)
              : globalAngleRad;

            return (
              <group
                key={unit.id}
                userData={{ unitId: unit.id, unitName: unit.name }}
                position={[centerX, wallY, centerZ]}
                onClick={(e) => handleUnitSelect(e, unit.id)}
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
                    <boxGeometry args={[uW + 0.015, uH + 0.015, uD + 0.015]} />
                    <Edges threshold={1} color="#38bdf8" />
                    <meshBasicMaterial color="#38bdf8" transparent opacity={0.08} />
                  </mesh>
                )}

                {/* Multi-Selection Badge Tag */}
                {isSelected && selectedUnitIds.length > 1 && (
                  <Html position={[0, uH + 0.08, 0]} center>
                    <span style={{
                      background: "rgba(2, 132, 199, 0.95)",
                      color: "#fff",
                      padding: "2px 7px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: 700,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      whiteSpace: "nowrap",
                    }}>
                      ✓ {unit.name}
                    </span>
                  </Html>
                )}

                {/* Wall Carcase Panels */}
                <mesh position={[0, uH - t / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, t / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[uW, t, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[-uW / 2 + t / 2, uH / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[uW / 2 - t / 2, uH / 2, 0]} material={uMat} castShadow>
                  <boxGeometry args={[t, uH - t * 2, uD]} />
                  <Edges threshold={15} color={isSelected ? "#38bdf8" : edgeColor} />
                </mesh>
                <mesh position={[0, uH / 2, -uD / 2 + 0.005]} material={uMat}>
                  <boxGeometry args={[uW - t * 2, uH - t * 2, 0.01]} />
                  <Edges threshold={15} color={edgeColor} />
                </mesh>

                {/* Wall Internal Shelves */}
                {unit.internalShelves > 0 &&
                  Array.from({ length: unit.internalShelves }).map((_, si) => {
                    const shelfSpacing = innerH / (unit.internalShelves + 1);
                    return (
                      <mesh key={`wallShelf-${si}`} position={[0, t + (si + 1) * shelfSpacing, 0]} material={uMat}>
                        <boxGeometry args={[uW - t * 2, t, uD - 0.03]} />
                        <Edges threshold={15} color={edgeColor} />
                      </mesh>
                    );
                  })}

                {/* Wall Doors */}
                {unit.doorType !== "none" && (
                  <group>
                    {unit.doorType === "singleLeft" ? (
                      <group position={[-uW / 2 + 0.004, uH / 2, uD / 2]} rotation={[0, -unitDoorAngle, 0]}>
                        <mesh position={[(uW - 0.008) / 2, 0, 0.009]} material={uMat} castShadow>
                          <boxGeometry args={[uW - 0.008, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([uW - 0.04, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : unit.doorType === "singleRight" ? (
                      <group position={[uW / 2 - 0.004, uH / 2, uD / 2]} rotation={[0, unitDoorAngle, 0]}>
                        <mesh position={[-(uW - 0.008) / 2, 0, 0.009]} material={uMat} castShadow>
                          <boxGeometry args={[uW - 0.008, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([-uW + 0.04, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : unit.doorType === "flipUp" ? (
                      <group position={[0, uH - 0.004, uD / 2]} rotation={[-unitDoorAngle, 0, 0]}>
                        <mesh position={[0, -innerH / 2, 0.009]} material={uMat} castShadow>
                          <boxGeometry args={[uW - 0.008, innerH, 0.018]} />
                          <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                        </mesh>
                        {renderHandle([0, -innerH + 0.04, 0.02], false, 0, unit.handleType, unit.handleFinish)}
                      </group>
                    ) : (
                      // Double Doors
                      <group>
                        <group position={[-uW / 2 + 0.004, uH / 2, uD / 2]} rotation={[0, -unitDoorAngle, 0]}>
                          <mesh position={[(uW / 2 - 0.006) / 2, 0, 0.009]} material={uMat} castShadow>
                            <boxGeometry args={[uW / 2 - 0.006, innerH, 0.018]} />
                            <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                          </mesh>
                          {renderHandle([uW / 2 - 0.035, -innerH * 0.25, 0.02], true, 0, unit.handleType, unit.handleFinish)}
                        </group>
                        <group position={[uW / 2 - 0.004, uH / 2, uD / 2]} rotation={[0, unitDoorAngle, 0]}>
                          <mesh position={[-(uW / 2 - 0.006) / 2, 0, 0.009]} material={uMat} castShadow>
                            <boxGeometry args={[uW / 2 - 0.006, innerH, 0.018]} />
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
    const rows = internalShelves === 0 ? 0 : Math.max(1, Math.min(6, internalShelves ?? 3));
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

        {/* Internal Vertical Divider Columns (Interactive & Movable) */}
        {cols > 1 &&
          Array.from({ length: cols - 1 }).map((_, ci) => {
            const colOffset = (shelfColumnOffsets?.[ci] ?? 0) / 1000;
            const baseDivX = -w / 2 + t + (ci + 1) * (bayW + t) - t / 2;
            const divX = baseDivX + colOffset;
            const isDivSelected =
              selectedDivision?.unitId === "shelf" &&
              selectedDivision?.type === "partition" &&
              selectedDivision?.index === ci;

            return (
              <group key={`shelfCol-${ci}`}>
                <mesh
                  position={[divX, h / 2, 0]}
                  castShadow
                  receiveShadow
                  material={mainMaterial}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDivision?.({ unitId: "shelf", type: "partition", index: ci });
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    document.body.style.cursor = "pointer";
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "default";
                  }}
                >
                  <boxGeometry args={[t, h - t * 2, d]} />
                  <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                  {isDivSelected && (
                    <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                  )}
                </mesh>
                {isDivSelected && (
                  <Html position={[divX, h / 2 + 0.12, d / 2 + 0.04]} center zIndexRange={[100, 0]}>
                    <div
                      style={{
                        background: "rgba(14, 16, 22, 0.95)",
                        border: "1px solid #f59e0b",
                        borderRadius: "5px",
                        padding: "3px 8px",
                        color: "#fbbf24",
                        fontSize: "11px",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
                        pointerEvents: "none",
                      }}
                    >
                      Divider {ci + 1} ({Math.round(colOffset * 1000)}mm)
                    </div>
                  </Html>
                )}
              </group>
            );
          })}

        {/* Horizontal Shelf Tiers per Column (Interactive & Movable) */}
        {Array.from({ length: cols }).map((_, ci) => {
          const colX = -w / 2 + t + bayW / 2 + ci * (bayW + t);
          const isOffset = shelfLayout === "staggered" && ci % 2 === 1;
          const tierHeight = (h - t * 2) / (rows + 1);

          return (
            <group key={`colShelves-${ci}`}>
              {Array.from({ length: rows }).map((_, ri) => {
                const rowOffset = (shelfRowOffsets?.[ri] ?? 0) / 1000;
                const baseShelfY =
                  t + (ri + 1) * tierHeight + (isOffset ? tierHeight * 0.35 : 0);
                const shelfY = baseShelfY + rowOffset;
                if (shelfY >= h - t - 0.03 || shelfY <= t + 0.03) return null;

                const isDivSelected =
                  selectedDivision?.unitId === "shelf" &&
                  selectedDivision?.type === "shelf" &&
                  selectedDivision?.index === ri;

                return (
                  <group key={`shelf-${ci}-${ri}`}>
                    <mesh
                      position={[colX, shelfY, 0]}
                      castShadow
                      receiveShadow
                      material={mainMaterial}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectDivision?.({ unitId: "shelf", type: "shelf", index: ri, colIndex: ci });
                      }}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = "pointer";
                      }}
                      onPointerOut={() => {
                        document.body.style.cursor = "default";
                      }}
                    >
                      <boxGeometry args={[bayW, t, d]} />
                      <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                      {isDivSelected && (
                        <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                      )}
                    </mesh>
                    {isDivSelected && ci === 0 && (
                      <Html position={[0, shelfY + 0.06, d / 2 + 0.04]} center zIndexRange={[100, 0]}>
                        <div
                          style={{
                            background: "rgba(14, 16, 22, 0.95)",
                            border: "1px solid #f59e0b",
                            borderRadius: "5px",
                            padding: "3px 8px",
                            color: "#fbbf24",
                            fontSize: "11px",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            boxShadow: "0 4px 15px rgba(0,0,0,0.6)",
                            pointerEvents: "none",
                          }}
                        >
                          Shelf {ri + 1} ({Math.round(rowOffset * 1000)}mm)
                        </div>
                      </Html>
                    )}
                  </group>
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
    const plinthH = baseType === "floating" ? 0 : (plinthHeight ?? 80) / 1000;
    const plinthRec = (plinthRecess ?? 30) / 1000;
    const wardrobeD = (depth || 600) / 1000;

    return (
      <group>
        {/* Wardrobe Base: Continuous Plinth / Corner Feet Base */}
        {mainUnits.length > 0 && plinthH > 0 && (
          <group>
            {baseType === "plinth" ? (
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
            ) : baseType === "legs" ? (
              <group>
                {(() => {
                  let legRunX = mainStartLeftX;
                  return mainUnits.map((u, ui) => {
                    const uW = u.width / 1000;
                    const uD = wardrobeD;
                    const cx = legRunX + uW / 2;
                    legRunX += uW;
                    const legInsetX = 0.05;
                    const legInsetZFront = plinthRec + 0.02;
                    const legInsetZBack = 0.05;
                    const legPositions: [number, number][] = [
                      [-uW / 2 + legInsetX, uD / 2 - legInsetZFront],
                      [uW / 2 - legInsetX, uD / 2 - legInsetZFront],
                      [-uW / 2 + legInsetX, -uD / 2 + legInsetZBack],
                      [uW / 2 - legInsetX, -uD / 2 + legInsetZBack],
                    ];
                    return (
                      <group key={`wardLegs-${ui}`} position={[cx, 0, 0]}>
                        {legPositions.map(([lx, lz], li) => (
                          <group key={`wardLeg-${ui}-${li}`} position={[lx, 0, lz]}>
                            <mesh position={[0, plinthH / 2, 0]} material={chromeMaterial} castShadow>
                              <cylinderGeometry args={[0.022, 0.022, plinthH, 16]} />
                            </mesh>
                            <mesh position={[0, 0.005, 0]} material={chromeMaterial}>
                              <cylinderGeometry args={[0.028, 0.028, 0.01, 16]} />
                            </mesh>
                          </group>
                        ))}
                      </group>
                    );
                  });
                })()}
              </group>
            ) : null}
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
                  handleHoverWardrobe(unit.id);
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  handleLeaveWardrobe();
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

                {/* Optional Internal Vertical Divider (Interactive) */}
                {unit.hasInternalDivider && (() => {
                  const isPartSelected =
                    selectedDivision?.unitId === unit.id &&
                    selectedDivision?.type === "partition";
                  return (
                    <group position={[0, uH / 2, 0]}>
                      <mesh
                        material={mainMaterial}
                        castShadow
                        onClick={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            onSelectDivision?.({ unitId: unit.id, type: "partition", index: 0 });
                          }
                        }}
                        onPointerOver={(e) => {
                          if (activeTool === "select-division") {
                            e.stopPropagation();
                            document.body.style.cursor = "pointer";
                          }
                        }}
                        onPointerOut={() => {
                          document.body.style.cursor = "default";
                        }}
                      >
                        <boxGeometry args={[t, uH - t * 2, innerD]} />
                        <Edges threshold={15} color={isPartSelected ? "#f59e0b" : edgeColor} />
                        {isPartSelected && (
                          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                        )}
                      </mesh>
                      {isPartSelected && (
                        <Html position={[0, 0.05, innerD * 0.4]} center>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveDivision?.({ unitId: unit.id, type: "partition", index: 0 });
                            }}
                            style={{
                              background: "linear-gradient(135deg, #ef4444, #dc2626)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.4)",
                              borderRadius: "5px",
                              padding: "3px 8px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 12px rgba(220,38,38,0.6)",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            🗑️ Delete Partition
                          </button>
                        </Html>
                      )}
                    </group>
                  );
                })()}

                {/* Internal Shelves (Interactive in Division Mode) */}
                {(unit.internalShelves ?? 0) > 0 && (
                  <group>
                    {Array.from({ length: unit.internalShelves ?? 0 }).map((_, si) => {
                      const count = unit.internalShelves ?? 0;
                      const startY = t + totalDrawerHeight;
                      const availH = uH - t - startY;
                      const shelfY = startY + (availH / (count + 1)) * (si + 1);
                      const shelfW = unit.hasInternalDivider ? (uW - t * 3) / 2 : (uW - t * 2);
                      const shelfX = unit.hasInternalDivider ? uW / 4 : 0;
                      const isDivSelected =
                        selectedDivision?.unitId === unit.id &&
                        selectedDivision?.type === "shelf" &&
                        selectedDivision?.index === si;

                      return (
                        <group key={`wardrobeShelf-${si}`} position={[shelfX, shelfY, 0]}>
                          <mesh
                            material={mainMaterial}
                            castShadow
                            onClick={(e) => {
                              if (activeTool === "select-division") {
                                e.stopPropagation();
                                onSelectDivision?.({ unitId: unit.id, type: "shelf", index: si });
                              }
                            }}
                            onPointerOver={(e) => {
                              if (activeTool === "select-division") {
                                e.stopPropagation();
                                document.body.style.cursor = "pointer";
                              }
                            }}
                            onPointerOut={() => {
                              document.body.style.cursor = "default";
                            }}
                          >
                            <boxGeometry args={[shelfW, t, innerD]} />
                            <Edges threshold={15} color={isDivSelected ? "#f59e0b" : edgeColor} />
                            {isDivSelected && (
                              <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} />
                            )}
                          </mesh>
                          {isDivSelected && (
                            <Html position={[0, 0.04, innerD * 0.4]} center>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveDivision?.({ unitId: unit.id, type: "shelf", index: si });
                                }}
                                style={{
                                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                                  color: "#fff",
                                  border: "1px solid rgba(255,255,255,0.4)",
                                  borderRadius: "5px",
                                  padding: "3px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  boxShadow: "0 4px 12px rgba(220,38,38,0.6)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🗑️ Delete Shelf {si + 1}
                              </button>
                            </Html>
                          )}
                        </group>
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
                          {unit.handleType === "cncJProfile" ? (
                            <CncDoorMesh
                              width={uW - 0.006}
                              height={dh - 0.005}
                              thickness={0.018}
                              material={mainMaterial}
                              edgeColor={isSelected ? "#60a5fa" : edgeColor}
                            />
                          ) : (
                            <mesh material={mainMaterial} castShadow>
                              <boxGeometry args={[uW - 0.006, dh - 0.005, 0.018]} />
                              <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                            </mesh>
                          )}
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
                        {/* Upper dual-guide aluminum track */}
                        <mesh position={[0, doorAreaH / 2 + 0.012, 0.025]} material={chromeMaterial}>
                          <boxGeometry args={[uW + 0.002, 0.024, 0.068]} />
                        </mesh>
                        {/* Lower dual-guide aluminum track */}
                        <mesh position={[0, -doorAreaH / 2 - 0.012, 0.025]} material={chromeMaterial}>
                          <boxGeometry args={[uW + 0.002, 0.020, 0.068]} />
                        </mesh>

                        {/* 
                          SLIDING DOOR BYPASS MECHANICS:
                          - Distinct Z-positions: Rear track Z = 0.010, Front track Z = 0.040 (12mm clearance gap)
                          - Panel 1 (Left / Rear track) is parked at X = -uW/4
                          - Panel 2 (Right / Front track) starts at X = +uW/4 and slides smoothly in front of Panel 1 toward -uW/4
                          - Sliding occurs near/alongside the other door, NEVER into empty space!
                        */}
                        {(() => {
                          const panelW = uW / 2 + 0.025;
                          const panelH = doorAreaH - 0.008;
                          // Slide Door 2 from +uW/4 towards -uW/4
                          const slideOffset = -(uW / 2) * (doorOpenPercent / 100);
                          const hasMirrorOnDoor = unit.hasMirror;
                          return (
                            <group>
                              {/* Sliding Door Panel 1 (Left / Rear track at Z = 0.010) */}
                              <group position={[-uW / 4, 0, 0.010]}>
                                <mesh material={mainMaterial} castShadow>
                                  <boxGeometry args={[panelW, panelH, 0.018]} />
                                  <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                                </mesh>
                                {renderHandle([panelW / 2 - 0.03, 0, 0.011], true, 0, unit.handleType || "edgePull", unit.handleFinish || "black")}
                              </group>

                              {/* Sliding Door Panel 2 (Right / Front track at Z = 0.040) */}
                              <group position={[uW / 4 + slideOffset, 0, 0.040]}>
                                <mesh material={mainMaterial} castShadow>
                                  <boxGeometry args={[panelW, panelH, 0.018]} />
                                  <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                                </mesh>

                                {/* Mirror Option on Front Face */}
                                {hasMirrorOnDoor && (
                                  <group position={[0, 0, 0.010]}>
                                    <mesh material={chromeMaterial}>
                                      <boxGeometry
                                        args={[
                                          unit.mirrorType === "center" ? panelW * 0.75 + 0.01 : panelW - 0.04,
                                          panelH - 0.06,
                                          0.004,
                                        ]}
                                      />
                                    </mesh>
                                    <mesh position={[0, 0, 0.003]} material={mirrorMaterial}>
                                      <boxGeometry
                                        args={[
                                          unit.mirrorType === "center" ? panelW * 0.75 : panelW - 0.06,
                                          panelH - 0.08,
                                          0.003,
                                        ]}
                                      />
                                      <Edges threshold={15} color="#cbd5e1" />
                                    </mesh>
                                  </group>
                                )}

                                {renderHandle([-panelW / 2 + 0.03, 0, 0.011], true, 0, unit.handleType || "edgePull", unit.handleFinish || "black")}
                              </group>
                            </group>
                          );
                        })()}
                      </group>
                    ) : unit.doorType === "hingedSingle" ? (
                      (() => {
                        const angleRad = (doorOpenPercent / 100) * ((85 * Math.PI) / 180);
                        const hasMirrorOnDoor = unit.hasMirror;
                        return (
                          <group position={[-uW / 2, 0, 0]} rotation={[0, -angleRad, 0]}>
                            {unit.handleType === "cncJProfile" ? (
                              <CncDoorMesh
                                width={uW - 0.004}
                                height={doorAreaH}
                                thickness={0.018}
                                material={mainMaterial}
                                edgeColor={isSelected ? "#60a5fa" : edgeColor}
                                position={[uW / 2, 0, 0.009]}
                              />
                            ) : (
                              <mesh position={[uW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                                <boxGeometry args={[uW - 0.004, doorAreaH, 0.018]} />
                                <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                              </mesh>
                            )}

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
                        const angleRad = (doorOpenPercent / 100) * ((85 * Math.PI) / 180);
                        const halfW = uW / 2;
                        const hasMirrorOnDoor = unit.hasMirror;
                        return (
                          <group>
                            {/* Left Door */}
                            <group position={[-halfW, 0, 0]} rotation={[0, -angleRad, 0]}>
                              {unit.handleType === "cncJProfile" ? (
                                <CncDoorMesh
                                  width={halfW - 0.003}
                                  height={doorAreaH}
                                  thickness={0.018}
                                  material={mainMaterial}
                                  edgeColor={isSelected ? "#60a5fa" : edgeColor}
                                  position={[halfW / 2, 0, 0.009]}
                                />
                              ) : (
                                <mesh position={[halfW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                                  <boxGeometry args={[halfW - 0.003, doorAreaH, 0.018]} />
                                  <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                                </mesh>
                              )}
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
                              {unit.handleType === "cncJProfile" ? (
                                <CncDoorMesh
                                  width={halfW - 0.003}
                                  height={doorAreaH}
                                  thickness={0.018}
                                  material={mainMaterial}
                                  edgeColor={isSelected ? "#60a5fa" : edgeColor}
                                  position={[-halfW / 2, 0, 0.009]}
                                />
                              ) : (
                                <mesh position={[-halfW / 2, 0, 0.009]} material={mainMaterial} castShadow>
                                  <boxGeometry args={[halfW - 0.003, doorAreaH, 0.018]} />
                                  <Edges threshold={15} color={isSelected ? "#60a5fa" : edgeColor} />
                                </mesh>
                              )}
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

                {/* INTERACTIVE CAD TOOL PREVIEWS & SNAPPING FOR WARDROBE */}
                {/* Mode 1: Add Section on Hovered Side */}
                {activeTool === "add-base" && (
                  <group>
                    {/* Left Snap Detector */}
                    <mesh
                      position={[-uW / 2, uH / 2, 0]}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredSnap({ unitId: unit.id, side: "left" });
                      }}
                      onPointerOut={() => setHoveredSnap(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAdjacentWardrobeUnit?.(unit.id, "left");
                      }}
                    >
                      <boxGeometry args={[0.2, uH, uD]} />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>

                    {/* Right Snap Detector */}
                    <mesh
                      position={[uW / 2, uH / 2, 0]}
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredSnap({ unitId: unit.id, side: "right" });
                      }}
                      onPointerOut={() => setHoveredSnap(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddAdjacentWardrobeUnit?.(unit.id, "right");
                      }}
                    >
                      <boxGeometry args={[0.2, uH, uD]} />
                      <meshBasicMaterial transparent opacity={0} />
                    </mesh>

                    {/* Ghost Preview Box on Left */}
                    {hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "left" && (
                      <group position={[-uW / 2 - 0.45, uH / 2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.9, uH, uD]} />
                          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} />
                          <Edges threshold={1} color="#38bdf8" />
                        </mesh>
                        <Html position={[0, 0, uD / 2 + 0.05]} center>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddAdjacentWardrobeUnit?.(unit.id, "left");
                            }}
                            style={{
                              background: "#2972f5",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ➕ Place Section Left
                          </div>
                        </Html>
                      </group>
                    )}

                    {/* Ghost Preview Box on Right */}
                    {hoveredSnap?.unitId === unit.id && hoveredSnap?.side === "right" && (
                      <group position={[uW / 2 + 0.45, uH / 2, 0]}>
                        <mesh>
                          <boxGeometry args={[0.9, uH, uD]} />
                          <meshBasicMaterial color="#38bdf8" transparent opacity={0.22} />
                          <Edges threshold={1} color="#38bdf8" />
                        </mesh>
                        <Html position={[0, 0, uD / 2 + 0.05]} center>
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddAdjacentWardrobeUnit?.(unit.id, "right");
                            }}
                            style={{
                              background: "#2972f5",
                              color: "#fff",
                              padding: "4px 9px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              boxShadow: "0 4px 14px rgba(41,114,245,0.7)",
                              border: "1px solid rgba(255,255,255,0.3)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ➕ Place Section Right
                          </div>
                        </Html>
                      </group>
                    )}
                  </group>
                )}

                {/* Mode 2: Vertical Division on Hover */}
                {activeTool === "add-v-division" && isHovered && (
                  <group>
                    <mesh position={[0, uH / 2, 0]}>
                      <boxGeometry args={[0.018, uH - t * 2, innerD]} />
                      <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
                      <Edges threshold={1} color="#38bdf8" />
                    </mesh>
                    <Html position={[0, uH + 0.04, uD / 2]} center>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddDivision?.(unit.id, "vertical");
                        }}
                        style={{
                          background: "linear-gradient(135deg, #0284c7, #2563eb)",
                          color: "#fff",
                          padding: "4px 9px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 700,
                          cursor: "pointer",
                          boxShadow: "0 4px 12px rgba(2,132,199,0.7)",
                          border: "1px solid rgba(255,255,255,0.3)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ➗ Click to Add Vertical Split
                      </div>
                    </Html>
                  </group>
                )}

                {/* Mode 3: Horizontal Division (Shelf) on Hover */}
                {activeTool === "add-h-division" && isHovered && (
                  <group>
                    {(() => {
                      const nextCount = (unit.internalShelves ?? 0) + 1;
                      const startY = t + totalDrawerHeight;
                      const availH = uH - t - startY;
                      const previewY = startY + (availH / (nextCount + 1)) * nextCount;
                      const shelfW = unit.hasInternalDivider ? (uW - t * 3) / 2 : (uW - t * 2);
                      const shelfX = unit.hasInternalDivider ? uW / 4 : 0;
                      return (
                        <group position={[shelfX, previewY, 0]}>
                          <mesh>
                            <boxGeometry args={[shelfW, 0.018, innerD]} />
                            <meshBasicMaterial color="#10b981" transparent opacity={0.6} />
                            <Edges threshold={1} color="#10b981" />
                          </mesh>
                          <Html position={[0, 0.04, uD / 2]} center>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddDivision?.(unit.id, "horizontal");
                              }}
                              style={{
                                background: "linear-gradient(135deg, #059669, #10b981)",
                                color: "#fff",
                                padding: "4px 9px",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                boxShadow: "0 4px 12px rgba(16,185,129,0.7)",
                                border: "1px solid rgba(255,255,255,0.3)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              📚 Click to Add Shelf (#{nextCount})
                            </div>
                          </Html>
                        </group>
                      );
                    })()}
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

      {/* Sleek CAD Dimension Tags with Exact Assembly Bounding Box & Plinth Included */}
      {showDimensions && (() => {
        let totalDimW = width;
        let totalDimH = height;
        let totalDimD = depth;

        if (category === "Cabinet") {
          const kUnits = kitchenUnits && kitchenUnits.length > 0 ? kitchenUnits : [{ width: 600, height: 720, depth: 600, type: "base" }];
          const bUnits = kUnits.filter(u => u.type === "base" || u.type === "corner-base");
          const wUnits = kUnits.filter(u => u.type === "wall");
          const pBaseH = baseType === "floating" ? 0 : (plinthHeight || 80);
          totalDimW = bUnits.length > 0 ? bUnits.reduce((acc, u) => acc + u.width, 0) : 600;
          const maxBaseH = bUnits.length > 0 ? Math.max(...bUnits.map(u => u.height)) : 720;
          const maxWallH = wUnits.length > 0 ? Math.max(...wUnits.map(u => u.height)) : 0;
          totalDimH = pBaseH + maxBaseH + (wUnits.length > 0 ? 550 + maxWallH : 0);
          totalDimD = bUnits.length > 0 ? Math.max(...bUnits.map(u => u.depth)) : 600;
        } else if (category === "Wardrobe") {
          const wUnits = wardrobeUnits && wardrobeUnits.length > 0 ? wardrobeUnits : [{ width: 900, height: 2100, depth: 600, type: "main" }];
          const mUnits = wUnits.filter(u => u.type !== "top");
          const tUnits = wUnits.filter(u => u.type === "top");
          const pWardH = baseType === "floating" ? 0 : (plinthHeight ?? 80);
          totalDimW = mUnits.length > 0 ? mUnits.reduce((acc, u) => acc + u.width, 0) : 900;
          const maxMainH = mUnits.length > 0 ? Math.max(...mUnits.map(u => u.height)) : 2100;
          const maxTopH = tUnits.length > 0 ? Math.max(...tUnits.map(u => u.height)) : 0;
          totalDimH = pWardH + maxMainH + maxTopH;
          totalDimD = depth || 600;
        } else {
          totalDimW = width || 1400;
          totalDimH = height || 750;
          totalDimD = depth || 800;
        }

        const mDimW = totalDimW / 1000;
        const mDimH = totalDimH / 1000;
        const mDimD = totalDimD / 1000;

        return (
          <group>
            {/* Top Width Tag */}
            <Html
              position={[0, mDimH + 0.08, mDimD / 2 + 0.03]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.94)",
                  border: "1px solid rgba(41, 114, 245, 0.7)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  userSelect: "none",
                }}
              >
                W: {Math.round(totalDimW)} mm
              </div>
            </Html>

            {/* Right Height Tag */}
            <Html
              position={[mDimW / 2 + 0.06, mDimH / 2, mDimD / 2 + 0.03]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.94)",
                  border: "1px solid rgba(41, 114, 245, 0.7)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  userSelect: "none",
                }}
              >
                H: {Math.round(totalDimH)} mm
              </div>
            </Html>

            {/* Left Depth Tag */}
            <Html
              position={[-mDimW / 2 - 0.06, 0.05, 0]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: "rgba(13, 13, 18, 0.94)",
                  border: "1px solid rgba(41, 114, 245, 0.7)",
                  borderRadius: "4px",
                  padding: "3px 8px",
                  color: "#93c5fd",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.8)",
                  userSelect: "none",
                }}
              >
                D: {Math.round(totalDimD)} mm
              </div>
            </Html>
          </group>
        );
      })()}
    </group>
  );
}
