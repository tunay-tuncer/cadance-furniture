import { FurnitureParams, KitchenCabinetUnit, WardrobeUnit } from "../modeler/FurnitureMesh";

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

export interface KitchenDrawingData {
  baseUnits: KitchenCabinetUnit[];
  wallUnits: KitchenCabinetUnit[];
  plinthH: number;
  countertopThick: number;
  splashH: number;
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

  const baseUnits = units.filter((u) => u.type === "base" || u.type === "corner-base");
  const wallUnits = units.filter((u) => u.type === "wall" || u.type === "corner-wall");
  const plinthH = params.baseType === "floating" ? 0 : (params.plinthHeight ?? 80);
  const countertopThick = params.tableTopThickness || 30;
  const splashH = wallUnits.length > 0 && wallUnits[0].bottomOffset !== undefined
    ? wallUnits[0].bottomOffset
    : 600; // Standard 600mm backsplash clearance gap (Turkish standard tezgah arası)

  const totalBaseW = baseUnits.reduce((acc, u) => acc + u.width, 0);
  const totalWallW = wallUnits.reduce((acc, u) => acc + u.width, 0);
  const maxBaseH = baseUnits.length > 0 ? Math.max(...baseUnits.map((u) => u.height)) : 720;
  const maxWallH = wallUnits.length > 0 ? Math.max(...wallUnits.map((u) => u.height)) : 720;
  const baseDepth = baseUnits.length > 0 ? Math.max(...baseUnits.map((u) => u.depth || 600)) : 600;
  const wallDepth = wallUnits.length > 0 ? Math.max(...wallUnits.map((u) => u.depth || 350)) : 350;

  const totalH = plinthH + maxBaseH + countertopThick + (wallUnits.length > 0 ? splashH + maxWallH : 0);
  const totalW = Math.max(totalBaseW, totalWallW, 600);
  const totalD = baseDepth + 20;

  return {
    baseUnits,
    wallUnits,
    plinthH,
    countertopThick,
    splashH,
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
    if (kd.plinthH > 0 && kd.totalBaseW > 0) {
      rects.push({
        id: "plinth-front",
        x: 0,
        y: 0,
        width: kd.totalBaseW,
        height: kd.plinthH,
        type: "outline",
      });
    }

    // Base Cabinets (Doors Hidden)
    let curX = 0;
    kd.baseUnits.forEach((u, uIdx) => {
      const uY = kd.plinthH;
      // Outer Carcass
      rects.push({
        id: `base-carcass-${uIdx}`,
        x: curX,
        y: uY,
        width: u.width,
        height: u.height,
        type: "outline",
      });
      // Left Gable
      rects.push({
        id: `base-leftGable-${uIdx}`,
        x: curX,
        y: uY,
        width: t,
        height: u.height,
        type: "interior",
      });
      // Right Gable
      rects.push({
        id: `base-rightGable-${uIdx}`,
        x: curX + u.width - t,
        y: uY,
        width: t,
        height: u.height,
        type: "interior",
      });
      // Bottom Panel
      rects.push({
        id: `base-bottomPanel-${uIdx}`,
        x: curX + t,
        y: uY,
        width: u.width - t * 2,
        height: t,
        type: "interior",
      });
      // Top Rail / Panel
      rects.push({
        id: `base-topPanel-${uIdx}`,
        x: curX + t,
        y: uY + u.height - t,
        width: u.width - t * 2,
        height: t,
        type: "interior",
      });

      // Internal Drawers or Shelves (Doors Hidden)
      if (u.drawerCount > 0) {
        const dCount = u.drawerCount;
        const dH = (u.height - t * 2) / dCount;
        const curDoorStyle = u.doorStyle || params.doorStyle;
        for (let di = 0; di < dCount; di++) {
          const dx = curX + t + 2;
          const dy = uY + t + di * dH + 2;
          const dw = u.width - t * 2 - 4;
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
        const sGap = (u.height - t * 2 - sCount * t) / (sCount + 1);
        for (let si = 0; si < sCount; si++) {
          const sy = uY + t + (si + 1) * sGap + si * t;
          rects.push({
            id: `base-shelf-${uIdx}-${si}`,
            x: curX + t,
            y: sy,
            width: u.width - t * 2,
            height: t,
            type: "interior",
          });
        }
      }

      // Unit Width Dimension
      dimensions.push({
        id: `dim-unit-w-${uIdx}`,
        x1: curX,
        y1: -22,
        x2: curX + u.width,
        y2: -22,
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

    // Continuous Countertop Slab
    const ctY = kd.plinthH + kd.maxBaseH;
    rects.push({
      id: "countertop-front",
      x: -10,
      y: ctY,
      width: kd.totalBaseW + 20,
      height: kd.countertopThick,
      type: "outline",
    });

    // Wall Cabinets
    if (kd.wallUnits.length > 0) {
      let curWallX = 0;
      kd.wallUnits.forEach((wu, wuIdx) => {
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

    // Overall Dimensions
    dimensions.push({
      id: "dim-total-w",
      x1: 0,
      y1: -48,
      x2: kd.totalBaseW,
      y2: -48,
      refX1: 0,
      refY1: 0,
      refX2: kd.totalBaseW,
      refY2: 0,
      value: kd.totalBaseW,
      text: formatDim(kd.totalBaseW, unit, true),
      orientation: "horizontal",
    });

    dimensions.push({
      id: "dim-total-h",
      x1: kd.totalBaseW + 35,
      y1: 0,
      x2: kd.totalBaseW + 35,
      y2: kd.totalH,
      refX1: kd.totalBaseW,
      refY1: 0,
      refX2: kd.totalBaseW,
      refY2: 0,
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
      width: kd.totalBaseW,
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
          const curDoorStyle = u.doorStyle || params.doorStyle;
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
    const ctD = kd.baseDepth + 20;

    // 1. Continuous Countertop Slab (overhang 10mm sides, 20mm front)
    rects.push({
      id: "plan-countertop",
      x: -10,
      y: 0,
      width: kd.totalBaseW + 20,
      height: ctD,
      type: "outline",
    });

    // 2. Base Cabinets Underneath (joinery details)
    let curX = 0;
    kd.baseUnits.forEach((u, idx) => {
      const uD = u.depth || kd.baseDepth;
      // Carcass outline
      rects.push({ id: `plan-cab-${idx}`, x: curX, y: 0, width: u.width, height: uD, type: "interior" });
      // Left side gable
      rects.push({ id: `plan-cab-ls-${idx}`, x: curX, y: 0, width: t, height: uD, type: "interior" });
      // Right side gable
      rects.push({ id: `plan-cab-rs-${idx}`, x: curX + u.width - t, y: 0, width: t, height: uD, type: "interior" });
      // Back panel line (recessed by 20mm)
      lines.push({ id: `plan-cab-back-${idx}`, x1: curX + t, y1: 20, x2: curX + u.width - t, y2: 20, type: "interior" });

      // Unit Width dimension
      dimensions.push({
        id: `plan-dim-u-${idx}`,
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
    dimensions.push({
      id: "plan-dim-w",
      x1: 0,
      y1: -48,
      x2: kd.totalBaseW,
      y2: -48,
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
    const ctD = kd.baseDepth + 20;

    // 1. Back Wall vertical line (X = 0)
    lines.push({
      id: "side-wall-line",
      x1: 0,
      y1: 0,
      x2: 0,
      y2: totalH + 30,
      type: "outline",
    });

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

    // 4. Countertop Slab (20mm front overhang)
    rects.push({
      id: "side-countertop",
      x: 0,
      y: kd.plinthH + kd.maxBaseH,
      width: ctD,
      height: kd.countertopThick,
      type: "outline",
    });

    // 5. Backsplash Wall Gap (Height: 600mm)
    lines.push({
      id: "side-splash-line",
      x1: 0,
      y1: ctTop,
      x2: 0,
      y2: wallY,
      type: "interior",
    });

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
      text: `Worktop: ${formatDim(ctD, unit, true)}`,
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
      text: formatDim(ctTop, unit, true),
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
    W = kd.totalBaseW;
    D = kd.baseDepth + 20;
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
  const addSegment = (
    p1: [number, number],
    p2: [number, number],
    type: DrawingLine["type"] = "outline"
  ) => {
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

  const addBox3d = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    edgeType: DrawingLine["type"] = "outline"
  ) => {
    const v000 = project3d(x1, y1, z1);
    const v100 = project3d(x2, y1, z1);
    const v110 = project3d(x2, y2, z1);
    const v010 = project3d(x1, y2, z1);

    const v001 = project3d(x1, y1, z2);
    const v101 = project3d(x2, y1, z2);
    const v111 = project3d(x2, y2, z2);
    const v011 = project3d(x1, y2, z2);

    // Bottom
    addSegment(v000, v100, edgeType);
    addSegment(v100, v101, edgeType);
    addSegment(v101, v001, edgeType);
    addSegment(v001, v000, edgeType);

    // Top
    addSegment(v010, v110, edgeType);
    addSegment(v110, v111, edgeType);
    addSegment(v111, v011, edgeType);
    addSegment(v011, v010, edgeType);

    // Verticals
    addSegment(v000, v010, edgeType);
    addSegment(v100, v110, edgeType);
    addSegment(v101, v111, edgeType);
    addSegment(v001, v011, edgeType);
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

    // 1. Plinth Box
    if (kd.plinthH > 0) {
      addBox3d(30, 0, 30, kd.totalBaseW - 30, kd.plinthH, kd.baseDepth - 30, "interior");
    }

    // 2. Base Cabinets Run
    let curX = 0;
    kd.baseUnits.forEach((u) => {
      const uD = u.depth || kd.baseDepth;
      const uH = u.height || kd.maxBaseH;
      const uY = kd.plinthH;

      // Carcass outline box
      addBox3d(curX, uY, 0, curX + u.width, uY + uH, uD, "outline");
      // Side gables inner edges
      addBox3d(curX, uY, 0, curX + t, uY + uH, uD, "interior");
      addBox3d(curX + u.width - t, uY, 0, curX + u.width, uY + uH, uD, "interior");
      // Bottom panel
      addBox3d(curX + t, uY, 0, curX + u.width - t, uY + t, uD, "interior");

      // Drawers or Doors with Handles (Isometric View shows doors & details!)
      if (u.drawerCount > 0) {
        const dCount = u.drawerCount;
        const dH = (uH - t) / dCount;
        const curDoorStyle = u.doorStyle || params.doorStyle;
        const curHandleType = u.handleType || params.handleType || "bar";
        for (let di = 0; di < dCount; di++) {
          const dy = uY + di * dH + 2;
          const dh = dH - 4;
          // Drawer front face box
          addBox3d(curX + 2, dy, uD, curX + u.width - 2, dy + dh, uD + 18, "outline");
          addDoorFaceFeatures(curX + 2, dy, curX + u.width - 2, dy + dh, uD + 18, curDoorStyle);
          // Drawer handle (horizontal)
          const midY = dy + dh / 2;
          const midX = curX + u.width / 2;
          drawHandle3d(midX, midY, uD + 18, curHandleType, "horizontal", "center", u.width > 700 ? 110 : 70);
        }
      } else if (u.doorType === "singleLeft") {
        // Single Left door (hinged left, handle right)
        const curDoorStyle = u.doorStyle || params.doorStyle;
        const curHandleType = u.handleType || params.handleType || "bar";
        addBox3d(curX + 2, uY + 2, uD, curX + u.width - 2, uY + uH - 2, uD + 18, "outline");
        addDoorFaceFeatures(curX + 2, uY + 2, curX + u.width - 2, uY + uH - 2, uD + 18, curDoorStyle);
        const hX = curX + u.width - 35;
        const hY = uY + uH - 60;
        drawHandle3d(hX, hY, uD + 18, curHandleType, "vertical", "right");
      } else if (u.doorType === "singleRight") {
        // Single Right door (hinged right, handle left)
        const curDoorStyle = u.doorStyle || params.doorStyle;
        const curHandleType = u.handleType || params.handleType || "bar";
        addBox3d(curX + 2, uY + 2, uD, curX + u.width - 2, uY + uH - 2, uD + 18, "outline");
        addDoorFaceFeatures(curX + 2, uY + 2, curX + u.width - 2, uY + uH - 2, uD + 18, curDoorStyle);
        const hX = curX + 35;
        const hY = uY + uH - 60;
        drawHandle3d(hX, hY, uD + 18, curHandleType, "vertical", "left");
      } else if (u.doorType === "double" || u.doorType === "cornerDouble") {
        // Double doors / Corner double doors
        const curDoorStyle = u.doorStyle || params.doorStyle;
        const curHandleType = u.handleType || params.handleType || "bar";
        const midX = curX + u.width / 2;
        addBox3d(curX + 2, uY + 2, uD, midX - 2, uY + uH - 2, uD + 18, "outline");
        addDoorFaceFeatures(curX + 2, uY + 2, midX - 2, uY + uH - 2, uD + 18, curDoorStyle);
        addBox3d(midX + 2, uY + 2, uD, curX + u.width - 2, uY + uH - 2, uD + 18, "outline");
        addDoorFaceFeatures(midX + 2, uY + 2, curX + u.width - 2, uY + uH - 2, uD + 18, curDoorStyle);
        const hY = uY + uH - 60;
        drawHandle3d(midX - 25, hY, uD + 18, curHandleType, "vertical", "left");
        drawHandle3d(midX + 25, hY, uD + 18, curHandleType, "vertical", "right");
      } else if (u.internalShelves > 0) {
        // Open shelves
        const spacing = (uH - t * 2) / (u.internalShelves + 1);
        for (let s = 1; s <= u.internalShelves; s++) {
          const sy = uY + t + s * spacing;
          addBox3d(curX + t, sy - t / 2, 0, curX + u.width - t, sy + t / 2, uD - 15, "interior");
        }
      }

      curX += u.width;
    });

    // 3. Continuous Countertop Slab (overhang 10mm sides, 20mm front)
    const ctY = kd.plinthH + kd.maxBaseH;
    addBox3d(-10, ctY, 0, kd.totalBaseW + 10, ctY + kd.countertopThick, kd.baseDepth + 20, "outline");

    // 4. Upper Wall Cabinets
    if (kd.wallUnits.length > 0) {
      const wallY = ctY + kd.countertopThick + kd.splashH;
      let curWallX = 0;
      kd.wallUnits.forEach((wu) => {
        const wuD = wu.depth || kd.wallDepth;
        const wuH = wu.height || kd.maxWallH;

        // Wall Carcass Box (flush against wall Z = 0)
        addBox3d(curWallX, wallY, 0, curWallX + wu.width, wallY + wuH, wuD, "outline");
        addBox3d(curWallX, wallY, 0, curWallX + t, wallY + wuH, wuD, "interior");
        addBox3d(curWallX + wu.width - t, wallY, 0, curWallX + wu.width, wallY + wuH, wuD, "interior");
        addBox3d(curWallX + t, wallY, 0, curWallX + wu.width - t, wallY + t, wuD, "interior");
        addBox3d(curWallX + t, wallY + wuH - t, 0, curWallX + wu.width - t, wallY + wuH, wuD, "interior");

        // Wall Doors & Handles (handles at lower edge for reach)
        const hY = wallY + 60;
        const curDoorStyle = wu.doorStyle || params.doorStyle;
        const curHandleType = wu.handleType || params.handleType || "bar";
        if (wu.doorType === "singleLeft") {
          addBox3d(curWallX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline");
          addDoorFaceFeatures(curWallX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, curDoorStyle);
          const hX = curWallX + wu.width - 35;
          drawHandle3d(hX, hY, wuD + 18, curHandleType, "vertical", "right");
        } else if (wu.doorType === "singleRight") {
          addBox3d(curWallX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline");
          addDoorFaceFeatures(curWallX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, curDoorStyle);
          const hX = curWallX + 35;
          drawHandle3d(hX, hY, wuD + 18, curHandleType, "vertical", "left");
        } else if (wu.doorType === "double" || wu.doorType === "cornerDouble") {
          const midX = curWallX + wu.width / 2;
          addBox3d(curWallX + 2, wallY + 2, wuD, midX - 2, wallY + wuH - 2, wuD + 18, "outline");
          addDoorFaceFeatures(curWallX + 2, wallY + 2, midX - 2, wallY + wuH - 2, wuD + 18, curDoorStyle);
          addBox3d(midX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline");
          addDoorFaceFeatures(midX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, curDoorStyle);
          drawHandle3d(midX - 25, hY, wuD + 18, curHandleType, "vertical", "left");
          drawHandle3d(midX + 25, hY, wuD + 18, curHandleType, "vertical", "right");
        } else if (wu.doorType === "flipUp") {
          addBox3d(curWallX + 2, wallY + 2, wuD, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, "outline");
          addDoorFaceFeatures(curWallX + 2, wallY + 2, curWallX + wu.width - 2, wallY + wuH - 2, wuD + 18, curDoorStyle);
          const midX = curWallX + wu.width / 2;
          drawHandle3d(midX, hY, wuD + 18, curHandleType, "horizontal", "center");
        } else if (wu.internalShelves > 0) {
          const spacing = (wuH - t * 2) / (wu.internalShelves + 1);
          for (let s = 1; s <= wu.internalShelves; s++) {
            const sy = wallY + t + s * spacing;
            addBox3d(curWallX + t, sy - t / 2, 0, curWallX + wu.width - t, sy + t / 2, wuD - 15, "interior");
          }
        }

        curWallX += wu.width;
      });
    }
  } else if (params.category === "Wardrobe") {
    const wd = getWardrobeData(params);

    // Plinth
    if (wd.plinthH > 0) {
      addBox3d(30, 0, 30, wd.totalW - 30, wd.plinthH, wd.depth - 30, "interior");
    }

    // Main Bays
    let curX = 0;
    wd.mainUnits.forEach((u) => {
      const uY = wd.plinthH;
      // Carcass
      addBox3d(curX, uY, 0, curX + u.width, uY + u.height, wd.depth, "outline");
      addBox3d(curX, uY, 0, curX + t, uY + u.height, wd.depth, "interior");
      addBox3d(curX + u.width - t, uY, 0, curX + u.width, uY + u.height, wd.depth, "interior");
      addBox3d(curX + t, uY, 0, curX + u.width - t, uY + t, wd.depth, "interior");
      addBox3d(curX + t, uY + u.height - t, 0, curX + u.width - t, uY + u.height, wd.depth, "interior");

      // Drawers at bottom if enabled
      let dSpaceH = 0;
      const isConcealed = u.drawerType === "internal";
      const isSliding = u.doorType === "sliding";

      if (u.hasDrawers && (u.drawerCount || 0) > 0) {
        const dCount = u.drawerCount || 2;
        const dH = u.drawerHeight || 180;
        dSpaceH = dCount * dH;

        // If not concealed (external drawers) or open carcass: draw exterior drawer facade
        if (!isConcealed || u.doorType === "open") {
          const curDoorStyle = u.doorStyle || params.doorStyle;
          const curHandleType = u.handleType || params.handleType || "bar";
          for (let di = 0; di < dCount; di++) {
            const dy = uY + t + di * dH + 2;
            addBox3d(curX + 2, dy, wd.depth, curX + u.width - 2, dy + dH - 4, wd.depth + 18, "outline");
            addDoorFaceFeatures(curX + 2, dy, curX + u.width - 2, dy + dH - 4, wd.depth + 18, curDoorStyle);
            // Drawer handle
            const midX = curX + u.width / 2;
            const midY = dy + (dH - 4) / 2;
            drawHandle3d(midX, midY, wd.depth + 18, curHandleType, "horizontal", "center");
          }
        }
      }

      // Doors:
      // If sliding door with internal drawers (or no drawers), doors run full carcass height!
      const doorRunsFullHeight = isSliding && (isConcealed || !u.hasDrawers);
      const doorStartY = doorRunsFullHeight ? (uY + t + 2) : (uY + t + dSpaceH + 2);
      const doorH = doorRunsFullHeight ? (u.height - t * 2 - 4) : (u.height - t * 2 - dSpaceH - 4);

      if (doorH > 50 && u.doorType !== "open") {
        const curDoorStyle = u.doorStyle || params.doorStyle;
        const curHandleType = u.handleType || params.handleType || "bar";
        if (isSliding) {
          // Sliding doors: 2 leaves in offset Z planes
          const leafW = (u.width - t * 2) / 2 + 18;
          // Rear leaf at z = wd.depth - 55
          addBox3d(curX + t, doorStartY, wd.depth - 55, curX + t + leafW, doorStartY + doorH, wd.depth - 37, "outline");
          addDoorFaceFeatures(curX + t, doorStartY, curX + t + leafW, doorStartY + doorH, wd.depth - 37, curDoorStyle);
          // Front leaf at z = wd.depth - 20
          addBox3d(curX + u.width - t - leafW, doorStartY, wd.depth - 20, curX + u.width - t, doorStartY + doorH, wd.depth - 2, "outline");
          addDoorFaceFeatures(curX + u.width - t - leafW, doorStartY, curX + u.width - t, doorStartY + doorH, wd.depth - 2, curDoorStyle);
        } else if (u.doorType === "hingedDouble") {
          const midX = curX + u.width / 2;
          addBox3d(curX + 2, doorStartY, wd.depth, midX - 2, doorStartY + doorH, wd.depth + 18, "outline");
          addDoorFaceFeatures(curX + 2, doorStartY, midX - 2, doorStartY + doorH, wd.depth + 18, curDoorStyle);
          addBox3d(midX + 2, doorStartY, wd.depth, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, "outline");
          addDoorFaceFeatures(midX + 2, doorStartY, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, curDoorStyle);
          // Handles
          const hY = doorStartY + doorH / 2;
          drawHandle3d(midX - 25, hY, wd.depth + 18, curHandleType, "vertical", "left", doorH > 1500 ? 120 : 70);
          drawHandle3d(midX + 25, hY, wd.depth + 18, curHandleType, "vertical", "right", doorH > 1500 ? 120 : 70);
        } else {
          // Single hinged door
          addBox3d(curX + 2, doorStartY, wd.depth, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, "outline");
          addDoorFaceFeatures(curX + 2, doorStartY, curX + u.width - 2, doorStartY + doorH, wd.depth + 18, curDoorStyle);
          const hY = doorStartY + doorH / 2;
          drawHandle3d(curX + u.width - 35, hY, wd.depth + 18, curHandleType, "vertical", "right", doorH > 1500 ? 120 : 70);
        }
      }

      curX += u.width;
    });

    // Top Units
    let curTopX = 0;
    wd.topUnits.forEach((tu) => {
      const tuY = wd.plinthH + wd.maxMainH;
      const curDoorStyle = tu.doorStyle || params.doorStyle;
      addBox3d(curTopX, tuY, 0, curTopX + tu.width, tuY + tu.height, wd.depth, "outline");
      addBox3d(curTopX + 2, tuY + 2, wd.depth, curTopX + tu.width - 2, tuY + tu.height - 2, wd.depth + 18, "outline");
      addDoorFaceFeatures(curTopX + 2, tuY + 2, curTopX + tu.width - 2, tuY + tu.height - 2, wd.depth + 18, curDoorStyle);
      curTopX += tu.width;
    });
  } else if (params.category === "Table" || params.category === "Desk") {
    const topT = params.tableTopThickness || 25;
    const legThick = params.legThickness || 50;
    const legIns = params.legInset || 25;
    const oHang = params.topOverhang || 25;

    // Tabletop
    addBox3d(0, H - topT, 0, W, H, D, "outline");

    // 4 Legs
    const xL = oHang + legIns;
    const xR = W - oHang - legIns - legThick;
    const zB = oHang + legIns;
    const zF = D - oHang - legIns - legThick;
    const legH = H - topT;

    addBox3d(xL, 0, zB, xL + legThick, legH, zB + legThick, "interior");
    addBox3d(xR, 0, zB, xR + legThick, legH, zB + legThick, "interior");
    addBox3d(xL, 0, zF, xL + legThick, legH, zF + legThick, "interior");
    addBox3d(xR, 0, zF, xR + legThick, legH, zF + legThick, "interior");

    // Apron rails
    const apronH = params.apronHeight || 65;
    addBox3d(xL + legThick, legH - apronH, zF, xR, legH, zF + 18, "interior");
    addBox3d(xL + legThick, legH - apronH, zB, xR, legH, zB + 18, "interior");

    // Front Drawer if enabled
    if (params.hasDrawers) {
      const dW = Math.min(W * 0.45, 500);
      const dH = Math.min(apronH * 0.85, 120);
      const dX = W / 2 - dW / 2;
      const dY = legH - apronH + (apronH - dH) / 2;
      addBox3d(dX, dY, zF + 15, dX + dW, dY + dH, zF + 25, "outline");
      // Handle
      const hP1 = project3d(W / 2 - 30, dY + dH / 2, zF + 35);
      const hP2 = project3d(W / 2 + 30, dY + dH / 2, zF + 35);
      addSegment(hP1, hP2, "outline");
    }
  } else {
    // Shelf & Generic Storage Carcass
    if (plinthH > 0) {
      const pRec = params.plinthRecess || 30;
      addBox3d(pRec, 0, pRec, W - pRec, plinthH, D - pRec, "interior");
    }

    const bodyY = plinthH;
    const bodyH = H - plinthH;

    // Outer Carcass Box
    addBox3d(0, bodyY, 0, W, bodyY + bodyH, D, "outline");
    addBox3d(0, bodyY, 0, t, bodyY + bodyH, D, "interior");
    addBox3d(W - t, bodyY, 0, W, bodyY + bodyH, D, "interior");
    addBox3d(t, bodyY, 0, W - t, bodyY + t, D, "interior");
    addBox3d(t, bodyY + bodyH - t, 0, W - t, bodyY + bodyH, D, "interior");

    // Shelves
    const shelfCount = params.internalShelves ?? 2;
    if (shelfCount > 0) {
      const spacing = (bodyH - t * 2) / (shelfCount + 1);
      for (let s = 1; s <= shelfCount; s++) {
        const sy = bodyY + t + s * spacing;
        addBox3d(t, sy - t / 2, 0, W - t, sy + t / 2, D - 15, "interior");
      }
    }

    // Vertical Divider Columns
    const cols = params.internalColumns || 1;
    if (cols > 1) {
      const colW = (W - t * 2) / cols;
      for (let c = 1; c < cols; c++) {
        const px = t + c * colW;
        addBox3d(px - t / 2, bodyY + t, 0, px + t / 2, bodyY + bodyH - t, D - 15, "interior");
      }
    }

    // Doors if enabled (Shelf usually open)
    if (params.category !== "Shelf" && params.doorType) {
      const frontZ = D;
      const doorGap = 2.5;
      const midX = W / 2;
      const curDoorStyle = params.doorStyle;
      const curHandleType = params.handleType || "bar";
      addBox3d(doorGap, bodyY + doorGap, frontZ, midX - doorGap / 2, bodyY + bodyH - doorGap, frontZ + 18, "outline");
      addDoorFaceFeatures(doorGap, bodyY + doorGap, midX - doorGap / 2, bodyY + bodyH - doorGap, frontZ + 18, curDoorStyle);
      addBox3d(midX + doorGap / 2, bodyY + doorGap, frontZ, W - doorGap, bodyY + bodyH - doorGap, frontZ + 18, "outline");
      addDoorFaceFeatures(midX + doorGap / 2, bodyY + doorGap, W - doorGap, bodyY + bodyH - doorGap, frontZ + 18, curDoorStyle);

      const hY = bodyY + bodyH / 2;
      drawHandle3d(midX - 35, hY, frontZ + 18, curHandleType, "vertical", "left");
      drawHandle3d(midX + 35, hY, frontZ + 18, curHandleType, "vertical", "right");
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
    rects,
    lines,
    circles,
    dimensions,
  };
}
