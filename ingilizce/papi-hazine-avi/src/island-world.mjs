import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';
import { loadGLB } from './glb-loader.mjs';

/**
 * Parrot Island (Papağan Adası) — Real-Time 3D World Engine
 * - Sculpted organic heightfield terrain with vertex-blended PBR biomes
 * - Custom GLSL Tropical Ocean & Lagoon Water Shader (Fresnel, depth tint, foam)
 * - Cascading Waterfall with scrolling foam shader + mist particle pool
 * - GPU Instanced swaying foliage & pebbles
 * - Real GLB landmarks (Cottage w/ hinged door, Bridge, Ancient Arch, Palm Groves, Chest, Rabbit)
 */

const MODEL_BASE = './assets/models/';

export class IslandWorld {
  constructor(scene) {
    this.scene = scene;
    this.WATER_LEVEL = 0.0;
    this.colliders = []; // { x, z, r }
    this.swayNodes = [];
    this.butterflies = [];
    this.clouds = [];
    this.mistParticles = [];
    this.sparklePool = [];
    this.landmarks = {}; // cottage, doorPivot, chest, chestLidPivot, bridge, arch, table, rabbit, waterfallPos
    this.missionPropsGroup = new THREE.Group();
    this.scene.add(this.missionPropsGroup);
    this.uniforms = { uTime: { value: 0 } };
  }

  /** Continuous organic terrain height function (matches visual mesh 1:1!) */
  getTerrainHeight(x, z) {
    const r = Math.hypot(x, z);
    // Main island body with organic coastline lobes
    const angle = Math.atan2(z, x);
    const coastMod = 1.0 + 0.12 * Math.sin(angle * 3.0 + 0.4) + 0.08 * Math.cos(angle * 5.0 - 0.8);
    const normR = r / (22.5 * coastMod);

    // Smooth island dome sloping cleanly into shallow lagoon (-1.6)
    let h = 1.65 * Math.max(0, 1 - normR * normR);
    if (normR > 0.88) {
      h -= (normR - 0.88) * 5.2;
    }

    // Gentle rolling hills
    h += Math.sin(x * 0.17) * Math.cos(z * 0.15) * 0.42 * Math.max(0, 1 - normR * 0.9);
    h += Math.sin(x * 0.34 + 1.2) * Math.sin(z * 0.29) * 0.16 * Math.max(0, 1 - normR);

    // Northern Waterfall Cliff Plateau (around x = -8, z = -14)
    const cliffDist = Math.hypot((x + 8.5) * 0.85, (z + 14.5) * 1.1);
    if (cliffDist < 9.5) {
      const t = Math.max(0, 1 - cliffDist / 9.5);
      h += t * t * (3 - 2 * t) * 5.8;
    }

    // Carve Lagoon Stream channel from waterfall pool (-7, -8) curving south-west to (-12, 8)
    const streamCenterX = -7.2 - Math.sin((z + 8) * 0.16) * 2.4;
    if (z > -10.5 && z < 15.5) {
      const dx = Math.abs(x - streamCenterX);
      const streamHalfW = 2.65;
      if (dx < streamHalfW + 1.8) {
        const s = 1 - Math.max(0, (dx - streamHalfW * 0.35) / (streamHalfW + 1.45));
        const smooth = s * s * (3 - 2 * s);
        h = THREE.MathUtils.lerp(h, -0.58, smooth * 0.92);
      }
    }

    // Flatten cottage terrace (around x = 8.5, z = -3.5) for crisp architectural grounding
    const cotDist = Math.hypot(x - 8.5, z + 3.5);
    if (cotDist < 5.2) {
      const t = Math.max(0, 1 - cotDist / 5.2);
      const s = t * t * (3 - 2 * t);
      h = THREE.MathUtils.lerp(h, 1.55, s);
    }

    // Flatten sandy starting cove (around x = 0, z = 11)
    const startDist = Math.hypot(x - 0, z - 11.5);
    if (startDist < 5.0) {
      const t = Math.max(0, 1 - startDist / 5.0);
      h = THREE.MathUtils.lerp(h, 0.88, t * t * (3 - 2 * t));
    }

    return h;
  }

  /** Walkable height including the Arched Wooden Bridge deck! */
  getWalkableHeight(x, z) {
    let h = this.getTerrainHeight(x, z);
    // Bridge spans across the stream centered at (-7.6, 1.0), rotated 90 deg (along X)
    const bx = x - (-7.6);
    const bz = z - 1.0;
    if (Math.abs(bx) <= 3.7 && Math.abs(bz) <= 1.35) {
      const t = (bx + 3.7) / 7.4;
      const deckY = 0.72 + Math.sin(t * Math.PI) * 0.65;
      if (deckY > h) h = deckY;
    }
    return h;
  }

  addCollider(x, z, r) {
    this.colliders.push({ x, z, r });
  }

  resolveCollisions(x, z, playerR) {
    let rx = x, rz = z;
    for (const c of this.colliders) {
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

  async build(quality = 'high') {
    this._buildSkyAndLighting(quality);
    this._buildTerrainMesh();
    this._buildOceanShader();
    this._buildWaterfall();
    await this._buildLandmarks();
    this._buildInstancedFoliage(quality);
    this._buildButterflies();
    this._buildSparklePool();
  }

  _buildSkyAndLighting(quality) {
    // Atmospheric tropical fog
    this.scene.fog = new THREE.FogExp2('#9fe3f5', 0.0095);

    // Custom Sky Dome Gradient Shader
    const skyGeo = new THREE.SphereGeometry(140, 28, 18);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#2185e8') },
        uMid: { value: new THREE.Color('#74d2f7') },
        uHorizon: { value: new THREE.Color('#fff1c7') }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop, uMid, uHorizon;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y;
          vec3 col = mix(uHorizon, uMid, smoothstep(-0.05, 0.28, h));
          col = mix(col, uTop, smoothstep(0.25, 0.85, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Warm tropical sunlight + sky/ground bounce
    const hemi = new THREE.HemisphereLight('#fff8e6', '#2e7d6f', 1.35);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff2cc', 2.45);
    sun.position.set(24, 34, 18);
    sun.castShadow = true;
    const mapSize = quality === 'low' ? 1024 : quality === 'medium' ? 1536 : 2048;
    sun.shadow.mapSize.set(mapSize, mapSize);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 95;
    const d = 30;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    this.sunLight = sun;

    // Soft rim fill light from ocean bounce
    const fill = new THREE.DirectionalLight('#7ce8ff', 0.55);
    fill.position.set(-22, 12, -16);
    this.scene.add(fill);

    // Drifting stylized 3D tropical clouds
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, metalness: 0.0 });
    const puffGeo = new THREE.SphereGeometry(1, 12, 10);
    for (let i = 0; i < 9; i++) {
      const cg = new THREE.Group();
      const angle = (i / 9) * Math.PI * 2;
      const dist = 36 + (i % 3) * 14;
      cg.position.set(Math.cos(angle) * dist, 18 + (i % 3) * 4, Math.sin(angle) * dist);
      for (let p = 0; p < 4; p++) {
        const m = new THREE.Mesh(puffGeo, cloudMat);
        m.position.set((p - 1.5) * 1.9, (p % 2) * 0.6, (p % 3 - 1) * 0.8);
        m.scale.set(2.2 + (p % 2), 1.25, 1.7);
        cg.add(m);
      }
      cg.userData = { speed: 0.25 + (i % 3) * 0.12, angle, dist };
      this.scene.add(cg);
      this.clouds.push(cg);
    }
  }

  _buildTerrainMesh() {
    const size = 84;
    const segs = 104;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);

    const cWetSand = new THREE.Color('#c9a66b');
    const cSand    = new THREE.Color('#f2d694');
    const cGrass1  = new THREE.Color('#4eb548');
    const cGrass2  = new THREE.Color('#70cc52');
    const cRock    = new THREE.Color('#7f857b');
    const cPath    = new THREE.Color('#dfc08b');
    const tmp      = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.getTerrainHeight(x, z);
      pos.setY(i, h);

      // Biome vertex coloring
      if (h < 0.12) {
        tmp.copy(cWetSand);
      } else if (h < 0.68) {
        tmp.copy(cWetSand).lerp(cSand, (h - 0.12) / 0.56);
      } else if (h < 1.15) {
        tmp.copy(cSand).lerp(cGrass1, (h - 0.68) / 0.47);
      } else if (h < 2.6) {
        const patch = 0.5 + 0.5 * Math.sin(x * 0.28) * Math.cos(z * 0.25);
        tmp.copy(cGrass1).lerp(cGrass2, patch);
      } else {
        tmp.copy(cGrass1).lerp(cRock, Math.min(1, (h - 2.6) / 2.2));
      }

      // Sunlit winding dirt/cobble trail from beach (0,12) -> center (0,1) -> cottage (8,-2) & bridge (-7.6,1)
      const dMain = Math.abs(x - Math.sin(z * 0.22) * 1.4);
      const onMain = z > -8 && z < 12 && dMain < 1.35 && h > 0.55;
      const dCross = Math.abs(z - 1.0);
      const onCross = x > -14 && x < 9 && dCross < 1.35 && h > 0.55;
      if (onMain || onCross) {
        tmp.lerp(cPath, 0.72);
      }

      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.02
    });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);
    this.terrainMesh = terrain;
  }

  _buildOceanShader() {
    const geo = new THREE.PlaneGeometry(240, 240, 64, 64);
    geo.rotateX(-Math.PI / 2);

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: this.uniforms.uTime,
        uShallow: { value: new THREE.Color('#3de6d8') },
        uMid:     { value: new THREE.Color('#1398c4') },
        uDeep:    { value: new THREE.Color('#0c4f8a') },
        uSunDir:  { value: new THREE.Vector3(24, 34, 18).normalize() }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying float vWave;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          float w = sin(wp.x * 0.35 + uTime * 1.7) * 0.08 + cos(wp.z * 0.42 + uTime * 1.35) * 0.07;
          wp.y += w;
          vWave = w;
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uShallow, uMid, uDeep, uSunDir;
        varying vec3 vWorldPos;
        varying float vWave;
        void main() {
          float dist = length(vWorldPos.xz);
          float depthT = smoothstep(18.0, 58.0, dist);
          vec3 col = mix(uShallow, uMid, smoothstep(12.0, 29.0, dist));
          col = mix(col, uDeep, depthT);

          // Animated caustic shimmer & ripples
          float r1 = sin(vWorldPos.x * 0.9 + uTime * 2.2) * cos(vWorldPos.z * 0.85 - uTime * 1.6);
          float r2 = sin((vWorldPos.x + vWorldPos.z) * 1.4 - uTime * 2.6);
          vec3 normal = normalize(vec3((r1 + r2) * 0.07, 1.0, (r1 - r2) * 0.07));
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
          col = mix(col, vec3(0.75, 0.96, 1.0), fresnel * 0.45);

          // Sun specular sparkle
          vec3 halfV = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(normal, halfV), 0.0), 64.0);
          col += vec3(1.0, 0.96, 0.82) * spec * 0.75;

          // Shoreline foam band around island perimeter
          float shoreWave = sin(dist * 1.6 - uTime * 2.8) * 0.5 + 0.5;
          float foamBand = (1.0 - smoothstep(20.0, 24.5, dist)) * smoothstep(16.0, 21.5, dist);
          col = mix(col, vec3(0.95, 0.99, 1.0), foamBand * shoreWave * 0.55);

          float alpha = mix(0.82, 0.96, depthT);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    const ocean = new THREE.Mesh(geo, mat);
    ocean.position.y = this.WATER_LEVEL;
    this.scene.add(ocean);
  }

  _buildWaterfall() {
    // Cascading waterfall pouring down the northern cliff at (-8.0, 0..-10.5)
    const wfGeo = new THREE.PlaneGeometry(3.4, 6.2, 10, 16);
    const pos = wfGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const t = (3.1 - y) / 6.2; // 0 top -> 1 bottom
      pos.setZ(i, Math.sin(t * Math.PI * 0.5) * 1.6);
    }
    wfGeo.computeVertexNormals();

    const wfMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: { uTime: this.uniforms.uTime },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float flow = vUv.y * 5.0 + uTime * 3.4;
          float streak1 = sin(vUv.x * 26.0 + sin(flow * 1.5)) * 0.5 + 0.5;
          float streak2 = sin(vUv.x * 42.0 - flow * 2.2) * 0.5 + 0.5;
          float foam = smoothstep(0.45, 0.95, streak1 * 0.6 + streak2 * 0.5);
          float bottomSplash = 1.0 - smoothstep(0.0, 0.22, vUv.y);
          float edgeFade = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
          vec3 col = mix(vec3(0.35, 0.88, 0.98), vec3(0.95, 0.99, 1.0), clamp(foam * 0.75 + bottomSplash, 0.0, 1.0));
          gl_FragColor = vec4(col, edgeFade * (0.72 + bottomSplash * 0.25));
        }
      `
    });
    const wf = new THREE.Mesh(wfGeo, wfMat);
    wf.position.set(-7.6, 2.75, -11.4);
    wf.rotation.y = 0.15;
    this.scene.add(wf);
    this.landmarks.waterfallPos = new THREE.Vector3(-7.6, 0.5, -8.5);

    // Rising mist particles at waterfall base
    const mistGeo = new THREE.SphereGeometry(0.42, 8, 6);
    const mistMat = new THREE.MeshBasicMaterial({ color: '#e6fbff', transparent: true, opacity: 0.42 });
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(mistGeo, mistMat);
      p.userData = {
        phase: Math.random() * Math.PI * 2,
        ox: -7.6 + (Math.random() - 0.5) * 3.2,
        oz: -9.8 + (Math.random() - 0.5) * 1.8
      };
      this.scene.add(p);
      this.mistParticles.push(p);
    }
  }

  async _buildLandmarks() {
    // 1. Tropical Island Cottage (with animated DoorPivot!)
    const cottage = await loadGLB(`${MODEL_BASE}cottage.glb`);
    const cotY = this.getTerrainHeight(8.5, -3.5);
    cottage.position.set(8.5, cotY - 0.05, -3.5);
    cottage.rotation.y = -0.55;
    this.scene.add(cottage);
    this.landmarks.cottage = cottage;
    this.landmarks.doorPivot = cottage.getObjectByName('DoorPivot');
    this.landmarks.doorOpenProgress = 0;
    this.landmarks.doorTargetOpen = 0;
    this.addCollider(8.5, -3.5, 2.55);

    // 2. Arched Wooden Bridge spanning the lagoon stream at (-7.6, 1.0)
    const bridge = await loadGLB(`${MODEL_BASE}wooden_bridge.glb`);
    bridge.position.set(-7.6, 0.72, 1.0);
    bridge.rotation.y = Math.PI / 2;
    this.scene.add(bridge);
    this.landmarks.bridge = bridge;

    // 3. Ancient Stone Archway & Cave Grotto Entrance (north-east clearing)
    const arch = await loadGLB(`${MODEL_BASE}ancient_arch.glb`);
    const archY = this.getTerrainHeight(2.5, -13.5);
    arch.position.set(2.5, archY - 0.08, -13.5);
    arch.rotation.y = -0.15;
    this.scene.add(arch);
    this.landmarks.arch = arch;
    this.addCollider(0.65, -13.5, 0.8);
    this.addCollider(4.35, -13.5, 0.8);

    // 4. Wooden Picnic Table beside the cottage
    const table = await loadGLB(`${MODEL_BASE}table.glb`);
    const tabY = this.getTerrainHeight(4.2, 2.2);
    table.position.set(4.2, tabY - 0.04, 2.2);
    table.rotation.y = 0.25;
    this.scene.add(table);
    this.landmarks.table = table;
    this.addCollider(4.2, 2.2, 1.05);

    // 5. Ornate Treasure Chest (positioned per level, default scenic spot)
    const chest = await loadGLB(`${MODEL_BASE}treasure_chest.glb`);
    chest.position.set(2.5, this.getTerrainHeight(2.5, -10.0), -10.0);
    this.scene.add(chest);
    this.landmarks.chest = chest;
    this.landmarks.chestLidPivot = chest.getObjectByName('ChestLidPivot');
    this.landmarks.chestOpenProgress = 0;
    this.landmarks.chestTargetOpen = 0;

    // 6. Sculpted Hopping Rabbit
    const rabbit = await loadGLB(`${MODEL_BASE}rabbit.glb`);
    const rabY = this.getTerrainHeight(4.5, -9.2);
    rabbit.position.set(4.5, rabY, -9.2);
    rabbit.rotation.y = -0.6;
    rabbit.userData.baseY = rabY;
    this.scene.add(rabbit);
    this.landmarks.rabbit = rabbit;

    // 7. Curved Tropical Palm Groves (real GLB palms with wind sway!)
    const palmSpots = [
      [-13.5, 8.5, 1.05, 0.3], [-15.2, 2.5, 0.92, 1.8], [-14.0, -5.5, 1.12, 2.6],
      [14.2, 7.2, 1.08, 4.1],  [15.6, 0.5, 0.95, 5.2],  [13.4, -8.5, 1.15, 0.9],
      [7.8, 13.5, 0.98, 2.1],  [-5.2, 14.2, 1.02, 3.7], [8.5, -13.2, 1.10, 1.2],
      [-2.5, -15.5, 0.94, 4.8],[-12.5, -12.0, 1.06, 0.5],[11.5, 11.2, 0.88, 3.1]
    ];
    for (const [px, pz, scale, rotY] of palmSpots) {
      const palm = await loadGLB(`${MODEL_BASE}palm_tree.glb`);
      const py = this.getTerrainHeight(px, pz);
      palm.position.set(px, py - 0.12, pz);
      palm.scale.setScalar(scale);
      palm.rotation.y = rotY;
      palm.userData = { swayPhase: px * 0.5 + pz * 0.3, baseRotZ: 0 };
      this.scene.add(palm);
      this.swayNodes.push(palm);
      this.addCollider(px, pz, 0.55 * scale);
    }

    // 8. Sculpted mossy cliff boulders around waterfall & cave grotto
    const rockGeo = new THREE.DodecahedronGeometry(1, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#7e867c', roughness: 0.92 });
    const boulderSpots = [
      [-11.2, -11.8, 2.2, 1.6, 1.9], [-4.5, -12.4, 1.9, 1.5, 1.8],
      [-10.2, -7.8, 1.2, 0.9, 1.1],  [-5.2, -8.2, 1.1, 0.8, 1.0],
      [5.8, -14.2, 1.6, 1.3, 1.5],   [-0.8, -14.5, 1.4, 1.1, 1.3],
      [13.8, -3.2, 1.3, 0.9, 1.2],   [-15.8, -2.5, 1.5, 1.0, 1.4]
    ];
    for (const [rx, rz, sx, sy, sz] of boulderSpots) {
      const m = new THREE.Mesh(rockGeo, rockMat);
      m.position.set(rx, this.getTerrainHeight(rx, rz) + sy * 0.35, rz);
      m.scale.set(sx, sy, sz);
      m.rotation.set(rx * 0.2, rz * 0.3, 0.1);
      m.castShadow = true;
      m.receiveShadow = true;
      this.scene.add(m);
      this.addCollider(rx, rz, Math.max(sx, sz) * 0.72);
    }
  }

  _buildInstancedFoliage(quality) {
    // GPU Instanced grass tufts (1 draw call for hundreds of blades!)
    const count = quality === 'low' ? 140 : quality === 'medium' ? 280 : 420;
    const bladeGeo = new THREE.ConeGeometry(0.11, 0.48, 4);
    bladeGeo.translate(0, 0.24, 0);
    const bladeMat = new THREE.MeshStandardMaterial({
      color: '#54c447',
      roughness: 0.72
    });
    const inst = new THREE.InstancedMesh(bladeGeo, bladeMat, count);
    inst.receiveShadow = true;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();

    let placed = 0;
    let seed = 1337;
    const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

    for (let attempt = 0; attempt < count * 4 && placed < count; attempt++) {
      const a = rand() * Math.PI * 2;
      const r = 2.0 + Math.sqrt(rand()) * 17.5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = this.getTerrainHeight(x, z);
      if (h < 0.85 || h > 2.55) continue;
      if (Math.hypot(x - 8.5, z + 3.5) < 3.8) continue; // keep cottage porch clean
      dummy.position.set(x, h - 0.04, z);
      dummy.rotation.set((rand() - 0.5) * 0.25, rand() * Math.PI * 2, (rand() - 0.5) * 0.25);
      const s = 0.75 + rand() * 0.85;
      dummy.scale.set(s, s * (0.8 + rand() * 0.5), s);
      dummy.updateMatrix();
      inst.setMatrixAt(placed, dummy.matrix);
      color.setHSL(0.28 + (rand() - 0.5) * 0.06, 0.58, 0.46 + rand() * 0.12);
      inst.setColorAt(placed, color);
      placed++;
    }
    inst.count = placed;
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    this.scene.add(inst);
    this.grassInstanced = inst;
  }

  _buildButterflies() {
    const wingGeo = new THREE.PlaneGeometry(0.22, 0.16);
    wingGeo.translate(0.11, 0, 0);
    const palette = ['#ffdf3b', '#ff68b4', '#52e3ff', '#ffa63b'];

    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: palette[i % palette.length], side: THREE.DoubleSide });
      const wL = new THREE.Mesh(wingGeo, mat);
      const wR = new THREE.Mesh(wingGeo, mat);
      wL.rotation.y = Math.PI;
      g.add(wL, wR);
      const cx = (i % 2 === 0 ? 4.5 : -2.5) + (i - 3) * 1.8;
      const cz = -2.0 + (i - 2.5) * 2.4;
      g.userData = { cx, cz, radius: 1.6 + (i % 3) * 0.7, speed: 0.9 + (i % 3) * 0.25, phase: i * 1.1, wL, wR };
      this.scene.add(g);
      this.butterflies.push(g);
    }
  }

  _buildSparklePool() {
    // Object-pooled golden star sparkles for collect/chest bursts!
    const geo = new THREE.OctahedronGeometry(0.12, 0);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffe44d' : '#5ef2ff', transparent: true, opacity: 0 });
      const m = new THREE.Mesh(geo, mat);
      m.visible = false;
      m.userData = { active: false, life: 0, maxLife: 0.8, vel: new THREE.Vector3() };
      this.scene.add(m);
      this.sparklePool.push(m);
    }
  }

  spawnBurst(pos, count = 14) {
    let spawned = 0;
    for (const p of this.sparklePool) {
      if (spawned >= count) break;
      if (p.userData.active) continue;
      p.visible = true;
      p.position.copy(pos).add(new THREE.Vector3(0, 0.5, 0));
      const a = Math.random() * Math.PI * 2;
      const sp = 1.6 + Math.random() * 2.4;
      p.userData.vel.set(Math.cos(a) * sp, 2.8 + Math.random() * 2.4, Math.sin(a) * sp);
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

  update(dt) {
    const t = this.uniforms.uTime.value + dt;
    this.uniforms.uTime.value = t;

    // Gentle wind sway on palm trees
    for (const p of this.swayNodes) {
      p.rotation.z = Math.sin(t * 1.45 + p.userData.swayPhase) * 0.032;
    }

    // Drifting clouds
    for (const c of this.clouds) {
      c.userData.angle += dt * 0.012 * c.userData.speed;
      c.position.x = Math.cos(c.userData.angle) * c.userData.dist;
      c.position.z = Math.sin(c.userData.angle) * c.userData.dist;
    }

    // Waterfall mist animation
    for (const p of this.mistParticles) {
      const cycle = ((t * 0.9 + p.userData.phase) % 2.0) / 2.0;
      p.position.set(
        p.userData.ox + Math.sin(t + p.userData.phase) * 0.4,
        0.1 + cycle * 1.65,
        p.userData.oz + cycle * 0.8
      );
      const s = 0.4 + Math.sin(cycle * Math.PI) * 1.15;
      p.scale.setScalar(s);
    }

    // Hopping rabbit animation
    if (this.landmarks.rabbit) {
      const r = this.landmarks.rabbit;
      const hop = Math.max(0, Math.sin(t * 3.8));
      r.position.y = r.userData.baseY + hop * hop * 0.34;
      r.rotation.y = -0.6 + Math.sin(t * 0.9) * 0.45;
    }

    // Fluttering butterflies
    for (const b of this.butterflies) {
      const u = b.userData;
      const a = t * u.speed + u.phase;
      const nx = u.cx + Math.cos(a) * u.radius;
      const nz = u.cz + Math.sin(a * 1.3) * u.radius;
      const ny = this.getTerrainHeight(nx, nz) + 1.15 + Math.sin(t * 3.2 + u.phase) * 0.32;
      b.position.set(nx, ny, nz);
      b.rotation.y = -a;
      const flap = Math.sin(t * 18 + u.phase) * 0.9;
      u.wL.rotation.z = flap;
      u.wR.rotation.z = -flap;
    }

    // Smooth Hinged Cottage Door
    if (this.landmarks.doorPivot) {
      this.landmarks.doorOpenProgress = THREE.MathUtils.lerp(
        this.landmarks.doorOpenProgress,
        this.landmarks.doorTargetOpen,
        1 - Math.exp(-6 * dt)
      );
      this.landmarks.doorPivot.rotation.y = -this.landmarks.doorOpenProgress * 1.85;
    }

    // Smooth Hinged Treasure Chest Lid
    if (this.landmarks.chestLidPivot) {
      this.landmarks.chestOpenProgress = THREE.MathUtils.lerp(
        this.landmarks.chestOpenProgress,
        this.landmarks.chestTargetOpen,
        1 - Math.exp(-5 * dt)
      );
      this.landmarks.chestLidPivot.rotation.x = -this.landmarks.chestOpenProgress * 1.65;
    }

    // Sparkle Particle Pool update
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
