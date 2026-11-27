/**
 * Papi Hazine Avı — Real GLB 2.0 3D Asset Pipeline Generator (v2 High-Detail Edition)
 * Generates 21 sculpted, organic, multi-part, PBR-ready .glb binary models
 * with hierarchical rigs and functional interactive sub-nodes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../assets/models');
fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Vector & Mesh Math Helpers ──────────────────────────────────────────────
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

  addTri(a, b, c) { this.idx.push(a, b, c); }
  addQuad(a, b, c, d) { this.idx.push(a, b, c, a, c, d); }

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

  translate(dx, dy, dz) { return this.transform((x, y, z) => [x + dx, y + dy, z + dz]); }
  scale(sx, sy, sz) { return this.transform((x, y, z) => [x * sx, y * sy, z * sz]); }
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
    for (let i = 0; i < other.idx.length; i++) this.idx.push(other.idx[i] + offset);
    return this;
  }
}

// ─── Sculpted Parametric Primitives ──────────────────────────────────────────
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

function makeBeveledBox(w, h, d, bevel = 0.04) {
  const g = new Geo();
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const b = Math.min(bevel, hw * 0.4, hh * 0.4, hd * 0.4);
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

function makeFeatherBlade(length, width, arch = 0.25, thickness = 0.03, segs = 10, serrate = 0) {
  const g = new Geo();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const z = t * length;
    const y = Math.sin(t * Math.PI) * arch - t * t * arch * 0.48;
    const saw = serrate ? (1 - serrate * 0.35 * (i % 2)) : 1;
    const w = Math.sin(Math.pow(t, 0.72) * Math.PI) * width * 0.5 * saw;
    const th = (1 - t * 0.8) * thickness;
    g.addVertex(-w, y - th * 0.3, z, -0.7, 0.5, 0, 0, t);
    g.addVertex(0, y + th, z, 0, 1, 0, 0.5, t);
    g.addVertex(w, y - th * 0.3, z, 0.7, 0.5, 0, 1, t);
    g.addVertex(0, y - th, z, 0, -1, 0, 0.5, t);
  }
  for (let i = 0; i < segs; i++) {
    const r0 = i * 4;
    const r1 = (i + 1) * 4;
    g.addQuad(r0 + 0, r0 + 1, r1 + 1, r1 + 0);
    g.addQuad(r0 + 1, r0 + 2, r1 + 2, r1 + 1);
    g.addQuad(r0 + 2, r0 + 3, r1 + 3, r1 + 2);
    g.addQuad(r0 + 3, r0 + 0, r1 + 0, r1 + 3);
  }
  return g.recomputeNormals();
}

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
    this.chunks = [];
    this.bufferViews = [];
    this.accessors = [];
    this.byteOffset = 0;
  }

  addMaterial(name, hex, opts = {}) {
    const key = `${name}_${hex}_${opts.roughness ?? 0.65}_${opts.metallic ?? 0}_${opts.emissive ?? ''}_${opts.textureTag ?? ''}_${opts.alpha ?? 1}`;
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
        doubleSided: !!opts.doubleSided,
        windSway: opts.windSway || 0
      }
    };
    if (opts.alpha !== undefined && opts.alpha < 1) mat.alphaMode = 'BLEND';
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
        bufferView: uvView, componentType: 5126, count: uvArr.length / 2, type: 'VEC2'
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

  addNode({ name, mesh = null, translation = null, rotation = null, scale = null, parent = null }) {
    const node = { name };
    if (mesh !== null) node.mesh = mesh;
    if (translation) node.translation = translation;
    if (rotation) node.rotation = rotation;
    if (scale) node.scale = scale;
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
    const binPad = (4 - (this.byteOffset % 4)) % 4;
    if (binPad > 0) {
      this.chunks.push(Buffer.alloc(binPad));
      this.byteOffset += binPad;
    }
    const binBuf = Buffer.concat(this.chunks);

    const gltf = {
      asset: { version: '2.0', generator: 'Diji-Medu Papi Hazine Avi 3D Pipeline v2.0' },
      scene: 0,
      scenes: [{ name: this.name, nodes: this.rootNodes }],
      nodes: this.nodes,
      meshes: this.meshes,
      materials: this.materials,
      accessors: this.accessors,
      bufferViews: this.bufferViews,
      buffers: [{ byteLength: binBuf.byteLength }]
    };

    const jsonBufRaw = Buffer.from(JSON.stringify(gltf), 'utf8');
    const jsonPad = (4 - (jsonBufRaw.byteLength % 4)) % 4;
    const jsonBuf = jsonPad > 0 ? Buffer.concat([jsonBufRaw, Buffer.from(' '.repeat(jsonPad))]) : jsonBufRaw;

    const totalLen = 12 + 8 + jsonBuf.byteLength + 8 + binBuf.byteLength;
    const out = Buffer.alloc(totalLen);
    out.writeUInt32LE(0x46546C67, 0);
    out.writeUInt32LE(2, 4);
    out.writeUInt32LE(totalLen, 8);
    out.writeUInt32LE(jsonBuf.byteLength, 12);
    out.writeUInt32LE(0x4E4F534A, 16);
    jsonBuf.copy(out, 20);
    const binHeaderOffset = 20 + jsonBuf.byteLength;
    out.writeUInt32LE(binBuf.byteLength, binHeaderOffset);
    out.writeUInt32LE(0x004E4942, binHeaderOffset + 4);
    binBuf.copy(out, binHeaderOffset + 8);

    fs.writeFileSync(filePath, out);
    const kb = (out.byteLength / 1024).toFixed(1);
    console.log(`  ✓ ${path.basename(filePath).padEnd(24)} ${kb.padStart(6)} KB  (${this.meshes.length} meshes, ${this.nodes.length} nodes)`);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. PAPI v2 — High-Craft Explorer Parrot (Sleek bandana, goggles, cohesive plumage!)
// ═════════════════════════════════════════════════════════════════════════════
function buildPapiGLB() {
  const b = new GLBBuilder('PapiExplorerV2');

  const mTurquoise = b.addMaterial('PapiTurquoise', '#17b8d6', { roughness: 0.52, textureTag: 'feather' });
  const mScarlet   = b.addMaterial('PapiScarlet',   '#e83535', { roughness: 0.48, textureTag: 'feather' });
  const mRoyalBlue = b.addMaterial('PapiRoyalBlue', '#1c63de', { roughness: 0.48, textureTag: 'feather' });
  const mGold      = b.addMaterial('PapiGold',      '#ffcb2e', { roughness: 0.52, textureTag: 'feather' });
  const mOrange    = b.addMaterial('PapiBeak',      '#ff8b1f', { roughness: 0.30 });
  const mDarkBeak  = b.addMaterial('PapiBeakTip',   '#cc5210', { roughness: 0.34 });
  const mEyeWhite  = b.addMaterial('EyeWhite',      '#ffffff', { roughness: 0.12 });
  const mEyeIris   = b.addMaterial('EyeIris',       '#54280a', { roughness: 0.10 });
  const mEyePupil  = b.addMaterial('EyePupil',      '#121018', { roughness: 0.05 });
  const mHatKhaki  = b.addMaterial('ExplorerHat',   '#dec089', { roughness: 0.72, textureTag: 'fabric' });
  const mBandana   = b.addMaterial('BandanaRed',    '#d42c24', { roughness: 0.62, textureTag: 'fabric' });
  const mBrass     = b.addMaterial('Brass',         '#f4c246', { roughness: 0.22, metallic: 0.88 });
  const mLens      = b.addMaterial('GoggleLens',    '#5ce6ff', { roughness: 0.10, metallic: 0.35, emissive: '#107099', emissiveIntensity: 0.25 });
  const mPack      = b.addMaterial('Backpack',      '#8a5024', { roughness: 0.68, textureTag: 'leather' });
  const mPackStrap = b.addMaterial('PackStrap',     '#4d2a12', { roughness: 0.74 });
  const mMapPaper  = b.addMaterial('MapRoll',       '#f7e8c3', { roughness: 0.80 });

  const root = b.addNode({ name: 'PapiRoot' });
  const bodyNode = b.addNode({ name: 'Torso', parent: root, translation: [0, 0.72, 0] });

  // Sculpted organic pear-shaped avian body
  const torsoGeo = makeSculptedSphere(0.36, 0.45, 0.34, 26, 20, (x, y, z) => {
    const chest = y < 0.12 && z > 0 ? 1.14 : 1.0;
    const neckTaper = y > 0.16 ? 1 - (y - 0.16) * 0.48 : 1.0;
    return [x * neckTaper, y, z * chest];
  });
  const bellyGeo = makeSculptedSphere(0.265, 0.34, 0.21, 20, 16, (x, y, z) => [x, y - 0.03, z + 0.165]);
  // Snug explorer neckerchief + front triangular neckerchief knot (replaces bulky donut!)
  const scarfRing = makeTorus(0.245, 0.034, 20, 8).rotateX(0.16).translate(0, 0.29, 0.02);
  const scarfTail = makeFeatherBlade(0.18, 0.15, 0.02, 0.022, 6).rotateX(1.38).translate(0, 0.27, 0.24);

  const torsoMesh = b.addMesh('TorsoMesh', [
    { geo: torsoGeo, material: mTurquoise },
    { geo: bellyGeo, material: mGold },
    { geo: scarfRing.merge(scarfTail), material: mBandana }
  ]);
  b.nodes[bodyNode].mesh = torsoMesh;

  // Explorer Backpack with compass medallion & rolled treasure map
  const packMain = makeBeveledBox(0.36, 0.38, 0.20, 0.06).translate(0, 0.03, -0.34);
  const packFlap = makeBeveledBox(0.38, 0.12, 0.22, 0.04).translate(0, 0.18, -0.34);
  const packPocket = makeBeveledBox(0.24, 0.15, 0.07, 0.03).translate(0, -0.05, -0.45);
  const packBuckle = makeBeveledBox(0.07, 0.07, 0.04, 0.01).translate(0, 0.11, -0.46);
  const compassCharm = makeSculptedSphere(0.055, 0.055, 0.02, 12, 8).translate(0.13, 0.02, -0.46);
  const strapL = makeBeveledBox(0.052, 0.36, 0.32, 0.015).translate(-0.21, 0.07, -0.13);
  const strapR = makeBeveledBox(0.052, 0.36, 0.32, 0.015).translate(0.21, 0.07, -0.13);
  const mapRoll = makeCurvedTube([[-0.21, 0.27, -0.34], [0, 0.27, -0.34], [0.21, 0.27, -0.34]], [0.048, 0.048, 0.048], 12);
  const mapBands = makeTorus(0.052, 0.01, 10, 6).rotateZ(Math.PI / 2).translate(-0.1, 0.27, -0.34)
    .merge(makeTorus(0.052, 0.01, 10, 6).rotateZ(Math.PI / 2).translate(0.1, 0.27, -0.34));
  const packMesh = b.addMesh('BackpackMesh', [
    { geo: packMain.merge(packFlap).merge(packPocket), material: mPack },
    { geo: strapL.merge(strapR).merge(mapBands), material: mPackStrap },
    { geo: packBuckle.merge(compassCharm), material: mBrass },
    { geo: mapRoll, material: mMapPaper }
  ]);
  b.addNode({ name: 'Backpack', parent: bodyNode, mesh: packMesh });

  // Head Node with Explorer Pith Helmet + Brass Goggles!
  const headNode = b.addNode({ name: 'Head', parent: bodyNode, translation: [0, 0.54, 0.05] });
  const skullGeo = makeSculptedSphere(0.34, 0.32, 0.33, 26, 20, (x, y, z) => {
    const cheek = y < 0 && Math.abs(x) > 0.16 ? 1.09 : 1.0;
    return [x * cheek, y, z];
  });
  const cheekL = makeSculptedSphere(0.135, 0.105, 0.115, 14, 10).translate(-0.225, -0.055, 0.175);
  const cheekR = makeSculptedSphere(0.135, 0.105, 0.115, 14, 10).translate(0.225, -0.055, 0.175);
  const eyeWL = makeSculptedSphere(0.11, 0.13, 0.075, 16, 12).translate(-0.15, 0.04, 0.26);
  const eyeWR = makeSculptedSphere(0.11, 0.13, 0.075, 16, 12).translate(0.15, 0.04, 0.26);
  const irisL = makeSculptedSphere(0.075, 0.09, 0.045, 14, 10).translate(-0.15, 0.035, 0.312);
  const irisR = makeSculptedSphere(0.075, 0.09, 0.045, 14, 10).translate(0.15, 0.035, 0.312);
  const pupL  = makeSculptedSphere(0.048, 0.058, 0.035, 12, 8).translate(-0.15, 0.035, 0.335);
  const pupR  = makeSculptedSphere(0.048, 0.058, 0.035, 12, 8).translate(0.15, 0.035, 0.335);
  const glintL = makeSculptedSphere(0.022, 0.024, 0.02, 8, 6).translate(-0.125, 0.07, 0.358);
  const glintR = makeSculptedSphere(0.022, 0.024, 0.02, 8, 6).translate(0.175, 0.07, 0.358);

  const upperBeak = makeCurvedTube(
    [[0, 0.03, 0.27], [0, 0.02, 0.41], [0, -0.03, 0.51], [0, -0.105, 0.54]],
    [0.118, 0.102, 0.065, 0.015], 14
  );

  // Sleek Explorer Pith Helmet + Goggles resting on crown
  const hatDome = makeLathe([
    [0.32, 0.0], [0.31, 0.06], [0.28, 0.14], [0.20, 0.20], [0.09, 0.23], [0.001, 0.24]
  ], 24, true).translate(0, 0.21, -0.01);
  const hatBrim = makeLathe([
    [0.30, 0.0], [0.43, -0.025], [0.445, -0.038], [0.42, -0.052], [0.29, -0.025]
  ], 24, false).translate(0, 0.22, 0.01);
  const hatBand = makeTorus(0.315, 0.028, 22, 8).translate(0, 0.24, -0.01);
  const gogRimL = makeTorus(0.078, 0.018, 16, 8).rotateX(Math.PI / 2 - 0.25).translate(-0.12, 0.30, 0.28);
  const gogRimR = makeTorus(0.078, 0.018, 16, 8).rotateX(Math.PI / 2 - 0.25).translate(0.12, 0.30, 0.28);
  const gogLensL = makeSculptedSphere(0.068, 0.068, 0.02, 12, 8).rotateX(-0.25).translate(-0.12, 0.30, 0.285);
  const gogLensR = makeSculptedSphere(0.068, 0.068, 0.02, 12, 8).rotateX(-0.25).translate(0.12, 0.30, 0.285);

  // Crest plume behind hat
  const crestRear = makeFeatherBlade(0.24, 0.095, 0.08, 0.024, 8).rotateY(Math.PI).rotateX(0.55).translate(0, 0.34, -0.26);

  const headMesh = b.addMesh('HeadMesh', [
    { geo: skullGeo, material: mTurquoise },
    { geo: cheekL.merge(cheekR), material: mGold },
    { geo: eyeWL.merge(eyeWR).merge(glintL).merge(glintR), material: mEyeWhite },
    { geo: irisL.merge(irisR), material: mEyeIris },
    { geo: pupL.merge(pupR), material: mEyePupil },
    { geo: upperBeak, material: mOrange },
    { geo: hatDome.merge(hatBrim), material: mHatKhaki },
    { geo: hatBand.merge(crestRear), material: mBandana },
    { geo: gogRimL.merge(gogRimR), material: mBrass },
    { geo: gogLensL.merge(gogLensR), material: mLens }
  ]);
  b.nodes[headNode].mesh = headMesh;

  // Articulated Lower Jaw
  const jawGeo = makeSculptedSphere(0.078, 0.048, 0.105, 12, 8).translate(0, -0.028, 0.065);
  const jawMesh = b.addMesh('JawMesh', [{ geo: jawGeo, material: mDarkBeak }]);
  b.addNode({ name: 'Jaw', parent: headNode, translation: [0, -0.06, 0.28], mesh: jawMesh });

  // Cohesive Overlapping Layered Wings (Scarlet coverts -> Gold median -> Royal Blue primaries)
  function buildWing(side) {
    const sign = side === 'L' ? -1 : 1;
    const covert = makeSculptedSphere(0.095, 0.21, 0.24, 16, 12).translate(sign * 0.04, -0.05, -0.02);
    const median = new Geo();
    const primaries = new Geo();
    for (let i = 0; i < 4; i++) {
      const m = makeFeatherBlade(0.28 - i * 0.02, 0.11, 0.04, 0.022, 8)
        .rotateY(Math.PI + sign * (0.18 - i * 0.04))
        .rotateX(-0.35 - i * 0.12)
        .translate(sign * 0.06, -0.04 - i * 0.035, 0.02);
      median.merge(m);
    }
    for (let i = 0; i < 5; i++) {
      const p = makeFeatherBlade(0.42 - i * 0.035, 0.105, 0.05, 0.02, 8)
        .rotateY(Math.PI + sign * (0.22 - i * 0.04))
        .rotateX(-0.42 - i * 0.14)
        .translate(sign * 0.065, -0.08 - i * 0.04, -0.03);
      primaries.merge(p);
    }
    const wMesh = b.addMesh(`Wing${side}Mesh`, [
      { geo: covert, material: mScarlet },
      { geo: median, material: mGold },
      { geo: primaries, material: mRoyalBlue }
    ]);
    b.addNode({ name: `Wing${side}`, parent: bodyNode, translation: [sign * 0.31, 0.13, 0.02], mesh: wMesh });
  }
  buildWing('L');
  buildWing('R');

  // Cohesive Layered Tail Fan
  const tailCenter = makeFeatherBlade(0.52, 0.13, 0.05, 0.024, 8).rotateY(Math.PI).rotateX(-0.24);
  const tailL = makeFeatherBlade(0.46, 0.11, 0.04, 0.022, 8).rotateY(Math.PI + 0.20).rotateX(-0.20);
  const tailR = makeFeatherBlade(0.46, 0.11, 0.04, 0.022, 8).rotateY(Math.PI - 0.20).rotateX(-0.20);
  const tailL2 = makeFeatherBlade(0.38, 0.10, 0.03, 0.02, 8).rotateY(Math.PI + 0.38).rotateX(-0.17);
  const tailR2 = makeFeatherBlade(0.38, 0.10, 0.03, 0.02, 8).rotateY(Math.PI - 0.38).rotateX(-0.17);
  const tailMesh = b.addMesh('TailMesh', [
    { geo: tailCenter, material: mScarlet },
    { geo: tailL.merge(tailR), material: mRoyalBlue },
    { geo: tailL2.merge(tailR2), material: mGold }
  ]);
  b.addNode({ name: 'Tail', parent: bodyNode, translation: [0, -0.24, -0.25], mesh: tailMesh });

  // Articulated Legs & Feet
  function buildLeg(side) {
    const sign = side === 'L' ? -1 : 1;
    const thigh = makeCurvedTube([[0, 0, 0], [0, -0.18, 0.02], [0, -0.32, 0.01]], [0.072, 0.05, 0.04], 10);
    const toeMid = makeCurvedTube([[0, -0.32, 0.02], [0, -0.34, 0.18]], [0.035, 0.02], 8);
    const toeIn  = makeCurvedTube([[0, -0.32, 0.02], [-sign * 0.085, -0.34, 0.15]], [0.03, 0.018], 8);
    const toeOut = makeCurvedTube([[0, -0.32, 0.02], [sign * 0.085, -0.34, 0.15]], [0.03, 0.018], 8);
    const toeBack = makeCurvedTube([[0, -0.32, 0.0], [0, -0.34, -0.10]], [0.028, 0.018], 8);
    const legMesh = b.addMesh(`Leg${side}Mesh`, [
      { geo: thigh.merge(toeMid).merge(toeIn).merge(toeOut).merge(toeBack), material: mOrange }
    ]);
    b.addNode({ name: `Leg${side}`, parent: bodyNode, translation: [sign * 0.15, -0.36, 0.02], mesh: legMesh });
  }
  buildLeg('L');
  buildLeg('R');

  b.addNode({ name: 'CarrySocket', parent: bodyNode, translation: [0.34, 0.02, 0.34] });
  b.write(path.join(OUT_DIR, 'papi.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. CURVED TROPICAL PALM TREE v2 (11 serrated arching fronds + windSway!)
// ═════════════════════════════════════════════════════════════════════════════
function buildPalmTreeGLB() {
  const b = new GLBBuilder('PalmTreeV2');
  const mBark = b.addMaterial('PalmBark', '#875a38', { roughness: 0.88, textureTag: 'bark' });
  const mFrond = b.addMaterial('PalmFrond', '#2fa33c', { roughness: 0.56, textureTag: 'foliage', doubleSided: true, windSway: 0.12 });
  const mFrondYoung = b.addMaterial('PalmFrondBright', '#62cf46', { roughness: 0.52, textureTag: 'foliage', doubleSided: true, windSway: 0.15 });
  const mCoconut = b.addMaterial('Coconut', '#5e3518', { roughness: 0.70 });

  const spine = [];
  const radii = [];
  const steps = 12;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    spine.push([Math.sin(t * 1.45) * 0.78, t * 5.8, Math.cos(t * 1.1) * 0.32 - 0.32]);
    radii.push(0.38 * (1 - t * 0.62) + (i === 0 ? 0.16 : 0));
  }
  const trunk = makeCurvedTube(spine, radii, 12, 0.09);
  const top = spine[steps];

  const frondsOuter = new Geo();
  const frondsInner = new Geo();
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const frond = makeFeatherBlade(3.0, 1.02, 0.95, 0.04, 12, 0.55)
      .rotateX(-0.08)
      .rotateY(a)
      .translate(top[0], top[1] - 0.05, top[2]);
    frondsOuter.merge(frond);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const frond = makeFeatherBlade(2.2, 0.82, 0.72, 0.035, 10, 0.45)
      .rotateX(-0.48)
      .rotateY(a)
      .translate(top[0], top[1] + 0.08, top[2]);
    frondsInner.merge(frond);
  }

  const coconuts = new Geo();
  for (let i = 0; i < 4; i++) {
    const a = i * 1.57;
    coconuts.merge(makeSculptedSphere(0.18, 0.21, 0.18, 12, 8).translate(
      top[0] + Math.cos(a) * 0.26, top[1] - 0.26, top[2] + Math.sin(a) * 0.26
    ));
  }

  const mesh = b.addMesh('PalmMesh', [
    { geo: trunk, material: mBark },
    { geo: frondsOuter, material: mFrond },
    { geo: frondsInner, material: mFrondYoung },
    { geo: coconuts, material: mCoconut }
  ]);
  b.addNode({ name: 'PalmTree', mesh });
  b.write(path.join(OUT_DIR, 'palm_tree.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. BROADLEAF ORCHARD TREE (NEW — Branching limbs & organic sculpted canopy!)
// ═════════════════════════════════════════════════════════════════════════════
function buildFruitTreeGLB() {
  const b = new GLBBuilder('OrchardTree');
  const mBark = b.addMaterial('TreeBark', '#6e472b', { roughness: 0.88, textureTag: 'bark' });
  const mLeafDark = b.addMaterial('CanopyDark', '#2b9440', { roughness: 0.65, textureTag: 'foliage', windSway: 0.08 });
  const mLeafBright = b.addMaterial('CanopyBright', '#58c748', { roughness: 0.60, textureTag: 'foliage', windSway: 0.11 });
  const mFruit = b.addMaterial('TreeFruit', '#ff5436', { roughness: 0.30 });

  const trunk = makeCurvedTube(
    [[0, 0, 0], [0.08, 1.1, 0.04], [-0.04, 2.2, 0], [0, 2.9, 0]],
    [0.44, 0.34, 0.26, 0.18], 12
  );
  const b1 = makeCurvedTube([[0, 2.1, 0], [-0.9, 2.8, 0.4], [-1.35, 3.2, 0.5]], [0.19, 0.13, 0.08], 8);
  const b2 = makeCurvedTube([[0, 2.2, 0], [0.95, 2.9, -0.3], [1.3, 3.3, -0.4]], [0.18, 0.12, 0.08], 8);
  const b3 = makeCurvedTube([[0, 2.3, 0], [0.1, 3.0, -0.95]], [0.16, 0.09], 8);

  const organicDeform = (x, y, z, u, v) => {
    const ripple = 1 + 0.11 * Math.sin(u * Math.PI * 8) * Math.sin(v * Math.PI * 5);
    return [x * ripple, y * (y < 0 ? 0.68 : 1.04) * ripple, z * ripple];
  };

  const darkLobes = new Geo();
  const brightLobes = new Geo();
  const lobes = [
    [0, 3.7, 0, 1.65, 1.25, 1.55, false],
    [-1.25, 3.35, 0.45, 1.15, 0.92, 1.10, true],
    [1.22, 3.45, -0.35, 1.18, 0.95, 1.12, false],
    [0.15, 3.3, -1.05, 1.12, 0.88, 1.05, true],
    [-0.45, 3.5, 0.95, 1.05, 0.85, 1.0, true],
    [0.45, 4.25, 0.15, 1.1, 0.85, 1.05, true]
  ];
  for (const [lx, ly, lz, rx, ry, rz, bright] of lobes) {
    const lobe = makeSculptedSphere(rx, ry, rz, 16, 12, organicDeform).translate(lx, ly, lz);
    if (bright) brightLobes.merge(lobe);
    else darkLobes.merge(lobe);
  }

  const fruits = new Geo();
  const fruitPts = [[-1.3, 2.65, 0.85], [1.25, 2.75, 0.3], [0.55, 2.85, 1.15], [-0.4, 2.7, -1.2], [0.95, 3.0, -0.95]];
  for (const [fx, fy, fz] of fruitPts) {
    fruits.merge(makeSculptedSphere(0.14, 0.14, 0.14, 10, 8).translate(fx, fy, fz));
  }

  const mesh = b.addMesh('OrchardTreeMesh', [
    { geo: trunk.merge(b1).merge(b2).merge(b3), material: mBark },
    { geo: darkLobes, material: mLeafDark },
    { geo: brightLobes, material: mLeafBright },
    { geo: fruits, material: mFruit }
  ]);
  b.addNode({ name: 'OrchardTree', mesh });
  b.write(path.join(OUT_DIR, 'fruit_tree.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. ORGANIC GRASS TUFT & TROPICAL FERN BUSH (Replaces ugly cone spikes!)
// ═════════════════════════════════════════════════════════════════════════════
function buildFoliageGLBs() {
  // 4a. Multi-blade curved grass tuft
  {
    const b = new GLBBuilder('GrassTuft');
    const mGrass = b.addMaterial('GrassBladeMat', '#4ec946', {
      roughness: 0.68, doubleSided: true, windSway: 0.18
    });
    const blades = new Geo();
    const count = 6;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 2) * 0.25;
      const len = 0.42 + (i % 3) * 0.11;
      const blade = makeFeatherBlade(len, 0.095, 0.12, 0.012, 5)
        .rotateX(-1.08 + (i % 2) * 0.22)
        .rotateY(a)
        .translate(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04);
      blades.merge(blade);
    }
    const mesh = b.addMesh('GrassTuftMesh', [{ geo: blades, material: mGrass }]);
    b.addNode({ name: 'GrassTuft', mesh });
    b.write(path.join(OUT_DIR, 'grass_tuft.glb'));
  }

  // 4b. Tropical Fern & Hibiscus Bush
  {
    const b = new GLBBuilder('FernBush');
    const mFern = b.addMaterial('FernMat', '#2da848', { roughness: 0.60, doubleSided: true, windSway: 0.12 });
    const mBloom = b.addMaterial('HibiscusMat', '#ff548e', { roughness: 0.45, emissive: '#661133', emissiveIntensity: 0.2 });
    const fronds = new Geo();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      fronds.merge(
        makeFeatherBlade(0.95 + (i % 2) * 0.2, 0.34, 0.28, 0.02, 7, 0.45)
          .rotateX(-0.38 - (i % 2) * 0.22)
          .rotateY(a)
          .translate(0, 0.08, 0)
      );
    }
    const blooms = new Geo();
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1;
      blooms.merge(makeSculptedSphere(0.12, 0.08, 0.12, 10, 8).translate(Math.cos(a) * 0.36, 0.44, Math.sin(a) * 0.36));
    }
    const mesh = b.addMesh('FernBushMesh', [
      { geo: fronds, material: mFern },
      { geo: blooms, material: mBloom }
    ]);
    b.addNode({ name: 'FernBush', mesh });
    b.write(path.join(OUT_DIR, 'fern_bush.glb'));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. TROPICAL COTTAGE v2 — Real Hollow Doorway + Lit Cozy Interior!
// ═════════════════════════════════════════════════════════════════════════════
function buildCottageGLB() {
  const b = new GLBBuilder('IslandCottageV2');
  const mStone = b.addMaterial('CottageStone', '#968f80', { roughness: 0.90, textureTag: 'stone' });
  const mPlaster = b.addMaterial('CottageWall', '#f7e6c4', { roughness: 0.80, textureTag: 'plaster' });
  const mTimber = b.addMaterial('CottageTimber', '#694022', { roughness: 0.76, textureTag: 'wood' });
  const mRoof = b.addMaterial('CottageRoof', '#cf6e36', { roughness: 0.78, textureTag: 'thatch' });
  const mDoorWood = b.addMaterial('WoodenDoor', '#8f5228', { roughness: 0.68, textureTag: 'wood' });
  const mBrass = b.addMaterial('DoorBrass', '#f2bd3d', { roughness: 0.22, metallic: 0.88 });
  const mGlowWin = b.addMaterial('WarmWindow', '#ffe494', { roughness: 0.20, emissive: '#ffb838', emissiveIntensity: 0.9 });
  const mInterior = b.addMaterial('CozyInterior', '#7a4b2a', { roughness: 0.85, emissive: '#ff9d2e', emissiveIntensity: 0.35 });

  const root = b.addNode({ name: 'CottageRoot' });

  // Stone foundation & wide welcoming porch
  const base = makeBeveledBox(4.8, 0.55, 4.2, 0.08).translate(0, 0.275, 0);
  const porch = makeBeveledBox(3.4, 0.32, 1.35, 0.05).translate(0, 0.16, 2.45);

  // Hollow Room Walls (Back, Left, Right, Front-Left, Front-Right, Front-Top so doorway is genuinely open!)
  const walls = new Geo();
  walls.merge(makeBeveledBox(4.2, 2.55, 0.28, 0.03).translate(0, 1.80, -1.66));   // Back wall
  walls.merge(makeBeveledBox(0.28, 2.55, 3.6, 0.03).translate(-1.96, 1.80, 0));   // Left wall
  walls.merge(makeBeveledBox(0.28, 2.55, 3.6, 0.03).translate(1.96, 1.80, 0));    // Right wall
  walls.merge(makeBeveledBox(1.42, 2.55, 0.28, 0.03).translate(-1.39, 1.80, 1.66)); // Front-Left
  walls.merge(makeBeveledBox(1.42, 2.55, 0.28, 0.03).translate(1.39, 1.80, 1.66));  // Front-Right
  walls.merge(makeBeveledBox(1.40, 0.82, 0.28, 0.03).translate(0, 2.66, 1.66));   // Above doorway

  // Warm Interior Floor & Hearth Glow visible when door opens!
  const interior = makeBeveledBox(3.6, 0.08, 3.2, 0.01).translate(0, 0.58, 0)
    .merge(makeBeveledBox(1.2, 0.75, 0.65, 0.03).translate(0, 0.95, -1.1));

  // Half-timbered framing & porch posts
  const timber = new Geo();
  for (const sx of [-2.05, 2.05]) {
    for (const sz of [-1.75, 1.75]) {
      timber.merge(makeBeveledBox(0.24, 2.62, 0.24, 0.03).translate(sx, 1.82, sz));
    }
  }
  timber.merge(makeBeveledBox(0.18, 1.82, 0.34, 0.03).translate(-0.62, 1.45, 1.68));
  timber.merge(makeBeveledBox(0.18, 1.82, 0.34, 0.03).translate(0.62, 1.45, 1.68));
  timber.merge(makeBeveledBox(1.52, 0.20, 0.36, 0.03).translate(0, 2.32, 1.68));
  timber.merge(makeBeveledBox(0.18, 2.35, 0.18, 0.02).translate(-1.55, 1.68, 2.85));
  timber.merge(makeBeveledBox(0.18, 2.35, 0.18, 0.02).translate(1.55, 1.68, 2.85));
  timber.merge(makeBeveledBox(3.4, 0.16, 0.18, 0.02).translate(0, 2.78, 2.85));

  // Layered Pitched Roof + Porch Awning + Chimney
  const roof = new Geo();
  roof.merge(makeBeveledBox(3.15, 0.26, 5.4, 0.06).rotateZ(0.56).translate(-1.34, 3.72, 0.35));
  roof.merge(makeBeveledBox(3.15, 0.26, 5.4, 0.06).rotateZ(-0.56).translate(1.34, 3.72, 0.35));
  roof.merge(makeBeveledBox(0.36, 0.30, 5.55, 0.06).translate(0, 4.55, 0.35));
  const chimney = makeBeveledBox(0.72, 1.75, 0.72, 0.06).translate(1.35, 4.25, -0.85);

  const wins = makeBeveledBox(0.72, 0.72, 0.10, 0.02).translate(-1.38, 1.78, 1.81)
    .merge(makeBeveledBox(0.72, 0.72, 0.10, 0.02).translate(1.38, 1.78, 1.81))
    .merge(makeBeveledBox(0.10, 0.76, 0.90, 0.02).translate(2.11, 1.78, 0))
    .merge(makeBeveledBox(0.10, 0.76, 0.90, 0.02).translate(-2.11, 1.78, 0))
    .merge(makeSculptedSphere(0.18, 0.18, 0.18, 10, 8).translate(0, 1.5, -1.0)); // Hearth lantern glow

  const bodyMesh = b.addMesh('CottageBodyMesh', [
    { geo: base.merge(porch).merge(chimney), material: mStone },
    { geo: walls, material: mPlaster },
    { geo: interior, material: mInterior },
    { geo: timber, material: mTimber },
    { geo: roof, material: mRoof },
    { geo: wins, material: mGlowWin }
  ]);
  b.addNode({ name: 'CottageBody', parent: root, mesh: bodyMesh });

  // Hinged Wooden Door Node
  const doorPanel = makeBeveledBox(1.06, 1.72, 0.12, 0.02).translate(0.53, 0.86, 0);
  const plank1 = makeBeveledBox(0.98, 0.12, 0.16, 0.015).translate(0.53, 0.36, 0);
  const plank2 = makeBeveledBox(0.98, 0.12, 0.16, 0.015).translate(0.53, 1.36, 0);
  const knob = makeSculptedSphere(0.075, 0.075, 0.075, 10, 8).translate(0.90, 0.85, 0.10);
  const doorMesh = b.addMesh('WoodenDoorMesh', [
    { geo: doorPanel, material: mDoorWood },
    { geo: plank1.merge(plank2), material: mTimber },
    { geo: knob, material: mBrass }
  ]);
  b.addNode({ name: 'DoorPivot', parent: root, translation: [-0.53, 0.55, 1.70], mesh: doorMesh });

  b.write(path.join(OUT_DIR, 'cottage.glb'));
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. HARBOR PIER & WOODEN SAILBOAT (NEW — Functional South Harbor!)
// ═════════════════════════════════════════════════════════════════════════════
function buildHarborGLBs() {
  // 6a. Wooden Harbor Pier
  {
    const b = new GLBBuilder('HarborPier');
    const mPlank = b.addMaterial('PierPlank', '#a36c3d', { roughness: 0.80, textureTag: 'wood' });
    const mPost = b.addMaterial('PierPost', '#5e391c', { roughness: 0.86, textureTag: 'wood' });
    const mRope = b.addMaterial('PierRope', '#dec28e', { roughness: 0.88 });
    const mGlow = b.addMaterial('PierLantern', '#ffe885', { roughness: 0.2, emissive: '#ffae2b', emissiveIntensity: 0.9 });

    const planks = new Geo();
    for (let i = 0; i < 18; i++) {
      planks.merge(makeBeveledBox(3.0, 0.14, 0.42, 0.02).translate(0, 0.95, i * 0.48 - 4.0));
    }
    const posts = new Geo();
    const ropes = new Geo();
    for (let i = 0; i <= 3; i++) {
      const z = i * 2.75 - 3.9;
      for (const sx of [-1.38, 1.38]) {
        posts.merge(makeCurvedTube([[sx, -1.6, z], [sx, 1.75, z]], [0.16, 0.15], 10));
        ropes.merge(makeTorus(0.18, 0.038, 12, 6).translate(sx, 1.35, z));
      }
    }
    const lantern = makeSculptedSphere(0.18, 0.22, 0.18, 12, 8).translate(1.38, 1.95, 4.35);
    const mesh = b.addMesh('PierMesh', [
      { geo: planks, material: mPlank },
      { geo: posts, material: mPost },
      { geo: ropes, material: mRope },
      { geo: lantern, material: mGlow }
    ]);
    b.addNode({ name: 'HarborPier', mesh });
    b.write(path.join(OUT_DIR, 'pier.glb'));
  }

  // 6b. Moored Tropical Sailboat
  {
    const b = new GLBBuilder('Sailboat');
    const mHull = b.addMaterial('BoatHull', '#b86835', { roughness: 0.68, textureTag: 'wood' });
    const mTrim = b.addMaterial('BoatTrim', '#18a8c4', { roughness: 0.55 });
    const mMast = b.addMaterial('BoatMast', '#6e4320', { roughness: 0.78, textureTag: 'wood' });
    const mSail = b.addMaterial('BoatSail', '#fff6df', { roughness: 0.75, doubleSided: true, windSway: 0.08 });
    const mFlag = b.addMaterial('BoatFlag', '#ff3d3d', { roughness: 0.60, doubleSided: true, windSway: 0.22 });

    const hull = makeSculptedSphere(1.15, 0.68, 2.55, 22, 14, (x, y, z) => {
      const bowTaper = z > 0 ? 1 - Math.pow(z / 2.55, 1.6) * 0.85 : 1 - Math.pow(-z / 2.55, 2.2) * 0.45;
      return [x * bowTaper, Math.min(0.22, y), z];
    }).translate(0, 0.22, 0);
    const stripe = makeSculptedSphere(1.18, 0.14, 2.52, 20, 8, (x, y, z) => {
      const bowTaper = z > 0 ? 1 - Math.pow(z / 2.55, 1.6) * 0.85 : 1 - Math.pow(-z / 2.55, 2.2) * 0.45;
      return [x * bowTaper, y, z];
    }).translate(0, 0.34, 0);
    const mast = makeCurvedTube([[0, 0.2, 0.15], [0, 4.2, 0.15]], [0.09, 0.055], 10)
      .merge(makeCurvedTube([[0, 1.15, 0.15], [0, 1.25, -1.75]], [0.06, 0.045], 8));
    const sail = makeFeatherBlade(2.75, 1.85, 0.35, 0.02, 10).rotateX(-1.42).rotateY(Math.PI).translate(0, 1.2, 0.15);
    const flag = makeFeatherBlade(0.65, 0.24, 0.08, 0.015, 6).rotateY(Math.PI).translate(0, 4.15, 0.15);

    const mesh = b.addMesh('SailboatMesh', [
      { geo: hull, material: mHull },
      { geo: stripe, material: mTrim },
      { geo: mast, material: mMast },
      { geo: sail, material: mSail },
      { geo: flag, material: mFlag }
    ]);
    b.addNode({ name: 'Sailboat', mesh });
    b.write(path.join(OUT_DIR, 'sailboat.glb'));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. SIGNPOST, STEPPING STONE & ANCIENT BRAZIER (NEW Functional Landmarks!)
// ═════════════════════════════════════════════════════════════════════════════
function buildFunctionalLandmarksGLBs() {
  // 7a. Directional Trail Signpost
  {
    const b = new GLBBuilder('Signpost');
    const mPost = b.addMaterial('SignPostWood', '#6b4222', { roughness: 0.82, textureTag: 'wood' });
    const mBoard1 = b.addMaterial('SignBoard1', '#d99a4e', { roughness: 0.74, textureTag: 'wood' });
    const mBoard2 = b.addMaterial('SignBoard2', '#26a8bf', { roughness: 0.68 });
    const post = makeCurvedTube([[0, 0, 0], [0.02, 1.95, 0]], [0.11, 0.09], 10)
      .merge(makeSculptedSphere(0.13, 0.11, 0.13, 10, 8).translate(0.02, 1.98, 0));
    const b1 = makeBeveledBox(1.15, 0.26, 0.08, 0.02).rotateY(0.35).translate(0.32, 1.65, 0.1);
    const b2 = makeBeveledBox(1.05, 0.24, 0.08, 0.02).rotateY(-0.55).translate(-0.28, 1.32, 0.12);
    const mesh = b.addMesh('SignpostMesh', [
      { geo: post, material: mPost },
      { geo: b1, material: mBoard1 },
      { geo: b2, material: mBoard2 }
    ]);
    b.addNode({ name: 'Signpost', mesh });
    b.write(path.join(OUT_DIR, 'signpost.glb'));
  }

  // 7b. Flat-topped Mossy River Stepping Stone
  {
    const b = new GLBBuilder('SteppingStone');
    const mRock = b.addMaterial('RiverStone', '#838c84', { roughness: 0.86, textureTag: 'stone' });
    const mTop = b.addMaterial('StoneTop', '#a8b09e', { roughness: 0.80, textureTag: 'stone' });
    const base = makeSculptedSphere(0.95, 0.42, 0.88, 16, 10, (x, y, z, u) => {
      const wob = 1 + 0.09 * Math.sin(u * Math.PI * 6);
      return [x * wob, y > 0.12 ? 0.16 : y, z * wob];
    });
    const topPad = makeLathe([[0.72, 0.15], [0.68, 0.20], [0.001, 0.21]], 14);
    const mesh = b.addMesh('SteppingStoneMesh', [
      { geo: base, material: mRock },
      { geo: topPad, material: mTop }
    ]);
    b.addNode({ name: 'SteppingStone', mesh });
    b.write(path.join(OUT_DIR, 'stepping_stone.glb'));
  }

  // 7c. Ancient Torch Brazier (with FlameNode!)
  {
    const b = new GLBBuilder('AncientBrazier');
    const mStone = b.addMaterial('BrazierStone', '#878b82', { roughness: 0.90, textureTag: 'stone' });
    const mIron = b.addMaterial('BrazierIron', '#333842', { roughness: 0.45, metallic: 0.75 });
    const mFlame = b.addMaterial('BrazierFlame', '#ff9d24', { roughness: 0.15, emissive: '#ff6a00', emissiveIntensity: 1.0 });
    const root = b.addNode({ name: 'BrazierRoot' });
    const ped = makeLathe([[0.42, 0], [0.36, 0.22], [0.22, 0.85], [0.34, 1.05]], 12);
    const bowl = makeLathe([[0.18, 1.05], [0.46, 1.28], [0.48, 1.38], [0.38, 1.38]], 14, false);
    const baseMesh = b.addMesh('BrazierBaseMesh', [
      { geo: ped, material: mStone },
      { geo: bowl, material: mIron }
    ]);
    b.addNode({ name: 'BrazierPedestal', parent: root, mesh: baseMesh });

    const flame = makeLathe([[0.26, 0], [0.22, 0.28], [0.09, 0.54], [0.001, 0.72]], 10);
    const flameMesh = b.addMesh('BrazierFlameMesh', [{ geo: flame, material: mFlame }]);
    b.addNode({ name: 'FlameNode', parent: root, translation: [0, 1.28, 0], mesh: flameMesh });
    b.write(path.join(OUT_DIR, 'brazier.glb'));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. TREASURE CHEST, WOODEN BRIDGE, ANCIENT ARCH (w/ MagicBarrier!), RABBIT & PROPS
// ═════════════════════════════════════════════════════════════════════════════
function buildTreasureChestGLB() {
  const b = new GLBBuilder('TreasureChest');
  const mWood = b.addMaterial('ChestWood', '#7a3f1d', { roughness: 0.62, textureTag: 'wood' });
  const mGold = b.addMaterial('ChestGold', '#f5be36', { roughness: 0.20, metallic: 0.90 });
  const mGlow = b.addMaterial('ChestTreasureGlow', '#ffe866', { roughness: 0.2, emissive: '#ffbe26', emissiveIntensity: 0.95 });

  const root = b.addNode({ name: 'ChestRoot' });
  const base = makeBeveledBox(1.42, 0.70, 0.92, 0.05).translate(0, 0.35, 0);
  const bandL = makeBeveledBox(0.12, 0.74, 0.97, 0.02).translate(-0.50, 0.36, 0);
  const bandR = makeBeveledBox(0.12, 0.74, 0.97, 0.02).translate(0.50, 0.36, 0);
  const lockPlate = makeBeveledBox(0.26, 0.30, 0.10, 0.02).translate(0, 0.55, 0.47);
  const coinsPile = makeSculptedSphere(0.58, 0.20, 0.36, 16, 10).translate(0, 0.66, 0);

  const baseMesh = b.addMesh('ChestBaseMesh', [
    { geo: base, material: mWood },
    { geo: bandL.merge(bandR).merge(lockPlate), material: mGold },
    { geo: coinsPile, material: mGlow }
  ]);
  b.addNode({ name: 'ChestBase', parent: root, mesh: baseMesh });

  const lidBody = makeSculptedSphere(0.72, 0.36, 0.47, 20, 12, (x, y, z) => [x, Math.max(0, y), z]).translate(0, 0, 0.46);
  const lidBandL = makeTorus(0.47, 0.058, 16, 8).rotateY(Math.PI / 2).translate(-0.50, 0.02, 0.46);
  const lidBandR = makeTorus(0.47, 0.058, 16, 8).rotateY(Math.PI / 2).translate(0.50, 0.02, 0.46);
  const lidMesh = b.addMesh('ChestLidMesh', [
    { geo: lidBody, material: mWood },
    { geo: lidBandL.merge(lidBandR), material: mGold }
  ]);
  b.addNode({ name: 'ChestLidPivot', parent: root, translation: [0, 0.70, -0.46], mesh: lidMesh });
  b.write(path.join(OUT_DIR, 'treasure_chest.glb'));
}

function buildWoodenBridgeGLB() {
  const b = new GLBBuilder('WoodenBridge');
  const mPlank = b.addMaterial('BridgePlank', '#a66d3e', { roughness: 0.78, textureTag: 'wood' });
  const mBeam  = b.addMaterial('BridgeBeam',  '#694020', { roughness: 0.84, textureTag: 'wood' });
  const mRope  = b.addMaterial('BridgeRope',  '#dec390', { roughness: 0.88 });

  const planks = new Geo();
  const beams = new Geo();
  const ropes = new Geo();

  const len = 8.8;
  const plankCount = 21;
  for (let i = 0; i < plankCount; i++) {
    const t = i / (plankCount - 1);
    const z = (t - 0.5) * len;
    const archY = Math.sin(t * Math.PI) * 0.78;
    const slope = Math.cos(t * Math.PI) * 0.26;
    planks.merge(makeBeveledBox(2.8, 0.15, 0.38, 0.025).rotateX(-slope).translate(0, archY, z));
  }

  for (const sx of [-1.38, 1.38]) {
    const railSpine = [];
    const railRadii = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const z = (t - 0.5) * len;
      const y = Math.sin(t * Math.PI) * 0.78;
      railSpine.push([sx, y + 1.02, z]);
      railRadii.push(0.055);
      if (i % 2 === 0) {
        beams.merge(makeBeveledBox(0.20, 1.45, 0.20, 0.03).translate(sx, y + 0.48, z));
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

function buildAncientArchGLB() {
  const b = new GLBBuilder('AncientArchV2');
  const mStone = b.addMaterial('AncientStone', '#8d9086', { roughness: 0.88, textureTag: 'stone' });
  const mMoss  = b.addMaterial('AncientMoss',  '#46823e', { roughness: 0.84, textureTag: 'foliage' });
  const mRune  = b.addMaterial('AncientRune',  '#45ecff', { roughness: 0.18, emissive: '#18c8ff', emissiveIntensity: 0.95 });
  const mBarrier = b.addMaterial('MagicBarrier', '#3ce8ff', { roughness: 0.1, alpha: 0.42, emissive: '#14a8ff', emissiveIntensity: 0.85, doubleSided: true });

  const root = b.addNode({ name: 'ArchRoot' });
  const stones = new Geo();
  // Courtyard stone floor slab + carved pillars + lintel
  stones.merge(makeBeveledBox(6.4, 0.18, 4.2, 0.06).translate(0, 0.09, 0));
  for (const sx of [-2.05, 2.05]) {
    stones.merge(makeBeveledBox(1.25, 0.58, 1.25, 0.08).translate(sx, 0.35, 0));
    stones.merge(makeBeveledBox(0.92, 3.4, 0.92, 0.08).translate(sx, 2.2, 0));
    stones.merge(makeBeveledBox(1.22, 0.48, 1.22, 0.08).translate(sx, 4.0, 0));
  }
  stones.merge(makeBeveledBox(5.6, 0.78, 1.15, 0.10).translate(0, 4.55, 0));
  stones.merge(makeBeveledBox(1.4, 1.0, 1.30, 0.10).translate(0, 4.72, 0));

  const moss = makeSculptedSphere(0.85, 0.28, 0.62, 12, 8).translate(-1.7, 4.92, 0.15)
    .merge(makeSculptedSphere(0.72, 0.25, 0.55, 12, 8).translate(1.6, 4.88, -0.1));

  const runes = makeBeveledBox(0.36, 0.36, 0.14, 0.04).rotateZ(Math.PI / 4).translate(0, 4.72, 0.64)
    .merge(makeBeveledBox(0.24, 0.62, 0.12, 0.03).translate(-2.05, 2.35, 0.48))
    .merge(makeBeveledBox(0.24, 0.62, 0.12, 0.03).translate(2.05, 2.35, 0.48));

  const archMesh = b.addMesh('AncientArchMesh', [
    { geo: stones, material: mStone },
    { geo: moss, material: mMoss },
    { geo: runes, material: mRune }
  ]);
  b.addNode({ name: 'ArchStructure', parent: root, mesh: archMesh });

  // Functional Magic Gate Barrier (opens when yellow key is delivered!)
  const barrierGeo = makeBeveledBox(3.15, 3.9, 0.12, 0.02).translate(0, 2.15, 0);
  const barrierMesh = b.addMesh('MagicBarrierMesh', [{ geo: barrierGeo, material: mBarrier }]);
  b.addNode({ name: 'MagicGate', parent: root, mesh: barrierMesh });

  b.write(path.join(OUT_DIR, 'ancient_arch.glb'));
}

function buildRabbitGLB() {
  const b = new GLBBuilder('IslandRabbit');
  const mFur = b.addMaterial('RabbitFur', '#faf5ed', { roughness: 0.76 });
  const mPink = b.addMaterial('RabbitPink', '#f4a2b0', { roughness: 0.62 });
  const mEye = b.addMaterial('RabbitEye', '#1a1514', { roughness: 0.08 });

  const body = makeSculptedSphere(0.29, 0.27, 0.39, 18, 14).translate(0, 0.30, 0);
  const head = makeSculptedSphere(0.23, 0.22, 0.24, 18, 14).translate(0, 0.57, 0.27);
  const tail = makeSculptedSphere(0.115, 0.115, 0.115, 12, 8).translate(0, 0.29, -0.39);
  const earL = makeSculptedSphere(0.062, 0.25, 0.045, 12, 10).rotateZ(0.18).rotateX(-0.12).translate(-0.10, 0.90, 0.23);
  const earR = makeSculptedSphere(0.062, 0.25, 0.045, 12, 10).rotateZ(-0.18).rotateX(-0.12).translate(0.10, 0.90, 0.23);
  const pawFL = makeSculptedSphere(0.06, 0.08, 0.10, 10, 8).translate(-0.12, 0.08, 0.22);
  const pawFR = makeSculptedSphere(0.06, 0.08, 0.10, 10, 8).translate(0.12, 0.08, 0.22);
  const pawBL = makeSculptedSphere(0.08, 0.07, 0.16, 10, 8).translate(-0.16, 0.07, -0.12);
  const pawBR = makeSculptedSphere(0.08, 0.07, 0.16, 10, 8).translate(0.16, 0.07, -0.12);
  const nose = makeSculptedSphere(0.038, 0.03, 0.03, 10, 8).translate(0, 0.55, 0.50);
  const innerL = makeSculptedSphere(0.032, 0.17, 0.02, 8, 8).rotateZ(0.18).rotateX(-0.12).translate(-0.10, 0.89, 0.26);
  const innerR = makeSculptedSphere(0.032, 0.17, 0.02, 8, 8).rotateZ(-0.18).rotateX(-0.12).translate(0.10, 0.89, 0.26);
  const eyeL = makeSculptedSphere(0.036, 0.042, 0.03, 10, 8).translate(-0.125, 0.61, 0.43);
  const eyeR = makeSculptedSphere(0.036, 0.042, 0.03, 10, 8).translate(0.125, 0.61, 0.43);

  const mesh = b.addMesh('RabbitMesh', [
    { geo: body.merge(head).merge(tail).merge(earL).merge(earR).merge(pawFL).merge(pawFR).merge(pawBL).merge(pawBR), material: mFur },
    { geo: nose.merge(innerL).merge(innerR), material: mPink },
    { geo: eyeL.merge(eyeR), material: mEye }
  ]);
  b.addNode({ name: 'Rabbit', mesh });
  b.write(path.join(OUT_DIR, 'rabbit.glb'));
}

function buildPropsPackGLB() {
  // Key
  {
    const b = new GLBBuilder('KeyProp');
    const mKey = b.addMaterial('KeyMetal', '#2c9cff', { roughness: 0.18, metallic: 0.82, emissive: '#1050aa', emissiveIntensity: 0.35 });
    const bow = makeTorus(0.22, 0.058, 18, 10).rotateX(Math.PI / 2).translate(0, 0.48, 0);
    const shaft = makeCurvedTube([[0, 0.26, 0], [0, -0.36, 0]], [0.05, 0.05], 10);
    const tooth1 = makeBeveledBox(0.17, 0.075, 0.06, 0.01).translate(0.10, -0.18, 0);
    const tooth2 = makeBeveledBox(0.13, 0.075, 0.06, 0.01).translate(0.08, -0.31, 0);
    const mesh = b.addMesh('KeyMesh', [{ geo: bow.merge(shaft).merge(tooth1).merge(tooth2), material: mKey }]);
    b.addNode({ name: 'KeyProp', mesh });
    b.write(path.join(OUT_DIR, 'key.glb'));
  }
  // Apple
  {
    const b = new GLBBuilder('AppleProp');
    const mApple = b.addMaterial('AppleSkin', '#e82c2c', { roughness: 0.22, metallic: 0.05 });
    const mStem = b.addMaterial('AppleStem', '#5e391c', { roughness: 0.85 });
    const mLeaf = b.addMaterial('AppleLeaf', '#45b83b', { roughness: 0.52 });
    const apple = makeSculptedSphere(0.30, 0.28, 0.30, 18, 14, (x, y, z) => {
      const r = Math.hypot(x, z);
      const dimple = y > 0.14 ? -Math.exp(-r * 16) * 0.09 : (y < -0.15 ? Math.exp(-r * 14) * 0.06 : 0);
      const taper = y < 0 ? 1 + y * 0.35 : 1.0;
      return [x * taper, y + dimple, z * taper];
    }).translate(0, 0.28, 0);
    const stem = makeCurvedTube([[0, 0.46, 0], [0.03, 0.62, 0.02]], [0.025, 0.018], 8);
    const leaf = makeFeatherBlade(0.22, 0.12, 0.04, 0.015, 6).rotateZ(-0.4).rotateY(0.6).translate(0.02, 0.56, 0.02);
    const mesh = b.addMesh('AppleMesh', [
      { geo: apple, material: mApple },
      { geo: stem, material: mStem },
      { geo: leaf, material: mLeaf }
    ]);
    b.addNode({ name: 'AppleProp', mesh });
    b.write(path.join(OUT_DIR, 'apple.glb'));
  }
  // Flower
  {
    const b = new GLBBuilder('FlowerProp');
    const mStem = b.addMaterial('FlowerStem', '#3c9c40', { roughness: 0.68 });
    const mPetal = b.addMaterial('FlowerPetal', '#ff5998', { roughness: 0.45, emissive: '#661233', emissiveIntensity: 0.25, doubleSided: true });
    const mCenter = b.addMaterial('FlowerCenter', '#ffd633', { roughness: 0.35, emissive: '#aa7700', emissiveIntensity: 0.3 });
    const stem = makeCurvedTube([[0, 0, 0], [0.03, 0.30, 0], [0, 0.58, 0]], [0.034, 0.03, 0.025], 8);
    const leaf1 = makeFeatherBlade(0.30, 0.15, 0.05, 0.018, 6).rotateX(-0.4).rotateY(0.5).translate(0, 0.22, 0);
    const leaf2 = makeFeatherBlade(0.30, 0.15, 0.05, 0.018, 6).rotateX(-0.4).rotateY(3.6).translate(0, 0.28, 0);
    const petals = new Geo();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      petals.merge(makeFeatherBlade(0.35, 0.22, 0.09, 0.02, 6).rotateX(-0.22).rotateY(a).translate(0, 0.58, 0));
    }
    const center = makeSculptedSphere(0.12, 0.08, 0.12, 12, 8).translate(0, 0.60, 0);
    const mesh = b.addMesh('FlowerMesh', [
      { geo: stem.merge(leaf1).merge(leaf2), material: mStem },
      { geo: petals, material: mPetal },
      { geo: center, material: mCenter }
    ]);
    b.addNode({ name: 'FlowerProp', mesh });
    b.write(path.join(OUT_DIR, 'flower.glb'));
  }
  // Book
  {
    const b = new GLBBuilder('BookProp');
    const mCover = b.addMaterial('BookCover', '#2667d4', { roughness: 0.50 });
    const mPages = b.addMaterial('BookPages', '#f7f0dc', { roughness: 0.82 });
    const mGold  = b.addMaterial('BookGold',  '#f5c440', { roughness: 0.22, metallic: 0.85 });
    const cover = makeBeveledBox(0.56, 0.13, 0.72, 0.02).translate(0, 0.065, 0);
    const pages = makeBeveledBox(0.50, 0.095, 0.66, 0.01).translate(0.02, 0.065, 0);
    const emblem = makeBeveledBox(0.24, 0.02, 0.24, 0.005).rotateY(Math.PI / 4).translate(0, 0.135, 0);
    const mesh = b.addMesh('BookMesh', [
      { geo: cover, material: mCover },
      { geo: pages, material: mPages },
      { geo: emblem, material: mGold }
    ]);
    b.addNode({ name: 'BookProp', mesh });
    b.write(path.join(OUT_DIR, 'book.glb'));
  }
  // Table
  {
    const b = new GLBBuilder('WoodenTable');
    const mWood = b.addMaterial('TableWood', '#995f31', { roughness: 0.76, textureTag: 'wood' });
    const mDark = b.addMaterial('TableLegs', '#6b401e', { roughness: 0.82, textureTag: 'wood' });
    const top = makeBeveledBox(2.0, 0.15, 1.25, 0.03).translate(0, 0.90, 0);
    const bench1 = makeBeveledBox(1.85, 0.10, 0.34, 0.02).translate(0, 0.48, 0.85);
    const bench2 = makeBeveledBox(1.85, 0.10, 0.34, 0.02).translate(0, 0.48, -0.85);
    const legs = new Geo();
    for (const sx of [-0.78, 0.78]) {
      for (const sz of [-0.46, 0.46]) legs.merge(makeBeveledBox(0.15, 0.88, 0.15, 0.02).translate(sx, 0.44, sz));
      for (const sz of [-0.85, 0.85]) legs.merge(makeBeveledBox(0.12, 0.46, 0.12, 0.02).translate(sx, 0.23, sz));
    }
    const mesh = b.addMesh('TableMesh', [
      { geo: top.merge(bench1).merge(bench2), material: mWood },
      { geo: legs, material: mDark }
    ]);
    b.addNode({ name: 'WoodenTable', mesh });
    b.write(path.join(OUT_DIR, 'table.glb'));
  }
  // Lantern
  {
    const b = new GLBBuilder('LanternProp');
    const mBrass = b.addMaterial('LanternBrass', '#e5ab34', { roughness: 0.24, metallic: 0.88 });
    const mGlass = b.addMaterial('LanternGlow', '#fff08a', { roughness: 0.12, emissive: '#ffbe30', emissiveIntensity: 1.0 });
    const base = makeLathe([[0.24, 0], [0.26, 0.06], [0.17, 0.12], [0.17, 0.15]], 14);
    const cap  = makeLathe([[0.21, 0.52], [0.26, 0.56], [0.13, 0.68], [0.001, 0.74]], 14);
    const handle = makeTorus(0.15, 0.024, 14, 8).rotateX(Math.PI / 2).translate(0, 0.76, 0);
    const glass = makeLathe([[0.16, 0.15], [0.19, 0.34], [0.16, 0.52]], 14);
    const mesh = b.addMesh('LanternMesh', [
      { geo: base.merge(cap).merge(handle), material: mBrass },
      { geo: glass, material: mGlass }
    ]);
    b.addNode({ name: 'LanternProp', mesh });
    b.write(path.join(OUT_DIR, 'lantern.glb'));
  }
  // Crystal
  {
    const b = new GLBBuilder('CrystalProp');
    const mCrys = b.addMaterial('CrystalMat', '#4df2ff', { roughness: 0.10, metallic: 0.22, emissive: '#1095d8', emissiveIntensity: 0.70 });
    const main = makeLathe([[0.20, 0], [0.23, 0.60], [0.001, 1.05]], 6);
    const side1 = makeLathe([[0.13, 0], [0.15, 0.40], [0.001, 0.68]], 6).rotateZ(0.35).translate(-0.15, 0, 0.08);
    const side2 = makeLathe([[0.12, 0], [0.14, 0.35], [0.001, 0.60]], 6).rotateZ(-0.32).rotateX(0.2).translate(0.16, 0, -0.06);
    const mesh = b.addMesh('CrystalMesh', [{ geo: main.merge(side1).merge(side2), material: mCrys }]);
    b.addNode({ name: 'CrystalProp', mesh });
    b.write(path.join(OUT_DIR, 'crystal.glb'));
  }
  // Seashell
  {
    const b = new GLBBuilder('SeashellProp');
    const mShell = b.addMaterial('SeashellMat', '#ffd2b2', { roughness: 0.32, emissive: '#552211', emissiveIntensity: 0.18 });
    const shell = makeSculptedSphere(0.34, 0.16, 0.32, 18, 12, (x, y, z, u) => {
      const ribs = 1 + 0.13 * Math.sin(u * Math.PI * 16);
      return [x * ribs, Math.max(-0.04, y * ribs), z];
    }).translate(0, 0.11, 0);
    const mesh = b.addMesh('SeashellMesh', [{ geo: shell, material: mShell }]);
    b.addNode({ name: 'SeashellProp', mesh });
    b.write(path.join(OUT_DIR, 'seashell.glb'));
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. BIOME LANDMARKS FOR ISLANDS 2–6 (Emerald Forest, Coral Bay, Lost City, Crystal Mountains, Ancient Temple)
// ═════════════════════════════════════════════════════════════════════════════
function buildAllIslandBiomeGLBs() {
  // ── Map 2: Emerald Forest — Giant Jungle Tree, Glowing Mushroom, Jungle Totem ──
  {
    const b = new GLBBuilder('JungleTree');
    const mBark = b.addMaterial('JungleBark', '#4a311e', { roughness: 0.9, textureTag: 'bark' });
    const mCanopy1 = b.addMaterial('JungleLeafDeep', '#147a3d', { roughness: 0.62, textureTag: 'foliage', windSway: 0.08 });
    const mCanopy2 = b.addMaterial('JungleLeafBright', '#29b856', { roughness: 0.58, textureTag: 'foliage', windSway: 0.11 });
    const mVine = b.addMaterial('JungleVine', '#3d9e35', { roughness: 0.72, windSway: 0.16 });

    const trunk = makeCurvedTube([[0, 0, 0], [0.15, 2.2, 0.08], [-0.12, 4.6, -0.05], [0, 6.4, 0]], [0.72, 0.48, 0.38, 0.25], 12);
    for (let r = 0; r < 4; r++) {
      const a = (r / 4) * Math.PI * 2;
      trunk.merge(makeCurvedTube([[Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15], [Math.cos(a) * 0.42, 1.4, Math.sin(a) * 0.42]], [0.22, 0.14], 8));
    }
    const deform = (x, y, z, u, v) => {
      const w = 1 + 0.12 * Math.sin(u * Math.PI * 8) * Math.cos(v * Math.PI * 5);
      return [x * w, y * (y < 0 ? 0.6 : 1.0) * w, z * w];
    };
    const c1 = makeSculptedSphere(2.4, 1.1, 2.3, 16, 12, deform).translate(0, 6.5, 0)
      .merge(makeSculptedSphere(1.65, 0.9, 1.6, 14, 10, deform).translate(-1.5, 5.4, 0.6));
    const c2 = makeSculptedSphere(1.75, 0.95, 1.7, 14, 10, deform).translate(1.45, 5.6, -0.5)
      .merge(makeSculptedSphere(1.5, 0.85, 1.45, 14, 10, deform).translate(0, 7.35, 0));
    const vines = new Geo();
    for (let v = 0; v < 5; v++) {
      const a = (v / 5) * Math.PI * 2;
      const vx = Math.cos(a) * 1.45, vz = Math.sin(a) * 1.45;
      vines.merge(makeCurvedTube([[vx, 5.6, vz], [vx * 1.05, 3.8, vz * 1.05], [vx * 0.98, 2.4, vz]], [0.045, 0.038, 0.025], 6));
    }
    const mesh = b.addMesh('JungleTreeMesh', [
      { geo: trunk, material: mBark },
      { geo: c1, material: mCanopy1 },
      { geo: c2, material: mCanopy2 },
      { geo: vines, material: mVine }
    ]);
    b.addNode({ name: 'JungleTree', mesh });
    b.write(path.join(OUT_DIR, 'jungle_tree.glb'));
  }

  {
    const b = new GLBBuilder('GlowingMushroom');
    const mStem = b.addMaterial('MushStem', '#f2ead8', { roughness: 0.78 });
    const mCap = b.addMaterial('MushCap', '#1de09b', { roughness: 0.35, emissive: '#089e68', emissiveIntensity: 0.75 });
    const mSpot = b.addMaterial('MushSpot', '#bdffea', { roughness: 0.25, emissive: '#75ffd2', emissiveIntensity: 0.9 });
    const stem1 = makeCurvedTube([[0, 0, 0], [0.08, 0.65, 0.04], [0, 1.25, 0]], [0.18, 0.14, 0.12], 10);
    const cap1 = makeLathe([[0.12, 1.18], [0.78, 1.22], [0.72, 1.42], [0.38, 1.65], [0.001, 1.74]], 18);
    const stem2 = makeCurvedTube([[-0.45, 0, 0.25], [-0.52, 0.62, 0.28]], [0.11, 0.08], 8);
    const cap2 = makeLathe([[0.08, 0.58], [0.44, 0.62], [0.22, 0.86], [0.001, 0.92]], 14).translate(-0.52, 0, 0.28);
    const spots = new Geo();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      spots.merge(makeSculptedSphere(0.09, 0.04, 0.09, 8, 6).translate(Math.cos(a) * 0.44, 1.50, Math.sin(a) * 0.44));
    }
    const mesh = b.addMesh('MushroomMesh', [
      { geo: stem1.merge(stem2), material: mStem },
      { geo: cap1.merge(cap2), material: mCap },
      { geo: spots, material: mSpot }
    ]);
    b.addNode({ name: 'GlowingMushroom', mesh });
    b.write(path.join(OUT_DIR, 'mushroom.glb'));
  }

  {
    const b = new GLBBuilder('JungleTotem');
    const mWood = b.addMaterial('TotemWood', '#704423', { roughness: 0.80, textureTag: 'wood' });
    const mGold = b.addMaterial('TotemTrim', '#e6ad2e', { roughness: 0.30, metallic: 0.8 });
    const mGem = b.addMaterial('TotemGem', '#2eff9d', { roughness: 0.15, emissive: '#00cc6a', emissiveIntensity: 0.95 });
    const pillar = makeBeveledBox(0.95, 3.4, 0.85, 0.08).translate(0, 1.7, 0);
    const wings = makeBeveledBox(2.8, 0.48, 0.22, 0.04).translate(0, 2.75, 0);
    const beak = makeCurvedTube([[0, 2.25, 0.42], [0, 2.05, 0.82]], [0.20, 0.04], 8);
    const eyes = makeSculptedSphere(0.12, 0.12, 0.08, 10, 8).translate(-0.24, 2.55, 0.44)
      .merge(makeSculptedSphere(0.12, 0.12, 0.08, 10, 8).translate(0.24, 2.55, 0.44));
    const mesh = b.addMesh('TotemMesh', [
      { geo: pillar.merge(wings), material: mWood },
      { geo: beak, material: mGold },
      { geo: eyes, material: mGem }
    ]);
    b.addNode({ name: 'JungleTotem', mesh });
    b.write(path.join(OUT_DIR, 'totem.glb'));
  }

  // ── Map 3: Coral Bay — Coastal Lighthouse & Branching Coral Reef ──
  {
    const b = new GLBBuilder('Lighthouse');
    const mStone = b.addMaterial('LightBase', '#8c9299', { roughness: 0.88, textureTag: 'stone' });
    const mWhite = b.addMaterial('LightWhite', '#f7f9fc', { roughness: 0.72, textureTag: 'plaster' });
    const mRed = b.addMaterial('LightRed', '#e03a3a', { roughness: 0.68, textureTag: 'plaster' });
    const mBeacon = b.addMaterial('LightBeacon', '#fff394', { roughness: 0.12, emissive: '#ffcf33', emissiveIntensity: 1.0 });
    const mDark = b.addMaterial('LightRoof', '#283245', { roughness: 0.55, metallic: 0.5 });

    const base = makeLathe([[1.85, 0], [1.72, 1.1], [1.45, 1.2]], 18);
    const s1 = makeLathe([[1.42, 1.2], [1.26, 2.8]], 18, false);
    const s2 = makeLathe([[1.26, 2.8], [1.10, 4.4]], 18, false);
    const s3 = makeLathe([[1.10, 4.4], [0.96, 5.9]], 18, false);
    const gallery = makeLathe([[0.96, 5.9], [1.32, 6.05], [1.32, 6.25], [0.85, 6.25]], 18);
    const lantern = makeLathe([[0.78, 6.25], [0.78, 7.15]], 16, false);
    const dome = makeLathe([[0.92, 7.15], [0.65, 7.65], [0.001, 7.95]], 18);
    const door = makeBeveledBox(0.75, 1.35, 0.25, 0.03).translate(0, 0.68, 1.68);

    const mesh = b.addMesh('LighthouseMesh', [
      { geo: base, material: mStone },
      { geo: s1.merge(s3), material: mWhite },
      { geo: s2, material: mRed },
      { geo: gallery.merge(dome).merge(door), material: mDark },
      { geo: lantern, material: mBeacon }
    ]);
    b.addNode({ name: 'Lighthouse', mesh });
    b.write(path.join(OUT_DIR, 'lighthouse.glb'));
  }

  {
    const b = new GLBBuilder('CoralReef');
    const mPink = b.addMaterial('CoralPink', '#ff5c8a', { roughness: 0.52, emissive: '#591228', emissiveIntensity: 0.25 });
    const mOrange = b.addMaterial('CoralOrange', '#ff9436', { roughness: 0.55 });
    const mCyan = b.addMaterial('CoralCyan', '#29e3d8', { roughness: 0.48, emissive: '#0b5e58', emissiveIntensity: 0.25 });

    const branches = new Geo();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      branches.merge(makeCurvedTube(
        [[0, 0, 0], [Math.cos(a) * 0.45, 0.65, Math.sin(a) * 0.45], [Math.cos(a) * 0.72, 1.35, Math.sin(a) * 0.72]],
        [0.16, 0.12, 0.07], 8
      ));
    }
    const brain = makeSculptedSphere(0.68, 0.45, 0.62, 16, 12, (x, y, z, u) => {
      const r = 1 + 0.1 * Math.sin(u * Math.PI * 14);
      return [x * r, Math.max(0, y * r), z * r];
    }).translate(0.55, 0.05, 0.35);
    const tubes = new Geo();
    for (let i = 0; i < 4; i++) {
      const a = i * 1.5;
      tubes.merge(makeLathe([[0.16, 0], [0.22, 0.85], [0.18, 0.88]], 10, false).translate(-0.55 + Math.cos(a) * 0.25, 0, -0.25 + Math.sin(a) * 0.25));
    }
    const mesh = b.addMesh('CoralMesh', [
      { geo: branches, material: mPink },
      { geo: brain, material: mOrange },
      { geo: tubes, material: mCyan }
    ]);
    b.addNode({ name: 'CoralReef', mesh });
    b.write(path.join(OUT_DIR, 'coral_reef.glb'));
  }

  // ── Map 4: Lost City — Stepped Sandstone Pyramid & Hieroglyph Obelisk ──
  {
    const b = new GLBBuilder('PyramidRuin');
    const mSandstone = b.addMaterial('Sandstone', '#cfa467', { roughness: 0.86, textureTag: 'stone' });
    const mTrim = b.addMaterial('SandstoneDark', '#9e743c', { roughness: 0.88, textureTag: 'stone' });
    const mSunGold = b.addMaterial('PyramidGold', '#ffcc33', { roughness: 0.22, metallic: 0.88, emissive: '#cc8800', emissiveIntensity: 0.4 });

    const tiers = new Geo();
    tiers.merge(makeBeveledBox(7.2, 1.1, 7.2, 0.08).translate(0, 0.55, 0));
    tiers.merge(makeBeveledBox(5.4, 1.1, 5.4, 0.08).translate(0, 1.65, 0));
    tiers.merge(makeBeveledBox(3.6, 1.1, 3.6, 0.08).translate(0, 2.75, 0));
    tiers.merge(makeBeveledBox(2.1, 1.2, 2.1, 0.06).translate(0, 3.90, 0));

    const stairs = new Geo();
    for (let s = 0; s < 9; s++) {
      stairs.merge(makeBeveledBox(1.5, 0.38, 0.55, 0.02).translate(0, 0.19 + s * 0.38, 3.85 - s * 0.34));
    }
    const sunCrest = makeTorus(0.55, 0.12, 18, 8).translate(0, 5.1, 0)
      .merge(makeSculptedSphere(0.32, 0.32, 0.14, 12, 8).translate(0, 5.1, 0));

    const mesh = b.addMesh('PyramidMesh', [
      { geo: tiers, material: mSandstone },
      { geo: stairs, material: mTrim },
      { geo: sunCrest, material: mSunGold }
    ]);
    b.addNode({ name: 'PyramidRuin', mesh });
    b.write(path.join(OUT_DIR, 'pyramid_ruin.glb'));
  }

  {
    const b = new GLBBuilder('Obelisk');
    const mStone = b.addMaterial('ObeliskStone', '#c99c61', { roughness: 0.85, textureTag: 'stone' });
    const mGlyph = b.addMaterial('ObeliskGlyph', '#38f2ff', { roughness: 0.2, emissive: '#00b8d4', emissiveIntensity: 0.9 });
    const ped = makeBeveledBox(1.3, 0.55, 1.3, 0.06).translate(0, 0.275, 0);
    const shaft = makeLathe([[0.58, 0.55], [0.40, 4.2], [0.001, 4.95]], 4).rotateY(Math.PI / 4);
    const glyphs = makeBeveledBox(0.18, 2.4, 0.64, 0.02).translate(0, 2.35, 0)
      .merge(makeBeveledBox(0.64, 2.4, 0.18, 0.02).translate(0, 2.35, 0));
    const mesh = b.addMesh('ObeliskMesh', [
      { geo: ped.merge(shaft), material: mStone },
      { geo: glyphs, material: mGlyph }
    ]);
    b.addNode({ name: 'Obelisk', mesh });
    b.write(path.join(OUT_DIR, 'obelisk.glb'));
  }

  // ── Map 5: Crystal Mountains — Giant Amethyst Spire & Snow Alpine Pine ──
  {
    const b = new GLBBuilder('GiantCrystal');
    const mAmethyst = b.addMaterial('AmethystMat', '#9e5cff', { roughness: 0.12, metallic: 0.28, emissive: '#5d19cc', emissiveIntensity: 0.72 });
    const mCyan = b.addMaterial('QuartzCyan', '#5ceeff', { roughness: 0.10, metallic: 0.25, emissive: '#1488cc', emissiveIntensity: 0.68 });
    const spireMain = makeLathe([[0.55, 0], [0.64, 2.2], [0.001, 3.85]], 6);
    const spireL = makeLathe([[0.38, 0], [0.42, 1.45], [0.001, 2.45]], 6).rotateZ(0.34).translate(-0.48, 0, 0.2);
    const spireR = makeLathe([[0.34, 0], [0.38, 1.30], [0.001, 2.15]], 6).rotateZ(-0.38).rotateX(0.22).translate(0.52, 0, -0.15);
    const mesh = b.addMesh('GiantCrystalMesh', [
      { geo: spireMain, material: mAmethyst },
      { geo: spireL.merge(spireR), material: mCyan }
    ]);
    b.addNode({ name: 'GiantCrystal', mesh });
    b.write(path.join(OUT_DIR, 'giant_crystal.glb'));
  }

  {
    const b = new GLBBuilder('SnowPine');
    const mTrunk = b.addMaterial('PineBark', '#543824', { roughness: 0.88, textureTag: 'bark' });
    const mPine = b.addMaterial('PineNeedles', '#1f6e58', { roughness: 0.72, windSway: 0.06 });
    const mSnow = b.addMaterial('PineSnow', '#eef7ff', { roughness: 0.65, windSway: 0.06 });
    const trunk = makeCurvedTube([[0, 0, 0], [0, 4.2, 0]], [0.32, 0.12], 8);
    const needles = new Geo();
    const snow = new Geo();
    for (let i = 0; i < 4; i++) {
      const y = 1.1 + i * 0.95;
      const r = 1.65 - i * 0.32;
      needles.merge(makeLathe([[r, y], [r * 0.22, y + 1.25], [0.001, y + 1.32]], 10));
      snow.merge(makeLathe([[r * 0.82, y + 0.35], [r * 0.20, y + 1.28], [0.001, y + 1.35]], 10));
    }
    const mesh = b.addMesh('SnowPineMesh', [
      { geo: trunk, material: mTrunk },
      { geo: needles, material: mPine },
      { geo: snow, material: mSnow }
    ]);
    b.addNode({ name: 'SnowPine', mesh });
    b.write(path.join(OUT_DIR, 'pine_snow.glb'));
  }

  // ── Map 6: Ancient Temple — Grand Golden Obsidian Sanctuary ──
  {
    const b = new GLBBuilder('GrandTemple');
    const mObsidian = b.addMaterial('TempleObsidian', '#2d3142', { roughness: 0.42, metallic: 0.35, textureTag: 'stone' });
    const mMarble = b.addMaterial('TempleMarble', '#ede6d6', { roughness: 0.55, textureTag: 'stone' });
    const mGold = b.addMaterial('TempleGold', '#f5bf38', { roughness: 0.20, metallic: 0.92, emissive: '#8f5e00', emissiveIntensity: 0.3 });
    const mSacred = b.addMaterial('SacredFlame', '#ffcf40', { roughness: 0.1, emissive: '#ff9900', emissiveIntensity: 1.0 });

    const base = makeBeveledBox(8.4, 0.65, 6.4, 0.08).translate(0, 0.325, 0)
      .merge(makeBeveledBox(7.2, 0.45, 5.4, 0.06).translate(0, 0.85, 0));
    const cols = new Geo();
    const goldCaps = new Geo();
    for (const cx of [-2.8, -1.0, 1.0, 2.8]) {
      for (const cz of [-1.9, 1.9]) {
        cols.merge(makeLathe([[0.38, 1.05], [0.34, 4.45]], 12).translate(cx, 0, cz));
        goldCaps.merge(makeBeveledBox(0.92, 0.28, 0.92, 0.04).translate(cx, 4.58, cz));
      }
    }
    const roof = makeBeveledBox(7.8, 0.55, 5.8, 0.06).translate(0, 4.98, 0);
    const pediment = makeLathe([[3.6, 5.25], [0.001, 6.65]], 4).rotateY(Math.PI / 4).scale(1.1, 1, 0.8);
    const emblem = makeTorus(0.65, 0.14, 18, 8).translate(0, 6.85, 0);
    const altarGlow = makeSculptedSphere(0.55, 0.85, 0.55, 14, 10).translate(0, 1.85, 0);

    const mesh = b.addMesh('GrandTempleMesh', [
      { geo: base.merge(pediment), material: mObsidian },
      { geo: cols.merge(roof), material: mMarble },
      { geo: goldCaps.merge(emblem), material: mGold },
      { geo: altarGlow, material: mSacred }
    ]);
    b.addNode({ name: 'GrandTemple', mesh });
    b.write(path.join(OUT_DIR, 'grand_temple.glb'));
  }
}

console.log('Generating v2 High-Detail GLB 2.0 3D models for Papi Hazine Avi...');
buildPapiGLB();
buildPalmTreeGLB();
buildFruitTreeGLB();
buildFoliageGLBs();
buildCottageGLB();
buildHarborGLBs();
buildFunctionalLandmarksGLBs();
buildTreasureChestGLB();
buildWoodenBridgeGLB();
buildAncientArchGLB();
buildRabbitGLB();
buildPropsPackGLB();
buildAllIslandBiomeGLBs();
console.log('All 33 high-detail GLB models generated successfully!');
