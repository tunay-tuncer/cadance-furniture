import { ViewGeometry, DimensionLineData } from "./technicalDrawingUtils";
import { FurnitureParams } from "../modeler/FurnitureMesh";

/**
 * Generates an AutoCAD R12 / R2000 compliant ASCII DXF file
 * Universally readable by AutoCAD (.dwg), Rhino, SolidWorks, LibreCAD, Fusion 360, and CNC CAM.
 */
export interface DxfMetaOptions {
  clientName?: string;
  drawingNumber?: string;
  designer?: string;
  revision?: string;
  status?: string;
  notes?: string;
  unit?: "mm" | "cm";
}

export function exportToDxf(
  params: FurnitureParams,
  front: ViewGeometry,
  top: ViewGeometry,
  side: ViewGeometry,
  iso: ViewGeometry,
  projectName: string = "Parametric Furniture",
  meta?: DxfMetaOptions
): string {
  const lines: string[] = [];

  // DXF Header
  lines.push("0", "SECTION");
  lines.push("2", "HEADER");
  lines.push("9", "$ACADVER");
  lines.push("1", "AC1009"); // AutoCAD R12 universal standard
  lines.push("9", "$INSUNITS");
  lines.push("70", meta?.unit === "cm" ? "5" : "4"); // 4 = Millimeters, 5 = Centimeters
  lines.push("0", "ENDSEC");

  // TABLES Section (Layers definition)
  lines.push("0", "SECTION");
  lines.push("2", "TABLES");
  lines.push("0", "TABLE");
  lines.push("2", "LAYER");
  lines.push("70", "6");

  // Layer 0_OUTLINE (Thick Perimeter Contour - Color 7: White/Black)
  lines.push("0", "LAYER", "2", "0_OUTLINE", "70", "0", "62", "7", "6", "CONTINUOUS");
  // Layer 0_INTERIOR (Interior Joinery & Shelves - Color 8: Dark Gray)
  lines.push("0", "LAYER", "2", "0_INTERIOR", "70", "0", "62", "8", "6", "CONTINUOUS");
  // Layer 0_HIDDEN (Hidden Carcass Edges - Color 9: Light Gray)
  lines.push("0", "LAYER", "2", "0_HIDDEN", "70", "0", "62", "9", "6", "HIDDEN");
  // Layer 0_DIMS (Dimension Lines & Extension Witness Lines - Color 4: Cyan)
  lines.push("0", "LAYER", "2", "0_DIMS", "70", "0", "62", "4", "6", "CONTINUOUS");
  // Layer 0_TEXT (Annotations & Title Info - Color 3: Green)
  lines.push("0", "LAYER", "2", "0_TEXT", "70", "0", "62", "3", "6", "CONTINUOUS");
  // Layer 0_TITLEBLOCK (Sheet Border & Block - Color 1: Red)
  lines.push("0", "LAYER", "2", "0_TITLEBLOCK", "70", "0", "62", "1", "6", "CONTINUOUS");

  lines.push("0", "ENDTAB");
  lines.push("0", "ENDSEC");

  // ENTITIES Section (Geometric primitives)
  lines.push("0", "SECTION");
  lines.push("2", "ENTITIES");

  // Helper to add DXF LINE
  const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
    lines.push("0", "LINE");
    lines.push("8", layer);
    lines.push("10", x1.toFixed(2));
    lines.push("20", y1.toFixed(2));
    lines.push("30", "0.0");
    lines.push("11", x2.toFixed(2));
    lines.push("21", y2.toFixed(2));
    lines.push("31", "0.0");
  };

  // Helper to add DXF TEXT
  const addText = (text: string, x: number, y: number, height: number = 25, layer: string = "0_TEXT") => {
    lines.push("0", "TEXT");
    lines.push("8", layer);
    lines.push("10", x.toFixed(2));
    lines.push("20", y.toFixed(2));
    lines.push("30", "0.0");
    lines.push("40", height.toFixed(2));
    lines.push("1", text);
  };

  // Helper to add Rect as 4 Lines
  const addRect = (x: number, y: number, w: number, h: number, layer: string) => {
    addLine(x, y, x + w, y, layer);
    addLine(x + w, y, x + w, y + h, layer);
    addLine(x + w, y + h, x, y + h, layer);
    addLine(x, y + h, x, y, layer);
  };

  // Helper to add Dimension entity
  const addDimension = (d: DimensionLineData, offX: number, offY: number) => {
    // Dimension line
    addLine(d.x1 + offX, d.y1 + offY, d.x2 + offX, d.y2 + offY, "0_DIMS");
    // Extension line 1
    addLine(d.refX1 + offX, d.refY1 + offY, d.x1 + offX, d.y1 + offY, "0_DIMS");
    // Extension line 2
    addLine(d.refX2 + offX, d.refY2 + offY, d.x2 + offX, d.y2 + offY, "0_DIMS");
    // Text label
    const midX = (d.x1 + d.x2) / 2 + offX;
    const midY = (d.y1 + d.y2) / 2 + offY + 8;
    addText(d.text, midX, midY, 20, "0_DIMS");
  };

  // Arrange Views in Standard First-Angle Orthographic Layout in Model Space (Millimeters)
  // [ TOP VIEW ]            [ ISOMETRIC VIEW ]
  // [ FRONT ELEVATION ]     [ SIDE SECTION ]

  const gap = 300; // 300mm gap between CAD viewports in model space
  const frontOriginX = 200;
  const frontOriginY = 200;

  // 1. FRONT ELEVATION
  addText("FRONT ELEVATION (DOORS HIDDEN)", frontOriginX, frontOriginY + front.height + 40, 30, "0_TEXT");
  front.rects.forEach(r => {
    const layer = r.type === "outline" ? "0_OUTLINE" : r.type === "hidden" ? "0_HIDDEN" : "0_INTERIOR";
    addRect(frontOriginX + r.x, frontOriginY + r.y, r.width, r.height, layer);
  });
  front.lines.forEach(l => {
    const layer = l.type === "outline" ? "0_OUTLINE" : l.type === "hidden" ? "0_HIDDEN" : "0_INTERIOR";
    addLine(frontOriginX + l.x1, frontOriginY + l.y1, frontOriginX + l.x2, frontOriginY + l.y2, layer);
  });
  front.dimensions.forEach(d => addDimension(d, frontOriginX, frontOriginY));

  // 2. PLAN / TOP VIEW (placed directly above front elevation)
  const topOriginX = frontOriginX;
  const topOriginY = frontOriginY + front.height + gap;
  addText("PLAN / TOP VIEW (DOORS HIDDEN)", topOriginX, topOriginY + top.height + 40, 30, "0_TEXT");
  top.rects.forEach(r => {
    const layer = r.type === "outline" ? "0_OUTLINE" : r.type === "hidden" ? "0_HIDDEN" : "0_INTERIOR";
    addRect(topOriginX + r.x, topOriginY + r.y, r.width, r.height, layer);
  });
  top.lines.forEach(l => {
    const layer = l.type === "outline" ? "0_OUTLINE" : l.type === "hidden" ? "0_HIDDEN" : "0_INTERIOR";
    addLine(topOriginX + l.x1, topOriginY + l.y1, topOriginX + l.x2, topOriginY + l.y2, layer);
  });
  top.dimensions.forEach(d => addDimension(d, topOriginX, topOriginY));

  // 3. SIDE SECTION (placed to the right of front elevation)
  const sideOriginX = frontOriginX + Math.max(front.width, top.width) + gap;
  const sideOriginY = frontOriginY;
  addText("SIDE / CROSS-SECTION", sideOriginX, sideOriginY + side.height + 40, 30, "0_TEXT");
  side.rects.forEach(r => {
    const layer = r.type === "outline" ? "0_OUTLINE" : r.type === "hidden" ? "0_HIDDEN" : "0_INTERIOR";
    addRect(sideOriginX + r.x, sideOriginY + r.y, r.width, r.height, layer);
  });
  side.lines.forEach(l => {
    const layer = l.type === "outline" ? "0_OUTLINE" : l.type === "hidden" ? "0_HIDDEN" : "0_INTERIOR";
    addLine(sideOriginX + l.x1, sideOriginY + l.y1, sideOriginX + l.x2, sideOriginY + l.y2, layer);
  });
  side.dimensions.forEach(d => addDimension(d, sideOriginX, sideOriginY));

  // 4. ISOMETRIC VIEW (placed to the right of top view, doors visible!)
  const isoOriginX = sideOriginX;
  const isoOriginY = topOriginY;
  addText("ISOMETRIC PROJECTION (DOORS VISIBLE)", isoOriginX, isoOriginY + iso.height + 40, 30, "0_TEXT");
  iso.lines.forEach(l => {
    const layer = l.type === "outline" ? "0_OUTLINE" : "0_INTERIOR";
    addLine(isoOriginX + l.x1, isoOriginY + l.y1, isoOriginX + l.x2, isoOriginY + l.y2, layer);
  });

  // CAD Title Block border in Model Space
  const totalSheetW = sideOriginX + Math.max(side.width, iso.width) + 300;
  const totalSheetH = topOriginY + Math.max(top.height, iso.height) + 200;
  addRect(50, 50, totalSheetW, totalSheetH, "0_TITLEBLOCK");
  addRect(totalSheetW - 420, 60, 400, 160, "0_TITLEBLOCK");
  addText(`PROJECT: ${projectName}`, totalSheetW - 400, 200, 20, "0_TEXT");
  if (meta?.clientName) {
    addText(`CLIENT: ${meta.clientName}`, totalSheetW - 400, 180, 15, "0_TEXT");
  }
  addText(`TYPE: ${params.category.toUpperCase()} (${params.name || "Custom"})`, totalSheetW - 400, 160, 15, "0_TEXT");
  addText(`REF: ${meta?.drawingNumber || "DWG-101"} | REV: ${meta?.revision || "01"}`, totalSheetW - 400, 140, 14, "0_TEXT");
  addText(`STATUS: ${meta?.status || "FOR FABRICATION"}`, totalSheetW - 400, 120, 14, "0_TEXT");
  addText(`MATERIAL: ${(params.materialType || "oak").toUpperCase()} | BOARD: ${params.boardThickness || 18}mm`, totalSheetW - 400, 100, 13, "0_TEXT");
  addText(`DATE: ${new Date().toISOString().split("T")[0]}`, totalSheetW - 400, 80, 13, "0_TEXT");
  if (meta?.notes) {
    addText(`NOTES: ${meta.notes}`, 60, 30, 14, "0_TEXT");
  }

  lines.push("0", "ENDSEC");
  lines.push("0", "EOF");

  return lines.join("\n");
}

/**
 * Triggers a browser download of the generated DXF file
 */
export function downloadDxfFile(dxfContent: string, fileName: string = "furniture-technical-drawing.dxf") {
  const blob = new Blob([dxfContent], { type: "application/dxf;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
