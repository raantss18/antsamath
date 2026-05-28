/* Pendules simple / double / triple — RK4 */
(function () {
  Antsa.recordVisit("double-pendule");
  Antsa.initChrome();

  const cv  = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  const D2R = Math.PI / 180;

  /* ── paramètres ────────────────────────────────────── */
  const P = {
    mode: 2,
    L1: 1, L2: 1, L3: 0.8,
    m1: 1, m2: 1, m3: 1,
    g: 9.8, damp: 0, speed: 1,
    t1: 120, t2: 150, t3: 90,
    twin: false, running: true
  };

  let main = null, ghost = null, trail = [], gtrail = [];

  /* ── état ──────────────────────────────────────────── */
  function freshState() {
    return { a1: P.t1*D2R, a2: P.t2*D2R, a3: P.t3*D2R, w1: 0, w2: 0, w3: 0 };
  }
  function reset() {
    main  = freshState();
    ghost = P.twin ? { a1: main.a1+0.001, a2: main.a2, a3: main.a3, w1:0, w2:0, w3:0 } : null;
    trail = []; gtrail = [];
    setLegend();
  }
  function setLegend() {
    const L = document.getElementById("legend");
    let h = '<span><i style="background:'+css("--accent")+'"></i>'+Antsa.t("pendule","pendulum")+'</span>';
    if (P.twin) h += '<span><i style="background:#2E8BFF"></i>'+Antsa.t("jumeau","twin")+'</span>';
    L.innerHTML = h;
  }

  /* ── physique ──────────────────────────────────────── */
  function derivSimple(s) {
    return { a1: s.w1, a2: 0, a3: 0,
             w1: -(P.g/P.L1)*Math.sin(s.a1), w2: 0, w3: 0 };
  }

  function derivDouble(s) {
    const { L1, L2, m1, m2, g } = P;
    const d  = s.a1 - s.a2;
    const sd = Math.sin(d), cd = Math.cos(d);
    const den = 2*m1 + m2 - m2*Math.cos(2*s.a1 - 2*s.a2);
    const w1d = (-g*(2*m1+m2)*Math.sin(s.a1) - m2*g*Math.sin(s.a1-2*s.a2)
                 - 2*sd*m2*(s.w2*s.w2*L2 + s.w1*s.w1*L1*cd)) / (L1*den);
    const w2d = (2*sd*(s.w1*s.w1*L1*(m1+m2) + g*(m1+m2)*Math.cos(s.a1)
                 + s.w2*s.w2*L2*m2*cd)) / (L2*den);
    return { a1: s.w1, a2: s.w2, a3: 0, w1: w1d, w2: w2d, w3: 0 };
  }

  function derivTriple(s) {
    const { L1, L2, L3, m1, m2, m3, g } = P;
    const a1=s.a1, a2=s.a2, a3=s.a3, w1=s.w1, w2=s.w2, w3=s.w3;
    const M1=m1+m2+m3, M2=m2+m3;
    const c12=Math.cos(a1-a2), c13=Math.cos(a1-a3), c23=Math.cos(a2-a3);
    const s12=Math.sin(a1-a2), s13=Math.sin(a1-a3), s23=Math.sin(a2-a3);
    const A = [
      [M1*L1*L1,        M2*L1*L2*c12,   m3*L1*L3*c13],
      [M2*L1*L2*c12,    M2*L2*L2,        m3*L2*L3*c23],
      [m3*L1*L3*c13,    m3*L2*L3*c23,    m3*L3*L3    ]
    ];
    const b = [
      -M1*g*L1*Math.sin(a1) - M2*L1*L2*s12*w2*w2 - m3*L1*L3*s13*w3*w3,
      -M2*g*L2*Math.sin(a2) + M2*L1*L2*s12*w1*w1 - m3*L2*L3*s23*w3*w3,
      -m3*g*L3*Math.sin(a3) + m3*L1*L3*s13*w1*w1 + m3*L2*L3*s23*w2*w2
    ];
    function det3(m) {
      return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
            -m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
            +m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    }
    const D = det3(A);
    function col(j) { return A.map((row,i)=>row.map((v,k)=>k===j?b[i]:v)); }
    return { a1: w1, a2: w2, a3: w3,
             w1: det3(col(0))/D, w2: det3(col(1))/D, w3: det3(col(2))/D };
  }

  function deriv(s) {
    if (P.mode===1) return derivSimple(s);
    if (P.mode===2) return derivDouble(s);
    return derivTriple(s);
  }
  function addS(s, k, h) {
    return { a1:s.a1+k.a1*h, a2:s.a2+k.a2*h, a3:s.a3+k.a3*h,
             w1:s.w1+k.w1*h, w2:s.w2+k.w2*h, w3:s.w3+k.w3*h };
  }
  function step(s, h) {
    const k1=deriv(s), k2=deriv(addS(s,k1,h/2)),
          k3=deriv(addS(s,k2,h/2)), k4=deriv(addS(s,k3,h));
    s.a1 += h/6*(k1.a1+2*k2.a1+2*k3.a1+k4.a1);
    s.a2 += h/6*(k1.a2+2*k2.a2+2*k3.a2+k4.a2);
    s.a3 += h/6*(k1.a3+2*k2.a3+2*k3.a3+k4.a3);
    s.w1 += h/6*(k1.w1+2*k2.w1+2*k3.w1+k4.w1);
    s.w2 += h/6*(k1.w2+2*k2.w2+2*k3.w2+k4.w2);
    s.w3 += h/6*(k1.w3+2*k2.w3+2*k3.w3+k4.w3);
    if (P.damp>0) { const f=1-P.damp/100*0.02; s.w1*=f; s.w2*=f; s.w3*=f; }
  }

  /* ── énergie ───────────────────────────────────────── */
  function energy(s) {
    const { L1, L2, L3, m1, m2, m3, g } = P;
    if (P.mode===1) {
      const KE = 0.5*m1*(L1*s.w1)*(L1*s.w1);
      const PE = m1*g*L1*(1-Math.cos(s.a1));
      return KE+PE;
    }
    if (P.mode===2) {
      const vx1=L1*s.w1*Math.cos(s.a1), vy1=L1*s.w1*Math.sin(s.a1);
      const vx2=vx1+L2*s.w2*Math.cos(s.a2), vy2=vy1+L2*s.w2*Math.sin(s.a2);
      const KE=0.5*m1*(vx1*vx1+vy1*vy1)+0.5*m2*(vx2*vx2+vy2*vy2);
      const PE=m1*g*L1*(1-Math.cos(s.a1))+m2*g*(L1*(1-Math.cos(s.a1))+L2*(1-Math.cos(s.a2)));
      return KE+PE;
    }
    const vx1=L1*s.w1*Math.cos(s.a1), vy1=L1*s.w1*Math.sin(s.a1);
    const vx2=vx1+L2*s.w2*Math.cos(s.a2), vy2=vy1+L2*s.w2*Math.sin(s.a2);
    const vx3=vx2+L3*s.w3*Math.cos(s.a3), vy3=vy2+L3*s.w3*Math.sin(s.a3);
    const KE=0.5*m1*(vx1*vx1+vy1*vy1)+0.5*m2*(vx2*vx2+vy2*vy2)+0.5*m3*(vx3*vx3+vy3*vy3);
    const PE=m1*g*L1*(1-Math.cos(s.a1))
            +m2*g*(L1*(1-Math.cos(s.a1))+L2*(1-Math.cos(s.a2)))
            +m3*g*(L1*(1-Math.cos(s.a1))+L2*(1-Math.cos(s.a2))+L3*(1-Math.cos(s.a3)));
    return KE+PE;
  }

  function period() {
    const L = P.L1 + (P.mode>1?P.L2:0) + (P.mode>2?P.L3:0);
    return 2*Math.PI*Math.sqrt(L/P.g);
  }

  /* ── canvas ────────────────────────────────────────── */
  let W=0, H=0, dpr=1;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width||!r.height) return;
    dpr = Math.min(2, window.devicePixelRatio||1);
    cv.width  = Math.round(r.width*dpr);
    cv.height = Math.round(r.height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    W = r.width; H = r.height;
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  /* pos() retourne toujours [px0,py0, x1,y1, x2,y2, x3,y3]
     en remplissant les segments manquants avec la dernière position */
  function pos(s) {
    const total = P.L1+(P.mode>1?P.L2:0)+(P.mode>2?P.L3:0);
    const scale = Math.min(W,H)*0.42/total;
    const px0=W/2, py0=H*0.34;
    const x1=px0+P.L1*scale*Math.sin(s.a1), y1=py0+P.L1*scale*Math.cos(s.a1);
    if (P.mode===1) return [px0,py0, x1,y1, x1,y1, x1,y1];
    const x2=x1+P.L2*scale*Math.sin(s.a2), y2=y1+P.L2*scale*Math.cos(s.a2);
    if (P.mode===2) return [px0,py0, x1,y1, x2,y2, x2,y2];
    const x3=x2+P.L3*scale*Math.sin(s.a3), y3=y2+P.L3*scale*Math.cos(s.a3);
    return [px0,py0, x1,y1, x2,y2, x3,y3];
  }

  function tip(s) { const p=pos(s); return [p[2+P.mode*2-2], p[3+P.mode*2-2]]; }

  function drawPendulum(s, color, tr, alpha) {
    const p = pos(s);
    const nSegs = P.mode; // 1, 2 ou 3 segments actifs

    /* traînée */
    if (tr.length>1) {
      ctx.lineWidth=2; ctx.lineCap="round";
      for (let i=1; i<tr.length; i++) {
        ctx.globalAlpha=(i/tr.length)*0.6*alpha;
        ctx.strokeStyle=color;
        ctx.beginPath(); ctx.moveTo(tr[i-1][0],tr[i-1][1]); ctx.lineTo(tr[i][0],tr[i][1]); ctx.stroke();
      }
    }

    ctx.globalAlpha=alpha;
    /* tiges */
    ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(p[0],p[1]);
    for (let i=1; i<=nSegs; i++) ctx.lineTo(p[i*2], p[i*2+1]);
    ctx.stroke();

    /* pivot fixe */
    ctx.fillStyle=color;
    ctx.beginPath(); ctx.arc(p[0],p[1],4,0,TAU); ctx.fill();

    /* bobs */
    const masses=[P.m1, P.m2, P.m3];
    for (let i=1; i<=nSegs; i++) {
      ctx.beginPath(); ctx.arc(p[i*2],p[i*2+1], 4+2*Math.sqrt(masses[i-1]),0,TAU); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  function render() {
    if (!W) return;
    ctx.fillStyle=css("--card"); ctx.fillRect(0,0,W,H);
    if (ghost) {
      const t=tip(ghost); gtrail.push(t); if (gtrail.length>220) gtrail.shift();
      drawPendulum(ghost,"#2E8BFF",gtrail,0.6);
    }
    const t=tip(main); trail.push(t); if (trail.length>260) trail.shift();
    drawPendulum(main,css("--accent"),trail,1);
  }

  /* ── readouts ──────────────────────────────────────── */
  function deg(a) { return ((a*180/Math.PI)%360+360)%360; }
  function updateReadouts() {
    document.getElementById("r-t1").textContent = Math.round(deg(main.a1))+"°";
    document.getElementById("r-w1").textContent = main.w1.toFixed(2)+" r/s";
    if (P.mode>1) {
      document.getElementById("r-t2").textContent = Math.round(deg(main.a2))+"°";
      document.getElementById("r-w2").textContent = main.w2.toFixed(2)+" r/s";
    }
    if (P.mode>2) {
      document.getElementById("r-t3").textContent = Math.round(deg(main.a3))+"°";
      document.getElementById("r-w3").textContent = main.w3.toFixed(2)+" r/s";
    }
    document.getElementById("r-e").textContent = energy(main).toFixed(2)+" J";
    document.getElementById("r-T").textContent = period().toFixed(2)+" s";
    const pill=document.getElementById("pill-gap");
    if (ghost) {
      pill.style.display="";
      const gap=Math.abs(main.a1-ghost.a1)+Math.abs(main.a2-ghost.a2)+Math.abs(main.a3-ghost.a3);
      document.getElementById("r-gap").textContent = gap.toFixed(3)+" rad";
    } else pill.style.display="none";
  }

  /* ── visibilité selon le mode ──────────────────────── */
  function show(id,v) { const el=document.getElementById(id); if(el) el.style.display=v?"":"none"; }
  function applyMode() {
    /* readout pills */
    show("pill-t2",  P.mode>1); show("pill-t3",  P.mode>2);
    show("pill-w2",  P.mode>1); show("pill-w3",  P.mode>2);
    /* sliders */
    show("row-t2",   P.mode>1); show("row-t3",   P.mode>2);
    show("row-l2",   P.mode>1); show("row-l3",   P.mode>2);
    show("row-m2",   P.mode>1); show("row-m3",   P.mode>2);
    /* blocs théorie */
    show("theory-1", P.mode===1);
    show("theory-2", P.mode===2);
    show("theory-3", P.mode===3);
    /* boutons de mode */
    document.querySelectorAll(".mode-btn").forEach(b =>
      b.classList.toggle("active", parseInt(b.dataset.mode)===P.mode));
    reset();
  }

  /* ── contrôles ─────────────────────────────────────── */
  function bind(id, valId, key, fmt) {
    const s=document.getElementById(id), v=document.getElementById(valId);
    if (!s||!v) return;
    const upd=()=>{ P[key]=parseFloat(s.value); v.textContent=fmt(parseFloat(s.value)); };
    s.addEventListener("input", upd); upd();
  }
  function bindAngle(id, valId, key) {
    const s=document.getElementById(id), v=document.getElementById(valId);
    if (!s||!v) return;
    const upd=()=>{ P[key]=parseFloat(s.value); v.textContent=Math.round(P[key])+"°"; reset(); };
    s.addEventListener("input", upd); upd();
  }

  bindAngle("s-t1","v-t1","t1");
  bindAngle("s-t2","v-t2","t2");
  bindAngle("s-t3","v-t3","t3");
  bind("s-l1","v-l1","L1", x=>x.toFixed(2));
  bind("s-l2","v-l2","L2", x=>x.toFixed(2));
  bind("s-l3","v-l3","L3", x=>x.toFixed(2));
  bind("s-m1","v-m1","m1", x=>x.toFixed(1));
  bind("s-m2","v-m2","m2", x=>x.toFixed(1));
  bind("s-m3","v-m3","m3", x=>x.toFixed(1));
  bind("s-g","v-g","g",    x=>x.toFixed(1));
  bind("s-damp","v-damp","damp", x=>Math.round(x)+"%");
  bind("s-speed","v-speed","speed", x=>x.toFixed(2)+"×");

  document.querySelectorAll(".mode-btn").forEach(btn =>
    btn.addEventListener("click", () => { P.mode=parseInt(btn.dataset.mode); applyMode(); }));

  document.getElementById("twin").addEventListener("change", e=>{ P.twin=e.target.checked; reset(); });

  const btnPlay=document.getElementById("btn-play");
  btnPlay.addEventListener("click", ()=>{
    P.running=!P.running;
    btnPlay.dataset.fr=P.running?"Pause":"Reprendre";
    btnPlay.dataset.en=P.running?"Pause":"Resume";
    btnPlay.textContent=Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
  });
  document.getElementById("btn-reset").addEventListener("click", reset);
  document.addEventListener("antsa:theme", ()=>{ setLegend(); render(); });
  document.addEventListener("antsa:lang", setLegend);

  /* ── boucle ────────────────────────────────────────── */
  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (P.running) {
      const h=0.012*P.speed;
      for (let i=0; i<8; i++) { step(main,h); if (ghost) step(ghost,h); }
      updateReadouts();
    }
    render();
  }

  applyMode();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
