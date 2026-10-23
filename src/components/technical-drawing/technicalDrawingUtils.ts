import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit } from "../modeler/FurnitureMesh";

export function getDefaultFabricationNotes(boardThickness = 18, unit: "mm" | "cm" = "mm"): string {
  const thickness = Number.isFinite(boardThickness) ? Math.round(boardThickness) : 18;
  return `${thickness}mm MDF-Lam / melamine-faced board. ABS edge-band exposed edges per panel specification. All dimensions in ${unit}; verify site measurements before manufacture.`;
}

export interface DrawingLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type: "outline" | "interior" | "hidden" | "centerline";
}

export interface DrawingRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: "outline" | "interior" | "hidden" | "panel" | "drawer";
  label?: string;
}

export interface DrawingCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
  type: "interior" | "hidden";
}

export interface DimensionLineData {
  id: string;
  // Dimension line start & end
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  // Measured feature points (witness / extension lines connect from here)
  refX1: number;
  refY1: number;
  refX2: number;
  refY2: number;
  value: number; // in mm
  text: string;
  orientation: "horizontal" | "vertical" | "aligned";
}

export interface ViewGeometry {
  width: number; // bounding box width in mm
  height: number; // bounding box height in mm
  rects: DrawingRect[];
  lines: DrawingLine[];
  circles: DrawingCircle[];
  dimensions: DimensionLineData[];
}

/**
 * Format dimension measurement according to selected unit (mm or cm)
 */
export function formatDim(valueMm: number, unit: "mm" | "cm" = "mm", includeUnit: boolean = false): string {
  if (unit === "cm") {
    const valCm = valueMm / 10;
    const rounded = Number.isInteger(valCm) ? valCm.toString() : valCm.toFixed(1);
    return includeUnit ? `${rounded} cm` : rounded;
  }
  const rounded = Math.round(valueMm);
  return includeUnit ? `${rounded} mm` : rounded.toString();
}

export interface KitchenUnitLayoutItem {
  unit: KitchenCabinetUnit;
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  isCorner: boolean;
  runIndex: number; // 0 = main run along X, 1 = turned run along Z
  rotationY: number; // 0 for Run 0, -Math.PI / 2 for Run 1
}

export interface KitchenDrawingData {
  baseUnits: KitchenCabinetUnit[];
  wallUnits: KitchenCabinetUnit[];
  run0BaseUnits: KitchenCabinetUnit[];
  run1BaseUnits: KitchenCabinetUnit[];
  run0WallUnits: KitchenCabinetUnit[];
  run1WallUnits: KitchenCabinetUnit[];
  cornerBaseUnit?: KitchenCabinetUnit;
  cornerWallUnit?: KitchenCabinetUnit;
  hasCorner: boolean;
  baseLayout: KitchenUnitLayoutItem[];
  wallLayout: KitchenUnitLayoutItem[];
  plinthH: number;
  hasCountertop: boolean;
  countertopThick: number;
  splashH: number;
  run0Width: number;
  run1Depth: number;
  totalBaseW: number;
  totalWallW: number;
  maxBaseH: number;
  maxWallH: number;
  baseDepth: number;
  wallDepth: number;
  totalH: number;
  totalW: number;
  totalD: number;
}

export function getKitchenData(params: FurnitureParams): KitchenDrawingData {
  const units: KitchenCabinetUnit[] = params.kitchenUnits && params.kitchenUnits.length > 0
    ? params.kitchenUnits
    : [
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

  const baseUnits = units.filter((u) => u.type !== "wall" && u.type !== "corner-wall");
  const wallUnits = units.filter((u) => u.type === "wall" || u.type === "corner-wall");
  const plinthH = params.baseType === "floating" ? 0 : (params.plinthHeight ?? 80);
  const hasCountertop = Boolean(params.hasCountertop);
  const countertopThick = hasCountertop ? (params.countertopThickness ?? params.tableTopThickness ?? 30) : 0;
  const wallClearanceUnit = wallUnits.find((u) => u.bottomOffset !== undefined);
  const splashH = wallClearanceUnit?.bottomOffset ?? params.backsplashHeight ?? 600; // Standard 600mm backsplash clearance gap (Turkish standard tezgah arası)

  const STD_BASE_DEPTH = 600;
  const STD_WALL_DEPTH = 350;

  // Layout Base Cabinets (Run 0 along X, 90° Corner unit, Run 1 along Z)
  const baseLayout: KitchenUnitLayoutItem[] = [];
  const run0BaseUnits: KitchenCabinetUnit[] = [];
  const run1BaseUnits: KitchenCabinetUnit[] = [];
  let cornerBaseUnit: KitchenCabinetUnit | undefined = undefined;
  let hasCorner = false;
  let curRun = 0;
  let cursorX = 0;
  let cursorZ = 0;
  let cornerOuterX = 0;
  let cornerW = 900;
  let cornerD = 900;

  for (let i = 0; i < baseUnits.length; i++) {
    const u = baseUnits[i];
    const isCorner = u.type === "corner-base" || u.orientation === "corner-right" || u.orientation === "corner-left";
    const uW = u.width || (isCorner ? 900 : 600);
    const uH = u.height || 720;
    const uD = isCorner ? (u.depth || 900) : (u.depth || STD_BASE_DEPTH);

    if (!isCorner && curRun === 0) {
      run0BaseUnits.push(u);
      baseLayout.push({
        unit: u,
        x: cursorX,
        y: plinthH,
        z: 0,
        width: uW,
        height: uH,
        depth: uD,
        isCorner: false,
        runIndex: 0,
        rotationY: 0,
      });
      cursorX += uW;
    } else if (isCorner) {
      hasCorner = true;
      cornerBaseUnit = u;
      cornerW = uW;
      cornerD = uD;
      cornerOuterX = cursorX + cornerW;
      baseLayout.push({
        unit: u,
        x: cursorX,
        y: plinthH,
        z: 0,
        width: cornerW,
        height: uH,
        depth: cornerD,
        isCorner: true,
        runIndex: 0,
        rotationY: 0,
      });
      curRun = 1;
      cursorZ = cornerD; // run 1 starts after the corner unit depth along Z
    } else if (!isCorner && curRun === 1) {
      run1BaseUnits.push(u);
      baseLayout.push({
        unit: u,
        x: cornerOuterX - uD,
        y: plinthH,
        z: cursorZ,
        width: uW,
        height: uH,
        depth: uD,
        isCorner: false,
        runIndex: 1,
        rotationY: -Math.PI / 2,
      });
      cursorZ += uW;
    }
  }

  const run0Width = hasCorner ? cornerOuterX : (cursorX || 600);
  const run1Depth = hasCorner ? (cursorZ || cornerD) : STD_BASE_DEPTH;

  // Layout Wall Cabinets (Run 0 along X, 90° Corner unit, Run 1 along Z)
  const standardBaseUnits = baseUnits.filter((u) => u.type !== "tall" && u.type !== "fridge");
  const maxBaseH = standardBaseUnits.length > 0 ? Math.max(...standardBaseUnits.map((u) => u.height)) : 720;
  const maxWallH = wallUnits.length > 0 ? Math.max(...wallUnits.map((u) => u.height)) : 720;

  const wallLayout: KitchenUnitLayoutItem[] = [];
  const run0WallUnits: KitchenCabinetUnit[] = [];
  const run1WallUnits: KitchenCabinetUnit[] = [];
  let cornerWallUnit: KitchenCabinetUnit | undefined = undefined;
  let wallCurRun = 0;
  let wallCursorX = 0;
  let wallCursorZ = 0;

  for (let i = 0; i < wallUnits.length; i++) {
    const u = wallUnits[i];
    const isCornerWall = u.type === "corner-wall";
    const isRun1Explicit = u.runAxis === "run1";
    if (isRun1Explicit && wallCurRun === 0) {
      wallCurRun = 1;
      if (wallCursorZ === 0) {
        wallCursorZ = hasCorner ? cornerD : STD_WALL_DEPTH;
      }
    }
    const uW = u.width || (isCornerWall ? 600 : 600);
    const uH = u.height || 720;
    const uD = isCornerWall ? (u.depth || 600) : (u.depth || STD_WALL_DEPTH);
    const clearance = u.bottomOffset !== undefined ? u.bottomOffset : splashH;
    const wuY = plinthH + maxBaseH + countertopThick + clearance;

    if (!isCornerWall && wallCurRun === 0) {
      run0WallUnits.push(u);
      wallLayout.push({
        unit: u,
        x: wallCursorX,
        y: wuY,
        z: 0,
        width: uW,
        height: uH,
        depth: uD,
        isCorner: false,
        runIndex: 0,
        rotationY: 0,
      });
      wallCursorX += uW;
    } else if (isCornerWall) {
      cornerWallUnit = u;
      const cornerWallOuterX = hasCorner ? cornerOuterX : (wallCursorX + uW);
      wallLayout.push({
        unit: u,
        x: cornerWallOuterX - uW,
        y: wuY,
        z: 0,
        width: uW,
        height: uH,
        depth: uD,
        isCorner: true,
        runIndex: 0,
        rotationY: 0,
      });
      wallCurRun = 1;
      wallCursorZ = uD;
    } else if (!isCornerWall && wallCurRun === 1) {
      run1WallUnits.push(u);
      const wallXPos = hasCorner ? (cornerOuterX - uD) : (wallCursorX > 0 ? wallCursorX - uD : 0);
      wallLayout.push({
        unit: u,
        x: wallXPos,
        y: wuY,
        z: wallCursorZ,
        width: uW,
        height: uH,
        depth: uD,
        isCorner: false,
        runIndex: 1,
        rotationY: -Math.PI / 2,
      });
      wallCursorZ += uW;
    }
  }

  const totalBaseW = run0Width;
  const totalWallW = wallCursorX || run0Width;
  const baseDepth = STD_BASE_DEPTH;
  const wallDepth = STD_WALL_DEPTH;
  const totalH = plinthH + maxBaseH + countertopThick + (wallUnits.length > 0 ? splashH + maxWallH : 0);
  const totalW = Math.max(run0Width, 600);
  const totalD = hasCorner
    ? Math.max(run1Depth + (hasCountertop ? 20 : 0), STD_BASE_DEPTH + (hasCountertop ? 20 : 0))
    : (STD_BASE_DEPTH + (hasCountertop ? 20 : 0));

  return {
    baseUnits,
    wallUnits,
    run0BaseUnits,
    run1BaseUnits,
    run0WallUnits,
    run1WallUnits,
    cornerBaseUnit,
    cornerWallUnit,
    hasCorner,
    baseLayout,
    wallLayout,
    plinthH,
    hasCountertop,
    countertopThick,
    splashH,
    run0Width,
    run1Depth,
    totalBaseW,
    totalWallW,
    maxBaseH,
    maxWallH,
    baseDepth,
    wallDepth,
    totalH,
    totalW,
    totalD,
  };
}

export interface WardrobeDrawingData {
  mainUnits: WardrobeUnit[];
  topUnits: WardrobeUnit[];
  plinthH: number;
  totalW: number;
  maxMainH: number;
  maxTopH: number;
  totalH: number;
  depth: number;
}

export function getWardrobeData(params: FurnitureParams): WardrobeDrawingData {
  const rawUnits: WardrobeUnit[] = params.wardrobeUnits && params.wardrobeUnits.length > 0
    ? params.wardrobeUnits
    : [
      {
        id: "wardrobe-1",
        name: "Wardrobe 1",
        type: "main",
        width: 900,
        height: 2100,
        depth: 600,
        doorType: "sliding",
        internalShelves: 1,
        hasDrawers: true,
        drawerCount: 2,
        hasClothesHangerRail: true,
        hasInternalDivider: false,
      },
    ];

  const mainUnits = rawUnits.filter((u) => u.type !== "top");
  const topUnits = rawUnits.filter((u) => u.type === "top");
  const plinthH = params.baseType === "floating" ? 0 : (params.plinthHeight ?? 80);

  const totalW = mainUnits.reduce((acc, u) => acc + u.width, 0);
  const maxMainH = mainUnits.length > 0 ? Math.max(...mainUnits.map((u) => u.height)) : 2100;
  const maxTopH = topUnits.length > 0 ? Math.max(...topUnits.map((u) => u.height)) : 0;
  const totalH = plinthH + maxMainH + maxTopH;
  const depth = mainUnits[0]?.depth || 600;

  return {
    mainUnits,
    topUnits,
    plinthH,
    totalW,
    maxMainH,
    maxTopH,
    totalH,
    depth,
  };
}

/**
 * 1. FRONT ELEVATION VIEW (Doors Hidden: Shows internal carcass joinery, shelves, partitions)
 */
export function generateFrontElevation(params: FurnitureParams, unit: "mm" | "cm" = "mm"): ViewGeometry {
  const rects: DrawingRect[] = [];
  const lines: DrawingLine[] = [];
  const circles: DrawingCircle[] = [];
  const dimensions: DimensionLineData[] = [];

  const t = params.boardThickness || 18;

  if (params.category === "Cabinet") {
    const kd = getKitchenData(params);

    // Continuous Plinth / Toe Kick
    if (kd.plinthH > 0 && kd.run0Width > 0) {
      rects.push({
        id: "plinth-front",
        x: 0,
        y: 0,
        width: kd.run0Width,
        height: kd.plinthH,
        type: "outline",
      });
    }

    // Base Cabinets on Front Facade (Run 0 base units + Corner base unit)
    const frontBaseUnits = [...kd.run0BaseUnits, ...(kd.cornerBaseUnit ? [kd.cornerBaseUnit] : [])];
    let curX = 0;
    frontBaseUnits.forEach((u, uIdx) => {
      const uY = kd.plinthH;
      const isCorner = u.type === "corner-base" || u.orientation === "corner-right" || u.orientation === "corner-left";
      const uW = u.width;
      const uH = u.height;

      // Outer Carcass
      rects.push({
        id: `base-carcass-${uIdx}`,
        x: curX,
        y: uY,
        width: uW,
        height: uH,
        type: "outline",
      });
      // Left Gable
      rects.push({
        id: `base-leftGable-${uIdx}`,
        x: curX,
        y: uY,
        width: t,
        height: uH,
        type: "interior",
      });
      // Right Gable
      rects.push({
        id: `base-rightGable-${uIdx}`,
        x: curX + uW - t,
        y: uY,
        width: t,
        height: uH,
        type: "interior",
      });
      // Bottom Panel (omitted for floor-sitting appliances / fridge / dishwasher)
      if (!u.hasNoBottom && u.type !== "fridge" && u.type !== "dishwasher") {
        rects.push({
          id: `base-bottomPanel-${uIdx}`,
          x: curX + t,
          y: uY,
          width: uW - t * 2,
          height: t,
          type: "interior",
        });
      }
      // Top Rail / Panel
      rects.push({
        id: `base-topPanel-${uIdx}`,
        x: curX + t,
        y: uY + uH - t,
        width: uW - t * 2,
        height: t,
        type: "interior",
      });

      if (isCorner) {
        // Corner unit interior: return partition / blank panel demarcation line
        const armD = u.cornerDepth || 600;
        const returnPartX = curX + (uW - armD);
        rects.push({
          id: `base-corner-part-${uIdx}`,
          x: returnPartX,
          y: uY + t,
          width: t,
          height: uH - t * 2,
          type: "interior",
        });
        // Internal corner shelf across front arm
        rects.push({
          id: `base-corner-shelf-${uIdx}`,
          x: curX + t,
          y: uY + uH / 2,
          width: uW - t * 2,
          height: t,
          type: "interior",
        });
      } else if (u.drawerCount > 0) {
        const dCount = u.drawerCount;
        const dH = (uH - t * 2) / dCount;
        const curDoorStyle = u.doorStyle || "slab";
        for (let di = 0; di < dCount; di++) {
          const dx = curX + t + 2;
          const dy = uY + t + di * dH + 2;
          const dw = uW - t * 2 - 4;
          const dh = dH - 4;
          rects.push({
            id: `base-drawer-${uIdx}-${di}`,
            x: dx,
            y: dy,
            width: dw,
            height: dh,
            type: "drawer",
          });
          if (curDoorStyle === "slimShaker" || curDoorStyle === "framedGlass") {
            const inset = Math.min(22, dw * 0.25, dh * 0.25);
            rects.push({
              id: `base-drawer-frame-${uIdx}-${di}`,
              x: dx + inset,
              y: dy + inset,
              width: dw - inset * 2,
              height: dh - inset * 2,
              type: "interior",
            });
          } else if (curDoorStyle === "shaker") {
            const inset = Math.min(60, dw * 0.3, dh * 0.3);
            rects.push({
              id: `base-drawer-frame-${uIdx}-${di}`,
              x: dx + inset,
              y: dy + inset,
              width: dw - inset * 2,
              height: dh - inset * 2,
              type: "interior",
            });
          } else if (curDoorStyle === "fluted") {
            const border = Math.min(25, dw * 0.2);
            const innerW = dw - border * 2;
            if (innerW > 25) {
              const numLines = Math.min(6, Math.max(3, Math.floor(innerW / 35)));
              const step = innerW / (numLines + 1);
              for (let li = 1; li <= numLines; li++) {
                const lx = dx + border + li * step;
                lines.push({
                  id: `base-drawer-flute-${uIdx}-${di}-${li}`,
                  x1: lx,
                  y1: dy + 4,
                  x2: lx,
                  y2: dy + dh - 4,
                  type: "interior",
                });
              }
            }
          }
        }
      } else if (u.internalShelves > 0) {
        const sCount = u.internalShelves;
        const sGap = (uH - t * 2 - sCount * t) / (sCount + 1);
        for (let si = 0; si < sCount; si++) {
          const sy = uY + t + (si + 1) * sGap + si * t;
          rects.push({
            id: `base-shelf-${uIdx}-${si}`,
            x: curX + t,
            y: sy,
            width: uW - t * 2,
            height: t,
            type: "interior",
          });
        }
      }

      // Unit Width Dimension - ONLY if there are multiple units on the front facade
      if (frontBaseUnits.length > 1) {
        dimensions.push({
          id: `dim-unit-w-${uIdx}`,
          x1: curX,
          y1: -35,
          x2: curX + uW,
          y2: -35,
          refX1: curX,
          refY1: 0,
          refX2: curX + uW,
          refY2: 0,
          value: uW,
          text: formatDim(uW, unit),
          orientation: "horizontal",
        });
      }

      curX += uW;
    });

    // Countertop Slabs (segmented: skips tall units, fridges, and units with hasNoCountertop)
    const ctY = kd.plinthH + kd.maxBaseH;
    if (kd.hasCountertop && kd.countertopThick > 0) {
      let segStartX: number | null = null;
      let segEndX = 0;
      let runningX = 0;
      frontBaseUnits.forEach((u, idx) => {
        const needsCt = !u.hasNoCountertop && u.type !== "tall" && u.type !== "fridge";
        if (needsCt) {
          if (segStartX === null) segStartX = runningX;
          segEndX = runningX + u.width;
        } else {
          if (segStartX !== null) {
            const leftOverhang = segStartX === 0 ? 10 : 0;
            rects.push({
              id: `countertop-front-${idx}`,
              x: segStartX - leftOverhang,
              y: ctY,
              width: (segEndX - segStartX) + leftOverhang,
              height: kd.countertopThick,
              type: "outline",
            });
            segStartX = null;
          }
        }
        runningX += u.width;
      });
      if (segStartX !== null) {
        const leftOverhang = segStartX === 0 ? 10 : 0;
        const rightOverhang = segEndX >= kd.run0Width - 1 ? 10 : 0;
        rects.push({
          id: "countertop-front-end",
          x: segStartX - leftOverhang,
          y: ctY,
          width: (segEndX - segStartX) + leftOverhang + rightOverhang,
          height: kd.countertopThick,
          type: "outline",
        });
      }
    }

    // Wall Cabinets on Front Facade
    const frontWallUnits = [...kd.run0WallUnits, ...(kd.cornerWallUnit ? [kd.cornerWallUnit] : [])];

    // Optional Backsplash Wall Cladding Panel (covers wall between base/countertop and wall units)
    if (params.hasBacksplash && frontWallUnits.length > 0) {
      const bsY1 = ctY + (kd.hasCountertop ? kd.countertopThick : 0);
      const bsY2 = bsY1 + kd.splashH;
      let runningX = 0;
      let segStartX: number | null = null;
      let segEndX = 0;
      let splashSegIdx = 0;

      kd.run0BaseUnits.forEach((u) => {
        const uHasSplash = u.type !== "tall" && u.type !== "fridge";
        if (uHasSplash) {
          if (segStartX === null) {
            segStartX = runningX;
          }
          segEndX = runningX + u.width;
        } else {
          if (segStartX !== null) {
            rects.push({
              id: `backsplash-front-${++splashSegIdx}`,
              x: segStartX,
              y: bsY1,
              width: segEndX - segStartX,
              height: Math.max(10, bsY2 - bsY1),
              type: "interior",
            });
            segStartX = null;
          }
        }
        runningX += u.width;
      });
      if (segStartX !== null) {
        const cornerExtra = kd.cornerBaseUnit ? kd.cornerBaseUnit.width : 0;
        rects.push({
          id: `backsplash-front-${++splashSegIdx}`,
          x: segStartX,
          y: bsY1,
          width: (segEndX - segStartX) + cornerExtra,
          height: Math.max(10, bsY2 - bsY1),
          type: "interior",
        });
      }
    }

    if (frontWallUnits.length > 0) {
      let curWallX = 0;
      frontWallUnits.forEach((wu, wuIdx) => {
        const wuY = ctY + kd.countertopThick + (wu.bottomOffset !== undefined ? wu.bottomOffset : kd.splashH);
        rects.push({
          id: `wall-carcass-${wuIdx}`,
          x: curWallX,
          y: wuY,
          width: wu.width,
          height: wu.height,
          type: "outline",
        });
        rects.push({
          id: `wall-lgable-${wuIdx}`,
          x: curWallX,
          y: wuY,
          width: t,
          height: wu.height,
          type: "interior",
        });
        rects.push({
          id: `wall-rgable-${wuIdx}`,
          x: curWallX + wu.width - t,
          y: wuY,
          width: t,
          height: wu.height,
          type: "interior",
        });
        rects.push({
          id: `wall-bottom-${wuIdx}`,
          x: curWallX + t,
          y: wuY,
          width: wu.width - t * 2,
          height: t,
          type: "interior",
        });
        rects.push({
          id: `wall-top-${wuIdx}`,
          x: curWallX + t,
          y: wuY + wu.height - t,
          width: wu.width - t * 2,
          height: t,
          type: "interior",
        });
        if (wu.internalShelves > 0) {
          const sGap = (wu.height - t * 2 - wu.internalShelves * t) / (wu.internalShelves + 1);
          for (let si = 0; si < wu.internalShelves; si++) {
            rects.push({
              id: `wall-shelf-${wuIdx}-${si}`,
              x: curWallX + t,
              y: wuY + t + (si + 1) * sGap + si * t,
              width: wu.width - t * 2,
              height: t,
              type: "interior",
            });
          }
        }
        curWallX += wu.width;
      });
    }

    // Overall Total Width Dimension
    const totalWDimY = frontBaseUnits.length > 1 ? -85 : -40;
    dimensions.push({
      id: "dim-total-w",
      x1: 0,
      y1: totalWDimY,
      x2: kd.run0Width,
      y2: totalWDimY,
      refX1: 0,
      refY1: 0,
      refX2: kd.run0Width,
      refY2: 0,
      value: kd.run0Width,
      text: formatDim(kd.run0Width, unit, true),
      orientation: "horizontal",
    });

    // Overall Height Dimension (Right side)
    dimensions.push({
      id: "dim-total-h",
      x1: kd.run0Width + 35,
      y1: 0,
      x2: kd.run0Width + 35,
      y2: kd.totalH,
      refX1: kd.run0Width,
      refY1: 0,
      refX2: kd.run0Width,
      refY2: kd.totalH, // Fixed: was 0 causing diagonal crooked witness line
      value: kd.totalH,
      text: formatDim(kd.totalH, unit, true),
      orientation: "vertical",
    });

    if (kd.plinthH > 0) {
      dimensions.push({
        id: "dim-plinth-h",
        x1: -32,
        y1: 0,
        x2: -32,
        y2: kd.plinthH,
        refX1: 0,
        refY1: 0,
        refX2: 0,
        refY2: kd.plinthH,
        value: kd.plinthH,
        text: formatDim(kd.plinthH, unit),
        orientation: "vertical",
      });
    }

    return {
      width: kd.run0Width,
      height: kd.totalH,
      rects,
      lines,
      circles,
      dimensions,
    };
  }

  if (params.category === "Wardrobe") {
    const rawUnits = params.wardrobeUnits && params.wardrobeUnits.length > 0
      ? params.wardrobeUnits
      : [{ id: "wardrobe-1", name: "Wardrobe 1", type: "main" as const, width: 900, height: 2100, depth: 600, doorType: "sliding" as const, internalShelves: 1, hasDrawers: true, drawerCount: 2, hasClothesHangerRail: true, hasInternalDivider: false }];

    const mainUnits = rawUnits.filter(u => u.type !== "top");
    const topUnits = rawUnits.filter(u => u.type === "top");
    const plinthH = params.baseType === "floating" ? 0 : (params.plinthHeight ?? 80);

    const totalW = mainUnits.reduce((acc, u) => acc + u.width, 0);
    const maxMainH = mainUnits.length > 0 ? Math.max(...mainUnits.map(u => u.height)) : 2100;
    const maxTopH = topUnits.length > 0 ? Math.max(...topUnits.map(u => u.height)) : 0;
    const totalH = plinthH + maxMainH + maxTopH;

    // Plinth
    if (plinthH > 0 && totalW > 0) {
      rects.push({
        id: "ward-plinth",
        x: 0,
        y: 0,
        width: totalW,
        height: plinthH,
        type: "outline",
      });
    }

    // Main Sections (Doors Hidden)
    let curX = 0;
    mainUnits.forEach((u, idx) => {
      const uY = plinthH;
      // Outer carcass
      rects.push({
        id: `ward-carcass-${idx}`,
        x: curX,
        y: uY,
        width: u.width,
        height: u.height,
        type: "outline",
      });
      // Gables
      rects.push({ id: `ward-lgable-${idx}`, x: curX, y: uY, width: t, height: u.height, type: "interior" });
      rects.push({ id: `ward-rgable-${idx}`, x: curX + u.width - t, y: uY, width: t, height: u.height, type: "interior" });
      rects.push({ id: `ward-bottom-${idx}`, x: curX + t, y: uY, width: u.width - t * 2, height: t, type: "interior" });
      rects.push({ id: `ward-top-${idx}`, x: curX + t, y: uY + u.height - t, width: u.width - t * 2, height: t, type: "interior" });

      // 1. Drawers (for both externalBottom and internal)
      let drawerSpaceH = 0;
      const isConcealed = u.drawerType === "internal";
      if (u.hasDrawers && (u.drawerCount || 0) > 0) {
        const dCount = u.drawerCount || 2;
        const dH = u.drawerHeight || 180;
        drawerSpaceH = dH * dCount;

        if (isConcealed) {
          // Side spacer strips (takoz) 25mm each
          const spacerW = 25;
          rects.push({
            id: `ward-drawer-spacer-l-${idx}`,
            x: curX + t,
            y: uY + t,
            width: spacerW,
            height: drawerSpaceH,
            type: "interior",
          });
          rects.push({
            id: `ward-drawer-spacer-r-${idx}`,
            x: curX + u.width - t - spacerW,
            y: uY + t,
            width: spacerW,
            height: drawerSpaceH,
            type: "interior",
          });

          for (let di = 0; di < dCount; di++) {
            rects.push({
              id: `ward-drawer-${idx}-${di}`,
              x: curX + t + spacerW + 2,
              y: uY + t + di * dH + 2,
              width: u.width - t * 2 - spacerW * 2 - 4,
              height: dH - 4,
              type: "drawer",
            });
          }
        } else {
          const curDoorStyle = u.doorStyle || "slab";
          for (let di = 0; di < dCount; di++) {
            const dx = curX + t + 2;
            const dy = uY + t + di * dH + 2;
            const dw = u.width - t * 2 - 4;
            const dh = dH - 4;
            rects.push({
              id: `ward-drawer-${idx}-${di}`,
              x: dx,
              y: dy,
              width: dw,
              height: dh,
              type: "drawer",
            });
            if (curDoorStyle === "slimShaker" || curDoorStyle === "framedGlass") {
              const inset = Math.min(22, dw * 0.25, dh * 0.25);
              rects.push({
                id: `ward-drawer-frame-${idx}-${di}`,
                x: dx + inset,
                y: dy + inset,
                width: dw - inset * 2,
                height: dh - inset * 2,
                type: "interior",
              });
            } else if (curDoorStyle === "shaker") {
              const inset = Math.min(60, dw * 0.3, dh * 0.3);
              rects.push({
                id: `ward-drawer-frame-${idx}-${di}`,
                x: dx + inset,
                y: dy + inset,
                width: dw - inset * 2,
                height: dh - inset * 2,
                type: "interior",
              });
            } else if (curDoorStyle === "fluted") {
              const border = Math.min(25, dw * 0.2);
              const innerW = dw - border * 2;
              if (innerW > 25) {
                const numLines = Math.min(6, Math.max(3, Math.floor(innerW / 35)));
                const step = innerW / (numLines + 1);
                for (let li = 1; li <= numLines; li++) {
                  const lx = dx + border + li * step;
                  lines.push({
                    id: `ward-drawer-flute-${idx}-${di}-${li}`,
                    x1: lx,
                    y1: dy + 4,
                    x2: lx,
                    y2: dy + dh - 4,
                    type: "interior",
                  });
                }
              }
            }
          }
        }

        // Full-width horizontal structural divider board (sabit tabla)
        rects.push({
          id: `ward-drawer-shelf-${idx}`,
          x: curX + t,
          y: uY + t + drawerSpaceH,
          width: u.width - t * 2,
          height: t,
          type: "interior",
        });
      }

      // 2. Vertical Partition & Sub-bays
      const partBottomY = uY + t + drawerSpaceH + (drawerSpaceH > 0 ? t : 0);
      const innerW = u.width - t * 2;
      const minBay = 250;
      const rawOffset = u.partitionOffset || 0;
      const maxOffset = Math.max(0, (innerW - t) / 2 - minBay);
      const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, rawOffset));
      const midX = curX + t + (innerW - t) / 2 + clampedOffset;
      const rightBayW = (innerW - t) / 2 - clampedOffset;

      const topLuggageY = uY + u.height - t - 350;

      if (u.hasInternalDivider) {
        const partTopY = (u.partitionSpan === "underTopShelf") ? topLuggageY : (uY + u.height - t);

        rects.push({
          id: `ward-divider-${idx}`,
          x: midX,
          y: partBottomY,
          width: t,
          height: Math.max(50, partTopY - partBottomY),
          type: "interior",
        });

        if (u.partitionSpan === "underTopShelf") {
          // Top luggage shelf
          rects.push({
            id: `ward-top-luggage-${idx}`,
            x: curX + t,
            y: topLuggageY,
            width: innerW,
            height: t,
            type: "interior",
          });
        }

        // Clothes rail in left sub-bay
        if (u.hasClothesHangerRail) {
          const railY = (u.partitionSpan === "underTopShelf" ? topLuggageY : (uY + u.height - t)) - 80;
          lines.push({
            id: `ward-rail-${idx}`,
            x1: curX + t,
            y1: railY,
            x2: midX,
            y2: railY,
            type: "interior",
          });
          lines.push({
            id: `ward-rail-center-${idx}`,
            x1: curX + t,
            y1: railY + 6,
            x2: midX,
            y2: railY + 6,
            type: "centerline",
          });
        }

        // Shelves in right sub-bay
        if ((u.internalShelves || 0) > 0) {
          const shelfTopLim = (u.partitionSpan === "underTopShelf") ? topLuggageY : (uY + u.height - t);
          const rightAvailH = shelfTopLim - partBottomY;
          const sGap = (rightAvailH - u.internalShelves * t) / (u.internalShelves + 1);

          for (let si = 0; si < u.internalShelves; si++) {
            const shelfOff = u.shelfOffsets?.[si] || 0;
            const sy = partBottomY + (si + 1) * sGap + si * t + shelfOff;
            rects.push({
              id: `ward-shelf-${idx}-${si}`,
              x: midX + t,
              y: sy,
              width: rightBayW,
              height: t,
              type: "interior",
            });
          }
        }
      } else {
        // No vertical partition
        if (u.hasClothesHangerRail) {
          let railY = uY + u.height - t - 90;
          if ((u.internalShelves || 0) >= 1) {
            // Top luggage shelf above rod
            const lugY = uY + u.height - t - 320;
            rects.push({
              id: `ward-top-luggage-${idx}`,
              x: curX + t,
              y: lugY,
              width: innerW,
              height: t,
              type: "interior",
            });
            railY = lugY - 70;

            // Extra shelves below hanging clearance
            const extraCount = u.internalShelves - 1;
            if (extraCount > 0) {
              const lowerTopLim = Math.max(partBottomY, railY - 1050);
              const lowerAvailH = lowerTopLim - partBottomY;
              const sGap = lowerAvailH > 100 ? (lowerAvailH - extraCount * t) / (extraCount + 1) : 0;
              for (let si = 0; si < extraCount; si++) {
                const shelfOff = u.shelfOffsets?.[si + 1] || 0;
                const sy = partBottomY + (si + 1) * sGap + si * t + shelfOff;
                rects.push({
                  id: `ward-shelf-${idx}-${si + 1}`,
                  x: curX + t,
                  y: sy,
                  width: innerW,
                  height: t,
                  type: "interior",
                });
              }
            }
          }

          lines.push({
            id: `ward-rail-${idx}`,
            x1: curX + t,
            y1: railY,
            x2: curX + u.width - t,
            y2: railY,
            type: "interior",
          });
          lines.push({
            id: `ward-rail-center-${idx}`,
            x1: curX + t,
            y1: railY + 6,
            x2: curX + u.width - t,
            y2: railY + 6,
            type: "centerline",
          });
        } else if ((u.internalShelves || 0) > 0) {
          // Standard full-width shelves
          const availH = (uY + u.height - t) - partBottomY;
          const sGap = (availH - u.internalShelves * t) / (u.internalShelves + 1);

          for (let si = 0; si < u.internalShelves; si++) {
            const shelfOff = u.shelfOffsets?.[si] || 0;
            const sy = partBottomY + (si + 1) * sGap + si * t + shelfOff;
            rects.push({
              id: `ward-shelf-${idx}-${si}`,
              x: curX + t,
              y: sy,
              width: innerW,
              height: t,
              type: "interior",
            });
          }
        }
      }

      curX += u.width;
    });

    // Top Units
    let curTopX = 0;
    topUnits.forEach((tu, tidx) => {
      const tuY = plinthH + maxMainH;
      rects.push({ id: `ward-top-carcass-${tidx}`, x: curTopX, y: tuY, width: tu.width, height: tu.height, type: "outline" });
      rects.push({ id: `ward-top-lgable-${tidx}`, x: curTopX, y: tuY, width: t, height: tu.height, type: "interior" });
      rects.push({ id: `ward-top-rgable-${tidx}`, x: curTopX + tu.width - t, y: tuY, width: t, height: tu.height, type: "interior" });
      rects.push({ id: `ward-top-bot-${tidx}`, x: curTopX + t, y: tuY, width: tu.width - t * 2, height: t, type: "interior" });
      rects.push({ id: `ward-top-top-${tidx}`, x: curTopX + t, y: tuY + tu.height - t, width: tu.width - t * 2, height: t, type: "interior" });
      curTopX += tu.width;
    });

    // Dimensions
    dimensions.push({
      id: "ward-dim-w",
      x1: 0,
      y1: -35,
      x2: totalW,
      y2: -35,
      refX1: 0,
      refY1: 0,
      refX2: totalW,
      refY2: 0,
      value: totalW,
      text: formatDim(totalW, unit, true),
      orientation: "horizontal",
    });

    dimensions.push({
      id: "ward-dim-h",
      x1: totalW + 35,
      y1: 0,
      x2: totalW + 35,
      y2: totalH,
      refX1: totalW,
      refY1: 0,
      refX2: totalW,
      refY2: totalH,
      value: totalH,
      text: formatDim(totalH, unit, true),
      orientation: "vertical",
    });

    return {
      width: totalW,
      height: totalH,
      rects,
      lines,
      circles,
      dimensions,
    };
  }

  if (params.category === "Shelf") {
    const W = params.width || 1200;
    const H = params.height || 1800;
    const cols = Math.max(1, Math.min(5, params.internalColumns || 2));
    const rows = params.internalShelves === 0 ? 0 : Math.max(1, Math.min(6, params.internalShelves ?? 3));
    const bayW = (W - (cols + 1) * t) / cols;

    // Outer Gables
    rects.push({ id: "shelf-lgable", x: 0, y: 0, width: t, height: H, type: "outline" });
    rects.push({ id: "shelf-rgable", x: W - t, y: 0, width: t, height: H, type: "outline" });
    // Top & Bottom
    rects.push({ id: "shelf-top", x: t, y: H - t, width: W - t * 2, height: t, type: "outline" });
    rects.push({ id: "shelf-bot", x: t, y: 0, width: W - t * 2, height: t, type: "outline" });

    // Vertical Divider Columns
    if (cols > 1) {
      for (let ci = 0; ci < cols - 1; ci++) {
        const colOffset = (params.shelfColumnOffsets?.[ci] ?? 0);
        const divX = t + (ci + 1) * (bayW + t) - t + colOffset;
        rects.push({
          id: `shelf-col-${ci}`,
          x: divX,
          y: t,
          width: t,
          height: H - t * 2,
          type: "interior",
        });
      }
    }

    // Horizontal Shelf Tiers
    if (rows > 0) {
      const tierH = (H - t * 2) / (rows + 1);
      for (let ci = 0; ci < cols; ci++) {
        const colLeft = t + ci * (bayW + t);
        for (let ri = 0; ri < rows; ri++) {
          const rowOffset = (params.shelfRowOffsets?.[ri] ?? 0);
          const shelfY = t + (ri + 1) * tierH + rowOffset;
          if (shelfY > t + 20 && shelfY < H - t - 20) {
            rects.push({
              id: `shelf-tier-${ci}-${ri}`,
              x: colLeft,
              y: shelfY,
              width: bayW,
              height: t,
              type: "interior",
            });
          }
        }
      }
    }

    dimensions.push({
      id: "shelf-dim-w",
      x1: 0,
      y1: -35,
      x2: W,
      y2: -35,
      refX1: 0,
      refY1: 0,
      refX2: W,
      refY2: 0,
      value: W,
      text: formatDim(W, unit, true),
      orientation: "horizontal",
    });

    dimensions.push({
      id: "shelf-dim-h",
      x1: W + 35,
      y1: 0,
      x2: W + 35,
      y2: H,
      refX1: W,
      refY1: 0,
      refX2: W,
      refY2: H,
      value: H,
      text: formatDim(H, unit, true),
      orientation: "vertical",
    });

    return {
      width: W,
      height: H,
      rects,
      lines,
      circles,
      dimensions,
    };
  }

  // TABLE / DESK
  const W = params.width || 1400;
  const H = params.height || 750;
  const topT = params.tableTopThickness || 25;
  const legThick = params.legThickness || 50;
  const legIns = params.legInset || 25;
  const oHang = params.topOverhang || 25;
  const apronH = params.apronHeight || 65;

  // Tabletop
  rects.push({
    id: "table-top",
    x: 0,
    y: H - topT,
    width: W,
    height: topT,
    type: "outline",
  });

  // Legs
  const legX1 = oHang + legIns;
  const legX2 = W - oHang - legIns - legThick;
  rects.push({ id: "table-leg-l", x: legX1, y: 0, width: legThick, height: H - topT, type: "outline" });
  rects.push({ id: "table-leg-r", x: legX2, y: 0, width: legThick, height: H - topT, type: "outline" });

  // Apron
  rects.push({
    id: "table-apron",
    x: legX1 + legThick,
    y: H - topT - apronH,
    width: legX2 - (legX1 + legThick),
    height: apronH,
    type: "interior",
  });

  // Drawers (if enabled)
  if (params.hasDrawers && (params.drawerCount || 1) > 0) {
    const dCount = Math.min(3, params.drawerCount || 1);
    const span = legX2 - (legX1 + legThick);
    const dW = span / dCount - 10;
    for (let di = 0; di < dCount; di++) {
      rects.push({
        id: `table-drawer-${di}`,
        x: legX1 + legThick + 5 + di * (dW + 10),
        y: H - topT - apronH + 4,
        width: dW,
        height: apronH - 8,
        type: "drawer",
      });
    }
  }

  dimensions.push({
    id: "table-dim-w",
    x1: 0,
    y1: -35,
    x2: W,
    y2: -35,
    refX1: 0,
    refY1: 0,
    refX2: W,
    refY2: 0,
    value: W,
    text: formatDim(W, unit, true),
    orientation: "horizontal",
  });

  dimensions.push({
    id: "table-dim-h",
    x1: W + 35,
    y1: 0,
    x2: W + 35,
    y2: H,
    refX1: W,
    refY1: 0,
    refX2: W,
    refY2: H,
    value: H,
    text: formatDim(H, unit, true),
    orientation: "vertical",
  });

  return {
    width: W,
    height: H,
    rects,
    lines,
    circles,
    dimensions,
  };
}

/**
 * 2. PLAN / TOP VIEW (Doors Hidden: Shows carcase depth, backboard recess, corner returns)
 */
export function generatePlanTopView(params: FurnitureParams, unit: "mm" | "cm" = "mm"): ViewGeometry {
  const rects: DrawingRect[] = [];
  const lines: DrawingLine[] = [];
  const circles: DrawingCircle[] = [];
  const dimensions: DimensionLineData[] = [];
  const t = params.boardThickness || 18;

  if (params.category === "Cabinet") {
    const kd = getKitchenData(params);
    const ctD = kd.hasCountertop ? 620 : kd.baseDepth;

    if (kd.hasCorner) {
      // -----------------------------------------------------------
      // L-SHAPED KITCHEN PLAN VIEW
      // -----------------------------------------------------------
      // 1. L-Shaped Countertop Outline (if enabled)
      if (kd.hasCountertop) {
        // Main Run countertop slab along X (overhang 10mm left, 20mm front)
        rects.push({
          id: "plan-countertop-main",
          x: -10,
          y: 0,
          width: kd.run0Width + 20,
          height: ctD,
          type: "outline",
        });
        // Return Run countertop slab along Z (turned downwards in plan, 10mm bottom overhang)
        const returnSlabH = Math.max(10, kd.run1Depth - ctD + 10);
        rects.push({
          id: "plan-countertop-return",
          x: kd.run0Width - ctD,
          y: ctD,
          width: ctD,
          height: returnSlabH,
          type: "outline",
        });
        // Countertop joint seam (45° miter joint line)
        lines.push({
          id: "plan-countertop-seam",
          x1: kd.run0Width - ctD,
          y1: ctD,
          x2: kd.run0Width,
          y2: 0,
          type: "interior",
        });
      }

      // 2. Base Cabinets Underneath (joinery details)
      // Run 0 Base Units
      const run0Units = kd.baseLayout.filter((item) => !item.isCorner && item.runIndex === 0);
      run0Units.forEach((item, idx) => {
        rects.push({ id: `plan-cab-r0-${idx}`, x: item.x, y: 0, width: item.width, height: item.depth, type: "interior" });
        rects.push({ id: `plan-cab-r0-ls-${idx}`, x: item.x, y: 0, width: t, height: item.depth, type: "interior" });
        rects.push({ id: `plan-cab-r0-rs-${idx}`, x: item.x + item.width - t, y: 0, width: t, height: item.depth, type: "interior" });
        lines.push({ id: `plan-cab-r0-back-${idx}`, x1: item.x + t, y1: 20, x2: item.x + item.width - t, y2: 20, type: "interior" });

        if (run0Units.length > 1) {
          dimensions.push({
            id: `plan-dim-r0-${idx}`,
            x1: item.x,
            y1: -30,
            x2: item.x + item.width,
            y2: -30,
            refX1: item.x,
            refY1: 0,
            refX2: item.x + item.width,
            refY2: 0,
            value: item.width,
            text: formatDim(item.width, unit),
            orientation: "horizontal",
          });
        }
      });

      // 90° Corner Base Unit
      const corItem = kd.baseLayout.find((item) => item.isCorner);
      if (corItem) {
        const corX = corItem.x;
        const armD = corItem.unit.cornerDepth || 600;
        const corW = corItem.width;
        const corD = corItem.depth;
        const frontArmW = corW - armD;

        // L-shaped carcass panels
        rects.push({ id: "plan-cor-arm1", x: corX, y: 0, width: frontArmW, height: armD, type: "interior" });
        rects.push({ id: "plan-cor-arm2", x: corX + frontArmW, y: 0, width: armD, height: corD, type: "interior" });
        rects.push({ id: "plan-cor-ls", x: corX, y: 0, width: t, height: armD, type: "interior" });
        rects.push({ id: "plan-cor-rs", x: corX + corW - t, y: 0, width: t, height: corD, type: "interior" });
        rects.push({ id: "plan-cor-bs", x: corX + frontArmW, y: corD - t, width: armD, height: t, type: "interior" });

        // Wall backboards
        lines.push({ id: "plan-cor-back-x", x1: corX + t, y1: 20, x2: corX + corW - 20, y2: 20, type: "interior" });
        lines.push({ id: "plan-cor-back-z", x1: corX + corW - 20, y1: 20, x2: corX + corW - 20, y2: corD - t, type: "interior" });

        // Bi-fold corner door lines meeting at 90°
        lines.push({ id: "plan-cor-door-x", x1: corX, y1: armD, x2: corX + frontArmW, y2: armD, type: "outline" });
        lines.push({ id: "plan-cor-door-z", x1: corX + frontArmW, y1: armD, x2: corX + frontArmW, y2: corD, type: "outline" });
      }

      // Run 1 Base Units (Turned along Z, facing -X into room)
      const run1Units = kd.baseLayout.filter((item) => !item.isCorner && item.runIndex === 1);
      run1Units.forEach((item, idx) => {
        const cabX = kd.run0Width - item.depth;
        rects.push({ id: `plan-cab-r1-${idx}`, x: cabX, y: item.z, width: item.depth, height: item.width, type: "interior" });
        rects.push({ id: `plan-cab-r1-ts-${idx}`, x: cabX, y: item.z, width: item.depth, height: t, type: "interior" });
        rects.push({ id: `plan-cab-r1-bs-${idx}`, x: cabX, y: item.z + item.width - t, width: item.depth, height: t, type: "interior" });
        lines.push({ id: `plan-cab-r1-back-${idx}`, x1: kd.run0Width - 20, y1: item.z + t, x2: kd.run0Width - 20, y2: item.z + item.width - t, type: "interior" });
        lines.push({ id: `plan-cab-r1-door-${idx}`, x1: cabX, y1: item.z, x2: cabX, y2: item.z + item.width, type: "outline" });

        if (run1Units.length > 1) {
          dimensions.push({
            id: `plan-dim-r1-${idx}`,
            x1: kd.run0Width + 30,
            y1: item.z,
            x2: kd.run0Width + 30,
            y2: item.z + item.width,
            refX1: kd.run0Width,
            refY1: item.z,
            refX2: kd.run0Width,
            refY2: item.z + item.width,
            value: item.width,
            text: formatDim(item.width, unit),
            orientation: "vertical",
          });
        }
      });

      // 3. Overhead Wall Cabinets projection (dashed hidden lines)
      kd.wallLayout.forEach((item, wIdx) => {
        if (item.isCorner) {
          rects.push({
            id: `plan-wall-cor-${wIdx}`,
            x: item.x,
            y: 0,
            width: item.width,
            height: item.depth,
            type: "hidden",
          });
        } else if (item.runIndex === 0) {
          rects.push({
            id: `plan-wall-r0-${wIdx}`,
            x: item.x,
            y: 0,
            width: item.width,
            height: item.depth,
            type: "hidden",
          });
        } else {
          rects.push({
            id: `plan-wall-r1-${wIdx}`,
            x: item.x,
            y: item.z,
            width: item.depth,
            height: item.width,
            type: "hidden",
          });
        }
      });

      // 4. Dimensions
      // Main Run Width (along X at bottom)
      const mainWDimY = run0Units.length > 1 ? -80 : -45;
      dimensions.push({
        id: "plan-dim-main-w",
        x1: 0,
        y1: mainWDimY,
        x2: kd.run0Width,
        y2: mainWDimY,
        refX1: 0,
        refY1: 0,
        refX2: kd.run0Width,
        refY2: 0,
        value: kd.run0Width,
        text: `Main: ${formatDim(kd.run0Width, unit, true)}`,
        orientation: "horizontal",
      });

      // Return Run Depth (along Z at right)
      const retDDimX = run1Units.length > 1 ? kd.run0Width + 80 : kd.run0Width + 45;
      const totalReturnD = kd.run1Depth + 10;
      dimensions.push({
        id: "plan-dim-return-d",
        x1: retDDimX,
        y1: 0,
        x2: retDDimX,
        y2: totalReturnD,
        refX1: kd.run0Width,
        refY1: 0,
        refX2: kd.run0Width,
        refY2: totalReturnD,
        value: totalReturnD,
        text: `Return: ${formatDim(totalReturnD, unit, true)}`,
        orientation: "vertical",
      });

      // Countertop Standard Depth (Left side)
      dimensions.push({
        id: "plan-dim-ct-d",
        x1: -35,
        y1: 0,
        x2: -35,
        y2: ctD,
        refX1: 0,
        refY1: 0,
        refX2: 0,
        refY2: ctD,
        value: ctD,
        text: formatDim(ctD, unit, true),
        orientation: "vertical",
      });

      return {
        width: kd.run0Width,
        height: totalReturnD,
        rects,
        lines,
        circles,
        dimensions,
      };
    } else {
      // -----------------------------------------------------------
      // LINEAR STRAIGHT RUN KITCHEN PLAN VIEW
      // -----------------------------------------------------------
      // 1. Countertop Slabs (segmented: skips tall units, fridges, and units with hasNoCountertop)
      if (kd.hasCountertop) {
        let segStartX: number | null = null;
        let segEndX = 0;
        let runningX = 0;
        kd.baseUnits.forEach((u, idx) => {
          const needsCt = !u.hasNoCountertop && u.type !== "tall" && u.type !== "fridge";
          if (needsCt) {
            if (segStartX === null) segStartX = runningX;
            segEndX = runningX + u.width;
          } else {
            if (segStartX !== null) {
              const leftOverhang = segStartX === 0 ? 10 : 0;
              rects.push({
                id: `plan-countertop-${idx}`,
                x: segStartX - leftOverhang,
                y: 0,
                width: (segEndX - segStartX) + leftOverhang,
                height: ctD,
                type: "outline",
              });
              segStartX = null;
            }
          }
          runningX += u.width;
        });
        if (segStartX !== null) {
          const leftOverhang = segStartX === 0 ? 10 : 0;
          const rightOverhang = segEndX >= kd.totalBaseW - 1 ? 10 : 0;
          rects.push({
            id: "plan-countertop-end",
            x: segStartX - leftOverhang,
            y: 0,
            width: (segEndX - segStartX) + leftOverhang + rightOverhang,
            height: ctD,
            type: "outline",
          });
        }
      }

      // 2. Base Cabinets Underneath (joinery details)
      let curX = 0;
      kd.baseUnits.forEach((u, idx) => {
        const uD = u.depth || kd.baseDepth;
        rects.push({ id: `plan-cab-${idx}`, x: curX, y: 0, width: u.width, height: uD, type: "interior" });
        rects.push({ id: `plan-cab-ls-${idx}`, x: curX, y: 0, width: t, height: uD, type: "interior" });
        rects.push({ id: `plan-cab-rs-${idx}`, x: curX + u.width - t, y: 0, width: t, height: uD, type: "interior" });
        lines.push({ id: `plan-cab-back-${idx}`, x1: curX + t, y1: 20, x2: curX + u.width - t, y2: 20, type: "interior" });

        if (kd.baseUnits.length > 1) {
          dimensions.push({
            id: `plan-dim-u-${idx}`,
            x1: curX,
            y1: -30,
            x2: curX + u.width,
            y2: -30,
            refX1: curX,
            refY1: 0,
            refX2: curX + u.width,
            refY2: 0,
            value: u.width,
            text: formatDim(u.width, unit),
            orientation: "horizontal",
          });
        }

        curX += u.width;
      });

      // 3. Overhead Wall Cabinets projection (dashed hidden lines)
      if (kd.wallUnits.length > 0) {
        let curWallX = 0;
        kd.wallUnits.forEach((wu, wIdx) => {
          const wuD = wu.depth || kd.wallDepth;
          rects.push({
            id: `plan-wall-${wIdx}`,
            x: curWallX,
            y: 0,
            width: wu.width,
            height: wuD,
            type: "hidden",
          });
          curWallX += wu.width;
        });

        // Wall Depth dimension
        dimensions.push({
          id: "plan-dim-wall-d",
          x1: -28,
          y1: 0,
          x2: -28,
          y2: kd.wallDepth,
          refX1: 0,
          refY1: 0,
          refX2: 0,
          refY2: kd.wallDepth,
          value: kd.wallDepth,
          text: `Wall: ${formatDim(kd.wallDepth, unit)}`,
          orientation: "vertical",
        });
      }

      // Overall Countertop Depth dimension
      dimensions.push({
        id: "plan-dim-d",
        x1: kd.totalBaseW + 35,
        y1: 0,
        x2: kd.totalBaseW + 35,
        y2: ctD,
        refX1: kd.totalBaseW,
        refY1: 0,
        refX2: kd.totalBaseW,
        refY2: ctD,
        value: ctD,
        text: formatDim(ctD, unit, true),
        orientation: "vertical",
      });

      // Overall Width dimension
      const overallWDimY = kd.baseUnits.length > 1 ? -80 : -45;
      dimensions.push({
        id: "plan-dim-w",
        x1: 0,
        y1: overallWDimY,
        x2: kd.totalBaseW,
        y2: overallWDimY,
        refX1: 0,
        refY1: 0,
        refX2: kd.totalBaseW,
        refY2: 0,
        value: kd.totalBaseW,
        text: formatDim(kd.totalBaseW, unit, true),
        orientation: "horizontal",
      });

      return { width: kd.totalBaseW, height: ctD, rects, lines, circles, dimensions };
    }
  }

  if (params.category === "Wardrobe") {
    const wd = getWardrobeData(params);
    let curX = 0;

    wd.mainUnits.forEach((u, idx) => {
      const uD = wd.depth;
      rects.push({ id: `plan-ward-carcass-${idx}`, x: curX, y: 0, width: u.width, height: uD, type: "outline" });
      rects.push({ id: `plan-ward-ls-${idx}`, x: curX, y: 0, width: t, height: uD, type: "interior" });
      rects.push({ id: `plan-ward-rs-${idx}`, x: curX + u.width - t, y: 0, width: t, height: uD, type: "interior" });
      lines.push({ id: `plan-ward-back-${idx}`, x1: curX + t, y1: 18, x2: curX + u.width - t, y2: 18, type: "interior" });

      const isSliding = u.doorType === "sliding";
      const setback = isSliding ? 80 : 0;
      const partD = uD - 18 - setback;

      if (u.hasInternalDivider) {
        const innerW = u.width - t * 2;
        const minBay = 250;
        const rawOffset = u.partitionOffset || 0;
        const maxOffset = Math.max(0, (innerW - t) / 2 - minBay);
        const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, rawOffset));
        const divX = curX + t + (innerW - t) / 2 + clampedOffset;

        rects.push({
          id: `plan-ward-div-${idx}`,
          x: divX,
          y: 18,
          width: t,
          height: partD,
          type: "interior",
        });
      }

      if (isSliding) {
        // Dual sliding door tracks & panels in plan view
        const trackY = uD - 70;
        lines.push({
          id: `plan-ward-track-${idx}`,
          x1: curX + t,
          y1: trackY,
          x2: curX + u.width - t,
          y2: trackY,
          type: "interior",
        });
        const leafW = (u.width - t * 2) / 2 + 18;
        rects.push({
          id: `plan-ward-leaf-rear-${idx}`,
          x: curX + t,
          y: uD - 55,
          width: leafW,
          height: 18,
          type: "outline",
        });
        rects.push({
          id: `plan-ward-leaf-front-${idx}`,
          x: curX + u.width - t - leafW,
          y: uD - 22,
          width: leafW,
          height: 18,
          type: "outline",
        });
      }

      dimensions.push({
        id: `plan-ward-dim-u-${idx}`,
        x1: curX,
        y1: -25,
        x2: curX + u.width,
        y2: -25,
        refX1: curX,
        refY1: 0,
        refX2: curX + u.width,
        refY2: 0,
        value: u.width,
        text: formatDim(u.width, unit),
        orientation: "horizontal",
      });

      curX += u.width;
    });

    dimensions.push({
      id: "plan-ward-dim-d",
      x1: wd.totalW + 35,
      y1: 0,
      x2: wd.totalW + 35,
      y2: wd.depth,
      refX1: wd.totalW,
      refY1: 0,
      refX2: wd.totalW,
      refY2: wd.depth,
      value: wd.depth,
      text: formatDim(wd.depth, unit, true),
      orientation: "vertical",
    });

    dimensions.push({
      id: "plan-ward-dim-w",
      x1: 0,
      y1: -45,
      x2: wd.totalW,
      y2: -45,
      refX1: 0,
      refY1: 0,
      refX2: wd.totalW,
      refY2: 0,
      value: wd.totalW,
      text: formatDim(wd.totalW, unit, true),
      orientation: "horizontal",
    });

    return { width: wd.totalW, height: wd.depth, rects, lines, circles, dimensions };
  }

  // Shelf, Table & Desk
  const W = params.width || 1200;
  const D = params.depth || 600;

  rects.push({ id: "plan-outer", x: 0, y: 0, width: W, height: D, type: "outline" });
  rects.push({ id: "plan-ls", x: 0, y: 0, width: t, height: D, type: "interior" });
  rects.push({ id: "plan-rs", x: W - t, y: 0, width: t, height: D, type: "interior" });
  lines.push({ id: "plan-back", x1: t, y1: 18, x2: W - t, y2: 18, type: "interior" });

  dimensions.push({
    id: "plan-dim-w",
    x1: 0,
    y1: -30,
    x2: W,
    y2: -30,
    refX1: 0,
    refY1: 0,
    refX2: W,
    refY2: 0,
    value: W,
    text: formatDim(W, unit, true),
    orientation: "horizontal",
  });

  dimensions.push({
    id: "plan-dim-d",
    x1: W + 30,
    y1: 0,
    x2: W + 30,
    y2: D,
    refX1: W,
    refY1: 0,
    refX2: W,
    refY2: D,
    value: D,
    text: formatDim(D, unit, true),
    orientation: "vertical",
  });

  return { width: W, height: D, rects, lines, circles, dimensions };
}

/**
 * 3. SIDE / CROSS-SECTION VIEW (Doors Hidden: Shows side gable, shelf setback, hanger rail, back groove)
 */
export function generateSideSectionView(params: FurnitureParams, unit: "mm" | "cm" = "mm"): ViewGeometry {
  const rects: DrawingRect[] = [];
  const lines: DrawingLine[] = [];
  const circles: DrawingCircle[] = [];
  const dimensions: DimensionLineData[] = [];
  const t = params.boardThickness || 18;

  if (params.category === "Cabinet") {
    const kd = getKitchenData(params);
    const ctTop = kd.plinthH + kd.maxBaseH + kd.countertopThick;
    const wallY = ctTop + kd.splashH;
    const totalH = kd.wallUnits.length > 0 ? wallY + kd.maxWallH : ctTop;
    const ctD = kd.hasCountertop ? (kd.baseDepth + 20) : (kd.baseDepth + 18);

    // 1. Back Wall vertical line (X = 0) - only drawn when upper wall units exist, up to totalH
    if (kd.wallUnits.length > 0) {
      lines.push({
        id: "side-wall-line",
        x1: 0,
        y1: 0,
        x2: 0,
        y2: totalH,
        type: "outline",
      });
    }

    // 2. Base Plinth Foot (Toe kick recessed 40mm)
    if (kd.plinthH > 0) {
      rects.push({
        id: "side-base-plinth",
        x: 40,
        y: 0,
        width: kd.baseDepth - 80,
        height: kd.plinthH,
        type: "outline",
      });
    }

    // 3. Base Carcass
    // Outer Gable outline
    rects.push({
      id: "side-base-gable",
      x: 0,
      y: kd.plinthH,
      width: kd.baseDepth,
      height: kd.maxBaseH,
      type: "outline",
    });
    // Bottom panel
    rects.push({
      id: "side-base-bot",
      x: 0,
      y: kd.plinthH,
      width: kd.baseDepth,
      height: t,
      type: "interior",
    });
    // Top Stretchers (80mm deep Turkish standard ön ve arka üst kayıt)
    rects.push({
      id: "side-base-top-back",
      x: 0,
      y: kd.plinthH + kd.maxBaseH - t,
      width: 80,
      height: t,
      type: "interior",
    });
    rects.push({
      id: "side-base-top-front",
      x: kd.baseDepth - 80,
      y: kd.plinthH + kd.maxBaseH - t,
      width: 80,
      height: t,
      type: "interior",
    });
    // Back board (slotted channel inset 18mm, 8mm thick)
    rects.push({
      id: "side-base-back",
      x: 18,
      y: kd.plinthH + t,
      width: 8,
      height: kd.maxBaseH - t * 2,
      type: "interior",
    });
    // Internal shelf (fits between recessed back panel and front setback)
    rects.push({
      id: "side-base-shelf",
      x: 26,
      y: kd.plinthH + kd.maxBaseH / 2,
      width: kd.baseDepth - 45,
      height: t,
      type: "interior",
    });
    // Base Door / Front facade
    rects.push({
      id: "side-base-door",
      x: kd.baseDepth,
      y: kd.plinthH + 2,
      width: 18,
      height: kd.maxBaseH - 4,
      type: "outline",
    });

    // 4. Countertop Slab (20mm front overhang, if enabled)
    if (kd.hasCountertop && kd.countertopThick > 0) {
      rects.push({
        id: "side-countertop",
        x: 0,
        y: kd.plinthH + kd.maxBaseH,
        width: ctD,
        height: kd.countertopThick,
        type: "outline",
      });
    }

    // 5. Backsplash Wall Gap / Panel - ONLY when wall units exist AND backsplash is enabled
    if (kd.wallUnits.length > 0 && params.hasBacksplash) {
      lines.push({
        id: "side-splash-line",
        x1: 0,
        y1: ctTop,
        x2: 0,
        y2: wallY,
        type: "interior",
      });
    }

    // 6. Upper Wall Cabinet (if wallUnits exist)
    if (kd.wallUnits.length > 0) {
      // Wall Carcass Gable outline
      rects.push({
        id: "side-wall-gable",
        x: 0,
        y: wallY,
        width: kd.wallDepth,
        height: kd.maxWallH,
        type: "outline",
      });
      // Wall Bottom Panel
      rects.push({
        id: "side-wall-bot",
        x: 0,
        y: wallY,
        width: kd.wallDepth,
        height: t,
        type: "interior",
      });
      // Wall Top Panel
      rects.push({
        id: "side-wall-top",
        x: 0,
        y: wallY + kd.maxWallH - t,
        width: kd.wallDepth,
        height: t,
        type: "interior",
      });
      // Wall Back board (slotted channel inset 18mm, 8mm thick)
      rects.push({
        id: "side-wall-back",
        x: 18,
        y: wallY + t,
        width: 8,
        height: kd.maxWallH - t * 2,
        type: "interior",
      });
      // Wall Internal Shelves
      const sCount = kd.wallUnits[0]?.internalShelves ?? 2;
      if (sCount > 0) {
        const spacing = (kd.maxWallH - t * 2) / (sCount + 1);
        for (let si = 1; si <= sCount; si++) {
          rects.push({
            id: `side-wall-shelf-${si}`,
            x: 26,
            y: wallY + t + si * spacing - t / 2,
            width: kd.wallDepth - 45,
            height: t,
            type: "interior",
          });
        }
      }
      // Wall Door facade
      rects.push({
        id: "side-wall-door",
        x: kd.wallDepth,
        y: wallY + 2,
        width: 18,
        height: kd.maxWallH - 4,
        type: "outline",
      });
    }

    // 7. Dimensions
    // Base Depth
    dimensions.push({
      id: "side-dim-base-d",
      x1: 0,
      y1: -30,
      x2: ctD,
      y2: -30,
      refX1: 0,
      refY1: 0,
      refX2: ctD,
      refY2: 0,
      value: ctD,
      text: kd.hasCountertop ? `Worktop: ${formatDim(ctD, unit, true)}` : formatDim(ctD, unit, true),
      orientation: "horizontal",
    });

    // Wall Depth (if wall units exist)
    if (kd.wallUnits.length > 0) {
      dimensions.push({
        id: "side-dim-wall-d",
        x1: 0,
        y1: totalH + 30,
        x2: kd.wallDepth,
        y2: totalH + 30,
        refX1: 0,
        refY1: totalH,
        refX2: kd.wallDepth,
        refY2: totalH,
        value: kd.wallDepth,
        text: `Wall: ${formatDim(kd.wallDepth, unit)}`,
        orientation: "horizontal",
      });
    }

    // Worktop Height dimension (from floor 0 to top of worktop)
    dimensions.push({
      id: "side-dim-worktop-h",
      x1: ctD + 35,
      y1: 0,
      x2: ctD + 35,
      y2: ctTop,
      refX1: ctD,
      refY1: 0,
      refX2: ctD,
      refY2: ctTop,
      value: ctTop,
      text: kd.hasCountertop ? `Worktop: ${formatDim(ctTop, unit, true)}` : formatDim(ctTop, unit, true),
      orientation: "vertical",
    });

    // Backsplash Gap dimension (600mm)
    if (kd.wallUnits.length > 0) {
      dimensions.push({
        id: "side-dim-splash-h",
        x1: ctD + 35,
        y1: ctTop,
        x2: ctD + 35,
        y2: wallY,
        refX1: ctD,
        refY1: ctTop,
        refX2: ctD,
        refY2: wallY,
        value: kd.splashH,
        text: formatDim(kd.splashH, unit),
        orientation: "vertical",
      });

      // Wall Cabinet Height dimension
      dimensions.push({
        id: "side-dim-wall-h",
        x1: ctD + 35,
        y1: wallY,
        x2: ctD + 35,
        y2: wallY + kd.maxWallH,
        refX1: ctD,
        refY1: wallY,
        refX2: ctD,
        refY2: wallY + kd.maxWallH,
        value: kd.maxWallH,
        text: formatDim(kd.maxWallH, unit),
        orientation: "vertical",
      });

      // Overall Total Height dimension
      dimensions.push({
        id: "side-dim-total-h",
        x1: ctD + 70,
        y1: 0,
        x2: ctD + 70,
        y2: totalH,
        refX1: ctD,
        refY1: 0,
        refX2: ctD,
        refY2: totalH,
        value: totalH,
        text: formatDim(totalH, unit, true),
        orientation: "vertical",
      });
    }

    return { width: ctD + 75, height: totalH, rects, lines, circles, dimensions };
  }

  if (params.category === "Wardrobe") {
    const wd = getWardrobeData(params);
    const D = wd.depth;
    const H = wd.totalH;
    const plinthH = wd.plinthH;

    rects.push({ id: "side-ward-gable", x: 0, y: plinthH, width: D, height: H - plinthH, type: "outline" });

    if (plinthH > 0) {
      rects.push({ id: "side-ward-plinth", x: 0, y: 0, width: D - 40, height: plinthH, type: "outline" });
    }

    rects.push({ id: "side-ward-back", x: 18, y: plinthH + t, width: 8, height: H - plinthH - t * 2, type: "interior" });
    rects.push({ id: "side-ward-top", x: 0, y: H - t, width: D, height: t, type: "interior" });
    rects.push({ id: "side-ward-bot", x: 0, y: plinthH, width: D, height: t, type: "interior" });

    // Top unit division line if top units exist
    if (wd.topUnits.length > 0) {
      lines.push({
        id: "side-ward-top-div",
        x1: 0,
        y1: plinthH + wd.maxMainH,
        x2: D,
        y2: plinthH + wd.maxMainH,
        type: "interior",
      });
    }

    // Clothes hanger rail
    circles.push({
      id: "side-ward-rail",
      cx: D / 2,
      cy: plinthH + wd.maxMainH - t - 90,
      r: 12.5,
      type: "interior",
    });

    dimensions.push({
      id: "side-ward-dim-d",
      x1: 0,
      y1: -30,
      x2: D,
      y2: -30,
      refX1: 0,
      refY1: 0,
      refX2: D,
      refY2: 0,
      value: D,
      text: formatDim(D, unit, true),
      orientation: "horizontal",
    });

    dimensions.push({
      id: "side-ward-dim-h",
      x1: D + 30,
      y1: 0,
      x2: D + 30,
      y2: H,
      refX1: D,
      refY1: 0,
      refX2: D,
      refY2: H,
      value: H,
      text: formatDim(H, unit, true),
      orientation: "vertical",
    });

    return { width: D, height: H, rects, lines, circles, dimensions };
  }

  // Shelf, Table & Desk Side Views
  const D = params.depth || (params.category === "Table" || params.category === "Desk" ? 800 : 400);
  const H = params.height || (params.category === "Table" || params.category === "Desk" ? 750 : 1800);
  const plinthH = params.baseType === "floating" ? 0 : (params.plinthHeight || 80);

  // Outer Side Gable Contour
  rects.push({ id: "side-gable-outer", x: 0, y: plinthH, width: D, height: H - plinthH, type: "outline" });

  // Plinth Foot / Recess at bottom
  if (plinthH > 0 && params.category !== "Table" && params.category !== "Desk") {
    const plinthRec = params.plinthRecess || 30;
    rects.push({
      id: "side-plinth",
      x: 0,
      y: 0,
      width: D - plinthRec,
      height: plinthH,
      type: "outline",
    });
  }

  // Back panel groove line
  rects.push({
    id: "side-back-board",
    x: 18,
    y: plinthH + t,
    width: t,
    height: H - plinthH - t * 2,
    type: "interior",
  });

  // Top & Bottom panel cross sections
  rects.push({ id: "side-top-panel", x: 0, y: H - t, width: D, height: t, type: "interior" });
  rects.push({ id: "side-bot-panel", x: 0, y: plinthH, width: D, height: t, type: "interior" });

  dimensions.push({
    id: "side-dim-d",
    x1: 0,
    y1: -30,
    x2: D,
    y2: -30,
    refX1: 0,
    refY1: 0,
    refX2: D,
    refY2: 0,
    value: D,
    text: formatDim(D, unit, true),
    orientation: "horizontal",
  });

  dimensions.push({
    id: "side-dim-h",
    x1: D + 30,
    y1: 0,
    x2: D + 30,
    y2: H,
    refX1: D,
    refY1: 0,
    refX2: D,
    refY2: H,
    value: H,
    text: formatDim(H, unit, true),
    orientation: "vertical",
  });

  return { width: D, height: H, rects, lines, circles, dimensions };
}

/**
 * 4. ISOMETRIC VIEW (Axonometric 3D Projection, Adjustable Angle, Doors & Details Visible)
 */
export function generateIsometricView(
  params: FurnitureParams,
  isoAngle?: number,
  isoElevation?: number,
  unit: "mm" | "cm" = "mm"
): ViewGeometry {
  const lines: DrawingLine[] = [];
  const rects: DrawingRect[] = [];
  const circles: DrawingCircle[] = [];
  const dimensions: DimensionLineData[] = [];

  let W = params.width || 1200;
  let H = params.height || 1800;
  let D = params.depth || 600;

  if (params.category === "Cabinet") {
    const kd = getKitchenData(params);
    W = kd.run0Width;
    D = kd.hasCorner ? (kd.run1Depth + 10) : (kd.baseDepth + 20);
    H = kd.totalH;
  } else if (params.category === "Wardrobe") {
    const wd = getWardrobeData(params);
    W = wd.totalW;
    H = wd.totalH;
    D = wd.depth;
  }

  const t = params.boardThickness || 18;

  // Azimuth angle: 0-360 degrees. Default 45° (Front-Right isometric)
  const angleDeg = isoAngle !== undefined ? isoAngle : (params.drawingSettings?.isoAngle ?? 45);
  // Elevation angle: 15-45 degrees. Default 30° standard axonometric
  const elevDeg = isoElevation !== undefined ? isoElevation : (params.drawingSettings?.isoElevation ?? 30);

  const alpha = (angleDeg * Math.PI) / 180;
  const beta = (elevDeg * Math.PI) / 180;
  const cosA = Math.cos(alpha);
  const sinA = Math.sin(alpha);
  const cosB = Math.cos(beta);
  const sinB = Math.sin(beta);

  // Model center in 3D
  const cx = W / 2;
  const cy = H / 2;
  const cz = D / 2;

  // General 3D -> 2D Isometric Projection function
  const project3d = (x: number, y: number, z: number): [number, number] => {
    const dx = x - cx;
    const dy = y - cy;
    const dz = z - cz;

    // Rotate around Y axis by azimuth alpha
    const rx = dx * cosA + dz * sinA;
    const ry = dy;
    const rz = -dx * sinA + dz * cosA;

    // Tilt by elevation angle beta (camera looking down at model)
    const u = rx;
    const v = ry * cosB - rz * sinB;
    return [u, v];
  };

  let lineCount = 0;
  const drawnSegments = new Set<string>();

  const addSegment = (
    p1: [number, number],
    p2: [number, number],
    type: DrawingLine["type"] = "outline"
  ) => {
    // Quantize points to prevent duplicate overlapping lines
    const qx1 = Math.round(p1[0] * 2) / 2;
    const qy1 = Math.round(p1[1] * 2) / 2;
    const qx2 = Math.round(p2[0] * 2) / 2;
    const qy2 = Math.round(p2[1] * 2) / 2;
    if (qx1 === qx2 && qy1 === qy2) return;

    const key = qx1 < qx2 || (qx1 === qx2 && qy1 < qy2)
      ? `${qx1},${qy1}_${qx2},${qy2}`
      : `${qx2},${qy2}_${qx1},${qy1}`;

    if (drawnSegments.has(key)) return;
    drawnSegments.add(key);

    lineCount++;
    lines.push({
      id: `iso-ln-${lineCount}`,
      x1: p1[0],
      y1: p1[1],
      x2: p2[0],
      y2: p2[1],
      type,
    });
  };

  const isFaceFacingCamera = (nx: number, ny: number, nz: number): boolean => {
    const n_rz = -nx * sinA + nz * cosA;
    const dot = ny * sinB + n_rz * cosB;
    return dot > 0.001;
  };

  interface BoxCullOptions {
    hideTop?: boolean;
    hideBottom?: boolean;
    hideFront?: boolean;
    hideBack?: boolean;
    hideLeft?: boolean;
    hideRight?: boolean;
  }

  const addBox3d = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    edgeType: DrawingLine["type"] = "outline",
    cullOpts?: BoxCullOptions
  ) => {
    const opts = cullOpts || {};
    const fTop = !opts.hideTop && isFaceFacingCamera(0, 1, 0);
    const fBottom = !opts.hideBottom && isFaceFacingCamera(0, -1, 0);
    const fFront = !opts.hideFront && isFaceFacingCamera(0, 0, 1);
    const fBack = !opts.hideBack && isFaceFacingCamera(0, 0, -1);
    const fLeft = !opts.hideLeft && isFaceFacingCamera(-1, 0, 0);
    const fRight = !opts.hideRight && isFaceFacingCamera(1, 0, 0);

    const v000 = project3d(x1, y1, z1);
    const v100 = project3d(x2, y1, z1);
    const v110 = project3d(x2, y2, z1);
    const v010 = project3d(x1, y2, z1);

    const v001 = project3d(x1, y1, z2);
    const v101 = project3d(x2, y1, z2);
    const v111 = project3d(x2, y2, z2);
    const v011 = project3d(x1, y2, z2);

    // Top edges
    if (fTop || fBack) addSegment(v010, v110, edgeType);
    if (fTop || fRight) addSegment(v110, v111, edgeType);
    if (fTop || fFront) addSegment(v111, v011, edgeType);
    if (fTop || fLeft) addSegment(v011, v010, edgeType);

    // Bottom edges
    if (fBottom || fBack) addSegment(v000, v100, edgeType);
    if (fBottom || fRight) addSegment(v100, v101, edgeType);
    if (fBottom || fFront) addSegment(v101, v001, edgeType);
    if (fBottom || fLeft) addSegment(v001, v000, edgeType);

    // Vertical corner edges
    if (fBack || fLeft) addSegment(v000, v010, edgeType);
    if (fBack || fRight) addSegment(v100, v110, edgeType);
    if (fFront || fRight) addSegment(v101, v111, edgeType);
    if (fFront || fLeft) addSegment(v001, v011, edgeType);
  };

  const addDoorFaceFeatures = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    z: number,
    doorStyle: "slab" | "slimShaker" | "shaker" | "fluted" | "framedGlass" | undefined
  ) => {
    if (!doorStyle || doorStyle === "slab") return;
    const w = x2 - x1;
    const h = y2 - y1;
    if (w < 40 || h < 40) return;

    if (doorStyle === "slimShaker" || doorStyle === "framedGlass") {
      // 22mm perimeter frame inset
      const inset = Math.min(22, w * 0.25, h * 0.25);
      const p1 = project3d(x1 + inset, y1 + inset, z);
      const p2 = project3d(x2 - inset, y1 + inset, z);
      const p3 = project3d(x2 - inset, y2 - inset, z);
      const p4 = project3d(x1 + inset, y2 - inset, z);
      addSegment(p1, p2, "interior");
      addSegment(p2, p3, "interior");
      addSegment(p3, p4, "interior");
      addSegment(p4, p1, "interior");
    } else if (doorStyle === "shaker") {
      // 60mm classic shaker perimeter frame inset
      const inset = Math.min(60, w * 0.3, h * 0.3);
      const p1 = project3d(x1 + inset, y1 + inset, z);
      const p2 = project3d(x2 - inset, y1 + inset, z);
      const p3 = project3d(x2 - inset, y2 - inset, z);
      const p4 = project3d(x1 + inset, y2 - inset, z);
      addSegment(p1, p2, "interior");
      addSegment(p2, p3, "interior");
      addSegment(p3, p4, "interior");
      addSegment(p4, p1, "interior");
    } else if (doorStyle === "fluted") {
      // 4-5 subtle vertical lines inside door panel
      const border = Math.min(30, w * 0.2);
      const innerW = w - border * 2;
      if (innerW > 30) {
        const numLines = Math.min(7, Math.max(4, Math.floor(innerW / 35)));
        const step = innerW / (numLines + 1);
        for (let i = 1; i <= numLines; i++) {
          const lx = x1 + border + i * step;
          const pBot = project3d(lx, y1 + border, z);
          const pTop = project3d(lx, y2 - border, z);
          addSegment(pBot, pTop, "interior");
        }
      }
    }
  };

  const drawHandle3d = (
    hx: number,
    hy: number,
    z: number,
    type: FurnitureParams["handleType"] = "bar",
    orientation: "vertical" | "horizontal" = "vertical",
    side: "left" | "right" | "center" = "center",
    customLength?: number
  ) => {
    if (type === "hidden") return;

    if (type === "knob") {
      const pCenter = project3d(hx, hy, z + 8);
      const pBase = project3d(hx, hy, z);
      addSegment(pBase, pCenter, "interior");
      const d = 5;
      addSegment(project3d(hx - d, hy, z + 8), project3d(hx + d, hy, z + 8), "outline");
      addSegment(project3d(hx, hy - d, z + 8), project3d(hx, hy + d, z + 8), "outline");
      return;
    }

    if (type === "halfMoon") {
      const r = 22;
      const arcPts = 6;
      const angleStart = side === "left" ? Math.PI / 2 : -Math.PI / 2;
      const angleEnd = side === "left" ? (3 * Math.PI) / 2 : Math.PI / 2;
      let prevPt = project3d(hx, hy - r, z + 4);
      for (let i = 1; i <= arcPts; i++) {
        const theta = angleStart + (i / arcPts) * (angleEnd - angleStart);
        const curPt = project3d(hx + Math.cos(theta) * r, hy + Math.sin(theta) * r, z + 4);
        addSegment(prevPt, curPt, "outline");
        prevPt = curPt;
      }
      addSegment(project3d(hx, hy - r, z + 4), project3d(hx, hy + r, z + 4), "outline");
      return;
    }

    const halfLen = customLength ? customLength / 2 : (type === "slimLine" ? 45 : 30);
    const standoff = 8;
    if (orientation === "horizontal") {
      const p1 = project3d(hx - halfLen, hy, z + standoff);
      const p2 = project3d(hx + halfLen, hy, z + standoff);
      addSegment(p1, p2, "outline");
      addSegment(project3d(hx - halfLen * 0.7, hy, z + standoff), project3d(hx - halfLen * 0.7, hy, z), "interior");
      addSegment(project3d(hx + halfLen * 0.7, hy, z + standoff), project3d(hx + halfLen * 0.7, hy, z), "interior");
    } else {
      const p1 = project3d(hx, hy - halfLen, z + standoff);
      const p2 = project3d(hx, hy + halfLen, z + standoff);
      addSegment(p1, p2, "outline");
      addSegment(project3d(hx, hy - halfLen * 0.7, z + standoff), project3d(hx, hy - halfLen * 0.7, z), "interior");
      addSegment(project3d(hx, hy + halfLen * 0.7, z + standoff), project3d(hx, hy + halfLen * 0.7, z), "interior");
    }
  };

  // Build 3D Furniture details based on category
  const plinthH = params.baseType === "floating" ? 0 : (params.plinthHeight || 80);

  if (params.category === "Cabinet") {
    const kd = getKitchenData(params);
    const ctY = kd.plinthH + kd.maxBaseH;
    const curHandleType = params.handleType || "bar";

    if (kd.hasCorner) {
      // -----------------------------------------------------------
      // 3D ISOMETRIC L-SHAPED KITCHEN
      // -----------------------------------------------------------
      // 1. Plinth Boxes (L-Shaped, visible outer faces only)
      if (kd.plinthH > 0) {
        addBox3d(30, 0, 30, kd.run0Width - 30, kd.plinthH, 570, "interior", { hideTop: true, hideBottom: true, hideBack: true });
        addBox3d(kd.run0Width - 570, 0, 570, kd.run0Width - 30, kd.plinthH, kd.run1Depth - 30, "interior", { hideTop: true, hideBottom: true, hideBack: true });
      }

      // 2. Base Cabinets
      kd.baseLayout.forEach((item) => {
        const uY = kd.plinthH;
        const uH = item.height;
        const uDoorStyle = item.unit.doorStyle || "slab";
        const uHandleType = item.unit.handleType || curHandleType;
        const hasDoors = item.unit.doorType !== "none" || (item.unit.drawerCount || 0) > 0;
        const unitHasCountertop = kd.hasCountertop && item.unit.type !== "tall" && item.unit.type !== "fridge" && !item.unit.hasNoCountertop;

        if (item.isCorner) {
          // 90° Corner Base Unit
          if (!unitHasCountertop) {
            // L-shaped top panel
            addSegment(project3d(item.x, uY + uH, 0), project3d(kd.run0Width, uY + uH, 0), "outline");
            addSegment(project3d(kd.run0Width, uY + uH, 0), project3d(kd.run0Width, uY + uH, item.z + item.depth), "outline");
            addSegment(project3d(item.x, uY + uH, 600), project3d(kd.run0Width - 600, uY + uH, 600), "outline");
            addSegment(project3d(kd.run0Width - 600, uY + uH, 600), project3d(kd.run0Width - 600, uY + uH, item.z + item.depth), "outline");
          }

          // Bi-fold corner doors
          // Door 1 (facing +Z at z = 600)
          addBox3d(item.x + 2, uY + 2, 600, kd.run0Width - 600 - 2, uY + uH - 2, 618, "outline", { hideBack: true, hideLeft: item.x > 0 });
          addDoorFaceFeatures(item.x + 2, uY + 2, kd.run0Width - 600 - 2, uY + uH - 2, 618, uDoorStyle);
          // Door 2 (facing -X at x = kd.run0Width - 600)
          addBox3d(kd.run0Width - 600 - 18, uY + 2, 600 + 2, kd.run0Width - 600, uY + uH - 2, item.z + item.depth - 2, "outline", { hideBack: true, hideFront: true });

          // Corner handles near 90° inside vertex
          drawHandle3d(kd.run0Width - 600 - 30, uY + uH - 60, 618, uHandleType, "vertical", "right");
          drawHandle3d(kd.run0Width - 600 - 18, uY + uH - 60, 600 + 30, uHandleType, "vertical", "left");
        } else if (item.runIndex === 0) {
          // Run 0 Base Unit (along X, facing +Z)
          const curX = item.x;
          const uW = item.width;
          const uD = 600;
          const isFirst = (curX === 0);

          // Exposed left gable ONLY if curX === 0
          if (isFirst) {
            const gableFrontZ = uD + (hasDoors ? 18 : 0);
            addSegment(project3d(0, uY, 0), project3d(0, uY + uH, 0), "outline");
            addSegment(project3d(0, uY, 0), project3d(0, uY, gableFrontZ), "outline");
            addSegment(project3d(0, uY, gableFrontZ), project3d(0, uY + uH, gableFrontZ), "outline");
            if (!unitHasCountertop) {
              addSegment(project3d(0, uY + uH, 0), project3d(0, uY + uH, gableFrontZ), "outline");
            }
          }

          // Top panel cap (if no countertop)
          if (!unitHasCountertop) {
            const topFrontZ = uD + (hasDoors ? 18 : 0);
            addSegment(project3d(curX, uY + uH, 0), project3d(curX + uW, uY + uH, 0), "outline");
            addSegment(project3d(curX, uY + uH, topFrontZ), project3d(curX + uW, uY + uH, topFrontZ), "outline");
          }

          if (!hasDoors) {
            // Open cabinet
            addSegment(project3d(curX, uY, uD), project3d(curX, uY + uH, uD), "outline");
            addSegment(project3d(curX + t, uY, uD), project3d(curX + t, uY + uH, uD), "interior");
            addSegment(project3d(curX + uW - t, uY, uD), project3d(curX + uW - t, uY + uH, uD), "interior");
            addSegment(project3d(curX + uW, uY, uD), project3d(curX + uW, uY + uH, uD), "outline");
            if (!item.unit.hasNoBottom && item.unit.type !== "fridge" && item.unit.type !== "dishwasher") {
              addSegment(project3d(curX, uY, uD), project3d(curX + uW, uY, uD), "outline");
              addSegment(project3d(curX + t, uY + t, uD), project3d(curX + uW - t, uY + t, uD), "interior");
            }
            if (item.unit.internalShelves > 0) {
              const spacing = (uH - t * 2) / (item.unit.internalShelves + 1);
              for (let s = 1; s <= item.unit.internalShelves; s++) {
                const sy = uY + t + s * spacing;
                addSegment(project3d(curX + t, sy - t / 2, uD - 15), project3d(curX + uW - t, sy - t / 2, uD - 15), "interior");
                addSegment(project3d(curX + t, sy + t / 2, uD - 15), project3d(curX + uW - t, sy + t / 2, uD - 15), "interior");
              }
            }
          } else if (item.unit.drawerCount > 0) {
            const dCount = item.unit.drawerCount;
            const dH = (uH - t) / dCount;
            for (let di = 0; di < dCount; di++) {
              const dy = uY + di * dH + 2;
              const dh = dH - 4;
              addBox3d(curX + 2, dy, uD, curX + uW - 2, dy + dh, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
              addDoorFaceFeatures(curX + 2, dy, curX + uW - 2, dy + dh, uD + 18, uDoorStyle);
              drawHandle3d(curX + uW / 2, dy + dh / 2, uD + 18, uHandleType, "horizontal", "center", uW > 700 ? 110 : 70);
            }
          } else if (item.unit.doorType === "singleLeft") {
            addBox3d(curX + 2, uY + 2, uD, curX + uW - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, uY + 2, curX + uW - 2, uY + uH - 2, uD + 18, uDoorStyle);
            drawHandle3d(curX + uW - 35, uY + uH - 60, uD + 18, uHandleType, "vertical", "right");
          } else if (item.unit.doorType === "singleRight") {
            addBox3d(curX + 2, uY + 2, uD, curX + uW - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, uY + 2, curX + uW - 2, uY + uH - 2, uD + 18, uDoorStyle);
            drawHandle3d(curX + 35, uY + uH - 60, uD + 18, uHandleType, "vertical", "left");
          } else if (item.unit.doorType === "double" || item.unit.doorType === "cornerDouble") {
            const midX = curX + uW / 2;
            addBox3d(curX + 2, uY + 2, uD, midX - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, uY + 2, midX - 2, uY + uH - 2, uD + 18, uDoorStyle);
            addBox3d(midX + 2, uY + 2, uD, curX + uW - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: true });
            addDoorFaceFeatures(midX + 2, uY + 2, curX + uW - 2, uY + uH - 2, uD + 18, uDoorStyle);
            drawHandle3d(midX - 25, uY + uH - 60, uD + 18, uHandleType, "vertical", "left");
            drawHandle3d(midX + 25, uY + uH - 60, uD + 18, uHandleType, "vertical", "right");
          }
        } else {
          // Run 1 Base Unit (along Z, facing -X into room)
          const curZ = item.z;
          const uW = item.width;
          const cabX = kd.run0Width - 600;
          const isLastRun1 = (curZ + uW >= kd.run1Depth - 1);

          // If this is the last unit at the far end of Run 1: draw end gable facing +Z
          if (isLastRun1) {
            const endZ = curZ + uW;
            addSegment(project3d(cabX - (hasDoors ? 18 : 0), uY, endZ), project3d(kd.run0Width, uY, endZ), "outline");
            addSegment(project3d(kd.run0Width, uY, endZ), project3d(kd.run0Width, uY + uH, endZ), "outline");
            addSegment(project3d(cabX - (hasDoors ? 18 : 0), uY, endZ), project3d(cabX - (hasDoors ? 18 : 0), uY + uH, endZ), "outline");
            if (!unitHasCountertop) {
              addSegment(project3d(cabX - (hasDoors ? 18 : 0), uY + uH, endZ), project3d(kd.run0Width, uY + uH, endZ), "outline");
            }
          }

          if (!hasDoors) {
            // Open cabinet facing -X
            addSegment(project3d(cabX, uY, curZ), project3d(cabX, uY + uH, curZ), "outline");
            addSegment(project3d(cabX, uY, curZ + uW), project3d(cabX, uY + uH, curZ + uW), "outline");
            addSegment(project3d(cabX, uY, curZ), project3d(cabX, uY, curZ + uW), "outline");
          } else if (item.unit.drawerCount > 0) {
            const dCount = item.unit.drawerCount;
            const dH = (uH - t) / dCount;
            for (let di = 0; di < dCount; di++) {
              const dy = uY + di * dH + 2;
              const dh = dH - 4;
              addBox3d(cabX - 18, dy, curZ + 2, cabX, dy + dh, curZ + uW - 2, "outline", { hideBack: true, hideFront: !isLastRun1 });
              drawHandle3d(cabX - 18, dy + dh / 2, curZ + uW / 2, uHandleType, "horizontal", "center", uW > 700 ? 110 : 70);
            }
          } else if (item.unit.doorType === "singleLeft" || item.unit.doorType === "singleRight") {
            addBox3d(cabX - 18, uY + 2, curZ + 2, cabX, uY + uH - 2, curZ + uW - 2, "outline", { hideBack: true, hideFront: !isLastRun1 });
            drawHandle3d(cabX - 18, uY + uH - 60, curZ + uW - 35, uHandleType, "vertical", "right");
          } else if (item.unit.doorType === "double" || item.unit.doorType === "cornerDouble") {
            const midZ = curZ + uW / 2;
            addBox3d(cabX - 18, uY + 2, curZ + 2, cabX, uY + uH - 2, midZ - 2, "outline", { hideBack: true, hideFront: true });
            addBox3d(cabX - 18, uY + 2, midZ + 2, cabX, uY + uH - 2, curZ + uW - 2, "outline", { hideBack: true, hideFront: !isLastRun1 });
            drawHandle3d(cabX - 18, uY + uH - 60, midZ - 25, uHandleType, "vertical", "left");
            drawHandle3d(cabX - 18, uY + uH - 60, midZ + 25, uHandleType, "vertical", "right");
          }
        }
      });

      // 3. Continuous Countertop Slab (L-Shaped in 3D, only if enabled)
      if (kd.hasCountertop && kd.countertopThick > 0) {
        addBox3d(-10, ctY, 0, kd.run0Width + 10, ctY + kd.countertopThick, 620, "outline", { hideBottom: true, hideBack: true });
        addBox3d(kd.run0Width - 620, ctY, 620, kd.run0Width + 10, ctY + kd.countertopThick, kd.run1Depth + 10, "outline", { hideBottom: true, hideBack: true });
      }

      // 4. Backsplash Wall Panel (if enabled and wall units exist)
      if (params.hasBacksplash && kd.wallLayout.length > 0) {
        const bsY1 = ctY + (kd.hasCountertop ? kd.countertopThick : 0);
        const bsY2 = bsY1 + kd.splashH;
        if (bsY2 > bsY1) {
          kd.baseLayout.forEach((item) => {
            if (item.unit.type === "tall" || item.unit.type === "fridge" || item.unit.hasNoCountertop) {
              return;
            }
            if (item.isCorner) {
              addBox3d(item.x, bsY1, 0, kd.run0Width, bsY2, 12, "interior", { hideBottom: true, hideBack: true });
              addBox3d(kd.run0Width - 12, bsY1, 12, kd.run0Width, bsY2, item.z + item.depth, "interior", { hideBottom: true, hideBack: true });
            } else if (item.runIndex === 0) {
              addBox3d(item.x, bsY1, 0, item.x + item.width, bsY2, 12, "interior", { hideBottom: true, hideBack: true });
            } else {
              addBox3d(kd.run0Width - 12, bsY1, item.z, kd.run0Width, bsY2, item.z + item.width, "interior", { hideBottom: true, hideBack: true });
            }
          });
        }
      }

      // 5. Upper Wall Cabinets
      kd.wallLayout.forEach((wu) => {
        const wuY = wu.y;
        const wuH = wu.height;
        const uDoorStyle = wu.unit.doorStyle || "slab";
        const uHandleType = wu.unit.handleType || curHandleType;
        const hY = wuY + 60;

        if (wu.isCorner) {
          // Corner Wall unit (600x600 L-shape)
          addSegment(project3d(wu.x, wuY + wuH, 0), project3d(kd.run0Width, wuY + wuH, 0), "outline");
          addSegment(project3d(kd.run0Width, wuY + wuH, 0), project3d(kd.run0Width, wuY + wuH, wu.depth), "outline");
          addSegment(project3d(wu.x, wuY + wuH, 350), project3d(kd.run0Width - 350, wuY + wuH, 350), "outline");
          addSegment(project3d(kd.run0Width - 350, wuY + wuH, 350), project3d(kd.run0Width - 350, wuY + wuH, wu.depth), "outline");
        } else if (wu.runIndex === 0) {
          // Run 0 Wall Unit (along X)
          const isFirstWall = (wu.x === 0);
          const topY = wuY + wuH;
          const frontZ = wu.depth + (wu.unit.doorType !== "none" ? 18 : 0);

          addSegment(project3d(wu.x, topY, 0), project3d(wu.x + wu.width, topY, 0), "outline");
          addSegment(project3d(wu.x, topY, frontZ), project3d(wu.x + wu.width, topY, frontZ), "outline");
          if (isFirstWall) {
            addSegment(project3d(0, wuY, 0), project3d(0, topY, 0), "outline");
            addSegment(project3d(0, wuY, 0), project3d(0, wuY, frontZ), "outline");
            addSegment(project3d(0, wuY, frontZ), project3d(0, topY, frontZ), "outline");
            addSegment(project3d(0, topY, 0), project3d(0, topY, frontZ), "outline");
          }

          if (wu.unit.doorType === "none") {
            addSegment(project3d(wu.x + t, wuY, wu.depth), project3d(wu.x + t, topY - t, wu.depth), "interior");
            addSegment(project3d(wu.x + wu.width - t, wuY, wu.depth), project3d(wu.x + wu.width - t, topY - t, wu.depth), "interior");
          } else if (wu.unit.doorType === "singleLeft") {
            addBox3d(wu.x + 2, wuY + 2, wu.depth, wu.x + wu.width - 2, wuY + wuH - 2, wu.depth + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
            addDoorFaceFeatures(wu.x + 2, wuY + 2, wu.x + wu.width - 2, wuY + wuH - 2, wu.depth + 18, uDoorStyle);
            drawHandle3d(wu.x + wu.width - 35, hY, wu.depth + 18, uHandleType, "vertical", "right");
          } else if (wu.unit.doorType === "singleRight") {
            addBox3d(wu.x + 2, wuY + 2, wu.depth, wu.x + wu.width - 2, wuY + wuH - 2, wu.depth + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
            addDoorFaceFeatures(wu.x + 2, wuY + 2, wu.x + wu.width - 2, wuY + wuH - 2, wu.depth + 18, uDoorStyle);
            drawHandle3d(wu.x + 35, hY, wu.depth + 18, uHandleType, "vertical", "left");
          } else if (wu.unit.doorType === "double" || wu.unit.doorType === "cornerDouble") {
            const midX = wu.x + wu.width / 2;
            addBox3d(wu.x + 2, wuY + 2, wu.depth, midX - 2, wuY + wuH - 2, wu.depth + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
            addDoorFaceFeatures(wu.x + 2, wuY + 2, midX - 2, wuY + wuH - 2, wu.depth + 18, uDoorStyle);
            addBox3d(midX + 2, wuY + 2, wu.depth, wu.x + wu.width - 2, wuY + wuH - 2, wu.depth + 18, "outline", { hideBack: true, hideLeft: true });
            addDoorFaceFeatures(midX + 2, wuY + 2, wu.x + wu.width - 2, wuY + wuH - 2, wu.depth + 18, uDoorStyle);
            drawHandle3d(midX - 25, hY, wu.depth + 18, uHandleType, "vertical", "left");
            drawHandle3d(midX + 25, hY, wu.depth + 18, uHandleType, "vertical", "right");
          }
        } else {
          // Run 1 Wall Unit (along Z)
          const cabX = kd.run0Width - wu.depth;
          if (wu.unit.doorType === "none") {
            addSegment(project3d(cabX, wuY, wu.z), project3d(cabX, wuY + wuH, wu.z), "outline");
            addSegment(project3d(cabX, wuY, wu.z + wu.width), project3d(cabX, wuY + wuH, wu.z + wu.width), "outline");
          } else {
            addBox3d(cabX - 18, wuY + 2, wu.z + 2, cabX, wuY + wuH - 2, wu.z + wu.width - 2, "outline", { hideBack: true });
            drawHandle3d(cabX - 18, hY, wu.z + wu.width - 35, uHandleType, "vertical", "right");
          }
        }
      });
    } else {
      // -----------------------------------------------------------
      // LINEAR STRAIGHT RUN ISOMETRIC VIEW
      // -----------------------------------------------------------
      // 1. Plinth Box (visible outer faces only)
      if (kd.plinthH > 0) {
        addBox3d(30, 0, 30, kd.totalBaseW - 30, kd.plinthH, kd.baseDepth - 30, "interior", { hideTop: true, hideBottom: true, hideBack: true });
      }

      // 2. Base Cabinets Run
      let curX = 0;
      kd.baseUnits.forEach((u, uIdx) => {
        const uD = u.depth || kd.baseDepth;
        const uH = u.height || kd.maxBaseH;
        const uY = kd.plinthH;
        const uW = u.width;
        const isFirst = (curX === 0);
        const isLast = (uIdx === kd.baseUnits.length - 1);
        const hasDoors = u.doorType !== "none" || (u.drawerCount || 0) > 0;
        const unitHasCountertop = kd.hasCountertop && u.type !== "tall" && u.type !== "fridge" && !u.hasNoCountertop;
        const uDoorStyle = u.doorStyle || "slab";
        const uHandleType = u.handleType || curHandleType;

        // 1. Left gable outline (exposed ONLY if leftmost cabinet)
        if (isFirst) {
          const gableFrontZ = uD + (hasDoors ? 18 : 0);
          addSegment(project3d(0, uY, 0), project3d(0, uY + uH, 0), "outline");
          addSegment(project3d(0, uY, 0), project3d(0, uY, gableFrontZ), "outline");
          addSegment(project3d(0, uY, gableFrontZ), project3d(0, uY + uH, gableFrontZ), "outline");
          if (!unitHasCountertop) {
            addSegment(project3d(0, uY + uH, 0), project3d(0, uY + uH, gableFrontZ), "outline");
          }
        } else {
          // Intermediate cabinet: check if it's taller than previous unit (e.g. Base to Tall/Fridge step)
          const prevUnit = kd.baseUnits[uIdx - 1];
          const prevH = prevUnit.height || kd.maxBaseH;
          if (uH > prevH) {
            const gableFrontZ = uD + (hasDoors ? 18 : 0);
            addSegment(project3d(curX, uY + prevH, 0), project3d(curX, uY + uH, 0), "outline");
            addSegment(project3d(curX, uY + prevH, gableFrontZ), project3d(curX, uY + uH, gableFrontZ), "outline");
            if (!unitHasCountertop) {
              addSegment(project3d(curX, uY + uH, 0), project3d(curX, uY + uH, gableFrontZ), "outline");
            }
          }
        }

        // 2. Top panel cap (visible if NO countertop over this unit, e.g. Tall pantry, Fridge, or hasNoCountertop)
        if (!unitHasCountertop) {
          const topFrontZ = uD + (hasDoors ? 18 : 0);
          const topY = uY + uH;
          addSegment(project3d(curX, topY, 0), project3d(curX + uW, topY, 0), "outline");
          addSegment(project3d(curX, topY, topFrontZ), project3d(curX + uW, topY, topFrontZ), "outline");
          const nextUnit = kd.baseUnits[uIdx + 1];
          const nextH = nextUnit ? (nextUnit.height || kd.maxBaseH) : 0;
          if (isLast || uH > nextH) {
            addSegment(project3d(curX + uW, topY, 0), project3d(curX + uW, topY, topFrontZ), "outline");
          }
        }

        // 3. Facade / Carcass front
        if (!hasDoors) {
          // OPEN CABINET (no doors, no drawers)
          addSegment(project3d(curX, uY, uD), project3d(curX, uY + uH, uD), "outline");
          addSegment(project3d(curX + t, uY, uD), project3d(curX + t, uY + uH, uD), "interior");
          addSegment(project3d(curX + uW - t, uY, uD), project3d(curX + uW - t, uY + uH, uD), "interior");
          addSegment(project3d(curX + uW, uY, uD), project3d(curX + uW, uY + uH, uD), "outline");
          if (!u.hasNoBottom && u.type !== "fridge" && u.type !== "dishwasher") {
            addSegment(project3d(curX, uY, uD), project3d(curX + uW, uY, uD), "outline");
            addSegment(project3d(curX + t, uY + t, uD), project3d(curX + uW - t, uY + t, uD), "interior");
          }
          if (!unitHasCountertop) {
            addSegment(project3d(curX + t, uY + uH - t, uD), project3d(curX + uW - t, uY + uH - t, uD), "interior");
          }
          if (u.internalShelves > 0) {
            const spacing = (uH - t * 2) / (u.internalShelves + 1);
            for (let s = 1; s <= u.internalShelves; s++) {
              const sy = uY + t + s * spacing;
              addSegment(project3d(curX + t, sy - t / 2, uD - 15), project3d(curX + uW - t, sy - t / 2, uD - 15), "interior");
              addSegment(project3d(curX + t, sy + t / 2, uD - 15), project3d(curX + uW - t, sy + t / 2, uD - 15), "interior");
            }
          }
        } else if (u.drawerCount > 0) {
          // Drawers
          const dCount = u.drawerCount;
          const dH = (uH - t) / dCount;
          for (let di = 0; di < dCount; di++) {
            const dy = uY + di * dH + 2;
            const dh = dH - 4;
            addBox3d(curX + 2, dy, uD, curX + uW - 2, dy + dh, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, dy, curX + uW - 2, dy + dh, uD + 18, uDoorStyle);
            drawHandle3d(curX + uW / 2, dy + dh / 2, uD + 18, uHandleType, "horizontal", "center", uW > 700 ? 110 : 70);
          }
        } else if (u.doorType === "singleLeft") {
          addBox3d(curX + 2, uY + 2, uD, curX + uW - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
          addDoorFaceFeatures(curX + 2, uY + 2, curX + uW - 2, uY + uH - 2, uD + 18, uDoorStyle);
          drawHandle3d(curX + uW - 35, uY + uH - 60, uD + 18, uHandleType, "vertical", "right");
        } else if (u.doorType === "singleRight") {
          addBox3d(curX + 2, uY + 2, uD, curX + uW - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
          addDoorFaceFeatures(curX + 2, uY + 2, curX + uW - 2, uY + uH - 2, uD + 18, uDoorStyle);
          drawHandle3d(curX + 35, uY + uH - 60, uD + 18, uHandleType, "vertical", "left");
        } else if (u.doorType === "double" || u.doorType === "cornerDouble") {
          const midX = curX + uW / 2;
          addBox3d(curX + 2, uY + 2, uD, midX - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: !isFirst });
          addDoorFaceFeatures(curX + 2, uY + 2, midX - 2, uY + uH - 2, uD + 18, uDoorStyle);
          addBox3d(midX + 2, uY + 2, uD, curX + uW - 2, uY + uH - 2, uD + 18, "outline", { hideBack: true, hideLeft: true });
          addDoorFaceFeatures(midX + 2, uY + 2, curX + uW - 2, uY + uH - 2, uD + 18, uDoorStyle);
          drawHandle3d(midX - 25, uY + uH - 60, uD + 18, uHandleType, "vertical", "left");
          drawHandle3d(midX + 25, uY + uH - 60, uD + 18, uHandleType, "vertical", "right");
        }

        curX += uW;
      });

      // 3. Segmented Countertop Slabs (Only over base/dishwasher units with countertops)
      if (kd.hasCountertop && kd.countertopThick > 0) {
        let segStartX: number | null = null;
        let segEndX = 0;
        let walkX = 0;

        kd.baseUnits.forEach((u) => {
          const uHasCt = u.type !== "tall" && u.type !== "fridge" && !u.hasNoCountertop;
          if (uHasCt) {
            if (segStartX === null) {
              segStartX = walkX;
            }
            segEndX = walkX + u.width;
          } else {
            if (segStartX !== null) {
              const oHangL = segStartX === 0 ? 10 : 0;
              addBox3d(segStartX - oHangL, ctY, 0, segEndX, ctY + kd.countertopThick, kd.baseDepth + 20, "outline", {
                hideBottom: true,
                hideBack: true,
                hideLeft: segStartX > 0,
              });
              segStartX = null;
            }
          }
          walkX += u.width;
        });

        if (segStartX !== null) {
          const oHangL = segStartX === 0 ? 10 : 0;
          const oHangR = segEndX >= kd.totalBaseW - 1 ? 10 : 0;
          addBox3d(segStartX - oHangL, ctY, 0, segEndX + oHangR, ctY + kd.countertopThick, kd.baseDepth + 20, "outline", {
            hideBottom: true,
            hideBack: true,
            hideLeft: segStartX > 0,
          });
        }
      }

      // 4. Backsplash Wall Panel (if enabled and wall units exist)
      if (params.hasBacksplash && kd.wallUnits.length > 0) {
        const bsY1 = ctY + (kd.hasCountertop ? kd.countertopThick : 0);
        const wallY = bsY1 + kd.splashH;
        let segStartX: number | null = null;
        let segEndX = 0;
        let walkX = 0;

        kd.baseUnits.forEach((u) => {
          const uHasSplash = u.type !== "tall" && u.type !== "fridge" && !u.hasNoCountertop;
          if (uHasSplash) {
            if (segStartX === null) segStartX = walkX;
            segEndX = walkX + u.width;
          } else {
            if (segStartX !== null) {
              addBox3d(segStartX, bsY1, 0, segEndX, wallY, 12, "interior", { hideBottom: true, hideBack: true });
              segStartX = null;
            }
          }
          walkX += u.width;
        });
        if (segStartX !== null) {
          addBox3d(segStartX, bsY1, 0, segEndX, wallY, 12, "interior", { hideBottom: true, hideBack: true });
        }
      }

      // 5. Upper Wall Cabinets
      if (kd.wallUnits.length > 0) {
        const wallY = ctY + kd.countertopThick + kd.splashH;
        let curWallX = 0;
        kd.wallUnits.forEach((wu, wuIdx) => {
          const wuD = wu.depth || kd.wallDepth;
          const wuH = wu.height || kd.maxWallH;
          const uDoorStyle = wu.doorStyle || "slab";
          const uHandleType = wu.handleType || curHandleType;
          const isFirstWall = (curWallX === 0);
          const isLastWall = (wuIdx === kd.wallUnits.length - 1);
          const hasDoors = wu.doorType !== "none";

          const topFrontZ = wuD + (hasDoors ? 18 : 0);
          const topY = wallY + wuH;
          addSegment(project3d(curWallX, topY, 0), project3d(curWallX + wu.width, topY, 0), "outline");
          addSegment(project3d(curWallX, topY, topFrontZ), project3d(curWallX + wu.width, topY, topFrontZ), "outline");
          if (isFirstWall) {
            addSegment(project3d(curWallX, topY, 0), project3d(curWallX, topY, topFrontZ), "outline");
            addSegment(project3d(0, wallY, 0), project3d(0, topY, 0), "outline");
            addSegment(project3d(0, wallY, 0), project3d(0, wallY, topFrontZ), "outline");
            addSegment(project3d(0, wallY, topFrontZ), project3d(0, topY, topFrontZ), "outline");
          }
          if (isLastWall) {
            addSegment(project3d(curWallX + wu.width, topY, 0), project3d(curWallX + wu.width, topY, topFrontZ), "outline");
          }

          addSegment(project3d(curWallX, wallY, topFrontZ), project3d(curWallX + wu.width, wallY, topFrontZ), "outline");

          if (!hasDoors) {
            addSegment(project3d(curWallX + t, wallY, wuD), project3d(curWallX + t, topY - t, wuD), "interior");
            addSegment(project3d(curWallX + wu.width - t, wallY, wuD), project3d(curWallX + wu.width - t, topY - t, wuD), "interior");
            addSegment(project3d(curWallX + t, wallY + t, wuD), project3d(curWallX + wu.width - t, wallY + t, wuD), "interior");
            addSegment(project3d(curWallX + t, topY - t, wuD), project3d(curWallX + wu.width - t, topY - t, wuD), "interior");
            if (wu.internalShelves > 0) {
              const spacing = (wuH - t * 2) / (wu.internalShelves + 1);
              for (let s = 1; s <= wu.internalShelves; s++) {
                const sy = wallY + t + s * spacing;
                addSegment(project3d(curWallX + t, sy - t / 2, wuD - 15), project3d(curWallX + wu.width - t, sy - t / 2, wuD - 15), "interior");
                addSegment(project3d(curWallX + t, sy + t / 2, wuD - 15), project3d(curWallX + wu.width - t, sy + t / 2, wuD - 15), "interior");
              }
            }
          } else {
            const hY = wallY + 60;
            if (wu.doorType === "singleLeft") {
              addBox3d(curWallX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
              addDoorFaceFeatures(curWallX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, uDoorStyle);
              drawHandle3d(curWallX + wu.width - 35, hY, wuD + 18, uHandleType, "vertical", "right");
            } else if (wu.doorType === "singleRight") {
              addBox3d(curWallX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
              addDoorFaceFeatures(curWallX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, uDoorStyle);
              drawHandle3d(curWallX + 35, hY, wuD + 18, uHandleType, "vertical", "left");
            } else if (wu.doorType === "double" || wu.doorType === "cornerDouble") {
              const midX = curWallX + wu.width / 2;
              addBox3d(curWallX + 2, wallY + 2, wuD, midX - 2, wallY + wuH - 2, wuD + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
              addDoorFaceFeatures(curWallX + 2, wallY + 2, midX - 2, wallY + wuH - 2, wuD + 18, uDoorStyle);
              addBox3d(midX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline", { hideBack: true, hideLeft: true });
              addDoorFaceFeatures(midX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, uDoorStyle);
              drawHandle3d(midX - 25, hY, wuD + 18, uHandleType, "vertical", "left");
              drawHandle3d(midX + 25, hY, wuD + 18, uHandleType, "vertical", "right");
            } else if (wu.doorType === "flipUp") {
              addBox3d(curWallX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline", { hideBack: true, hideLeft: !isFirstWall });
              addDoorFaceFeatures(curWallX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, uDoorStyle);
              drawHandle3d(curWallX + wu.width / 2, hY, wuD + 18, uHandleType, "horizontal", "center");
            }
          }

          curWallX += wu.width;
        });
      }
    }
  } else if (params.category === "Wardrobe") {
    const wd = getWardrobeData(params);

    // Plinth (visible outer faces only)
    if (wd.plinthH > 0) {
      addBox3d(30, 0, 30, wd.totalW - 30, wd.plinthH, wd.depth - 30, "interior", { hideTop: true, hideBottom: true, hideBack: true });
    }

    // Main Bays
    let curX = 0;
    wd.mainUnits.forEach((u, uIdx) => {
      const uY = wd.plinthH;
      const isFirst = (curX === 0);
      const isLast = (uIdx === wd.mainUnits.length - 1);
      const curDoorStyle = u.doorStyle || "slab";
      const curHandleType = u.handleType || params.handleType || "bar";
      const isConcealed = u.drawerType === "internal";
      const isSliding = u.doorType === "sliding";

      // 1. Top panel of bay
      const topY = uY + u.height;
      const frontZ = wd.depth + (u.doorType !== "open" ? 18 : 0);
      addSegment(project3d(curX, topY, 0), project3d(curX + u.width, topY, 0), "outline");
      addSegment(project3d(curX, topY, frontZ), project3d(curX + u.width, topY, frontZ), "outline");
      if (isFirst) {
        addSegment(project3d(0, topY, 0), project3d(0, topY, frontZ), "outline");
      }
      if (isLast) {
        addSegment(project3d(curX + u.width, topY, 0), project3d(curX + u.width, topY, frontZ), "outline");
      }

      // 2. Left gable outline (exposed ONLY if leftmost bay)
      if (isFirst) {
        addSegment(project3d(0, uY, 0), project3d(0, topY, 0), "outline");
        addSegment(project3d(0, uY, 0), project3d(0, uY, frontZ), "outline");
        addSegment(project3d(0, uY, frontZ), project3d(0, topY, frontZ), "outline");
      }

      // 3. Bay Facade / Open Interior
      if (u.doorType === "open") {
        addSegment(project3d(curX, uY, wd.depth), project3d(curX, topY, wd.depth), "outline");
        addSegment(project3d(curX + t, uY, wd.depth), project3d(curX + t, topY, wd.depth), "interior");
        addSegment(project3d(curX + u.width - t, uY, wd.depth), project3d(curX + u.width - t, topY, wd.depth), "interior");
        addSegment(project3d(curX + u.width, uY, wd.depth), project3d(curX + u.width, topY, wd.depth), "outline");
        addSegment(project3d(curX, uY, wd.depth), project3d(curX + u.width, uY, wd.depth), "outline");
        addSegment(project3d(curX + t, uY + t, wd.depth), project3d(curX + u.width - t, uY + t, wd.depth), "interior");

        if (u.internalShelves > 0) {
          const spacing = (u.height - t * 2) / (u.internalShelves + 1);
          for (let s = 1; s <= u.internalShelves; s++) {
            const sy = uY + t + s * spacing;
            addSegment(project3d(curX + t, sy - t / 2, wd.depth - 15), project3d(curX + u.width - t, sy - t / 2, wd.depth - 15), "interior");
            addSegment(project3d(curX + t, sy + t / 2, wd.depth - 15), project3d(curX + u.width - t, sy + t / 2, wd.depth - 15), "interior");
          }
        }
      } else {
        let dSpaceH = 0;
        if (u.hasDrawers && (u.drawerCount || 0) > 0 && !isConcealed) {
          const dCount = u.drawerCount || 2;
          const dH = u.drawerHeight || 180;
          dSpaceH = dCount * dH;
          for (let di = 0; di < dCount; di++) {
            const dy = uY + t + di * dH + 2;
            addBox3d(curX + 2, dy, wd.depth, curX + u.width - 2, dy + dH - 4, wd.depth + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, dy, curX + u.width - 2, dy + dH - 4, wd.depth + 18, curDoorStyle);
            const midX = curX + u.width / 2;
            const midY = dy + (dH - 4) / 2;
            drawHandle3d(midX, midY, wd.depth + 18, curHandleType, "horizontal", "center");
          }
        }

        const doorRunsFullHeight = isSliding && (isConcealed || !u.hasDrawers);
        const doorStartY = doorRunsFullHeight ? (uY + t + 2) : (uY + t + dSpaceH + 2);
        const doorH = doorRunsFullHeight ? (u.height - t * 2 - 4) : (u.height - t * 2 - dSpaceH - 4);

        if (doorH > 50) {
          if (isSliding) {
            const leafW = (u.width - t * 2) / 2 + 18;
            addBox3d(curX + t, doorStartY, wd.depth - 55, curX + t + leafW, doorStartY + doorH, wd.depth - 37, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + t, doorStartY, curX + t + leafW, doorStartY + doorH, wd.depth - 37, curDoorStyle);
            addBox3d(curX + u.width - t - leafW, doorStartY, wd.depth - 20, curX + u.width - t, doorStartY + doorH, wd.depth - 2, "outline", { hideBack: true, hideLeft: true });
            addDoorFaceFeatures(curX + u.width - t - leafW, doorStartY, curX + u.width - t, doorStartY + doorH, wd.depth - 2, curDoorStyle);
          } else if (u.doorType === "hingedDouble") {
            const midX = curX + u.width / 2;
            addBox3d(curX + 2, doorStartY, wd.depth, midX - 2, doorStartY + doorH, wd.depth + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, doorStartY, midX - 2, doorStartY + doorH, wd.depth + 18, curDoorStyle);
            addBox3d(midX + 2, doorStartY, wd.depth, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, "outline", { hideBack: true, hideLeft: true });
            addDoorFaceFeatures(midX + 2, doorStartY, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, curDoorStyle);
            const hY = doorStartY + doorH / 2;
            drawHandle3d(midX - 25, hY, wd.depth + 18, curHandleType, "vertical", "left", doorH > 1500 ? 120 : 70);
            drawHandle3d(midX + 25, hY, wd.depth + 18, curHandleType, "vertical", "right", doorH > 1500 ? 120 : 70);
          } else {
            addBox3d(curX + 2, doorStartY, wd.depth, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, "outline", { hideBack: true, hideLeft: !isFirst });
            addDoorFaceFeatures(curX + 2, doorStartY, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, curDoorStyle);
            const hY = doorStartY + doorH / 2;
            drawHandle3d(curX + u.width - 35, hY, wd.depth + 18, curHandleType, "vertical", "right", doorH > 1500 ? 120 : 70);
          }
        }
      }

      curX += u.width;
    });

    // Top Units
    let curTopX = 0;
    wd.topUnits.forEach((tu, tuIdx) => {
      const tuY = wd.plinthH + wd.maxMainH;
      const isFirstTop = (curTopX === 0);
      const isLastTop = (tuIdx === wd.topUnits.length - 1);
      const curDoorStyle = tu.doorStyle || "slab";

      const topY = tuY + tu.height;
      const frontZ = wd.depth + 18;
      addSegment(project3d(curTopX, topY, 0), project3d(curTopX + tu.width, topY, 0), "outline");
      addSegment(project3d(curTopX, topY, frontZ), project3d(curTopX + tu.width, topY, frontZ), "outline");
      if (isFirstTop) {
        addSegment(project3d(0, topY, 0), project3d(0, topY, frontZ), "outline");
        addSegment(project3d(0, tuY, 0), project3d(0, topY, 0), "outline");
        addSegment(project3d(0, tuY, 0), project3d(0, tuY, frontZ), "outline");
        addSegment(project3d(0, tuY, frontZ), project3d(0, topY, frontZ), "outline");
      }
      if (isLastTop) {
        addSegment(project3d(curTopX + tu.width, topY, 0), project3d(curTopX + tu.width, topY, frontZ), "outline");
      }

      addBox3d(curTopX + 2, tuY + 2, wd.depth, curTopX + tu.width - 2, tuY + tu.height - 2, wd.depth + 18, "outline", { hideBack: true, hideLeft: !isFirstTop });
      addDoorFaceFeatures(curTopX + 2, tuY + 2, curTopX + tu.width - 2, tuY + tu.height - 2, wd.depth + 18, curDoorStyle);
      curTopX += tu.width;
    });
  } else if (params.category === "Table" || params.category === "Desk") {
    const topT = params.tableTopThickness || 25;
    const legThick = params.legThickness || 50;
    const legIns = params.legInset || 25;
    const oHang = params.topOverhang || 25;

    // Tabletop
    addBox3d(0, H - topT, 0, W, H, D, "outline", { hideBack: true });

    // 4 Legs: hideTop & hideBottom so no occluded end-caps are drawn!
    const xL = oHang + legIns;
    const xR = W - oHang - legIns - legThick;
    const zB = oHang + legIns;
    const zF = D - oHang - legIns - legThick;
    const legH = H - topT;

    addBox3d(xL, 0, zB, xL + legThick, legH, zB + legThick, "interior", { hideTop: true, hideBottom: true, hideBack: true });
    addBox3d(xR, 0, zB, xR + legThick, legH, zB + legThick, "interior", { hideTop: true, hideBottom: true, hideBack: true });
    addBox3d(xL, 0, zF, xL + legThick, legH, zF + legThick, "interior", { hideTop: true, hideBottom: true, hideBack: true });
    addBox3d(xR, 0, zF, xR + legThick, legH, zF + legThick, "interior", { hideTop: true, hideBottom: true, hideBack: true });

    // Front apron rail: hideTop & hideBottom
    const apronH = params.apronHeight || 65;
    addBox3d(xL + legThick, legH - apronH, zF, xR, legH, zF + 18, "interior", { hideTop: true, hideBottom: true, hideBack: true });

    // Front Drawer if enabled
    if (params.hasDrawers) {
      const dW = Math.min(W * 0.45, 500);
      const dH = Math.min(apronH * 0.85, 120);
      const dX = W / 2 - dW / 2;
      const dY = legH - apronH + (apronH - dH) / 2;
      addBox3d(dX, dY, zF + 15, dX + dW, dY + dH, zF + 25, "outline", { hideBack: true });
      const hP1 = project3d(W / 2 - 30, dY + dH / 2, zF + 25 + 8);
      const hP2 = project3d(W / 2 + 30, dY + dH / 2, zF + 25 + 8);
      addSegment(hP1, hP2, "outline");
    }
  } else {
    // Shelf & Generic Storage Carcass
    if (plinthH > 0) {
      const pRec = params.plinthRecess || 30;
      addBox3d(pRec, 0, pRec, W - pRec, plinthH, D - pRec, "interior", { hideTop: true, hideBottom: true, hideBack: true });
    }

    const bodyY = plinthH;
    const bodyH = H - plinthH;
    const hasDoors = params.category !== "Shelf" && Boolean(params.doorType) && params.doorType !== "none";

    // Top panel cap
    const frontZ = D + (hasDoors ? 18 : 0);
    addSegment(project3d(0, bodyY + bodyH, 0), project3d(W, bodyY + bodyH, 0), "outline");
    addSegment(project3d(0, bodyY + bodyH, frontZ), project3d(W, bodyY + bodyH, frontZ), "outline");
    addSegment(project3d(0, bodyY + bodyH, 0), project3d(0, bodyY + bodyH, frontZ), "outline");
    addSegment(project3d(W, bodyY + bodyH, 0), project3d(W, bodyY + bodyH, frontZ), "outline");

    // Exposed Left gable
    addSegment(project3d(0, bodyY, 0), project3d(0, bodyY + bodyH, 0), "outline");
    addSegment(project3d(0, bodyY, 0), project3d(0, bodyY, frontZ), "outline");
    addSegment(project3d(0, bodyY, frontZ), project3d(0, bodyY + bodyH, frontZ), "outline");

    // Bottom silhouette front edge
    addSegment(project3d(0, bodyY, frontZ), project3d(W, bodyY, frontZ), "outline");

    if (!hasDoors) {
      // Open Shelf
      addSegment(project3d(t, bodyY, D), project3d(t, bodyY + bodyH, D), "interior");
      addSegment(project3d(W - t, bodyY, D), project3d(W - t, bodyY + bodyH, D), "interior");
      addSegment(project3d(0, bodyY, D), project3d(0, bodyY + bodyH, D), "outline");
      addSegment(project3d(W, bodyY, D), project3d(W, bodyY + bodyH, D), "outline");

      addSegment(project3d(t, bodyY + t, D), project3d(W - t, bodyY + t, D), "interior");
      addSegment(project3d(t, bodyY + bodyH - t, D), project3d(W - t, bodyY + bodyH - t, D), "interior");

      const shelfCount = params.internalShelves ?? 2;
      if (shelfCount > 0) {
        const spacing = (bodyH - t * 2) / (shelfCount + 1);
        for (let s = 1; s <= shelfCount; s++) {
          const sy = bodyY + t + s * spacing;
          addSegment(project3d(t, sy - t / 2, D - 15), project3d(W - t, sy - t / 2, D - 15), "interior");
          addSegment(project3d(t, sy + t / 2, D - 15), project3d(W - t, sy + t / 2, D - 15), "interior");
        }
      }

      const cols = params.internalColumns || 1;
      if (cols > 1) {
        const colW = (W - t * 2) / cols;
        for (let c = 1; c < cols; c++) {
          const px = t + c * colW;
          addSegment(project3d(px - t / 2, bodyY + t, D - 15), project3d(px - t / 2, bodyY + bodyH - t, D - 15), "interior");
          addSegment(project3d(px + t / 2, bodyY + t, D - 15), project3d(px + t / 2, bodyY + bodyH - t, D - 15), "interior");
        }
      }
    } else {
      const doorGap = 2.5;
      const midX = W / 2;
      const curDoorStyle = params.doorStyle || "slab";
      const curHandleType = params.handleType || "bar";
      addBox3d(doorGap, bodyY + doorGap, D, midX - doorGap / 2, bodyY + bodyH - doorGap, D + 18, "outline", { hideBack: true });
      addDoorFaceFeatures(doorGap, bodyY + doorGap, midX - doorGap / 2, bodyY + bodyH - doorGap, D + 18, curDoorStyle);
      addBox3d(midX + doorGap / 2, bodyY + doorGap, D, W - doorGap, bodyY + bodyH - doorGap, D + 18, "outline", { hideBack: true, hideLeft: true });
      addDoorFaceFeatures(midX + doorGap / 2, bodyY + doorGap, W - doorGap, bodyY + bodyH - doorGap, D + 18, curDoorStyle);

      const hY = bodyY + bodyH / 2;
      drawHandle3d(midX - 35, hY, D + 18, curHandleType, "vertical", "left");
      drawHandle3d(midX + 25, hY, D + 18, curHandleType, "vertical", "right");
    }
  }

  // Projected Isometric Dimension Lines
  // 1. Overall Width Dimension (Front bottom edge along X axis at Z = D)
  const pW0 = project3d(0, 0, D);
  const pW1 = project3d(W, 0, D);
  const dW0 = project3d(0, -30, D + 40);
  const dW1 = project3d(W, -30, D + 40);
  dimensions.push({
    id: "iso-dim-w",
    x1: dW0[0],
    y1: dW0[1],
    x2: dW1[0],
    y2: dW1[1],
    refX1: pW0[0],
    refY1: pW0[1],
    refX2: pW1[0],
    refY2: pW1[1],
    value: W,
    text: `W: ${formatDim(W, unit, true)}`,
    orientation: "aligned",
  });

  // 2. Overall Depth Dimension (Side bottom edge along Z axis at X = W)
  const pD0 = project3d(W, 0, 0);
  const pD1 = project3d(W, 0, D);
  const dD0 = project3d(W + 40, -30, 0);
  const dD1 = project3d(W + 40, -30, D);
  dimensions.push({
    id: "iso-dim-d",
    x1: dD0[0],
    y1: dD0[1],
    x2: dD1[0],
    y2: dD1[1],
    refX1: pD0[0],
    refY1: pD0[1],
    refX2: pD1[0],
    refY2: pD1[1],
    value: D,
    text: `D: ${formatDim(D, unit, true)}`,
    orientation: "aligned",
  });

  // 3. Overall Height Dimension (Vertical upright edge along Y axis at X = W, Z = 0)
  const pH0 = project3d(W, 0, 0);
  const pH1 = project3d(W, H, 0);
  const dH0 = project3d(W + 45, 0, -20);
  const dH1 = project3d(W + 45, H, -20);
  dimensions.push({
    id: "iso-dim-h",
    x1: dH0[0],
    y1: dH0[1],
    x2: dH1[0],
    y2: dH1[1],
    refX1: pH0[0],
    refY1: pH0[1],
    refX2: pH1[0],
    refY2: pH1[1],
    value: H,
    text: `H: ${formatDim(H, unit, true)}`,
    orientation: "aligned",
  });

  // Calculate projected bounding box (including dimension lines and witness lines)
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  lines.forEach((l) => {
    minU = Math.min(minU, l.x1, l.x2);
    maxU = Math.max(maxU, l.x1, l.x2);
    minV = Math.min(minV, l.y1, l.y2);
    maxV = Math.max(maxV, l.y1, l.y2);
  });

  dimensions.forEach((d) => {
    minU = Math.min(minU, d.x1, d.x2, d.refX1, d.refX2);
    maxU = Math.max(maxU, d.x1, d.x2, d.refX1, d.refX2);
    minV = Math.min(minV, d.y1, d.y2, d.refY1, d.refY2);
    maxV = Math.max(maxV, d.y1, d.y2, d.refY1, d.refY2);
  });

  if (!isFinite(minU)) {
    minU = 0; maxU = 100; minV = 0; maxV = 100;
  }

  // Normalize so drawing starts at (0, 0)
  lines.forEach((l) => {
    l.x1 -= minU;
    l.x2 -= minU;
    l.y1 -= minV;
    l.y2 -= minV;
  });

  dimensions.forEach((d) => {
    d.x1 -= minU;
    d.x2 -= minU;
    d.y1 -= minV;
    d.y2 -= minV;
    d.refX1 -= minU;
    d.refX2 -= minU;
    d.refY1 -= minV;
    d.refY2 -= minV;
  });

  return {
    width: Math.max(10, maxU - minU),
    height: Math.max(10, maxV - minV),
    rects: rects.filter((rect) => rect.type !== "hidden"),
    lines: lines.filter((line) => line.type !== "hidden"),
    circles: circles.filter((circle) => circle.type !== "hidden"),
    dimensions,
  };
}
