#!/usr/bin/env node
// Generates images/logo.png (128×128) and images/hub-icon.png (32×32).
// Run with: node scripts/generate-icons.js
//
// Design: blue rounded-rectangle background, white square brackets [ ]
// flanking a git branch symbol (three commit nodes in a Y/V shape).
// Uses signed-distance-field rendering for clean anti-aliasing at any size.
'use strict';

const zlib = require('node:zlib');
const fs   = require('node:fs');
const path = require('node:path');

// ── PNG encoder ──────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t   = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4); len.writeUInt32BE(data.length);
  const crc = Buffer.allocUnsafe(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = ihdr[11] = ihdr[12] = 0; // 8-bit RGBA

  const stride = w * 4;
  const raw    = Buffer.allocUnsafe(h * (1 + stride));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + stride)] = 0; // filter byte: none
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, j = y * (1 + stride) + 1 + x * 4;
      raw[j] = rgba[i]; raw[j+1] = rgba[i+1]; raw[j+2] = rgba[i+2]; raw[j+3] = rgba[i+3];
    }
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── SDF primitives ───────────────────────────────────────────────────────────

function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

// Signed distance to a line segment (negative = inside stroke when subtracted by half-width).
function sdSeg(px, py, ax, ay, bx, by) {
  const dx = bx-ax, dy = by-ay, l2 = dx*dx + dy*dy;
  if (l2 === 0) return Math.hypot(px-ax, py-ay);
  const t = clamp(((px-ax)*dx + (py-ay)*dy) / l2, 0, 1);
  return Math.hypot(px-ax - t*dx, py-ay - t*dy);
}

// Signed distance to a rounded rectangle.
function sdRRect(px, py, x0, y0, x1, y1, r) {
  const qx = Math.abs(px - (x0+x1)/2) - (x1-x0)/2 + r;
  const qy = Math.abs(py - (y0+y1)/2) - (y1-y0)/2 + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

// Convert SDF value to anti-aliased alpha (inside = 1, outside = 0).
function sdfAlpha(sdf, feather) {
  const t = clamp((sdf - feather) / (-2 * feather), 0, 1);
  return t * t * (3 - 2 * t);
}

// Alpha-composite src over dst (all channels 0..1).
function over(dR, dG, dB, dA, sR, sG, sB, sA) {
  const a = sA + dA * (1 - sA);
  if (a < 1e-9) return [0, 0, 0, 0];
  return [
    (sR*sA + dR*dA*(1-sA)) / a,
    (sG*sA + dG*dA*(1-sA)) / a,
    (sB*sA + dB*dA*(1-sA)) / a,
    a,
  ];
}

// ── Icon renderer ─────────────────────────────────────────────────────────────
//
// All geometry is defined in a 128-unit design space and scaled to the
// requested pixel size, so the same renderer produces both logo and hub icon.
//
// scheme: 'color' → blue background, white symbol (marketplace logo)
//         'mono'  → black background, white symbol (hub icon — ADO styling)

function render(size, scheme = 'color') {
  const buf  = new Uint8Array(size * size * 4);
  const UNIT = 128;
  const sc   = size / UNIT;
  const fe   = 1.5 / sc; // feather ≈ 1.5 screen pixels, converted to design units

  // Colours
  const [bgR, bgG, bgB] = [0x25/255, 0x57/255, 0xD6/255]; // #2557D6 blue (logo only)
  const [fgR, fgG, fgB] = scheme === 'mono'
    ? [0, 0, 0]   // black symbol on transparent background (hub icon)
    : [1, 1, 1];  // white symbol on blue background (logo)

  // Stroke and node dimensions (design units)
  const LW = 5.5; // half-width of bracket strokes
  const BW = 4.0; // half-width of branch lines
  const NR = 7.0; // radius of commit-node circles

  // Left bracket [ : outer vertical at x=lbX, arms reach to x=lbIn
  const lbX=14, lbT=22, lbB=106, lbIn=30;
  // Right bracket ] : outer vertical at x=rbX, arms reach to x=rbIn
  const rbX=114, rbT=22, rbB=106, rbIn=98;

  // Branch symbol — classic git branch shape:
  //
  //   n1 (main tip)   n2 (feature tip)
  //        |          /
  //        |fork    /       ← diagonal starts at fork point (no node)
  //        |      /
  //        |
  //        n0 (base)
  //
  // The main branch is a vertical line; the feature branch peels off
  // from a midpoint (forkY), giving the classic git branch look.
  const [n0x, n0y] = [54, 90];
  const [n1x, n1y] = [54, 28];
  const [n2x, n2y] = [82, 28];
  const forkY       = 58;    // y where the feature branch forks off n1 line

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / sc;
      const y = (py + 0.5) / sc;
      let [r, g, b, a] = [0, 0, 0, 0];

      // 1. Background rounded rectangle (logo only — hub icon is transparent)
      if (scheme !== 'mono') {
        [r,g,b,a] = over(r,g,b,a, bgR,bgG,bgB, sdfAlpha(sdRRect(x,y, 0,0,UNIT,UNIT, 20), fe));
      }

      // Helper: paint a white shape defined by an SDF value.
      const paint = sdf => { [r,g,b,a] = over(r,g,b,a, fgR,fgG,fgB, sdfAlpha(sdf, fe)); };

      // 2. Left bracket [
      paint(sdSeg(x,y, lbX,lbT, lbX,lbB)   - LW); // vertical bar
      paint(sdSeg(x,y, lbX,lbT, lbIn,lbT)  - LW); // top arm
      paint(sdSeg(x,y, lbX,lbB, lbIn,lbB)  - LW); // bottom arm

      // 3. Right bracket ]
      paint(sdSeg(x,y, rbX,rbT, rbX,rbB)   - LW); // vertical bar
      paint(sdSeg(x,y, rbX,rbT, rbIn,rbT)  - LW); // top arm
      paint(sdSeg(x,y, rbX,rbB, rbIn,rbB)  - LW); // bottom arm

      // 4. Branch lines
      paint(sdSeg(x,y, n0x,n0y, n1x,n1y)   - BW); // base → main tip (vertical)
      paint(sdSeg(x,y, n1x,forkY, n2x,n2y) - BW); // fork → feature tip (diagonal)

      // 5. Commit nodes (filled circles)
      paint(Math.hypot(x-n0x, y-n0y) - NR); // base node
      paint(Math.hypot(x-n1x, y-n1y) - NR); // main tip node
      paint(Math.hypot(x-n2x, y-n2y) - NR); // feature tip node

      const off = (py * size + px) * 4;
      buf[off]   = Math.round(r * 255);
      buf[off+1] = Math.round(g * 255);
      buf[off+2] = Math.round(b * 255);
      buf[off+3] = Math.round(a * 255);
    }
  }
  return buf;
}

// ── Write files ───────────────────────────────────────────────────────────────

const imagesDir = path.join(__dirname, '..', 'images');

for (const [size, name, scheme] of [[128, 'logo.png', 'color'], [32, 'hub-icon.png', 'mono']]) {
  const png = encodePng(size, size, render(size, scheme));
  fs.writeFileSync(path.join(imagesDir, name), png);
  console.log(`Wrote images/${name} (${size}×${size}, ${scheme})`);
}
