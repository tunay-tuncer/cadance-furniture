"use client";

import React, { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { FurnitureParams, TechnicalDrawingSettings } from "../modeler/FurnitureMesh";
import {
  generateFrontElevation,
  generatePlanTopView,
  generateSideSectionView,
  generateIsometricView,
  ViewGeometry,
} from "./technicalDrawingUtils";
import { exportToPdf } from "./pdfGenerator";
import { exportToDxf, downloadDxfFile } from "./dxfGenerator";
import {
  MdPictureAsPdf,
  MdStraighten,
  MdRefresh,
  MdZoomIn,
  MdZoomOut,
  MdFitScreen,
  MdFileDownload,
  MdCropLandscape,
  MdCropPortrait,
  MdScreenRotation,
  MdEditNote,
  MdCenterFocusStrong,
} from "react-icons/md";
import styles from "./technical-drawing.module.css";

export type ViewKey = "top" | "iso" | "front" | "side";

export interface SnapMarker {
  x: number;
  y: number;
}

export interface SnapGuide {
  id: string;
  type: "horizontal" | "vertical";
  pos: number;
  label: string;
  markers: SnapMarker[];
}

export interface ViewMetrics {
  key: ViewKey;
  svgW: number;
  svgH: number;
  boxLeft: number;
  boxRight: number;
  boxCenterX: number;
  boxTop: number;
  boxBottom: number;
  boxCenterY: number;
  modelLeft: number;
  modelRight: number;
  modelCenterX: number;
  modelTop: number;
  modelBottom: number;
  modelCenterY: number;
}

interface TechnicalDrawingWorkspaceProps {
  params: FurnitureParams;
  setParams?: React.Dispatch<React.SetStateAction<FurnitureParams>>;
  projectName?: string;
  clientName?: string;
  onOpenSettings?: () => void;
}

export default function TechnicalDrawingWorkspace({
  params,
  setParams,
  projectName = "Parametric Furniture Design",
  clientName = "Cadance Studio",
  onOpenSettings,
}: TechnicalDrawingWorkspaceProps) {
  // Read reactive drawing settings with robust fallbacks
  const drawingSettings = params.drawingSettings || {};
  const pageSize = drawingSettings.pageSize || "A3";
  const orientation = drawingSettings.orientation || "landscape";
  const showDimensions = drawingSettings.showDimensions !== undefined ? drawingSettings.showDimensions : true;
  const isoAngle = drawingSettings.isoAngle ?? 45;
  const isoElevation = drawingSettings.isoElevation ?? 30;
  const scaleMode = drawingSettings.scaleMode || "auto";
  const customScale = drawingSettings.customScale || 0.1;
  const unit = drawingSettings.unit || "mm";

  const drawingTitle = drawingSettings.drawingTitle || projectName || params.name || "Parametric Furniture Design";
  const effectiveClientName = drawingSettings.clientName || clientName || "Cadance Studio";
  const drawingNumber = drawingSettings.drawingNumber || "DWG-101";
  const designer = drawingSettings.designer || "Studio Engineer";
  const revision = drawingSettings.revision || "Rev 01";
  const status = drawingSettings.status || "FOR FABRICATION";
  const notes = drawingSettings.notes || `18mm MFC Carcass. All dimensions in ${unit}. Verify all site measurements prior to joinery fabrication.`;

  // Custom or standard View Titles (User Editable)
  const viewTitles = useMemo(() => ({
    top: drawingSettings.viewTitles?.top || "Plan (Top View)",
    front: drawingSettings.viewTitles?.front || "Front Elevation (Interior Joinery & Shelves)",
    side: drawingSettings.viewTitles?.side || "Side / Cross-Section",
    iso: drawingSettings.viewTitles?.iso || `3D Isometric Projection (${isoAngle}°)`,
  }), [drawingSettings.viewTitles, isoAngle]);

  // Inline Title Editing state
  const [editingTitleKey, setEditingTitleKey] = useState<"top" | "iso" | "front" | "side" | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState<string>("");

  // Paper Pixel Dimensions on Screen (Crisp vector resolution)
  const paperDimensions = useMemo(() => {
    if (pageSize === "A3") {
      return orientation === "landscape"
        ? { width: 1260, height: 890 }
        : { width: 890, height: 1260 };
    } else {
      return orientation === "landscape"
        ? { width: 920, height: 650 }
        : { width: 650, height: 920 };
    }
  }, [pageSize, orientation]);

  // Canvas viewport container reference
  const canvasRef = useRef<HTMLDivElement>(null);

  // Pan state (pixel translation of the paper sheet origin)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Sheet zoom state (auto-fitted on mount)
  const [sheetZoom, setSheetZoom] = useState<number>(pageSize === "A3" ? 0.7 : 0.85);
  // Active panning flag for styling cursor
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Synchronous refs to prevent race conditions during native mouse/wheel events
  const panRef = useRef(pan);
  const zoomRef = useRef(sheetZoom);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ mouseX: number; mouseY: number; initialPanX: number; initialPanY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialPanX: 0,
    initialPanY: 0,
  });

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = sheetZoom;
  }, [sheetZoom]);

  // Fit and center the drawing sheet within the available canvas screen
  const fitSheetToScreen = useCallback(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const margin = 48; // Padding around paper sheet
    const availW = Math.max(100, rect.width - margin * 2);
    const availH = Math.max(100, rect.height - margin * 2);

    const scaleX = availW / paperDimensions.width;
    const scaleY = availH / paperDimensions.height;
    const fitZoom = Math.min(scaleX, scaleY, 1.25);
    const roundedZoom = Math.max(0.25, Number(fitZoom.toFixed(2)));

    const centeredX = (rect.width - paperDimensions.width * roundedZoom) / 2;
    const centeredY = (rect.height - paperDimensions.height * roundedZoom) / 2;

    setSheetZoom(roundedZoom);
    setPan({ x: Math.round(centeredX), y: Math.round(centeredY) });
  }, [paperDimensions]);

  // Step zoom in/out anchored to screen center
  const zoomStep = (factor: number) => {
    const canvasEl = canvasRef.current;
    const rect = canvasEl?.getBoundingClientRect();
    const mouseX = rect ? rect.width / 2 : 400;
    const mouseY = rect ? rect.height / 2 : 300;

    const prevZoom = zoomRef.current;
    const nextZoom = Math.min(2.5, Math.max(0.25, Number((prevZoom * factor).toFixed(2))));
    if (nextZoom === prevZoom) return;

    const prevPan = panRef.current;
    const ratio = nextZoom / prevZoom;
    const newPanX = mouseX - (mouseX - prevPan.x) * ratio;
    const newPanY = mouseY - (mouseY - prevPan.y) * ratio;

    setSheetZoom(nextZoom);
    setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
  };

  // Center sheet on mount and whenever paper size/orientation changes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitSheetToScreen();
    }, 60);
    return () => clearTimeout(timer);
  }, [fitSheetToScreen]);

  // Window resize handler to maintain responsive drawing sheet scale
  useEffect(() => {
    const handleResize = () => {
      fitSheetToScreen();
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitSheetToScreen]);

  // Native non-passive Wheel listener for cursor-anchored zoom
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const prevZoom = zoomRef.current;
      const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const nextZoom = Math.min(2.5, Math.max(0.25, Number((prevZoom * zoomFactor).toFixed(3))));
      if (nextZoom === prevZoom) return;

      const prevPan = panRef.current;
      const ratio = nextZoom / prevZoom;
      const newPanX = mouseX - (mouseX - prevPan.x) * ratio;
      const newPanY = mouseY - (mouseY - prevPan.y) * ratio;

      setSheetZoom(nextZoom);
      setPan({ x: Math.round(newPanX), y: Math.round(newPanY) });
    };

    canvasEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvasEl.removeEventListener("wheel", handleWheel);
    };
  }, []);


  // Helper to update drawingSettings reactively
  const updateSetting = <K extends keyof TechnicalDrawingSettings>(
    key: K,
    val: TechnicalDrawingSettings[K]
  ) => {
    if (setParams) {
      setParams((prev) => ({
        ...prev,
        drawingSettings: {
          ...(prev.drawingSettings || {}),
          [key]: val,
        },
      }));
    }
  };

  // Generate 2D Vector Geometry from parametric math (scaled to selected unit mm/cm)
  const frontView = useMemo(() => generateFrontElevation(params, unit), [params, unit]);
  const topView = useMemo(() => generatePlanTopView(params, unit), [params, unit]);
  const sideView = useMemo(() => generateSideSectionView(params, unit), [params, unit]);
  // Configurable 3D Isometric View (responds dynamically to isoAngle, isoElevation & unit)
  const isoView = useMemo(
    () => generateIsometricView(params, isoAngle, isoElevation, unit),
    [params, isoAngle, isoElevation, unit]
  );


  // Viewport Scale factor for screen SVG rendering (computed early for geometry metrics)
  const viewScale = useMemo(() => {
    if (scaleMode === "1:10") return 0.1;
    if (scaleMode === "1:15") return 1 / 15;
    if (scaleMode === "1:20") return 0.05;
    if (scaleMode === "1:25") return 0.04;
    if (scaleMode === "1:50") return 0.02;
    if (scaleMode === "custom") return customScale;

    // Auto-fit calculation
    const maxDim = Math.max(frontView.width, frontView.height, topView.height, isoView.width, 1200);
    const targetW = pageSize === "A3" ? 420 : 320;
    return targetW / maxDim;
  }, [frontView, topView, isoView, pageSize, scaleMode, customScale]);

  // Lookup dictionary for geometry data
  const viewGeometries = useMemo<Record<ViewKey, ViewGeometry>>(() => ({
    top: topView,
    iso: isoView,
    front: frontView,
    side: sideView,
  }), [topView, isoView, frontView, sideView]);

  // Compute exact pixel metrics for any viewport given its sheet position
  const getViewMetrics = useCallback(
    (key: ViewKey, pos: { x: number; y: number }): ViewMetrics => {
      const geom = viewGeometries[key];
      const svgW = Math.max(160, geom.width * viewScale + 80);
      const svgH = Math.max(140, geom.height * viewScale + 70);

      // Inner model bounds inside viewportContainer
      // Header: 22px, Container padding: 4px, SVG inner origin: (40, 30)
      const modelLeft = pos.x + 44;
      const modelWidth = geom.width * viewScale;
      const modelRight = modelLeft + modelWidth;
      const modelCenterX = modelLeft + modelWidth / 2;

      const modelTop = pos.y + 56;
      const modelHeight = geom.height * viewScale;
      const modelBottom = modelTop + modelHeight;
      const modelCenterY = modelTop + modelHeight / 2;

      const boxLeft = pos.x;
      const boxTop = pos.y;
      const boxWidth = svgW + 8;
      const boxHeight = svgH + 30; // 22px header + 8px padding
      const boxRight = boxLeft + boxWidth;
      const boxBottom = boxTop + boxHeight;
      const boxCenterX = boxLeft + boxWidth / 2;
      const boxCenterY = boxTop + boxHeight / 2;

      return {
        key,
        svgW,
        svgH,
        boxLeft,
        boxRight,
        boxCenterX,
        boxTop,
        boxBottom,
        boxCenterY,
        modelLeft,
        modelRight,
        modelCenterX,
        modelTop,
        modelBottom,
        modelCenterY,
      };
    },
    [viewGeometries, viewScale]
  );

  // Default Viewport positions relative to sheet
  const defaultPositions = useMemo(() => {
    const W = paperDimensions.width;
    const H = paperDimensions.height;
    if (orientation === "landscape") {
      return {
        top: { x: 40, y: 35 },
        iso: { x: W / 2 + 20, y: 35 },
        front: { x: 40, y: H / 2 - 20 },
        side: { x: W / 2 + 20, y: H / 2 - 20 },
      };
    } else {
      return {
        top: { x: 40, y: 40 },
        iso: { x: 40, y: H * 0.28 },
        front: { x: 40, y: H * 0.52 },
        side: { x: W * 0.52, y: H * 0.52 },
      };
    }
  }, [paperDimensions, orientation]);

  // Track custom user drag offsets
  const [customPositions, setCustomPositions] = useState<{ [key: string]: { x: number; y: number } }>({});

  const viewPositions = useMemo(
    () => ({
      top: customPositions.top || defaultPositions.top,
      iso: customPositions.iso || defaultPositions.iso,
      front: customPositions.front || defaultPositions.front,
      side: customPositions.side || defaultPositions.side,
    }),
    [customPositions, defaultPositions]
  );

  // Dragging viewports interaction & magnetic snapping guides
  const [draggingView, setDraggingView] = useState<ViewKey | null>(null);
  const [snappingEnabled, setSnappingEnabled] = useState<boolean>(true);
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialX: number; initialY: number }>({
    mouseX: 0,
    mouseY: 0,
    initialX: 0,
    initialY: 0,
  });

  // Inline Title Editing handlers
  const handleStartEditTitle = (key: "top" | "iso" | "front" | "side", e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTitleKey(key);
    setEditingTitleValue(viewTitles[key]);
  };

  const handleSaveInlineTitle = (key: "top" | "iso" | "front" | "side") => {
    if (editingTitleValue.trim()) {
      updateSetting("viewTitles", {
        ...(drawingSettings.viewTitles || {}),
        [key]: editingTitleValue.trim(),
      });
    }
    setEditingTitleKey(null);
  };

  // Mouse Pan Handlers (Right-click or Middle-click drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2 || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        initialPanX: panRef.current.x,
        initialPanY: panRef.current.y,
      };
    }
  };

  const handleMouseDownViewport = (
    viewKey: ViewKey,
    e: React.MouseEvent
  ) => {
    // Only drag individual viewports on left-click (button 0)
    if (e.button === 0) {
      e.stopPropagation();
      setDraggingView(viewKey);
      dragStartRef.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        initialX: viewPositions[viewKey].x,
        initialY: viewPositions[viewKey].y,
      };
    }
    // If button is 2 (right click) or 1 (middle click), allow it to bubble to handleMouseDown for pan!
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.mouseX;
      const dy = e.clientY - panStartRef.current.mouseY;
      setPan({
        x: Math.round(panStartRef.current.initialPanX + dx),
        y: Math.round(panStartRef.current.initialPanY + dy),
      });
      return;
    }

    if (draggingView) {
      const rawDx = (e.clientX - dragStartRef.current.mouseX) / zoomRef.current;
      const rawDy = (e.clientY - dragStartRef.current.mouseY) / zoomRef.current;
      let targetX = dragStartRef.current.initialX + rawDx;
      let targetY = dragStartRef.current.initialY + rawDy;

      const currentGuides: SnapGuide[] = [];

      if (snappingEnabled) {
        const SNAP_THRESHOLD = 8;
        const activeKey = draggingView;
        const initialDragMetrics = getViewMetrics(activeKey, { x: targetX, y: targetY });

        const otherKeys: ViewKey[] = (["top", "iso", "front", "side"] as ViewKey[]).filter(
          (k) => k !== activeKey
        );

        let bestDeltaY: number | null = null;
        let bestCandY: {
          otherVal: number;
          otherMarkers: SnapMarker[];
          getDragMarkers: (sm: ViewMetrics) => SnapMarker[];
          label: string;
        } | null = null;

        let bestDeltaX: number | null = null;
        let bestCandX: {
          otherVal: number;
          otherMarkers: SnapMarker[];
          getDragMarkers: (sm: ViewMetrics) => SnapMarker[];
          label: string;
        } | null = null;

        for (const otherKey of otherKeys) {
          const otherPos = viewPositions[otherKey];
          const otherMetrics = getViewMetrics(otherKey, otherPos);

          // Horizontal alignment candidates (Y-coordinates: baselines, top edges, centerlines, borders)
          const yCandidates = [
            // 1. Model Baseline to Baseline (Ground floor continuous alignment)
            {
              dragVal: initialDragMetrics.modelBottom,
              otherVal: otherMetrics.modelBottom,
              label: "⇥ Ground Baseline Alignment (Bottom ↔ Bottom)",
              otherMarkers: [
                { x: otherMetrics.modelLeft, y: otherMetrics.modelBottom },
                { x: otherMetrics.modelRight, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.modelLeft, y: otherMetrics.modelBottom },
                { x: sm.modelRight, y: otherMetrics.modelBottom },
              ],
            },
            // 2. Model Top to Top (Continuous ceiling/cabinet height alignment)
            {
              dragVal: initialDragMetrics.modelTop,
              otherVal: otherMetrics.modelTop,
              label: "⇥ Top Edge Alignment (Top ↔ Top)",
              otherMarkers: [
                { x: otherMetrics.modelLeft, y: otherMetrics.modelTop },
                { x: otherMetrics.modelRight, y: otherMetrics.modelTop },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.modelLeft, y: otherMetrics.modelTop },
                { x: sm.modelRight, y: otherMetrics.modelTop },
              ],
            },
            // 3. Model Base to Top (Stacking views top/bottom)
            {
              dragVal: initialDragMetrics.modelBottom,
              otherVal: otherMetrics.modelTop,
              label: "⇥ Base-to-Top Edge Snap",
              otherMarkers: [
                { x: otherMetrics.modelLeft, y: otherMetrics.modelTop },
                { x: otherMetrics.modelRight, y: otherMetrics.modelTop },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.modelLeft, y: otherMetrics.modelTop },
                { x: sm.modelRight, y: otherMetrics.modelTop },
              ],
            },
            // 4. Model Top to Base
            {
              dragVal: initialDragMetrics.modelTop,
              otherVal: otherMetrics.modelBottom,
              label: "⇥ Top-to-Base Edge Snap",
              otherMarkers: [
                { x: otherMetrics.modelLeft, y: otherMetrics.modelBottom },
                { x: otherMetrics.modelRight, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.modelLeft, y: otherMetrics.modelBottom },
                { x: sm.modelRight, y: otherMetrics.modelBottom },
              ],
            },
            // 5. Model Center Y to Center Y (Horizontal axis alignment)
            {
              dragVal: initialDragMetrics.modelCenterY,
              otherVal: otherMetrics.modelCenterY,
              label: "⇥ Horizontal Axis Alignment (Center Y)",
              otherMarkers: [
                { x: otherMetrics.modelCenterX, y: otherMetrics.modelCenterY },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.modelCenterX, y: otherMetrics.modelCenterY },
              ],
            },
            // 6. Viewport Container Top to Top
            {
              dragVal: initialDragMetrics.boxTop,
              otherVal: otherMetrics.boxTop,
              label: "⇥ Viewport Header Alignment (Top ↔ Top)",
              otherMarkers: [
                { x: otherMetrics.boxLeft, y: otherMetrics.boxTop },
                { x: otherMetrics.boxRight, y: otherMetrics.boxTop },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.boxLeft, y: otherMetrics.boxTop },
                { x: sm.boxRight, y: otherMetrics.boxTop },
              ],
            },
            // 7. Viewport Container Bottom to Bottom
            {
              dragVal: initialDragMetrics.boxBottom,
              otherVal: otherMetrics.boxBottom,
              label: "⇥ Viewport Box Bottom Alignment",
              otherMarkers: [
                { x: otherMetrics.boxLeft, y: otherMetrics.boxBottom },
                { x: otherMetrics.boxRight, y: otherMetrics.boxBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: sm.boxLeft, y: otherMetrics.boxBottom },
                { x: sm.boxRight, y: otherMetrics.boxBottom },
              ],
            },
          ];

          for (const cand of yCandidates) {
            const delta = cand.otherVal - cand.dragVal;
            if (Math.abs(delta) <= SNAP_THRESHOLD) {
              if (bestDeltaY === null || Math.abs(delta) < Math.abs(bestDeltaY)) {
                bestDeltaY = delta;
                bestCandY = cand;
              }
            }
          }

          // Vertical alignment candidates (X-coordinates: left edges, right edges, projection centerlines)
          const xCandidates = [
            // 1. Model Left to Left (Vertical projection line across Plan & Elevation)
            {
              dragVal: initialDragMetrics.modelLeft,
              otherVal: otherMetrics.modelLeft,
              label: "⇤ Left Edge Projection (Left ↔ Left)",
              otherMarkers: [
                { x: otherMetrics.modelLeft, y: otherMetrics.modelTop },
                { x: otherMetrics.modelLeft, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.modelLeft, y: sm.modelTop },
                { x: otherMetrics.modelLeft, y: sm.modelBottom },
              ],
            },
            // 2. Model Right to Right
            {
              dragVal: initialDragMetrics.modelRight,
              otherVal: otherMetrics.modelRight,
              label: "⇤ Right Edge Projection (Right ↔ Right)",
              otherMarkers: [
                { x: otherMetrics.modelRight, y: otherMetrics.modelTop },
                { x: otherMetrics.modelRight, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.modelRight, y: sm.modelTop },
                { x: otherMetrics.modelRight, y: sm.modelBottom },
              ],
            },
            // 3. Model Center X to Center X (Center projection axis)
            {
              dragVal: initialDragMetrics.modelCenterX,
              otherVal: otherMetrics.modelCenterX,
              label: "⇤ Center Projection Axis (Center X)",
              otherMarkers: [
                { x: otherMetrics.modelCenterX, y: otherMetrics.modelTop },
                { x: otherMetrics.modelCenterX, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.modelCenterX, y: sm.modelTop },
                { x: otherMetrics.modelCenterX, y: sm.modelBottom },
              ],
            },
            // 4. Model Left to Right
            {
              dragVal: initialDragMetrics.modelLeft,
              otherVal: otherMetrics.modelRight,
              label: "⇤ Left-to-Right Edge Snap",
              otherMarkers: [
                { x: otherMetrics.modelRight, y: otherMetrics.modelTop },
                { x: otherMetrics.modelRight, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.modelRight, y: sm.modelTop },
                { x: otherMetrics.modelRight, y: sm.modelBottom },
              ],
            },
            // 5. Model Right to Left
            {
              dragVal: initialDragMetrics.modelRight,
              otherVal: otherMetrics.modelLeft,
              label: "⇤ Right-to-Left Edge Snap",
              otherMarkers: [
                { x: otherMetrics.modelLeft, y: otherMetrics.modelTop },
                { x: otherMetrics.modelLeft, y: otherMetrics.modelBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.modelLeft, y: sm.modelTop },
                { x: otherMetrics.modelLeft, y: sm.modelBottom },
              ],
            },
            // 6. Viewport Container Box Left to Left
            {
              dragVal: initialDragMetrics.boxLeft,
              otherVal: otherMetrics.boxLeft,
              label: "⇤ Viewport Box Left Alignment",
              otherMarkers: [
                { x: otherMetrics.boxLeft, y: otherMetrics.boxTop },
                { x: otherMetrics.boxLeft, y: otherMetrics.boxBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.boxLeft, y: sm.boxTop },
                { x: otherMetrics.boxLeft, y: sm.boxBottom },
              ],
            },
            // 7. Viewport Container Box Right to Right
            {
              dragVal: initialDragMetrics.boxRight,
              otherVal: otherMetrics.boxRight,
              label: "⇤ Viewport Box Right Alignment",
              otherMarkers: [
                { x: otherMetrics.boxRight, y: otherMetrics.boxTop },
                { x: otherMetrics.boxRight, y: otherMetrics.boxBottom },
              ],
              getDragMarkers: (sm: ViewMetrics) => [
                { x: otherMetrics.boxRight, y: sm.boxTop },
                { x: otherMetrics.boxRight, y: sm.boxBottom },
              ],
            },
          ];

          for (const cand of xCandidates) {
            const delta = cand.otherVal - cand.dragVal;
            if (Math.abs(delta) <= SNAP_THRESHOLD) {
              if (bestDeltaX === null || Math.abs(delta) < Math.abs(bestDeltaX)) {
                bestDeltaX = delta;
                bestCandX = cand;
              }
            }
          }
        }

        if (bestDeltaY !== null) {
          targetY += bestDeltaY;
        }
        if (bestDeltaX !== null) {
          targetX += bestDeltaX;
        }

        const snappedDragMetrics = getViewMetrics(activeKey, { x: targetX, y: targetY });

        if (bestCandY) {
          currentGuides.push({
            id: `guide-y-${bestCandY.label}`,
            type: "horizontal",
            pos: bestCandY.otherVal,
            label: bestCandY.label,
            markers: [
              ...bestCandY.otherMarkers,
              ...bestCandY.getDragMarkers(snappedDragMetrics),
            ],
          });
        }

        if (bestCandX) {
          currentGuides.push({
            id: `guide-x-${bestCandX.label}`,
            type: "vertical",
            pos: bestCandX.otherVal,
            label: bestCandX.label,
            markers: [
              ...bestCandX.otherMarkers,
              ...bestCandX.getDragMarkers(snappedDragMetrics),
            ],
          });
        }
      }

      setActiveGuides(currentGuides);

      const clampedX = Math.max(10, Math.min(paperDimensions.width - 200, targetX));
      const clampedY = Math.max(10, Math.min(paperDimensions.height - 180, targetY));

      setCustomPositions((prev) => ({
        ...prev,
        [draggingView]: {
          x: Math.round(clampedX),
          y: Math.round(clampedY),
        },
      }));
    }
  };

  const handleMouseUp = () => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }
    if (draggingView) {
      setDraggingView(null);
      setActiveGuides([]);
    }
  };

  // Global mouseup release failsafe
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setIsPanning(false);
      }
      setDraggingView(null);
      setActiveGuides([]);
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

  // Trigger Vector PDF Export
  const handleExportPdf = () => {
    const W = paperDimensions.width || 1;
    const H = paperDimensions.height || 1;
    const normalizedPositions = {
      top: { x: viewPositions.top.x / W, y: viewPositions.top.y / H },
      iso: { x: viewPositions.iso.x / W, y: viewPositions.iso.y / H },
      front: { x: viewPositions.front.x / W, y: viewPositions.front.y / H },
      side: { x: viewPositions.side.x / W, y: viewPositions.side.y / H },
    };

    exportToPdf(params, frontView, topView, sideView, isoView, {
      pageSize,
      orientation,
      projectName: drawingTitle,
      clientName: effectiveClientName,
      drawingTitle,
      drawingNumber,
      designer,
      revision,
      status,
      notes,
      scaleText: `1:${Math.round(1 / viewScale)}`,
      unit,
      viewScale,
      screenDimensions: paperDimensions,
      rawViewPositions: viewPositions,
      showDimensions,
      isoAngle,
      viewTitles,
      viewPositions: normalizedPositions,
    });
  };

  // Trigger AutoCAD DXF Export
  const handleExportDxf = () => {
    const dxfString = exportToDxf(params, frontView, topView, sideView, isoView, drawingTitle, {
      clientName: effectiveClientName,
      drawingNumber,
      designer,
      revision,
      status,
      notes,
      unit,
    });
    const safeName = (drawingTitle || params.name || "furniture").replace(/\s+/g, "-").toLowerCase();
    downloadDxfFile(dxfString, `${safeName}-cad-drawing.dxf`);
  };

  // Quick Flip Isometric Angle by 180°
  const handleFlipIso = () => {
    const nextAngle = (isoAngle + 180) % 360;
    updateSetting("isoAngle", nextAngle);
  };

  // Reusable SVG Viewport Renderer
  const renderSvgGeometry = (view: ViewGeometry, title: string) => {
    const svgW = Math.max(160, view.width * viewScale + 80);
    const svgH = Math.max(140, view.height * viewScale + 70);
    const originX = 40;
    const originY = 30;

    return (
      <div style={{ padding: "4px" }}>
        <svg width={svgW} height={svgH} style={{ overflow: "visible" }} role="img" aria-label={title}>
          <title>{title}</title>
          {/* Internal & Outline Rectangles */}
          {view.rects.map((r) => {
            const rx = originX + r.x * viewScale;
            // Flip Y so height goes upwards
            const ry = originY + (view.height - (r.y + r.height)) * viewScale;
            const rw = r.width * viewScale;
            const rh = r.height * viewScale;
            const isOutline = r.type === "outline";
            const isHidden = r.type === "hidden";

            return (
              <rect
                key={r.id}
                x={rx}
                y={ry}
                width={rw}
                height={rh}
                fill={r.type === "drawer" ? "rgba(241, 245, 249, 0.9)" : "none"}
                stroke={isOutline ? "#0f172a" : isHidden ? "#94a3b8" : "#334155"}
                strokeWidth={isOutline ? 1.6 : 1.0}
                strokeDasharray={isHidden ? "4 3" : undefined}
              />
            );
          })}

          {/* Lines */}
          {view.lines.map((l) => {
            const lx1 = originX + l.x1 * viewScale;
            const ly1 = originY + (view.height - l.y1) * viewScale;
            const lx2 = originX + l.x2 * viewScale;
            const ly2 = originY + (view.height - l.y2) * viewScale;
            const isOutline = l.type === "outline";
            const isHidden = l.type === "hidden";

            return (
              <line
                key={l.id}
                x1={lx1}
                y1={ly1}
                x2={lx2}
                y2={ly2}
                stroke={isOutline ? "#0f172a" : isHidden ? "#94a3b8" : "#334155"}
                strokeWidth={isOutline ? 1.6 : 0.9}
                strokeDasharray={isHidden ? "4 3" : undefined}
              />
            );
          })}

          {/* Circles (Bores, rails, cutouts) */}
          {view.circles.map((c) => {
            const cx = originX + c.cx * viewScale;
            const cy = originY + (view.height - c.cy) * viewScale;
            const r = c.r * viewScale;

            return (
              <circle
                key={c.id}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#334155"
                strokeWidth={1.0}
              />
            );
          })}

          {/* Dimension Witness Lines & Architectural Ticks */}
          {showDimensions &&
            view.dimensions.map((d) => {
              const rx1 = originX + d.refX1 * viewScale;
              const ry1 = originY + (view.height - d.refY1) * viewScale;
              const rx2 = originX + d.refX2 * viewScale;
              const ry2 = originY + (view.height - d.refY2) * viewScale;

              const dx1 = originX + d.x1 * viewScale;
              const dy1 = originY + (view.height - d.y1) * viewScale;
              const dx2 = originX + d.x2 * viewScale;
              const dy2 = originY + (view.height - d.y2) * viewScale;

              const midX = (dx1 + dx2) / 2;
              const midY = (dy1 + dy2) / 2;
              const tick = 3.5;

              // Calculate angle so dimension text runs along the line without horizontal collision
              const angleRad = Math.atan2(dy2 - dy1, dx2 - dx1);
              let angleDeg = (angleRad * 180) / Math.PI;
              if (angleDeg > 90) angleDeg -= 180;
              if (angleDeg < -90) angleDeg += 180;

              // Dynamically sized text mask to prevent overlapping lines
              const textWidth = Math.max(28, d.text.length * 6.5 + 8);

              return (
                <g key={d.id}>
                  {/* Extension witness lines */}
                  <line x1={rx1} y1={ry1} x2={dx1} y2={dy1} stroke="#2563eb" strokeWidth={0.75} />
                  <line x1={rx2} y1={ry2} x2={dx2} y2={dy2} stroke="#2563eb" strokeWidth={0.75} />

                  {/* Main dimension line */}
                  <line x1={dx1} y1={dy1} x2={dx2} y2={dy2} stroke="#2563eb" strokeWidth={1.0} />

                  {/* 45° CAD Architectural Ticks */}
                  <line x1={dx1 - tick} y1={dy1 + tick} x2={dx1 + tick} y2={dy1 - tick} stroke="#2563eb" strokeWidth={1.2} />
                  <line x1={dx2 - tick} y1={dy2 + tick} x2={dx2 + tick} y2={dy2 - tick} stroke="#2563eb" strokeWidth={1.2} />

                  {/* Dimension Text rotated along line with dynamic background mask */}
                  <g transform={`rotate(${angleDeg}, ${midX}, ${midY})`}>
                    <rect
                      x={midX - textWidth / 2}
                      y={midY - 7}
                      width={textWidth}
                      height={14}
                      fill="#ffffff"
                      rx={2}
                    />
                    <text
                      x={midX}
                      y={midY + 3.5}
                      textAnchor="middle"
                      fill="#1d4ed8"
                      fontSize={9}
                      fontWeight={700}
                      fontFamily="monospace"
                    >
                      {d.text}
                    </text>
                  </g>
                </g>
              );
            })}
        </svg>
      </div>
    );
  };

  return (
    <div
      className={styles.workspaceContainer}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Floating Drawing Header Toolbar (Positioned at top: 4.5rem so it never covers the 3D/2D switcher) */}
      <div className={styles.drawingToolbar}>
        {/* Units Toggle (mm / cm) */}
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => updateSetting("unit", "mm")}
            className={`${styles.toolSelectBtn} ${unit === "mm" ? styles.toolSelectBtnActive : ""}`}
            title="Display dimensions in Millimeters (mm)"
          >
            mm
          </button>
          <button
            type="button"
            onClick={() => updateSetting("unit", "cm")}
            className={`${styles.toolSelectBtn} ${unit === "cm" ? styles.toolSelectBtnActive : ""}`}
            title="Display dimensions in Centimeters (cm)"
          >
            cm
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        {/* Page Size Toggle */}
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => updateSetting("pageSize", "A3")}
            className={`${styles.toolSelectBtn} ${pageSize === "A3" ? styles.toolSelectBtnActive : ""}`}
            title="ISO A3 Sheet Size (420 x 297 mm)"
          >
            A3
          </button>
          <button
            type="button"
            onClick={() => updateSetting("pageSize", "A4")}
            className={`${styles.toolSelectBtn} ${pageSize === "A4" ? styles.toolSelectBtnActive : ""}`}
            title="ISO A4 Sheet Size (297 x 210 mm)"
          >
            A4
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        {/* Orientation Toggle */}
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => updateSetting("orientation", "landscape")}
            className={`${styles.toolSelectBtn} ${orientation === "landscape" ? styles.toolSelectBtnActive : ""}`}
            title="Landscape Orientation"
          >
            <MdCropLandscape size={14} />
            <span>Landscape</span>
          </button>
          <button
            type="button"
            onClick={() => updateSetting("orientation", "portrait")}
            className={`${styles.toolSelectBtn} ${orientation === "portrait" ? styles.toolSelectBtnActive : ""}`}
            title="Portrait Orientation"
          >
            <MdCropPortrait size={14} />
            <span>Portrait</span>
          </button>
        </div>

        <div className={styles.toolbarDivider} />

        {/* Dimension & Isometric Quick Tools */}
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={() => updateSetting("showDimensions", !showDimensions)}
            className={`${styles.toolSelectBtn} ${showDimensions ? styles.toolSelectBtnActive : ""}`}
            title="Toggle Dimensions on Technical Views"
          >
            <MdStraighten size={14} />
            <span>{showDimensions ? "Dims (On)" : "Dims (Off)"}</span>
          </button>

          <button
            type="button"
            onClick={handleFlipIso}
            className={styles.toolSelectBtn}
            title={`Rotate Isometric View by 180° (Current: ${isoAngle}°)`}
          >
            <MdScreenRotation size={14} />
            <span>Flip 3D ({isoAngle}°)</span>
          </button>

          <button
            type="button"
            onClick={() => setCustomPositions({})}
            className={styles.toolSelectBtn}
            title="Reset Viewports to Default Orthographic Alignment"
          >
            <MdRefresh size={14} />
            <span>Align Views</span>
          </button>

          <button
            type="button"
            onClick={() => setSnappingEnabled((prev) => !prev)}
            className={`${styles.toolSelectBtn} ${snappingEnabled ? styles.toolSelectBtnActive : ""}`}
            title="Toggle Smart Vertex Snapping & Extending Guide Lines"
          >
            <MdCenterFocusStrong size={14} />
            <span>{snappingEnabled ? "Snap (On)" : "Snap (Off)"}</span>
          </button>

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className={styles.toolSelectBtn}
              title="Open Drawing Title & Legend Editor on Right Sidebar"
            >
              <MdEditNote size={15} color="#60a5fa" />
              <span>Edit Title / Legend</span>
            </button>
          )}
        </div>

        <div className={styles.toolbarDivider} />

        {/* Export Buttons */}
        <div className={styles.toolbarGroup}>
          <button
            type="button"
            onClick={handleExportPdf}
            className={styles.exportBtnPdf}
            title="Export High-Resolution Vector PDF (ISO A3/A4)"
          >
            <MdPictureAsPdf size={15} />
            <span>Export .PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportDxf}
            className={styles.exportBtnDxf}
            title="Export AutoCAD R12/2000 Layered DXF File"
          >
            <MdFileDownload size={15} />
            <span>Export .DXF</span>
          </button>
        </div>
      </div>

      {/* Blueprint Canvas Area with Right-Click Pan & Mouse Wheel Zoom */}
      <div
        ref={canvasRef}
        className={`${styles.sheetCanvas} ${isPanning ? styles.sheetCanvasPanning : ""}`}
        onMouseDown={handleMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        {/* Standard Sheet Container */}
        <div
          className={styles.paperSheet}
          style={{
            width: `${paperDimensions.width}px`,
            height: `${paperDimensions.height}px`,
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${sheetZoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* ISO 5457 Outer Border Frame & Inner Border Frame */}
          <div className={styles.sheetFrame} />
          <div className={styles.sheetInnerFrame} />

          {/* ISO 5457 Coordinate Grid Reference Marks */}
          <div className={styles.gridMarkH} style={{ top: "4px", left: "20px" }}>A</div>
          <div className={styles.gridMarkH} style={{ top: "4px", left: "25%" }}>B</div>
          <div className={styles.gridMarkH} style={{ top: "4px", left: "50%" }}>C</div>
          <div className={styles.gridMarkH} style={{ top: "4px", left: "75%" }}>D</div>
          <div className={styles.gridMarkV} style={{ top: "25%", left: "4px" }}>1</div>
          <div className={styles.gridMarkV} style={{ top: "50%", left: "4px" }}>2</div>
          <div className={styles.gridMarkV} style={{ top: "75%", left: "4px" }}>3</div>

          {/* VIEWPORT 1: TOP PLAN VIEW (Doors Hidden) */}
          <div
            className={`${styles.viewportContainer} ${draggingView === "top" ? styles.viewportDragging : ""}`}
            style={{
              left: `${viewPositions.top.x}px`,
              top: `${viewPositions.top.y}px`,
            }}
            onMouseDown={(e) => handleMouseDownViewport("top", e)}
          >
            <div className={styles.viewportHeader}>
              {editingTitleKey === "top" ? (
                <input
                  type="text"
                  autoFocus
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onBlur={() => handleSaveInlineTitle("top")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineTitle("top");
                    if (e.key === "Escape") setEditingTitleKey(null);
                  }}
                  className={styles.viewportTitleInput}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={styles.viewportTitle}
                  onClick={(e) => handleStartEditTitle("top", e)}
                  title="Click to rename this view"
                >
                  <span>{viewTitles.top}</span>
                  <MdEditNote size={12} className={styles.viewportTitleEditIcon} />
                </div>
              )}
              <span className={styles.viewportBadge}>1:{Math.round(1 / viewScale)}</span>
            </div>
            {renderSvgGeometry(topView, "Top")}
          </div>

          {/* VIEWPORT 2: 3D ISOMETRIC (Doors Visible & Handles Revealed, Dynamic Angle) */}
          <div
            className={`${styles.viewportContainer} ${draggingView === "iso" ? styles.viewportDragging : ""}`}
            style={{
              left: `${viewPositions.iso.x}px`,
              top: `${viewPositions.iso.y}px`,
            }}
            onMouseDown={(e) => handleMouseDownViewport("iso", e)}
          >
            <div className={styles.viewportHeader}>
              {editingTitleKey === "iso" ? (
                <input
                  type="text"
                  autoFocus
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onBlur={() => handleSaveInlineTitle("iso")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineTitle("iso");
                    if (e.key === "Escape") setEditingTitleKey(null);
                  }}
                  className={styles.viewportTitleInput}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={styles.viewportTitle}
                  onClick={(e) => handleStartEditTitle("iso", e)}
                  title="Click to rename this view"
                >
                  <span>{viewTitles.iso}</span>
                  <MdEditNote size={12} className={styles.viewportTitleEditIcon} />
                </div>
              )}
              <span className={styles.viewportBadge}>DOORS VISIBLE</span>
            </div>
            {renderSvgGeometry(isoView, "Isometric")}
          </div>

          {/* VIEWPORT 3: FRONT ELEVATION (Doors Hidden) */}
          <div
            className={`${styles.viewportContainer} ${draggingView === "front" ? styles.viewportDragging : ""}`}
            style={{
              left: `${viewPositions.front.x}px`,
              top: `${viewPositions.front.y}px`,
            }}
            onMouseDown={(e) => handleMouseDownViewport("front", e)}
          >
            <div className={styles.viewportHeader}>
              {editingTitleKey === "front" ? (
                <input
                  type="text"
                  autoFocus
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onBlur={() => handleSaveInlineTitle("front")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineTitle("front");
                    if (e.key === "Escape") setEditingTitleKey(null);
                  }}
                  className={styles.viewportTitleInput}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={styles.viewportTitle}
                  onClick={(e) => handleStartEditTitle("front", e)}
                  title="Click to rename this view"
                >
                  <span>{viewTitles.front}</span>
                  <MdEditNote size={12} className={styles.viewportTitleEditIcon} />
                </div>
              )}
              <span className={styles.viewportBadge}>1:{Math.round(1 / viewScale)}</span>
            </div>
            {renderSvgGeometry(frontView, "Front")}
          </div>

          {/* VIEWPORT 4: SIDE / CROSS-SECTION (Doors Hidden) */}
          <div
            className={`${styles.viewportContainer} ${draggingView === "side" ? styles.viewportDragging : ""}`}
            style={{
              left: `${viewPositions.side.x}px`,
              top: `${viewPositions.side.y}px`,
            }}
            onMouseDown={(e) => handleMouseDownViewport("side", e)}
          >
            <div className={styles.viewportHeader}>
              {editingTitleKey === "side" ? (
                <input
                  type="text"
                  autoFocus
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onBlur={() => handleSaveInlineTitle("side")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveInlineTitle("side");
                    if (e.key === "Escape") setEditingTitleKey(null);
                  }}
                  className={styles.viewportTitleInput}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className={styles.viewportTitle}
                  onClick={(e) => handleStartEditTitle("side", e)}
                  title="Click to rename this view"
                >
                  <span>{viewTitles.side}</span>
                  <MdEditNote size={12} className={styles.viewportTitleEditIcon} />
                </div>
              )}
              <span className={styles.viewportBadge}>1:{Math.round(1 / viewScale)}</span>
            </div>
            {renderSvgGeometry(sideView, "Side")}
          </div>

          {/* ISO 7200 TITLE BLOCK & LEGEND (Bottom-Right Corner, Clickable to Edit) */}
          <div
            className={styles.titleBlock}
            onClick={onOpenSettings}
            title="Click to open Drawing Title Block & Legend Editor"
          >
            <div className={styles.titleRowTop}>
              <span className={styles.titleProjectName}>{drawingTitle.toUpperCase()}</span>
              <span className={styles.titleClient}>{effectiveClientName.toUpperCase()}</span>
            </div>
            <div className={styles.titleRowMid}>
              <div className={styles.titleCell}>
                <span className={styles.titleCellLabel}>Furniture / System</span>
                <span className={styles.titleCellValue}>
                  {params.category.toUpperCase()} ({params.name || "Custom"})
                </span>
              </div>
              <div className={styles.titleCell}>
                <span className={styles.titleCellLabel}>Material & Board</span>
                <span className={styles.titleCellValue}>
                  {(params.materialType || "oak").toUpperCase()} / {params.boardThickness || 18}mm
                </span>
              </div>
            </div>
            <div className={styles.titleRowBot}>
              <div className={styles.titleCell}>
                <span className={styles.titleCellLabel}>Dimensions (WxHxD)</span>
                <span className={styles.titleCellValue}>
                  {unit === "cm"
                    ? `${(params.width / 10).toFixed(0)}x${(params.height / 10).toFixed(0)}x${(params.depth / 10).toFixed(0)} cm`
                    : `${Math.round(params.width)}x${Math.round(params.height)}x${Math.round(params.depth)} mm`}
                </span>
              </div>
              <div className={styles.titleCell}>
                <span className={styles.titleCellLabel}>Ref & Status</span>
                <span className={styles.titleCellValue}>
                  {drawingNumber} | {status}
                </span>
              </div>
              <div className={styles.titleCell}>
                <span className={styles.titleCellLabel}>Sheet & Scale</span>
                <span className={styles.titleCellValue}>
                  {pageSize}-{orientation[0].toUpperCase()} | 1:{Math.round(1 / viewScale)} | {unit.toUpperCase()}
                </span>
              </div>
            </div>
            {/* Legend & Fabrication Notes Row */}
            <div className={styles.titleRowLegend}>
              <span className={styles.titleLegendLabel}>LEGEND & FABRICATION NOTES (CLICK TO EDIT):</span>
              <span className={styles.titleLegendText}>{notes}</span>
            </div>
          </div>

          {/* Extending Snapping Guide Lines & CAD Diamond Vertex Markers Overlay */}
          {activeGuides.length > 0 && (
            <svg
              className={styles.snappingGuidesOverlay}
              width={paperDimensions.width}
              height={paperDimensions.height}
              viewBox={`0 0 ${paperDimensions.width} ${paperDimensions.height}`}
              role="presentation"
            >
              <defs>
                <filter id="cadGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#0284c7" floodOpacity="0.85" />
                </filter>
              </defs>
              {activeGuides.map((guide) => {
                if (guide.type === "horizontal") {
                  const y = Math.round(guide.pos);
                  const minX = guide.markers.length > 0 ? Math.min(...guide.markers.map((m) => m.x)) : 60;
                  const badgeX = Math.max(20, Math.min(paperDimensions.width - 280, minX - 10));
                  const badgeY = y < 35 ? y + 8 : y - 20;
                  const badgeW = guide.label.length * 6.6 + 20;

                  return (
                    <g key={guide.id} className={styles.snapGuideGroup}>
                      {/* Ambient Glowing Halo Line */}
                      <line
                        x1={12}
                        y1={y}
                        x2={paperDimensions.width - 12}
                        y2={y}
                        stroke="#38bdf8"
                        strokeWidth={5}
                        strokeOpacity={0.35}
                      />
                      {/* High-Precision Dashed Guide Line Extending Across Paper */}
                      <line
                        x1={12}
                        y1={y}
                        x2={paperDimensions.width - 12}
                        y2={y}
                        stroke="#0284c7"
                        strokeWidth={1.5}
                        strokeDasharray="6 3.5"
                      />

                      {/* CAD Diamond Vertex Snap Markers */}
                      {guide.markers.map((m, idx) => (
                        <g key={idx} transform={`translate(${Math.round(m.x)}, ${y})`}>
                          <polygon
                            points="0,-7 7,0 0,7 -7,0"
                            fill="#ffffff"
                            stroke="#0284c7"
                            strokeWidth={1.8}
                            filter="url(#cadGlow)"
                          />
                          <circle cx={0} cy={0} r={2} fill="#0284c7" />
                        </g>
                      ))}

                      {/* Alignment Information Badge */}
                      <g transform={`translate(${badgeX}, ${badgeY})`}>
                        <rect
                          x={0}
                          y={0}
                          width={badgeW}
                          height={18}
                          rx={4}
                          fill="#0f172a"
                          stroke="#0284c7"
                          strokeWidth={1.2}
                          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
                        />
                        <text
                          x={10}
                          y={12.5}
                          fill="#38bdf8"
                          fontSize={9.5}
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {guide.label}
                        </text>
                      </g>
                    </g>
                  );
                } else {
                  // Vertical Guide Line Extending Across Paper
                  const x = Math.round(guide.pos);
                  const minY = guide.markers.length > 0 ? Math.min(...guide.markers.map((m) => m.y)) : 60;
                  const badgeY = Math.max(22, Math.min(paperDimensions.height - 45, minY - 10));
                  const badgeW = guide.label.length * 6.6 + 20;
                  const badgeX = x > paperDimensions.width - 240 ? x - badgeW - 10 : x + 10;

                  return (
                    <g key={guide.id} className={styles.snapGuideGroup}>
                      {/* Ambient Glowing Halo Line */}
                      <line
                        x1={x}
                        y1={12}
                        x2={x}
                        y2={paperDimensions.height - 12}
                        stroke="#38bdf8"
                        strokeWidth={5}
                        strokeOpacity={0.35}
                      />
                      {/* High-Precision Dashed Guide Line */}
                      <line
                        x1={x}
                        y1={12}
                        x2={x}
                        y2={paperDimensions.height - 12}
                        stroke="#0284c7"
                        strokeWidth={1.5}
                        strokeDasharray="6 3.5"
                      />

                      {/* CAD Diamond Vertex Snap Markers */}
                      {guide.markers.map((m, idx) => (
                        <g key={idx} transform={`translate(${x}, ${Math.round(m.y)})`}>
                          <polygon
                            points="0,-7 7,0 0,7 -7,0"
                            fill="#ffffff"
                            stroke="#0284c7"
                            strokeWidth={1.8}
                            filter="url(#cadGlow)"
                          />
                          <circle cx={0} cy={0} r={2} fill="#0284c7" />
                        </g>
                      ))}

                      {/* Alignment Information Badge */}
                      <g transform={`translate(${badgeX}, ${badgeY})`}>
                        <rect
                          x={0}
                          y={0}
                          width={badgeW}
                          height={18}
                          rx={4}
                          fill="#0f172a"
                          stroke="#0284c7"
                          strokeWidth={1.2}
                          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"
                        />
                        <text
                          x={10}
                          y={12.5}
                          fill="#38bdf8"
                          fontSize={9.5}
                          fontWeight={700}
                          fontFamily="monospace"
                        >
                          {guide.label}
                        </text>
                      </g>
                    </g>
                  );
                }
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Floating Canvas Zoom & Pan Controls (Bottom Left) */}
      <div className={styles.zoomControls}>
        <button
          type="button"
          onClick={() => zoomStep(0.85)}
          className={styles.zoomBtn}
          title="Zoom Out Sheet"
        >
          <MdZoomOut size={16} />
        </button>
        <span className={styles.zoomLabel}>{Math.round(sheetZoom * 100)}%</span>
        <button
          type="button"
          onClick={() => zoomStep(1.15)}
          className={styles.zoomBtn}
          title="Zoom In Sheet"
        >
          <MdZoomIn size={16} />
        </button>
        <button
          type="button"
          onClick={fitSheetToScreen}
          className={styles.zoomBtn}
          title="Fit Sheet to Screen (Reset Pan & Zoom)"
        >
          <MdFitScreen size={16} />
        </button>
        <div className={styles.panHint}>
          <span>Right-Click Drag: Pan</span>
          <span>•</span>
          <span>Wheel: Zoom</span>
        </div>
      </div>
    </div>
  );
}
