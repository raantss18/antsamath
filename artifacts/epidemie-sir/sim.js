/* Épidémie — modèles SIR / SIRS / SEIR — agents + courbe temporelle */
(function () {
  Antsa.recordVisit("epidemie-sir");
  Antsa.initChrome();

  const cv    = document.getElementById("cv");
  const ctx   = cv.getContext("2d");
  const chart = document.getElementById("chart");
  const cctx  = chart.getContext("2d");
  const TAU   = Math.PI * 2;

  const COL = { S:"#4F8DF7", E:"#F5A623", I:"#D32C6D", R:"#7E8898", D:"#444" };
  const RAD = 0.038; // rayon de contact normalisé

  /* ── paramètres ─────────────────────────────── */
  const P = {
    mode: "SIR",
    N: 220, beta: 0.3, gamma: 0.03,
    xi: 0.01,    // SIRS : taux perte d'immunité
    sigma: 0.2,  // SEIR : taux incubation
    mu: 0,       // mortalité
    mob: 0.6, vax: 0, speed: 1,
    running: true
  };

  let agents = [], hist = [], peak = 0, everInf = 0, day = 0;
  let prevI = 0; // pour dI/dt

  /* ── états : 0=S 1=E 2=I 3=R 4=D ───────────── */
  function reset() {
    agents = []; hist = []; peak = 0; everInf = 0; day = 0; prevI = 0;
    const nVax = Math.round(P.N * P.vax / 100);
    const nInf = Math.min(3, P.N - nVax);
    for (let i = 0; i < P.N; i++) {
      const ang = Math.random() * TAU;
      agents.push({ x: Math.random(), y: Math.random(),
                    vx: Math.cos(ang), vy: Math.sin(ang),
                    st: 0, t: 0 });
    }
    for (let i = 0; i < nVax; i++) agents[i].st = 3;
    for (let i = nVax; i < nVax + nInf; i++) { agents[i].st = 2; everInf++; }
    setLegend();
  }

  function counts() {
    let s=0, e=0, inf=0, r=0, d=0;
    for (const a of agents) {
      if      (a.st===0) s++;
      else if (a.st===1) e++;
      else if (a.st===2) inf++;
      else if (a.st===3) r++;
      else if (a.st===4) d++;
    }
    return { s, e, i:inf, r, d };
  }

  /* ── simulation agents ──────────────────────── */
  function stepSim() {
    const sp = 0.005 * P.mob;

    /* mouvement */
    for (const a of agents) {
      if (a.st === 4) continue; // morts immobiles
      a.x += a.vx * sp; a.y += a.vy * sp;
      if (a.x < 0) { a.x = 0; a.vx *= -1; }
      if (a.x > 1) { a.x = 1; a.vx *= -1; }
      if (a.y < 0) { a.y = 0; a.vy *= -1; }
      if (a.y > 1) { a.y = 1; a.vy *= -1; }
      if (Math.random() < 0.02) {
        const ang = Math.random() * TAU; a.vx = Math.cos(ang); a.vy = Math.sin(ang);
      }
    }

    /* contagion : I → contamine S */
    for (let i = 0; i < agents.length; i++) {
      if (agents[i].st !== 2) continue;
      for (let j = 0; j < agents.length; j++) {
        if (agents[j].st !== 0) continue;
        const dx = agents[i].x - agents[j].x, dy = agents[i].y - agents[j].y;
        if (dx*dx + dy*dy < RAD*RAD && Math.random() < P.beta) {
          /* SEIR : S → E ; SIR/SIRS : S → I */
          agents[j].st = (P.mode === "SEIR") ? 1 : 2;
          agents[j].t  = 0;
          everInf++;
        }
      }
    }

    /* transitions individuelles */
    for (const a of agents) {
      if (a.st === 1) {
        /* E → I (SEIR) */
        a.t++;
        if (Math.random() < P.sigma) a.st = 2;
      } else if (a.st === 2) {
        /* I → R ou D */
        a.t++;
        if (P.mu > 0 && Math.random() < P.mu) {
          a.st = 4;
        } else if (Math.random() < P.gamma) {
          a.st = 3;
        }
      } else if (a.st === 3 && P.mode === "SIRS") {
        /* R → S (perte d'immunité) */
        if (Math.random() < P.xi) a.st = 0;
      }
    }

    const c = counts();
    if (c.i > peak) peak = c.i;
    hist.push({ s:c.s, e:c.e, i:c.i, r:c.r, d:c.d });
    if (hist.length > 600) hist.shift();
    day++;
  }

  /* ── légende ────────────────────────────────── */
  function setLegend() {
    const L = document.getElementById("legend");
    let h = '<span><i style="background:'+COL.S+'"></i>S</span>';
    if (P.mode === "SEIR") h += '<span><i style="background:'+COL.E+'"></i>E</span>';
    h += '<span><i style="background:'+COL.I+'"></i>I</span>';
    h += '<span><i style="background:'+COL.R+'"></i>R</span>';
    if (P.mu > 0) h += '<span><i style="background:'+COL.D+'"></i>D</span>';
    L.innerHTML = h;
  }

  /* ── visibilité selon le mode ───────────────── */
  function show(id, v) { const el=document.getElementById(id); if(el) el.style.display=v?"":"none"; }
  function applyMode() {
    show("row-xi",    P.mode==="SIRS");
    show("row-sigma", P.mode==="SEIR");
    show("pill-e",    P.mode==="SEIR");
    show("pill-d",    P.mu > 0);
    show("theory-SIR",  P.mode==="SIR");
    show("theory-SIRS", P.mode==="SIRS");
    show("theory-SEIR", P.mode==="SEIR");
    document.querySelectorAll(".mode-btn").forEach(b =>
      b.classList.toggle("active", b.dataset.mode === P.mode));
    reset();
  }

  /* ── canvas agents ──────────────────────────── */
  let W=0, H=0, dpr=1, size=0, ox=0, oy=0;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width||!r.height) return;
    dpr = Math.min(2, window.devicePixelRatio||1);
    cv.width  = Math.round(r.width*dpr);
    cv.height = Math.round(r.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W = r.width; H = r.height;
    size = Math.min(W,H)*0.94; ox=(W-size)/2; oy=(H-size)/2;
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function renderAgents() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0,0,W,H);
    ctx.strokeStyle = css("--line"); ctx.lineWidth=1; ctx.strokeRect(ox,oy,size,size);
    for (const a of agents) {
      if      (a.st===0) ctx.fillStyle = COL.S;
      else if (a.st===1) ctx.fillStyle = COL.E;
      else if (a.st===2) ctx.fillStyle = COL.I;
      else if (a.st===3) ctx.fillStyle = COL.R;
      else               ctx.fillStyle = COL.D;
      ctx.globalAlpha = (a.st===2) ? 1 : (a.st===4) ? 0.4 : 0.85;
      ctx.beginPath();
      ctx.arc(ox+a.x*size, oy+a.y*size, a.st===2 ? 3.4 : a.st===4 ? 2 : 2.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ── canvas courbe ──────────────────────────── */
  let cw=0, ch=0;
  function fitChart() {
    const r = chart.getBoundingClientRect();
    if (!r.width||!r.height) return;
    chart.width  = Math.round(r.width*dpr);
    chart.height = Math.round(r.height*dpr);
    cctx.setTransform(dpr,0,0,dpr,0,0);
    cw = r.width; ch = r.height;
  }
  function drawLine(key, color) {
    cctx.strokeStyle=color; cctx.lineWidth=2; cctx.beginPath();
    const n=hist.length;
    for (let i=0; i<n; i++) {
      const x = n<=1 ? 0 : i/(n-1)*cw;
      const y = ch - (hist[i][key]/P.N)*(ch-4) - 2;
      i ? cctx.lineTo(x,y) : cctx.moveTo(x,y);
    }
    cctx.stroke();
  }
  function renderChart() {
    cctx.clearRect(0,0,cw,ch);
    if (hist.length < 2) return;
    /* aire I */
    cctx.fillStyle = COL.I+"26"; cctx.beginPath(); cctx.moveTo(0,ch);
    const n=hist.length;
    for (let i=0; i<n; i++) cctx.lineTo(i/(n-1)*cw, ch-(hist[i].i/P.N)*(ch-4)-2);
    cctx.lineTo(cw,ch); cctx.closePath(); cctx.fill();
    drawLine("s", COL.S);
    if (P.mode==="SEIR") drawLine("e", COL.E);
    drawLine("r", COL.R);
    if (P.mu>0) drawLine("d", COL.D);
    drawLine("i", COL.I);
  }

  /* ── readouts ───────────────────────────────── */
  function updateReadouts() {
    const c = counts();
    document.getElementById("r-s").textContent = c.s;
    document.getElementById("r-e").textContent = c.e;
    document.getElementById("r-i").textContent = c.i;
    document.getElementById("r-r").textContent = c.r;
    document.getElementById("r-d").textContent = c.d;
    document.getElementById("r-day").textContent = day;
    const didt = c.i - prevI; prevI = c.i;
    document.getElementById("r-didt").textContent = (didt >= 0 ? "+" : "") + didt;
    show("pill-d", P.mu > 0);

    const r0 = P.beta / P.gamma;
    document.getElementById("r-r0").textContent   = r0.toFixed(1);
    document.getElementById("r-thr").textContent  = r0>1 ? Math.round((1-1/r0)*100)+"%" : "—";
    document.getElementById("r-peak").textContent = peak;
    document.getElementById("r-tot").textContent  = Math.round(everInf/P.N*100)+"%";
  }

  /* ── contrôles ──────────────────────────────── */
  function bind(id, valId, key, fmt, doReset) {
    const s=document.getElementById(id), v=document.getElementById(valId);
    if (!s||!v) return;
    const upd=()=>{
      P[key]=parseFloat(s.value);
      v.textContent=fmt(P[key]);
      if (key==="mu") { setLegend(); show("pill-d", P.mu>0); }
      updateReadouts();
      if (doReset) reset();
    };
    s.addEventListener("input", upd); upd();
  }

  bind("s-n",     "v-n",     "N",     x=>Math.round(x),         true);
  bind("s-beta",  "v-beta",  "beta",  x=>x.toFixed(2),          false);
  bind("s-gamma", "v-gamma", "gamma", x=>x.toFixed(3),          false);
  bind("s-xi",    "v-xi",    "xi",    x=>x.toFixed(3),          false);
  bind("s-sigma", "v-sigma", "sigma", x=>x.toFixed(2),          false);
  bind("s-mu",    "v-mu",    "mu",    x=>(x*100).toFixed(1)+"%", false);
  bind("s-mob",   "v-mob",   "mob",   x=>Math.round(x)+"%",     false);
  bind("s-vax",   "v-vax",   "vax",   x=>Math.round(x)+"%",     true);
  bind("s-speed", "v-speed", "speed", x=>Math.round(x)+"×",     false);

  document.querySelectorAll(".mode-btn").forEach(btn =>
    btn.addEventListener("click", ()=>{ P.mode=btn.dataset.mode; applyMode(); }));

  const btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", ()=>{
    P.running=!P.running;
    btnPlay.dataset.fr = P.running?"Pause":"Reprendre";
    btnPlay.dataset.en = P.running?"Pause":"Resume";
    btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.addEventListener("antsa:theme", ()=>{ renderAgents(); renderChart(); });
  document.addEventListener("antsa:lang", ()=>{ setLegend(); updateReadouts(); });

  /* ── boucle ─────────────────────────────────── */
  let frame=0;
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (P.running) {
      for (let k=0; k<P.speed; k++) stepSim();
      frame++;
      if (frame%2===0) updateReadouts();
    }
    renderAgents();
    renderChart();
  }

  applyMode(); // initialise visibilité + reset
  updateReadouts();
  new ResizeObserver(()=>{ fit(); fitChart(); }).observe(cv);
  fit(); fitChart();
  requestAnimationFrame(loop);
})();
