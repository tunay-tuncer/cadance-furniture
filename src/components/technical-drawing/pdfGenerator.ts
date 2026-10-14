import { jsPDF } from "jspdf";
import { ViewGeometry } from "./technicalDrawingUtils";
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
  viewTitles?: {
    top?: string;
    front?: string;
    side?: string;
    iso?: string;
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
    viewTitles,
  } = options;

  const doc = new jsPDF({
    orientation: orientation === "portrait" ? "p" : "l",
    unit: "mm",
    format: pageSize.toLowerCase(),
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10; // 10mm border margin

  // 1. OUTER DRAWING FRAME & INNER BORDER (ISO 5457)
  doc.setDrawColor(15, 23, 42); // Slate 900
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  doc.setLineWidth(0.25);
  doc.rect(margin + 2, margin + 2, pageWidth - margin * 2 - 4, pageHeight - margin * 2 - 4);

  // 2. ISO 7200 TITLE BLOCK (Bottom Right Corner)
  const tbW = 135;
  const tbH = 40;
  const tbX = pageWidth - margin - 2 - tbW;
  const tbY = pageHeight - margin - 2 - tbH;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.35);
  doc.rect(tbX, tbY, tbW, tbH);

  // Divider lines inside Title Block
  doc.line(tbX, tbY + 12, tbX + tbW, tbY + 12);
  doc.line(tbX, tbY + 24, tbX + tbW, tbY + 24);
  doc.line(tbX + 70, tbY + 12, tbX + 70, tbY + 32);
  doc.line(tbX, tbY + 32, tbX + tbW, tbY + 32);

  // Title Block Typography
  const displayTitle = (drawingTitle || projectName).toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(displayTitle, tbX + 3, tbY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`CLIENT: ${clientName.toUpperCase()} | REF: ${drawingNumber}`, tbX + 3, tbY + 9.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text(`FURNITURE: ${params.category.toUpperCase()} (${params.name || "Custom"})`, tbX + 3, tbY + 16.5);
  doc.setFont("helvetica", "normal");
  doc.text(`DIMENSIONS: ${Math.round(params.width)}W x ${Math.round(params.height)}H x ${Math.round(params.depth)}D mm`, tbX + 3, tbY + 20.5);

  doc.text(`MATERIAL: ${(params.materialType || "oak").toUpperCase()}`, tbX + 73, tbY + 16.5);
  doc.text(`BOARD: ${params.boardThickness || 18} mm | STATUS: ${status}`, tbX + 73, tbY + 20.5);

  doc.text(`DATE: ${new Date().toISOString().split("T")[0]}`, tbX + 3, tbY + 28);
  doc.text(`DRAUGHTSPERSON: ${designer.toUpperCase()}`, tbX + 35, tbY + 28);
  doc.text(`REV: ${revision} | SCALE: ${scaleText}`, tbX + 85, tbY + 28);

  // Notes & Legend Bar at the bottom of the title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(37, 99, 235);
  doc.text("FABRICATION NOTES & LEGEND:", tbX + 3, tbY + 35.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  const legendNotesText = notes || "All dimensions in mm. Verify on site prior to joinery manufacturing.";
  doc.text(legendNotesText.length > 80 ? legendNotesText.slice(0, 77) + "..." : legendNotesText, tbX + 3, tbY + 38.5);

  // 3. RENDER 4 VIEWPORTS ONTO SHEET
  // Usable area on page (excluding margins and title block)
  const availW = pageWidth - margin * 2 - 10;
  const availH = pageHeight - margin * 2 - 10;

  // Compute a unified scale so all 4 views fit comfortably
  const maxModelW = Math.max(front.width, top.width, side.width, iso.width, 1000);
  const maxModelH = Math.max(front.height, top.height, side.height, iso.height, 1000);
  // Scale factor (from model mm to sheet mm)
  const scale = Math.min(
    (availW / 2.4) / maxModelW,
    (availH / 2.4) / maxModelH,
    0.15 // max 1:6.6 scale
  );

  // Viewport positions on paper (in mm)
  // [ TOP VIEW ]           [ ISOMETRIC VIEW ]
  // [ FRONT ELEVATION ]    [ SIDE SECTION ]
  const col1X = margin + 12;
  const col2X = margin + availW / 2 + 6;
  const row1Y = margin + 14;
  const row2Y = margin + availH / 2 + 4;

  const renderViewGeometry = (view: ViewGeometry, originX: number, originY: number, title: string) => {
    // Title tag
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(title, originX, originY - 3);

    const vH = view.height * scale;

    // Draw Rectangles
    view.rects.forEach(r => {
      const rx = originX + r.x * scale;
      // In PDF, Y goes downwards from top to bottom
      const ry = originY + (vH - (r.y + r.height) * scale);
      const rw = r.width * scale;
      const rh = r.height * scale;

      if (r.type === "outline") {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.45);
        doc.setLineDashPattern([], 0);
      } else if (r.type === "hidden") {
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([1.5, 1], 0);
      } else {
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([], 0);
      }
      doc.rect(rx, ry, rw, rh);
    });

    // Draw Lines
    view.lines.forEach(l => {
      const lx1 = originX + l.x1 * scale;
      const ly1 = originY + (vH - l.y1 * scale);
      const lx2 = originX + l.x2 * scale;
      const ly2 = originY + (vH - l.y2 * scale);

      if (l.type === "outline") {
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.45);
        doc.setLineDashPattern([], 0);
      } else if (l.type === "hidden") {
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([1.5, 1], 0);
      } else if (l.type === "centerline") {
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([3, 1, 1, 1], 0);
      } else {
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.25);
        doc.setLineDashPattern([], 0);
      }
      doc.line(lx1, ly1, lx2, ly2);
    });

    // Draw Circles
    view.circles.forEach(c => {
      const cx = originX + c.cx * scale;
      const cy = originY + (vH - c.cy * scale);
      const cr = c.r * scale;
      doc.setDrawColor(51, 65, 85);
      doc.setLineWidth(0.25);
      doc.setLineDashPattern([], 0);
      doc.circle(cx, cy, cr);
    });

    // Draw Dimension Lines
    view.dimensions.forEach(d => {
      doc.setDrawColor(37, 99, 235); // Blue
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([], 0);

      const dx1 = originX + d.x1 * scale;
      const dy1 = originY + (vH - d.y1 * scale);
      const dx2 = originX + d.x2 * scale;
      const dy2 = originY + (vH - d.y2 * scale);

      // Dimension Line
      doc.line(dx1, dy1, dx2, dy2);

      // Extension Witness Lines
      const rx1 = originX + d.refX1 * scale;
      const ry1 = originY + (vH - d.refY1 * scale);
      const rx2 = originX + d.refX2 * scale;
      const ry2 = originY + (vH - d.refY2 * scale);
      doc.line(rx1, ry1, dx1, dy1);
      doc.line(rx2, ry2, dx2, dy2);

      // 45° CAD Tick Marks
      const tick = 1.2;
      doc.line(dx1 - tick, dy1 + tick, dx1 + tick, dy1 - tick);
      doc.line(dx2 - tick, dy2 + tick, dx2 + tick, dy2 - tick);

      // Dimension Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(37, 99, 235);
      const midX = (dx1 + dx2) / 2;
      const midY = (dy1 + dy2) / 2 - 1;
      doc.text(d.text, midX, midY, { align: "center" });
    });
  };

  // Render 4 views onto sheet
  renderViewGeometry(top, col1X, row1Y, (viewTitles?.top || "PLAN / TOP VIEW (DOORS HIDDEN)").toUpperCase());
  renderViewGeometry(iso, col2X, row1Y, (viewTitles?.iso || "ISOMETRIC VIEW (DOORS VISIBLE)").toUpperCase());
  renderViewGeometry(front, col1X, row2Y, (viewTitles?.front || "FRONT ELEVATION (DOORS HIDDEN)").toUpperCase());
  renderViewGeometry(side, col2X, row2Y, (viewTitles?.side || "SIDE / CROSS-SECTION (DOORS HIDDEN)").toUpperCase());

  // Save PDF
  const safeName = (params.name || "furniture").replace(/\s+/g, "-").toLowerCase();
  doc.save(`${safeName}-technical-drawing-${pageSize.toLowerCase()}.pdf`);
}
