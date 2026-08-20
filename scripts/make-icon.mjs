// Generates the Pinote app icon (②案: black bg, geometric white "P", red accent
// dot) as a 1024x1024 RGB PNG with 2x2 supersampled anti-aliasing. Pure Node —
// no native image deps. Run: node scripts/make-icon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const N = 1024;

// Palette
const BLACK = [10, 10, 12];
const WHITE = [246, 247, 250];
const CORAL = [255, 91, 74];

// Glyph geometry — a proper "P": a vertical stem on the LEFT plus a bowl loop
// (ring) on the upper-right. The ring is centered on the stem's right edge, so
// the stem closes the left of the counter and the ring's right half forms the
// bowl. The whole glyph is centered in the 1024 canvas.
const bowlCx = 475;
const bowlCy = 425;
const bowlOuter = 165;
const bowlInner = 88;
const stem = { x0: 385, x1: 475, y0: 275, y1: 765, r: 34 };
// Red accent dot sits in the open (right) half of the P's counter.
const dot = { x: 515, y: 425, r: 40 };

function inRoundedRect(x, y, r) {
  const { x0, x1, y0, y1, r: rad } = r;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const ix = Math.min(Math.max(x, x0 + rad), x1 - rad);
  const iy = Math.min(Math.max(y, y0 + rad), y1 - rad);
  const dx = x - ix;
  const dy = y - iy;
  return dx * dx + dy * dy <= rad * rad;
}

function dist(x, y, px, py) {
  return Math.hypot(x - px, y - py);
}

// Returns the color at a sample point (sub-pixel coordinates).
function sample(x, y) {
  const dBowl = dist(x, y, bowlCx, bowlCy);
  // Right-half ring only, so the loop extends to the right of the stem (a proper
  // "P" rather than a lollipop/pin shape).
  const inRing = dBowl <= bowlOuter && dBowl >= bowlInner && x >= bowlCx;
  const isP = inRing || inRoundedRect(x, y, stem);
  const isDot = dist(x, y, dot.x, dot.y) <= dot.r;
  if (isDot) return CORAL;
  if (isP) return WHITE;
  return BLACK;
}

// Build RGB buffer with 2x2 supersampling.
const raw = Buffer.alloc(N * (1 + N * 3));
for (let y = 0; y < N; y++) {
  const rowStart = y * (1 + N * 3);
  raw[rowStart] = 0; // filter: none
  for (let x = 0; x < N; x++) {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let sy = 0; sy < 2; sy++) {
      for (let sx = 0; sx < 2; sx++) {
        const c = sample(x + (sx + 0.5) / 2, y + (sy + 0.5) / 2);
        r += c[0];
        g += c[1];
        b += c[2];
      }
    }
    const o = rowStart + 1 + x * 3;
    raw[o] = Math.round(r / 4);
    raw[o + 1] = Math.round(g / 4);
    raw[o + 2] = Math.round(b / 4);
  }
}

// --- Minimal PNG encoder (RGB, 8-bit) ---
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
const idat = deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = process.argv[2] ?? 'assets/images/icon.png';
writeFileSync(out, png);
console.log(`wrote ${out} (${N}x${N}, ${png.length} bytes)`);
