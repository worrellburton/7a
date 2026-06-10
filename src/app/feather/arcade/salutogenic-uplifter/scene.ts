// Salutogenic Uplifter · Three.js arena.
//
// One self-contained scene class the React layer drives imperatively
// (React state never touches the render loop). Golden-hour desert
// arena: gradient sky dome, haze fog, low-poly mountain ridge, cacti,
// drifting dust motes, two stylized characters facing off. Each
// character's head carries the player's profile picture as a
// circle-cropped texture (canvas-drawn initial as the fallback, since
// WebGL textures need CORS-clean images and some avatar hosts won't
// play along).
//
// "Combat" is a cast: the actor leans in, an emissive orb arcs across
// the gap, bursts into particles on the receiver, who glows and pulses.
// Power bars / choices / timers are all HTML on top — crisper than
// in-scene text and free accessibility.

import * as THREE from 'three';

type Side = 'left' | 'right';

interface Tween {
  // Returns false when finished.
  update(dt: number, elapsed: number): boolean;
}

interface CharacterRig {
  group: THREE.Group;
  body: THREE.Group;
  head: THREE.Mesh;
  face: THREE.Mesh;
  faceMaterial: THREE.MeshBasicMaterial;
  armFront: THREE.Group;
  aura: THREE.Mesh;
  auraMaterial: THREE.MeshBasicMaterial;
  auraLight: THREE.PointLight;
  baseX: number;
  facing: number; // +1 faces right, -1 faces left
}

function makeGlowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,220,160,0.55)');
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Circle-cropped avatar texture. Resolves immediately with an
// initial-on-gradient placeholder and swaps in the photo when (if)
// it loads CORS-clean.
function makeAvatarTexture(
  name: string,
  url: string | null,
  tint: string,
): THREE.CanvasTexture {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;

  const drawFallback = () => {
    const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
    g.addColorStop(0, tint);
    g.addColorStop(1, '#2e2a26');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = `bold ${SIZE * 0.45}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((name || '?').charAt(0).toUpperCase(), SIZE / 2, SIZE / 2 + SIZE * 0.02);
  };
  drawFallback();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;

  if (url) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.save();
        ctx.beginPath();
        ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
        ctx.clip();
        // Cover-fit the source into the circle.
        const s = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * s;
        const h = img.height * s;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        ctx.restore();
        tex.needsUpdate = true;
      } catch {
        drawFallback();
        tex.needsUpdate = true;
      }
    };
    img.onerror = () => { /* keep fallback */ };
    img.src = url;
  }
  return tex;
}

export class UplifterScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private tweens: Tween[] = [];
  private rigs: Record<Side, CharacterRig>;
  private dust: THREE.Points;
  private glowTex: THREE.Texture;
  private raf = 0;
  private disposed = false;
  private camShake = 0;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 450;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 200);
    this.camera.position.set(0, 2.3, 8.2);
    this.camera.lookAt(0, 1.5, 0);

    this.scene.fog = new THREE.Fog(0xe8b98a, 22, 70);
    this.glowTex = makeGlowTexture();

    this.buildEnvironment();
    this.rigs = {
      left: this.buildCharacter('left', -2.4, '#b06a3b'),
      right: this.buildCharacter('right', 2.4, '#4f7d76'),
    };
    this.dust = this.buildDust();

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ── Environment ────────────────────────────────────────────

  private buildEnvironment() {
    // Sky dome — vertical sunset gradient via vertex shader.
    const skyGeo = new THREE.SphereGeometry(90, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#33457a') },
        mid: { value: new THREE.Color('#d77f5b') },
        bottom: { value: new THREE.Color('#f6c489') },
      },
      vertexShader: `
        varying float vY;
        void main() {
          vY = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
        varying float vY;
        void main() {
          float t = clamp(vY, -0.05, 1.0);
          vec3 col = t < 0.18
            ? mix(bottom, mid, smoothstep(-0.05, 0.18, t))
            : mix(mid, top, smoothstep(0.18, 0.85, t));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Sun glow sprite low on the horizon.
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffd9a0, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    sun.position.set(-14, 6, -45);
    sun.scale.setScalar(30);
    this.scene.add(sun);

    // Lighting — warm key (the sun), cool fill, soft ambient.
    const key = new THREE.DirectionalLight(0xffd2a0, 2.4);
    key.position.set(-9, 9, -6);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0x9db4ff, 0.55);
    fill.position.set(8, 5, 8);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0xffe6c8, 0.5));

    // Ground — sandy disc.
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(70, 48),
      new THREE.MeshStandardMaterial({ color: 0xc99e69, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Arena ring scuffed into the sand.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.4, 4.55, 64),
      new THREE.MeshBasicMaterial({ color: 0xa87c4d, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.01;
    this.scene.add(ring);

    // Distant low-poly mountain ridge.
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x6e5570, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const hgt = 5 + ((i * 37) % 7);
      const m = new THREE.Mesh(new THREE.ConeGeometry(6 + ((i * 13) % 5), hgt, 4), ridgeMat);
      m.position.set(-34 + i * 9 + ((i * 7) % 3), hgt / 2 - 0.5, -42 - ((i * 11) % 8));
      m.rotation.y = (i * 1.7) % Math.PI;
      this.scene.add(m);
    }

    // A few saguaros.
    const cactusMat = new THREE.MeshStandardMaterial({ color: 0x4d6b3f, roughness: 0.95 });
    const cactusAt = (x: number, z: number, s: number) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 1.7 * s, 6, 12), cactusMat);
      trunk.position.y = 1.1 * s;
      trunk.castShadow = true;
      g.add(trunk);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.13 * s, 0.6 * s, 6, 10), cactusMat);
      arm.position.set(0.38 * s, 1.25 * s, 0);
      arm.rotation.z = -0.5;
      g.add(arm);
      const arm2 = arm.clone();
      arm2.position.x = -0.38 * s;
      arm2.rotation.z = 0.5;
      arm2.position.y = 0.95 * s;
      g.add(arm2);
      g.position.set(x, 0, z);
      this.scene.add(g);
    };
    cactusAt(-8, -10, 1.4);
    cactusAt(9.5, -13, 1.8);
    cactusAt(6, -7, 0.9);
    cactusAt(-12, -18, 2.2);
  }

  private buildDust(): THREE.Points {
    const N = 140;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.glowTex,
      color: 0xffe2b0,
      size: 0.09,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    return points;
  }

  // ── Characters ─────────────────────────────────────────────

  private buildCharacter(side: Side, baseX: number, tint: string): CharacterRig {
    const facing = side === 'left' ? 1 : -1;
    const group = new THREE.Group();
    group.position.set(baseX, 0, 0);
    // Quarter-turn toward the camera, fighting-game style.
    group.rotation.y = facing * (Math.PI / 2) - facing * 0.5;

    const body = new THREE.Group();
    group.add(body);

    const c = new THREE.Color(tint);
    const clothMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.75 });
    const darker = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.6), roughness: 0.85 });

    // Legs
    for (const lx of [-0.17, 0.17]) {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.62, 6, 12), darker);
      leg.position.set(lx, 0.52, 0);
      leg.castShadow = true;
      body.add(leg);
    }
    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.62, 8, 16), clothMat);
    torso.position.y = 1.32;
    torso.castShadow = true;
    body.add(torso);
    // Bandana knot detail
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.07, 8, 16), darker);
    scarf.position.y = 1.78;
    scarf.rotation.x = Math.PI / 2;
    body.add(scarf);

    // Arms — front arm is its own pivot group so the cast can raise it.
    const armGeo = new THREE.CapsuleGeometry(0.09, 0.52, 6, 10);
    const armBack = new THREE.Mesh(armGeo, clothMat);
    armBack.position.set(-0.42, 1.34, -0.05);
    armBack.rotation.z = 0.35;
    armBack.castShadow = true;
    body.add(armBack);

    const armFront = new THREE.Group();
    armFront.position.set(0.42, 1.56, 0.05);
    const armMesh = new THREE.Mesh(armGeo, clothMat);
    armMesh.position.y = -0.28;
    armMesh.castShadow = true;
    armFront.add(armMesh);
    armFront.rotation.z = -0.35;
    body.add(armFront);

    // Head + avatar face. The face is a circular decal hovering just
    // off the sphere, oriented out the character's front so the camera
    // (and the opponent) sees the player's photo.
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xe8c39a, roughness: 0.7 }),
    );
    head.position.y = 2.12;
    head.castShadow = true;
    body.add(head);

    const faceMaterial = new THREE.MeshBasicMaterial({ transparent: false });
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), faceMaterial);
    face.position.set(0, 2.12, 0.27);
    body.add(face);

    // Stetson — disc brim + dome.
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9 });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 24), hatMat);
    brim.position.y = 2.36;
    brim.castShadow = true;
    body.add(brim);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hatMat);
    crown.position.y = 2.37;
    body.add(crown);

    // Mood aura — soft ring at the feet + tinted light. Hidden until
    // a mood is set.
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const aura = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.85, 40), auraMaterial);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = 0.02;
    group.add(aura);

    const auraLight = new THREE.PointLight(0xffffff, 0, 5);
    auraLight.position.set(0, 1.6, 0.6);
    group.add(auraLight);

    this.scene.add(group);
    return { group, body, head, face, faceMaterial, armFront, aura, auraMaterial, auraLight, baseX, facing };
  }

  // ── Public API ─────────────────────────────────────────────

  setPlayer(side: Side, name: string, avatarUrl: string | null) {
    const tint = side === 'left' ? '#b06a3b' : '#4f7d76';
    const tex = makeAvatarTexture(name, avatarUrl, tint);
    this.rigs[side].faceMaterial.map = tex;
    this.rigs[side].faceMaterial.needsUpdate = true;
  }

  // Tint a character's aura by mood (null clears it).
  setMood(side: Side, color: string | null) {
    const rig = this.rigs[side];
    if (!color) {
      rig.auraMaterial.opacity = 0;
      rig.auraLight.intensity = 0;
      return;
    }
    const c = new THREE.Color(color);
    rig.auraMaterial.color = c;
    rig.auraMaterial.opacity = 0.55;
    rig.auraLight.color = c;
    rig.auraLight.intensity = 1.4;
  }

  // The actor leans in and lobs a glowing uplift orb across the arena.
  // `power` 0..1 scales orb size, burst, and the receiver's pulse.
  castUplift(from: Side, power: number, onArrive?: () => void) {
    const a = this.rigs[from];
    const b = this.rigs[from === 'left' ? 'right' : 'left'];
    const clampedPower = Math.max(0.15, Math.min(1, power));

    // Arm raise + body lean tween (out and back over 0.9s).
    const startT = this.clock.getElapsedTime();
    this.tweens.push({
      update: (_dt, t) => {
        const p = (t - startT) / 0.9;
        if (p >= 1) {
          a.armFront.rotation.z = -0.35;
          a.body.rotation.z = 0;
          return false;
        }
        const k = Math.sin(Math.min(1, p * 2) * Math.PI); // up then down
        a.armFront.rotation.z = -0.35 - k * 1.9;
        a.body.rotation.z = -a.facing * k * 0.12;
        return true;
      },
    });

    // Orb: emissive core + additive glow sprite, arcing chest→chest.
    const orb = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.1 + clampedPower * 0.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffe9b8 }),
    );
    orb.add(core);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowTex, color: 0xffc46b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    glow.scale.setScalar(1 + clampedPower * 1.3);
    orb.add(glow);
    const orbLight = new THREE.PointLight(0xffc46b, 2.5, 6);
    orb.add(orbLight);
    this.scene.add(orb);

    const from3 = new THREE.Vector3(a.baseX + a.facing * 0.5, 1.5, 0.1);
    const to3 = new THREE.Vector3(b.baseX - a.facing * 0.3, 1.5, 0.1);
    const flightStart = startT + 0.22;
    const FLIGHT = 0.7;
    let arrived = false;

    this.tweens.push({
      update: (_dt, t) => {
        if (t < flightStart) { orb.position.copy(from3); return true; }
        const p = (t - flightStart) / FLIGHT;
        if (p >= 1) {
          if (!arrived) {
            arrived = true;
            this.burstAt(to3, clampedPower);
            this.pulse(b, clampedPower);
            this.camShake = 0.05 + clampedPower * 0.1;
            onArrive?.();
          }
          this.scene.remove(orb);
          return false;
        }
        orb.position.lerpVectors(from3, to3, p);
        orb.position.y = 1.5 + Math.sin(p * Math.PI) * 1.1; // arc
        glow.material.rotation += 0.1;
        return true;
      },
    });
  }

  // Receiver feedback: golden particle burst + expanding ring.
  private burstAt(at: THREE.Vector3, power: number) {
    const N = 26 + Math.round(power * 30);
    const pos = new Float32Array(N * 3);
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = at.x;
      pos[i * 3 + 1] = at.y;
      pos[i * 3 + 2] = at.z;
      const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.6, (Math.random() - 0.5) * 2)
        .normalize()
        .multiplyScalar(1.2 + Math.random() * 1.6 * (0.5 + power));
      vel.push(dir);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: this.glowTex,
      color: 0xffd98c,
      size: 0.16,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.1, 0.16, 40),
      new THREE.MeshBasicMaterial({ color: 0xffd98c, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.position.copy(at);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    this.scene.add(ring);

    const start = this.clock.getElapsedTime();
    const LIFE = 0.9;
    this.tweens.push({
      update: (dt, t) => {
        const p = (t - start) / LIFE;
        if (p >= 1) {
          this.scene.remove(pts);
          this.scene.remove(ring);
          geo.dispose();
          return false;
        }
        const arr = geo.attributes.position.array as Float32Array;
        for (let i = 0; i < N; i++) {
          arr[i * 3] += vel[i].x * dt;
          arr[i * 3 + 1] += vel[i].y * dt - 1.4 * dt * p; // gentle gravity
          arr[i * 3 + 2] += vel[i].z * dt;
        }
        geo.attributes.position.needsUpdate = true;
        mat.opacity = 1 - p;
        const s = 1 + p * (3 + power * 3);
        ring.scale.setScalar(s);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - p);
        return true;
      },
    });
  }

  private pulse(rig: CharacterRig, power: number) {
    const start = this.clock.getElapsedTime();
    this.tweens.push({
      update: (_dt, t) => {
        const p = (t - start) / 0.55;
        if (p >= 1) { rig.body.scale.setScalar(1); return false; }
        rig.body.scale.setScalar(1 + Math.sin(p * Math.PI) * 0.1 * (0.5 + power));
        return true;
      },
    });
  }

  // Winner celebration: the uplifted character bounces, golden confetti.
  celebrate(side: Side) {
    const rig = this.rigs[side];
    const start = this.clock.getElapsedTime();
    this.tweens.push({
      update: (_dt, t) => {
        const p = t - start;
        if (p >= 3) { rig.body.position.y = 0; return false; }
        rig.body.position.y = Math.abs(Math.sin(p * 5)) * 0.35;
        return true;
      },
    });
    const at = new THREE.Vector3(rig.baseX, 2.2, 0);
    this.burstAt(at, 1);
    setTimeout(() => { if (!this.disposed) this.burstAt(at, 0.8); }, 450);
    setTimeout(() => { if (!this.disposed) this.burstAt(at, 0.6); }, 900);
  }

  resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Loop ───────────────────────────────────────────────────

  private loop() {
    if (this.disposed) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.getElapsedTime();

    // Idle: breathing bob + tiny sway, slightly out of phase per side.
    for (const side of ['left', 'right'] as Side[]) {
      const rig = this.rigs[side];
      const phase = side === 'left' ? 0 : 1.4;
      rig.body.position.y += ((Math.sin(t * 1.6 + phase) * 0.03) - rig.body.position.y) * 0.08;
      rig.body.rotation.y = Math.sin(t * 0.8 + phase) * 0.04;
      // Aura slow spin + pulse when visible.
      if (rig.auraMaterial.opacity > 0) {
        rig.aura.rotation.z += dt * 0.6;
        rig.auraMaterial.opacity = 0.4 + Math.sin(t * 2.4) * 0.15;
      }
    }

    // Dust drift.
    const dustPos = this.dust.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < dustPos.length; i += 3) {
      dustPos[i] += dt * 0.18;
      if (dustPos[i] > 12) dustPos[i] = -12;
    }
    this.dust.geometry.attributes.position.needsUpdate = true;

    // Tweens.
    this.tweens = this.tweens.filter((tw) => tw.update(dt, t));

    // Camera: slow cinematic drift + impact shake decay.
    this.camShake = Math.max(0, this.camShake - dt * 0.4);
    const shakeX = (Math.random() - 0.5) * this.camShake;
    const shakeY = (Math.random() - 0.5) * this.camShake;
    this.camera.position.x = Math.sin(t * 0.12) * 0.5 + shakeX;
    this.camera.position.y = 2.3 + Math.sin(t * 0.2) * 0.12 + shakeY;
    this.camera.lookAt(0, 1.5, 0);

    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
