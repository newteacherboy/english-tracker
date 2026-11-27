import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';
import { loadGLB, getCachedTemplate, globalWindTime } from './glb-loader.mjs';
import { getPBRMaps } from './pbr-textures.mjs';

/**
 * Papi Hazine Avı — Multi-Island 3D World Engine (All 6 Distinct Biomes!)
 * Zero-leak biome switching: disposes all biome meshes/geometries when changing islands
 * so mobile RAM & GPU VRAM stay rock-steady across hours of play.
 *
 * Biomes:
 *  1. papagan-adasi   (Free)        — Golden Beach, Harbor Pier, Sailboat, Orchard, Cottage, Waterfall
 *  2. zumrut-ormani   (Free)        — Rainforest Canopy, Giant Jungle Trees, Glowing Mushrooms, Totem
 *  3. mercan-korfezi  (Free)        — Turquoise Coral Atoll, Red-White Lighthouse, Coral Reefs, Lagoon
 *  4. kayip-sehir     (Premium Pro) — Sandstone Desert Oasis, Stepped Pyramid, Hieroglyph Obelisks
 *  5. kristal-daglari (Premium Pro) — Snow-Dusted Alpine Cliffs, Giant Amethyst Spires, Glacial Stream
 *  6. antik-tapinak   (Premium Pro) — Volcanic Obsidian & Gold Grand Temple, Blazing Braziers, Sacred Gate
 */

const MODEL_BASE = './assets/models/';

export const BIOME_CONFIGS = {
  'papagan-adasi': {
    models: ['pier.glb', 'sailboat.glb', 'signpost.glb', 'cottage.glb', 'table.glb', 'wooden_bridge.glb', 'stepping_stone.glb', 'ancient_arch.glb', 'brazier.glb', 'treasure_chest.glb', 'rabbit.glb', 'fruit_tree.glb', 'palm_tree.glb', 'grass_tuft.glb', 'fern_bush.glb'],
    palette: { seaBed: '#b89b67', shore: '#f5da98', mid1: '#44b342', mid2: '#6dd14f', high: '#7a8279', path: '#e3c38d' },
    water: { shallow: '#3af0de', mid: '#129ac9', deep: '#0a4b87' },
    sky: { top: '#1e82e8', mid: '#74d4f7', horizon: '#fff1c7', fog: '#9fe3f5', sun: '#fff1c7' },
    distantColor: '#458899',
    relief: 1.0, lagoonCarve: 0
  },
  'zumrut-ormani': {
    models: ['signpost.glb', 'cottage.glb', 'table.glb', 'wooden_bridge.glb', 'stepping_stone.glb', 'ancient_arch.glb', 'brazier.glb', 'treasure_chest.glb', 'rabbit.glb', 'jungle_tree.glb', 'mushroom.glb', 'totem.glb', 'grass_tuft.glb', 'fern_bush.glb'],
    palette: { seaBed: '#3d5c3a', shore: '#7da352', mid1: '#1d8a3e', mid2: '#2eb854', high: '#4c5e4a', path: '#9e7c50' },
    water: { shallow: '#34e89e', mid: '#128f6b', deep: '#094a3d' },
    sky: { top: '#11695c', mid: '#63d4a7', horizon: '#d9fae5', fog: '#8de3be', sun: '#eaffd6' },
    distantColor: '#25664b',
    relief: 1.22, lagoonCarve: 0
  },
  'mercan-korfezi': {
    models: ['pier.glb', 'sailboat.glb', 'lighthouse.glb', 'coral_reef.glb', 'signpost.glb', 'table.glb', 'wooden_bridge.glb', 'stepping_stone.glb', 'ancient_arch.glb', 'treasure_chest.glb', 'rabbit.glb', 'palm_tree.glb', 'grass_tuft.glb', 'fern_bush.glb'],
    palette: { seaBed: '#deb887', shore: '#fff0bf', mid1: '#5fd475', mid2: '#8ae381', high: '#c9937b', path: '#f7e3ad' },
    water: { shallow: '#52fff0', mid: '#0db8db', deep: '#095a9c' },
    sky: { top: '#1488f5', mid: '#73e0ff', horizon: '#fff4d9', fog: '#a6ecff', sun: '#fff6d6' },
    distantColor: '#3699b0',
    relief: 0.78, lagoonCarve: 1 // Extra shallow coral lagoon coves!
  },
  'kayip-sehir': {
    models: ['pyramid_ruin.glb', 'obelisk.glb', 'signpost.glb', 'table.glb', 'wooden_bridge.glb', 'stepping_stone.glb', 'ancient_arch.glb', 'brazier.glb', 'treasure_chest.glb', 'rabbit.glb', 'palm_tree.glb', 'grass_tuft.glb'],
    palette: { seaBed: '#a67b44', shore: '#edc57e', mid1: '#d9a45b', mid2: '#e8b96f', high: '#9e7142', path: '#c99559' },
    water: { shallow: '#38e8d4', mid: '#148fa8', deep: '#0d4e6b' },
    sky: { top: '#2864b8', mid: '#eb9f65', horizon: '#ffe3a3', fog: '#f2c991', sun: '#ffd98c' },
    distantColor: '#9c7349',
    relief: 1.15, lagoonCarve: 0
  },
  'kristal-daglari': {
    models: ['giant_crystal.glb', 'pine_snow.glb', 'signpost.glb', 'cottage.glb', 'table.glb', 'wooden_bridge.glb', 'stepping_stone.glb', 'ancient_arch.glb', 'brazier.glb', 'treasure_chest.glb', 'rabbit.glb', 'grass_tuft.glb'],
    palette: { seaBed: '#536280', shore: '#b8cde0', mid1: '#dcebf7', mid2: '#f0f7ff', high: '#6d5e8c', path: '#9aa8bf' },
    water: { shallow: '#73f0ff', mid: '#3a8ee6', deep: '#243c8a' },
    sky: { top: '#2b1e66', mid: '#6285e8', horizon: '#c9f2ff', fog: '#b3dbf5', sun: '#e6f5ff' },
    distantColor: '#566494',
    relief: 1.35, lagoonCarve: 0
  },
  'antik-tapinak': {
    models: ['grand_temple.glb', 'obelisk.glb', 'signpost.glb', 'table.glb', 'wooden_bridge.glb', 'stepping_stone.glb', 'ancient_arch.glb', 'brazier.glb', 'treasure_chest.glb', 'rabbit.glb', 'palm_tree.glb', 'fern_bush.glb'],
    palette: { seaBed: '#3b3345', shore: '#c9a059', mid1: '#4d6b45', mid2: '#6e8c4f', high: '#363342', path: '#e0b860' },
    water: { shallow: '#47f2d4', mid: '#18849e', deep: '#17284a' },
    sky: { top: '#2d1b59', mid: '#d96b59', horizon: '#ffd275', fog: '#ebb083', sun: '#ffca6b' },
    distantColor: '#4f3b5c',
    relief: 1.2, lagoonCarve: 0
  }
};

export class IslandWorld {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.WATER_LEVEL = 0.0;
    this.PLAY_RADIUS = 37.5;
    this.currentBiomeId = null;

    this.biomeGroup = new THREE.Group();
    this.missionPropsGroup = new THREE.Group();
    this.fxGroup = new THREE.Group();
    this.scene.add(this.biomeGroup, this.missionPropsGroup, this.fxGroup);

    this.colliders = [];
    this.steppingStones = [];
    this.butterflies = [];
    this.clouds = [];
    this.mistParticles = [];
    this.sparklePool = [];
    this.braziers = [];
    this.landmarks = {};
    this.uniforms = { uTime: { value: 0 } };
    this.envRT = null;
    this.disposables = []; // Geometries & materials unique to current biome
  }

  /** Continuous organic terrain heightfield adapted to active island biome */
  getTerrainHeight(x, z) {
    const cfg = BIOME_CONFIGS[this.currentBiomeId] || BIOME_CONFIGS['papagan-adasi'];
    const r = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const coastMod = 1.0 + 0.13 * Math.sin(angle * 3.0 + 0.5) + 0.08 * Math.cos(angle * 5.0 - 0.7);
    const islandR = 32.0 * coastMod;
    const normR = r / islandR;

    let h = 2.05 * cfg.relief * Math.max(0, 1 - normR * normR);
    if (normR > 0.86) {
      h -= (normR - 0.86) * 6.2;
    }

    h += Math.sin(x * 0.12) * Math.cos(z * 0.11) * 0.52 * cfg.relief * Math.max(0, 1 - normR * 0.85);
    h += Math.sin(x * 0.25 + 1.1) * Math.sin(z * 0.22) * 0.20 * Math.max(0, 1 - normR);

    // Extra shallow turquoise tidal lagoon for Coral Bay
    if (cfg.lagoonCarve && Math.hypot(x - 10.0, z - 8.5) < 7.0) {
      const ld = Math.hypot(x - 10.0, z - 8.5) / 7.0;
      h = THREE.MathUtils.lerp(-0.42, h, ld * ld);
    }

    // Northwest Waterfall Cliff Plateau
    const cliffDist = Math.hypot((x + 11.5) * 0.82, (z + 20.5) * 1.0);
    if (cliffDist < 12.5) {
      const t = Math.max(0, 1 - cliffDist / 12.5);
      h += t * t * (3 - 2 * t) * 7.2;
    }

    // River channel
    const streamCenterX = -9.8 - Math.sin((z + 12) * 0.11) * 2.8;
    if (z > -15.5 && z < 25.0) {
      const dx = Math.abs(x - streamCenterX);
      const streamHalfW = 3.25;
      if (dx < streamHalfW + 2.2) {
        const s = 1 - Math.max(0, (dx - streamHalfW * 0.4) / (streamHalfW + 1.8));
        const smooth = s * s * (3 - 2 * s);
        h = THREE.MathUtils.lerp(h, -0.78, smooth * 0.94);
      }
    }

    // Flatten East Sanctuary / Village Terrace (13.0, -3.0)
    const cotDist = Math.hypot(x - 13.0, z + 3.0);
    if (cotDist < 7.8) {
      const t = Math.max(0, 1 - cotDist / 7.8);
      h = THREE.MathUtils.lerp(h, 1.82, t * t * (3 - 2 * t));
    }

    // Flatten Northeast Ancient Courtyard (6.5, -18.5)
    const archDist = Math.hypot(x - 6.5, z + 18.5);
    if (archDist < 7.0) {
      const t = Math.max(0, 1 - archDist / 7.0);
      h = THREE.MathUtils.lerp(h, 2.05, t * t * (3 - 2 * t));
    }

    // Flatten South Harbor Cove (2.0, 20.5)
    const harborDist = Math.hypot(x - 2.0, z - 20.5);
    if (harborDist < 6.2) {
      const t = Math.max(0, 1 - harborDist / 6.2);
      h = THREE.MathUtils.lerp(h, 0.85, t * t * (3 - 2 * t));
    }

    return h;
  }

  getWalkableHeight(x, z) {
    let h = this.getTerrainHeight(x, z);

    // 1. Arched Wooden Bridge at (-10.8, 2.0)
    const bx = x - (-10.8);
    const bz = z - 2.0;
    if (Math.abs(bx) <= 4.4 && Math.abs(bz) <= 1.45) {
      const t = (bx + 4.4) / 8.8;
      const deckY = 0.82 + Math.sin(t * Math.PI) * 0.78;
      if (deckY > h) h = deckY;
    }

    // 2. South Harbor Pier (present on Parrot Island & Coral Bay)
    if (this.landmarks.pier) {
      const px = x - 2.0;
      const pz = z - 27.2;
      if (Math.abs(px) <= 1.52 && Math.abs(pz) <= 4.45) {
        if (0.96 > h) h = 0.96;
      }
    }

    // 3. Stepping Stones across north stream
    for (const st of this.steppingStones) {
      if (Math.hypot(x - st.x, z - st.z) <= st.r && st.y > h) h = st.y;
    }

    return h;
  }

  addCollider(x, z, r, tag = null) {
    const c = { x, z, r, tag, active: true };
    this.colliders.push(c);
    return c;
  }

  resolveCollisions(x, z, playerR) {
    let rx = x, rz = z;
    for (const c of this.colliders) {
      if (!c.active) continue;
      const dx = rx - c.x;
      const dz = rz - c.z;
      const dist = Math.hypot(dx, dz);
      const minDist = c.r + playerR;
      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist) / dist;
        rx += dx * push;
        rz += dz * push;
      }
    }
    return { x: rx, z: rz };
  }

  /** One-time shared lighting, sky dome, water shader, clouds, waterfall & FX setup */
  async initCore(quality = 'medium') {
    this._buildPMREMEnvironment();
    this._buildSkyAndLighting(quality);
    this._buildOceanShader();
    this._buildWaterfall();
    this._buildButterflies();
    this._buildSparklePool();
    await this.loadBiome('papagan-adasi', quality);
  }

  /** Cleanly disposes previous island meshes & builds the requested Island Biome! */
  async loadBiome(biomeId, quality = 'medium') {
    const targetId = BIOME_CONFIGS[biomeId] ? biomeId : 'papagan-adasi';
    if (this.currentBiomeId === targetId && this.biomeGroup.children.length > 0) return;

    this._clearBiomeGroup();
    this.currentBiomeId = targetId;
    const cfg = BIOME_CONFIGS[targetId];

    // Lazy-preload only the GLBs needed by this island!
    await Promise.all(cfg.models.map((m) => loadGLB(`${MODEL_BASE}${m}`)));

    // Apply biome water & sky base palette
    this.oceanUniforms.uShallow.value.set(cfg.water.shallow);
    this.oceanUniforms.uMid.value.set(cfg.water.mid);
    this.oceanUniforms.uDeep.value.set(cfg.water.deep);

    this._buildTerrainMesh(cfg);
    this._buildHorizonIslands(cfg);
    await this._buildBiomeLandmarks(targetId, cfg);
    this._buildInstancedFoliage(targetId, quality);
    this.setAtmosphere('default');
  }

  _clearBiomeGroup() {
    while (this.biomeGroup.children.length > 0) {
      this.biomeGroup.remove(this.biomeGroup.children[0]);
    }
    for (const d of this.disposables) {
      d?.dispose?.();
    }
    this.disposables = [];
    this.colliders = [];
    this.steppingStones = [];
    this.braziers = [];
    this.landmarks = { waterfallPos: new THREE.Vector3(-10.8, 0.5, -13.2) };
  }

  _buildPMREMEnvironment() {
    if (!this.renderer) return;
    try {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const envScene = new THREE.Scene();
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(20, 16, 12),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: `
            varying vec3 vP;
            void main(){
              float y = normalize(vP).y;
              vec3 sky = mix(vec3(0.98, 0.92, 0.76), vec3(0.18, 0.62, 0.95), smoothstep(0.0, 0.7, y));
              vec3 ground = mix(vec3(0.12, 0.68, 0.72), vec3(0.98, 0.92, 0.76), smoothstep(-0.6, 0.0, y));
              gl_FragColor = vec4(y >= 0.0 ? sky : ground, 1.0);
            }
          `
        })
      );
      envScene.add(dome);
      const sunOrb = new THREE.Mesh(
        new THREE.SphereGeometry(2.2, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#fffbe6' })
      );
      sunOrb.position.set(8, 11, 6);
      envScene.add(sunOrb);

      this.envRT = pmrem.fromScene(envScene, 0.03);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = 0.72;
      pmrem.dispose();
    } catch (_) {}
  }

  _buildSkyAndLighting(quality) {
    this.scene.fog = new THREE.FogExp2('#9ee3f5', 0.0062);

    const skyGeo = new THREE.SphereGeometry(220, 28, 18);
    this.skyUniforms = {
      uTop:     { value: new THREE.Color('#1a7de6') },
      uMid:     { value: new THREE.Color('#6cd2f7') },
      uHorizon: { value: new THREE.Color('#fff2c9') },
      uSunDir:  { value: new THREE.Vector3(28, 36, 20).normalize() }
    };
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop, uMid, uHorizon, uSunDir;
        varying vec3 vWorldPos;
        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y;
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.04, 0.26, h));
          col = mix(col, uTop, smoothstep(0.24, 0.82, h));
          float sunDot = max(dot(dir, uSunDir), 0.0);
          col += vec3(1.0, 0.94, 0.76) * pow(sunDot, 24.0) * 0.35;
          col += vec3(1.0, 0.98, 0.90) * smoothstep(0.996, 0.9992, sunDot) * 0.9;
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.fxGroup.add(new THREE.Mesh(skyGeo, skyMat));

    this.hemiLight = new THREE.HemisphereLight('#fff8e6', '#297a6c', 1.25);
    this.fxGroup.add(this.hemiLight);

    const sun = new THREE.DirectionalLight('#fff1c7', 2.4);
    sun.position.set(28, 38, 22);
    sun.castShadow = true;
    const mapSize = quality === 'low' ? 1024 : quality === 'medium' ? 1024 : 1536;
    sun.shadow.mapSize.set(mapSize, mapSize);
    sun.shadow.camera.near = 4;
    sun.shadow.camera.far = 135;
    const d = 42;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0006;
    this.fxGroup.add(sun);
    this.sunLight = sun;

    const fill = new THREE.DirectionalLight('#7ce8ff', 0.48);
    fill.position.set(-28, 16, -20);
    this.fxGroup.add(fill);

    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92 });
    const puffGeo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < 9; i++) {
      const cg = new THREE.Group();
      const angle = (i / 9) * Math.PI * 2;
      const dist = 58 + (i % 3) * 18;
      cg.position.set(Math.cos(angle) * dist, 24 + (i % 3) * 5, Math.sin(angle) * dist);
      for (let p = 0; p < 4; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set((p - 1.5) * 2.4, (p % 2) * 0.7, (p % 3 - 1) * 1.0);
        m.scale.set(2.8 + (p % 2), 1.5, 2.1);
        cg.add(m);
      }
      cg.userData = { speed: 0.18 + (i % 3) * 0.08, angle, dist };
      this.fxGroup.add(cg);
      this.clouds.push(cg);
    }
  }

  setAtmosphere(mood = 'default') {
    const cfg = BIOME_CONFIGS[this.currentBiomeId] || BIOME_CONFIGS['papagan-adasi'];
    if (mood === 'sunset') {
      this.skyUniforms.uTop.value.set('#3b3285');
      this.skyUniforms.uMid.value.set('#e8786b');
      this.skyUniforms.uHorizon.value.set('#ffd27d');
      this.sunLight.color.set('#ffbe73');
      this.sunLight.position.set(-32, 22, 24);
      this.scene.fog.color.set('#f2b494');
    } else if (mood === 'noon') {
      this.skyUniforms.uTop.value.set(cfg.sky.top);
      this.skyUniforms.uMid.value.set(cfg.sky.mid);
      this.skyUniforms.uHorizon.value.set('#e8fbff');
      this.sunLight.color.set('#fff8e0');
      this.sunLight.position.set(18, 44, 16);
      this.scene.fog.color.set(cfg.sky.fog);
    } else {
      this.skyUniforms.uTop.value.set(cfg.sky.top);
      this.skyUniforms.uMid.value.set(cfg.sky.mid);
      this.skyUniforms.uHorizon.value.set(cfg.sky.horizon);
      this.sunLight.color.set(cfg.sky.sun);
      this.sunLight.position.set(28, 36, 22);
      this.scene.fog.color.set(cfg.sky.fog);
    }
    this.skyUniforms.uSunDir.value.copy(this.sunLight.position).normalize();
  }

  _buildTerrainMesh(cfg) {
    const size = 144;
    const segs = 136; // Crisp organic shape while keeping vertex count light on phones
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cSeaBed = new THREE.Color(cfg.palette.seaBed);
    const cShore  = new THREE.Color(cfg.palette.shore);
    const cMid1   = new THREE.Color(cfg.palette.mid1);
    const cMid2   = new THREE.Color(cfg.palette.mid2);
    const cHigh   = new THREE.Color(cfg.palette.high);
    const cPath   = new THREE.Color(cfg.palette.path);
    const tmp     = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.getTerrainHeight(x, z);
      pos.setY(i, h);

      if (h < 0.08) {
        tmp.copy(cSeaBed);
      } else if (h < 0.72) {
        tmp.copy(cSeaBed).lerp(cShore, (h - 0.08) / 0.64);
      } else if (h < 1.25) {
        tmp.copy(cShore).lerp(cMid1, (h - 0.72) / 0.53);
      } else if (h < 3.0) {
        const patch = 0.5 + 0.5 * Math.sin(x * 0.21) * Math.cos(z * 0.19);
        tmp.copy(cMid1).lerp(cMid2, patch);
      } else {
        tmp.copy(cMid1).lerp(cHigh, Math.min(1, (h - 3.0) / 2.6));
      }

      const onSouthTrail = z > -18 && z < 23 && Math.abs(x - (2.0 + Math.sin(z * 0.14) * 2.2)) < 1.55 && h > 0.55;
      const onEastWestTrail = x > -22 && x < 14.5 && Math.abs(z - 2.0) < 1.55 && h > 0.55;
      const onCottageBranch = x > 2 && x < 14 && Math.abs(z - (-3.0 + (13 - x) * 0.45)) < 1.45 && h > 0.55;
      if (onSouthTrail || onEastWestTrail || onCottageBranch) {
        tmp.lerp(cPath, 0.78);
      }

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const detail = getPBRMaps('terrain');
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: detail?.map || null,
      bumpMap: detail?.bumpMap || null,
      bumpScale: detail?.bumpScale ?? 0.04,
      roughness: 0.86,
      metalness: 0.02
    });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.biomeGroup.add(terrain);
    this.disposables.push(geo, mat);
  }

  _buildOceanShader() {
    const geo = new THREE.PlaneGeometry(360, 360, 72, 72);
    geo.rotateX(-Math.PI / 2);

    this.oceanUniforms = {
      uTime: this.uniforms.uTime,
      uShallow: { value: new THREE.Color('#3af0de') },
      uMid:     { value: new THREE.Color('#129ac9') },
      uDeep:    { value: new THREE.Color('#0a4b87') },
      uSunDir:  this.skyUniforms.uSunDir
    };

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: this.oceanUniforms,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float w = sin(wp.x * 0.28 + uTime * 1.65) * 0.085 + cos(wp.z * 0.34 + uTime * 1.3) * 0.075;
          wp.y += w;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uShallow, uMid, uDeep, uSunDir;
        varying vec3 vWorldPos;
        void main() {
          float dist = length(vWorldPos.xz);
          float depthT = smoothstep(26.0, 82.0, dist);
          vec3 col = mix(uShallow, uMid, smoothstep(16.0, 42.0, dist));
          col = mix(col, uDeep, depthT);

          float c1 = sin(vWorldPos.x * 0.85 + uTime * 2.1) * cos(vWorldPos.z * 0.8 - uTime * 1.5);
          float c2 = sin((vWorldPos.x - vWorldPos.z) * 1.35 + uTime * 2.4);
          float caustic = smoothstep(0.35, 0.95, c1 * 0.5 + c2 * 0.5 + 0.5);
          col += vec3(0.22, 0.55, 0.58) * caustic * (1.0 - smoothstep(10.0, 38.0, dist)) * 0.30;

          vec3 normal = normalize(vec3((c1 + c2) * 0.075, 1.0, (c1 - c2) * 0.075));
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.2);
          col = mix(col, vec3(0.78, 0.96, 1.0), fresnel * 0.44);

          vec3 halfV = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(normal, halfV), 0.0), 72.0);
          col += vec3(1.0, 0.95, 0.80) * spec * 0.82;

          float surf = sin(dist * 1.4 - uTime * 2.7) * 0.5 + 0.5;
          float foamBand = (1.0 - smoothstep(29.0, 35.5, dist)) * smoothstep(24.0, 31.0, dist);
          col = mix(col, vec3(0.96, 0.99, 1.0), foamBand * surf * 0.55);

          gl_FragColor = vec4(col, mix(0.80, 0.96, depthT));
        }
      `
    });
    const ocean = new THREE.Mesh(geo, mat);
    ocean.position.y = this.WATER_LEVEL;
    this.fxGroup.add(ocean);
  }

  _buildHorizonIslands(cfg) {
    const stackGeo = new THREE.DodecahedronGeometry(1, 2);
    const stackMat = new THREE.MeshStandardMaterial({ color: cfg.distantColor, roughness: 0.92 });
    const distantIslands = [
      [-92, -82, 20, 13], [98, -74, 24, 15], [112, 48, 17, 11],
      [-104, 62, 21, 12], [18, -125, 28, 16]
    ];
    for (const [ix, iz, r, h] of distantIslands) {
      const m = new THREE.Mesh(stackGeo, stackMat);
      m.position.set(ix, h * 0.25, iz);
      m.scale.set(r, h * 0.65, r * 0.78);
      m.rotation.y = ix * 0.1;
      this.biomeGroup.add(m);
    }
    this.disposables.push(stackGeo, stackMat);
  }

  _buildWaterfall() {
    const wfGeo = new THREE.PlaneGeometry(4.2, 7.6, 10, 16);
    const pos = wfGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (3.8 - y) / 7.6;
      pos.setZ(i, Math.sin(t * Math.PI * 0.5) * 2.0);
    }
    wfGeo.computeVertexNormals();

    const wfMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: { uTime: this.uniforms.uTime },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float flow = vUv.y * 5.5 + uTime * 3.6;
          float s1 = sin(vUv.x * 28.0 + sin(flow * 1.6)) * 0.5 + 0.5;
          float s2 = sin(vUv.x * 46.0 - flow * 2.3) * 0.5 + 0.5;
          float foam = smoothstep(0.42, 0.95, s1 * 0.6 + s2 * 0.5);
          float splash = 1.0 - smoothstep(0.0, 0.24, vUv.y);
          float edge = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
          vec3 col = mix(vec3(0.32, 0.88, 0.98), vec3(0.97, 1.0, 1.0), clamp(foam * 0.78 + splash, 0.0, 1.0));
          gl_FragColor = vec4(col, edge * (0.76 + splash * 0.22));
        }
      `
    });
    const wf = new THREE.Mesh(wfGeo, wfMat);
    wf.position.set(-10.8, 3.4, -16.8);
    wf.rotation.y = 0.12;
    this.fxGroup.add(wf);

    const mistGeo = new THREE.SphereGeometry(0.52, 8, 6);
    const mistMat = new THREE.MeshBasicMaterial({ color: '#e8fcff', transparent: true, opacity: 0.38 });
    for (let i = 0; i < 12; i++) {
      const p = new THREE.Mesh(mistGeo, mistMat);
      p.userData = {
        phase: Math.random() * Math.PI * 2,
        ox: -10.8 + (Math.random() - 0.5) * 4.0,
        oz: -14.8 + (Math.random() - 0.5) * 2.2
      };
      this.fxGroup.add(p);
      this.mistParticles.push(p);
    }
  }

  async _buildBiomeLandmarks(biomeId, cfg) {
    // ── Shared Functional Landmarks across Islands (Signpost, Bridge, Stepping Stones, Arch, Chest, Rabbit, Table) ──
    const signpost = await loadGLB(`${MODEL_BASE}signpost.glb`);
    signpost.position.set(1.6, this.getTerrainHeight(1.6, 5.2) - 0.05, 5.2);
    signpost.rotation.y = -0.4;
    this.biomeGroup.add(signpost);
    this.landmarks.signpost = signpost;
    this.addCollider(1.6, 5.2, 0.45);

    const bridge = await loadGLB(`${MODEL_BASE}wooden_bridge.glb`);
    bridge.position.set(-10.8, 0.82, 2.0);
    bridge.rotation.y = Math.PI / 2;
    this.biomeGroup.add(bridge);
    this.landmarks.bridge = bridge;

    const stoneCoords = [[-7.2, -6.8], [-9.3, -7.2], [-11.4, -6.9], [-13.5, -7.3]];
    for (const [sx, sz] of stoneCoords) {
      const st = await loadGLB(`${MODEL_BASE}stepping_stone.glb`);
      st.position.set(sx, 0.08, sz);
      st.rotation.y = sx * 0.7;
      this.biomeGroup.add(st);
      this.steppingStones.push({ x: sx, z: sz, y: 0.28, r: 1.05 });
    }

    const table = await loadGLB(`${MODEL_BASE}table.glb`);
    table.position.set(7.8, this.getTerrainHeight(7.8, 3.6) - 0.04, 3.6);
    table.rotation.y = 0.3;
    this.biomeGroup.add(table);
    this.landmarks.table = table;
    this.addCollider(7.8, 3.6, 1.25);

    const arch = await loadGLB(`${MODEL_BASE}ancient_arch.glb`);
    arch.position.set(6.5, this.getTerrainHeight(6.5, -18.5) - 0.06, -18.5);
    arch.rotation.y = -0.12;
    this.biomeGroup.add(arch);
    this.landmarks.arch = arch;
    this.landmarks.magicGate = arch.getObjectByName('MagicGate');
    this.landmarks.gateOpen = true;
    this.addCollider(4.45, -18.5, 0.9);
    this.addCollider(8.55, -18.5, 0.9);
    this.landmarks.gateCollider = this.addCollider(6.5, -18.5, 1.35, 'magic_gate');
    this.landmarks.gateCollider.active = false;

    const chest = await loadGLB(`${MODEL_BASE}treasure_chest.glb`);
    chest.position.set(6.5, this.getTerrainHeight(6.5, -14.2), -14.2);
    this.biomeGroup.add(chest);
    this.landmarks.chest = chest;
    this.landmarks.chestLidPivot = chest.getObjectByName('ChestLidPivot');
    this.landmarks.chestOpenProgress = 0;
    this.landmarks.chestTargetOpen = 0;

    const rabbit = await loadGLB(`${MODEL_BASE}rabbit.glb`);
    const rabY = this.getTerrainHeight(8.8, -11.5);
    rabbit.position.set(8.8, rabY, -11.5);
    rabbit.rotation.y = -0.6;
    rabbit.userData.baseY = rabY;
    this.biomeGroup.add(rabbit);
    this.landmarks.rabbit = rabbit;

    // ── East Sanctuary Hero Structure per Biome! ──
    if (biomeId === 'mercan-korfezi') {
      const lh = await loadGLB(`${MODEL_BASE}lighthouse.glb`);
      lh.position.set(13.0, this.getTerrainHeight(13.0, -3.0) - 0.06, -3.0);
      lh.rotation.y = -0.5;
      this.biomeGroup.add(lh);
      this.landmarks.cottage = lh;
      this.addCollider(13.0, -3.0, 2.1);
    } else if (biomeId === 'kayip-sehir') {
      const pyr = await loadGLB(`${MODEL_BASE}pyramid_ruin.glb`);
      pyr.position.set(13.0, this.getTerrainHeight(13.0, -3.0) - 0.06, -3.0);
      pyr.rotation.y = -0.65;
      this.biomeGroup.add(pyr);
      this.landmarks.cottage = pyr;
      this.addCollider(13.0, -3.0, 3.6);
    } else if (biomeId === 'antik-tapinak') {
      const tmp = await loadGLB(`${MODEL_BASE}grand_temple.glb`);
      tmp.position.set(13.0, this.getTerrainHeight(13.0, -3.0) - 0.06, -3.0);
      tmp.rotation.y = -0.65;
      this.biomeGroup.add(tmp);
      this.landmarks.cottage = tmp;
      this.addCollider(13.0, -3.0, 3.8);
    } else {
      const cottage = await loadGLB(`${MODEL_BASE}cottage.glb`);
      cottage.position.set(13.0, this.getTerrainHeight(13.0, -3.0) - 0.05, -3.0);
      cottage.rotation.y = -0.65;
      this.biomeGroup.add(cottage);
      this.landmarks.cottage = cottage;
      this.landmarks.doorPivot = cottage.getObjectByName('DoorPivot');
      this.landmarks.doorOpenProgress = 0;
      this.landmarks.doorTargetOpen = 0;
      this.addCollider(13.0, -3.0, 2.75);
    }

    // ── South Harbor Pier & Sailboat on Coastal Islands (Parrot Island & Coral Bay) ──
    if (biomeId === 'papagan-adasi' || biomeId === 'mercan-korfezi') {
      const pier = await loadGLB(`${MODEL_BASE}pier.glb`);
      pier.position.set(2.0, 0.0, 27.2);
      this.biomeGroup.add(pier);
      this.landmarks.pier = pier;

      const boat = await loadGLB(`${MODEL_BASE}sailboat.glb`);
      boat.position.set(5.4, -0.05, 29.4);
      boat.rotation.y = -0.35;
      this.biomeGroup.add(boat);
      this.landmarks.sailboat = boat;
      this.addCollider(5.4, 29.4, 2.2);
    }

    // ── Braziers where supported ──
    if (cfg.models.includes('brazier.glb')) {
      const brazierSpots = biomeId === 'antik-tapinak'
        ? [[3.4, -16.2], [9.6, -16.2], [8.5, 0.5], [15.5, 2.0]]
        : [[3.4, -16.2], [9.6, -16.2]];
      for (const [bx, bz] of brazierSpots) {
        const brz = await loadGLB(`${MODEL_BASE}brazier.glb`);
        brz.position.set(bx, this.getTerrainHeight(bx, bz) - 0.04, bz);
        this.biomeGroup.add(brz);
        this.braziers.push({ root: brz, flame: brz.getObjectByName('FlameNode'), phase: bx });
        this.addCollider(bx, bz, 0.55);
      }
    }

    // ── Biome-Specific Trees, Spires, Corals, Mushrooms & Monuments! ──
    const primarySpots = [
      [-19.5, 16.5, 1.1], [-23.2, 6.5, 0.98], [-21.5, -8.5, 1.15],
      [21.2, 14.2, 1.10], [23.8, 1.5, 1.02],  [20.4, -12.5, 1.18],
      [11.5, 21.5, 1.04], [-6.8, 22.8, 1.08], [14.5, -19.2, 1.12],
      [-2.5, -23.5, 0.96],[-18.5, -18.5, 1.08],[17.5, 16.8, 0.94]
    ];
    const secondarySpots = [
      [17.5, 3.2, 1.05], [18.8, -6.2, 0.95], [10.5, -9.8, 1.0],
      [-18.2, 5.8, 1.08],[-17.5, -2.8, 0.96],[-3.8, -12.2, 0.92],
      [-5.2, 13.5, 0.95],[9.5, 12.8, 1.02]
    ];

    const treeModel = biomeId === 'zumrut-ormani' ? 'jungle_tree.glb'
      : biomeId === 'kristal-daglari' ? 'pine_snow.glb'
      : 'palm_tree.glb';

    for (const [px, pz, scale] of primarySpots) {
      const m = await loadGLB(`${MODEL_BASE}${treeModel}`);
      m.position.set(px, this.getTerrainHeight(px, pz) - 0.12, pz);
      m.scale.setScalar(scale);
      m.rotation.y = px * 0.5 + pz * 0.3;
      this.biomeGroup.add(m);
      this.addCollider(px, pz, 0.62 * scale);
    }

    const accentModel = biomeId === 'papagan-adasi' ? 'fruit_tree.glb'
      : biomeId === 'zumrut-ormani' ? 'mushroom.glb'
      : biomeId === 'mercan-korfezi' ? 'coral_reef.glb'
      : biomeId === 'kayip-sehir' ? 'obelisk.glb'
      : biomeId === 'kristal-daglari' ? 'giant_crystal.glb'
      : 'obelisk.glb';

    for (const [sx, sz, scale] of secondarySpots) {
      const m = await loadGLB(`${MODEL_BASE}${accentModel}`);
      m.position.set(sx, Math.max(this.getTerrainHeight(sx, sz) - 0.08, -0.25), sz);
      m.scale.setScalar(scale);
      m.rotation.y = sx * 0.8;
      this.biomeGroup.add(m);
      this.addCollider(sx, sz, 0.68 * scale);
    }

    if (biomeId === 'zumrut-ormani') {
      const totem = await loadGLB(`${MODEL_BASE}totem.glb`);
      totem.position.set(-4.5, this.getTerrainHeight(-4.5, 6.5) - 0.05, 6.5);
      totem.rotation.y = 0.5;
      this.biomeGroup.add(totem);
      this.addCollider(-4.5, 6.5, 0.8);
    }

    // Cliff Boulders
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const stoneMaps = getPBRMaps('stone');
    const rockMat = new THREE.MeshStandardMaterial({
      color: cfg.palette.high, roughness: 0.90,
      bumpMap: stoneMaps?.bumpMap || null, bumpScale: 0.05
    });
    const boulderSpots = [
      [-15.2, -17.5, 2.8, 2.1, 2.4], [-6.5, -18.2, 2.4, 1.9, 2.2],
      [-14.2, -12.8, 1.5, 1.1, 1.4], [-7.2, -13.2, 1.4, 1.0, 1.3],
      [11.2, -21.2, 2.0, 1.5, 1.8],  [1.8, -21.5, 1.8, 1.3, 1.6]
    ];
    for (const [rx, rz, sx, sy, sz] of boulderSpots) {
      const m = new THREE.Mesh(rockGeo, rockMat);
      m.position.set(rx, this.getTerrainHeight(rx, rz) + sy * 0.32, rz);
      m.scale.set(sx, sy, sz);
      m.rotation.set(rx * 0.2, rz * 0.3, 0.1);
      m.castShadow = true;
      m.receiveShadow = true;
      this.biomeGroup.add(m);
      this.addCollider(rx, rz, Math.max(sx, sz) * 0.72);
    }
    this.disposables.push(rockGeo, rockMat);
  }

  _buildInstancedFoliage(biomeId, quality) {
    const grassCount = quality === 'low' ? 140 : quality === 'medium' ? 280 : 480;
    const fernCount  = quality === 'low' ? 22  : quality === 'medium' ? 42  : 68;

    let seed = 4242 + biomeId.length * 97;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    const grassTpl = getCachedTemplate(`${MODEL_BASE}grass_tuft.glb`);
    let grassMeshSrc = null;
    grassTpl?.traverse((o) => { if (o.isMesh && !grassMeshSrc) grassMeshSrc = o; });
    if (grassMeshSrc && biomeId !== 'antik-tapinak') {
      const inst = new THREE.InstancedMesh(grassMeshSrc.geometry, grassMeshSrc.material, grassCount);
      inst.receiveShadow = true;
      let placed = 0;
      for (let i = 0; i < grassCount * 4 && placed < grassCount; i++) {
        const a = rand() * Math.PI * 2;
        const r = 2.5 + Math.sqrt(rand()) * 27.5;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const h = this.getTerrainHeight(x, z);
        if (h < 1.05 || h > 3.1) continue;
        if (Math.hypot(x - 13.0, z + 3.0) < 5.2) continue;
        if (Math.hypot(x - 6.5, z + 18.5) < 4.8) continue;
        if (Math.abs(z - 2.0) < 1.9 || Math.abs(x - 2.0) < 1.9) continue;

        dummy.position.set(x, h - 0.03, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        const s = 0.72 + rand() * 0.62;
        dummy.scale.set(s, s * (0.8 + rand() * 0.45), s);
        dummy.updateMatrix();
        inst.setMatrixAt(placed, dummy.matrix);

        if (biomeId === 'kayip-sehir') color.setHSL(0.11, 0.55, 0.58 + rand() * 0.1);
        else if (biomeId === 'kristal-daglari') color.setHSL(0.56, 0.45, 0.78 + rand() * 0.14);
        else color.setHSL(0.28 + (rand() - 0.5) * 0.05, 0.62, 0.46 + rand() * 0.14);
        inst.setColorAt(placed, color);
        placed++;
      }
      inst.count = placed;
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      this.biomeGroup.add(inst);
    }

    const fernTpl = getCachedTemplate(`${MODEL_BASE}fern_bush.glb`);
    const fernMeshes = [];
    fernTpl?.traverse((o) => { if (o.isMesh) fernMeshes.push(o); });
    if (fernMeshes.length > 0 && ['papagan-adasi', 'zumrut-ormani', 'mercan-korfezi', 'antik-tapinak'].includes(biomeId)) {
      const matrices = [];
      for (let i = 0; i < fernCount * 5 && matrices.length < fernCount; i++) {
        const a = rand() * Math.PI * 2;
        const r = 5.0 + Math.sqrt(rand()) * 25.0;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        const h = this.getTerrainHeight(x, z);
        if (h < 1.15 || h > 3.4) continue;
        if (Math.hypot(x - 13.0, z + 3.0) < 5.8) continue;
        if (Math.hypot(x - 6.5, z + 18.5) < 5.2) continue;
        if (Math.abs(z - 2.0) < 2.5 || Math.abs(x - 2.0) < 2.5) continue;

        dummy.position.set(x, h - 0.05, z);
        dummy.rotation.set(0, rand() * Math.PI * 2, 0);
        dummy.scale.setScalar(0.75 + rand() * 0.52);
        dummy.updateMatrix();
        matrices.push(dummy.matrix.clone());
      }
      for (const fm of fernMeshes) {
        const inst = new THREE.InstancedMesh(fm.geometry, fm.material, matrices.length);
        inst.castShadow = true;
        inst.receiveShadow = true;
        matrices.forEach((m, idx) => inst.setMatrixAt(idx, m));
        inst.instanceMatrix.needsUpdate = true;
        this.biomeGroup.add(inst);
      }
    }
  }

  _buildButterflies() {
    const wingGeo = new THREE.PlaneGeometry(0.24, 0.18);
    wingGeo.translate(0.12, 0, 0);
    const palette = ['#ffdf3b', '#ff68b4', '#52e3ff', '#ffa63b'];

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: palette[i % palette.length], side: THREE.DoubleSide });
      const wL = new THREE.Mesh(wingGeo, mat);
      const wR = new THREE.Mesh(wingGeo, mat);
      wL.rotation.y = Math.PI;
      g.add(wL, wR);
      const cx = (i % 2 === 0 ? 7.5 : -4.5) + (i - 2.5) * 2.4;
      const cz = -2.0 + (i - 2.5) * 3.2;
      g.userData = { cx, cz, radius: 1.8 + (i % 3) * 0.9, speed: 0.85 + (i % 3) * 0.22, phase: i * 1.1, wL, wR };
      this.fxGroup.add(g);
      this.butterflies.push(g);
    }
  }

  _buildSparklePool() {
    const geo = new THREE.OctahedronGeometry(0.13, 0);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffe44d' : '#5ef2ff', transparent: true, opacity: 0 });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.userData = { active: false, life: 0, maxLife: 0.8, vel: new THREE.Vector3() };
      this.fxGroup.add(m);
      this.sparklePool.push(m);
    }
  }

  spawnBurst(pos, count = 14) {
    let spawned = 0;
    for (const p of this.sparklePool) {
      if (spawned >= count) break;
      if (p.userData.active) continue;
      p.visible = true;
      p.position.copy(pos).add(new THREE.Vector3(0, 0.55, 0));
      const a = Math.random() * Math.PI * 2;
      const sp = 1.8 + Math.random() * 2.5;
      p.userData.vel.set(Math.cos(a) * sp, 3.0 + Math.random() * 2.4, Math.sin(a) * sp);
      p.userData.life = 0;
      p.userData.maxLife = 0.65 + Math.random() * 0.35;
      p.userData.active = true;
      p.material.opacity = 1;
      spawned++;
    }
  }

  setDoorOpen(open) {
    this.landmarks.doorTargetOpen = open ? 1 : 0;
  }

  setChestOpen(open) {
    this.landmarks.chestTargetOpen = open ? 1 : 0;
  }

  setMagicGateOpen(open) {
    this.landmarks.gateOpen = !!open;
    if (this.landmarks.gateCollider) this.landmarks.gateCollider.active = !open;
  }

  update(dt) {
    const t = this.uniforms.uTime.value + dt;
    this.uniforms.uTime.value = t;
    globalWindTime.value = t;

    if (this.landmarks.sailboat) {
      this.landmarks.sailboat.position.y = -0.04 + Math.sin(t * 1.6) * 0.09;
      this.landmarks.sailboat.rotation.z = Math.sin(t * 1.3) * 0.05;
      this.landmarks.sailboat.rotation.x = Math.cos(t * 1.1) * 0.035;
    }

    for (const b of this.braziers) {
      if (b.flame) {
        const s = 0.88 + Math.sin(t * 14 + b.phase) * 0.14;
        b.flame.scale.set(s, 0.9 + Math.cos(t * 17 + b.phase) * 0.18, s);
      }
    }

    if (this.landmarks.magicGate) {
      const targetScaleY = this.landmarks.gateOpen ? 0.001 : 1.0;
      this.landmarks.magicGate.scale.y = THREE.MathUtils.lerp(
        this.landmarks.magicGate.scale.y, targetScaleY, 1 - Math.exp(-5 * dt)
      );
      this.landmarks.magicGate.visible = this.landmarks.magicGate.scale.y > 0.02;
    }

    for (const c of this.clouds) {
      c.userData.angle += dt * 0.01 * c.userData.speed;
      c.position.x = Math.cos(c.userData.angle) * c.userData.dist;
      c.position.z = Math.sin(c.userData.angle) * c.userData.dist;
    }

    for (const p of this.mistParticles) {
      const cycle = ((t * 0.85 + p.userData.phase) % 2.0) / 2.0;
      p.position.set(
        p.userData.ox + Math.sin(t + p.userData.phase) * 0.45,
        0.1 + cycle * 1.95,
        p.userData.oz + cycle * 0.95
      );
      p.scale.setScalar(0.45 + Math.sin(cycle * Math.PI) * 1.25);
    }

    if (this.landmarks.rabbit) {
      const r = this.landmarks.rabbit;
      const hop = Math.max(0, Math.sin(t * 3.8));
      r.position.y = r.userData.baseY + hop * hop * 0.35;
      r.rotation.y = -0.6 + Math.sin(t * 0.9) * 0.45;
    }

    for (const b of this.butterflies) {
      const u = b.userData;
      const a = t * u.speed + u.phase;
      const nx = u.cx + Math.cos(a) * u.radius;
      const nz = u.cz + Math.sin(a * 1.3) * u.radius;
      const ny = this.getTerrainHeight(nx, nz) + 1.2 + Math.sin(t * 3.2 + u.phase) * 0.34;
      b.position.set(nx, ny, nz);
      b.rotation.y = -a;
      const flap = Math.sin(t * 18 + u.phase) * 0.9;
      u.wL.rotation.z = flap;
      u.wR.rotation.z = -flap;
    }

    if (this.landmarks.doorPivot) {
      this.landmarks.doorOpenProgress = THREE.MathUtils.lerp(
        this.landmarks.doorOpenProgress, this.landmarks.doorTargetOpen, 1 - Math.exp(-6 * dt)
      );
      this.landmarks.doorPivot.rotation.y = -this.landmarks.doorOpenProgress * 1.95;
    }
    if (this.landmarks.chestLidPivot) {
      this.landmarks.chestOpenProgress = THREE.MathUtils.lerp(
        this.landmarks.chestOpenProgress, this.landmarks.chestTargetOpen, 1 - Math.exp(-5 * dt)
      );
      this.landmarks.chestLidPivot.rotation.x = -this.landmarks.chestOpenProgress * 1.65;
    }

    for (const p of this.sparklePool) {
      if (!p.userData.active) continue;
      p.userData.life += dt;
      if (p.userData.life >= p.userData.maxLife) {
        p.userData.active = false;
        p.visible = false;
        continue;
      }
      p.userData.vel.y -= 6.5 * dt;
      p.position.addScaledVector(p.userData.vel, dt);
      p.rotation.y += dt * 6;
      const frac = 1 - p.userData.life / p.userData.maxLife;
      p.scale.setScalar(frac);
      p.material.opacity = frac;
    }
  }
}
