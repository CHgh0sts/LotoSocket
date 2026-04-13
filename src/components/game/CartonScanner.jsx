'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Loader2, FlipHorizontal, ImagePlus, Crop, ScanLine } from 'lucide-react';
import { createWorker } from 'tesseract.js';

const GRID_ROWS = 3;
const GRID_COLS = 9;

const COLUMN_RANGES = [
  [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
  [50, 59], [60, 69], [70, 79], [80, 90]
];

function preprocessImage(canvas, sourceCanvas) {
  const ctx = canvas.getContext('2d');
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  canvas.width = w;
  canvas.height = h;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let sum = 0;
  const count = w * h;
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const avgBrightness = sum / count;
  const threshold = Math.max(90, Math.min(180, avgBrightness * 0.65));

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = 2.5;
    const mid = 128;
    let val = mid + (gray - mid) * contrast;
    val = val < 0 ? 0 : val > 255 ? 255 : val;
    const bw = val > threshold ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function mapNumberToColumn(num) {
  if (num < 1 || num > 90) return -1;
  if (num <= 9) return 0;
  if (num === 90) return 8;
  return Math.floor(num / 10);
}

function gridToListNumber(grid) {
  const list = [];
  for (let i = 0; i < GRID_ROWS; i++) {
    for (let j = 0; j < GRID_COLS; j++) {
      list.push(grid[i][j]);
    }
  }
  return list;
}

function parseTextToGrid(text) {
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('*'));
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const numLines = [];
  for (const line of lines) {
    const nums = [];
    const matches = line.match(/\d+/g);
    if (!matches) continue;
    for (const m of matches) {
      if (m.length <= 2) {
        const n = parseInt(m);
        if (n >= 1 && n <= 90) nums.push(n);
      } else {
        for (let i = 0; i < m.length; i++) {
          if (i + 1 < m.length) {
            const pair = parseInt(m.substring(i, i + 2));
            if (pair >= 10 && pair <= 90) { nums.push(pair); i++; continue; }
          }
          const s = parseInt(m[i]);
          if (s >= 1 && s <= 9) nums.push(s);
        }
      }
    }
    if (nums.length > 0) numLines.push(nums);
  }

  const placed = new Set();
  const rowGroups = numLines.length >= 3
    ? [numLines.slice(0, Math.ceil(numLines.length / 3)),
       numLines.slice(Math.ceil(numLines.length / 3), Math.ceil(numLines.length * 2 / 3)),
       numLines.slice(Math.ceil(numLines.length * 2 / 3))]
    : numLines.length === 2
      ? [[numLines[0]], [numLines[1]], []]
      : numLines.length === 1
        ? [[numLines[0]], [], []]
        : [[], [], []];

  for (let row = 0; row < GRID_ROWS; row++) {
    const group = rowGroups[row];
    const allNums = group.flat();
    for (const num of allNums) {
      if (placed.has(num)) continue;
      const col = mapNumberToColumn(num);
      if (col >= 0 && col < GRID_COLS && grid[row][col] === '*') {
        grid[row][col] = num.toString();
        placed.add(num);
      }
    }
  }

  return grid;
}

function clusterYPositions(ys) {
  if (ys.length === 0) return [0, 0];
  const sorted = [...new Set(ys)].sort((a, b) => a - b);
  if (sorted.length <= 3) {
    if (sorted.length === 1) return [sorted[0] - 1, sorted[0] + 1];
    if (sorted.length === 2) {
      const mid = (sorted[0] + sorted[1]) / 2;
      return [mid, mid];
    }
    return [(sorted[0] + sorted[1]) / 2, (sorted[1] + sorted[2]) / 2];
  }

  const gaps = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push({ idx: i, gap: sorted[i] - sorted[i - 1] });
  }
  gaps.sort((a, b) => b.gap - a.gap);

  const cuts = [gaps[0].idx, gaps.length > 1 ? gaps[1].idx : gaps[0].idx].sort((a, b) => a - b);
  const cut1 = (sorted[cuts[0] - 1] + sorted[cuts[0]]) / 2;
  const cut2 = (sorted[cuts[1] - 1] + sorted[cuts[1]]) / 2;
  return [cut1, cut2];
}

function mapWordsToGrid(words) {
  const rawItems = [];

  for (const word of words) {
    const text = word.text.replace(/[^0-9]/g, '');
    if (!text) continue;

    const bbox = word.bbox;
    const cx = (bbox.x0 + bbox.x1) / 2;
    const cy = (bbox.y0 + bbox.y1) / 2;
    const bw = Math.abs(bbox.x1 - bbox.x0);
    const bh = Math.abs(bbox.y1 - bbox.y0);

    const nums = [];
    if (text.length <= 2) {
      const n = parseInt(text);
      if (n >= 1 && n <= 90) nums.push(n);
    } else {
      for (let i = 0; i < text.length; i++) {
        if (i + 1 < text.length) {
          const pair = parseInt(text.substring(i, i + 2));
          if (pair >= 10 && pair <= 90) {
            nums.push(pair);
            i++;
            continue;
          }
        }
        const single = parseInt(text[i]);
        if (single >= 1 && single <= 9) nums.push(single);
      }
    }

    for (const num of nums) {
      rawItems.push({ number: num, cx, cy, bw, bh, confidence: word.confidence });
    }
  }

  const validItems = rawItems.filter(item => {
    if (item.number >= 10) return true;
    const digit = item.number;
    return !rawItems.some(other => {
      if (other.number < 10) return false;
      const d1 = Math.floor(other.number / 10);
      const d2 = other.number % 10;
      if (d1 !== digit && d2 !== digit) return false;
      const margin = Math.max(other.bw, other.bh) * 0.25;
      const ox0 = other.cx - other.bw / 2 - margin;
      const ox1 = other.cx + other.bw / 2 + margin;
      const oy0 = other.cy - other.bh / 2 - margin;
      const oy1 = other.cy + other.bh / 2 + margin;
      return item.cx >= ox0 && item.cx <= ox1 &&
             item.cy >= oy0 && item.cy <= oy1;
    });
  });

  if (validItems.length === 0) {
    return Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('*'));
  }

  const allYs = validItems.map(v => v.cy);
  const [cut1, cut2] = clusterYPositions(allYs);

  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('*'));
  const placed = new Set();

  const itemsWithPos = validItems.map(item => {
    let row;
    if (item.cy < cut1) row = 0;
    else if (item.cy < cut2) row = 1;
    else row = 2;
    const expectedCol = mapNumberToColumn(item.number);
    return { ...item, row, expectedCol };
  });

  itemsWithPos.sort((a, b) => b.confidence - a.confidence);

  for (const item of itemsWithPos) {
    if (placed.has(item.number)) continue;
    const col = item.expectedCol;
    if (col < 0 || col >= GRID_COLS) continue;
    if (grid[item.row][col] !== '*') continue;
    grid[item.row][col] = item.number.toString();
    placed.add(item.number);
  }

  for (const item of itemsWithPos) {
    if (placed.has(item.number)) continue;
    const col = item.expectedCol;
    if (col < 0 || col >= GRID_COLS) continue;
    for (let r = 0; r < GRID_ROWS; r++) {
      if (grid[r][col] === '*') {
        grid[r][col] = item.number.toString();
        placed.add(item.number);
        break;
      }
    }
  }

  return grid;
}

export default function CartonScanner({ onScanComplete, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const cropContainerRef = useRef(null);

  const [phase, setPhase] = useState('idle');
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedImage, setCapturedImage] = useState(null);
  const [fullImageSize, setFullImageSize] = useState({ w: 0, h: 0 });
  const [previewGrid, setPreviewGrid] = useState(null);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Crop rectangle in % (0-100)
  const [cropRect, setCropRect] = useState({ x: 5, y: 5, w: 90, h: 90 });
  const [dragging, setDragging] = useState(null); // null | 'move' | 'tl' | 'tr' | 'bl' | 'br'
  const dragStart = useRef({ mx: 0, my: 0, rect: null });

  const startCamera = useCallback(async () => {
    setErrorMsg('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('camera');
    } catch (err) {
      setErrorMsg("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      console.error('Camera error:', err);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  const switchCamera = useCallback(() => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, [stopCamera]);

  useEffect(() => {
    if (phase === 'camera') startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const goToCrop = useCallback((canvas) => {
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
    setFullImageSize({ w: canvas.width, h: canvas.height });
    setCropRect({ x: 5, y: 5, w: 90, h: 90 });
    setPhase('crop');
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    stopCamera();
    goToCrop(canvas);
  }, [stopCamera, goToCrop]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current || document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d').drawImage(img, 0, 0);
      goToCrop(canvas);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  }, [goToCrop]);

  // --- Crop interaction ---
  const getPointerPos = useCallback((e) => {
    const container = cropContainerRef.current;
    if (!container) return { px: 0, py: 0 };
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      px: ((clientX - rect.left) / rect.width) * 100,
      py: ((clientY - rect.top) / rect.height) * 100,
    };
  }, []);

  const handleCropPointerDown = useCallback((e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const pos = getPointerPos(e);
    dragStart.current = { mx: pos.px, my: pos.py, rect: { ...cropRect } };
    setDragging(handle);
  }, [cropRect, getPointerPos]);

  const handleCropPointerMove = useCallback((e) => {
    if (!dragging) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    const dx = pos.px - dragStart.current.mx;
    const dy = pos.py - dragStart.current.my;
    const r = dragStart.current.rect;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    if (dragging === 'move') {
      const nx = clamp(r.x + dx, 0, 100 - r.w);
      const ny = clamp(r.y + dy, 0, 100 - r.h);
      setCropRect({ x: nx, y: ny, w: r.w, h: r.h });
    } else {
      let nx = r.x, ny = r.y, nw = r.w, nh = r.h;
      if (dragging.includes('l')) { nx = clamp(r.x + dx, 0, r.x + r.w - 10); nw = r.w - (nx - r.x); }
      if (dragging.includes('r')) { nw = clamp(r.w + dx, 10, 100 - r.x); }
      if (dragging.includes('t')) { ny = clamp(r.y + dy, 0, r.y + r.h - 5); nh = r.h - (ny - r.y); }
      if (dragging.includes('b')) { nh = clamp(r.h + dy, 5, 100 - r.y); }
      setCropRect({ x: nx, y: ny, w: nw, h: nh });
    }
  }, [dragging, getPointerPos]);

  const handleCropPointerUp = useCallback(() => {
    setDragging(null);
  }, []);

  useEffect(() => {
    if (phase !== 'crop') return;
    const onMove = (e) => handleCropPointerMove(e);
    const onUp = () => handleCropPointerUp();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [phase, handleCropPointerMove, handleCropPointerUp]);

  const launchOCR = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      const sx = (cropRect.x / 100) * fullImageSize.w;
      const sy = (cropRect.y / 100) * fullImageSize.h;
      const sw = (cropRect.w / 100) * fullImageSize.w;
      const sh = (cropRect.h / 100) * fullImageSize.h;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = Math.round(sw);
      croppedCanvas.height = Math.round(sh);
      croppedCanvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, croppedCanvas.width, croppedCanvas.height);

      setPhase('processing');
      runOCR(croppedCanvas);
    };
    img.src = capturedImage;
  }, [cropRect, fullImageSize, capturedImage]);

  const upscaleCanvas = (src, targetWidth) => {
    if (src.width >= targetWidth) return src;
    const scale = targetWidth / src.width;
    const dst = document.createElement('canvas');
    dst.width = Math.round(src.width * scale);
    dst.height = Math.round(src.height * scale);
    const ctx = dst.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, dst.width, dst.height);
    return dst;
  };

  const runOCR = useCallback(async (sourceCanvas) => {
    setProgress(0);
    setErrorMsg('');
    setStatusMsg("Préparation de l'image...");

    try {
      const upscaled = upscaleCanvas(sourceCanvas, 2000);

      const processCanvas = document.createElement('canvas');
      preprocessImage(processCanvas, upscaled);

      setStatusMsg('Chargement du moteur OCR...');
      setProgress(10);

      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(20 + Math.round(m.progress * 60));
          }
        },
      });

      const ocrOutput = { blocks: true, text: true, hocr: false, tsv: false };

      setStatusMsg('Passe 1 — image traitée...');
      await worker.setParameters({ tessedit_pageseg_mode: '6' });
      const { data: r1 } = await worker.recognize(processCanvas, {}, ocrOutput);
      let best = r1;
      let bestN = (r1.words || []).filter(w => /\d/.test(w.text)).length;
      console.log('[OCR] pass1 (processed):', bestN, 'words', r1.text?.substring(0, 120));

      if (bestN < 10) {
        setStatusMsg('Passe 2 — image originale...');
        setProgress(55);
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        const { data: r2 } = await worker.recognize(upscaled, {}, ocrOutput);
        const n2 = (r2.words || []).filter(w => /\d/.test(w.text)).length;
        console.log('[OCR] pass2 (upscaled):', n2, 'words', r2.text?.substring(0, 120));
        if (n2 > bestN) { best = r2; bestN = n2; }
      }

      if (bestN < 5) {
        setStatusMsg('Passe 3 — seuillage fort...');
        setProgress(70);
        const hc = document.createElement('canvas');
        const ctx = hc.getContext('2d');
        hc.width = upscaled.width;
        hc.height = upscaled.height;
        ctx.drawImage(upscaled, 0, 0);
        const imgData = ctx.getImageData(0, 0, hc.width, hc.height);
        const px = imgData.data;
        for (let i = 0; i < px.length; i += 4) {
          const g = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          const bw = g < 110 ? 0 : 255;
          px[i] = bw; px[i + 1] = bw; px[i + 2] = bw;
        }
        ctx.putImageData(imgData, 0, 0);
        await worker.setParameters({ tessedit_pageseg_mode: '6' });
        const { data: r3 } = await worker.recognize(hc, {}, ocrOutput);
        const n3 = (r3.words || []).filter(w => /\d/.test(w.text)).length;
        console.log('[OCR] pass3 (threshold):', n3, 'words', r3.text?.substring(0, 120));
        if (n3 > bestN) { best = r3; bestN = n3; }
      }

      await worker.terminate();
      setProgress(90);
      setStatusMsg('Placement des chiffres...');

      let grid;
      if (best.words && best.words.length > 0) {
        grid = mapWordsToGrid(best.words);
      } else {
        grid = parseTextToGrid(best.text || '');
      }

      console.log('[OCR] grid result:', grid);
      setProgress(100);
      setPreviewGrid(grid);
      setPhase('preview');
    } catch (err) {
      console.error('OCR error:', err);
      setErrorMsg("Erreur lors de la lecture OCR. Réessayez.");
      setPhase('crop');
    }
  }, []);

  const charToNumber = { '&': '1', 'é': '2', '"': '3', "'": '4', '(': '5', '§': '6', 'è': '7', '!': '8', 'ç': '9', 'à': '0' };

  const convertFrenchChars = (text) =>
    text.split('').map(c => charToNumber[c] || c).join('');

  const handleCellEdit = (row, col, value) => {
    if (!previewGrid) return;
    const newGrid = previewGrid.map(r => [...r]);
    const converted = convertFrenchChars(value);
    const cleaned = converted.replace(/\D/g, '');
    if (cleaned === '') {
      newGrid[row][col] = '*';
    } else {
      const num = parseInt(cleaned);
      if (num >= 1 && num <= 90) newGrid[row][col] = num.toString();
    }
    setPreviewGrid(newGrid);
  };

  const handleConfirm = () => {
    if (!previewGrid) return;
    onScanComplete(gridToListNumber(previewGrid));
    setPhase('idle');
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setPreviewGrid(null);
    setProgress(0);
    setStatusMsg('');
    setPhase('camera');
    startCamera();
  };

  const handleRetryFile = () => {
    setCapturedImage(null);
    setPreviewGrid(null);
    setProgress(0);
    setStatusMsg('');
    setPhase('idle');
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const countFilledCells = () => {
    if (!previewGrid) return 0;
    return previewGrid.flat().filter(v => v !== '*').length;
  };

  const closeAll = () => { stopCamera(); setPhase('idle'); onClose(); };

  // --- Renders ---
  if (phase === 'idle') {
    return (
      <div className="flex items-center gap-2">
        <button onClick={() => { setPhase('camera'); startCamera(); }}
          className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all duration-200">
          <Camera className="w-4 h-4" />Scanner
        </button>
        <button onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-all duration-200">
          <ImagePlus className="w-4 h-4" />Photo
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
      </div>
    );
  }

  const handleStyle = 'w-4 h-4 bg-indigo-500 border-2 border-white rounded-sm absolute z-20 shadow-lg shadow-black/50';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60]">
      <div className="bg-gray-800 rounded-xl w-11/12 max-w-lg max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-white font-semibold text-lg">
            {phase === 'camera' && 'Photographier le carton'}
            {phase === 'crop' && 'Délimiter le carton'}
            {phase === 'processing' && 'Analyse en cours...'}
            {phase === 'preview' && 'Vérifier les chiffres'}
          </h3>
          <button onClick={closeAll} className="text-gray-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
        </div>

        {/* Camera */}
        {phase === 'camera' && (
          <div className="flex flex-col">
            <div className="relative bg-black aspect-[3/2]">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              {errorMsg && (
                <div className="absolute bottom-2 left-2 right-2 bg-red-500/90 text-white text-sm p-2 rounded">{errorMsg}</div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 p-4">
              <button onClick={switchCamera} className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors" title="Changer de caméra">
                <FlipHorizontal className="w-5 h-5" />
              </button>
              <button onClick={capturePhoto} className="p-4 bg-white hover:bg-gray-200 rounded-full transition-colors shadow-lg shadow-white/20" title="Prendre la photo">
                <div className="w-8 h-8 rounded-full border-4 border-gray-800" />
              </button>
              <button onClick={closeAll} className="p-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full transition-colors" title="Annuler">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Crop */}
        {phase === 'crop' && capturedImage && (
          <div className="flex flex-col">
            <p className="text-gray-400 text-xs text-center px-4 pt-3">
              Placez le rectangle sur la zone des chiffres du carton
            </p>
            <div className="relative mx-3 mt-3 select-none" ref={cropContainerRef}>
              <img src={capturedImage} alt="Photo" className="w-full rounded-lg" draggable={false} />

              {/* Dimmed overlay outside crop rect */}
              <div className="absolute inset-0 rounded-lg overflow-hidden pointer-events-none">
                <div className="absolute bg-black/60" style={{ top: 0, left: 0, right: 0, height: `${cropRect.y}%` }} />
                <div className="absolute bg-black/60" style={{ bottom: 0, left: 0, right: 0, height: `${100 - cropRect.y - cropRect.h}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${cropRect.y}%`, left: 0, width: `${cropRect.x}%`, height: `${cropRect.h}%` }} />
                <div className="absolute bg-black/60" style={{ top: `${cropRect.y}%`, right: 0, width: `${100 - cropRect.x - cropRect.w}%`, height: `${cropRect.h}%` }} />
              </div>

              {/* Crop rectangle */}
              <div
                className="absolute border-[3px] border-indigo-400 rounded-sm cursor-move shadow-[0_0_12px_rgba(129,140,248,0.5)]"
                style={{
                  left: `${cropRect.x}%`,
                  top: `${cropRect.y}%`,
                  width: `${cropRect.w}%`,
                  height: `${cropRect.h}%`,
                }}
                onMouseDown={(e) => handleCropPointerDown(e, 'move')}
                onTouchStart={(e) => handleCropPointerDown(e, 'move')}
              >
                {/* Grid lines inside crop rectangle */}
                {[...Array(8)].map((_, i) => (
                  <div key={`cv${i}`} className="absolute top-0 bottom-0 border-l-2 border-white/70"
                    style={{ left: `${((i + 1) / GRID_COLS) * 100}%` }} />
                ))}
                {[...Array(2)].map((_, i) => (
                  <div key={`ch${i}`} className="absolute left-0 right-0 border-t-2 border-white/70"
                    style={{ top: `${((i + 1) / GRID_ROWS) * 100}%` }} />
                ))}

                {/* Corner handles */}
                <div className={handleStyle} style={{ top: -8, left: -8, cursor: 'nw-resize' }}
                  onMouseDown={(e) => handleCropPointerDown(e, 'tl')}
                  onTouchStart={(e) => handleCropPointerDown(e, 'tl')} />
                <div className={handleStyle} style={{ top: -8, right: -8, cursor: 'ne-resize' }}
                  onMouseDown={(e) => handleCropPointerDown(e, 'tr')}
                  onTouchStart={(e) => handleCropPointerDown(e, 'tr')} />
                <div className={handleStyle} style={{ bottom: -8, left: -8, cursor: 'sw-resize' }}
                  onMouseDown={(e) => handleCropPointerDown(e, 'bl')}
                  onTouchStart={(e) => handleCropPointerDown(e, 'bl')} />
                <div className={handleStyle} style={{ bottom: -8, right: -8, cursor: 'se-resize' }}
                  onMouseDown={(e) => handleCropPointerDown(e, 'br')}
                  onTouchStart={(e) => handleCropPointerDown(e, 'br')} />
              </div>
            </div>

            <div className="flex gap-3 p-4 pt-1">
              <button onClick={() => { setCapturedImage(null); setPhase('camera'); startCamera(); }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                <RotateCcw className="w-4 h-4" />Reprendre
              </button>
              <button onClick={launchOCR}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                <ScanLine className="w-4 h-4" />Analyser
              </button>
            </div>
          </div>
        )}

        {/* Processing */}
        {phase === 'processing' && (
          <div className="flex flex-col items-center gap-4 p-8">
            {capturedImage && <img src={capturedImage} alt="Captured" className="w-full rounded-lg opacity-50" />}
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              <div className="flex flex-col">
                <span className="text-white font-medium">{progress}%</span>
                <span className="text-gray-400 text-xs">{statusMsg}</span>
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Preview */}
        {phase === 'preview' && previewGrid && (
          <div className="flex flex-col gap-4 p-4">
            <div className="text-center">
              <span className="text-gray-400 text-sm">
                {countFilledCells()} chiffres détectés — corrigez si nécessaire
              </span>
            </div>

            {capturedImage && (
              <div className="rounded-lg overflow-hidden border border-gray-600">
                <img src={capturedImage} alt="Original" className="w-full" draggable={false} />
              </div>
            )}

            <div className="bg-gray-900 rounded-xl p-3 border border-gray-600">
              <div className="flex mb-1">
                {COLUMN_RANGES.map(([min, max], i) => (
                  <div key={i} className="flex-1 text-center text-[9px] text-gray-500 font-mono">{min}-{max}</div>
                ))}
              </div>
              {previewGrid.map((row, i) => (
                <div key={i} className="flex gap-[2px] mb-[2px]">
                  {row.map((cell, j) => {
                    const isFilled = cell !== '*';
                    const num = parseInt(cell);
                    const [min, max] = COLUMN_RANGES[j];
                    const isInRange = !isFilled || (num >= min && num <= max);
                    return (
                      <div key={`${i}-${j}`}
                        className={`flex-1 aspect-[1.2] rounded ${isFilled
                          ? isInRange ? 'bg-indigo-600/40 border border-indigo-500/60' : 'bg-red-600/40 border border-red-500/60'
                          : 'bg-gray-800 border border-gray-700'}`}>
                        <input type="text" maxLength="2"
                          value={cell === '*' ? '' : cell}
                          onChange={(e) => handleCellEdit(i, j, e.target.value)}
                          className={`w-full h-full bg-transparent text-center font-bold text-sm outline-none ${
                            isFilled ? isInRange ? 'text-white' : 'text-red-300' : 'text-gray-500'
                          } placeholder-gray-600`}
                          placeholder={`${min}-${max}`} />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="flex justify-between text-xs text-gray-400 px-1">
              <span>Lignes: {previewGrid.map((row, i) => {
                const count = row.filter(c => c !== '*').length;
                return `L${i+1}:${count}/5`;
              }).join(' ')}</span>
              <span>Total: {countFilledCells()}/15</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPhase('crop')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                <Crop className="w-4 h-4" />Recadrer
              </button>
              <button onClick={handleRetryFile}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors">
                <ImagePlus className="w-4 h-4" />
              </button>
              <button onClick={handleConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
                <Check className="w-4 h-4" />Appliquer ({countFilledCells()})
              </button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
