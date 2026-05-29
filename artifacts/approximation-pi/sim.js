/* Approximer π — trois méthodes : Archimède, Leibniz, Monte Carlo. */
(function () {
  Antsa.recordVisit("approximation-pi");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2, PI = Math.PI;

  const S = { method: "archi", running: true, speed: 1 };
  let an, lk, lsum, lhist, mn, mk, mpts;

  function reset() {
    an = 3;
    lk = 0; lsum = 0; lhist = [];
    mn = 0; mk = 0; mpts = [];
    redraw();
  }

  function estimate() {
    if (S.method === "archi") return (an * Math.sin(PI / an) + an * Math.tan(PI / an)) / 2;
    if (S.method === "leibniz") return 4 * lsum;
    return mn > 0 ? 4 * mk / mn : 0;
  }
  function stepLabel() {
    return S.method === "archi" ? Antsa.t("Côtés n", "Sides n")
      : S.method === "leibniz" ? Antsa.t("Termes", "Terms")
      : Antsa.t("Points", "Points");
  }
  function stepValue() {
    return S.method === "archi" ? an : S.method === "leibniz" ? lk : mn;
  }

  /* ---------- rendu ---------- */
  let W = 0, H = 0, dpr = 1;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
    redraw();
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function redraw() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    if (S.method === "archi") drawArchi();
    else if (S.method === "leibniz") drawLeibniz();
    else drawMC();
    updateReadouts();
  }

  function drawArchi() {
    const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.34, acc = css("--accent");
    ctx.strokeStyle = acc; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    // inscrit
    ctx.globalAlpha = 0.95; ctx.lineWidth = 2; ctx.strokeStyle = acc;
    poly(cx, cy, R, an, 0); ctx.stroke();
    // circonscrit
    ctx.globalAlpha = 0.5; ctx.strokeStyle = css("--ink-soft"); ctx.lineWidth = 1.5;
    poly(cx, cy, R / Math.cos(PI / an), an, PI / an); ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = acc;
    for (let i = 0; i < an; i++) { const a = -PI / 2 + i / an * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 2.5, 0, TAU); ctx.fill(); }
  }
  function poly(cx, cy, R, n, off) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) { const a = -PI / 2 + off + i / n * TAU; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  }

  function drawLeibniz() {
    const padL = 36, padR = 12, padT = 18, padB = 24;
    const x0 = padL, x1 = W - padR, y0 = padT, y1 = H - padB;
    const lo = PI - 1.3, hi = PI + 1.3;
    const yOf = v => y1 - (v - lo) / (hi - lo) * (y1 - y0);
    // ligne π
    ctx.strokeStyle = css("--ink-soft"); ctx.globalAlpha = 0.5; ctx.setLineDash([5, 5]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, yOf(PI)); ctx.lineTo(x1, yOf(PI)); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.fillStyle = css("--ink-soft"); ctx.font = "12px 'Space Mono', monospace"; ctx.fillText("π", x0 - 22, yOf(PI) + 4);
    // courbe
    const n = lhist.length; if (n > 1) {
      ctx.strokeStyle = css("--accent"); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const x = x0 + i / (n - 1) * (x1 - x0);
        const y = yOf(Math.max(lo, Math.min(hi, lhist[i])));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      const last = lhist[n - 1];
      ctx.fillStyle = css("--accent"); ctx.beginPath(); ctx.arc(x1, yOf(Math.max(lo, Math.min(hi, last))), 4, 0, TAU); ctx.fill();
    }
  }

  function drawMC() {
    const s = Math.min(W, H) * 0.82, ox = (W - s) / 2, oy = (H - s) / 2, acc = css("--accent");
    ctx.strokeStyle = acc; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.4;
    ctx.strokeRect(ox, oy, s, s);
    ctx.beginPath(); ctx.arc(ox, oy + s, s, -PI / 2, 0); ctx.stroke();
    for (const pt of mpts) {
      ctx.globalAlpha = pt[2] ? 0.85 : 0.35;
      ctx.fillStyle = pt[2] ? acc : "#9aa0ad";
      ctx.beginPath(); ctx.arc(ox + pt[0] * s, oy + s - pt[1] * s, 1.7, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateReadouts() {
    const est = estimate();
    document.getElementById("r-est").textContent = est ? est.toFixed(5) : "—";
    document.getElementById("k-est").textContent = est ? est.toFixed(6) : "—";
    document.getElementById("k-step").textContent = stepValue().toLocaleString(Antsa.getLang() === "fr" ? "fr-FR" : "en-US");
    document.getElementById("k-step-lab").textContent = stepLabel();
    document.getElementById("k-err").textContent = est ? (Math.abs(est - PI) / PI * 100).toFixed(4) + " %" : "—";
  }

  function updateMethodText() {
    const f = document.getElementById("f-method"), note = document.getElementById("method-note");
    if (S.method === "archi") {
      f.innerHTML = 'n·sin(π⁄n) &lt; <span class="hot">π</span> &lt; n·tan(π⁄n)';
      note.innerHTML = Antsa.t(
        "Archimède (≈ 250 av. J.-C.) coince le cercle entre deux polygones à n côtés (inscrit et circonscrit). En doublant n, l’encadrement se resserre autour de π.",
        "Archimedes (≈ 250 BC) traps the circle between two n-sided polygons (inscribed and circumscribed). Doubling n tightens the bounds around π.");
    } else if (S.method === "leibniz") {
      f.innerHTML = '<span class="hot">π</span> = 4·(1 − ⅓ + ⅕ − ⅐ + …)';
      note.innerHTML = Antsa.t(
        "La série de Leibniz additionne des fractions impaires alternées. Élégante, mais il faut des centaines de termes pour seulement 2 décimales !",
        "Leibniz’s series adds alternating odd fractions. Elegant, yet it needs hundreds of terms for just 2 decimals!");
    } else {
      f.innerHTML = '<span class="hot">π</span> ≈ 4 · (points dans le ¼ de disque) ⁄ n';
      note.innerHTML = Antsa.t(
        "On tire des points au hasard dans un carré : la proportion qui tombe dans le quart de disque vaut π⁄4. Le hasard estime π !",
        "We throw random points in a square: the fraction inside the quarter disk equals π⁄4. Randomness estimates π!");
    }
  }

  /* ---------- contrôles ---------- */
  document.getElementById("methods").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    S.method = b.dataset.m;
    document.querySelectorAll("#methods button").forEach(x => x.classList.toggle("on", x === b));
    reset(); updateMethodText();
    setLegend();
  });
  const sp = document.getElementById("s-speed"), vsp = document.getElementById("v-speed");
  const updSp = () => { S.speed = parseInt(sp.value, 10); vsp.textContent = "×" + S.speed; };
  sp.addEventListener("input", updSp); updSp();

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", () => {
    S.running = !S.running;
    btnPlay.dataset.fr = S.running ? "Pause" : "Reprendre"; btnPlay.dataset.en = S.running ? "Pause" : "Resume";
    btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-reset").addEventListener("click", reset);

  function setLegend() {
    const L = document.getElementById("legend"), u = Antsa.t;
    if (S.method === "archi") L.innerHTML = '<span><i style="background:' + css("--accent") + '"></i>' + u("inscrit", "inscribed") + '</span><span><i style="background:#9aa0ad"></i>' + u("circonscrit", "circumscribed") + '</span>';
    else if (S.method === "mc") L.innerHTML = '<span><i style="background:' + css("--accent") + '"></i>' + u("dans le ¼ disque", "inside ¼ disk") + '</span><span><i style="background:#9aa0ad"></i>' + u("dehors", "outside") + '</span>';
    else L.innerHTML = '<span><i style="background:' + css("--accent") + '"></i>' + u("estimation", "estimate") + '</span>';
  }

  document.addEventListener("antsa:theme", redraw);
  document.addEventListener("antsa:lang", () => { updateReadouts(); updateMethodText(); setLegend(); });

  /* ---------- boucle ---------- */
  let frame = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (S.running) {
      frame++;
      if (S.method === "archi") {
        if (frame % Math.max(1, 8 - Math.min(7, S.speed)) === 0) { an++; if (an > 60) an = 3; }
      } else if (S.method === "leibniz") {
        for (let i = 0; i < S.speed * 3; i++) { lsum += (lk % 2 === 0 ? 1 : -1) / (2 * lk + 1); lk++; }
        lhist.push(4 * lsum); if (lhist.length > 280) lhist.shift();
      } else {
        for (let i = 0; i < S.speed * 12 && mpts.length < 1400; i++) {
          const x = Math.random(), y = Math.random(); const ins = x * x + y * y <= 1;
          mpts.push([x, y, ins]); mn++; if (ins) mk++;
        }
        if (mpts.length >= 1400) mpts.splice(0, S.speed * 12);
      }
      redraw();
    }
  }

  reset(); updateMethodText(); setLegend();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
