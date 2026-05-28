/* Pendules — simple, double, triple — intégration RK4 */
(function () {
  Antsa.recordVisit("double-pendule");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  const D2R = Math.PI / 180;

  /* ── état global ─────────────────────────────────── */
  const P = {
    mode: 2,          // 1 = simple, 2 = double, 3 = triple
    L1: 1, L2: 1, L3: 0.8,
    m1: 1, m2: 1, m3: 1,
    g: 9.8,
    damp: 0,
    t1: 120, t2: 150, t3: 90,
    twin: false,
    running: true,
    speed: 1.0        // multiplicateur vitesse (0.1 – 3)
  };

  let main = null, ghost = null;
  let trail = [], gtrail = [];

  /* ── état initial ─────────────────────────────────── */
  function freshState() {
    return { a1: P.t1 * D2R, a2: P.t2 * D2R, a3: P.t3 * D2R, w1: 0, w2: 0, w3: 0 };
  }
  function reset() {
    main = freshState();
    ghost = P.twin
      ? { a1: main.a1 + 0.001, a2: main.a2, a3: main.a3, w1: 0, w2: 0, w3: 0 }
      : null;
    trail = []; gtrail = [];
    setLegend();
  }
  function setLegend() {
    const L = document.getElementById("legend");
    let h = '<span><i style="background:' + css("--accent") + '"></i>' + Antsa.t("pendule", "pendulum") + '</span>';
    if (P.twin) h += '<span><i style="background:#2E8BFF"></i>' + Antsa.t("jumeau", "twin") + '</span>';
    L.innerHTML = h;
  }

  /* ── physique ─────────────────────────────────────── */

  // SIMPLE : dérivées (θ, ω)
  function derivSimple(s) {
    const a1d = s.w1;
    const w1d = -(P.g / P.L1) * Math.sin(s.a1);
    return { a1: a1d, a2: 0, a3: 0, w1: w1d, w2: 0, w3: 0 };
  }

  // DOUBLE : équations de Lagrange classiques
  function derivDouble(s) {
    const { L1, L2, m1, m2, g } = P;
    const d = s.a1 - s.a2;
    const sd = Math.sin(d), cd = Math.cos(d);
    const den = 2 * m1 + m2 - m2 * Math.cos(2 * s.a1 - 2 * s.a2);
    const w1d = (-g * (2 * m1 + m2) * Math.sin(s.a1)
      - m2 * g * Math.sin(s.a1 - 2 * s.a2)
      - 2 * sd * m2 * (s.w2 * s.w2 * L2 + s.w1 * s.w1 * L1 * cd))
      / (L1 * den);
    const w2d = (2 * sd * (s.w1 * s.w1 * L1 * (m1 + m2)
      + g * (m1 + m2) * Math.cos(s.a1)
      + s.w2 * s.w2 * L2 * m2 * cd))
      / (L2 * den);
    return { a1: s.w1, a2: s.w2, a3: 0, w1: w1d, w2: w2d, w3: 0 };
  }

  // TRIPLE : formulation Lagrangienne numérique (matrice 3×3 résolue par Cramer)
  function derivTriple(s) {
    const { L1, L2, L3, m1, m2, m3, g } = P;
    const a1 = s.a1, a2 = s.a2, a3 = s.a3;
    const w1 = s.w1, w2 = s.w2, w3 = s.w3;
    const M1 = m1 + m2 + m3, M2 = m2 + m3;

    const c12 = Math.cos(a1 - a2), c13 = Math.cos(a1 - a3), c23 = Math.cos(a2 - a3);
    const s12 = Math.sin(a1 - a2), s13 = Math.sin(a1 - a3), s23 = Math.sin(a2 - a3);

    // Matrice de masse (symétrique)
    const A = [
      [M1 * L1 * L1,       M2 * L1 * L2 * c12,  m3 * L1 * L3 * c13],
      [M2 * L1 * L2 * c12, M2 * L2 * L2,         m3 * L2 * L3 * c23],
      [m3 * L1 * L3 * c13, m3 * L2 * L3 * c23,   m3 * L3 * L3      ]
    ];
    // Vecteur RHS
    const b = [
      -M1 * g * L1 * Math.sin(a1)
        - M2 * L1 * L2 * s12 * w2 * w2
        - m3 * L1 * L3 * s13 * w3 * w3,
      -M2 * g * L2 * Math.sin(a2)
        + M2 * L1 * L2 * s12 * w1 * w1
        - m3 * L2 * L3 * s23 * w3 * w3,
      -m3 * g * L3 * Math.sin(a3)
        + m3 * L1 * L3 * s13 * w1 * w1
        + m3 * L2 * L3 * s23 * w2 * w2
    ];
    // Résolution par Cramer 3×3
    function det3(m) {
      return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
           - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
           + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    }
    const D = det3(A);
    function col(j) {
      return A.map((row, i) => row.map((v, k) => k === j ? b[i] : v));
    }
    const aw1 = det3(col(0)) / D;
    const aw2 = det3(col(1)) / D;
    const aw3 = det3(col(2)) / D;
    return { a1: w1, a2: w2, a3: w3, w1: aw1, w2: aw2, w3: aw3 };
  }

  function deriv(s) {
    if (P.mode === 1) return derivSimple(s);
    if (P.mode === 2) return derivDouble(s);
    return derivTriple(s);
  }

  function addS(s, k, h) {
    return {
      a1: s.a1 + k.a1 * h, a2: s.a2 + k.a2 * h, a3: s.a3 + k.a3 * h,
      w1: s.w1 + k.w1 * h, w2: s.w2 + k.w2 * h, w3: s.w3 + k.w3 * h
    };
  }
  function step(s, h) {
    const k1 = deriv(s);
    const k2 = deriv(addS(s, k1, h / 2));
    const k3 = deriv(addS(s, k2, h / 2));
    const k4 = deriv(addS(s, k3, h));
    s.a1 += h / 6 * (k1.a1 + 2 * k2.a1 + 2 * k3.a1 + k4.a1);
    s.a2 += h / 6 * (k1.a2 + 2 * k2.a2 + 2 * k3.a2 + k4.a2);
    s.a3 += h / 6 * (k1.a3 + 2 * k2.a3 + 2 * k3.a3 + k4.a3);
    s.w1 += h / 6 * (k1.w1 + 2 * k2.w1 + 2 * k3.w1 + k4.w1);
    s.w2 += h / 6 * (k1.w2 + 2 * k2.w2 + 2 * k3.w2 + k4.w2);
    s.w3 += h / 6 * (k1.w3 + 2 * k2.w3 + 2 * k3.w3 + k4.w3);
    if (P.damp > 0) {
      const f = 1 - P.damp / 100 * 0.02;
      s.w1 *= f; s.w2 *= f; s.w3 *= f;
    }
  }

  /* ── énergie ──────────────────────────────────────── */
  function energy(s) {
    const { L1, L2, L3, m1, m2, m3, g } = P;
    if (P.mode === 1) {
      const y1 = -L1 * Math.cos(s.a1);
      const KE = 0.5 * m1 * (L1 * s.w1) * (L1 * s.w1);
      const PE = m1 * g * (y1 + L1);
      return KE + PE;
    }
    if (P.mode === 2) {
      const x1 = L1 * Math.sin(s.a1), y1 = -L1 * Math.cos(s.a1);
      const x2 = x1 + L2 * Math.sin(s.a2), y2 = y1 - L2 * Math.cos(s.a2);
      const vx1 = L1 * s.w1 * Math.cos(s.a1), vy1 = L1 * s.w1 * Math.sin(s.a1);
      const vx2 = vx1 + L2 * s.w2 * Math.cos(s.a2), vy2 = vy1 + L2 * s.w2 * Math.sin(s.a2);
      const KE = 0.5 * m1 * (vx1*vx1+vy1*vy1) + 0.5 * m2 * (vx2*vx2+vy2*vy2);
      const PE = m1 * g * (y1 + L1) + m2 * g * (y2 + L1 + L2);
      return KE + PE;
    }
    // triple
    const x1 = L1*Math.sin(s.a1), y1=-L1*Math.cos(s.a1);
    const x2 = x1+L2*Math.sin(s.a2), y2=y1-L2*Math.cos(s.a2);
    const x3 = x2+L3*Math.sin(s.a3), y3=y2-L3*Math.cos(s.a3);
    const vx1=L1*s.w1*Math.cos(s.a1), vy1=L1*s.w1*Math.sin(s.a1);
    const vx2=vx1+L2*s.w2*Math.cos(s.a2), vy2=vy1+L2*s.w2*Math.sin(s.a2);
    const vx3=vx2+L3*s.w3*Math.cos(s.a3), vy3=vy2+L3*s.w3*Math.sin(s.a3);
    const KE=0.5*m1*(vx1*vx1+vy1*vy1)+0.5*m2*(vx2*vx2+vy2*vy2)+0.5*m3*(vx3*vx3+vy3*vy3);
    const PE=m1*g*(y1+L1)+m2*g*(y2+L1+L2)+m3*g*(y3+L1+L2+L3);
    return KE + PE;
  }

  /* ── période estimée (petits angles, pendule simple équivalent) ── */
  function period() {
    return 2 * Math.PI * Math.sqrt((P.L1 + (P.mode > 1 ? P.L2 : 0) + (P.mode > 2 ? P.L3 : 0)) / P.g);
  }

  /* ── canvas / rendu ──────────────────────────────── */
  let W = 0, H = 0, dpr = 1;
  function fit() {
    const r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height;
  }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function getScale() {
    const total = P.L1 + (P.mode > 1 ? P.L2 : 0) + (P.mode > 2 ? P.L3 : 0);
    return Math.min(W, H) * 0.38 / total;
  }
  function pos(s) {
    const scale = getScale(), px0 = W / 2, py0 = H * 0.34;
    const x1 = px0 + P.L1 * scale * Math.sin(s.a1);
    const y1 = py0 + P.L1 * scale * Math.cos(s.a1);
    if (P.mode === 1) return [px0, py0, x1, y1];
    const x2 = x1 + P.L2 * scale * Math.sin(s.a2);
    const y2 = y1 + P.L2 * scale * Math.cos(s.a2);
    if (P.mode === 2) return [px0, py0, x1, y1, x2, y2];
    const x3 = x2 + P.L3 * scale * Math.sin(s.a3);
    const y3 = y2 + P.L3 * scale * Math.cos(s.a3);
    return [px0, py0, x1, y1, x2, y2, x3, y3];
  }

  function drawPendulum(s, color, tr, alpha) {
    const pts = pos(s);
    const tip = [pts[pts.length - 2], pts[pts.length - 1]];
    // traînée
    if (tr.length > 1) {
      ctx.lineWidth = 2; ctx.lineCap = "round";
      for (let i = 1; i < tr.length; i++) {
        ctx.globalAlpha = (i / tr.length) * 0.6 * alpha;
        ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(tr[i-1][0], tr[i-1][1]); ctx.lineTo(tr[i][0], tr[i][1]); ctx.stroke();
      }
    }
    ctx.globalAlpha = alpha;
    // tiges
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i+1]);
    ctx.stroke();
    // pivot fixe
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(pts[0], pts[1], 4, 0, TAU); ctx.fill();
    // bobs
    const masses = [P.m1, P.mode > 1 ? P.m2 : null, P.mode > 2 ? P.m3 : null].filter(Boolean);
    for (let i = 0; i < masses.length; i++) {
      const xi = pts[2 + i*2], yi = pts[3 + i*2];
      ctx.beginPath(); ctx.arc(xi, yi, 4 + 2 * Math.sqrt(masses[i]), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    return tip;
  }

  function render() {
    if (!W) return;
    ctx.fillStyle = css("--card"); ctx.fillRect(0, 0, W, H);
    if (ghost) {
      const tip = pos(ghost); const t = [tip[tip.length-2], tip[tip.length-1]];
      gtrail.push(t); if (gtrail.length > 220) gtrail.shift();
      drawPendulum(ghost, "#2E8BFF", gtrail, 0.6);
    }
    const tip = pos(main); const t = [tip[tip.length-2], tip[tip.length-1]];
    trail.push(t); if (trail.length > 260) trail.shift();
    drawPendulum(main, css("--accent"), trail, 1);
  }

  /* ── readouts ─────────────────────────────────────── */
  function deg(a) { return ((a * 180 / Math.PI) % 360 + 360) % 360; }
  function updateReadouts() {
    document.getElementById("r-t1").textContent = Math.round(deg(main.a1)) + "°";
    if (P.mode > 1) {
      const el2 = document.getElementById("r-t2"); if (el2) el2.textContent = Math.round(deg(main.a2)) + "°";
    }
    if (P.mode > 2) {
      const el3 = document.getElementById("r-t3"); if (el3) el3.textContent = Math.round(deg(main.a3)) + "°";
    }
    // vitesses
    const rw1 = document.getElementById("r-w1"); if (rw1) rw1.textContent = main.w1.toFixed(2) + " rad/s";
    if (P.mode > 1) { const rw2 = document.getElementById("r-w2"); if (rw2) rw2.textContent = main.w2.toFixed(2) + " rad/s"; }
    if (P.mode > 2) { const rw3 = document.getElementById("r-w3"); if (rw3) rw3.textContent = main.w3.toFixed(2) + " rad/s"; }
    // énergie
    const re = document.getElementById("r-e"); if (re) re.textContent = energy(main).toFixed(3) + " J";
    // période
    const rT = document.getElementById("r-T"); if (rT) rT.textContent = period().toFixed(3) + " s";
    // écart jumeau
    const pill = document.getElementById("pill-gap");
    if (ghost && pill) {
      pill.style.display = "";
      const gap = Math.abs(main.a1 - ghost.a1) + Math.abs(main.a2 - ghost.a2) + Math.abs(main.a3 - ghost.a3);
      const rg = document.getElementById("r-gap"); if (rg) rg.textContent = gap.toFixed(3) + " rad";
    } else if (pill) pill.style.display = "none";
  }

  /* ── panneau dynamique ───────────────────────────── */
  function buildPanel() {
    // Mise à jour visibilité θ₂, θ₃, ω₂, ω₃ dans les readouts
    setReadoutsVisibility();
    // Mise à jour panneau de paramètres
    updateParamPanel();
    // Mise à jour texte théorique
    updateTheoryBlock();
    // re-init
    reset();
  }

  function setReadoutsVisibility() {
    const show = (id, v) => { const el = document.getElementById(id); if (el) el.style.display = v ? "" : "none"; };
    show("pill-t2", P.mode > 1);
    show("pill-t3", P.mode > 2);
    show("pill-w2", P.mode > 1);
    show("pill-w3", P.mode > 2);
  }

  function updateParamPanel() {
    const container = document.getElementById("param-blocks");
    if (!container) return;
    container.innerHTML = "";

    function makeSlider(labelFr, labelEn, id, valId, min, max, step, value, onChange) {
      const div = document.createElement("div"); div.className = "ctrl";
      div.innerHTML = `<label><span data-fr="${labelFr}" data-en="${labelEn}">${labelFr}</span><span class="val" id="${valId}"></span></label>
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" />`;
      container.appendChild(div);
      const inp = div.querySelector("input");
      const val = div.querySelector(".val");
      inp.addEventListener("input", () => onChange(parseFloat(inp.value), val));
      onChange(parseFloat(inp.value), val);
    }

    // Angles initiaux
    const angles = [
      ["Angle θ₁ de départ","Starting angle θ₁","s-t1-dyn","v-t1-dyn",1],
    ];
    if (P.mode > 1) angles.push(["Angle θ₂ de départ","Starting angle θ₂","s-t2-dyn","v-t2-dyn",2]);
    if (P.mode > 2) angles.push(["Angle θ₃ de départ","Starting angle θ₃","s-t3-dyn","v-t3-dyn",3]);
    angles.forEach(([fr,en,id,vid,n]) => {
      makeSlider(fr,en,id,vid,0,180,1,P["t"+n],(v,el)=>{
        P["t"+n]=v; el.textContent=Math.round(v)+"°"; reset();
      });
    });

    // Longueurs
    makeSlider("Longueur L₁","Length L₁","s-l1-dyn","v-l1-dyn",0.5,1.5,0.05,P.L1,(v,el)=>{P.L1=v;el.textContent=v.toFixed(2);});
    if (P.mode > 1) makeSlider("Longueur L₂","Length L₂","s-l2-dyn","v-l2-dyn",0.5,1.5,0.05,P.L2,(v,el)=>{P.L2=v;el.textContent=v.toFixed(2);});
    if (P.mode > 2) makeSlider("Longueur L₃","Length L₃","s-l3-dyn","v-l3-dyn",0.3,1.2,0.05,P.L3,(v,el)=>{P.L3=v;el.textContent=v.toFixed(2);});

    // Masses
    makeSlider("Masse m₁","Mass m₁","s-m1-dyn","v-m1-dyn",0.5,3,0.1,P.m1,(v,el)=>{P.m1=v;el.textContent=v.toFixed(1);});
    if (P.mode > 1) makeSlider("Masse m₂","Mass m₂","s-m2-dyn","v-m2-dyn",0.5,3,0.1,P.m2,(v,el)=>{P.m2=v;el.textContent=v.toFixed(1);});
    if (P.mode > 2) makeSlider("Masse m₃","Mass m₃","s-m3-dyn","v-m3-dyn",0.5,3,0.1,P.m3,(v,el)=>{P.m3=v;el.textContent=v.toFixed(1);});

    // Gravité, frottement, vitesse (communs)
    makeSlider("Gravité g","Gravity g","s-g-dyn","v-g-dyn",1,20,0.1,P.g,(v,el)=>{P.g=v;el.textContent=v.toFixed(1);});
    makeSlider("Frottement","Friction","s-damp-dyn","v-damp-dyn",0,100,1,P.damp,(v,el)=>{P.damp=v;el.textContent=Math.round(v)+"%";});
    makeSlider("Vitesse de simulation","Simulation speed","s-speed-dyn","v-speed-dyn",0.05,3,0.05,P.speed,(v,el)=>{P.speed=v;el.textContent=v.toFixed(2)+"×";});

    // Mettre à jour les textes i18n fraîchement injectés
    if (window.Antsa && Antsa.applyLang) Antsa.applyLang();
  }

  function updateTheoryBlock() {
    const box = document.getElementById("theory-content");
    if (!box) return;
    const lang = document.documentElement.lang || "fr";
    const texts = {
      1: {
        fr: {
          p1: `Un <strong>pendule simple</strong> est une masse suspendue à un fil de longueur L, soumise à la gravité g.`,
          formula: `θ̈ = −(g/L) sin θ`,
          p2: `Pour les petits angles (sin θ ≈ θ), le mouvement est <strong>harmonique</strong> et la période T = 2π√(L/g) ne dépend pas de la masse. Aux grands angles, le mouvement est <strong>non linéaire</strong> mais reste régulier (non chaotique).`,
          tip: `<b>Essaie :</b> change L ou g et observe comment la période varie. Active le jumeau : les deux resteront presque parfaitement synchrones.`
        },
        en: {
          p1: `A <strong>simple pendulum</strong> is a mass suspended from a string of length L, subject to gravity g.`,
          formula: `θ̈ = −(g/L) sin θ`,
          p2: `For small angles (sin θ ≈ θ) the motion is <strong>harmonic</strong> and the period T = 2π√(L/g) is independent of mass. For large angles, motion is <strong>non-linear</strong> but still regular (not chaotic).`,
          tip: `<b>Try it:</b> change L or g and watch how the period changes. Turn on the twin: both pendulums will stay nearly in sync.`
        }
      },
      2: {
        fr: {
          p1: `Un <strong>double pendule</strong> = un pendule accroché au bout d'un autre. Ses équations (issues de la mécanique de Lagrange) sont parfaitement <strong>déterministes</strong>.`,
          formula: `θ̈₁ = f₁(θ₁, θ₂, θ̇₁, θ̇₂)<br>θ̈₂ = f₂(θ₁, θ₂, θ̇₁, θ̇₂)`,
          p2: `Mais ce système est <strong>chaotique</strong> : un écart minuscule sur les conditions initiales enfle de façon exponentielle. C'est la <strong>sensibilité aux conditions initiales</strong> — l'« effet papillon ».`,
          tip: `<b>Essaie :</b> active le pendule jumeau. Les deux partent quasi identiques… puis divergent complètement. Sans frottement, l'<strong>énergie</strong> se conserve.`
        },
        en: {
          p1: `A <strong>double pendulum</strong> = a pendulum hanging from another. Its equations of motion (from Lagrange's mechanics) are perfectly <strong>deterministic</strong>.`,
          formula: `θ̈₁ = f₁(θ₁, θ₂, θ̇₁, θ̇₂)<br>θ̈₂ = f₂(θ₁, θ₂, θ̇₁, θ̇₂)`,
          p2: `But this system is <strong>chaotic</strong>: a tiny change in initial conditions grows exponentially. This is <strong>sensitivity to initial conditions</strong> — the "butterfly effect."`,
          tip: `<b>Try it:</b> turn on the twin pendulum. The two start almost identical… then diverge completely. With no friction, <strong>energy</strong> is conserved.`
        }
      },
      3: {
        fr: {
          p1: `Un <strong>triple pendule</strong> ajoute un troisième bras. Le système possède 3 degrés de liberté couplés et devient <strong>hyperchaotique</strong>.`,
          formula: `θ̈₁ = f₁(θ₁,θ₂,θ₃,θ̇₁,θ̇₂,θ̇₃)<br>θ̈₂ = f₂(…)<br>θ̈₃ = f₃(…)`,
          p2: `La divergence entre trajectoires voisines est encore plus rapide qu'en double pendule. On parle d'<strong>exposants de Lyapunov multiples</strong> positifs : le désordre croît simultanément sur plusieurs échelles.`,
          tip: `<b>Essaie :</b> active le jumeau. La divergence est spectaculairement plus rapide qu'avec deux pendules. Joue sur m₃ pour voir l'effet d'un troisième bras lourd.`
        },
        en: {
          p1: `A <strong>triple pendulum</strong> adds a third arm. The system has 3 coupled degrees of freedom and becomes <strong>hyperchaotic</strong>.`,
          formula: `θ̈₁ = f₁(θ₁,θ₂,θ₃,θ̇₁,θ̇₂,θ̇₃)<br>θ̈₂ = f₂(…)<br>θ̈₃ = f₃(…)`,
          p2: `The divergence between nearby trajectories is even faster than in the double pendulum. This corresponds to <strong>multiple positive Lyapunov exponents</strong>: disorder grows simultaneously on several scales.`,
          tip: `<b>Try it:</b> enable the twin. Divergence is spectacularly faster than with two pendulums. Play with m₃ to see the effect of a heavy third arm.`
        }
      }
    };
    const T = texts[P.mode][lang] || texts[P.mode]["fr"];
    box.innerHTML = `
      <p data-html="1">${T.p1}</p>
      <div class="fbox">${T.formula}</div>
      <p data-html="1">${T.p2}</p>
      <p class="tip" data-html="1">${T.tip}</p>
    `;
  }

  /* ── contrôles statiques (mode, twin, play, reset) ── */
  function initStaticControls() {
    // Sélecteur de mode
    document.querySelectorAll(".mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const m = parseInt(btn.dataset.mode);
        if (m === P.mode) return;
        P.mode = m;
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", parseInt(b.dataset.mode) === P.mode));
        buildPanel();
      });
      if (parseInt(btn.dataset.mode) === P.mode) btn.classList.add("active");
    });

    document.getElementById("twin").addEventListener("change", e => { P.twin = e.target.checked; reset(); });

    const btnPlay = document.getElementById("btn-play");
    btnPlay.addEventListener("click", () => {
      P.running = !P.running;
      btnPlay.dataset.fr = P.running ? "Pause" : "Reprendre";
      btnPlay.dataset.en = P.running ? "Pause" : "Resume";
      btnPlay.textContent = Antsa.t(btnPlay.dataset.fr, btnPlay.dataset.en);
    });
    document.getElementById("btn-reset").addEventListener("click", reset);
    document.addEventListener("antsa:theme", () => { setLegend(); render(); });
    document.addEventListener("antsa:lang", () => { setLegend(); updateTheoryBlock(); });
  }

  /* ── boucle ───────────────────────────────────────── */
  // Pas de base : ~0.012 s / substep, 8 substeps/frame → réel = 8 × speed × 0.012
  const BASE_H = 0.012;
  const SUBSTEPS = 8;

  function loop() {
    requestAnimationFrame(loop);
    if (!W) return;
    if (P.running) {
      const h = BASE_H * P.speed;
      for (let i = 0; i < SUBSTEPS; i++) {
        step(main, h);
        if (ghost) step(ghost, h);
      }
      updateReadouts();
    }
    render();
  }

  /* ── init ─────────────────────────────────────────── */
  initStaticControls();
  buildPanel();
  new ResizeObserver(fit).observe(cv);
  fit();
  requestAnimationFrame(loop);
})();
