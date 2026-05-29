/* Chute libre — tir parabolique, avec ou sans résistance de l'air. */
(function () {
  Antsa.recordVisit("chute-libre");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;

  const P = { ang: 45, v0: 30, g: 9.81, drag: false, k: 0.01, playing: true };
  let vac = [], real = [], stats = {}, idx = 0, holdT = 0;

  function compute() {
    const th = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(th), vy = P.v0 * Math.sin(th);
    // trajectoire dans le vide (analytique)
    vac = [];
    const T = 2 * vy / P.g;
    for (let i = 0; i <= 80; i++) { const t = T * i / 80; vac.push([vx * t, vy * t - 0.5 * P.g * t * t]); }
    // trajectoire réelle (numérique si frottement)
    if (P.drag) {
      real = [];
      let x = 0, y = 0, ux = vx, uy = vy, t = 0; const dt = 0.004, km = P.k;
      real.push([0, 0]);
      while (y >= 0 && t < 60) {
        const v = Math.hypot(ux, uy);
        const ax = -km * v * ux, ay = -P.g - km * v * uy;
        ux += ax * dt; uy += ay * dt; x += ux * dt; y += uy * dt; t += dt;
        if (real.length === 0 || (real.length < 4000 && t % 0.02 < dt)) real.push([x, y]);
      }
      real.push([x, 0]);
      stats = analyse(real, t);
    } else {
      real = vac;
      stats = { range: vx * T, h: vy * vy / (2 * P.g), time: T };
    }
    idx = 0; holdT = 0;
    redraw();
    updateKV();
  }
  function analyse(pts, time) {
    let h = 0, range = 0;
    for (const p of pts) { if (p[1] > h) h = p[1]; range = p[0]; }
    return { range, h, time };
  }

  let W = 0, H = 0, dpr = 1, sc = 1, oxp = 0, oyp = 0;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
    setScale(); redraw();
  }
  function setScale() {
    const maxX = Math.max(vac[vac.length - 1] ? vac[vac.length - 1][0] : 1, stats.range || 1, 1);
    const maxY = Math.max(stats.h || 1, 1);
    oxp = W * 0.08; oyp = H * 0.9;
    sc = Math.min((W * 0.86) / maxX, (H * 0.78) / maxY);
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }
  const MX = x => oxp + x * sc;
  const MY = y => oyp - y * sc;

  function redraw() {
    if (!W) return;
    setScale();
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    // sol
    ctx.strokeStyle = css("--line"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, oyp); ctx.lineTo(W, oyp); ctx.stroke();
    // canon
    ctx.strokeStyle = css("--ink-soft"); ctx.lineWidth = 4; ctx.lineCap = "round";
    const th = P.ang * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(oxp, oyp); ctx.lineTo(oxp + Math.cos(th) * 26, oyp - Math.sin(th) * 26); ctx.stroke();
    // référence vide (si frottement actif)
    if (P.drag) {
      ctx.strokeStyle = css("--ink-soft"); ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); vac.forEach((p, i) => i ? ctx.lineTo(MX(p[0]), MY(p[1])) : ctx.moveTo(MX(p[0]), MY(p[1]))); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // trajectoire réelle jusqu'à idx
    const acc = css("--accent");
    ctx.strokeStyle = acc; ctx.lineWidth = 2.5; ctx.beginPath();
    const upto = Math.min(idx, real.length - 1);
    for (let i = 0; i <= upto; i++) { const p = real[i]; i ? ctx.lineTo(MX(p[0]), MY(p[1])) : ctx.moveTo(MX(p[0]), MY(p[1])); }
    ctx.stroke();
    // apex & portée
    ctx.fillStyle = css("--ink-soft"); ctx.font = "12px 'Space Mono', monospace";
    // bille
    const cur = real[upto] || [0, 0];
    ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(MX(cur[0]), MY(cur[1]), 6, 0, TAU); ctx.fill();
  }

  function updateKV() {
    const u = Antsa.t;
    document.getElementById("k-range").textContent = stats.range.toFixed(1) + " m";
    document.getElementById("k-h").textContent = stats.h.toFixed(1) + " m";
    document.getElementById("k-t").textContent = stats.time.toFixed(2) + " s";
    document.getElementById("r-range").textContent = stats.range.toFixed(1) + " m";
    document.getElementById("r-h").textContent = stats.h.toFixed(1) + " m";
    const L = document.getElementById("legend");
    L.innerHTML = P.drag
      ? '<span><i style="background:' + css("--accent") + '"></i>' + u("avec air", "with air") + '</span><span><i style="background:#9aa0ad"></i>' + u("dans le vide", "vacuum") + '</span>'
      : '<span><i style="background:' + css("--accent") + '"></i>' + u("trajectoire", "trajectory") + '</span>';
  }

  /* ---------- contrôles ---------- */
  function bind(id, valId, key, fmt, recompute) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v.textContent = fmt(P[key]); if (recompute) compute(); };
    s.addEventListener("input", upd); upd();
  }
  bind("s-ang", "v-ang", "ang", x => Math.round(x) + "°", true);
  bind("s-v0", "v-v0", "v0", x => Math.round(x) + " m/s", true);
  const sg = document.getElementById("s-g"), vg = document.getElementById("v-g");
  const updG = () => { P.g = parseFloat(sg.value); vg.textContent = P.g.toFixed(2); document.querySelectorAll("#grav button").forEach(b => b.classList.toggle("on", Math.abs(parseFloat(b.dataset.g) - P.g) < 0.01)); compute(); };
  sg.addEventListener("input", updG);
  document.getElementById("grav").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sg.value = b.dataset.g; updG(); });
  bind("s-k", "v-k", "k", x => x.toFixed(3), true);
  document.getElementById("drag").addEventListener("change", e => { P.drag = e.target.checked; document.getElementById("c-k").style.display = P.drag ? "" : "none"; compute(); });

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", () => {
    P.playing = !P.playing;
    btnPlay.dataset.fr = P.playing ? "Pause" : "Reprendre"; btnPlay.dataset.en = P.playing ? "Pause" : "Resume";
    btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-fire").addEventListener("click", () => { idx = 0; holdT = 0; P.playing = true; btnPlay.dataset.fr = "Pause"; btnPlay.dataset.en = "Pause"; btnPlay.textContent = Antsa.t("Pause", "Pause"); });
  document.addEventListener("antsa:theme", redraw);
  document.addEventListener("antsa:lang", updateKV);

  /* ---------- boucle ---------- */
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (P.playing) {
      if (idx < real.length - 1) idx += Math.max(1, Math.round(real.length / 90));
      else { holdT++; if (holdT > 60) { idx = 0; holdT = 0; } }
      redraw();
    }
  }

  compute();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
