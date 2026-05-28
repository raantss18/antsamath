/* Épidémie — modèle SIR illustré par des agents + courbe temporelle. */
(function () {
  Antsa.recordVisit("epidemie-sir");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const chart = document.getElementById("chart");
  const cctx = chart.getContext("2d");
  const TAU = Math.PI * 2;
  const COL = { S: "#4F8DF7", I: "#D32C6D", R: "#7E8898" };
  const RAD = 0.038; // rayon de contact (normalisé)

  const P = { N: 220, beta: 0.3, gamma: 0.03, mob: 0.6, vax: 0, running: true };
  let agents = [], hist = [], peak = 0, everInf = 0;

  function reset() {
    agents = []; hist = []; peak = 0; everInf = 0;
    const nVax = Math.round(P.N * P.vax / 100);
    const nInf = Math.min(3, P.N - nVax);
    for (let i = 0; i < P.N; i++) {
      const ang = Math.random() * TAU;
      agents.push({ x: Math.random(), y: Math.random(), vx: Math.cos(ang), vy: Math.sin(ang), st: 0, t: 0 });
    }
    for (let i = 0; i < nVax; i++) agents[i].st = 2;
    for (let i = nVax; i < nVax + nInf; i++) { agents[i].st = 1; everInf++; }
  }

  function counts() {
    let s = 0, inf = 0, r = 0;
    for (const a of agents) { if (a.st === 0) s++; else if (a.st === 1) inf++; else r++; }
    return { s, i: inf, r };
  }

  function stepSim() {
    const sp = 0.005 * P.mob;
    for (const a of agents) {
      a.x += a.vx * sp; a.y += a.vy * sp;
      if (a.x < 0) { a.x = 0; a.vx *= -1; } if (a.x > 1) { a.x = 1; a.vx *= -1; }
      if (a.y < 0) { a.y = 0; a.vy *= -1; } if (a.y > 1) { a.y = 1; a.vy *= -1; }
      if (Math.random() < 0.02) { const ang = Math.random() * TAU; a.vx = Math.cos(ang); a.vy = Math.sin(ang); }
    }
    // contagion
    for (let i = 0; i < agents.length; i++) {
      if (agents[i].st !== 1) continue;
      for (let j = 0; j < agents.length; j++) {
        if (agents[j].st !== 0) continue;
        const dx = agents[i].x - agents[j].x, dy = agents[i].y - agents[j].y;
        if (dx * dx + dy * dy < RAD * RAD && Math.random() < P.beta) { agents[j].st = 1; agents[j].t = 0; everInf++; }
      }
    }
    // guérison
    for (const a of agents) if (a.st === 1) { a.t++; if (Math.random() < P.gamma) a.st = 2; }

    const c = counts();
    if (c.i > peak) peak = c.i;
    hist.push(c); if (hist.length > 600) hist.shift();
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
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function renderAgents() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = css("--line"); ctx.lineWidth = 1; ctx.strokeRect(ox, oy, size, size);
    for (const a of agents) {
      ctx.fillStyle = a.st === 0 ? COL.S : a.st === 1 ? COL.I : COL.R;
      ctx.globalAlpha = a.st === 1 ? 1 : 0.85;
      ctx.beginPath(); ctx.arc(ox + a.x * size, oy + a.y * size, a.st === 1 ? 3.4 : 2.8, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- rendu courbe ---------- */
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
    for (let i = 0; i < n; i++) {
      const x = n <= 1 ? 0 : i / (n - 1) * cw;
      const y = ch - (hist[i][key] / P.N) * (ch - 4) - 2;
      i ? cctx.lineTo(x, y) : cctx.moveTo(x, y);
    }
    cctx.stroke();
  }
  function renderChart() {
    cctx.clearRect(0, 0, cw, ch);
    if (hist.length < 2) return;
    // aire sous I
    cctx.fillStyle = COL.I + "26"; cctx.beginPath(); cctx.moveTo(0, ch);
    const n = hist.length;
    for (let i = 0; i < n; i++) cctx.lineTo(i / (n - 1) * cw, ch - (hist[i].i / P.N) * (ch - 4) - 2);
    cctx.lineTo(cw, ch); cctx.closePath(); cctx.fill();
    line("s", COL.S); line("r", COL.R); line("i", COL.I);
  }

  /* ---------- indicateurs ---------- */
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

  /* ---------- contrôles ---------- */
  function bind(id, valId, key, fmt, doReset) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v.textContent = fmt(P[key]); updateReadouts(); if (doReset) reset(); };
    s.addEventListener("input", upd); upd();
  }
  bind("s-n", "v-n", "N", x => Math.round(x), true);
  bind("s-beta", "v-beta", "beta", x => x.toFixed(2), false);
  bind("s-gamma", "v-gamma", "gamma", x => x.toFixed(3), false);
  bind("s-mob", "v-mob", "mob", x => Math.round(x * 100) + "%", false);
  bind("s-vax", "v-vax", "vax", x => Math.round(x) + "%", true);

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", () => {
    P.running = !P.running;
    btnPlay.dataset.fr = P.running ? "Pause" : "Reprendre";
    btnPlay.dataset.en = P.running ? "Pause" : "Resume";
    btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.addEventListener("antsa:theme", () => { renderAgents(); renderChart(); });
  document.addEventListener("antsa:lang", updateReadouts);

  /* ---------- boucle ---------- */
  let frame = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (P.running) { stepSim(); frame++; if (frame % 2 === 0) updateReadouts(); }
    renderAgents(); renderChart();
  }

  reset(); updateReadouts();
  new ResizeObserver(() => { fit(); fitChart(); }).observe(cv);
  fit(); fitChart();
  requestAnimationFrame(loop);
})();
