/* Épidémie SIR — agents + courbe, modèle en temps continu (jours), piloté par SimKit. */
(function () {
  Antsa.recordVisit("epidemie-sir");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const chart = document.getElementById("chart");
  const cctx = chart.getContext("2d");
  const TAU = Math.PI * 2;
  const COL = { S: "#4F8DF7", I: "#D32C6D", R: "#7E8898" };
  const RAD = 0.04;             // rayon de contact (normalisé)
  const MOVE = 0.32;            // vitesse de déplacement (unités/jour à mobilité 100%)
  const CONTACT = 7;            // facteur de contacts par jour

  const P = { N: 220, beta: 0.3, gamma: 0.03, mob: 0.6, vax: 0 };
  let ag = [], hist = [], peak = 0, everInf = 0, lastDay = -1;

  function reset() {
    ag = []; hist = []; peak = 0; everInf = 0; lastDay = -1;
    const nVax = Math.round(P.N * P.vax / 100), nInf = Math.min(3, P.N - nVax);
    for (let i = 0; i < P.N; i++) {
      const a = Math.random() * TAU;
      ag.push({ x: Math.random(), y: Math.random(), vx: Math.cos(a), vy: Math.sin(a), st: 0 });
    }
    for (let i = 0; i < nVax; i++) ag[i].st = 2;
    for (let i = nVax; i < nVax + nInf; i++) { ag[i].st = 1; everInf++; }
  }
  function counts() { let s = 0, inf = 0, r = 0; for (const a of ag) a.st === 0 ? s++ : a.st === 1 ? inf++ : r++; return { s, i: inf, r }; }

  // avance le modèle de dDays jours (continu, taux proportionnels au temps)
  function advance(dDays, simTime) {
    const v = MOVE * P.mob;
    for (const a of ag) {
      a.x += a.vx * v * dDays; a.y += a.vy * v * dDays;
      if (a.x < 0) { a.x = 0; a.vx *= -1; } if (a.x > 1) { a.x = 1; a.vx *= -1; }
      if (a.y < 0) { a.y = 0; a.vy *= -1; } if (a.y > 1) { a.y = 1; a.vy *= -1; }
      if (Math.random() < 0.6 * dDays) { const an = Math.random() * TAU; a.vx = Math.cos(an); a.vy = Math.sin(an); }
    }
    const pInf = P.beta * CONTACT * dDays, pRec = P.gamma * dDays;
    const r2 = RAD * RAD;
    for (let i = 0; i < ag.length; i++) {
      if (ag[i].st !== 1) continue;
      for (let j = 0; j < ag.length; j++) {
        if (ag[j].st !== 0) continue;
        const dx = ag[i].x - ag[j].x, dy = ag[i].y - ag[j].y;
        if (dx * dx + dy * dy < r2 && Math.random() < pInf) { ag[j].st = 1; everInf++; }
      }
    }
    for (const a of ag) if (a.st === 1 && Math.random() < pRec) a.st = 2;

    const c = counts(); if (c.i > peak) peak = c.i;
    const day = Math.floor(simTime);
    if (day !== lastDay) { lastDay = day; hist.push(c); if (hist.length > 600) hist.shift(); }
  }

  /* ---------- rendu agents ---------- */
  let W = 0, H = 0, dpr = 1, size = 0, ox = 0, oy = 0;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
    size = Math.min(W, H) * 0.94; ox = (W - size) / 2; oy = (H - size) / 2;
    fitChart(); render();
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function render() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = css("--line"); ctx.lineWidth = 1; ctx.strokeRect(ox, oy, size, size);
    for (const a of ag) {
      ctx.fillStyle = a.st === 0 ? COL.S : a.st === 1 ? COL.I : COL.R;
      ctx.globalAlpha = a.st === 1 ? 1 : 0.85;
      ctx.beginPath(); ctx.arc(ox + a.x * size, oy + a.y * size, a.st === 1 ? 3.4 : 2.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    renderChart();
  }

  let cw = 0, ch = 0;
  function fitChart() {
    const r = chart.getBoundingClientRect();
    if (!r.width || !r.height) return;
    chart.width = Math.round(r.width * dpr); chart.height = Math.round(r.height * dpr);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0); cw = r.width; ch = r.height;
  }
  function line(key, color) {
    cctx.strokeStyle = color; cctx.lineWidth = 2; cctx.beginPath();
    const n = hist.length;
    for (let i = 0; i < n; i++) { const x = n <= 1 ? 0 : i / (n - 1) * cw, y = ch - (hist[i][key] / P.N) * (ch - 4) - 2; i ? cctx.lineTo(x, y) : cctx.moveTo(x, y); }
    cctx.stroke();
  }
  function renderChart() {
    cctx.clearRect(0, 0, cw, ch);
    if (hist.length < 2) return;
    cctx.fillStyle = COL.I + "26"; cctx.beginPath(); cctx.moveTo(0, ch);
    const n = hist.length;
    for (let i = 0; i < n; i++) cctx.lineTo(i / (n - 1) * cw, ch - (hist[i].i / P.N) * (ch - 4) - 2);
    cctx.lineTo(cw, ch); cctx.closePath(); cctx.fill();
    line("s", COL.S); line("r", COL.R); line("i", COL.I);
  }

  function updateReadouts() {
    const c = counts();
    document.getElementById("r-s").textContent = c.s;
    document.getElementById("r-i").textContent = c.i;
    document.getElementById("r-r").textContent = c.r;
    const r0 = P.beta / P.gamma;
    document.getElementById("r-r0").textContent = r0.toFixed(1);
    document.getElementById("r-thr").textContent = r0 > 1 ? Math.round((1 - 1 / r0) * 100) + " %" : "—";
    document.getElementById("r-peak").textContent = peak;
    document.getElementById("r-tot").textContent = Math.round(everInf / P.N * 100) + " %";
  }

  let sim;
  /* ---------- contrôles ---------- */
  function bind(id, valId, key, fmt, doReset) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v.textContent = fmt(P[key]); updateReadouts(); if (doReset) { if (sim) sim.reset(); else reset(); } };
    s.addEventListener("input", upd); upd();
  }
  bind("s-n", "v-n", "N", x => Math.round(x), true);
  bind("s-beta", "v-beta", "beta", x => x.toFixed(2), false);
  bind("s-gamma", "v-gamma", "gamma", x => x.toFixed(3), false);
  bind("s-mob", "v-mob", "mob", x => Math.round(x * 100) + "%", false);
  bind("s-vax", "v-vax", "vax", x => Math.round(x) + "%", true);

  document.addEventListener("antsa:theme", render);
  document.addEventListener("antsa:lang", updateReadouts);

  new ResizeObserver(fit).observe(cv);
  fit();

  /* ---------- SimKit (1 seconde simulée = 1 jour) ---------- */
  let frame = 0;
  sim = SimKit.mount({
    el: "#sim-controls", continuous: true, stepDt: 0.5,
    speed: { min: 0.2, max: 4, step: 0.2, value: 1 },
    onStep: (dt) => { advance(dt, sim ? sim.simTime : 0); if ((frame++ & 1) === 0) updateReadouts(); },
    onReset: () => { reset(); updateReadouts(); },
    render: render,
    readout: ({ simTime }) => {
      const c = counts();
      return { main: Antsa.t("jour ", "day ") + Math.floor(simTime), sub: "S " + c.s + " · I " + c.i + " · R " + c.r };
    }
  });
})();
