/* Nombres premiers — crible d'Ératosthène animé + spirale d'Ulam. */
(function () {
  Antsa.recordVisit("nombres-premiers");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;

  const S = { N: 289, view: "sieve", speed: 4, running: true };
  let isP = [], status = [], scan = 2, curP = null, mult = 2, sieveDone = false;
  let coords = [], reveal = 1;

  function buildPrimes() {
    isP = new Array(S.N + 1).fill(true); isP[0] = isP[1] = false;
    for (let i = 2; i * i <= S.N; i++) if (isP[i]) for (let j = i * i; j <= S.N; j += i) isP[j] = false;
  }
  function buildUlam() {
    coords = []; let x = 0, y = 0, dx = 0, dy = -1;
    for (let i = 1; i <= S.N; i++) {
      coords.push([x, y]);
      if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) { const t = dx; dx = -dy; dy = t; }
      x += dx; y += dy;
    }
  }
  function reset() {
    buildPrimes(); buildUlam();
    status = new Array(S.N + 1).fill(0); scan = 2; curP = null; mult = 2; sieveDone = false;
    reveal = 1;
    redraw();
  }

  function sieveStep() {
    if (sieveDone) return;
    if (curP === null) {
      while (scan <= S.N && status[scan] !== 0) scan++;
      if (scan > S.N) { sieveDone = true; return; }
      status[scan] = 1; curP = scan; mult = 2; scan++;
    } else {
      const m = curP * mult;
      if (m > S.N) { curP = null; }
      else { if (status[m] === 0) status[m] = 2; mult++; }
    }
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
    if (S.view === "sieve") drawSieve(); else drawUlam();
    updateReadouts();
  }

  function drawSieve() {
    const cols = Math.ceil(Math.sqrt(S.N)), rows = Math.ceil(S.N / cols);
    const cell = Math.min(W * 0.94 / cols, H * 0.94 / rows);
    const gw = cell * cols, gh = cell * rows, ox = (W - gw) / 2, oy = (H - gh) / 2;
    const acc = css("--accent"), line = css("--line"), ink = css("--ink-soft");
    const label = cell >= 17;
    ctx.font = Math.floor(cell * 0.42) + "px 'Space Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let i = 2; i <= S.N; i++) {
      const c = (i - 2) % cols, r = Math.floor((i - 2) / cols);
      const x = ox + c * cell, y = oy + r * cell, st = status[i];
      if (st === 1) { ctx.fillStyle = acc; ctx.globalAlpha = 1; }
      else if (st === 2) { ctx.fillStyle = line; ctx.globalAlpha = 0.5; }
      else { ctx.fillStyle = "transparent"; ctx.globalAlpha = 1; }
      if (st !== 0) { ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2); }
      else { ctx.strokeStyle = line; ctx.globalAlpha = 0.6; ctx.lineWidth = 1; ctx.strokeRect(x + 1, y + 1, cell - 2, cell - 2); }
      ctx.globalAlpha = 1;
      if (label) { ctx.fillStyle = st === 1 ? "#fff" : ink; ctx.globalAlpha = st === 2 ? 0.7 : 1; ctx.fillText(i, x + cell / 2, y + cell / 2 + 0.5); ctx.globalAlpha = 1; }
    }
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
    if (curP) { // surligne le premier courant
      const c = (curP - 2) % cols, r = Math.floor((curP - 2) / cols);
      ctx.strokeStyle = css("--ink"); ctx.lineWidth = 2; ctx.strokeRect(ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2);
    }
  }

  function drawUlam() {
    let mnx = 0, mxx = 0, mny = 0, mxy = 0;
    for (const c of coords) { if (c[0] < mnx) mnx = c[0]; if (c[0] > mxx) mxx = c[0]; if (c[1] < mny) mny = c[1]; if (c[1] > mxy) mxy = c[1]; }
    const span = Math.max(mxx - mnx, mxy - mny) + 1;
    const cell = Math.min(W, H) * 0.92 / span;
    const ox = W / 2 - ((mnx + mxx) / 2) * cell, oy = H / 2 - ((mny + mxy) / 2) * cell;
    const acc = css("--accent"), line = css("--line");
    const lim = Math.min(reveal, S.N);
    for (let i = 1; i <= lim; i++) {
      const [gx, gy] = coords[i - 1];
      const x = ox + gx * cell, y = oy + gy * cell;
      if (isP[i]) { ctx.fillStyle = acc; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, cell * 0.34), 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = line; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(x, y, Math.max(1, cell * 0.16), 0, TAU); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
  }

  function stats() {
    if (S.view === "sieve") {
      let c = 0, last = 0; for (let i = 2; i <= S.N; i++) if (status[i] === 1) { c++; last = i; }
      return { n: S.N, count: c, last };
    } else {
      const lim = Math.min(reveal, S.N); let c = 0, last = 0;
      for (let i = 2; i <= lim; i++) if (isP[i]) { c++; last = i; }
      return { n: lim, count: c, last };
    }
  }
  function updateReadouts() {
    const s = stats();
    document.getElementById("r-count").textContent = s.count;
    document.getElementById("r-last").textContent = s.last || "—";
    document.getElementById("k-count").textContent = s.count;
    document.getElementById("k-last").textContent = s.last || "—";
    document.getElementById("k-dens").textContent = s.n > 1 ? (s.count / s.n * 100).toFixed(1) + " %" : "—";
    document.getElementById("k-approx").textContent = s.n > 2 ? (1 / Math.log(s.n) * 100).toFixed(1) + " %" : "—";
  }

  function viewNote() {
    const el = document.getElementById("view-note");
    el.innerHTML = S.view === "sieve"
      ? Antsa.t("Le crible : on garde 2, on barre tous ses multiples, on passe au nombre suivant non barré, et on recommence. Ce qui survit est premier.",
                "The sieve: keep 2, cross out all its multiples, move to the next un-crossed number, and repeat. What survives is prime.")
      : Antsa.t("La spirale d’Ulam enroule les entiers et n’allume que les premiers. Mystère : ils s’alignent souvent sur des diagonales.",
                "Ulam’s spiral coils the integers and lights only the primes. Mystery: they often line up on diagonals.");
  }
  function setLegend() {
    const L = document.getElementById("legend"), u = Antsa.t;
    L.innerHTML = S.view === "sieve"
      ? '<span><i style="background:' + css("--accent") + '"></i>' + u("premier", "prime") + '</span><span><i style="background:' + css("--line") + '"></i>' + u("composé", "composite") + '</span>'
      : '<span><i style="background:' + css("--accent") + '"></i>' + u("premier", "prime") + '</span><span><i style="background:' + css("--line") + '"></i>' + u("composé", "composite") + '</span>';
  }

  /* ---------- contrôles ---------- */
  document.getElementById("views").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    S.view = b.dataset.v;
    document.querySelectorAll("#views button").forEach(x => x.classList.toggle("on", x === b));
    reset(); viewNote(); setLegend();
  });
  const sn = document.getElementById("s-n"), vn = document.getElementById("v-n");
  const updN = () => { S.N = parseInt(sn.value, 10); vn.textContent = S.N; reset(); };
  sn.addEventListener("input", updN); updN();
  const ssp = document.getElementById("s-speed"), vsp = document.getElementById("v-speed");
  const updSp = () => { S.speed = parseInt(ssp.value, 10); vsp.textContent = "×" + S.speed; };
  ssp.addEventListener("input", updSp); updSp();

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", () => {
    S.running = !S.running;
    btnPlay.dataset.fr = S.running ? "Pause" : "Reprendre"; btnPlay.dataset.en = S.running ? "Pause" : "Resume";
    btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.addEventListener("antsa:theme", redraw);
  document.addEventListener("antsa:lang", () => { updateReadouts(); viewNote(); setLegend(); });

  /* ---------- boucle ---------- */
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (S.running) {
      if (S.view === "sieve") { for (let i = 0; i < S.speed; i++) sieveStep(); }
      else { reveal = Math.min(S.N, reveal + S.speed); if (reveal >= S.N && reveal > S.N) reveal = 1; }
      redraw();
    }
  }

  reset(); viewNote(); setLegend();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
