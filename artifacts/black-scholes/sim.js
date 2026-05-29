/* Black-Scholes — Monte Carlo de trajectoires GBM vs formule fermée (SimKit). */
(function () {
  Antsa.recordVisit("black-scholes");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, STEPS = 40;

  const P = { type: "call", S0: 100, K: 100, vol: 0.2, r: 0.03, T: 1 };
  let n = 0, sumPayoff = 0, recent = [], yMax = 200;

  // loi normale
  function erf(x) { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return s * y; }
  function N(x) { return 0.5 * (1 + erf(x / Math.SQRT2)); }
  function gauss() { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }

  function bs() {
    const { S0, K, vol, r, T, type } = P;
    const d1 = (Math.log(S0 / K) + (r + vol * vol / 2) * T) / (vol * Math.sqrt(T)), d2 = d1 - vol * Math.sqrt(T);
    const call = S0 * N(d1) - K * Math.exp(-r * T) * N(d2);
    const price = type === "call" ? call : call - S0 + K * Math.exp(-r * T);
    return { price, d1, d2, delta: type === "call" ? N(d1) : N(d1) - 1 };
  }

  function reset() { n = 0; sumPayoff = 0; recent = []; setRange(); render(); updateReadouts(); }
  function setRange() { yMax = Math.max(P.S0, P.K) * Math.exp((Math.abs(P.r) + 1) * 0 + 2.6 * P.vol * Math.sqrt(P.T)) * 1.05; yMax = Math.max(yMax, P.K * 1.2); }

  function simulatePath() {
    const dt = P.T / STEPS, drift = (P.r - P.vol * P.vol / 2) * dt, vsq = P.vol * Math.sqrt(dt);
    const pts = [P.S0]; let s = P.S0;
    for (let i = 0; i < STEPS; i++) { s *= Math.exp(drift + vsq * gauss()); pts.push(s); }
    const ST = s;
    const payoff = P.type === "call" ? Math.max(ST - P.K, 0) : Math.max(P.K - ST, 0);
    sumPayoff += payoff * Math.exp(-P.r * P.T); n++;
    recent.push(pts); if (recent.length > 60) recent.shift();
  }
  function advance(m) { for (let i = 0; i < m; i++) simulatePath(); render(); updateReadouts(); }

  let W = 0, H = 0;
  function fit() { const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return; const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height; render(); }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }
  const padL = 44, padR = 12, padT = 12, padB = 22;
  const MX = i => padL + i / STEPS * (W - padL - padR);
  const MY = v => (H - padB) - (v / yMax) * (H - padT - padB);

  function render() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    const acc = css("--accent"), line = css("--line"), ink = css("--ink-soft");
    // grille prix
    ctx.strokeStyle = line; ctx.fillStyle = ink; ctx.font = "11px 'Space Mono', monospace"; ctx.textBaseline = "middle";
    ctx.globalAlpha = 1; ctx.lineWidth = 1;
    for (let p = 0; p <= yMax; p += 50) { const y = MY(p); ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke(); ctx.globalAlpha = 0.8; ctx.fillText(Math.round(p), 6, y); }
    // strike K
    ctx.strokeStyle = "#FF9F1C"; ctx.globalAlpha = 0.9; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(padL, MY(P.K)); ctx.lineTo(W - padR, MY(P.K)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#FF9F1C"; ctx.fillText("K=" + P.K, W - padR - 52, MY(P.K) - 9);
    ctx.globalAlpha = 1;
    // trajectoires
    for (let pi = 0; pi < recent.length; pi++) {
      const pts = recent[pi], a = 0.12 + 0.5 * (pi / recent.length);
      ctx.strokeStyle = acc; ctx.globalAlpha = a; ctx.lineWidth = pi === recent.length - 1 ? 2.2 : 1;
      ctx.beginPath(); for (let i = 0; i < pts.length; i++) { const x = MX(i), y = MY(Math.min(pts[i], yMax)); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // S0 point
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(MX(0), MY(P.S0), 3.5, 0, TAU); ctx.fill();
    ctx.textBaseline = "alphabetic";
  }

  function updateReadouts() {
    const b = bs(), mc = n > 0 ? sumPayoff / n : 0;
    document.getElementById("r-n").textContent = n.toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US");
    document.getElementById("r-mc").textContent = n > 0 ? mc.toFixed(2) : "—";
    document.getElementById("k-bs").textContent = b.price.toFixed(3);
    document.getElementById("k-mc").textContent = n > 0 ? mc.toFixed(3) : "—";
    document.getElementById("k-gap").textContent = n > 0 ? (mc - b.price >= 0 ? "+" : "") + (mc - b.price).toFixed(3) : "—";
    document.getElementById("k-d").textContent = b.d1.toFixed(2) + " · " + b.d2.toFixed(2);
    document.getElementById("k-delta").textContent = b.delta.toFixed(3);
  }
  function setLegend() {
    const L = document.getElementById("legend"), u = Antsa.t;
    L.innerHTML = '<span><i style="background:' + css("--accent") + '"></i>' + u("cours simulé", "simulated price") + '</span><span><i style="background:#FF9F1C"></i>' + u("strike K", "strike K") + '</span>';
  }

  /* ---------- contrôles ---------- */
  document.getElementById("otype").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; P.type = b.dataset.t; document.querySelectorAll("#otype button").forEach(x => x.classList.toggle("on", x === b)); sim.reset(); });
  function bind(id, valId, key, fmt, scale) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value) * (scale || 1); v.textContent = fmt(parseFloat(s.value)); sim.reset(); };
    s.addEventListener("input", upd); v.textContent = fmt(parseFloat(s.value));
  }
  bind("s-s0", "v-s0", "S0", x => Math.round(x));
  bind("s-k", "v-k", "K", x => Math.round(x));
  bind("s-vol", "v-vol", "vol", x => Math.round(x) + "%", 0.01);
  bind("s-r", "v-r", "r", x => x + "%", 0.01);
  bind("s-t", "v-t", "T", x => x.toFixed(1) + Antsa.t(" an", " yr"));

  document.addEventListener("antsa:theme", () => { setLegend(); render(); });
  document.addEventListener("antsa:lang", () => { updateReadouts(); setLegend(); });

  setLegend(); setRange();
  new ResizeObserver(fit).observe(cv);
  fit();

  const sim = SimKit.mount({
    el: "#sim-controls", continuous: false, baseRate: 12, maxPerFrame: 60, stepSize: 1,
    speed: { min: 0.1, max: 20, step: 0.1, value: 0.8 },
    onStep: (m) => advance(m),
    onReset: reset,
    readout: () => { const mc = n > 0 ? sumPayoff / n : 0; return { main: Antsa.t("MC ≈ ", "MC ≈ ") + (n > 0 ? mc.toFixed(2) : "—"), sub: n.toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US") + Antsa.t(" trajectoires", " paths") }; }
  });
})();
