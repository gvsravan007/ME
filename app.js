(() => {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════════
  // STATE & WAYPOINTS
  // ═══════════════════════════════════════════════════════════════════════

  const S = {
    aegisData: null, animaData: null, animaUnlocked: false, fails: 0,
    mx: 0, my: 0, scroll: 0, maxScroll: 0.5, currentZone: 1,
    scene: null, cam: null, renderer: null, clock: null,
    aegisPath: null, animaPath: null, activePath: null,
    stars: null, starMat: null, 
    nebulaRed: null, nebulaGreen: null,
    pinkAnomaly: null, raycaster: new THREE.Raycaster(), mouse: new THREE.Vector2(),
    running: false, warpActive: false
  };

  // Waypoints (dynamically populated)
  let SECTIONS = [];

  const $ = id => document.getElementById(id);

  // ═══════════════════════════════════════════════════════════════════════
  // CRYPTO CORE
  // ═══════════════════════════════════════════════════════════════════════

  async function deriveKey(password, salt) {
    const keyMat = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' }, keyMat, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  
  async function decrypt(b64, pw) {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const key = await deriveKey(pw, buf.slice(0, 16));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(16, 28) }, key, buf.slice(28));
    return new TextDecoder().decode(dec);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BOOT & GATES
  // ═══════════════════════════════════════════════════════════════════════

  document.addEventListener('DOMContentLoaded', () => {
    if(!window.SITE_DATA) return console.error("Missing data.js!");
    
    setTimeout(() => {
      gsap.to($('loader'), { opacity: 0, duration: 0.5, onComplete: () => $('loader').style.display = 'none' });
      $('password-gate').style.display = 'flex';
      $('password-input').focus();
    }, 1500);

    $('password-input').addEventListener('keydown', e => { if (e.key === 'Enter') aegisAuth(); });
    $('submit-btn').addEventListener('click', aegisAuth);
    
    $('anima-password-input').addEventListener('keydown', e => { if (e.key === 'Enter') animaAuth(); });
    $('anima-submit-btn').addEventListener('click', animaAuth);
    $('anima-skip-btn').addEventListener('click', () => {
      $('anima-gate').style.display = 'none';
      window.scrollTo({ top: (0.45) * getH(), behavior: 'smooth' });
    });
    
    window.addEventListener('mousemove', e => {
      S.mx = (e.clientX / window.innerWidth) * 2 - 1;
      S.my = (e.clientY / window.innerHeight) * 2 - 1;
      S.mouse.x = S.mx; S.mouse.y = -S.my;
    });

    window.addEventListener('click', onCanvasClick);
    initUptimeCounter();
  });

  function msg(id, txt, cls) { $(id).textContent = txt; $(id).className = 'gate-message ' + cls; }

  function initUptimeCounter() {
    const startDate = new Date(1152772200 * 1000);
    function update() {
      const now = new Date();
      let diff = Math.floor((now - startDate) / 1000);
      if(isNaN(diff) || diff < 0) diff = 0;
      
      const years = Math.floor(diff / (365.25 * 24 * 3600));
      diff -= Math.floor(years * 365.25 * 24 * 3600);
      
      const days = Math.floor(diff / (24 * 3600));
      diff -= days * 24 * 3600;
      
      const hours = Math.floor(diff / 3600);
      diff -= hours * 3600;
      
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      
      const el = $('uptime-counter');
      if(el) {
        el.textContent = `${years}Y ${String(days).padStart(3, '0')}D ${String(hours).padStart(2, '0')}H ${String(mins).padStart(2, '0')}M ${String(secs).padStart(2, '0')}S`;
      }
    }
    update();
    setInterval(update, 1000);
  }

  async function aegisAuth() {
    const pw = $('password-input').value.trim();
    if(!pw) return;
    try {
      S.aegisData = JSON.parse(await decrypt(window.SITE_DATA.aegis, pw));
      
      // Build Aegis Sections Dynamically (0.1 to 0.45 range)
      const N = S.aegisData.length;
      S.aegisData.forEach((_, i) => {
        let t = 0.25;
        if(N > 1) t = 0.1 + (i / (N - 1)) * 0.35;
        SECTIONS.push({ id: 's-' + i, t });
      });

      msg('gate-message', 'ACCESS GRANTED', 'success');
      setTimeout(launch, 500);
    } catch {
      S.fails++; $('attempt-counter').textContent = `ATTEMPTS: ${S.fails}/5`;
      msg('gate-message', 'ACCESS DENIED', 'error');
      $('password-input').closest('.input-row').classList.add('shake');
      setTimeout(() => $('password-input').closest('.input-row').classList.remove('shake'), 400);
    }
  }

  async function launch() {
    $('password-gate').style.display = 'none';
    $('cinematic-intro').style.display = 'flex';
    
    const steps = [
      { t: 'IDENTITY VERIFIED', d: 1000 },
      { t: 'ESTABLISHING NEURAL LINK', d: 1000 },
      { t: 'WELCOME BACK, ORDINATOR', d: 1000 },
    ];
    for (const s of steps) {
      $('intro-line').textContent = s.t;
      gsap.to($('intro-line'), { opacity: 1, duration: 0.3 });
      gsap.to($('intro-progress-bar'), { width: '100%', duration: s.d/1000, ease: 'linear' });
      await new Promise(r => setTimeout(r, s.d));
      gsap.to($('intro-line'), { opacity: 0, duration: 0.2 });
      $('intro-progress-bar').style.width = '0';
      await new Promise(r => setTimeout(r, 200));
    }
    
    $('cinematic-intro').style.display = 'none';
    init3D();
    renderPanels();
    $('scroll-progress').style.display = 'block';
    $('scroll-hint').style.display = 'flex';
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 3D VIBRANT SPACE ENGINE (Two Distinct Zones)
  // ═══════════════════════════════════════════════════════════════════════

  function init3D() {
    S.scene = new THREE.Scene();
    S.scene.fog = new THREE.FogExp2(0x020204, 0.003);
    S.cam = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 4000);
    S.renderer = new THREE.WebGLRenderer({ canvas: $('three-canvas'), antialias: true, alpha: false });
    S.renderer.setSize(window.innerWidth, window.innerHeight);
    S.renderer.setClearColor(0x020204, 1);
    S.clock = new THREE.Clock();

    // Zone 1: Aegis (z: 100 to -1500)
    S.aegisPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 100),
      new THREE.Vector3(30, 20, -300),
      new THREE.Vector3(-30, -20, -700),
      new THREE.Vector3(0, 0, -1100),
      new THREE.Vector3(0, 0, -1500)
    ]);

    // Zone 2: Anima (z: -5000 to -7000)
    S.animaPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, -5000),
      new THREE.Vector3(40, -40, -5400),
      new THREE.Vector3(-40, 30, -5800), // Pink anomaly goes near here
      new THREE.Vector3(0, 0, -6400),
      new THREE.Vector3(0, 0, -7000)
    ]);
    S.activePath = S.aegisPath;

    // Stars
    const sc = 20000;
    const pos = new Float32Array(sc * 3);
    for(let i=0; i<sc; i++) {
      // Distribute stars across both zones
      pos[i*3] = (Math.random()-0.5)*3000;
      pos[i*3+1] = (Math.random()-0.5)*3000;
      pos[i*3+2] = Math.random() < 0.5 ? (Math.random()-0.5)*3000 - 500 : (Math.random()-0.5)*3000 - 6000;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    
    S.starMat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(0xffffff) }, warpSpeed: { value: 0.0 }, time: { value: 0.0 } },
      vertexShader: `
        uniform float warpSpeed;
        void main() {
          vec3 p = position;
          p.z += warpSpeed * p.z * 1.5;
          vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (1.5 + warpSpeed * 6.0) * (600.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color; uniform float warpSpeed;
        void main() {
          vec2 xy = gl_PointCoord.xy - vec2(0.5);
          float ll = length(xy); if(ll > 0.5) discard;
          float alpha = (0.5 - ll) * 2.0;
          vec3 finalColor = mix(color, vec3(0.5, 0.8, 1.0), warpSpeed);
          gl_FragColor = vec4(finalColor, alpha * (0.4 + warpSpeed*0.6));
        }
      `,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    S.stars = new THREE.Points(geo, S.starMat);
    S.scene.add(S.stars);

    // Nebulas
    S.nebulaRed = createNebula(0xff0033, 1000, 0, -1500);
    S.nebulaGreen = createNebula(0x00ff88, 1500, -4500, -7000);
    S.scene.add(S.nebulaRed);
    S.scene.add(S.nebulaGreen);

    // The Pink Anomaly (People Route trigger)
    const anomalyGeo = new THREE.IcosahedronGeometry(25, 2);
    const anomalyMat = new THREE.MeshBasicMaterial({ color: 0xff00cc, wireframe: true, transparent: true, opacity: 0.8 });
    S.pinkAnomaly = new THREE.Mesh(anomalyGeo, anomalyMat);
    S.pinkAnomaly.position.set(90, 15, -5700); // Positioned halfway through Anima's zone, off to the side
    S.scene.add(S.pinkAnomaly);
    
    // Anomaly Core Glow
    const coreGeo = new THREE.SphereGeometry(15, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xff00cc, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending });
    S.pinkAnomaly.add(new THREE.Mesh(coreGeo, coreMat));

    window.addEventListener('resize', () => {
      S.cam.aspect = window.innerWidth/window.innerHeight;
      S.cam.updateProjectionMatrix();
      S.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    S.running = true;
    animate();
  }
  
  function createNebula(colorHex, count, zStart, zEnd) {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const baseC = new THREE.Color(colorHex);
    for(let i=0; i<count; i++) {
      const r = 50 + Math.random()*150;
      const a1 = Math.random()*Math.PI*2;
      const a2 = Math.random()*Math.PI*2;
      pos[i*3] = Math.sin(a1)*Math.cos(a2)*r;
      pos[i*3+1] = Math.sin(a1)*Math.sin(a2)*r;
      pos[i*3+2] = zStart + Math.random() * (zEnd - zStart);
      col[i*3] = baseC.r; col[i*3+1] = baseC.g; col[i*3+2] = baseC.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    
    const c = document.createElement('canvas'); c.width=64; c.height=64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.fillRect(0,0,64,64);
    
    const mat = new THREE.PointsMaterial({
      size: 40, vertexColors: true, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false, map: new THREE.CanvasTexture(c)
    });
    return new THREE.Points(geo, mat);
  }

  function animate() {
    if(!S.running) return;
    requestAnimationFrame(animate);
    const t = S.clock.getElapsedTime();

    if(S.pinkAnomaly) {
      S.pinkAnomaly.rotation.x = t * 0.5;
      S.pinkAnomaly.rotation.y = t * 0.3;
      // Pulse scale
      const s = 1 + Math.sin(t*2)*0.1;
      S.pinkAnomaly.scale.set(s,s,s);
    }

    if(S.warpActive) {
      S.stars.rotation.z += 0.02;
    } else {
      // Normal map scroll (0 to 0.5 maps to Aegis path 0-1) (0.5 to 1.0 maps to Anima path 0-1)
      let localProg = 0;
      if(S.currentZone === 1) {
        localProg = S.scroll / 0.5; // 0 to 1
        S.activePath = S.aegisPath;
      } else {
        localProg = (S.scroll - 0.5) / 0.5; // 0 to 1
        S.activePath = S.animaPath;
      }
      localProg = Math.max(0, Math.min(localProg, 0.999));

      const pt = S.activePath.getPointAt(localProg);
      const look = S.activePath.getPointAt(Math.min(localProg + 0.015, 0.999));
      
      S.cam.position.lerp(new THREE.Vector3(pt.x + S.mx*10, pt.y - S.my*10, pt.z), 0.1);
      S.cam.lookAt(look);
      S.stars.rotation.z = t * 0.002;
    }
    S.renderer.render(S.scene, S.cam);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SCROLLING & PANELS
  // ═══════════════════════════════════════════════════════════════════════

  const getH = () => document.documentElement.scrollHeight - window.innerHeight;

  function onScroll() {
    if($('people-login-route').style.display === 'flex') return;
    $('scroll-hint').style.display = 'none';
    
    const raw = window.scrollY / getH();
    S.scroll = Math.min(raw, S.maxScroll);

    if(S.warpActive) return;

    // GATE BLOCKER
    if (raw > S.maxScroll + 0.01 && !S.animaUnlocked) {
      window.scrollTo(0, S.maxScroll * getH());
      $('anima-gate').style.display = 'flex';
      setTimeout(() => $('anima-password-input').focus(), 100);
      return;
    }

    // REVERSE WARP LOGIC (Anima -> Aegis)
    if (S.animaUnlocked && S.scroll < 0.45 && S.currentZone === 2) {
      triggerWarp(1); // Jump back to Aegis
      return;
    }
    // FORWARD WARP LOGIC (Aegis -> Anima, if already unlocked)
    if (S.animaUnlocked && S.scroll > 0.55 && S.currentZone === 1) {
      triggerWarp(2); // Jump to Anima
      return;
    }

    // UI Updates
    $('scroll-progress-fill').style.height = (S.scroll * 100) + '%';
    $('scroll-progress-dot').style.bottom = (S.scroll * 100) + '%';

    if (S.currentZone === 2) {
      $('scroll-progress-fill').style.background = 'var(--green-primary)';
      $('scroll-progress-fill').style.boxShadow = '0 0 8px var(--green-glow)';
      $('scroll-progress-dot').style.background = 'var(--green-primary)';
      $('scroll-progress-dot').style.boxShadow = '0 0 12px var(--green-glow-strong)';
      $('return-aegis-btn').style.display = 'block';
    } else {
      $('scroll-progress-fill').style.background = '';
      $('scroll-progress-fill').style.boxShadow = '';
      $('scroll-progress-dot').style.background = '';
      $('scroll-progress-dot').style.boxShadow = '';
      $('return-aegis-btn').style.display = 'none';
    }

    $('return-aegis-btn').onclick = () => {
      window.scrollTo({ top: 0.4 * getH(), behavior: 'smooth' });
    };

    updatePanelVisibility();
  }

  function updatePanelVisibility() {
    const aegisN = (S.aegisData && Array.isArray(S.aegisData)) ? S.aegisData.length : 1;
    const animaN = (S.animaData && Array.isArray(S.animaData)) ? S.animaData.length : 1;
    const stepAegis = aegisN > 1 ? 0.35 / (aegisN - 1) : 0.2;
    const stepAnima = animaN > 1 ? 0.35 / (animaN - 1) : 0.2;

    SECTIONS.forEach(sec => {
      const p = $('panel-' + sec.id);
      if(!p) return;

      const isAegis = sec.id.startsWith('s-');
      const isAnima = sec.id.startsWith('v-');

      // Strict Zone Filter: hide Aegis panels in Zone 2, hide Anima panels in Zone 1
      if ((S.currentZone === 1 && !isAegis) || (S.currentZone === 2 && !isAnima)) {
        p.classList.remove('visible');
        return;
      }

      const step = isAegis ? stepAegis : stepAnima;
      const threshold = Math.min(0.045, step * 0.42);
      const dist = Math.abs(S.scroll - sec.t);

      if (dist < threshold) {
        p.classList.add('visible');
      } else {
        p.classList.remove('visible');
      }
    });
  }

  function renderPanels() {
    const html = [];
    if(S.aegisData && Array.isArray(S.aegisData)) {
      S.aegisData.forEach((data, i) => {
        let extra = '';
        if(data.showUptime) {
           extra += `<div class="panel-uptime-box"><span class="uptime-label">SYSTEM UPTIME // ORDINATOR CHRONO</span><div id="uptime-counter">00Y 000D 00H 00M 00S</div></div>`;
        }
        if(data.quotes) {
           extra += data.quotes.map(q => `<div class="panel-quote red">${q.text}<div class="panel-quote-attr">${q.attr}</div></div>`).join('');
        }
        html.push(makePanel('s-' + i, 'red', data, extra));
      });
    }
    $('content-overlay').innerHTML = html.join('');
  }

  function makePanel(id, color, data, extra = '') {
    return `
      <div class="content-panel ${color === 'green' ? 'anima-panel' : ''}" id="panel-${id}">
        <div class="panel-accent ${color}"></div>
        <div class="panel-label">${data.label}</div>
        <h2 class="panel-heading ${color}">${data.heading}</h2>
        <div class="panel-text">${data.text}</div>
        ${extra}
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ANIMA WARP & RAYCASTING
  // ═══════════════════════════════════════════════════════════════════════

  async function animaAuth() {
    const pw = $('anima-password-input').value.trim();
    if(!pw) return;
    try {
      if(!S.animaData) S.animaData = JSON.parse(await decrypt(window.SITE_DATA.anima, pw));
      $('anima-gate').style.display = 'none';
      S.animaUnlocked = true;
      S.maxScroll = 1;
      
      // Remove any existing anima panels & sections to prevent dupes
      let html = $('content-overlay').innerHTML;
      html = html.replace(/<div class="content-panel anima-panel"[\s\S]*?<\/div>\s*<\/div>/g, '');
      SECTIONS = SECTIONS.filter(s => !s.id.startsWith('v-'));

      // Build Anima Sections Dynamically (0.6 to 0.95 range)
      const vd = S.animaData;
      const N = vd.length;
      
      vd.forEach((data, i) => {
        let t = 0.75;
        if(N > 1) t = 0.6 + (i / (N - 1)) * 0.35;
        SECTIONS.push({ id: 'v-' + i, t });
        
        let extra = '';
        if(data.quotes) {
           extra = data.quotes.map(q => `<div class="panel-quote green">${q.text}<div class="panel-quote-attr">${q.attr}</div></div>`).join('');
        }
        html += makePanel('v-' + i, 'green', data, extra);
      });
      
      $('content-overlay').innerHTML = html;

      // Ensure scroll position is past the gate
      window.scrollTo(0, 0.6 * getH());
      triggerWarp(2);
    } catch {
      msg('anima-gate-message', 'AEGIS: ACCESS DENIED.', 'error');
      $('anima-password-input').closest('.input-row').classList.add('shake');
      setTimeout(() => $('anima-password-input').closest('.input-row').classList.remove('shake'), 400);
    }
  }

  // zoneId: 1 for Aegis, 2 for Anima
  function triggerWarp(zoneId) {
    if(S.warpActive || S.currentZone === zoneId) return;
    S.warpActive = true;
    const overlay = $('warp-overlay');
    
    const tl = gsap.timeline({
      onComplete: () => {
        S.warpActive = false;
        S.currentZone = zoneId;
        updatePanelVisibility();
        if(zoneId === 2) {
          S.scene.fog.color.setHex(0x011a10);
          S.renderer.setClearColor(0x011a10);
        } else {
          S.scene.fog.color.setHex(0x020204);
          S.renderer.setClearColor(0x020204);
        }
      }
    });

    tl.to(S.starMat.uniforms.warpSpeed, { value: 1.0, duration: 1.5, ease: "power2.in" }, 0);
    tl.to(S.cam, { fov: 140, duration: 1.5, ease: "power2.in", onUpdate: () => S.cam.updateProjectionMatrix() }, 0);
    tl.to(overlay, { opacity: 1, duration: 0.2 }, 1.3);
    
    // Teleport at peak flash
    tl.call(() => {
      S.currentZone = zoneId;
      updatePanelVisibility();
      // FORCE SNAP CAMERA POSITION so it doesn't lerp across the universe
      let localProg = 0;
      let path = null;
      if(zoneId === 1) {
         localProg = S.scroll / 0.5;
         path = S.aegisPath;
      } else {
         localProg = (S.scroll - 0.5) / 0.5;
         path = S.animaPath;
      }
      localProg = Math.max(0, Math.min(localProg, 0.999));
      const pt = path.getPointAt(localProg);
      S.cam.position.set(pt.x + S.mx*10, pt.y - S.my*10, pt.z);
    }, null, 1.4);

    tl.to(S.starMat.uniforms.warpSpeed, { value: 0.0, duration: 1.5, ease: "power3.out" }, 1.5);
    tl.to(S.cam, { fov: 60, duration: 1.5, ease: "power3.out", onUpdate: () => S.cam.updateProjectionMatrix() }, 1.5);
    tl.to(overlay, { opacity: 0, duration: 1.5 }, 1.5);
  }

  function onCanvasClick() {
    if(S.currentZone !== 2 || S.warpActive) return;
    
    S.raycaster.setFromCamera(S.mouse, S.cam);
    const intersects = S.raycaster.intersectObject(S.pinkAnomaly, true);
    
    if(intersects.length > 0) {
      openPeopleRoute();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PEOPLE ROUTE (Isolated Login)
  // ═══════════════════════════════════════════════════════════════════════

  function openPeopleRoute() {
    $('content-overlay').style.display = 'none';
    $('scroll-progress').style.display = 'none';
    $('return-aegis-btn').style.display = 'none';
    $('people-login-route').style.display = 'flex';
    
    $('people-auth-box').style.display = 'block';
    $('decrypted-profile-container').style.display = 'none';
    $('person-name-input').value = '';
    $('person-key-input').value = '';
    msg('person-gate-message', '', 'info');
  }

  $('people-back-btn').addEventListener('click', () => {
    $('people-login-route').style.display = 'none';
    $('content-overlay').style.display = 'flex';
    $('scroll-progress').style.display = 'block';
    $('return-aegis-btn').style.display = 'block';
  });

  $('person-submit-btn').addEventListener('click', tryDecryptPerson);
  $('person-key-input').addEventListener('keydown', e => { if(e.key === 'Enter') tryDecryptPerson(); });

  async function tryDecryptPerson() {
    const name = $('person-name-input').value.trim();
    const key = $('person-key-input').value.trim();
    if(!name || !key) return;
    
    const combo = name + key;
    msg('person-gate-message', 'DECRYPTING FREQUENCY...', 'info');
    
    let matched = null;
    for(const blob of window.SITE_DATA.people) {
      try {
        const jsonStr = await decrypt(blob, combo);
        matched = JSON.parse(jsonStr);
        break; // Stop at first match
      } catch { continue; }
    }
    
    if(matched) {
      $('people-auth-box').style.display = 'none';
      const c = $('decrypted-profile-container');
      
      // Inject decrypted custom data
      c.innerHTML = `
        <div class="profile-emoji">${matched.emoji || '✨'}</div>
        <div class="profile-name" style="color: ${matched.color || '#fff'}; text-shadow: 0 0 20px ${matched.color || '#fff'}88;">
          ${matched.name.toUpperCase()}
        </div>
        <div class="profile-text">${matched.thoughts}</div>
      `;
      c.style.display = 'block';
      c.style.borderLeftColor = matched.color || '#fff';
      
    } else {
      msg('person-gate-message', 'FREQUENCY NOT FOUND. INVALID KEY.', 'error');
      $('person-key-input').closest('.input-row').classList.add('shake');
      setTimeout(() => $('person-key-input').closest('.input-row').classList.remove('shake'), 400);
    }
  }

})();
