/**
 * Papi Hazine Avı — Real GLB 2.0 3D Asset Pipeline Generator
 * Generates sculpted, organic, multi-part, PBR-ready .glb binary models
 * with hierarchical bone/node rigs for Three.js runtime loading.
 *
 * Output: english-tracker/ingilizce/papi-hazine-avi/assets/models/*.glb
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../assets/models');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Vector & Mesh Math Helpers ──────────────────────────────────────────────
function vec3(x = 0, y = 0, z = 0) { return [x, y, z]; }
function add3(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function mul3(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
function cross3(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
}
function len3(a) { return Math.hypot(a[0], a[1], a[2]); }
function norm3(a) {
  const l = len3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function hexToLinearRgb(hex) {
  return hexToRgb(hex).map(srgbToLinear);
}

// ─── Sculpted Geometry Builder ───────────────────────────────────────────────
class Geo {
  constructor() {
    this.pos = [];
    this.norm = [];
    this.uv = [];
    this.idx = [];
  }

  addVertex(x, y, z, nx, ny, nz, u = 0, v = 0) {
    const i = this.pos.length / 3;
    this.pos.push(x, y, z);
    this.norm.push(nx, ny, nz);
    this.uv.push(u, v);
    return i;
  }

  addTri(a, b, c) {
    this.idx.push(a, b, c);
  }

  addQuad(a, b, c, d) {
    this.idx.push(a, b, c, a, c, d);
  }

  recomputeNormals() {
    const n = new Float32Array(this.pos.length);
    for (let i = 0; i < this.idx.length; i += 3) {
      const ia = this.idx[i] * 3;
      const ib = this.idx[i + 1] * 3;
      const ic = this.idx[i + 2] * 3;
      const ax = this.pos[ia], ay = this.pos[ia + 1], az = this.pos[ia + 2];
      const bx = this.pos[ib], by = this.pos[ib + 1], bz = this.pos[ib + 2];
      const cx = this.pos[ic], cy = this.pos[ic + 1], cz = this.pos[ic + 2];
      const abx = bx - ax, aby = by - ay, abz = bz - az;
      const acx = cx - ax, acy = cy - ay, acz = cz - az;
      const nx = aby * acz - abz * acy;
      const ny = abz * acx - abx * acz;
      const nz = abx * acy - aby * acx;
      n[ia] += nx; n[ia + 1] += ny; n[ia + 2] += nz;
      n[ib] += nx; n[ib + 1] += ny; n[ib + 2] += nz;
      n[ic] += nx; n[ic + 1] += ny; n[ic + 2] += nz;
    }
    for (let i = 0; i < n.length; i += 3) {
      const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
      this.norm[i] = n[i] / l;
      this.norm[i + 1] = n[i + 1] / l;
      this.norm[i + 2] = n[i + 2] / l;
    }
    return this;
  }

  transform(fn) {
    for (let i = 0; i < this.pos.length; i += 3) {
      const [x, y, z] = fn(this.pos[i], this.pos[i + 1], this.pos[i + 2], i / 3);
      this.pos[i] = x;
      this.pos[i + 1] = y;
      this.pos[i + 2] = z;
    }
    return this.recomputeNormals();
  }

  translate(dx, dy, dz) {
    return this.transform((x, y, z) => [x + dx, y + dy, z + dz]);
  }

  scale(sx, sy, sz) {
    return this.transform((x, y, z) => [x * sx, y * sy, z * sz]);
  }

  rotateX(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return this.transform((x, y, z) => [x, y * c - z * s, y * s + z * c]);
  }

  rotateY(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return this.transform((x, y, z) => [x * c + z * s, y, -x * s + z * c]);
  }

  rotateZ(a) {
    const c = Math.cos(a), s = Math.sin(a);
    return this.transform((x, y, z) => [x * c - y * s, x * s + y * c, z]);
  }

  merge(other) {
    const offset = this.pos.length / 3;
    this.pos.push(...other.pos);
    this.norm.push(...other.norm);
    this.uv.push(...other.uv);
    for (let i = 0; i < other.idx.length; i++) {
      this.idx.push(other.idx[i] + offset);
    }
    return this;
  }
}

// ─── Sculpted Parametric Primitives ──────────────────────────────────────────

/** Organic ellipsoid with optional sculpting callback(x,y,z,u,v) */
function makeSculptedSphere(rx, ry, rz, segU = 20, segV = 14, deform = null) {
  const g = new Geo();
  for (let iv = 0; iv <= segV; iv++) {
    const v = iv / segV;
    const phi = v * Math.PI;
    const sp = Math.sin(phi), cp = Math.cos(phi);
    for (let iu = 0; iu <= segU; iu++) {
      const u = iu / segU;
      const theta = u * Math.PI * 2;
      let x = rx * sp * Math.cos(theta);
      let y = ry * cp;
      let z = rz * sp * Math.sin(theta);
      if (deform) [x, y, z] = deform(x, y, z, u, v);
      g.addVertex(x, y, z, 0, 1, 0, u, v);
    }
  }
  const stride = segU + 1;
  for (let iv = 0; iv < segV; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * stride + iu;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      g.addTri(a, c, b);
      g.addTri(b, c, d);
    }
  }
  return g.recomputeNormals();
}

/** Smooth lathe (revolved profile) for beaks, bodies, vessels, hats, towers */
function makeLathe(points, segs = 20, closeCaps = true) {
  const g = new Geo();
  const rows = points.length;
  for (let r = 0; r < rows; r++) {
    const [rad, y] = points[r];
    const v = r / Math.max(1, rows - 1);
    for (let s = 0; s <= segs; s++) {
      const u = s / segs;
      const a = u * Math.PI * 2;
      g.addVertex(Math.cos(a) * rad, y, Math.sin(a) * rad, 0, 1, 0, u, v);
    }
  }
  const stride = segs + 1;
  for (let r = 0; r < rows - 1; r++) {
    for (let s = 0; s < segs; s++) {
      const a = r * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      g.addTri(a, b, c);
      g.addTri(b, d, c);
    }
  }
  if (closeCaps && points[0][0] > 0.001) {
    const center = g.addVertex(0, points[0][1], 0, 0, -1, 0, 0.5, 0);
    for (let s = 0; s < segs; s++) g.addTri(center, s + 1, s);
  }
  if (closeCaps && points[rows - 1][0] > 0.001) {
    const lastRow = (rows - 1) * stride;
    const center = g.addVertex(0, points[rows - 1][1], 0, 0, 1, 0, 0.5, 1);
    for (let s = 0; s < segs; s++) g.addTri(center, lastRow + s, lastRow + s + 1);
  }
  return g.recomputeNormals();
}

/** Curved organic tube along 3D spine points with varying radius & ring bumps */
function makeCurvedTube(spine, radii, radialSegs = 12, ringBump = 0) {
  const g = new Geo();
  const n = spine.length;
  for (let i = 0; i < n; i++) {
    const p = spine[i];
    const prev = spine[Math.max(0, i - 1)];
    const next = spine[Math.min(n - 1, i + 1)];
    const tangent = norm3(sub3(next, prev));
    const up = Math.abs(tangent[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const side = norm3(cross3(tangent, up));
    const binorm = norm3(cross3(side, tangent));
    const baseR = radii[i];
    const bump = ringBump ? (1 + ringBump * Math.sin(i * Math.PI * 1.5)) : 1;
    const r = baseR * bump;
    const v = i / Math.max(1, n - 1);
    for (let s = 0; s <= radialSegs; s++) {
      const u = s / radialSegs;
      const a = u * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const offset = add3(mul3(side, ca * r), mul3(binorm, sa * r));
      const pt = add3(p, offset);
      g.addVertex(pt[0], pt[1], pt[2], 0, 1, 0, u, v);
    }
  }
  const stride = radialSegs + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let s = 0; s < radialSegs; s++) {
      const a = i * stride + s;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      g.addTri(a, b, c);
      g.addTri(b, d, c);
    }
  }
  return g.recomputeNormals();
}

/** Beveled box for crisp architectural wood beams, stones, chests, books */
function makeBeveledBox(w, h, d, bevel = 0.04) {
  const g = new Geo();
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const b = Math.min(bevel, hw * 0.4, hh * 0.4, hd * 0.4);
  // Build as subdivided cube pushed onto rounded superquadric
  const seg = 3;
  const faces = [
    { dir: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { dir: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    { dir: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { dir: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { dir: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { dir: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  ];
  for (const f of faces) {
    const start = g.pos.length / 3;
    for (let iy = 0; iy <= seg; iy++) {
      const tv = iy / seg;
      const sv = tv * 2 - 1;
      for (let ix = 0; ix <= seg; ix++) {
        const tu = ix / seg;
        const su = tu * 2 - 1;
        let px = f.dir[0] + f.u[0] * su + f.v[0] * sv;
        let py = f.dir[1] + f.u[1] * su + f.v[1] * sv;
        let pz = f.dir[2] + f.u[2] * su + f.v[2] * sv;
        // Soft bevel pull on edges/corners
        const ax = Math.abs(px), ay = Math.abs(py), az = Math.abs(pz);
        const corner = (ax > 0.99 ? 1 : 0) + (ay > 0.99 ? 1 : 0) + (az > 0.99 ? 1 : 0);
        const shrink = corner >= 3 ? b * 0.9 : corner === 2 ? b * 0.55 : 0;
        px = Math.sign(px) * Math.max(0, ax * hw - (ax > 0.99 ? shrink : 0));
        py = Math.sign(py) * Math.max(0, ay * hh - (ay > 0.99 ? shrink : 0));
        pz = Math.sign(pz) * Math.max(0, az * hd - (az > 0.99 ? shrink : 0));
        g.addVertex(px, py, pz, f.dir[0], f.dir[1], f.dir[2], tu, tv);
      }
    }
    const stride = seg + 1;
    for (let iy = 0; iy < seg; iy++) {
      for (let ix = 0; ix < seg; ix++) {
        const a = start + iy * stride + ix;
        const bIdx = a + 1;
        const c = a + stride;
        const dIdx = c + 1;
        g.addQuad(a, bIdx, dIdx, c);
      }
    }
  }
  return g.recomputeNormals();
}

/** Sculpted curved feather / palm frond / petal blade */
function makeFeatherBlade(length, width, arch = 0.25, thickness = 0.03, segs = 10) {
  const g = new Geo();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = t * length;
    const y = Math.sin(t * Math.PI) * arch - t * t * arch * 0.45;
    const w = Math.sin(Math.pow(t, 0.72) * Math.PI) * width * 0.5;
    const th = (1 - t * 0.75) * thickness;
    // Left edge, top ridge, right edge, bottom ridge
    g.addVertex(-w, y - th * 0.3, z, -0.7, 0.5, 0, 0, t);
    g.addVertex(0, y + th, z, 0, 1, 0, 0.5, t);
    g.addVertex(w, y - th * 0.3, z, 0.7, 0.5, 0, 1, t);
    g.addVertex(0, y - th, z, 0, -1, 0, 0.5, t);
  }
  for (let i = 0; i < segs; i++) {
    const r0 = i * 4;
    const r1 = (i + 1) * 4;
    // Top left & top right
    g.addQuad(r0 + 0, r0 + 1, r1 + 1, r1 + 0);
    g.addQuad(r0 + 1, r0 + 2, r1 + 2, r1 + 1);
    // Bottom right & bottom left
    g.addQuad(r0 + 2, r0 + 3, r1 + 3, r1 + 2);
    g.addQuad(r0 + 3, r0 + 0, r1 + 0, r1 + 3);
  }
  return g.recomputeNormals();
}

/** Torus ring (handles, brass rings, hats, keys) */
function makeTorus(R, r, segU = 20, segV = 10) {
  const g = new Geo();
  for (let iu = 0; iu <= segU; iu++) {
    const u = iu / segU;
    const theta = u * Math.PI * 2;
    const ct = Math.cos(theta), st = Math.sin(theta);
    for (let iv = 0; iv <= segV; iv++) {
      const v = iv / segV;
      const phi = v * Math.PI * 2;
      const cp = Math.cos(phi), sp = Math.sin(phi);
      const x = (R + r * cp) * ct;
      const y = r * sp;
      const z = (R + r * cp) * st;
      g.addVertex(x, y, z, cp * ct, sp, cp * st, u, v);
    }
  }
  const stride = segV + 1;
  for (let iu = 0; iu < segU; iu++) {
    for (let iv = 0; iv < segV; iv++) {
      const a = iu * stride + iv;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      g.addQuad(a, b, d, c);
    }
  }
  return g.recomputeNormals();
}

// ─── GLB 2.0 Binary Writer ───────────────────────────────────────────────────
class GLBBuilder {
  constructor(name) {
    this.name = name;
    this.materials = [];
    this.matMap = new Map();
    this.meshes = [];
    this.nodes = [];
    this.rootNodes = [];
    this.chunks = []; // Array of Buffer
    this.bufferViews = [];
    this.accessors = [];
    this.byteOffset = 0;
  }

  addMaterial(name, hex, opts = {}) {
    const key = `${name}_${hex}_${opts.roughness ?? 0.65}_${opts.metallic ?? 0}_${opts.emissive ?? ''}_${opts.textureTag ?? ''}`;
    if (this.matMap.has(key)) return this.matMap.get(key);
    const [r, g, b] = hexToLinearRgb(hex);
    const mat = {
      name,
      pbrMetallicRoughness: {
        baseColorFactor: [r, g, b, opts.alpha ?? 1],
        metallicFactor: opts.metallic ?? 0.0,
        roughnessFactor: opts.roughness ?? 0.65
      },
      extras: {
        textureTag: opts.textureTag || null,
        doubleSided: !!opts.doubleSided
      }
    };
    if (opts.doubleSided) mat.doubleSided = true;
    if (opts.emissive) {
      const [er, eg, eb] = hexToLinearRgb(opts.emissive);
      const str = opts.emissiveIntensity ?? 1.0;
      mat.emissiveFactor = [Math.min(1, er * str), Math.min(1, eg * str), Math.min(1, eb * str)];
    }
    const idx = this.materials.length;
    this.materials.push(mat);
    this.matMap.set(key, idx);
    return idx;
  }

  _appendBuffer(typedArray, target) {
    // 4-byte align
    const pad = (4 - (this.byteOffset % 4)) % 4;
    if (pad > 0) {
      this.chunks.push(Buffer.alloc(pad));
      this.byteOffset += pad;
    }
    const buf = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
    const viewIndex = this.bufferViews.length;
    this.bufferViews.push({
      buffer: 0,
      byteOffset: this.byteOffset,
      byteLength: buf.byteLength,
      ...(target ? { target } : {})
    });
    this.chunks.push(buf);
    this.byteOffset += buf.byteLength;
    return viewIndex;
  }

  addMesh(name, primitives) {
    // primitives: [{ geo, material }]
    const gltfPrims = [];
    for (const prim of primitives) {
      const g = prim.geo;
      const posArr = new Float32Array(g.pos);
      const normArr = new Float32Array(g.norm);
      const uvArr = new Float32Array(g.uv);
      const useU32 = (g.pos.length / 3) > 65535;
      const idxArr = useU32 ? new Uint32Array(g.idx) : new Uint16Array(g.idx);

      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < posArr.length; i += 3) {
        if (posArr[i] < minX) minX = posArr[i];
        if (posArr[i + 1] < minY) minY = posArr[i + 1];
        if (posArr[i + 2] < minZ) minZ = posArr[i + 2];
        if (posArr[i] > maxX) maxX = posArr[i];
        if (posArr[i + 1] > maxY) maxY = posArr[i + 1];
        if (posArr[i + 2] > maxZ) maxZ = posArr[i + 2];
      }

      const posView = this._appendBuffer(posArr, 34962);
      const normView = this._appendBuffer(normArr, 34962);
      const uvView = this._appendBuffer(uvArr, 34962);
      const idxView = this._appendBuffer(idxArr, 34963);

      const posAcc = this.accessors.length;
      this.accessors.push({
        bufferView: posView, componentType: 5126, count: posArr.length / 3,
        type: 'VEC3', min: [minX, minY, minZ], max: [maxX, maxY, maxZ]
      });
      const normAcc = this.accessors.length;
      this.accessors.push({
        bufferView: normView, componentType: 5126, count: normArr.length / 3, type: 'VEC3'
      });
      const uvAcc = this.accessors.length;
      this.accessors.push({
        bufferView: uvView, componentType: 5126, count: uvArr.length / 3, type: 'VEC2'
      });
      const idxAcc = this.accessors.length;
      this.accessors.push({
        bufferView: idxView, componentType: useU32 ? 5125 : 5123, count: idxArr.length, type: 'SCALAR'
      });

      gltfPrims.push({
        attributes: { POSITION: posAcc, NORMAL: normAcc, TEXCOORD_0: uvAcc },
        indices: idxAcc,
        material: prim.material
      });
    }
    const meshIdx = this.meshes.length;
    this.meshes.push({ name, primitives: gltfPrims });
    return meshIdx;
  }

  addNode({ name, mesh = null, translation = null, rotation = null, scale = null, parent = null, extras = null }) {
    const node = { name };
    if (mesh !== null) node.mesh = mesh;
    if (translation) node.translation = translation;
    if (rotation) node.rotation = rotation;
    if (scale) node.scale = scale;
    if (extras) node.extras = extras;
    const idx = this.nodes.length;
    this.nodes.push(node);
    if (parent !== null) {
      if (!this.nodes[parent].children) this.nodes[parent].children = [];
      this.nodes[parent].children.push(idx);
    } else {
      this.rootNodes.push(idx);
    }
    return idx;
  }

  write(filePath) {
    // Pad BIN to 4 bytes
    const binPad = (4 - (this.byteOffset % 4)) % 4;
    if (binPad > 0) {
      this.chunks.push(Buffer.alloc(binPad));
      this.byteOffset += binPad;
    }
    const binBuf = Buffer.concat(this.chunks);

    const gltf = {
      asset: { version: '2.0', generator: 'Diji-Medu Papi Hazine Avi 3D Pipeline v1.0' },
      scene: 0,
      scenes: [{ name: this.name, nodes: this.rootNodes }],
      nodes: this.nodes,
      meshes: this.meshes,
      materials: this.materials,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: binBuf.byteLength }]
    };

    let jsonStr = JSON.stringify(gltf);
    const jsonBufRaw = Buffer.from(jsonStr, 'utf8');
    const jsonPad = (4 - (jsonBufRaw.byteLength % 4)) % 4;
    const jsonBuf = jsonPad > 0 ? Buffer.concat([jsonBufRaw, Buffer.from(' '.repeat(jsonPad))]) : jsonBufRaw;

    const totalLen = 12 + 8 + jsonBuf.byteLength + 8 + binBuf.byteLength;
    const out = Buffer.alloc(totalLen);
    // Header
    out.writeUInt32LE(0x46546C67, 0); // glTF
    out.writeUInt32LE(2, 4);          // version 2
    out.writeUInt32LE(totalLen, 8);
    // JSON chunk
    out.writeUInt32LE(jsonBuf.byteLength, 12);
    out.writeUInt32LE(0x4E4F534A, 16); // JSON
    jsonBuf.copy(out, 20);
    // BIN chunk
    const binHeaderOffset = 20 + jsonBuf.byteLength;
    out.writeUInt32LE(binBuf.byteLength, binHeaderOffset);
    out.writeUInt32LE(0x004E4942, binHeaderOffset + 4); // BIN
    binBuf.copy(out, binHeaderOffset + 8);

    fs.writeFileSync(filePath, out);
    const kb = (out.byteLength / 1024).toFixed(1);
    console.log(`  ✓ ${path.basename(filePath).padEnd(24)} ${kb.padStart(6)} KB  (${this.meshes.length} meshes, ${this.nodes.length} nodes)`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PAPI THE EXPLORER PARROT (Rigged hierarchical 3D character!)
// Faithful to Diji-Medu mascot + Red/Blue/Yellow plumage + Explorer Hat & Backpack
// ═════════════════════════════════════════════════════════════════════════════
function buildPapiGLB() {
  const b = new GLBBuilder('PapiExplorer');

  const mTurquoise = b.addMaterial('PapiTurquoise', '#18b8d4', { roughness: 0.58, textureTag: 'feather' });
  const mScarlet   = b.addMaterial('PapiScarlet',   '#e83939', { roughness: 0.55, textureTag: 'feather' });
  const mRoyalBlue = b.addMaterial('PapiRoyalBlue', '#1c63d8', { roughness: 0.52, textureTag: 'feather' });
  const mGold      = b.addMaterial('PapiGold',      '#ffca2c', { roughness: 0.58, textureTag: 'feather' });
  const mOrange    = b.addMaterial('PapiBeak',      '#ff8e24', { roughness: 0.35 });
  const mDarkBeak  = b.addMaterial('PapiBeakTip',   '#d95d16', { roughness: 0.38 });
  const mEyeWhite  = b.addMaterial('EyeWhite',      '#ffffff', { roughness: 0.15 });
  const mEyeIris   = b.addMaterial('EyeIris',       '#5a2d0c', { roughness: 0.12 });
  const mEyePupil  = b.addMaterial('EyePupil',      '#141218', { roughness: 0.08 });
  const mHatKhaki  = b.addMaterial('ExplorerHat',   '#d9b57c', { roughness: 0.78, textureTag: 'fabric' });
  const mHatBand   = b.addMaterial('HatBand',       '#9c3822', { roughness: 0.65 });
  const mBrass     = b.addMaterial('Brass',         '#f0be4a', { roughness: 0.25, metallic: 0.85 });
  const mPack      = b.addMaterial('Backpack',      '#8c5328', { roughness: 0.72, textureTag: 'leather' });
  const mPackStrap = b.addMaterial('PackStrap',     '#543016', { roughness: 0.76 });
  const mMapPaper  = b.addMaterial('MapRoll',       '#f5e5bd', { roughness: 0.82 });

  // Root -> Pelvis/Torso hierarchy
  const root = b.addNode({ name: 'PapiRoot' });
  const bodyNode = b.addNode({ name: 'Torso', parent: root, translation: [0, 0.72, 0] });

  // Sculpted tear-drop parrot torso + golden belly patch
  const torsoGeo = makeSculptedSphere(0.37, 0.46, 0.35, 24, 18, (x, y, z) => {
    // Taper slightly toward neck and round the chest forward (+Z is forward)
    const chestBulge = y < 0.1 && z > 0 ? 1.12 : 1.0;
    const taper = y > 0.15 ? 1 - (y - 0.15) * 0.42 : 1.0;
    const rearTaper = z < -0.1 ? 1 + z * 0.25 : 1.0;
    return [x * taper, y, z * chestBulge * rearTaper];
  });
  const bellyGeo = makeSculptedSphere(0.27, 0.35, 0.22, 18, 14, (x, y, z) => [x, y - 0.03, z + 0.17]);
  const collarGeo = makeTorus(0.24, 0.065, 18, 10).translate(0, 0.32, 0.02);

  const torsoMesh = b.addMesh('TorsoMesh', [
    { geo: torsoGeo, material: mTurquoise },
    { geo: bellyGeo, material: mGold },
    { geo: collarGeo, material: mScarlet }
  ]);
  b.nodes[bodyNode].mesh = torsoMesh;

  // Explorer Backpack attached to Torso (-Z back)
  const packMain = makeBeveledBox(0.38, 0.40, 0.22, 0.06).translate(0, 0.04, -0.36);
  const packFlap = makeBeveledBox(0.40, 0.13, 0.24, 0.04).translate(0, 0.20, -0.36);
  const packPocket = makeBeveledBox(0.24, 0.15, 0.08, 0.03).translate(0, -0.05, -0.47);
  const packBuckle = makeBeveledBox(0.08, 0.07, 0.05, 0.01).translate(0, 0.12, -0.49);
  const strapL = makeBeveledBox(0.06, 0.38, 0.34, 0.015).translate(-0.22, 0.08, -0.14);
  const strapR = makeBeveledBox(0.06, 0.38, 0.34, 0.015).translate(0.22, 0.08, -0.14);
  const mapRoll = makeCurvedTube([[-0.22, 0.29, -0.36], [0, 0.29, -0.36], [0.22, 0.29, -0.36]], [0.055, 0.055, 0.055], 12);
  const packMesh = b.addMesh('BackpackMesh', [
    { geo: packMain.merge(packFlap).merge(packPocket), material: mPack },
    { geo: strapL.merge(strapR), material: mPackStrap },
    { geo: packBuckle, material: mBrass },
    { geo: mapRoll, material: mMapPaper }
  ]);
  b.addNode({ name: 'Backpack', parent: bodyNode, mesh: packMesh });

  // Head Node (child of Torso)
  const headNode = b.addNode({ name: 'Head', parent: bodyNode, translation: [0, 0.56, 0.05] });
  const skullGeo = makeSculptedSphere(0.35, 0.33, 0.34, 24, 18, (x, y, z) => {
    // Cute fuller cheeks & rounded crown
    const cheek = y < 0 && Math.abs(x) > 0.18 ? 1.08 : 1.0;
    return [x * cheek, y, z];
  });
  // Feathered cheeks (yellow patches like Diji-Medu Papi)
  const cheekL = makeSculptedSphere(0.14, 0.11, 0.12, 14, 10).translate(-0.23, -0.06, 0.18);
  const cheekR = makeSculptedSphere(0.14, 0.11, 0.12, 14, 10).translate(0.23, -0.06, 0.18);
  // Expressive Eyes (white + iris + pupil + glint)
  const eyeWL = makeSculptedSphere(0.115, 0.135, 0.08, 16, 12).translate(-0.155, 0.04, 0.265);
  const eyeWR = makeSculptedSphere(0.115, 0.135, 0.08, 16, 12).translate(0.155, 0.04, 0.265);
  const irisL = makeSculptedSphere(0.078, 0.095, 0.05, 14, 10).translate(-0.155, 0.035, 0.318);
  const irisR = makeSculptedSphere(0.078, 0.095, 0.05, 14, 10).translate(0.155, 0.035, 0.318);
  const pupL  = makeSculptedSphere(0.050, 0.062, 0.04, 12, 8).translate(-0.155, 0.035, 0.342);
  const pupR  = makeSculptedSphere(0.050, 0.062, 0.04, 12, 8).translate(0.155, 0.035, 0.342);
  const glintL = makeSculptedSphere(0.022, 0.025, 0.02, 8, 6).translate(-0.13, 0.07, 0.365);
  const glintR = makeSculptedSphere(0.022, 0.025, 0.02, 8, 6).translate(0.18, 0.07, 0.365);
  // Curved Upper Beak (sculpted hooked parrot beak!)
  const upperBeak = makeCurvedTube(
    [[0, 0.03, 0.28], [0, 0.02, 0.42], [0, -0.03, 0.52], [0, -0.11, 0.55]],
    [0.12, 0.105, 0.068, 0.016],
    14
  );
  // Scarlet & Gold Crest feathers peeking beneath/behind explorer hat
  const crest1 = makeFeatherBlade(0.30, 0.11, 0.10, 0.028, 8).rotateX(-1.05).translate(0, 0.28, -0.06);
  const crest2 = makeFeatherBlade(0.25, 0.09, 0.08, 0.024, 8).rotateX(-0.85).rotateY(0.35).translate(0.08, 0.26, -0.08);
  const crest3 = makeFeatherBlade(0.25, 0.09, 0.08, 0.024, 8).rotateX(-0.85).rotateY(-0.35).translate(-0.08, 0.26, -0.08);

  // Explorer Pith Helmet!
  const hatDome = makeLathe([
    [0.33, 0.0], [0.32, 0.06], [0.29, 0.14], [0.22, 0.21], [0.11, 0.25], [0.001, 0.26]
  ], 22, true).translate(0, 0.22, -0.01);
  const hatBrim = makeLathe([
    [0.31, 0.0], [0.46, -0.03], [0.48, -0.04], [0.45, -0.06], [0.30, -0.03]
  ], 24, false).translate(0, 0.23, 0.01);
  const hatBand = makeTorus(0.325, 0.032, 22, 8).translate(0, 0.25, -0.01);
  const hatBadge = makeSculptedSphere(0.06, 0.06, 0.025, 12, 8).translate(0, 0.30, 0.31);

  const headMesh = b.addMesh('HeadMesh', [
    { geo: skullGeo, material: mTurquoise },
    { geo: cheekL.merge(cheekR), material: mGold },
    { geo: eyeWL.merge(eyeWR).merge(glintL).merge(glintR), material: mEyeWhite },
    { geo: irisL.merge(irisR), material: mEyeIris },
    { geo: pupL.merge(pupR), material: mEyePupil },
    { geo: upperBeak, material: mOrange },
    { geo: crest1, material: mScarlet },
    { geo: crest2.merge(crest3), material: mGold },
    { geo: hatDome.merge(hatBrim), material: mHatKhaki },
    { geo: hatBand, material: mHatBand },
    { geo: hatBadge, material: mBrass }
  ]);
  b.nodes[headNode].mesh = headMesh;

  // Articulated Lower Jaw (for speaking / celebrating!)
  const jawGeo = makeSculptedSphere(0.08, 0.05, 0.11, 12, 8).translate(0, -0.03, 0.07);
  const jawMesh = b.addMesh('JawMesh', [{ geo: jawGeo, material: mDarkBeak }]);
  b.addNode({ name: 'Jaw', parent: headNode, translation: [0, -0.06, 0.29], mesh: jawMesh });

  // Articulated Left & Right Wings (multi-layered scarlet + royal blue + gold feathers!)
  function buildWing(side) {
    const sign = side === 'L' ? -1 : 1;
    const shoulder = makeSculptedSphere(0.11, 0.18, 0.22, 14, 10).translate(sign * 0.08, -0.04, 0);
    const primaryFeathers = new Geo();
    const secondaryFeathers = new Geo();
    for (let i = 0; i < 5; i++) {
      const f = makeFeatherBlade(0.46 - i * 0.045, 0.125, 0.06, 0.025, 8)
        .rotateY(sign * (1.28 - i * 0.16))
        .rotateX(0.28 + i * 0.08)
        .translate(sign * (0.10 + i * 0.015), -0.06 - i * 0.045, -0.04 - i * 0.035);
      if (i < 3) primaryFeathers.merge(f);
      else secondaryFeathers.merge(f);
    }
    const wingCovert = makeFeatherBlade(0.32, 0.14, 0.05, 0.03, 8)
      .rotateY(sign * 1.35)
      .rotateX(0.18)
      .translate(sign * 0.07, 0.01, 0.01);

    const wMesh = b.addMesh(`Wing${side}Mesh`, [
      { geo: shoulder.merge(wingCovert), material: mScarlet },
      { geo: primaryFeathers, material: mRoyalBlue },
      { geo: secondaryFeathers, material: mGold }
    ]);
    b.addNode({ name: `Wing${side}`, parent: bodyNode, translation: [sign * 0.34, 0.14, 0.0], mesh: wMesh });
  }
  buildWing('L');
  buildWing('R');

  // Articulated Tail Fan (red + blue + gold plumes)
  const tailCenter = makeFeatherBlade(0.54, 0.13, 0.06, 0.024, 8).rotateY(Math.PI).rotateX(-0.22);
  const tailL = makeFeatherBlade(0.48, 0.11, 0.05, 0.022, 8).rotateY(Math.PI + 0.26).rotateX(-0.18);
  const tailR = makeFeatherBlade(0.48, 0.11, 0.05, 0.022, 8).rotateY(Math.PI - 0.26).rotateX(-0.18);
  const tailL2 = makeFeatherBlade(0.42, 0.10, 0.04, 0.02, 8).rotateY(Math.PI + 0.48).rotateX(-0.15);
  const tailR2 = makeFeatherBlade(0.42, 0.10, 0.04, 0.02, 8).rotateY(Math.PI - 0.48).rotateX(-0.15);
  const tailMesh = b.addMesh('TailMesh', [
    { geo: tailCenter, material: mScarlet },
    { geo: tailL.merge(tailR), material: mRoyalBlue },
    { geo: tailL2.merge(tailR2), material: mGold }
  ]);
  b.addNode({ name: 'Tail', parent: bodyNode, translation: [0, -0.24, -0.26], mesh: tailMesh });

  // Articulated Legs & 3-Toed Parrot Feet
  function buildLeg(side) {
    const sign = side === 'L' ? -1 : 1;
    const thigh = makeCurvedTube([[0, 0, 0], [0, -0.18, 0.02], [0, -0.32, 0.01]], [0.075, 0.052, 0.042], 10);
    const toeMid = makeCurvedTube([[0, -0.32, 0.02], [0, -0.34, 0.18]], [0.036, 0.022], 8);
    const toeIn  = makeCurvedTube([[0, -0.32, 0.02], [-sign * 0.09, -0.34, 0.15]], [0.032, 0.02], 8);
    const toeOut = makeCurvedTube([[0, -0.32, 0.02], [sign * 0.09, -0.34, 0.15]], [0.032, 0.02], 8);
    const toeBack = makeCurvedTube([[0, -0.32, 0.0], [0, -0.34, -0.11]], [0.03, 0.02], 8);
    const legMesh = b.addMesh(`Leg${side}Mesh`, [
      { geo: thigh.merge(toeMid).merge(toeIn).merge(toeOut).merge(toeBack), material: mOrange }
    ]);
    b.addNode({ name: `Leg${side}`, parent: bodyNode, translation: [sign * 0.15, -0.36, 0.02], mesh: legMesh });
  }
  buildLeg('L');
  buildLeg('R');

  // Carry socket for holding items (apple, key, book)
  b.addNode({ name: 'CarrySocket', parent: bodyNode, translation: [0.36, 0.02, 0.34] });

  b.write(path.join(OUT_DIR, 'papi.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. CURVED TROPICAL PALM TREE
// ═════════════════════════════════════════════════════════════════════════════
function buildPalmTreeGLB() {
  const b = new GLBBuilder('PalmTree');
  const mBark = b.addMaterial('PalmBark', '#8a5d3b', { roughness: 0.88, textureTag: 'bark' });
  const mFrond = b.addMaterial('PalmFrond', '#3ea642', { roughness: 0.62, textureTag: 'foliage', doubleSided: true });
  const mFrondTip = b.addMaterial('PalmFrondBright', '#63c449', { roughness: 0.58, textureTag: 'foliage', doubleSided: true });
  const mCoconut = b.addMaterial('Coconut', '#663c1e', { roughness: 0.72 });

  const spine = [];
  const radii = [];
  const steps = 11;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    spine.push([Math.sin(t * 1.45) * 0.72, t * 5.2, Math.cos(t * 1.1) * 0.28 - 0.28]);
    radii.push(0.36 * (1 - t * 0.60) + (i === 0 ? 0.14 : 0));
  }
  const trunk = makeCurvedTube(spine, radii, 12, 0.09);
  const top = spine[steps];

  const frondsA = new Geo();
  const frondsB = new Geo();
  const count = 8;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const len = 2.6 + (i % 2) * 0.45;
    const frond = makeFeatherBlade(len, 0.92, 0.85, 0.04, 10)
      .rotateX(-0.18 + (i % 2) * 0.22)
      .rotateY(a)
      .translate(top[0], top[1] - 0.05, top[2]);
    if (i % 2 === 0) frondsA.merge(frond);
    else frondsB.merge(frond);
  }

  const coconuts = new Geo();
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    coconuts.merge(makeSculptedSphere(0.18, 0.21, 0.18, 12, 8).translate(
      top[0] + Math.cos(a) * 0.25, top[1] - 0.25, top[2] + Math.sin(a) * 0.25
    ));
  }

  const mesh = b.addMesh('PalmMesh', [
    { geo: trunk, material: mBark },
    { geo: frondsA, material: mFrond },
    { geo: frondsB, material: mFrondTip },
    { geo: coconuts, material: mCoconut }
  ]);
  b.addNode({ name: 'PalmTree', mesh });
  b.write(path.join(OUT_DIR, 'palm_tree.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. TROPICAL ISLAND COTTAGE WITH HINGED WOODEN DOOR
// ═════════════════════════════════════════════════════════════════════════════
function buildCottageGLB() {
  const b = new GLBBuilder('IslandCottage');
  const mStone = b.addMaterial('CottageStone', '#9c9586', { roughness: 0.9, textureTag: 'stone' });
  const mPlaster = b.addMaterial('CottageWall', '#f5e4c3', { roughness: 0.82, textureTag: 'plaster' });
  const mTimber = b.addMaterial('CottageTimber', '#6e4526', { roughness: 0.78, textureTag: 'wood' });
  const mThatch = b.addMaterial('CottageRoof', '#c98838', { roughness: 0.85, textureTag: 'thatch' });
  const mDoorWood = b.addMaterial('WoodenDoor', '#8f5228', { roughness: 0.72, textureTag: 'wood' });
  const mBrass = b.addMaterial('DoorBrass', '#ebb63b', { roughness: 0.25, metallic: 0.85 });
  const mGlowWin = b.addMaterial('WarmWindow', '#ffe18f', { roughness: 0.2, emissive: '#ffb838', emissiveIntensity: 0.85 });

  const root = b.addNode({ name: 'CottageRoot' });

  // Stone foundation & porch step
  const base = makeBeveledBox(4.4, 0.55, 3.8, 0.08).translate(0, 0.275, 0);
  const step = makeBeveledBox(1.8, 0.24, 0.9, 0.05).translate(0, 0.12, 2.25);

  // Main walls (solid shell with recessed doorway look)
  const wallBack = makeBeveledBox(3.9, 2.45, 3.3, 0.05).translate(0, 1.75, 0);
  const doorFrameL = makeBeveledBox(0.18, 1.72, 0.26, 0.03).translate(-0.62, 1.41, 1.66);
  const doorFrameR = makeBeveledBox(0.18, 1.72, 0.26, 0.03).translate(0.62, 1.41, 1.66);
  const doorFrameT = makeBeveledBox(1.48, 0.20, 0.28, 0.03).translate(0, 2.30, 1.66);
  const cornerBeams = new Geo();
  for (const sx of [-1.92, 1.92]) {
    for (const sz of [-1.62, 1.62]) {
      cornerBeams.merge(makeBeveledBox(0.24, 2.52, 0.24, 0.03).translate(sx, 1.78, sz));
    }
  }
  // Porch posts & eaves
  cornerBeams.merge(makeBeveledBox(0.16, 2.25, 0.16, 0.02).translate(-1.5, 1.65, 2.35));
  cornerBeams.merge(makeBeveledBox(0.16, 2.25, 0.16, 0.02).translate(1.5, 1.65, 2.35));

  // Sculpted Pitched Overhanging Roof
  const roof = new Geo();
  const rw = 2.65, rd = 2.55, ry0 = 2.85, ry1 = 4.45;
  // Left slope, right slope, front & back gables
  const slopeL = makeBeveledBox(2.95, 0.24, rd * 2, 0.06).rotateZ(0.58).translate(-1.26, 3.62, 0.18);
  const slopeR = makeBeveledBox(2.95, 0.24, rd * 2, 0.06).rotateZ(-0.58).translate(1.26, 3.62, 0.18);
  const ridge  = makeBeveledBox(0.32, 0.28, rd * 2 + 0.2, 0.06).translate(0, 4.42, 0.18);
  roof.merge(slopeL).merge(slopeR).merge(ridge);

  // Chimney
  const chimney = makeBeveledBox(0.68, 1.6, 0.68, 0.06).translate(1.25, 4.1, -0.65);

  // Glowing side & front windows
  const win1 = makeBeveledBox(0.75, 0.72, 0.12, 0.02).translate(-1.28, 1.75, 1.66);
  const win2 = makeBeveledBox(0.75, 0.72, 0.12, 0.02).translate(1.28, 1.75, 1.66);
  const win3 = makeBeveledBox(0.12, 0.72, 0.85, 0.02).translate(1.96, 1.75, 0.0);
  const win4 = makeBeveledBox(0.12, 0.72, 0.85, 0.02).translate(-1.96, 1.75, 0.0);

  const bodyMesh = b.addMesh('CottageBodyMesh', [
    { geo: base.merge(step).merge(chimney), material: mStone },
    { geo: wallBack, material: mPlaster },
    { geo: cornerBeams.merge(doorFrameL).merge(doorFrameR).merge(doorFrameT), material: mTimber },
    { geo: roof, material: mThatch },
    { geo: win1.merge(win2).merge(win3).merge(win4), material: mGlowWin }
  ]);
  b.addNode({ name: 'CottageBody', parent: root, mesh: bodyMesh });

  // Hinged Wooden Door Node! Pivot at left edge (-0.52, 0.55, 1.69) so rotating Y swings it cleanly!
  const doorPanel = makeBeveledBox(1.04, 1.66, 0.12, 0.02).translate(0.52, 0.83, 0);
  const plank1 = makeBeveledBox(0.96, 0.12, 0.16, 0.015).translate(0.52, 0.35, 0);
  const plank2 = makeBeveledBox(0.96, 0.12, 0.16, 0.015).translate(0.52, 1.30, 0);
  const knob = makeSculptedSphere(0.075, 0.075, 0.075, 10, 8).translate(0.88, 0.82, 0.10);
  const doorMesh = b.addMesh('WoodenDoorMesh', [
    { geo: doorPanel, material: mDoorWood },
    { geo: plank1.merge(plank2), material: mTimber },
    { geo: knob, material: mBrass }
  ]);
  b.addNode({ name: 'DoorPivot', parent: root, translation: [-0.52, 0.55, 1.69], mesh: doorMesh });

  b.write(path.join(OUT_DIR, 'cottage.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. ORNATE TREASURE CHEST WITH HINGED LID
// ═════════════════════════════════════════════════════════════════════════════
function buildTreasureChestGLB() {
  const b = new GLBBuilder('TreasureChest');
  const mWood = b.addMaterial('ChestWood', '#7a3f1d', { roughness: 0.65, textureTag: 'wood' });
  const mGold = b.addMaterial('ChestGold', '#f5be36', { roughness: 0.24, metallic: 0.88 });
  const mGlow = b.addMaterial('ChestTreasureGlow', '#ffe866', { roughness: 0.2, emissive: '#ffbe26', emissiveIntensity: 0.95 });

  const root = b.addNode({ name: 'ChestRoot' });

  // Base box + brass trim bands + coins pile inside
  const base = makeBeveledBox(1.36, 0.68, 0.88, 0.05).translate(0, 0.34, 0);
  const bandL = makeBeveledBox(0.11, 0.72, 0.93, 0.02).translate(-0.48, 0.35, 0);
  const bandR = makeBeveledBox(0.11, 0.72, 0.93, 0.02).translate(0.48, 0.35, 0);
  const lockPlate = makeBeveledBox(0.24, 0.28, 0.10, 0.02).translate(0, 0.54, 0.45);
  const coinsPile = makeSculptedSphere(0.56, 0.18, 0.34, 16, 10).translate(0, 0.64, 0);

  const baseMesh = b.addMesh('ChestBaseMesh', [
    { geo: base, material: mWood },
    { geo: bandL.merge(bandR).merge(lockPlate), material: mGold },
    { geo: coinsPile, material: mGlow }
  ]);
  b.addNode({ name: 'ChestBase', parent: root, mesh: baseMesh });

  // Hinged Curved Lid (pivot at back edge z = -0.44, y = 0.68)
  const lidBody = makeSculptedSphere(0.69, 0.34, 0.45, 20, 12, (x, y, z) => [x, Math.max(0, y), z])
    .translate(0, 0, 0.44);
  const lidBandL = makeTorus(0.45, 0.055, 16, 8).rotateY(Math.PI / 2).translate(-0.48, 0.02, 0.44);
  const lidBandR = makeTorus(0.45, 0.055, 16, 8).rotateY(Math.PI / 2).translate(0.48, 0.02, 0.44);
  const lidMesh = b.addMesh('ChestLidMesh', [
    { geo: lidBody, material: mWood },
    { geo: lidBandL.merge(lidBandR), material: mGold }
  ]);
  b.addNode({ name: 'ChestLidPivot', parent: root, translation: [0, 0.68, -0.44], mesh: lidMesh });

  b.write(path.join(OUT_DIR, 'treasure_chest.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. ARCHED WOODEN BRIDGE
// ═════════════════════════════════════════════════════════════════════════════
function buildWoodenBridgeGLB() {
  const b = new GLBBuilder('WoodenBridge');
  const mPlank = b.addMaterial('BridgePlank', '#a36b3c', { roughness: 0.80, textureTag: 'wood' });
  const mBeam  = b.addMaterial('BridgeBeam',  '#694020', { roughness: 0.85, textureTag: 'wood' });
  const mRope  = b.addMaterial('BridgeRope',  '#d9be8b', { roughness: 0.90 });

  const planks = new Geo();
  const beams = new Geo();
  const ropes = new Geo();

  const len = 7.4;
  const plankCount = 17;
  for (let i = 0; i < plankCount; i++) {
    const t = i / (plankCount - 1);
    const z = (t - 0.5) * len;
    const archY = Math.sin(t * Math.PI) * 0.65;
    const slope = Math.cos(t * Math.PI) * 0.25;
    planks.merge(makeBeveledBox(2.5, 0.14, 0.36, 0.02).rotateX(-slope).translate(0, archY, z));
  }

  // Side stringers & vertical posts + rope rails
  for (const sx of [-1.25, 1.25]) {
    const railSpine = [];
    const railRadii = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const z = (t - 0.5) * len;
      const y = Math.sin(t * Math.PI) * 0.65;
      railSpine.push([sx, y + 0.95, z]);
      railRadii.push(0.055);
      if (i % 2 === 0) {
        beams.merge(makeBeveledBox(0.18, 1.35, 0.18, 0.03).translate(sx, y + 0.45, z));
      }
    }
    ropes.merge(makeCurvedTube(railSpine, railRadii, 8));
  }

  const mesh = b.addMesh('BridgeMesh', [
    { geo: planks, material: mPlank },
    { geo: beams, material: mBeam },
    { geo: ropes, material: mRope }
  ]);
  b.addNode({ name: 'WoodenBridge', mesh });
  b.write(path.join(OUT_DIR, 'wooden_bridge.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. ANCIENT STONE ARCHWAY / RUIN GATE
// ═════════════════════════════════════════════════════════════════════════════
function buildAncientArchGLB() {
  const b = new GLBBuilder('AncientArch');
  const mStone = b.addMaterial('AncientStone', '#8f9188', { roughness: 0.90, textureTag: 'stone' });
  const mMoss  = b.addMaterial('AncientMoss',  '#4b7d42', { roughness: 0.85, textureTag: 'foliage' });
  const mRune  = b.addMaterial('AncientRune',  '#45e8ff', { roughness: 0.20, emissive: '#1cc8ff', emissiveIntensity: 0.9 });

  const stones = new Geo();
  for (const sx of [-1.85, 1.85]) {
    stones.merge(makeBeveledBox(1.15, 0.55, 1.15, 0.08).translate(sx, 0.275, 0));
    stones.merge(makeBeveledBox(0.86, 3.2, 0.86, 0.08).translate(sx, 2.05, 0));
    stones.merge(makeBeveledBox(1.12, 0.45, 1.12, 0.08).translate(sx, 3.75, 0));
  }
  // Carved lintel & keystone
  stones.merge(makeBeveledBox(5.2, 0.72, 1.05, 0.10).translate(0, 4.25, 0));
  stones.merge(makeBeveledBox(1.3, 0.92, 1.22, 0.10).translate(0, 4.42, 0));

  const moss = new Geo();
  moss.merge(makeSculptedSphere(0.75, 0.25, 0.55, 12, 8).translate(-1.6, 4.6, 0.15));
  moss.merge(makeSculptedSphere(0.62, 0.22, 0.48, 12, 8).translate(1.5, 4.58, -0.1));

  const runes = new Geo();
  runes.merge(makeBeveledBox(0.32, 0.32, 0.12, 0.04).rotateZ(Math.PI / 4).translate(0, 4.42, 0.60));
  runes.merge(makeBeveledBox(0.22, 0.55, 0.10, 0.03).translate(-1.85, 2.2, 0.44));
  runes.merge(makeBeveledBox(0.22, 0.55, 0.10, 0.03).translate(1.85, 2.2, 0.44));

  const mesh = b.addMesh('AncientArchMesh', [
    { geo: stones, material: mStone },
    { geo: moss, material: mMoss },
    { geo: runes, material: mRune }
  ]);
  b.addNode({ name: 'AncientArch', mesh });
  b.write(path.join(OUT_DIR, 'ancient_arch.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. HOPPING RABBIT (Interactive Animal!)
// ═════════════════════════════════════════════════════════════════════════════
function buildRabbitGLB() {
  const b = new GLBBuilder('IslandRabbit');
  const mFur = b.addMaterial('RabbitFur', '#f8f3eb', { roughness: 0.78 });
  const mPink = b.addMaterial('RabbitPink', '#f2a4b0', { roughness: 0.65 });
  const mEye = b.addMaterial('RabbitEye', '#1a1514', { roughness: 0.1 });

  const body = makeSculptedSphere(0.28, 0.26, 0.38, 18, 14).translate(0, 0.30, 0);
  const head = makeSculptedSphere(0.22, 0.21, 0.23, 18, 14).translate(0, 0.56, 0.26);
  const tail = makeSculptedSphere(0.11, 0.11, 0.11, 12, 8).translate(0, 0.28, -0.38);
  const earL = makeSculptedSphere(0.06, 0.24, 0.045, 12, 10).rotateZ(0.18).rotateX(-0.12).translate(-0.10, 0.88, 0.22);
  const earR = makeSculptedSphere(0.06, 0.24, 0.045, 12, 10).rotateZ(-0.18).rotateX(-0.12).translate(0.10, 0.88, 0.22);
  const pawFL = makeSculptedSphere(0.06, 0.08, 0.10, 10, 8).translate(-0.12, 0.08, 0.22);
  const pawFR = makeSculptedSphere(0.06, 0.08, 0.10, 10, 8).translate(0.12, 0.08, 0.22);
  const pawBL = makeSculptedSphere(0.08, 0.07, 0.16, 10, 8).translate(-0.16, 0.07, -0.12);
  const pawBR = makeSculptedSphere(0.08, 0.07, 0.16, 10, 8).translate(0.16, 0.07, -0.12);

  const nose = makeSculptedSphere(0.038, 0.03, 0.03, 10, 8).translate(0, 0.54, 0.49);
  const innerL = makeSculptedSphere(0.032, 0.17, 0.02, 8, 8).rotateZ(0.18).rotateX(-0.12).translate(-0.10, 0.87, 0.25);
  const innerR = makeSculptedSphere(0.032, 0.17, 0.02, 8, 8).rotateZ(-0.18).rotateX(-0.12).translate(0.10, 0.87, 0.25);

  const eyeL = makeSculptedSphere(0.034, 0.04, 0.03, 10, 8).translate(-0.12, 0.60, 0.42);
  const eyeR = makeSculptedSphere(0.034, 0.04, 0.03, 10, 8).translate(0.12, 0.60, 0.42);

  const mesh = b.addMesh('RabbitMesh', [
    { geo: body.merge(head).merge(tail).merge(earL).merge(earR).merge(pawFL).merge(pawFR).merge(pawBL).merge(pawBR), material: mFur },
    { geo: nose.merge(innerL).merge(innerR), material: mPink },
    { geo: eyeL.merge(eyeR), material: mEye }
  ]);
  b.addNode({ name: 'Rabbit', mesh });
  b.write(path.join(OUT_DIR, 'rabbit.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. INTERACTIVE COLLECTIBLE PROPS PACK (Keys, Apple, Flowers, Book, Table, Lantern, Crystal, Seashell)
// ═════════════════════════════════════════════════════════════════════════════
function buildPropsPackGLB() {
  // Export each hero prop as its own clean GLB for lazy/modular loading
  // 8a. Ornate Key (recolorable via material override)
  {
    const b = new GLBBuilder('KeyProp');
    const mKey = b.addMaterial('KeyMetal', '#2c9cff', { roughness: 0.22, metallic: 0.78, emissive: '#1050aa', emissiveIntensity: 0.35 });
    const bow = makeTorus(0.20, 0.055, 18, 10).rotateX(Math.PI / 2).translate(0, 0.45, 0);
    const shaft = makeCurvedTube([[0, 0.25, 0], [0, -0.35, 0]], [0.048, 0.048], 10);
    const tooth1 = makeBeveledBox(0.16, 0.07, 0.06, 0.01).translate(0.10, -0.18, 0);
    const tooth2 = makeBeveledBox(0.12, 0.07, 0.06, 0.01).translate(0.08, -0.30, 0);
    const mesh = b.addMesh('KeyMesh', [{ geo: bow.merge(shaft).merge(tooth1).merge(tooth2), material: mKey }]);
    b.addNode({ name: 'KeyProp', mesh });
    b.write(path.join(OUT_DIR, 'key.glb'));
  }

  // 8b. Glossy Red Apple with Stem & Leaf
  {
    const b = new GLBBuilder('AppleProp');
    const mApple = b.addMaterial('AppleSkin', '#e82c2c', { roughness: 0.25 });
    const mStem = b.addMaterial('AppleStem', '#5e391c', { roughness: 0.85 });
    const mLeaf = b.addMaterial('AppleLeaf', '#45b83b', { roughness: 0.55 });
    const apple = makeSculptedSphere(0.28, 0.26, 0.28, 18, 14, (x, y, z) => {
      const r = Math.hypot(x, z);
      const dimple = y > 0.14 ? -Math.exp(-r * 16) * 0.09 : (y < -0.15 ? Math.exp(-r * 14) * 0.06 : 0);
      const taper = y < 0 ? 1 + y * 0.35 : 1.0;
      return [x * taper, y + dimple, z * taper];
    }).translate(0, 0.26, 0);
    const stem = makeCurvedTube([[0, 0.44, 0], [0.03, 0.58, 0.02]], [0.024, 0.018], 8);
    const leaf = makeFeatherBlade(0.20, 0.11, 0.04, 0.015, 6).rotateZ(-0.4).rotateY(0.6).translate(0.02, 0.54, 0.02);
    const mesh = b.addMesh('AppleMesh', [
      { geo: apple, material: mApple },
      { geo: stem, material: mStem },
      { geo: leaf, material: mLeaf }
    ]);
    b.addNode({ name: 'AppleProp', mesh });
    b.write(path.join(OUT_DIR, 'apple.glb'));
  }

  // 8c. Tropical Multi-Petal Flower
  {
    const b = new GLBBuilder('FlowerProp');
    const mStem = b.addMaterial('FlowerStem', '#3c9c40', { roughness: 0.7 });
    const mPetal = b.addMaterial('FlowerPetal', '#ff5998', { roughness: 0.48, emissive: '#661233', emissiveIntensity: 0.25, doubleSided: true });
    const mCenter = b.addMaterial('FlowerCenter', '#ffd633', { roughness: 0.4, emissive: '#aa7700', emissiveIntensity: 0.3 });
    const stem = makeCurvedTube([[0, 0, 0], [0.03, 0.28, 0], [0, 0.54, 0]], [0.032, 0.028, 0.024], 8);
    const leaf1 = makeFeatherBlade(0.28, 0.14, 0.05, 0.018, 6).rotateX(-0.4).rotateY(0.5).translate(0, 0.22, 0);
    const leaf2 = makeFeatherBlade(0.28, 0.14, 0.05, 0.018, 6).rotateX(-0.4).rotateY(3.6).translate(0, 0.28, 0);
    const petals = new Geo();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      petals.merge(makeFeatherBlade(0.32, 0.20, 0.08, 0.02, 6).rotateX(-0.22).rotateY(a).translate(0, 0.54, 0));
    }
    const center = makeSculptedSphere(0.11, 0.07, 0.11, 12, 8).translate(0, 0.56, 0);
    const mesh = b.addMesh('FlowerMesh', [
      { geo: stem.merge(leaf1).merge(leaf2), material: mStem },
      { geo: petals, material: mPetal },
      { geo: center, material: mCenter }
    ]);
    b.addNode({ name: 'FlowerProp', mesh });
    b.write(path.join(OUT_DIR, 'flower.glb'));
  }

  // 8d. English Adventure Book
  {
    const b = new GLBBuilder('BookProp');
    const mCover = b.addMaterial('BookCover', '#2667d4', { roughness: 0.55 });
    const mPages = b.addMaterial('BookPages', '#f7f0dc', { roughness: 0.85 });
    const mGold  = b.addMaterial('BookGold',  '#f5c440', { roughness: 0.25, metallic: 0.8 });
    const cover = makeBeveledBox(0.52, 0.12, 0.68, 0.02).translate(0, 0.06, 0);
    const pages = makeBeveledBox(0.46, 0.09, 0.62, 0.01).translate(0.02, 0.06, 0);
    const emblem = makeBeveledBox(0.22, 0.02, 0.22, 0.005).rotateY(Math.PI / 4).translate(0, 0.125, 0);
    const mesh = b.addMesh('BookMesh', [
      { geo: cover, material: mCover },
      { geo: pages, material: mPages },
      { geo: emblem, material: mGold }
    ]);
    b.addNode({ name: 'BookProp', mesh });
    b.write(path.join(OUT_DIR, 'book.glb'));
  }

  // 8e. Wooden Picnic Table
  {
    const b = new GLBBuilder('WoodenTable');
    const mWood = b.addMaterial('TableWood', '#965d30', { roughness: 0.78, textureTag: 'wood' });
    const mDark = b.addMaterial('TableLegs', '#6b401e', { roughness: 0.82, textureTag: 'wood' });
    const top = makeBeveledBox(1.85, 0.14, 1.15, 0.03).translate(0, 0.88, 0);
    const legs = new Geo();
    for (const sx of [-0.72, 0.72]) {
      for (const sz of [-0.42, 0.42]) {
        legs.merge(makeBeveledBox(0.14, 0.86, 0.14, 0.02).translate(sx, 0.43, sz));
      }
    }
    const mesh = b.addMesh('TableMesh', [
      { geo: top, material: mWood },
      { geo: legs, material: mDark }
    ]);
    b.addNode({ name: 'WoodenTable', mesh });
    b.write(path.join(OUT_DIR, 'table.glb'));
  }

  // 8f. Golden Explorer Lantern
  {
    const b = new GLBBuilder('LanternProp');
    const mBrass = b.addMaterial('LanternBrass', '#e5ab34', { roughness: 0.28, metallic: 0.85 });
    const mGlass = b.addMaterial('LanternGlow', '#fff08a', { roughness: 0.15, emissive: '#ffbe30', emissiveIntensity: 0.95 });
    const base = makeLathe([[0.22, 0], [0.24, 0.06], [0.16, 0.12], [0.16, 0.14]], 14);
    const cap  = makeLathe([[0.20, 0.50], [0.24, 0.54], [0.12, 0.66], [0.001, 0.70]], 14);
    const handle = makeTorus(0.14, 0.022, 14, 8).rotateX(Math.PI / 2).translate(0, 0.72, 0);
    const glass = makeLathe([[0.15, 0.14], [0.18, 0.32], [0.15, 0.50]], 14);
    const mesh = b.addMesh('LanternMesh', [
      { geo: base.merge(cap).merge(handle), material: mBrass },
      { geo: glass, material: mGlass }
    ]);
    b.addNode({ name: 'LanternProp', mesh });
    b.write(path.join(OUT_DIR, 'lantern.glb'));
  }

  // 8g. Shimmering Crystal Cluster
  {
    const b = new GLBBuilder('CrystalProp');
    const mCrys = b.addMaterial('CrystalMat', '#4df2ff', { roughness: 0.12, metallic: 0.15, emissive: '#1095d8', emissiveIntensity: 0.65 });
    const main = makeLathe([[0.18, 0], [0.21, 0.55], [0.001, 0.95]], 6);
    const side1 = makeLathe([[0.12, 0], [0.14, 0.36], [0.001, 0.62]], 6).rotateZ(0.35).translate(-0.14, 0, 0.08);
    const side2 = makeLathe([[0.11, 0], [0.13, 0.32], [0.001, 0.55]], 6).rotateZ(-0.32).rotateX(0.2).translate(0.15, 0, -0.06);
    const mesh = b.addMesh('CrystalMesh', [{ geo: main.merge(side1).merge(side2), material: mCrys }]);
    b.addNode({ name: 'CrystalProp', mesh });
    b.write(path.join(OUT_DIR, 'crystal.glb'));
  }

  // 8h. Seashell
  {
    const b = new GLBBuilder('SeashellProp');
    const mShell = b.addMaterial('SeashellMat', '#ffcfad', { roughness: 0.38, emissive: '#552211', emissiveIntensity: 0.15 });
    const shell = makeSculptedSphere(0.30, 0.14, 0.28, 18, 12, (x, y, z, u) => {
      const ribs = 1 + 0.12 * Math.sin(u * Math.PI * 16);
      return [x * ribs, Math.max(-0.04, y * ribs), z];
    }).translate(0, 0.10, 0);
    const mesh = b.addMesh('SeashellMesh', [{ geo: shell, material: mShell }]);
    b.addNode({ name: 'SeashellProp', mesh });
    b.write(path.join(OUT_DIR, 'seashell.glb'));
  }
}

console.log('Generating real GLB 2.0 3D models for Papi Hazine Avi...');
buildPapiGLB();
buildPalmTreeGLB();
buildCottageGLB();
buildTreasureChestGLB();
buildWoodenBridgeGLB();
buildAncientArchGLB();
buildRabbitGLB();
buildPropsPackGLB();
console.log('All GLB models generated successfully!');
