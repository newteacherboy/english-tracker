import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';
import { getPBRMaps } from './pbr-textures.mjs';

/**
 * Standards-Compliant GLB 2.0 Loader for Three.js r180 (v2)
 * - Supports PBR roughness/metalness, translucent BLEND materials, and GPU wind-sway vertex shaders!
 */

const modelCache = new Map();
export const globalWindTime = { value: 0 };

function applyWindShader(mat, strength) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = globalWindTime;
    shader.uniforms.uWindStrength = { value: strength };
    shader.vertexShader = `uniform float uWindTime;\nuniform float uWindStrength;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      vec4 wPos = modelMatrix * vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
      #endif
      float heightFactor = clamp(transformed.y * 0.65 + 0.15, 0.0, 1.6);
      float gust = sin(uWindTime * 2.1 + wPos.x * 0.45 + wPos.z * 0.35) * uWindStrength * heightFactor;
      transformed.x += gust;
      transformed.z += gust * 0.55;
      `
    );
  };
  mat.customProgramCacheKey = () => `wind_${strength}`;
}

function readAccessor(gltf, binBuffer, accIndex) {
  const acc = gltf.accessors[accIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const comps = acc.type === 'SCALAR' ? 1 : acc.type === 'VEC2' ? 2 : acc.type === 'VEC3' ? 3 : 4;
  const count = acc.count * comps;

  switch (acc.componentType) {
    case 5126: return new Float32Array(binBuffer, byteOffset, count);
    case 5123: return new Uint16Array(binBuffer, byteOffset, count);
    case 5125: return new Uint32Array(binBuffer, byteOffset, count);
    case 5121: return new Uint8Array(binBuffer, byteOffset, count);
    default: throw new Error(`Unsupported GLB componentType: ${acc.componentType}`);
  }
}

function parseGLB(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const magic = view.getUint32(0, true);
  if (magic !== 0x46546C67) throw new Error('Invalid GLB magic header');
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`Unsupported GLB version: ${version}`);

  let offset = 12;
  let gltf = null;
  let binBuffer = null;

  while (offset < arrayBuffer.byteLength) {
    const chunkLen = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    const chunkStart = offset + 8;
    if (chunkType === 0x4E4F534A) {
      const text = new TextDecoder('utf-8').decode(new Uint8Array(arrayBuffer, chunkStart, chunkLen));
      gltf = JSON.parse(text);
    } else if (chunkType === 0x004E4942) {
      binBuffer = arrayBuffer.slice(chunkStart, chunkStart + chunkLen);
    }
    offset = chunkStart + chunkLen;
  }

  if (!gltf || !binBuffer) throw new Error('Incomplete GLB chunks');

  const materials = (gltf.materials || []).map((m) => {
    const pbr = m.pbrMetallicRoughness || {};
    const c = pbr.baseColorFactor || [1, 1, 1, 1];
    const isBlend = m.alphaMode === 'BLEND' || (c[3] !== undefined && c[3] < 1);
    const mat = new THREE.MeshStandardMaterial({
      name: m.name || 'Mat',
      color: new THREE.Color().setRGB(c[0], c[1], c[2], THREE.LinearSRGBColorSpace),
      roughness: pbr.roughnessFactor ?? 0.65,
      metalness: pbr.metallicFactor ?? 0.0,
      transparent: isBlend,
      opacity: c[3] ?? 1.0,
      depthWrite: !isBlend,
      side: (m.doubleSided || m.extras?.doubleSided) ? THREE.DoubleSide : THREE.FrontSide
    });
    if (m.emissiveFactor) {
      mat.emissive = new THREE.Color().setRGB(
        m.emissiveFactor[0], m.emissiveFactor[1], m.emissiveFactor[2], THREE.LinearSRGBColorSpace
      );
      mat.emissiveIntensity = 1.0;
    }
    const tag = m.extras?.textureTag;
    if (tag) {
      const maps = getPBRMaps(tag);
      if (maps?.bumpMap) {
        mat.bumpMap = maps.bumpMap;
        mat.bumpScale = maps.bumpScale;
      }
    }
    if (m.extras?.windSway > 0) {
      applyWindShader(mat, m.extras.windSway);
    }
    return mat;
  });

  const meshDefs = (gltf.meshes || []).map((meshDef) => {
    const prims = meshDef.primitives.map((prim) => {
      const geo = new THREE.BufferGeometry();
      const pos = readAccessor(gltf, binBuffer, prim.attributes.POSITION);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      if (prim.attributes.NORMAL !== undefined) {
        const norm = readAccessor(gltf, binBuffer, prim.attributes.NORMAL);
        geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      } else {
        geo.computeVertexNormals();
      }
      if (prim.attributes.TEXCOORD_0 !== undefined) {
        const uv = readAccessor(gltf, binBuffer, prim.attributes.TEXCOORD_0);
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      }
      if (prim.indices !== undefined) {
        const idx = readAccessor(gltf, binBuffer, prim.indices);
        geo.setIndex(new THREE.BufferAttribute(idx, 1));
      }
      geo.computeBoundingSphere();
      return { geo, material: materials[prim.material ?? 0] };
    });
    return { name: meshDef.name || 'Mesh', prims };
  });

  function buildNode(nodeIndex) {
    const def = gltf.nodes[nodeIndex];
    const obj = new THREE.Group();
    obj.name = def.name || `Node_${nodeIndex}`;
    if (def.translation) obj.position.fromArray(def.translation);
    if (def.rotation) obj.quaternion.fromArray(def.rotation);
    if (def.scale) obj.scale.fromArray(def.scale);

    if (def.mesh !== undefined) {
      const mDef = meshDefs[def.mesh];
      for (const prim of mDef.prims) {
        const mesh = new THREE.Mesh(prim.geo, prim.material);
        mesh.castShadow = !prim.material.transparent;
        mesh.receiveShadow = true;
        obj.add(mesh);
      }
    }

    if (def.children) {
      for (const childIdx of def.children) {
        obj.add(buildNode(childIdx));
      }
    }
    return obj;
  }

  const root = new THREE.Group();
  root.name = gltf.scenes?.[0]?.name || 'GLBRoot';
  const rootIndices = gltf.scenes?.[gltf.scene || 0]?.nodes || [];
  for (const idx of rootIndices) {
    root.add(buildNode(idx));
  }
  return root;
}

export async function loadGLB(url) {
  if (!modelCache.has(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load GLB (${res.status}): ${url}`);
    const buf = await res.arrayBuffer();
    const parsed = parseGLB(buf);
    modelCache.set(url, parsed);
  }
  return modelCache.get(url).clone(true);
}

export function getCachedTemplate(url) {
  return modelCache.get(url) || null;
}

export async function preloadGLBs(urls, onProgress = null) {
  let done = 0;
  await Promise.all(
    urls.map(async (url) => {
      await loadGLB(url);
      done++;
      if (onProgress) onProgress(done / urls.length, url);
    })
  );
}

export function disposeGLBCache() {
  for (const group of modelCache.values()) {
    group.traverse((obj) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose();
      }
    });
  }
  modelCache.clear();
}
