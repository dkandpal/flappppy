import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

type Props = {
  imageUrl: string;
  filename?: string;
  onCopyToEditor?: (dataUrl: string) => void;
  defaultTolerance?: number;
  defaultPadding?: number;
  autoRun?: boolean;
  onCutoutReady?: (dataUrl: string) => void;
};

type Point = { x: number; y: number };

// Detect background: pixel is background if R,G,B all > (255 - tolerance)
function buildMask(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance: number,
): Uint8Array {
  const threshold = 255 - tolerance;
  const mask = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const isBg = a < 8 || (r > threshold && g > threshold && b > threshold);
    mask[p] = isBg ? 0 : 1;
  }
  return mask;
}

// Morphological erode then dilate (open) to remove specks; then dilate+erode (close) to fill gaps.
function morph(mask: Uint8Array, w: number, h: number, op: "erode" | "dilate"): Uint8Array {
  const out = new Uint8Array(w * h);
  const target = op === "erode" ? 1 : 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = mask[i];
      if (v === target) {
        out[i] = v;
        continue;
      }
      // Check 4-neighbors
      let neighborMatches = false;
      if (x > 0 && mask[i - 1] !== v) neighborMatches = true;
      else if (x < w - 1 && mask[i + 1] !== v) neighborMatches = true;
      else if (y > 0 && mask[i - w] !== v) neighborMatches = true;
      else if (y < h - 1 && mask[i + w] !== v) neighborMatches = true;
      out[i] = neighborMatches ? 1 - v : v;
    }
  }
  return out;
}

function cleanMask(mask: Uint8Array, w: number, h: number): Uint8Array {
  // open (erode then dilate) removes specks
  let m = morph(mask, w, h, "erode");
  m = morph(m, w, h, "dilate");
  // close (dilate then erode) fills small gaps
  m = morph(m, w, h, "dilate");
  m = morph(m, w, h, "erode");
  return m;
}

// Fill enclosed holes by flood-filling background from image edges.
// Any background pixel not reachable from the border is treated as an interior
// hole (eyes, line art gaps, etc.) and flipped to foreground.
function fillHoles(mask: Uint8Array, w: number, h: number): Uint8Array {
  const reachable = new Uint8Array(w * h);
  const stack: number[] = [];
  const pushIfBg = (x: number, y: number) => {
    const i = y * w + x;
    if (mask[i] === 0 && reachable[i] === 0) {
      reachable[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) pushIfBg(x - 1, y);
    if (x < w - 1) pushIfBg(x + 1, y);
    if (y > 0) pushIfBg(x, y - 1);
    if (y < h - 1) pushIfBg(x, y + 1);
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) {
    out[i] = mask[i] === 1 || reachable[i] === 0 ? 1 : 0;
  }
  return out;
}

// Find largest connected component (4-connectivity) and return mask with only it
function keepLargestComponent(mask: Uint8Array, w: number, h: number): Uint8Array {
  const labels = new Int32Array(w * h);
  let nextLabel = 1;
  const sizes: number[] = [0];
  const stack: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] !== 1 || labels[i] !== 0) continue;
    const label = nextLabel++;
    let size = 0;
    stack.push(i);
    labels[i] = label;
    while (stack.length) {
      const p = stack.pop()!;
      size++;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) {
        const n = p - 1;
        if (mask[n] === 1 && labels[n] === 0) {
          labels[n] = label;
          stack.push(n);
        }
      }
      if (x < w - 1) {
        const n = p + 1;
        if (mask[n] === 1 && labels[n] === 0) {
          labels[n] = label;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = p - w;
        if (mask[n] === 1 && labels[n] === 0) {
          labels[n] = label;
          stack.push(n);
        }
      }
      if (y < h - 1) {
        const n = p + w;
        if (mask[n] === 1 && labels[n] === 0) {
          labels[n] = label;
          stack.push(n);
        }
      }
    }
    sizes.push(size);
  }
  let bestLabel = 0;
  let bestSize = 0;
  for (let l = 1; l < sizes.length; l++) {
    if (sizes[l] > bestSize) {
      bestSize = sizes[l];
      bestLabel = l;
    }
  }
  const out = new Uint8Array(w * h);
  if (bestLabel === 0) return out;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === bestLabel) out[i] = 1;
  }
  return out;
}

// Moore-neighbor contour tracing on the binary mask. Returns ordered boundary points.
function traceContour(mask: Uint8Array, w: number, h: number): Point[] {
  // Find first foreground pixel
  let startIdx = -1;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) return [];
  const sx = startIdx % w;
  const sy = (startIdx - sx) / w;

  // 8-direction neighbors, clockwise starting from west
  const dirs = [
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1],
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
  ];
  const isFg = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;

  const contour: Point[] = [{ x: sx, y: sy }];
  let cx = sx;
  let cy = sy;
  // Previous direction we entered from = west (came from left)
  let prevDir = 0;
  const maxSteps = w * h * 4;
  let steps = 0;

  while (steps++ < maxSteps) {
    // Start checking from prevDir + 6 (i.e., one CCW from where we came)
    let found = false;
    for (let i = 0; i < 8; i++) {
      const d = (prevDir + 6 + i) % 8;
      const nx = cx + dirs[d][0];
      const ny = cy + dirs[d][1];
      if (isFg(nx, ny)) {
        cx = nx;
        cy = ny;
        prevDir = d;
        contour.push({ x: cx, y: cy });
        found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === sx && cy === sy && contour.length > 2) break;
  }
  return contour;
}

// Simplify contour with Ramer-Douglas-Peucker
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const sqDist = (a: Point, b: Point) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  };
  const sqSegDist = (p: Point, a: Point, b: Point) => {
    let x = a.x;
    let y = a.y;
    let dx = b.x - x;
    let dy = b.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b.x;
        y = b.y;
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p.x - x;
    dy = p.y - y;
    return dx * dx + dy * dy;
  };
  const eps2 = epsilon * epsilon;
  const last = points.length - 1;
  const simplified: Point[] = [points[0]];
  const stack: [number, number][] = [[0, last]];
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[last] = 1;
  while (stack.length) {
    const [first, lastIdx] = stack.pop()!;
    let maxD = 0;
    let index = -1;
    for (let i = first + 1; i < lastIdx; i++) {
      const d = sqSegDist(points[i], points[first], points[lastIdx]);
      if (d > maxD) {
        maxD = d;
        index = i;
      }
    }
    if (maxD > eps2 && index !== -1) {
      keep[index] = 1;
      stack.push([first, index]);
      stack.push([index, lastIdx]);
    }
  }
  for (let i = 1; i <= last; i++) if (keep[i]) simplified.push(points[i]);
  void sqDist;
  return simplified;
}

export function AutoCutout({ imageUrl, filename = "cutout.png", onCopyToEditor, defaultTolerance = 10, defaultPadding = 8, autoRun = false, onCutoutReady }: Props) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [tolerance, setTolerance] = useState(defaultTolerance); // 0-50; bg if rgb > 255-tolerance
  const [padding, setPadding] = useState(defaultPadding);
  const [contour, setContour] = useState<Point[]>([]);
  const [bbox, setBbox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [cutoutDataUrl, setCutoutDataUrl] = useState<string | null>(null);
  const dashOffsetRef = useRef(0);
  const animRef = useRef<number | null>(null);

  // Load image into source canvas whenever URL changes
  useEffect(() => {
    setContour([]);
    setBbox(null);
    setCutoutDataUrl(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = sourceCanvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = imageUrl;
  }, [imageUrl]);

  // Auto-run detection once image is loaded (when autoRun=true)
  useEffect(() => {
    if (autoRun && imgSize) {
      runDetection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, imgSize, tolerance, padding]);

  function runDetection() {
    const src = sourceCanvasRef.current;
    if (!src || !imgSize) return;
    setProcessing(true);
    try {
      const ctx = src.getContext("2d")!;
      const { w, h } = imgSize;
      const imgData = ctx.getImageData(0, 0, w, h);
      let mask = buildMask(imgData.data, w, h, tolerance);
      mask = cleanMask(mask, w, h);
      mask = keepLargestComponent(mask, w, h);
      mask = fillHoles(mask, w, h);

      // Bounding box
      let minX = w,
        minY = h,
        maxX = -1,
        maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (mask[y * w + x] === 1) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX < 0) {
        setContour([]);
        setBbox(null);
        setCutoutDataUrl(null);
        return;
      }

      const traced = traceContour(mask, w, h);
      const simplified = simplify(traced, 1.2);
      setContour(simplified);
      const pad = padding;
      const bx = Math.max(0, minX - pad);
      const by = Math.max(0, minY - pad);
      const bw = Math.min(w - bx, maxX - minX + 1 + pad * 2);
      const bh = Math.min(h - by, maxY - minY + 1 + pad * 2);
      setBbox({ x: bx, y: by, w: bw, h: bh });

      // Build cutout (transparent background) as dataURL
      const cutCanvas = document.createElement("canvas");
      cutCanvas.width = bw;
      cutCanvas.height = bh;
      const cctx = cutCanvas.getContext("2d")!;
      const cropped = ctx.getImageData(bx, by, bw, bh);
      // Apply mask to cropped
      for (let y = 0; y < bh; y++) {
        for (let x = 0; x < bw; x++) {
          const srcIdx = (by + y) * w + (bx + x);
          if (mask[srcIdx] === 0) {
            const di = (y * bw + x) * 4;
            cropped.data[di + 3] = 0;
          }
        }
      }
      cctx.putImageData(cropped, 0, 0);
      const dataUrl = cutCanvas.toDataURL("image/png");
      setCutoutDataUrl(dataUrl);
      onCutoutReady?.(dataUrl);

      // Render preview
      const preview = previewCanvasRef.current;
      if (preview) {
        preview.width = bw;
        preview.height = bh;
        const pctx = preview.getContext("2d")!;
        // Checkerboard
        const tile = 8;
        for (let y = 0; y < bh; y += tile) {
          for (let x = 0; x < bw; x += tile) {
            pctx.fillStyle = ((x / tile + y / tile) & 1) ? "#e5e7eb" : "#ffffff";
            pctx.fillRect(x, y, tile, tile);
          }
        }
        const imgEl = new Image();
        imgEl.onload = () => pctx.drawImage(imgEl, 0, 0);
        imgEl.src = dataUrl;
      }
    } finally {
      setProcessing(false);
    }
  }

  // Marching-ants animation on overlay canvas
  useEffect(() => {
    const overlay = overlayCanvasRef.current;
    if (!overlay || !imgSize || contour.length < 2) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
      if (overlay) {
        const ctx = overlay.getContext("2d");
        ctx?.clearRect(0, 0, overlay.width, overlay.height);
      }
      return;
    }
    overlay.width = imgSize.w;
    overlay.height = imgSize.h;
    const ctx = overlay.getContext("2d")!;
    const draw = () => {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#000";
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = -dashOffsetRef.current;
      ctx.beginPath();
      ctx.moveTo(contour[0].x, contour[0].y);
      for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i].x, contour[i].y);
      ctx.closePath();
      ctx.stroke();
      ctx.strokeStyle = "#fff";
      ctx.lineDashOffset = -dashOffsetRef.current + 5;
      ctx.stroke();
      dashOffsetRef.current = (dashOffsetRef.current + 0.5) % 10;
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      animRef.current = null;
    };
  }, [contour, imgSize]);

  function downloadCutout() {
    if (!cutoutDataUrl) return;
    const a = document.createElement("a");
    a.href = cutoutDataUrl;
    a.download = filename;
    a.click();
  }

  function downloadOutlineSvg() {
    if (!contour.length || !imgSize) return;
    const d =
      "M " +
      contour.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L ") +
      " Z";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${imgSize.w} ${imgSize.h}" width="${imgSize.w}" height="${imgSize.h}"><path d="${d}" fill="none" stroke="black" stroke-width="2"/></svg>`;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outline.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 rounded-md border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Auto Cutout / Magic Lasso</h3>
        <Button size="sm" onClick={runDetection} disabled={!imgSize || processing}>
          {processing ? "Detecting…" : "Auto Select Character"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">
            White tolerance: <span className="font-mono">{tolerance}</span>
          </Label>
          <Slider
            value={[tolerance]}
            onValueChange={(v) => setTolerance(v[0])}
            min={0}
            max={50}
            step={1}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">
            Padding: <span className="font-mono">{padding}px</span>
          </Label>
          <Slider
            value={[padding]}
            onValueChange={(v) => setPadding(v[0])}
            min={0}
            max={50}
            step={1}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Original + outline
          </p>
          <div
            className="relative w-full overflow-hidden rounded border border-border bg-white"
            style={{ aspectRatio: imgSize ? `${imgSize.w} / ${imgSize.h}` : "17 / 12" }}
          >
            <canvas
              ref={sourceCanvasRef}
              className="absolute inset-0 h-full w-full object-contain"
            />
            <canvas
              ref={overlayCanvasRef}
              className="pointer-events-none absolute inset-0 h-full w-full"
            />
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
            Cutout preview
          </p>
          <div
            className="flex w-full items-center justify-center overflow-hidden rounded border border-border bg-muted"
            style={{ aspectRatio: imgSize ? `${imgSize.w} / ${imgSize.h}` : "17 / 12" }}
          >
            {cutoutDataUrl ? (
              <canvas ref={previewCanvasRef} className="max-h-full max-w-full" />
            ) : (
              <p className="text-xs text-muted-foreground">No cutout yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={downloadCutout} disabled={!cutoutDataUrl}>
          Download Cutout PNG
        </Button>
        <Button size="sm" variant="outline" onClick={downloadOutlineSvg} disabled={!contour.length}>
          Download Outline SVG
        </Button>
        {onCopyToEditor && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => cutoutDataUrl && onCopyToEditor(cutoutDataUrl)}
            disabled={!cutoutDataUrl}
          >
            Copy Cutout to Canvas
          </Button>
        )}
      </div>
    </div>
  );
}
