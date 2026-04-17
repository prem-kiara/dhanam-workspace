"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface Point {
  x:        number;
  y:        number;
  pressure: number;
}

interface Stroke {
  points:  Point[];
  color:   string;
  width:   number;
  isEraser: boolean;
}

interface Props {
  onChange: (dataUrl: string | null) => void;
  height?:  number;
}

const PEN_COLORS = [
  { value: "#1e293b", label: "Black"  },
  { value: "#7c3aed", label: "Purple" },
  { value: "#0369a1", label: "Blue"   },
  { value: "#15803d", label: "Green"  },
  { value: "#dc2626", label: "Red"    },
];
const PEN_WIDTHS = [2, 4, 7];

export function HandwritingCanvas({ onChange, height = 320 }: Props) {
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const isDrawingRef    = useRef(false);
  const currentPtsRef   = useRef<Point[]>([]);

  const [strokes,   setStrokes]   = useState<Stroke[]>([]);
  const [penColor,  setPenColor]  = useState("#1e293b");
  const [penWidth,  setPenWidth]  = useState(3);
  const [tool,      setTool]      = useState<"pen" | "eraser">("pen");
  const [isEmpty,   setIsEmpty]   = useState(true);

  // ─── Redraw entire canvas from stroke history ─────────────────────────────
  const redraw = useCallback((allStrokes: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of allStrokes) {
      if (stroke.points.length < 1) continue;
      ctx.save();
      ctx.lineCap    = "round";
      ctx.lineJoin   = "round";
      ctx.strokeStyle = stroke.isEraser ? "#ffffff" : stroke.color;

      if (stroke.points.length === 1) {
        // Single dot
        ctx.fillStyle = stroke.isEraser ? "#ffffff" : stroke.color;
        ctx.beginPath();
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        for (let i = 1; i < stroke.points.length; i++) {
          const prev = stroke.points[i - 1];
          const curr = stroke.points[i];
          const pressureFactor = stroke.isEraser ? 1 : (0.4 + curr.pressure * 1.6);
          ctx.lineWidth = stroke.width * pressureFactor;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }, []);

  // ─── Resize observer: keep canvas pixel dimensions in sync ────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio || 1;
      // Save current drawing
      const imageData = canvas.toDataURL();
      canvas.width  = rect.width  * dpr;
      canvas.height = rect.height * dpr;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        redraw(strokes);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Get pointer position relative to canvas (CSS px) ───────────────────
  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    return {
      x:        e.clientX - rect.left,
      y:        e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
    };
  };

  // ─── Draw incrementally (single segment) ─────────────────────────────────
  const drawSegment = (prev: Point, curr: Point) => {
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    if (!ctx) return;
    const isEraser   = tool === "eraser";
    const pressureFactor = isEraser ? 1 : (0.4 + curr.pressure * 1.6);
    ctx.save();
    ctx.strokeStyle = isEraser ? "#ffffff" : penColor;
    ctx.lineWidth   = (isEraser ? 20 : penWidth) * pressureFactor;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(curr.x, curr.y);
    ctx.stroke();
    ctx.restore();
  };

  // ─── Pointer handlers ────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    isDrawingRef.current  = true;
    currentPtsRef.current = [getPos(e)];

    // Draw initial dot
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    const pt     = currentPtsRef.current[0];
    if (ctx) {
      ctx.save();
      ctx.fillStyle = tool === "eraser" ? "#ffffff" : penColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, (tool === "eraser" ? 10 : penWidth / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const pt   = getPos(e);
    const pts  = currentPtsRef.current;
    if (pts.length > 0) drawSegment(pts[pts.length - 1], pt);
    currentPtsRef.current = [...pts, pt];
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const pts = currentPtsRef.current;
    if (pts.length === 0) return;

    const newStroke: Stroke = {
      points:   pts,
      color:    penColor,
      width:    tool === "eraser" ? 20 : penWidth,
      isEraser: tool === "eraser",
    };

    setStrokes((prev) => {
      const next = [...prev, newStroke];
      // Export PNG after state update
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          const hasContent = next.some((s) => !s.isEraser);
          setIsEmpty(!hasContent);
          onChange(hasContent ? canvas.toDataURL("image/png") : null);
        }
      }, 0);
      return next;
    });
    currentPtsRef.current = [];
  };

  // ─── Undo ────────────────────────────────────────────────────────────────
  const handleUndo = () => {
    setStrokes((prev) => {
      const next = prev.slice(0, -1);
      redraw(next);
      const hasContent = next.some((s) => !s.isEraser);
      setIsEmpty(!hasContent);
      onChange(hasContent && canvasRef.current ? canvasRef.current.toDataURL("image/png") : null);
      return next;
    });
  };

  // ─── Clear ───────────────────────────────────────────────────────────────
  const handleClear = () => {
    setStrokes([]);
    setIsEmpty(true);
    currentPtsRef.current = [];
    const canvas = canvasRef.current;
    const ctx    = canvas?.getContext("2d");
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2.5">
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Pen color swatches */}
        <div className="flex items-center gap-1.5">
          {PEN_COLORS.map(({ value, label }) => (
            <button
              key={value}
              title={label}
              onClick={() => { setPenColor(value); setTool("pen"); }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                penColor === value && tool === "pen"
                  ? "border-slate-700 scale-110 shadow-sm"
                  : "border-transparent opacity-70 hover:opacity-100 hover:scale-105"
              }`}
              style={{ backgroundColor: value }}
            />
          ))}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Pen widths */}
        <div className="flex items-center gap-1">
          {PEN_WIDTHS.map((w) => (
            <button
              key={w}
              title={`${w}px`}
              onClick={() => { setPenWidth(w); setTool("pen"); }}
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                penWidth === w && tool === "pen"
                  ? "bg-slate-100"
                  : "hover:bg-slate-50"
              }`}
            >
              <div
                className="bg-slate-700 rounded-full"
                style={{ width: w * 2.5, height: w * 2.5 }}
              />
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* Eraser */}
        <button
          onClick={() => setTool("eraser")}
          title="Eraser"
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            tool === "eraser"
              ? "bg-slate-200 text-slate-700"
              : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
          }`}
        >
          ✦ Eraser
        </button>

        {/* Undo / Clear */}
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="text-xs px-2.5 py-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-all"
          >
            ↩ Undo
          </button>
          <button
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="text-xs px-2.5 py-1 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-all"
          >
            Clear
          </button>
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-xl overflow-hidden border border-slate-200 bg-white select-none"
        style={{ height }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ touchAction: "none", cursor: tool === "eraser" ? "cell" : "crosshair" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-2">
            <svg className="w-8 h-8 text-slate-200" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            <p className="text-xs text-slate-300 text-center px-6">
              Draw with Apple Pencil, stylus, or finger
            </p>
          </div>
        )}
      </div>

      {/* ── Hint line ─────────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-400">
        Supports pressure sensitivity — Apple Pencil, Samsung S Pen, Surface Pen, and touch
      </p>
    </div>
  );
}
