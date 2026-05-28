/* Monte Carlo — estimation d'aire. */
(function () {
  Antsa.recordVisit("monte-carlo-aire");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;

  const state = {
    shape: "disque",
    r: 0.8, a: 0.9, b: 0.55, size: 0.9,
    targetN: 10000, speed: 120,
    running: true,
    n: 0, k: 0,
    xs: [], ys: [], ins: []
  };

  let W = 0, H = 0, S = 0, ox = 0, oy = 0, dpr = 1;
  function fit() {
    const rct = cv.getBoundingClientRect();
    if (!rct.width || !rct.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = rct.width; H = rct.height;
    S = Math.min(W, H) * 0.9; ox = (W - S) / 2; oy = (H - S) / 2;
    fullRedraw();
  }
  const mx = x => ox + (x + 1) / 2 * S;
  const my = y => oy + (1 - (y + 1) / 2) * S;

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

  function drawBox() {
    ctx.strokeStyle = getCss("--line");
    ctx.globalAlpha = 1; ctx.lineWidth = 1.5;
    ctx.strokeRect(mx(-1), my(1), S, S);
  }
  function getCss(v) { return getComputedStyle(document.body).getPropertyValue(v).trim() || "#ccc"; }

  function drawOutline() {
    const accent = getCss("--accent");
    ctx.strokeStyle = accent; ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath();
    const STEP = 0.005;
    if (state.shape === "disque") {
      ctx.arc(mx(0), my(0), state.r / 2 * S, 0, TAU);
    } else if (state.shape === "ellipse") {
      for (let t = 0; t <= TAU + 0.01; t += STEP * 6) {
        const x = state.a * Math.cos(t), y = state.b * Math.sin(t);
        t === 0 ? ctx.moveTo(mx(x), my(y)) : ctx.lineTo(mx(x), my(y));
      }
    } else if (state.shape === "astroide") {
      for (let t = 0; t <= TAU + 0.01; t += STEP * 4) {
        const x = state.size * Math.pow(Math.cos(t), 3), y = state.size * Math.pow(Math.sin(t), 3);
        t === 0 ? ctx.moveTo(mx(x), my(y)) : ctx.lineTo(mx(x), my(y));
      }
    } else if (state.shape === "losange") {
      const s = state.size;
      ctx.moveTo(mx(s), my(0)); ctx.lineTo(mx(0), my(s)); ctx.lineTo(mx(-s), my(0)); ctx.lineTo(mx(0), my(-s)); ctx.closePath();
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawPoint(i) {
    const accent = getCss("--accent");
    ctx.globalAlpha = state.ins[i] ? 0.85 : 0.4;
    ctx.fillStyle = state.ins[i] ? accent : "#9aa0ad";
    ctx.beginPath(); ctx.arc(mx(state.xs[i]), my(state.ys[i]), 1.7, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function clearCanvas() {
    ctx.fillStyle = getCss("--card"); ctx.fillRect(0, 0, W, H);
  }
  function fullRedraw() {
    if (!W) return;
    clearCanvas();
    drawBox();
    for (let i = 0; i < state.xs.length; i++) drawPoint(i);
    drawOutline();
  }

  function reset() {
    state.n = 0; state.k = 0; state.xs.length = 0; state.ys.length = 0; state.ins.length = 0;
    fullRedraw(); updateReadouts();
  }

  function fmt(x, d) { return x.toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US", { minimumFractionDigits: d, maximumFractionDigits: d }); }

  function updateReadouts() {
    document.getElementById("r-n").textContent = state.n.toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US");
    document.getElementById("r-k").textContent = state.k.toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US");
    const exact = exactArea();
    document.getElementById("r-exact").textContent = fmt(exact, 4);
    if (state.n > 0) {
      const est = 4 * state.k / state.n;
      document.getElementById("r-est").textContent = fmt(est, 4);
      document.getElementById("r-err").textContent = fmt(Math.abs(est - exact) / exact * 100, 2) + " %";
    } else {
      document.getElementById("r-est").textContent = "—";
      document.getElementById("r-err").textContent = "—";
    }
  }

  function updateLesson() {
    const s = state.shape, t = Antsa.t;
    let f = "";
    if (s === "disque") f = '<span class="hot">A</span> = π·r² = π·' + fmt(state.r, 2) + '² = ' + fmt(exactArea(), 4);
    else if (s === "ellipse") f = '<span class="hot">A</span> = π·a·b = π·' + fmt(state.a, 2) + '·' + fmt(state.b, 2) + ' = ' + fmt(exactArea(), 4);
    else if (s === "astroide") f = '<span class="hot">A</span> = 3π·a²⁄8 = ' + fmt(exactArea(), 4);
    else if (s === "losange") f = '<span class="hot">A</span> = 2·c² = ' + fmt(exactArea(), 4);
    document.getElementById("f-exact").innerHTML = f;
  }

  /* ---------- contrôles ---------- */
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
    showParams(); reset(); updateLesson();
  });

  function bindSlider(id, valId, key, fmtFn, after) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => {
      state[key] = parseFloat(s.value);
      v.textContent = fmtFn(state[key]);
      if (after) after();
    };
    s.addEventListener("input", upd); upd();
  }
  bindSlider("s-r", "v-r", "r", x => fmt(x, 2), () => { reset(); updateLesson(); });
  bindSlider("s-a", "v-a", "a", x => fmt(x, 2), () => { reset(); updateLesson(); });
  bindSlider("s-b", "v-b", "b", x => fmt(x, 2), () => { reset(); updateLesson(); });
  bindSlider("s-size", "v-size", "size", x => fmt(x, 2), () => { reset(); updateLesson(); });

  const sn = document.getElementById("s-n"), vn = document.getElementById("v-n");
  const updN = () => { state.targetN = parseInt(sn.value, 10); vn.textContent = state.targetN.toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US"); if (state.n > state.targetN) reset(); };
  sn.addEventListener("input", updN); updN();

  const sp = document.getElementById("s-speed"), vsp = document.getElementById("v-speed");
  const updSp = () => { state.speed = parseInt(sp.value, 10); vsp.textContent = state.speed + Antsa.t(" / image", " / frame"); };
  sp.addEventListener("input", updSp); updSp();

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", () => {
    state.running = !state.running;
    btnPlay.textContent = state.running ? Antsa.t("Pause", "Pause") : Antsa.t("Reprendre", "Resume");
    btnPlay.dataset.fr = state.running ? "Pause" : "Reprendre";
    btnPlay.dataset.en = state.running ? "Pause" : "Resume";
  });
  document.getElementById("btn-reset").addEventListener("click", reset);

  document.addEventListener("antsa:lang", () => { showParams(); updateLesson(); updateReadouts(); updSp(); updN(); });
  document.addEventListener("antsa:theme", fullRedraw);

  /* ---------- boucle ---------- */
  function loop() {
    requestAnimationFrame(loop);
    if (!state.running || !W) return;
    if (state.n >= state.targetN) return;
    const batch = Math.min(state.speed, state.targetN - state.n);
    for (let i = 0; i < batch; i++) {
      const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1;
      const ins = inside(x, y);
      state.xs.push(x); state.ys.push(y); state.ins.push(ins);
      state.n++; if (ins) state.k++;
      drawPoint(state.xs.length - 1);
    }
    // redessine le contour par-dessus de temps en temps
    if (state.n % (state.speed * 6) < batch) drawOutline();
    updateReadouts();
  }

  showParams(); updateLesson(); updateReadouts();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
