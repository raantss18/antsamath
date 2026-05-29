/* Fourier — reconstruction d'un signal par séries de Fourier + lecture audio. */
(function () {
  Antsa.recordVisit("fourier-son");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, NMAX = 24;

  const S = { wave: "square", freq: 220, k: 1 };

  // liste ordonnée des harmoniques non nulles {n, amp} pour le signal courant
  function harmonics() {
    const out = [];
    for (let n = 1; out.length < NMAX && n <= 200; n++) {
      let a = 0;
      if (S.wave === "square") a = (n % 2 === 1) ? 4 / (Math.PI * n) : 0;
      else if (S.wave === "saw") a = 2 / (Math.PI * n) * (n % 2 === 1 ? 1 : -1);
      else if (S.wave === "triangle") a = (n % 2 === 1) ? 8 / (Math.PI * Math.PI * n * n) * ((((n - 1) / 2) % 2 === 0) ? 1 : -1) : 0;
      if (a !== 0) out.push({ n, amp: a });
    }
    return out;
  }
  const HARM = { list: harmonics() };
  function rebuild() { HARM.list = harmonics(); }

  function partial(x, k) { let y = 0; const L = HARM.list; for (let i = 0; i < k && i < L.length; i++) y += L[i].amp * Math.sin(L[i].n * x); return y; }
  function target(x) {
    if (S.wave === "square") return Math.sin(x) >= 0 ? 1 : -1;
    if (S.wave === "saw") { const t = ((x / TAU) % 1 + 1) % 1; return 2 * (t < 0.5 ? t : t - 1); }
    const t = ((x / TAU) % 1 + 1) % 1; return t < 0.5 ? (4 * t - 1) : (3 - 4 * t);
  }

  let W = 0, H = 0;
  function fit() { const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return; const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height; render(); }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function render() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    const acc = css("--accent"), line = css("--line"), ink = css("--ink-soft");
    const waveH = H * 0.6, midY = waveH / 2, specY0 = waveH + 8, specH = H - specY0 - 6;
    // axe
    ctx.strokeStyle = line; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke(); ctx.globalAlpha = 1;
    const cycles = 2, amp = waveH * 0.4;
    // cible
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.5; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5;
    ctx.beginPath(); for (let px = 0; px <= W; px += 2) { const x = px / W * TAU * cycles; const y = midY - target(x) * amp; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); } ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // somme partielle
    ctx.strokeStyle = acc; ctx.lineWidth = 2.4;
    ctx.beginPath(); for (let px = 0; px <= W; px += 1) { const x = px / W * TAU * cycles; const y = midY - partial(x, S.k) * amp; px === 0 ? ctx.moveTo(px, y) : ctx.lineTo(px, y); } ctx.stroke();
    // spectre
    ctx.fillStyle = ink; ctx.font = "11px 'Space Mono', monospace"; ctx.textAlign = "center";
    const L = HARM.list, maxAmp = Math.max(...L.map(o => Math.abs(o.amp)), 0.01);
    const bw = W / (NMAX + 1);
    ctx.textBaseline = "alphabetic";
    for (let i = 0; i < L.length; i++) {
      const bh = Math.abs(L[i].amp) / maxAmp * (specH - 14);
      const x = (i + 0.7) * bw;
      ctx.fillStyle = i < S.k ? acc : line;
      ctx.globalAlpha = i < S.k ? 0.9 : 0.5;
      ctx.fillRect(x - bw * 0.32, specY0 + specH - bh, bw * 0.64, bh);
    }
    ctx.globalAlpha = 1; ctx.fillStyle = ink; ctx.textAlign = "start";
    ctx.fillText(Antsa.t("spectre (poids des harmoniques)", "spectrum (harmonic weights)"), 6, specY0 + 11);
  }

  function mse() {
    let s = 0; const N = 200;
    for (let i = 0; i < N; i++) { const x = i / N * TAU; const d = partial(x, S.k) - target(x); s += d * d; }
    return s / N;
  }
  function updateReadouts() {
    const used = Math.min(S.k, HARM.list.length);
    const nth = HARM.list[Math.min(S.k, HARM.list.length) - 1];
    document.getElementById("r-h").textContent = used;
    document.getElementById("k-h").textContent = used;
    const e = mse();
    document.getElementById("r-err").textContent = e.toFixed(3);
    document.getElementById("k-err").textContent = e.toFixed(4);
    document.getElementById("k-recipe").textContent = S.wave === "square" ? Antsa.t("impaires · 4⁄πn", "odd · 4⁄πn")
      : S.wave === "saw" ? Antsa.t("toutes · 2⁄πn", "all · 2⁄πn") : Antsa.t("impaires · 8⁄π²n²", "odd · 8⁄π²n²");
  }

  /* ---------- audio ---------- */
  let actx = null;
  function listen() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const L = HARM.list, k = Math.min(S.k, L.length), len = (L[L.length - 1] ? L[L.length - 1].n : 1) + 1;
      const real = new Float32Array(len + 1), imag = new Float32Array(len + 1);
      for (let i = 0; i < k; i++) imag[L[i].n] = L[i].amp;
      const wave = actx.createPeriodicWave(real, imag, { disableNormalization: false });
      const osc = actx.createOscillator(), g = actx.createGain();
      osc.setPeriodicWave(wave); osc.frequency.value = S.freq;
      const t0 = actx.currentTime;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
      osc.connect(g); g.connect(actx.destination); osc.start(t0); osc.stop(t0 + 1.15);
    } catch (e) { /* audio indispo */ }
  }

  /* ---------- contrôles ---------- */
  document.getElementById("waves").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; S.wave = b.dataset.w; document.querySelectorAll("#waves button").forEach(x => x.classList.toggle("on", x === b)); rebuild(); render(); updateReadouts(); });
  const sf = document.getElementById("s-freq"), vf = document.getElementById("v-freq");
  sf.addEventListener("input", () => { S.freq = parseInt(sf.value, 10); vf.textContent = S.freq + " Hz"; });
  document.getElementById("btn-listen").addEventListener("click", listen);

  document.getElementById("lg-sum").style.background = css("--accent");
  document.addEventListener("antsa:theme", () => { document.getElementById("lg-sum").style.background = css("--accent"); render(); });
  document.addEventListener("antsa:lang", updateReadouts);

  new ResizeObserver(fit).observe(cv);
  fit();

  const sim = SimKit.mount({
    el: "#sim-controls", continuous: false, baseRate: 1.4, maxPerFrame: 1, stepSize: 1,
    speed: { min: 0.2, max: 6, step: 0.2, value: 1 },
    onStep: (n) => { S.k = Math.min(NMAX, HARM.list.length, S.k + n); if (S.k >= Math.min(NMAX, HARM.list.length)) S.k = Math.min(NMAX, HARM.list.length); render(); updateReadouts(); },
    onReset: () => { S.k = 1; render(); updateReadouts(); },
    readout: () => ({ main: Antsa.t("N = ", "N = ") + Math.min(S.k, HARM.list.length) + Antsa.t(" harmoniques", " harmonics"), sub: Antsa.t("erreur ", "error ") + mse().toFixed(3) })
  });
})();
