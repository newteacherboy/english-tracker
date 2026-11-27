import * as THREE from '../../vendor/three-0.180.0/three.module.min.js';

/**
 * Papi 3D Character Controller & 10-State Smooth Skeletal Animation Rig (v2)
 * Includes tactile ground-contact shadow blob (for crisp platforming on stepping stones)
 * and animated water ripple rings when swimming/wading!
 */

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt));
}

function dampAngle(current, target, lambda, dt) {
  let diff = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export class PapiController {
  constructor(papiModel, world, audio) {
    this.root = papiModel;
    this.world = world;
    this.audio = audio;

    this.bones = {
      torso: papiModel.getObjectByName('Torso'),
      head: papiModel.getObjectByName('Head'),
      jaw: papiModel.getObjectByName('Jaw'),
      wingL: papiModel.getObjectByName('WingL'),
      wingR: papiModel.getObjectByName('WingR'),
      tail: papiModel.getObjectByName('Tail'),
      legL: papiModel.getObjectByName('LegL'),
      legR: papiModel.getObjectByName('LegR'),
      carrySocket: papiModel.getObjectByName('CarrySocket')
    };

    // Tactile Ground Contact Shadow + Water Swim Ripple Ring
    const blobGeo = new THREE.CircleGeometry(0.46, 20);
    blobGeo.rotateX(-Math.PI / 2);
    const blobMat = new THREE.MeshBasicMaterial({
      color: '#091a24', transparent: true, opacity: 0.34, depthWrite: false
    });
    this.shadowBlob = new THREE.Mesh(blobGeo, blobMat);
    this.world.scene.add(this.shadowBlob);

    const ripGeo = new THREE.RingGeometry(0.42, 0.56, 24);
    ripGeo.rotateX(-Math.PI / 2);
    const ripMat = new THREE.MeshBasicMaterial({
      color: '#d9fbff', transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false
    });
    this.waterRipple = new THREE.Mesh(ripGeo, ripMat);
    this.world.scene.add(this.waterRipple);

    // Physics & Movement State
    this.position = new THREE.Vector3(2.0, 1.0, 28.5);
    this.velocity = new THREE.Vector3();
    this.facing = Math.PI;
    this.radius = 0.52;
    this.grounded = true;
    this.inWater = false;
    this.flapping = false;
    this.flapTimer = 0;

    // Animation State Machine
    this.state = 'idle';
    this.actionState = null;
    this.actionTimer = 0;
    this.animTime = 0;
    this.stepAccum = 0;
    this.carriedMesh = null;
    this.carriedId = null;

    this.pose = {
      torsoY: 0.72, torsoPitch: 0, torsoRoll: 0,
      headPitch: 0, headYaw: 0, jawOpen: 0,
      wingLZ: -0.05, wingRZ: 0.05, wingLY: 0, wingRY: 0,
      legLX: 0, legRX: 0, tailX: 0
    };

    this.root.position.copy(this.position);
    this.root.rotation.y = this.facing;
  }

  setPosition(x, z, facing = Math.PI) {
    const y = Math.max(this.world.getWalkableHeight(x, z), this.world.WATER_LEVEL - 0.16);
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
    this.facing = facing;
    this.grounded = true;
    this.inWater = (this.world.getWalkableHeight(x, z) < this.world.WATER_LEVEL - 0.14);
    this.actionState = null;
    this.actionTimer = 0;
    this.root.position.copy(this.position);
    this.root.rotation.y = this.facing;
  }

  triggerAction(name, duration = 0.85) {
    this.actionState = name;
    this.actionTimer = duration;
    this.animTime = 0;
  }

  jumpOrFlap() {
    if (this.inWater) {
      this.velocity.y = 6.8;
      this.inWater = false;
      this.grounded = false;
      this.flapping = true;
      this.flapTimer = 0.5;
      this.audio?.playFlap();
      return;
    }
    if (this.grounded) {
      this.velocity.y = 8.2;
      this.grounded = false;
      this.flapping = false;
      this.audio?.playJump();
    } else if (!this.flapping) {
      this.velocity.y = Math.max(this.velocity.y, 5.0);
      this.flapping = true;
      this.flapTimer = 0.6;
      this.audio?.playFlap();
    }
  }

  carryItem(mesh, itemId) {
    this.clearCarriedItem();
    if (!mesh || !this.bones.carrySocket) return;
    const clone = mesh.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(0.56);
    this.bones.carrySocket.add(clone);
    this.carriedMesh = clone;
    this.carriedId = itemId;
  }

  clearCarriedItem() {
    if (this.carriedMesh && this.bones.carrySocket) {
      this.bones.carrySocket.remove(this.carriedMesh);
    }
    this.carriedMesh = null;
    this.carriedId = null;
  }

  update(dt, inputVec, cameraYaw, isLocked = false) {
    const clampedDt = Math.min(dt, 0.05);
    this.animTime += clampedDt;

    if (this.actionTimer > 0) {
      this.actionTimer -= clampedDt;
      if (this.actionTimer <= 0) this.actionState = null;
    }
    if (this.flapTimer > 0) {
      this.flapTimer -= clampedDt;
      if (this.flapTimer <= 0) this.flapping = false;
    }

    const mag = isLocked ? 0 : Math.min(1, Math.hypot(inputVec.x, inputVec.y));
    const maxSpeed = this.inWater ? 4.4 : 7.2;

    if (mag > 0.05) {
      const sinY = Math.sin(cameraYaw);
      const cosY = Math.cos(cameraYaw);
      const forwardX = -sinY, forwardZ = -cosY;
      const rightX = cosY, rightZ = -sinY;

      const moveX = rightX * inputVec.x + forwardX * (-inputVec.y);
      const moveZ = rightZ * inputVec.x + forwardZ * (-inputVec.y);
      const normLen = Math.hypot(moveX, moveZ) || 1;
      const dirX = moveX / normLen;
      const dirZ = moveZ / normLen;

      const targetSpeed = maxSpeed * mag;
      this.velocity.x = damp(this.velocity.x, dirX * targetSpeed, 11, clampedDt);
      this.velocity.z = damp(this.velocity.z, dirZ * targetSpeed, 11, clampedDt);

      const targetYaw = Math.atan2(dirX, dirZ);
      this.facing = dampAngle(this.facing, targetYaw, 12, clampedDt);
    } else {
      this.velocity.x = damp(this.velocity.x, 0, 12, clampedDt);
      this.velocity.z = damp(this.velocity.z, 0, 12, clampedDt);
    }

    const gravity = this.flapping ? -9.2 : (this.inWater ? -4.0 : -21.0);
    this.velocity.y += gravity * clampedDt;

    let nextX = this.position.x + this.velocity.x * clampedDt;
    let nextZ = this.position.z + this.velocity.z * clampedDt;

    const maxPlayRadius = this.world.PLAY_RADIUS || 37.5;
    const distFromCenter = Math.hypot(nextX, nextZ);
    if (distFromCenter > maxPlayRadius) {
      nextX = (nextX / distFromCenter) * maxPlayRadius;
      nextZ = (nextZ / distFromCenter) * maxPlayRadius;
    }

    const resolved = this.world.resolveCollisions(nextX, nextZ, this.radius);
    this.position.x = resolved.x;
    this.position.z = resolved.z;

    const groundY = this.world.getWalkableHeight(this.position.x, this.position.z);
    const swimSurfaceY = this.world.WATER_LEVEL - 0.18;
    const floorY = Math.max(groundY, swimSurfaceY);

    this.position.y += this.velocity.y * clampedDt;
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.grounded = true;
      this.flapping = false;
    } else {
      this.grounded = false;
    }

    this.inWater = (groundY < this.world.WATER_LEVEL - 0.16) && (this.position.y <= swimSurfaceY + 0.12);

    // Update tactile ground shadow & swim ripple ring
    const airHeight = Math.max(0, this.position.y - floorY);
    this.shadowBlob.position.set(this.position.x, Math.max(groundY, this.world.WATER_LEVEL) + 0.03, this.position.z);
    const shadowScale = Math.max(0.45, 1.0 - airHeight * 0.14);
    this.shadowBlob.scale.setScalar(shadowScale);
    this.shadowBlob.material.opacity = this.inWater ? 0.12 : 0.34 * shadowScale;

    if (this.inWater) {
      const pulse = (this.animTime * 1.4) % 1;
      this.waterRipple.position.set(this.position.x, this.world.WATER_LEVEL + 0.04, this.position.z);
      this.waterRipple.scale.setScalar(0.85 + pulse * 1.35);
      this.waterRipple.material.opacity = (1 - pulse) * 0.65;
    } else {
      this.waterRipple.material.opacity = 0;
    }

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.actionState) {
      this.state = this.actionState;
    } else if (this.inWater) {
      this.state = 'swim';
    } else if (!this.grounded) {
      this.state = this.flapping ? 'flap' : 'jump';
    } else if (horizSpeed > 4.4) {
      this.state = 'run';
    } else if (horizSpeed > 0.35) {
      this.state = 'walk';
    } else {
      this.state = 'idle';
    }

    if ((this.state === 'walk' || this.state === 'run') && this.grounded) {
      this.stepAccum += horizSpeed * clampedDt;
      if (this.stepAccum > 1.95) {
        this.stepAccum = 0;
        this.audio?.playFootstep(groundY < 0.85 ? 'sand' : 'grass');
      }
    } else if (this.state === 'swim' && horizSpeed > 0.6) {
      this.stepAccum += horizSpeed * clampedDt;
      if (this.stepAccum > 2.2) {
        this.stepAccum = 0;
        this.audio?.playSplash();
      }
    }

    const t = this.animTime;
    let torsoY = 0.72, torsoPitch = 0, torsoRoll = 0;
    let headPitch = 0, headYaw = 0, jawOpen = 0;
    let wingLZ = -0.06, wingRZ = 0.06, wingLY = 0, wingRY = 0;
    let legLX = 0, legRX = 0, tailX = 0;

    switch (this.state) {
      case 'idle': {
        torsoY = 0.72 + Math.sin(t * 2.4) * 0.026;
        headYaw = Math.sin(t * 0.85) * 0.22;
        headPitch = Math.sin(t * 1.3) * 0.06;
        wingLZ = -0.06 - Math.sin(t * 2.4) * 0.035;
        wingRZ = 0.06 + Math.sin(t * 2.4) * 0.035;
        tailX = Math.sin(t * 2.4) * 0.08;
        break;
      }
      case 'walk': {
        const w = t * 9.5;
        torsoY = 0.72 + Math.abs(Math.sin(w)) * 0.075;
        torsoPitch = 0.08;
        torsoRoll = Math.sin(w) * 0.085;
        legLX = Math.sin(w) * 0.58;
        legRX = -Math.sin(w) * 0.58;
        wingLZ = -0.14 + Math.sin(w) * 0.14;
        wingRZ = 0.14 + Math.sin(w) * 0.14;
        headPitch = -0.05 + Math.abs(Math.sin(w)) * 0.04;
        tailX = Math.sin(w) * 0.14;
        break;
      }
      case 'run': {
        const r = t * 14.5;
        torsoY = 0.70 + Math.abs(Math.sin(r)) * 0.11;
        torsoPitch = 0.21;
        torsoRoll = Math.sin(r) * 0.11;
        legLX = Math.sin(r) * 0.85;
        legRX = -Math.sin(r) * 0.85;
        wingLZ = -0.46 + Math.sin(r) * 0.25;
        wingRZ = 0.46 - Math.sin(r) * 0.25;
        headPitch = -0.14;
        tailX = 0.18 + Math.sin(r) * 0.16;
        break;
      }
      case 'jump': {
        torsoY = 0.76;
        torsoPitch = THREE.MathUtils.clamp(-this.velocity.y * 0.03, -0.22, 0.22);
        wingLZ = -0.95;
        wingRZ = 0.95;
        legLX = 0.45;
        legRX = 0.25;
        tailX = 0.25;
        break;
      }
      case 'flap': {
        const f = t * 22.0;
        torsoY = 0.78 + Math.sin(f) * 0.06;
        torsoPitch = 0.12;
        wingLZ = -0.82 + Math.sin(f) * 0.72;
        wingRZ = 0.82 - Math.sin(f) * 0.72;
        legLX = 0.5;
        legRX = 0.5;
        jawOpen = 0.18;
        tailX = 0.22 + Math.sin(f) * 0.12;
        break;
      }
      case 'swim': {
        const s = t * 7.5;
        torsoY = 0.56 + Math.sin(s * 0.6) * 0.05;
        torsoPitch = 0.40;
        wingLZ = -0.62 + Math.sin(s) * 0.35;
        wingRZ = 0.62 - Math.sin(s) * 0.35;
        wingLY = Math.cos(s) * 0.28;
        wingRY = -Math.cos(s) * 0.28;
        legLX = Math.sin(s * 1.4) * 0.65;
        legRX = -Math.sin(s * 1.4) * 0.65;
        headPitch = -0.34;
        tailX = 0.35;
        break;
      }
      case 'collect': {
        const c = Math.sin(Math.min(1, t * 2.2) * Math.PI);
        torsoY = 0.72 + c * 0.18;
        torsoPitch = c * 0.28;
        wingLZ = -0.28 - c * 0.75;
        wingRZ = 0.28 + c * 0.75;
        jawOpen = c * 0.35;
        headPitch = -c * 0.15;
        break;
      }
      case 'openDoor': {
        const d = Math.sin(Math.min(1, t * 1.8) * Math.PI);
        torsoPitch = d * 0.18;
        wingRZ = 0.38 + d * 0.65;
        wingRY = d * 0.55;
        headYaw = -d * 0.2;
        break;
      }
      case 'openChest': {
        const o = Math.sin(Math.min(1, t * 1.4) * Math.PI);
        torsoY = 0.72 + o * 0.14;
        torsoPitch = 0.25 - o * 0.35;
        wingLZ = -0.35 - o * 0.9;
        wingRZ = 0.35 + o * 0.9;
        jawOpen = o * 0.48;
        break;
      }
      case 'celebrate': {
        const cel = t * 12.0;
        torsoY = 0.72 + Math.abs(Math.sin(cel * 0.6)) * 0.34;
        wingLZ = -0.85 + Math.sin(cel) * 0.65;
        wingRZ = 0.85 - Math.sin(cel) * 0.65;
        legLX = Math.sin(cel * 0.6) * 0.35;
        legRX = -Math.sin(cel * 0.6) * 0.35;
        jawOpen = 0.35 + Math.sin(cel) * 0.15;
        headPitch = -0.18;
        tailX = Math.sin(cel) * 0.25;
        break;
      }
    }

    const blend = 14;
    this.pose.torsoY     = damp(this.pose.torsoY, torsoY, blend, clampedDt);
    this.pose.torsoPitch = damp(this.pose.torsoPitch, torsoPitch, blend, clampedDt);
    this.pose.torsoRoll  = damp(this.pose.torsoRoll, torsoRoll, blend, clampedDt);
    this.pose.headPitch  = damp(this.pose.headPitch, headPitch, blend, clampedDt);
    this.pose.headYaw    = damp(this.pose.headYaw, headYaw, blend, clampedDt);
    this.pose.jawOpen    = damp(this.pose.jawOpen, jawOpen, blend, clampedDt);
    this.pose.wingLZ     = damp(this.pose.wingLZ, wingLZ, blend, clampedDt);
    this.pose.wingRZ     = damp(this.pose.wingRZ, wingRZ, blend, clampedDt);
    this.pose.wingLY     = damp(this.pose.wingLY, wingLY, blend, clampedDt);
    this.pose.wingRY     = damp(this.pose.wingRY, wingRY, blend, clampedDt);
    this.pose.legLX      = damp(this.pose.legLX, legLX, blend, clampedDt);
    this.pose.legRX      = damp(this.pose.legRX, legRX, blend, clampedDt);
    this.pose.tailX      = damp(this.pose.tailX, tailX, blend, clampedDt);

    if (this.bones.torso) {
      this.bones.torso.position.y = this.pose.torsoY;
      this.bones.torso.rotation.x = this.pose.torsoPitch;
      this.bones.torso.rotation.z = this.pose.torsoRoll;
    }
    if (this.bones.head) {
      this.bones.head.rotation.x = this.pose.headPitch;
      this.bones.head.rotation.y = this.pose.headYaw;
    }
    if (this.bones.jaw) this.bones.jaw.rotation.x = this.pose.jawOpen;
    if (this.bones.wingL) {
      this.bones.wingL.rotation.z = this.pose.wingLZ;
      this.bones.wingL.rotation.y = this.pose.wingLY;
    }
    if (this.bones.wingR) {
      this.bones.wingR.rotation.z = this.pose.wingRZ;
      this.bones.wingR.rotation.y = this.pose.wingRY;
    }
    if (this.bones.legL) this.bones.legL.rotation.x = this.pose.legLX;
    if (this.bones.legR) this.bones.legR.rotation.x = this.pose.legRX;
    if (this.bones.tail) this.bones.tail.rotation.x = this.pose.tailX;

    this.root.position.copy(this.position);
    this.root.rotation.y = this.facing;
  }
}
