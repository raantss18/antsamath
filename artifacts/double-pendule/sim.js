/* Double pendule — intégration RK4 (piloté par SimKit, horloge temps réel). */
(function () {
  Antsa.recordVisit("double-pendule");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, D2R = Math.PI / 180;

  const P = { L1: 1, L2: 1, m1: 1, m2: 1, g: 9.8, damp: 0, t1: 120, t2: 150, twin: false };
  let main = null, ghost = null, trail = [], gtrail = [];

  function freshState() { return { a1: P.t1 * D2R, a2: P.t2 * D2R, w1: 0, w2: 0 }; }
  function reset() {
    main = freshState();
    ghost = P.twin ? { a1: main.a1 + 0.001, a2: main.a2, w1: 0, w2: 0 } : null;
    trail = []; gtrail = []; setLegend();
  }

  function accel(a1, a2, w1, w2) {
    const { L1, L2, m1, m2, g } = P;
    const d = a1 - a2, sd = Math.sin(d), cd = Math.cos(d);
    const den = 2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2);
    const w1d = (-g * (2 * m1 + m2) * Math.sin(a1) - m2 * g * Math.sin(a1 - 2 * a2)
      - 2 * sd * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * cd)) / (L1 * den);
    const w2d = (2 * sd * (w1 * w1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(a1) + w2 * w2 * L2 * m2 * cd)) / (L2 * den);
    return [w1d, w2d];
  }
  function deriv(s) { const [w1d, w2d] = accel(s.a1, s.a2, s.w1, s.w2); return { a1: s.w1, a2: s.w2, w1: w1d, w2: w2d }; }
  function add(s, k, h) { return { a1: s.a1 + k.a1 * h, a2: s.a2 + k.a2 * h, w1: s.w1 + k.w1 * h, w2: s.w2 + k.w2 * h }; }
  function rk4(s, h) {
    const k1 = deriv(s), k2 = deriv(add(s, k1, h / 2)), k3 = deriv(add(s, k2, h / 2)), k4 = deriv(add(s, k3, h));
    s.a1 += h / 6 * (k1.a1 + 2 * k2.a1 + 2 * k3.a1 + k4.a1);
    s.a2 += h / 6 * (k1.a2 + 2 * k2.a2 + 2 * k3.a2 + k4.a2);
    s.w1 += h / 6 * (k1.w1 + 2 * k2.w1 + 2 * k3.w1 + k4.w1);
    s.w2 += h / 6 * (k1.w2 + 2 * k2.w2 + 2 * k3.w2 + k4.w2);
    if (P.damp > 0) { const f = 1 - P.damp / 100 * 0.02; s.w1 *= f; s.w2 *= f; }
  }

  // avance la physique de simDt secondes (sous-pas fixes pour la stabilité)
  function advance(simDt) {
    const h = 0.004; let left = Math.min(simDt, 0.2);
    while (left > 1e-6) { const dt = Math.min(h, left); rk4(main, dt); if (ghost) rk4(ghost, dt); left -= dt; }
    pushTrail();
  }
  function pushTrail() {
    const sc = scale(), px0 = W / 2, py0 = H * 0.34;
    const t = pos(main, sc, px0, py0); trail.push([t[2], t[3]]); if (trail.length > 260) trail.shift();
    if (ghost) { const g = pos(ghost, sc, px0, py0); gtrail.push([g[2], g[3]]); if (gtrail.length > 260) gtrail.shift(); }
  }

  let W = 0, H = 0;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
    render();
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }
  function scale() { return Math.min(W, H) * 0.42 / (P.L1 + P.L2); }
  function pos(s, sc, px0, py0) {
    const x1 = px0 + P.L1 * sc * Math.sin(s.a1), y1 = py0 + P.L1 * sc * Math.cos(s.a1);
    const x2 = x1 + P.L2 * sc * Math.sin(s.a2), y2 = y1 + P.L2 * sc * Math.cos(s.a2);
    return [x1, y1, x2, y2];
  }
  function drawPendulum(s, color, tr, alpha) {
    const sc = scale(), px0 = W / 2, py0 = H * 0.34;
    const [x1, y1, x2, y2] = pos(s, sc, px0, py0);
    if (tr.length > 1) {
      ctx.lineWidth = 2; ctx.lineCap = "round";
      for (let i = 1; i < tr.length; i++) { ctx.globalAlpha = (i / tr.length) * 0.6 * alpha; ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(tr[i - 1][0], tr[i - 1][1]); ctx.lineTo(tr[i][0], tr[i][1]); ctx.stroke(); }
    }
    ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(px0, py0, 4, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x1, y1, 4 + 2 * Math.sqrt(P.m1), 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y2, 4 + 2 * Math.sqrt(P.m2), 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
  function render() {
    if (!W || !main) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    if (ghost) drawPendulum(ghost, "#2E8BFF", gtrail, 0.6);
    drawPendulum(main, css("--accent"), trail, 1);
  }

  function deg(a) { return ((a * 180 / Math.PI) % 360 + 360) % 360; }
  function updatePills() {
    document.getElementById("r-t1").textContent = Math.round(deg(main.a1)) + "°";
    document.getElementById("r-t2").textContent = Math.round(deg(main.a2)) + "°";
    const pill = document.getElementById("pill-gap");
    if (ghost) { pill.style.display = ""; document.getElementById("r-gap").textContent = (Math.abs(main.a1 - ghost.a1) + Math.abs(main.a2 - ghost.a2)).toFixed(3) + " rad"; }
    else pill.style.display = "none";
  }
  function setLegend() {
    const L = document.getElementById("legend"), u = Antsa.t;
    let h = '<span><i style="background:' + css("--accent") + '"></i>' + u("pendule", "pendulum") + '</span>';
    if (P.twin) h += '<span><i style="background:#2E8BFF"></i>' + u("jumeau", "twin") + '</span>';
    L.innerHTML = h;
  }

  /* ---------- contrôles ---------- */
  function bind(id, valId, key, fmt) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v.textContent = fmt(P[key]); };
    s.addEventListener("input", upd); upd();
  }
  bind("s-l1", "v-l1", "L1", x => x.toFixed(2)); bind("s-l2", "v-l2", "L2", x => x.toFixed(2));
  bind("s-m1", "v-m1", "m1", x => x.toFixed(1)); bind("s-m2", "v-m2", "m2", x => x.toFixed(1));
  bind("s-g", "v-g", "g", x => x.toFixed(1)); bind("s-damp", "v-damp", "damp", x => Math.round(x) + "%");
  function bindAngle(id, valId, key) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v.textContent = Math.round(P[key]) + "°"; sim.reset(); };
    s.addEventListener("input", upd); upd();
  }
  bindAngle("s-t1", "v-t1", "t1"); bindAngle("s-t2", "v-t2", "t2");
  document.getElementById("twin").addEventListener("change", e => { P.twin = e.target.checked; sim.reset(); });

  document.addEventListener("antsa:theme", () => { setLegend(); render(); });
  document.addEventListener("antsa:lang", setLegend);

  new ResizeObserver(fit).observe(cv);
  fit();

  /* ---------- SimKit ---------- */
  const sim = SimKit.mount({
    el: "#sim-controls", continuous: true, stepDt: 1 / 40,
    speed: { min: 0.1, max: 2, step: 0.1, value: 0.4 },
    onStep: (dt) => { advance(dt); updatePills(); },
    onReset: () => { reset(); updatePills(); },
    render: render,
    readout: ({ simTime }) => ({
      main: "t = " + simTime.toFixed(2) + " s",
      sub: ghost ? Antsa.t("écart : ", "gap: ") + (Math.abs(main.a1 - ghost.a1) + Math.abs(main.a2 - ghost.a2)).toFixed(3) + " rad"
                 : "θ₁ " + Math.round(deg(main.a1)) + "° · θ₂ " + Math.round(deg(main.a2)) + "°"
    })
  });
})();
