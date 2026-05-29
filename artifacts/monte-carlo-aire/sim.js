/* Monte Carlo — estimation d'aire (piloté par SimKit). */
(function () {
  Antsa.recordVisit("monte-carlo-aire");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  const loc = () => Antsa.getLang() === "fr" ? "fr-FR" : "en-US";

  const state = { shape: "disque", r: 0.8, a: 0.9, b: 0.55, size: 0.9, targetN: 10000, n: 0, k: 0, xs: [], ys: [], ins: [] };
  let W = 0, H = 0, S = 0, ox = 0, oy = 0;

  function fit() {
    const rct = cv.getBoundingClientRect();
    if (!rct.width || !rct.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(rct.width * dpr); cv.height = Math.round(rct.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rct.width; H = rct.height;
    S = Math.min(W, H) * 0.9; ox = (W - S) / 2; oy = (H - S) / 2;
    fullRedraw();
  }
  const mx = x => ox + (x + 1) / 2 * S;
  const my = y => oy + (1 - (y + 1) / 2) * S;
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function inside(x, y) {
    switch (state.shape) {
      case "disque": return x * x + y * y <= state.r * state.r;
      case "ellipse": return (x * x) / (state.a * state.a) + (y * y) / (state.b * state.b) <= 1;
      case "astroide": return Math.pow(Math.abs(x), 2 / 3) + Math.pow(Math.abs(y), 2 / 3) <= Math.pow(state.size, 2 / 3);
      case "losange": return Math.abs(x) + Math.abs(y) <= state.size;
    }
    return false;
  }
  function exactArea() {
    switch (state.shape) {
      case "disque": return Math.PI * state.r * state.r;
      case "ellipse": return Math.PI * state.a * state.b;
      case "astroide": return 3 * Math.PI * state.size * state.size / 8;
      case "losange": return 2 * state.size * state.size;
    }
    return 0;
  }

  function drawBox() { ctx.strokeStyle = css("--line"); ctx.globalAlpha = 1; ctx.lineWidth = 1.5; ctx.strokeRect(mx(-1), my(1), S, S); }
  function drawOutline() {
    const accent = css("--accent");
    ctx.strokeStyle = accent; ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath();
    if (state.shape === "disque") ctx.arc(mx(0), my(0), state.r / 2 * S, 0, TAU);
    else if (state.shape === "ellipse") { for (let tt = 0; tt <= TAU + 0.01; tt += 0.03) { const x = state.a * Math.cos(tt), y = state.b * Math.sin(tt); tt === 0 ? ctx.moveTo(mx(x), my(y)) : ctx.lineTo(mx(x), my(y)); } }
    else if (state.shape === "astroide") { for (let tt = 0; tt <= TAU + 0.01; tt += 0.02) { const x = state.size * Math.pow(Math.cos(tt), 3), y = state.size * Math.pow(Math.sin(tt), 3); tt === 0 ? ctx.moveTo(mx(x), my(y)) : ctx.lineTo(mx(x), my(y)); } }
    else if (state.shape === "losange") { const s = state.size; ctx.moveTo(mx(s), my(0)); ctx.lineTo(mx(0), my(s)); ctx.lineTo(mx(-s), my(0)); ctx.lineTo(mx(0), my(-s)); ctx.closePath(); }
    ctx.stroke(); ctx.globalAlpha = 1;
  }
  function drawPoint(i) {
    ctx.globalAlpha = state.ins[i] ? 0.85 : 0.4;
    ctx.fillStyle = state.ins[i] ? css("--accent") : "#9aa0ad";
    ctx.beginPath(); ctx.arc(mx(state.xs[i]), my(state.ys[i]), 1.7, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function fullRedraw() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    drawBox();
    for (let i = 0; i < state.xs.length; i++) drawPoint(i);
    drawOutline();
  }

  function fmt(x, d) { return x.toLocaleString(loc(), { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function updateResults() {
    document.getElementById("r-n").textContent = state.n.toLocaleString(loc());
    document.getElementById("r-k").textContent = state.k.toLocaleString(loc());
    const exact = exactArea();
    document.getElementById("r-exact").textContent = fmt(exact, 4);
    if (state.n > 0) {
      const est = 4 * state.k / state.n;
      document.getElementById("r-est").textContent = fmt(est, 4);
      document.getElementById("r-err").textContent = fmt(Math.abs(est - exact) / exact * 100, 2) + " %";
    } else { document.getElementById("r-est").textContent = "—"; document.getElementById("r-err").textContent = "—"; }
  }
  function updateLesson() {
    const f = document.getElementById("f-exact");
    if (state.shape === "disque") f.innerHTML = '<span class="hot">A</span> = π·r² = π·' + fmt(state.r, 2) + '² = ' + fmt(exactArea(), 4);
    else if (state.shape === "ellipse") f.innerHTML = '<span class="hot">A</span> = π·a·b = π·' + fmt(state.a, 2) + '·' + fmt(state.b, 2) + ' = ' + fmt(exactArea(), 4);
    else if (state.shape === "astroide") f.innerHTML = '<span class="hot">A</span> = 3π·a²⁄8 = ' + fmt(exactArea(), 4);
    else f.innerHTML = '<span class="hot">A</span> = 2·c² = ' + fmt(exactArea(), 4);
  }

  function addPoints(n) {
    for (let i = 0; i < n && state.n < state.targetN; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1, ins = inside(x, y);
      state.xs.push(x); state.ys.push(y); state.ins.push(ins);
      state.n++; if (ins) state.k++;
      drawPoint(state.xs.length - 1);
    }
    drawOutline();
    updateResults();
  }
  function clearPoints() { state.n = 0; state.k = 0; state.xs.length = 0; state.ys.length = 0; state.ins.length = 0; fullRedraw(); updateResults(); }

  /* ---------- contrôles de forme ---------- */
  function showParams() {
    document.getElementById("c-r").style.display = state.shape === "disque" ? "" : "none";
    document.getElementById("c-a").style.display = state.shape === "ellipse" ? "" : "none";
    document.getElementById("c-b").style.display = state.shape === "ellipse" ? "" : "none";
    document.getElementById("c-size").style.display = (state.shape === "astroide" || state.shape === "losange") ? "" : "none";
  }
  document.getElementById("shapes").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    state.shape = b.dataset.shape;
    document.querySelectorAll("#shapes button").forEach(x => x.classList.toggle("on", x === b));
    showParams(); updateLesson(); sim.reset();
  });
  function bindDim(id, valId, key) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = (reset) => { state[key] = parseFloat(s.value); v.textContent = fmt(state[key], 2); updateLesson(); if (reset) sim.reset(); };
    s.addEventListener("input", () => upd(true)); upd(false);
  }
  bindDim("s-r", "v-r", "r"); bindDim("s-a", "v-a", "a"); bindDim("s-b", "v-b", "b"); bindDim("s-size", "v-size", "size");

  const sm = document.getElementById("s-max"), vm = document.getElementById("v-max");
  const updMax = () => { state.targetN = parseInt(sm.value, 10); vm.textContent = state.targetN.toLocaleString(loc()); if (state.n > state.targetN) sim.reset(); };
  sm.addEventListener("input", updMax); updMax();

  document.getElementById("lg-in").style.background = css("--accent");
  document.addEventListener("antsa:theme", () => { document.getElementById("lg-in").style.background = css("--accent"); fullRedraw(); });
  document.addEventListener("antsa:lang", () => { updateResults(); updateLesson(); });

  showParams(); updateLesson();
  new ResizeObserver(fit).observe(cv);
  fit();

  /* ---------- SimKit ---------- */
  const sim = SimKit.mount({
    el: "#sim-controls", continuous: false, baseRate: 60, maxPerFrame: 500, stepSize: 1,
    speed: { min: 0.1, max: 8, step: 0.1, value: 0.5 },
    watch: "#cv",
    onStep: (n) => addPoints(n),
    onReset: clearPoints,
    readout: () => {
      const est = state.n > 0 ? (4 * state.k / state.n).toFixed(4) : "—";
      return {
        main: "Â ≈ " + est,
        sub: "n = " + state.n.toLocaleString(loc()) + " · k = " + state.k.toLocaleString(loc())
      };
    }
  });
})();
