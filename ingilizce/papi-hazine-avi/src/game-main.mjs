import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';
import { loadGLB, preloadGLBs, disposeGLBCache } from './glb-loader.mjs';
import { disposePBRMaps } from './pbr-textures.mjs';
import { IslandWorld, BIOME_CONFIGS } from './island-world.mjs';
import { PapiController } from './papi-controller.mjs';
import { AudioEngine } from './audio-engine.mjs';
import {
  ISLANDS, ALL_LEVELS, getLevelsForIsland, getLevelById, getNextLevel, computeExplorerLevel
} from './levels-data.mjs';
import {
  DijiMeduBridge, isIrmakAccount, isLaunchOpen, getLaunchCountdown
} from './diji-medu-bridge.mjs';

const MODEL_BASE = './assets/models/';
// Startup only preloads core character, shared props & Island 1; Islands 2–6 lazy-load on demand!
const STARTUP_MODELS = [
  'papi.glb', 'key.glb', 'apple.glb', 'flower.glb', 'book.glb',
  'lantern.glb', 'crystal.glb', 'seashell.glb',
  ...BIOME_CONFIGS['papagan-adasi'].models
].map((f) => MODEL_BASE + f);

class PapiTreasureGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.audio = new AudioEngine();
    this.bridge = new DijiMeduBridge();

    this.mode = 'loading'; // loading | launch | title | islands | levels | playing | paused | chest | result
    this.selectedIslandId = 'papagan-adasi';
    this.currentLevel = null;
    this.missionIdx = 0;
    this.missionProgress = 0;
    this.mistakes = 0;
    this.starsEarned = 0;
    this.activeProps = [];
    this.nearestTarget = null;

    this.keys = new Set();
    this.joyVec = { x: 0, y: 0 };
    this.joyPointerId = null;
    this.joyOrigin = { x: 0, y: 0 };

    // Portrait-Adaptive Third-Person Camera State
    this.camYaw = 0;
    this.camPitch = 0.40;
    this.baseCamDist = 7.8;
    this.camDist = 7.8;
    this.camPos = new THREE.Vector3(2, 9, 36);
    this.camLook = new THREE.Vector3(2, 1.5, 20);
    this.orbitDrag = { active: false, pointerId: null, lastX: 0, lastY: 0 };
    this.cinematicTime = 0;

    // Gentle Mobile Thermal & FPS Budget ("cihazlar zorlanmasın")
    this.isMobileDevice = (navigator.maxTouchPoints > 0) || window.innerWidth < 820;
    this.currentDprCap = 1.35;
    this.drsFloor = 0.85;
    this.clock = new THREE.Clock();
    this.fpsAccum = 0;
    this.fpsFrames = 0;
    this.fpsValue = 60;
    this.drsCooldown = 0;
    this.rafId = 0;
    this.launchTimer = 0;
  }

  _resolveEffectiveQuality(setting) {
    if (setting && setting !== 'auto') return setting;
    const cores = navigator.hardwareConcurrency || 4;
    if (this.isMobileDevice) return cores <= 4 ? 'low' : 'medium';
    return 'high';
  }

  async init() {
    await this.bridge.initSession();
    const settings = this.bridge.state.settings;
    this.audio.setMusicEnabled(settings.music);
    this.audio.setSfxEnabled(settings.sfx);

    const effQuality = this._resolveEffectiveQuality(settings.quality);

    // Disable expensive 4x MSAA on mobile Retina screens for cool, battery-friendly 60 FPS!
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.isMobileDevice && effQuality === 'high',
      powerPreference: 'high-performance'
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = this.isMobileDevice ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.10;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.18, 260);
    this._applyQuality(settings.quality);
    this._syncViewportCamera();

    const bar = document.getElementById('load-bar-fill');
    const txt = document.getElementById('load-status');
    const uniqueStartup = Array.from(new Set(STARTUP_MODELS));
    await preloadGLBs(uniqueStartup, (ratio) => {
      if (bar) bar.style.width = `${Math.round(ratio * 100)}%`;
      if (txt) txt.textContent = `3D Ada Dünyası Yükleniyor... %${Math.round(ratio * 100)}`;
    });

    this.world = new IslandWorld(this.scene, this.renderer);
    await this.world.initCore(effQuality);

    this.beacon = this._createBeacon();
    this.beacon.visible = false;
    this.scene.add(this.beacon);

    const papiModel = await loadGLB(`${MODEL_BASE}papi.glb`);
    this.papi = new PapiController(papiModel, this.world, this.audio);
    this.scene.add(papiModel);
    this.papi.setPosition(2.0, 26.5, 0);

    this._bindEvents();
    this._renderExplorerStats();

    // Enforce 10 Aralık 19:00 Launch Gate (bypassed ONLY for Irmak!)
    if (!isLaunchOpen()) {
      this._startLaunchCountdownScreen();
    } else {
      const vipBadge = document.getElementById('vip-irmak-badge');
      if (vipBadge) vipBadge.hidden = !isIrmakAccount();
      this._setScreen('title');
    }

    this.clock.start();
    this._loop();
  }

  _startLaunchCountdownScreen() {
    this._setScreen('launch');
    const tick = () => {
      if (isLaunchOpen()) {
        clearInterval(this.launchTimer);
        this._setScreen('title');
        return;
      }
      const { days, hours, minutes, seconds } = getLaunchCountdown();
      const pad = (n) => String(n).padStart(2, '0');
      const dEl = document.getElementById('cd-days');
      const hEl = document.getElementById('cd-hours');
      const mEl = document.getElementById('cd-mins');
      const sEl = document.getElementById('cd-secs');
      if (dEl) dEl.textContent = pad(days);
      if (hEl) hEl.textContent = pad(hours);
      if (mEl) mEl.textContent = pad(minutes);
      if (sEl) sEl.textContent = pad(seconds);
    };
    tick();
    clearInterval(this.launchTimer);
    this.launchTimer = setInterval(tick, 1000);
  }

  _createBeacon() {
    const g = new THREE.Group();
    const ringGeo = new THREE.RingGeometry(1.05, 1.40, 28);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#ffe04d', transparent: true, opacity: 0.82, side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.08;
    const beamGeo = new THREE.CylinderGeometry(0.22, 0.85, 3.6, 14, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: '#ffe875', transparent: true, opacity: 0.20, side: THREE.DoubleSide, depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.85;
    g.add(ring, beam);
    return g;
  }

  _syncViewportCamera() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    const aspect = w / h;
    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      const portraitT = THREE.MathUtils.clamp((1.0 - aspect) / 0.55, 0, 1);
      this.camera.fov = THREE.MathUtils.lerp(55, 69, portraitT);
      this.camDist = THREE.MathUtils.lerp(this.baseCamDist, 9.6, portraitT);
    } else {
      this.camera.fov = 54;
      this.camDist = this.baseCamDist;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _applyQuality(setting) {
    const q = this._resolveEffectiveQuality(setting);
    if (this.isMobileDevice) {
      this.currentDprCap = q === 'low' ? 0.95 : q === 'medium' ? 1.30 : 1.55;
    } else {
      this.currentDprCap = q === 'low' ? 1.0 : q === 'medium' ? 1.40 : 1.80;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.currentDprCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    if (this.world?.sunLight) {
      const s = q === 'high' && !this.isMobileDevice ? 1536 : 1024;
      this.world.sunLight.shadow.mapSize.set(s, s);
      this.world.sunLight.shadow.map?.dispose();
      this.world.sunLight.shadow.map = null;
    }
  }

  _stepDownDynamicResolution() {
    if (this.bridge.state.settings.quality !== 'auto') return;
    if (this.currentDprCap <= this.drsFloor) return;
    this.currentDprCap = Math.max(this.drsFloor, +(this.currentDprCap - 0.2).toFixed(2));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.currentDprCap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  // ─── Screen Navigation & UI Rendering ──────────────────────────────────────
  _setScreen(screenName) {
    this.mode = screenName;
    document.querySelectorAll('.overlay-screen').forEach((el) => {
      el.classList.toggle('active', el.dataset.screen === screenName);
    });
    const hud = document.getElementById('game-hud');
    if (hud) hud.classList.toggle('active', screenName === 'playing');
    if (screenName === 'islands') this._renderIslandsMap();
    if (screenName === 'levels') this._renderLevelGrid();
    this._renderExplorerStats();
  }

  _renderExplorerStats() {
    const prog = computeExplorerLevel(this.bridge.state.explorerXp);
    document.querySelectorAll('[data-bind="total-stars"]').forEach((el) => {
      el.textContent = `${this.bridge.state.totalStars}`;
    });
    const xpFill = document.getElementById('explorer-xp-fill');
    if (xpFill) xpFill.style.width = `${Math.min(100, Math.round((prog.currentXp / prog.nextLevelXp) * 100))}%`;
    const xpLabel = document.getElementById('explorer-xp-label');
    if (xpLabel) xpLabel.textContent = `Papi Kaşif Sv. ${prog.level}/50 · ${prog.currentXp}/${prog.nextLevelXp} XP`;
  }

  _renderIslandsMap() {
    const grid = document.getElementById('islands-grid');
    if (!grid) return;
    const hasPro = this.bridge.isPremiumPro();

    grid.innerHTML = ISLANDS.map((isl) => {
      const levels = getLevelsForIsland(isl.id);
      const doneCount = levels.filter((l) => !!this.bridge.state.completedLevels[l.id]).length;
      const accessible = !isl.requiresPro || hasPro;

      let badgeHtml;
      if (!isl.requiresPro) {
        badgeHtml = `<span class="isl-badge open">ÜCRETSİZ · ${doneCount}/${isl.levelCount} Bölüm</span>`;
      } else if (hasPro) {
        badgeHtml = `<span class="isl-badge pro-open">👑 PRO AÇIK · ${doneCount}/${isl.levelCount} Bölüm</span>`;
      } else {
        badgeHtml = `<span class="isl-badge pro-locked">👑 PREMIUM PRO · ${isl.levelCount} Bölüm</span>`;
      }

      return `
        <button type="button" class="island-card ${accessible ? 'unlocked' : 'pro-gated'}" data-island="${isl.id}" style="--accent:${isl.accent}">
          <div class="isl-icon">${isl.badgeIcon}</div>
          <div class="isl-info">
            <div class="isl-top">
              <strong>${isl.index}. ${isl.name}</strong>
              ${badgeHtml}
            </div>
            <p>${isl.subtitle}</p>
            <div class="isl-meta">${isl.enName} · Rozet: ${isl.badgeName} ${this.bridge.state.badges.includes(isl.badgeId) ? '✅' : ''}</div>
          </div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.island-card').forEach((btn) => {
      btn.addEventListener('click', async () => {
        this.audio.unlock();
        const isl = ISLANDS.find((i) => i.id === btn.dataset.island);
        if (!isl) return;
        if (isl.requiresPro && !this.bridge.isPremiumPro()) {
          this._openProLockModal(isl);
          return;
        }
        this.selectedIslandId = isl.id;
        // Preview the selected 3D island biome in the background!
        const effQ = this._resolveEffectiveQuality(this.bridge.state.settings.quality);
        btn.style.opacity = '0.7';
        await this.world.loadBiome(isl.id, effQ);
        btn.style.opacity = '';
        this._setScreen('levels');
      });
    });
  }

  _openProLockModal(isl) {
    const modal = document.getElementById('pro-lock-modal');
    const titleEl = document.getElementById('pro-lock-island-name');
    if (titleEl) titleEl.textContent = `${isl.index}. ${isl.name} (${isl.levelCount} Bölüm)`;
    modal?.classList.add('active');
  }

  _renderLevelGrid() {
    const grid = document.getElementById('levels-grid');
    const headerTitle = document.getElementById('levels-island-title');
    const headerSub = document.getElementById('levels-island-sub');
    if (!grid) return;

    const isl = ISLANDS.find((i) => i.id === this.selectedIslandId) || ISLANDS[0];
    if (headerTitle) headerTitle.textContent = `${isl.badgeIcon} ${isl.index}. ${isl.name}`;
    if (headerSub) {
      headerSub.textContent = `${isl.subtitle} · Toplam ${isl.levelCount} Bölüm (${isl.requiresPro ? 'Premium Pro' : 'Ücretsiz Harita'})`;
    }

    const levels = getLevelsForIsland(isl.id);
    grid.innerHTML = levels.map((def) => {
      const unlocked = this.bridge.isLevelUnlocked(def);
      const rec = this.bridge.state.completedLevels[def.id];
      const stars = rec ? rec.bestStars : 0;
      const maxStars = def.missions.length;
      const moodIcon = def.mood === 'sunset' ? '🌅' : def.mood === 'noon' ? '☀️' : '🌤️';
      return `
        <button type="button" class="level-card ${unlocked ? 'unlocked' : 'locked'} ${rec ? 'done' : ''}" data-level="${def.id}" ${unlocked ? '' : 'disabled'}>
          <div class="lvl-top-row">
            <div class="lvl-num">${def.number}</div>
            <span class="lvl-mood">${moodIcon}</span>
          </div>
          <div class="lvl-title">${def.title}</div>
          <div class="lvl-sub">${def.enTitle}</div>
          <div class="lvl-stars">${rec ? `⭐ ${stars}/${maxStars}` : (unlocked ? '▶ Oyna' : '🔒 Öncekini Bitir')}</div>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.level-card.unlocked').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.audio.unlock();
        this.startLevel(btn.dataset.level);
      });
    });
  }

  _renderBackpack() {
    const list = document.getElementById('backpack-list');
    if (!list) return;
    const ownedSet = new Set(this.bridge.state.collectibles);
    const ownedItems = ALL_LEVELS.map((l) => l.rewardCollectible).filter((r) => ownedSet.has(r.id));
    const islandBadges = ISLANDS.filter((i) => this.bridge.state.badges.includes(i.badgeId));

    let html = '';
    if (islandBadges.length > 0) {
      html += islandBadges.map((b) => `
        <div class="pack-item owned">
          <div class="pack-icon">${b.badgeIcon}</div>
          <div>
            <strong>🏅 ${b.badgeName}</strong>
            <small>${b.name} tüm bölümleri tamamlandı!</small>
          </div>
        </div>
      `).join('');
    }
    if (ownedItems.length > 0) {
      html += ownedItems.map((item) => `
        <div class="pack-item owned">
          <div class="pack-icon">${item.icon}</div>
          <div>
            <strong>${item.name}</strong>
            <small>${item.enName} — ${item.description}</small>
          </div>
        </div>
      `).join('');
    } else {
      html += `
        <div class="pack-item locked">
          <div class="pack-icon">🧭</div>
          <div>
            <strong>Çantan Henüz Boş</strong>
            <small>Bölüm sonundaki hazine sandıklarını açarak özel kaşif yadigârlarını topla!</small>
          </div>
        </div>
      `;
    }
    list.innerHTML = html;
  }

  // ─── Level & Mission Lifecycle ─────────────────────────────────────────────
  async startLevel(levelId) {
    if (!isLaunchOpen()) {
      this._startLaunchCountdownScreen();
      return;
    }

    const def = getLevelById(levelId);
    if (!def) return;

    const isl = ISLANDS.find((i) => i.id === def.islandId);
    if (isl?.requiresPro && !this.bridge.isPremiumPro()) {
      this._setScreen('islands');
      this._openProLockModal(isl);
      return;
    }

    this.selectedIslandId = def.islandId;
    const effQ = this._resolveEffectiveQuality(this.bridge.state.settings.quality);
    await this.world.loadBiome(def.islandId, effQ);

    this.currentLevel = def;
    this.missionIdx = 0;
    this.missionProgress = 0;
    this.mistakes = 0;
    this.starsEarned = 0;
    this.nearestTarget = null;

    this.world.setAtmosphere(def.mood || 'default');

    while (this.world.missionPropsGroup.children.length > 0) {
      this.world.missionPropsGroup.remove(this.world.missionPropsGroup.children[0]);
    }
    this.activeProps = [];

    this.world.setDoorOpen(false);
    this.world.setChestOpen(false);
    this.world.setMagicGateOpen(!def.locksMagicGate);

    if (this.world.landmarks.chest) {
      const cy = this.world.getTerrainHeight(def.chestPos.x, def.chestPos.z);
      this.world.landmarks.chest.position.set(def.chestPos.x, cy, def.chestPos.z);
    }

    for (const pDef of def.props) {
      const mesh = await loadGLB(`${MODEL_BASE}${pDef.model}.glb`);
      if (pDef.color) {
        mesh.traverse((child) => {
          if (child.isMesh && child.material) {
            const name = child.material.name || '';
            const shouldTint = name.includes('Key') || name.includes('AppleSkin') ||
              name.includes('Petal') || name.includes('Crystal') || name.includes('Seashell') || name.includes('BookCover');
            if (shouldTint) {
              child.material = child.material.clone();
              child.material.color.set(pDef.color);
              if (pDef.emissive) child.material.emissive.set(pDef.emissive);
            }
          }
        });
      }
      const py = Math.max(this.world.getWalkableHeight(pDef.x, pDef.z), this.world.WATER_LEVEL + 0.06);
      mesh.position.set(pDef.x, py + 0.14, pDef.z);
      mesh.userData = { baseY: py + 0.14, phase: pDef.x * 0.7 + pDef.z * 0.4, placedStatic: false };
      this.world.missionPropsGroup.add(mesh);
      this.activeProps.push({ def: pDef, mesh, collected: false });
    }

    this.papi.clearCarriedItem();
    this.papi.setPosition(def.spawn.x, def.spawn.z, def.spawn.facing);
    this.camYaw = 0;
    this.camPos.set(def.spawn.x, this.papi.position.y + 5.2, def.spawn.z + this.camDist);
    this.camLook.set(def.spawn.x, this.papi.position.y + 1.35, def.spawn.z);

    this._setScreen('playing');
    this._updateHudMission(true);
  }

  _getCurrentMission() {
    if (!this.currentLevel) return null;
    return this.currentLevel.missions[this.missionIdx] || null;
  }

  _updateHudMission(speak = false) {
    const m = this._getCurrentMission();
    if (!m) return;

    const isl = ISLANDS.find((i) => i.id === this.currentLevel.islandId);
    const total = this.currentLevel.missions.length;
    const promptEl = document.getElementById('hud-mission-text');
    const stepEl = document.getElementById('hud-mission-step');
    const starEl = document.getElementById('hud-stars');
    const lvlBadge = document.getElementById('hud-level-badge');

    let suffix = '';
    if (m.type === 'collect_count') suffix = ` (${this.missionProgress}/${m.count})`;
    if (promptEl) promptEl.textContent = m.prompt + suffix;
    if (stepEl) stepEl.textContent = `${isl ? isl.name.toUpperCase() + ' · ' : ''}GÖREV ${this.missionIdx + 1}/${total}`;
    if (starEl) starEl.textContent = `${this.starsEarned}`;
    if (lvlBadge) lvlBadge.textContent = `Bölüm ${this.currentLevel.number}`;

    if (m.pos) {
      const by = this.world.getWalkableHeight(m.pos.x, m.pos.z);
      this.beacon.position.set(m.pos.x, Math.max(by, 0.05), m.pos.z);
      this.beacon.visible = true;
    } else {
      this.beacon.visible = false;
    }

    if (speak) {
      this.audio.speakEnglish(m.prompt);
    }
  }

  _updateCompass() {
    const arrowEl = document.getElementById('compass-arrow');
    const distEl = document.getElementById('compass-dist');
    const m = this._getCurrentMission();
    if (!arrowEl || !distEl || !m) return;

    let tx = null, tz = null;
    if (m.pos) {
      tx = m.pos.x;
      tz = m.pos.z;
    } else if (Array.isArray(m.targetIds)) {
      const poolIds = [...m.targetIds, ...(m.distractorIds || [])];
      const candidates = this.activeProps.filter((p) => !p.collected && poolIds.includes(p.def.id));
      if (candidates.length > 0) {
        if (!m.distractorIds || m.distractorIds.length === 0) {
          let bestD = Infinity;
          for (const c of candidates) {
            const d = Math.hypot(c.mesh.position.x - this.papi.position.x, c.mesh.position.z - this.papi.position.z);
            if (d < bestD) { bestD = d; tx = c.mesh.position.x; tz = c.mesh.position.z; }
          }
        } else {
          tx = candidates.reduce((s, c) => s + c.mesh.position.x, 0) / candidates.length;
          tz = candidates.reduce((s, c) => s + c.mesh.position.z, 0) / candidates.length;
        }
      }
    }

    if (tx === null) return;
    const dx = tx - this.papi.position.x;
    const dz = tz - this.papi.position.z;
    const dist = Math.round(Math.hypot(dx, dz));

    const worldAngle = Math.atan2(dx, -dz);
    const relAngle = worldAngle + this.camYaw;
    arrowEl.style.transform = `rotate(${relAngle}rad)`;
    distEl.textContent = `${dist}m`;
  }

  _showToast(message, type = 'good') {
    const toast = document.getElementById('hud-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className = `hud-toast show ${type}`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  _advanceMission() {
    this.starsEarned++;
    this.missionIdx++;
    this.missionProgress = 0;

    if (this.missionIdx >= this.currentLevel.missions.length) {
      this._finishLevelWithChest();
    } else {
      this._updateHudMission(true);
    }
  }

  async _finishLevelWithChest() {
    this.beacon.visible = false;
    this.world.setChestOpen(true);
    this.papi.triggerAction('celebrate', 4.0);
    this.audio.playChestFanfare();
    if (this.world.landmarks.chest) {
      this.world.spawnBurst(this.world.landmarks.chest.position, 22);
    }

    const reward = this.currentLevel.rewardCollectible;
    const summary = await this.bridge.recordLevelComplete({
      levelId: this.currentLevel.id,
      starsEarned: this.starsEarned,
      mistakes: this.mistakes,
      collectibleId: reward.id
    });

    this._setScreen('chest');
    document.getElementById('chest-item-icon').textContent = reward.icon;
    document.getElementById('chest-item-name').textContent = reward.name;
    document.getElementById('chest-item-en').textContent = reward.enName;
    document.getElementById('chest-item-desc').textContent = reward.description;

    this._pendingSummary = summary;
  }

  _showResultScreen() {
    const s = this._pendingSummary;
    if (!s || !this.currentLevel) return;
    document.getElementById('res-title').textContent = `Bölüm ${this.currentLevel.number} Tamamlandı!`;
    document.getElementById('res-stars').textContent = `${this.starsEarned} / ${this.currentLevel.missions.length}`;
    document.getElementById('res-xp').textContent = `+${s.xpAwarded} XP`;

    const breakdown = [];
    if (s.firstClearXp > 0) breakdown.push(`İlk tamamlama: +${s.firstClearXp} XP`);
    if (s.perfectXp > 0) breakdown.push(`Kusursuz bölüm: +${s.perfectXp} XP`);
    if (s.islandBonusXp > 0 && s.earnedBadge) {
      breakdown.push(`🏅 ${s.earnedBadge.badgeName} Rozeti: +${s.islandBonusXp} XP!`);
    }
    if (s.isReplay && s.xpAwarded === 0) breakdown.push('Tekrar oynama tamamlandı (XP daha önce kazanıldı)');
    else if (!s.isPerfect) breakdown.push(`${this.mistakes} yanlış deneme — kusursuz bonus için tekrar dene!`);
    document.getElementById('res-breakdown').textContent = breakdown.join(' · ');

    const nextBtn = document.getElementById('btn-next-level');
    const nextDef = getNextLevel(this.currentLevel.id);
    if (nextBtn) {
      if (nextDef) {
        const nextIsl = ISLANDS.find((i) => i.id === nextDef.islandId);
        const needsPro = nextIsl?.requiresPro && !this.bridge.isPremiumPro();
        nextBtn.style.display = 'inline-flex';
        nextBtn.textContent = needsPro
          ? `👑 4. Harita (Premium Pro) →`
          : (nextDef.islandId !== this.currentLevel.islandId ? `🏝️ Yeni Ada: ${nextIsl.name} →` : `Sonraki Bölüme Geç →`);
        nextBtn.dataset.nextId = nextDef.id;
      } else {
        nextBtn.style.display = 'none';
        nextBtn.dataset.nextId = '';
      }
    }
    this._setScreen('result');
  }

  // ─── Interaction System ────────────────────────────────────────────────────
  _evaluateProximity() {
    const m = this._getCurrentMission();
    if (!m || this.mode !== 'playing') return;

    const px = this.papi.position.x;
    const pz = this.papi.position.z;

    if (m.type === 'reach_zone' && m.pos) {
      const d = Math.hypot(px - m.pos.x, pz - m.pos.z);
      if (d <= (m.radius || 3.0)) {
        this.audio.playCollect();
        this.world.spawnBurst(this.papi.position, 14);
        this.papi.triggerAction('collect', 0.7);
        this._showToast('⭐ Harika! Doğru bölgeye ulaştın! (+1 Keşif Yıldızı)', 'good');
        this._advanceMission();
        return;
      }
    }

    let best = null;
    let bestDist = 2.85;

    for (const p of this.activeProps) {
      if (p.collected) continue;
      const d = Math.hypot(px - p.mesh.position.x, pz - p.mesh.position.z);
      if (d < bestDist) {
        bestDist = d;
        best = { kind: 'prop', prop: p, label: p.def.label };
      }
    }

    if (m.pos && (m.type === 'interact_landmark' || m.type === 'deliver_landmark' || m.type === 'open_chest')) {
      const d = Math.hypot(px - m.pos.x, pz - m.pos.z);
      if (d < (m.radius || 2.8)) {
        const labels = {
          signpost: 'Tabelayı Oku',
          door: 'Kapıyı Aç',
          cottage: 'Teslim Et',
          table: 'Masaya Koy',
          rabbit: 'Tavşanı Sev',
          magic_gate: 'Geçidi Aç'
        };
        best = {
          kind: 'landmark',
          mission: m,
          label: m.type === 'open_chest' ? 'Sandığı Aç' : (labels[m.landmark] || 'Etkileşim')
        };
      }
    }

    this.nearestTarget = best;
    const interactBtn = document.getElementById('btn-interact');
    if (interactBtn) {
      interactBtn.classList.toggle('ready', !!best);
      interactBtn.querySelector('span').textContent = best ? best.label : 'Etkileşim';
    }
  }

  async handleInteract() {
    if (this.mode !== 'playing') return;
    this.audio.unlock();
    const m = this._getCurrentMission();
    if (!m) return;

    if (!this.nearestTarget) {
      this._showToast(`💡 İpucu: ${m.hintTr}`, 'info');
      return;
    }

    if (this.nearestTarget.kind === 'prop') {
      const { prop } = this.nearestTarget;
      const id = prop.def.id;

      const isTarget = Array.isArray(m.targetIds) && m.targetIds.includes(id);
      if (isTarget) {
        prop.collected = true;
        prop.mesh.visible = false;
        this.audio.playCollect();
        this.world.spawnBurst(prop.mesh.position, 14);
        this.papi.triggerAction(m.actionAnim || 'collect', 0.75);
        if (m.carryOnCollect) this.papi.carryItem(prop.mesh, id);

        if (m.type === 'collect_count') {
          this.missionProgress++;
          if (this.missionProgress >= m.count) {
            this._showToast(`⭐ Süper! ${m.count}/${m.count} toplandı! (+1 Yıldız)`, 'good');
            this._advanceMission();
          } else {
            this._showToast(`Harika! ${this.missionProgress}/${m.count} — Devam et!`, 'good');
            this._updateHudMission(false);
          }
        } else {
          this._showToast(`⭐ Doğru! ${prop.def.label} (${prop.def.tr}) (+1 Yıldız)`, 'good');
          this._advanceMission();
        }
      } else {
        this.mistakes++;
        this.audio.playWrong();
        this._showToast(`Bu "${prop.def.label}" (${prop.def.tr}). Görev: "${m.prompt}" — Tekrar dene!`, 'warn');
        this.audio.speakEnglish(m.prompt);
      }
      return;
    }

    if (this.nearestTarget.kind === 'landmark') {
      if (m.landmark === 'signpost') {
        this.audio.playCollect();
        this.papi.triggerAction('collect', 0.8);
        this.world.spawnBurst(this.world.landmarks.signpost.position, 14);
        this._showToast('🪧 Signpost: House → East · Bridge ← West · Waterfall & Ruins ↑ North!', 'good');
        this._advanceMission();
      } else if (m.landmark === 'door') {
        this.world.setDoorOpen(true);
        this.audio.playDoorOpen();
        this.papi.clearCarriedItem();
        this.papi.triggerAction('openDoor', 0.85);
        this.world.spawnBurst(this.papi.position, 14);
        this._showToast('⭐ Ahşap kapı açıldı! (+1 Keşif Yıldızı)', 'good');
        this._advanceMission();
      } else if (m.landmark === 'magic_gate') {
        this.world.setMagicGateOpen(true);
        this.audio.playDoorOpen();
        this.papi.clearCarriedItem();
        this.papi.triggerAction('openDoor', 0.9);
        this.world.spawnBurst(this.world.landmarks.arch.position, 20);
        this._showToast('✨ Sihirli Antik Geçit açıldı! (+1 Keşif Yıldızı)', 'good');
        this._advanceMission();
      } else if (m.landmark === 'table') {
        if (m.placePropOnTable && this.world.landmarks.table) {
          const placedBook = await loadGLB(`${MODEL_BASE}book.glb`);
          const tPos = this.world.landmarks.table.position;
          placedBook.position.set(tPos.x, tPos.y + 0.98, tPos.z);
          placedBook.rotation.y = 0.4;
          placedBook.userData = { baseY: tPos.y + 0.98, phase: 0, placedStatic: true };
          this.world.missionPropsGroup.add(placedBook);
        }
        this.audio.playCollect();
        this.papi.clearCarriedItem();
        this.papi.triggerAction('collect', 0.8);
        this.world.spawnBurst(this.world.landmarks.table.position, 14);
        this._showToast('⭐ Eşya masanın üzerine konuldu! (+1 Keşif Yıldızı)', 'good');
        this._advanceMission();
      } else if (m.landmark === 'cottage') {
        this.world.setDoorOpen(true);
        this.audio.playCollect();
        this.papi.clearCarriedItem();
        this.papi.triggerAction('openDoor', 0.8);
        this.world.spawnBurst(this.papi.position, 14);
        this._showToast('⭐ Teslimat tamamlandı! (+1 Keşif Yıldızı)', 'good');
        this._advanceMission();
      } else if (m.landmark === 'rabbit') {
        this.audio.playCollect();
        this.papi.triggerAction('collect', 0.8);
        this.world.spawnBurst(this.world.landmarks.rabbit.position, 14);
        this._showToast('⭐ Beyaz tavşanı buldun! (White Rabbit) (+1 Yıldız)', 'good');
        this._advanceMission();
      } else if (m.type === 'open_chest') {
        this.papi.triggerAction('openChest', 1.1);
        this._advanceMission();
      }
    }
  }

  // ─── Input & UI Event Bindings ─────────────────────────────────────────────
  _bindEvents() {
    window.addEventListener('resize', () => this._syncViewportCamera());
    window.addEventListener('orientationchange', () => setTimeout(() => this._syncViewportCamera(), 120));

    // Pause CPU/GPU work immediately when mobile screen locks or app backgrounds!
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.keys.clear();
        this.joyVec = { x: 0, y: 0 };
        if (this.audio.ctx?.state === 'running') this.audio.ctx.suspend().catch(() => {});
      } else {
        this.clock.getDelta(); // swallow long hidden delta
        if (this.audio.unlocked && this.audio.ctx?.state === 'suspended') {
          this.audio.ctx.resume().catch(() => {});
        }
      }
    });

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      this.keys.add(code);
      if (this.mode === 'playing') {
        if (code === 'Space') { e.preventDefault(); this.audio.unlock(); this.papi.jumpOrFlap(); }
        if (code === 'KeyE' || code === 'Enter') { e.preventDefault(); this.handleInteract(); }
        if (code === 'Escape') this._setScreen('paused');
      } else if (this.mode === 'paused' && code === 'Escape') {
        this._setScreen('playing');
      }
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));

    const joyZone = document.getElementById('joystick-zone');
    const joyKnob = document.getElementById('joystick-knob');
    const maxR = 40;

    joyZone?.addEventListener('pointerdown', (e) => {
      this.audio.unlock();
      this.joyPointerId = e.pointerId;
      joyZone.setPointerCapture(e.pointerId);
      const rect = joyZone.getBoundingClientRect();
      this.joyOrigin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      this._updateJoystick(e.clientX, e.clientY, maxR, joyKnob);
    });
    joyZone?.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      this._updateJoystick(e.clientX, e.clientY, maxR, joyKnob);
    });
    const endJoy = (e) => {
      if (e.pointerId !== this.joyPointerId) return;
      this.joyPointerId = null;
      this.joyVec = { x: 0, y: 0 };
      if (joyKnob) joyKnob.style.transform = 'translate(0px, 0px)';
    };
    joyZone?.addEventListener('pointerup', endJoy);
    joyZone?.addEventListener('pointercancel', endJoy);

    this.canvas.addEventListener('pointerdown', (e) => {
      if (this.mode !== 'playing') return;
      this.audio.unlock();
      this.orbitDrag = { active: true, pointerId: e.pointerId, lastX: e.clientX, lastY: e.clientY };
    });
    window.addEventListener('pointermove', (e) => {
      if (!this.orbitDrag.active || e.pointerId !== this.orbitDrag.pointerId) return;
      const dx = e.clientX - this.orbitDrag.lastX;
      const dy = e.clientY - this.orbitDrag.lastY;
      this.orbitDrag.lastX = e.clientX;
      this.orbitDrag.lastY = e.clientY;
      this.camYaw -= dx * 0.006;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * 0.004, 0.22, 0.85);
    });
    window.addEventListener('pointerup', (e) => {
      if (e.pointerId === this.orbitDrag.pointerId) this.orbitDrag.active = false;
    });

    // Exit buttons back to Diji-Medu Oyunlar Hub
    document.querySelectorAll('[data-exit-hub]').forEach((btn) => {
      btn.addEventListener('click', () => this.bridge.requestExitToHub());
    });

    document.getElementById('btn-start-adventure')?.addEventListener('click', () => {
      this.audio.unlock();
      this._setScreen('islands');
    });
    document.getElementById('btn-quick-play')?.addEventListener('click', () => {
      this.audio.unlock();
      this.startLevel('island1_level1');
    });
    document.getElementById('btn-back-title')?.addEventListener('click', () => this._setScreen('title'));
    document.getElementById('btn-back-islands')?.addEventListener('click', () => this._setScreen('islands'));
    document.getElementById('btn-replay-audio')?.addEventListener('click', () => {
      this.audio.unlock();
      const m = this._getCurrentMission();
      if (m) this.audio.speakEnglish(m.prompt);
    });
    document.getElementById('btn-hint')?.addEventListener('click', () => {
      const m = this._getCurrentMission();
      if (m) this._showToast(`💡 ${m.hintTr}`, 'info');
    });
    document.getElementById('btn-jump')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.audio.unlock();
      this.papi.jumpOrFlap();
    });
    document.getElementById('btn-interact')?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.handleInteract();
    });
    document.getElementById('btn-pause')?.addEventListener('click', () => this._setScreen('paused'));
    document.getElementById('btn-resume')?.addEventListener('click', () => this._setScreen('playing'));
    document.getElementById('btn-restart')?.addEventListener('click', () => {
      if (this.currentLevel) this.startLevel(this.currentLevel.id);
    });
    document.getElementById('btn-exit-levels')?.addEventListener('click', () => this._setScreen('levels'));
    document.getElementById('btn-backpack')?.addEventListener('click', () => {
      this._renderBackpack();
      document.getElementById('backpack-modal')?.classList.add('active');
    });
    document.getElementById('btn-close-backpack')?.addEventListener('click', () => {
      document.getElementById('backpack-modal')?.classList.remove('active');
    });

    // Premium Pro Lock Modal Actions
    document.getElementById('btn-close-pro-modal')?.addEventListener('click', () => {
      document.getElementById('pro-lock-modal')?.classList.remove('active');
    });
    document.getElementById('btn-upgrade-pro')?.addEventListener('click', () => {
      document.getElementById('pro-lock-modal')?.classList.remove('active');
      const opened = this.bridge.openPremiumProUpgrade();
      if (!opened) {
        this._showToast('Diji-Medu Profil / Paketler bölümünden Premium Pro üyeliğe geçebilirsin!', 'info');
      }
    });

    document.getElementById('btn-chest-continue')?.addEventListener('click', () => this._showResultScreen());
    document.getElementById('btn-next-level')?.addEventListener('click', (e) => {
      const nextId = e.currentTarget.dataset.nextId;
      if (nextId) this.startLevel(nextId);
    });
    document.getElementById('btn-result-replay')?.addEventListener('click', () => {
      if (this.currentLevel) this.startLevel(this.currentLevel.id);
    });
    document.getElementById('btn-result-map')?.addEventListener('click', () => this._setScreen('levels'));

    const musicToggle = document.getElementById('set-music');
    const sfxToggle = document.getElementById('set-sfx');
    const qualSelect = document.getElementById('set-quality');
    const fpsToggle = document.getElementById('set-fps');
    if (musicToggle) {
      musicToggle.checked = this.bridge.state.settings.music;
      musicToggle.addEventListener('change', () => {
        this.audio.setMusicEnabled(musicToggle.checked);
        this.bridge.updateSettings({ music: musicToggle.checked });
      });
    }
    if (sfxToggle) {
      sfxToggle.checked = this.bridge.state.settings.sfx;
      sfxToggle.addEventListener('change', () => {
        this.audio.setSfxEnabled(sfxToggle.checked);
        this.bridge.updateSettings({ sfx: sfxToggle.checked });
      });
    }
    if (qualSelect) {
      qualSelect.value = this.bridge.state.settings.quality || 'auto';
      qualSelect.addEventListener('change', () => {
        this._applyQuality(qualSelect.value);
        this.bridge.updateSettings({ quality: qualSelect.value });
      });
    }
    if (fpsToggle) {
      fpsToggle.checked = this.bridge.state.settings.showFps;
      const fpsPill = document.getElementById('fps-pill');
      if (fpsPill) fpsPill.hidden = !fpsToggle.checked;
      fpsToggle.addEventListener('change', () => {
        if (fpsPill) fpsPill.hidden = !fpsToggle.checked;
        this.bridge.updateSettings({ showFps: fpsToggle.checked });
      });
    }

    window.addEventListener('beforeunload', () => this.dispose());
  }

  _updateJoystick(cx, cy, maxR, knob) {
    let dx = cx - this.joyOrigin.x;
    let dy = cy - this.joyOrigin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    this.joyVec = { x: dx / maxR, y: dy / maxR };
    if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  _getInputVector() {
    let x = this.joyVec.x;
    let y = this.joyVec.y;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    const mag = Math.hypot(x, y);
    if (mag > 1) { x /= mag; y /= mag; }
    return { x, y };
  }

  _updateCamera(dt) {
    const t = this.cinematicTime;
    if (this.mode === 'launch' || this.mode === 'title' || this.mode === 'islands' || this.mode === 'levels') {
      const angle = t * 0.14;
      const r = this.camera.aspect < 1 ? 33 : 28;
      const targetPos = new THREE.Vector3(Math.sin(angle) * r, 11.5 + Math.sin(t * 0.4) * 1.3, Math.cos(angle) * r);
      this.camPos.lerp(targetPos, 1 - Math.exp(-2.5 * dt));
      this.camLook.lerp(new THREE.Vector3(0, 2.2, 0), 1 - Math.exp(-3 * dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    if (this.mode === 'chest' && this.world.landmarks.chest) {
      const cp = this.world.landmarks.chest.position;
      const desired = new THREE.Vector3(cp.x + 2.6, cp.y + 2.8, cp.z + 4.4);
      this.camPos.lerp(desired, 1 - Math.exp(-4.5 * dt));
      this.camLook.lerp(new THREE.Vector3(cp.x, cp.y + 0.9, cp.z), 1 - Math.exp(-5 * dt));
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      return;
    }

    const target = this.papi.position;
    const horizDist = Math.cos(this.camPitch) * this.camDist;
    const vertDist = Math.sin(this.camPitch) * this.camDist + 1.5;

    let desiredX = target.x + Math.sin(this.camYaw) * horizDist;
    let desiredZ = target.z + Math.cos(this.camYaw) * horizDist;
    let desiredY = target.y + vertDist;

    const terrainAtCam = this.world.getWalkableHeight(desiredX, desiredZ);
    desiredY = Math.max(desiredY, terrainAtCam + 1.25, this.world.WATER_LEVEL + 1.2);

    const cotDx = desiredX - 13.0, cotDz = desiredZ - (-3.0);
    const cotDist = Math.hypot(cotDx, cotDz);
    if (cotDist < 4.0) {
      const push = 4.0 / Math.max(0.1, cotDist);
      desiredX = 13.0 + cotDx * push;
      desiredZ = -3.0 + cotDz * push;
    }

    const smooth = 1 - Math.exp(-7.5 * dt);
    this.camPos.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), smooth);
    const lookYOffset = this.camera.aspect < 1 ? 1.55 : 1.3;
    this.camLook.lerp(new THREE.Vector3(target.x, target.y + lookYOffset, target.z), smooth * 1.2);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
  }

  _loop() {
    this.rafId = requestAnimationFrame(() => this._loop());
    if (document.hidden) return; // Zero GPU/CPU battery burn when backgrounded!

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.cinematicTime += dt;

    this.fpsAccum += dt;
    this.fpsFrames++;
    if (this.drsCooldown > 0) this.drsCooldown -= dt;
    if (this.fpsAccum >= 1.0) {
      this.fpsValue = Math.round(this.fpsFrames / this.fpsAccum);
      const fpsEl = document.getElementById('fps-pill');
      if (fpsEl && !fpsEl.hidden) fpsEl.textContent = `${this.fpsValue} FPS`;
      if (this.mode === 'playing' && this.fpsValue < 46 && this.drsCooldown <= 0) {
        this._stepDownDynamicResolution();
        this.drsCooldown = 3.0;
      }
      this.fpsAccum = 0;
      this.fpsFrames = 0;
    }

    if (this.mode !== 'paused') {
      this.world.update(dt);

      for (const p of this.activeProps) {
        if (p.collected || p.mesh.userData.placedStatic) continue;
        p.mesh.position.y = p.mesh.userData.baseY + Math.sin(this.cinematicTime * 2.6 + p.mesh.userData.phase) * 0.14;
        if (p.def.model !== 'flower' && p.def.model !== 'seashell') {
          p.mesh.rotation.y += dt * 1.15;
        }
      }

      if (this.beacon.visible) {
        const s = 1 + Math.sin(this.cinematicTime * 4.5) * 0.12;
        this.beacon.scale.set(s, 1, s);
      }

      const input = this.mode === 'playing' ? this._getInputVector() : { x: 0, y: 0 };
      this.papi.update(dt, input, this.camYaw, this.mode !== 'playing');
      if (this.mode === 'playing') {
        this._evaluateProximity();
        this._updateCompass();
      }
    }

    this._updateCamera(dt);
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.rafId);
    clearInterval(this.launchTimer);
    this.audio.dispose();
    this.world?._clearBiomeGroup?.();
    this.world?.envRT?.dispose();
    disposeGLBCache();
    disposePBRMaps();
    this.renderer?.dispose();
  }
}

const game = new PapiTreasureGame();
window.__papiGame = game;
game.init().catch((err) => {
  console.error('[PapiHazineAvi] Init failed:', err);
  const txt = document.getElementById('load-status');
  if (txt) txt.textContent = `Başlatma hatası: ${err.message}`;
});
