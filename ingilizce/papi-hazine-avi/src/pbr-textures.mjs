import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';

/**
 * Procedural PBR Texture Atlas Generator (Albedo + Bump/Roughness)
 * Zero external image requests; cached & disposable for clean GPU memory management.
 */
const cache = new Map();

function seededNoise(x, y, seed = 1) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function makeCanvas(size, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function getPBRMaps(tag) {
  if (!tag) return null;
  if (cache.has(tag)) return cache.get(tag);

  let maps = null;
  if (tag === 'wood') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 2) {
        const wave = Math.sin(y * 0.14) * 14 + (seededNoise(y, 1) - 0.5) * 26;
        const g = Math.max(20, Math.min(235, 128 + wave));
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(0, y, s, 2);
      }
      // Plank seams
      ctx.fillStyle = '#282828';
      for (let p = 0; p < 4; p++) ctx.fillRect(0, p * 64, s, 2);
    });
    bump.repeat.set(2, 2);
    maps = { bumpMap: bump, bumpScale: 0.035 };
  } else if (tag === 'bark') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#787878';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 16) {
        const g = 70 + Math.floor(seededNoise(y, 2) * 80);
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(0, y, s, 12);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, y + 12, s, 4);
      }
    });
    bump.repeat.set(2, 5);
    maps = { bumpMap: bump, bumpScale: 0.06 };
  } else if (tag === 'stone') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#888';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 420; i++) {
        const x = seededNoise(i, 3) * s;
        const y = seededNoise(i, 4) * s;
        const r = 4 + seededNoise(i, 5) * 14;
        const v = 70 + Math.floor(seededNoise(i, 6) * 115);
        ctx.fillStyle = `rgba(${v},${v},${v},0.45)`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      // Carved masonry lines
      ctx.strokeStyle = 'rgba(30,30,30,0.45)';
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
    maps = { bumpMap: bump, bumpScale: 0.055 };
  } else if (tag === 'thatch') {
    const bump = makeCanvas(256, (ctx, s) => {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, s, s);
      for (let i = 0; i < 650; i++) {
        const x = seededNoise(i, 7) * s;
        const y = seededNoise(i, 8) * s;
        const v = 60 + Math.floor(seededNoise(i, 9) * 140);
        ctx.strokeStyle = `rgb(${v},${v},${v})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (seededNoise(i, 10) - 0.5) * 10, y + 26);
        ctx.stroke();
      }
    });
    bump.repeat.set(3, 3);
    maps = { bumpMap: bump, bumpScale: 0.06 };
  } else if (tag === 'feather') {
    const bump = makeCanvas(128, (ctx, s) => {
      ctx.fillStyle = '#909090';
      ctx.fillRect(0, 0, s, s);
      for (let y = 0; y < s; y += 10) {
        for (let x = 0; x < s; x += 14) {
          const ox = (Math.floor(y / 10) % 2) * 7;
          ctx.strokeStyle = 'rgba(220,220,220,0.45)';
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
      ctx.strokeStyle = '#c8c8c8';
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
    if (maps?.bumpMap) maps.bumpMap.dispose();
  }
  cache.clear();
}
