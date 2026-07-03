'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Loader2, FlipHorizontal, ImagePlus, Crop, ScanLine } from 'lucide-react';
import { createWorker, createScheduler } from 'tesseract.js';

const GRID_ROWS = 3;
const GRID_COLS = 9;

const COLUMN_RANGES = [
  [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
  [50, 59], [60, 69], [70, 79], [80, 90]
];

// ==================== Traitement d'image ====================

function upscaleCanvas(src, targetWidth) {
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
}

function grayFromCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const data = ctx.getImageData(0, 0, w, h).data;
  const gray = new Uint8ClampedArray(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return gray;
}

// Flou par image intégrale — O(n), utilisé pour estimer le fond
function boxBlurGray(gray, w, h, radius) {
  const integral = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += gray[y * w + x];
      integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius), y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius), x1 = Math.min(w - 1, x + radius);
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)] - integral[y0 * (w + 1) + (x1 + 1)]
                - integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      out[y * w + x] = sum / area;
    }
  }
  return out;
}

// Divise chaque pixel par le fond estimé : supprime ombres et éclairage inégal
function normalizeIllumination(gray, w, h) {
  const radius = Math.max(10, Math.round(Math.min(w, h) / 8));
  const bg = boxBlurGray(gray, w, h, radius);
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < gray.length; i++) {
    const b = Math.max(1, bg[i]);
    out[i] = Math.min(255, Math.round((gray[i] / b) * 235));
  }
  return out;
}

function otsuThreshold(gray) {
  const hist = new Float64Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];
  let sumB = 0, wB = 0, maxVar = -1, best = 127;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const v = wB * wF * (mB - mF) * (mB - mF);
    if (v > maxVar) { maxVar = v; best = t; }
  }
  return best;
}

function binarize(gray, threshold) {
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] <= threshold ? 0 : 255;
  return out;
}

// Supprime les traits de la grille : runs noirs plus longs qu'une cellule.
// Les traits des chiffres sont toujours plus courts qu'une cellule.
function removeGridLines(bin, w, h) {
  const cellW = w / GRID_COLS;
  const cellH = h / GRID_ROWS;

  const minRunH = Math.round(cellW * 1.05);
  for (let y = 0; y < h; y++) {
    let start = -1;
    for (let x = 0; x <= w; x++) {
      const dark = x < w && bin[y * w + x] === 0;
      if (dark) {
        if (start < 0) start = x;
      } else if (start >= 0) {
        if (x - start >= minRunH) {
          for (let k = start; k < x; k++) bin[y * w + k] = 255;
        }
        start = -1;
      }
    }
  }

  const minRunV = Math.round(cellH * 1.15);
  for (let x = 0; x < w; x++) {
    let start = -1;
    for (let y = 0; y <= h; y++) {
      const dark = y < h && bin[y * w + x] === 0;
      if (dark) {
        if (start < 0) start = y;
      } else if (start >= 0) {
        if (y - start >= minRunV) {
          for (let k = start; k < y; k++) bin[k * w + x] = 255;
        }
        start = -1;
      }
    }
  }
}

function grayArrayToCanvas(arr, w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(w, h);
  for (let i = 0; i < arr.length; i++) {
    img.data[i * 4] = arr[i];
    img.data[i * 4 + 1] = arr[i];
    img.data[i * 4 + 2] = arr[i];
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Ratio de pixels noirs dans l'intérieur d'une cellule (pour ignorer les cases vides)
function inkRatioCell(bin, w, h, row, col) {
  const cellW = w / GRID_COLS;
  const cellH = h / GRID_ROWS;
  const x0 = Math.round(col * cellW + cellW * 0.12);
  const x1 = Math.round((col + 1) * cellW - cellW * 0.12);
  const y0 = Math.round(row * cellH + cellH * 0.12);
  const y1 = Math.round((row + 1) * cellH - cellH * 0.12);
  let dark = 0, total = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      total++;
      if (bin[y * w + x] === 0) dark++;
    }
  }
  return total > 0 ? dark / total : 0;
}

// Érosion 3x3 du noir : amincit les traits trop épais que Tesseract lit mal
function erodeBinary(bin, w, h) {
  const out = new Uint8ClampedArray(bin.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let allDark = true;
      for (let dy = -1; dy <= 1 && allDark; dy++) {
        for (let dx = -1; dx <= 1 && allDark; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || bin[ny * w + nx] !== 0) allDark = false;
        }
      }
      out[y * w + x] = allDark ? 0 : 255;
    }
  }
  return out;
}

// Boîte englobante de l'encre dans la cellule.
// - Groupes de colonnes : élimine les fragments de lignes verticales imprimées
//   (fins et éloignés du groupe principal de traits)
// - Extension au-delà de la bordure pour les chiffres à cheval sur la grille
// - Coupe au creux d'encre près de la frontière quand deux nombres se touchent
function inkBBoxInCell(bin, w, h, row, col) {
  const cellW = w / GRID_COLS;
  const cellH = h / GRID_ROWS;
  const cx0 = Math.round(col * cellW + cellW * 0.04);
  const cx1 = Math.round((col + 1) * cellW - cellW * 0.04);
  const cy0 = Math.round(row * cellH + cellH * 0.08);
  const cy1 = Math.round((row + 1) * cellH - cellH * 0.08);

  const colCounts = new Int32Array(w);
  for (let y = cy0; y < cy1; y++) {
    for (let x = cx0; x < cx1; x++) {
      if (bin[y * w + x] === 0) colCounts[x]++;
    }
  }

  // groupes de colonnes encrées (séparés par >= 4px de blanc)
  const groups = [];
  let cur = null, gap = 0;
  for (let x = cx0; x < cx1; x++) {
    if (colCounts[x] >= 2) {
      if (cur && gap <= 4) cur.x1 = x;
      else { cur = { x0: x, x1: x }; groups.push(cur); }
      gap = 0;
    } else if (cur) gap++;
  }
  if (groups.length === 0) return null;

  // cluster principal : les groupes larges (traits de chiffres) fusionnent à
  // distance normale, les fins (fragments de lignes) seulement s'ils touchent
  const widest = groups.reduce((a, b) => (b.x1 - b.x0) > (a.x1 - a.x0) ? b : a);
  const kept = new Set([widest]);
  const minStroke = Math.max(4, cellW * 0.025);
  let changed = true;
  while (changed) {
    changed = false;
    for (const g of groups) {
      if (kept.has(g)) continue;
      const isThin = (g.x1 - g.x0) < minStroke;
      const mergeGap = isThin ? cellW * 0.04 : cellW * 0.18;
      for (const k of kept) {
        const d = g.x0 > k.x1 ? g.x0 - k.x1 : k.x0 - g.x1;
        if (d < mergeGap) { kept.add(g); changed = true; break; }
      }
    }
  }
  let x0 = Infinity, x1 = -Infinity;
  for (const k of kept) { x0 = Math.min(x0, k.x0); x1 = Math.max(x1, k.x1); }

  const rowCounts = new Int32Array(h);
  for (let y = cy0; y < cy1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (bin[y * w + x] === 0) rowCounts[y]++;
    }
  }
  let y0 = -1, y1 = -1;
  for (let y = cy0; y < cy1; y++) {
    if (rowCounts[y] >= 2) { if (y0 < 0) y0 = y; y1 = y; }
  }
  if (y0 < 0) return null;

  const colInk = (x) => {
    let n = 0;
    for (let y = Math.max(0, y0 - 3); y <= Math.min(h - 1, y1 + 3); y++) {
      if (bin[y * w + x] === 0) n++;
    }
    return n;
  };

  // extension hors cellule jusqu'à une colonne blanche
  const maxExpand = Math.round(cellW * 0.25);
  let ex0 = x0, ex1 = x1;
  while (ex0 > 0 && x0 - ex0 < maxExpand && colInk(ex0 - 1) >= 2) ex0--;
  while (ex1 < w - 1 && ex1 - x1 < maxExpand && colInk(ex1 + 1) >= 2) ex1++;
  const saturatedL = ex0 > 0 && x0 - ex0 >= maxExpand && colInk(ex0 - 1) >= 2;
  const saturatedR = ex1 < w - 1 && ex1 - x1 >= maxExpand && colInk(ex1 + 1) >= 2;

  // saturation = nombres voisins fusionnés : coupe au creux d'encre
  const valleyCut = (boundary) => {
    const win = Math.round(cellW * 0.12);
    let bestX = Math.round(boundary), bestInk = Infinity;
    for (let x = Math.round(boundary) - win; x <= Math.round(boundary) + win; x++) {
      if (x <= 0 || x >= w) continue;
      const ink = colInk(x);
      if (ink < bestInk) { bestInk = ink; bestX = x; }
    }
    return bestX;
  };
  if (saturatedL) ex0 = valleyCut(col * cellW);
  if (saturatedR) ex1 = valleyCut((col + 1) * cellW);

  // trop petit = bruit résiduel (hachures, poussière)
  if (ex1 - ex0 < Math.max(6, cellW * 0.04) || y1 - y0 < cellH * 0.25) return null;
  return { x0: ex0, x1: ex1, y0, y1 };
}

// Extrait la zone d'encre avec marge blanche autour (Tesseract lit mieux avec des marges)
function sliceCellCanvas(srcCanvas, bbox) {
  const sw = bbox.x1 - bbox.x0 + 1;
  const sh = bbox.y1 - bbox.y0 + 1;
  const pad = Math.round(Math.max(sw, sh) * 0.4);
  const c = document.createElement('canvas');
  c.width = sw + pad * 2;
  c.height = sh + pad * 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(srcCanvas, bbox.x0, bbox.y0, sw, sh, pad, pad, sw, sh);
  return c;
}

// ==================== Logique loto / fusion ====================

function isInColumn(num, col) {
  const [min, max] = COLUMN_RANGES[col];
  return num >= min && num <= max;
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

// Compat tesseract.js : words à plat ou via blocks/paragraphs/lines
function extractWords(data) {
  if (Array.isArray(data.words) && data.words.length > 0) return data.words;
  const out = [];
  for (const b of data.blocks || []) {
    for (const p of b.paragraphs || []) {
      for (const l of p.lines || []) {
        for (const w of l.words || []) out.push(w);
      }
    }
  }
  return out;
}

// Découpe une chaîne de chiffres en nombres 1-90 en gardant la position des caractères
function splitNumbersWithSpan(text) {
  const res = [];
  for (let i = 0; i < text.length; i++) {
    if (i + 1 < text.length) {
      const pair = parseInt(text.substring(i, i + 2));
      if (pair >= 10 && pair <= 90) {
        res.push({ num: pair, start: i, len: 2 });
        i++;
        continue;
      }
    }
    const d = parseInt(text[i]);
    if (d >= 1 && d <= 9) res.push({ num: d, start: i, len: 1 });
  }
  return res;
}

// Passe image entière : chaque nombre est affecté à une cellule via la position
// de sa sous-bbox (gère les fusions type "7386" = 73 + 86 dans 2 colonnes)
function collectWordCandidates(words, w, h, addCand, source) {
  const cellW = w / GRID_COLS;
  const cellH = h / GRID_ROWS;
  for (const word of words) {
    const raw = (word.text || '').replace(/\D/g, '');
    if (!raw || raw.length > 6) continue;
    const bbox = word.bbox;
    if (!bbox) continue;
    const bw = bbox.x1 - bbox.x0;
    const cy = (bbox.y0 + bbox.y1) / 2;
    const row = Math.min(GRID_ROWS - 1, Math.max(0, Math.floor(cy / cellH)));
    const parts = splitNumbersWithSpan(raw);
    for (const p of parts) {
      const cx = bbox.x0 + ((p.start + p.len / 2) / raw.length) * bw;
      const col = Math.min(GRID_COLS - 1, Math.max(0, Math.floor(cx / cellW)));
      addCand(row, col, { num: p.num, conf: word.confidence || 0, source });
    }
  }
}

// Interprète le texte OCR d'une cellule isolée
function parseCellText(text, col) {
  const digits = (text || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length <= 2) {
    const n = parseInt(digits);
    return n >= 1 && n <= 90 ? n : null;
  }
  for (let i = 0; i + 1 < digits.length; i++) {
    const pair = parseInt(digits.substring(i, i + 2));
    if (pair >= 10 && pair <= 90 && isInColumn(pair, col)) return pair;
  }
  for (let i = 0; i < digits.length; i++) {
    const d = parseInt(digits[i]);
    if (d >= 1 && d <= 9 && isInColumn(d, col)) return d;
  }
  const n2 = parseInt(digits.substring(0, 2));
  return n2 >= 1 && n2 <= 90 ? n2 : null;
}

// La colonne détermine le chiffre des dizaines : corrige une lecture erronée
function correctForColumn(num, col) {
  const units = num % 10;
  if (col === 0) {
    const d = units >= 1 ? units : Math.floor(num / 10) % 10;
    return d >= 1 && d <= 9 ? d : null;
  }
  if (col === 8) return 80 + units;
  const v = col * 10 + units;
  return isInColumn(v, col) ? v : null;
}

// Fusion par consensus : vote entre les passes, validation colonne,
// auto-correction, déduplication globale
function fuseCandidates(candidates) {
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('*'));
  const confGrid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(0));
  const entries = [];

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const list = candidates[r][c];
      if (list.length === 0) continue;

      const byNum = new Map();
      for (const cand of list) {
        const g = byNum.get(cand.num) || { num: cand.num, conf: 0, sources: new Set() };
        g.conf = Math.max(g.conf, cand.conf || 0);
        g.sources.add(cand.source);
        byNum.set(cand.num, g);
      }

      let best = null;
      for (const g of byNum.values()) {
        const inRange = isInColumn(g.num, c);
        const hasCell = [...g.sources].some(s => s.startsWith('cell'));
        const score = g.conf
          + (g.sources.size - 1) * 30
          + (inRange ? 40 : -25)
          + (hasCell ? 15 : 0);
        if (!best || score > best.score) best = { ...g, score, inRange };
      }
      if (!best) continue;

      let num = best.num;
      let corrected = false;
      if (best.inRange) {
        if (best.conf < 35 && best.sources.size < 2) continue;
      } else {
        if (best.conf < 55 && best.sources.size < 2) continue;
        const fixed = correctForColumn(best.num, c);
        if (fixed == null) continue;
        num = fixed;
        corrected = true;
      }

      entries.push({
        row: r, col: c, num,
        conf: corrected ? Math.min(Math.round(best.conf), 50) : Math.round(best.conf),
        score: best.score - (corrected ? 35 : 0),
      });
    }
  }

  entries.sort((a, b) => b.score - a.score);
  const used = new Set();
  for (const e of entries) {
    if (used.has(e.num)) continue;
    used.add(e.num);
    grid[e.row][e.col] = e.num.toString();
    confGrid[e.row][e.col] = e.conf;
  }

  return { grid, confGrid };
}

// Repli ultime si aucune bbox exploitable : parse le texte brut ligne par ligne
function parseTextToGrid(text) {
  const grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill('*'));
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const numLines = [];
  for (const line of lines) {
    const nums = [];
    const matches = line.match(/\d+/g);
    if (!matches) continue;
    for (const m of matches) {
      for (const p of splitNumbersWithSpan(m)) nums.push(p.num);
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
    const allNums = rowGroups[row].flat();
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

// ==================== Composant ====================

export default function CartonScanner({ onScanComplete, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const cropContainerRef = useRef(null);

  const [phase, setPhase] = useState('idle');
  const [facingMode, setFacingMode] = useState('environment');
  const [capturedImage, setCapturedImage] = useState(null);
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [fullImageSize, setFullImageSize] = useState({ w: 0, h: 0 });
  const [previewGrid, setPreviewGrid] = useState(null);
  const [previewConf, setPreviewConf] = useState(null);
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
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.92));
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

      setCroppedPreview(croppedCanvas.toDataURL('image/jpeg', 0.9));
      setPhase('processing');
      runOCR(croppedCanvas);
    };
    img.src = capturedImage;
  }, [cropRect, fullImageSize, capturedImage]);

  const runOCR = useCallback(async (sourceCanvas) => {
    setProgress(0);
    setErrorMsg('');
    setStatusMsg("Préparation de l'image...");

    let scheduler = null;
    try {
      // 1. Upscale + prétraitement
      const upscaled = upscaleCanvas(sourceCanvas, 2200);
      const w = upscaled.width;
      const h = upscaled.height;
      const rawGray = grayFromCanvas(upscaled);
      const gray = normalizeIllumination(rawGray, w, h);
      const threshold = Math.max(100, Math.min(175, otsuThreshold(gray)));
      const bin = binarize(gray, threshold);
      removeGridLines(bin, w, h);
      const grayCanvas = grayArrayToCanvas(gray, w, h);
      const binCanvas = grayArrayToCanvas(bin, w, h);
      setProgress(6);

      // 2. Pool de workers OCR
      setStatusMsg('Chargement du moteur OCR...');
      const workerCount = (navigator.hardwareConcurrency || 4) >= 6 ? 3 : 2;
      scheduler = createScheduler();
      const workers = [];
      await Promise.all(Array.from({ length: workerCount }, async () => {
        const wk = await createWorker('eng', 1);
        await wk.setParameters({
          tessedit_pageseg_mode: '6',
          tessedit_char_whitelist: '0123456789',
          classify_bln_numeric_mode: '1',
          user_defined_dpi: '300',
        });
        workers.push(wk);
        scheduler.addWorker(wk);
      }));
      setProgress(12);

      const OUT = { blocks: true, text: true, hocr: false, tsv: false };
      const candidates = Array.from({ length: GRID_ROWS }, () =>
        Array.from({ length: GRID_COLS }, () => []));
      const addCand = (r, c, cand) => {
        if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) candidates[r][c].push(cand);
      };

      // 3. Extraction des cellules non vides : bbox d'encre précise + variante érodée
      const erodedCanvas = grayArrayToCanvas(erodeBinary(bin, w, h), w, h);
      const cellJobs = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (inkRatioCell(bin, w, h, r, c) < 0.004) continue;
          const bbox = inkBBoxInCell(bin, w, h, r, c);
          if (!bbox) continue;
          cellJobs.push({
            r, c,
            canvas: sliceCellCanvas(binCanvas, bbox),
            canvasEroded: sliceCellCanvas(erodedCanvas, bbox),
          });
        }
      }

      let done = 0;
      const total = 2 + cellJobs.length * 2;
      const tick = () => {
        done++;
        setProgress(12 + Math.round((done / total) * 72));
        setStatusMsg(`Analyse ${done}/${total} zones...`);
      };

      const readCell = (data) => {
        const words = extractWords(data);
        const conf = words.length > 0
          ? Math.max(...words.map(x => x.confidence || 0))
          : (data.confidence || 0);
        return { conf };
      };

      // 4. Lancement en parallèle : 2 passes image entière + 2 passes par cellule
      //    (binarisée + érodée, le consensus tranche)
      let textA1 = '', textA2 = '';
      const jobs = [];
      jobs.push(scheduler.addJob('recognize', binCanvas, {}, OUT).then(({ data }) => {
        textA1 = data.text || '';
        collectWordCandidates(extractWords(data), w, h, addCand, 'whole-bin');
        tick();
      }));
      jobs.push(scheduler.addJob('recognize', grayCanvas, {}, OUT).then(({ data }) => {
        textA2 = data.text || '';
        collectWordCandidates(extractWords(data), w, h, addCand, 'whole-gray');
        tick();
      }));
      for (const job of cellJobs) {
        jobs.push(scheduler.addJob('recognize', job.canvas, {}, OUT).then(({ data }) => {
          const { conf } = readCell(data);
          const num = parseCellText(data.text, job.c);
          if (num != null) addCand(job.r, job.c, { num, conf, source: 'cell' });
          tick();
        }));
        jobs.push(scheduler.addJob('recognize', job.canvasEroded, {}, OUT).then(({ data }) => {
          const { conf } = readCell(data);
          const num = parseCellText(data.text, job.c);
          if (num != null) addCand(job.r, job.c, { num, conf, source: 'cell-eroded' });
          tick();
        }));
      }
      await Promise.all(jobs);

      // 5. Repêchage : cellules avec encre mais aucune lecture → réessai en PSM 8
      const detected = new Set();
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (candidates[r][c].some(cd => cd.source.startsWith('cell'))) detected.add(`${r}-${c}`);
        }
      }
      const retryJobs = cellJobs.filter(j => !detected.has(`${j.r}-${j.c}`));
      if (retryJobs.length > 0) {
        setStatusMsg(`Seconde lecture de ${retryJobs.length} case(s)...`);
        await Promise.all(workers.map(wk => wk.setParameters({ tessedit_pageseg_mode: '8' })));
        await Promise.all(retryJobs.flatMap(job => [
          scheduler.addJob('recognize', job.canvas, {}, OUT).then(({ data }) => {
            const { conf } = readCell(data);
            const num = parseCellText(data.text, job.c);
            if (num != null && conf >= 30) {
              addCand(job.r, job.c, { num, conf: Math.min(conf, 55), source: 'cell-retry' });
            }
          }),
          scheduler.addJob('recognize', job.canvasEroded, {}, OUT).then(({ data }) => {
            const { conf } = readCell(data);
            const num = parseCellText(data.text, job.c);
            if (num != null && conf >= 30) {
              addCand(job.r, job.c, { num, conf: Math.min(conf, 55), source: 'cell-retry-e' });
            }
          }),
        ]));
      }

      await scheduler.terminate();
      scheduler = null;

      // 6. Fusion par consensus
      setStatusMsg('Placement des chiffres...');
      setProgress(95);
      let { grid, confGrid } = fuseCandidates(candidates);
      if (grid.flat().every(v => v === '*')) {
        grid = parseTextToGrid(textA1 + '\n' + textA2);
        confGrid = grid.map(row => row.map(v => (v === '*' ? 0 : 40)));
      }

      console.log('[OCR] cells analysed:', cellJobs.length, '/ 27 — grid:', grid);
      setProgress(100);
      setPreviewGrid(grid);
      setPreviewConf(confGrid);
      setPhase('preview');
    } catch (err) {
      console.error('OCR error:', err);
      if (scheduler) { try { await scheduler.terminate(); } catch (_) {} }
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
    const newConf = previewConf ? previewConf.map(r => [...r]) : null;
    const converted = convertFrenchChars(value);
    const cleaned = converted.replace(/\D/g, '');
    if (cleaned === '') {
      newGrid[row][col] = '*';
      if (newConf) newConf[row][col] = 0;
    } else {
      const num = parseInt(cleaned);
      if (num >= 1 && num <= 90) {
        newGrid[row][col] = num.toString();
        if (newConf) newConf[row][col] = 100;
      }
    }
    setPreviewGrid(newGrid);
    if (newConf) setPreviewConf(newConf);
  };

  const handleConfirm = () => {
    if (!previewGrid) return;
    onScanComplete(gridToListNumber(previewGrid));
    setPhase('idle');
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setCroppedPreview(null);
    setPreviewGrid(null);
    setPreviewConf(null);
    setProgress(0);
    setStatusMsg('');
    setPhase('camera');
    startCamera();
  };

  const handleRetryFile = () => {
    setCapturedImage(null);
    setCroppedPreview(null);
    setPreviewGrid(null);
    setPreviewConf(null);
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
              Alignez précisément la grille sur les cases du carton — la précision de lecture en dépend
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
            {(croppedPreview || capturedImage) && (
              <img src={croppedPreview || capturedImage} alt="Captured" className="w-full rounded-lg opacity-50" />
            )}
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

            {(croppedPreview || capturedImage) && (
              <div className="rounded-lg overflow-hidden border border-gray-600">
                <img src={croppedPreview || capturedImage} alt="Original" className="w-full" draggable={false} />
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
                    const conf = previewConf?.[i]?.[j] ?? 100;
                    const lowConf = isFilled && isInRange && conf < 60;
                    return (
                      <div key={`${i}-${j}`}
                        className={`flex-1 aspect-[1.2] rounded ${isFilled
                          ? !isInRange
                            ? 'bg-red-600/40 border border-red-500/60'
                            : lowConf
                              ? 'bg-amber-600/40 border border-amber-500/60'
                              : 'bg-indigo-600/40 border border-indigo-500/60'
                          : 'bg-gray-800 border border-gray-700'}`}>
                        <input type="text" maxLength="2"
                          value={cell === '*' ? '' : cell}
                          onChange={(e) => handleCellEdit(i, j, e.target.value)}
                          className={`w-full h-full bg-transparent text-center font-bold text-sm outline-none ${
                            isFilled
                              ? !isInRange ? 'text-red-300' : lowConf ? 'text-amber-200' : 'text-white'
                              : 'text-gray-500'
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
              <span className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm bg-amber-500/70 inline-block" />à vérifier
                </span>
                <span>Total: {countFilledCells()}/15</span>
              </span>
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
