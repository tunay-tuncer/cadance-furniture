import { jsPDF } from "jspdf";
import { getDefaultFabricationNotes, ViewGeometry } from "./technicalDrawingUtils";
import { FurnitureParams } from "../modeler/FurnitureMesh";

export interface PdfExportOptions {
  pageSize: "A3" | "A4";
  orientation: "landscape" | "portrait";
  projectName?: string;
  clientName?: string;
  drawingTitle?: string;
  drawingNumber?: string;
  designer?: string;
  revision?: string;
  status?: string;
  notes?: string;
  scaleText?: string;
  unit?: "mm" | "cm";
  viewScale?: number;
  screenDimensions?: { width: number; height: number };
  rawViewPositions?: {
    [key: string]: { x: number; y: number };
  };
  showDimensions?: boolean;
  isoAngle?: number;
  viewTitles?: {
    top?: string;
    front?: string;
    side?: string;
    iso?: string;
  };
  viewPositions?: {
    [key: string]: { x: number; y: number };
  };
}

export function exportToPdf(
  params: FurnitureParams,
  front: ViewGeometry,
  top: ViewGeometry,
  side: ViewGeometry,
  iso: ViewGeometry,
  options: PdfExportOptions
) {
  const {
    pageSize = "A3",
    orientation = "landscape",
    projectName = "Parametric Furniture Project",
    clientName = "Cadance Studio",
    drawingTitle,
    drawingNumber = "DWG-101",
    designer = "Studio Designer",
    revision = "01",
    status = "FOR FABRICATION",
    notes,
    scaleText = "1:20",
    unit = "mm",
    viewTitles,
  } = options;

  const doc = new jsPDF({
    orientation: orientation === "portrait" ? "p" : "l",
    unit: "mm",
    format: pageSize.toLowerCase(),
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Screen-to-PDF millimeter conversion factor
  // Screen sheet has dimensions (1260x890 for A3 landscape, 920x650 for A4 landscape)
  const screenW = options.screenDimensions?.width || (pageSize === "A3" ? 1260 : 920);
  const pxToMm = pageWidth / screenW; // e.g. 420 / 1260 = 0.333333 mm per screen pixel

  // Unified Model Scale (mm_pdf per mm_model)
  // When viewScale from screen is multiplied by pxToMm, the model occupies the EXACT
  // same percentage of the paper sheet as on the interactive screen!
  let scale = options.viewScale ? options.viewScale * pxToMm : 0;
  if (!scale || scale <= 0) {
    const maxDim = Math.max(front.width, front.height, top.height, iso.width, 1200);
    const targetW = (pageSize === "A3" ? 420 : 320) * pxToMm;
    scale = targetW / maxDim;
  }

  // Margin for outer ISO 5457 drawing frame (matches screen's 12px / 16px frame)
  const margin = 6; // 6mm outer sheet margin

  // 1. OUTER DRAWING FRAME & INNER BORDER (ISO 5457)
  doc.setDrawColor(15, 23, 42); // Slate 900
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  doc.setDrawColor(100, 116, 139); // Slate 500
  doc.setLineWidth(0.25);
  doc.rect(margin + 2, margin + 2, pageWidth - margin * 2 - 4, pageHeight - margin * 2 - 4);

  // Coordinate Grid Reference Marks (ISO 5457)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("A", margin + 5, margin - 1.5);
  doc.text("B", pageWidth * 0.25, margin - 1.5);
  doc.text("C", pageWidth * 0.50, margin - 1.5);
  doc.text("D", pageWidth * 0.75, margin - 1.5);
  doc.text("1", margin - 2.5, pageHeight * 0.25);
  doc.text("2", margin - 2.5, pageHeight * 0.50);
  doc.text("3", margin - 2.5, pageHeight * 0.75);

  // 2. ISO 7200 TITLE BLOCK (Bottom Right Corner, exactly matching screen proportions)
  const tbW = Math.min(pageWidth * 0.32, 320 * pxToMm); // 320px on screen
  const tbH = 32; // 32mm height for 4 neat info rows
  const tbX = pageWidth - margin - 2 - tbW;
  const tbY = pageHeight - margin - 2 - tbH;

  // Title Block Outer Frame
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.setFillColor(255, 255, 255);
  doc.rect(tbX, tbY, tbW, tbH, "FD");

  // Row 1: Top (Project & Client)
  doc.setFillColor(248, 250, 252);
  doc.rect(tbX, tbY, tbW, 7.5, "F");
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(tbX, tbY + 7.5, tbX + tbW, tbY + 7.5);

  const displayTitle = (drawingTitle || projectName).toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(displayTitle.length > 34 ? displayTitle.slice(0, 32) + "..." : displayTitle, tbX + 2.5, tbY + 5.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  const clientStr = clientName.toUpperCase();
  doc.text(clientStr.length > 22 ? clientStr.slice(0, 20) + "..." : clientStr, tbX + tbW - 2.5, tbY + 5.2, { align: "right" });

  // Row 2: Middle (Furniture Category & Materials)
  doc.line(tbX, tbY + 15.5, tbX + tbW, tbY + 15.5);
  doc.line(tbX + tbW * 0.58, tbY + 7.5, tbX + tbW * 0.58, tbY + 15.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("FURNITURE / SYSTEM", tbX + 2.5, tbY + 10.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  const furnStr = `${params.category.toUpperCase()} (${params.name || "Custom"})`;
  doc.text(furnStr.length > 28 ? furnStr.slice(0, 26) + "..." : furnStr, tbX + 2.5, tbY + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("MATERIAL & BOARD", tbX + tbW * 0.58 + 2.5, tbY + 10.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${(params.materialType || "oak").toUpperCase()} / ${params.boardThickness || 18}mm`, tbX + tbW * 0.58 + 2.5, tbY + 14);

  // Row 3: Details (Dimensions, Ref & Status, Sheet & Scale)
  doc.line(tbX, tbY + 23.5, tbX + tbW, tbY + 23.5);
  doc.line(tbX + tbW * 0.40, tbY + 15.5, tbX + tbW * 0.40, tbY + 23.5);
  doc.line(tbX + tbW * 0.70, tbY + 15.5, tbX + tbW * 0.70, tbY + 23.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("DIMENSIONS (WxHxD)", tbX + 2.5, tbY + 18.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  const drawingWidth = front.width;
  const drawingHeight = front.height;
  const drawingDepth = top.height;
  const dimStr = unit === "cm"
    ? `${(drawingWidth / 10).toFixed(0)}x${(drawingHeight / 10).toFixed(0)}x${(drawingDepth / 10).toFixed(0)} cm`
    : `${Math.round(drawingWidth)}x${Math.round(drawingHeight)}x${Math.round(drawingDepth)} mm`;
  doc.text(dimStr, tbX + 2.5, tbY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("REF & STATUS", tbX + tbW * 0.40 + 2.5, tbY + 18.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(`${drawingNumber} | ${status}`, tbX + tbW * 0.40 + 2.5, tbY + 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("SHEET & SCALE", tbX + tbW * 0.70 + 2.5, tbY + 18.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(15, 23, 42);
  doc.text(`${pageSize}-${orientation[0].toUpperCase()} | ${scaleText}`, tbX + tbW * 0.70 + 2.5, tbY + 22);

  // Row 4: Legend & Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(37, 99, 235);
  doc.text("LEGEND & FABRICATION NOTES:", tbX + 2.5, tbY + 26.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(71, 85, 105);
  const legendNotesText = notes || getDefaultFabricationNotes(params.boardThickness, unit);
  doc.text(legendNotesText.length > 70 ? legendNotesText.slice(0, 67) + "..." : legendNotesText, tbX + 2.5, tbY + 30);

  // 3. RENDER 4 VIEWPORTS EXACTLY ACCORDING TO USER'S INTERACTIVE SCREEN ARRANGEMENT
  const getViewportPos = (key: "top" | "iso" | "front" | "side", defX: number, defY: number) => {
    if (options.rawViewPositions && options.rawViewPositions[key]) {
      return {
        x: options.rawViewPositions[key].x * pxToMm,
        y: options.rawViewPositions[key].y * pxToMm,
      };
    }
    if (options.viewPositions && options.viewPositions[key]) {
      return {
        x: options.viewPositions[key].x * pageWidth,
        y: options.viewPositions[key].y * pageHeight,
      };
    }
    return { x: defX, y: defY };
  };

  const col1X = 40 * pxToMm;
  const col2X = (pageWidth / 2) + (20 * pxToMm);
  const row1Y = 35 * pxToMm;
  const row2Y = (pageHeight / 2) - (20 * pxToMm);

  const topPos = getViewportPos("top", col1X, row1Y);
  const isoPos = getViewportPos("iso", col2X, row1Y);
  const frontPos = getViewportPos("front", col1X, row2Y);
  const sidePos = getViewportPos("side", col2X, row2Y);

  const renderViewGeometry = (
    view: ViewGeometry,
    cardX: number,
    cardY: number,
    title: string,
    scaleBadge: string
  ) => {
    // Model origin inside the viewport (matching the screen's 44px left padding, 56px top padding)
    const modelOriginX = cardX + 44 * pxToMm;
    const modelOriginY = cardY + 56 * pxToMm;

    // Viewport card width & header
    const cardW = Math.max(160, view.width * (options.viewScale || 0.2) + 80) * pxToMm;
    const headerH = 6.5; // mm

    // Viewport Header Bar (crisp architectural style)
    doc.setFillColor(248, 250, 252);
    doc.rect(cardX, cardY, cardW, headerH, "F");
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(cardX, cardY + headerH, cardX + cardW, cardY + headerH);

    // Title text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), cardX + 2, cardY + 4.6);

    // Scale badge on right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(scaleBadge, cardX + cardW - 2, cardY + 4.6, { align: "right" });

    // Draw Rectangles
    view.rects.forEach((r) => {
      const rx = modelOriginX + r.x * scale;
      const ry = modelOriginY + (view.height - (r.y + r.height)) * scale;
      const rw = r.width * scale;
      const rh = r.height * scale;

      if (r.type === "outline") {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.setLineDashPattern([], 0);
      } else if (r.type === "hidden") {
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([1.5, 1], 0);
      } else {
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([], 0);
      }
      doc.rect(rx, ry, rw, rh);
    });

    // Draw Lines
    view.lines.forEach((l) => {
      const lx1 = modelOriginX + l.x1 * scale;
      const ly1 = modelOriginY + (view.height - l.y1) * scale;
      const lx2 = modelOriginX + l.x2 * scale;
      const ly2 = modelOriginY + (view.height - l.y2) * scale;

      if (l.type === "outline") {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.4);
        doc.setLineDashPattern([], 0);
      } else if (l.type === "hidden") {
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([1.5, 1], 0);
      } else if (l.type === "centerline") {
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([3, 1, 1, 1], 0);
      } else {
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.22);
        doc.setLineDashPattern([], 0);
      }
      doc.line(lx1, ly1, lx2, ly2);
    });

    // Draw Circles
    view.circles.forEach((c) => {
      const cx = modelOriginX + c.cx * scale;
      const cy = modelOriginY + (view.height - c.cy) * scale;
      const cr = c.r * scale;
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.22);
      doc.setLineDashPattern([], 0);
      doc.circle(cx, cy, cr);
    });

    // Draw Dimension Lines (if enabled)
    if (options.showDimensions !== false) {
      view.dimensions.forEach((d) => {
        const dx1 = modelOriginX + d.x1 * scale;
        const dy1 = modelOriginY + (view.height - d.y1) * scale;
        const dx2 = modelOriginX + d.x2 * scale;
        const dy2 = modelOriginY + (view.height - d.y2) * scale;

        const rx1 = modelOriginX + d.refX1 * scale;
        const ry1 = modelOriginY + (view.height - d.refY1 * scale);
        const rx2 = modelOriginX + d.refX2 * scale;
        const ry2 = modelOriginY + (view.height - d.refY2 * scale);

        // Extension Witness Lines
        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.18);
        doc.setLineDashPattern([], 0);
        doc.line(rx1, ry1, dx1, dy1);
        doc.line(rx2, ry2, dx2, dy2);

        // Main Dimension Line
        doc.setLineWidth(0.22);
        doc.line(dx1, dy1, dx2, dy2);

        // 45° Architectural CAD Ticks
        const tick = 1.1;
        doc.setLineWidth(0.35);
        doc.line(dx1 - tick, dy1 + tick, dx1 + tick, dy1 - tick);
        doc.line(dx2 - tick, dy2 + tick, dx2 + tick, dy2 - tick);

        // Dimension Text with clean white background mask
        const midX = (dx1 + dx2) / 2;
        const midY = (dy1 + dy2) / 2;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(29, 78, 216);

        // White background mask so line doesn't slice through text
        const textW = Math.max(7, d.text.length * 1.6 + 2.5);
        const textH = 3.0;
        doc.setFillColor(255, 255, 255);
        doc.rect(midX - textW / 2, midY - textH / 2, textW, textH, "F");

        doc.text(d.text, midX, midY + 0.9, { align: "center" });
      });
    }
  };

  // Render 4 views onto sheet exactly matching interactive screen layout
  renderViewGeometry(
    top,
    topPos.x,
    topPos.y,
    viewTitles?.top || "Plan (Top View)",
    scaleText
  );
  renderViewGeometry(
    iso,
    isoPos.x,
    isoPos.y,
    viewTitles?.iso || `3D Isometric Projection (${options.isoAngle || 45}°)`,
    "VISIBLE EDGES ONLY"
  );
  renderViewGeometry(
    front,
    frontPos.x,
    frontPos.y,
    viewTitles?.front || "Front Elevation",
    scaleText
  );
  renderViewGeometry(
    side,
    sidePos.x,
    sidePos.y,
    viewTitles?.side || "Side Elevation",
    scaleText
  );

  // Save PDF
  const safeName = (drawingTitle || params.name || "furniture").replace(/\s+/g, "-").toLowerCase();
  doc.save(`${safeName}-technical-drawing-${pageSize.toLowerCase()}.pdf`);
}
