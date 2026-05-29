/* Chute libre — trajectoire échantillonnée dans le temps, animée par SimKit. */
(function () {
  Antsa.recordVisit("chute-libre");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, DT = 0.01;

  const P = { ang: 45, v0: 30, g: 9.81, drag: false, k: 0.01 };
  let vac = [], path = [], stats = {}, flight = 0;

  function compute() {
    const th = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(th), vy = P.v0 * Math.sin(th);
    const T = 2 * vy / P.g;
    vac = [];
    for (let i = 0; i <= 120; i++) { const t = T * i / 120; vac.push([vx * t, vy * t - 0.5 * P.g * t * t]); }
    if (P.drag) {
      path = [[0, 0]]; let x = 0, y = 0, ux = vx, uy = vy, t = 0;
      while (y >= 0 && t < 120 && path.length < 12000) {
        const v = Math.hypot(ux, uy);
        ux += (-P.k * v * ux) * DT; uy += (-P.g - P.k * v * uy) * DT;
        x += ux * DT; y += uy * DT; t += DT;
        path.push([x, Math.max(0, y)]);
      }
      flight = (path.length - 1) * DT;
      let h = 0, range = 0; for (const p of path) { if (p[1] > h) h = p[1]; range = p[0]; }
      stats = { range, h, time: flight };
    } else {
      path = null; flight = T;
      stats = { range: vx * T, h: vy * vy / (2 * P.g), time: T };
    }
    setScale(); updateKV(); sim && sim.reset();
  }
  function posAt(t) {
    const th = P.ang * Math.PI / 180, vx = P.v0 * Math.cos(th), vy = P.v0 * Math.sin(th);
    if (!P.drag) return [vx * t, Math.max(0, vy * t - 0.5 * P.g * t * t)];
    const idx = Math.min(path.length - 1, Math.max(0, t / DT));
    const i0 = Math.floor(idx), i1 = Math.min(path.length - 1, i0 + 1), f = idx - i0;
    return [path[i0][0] + (path[i1][0] - path[i0][0]) * f, path[i0][1] + (path[i1][1] - path[i0][1]) * f];
  }

  let W = 0, H = 0, sc = 1, oxp = 0, oyp = 0;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
    setScale(); render();
  }
  function setScale() {
    if (!W) return;
    const maxX = Math.max(vac.length ? vac[vac.length - 1][0] : 1, stats.range || 1, 1);
    const maxY = Math.max(stats.h || 1, 1);
    oxp = W * 0.08; oyp = H * 0.9;
    sc = Math.min((W * 0.86) / maxX, (H * 0.78) / maxY);
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }
  const MX = x => oxp + x * sc, MY = y => oyp - y * sc;

  function render(curT) {
    if (!W) return;
    setScale();
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = css("--line"); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, oyp); ctx.lineTo(W, oyp); ctx.stroke();
    const th = P.ang * Math.PI / 180;
    ctx.strokeStyle = css("--ink-soft"); ctx.lineWidth = 4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(oxp, oyp); ctx.lineTo(oxp + Math.cos(th) * 26, oyp - Math.sin(th) * 26); ctx.stroke();
    if (P.drag) {
      ctx.strokeStyle = css("--ink-soft"); ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
      ctx.beginPath(); vac.forEach((p, i) => i ? ctx.lineTo(MX(p[0]), MY(p[1])) : ctx.moveTo(MX(p[0]), MY(p[1]))); ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    const t = curT == null ? (sim ? Math.min(sim.simTime, flight) : 0) : Math.min(curT, flight);
    const acc = css("--accent");
    ctx.strokeStyle = acc; ctx.lineWidth = 2.5; ctx.beginPath();
    let started = false;
    for (let tt = 0; tt <= t + 1e-9; tt += DT * 2) { const p = posAt(tt); started ? ctx.lineTo(MX(p[0]), MY(p[1])) : ctx.moveTo(MX(p[0]), MY(p[1])); started = true; }
    ctx.stroke();
    const cur = posAt(t);
    ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(MX(cur[0]), MY(cur[1]), 6, 0, TAU); ctx.fill();
  }

  function updateKV() {
    document.getElementById("k-range").textContent = stats.range.toFixed(1) + " m";
    document.getElementById("k-h").textContent = stats.h.toFixed(1) + " m";
    document.getElementById("k-t").textContent = stats.time.toFixed(2) + " s";
    document.getElementById("r-range").textContent = stats.range.toFixed(1) + " m";
    document.getElementById("r-h").textContent = stats.h.toFixed(1) + " m";
    const L = document.getElementById("legend"), u = Antsa.t;
    L.innerHTML = P.drag
      ? '<span><i style="background:' + css("--accent") + '"></i>' + u("avec air", "with air") + '</span><span><i style="background:#9aa0ad"></i>' + u("dans le vide", "vacuum") + '</span>'
      : '<span><i style="background:' + css("--accent") + '"></i>' + u("trajectoire", "trajectory") + '</span>';
  }

  /* ---------- contrôles ---------- */
  function bind(id, valId, key, fmt) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v.textContent = fmt(P[key]); compute(); };
    s.addEventListener("input", upd); v.textContent = fmt(P[key]);
  }
  bind("s-ang", "v-ang", "ang", x => Math.round(x) + "°");
  bind("s-v0", "v-v0", "v0", x => Math.round(x) + " m/s");
  const sg = document.getElementById("s-g"), vg = document.getElementById("v-g");
  function updG() { P.g = parseFloat(sg.value); vg.textContent = P.g.toFixed(2); document.querySelectorAll("#grav button").forEach(b => b.classList.toggle("on", Math.abs(parseFloat(b.dataset.g) - P.g) < 0.01)); compute(); }
  sg.addEventListener("input", updG);
  document.getElementById("grav").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; sg.value = b.dataset.g; updG(); });
  const sk = document.getElementById("s-k"), vk = document.getElementById("v-k");
  sk.addEventListener("input", () => { P.k = parseFloat(sk.value); vk.textContent = P.k.toFixed(3); compute(); });
  document.getElementById("drag").addEventListener("change", e => { P.drag = e.target.checked; document.getElementById("c-k").style.display = P.drag ? "" : "none"; compute(); });

  document.addEventListener("antsa:theme", () => render());
  document.addEventListener("antsa:lang", updateKV);

  new ResizeObserver(fit).observe(cv);
  fit();

  /* ---------- SimKit (horloge = temps de vol réel) ---------- */
  const sim = SimKit.mount({
    el: "#sim-controls", continuous: true, stepDt: 0.05,
    speed: { min: 0.25, max: 4, step: 0.25, value: 1 },
    onStep: (dt) => { if (sim.simTime > flight + 1.2) sim.reset(); },
    onReset: () => { render(0); },
    render: () => render(),
    readout: ({ simTime }) => {
      const t = Math.min(simTime, flight), p = posAt(t);
      return { main: "t = " + t.toFixed(2) + " s", sub: Antsa.t("hauteur ", "height ") + p[1].toFixed(1) + " m · x " + p[0].toFixed(1) + " m" };
    }
  });
})();
