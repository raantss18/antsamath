/* Fractales — Mandelbrot & Julia, rendu par échappement (ImageData). */
(function () {
  Antsa.recordVisit("fractales");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");

  const S = {
    mode: "mandel",
    cx: -0.5, cy: 0, scale: 3.2 / 480, // unités complexes par pixel de rendu
    base: 3.2 / 480,
    maxIter: 150, pal: 0,
    cre: -0.4, cim: 0.6
  };
  let RW = 480, RH = 360, img = null;

  /* palettes cosinus (Inigo Quilez) : couleur = a + b·cos(2π(c·t+d)) */
  const PAL = [
    { a: [0.5, 0.5, 0.6], b: [0.5, 0.5, 0.5], c: [1, 1, 1], d: [0.0, 0.15, 0.35] }, // néon
    { a: [0.5, 0.35, 0.2], b: [0.5, 0.4, 0.3], c: [1, 1, 1], d: [0.0, 0.1, 0.2] },   // feu
    { a: [0.2, 0.4, 0.5], b: [0.3, 0.4, 0.5], c: [1, 1, 1], d: [0.5, 0.55, 0.65] }    // océan
  ];
  function color(t, out, o) {
    const p = PAL[S.pal], TAU = Math.PI * 2;
    out[o] = 255 * clamp(p.a[0] + p.b[0] * Math.cos(TAU * (p.c[0] * t + p.d[0])));
    out[o + 1] = 255 * clamp(p.a[1] + p.b[1] * Math.cos(TAU * (p.c[1] * t + p.d[1])));
    out[o + 2] = 255 * clamp(p.a[2] + p.b[2] * Math.cos(TAU * (p.c[2] * t + p.d[2])));
    out[o + 3] = 255;
  }
  function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function render() {
    if (!RW || !img) return;
    const data = img.data, mi = S.maxIter, julia = S.mode === "julia";
    const jx = S.cre, jy = S.cim;
    for (let py = 0; py < RH; py++) {
      const y0 = S.cy + (py - RH / 2) * S.scale;
      for (let px = 0; px < RW; px++) {
        const x0 = S.cx + (px - RW / 2) * S.scale;
        let zx, zy, cx, cy;
        if (julia) { zx = x0; zy = y0; cx = jx; cy = jy; }
        else { zx = 0; zy = 0; cx = x0; cy = y0; }
        let i = 0, x2 = zx * zx, y2 = zy * zy;
        while (i < mi && x2 + y2 <= 256) {
          zy = 2 * zx * zy + cy; zx = x2 - y2 + cx;
          x2 = zx * zx; y2 = zy * zy; i++;
        }
        const o = (py * RW + px) * 4;
        if (i >= mi) { data[o] = 8; data[o + 1] = 8; data[o + 2] = 14; data[o + 3] = 255; }
        else {
          const mag = x2 + y2;
          const mu = i + 1 - Math.log(Math.log(mag) / 2) / Math.LN2;
          color(Math.sqrt(mu / mi) * 0.95 + 0.02, data, o);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    document.getElementById("r-zoom").textContent = "×" + fmtZoom(S.base / S.scale);
    document.getElementById("r-iter").textContent = S.maxIter;
  }
  function fmtZoom(z) { return z >= 1000 ? (z / 1000).toFixed(1) + "k" : z >= 10 ? Math.round(z) : z.toFixed(1); }

  let pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(() => { pending = false; render(); }); }

  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    RW = Math.min(Math.round(r.width), 620);
    RH = Math.round(RW * r.height / r.width);
    cv.width = RW; cv.height = RH;
    img = ctx.createImageData(RW, RH);
    schedule();
  }

  /* ---------- interactions souris ---------- */
  function clientToC(e) {
    const r = cv.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width * RW;
    const py = (e.clientY - r.top) / r.height * RH;
    return [S.cx + (px - RW / 2) * S.scale, S.cy + (py - RH / 2) * S.scale];
  }
  cv.addEventListener("wheel", e => {
    e.preventDefault();
    const [mx, my] = clientToC(e);
    S.scale *= e.deltaY < 0 ? 0.8 : 1.25;
    const [mx2, my2] = clientToC(e);
    S.cx += mx - mx2; S.cy += my - my2;
    schedule();
  }, { passive: false });

  let down = false, moved = 0, last = null;
  cv.addEventListener("pointerdown", e => { down = true; moved = 0; last = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", e => {
    if (!down) return;
    const r = cv.getBoundingClientRect();
    const dx = e.clientX - last[0], dy = e.clientY - last[1];
    moved += Math.abs(dx) + Math.abs(dy);
    S.cx -= dx / r.width * RW * S.scale;
    S.cy -= dy / r.height * RH * S.scale;
    last = [e.clientX, e.clientY];
    schedule();
  });
  cv.addEventListener("pointerup", e => {
    down = false;
    if (moved < 5) { // clic simple → zoom avant centré sur le point
      const [mx, my] = clientToC(e);
      S.scale *= 0.6; S.cx = mx; S.cy = my; schedule();
    }
  });

  /* ---------- contrôles ---------- */
  document.getElementById("modes").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    S.mode = b.dataset.mode;
    document.querySelectorAll("#modes button").forEach(x => x.classList.toggle("on", x === b));
    document.getElementById("julia-box").style.display = S.mode === "julia" ? "" : "none";
    if (S.mode === "julia") { S.cx = 0; S.cy = 0; S.scale = 3.2 / 480; }
    else { S.cx = -0.5; S.cy = 0; S.scale = 3.2 / 480; }
    schedule();
  });
  document.getElementById("palettes").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    S.pal = parseInt(b.dataset.pal, 10);
    document.querySelectorAll("#palettes button").forEach(x => x.classList.toggle("on", x === b));
    schedule();
  });
  document.getElementById("julia-presets").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const [re, im] = b.dataset.c.split(",").map(Number);
    S.cre = re; S.cim = im;
    document.getElementById("s-cre").value = re; document.getElementById("s-cim").value = im;
    document.getElementById("v-cre").textContent = re.toFixed(2);
    document.getElementById("v-cim").textContent = im.toFixed(2);
    schedule();
  });
  function bind(id, valId, key, fmt) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { S[key] = parseFloat(s.value); v.textContent = fmt(S[key]); schedule(); };
    s.addEventListener("input", upd); upd();
  }
  bind("s-cre", "v-cre", "cre", x => x.toFixed(2));
  bind("s-cim", "v-cim", "cim", x => x.toFixed(2));
  bind("s-iter", "v-iter", "maxIter", x => Math.round(x));

  document.getElementById("btn-in").addEventListener("click", () => { S.scale *= 0.6; schedule(); });
  document.getElementById("btn-out").addEventListener("click", () => { S.scale *= 1.6; schedule(); });
  document.getElementById("btn-reset").addEventListener("click", () => {
    if (S.mode === "julia") { S.cx = 0; S.cy = 0; } else { S.cx = -0.5; S.cy = 0; }
    S.scale = 3.2 / 480; schedule();
  });

  new ResizeObserver(fit).observe(cv);
  fit();
  if (window.SimKit) SimKit.decorateTips(document);
})();
