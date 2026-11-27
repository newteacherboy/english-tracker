import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';

/**
 * Procedural PBR Texture & Terrain Detail Generator (v2)
 * Zero external image requests; cached & disposable for clean GPU memory management.
 */
const cache = new Map();

function seededNoise(x, y, seed = 1) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function makeCanvas(size, drawFn, isColor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  if (isColor) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function getPBRMaps(tag) {
  if (!tag) return null;
  if (cache.has(tag)) return cache.get(tag);

  let maps = null;
  if (tag === 'terrain') {
    // Subtle painterly micro-albedo + organic bump so ground looks rich, never flat plastic!
    const map = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#ebebeb';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2400; i++) {
        const x = seededNoise(i, 21) * s;
        const y = seededNoise(i, 22) * s;
        const v = 212 + Math.floor(seededNoise(i, 23) * 43);
        ctx.fillStyle = `rgb(${v},${v + 2},${v - 3})`;
        ctx.fillRect(x, y, 3, 6);
      }
      for (let i = 0; i < 400; i++) {
        const x = seededNoise(i, 24) * s;
        const y = seededNoise(i, 25) * s;
        ctx.fillStyle = 'rgba(255,255,255,0.28)';
        ctx.beginPath();
        ctx.arc(x, y, 1.8 + seededNoise(i, 26) * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }, true);
    map.repeat.set(28, 28);

    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 2200; i++) {
        const x = seededNoise(i, 31) * s;
        const y = seededNoise(i, 32) * s;
        const v = 90 + Math.floor(seededNoise(i, 33) * 85);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 5);
      }
    });
    bump.repeat.set(28, 28);
    maps = { map, bumpMap: bump, bumpScale: 0.045 };
  } else if (tag === 'wood') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 2) {
        const wave = Math.sin(y * 0.14) * 16 + (seededNoise(y, 1) - 0.5) * 28;
        const g = Math.max(20, Math.min(235, 128 + wave));
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(0, y, s, 2);
      }
      ctx.fillStyle = '#242424';
      for (let p = 0; p < 4; p++) ctx.fillRect(0, p * 64, s, 2);
    });
    bump.repeat.set(2, 2);
    maps = { bumpMap: bump, bumpScale: 0.04 };
  } else if (tag === 'bark') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#787878';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 14) {
        const g = 68 + Math.floor(seededNoise(y, 2) * 88);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(0, y, s, 11);
        ctx.fillStyle = '#2d2d2d';
        ctx.fillRect(0, y + 11, s, 3);
      }
    });
    bump.repeat.set(2, 5);
    maps = { bumpMap: bump, bumpScale: 0.065 };
  } else if (tag === 'stone') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#888';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 480; i++) {
        const x = seededNoise(i, 3) * s;
        const y = seededNoise(i, 4) * s;
        const r = 4 + seededNoise(i, 5) * 14;
        const v = 68 + Math.floor(seededNoise(i, 6) * 120);
        ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(28,28,28,0.48)';
      ctx.lineWidth = 3;
      for (let row = 0; row < 4; row++) {
        const ry = row * 64;
        ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(s, ry); ctx.stroke();
        const off = (row % 2) * 32;
        for (let col = 0; col < 4; col++) {
          ctx.beginPath(); ctx.moveTo(col * 64 + off, ry); ctx.lineTo(col * 64 + off, ry + 64); ctx.stroke();
        }
      }
    });
    bump.repeat.set(2, 2);
    maps = { bumpMap: bump, bumpScale: 0.06 };
  } else if (tag === 'thatch') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let row = 0; row < s; row += 24) {
        ctx.fillStyle = '#383838';
        ctx.fillRect(0, row, s, 3);
        for (let col = 0; col < s; col += 24) {
          const g = 95 + Math.floor(seededNoise(col, row) * 80);
          ctx.fillStyle = `rgb(${g},${g},${g})`;
          ctx.fillRect(col + 2, row + 3, 21, 20);
        }
      }
    });
    bump.repeat.set(3, 3);
    maps = { bumpMap: bump, bumpScale: 0.055 };
  } else if (tag === 'feather') {
    const bump = makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#909090';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 10) {
        for (let x = 0; x < s; x += 14) {
          const ox = (Math.floor(y / 10) % 2) * 7;
          ctx.strokeStyle = 'rgba(225,225,225,0.48)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x + ox, y, 7, 0, Math.PI);
          ctx.stroke();
        }
      }
    });
    bump.repeat.set(3, 3);
    maps = { bumpMap: bump, bumpScale: 0.018 };
  } else if (tag === 'foliage') {
    const bump = makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#cfcfcf';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(s / 2, 0); ctx.lineTo(s / 2, s); ctx.stroke();
      ctx.lineWidth = 1.5;
      for (let y = 8; y < s; y += 10) {
        ctx.beginPath(); ctx.moveTo(s / 2, y); ctx.lineTo(0, y + 8); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(s / 2, y); ctx.lineTo(s, y + 8); ctx.stroke();
      }
    });
    maps = { bumpMap: bump, bumpScale: 0.03 };
  } else if (tag === 'plaster' || tag === 'fabric' || tag === 'leather') {
    const bump = makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 900; i++) {
        const x = seededNoise(i, 11) * s;
        const y = seededNoise(i, 12) * s;
        const v = 95 + Math.floor(seededNoise(i, 13) * 70);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(x, y, 2, 2);
      }
    });
    bump.repeat.set(3, 3);
    maps = { bumpMap: bump, bumpScale: 0.022 };
  }

  cache.set(tag, maps);
  return maps;
}

export function disposePBRMaps() {
  for (const maps of cache.values()) {
    maps?.map?.dispose();
    maps?.bumpMap?.dispose();
  }
  cache.clear();
}
