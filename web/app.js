(() => {
  "use strict";

  const KEYS = "1234567890qwerty".split("");
  const STORAGE_KEY = "beat-garden-v1";
  const FALLBACK_KITS = {
    kits: [
      {
        id: "garden",
        name: "Garden",
        label: "EXAMPLE",
        emoji: "🌸",
        desc: "Soft earthy kicks, leafy hats, blossom FX",
        pads: [
          { id: "kick", name: "Dirt Kick", kind: "kick", hue: 28 },
          { id: "snare", name: "Seed Snare", kind: "snare", hue: 45 },
          { id: "hatc", name: "Leaf Hat", kind: "hat", hue: 120 },
          { id: "hato", name: "Petal Open", kind: "hatopen", hue: 140 },
          { id: "tomlo", name: "Root Tom", kind: "tom", hue: 30, freq: 90 },
          { id: "tommid", name: "Stem Tom", kind: "tom", hue: 80, freq: 140 },
          { id: "tomhi", name: "Bloom Tom", kind: "tom", hue: 330, freq: 220 },
          { id: "clap", name: "Pollen Clap", kind: "clap", hue: 50 },
          { id: "perc1", name: "Bee Buzz", kind: "perc", hue: 50, freq: 400 },
          { id: "perc2", name: "Dew Drop", kind: "perc", hue: 190, freq: 880 },
          { id: "perc3", name: "Twig Click", kind: "click", hue: 25 },
          { id: "perc4", name: "Cricket", kind: "perc", hue: 100, freq: 1200 },
          { id: "fx1", name: "Whoosh Wind", kind: "whoosh", hue: 200 },
          { id: "fx2", name: "Rain Soft", kind: "noise", hue: 210 },
          { id: "fx3", name: "Chime", kind: "chime", hue: 280 },
          { id: "fx4", name: "Bird Chirp", kind: "chirp", hue: 55 },
        ],
      },
    ],
  };

  let kitsData =
    window.__KITS__ && Array.isArray(window.__KITS__.kits) && window.__KITS__.kits.length
      ? window.__KITS__
      : FALLBACK_KITS;

  // ---------- Audio ----------
  let ctx = null;
  let master = null;
  let audioReady = false;

  function ensureAudio() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.85;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    audioReady = true;
    return ctx;
  }

  function noiseBuffer(seconds) {
    const n = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function envGain(t, a, d, s, r, peak) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
    return g;
  }

  function playPad(pad, when) {
    if (!audioReady || !ctx) return;
    const t = when != null ? when : ctx.currentTime;
    const kind = pad.kind || "perc";
    const sq = !!pad.square;

    const bloom = (hue, strength) => pushBloom(hue, strength);

    if (kind === "kick") {
      const f0 = pad.freq || 55;
      const o = ctx.createOscillator();
      o.type = sq ? "square" : "sine";
      o.frequency.setValueAtTime(f0 * 3.2, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.06);
      const g = envGain(t, 0.002, 0.08, 0.25, 0.22, 0.95);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.4);
      // body noise thump
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.08);
      const ng = envGain(t, 0.001, 0.03, 0.1, 0.04, 0.2);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 180;
      src.connect(f);
      f.connect(ng);
      ng.connect(master);
      src.start(t);
      bloom(pad.hue || 28, 1.1);
      return;
    }

    if (kind === "snare") {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.setValueAtTime(180, t);
      o.frequency.exponentialRampToValueAtTime(120, t + 0.08);
      const g = envGain(t, 0.001, 0.05, 0.2, 0.12, 0.45);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.25);
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.2);
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 900;
      const ng = envGain(t, 0.001, 0.06, 0.2, 0.12, 0.7);
      src.connect(f);
      f.connect(ng);
      ng.connect(master);
      src.start(t);
      bloom(pad.hue || 45, 1);
      return;
    }

    if (kind === "hat" || kind === "hatopen") {
      const open = kind === "hatopen";
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(open ? 0.35 : 0.08);
      const f = ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = open ? 6000 : 7500;
      const ng = envGain(t, 0.001, open ? 0.12 : 0.02, open ? 0.35 : 0.05, open ? 0.2 : 0.04, open ? 0.35 : 0.4);
      src.connect(f);
      f.connect(ng);
      ng.connect(master);
      src.start(t);
      bloom(pad.hue || 120, open ? 0.7 : 0.5);
      return;
    }

    if (kind === "tom") {
      const f0 = pad.freq || 140;
      const o = ctx.createOscillator();
      o.type = sq ? "square" : "sine";
      o.frequency.setValueAtTime(f0 * 1.6, t);
      o.frequency.exponentialRampToValueAtTime(f0, t + 0.08);
      const g = envGain(t, 0.002, 0.1, 0.3, 0.2, 0.7);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.4);
      bloom(pad.hue || 80, 0.9);
      return;
    }

    if (kind === "clap") {
      const bursts = [0, 0.012, 0.024];
      bursts.forEach((off, i) => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(0.12);
        const f = ctx.createBiquadFilter();
        f.type = "bandpass";
        f.frequency.value = 1400;
        f.Q.value = 0.8;
        const ng = envGain(t + off, 0.001, 0.03, 0.15, 0.08, 0.45 - i * 0.08);
        src.connect(f);
        f.connect(ng);
        ng.connect(master);
        src.start(t + off);
      });
      bloom(pad.hue || 50, 0.85);
      return;
    }

    if (kind === "click") {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 1800;
      const g = envGain(t, 0.001, 0.01, 0.05, 0.02, 0.25);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.05);
      bloom(pad.hue || 25, 0.4);
      return;
    }

    if (kind === "whoosh") {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.5);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(4000, t + 0.35);
      f.Q.value = 1.2;
      const ng = envGain(t, 0.02, 0.15, 0.4, 0.25, 0.35);
      src.connect(f);
      f.connect(ng);
      ng.connect(master);
      src.start(t);
      bloom(pad.hue || 200, 0.75);
      return;
    }

    if (kind === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.6);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.setValueAtTime(8000, t);
      f.frequency.exponentialRampToValueAtTime(600, t + 0.5);
      const ng = envGain(t, 0.01, 0.2, 0.5, 0.3, 0.28);
      src.connect(f);
      f.connect(ng);
      ng.connect(master);
      src.start(t);
      bloom(pad.hue || 210, 0.6);
      return;
    }

    if (kind === "chime") {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const o = ctx.createOscillator();
        o.type = "sine";
        o.frequency.value = freq;
        const g = envGain(t + i * 0.02, 0.005, 0.2, 0.4, 0.6, 0.22);
        o.connect(g);
        g.connect(master);
        o.start(t + i * 0.02);
        o.stop(t + 1.0);
      });
      bloom(pad.hue || 280, 0.8);
      return;
    }

    if (kind === "chirp") {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(900, t);
      o.frequency.exponentialRampToValueAtTime(1800, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(1200, t + 0.16);
      const g = envGain(t, 0.005, 0.06, 0.2, 0.08, 0.35);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + 0.25);
      bloom(pad.hue || 55, 0.65);
      return;
    }

    // perc default
    const f0 = pad.freq || 440;
    const o = ctx.createOscillator();
    o.type = sq ? "square" : "triangle";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + 0.12);
    const g = envGain(t, 0.002, 0.06, 0.2, 0.1, 0.45);
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.3);
    bloom(pad.hue || 100, 0.7);
  }

  // ---------- Visualizer ----------
  const canvas = document.getElementById("viz");
  const vctx = canvas.getContext("2d");
  const blooms = [];
  const bars = new Float32Array(32);

  function pushBloom(hue, strength) {
    blooms.push({
      x: 0.15 + Math.random() * 0.7,
      y: 0.35 + Math.random() * 0.4,
      r: 8 + strength * 28,
      life: 1,
      hue: hue == null ? 120 : hue,
      s: strength || 1,
    });
    const idx = Math.floor(Math.random() * bars.length);
    bars[idx] = Math.min(1, bars[idx] + 0.55 * (strength || 1));
    for (let i = 0; i < 3; i++) {
      const j = (idx + i + 1) % bars.length;
      bars[j] = Math.min(1, bars[j] + 0.2 * (strength || 1));
    }
  }

  function drawViz(ts) {
    const w = canvas.width;
    const h = canvas.height;
    vctx.clearRect(0, 0, w, h);
    // soft garden gradient
    const g = vctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#0c1f14");
    g.addColorStop(1, "#163525");
    vctx.fillStyle = g;
    vctx.fillRect(0, 0, w, h);

    // bars
    const bw = w / bars.length;
    for (let i = 0; i < bars.length; i++) {
      bars[i] *= 0.92;
      const bh = bars[i] * (h * 0.85);
      const hue = (i * 11 + (ts / 40)) % 360;
      vctx.fillStyle = `hsla(${hue}, 70%, 58%, ${0.25 + bars[i] * 0.55})`;
      const x = i * bw + 2;
      const y = h - bh - 8;
      roundRect(vctx, x, y, bw - 4, Math.max(4, bh), 6);
      vctx.fill();
    }

    // blooms
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i];
      b.life -= 0.018;
      b.r += 1.6 * b.s;
      if (b.life <= 0) {
        blooms.splice(i, 1);
        continue;
      }
      const grd = vctx.createRadialGradient(b.x * w, b.y * h, 0, b.x * w, b.y * h, b.r);
      grd.addColorStop(0, `hsla(${b.hue}, 85%, 65%, ${0.45 * b.life})`);
      grd.addColorStop(1, `hsla(${b.hue}, 80%, 50%, 0)`);
      vctx.fillStyle = grd;
      vctx.beginPath();
      vctx.arc(b.x * w, b.y * h, b.r, 0, Math.PI * 2);
      vctx.fill();
    }

    // idle sparkles so headless shots aren't blank
    if (blooms.length === 0 && bars.reduce((a, c) => a + c, 0) < 0.05) {
      for (let i = 0; i < 6; i++) {
        const x = ((i * 97 + ts / 30) % w);
        const y = 20 + ((i * 53) % (h - 40));
        vctx.fillStyle = `hsla(${90 + i * 40}, 70%, 60%, 0.15)`;
        vctx.beginPath();
        vctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
        vctx.fill();
      }
    }

    requestAnimationFrame(drawViz);
  }

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  // ---------- State ----------
  let kitId = "garden";
  let pads = [];
  let stepCount = 16;
  let bpm = 110;
  let pattern = []; // [padIndex][step] boolean
  let playing = false;
  let step = 0;
  let timer = null;
  let nextNoteTime = 0;
  const scheduleAhead = 0.12;

  function currentKit() {
    return kitsData.kits.find((k) => k.id === kitId) || kitsData.kits[0];
  }

  function loadKit(id) {
    kitId = id;
    const kit = currentKit();
    pads = kit.pads.slice(0, 16);
    while (pads.length < 16) {
      pads.push({ id: "x" + pads.length, name: "Pad", kind: "perc", hue: 100 });
    }
    ensurePatternSize();
    renderPads();
    renderSeq();
    renderKits();
    document.getElementById("kitPill").textContent = `${kit.emoji} ${kit.name} · ${kit.label}`;
    saveState();
  }

  function emptyPattern() {
    return pads.map(() => Array.from({ length: stepCount }, () => false));
  }

  function ensurePatternSize() {
    if (!pattern.length || pattern.length !== pads.length) {
      pattern = emptyPattern();
      return;
    }
    pattern = pattern.map((row) => {
      const next = row.slice(0, stepCount);
      while (next.length < stepCount) next.push(false);
      return next;
    });
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ kitId, bpm, stepCount, pattern })
      );
    } catch (_) {}
    updateSeqStatus();
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.kitId) kitId = data.kitId;
      if (data.bpm) bpm = data.bpm;
      if (data.stepCount) stepCount = data.stepCount;
      if (Array.isArray(data.pattern)) pattern = data.pattern;
    } catch (_) {}
  }

  // ---------- Sequencer clock ----------
  function secondsPerStep() {
    return 60 / bpm / 2; // 8th notes feel good for kids
  }

  function scheduler() {
    if (!playing || !ctx) return;
    while (nextNoteTime < ctx.currentTime + scheduleAhead) {
      scheduleStep(step, nextNoteTime);
      nextNoteTime += secondsPerStep();
      step = (step + 1) % stepCount;
    }
    timer = setTimeout(scheduler, 25);
  }

  function scheduleStep(s, when) {
    for (let p = 0; p < pads.length; p++) {
      if (pattern[p] && pattern[p][s]) playPad(pads[p], when);
    }
    const delay = Math.max(0, (when - ctx.currentTime) * 1000);
    setTimeout(() => highlightStep(s), delay);
  }

  function highlightStep(s) {
    document.querySelectorAll(".seq-cell.now").forEach((el) => el.classList.remove("now"));
    document.querySelectorAll(`.seq-cell[data-step="${s}"]`).forEach((el) => el.classList.add("now"));
  }

  function startPlay() {
    ensureAudio();
    if (playing) return;
    playing = true;
    step = 0;
    nextNoteTime = ctx.currentTime + 0.05;
    scheduler();
    document.getElementById("btnPlay").classList.add("playing");
    document.getElementById("btnPlay").textContent = "● Playing";
    document.getElementById("btnPlay2").classList.add("playing");
    document.getElementById("btnPlay2").textContent = "● Playing";
  }

  function stopPlay() {
    playing = false;
    if (timer) clearTimeout(timer);
    timer = null;
    document.querySelectorAll(".seq-cell.now").forEach((el) => el.classList.remove("now"));
    document.getElementById("btnPlay").classList.remove("playing");
    document.getElementById("btnPlay").textContent = "▶ Play";
    document.getElementById("btnPlay2").classList.remove("playing");
    document.getElementById("btnPlay2").textContent = "▶ Play";
  }

  // ---------- Render ----------
  function padColor(hue) {
    return `linear-gradient(145deg, hsl(${hue}, 72%, 52%), hsl(${hue}, 78%, 32%))`;
  }

  function renderPads() {
    const grid = document.getElementById("padGrid");
    grid.innerHTML = "";
    pads.forEach((pad, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "pad";
      btn.style.background = padColor(pad.hue || 100);
      btn.dataset.index = String(i);
      btn.setAttribute("aria-label", pad.name);
      btn.innerHTML = `<span class="keycap">${KEYS[i].toUpperCase()}</span><span class="ename">${escapeHtml(pad.name)}</span><span class="ekind">${escapeHtml(pad.kind)}</span>`;
      const fire = (e) => {
        e.preventDefault();
        hitPad(i, btn);
      };
      btn.addEventListener("pointerdown", fire);
      grid.appendChild(btn);
    });
  }

  function hitPad(i, el) {
    if (!audioReady) {
      unlockAudio();
    }
    ensureAudio();
    playPad(pads[i]);
    if (el) {
      el.classList.add("hit");
      setTimeout(() => el.classList.remove("hit"), 120);
    }
  }

  function renderSeq() {
    const wrap = document.getElementById("seqGrid");
    wrap.style.setProperty("--cols", String(stepCount));
    wrap.innerHTML = "";
    pads.forEach((pad, pi) => {
      const row = document.createElement("div");
      row.className = "seq-row";
      const lab = document.createElement("div");
      lab.className = "seq-label";
      lab.textContent = pad.name;
      lab.title = pad.name;
      row.appendChild(lab);
      for (let s = 0; s < stepCount; s++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "seq-cell" + (pattern[pi] && pattern[pi][s] ? " on" : "");
        cell.dataset.pad = String(pi);
        cell.dataset.step = String(s);
        cell.style.setProperty("--cell", `hsl(${pad.hue || 100}, 75%, 55%)`);
        cell.addEventListener("click", () => {
          if (!pattern[pi]) pattern[pi] = Array.from({ length: stepCount }, () => false);
          pattern[pi][s] = !pattern[pi][s];
          cell.classList.toggle("on", pattern[pi][s]);
          if (pattern[pi][s]) {
            ensureAudio();
            playPad(pads[pi]);
          }
          saveState();
        });
        row.appendChild(cell);
      }
      wrap.appendChild(row);
    });
    updateSeqStatus();
  }

  function updateSeqStatus() {
    const n = pattern.reduce((acc, row) => acc + (row || []).filter(Boolean).length, 0);
    document.getElementById("seqStatus").textContent =
      n === 0 ? "Pattern: empty · tap cells or Save after jamming" : `Pattern: ${n} hits saved in localStorage`;
  }

  function renderKits() {
    const list = document.getElementById("kitList");
    list.innerHTML = "";
    kitsData.kits.forEach((kit) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kit-card" + (kit.id === kitId ? " selected" : "");
      btn.innerHTML = `
        <div class="kit-emoji">${kit.emoji || "🥁"}</div>
        <div>
          <h3>${escapeHtml(kit.name)}</h3>
          <p>${escapeHtml(kit.desc || "")}</p>
          <span class="badge">${escapeHtml(kit.label || "EXAMPLE")}</span>
        </div>
        <span class="kit-go">${kit.id === kitId ? "Selected" : "Use"}</span>`;
      btn.addEventListener("click", () => {
        loadKit(kit.id);
        location.hash = "#play";
      });
      list.appendChild(btn);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Screens ----------
  const SCREENS = ["play", "seq", "kits", "about"];

  function showScreen(name) {
    const id = SCREENS.includes(name) ? name : "play";
    SCREENS.forEach((s) => {
      const el = document.getElementById("screen-" + s);
      if (el) el.hidden = s !== id;
    });
    document.querySelectorAll(".tab").forEach((a) => {
      a.classList.toggle("active", a.dataset.screen === id);
    });
  }

  function route() {
    const h = (location.hash || "#play").replace(/^#/, "") || "play";
    showScreen(h === "sequencer" ? "seq" : h);
  }

  // ---------- Audio gate ----------
  function unlockAudio() {
    ensureAudio();
    // silent blip to unlock
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.0001;
      o.connect(g);
      g.connect(master);
      o.start();
      o.stop(ctx.currentTime + 0.01);
    } catch (_) {}
    document.getElementById("audioGate").classList.add("hidden");
  }

  // ---------- EXAMPLE starter pattern ----------
  function seedDemoIfEmpty() {
    const n = pattern.reduce((acc, row) => acc + (row || []).filter(Boolean).length, 0);
    if (n > 0) return;
    // simple garden groove on kick/snare/hat
    const kick = 0, snare = 1, hat = 2;
    for (let s = 0; s < stepCount; s++) {
      if (s % 4 === 0) pattern[kick][s] = true;
      if (s % 8 === 4) pattern[snare][s] = true;
      if (s % 2 === 0) pattern[hat][s] = true;
    }
    if (pads[7]) pattern[7][stepCount - 1] = true; // clap on last
    saveState();
  }

  // ---------- Wire UI ----------
  function bind() {
    document.getElementById("btnStartAudio").addEventListener("click", unlockAudio);

    document.getElementById("btnPlay").addEventListener("click", () => {
      unlockAudio();
      startPlay();
    });
    document.getElementById("btnPlay2").addEventListener("click", () => {
      unlockAudio();
      startPlay();
    });
    document.getElementById("btnStop").addEventListener("click", stopPlay);

    const bpmEl = document.getElementById("bpm");
    const bpmVal = document.getElementById("bpmVal");
    bpmEl.value = String(bpm);
    bpmVal.textContent = String(bpm);
    bpmEl.addEventListener("input", () => {
      bpm = Number(bpmEl.value) || 110;
      bpmVal.textContent = String(bpm);
      saveState();
    });

    const sc = document.getElementById("stepCount");
    sc.value = String(stepCount);
    sc.addEventListener("change", () => {
      stepCount = Number(sc.value) === 8 ? 8 : 16;
      ensurePatternSize();
      renderSeq();
      saveState();
    });

    document.getElementById("btnRecord").addEventListener("click", () => {
      saveState();
      document.getElementById("seqStatus").textContent = "Pattern saved ✓ (localStorage)";
    });
    document.getElementById("btnClear").addEventListener("click", () => {
      pattern = emptyPattern();
      renderSeq();
      saveState();
      stopPlay();
    });

    window.addEventListener("keydown", (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      const idx = KEYS.indexOf(k);
      if (idx >= 0 && idx < pads.length) {
        e.preventDefault();
        unlockAudio();
        const el = document.querySelector(`.pad[data-index="${idx}"]`);
        hitPad(idx, el);
      }
      if (k === " ") {
        e.preventDefault();
        unlockAudio();
        if (playing) stopPlay();
        else startPlay();
      }
    });

    window.addEventListener("hashchange", route);

    // resize canvas crisp
    function fitCanvas() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(320, Math.floor(rect.width * dpr));
      canvas.height = Math.max(100, Math.floor(140 * dpr));
    }
    window.addEventListener("resize", fitCanvas);
    fitCanvas();
  }

  // ---------- Prefetch kits if live server ----------
  async function maybeFetchKits() {
    if (window.__KITS__ && Array.isArray(window.__KITS__.kits)) return;
    try {
      const r = await fetch("/api/kits");
      if (r.ok) {
        const j = await r.json();
        if (j && Array.isArray(j.kits)) kitsData = j;
      }
    } catch (_) {}
  }

  async function init() {
    await maybeFetchKits();
    loadState();
    bind();
    loadKit(kitId);
    seedDemoIfEmpty();
    renderSeq();
    route();
    requestAnimationFrame(drawViz);
    // For headless screenshots: auto-hide gate after a moment if ?shot=1
    if (/[?&]shot=1\b/.test(location.search) || /shot/.test(location.hash)) {
      document.getElementById("audioGate").classList.add("hidden");
      // paint a few fake blooms so viz looks alive
      pushBloom(120, 1);
      pushBloom(45, 0.8);
      pushBloom(200, 0.9);
      pushBloom(330, 0.7);
    }
  }

  init();
})();
