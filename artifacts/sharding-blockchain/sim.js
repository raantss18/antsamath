/* Sharding blockchain — débit parallèle vs sécurité. */
(function () {
  Antsa.recordVisit("sharding-blockchain");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  const CAP = 28;        // capacité d'un shard (tx/s)
  const QMAX = 60;       // hauteur visuelle max de file
  const CROSSCOL = "#FF9F1C";

  const P = { K: 4, nodes: 64, load: 160, cross: 15, running: true };
  let q = [], procAcc = [], parts = [], arrAcc = 0;
  let unitRing = new Array(60).fill(0), ringi = 0;

  function reset() {
    q = new Array(P.K).fill(0); procAcc = new Array(P.K).fill(0);
    parts = []; arrAcc = 0; unitRing.fill(0);
  }

  let W = 0, H = 0, dpr = 1;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function landY() { return H * 0.7; }

  function stepSim() {
    const dt = 1 / 60, c = P.cross / 100;
    // arrivées
    arrAcc += P.load * dt;
    while (arrAcc >= 1 && parts.length < 600) {
      arrAcc--;
      const k = Math.floor(Math.random() * P.K);
      const isCross = Math.random() < c && P.K > 1;
      let k2 = -1; if (isCross) { do { k2 = Math.floor(Math.random() * P.K); } while (k2 === k); }
      parts.push({ k, k2, cross: isCross, x: 0, y: -8, vy: 4 + Math.random() * 2, landed: false });
    }
    // chute des transactions
    const ly = landY();
    for (const p of parts) {
      if (p.landed) continue;
      p.y += p.vy;
      if (p.y >= ly - barH(q[p.k])) { p.landed = true; q[p.k]++; if (p.cross && p.k2 >= 0) q[p.k2]++; }
    }
    parts = parts.filter(p => !p.landed);
    // traitement (chaque shard confirme jusqu'à CAP*dt unités)
    let units = 0;
    for (let k = 0; k < P.K; k++) {
      procAcc[k] += CAP * dt;
      while (procAcc[k] >= 1 && q[k] > 0) { q[k]--; procAcc[k]--; units++; }
    }
    unitRing[ringi] = units; ringi = (ringi + 1) % unitRing.length;
  }

  function barH(qk) { return Math.min(qk, QMAX) / QMAX * (H * 0.42); }

  function metrics() {
    const c = P.cross / 100;
    const unitsPerSec = unitRing.reduce((a, b) => a + b, 0); // somme sur ~1s
    const tps = unitsPerSec / (1 + c);
    const mono = Math.min(P.load, CAP);
    const backlog = q.reduce((a, b) => a + b, 0);
    const nps = Math.floor(P.nodes / P.K);
    return { tps, mono, speed: mono > 0 ? tps / mono : 0, backlog, nps };
  }

  function render() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    const acc = css("--accent"), line = css("--line"), ink = css("--ink-soft");
    const colW = W / P.K, ly = landY();
    ctx.strokeStyle = line; ctx.globalAlpha = 0.6; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, ly + 1); ctx.lineTo(W, ly + 1); ctx.stroke(); ctx.globalAlpha = 1;
    const nps = Math.floor(P.nodes / P.K);
    ctx.font = "12px 'Space Mono', monospace"; ctx.textAlign = "center";
    for (let k = 0; k < P.K; k++) {
      const cx = (k + 0.5) * colW;
      if (k > 0) { ctx.strokeStyle = line; ctx.globalAlpha = 0.4; ctx.beginPath(); ctx.moveTo(k * colW, H * 0.12); ctx.lineTo(k * colW, ly); ctx.stroke(); ctx.globalAlpha = 1; }
      // file (mempool)
      const bh = barH(q[k]);
      ctx.fillStyle = acc; ctx.globalAlpha = 0.22; ctx.fillRect(cx - colW * 0.32, ly - bh, colW * 0.64, bh); ctx.globalAlpha = 1;
      // étiquette file
      ctx.fillStyle = ink; ctx.fillText(q[k] + (q[k] > QMAX ? "" : ""), cx, ly - bh - 8);
      // shard label
      ctx.fillStyle = ink; ctx.globalAlpha = 0.8; ctx.fillText("S" + (k + 1), cx, H * 0.1); ctx.globalAlpha = 1;
      // cluster de nœuds
      const show = Math.min(nps, 16);
      ctx.fillStyle = acc;
      for (let i = 0; i < show; i++) {
        const ang = i / show * TAU, rr = 12 + (i % 3) * 7;
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(cx + Math.cos(ang) * rr, H * 0.85 + Math.sin(ang) * rr * 0.7, 2.6, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = ink;
      ctx.fillText(nps + (Antsa.getLang() === "fr" ? " nœuds" : " nodes"), cx, H * 0.97);
    }
    // transactions en chute
    for (const p of parts) {
      const cx = (p.k + 0.5) * colW;
      p.x = cx;
      ctx.fillStyle = p.cross ? CROSSCOL : acc; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(cx, p.y, 3, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.textAlign = "start";
  }

  function updateReadouts() {
    const m = metrics();
    document.getElementById("r-tps").textContent = Math.round(m.tps);
    document.getElementById("r-back").textContent = m.backlog;
    document.getElementById("k-tps").textContent = Math.round(m.tps) + " TPS";
    document.getElementById("k-mono").textContent = Math.round(m.mono) + " TPS";
    document.getElementById("k-speed").textContent = "×" + m.speed.toFixed(1);
    document.getElementById("k-nps").textContent = m.nps;
    document.getElementById("k-sec").textContent = P.K > 0 ? (100 / (2 * P.K)).toFixed(1) + " %" : "—";
  }

  function setLegend() {
    const L = document.getElementById("legend"), u = Antsa.t;
    L.innerHTML = '<span><i style="background:' + css("--accent") + '"></i>' + u("tx interne", "intra-shard tx") + '</span>'
      + '<span><i style="background:' + CROSSCOL + '"></i>' + u("tx inter-shards", "cross-shard tx") + '</span>';
  }

  /* ---------- contrôles ---------- */
  function bind(id, valId, key, fmt, doReset) {
    const s = document.getElementById(id), v = document.getElementById(valId);
    const upd = () => { P[key] = parseInt(s.value, 10); v.textContent = fmt(P[key]); if (doReset) reset(); };
    s.addEventListener("input", upd); upd();
  }
  bind("s-k", "v-k", "K", x => x, true);
  bind("s-nodes", "v-nodes", "nodes", x => x, false);
  bind("s-load", "v-load", "load", x => x, false);
  bind("s-cross", "v-cross", "cross", x => x + "%", false);

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", () => {
    P.running = !P.running;
    btnPlay.dataset.fr = P.running ? "Pause" : "Reprendre"; btnPlay.dataset.en = P.running ? "Pause" : "Resume";
    btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.addEventListener("antsa:theme", render);
  document.addEventListener("antsa:lang", () => { updateReadouts(); setLegend(); });

  /* ---------- boucle ---------- */
  let fr = 0;
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (P.running) { stepSim(); fr++; if (fr % 4 === 0) updateReadouts(); }
    render();
  }

  reset(); setLegend(); updateReadouts();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
