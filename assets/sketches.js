/* antsamath — mini-simulations canvas
   Chaque sketch est une factory: (ctx, color) => function(w, h) qui dessine une frame.
   color peut être une string (cartes) ou un tableau de couleurs (héros).
   Chaque sketch gère son propre clearRect. */
(function () {
  const TAU = Math.PI * 2;

  const Sketches = {
    /* 1 — arbre fractal récursif */
    fractal(ctx, color) {
      let t = 0;
      return (w, h) => {
        ctx.clearRect(0, 0, w, h);
        t += 0.012;
        const sway = 0.42 + 0.16 * Math.sin(t);
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        (function b(x, y, len, a, d) {
          if (d === 0 || len < 2) return;
          const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
          ctx.globalAlpha = Math.min(1, d / 7);
          ctx.lineWidth = d * 0.45;
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
          b(x2, y2, len * 0.72, a - sway, d - 1);
          b(x2, y2, len * 0.72, a + sway, d - 1);
        })(w / 2, h - 4, h * 0.26, -Math.PI / 2, 8);
        ctx.globalAlpha = 1;
      };
    },

    /* 2 — courbe de fonction animée */
    curve(ctx, color) {
      let t = 0;
      return (w, h) => {
        ctx.clearRect(0, 0, w, h);
        t += 0.03;
        ctx.globalAlpha = 0.14; ctx.lineWidth = 1; ctx.strokeStyle = color;
        ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
        ctx.globalAlpha = 0.95; ctx.lineWidth = 2.2;
        ctx.beginPath();
        for (let px = 0; px <= w; px += 2) {
          const x = px / w * TAU * 1.5;
          const y = Math.sin(x * 2 + t) * 0.5 + Math.sin(x * 3 - t * 1.3) * 0.3;
          const py = h / 2 - y * h * 0.32;
          px === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
    },

    /* 3 — Monte-Carlo pour π */
    approx(ctx, color) {
      const pts = []; const max = 460;
      return (w, h) => {
        const s = Math.min(w, h) * 0.86, ox = (w - s) / 2, oy = (h - s) / 2;
        for (let i = 0; i < 7 && pts.length < max; i++) {
          const x = Math.random(), y = Math.random();
          pts.push([x, y, x * x + y * y <= 1]);
        }
        if (pts.length >= max) pts.splice(0, 7);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.4;
        ctx.strokeRect(ox, oy, s, s);
        ctx.beginPath(); ctx.arc(ox, oy + s, s, -Math.PI / 2, 0); ctx.stroke();
        for (const [x, y, inside] of pts) {
          ctx.globalAlpha = inside ? 0.85 : 0.35;
          ctx.fillStyle = inside ? color : "#9aa0ad";
          ctx.beginPath(); ctx.arc(ox + x * s, oy + s - y * s, 1.6, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    },

    /* 4 — triangle tournant + cercle circonscrit */
    geometry(ctx, color) {
      let t = 0;
      return (w, h) => {
        ctx.clearRect(0, 0, w, h);
        t += 0.01;
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.34;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.3; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.lineJoin = "round";
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = t + i * TAU / 3;
          const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
        ctx.fillStyle = color;
        for (let i = 0; i < 3; i++) {
          const a = t + i * TAU / 3;
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R, cy + Math.sin(a) * R, 3, 0, TAU); ctx.fill();
        }
      };
    },

    /* 5 — histogramme binomial (planche de Galton) */
    proba(ctx, color) {
      const bins = 11; let counts = new Array(bins).fill(0); let tot = 0; let f = 0;
      return (w, h) => {
        f++;
        if (f % 2 === 0) {
          let b = 0; for (let i = 0; i < bins - 1; i++) b += Math.random() < 0.5 ? 0 : 1;
          counts[b]++; tot++;
        }
        if (tot > 900) { counts = counts.map(c => c * 0.5); tot *= 0.5; }
        ctx.clearRect(0, 0, w, h);
        const mx = Math.max(...counts, 1), bw = w / bins;
        ctx.fillStyle = color; ctx.globalAlpha = 0.85;
        for (let i = 0; i < bins; i++) {
          const bh = (counts[i] / mx) * (h * 0.82);
          ctx.fillRect(i * bw + 1.5, h - bh, bw - 3, bh);
        }
        ctx.globalAlpha = 1;
      };
    },

    /* 6 — double pendule (chaos) */
    chaos(ctx, color) {
      let a1 = Math.PI / 2 + 0.4, a2 = Math.PI / 2 + 0.1, p1 = 0, p2 = 0;
      const g = 0.45, m1 = 1, m2 = 1, L1 = 1, L2 = 1, dt = 0.1;
      const trail = [];
      return (w, h) => {
        for (let s = 0; s < 2; s++) {
          const c = Math.cos(a1 - a2), sn = Math.sin(a1 - a2);
          const den = 2 * m1 + m2 - m2 * Math.cos(2 * a1 - 2 * a2);
          const a1a = (-g * (2 * m1 + m2) * Math.sin(a1) - m2 * g * Math.sin(a1 - 2 * a2)
            - 2 * sn * m2 * (p2 * p2 * L2 + p1 * p1 * L1 * c)) / (L1 * den);
          const a2a = (2 * sn * (p1 * p1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(a1)
            + p2 * p2 * L2 * m2 * c)) / (L2 * den);
          p1 += a1a * dt; p2 += a2a * dt; p1 *= 0.9995; p2 *= 0.9995;
          a1 += p1 * dt; a2 += p2 * dt;
        }
        if (!isFinite(a1) || !isFinite(a2)) { a1 = Math.PI / 2 + 0.4; a2 = Math.PI / 2; p1 = p2 = 0; trail.length = 0; }
        const cx = w / 2, cy = h * 0.4, L = Math.min(w, h) * 0.2;
        const x1 = cx + Math.sin(a1) * L, y1 = cy + Math.cos(a1) * L;
        const x2 = x1 + Math.sin(a2) * L, y2 = y1 + Math.cos(a2) * L;
        trail.push([x2, y2]); if (trail.length > 44) trail.shift();
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.25; ctx.lineWidth = 1.5;
        ctx.beginPath(); trail.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.fillStyle = color;
        [[cx, cy, 2.5], [x1, y1, 3.5], [x2, y2, 4]].forEach(p => {
          ctx.beginPath(); ctx.arc(p[0], p[1], p[2], 0, TAU); ctx.fill();
        });
      };
    },

    /* 7 — phyllotaxie (nombre d'or) */
    sequence(ctx, color) {
      let n = 20; const max = 260;
      return (w, h) => {
        n += 4; if (n > max) n = 20;
        ctx.clearRect(0, 0, w, h);
        const cx = w / 2, cy = h / 2, sc = Math.min(w, h) * 0.032;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < n; i++) {
          const a = i * golden, r = sc * Math.sqrt(i);
          ctx.globalAlpha = 0.25 + 0.75 * (i / n);
          ctx.fillStyle = color;
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.9, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    },

    /* 8 — cercle trigonométrique + sinusoïde */
    trig(ctx, color) {
      let t = 0;
      return (w, h) => {
        ctx.clearRect(0, 0, w, h);
        t += 0.03;
        const R = h * 0.32, cx = w * 0.3, cy = h / 2;
        ctx.strokeStyle = color; ctx.globalAlpha = 0.3; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
        const px = cx + Math.cos(-t) * R, py = cy + Math.sin(-t) * R;
        ctx.globalAlpha = 1; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 3, 0, TAU); ctx.fill();
        const x0 = cx + R + 6, span = w - x0 - 4;
        ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.beginPath();
        for (let i = 0; i <= span; i += 2) {
          const ang = -t - i / span * TAU * 1.2;
          const yy = cy + Math.sin(ang) * R;
          i === 0 ? ctx.moveTo(x0, yy) : ctx.lineTo(x0 + i, yy);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.3; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x0, py); ctx.stroke();
        ctx.setLineDash([]); ctx.globalAlpha = 1;
      };
    },

    /* 9 — grille transformée par une matrice */
    linalg(ctx, color) {
      let t = 0;
      return (w, h) => {
        ctx.clearRect(0, 0, w, h);
        t += 0.012;
        const cx = w / 2, cy = h / 2, g = 4, step = Math.min(w, h) / (g * 2 + 1.5);
        const ang = 0.5 * Math.sin(t), sh = 0.5 * Math.sin(t * 0.7);
        const a = Math.cos(ang), b = -Math.sin(ang) + sh, c = Math.sin(ang), d = Math.cos(ang);
        ctx.strokeStyle = color; ctx.lineWidth = 1;
        for (let i = -g; i <= g; i++) {
          ctx.globalAlpha = i === 0 ? 0.9 : 0.25;
          ctx.beginPath();
          for (let j = -g; j <= g; j++) {
            const x = i * step, y = j * step;
            const X = cx + (a * x + b * y), Y = cy + (c * x + d * y);
            j === -g ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
          }
          ctx.stroke();
          ctx.beginPath();
          for (let j = -g; j <= g; j++) {
            const x = j * step, y = i * step;
            const X = cx + (a * x + b * y), Y = cy + (c * x + d * y);
            j === -g ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      };
    },

    /* 10 — graphe dirigé par les forces */
    graph(ctx, color) {
      const N = 9, nodes = [], edges = [];
      for (let i = 0; i < N; i++) nodes.push({ x: Math.random(), y: Math.random(), vx: 0, vy: 0 });
      for (let i = 0; i < N; i++) {
        edges.push([i, (i + 1) % N]);
        if (Math.random() < 0.45) edges.push([i, (i + 3) % N]);
      }
      return (w, h) => {
        for (const n of nodes) { n.vx *= 0.85; n.vy *= 0.85; }
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const d = Math.hypot(dx, dy) || 0.001, f = 0.0006 / (d * d);
          nodes[i].vx += dx / d * f; nodes[i].vy += dy / d * f;
          nodes[j].vx -= dx / d * f; nodes[j].vy -= dy / d * f;
        }
        for (const [a, b] of edges) {
          const dx = nodes[b].x - nodes[a].x, dy = nodes[b].y - nodes[a].y;
          const d = Math.hypot(dx, dy) || 0.001, f = (d - 0.33) * 0.02;
          nodes[a].vx += dx * f; nodes[a].vy += dy * f;
          nodes[b].vx -= dx * f; nodes[b].vy -= dy * f;
        }
        for (const n of nodes) {
          n.vx += (0.5 - n.x) * 0.004; n.vy += (0.5 - n.y) * 0.004;
          n.x += n.vx; n.y += n.vy;
          n.x = Math.max(0.1, Math.min(0.9, n.x)); n.y = Math.max(0.1, Math.min(0.9, n.y));
        }
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = color; ctx.globalAlpha = 0.35; ctx.lineWidth = 1.2;
        for (const [a, b] of edges) {
          ctx.beginPath(); ctx.moveTo(nodes[a].x * w, nodes[a].y * h);
          ctx.lineTo(nodes[b].x * w, nodes[b].y * h); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = color;
        for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x * w, n.y * h, 3.5, 0, TAU); ctx.fill(); }
      };
    },

    /* 11 — automate cellulaire (jeu de la vie) */
    automata(ctx, color) {
      const C = 18; let grid = mk(); let f = 0;
      function mk() { return Array.from({ length: C * C }, () => Math.random() < 0.32 ? 1 : 0); }
      function step() {
        const g2 = new Array(C * C).fill(0);
        for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            n += grid[((y + dy + C) % C) * C + (x + dx + C) % C];
          }
          const a = grid[y * C + x];
          g2[y * C + x] = (a && (n === 2 || n === 3)) || (!a && n === 3) ? 1 : 0;
        }
        grid = g2;
      }
      return (w, h) => {
        f++; if (f % 6 === 0) step(); if (f % 420 === 0) grid = mk();
        ctx.clearRect(0, 0, w, h);
        const cw = w / C, ch = h / C; ctx.fillStyle = color; ctx.globalAlpha = 0.85;
        for (let y = 0; y < C; y++) for (let x = 0; x < C; x++)
          if (grid[y * C + x]) ctx.fillRect(x * cw + 0.5, y * ch + 0.5, cw - 1, ch - 1);
        ctx.globalAlpha = 1;
      };
    },

    /* 12 — spirale d'Ulam (nombres premiers) */
    primes(ctx, color) {
      const N = 441; let pts = null, shown = 10;
      function isP(n) { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; }
      function build() {
        pts = []; let x = 0, y = 0, dx = 0, dy = -1;
        for (let i = 1; i <= N; i++) {
          if (isP(i)) pts.push([x, y]);
          if (x === y || (x < 0 && x === -y) || (x > 0 && x === 1 - y)) { const t = dx; dx = -dy; dy = t; }
          x += dx; y += dy;
        }
      }
      return (w, h) => {
        if (!pts) build();
        shown += 2; if (shown > pts.length) shown = 10;
        ctx.clearRect(0, 0, w, h);
        const s = Math.min(w, h) / Math.sqrt(N) * 0.95, cx = w / 2, cy = h / 2;
        ctx.fillStyle = color; ctx.globalAlpha = 0.85;
        for (let i = 0; i < shown; i++) {
          ctx.beginPath(); ctx.arc(cx + pts[i][0] * s, cy + pts[i][1] * s, 1.7, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    },

    /* 13 — propagation épidémique (agents SIR) */
    epidemic(ctx, color) {
      const N = 46, ag = [];
      for (let i = 0; i < N; i++) ag.push({ x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .006, vy: (Math.random() - .5) * .006, s: i < 2 ? 1 : 0, t: 0 });
      let f = 0;
      return (w, h) => {
        f++;
        for (const a of ag) {
          a.x += a.vx; a.y += a.vy;
          if (a.x < 0 || a.x > 1) a.vx *= -1;
          if (a.y < 0 || a.y > 1) a.vy *= -1;
          a.x = Math.max(0, Math.min(1, a.x)); a.y = Math.max(0, Math.min(1, a.y));
          if (a.s === 1) { a.t++; if (a.t > 240) a.s = 2; }
        }
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
          const A = ag[i], B = ag[j];
          if ((A.s === 1 && B.s === 0) || (B.s === 1 && A.s === 0)) {
            if (Math.hypot((A.x - B.x) * w, (A.y - B.y) * h) < 14) { if (A.s === 0) A.s = 1; if (B.s === 0) B.s = 1; }
          }
        }
        if (f % 620 === 0) for (const a of ag) { a.s = Math.random() < 0.05 ? 1 : 0; a.t = 0; }
        ctx.clearRect(0, 0, w, h);
        for (const a of ag) {
          ctx.globalAlpha = a.s === 0 ? 0.5 : 0.9;
          ctx.fillStyle = a.s === 1 ? color : a.s === 2 ? "#9aa0ad" : "#6f8cff";
          ctx.beginPath(); ctx.arc(a.x * w, a.y * h, a.s === 1 ? 3 : 2.4, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    },

    /* HÉROS A — Lissajous discrets multicolores */
    heroLissajous(ctx, colors) {
      let t = 0;
      return (w, h) => {
        ctx.clearRect(0, 0, w, h);
        t += 0.004;
        const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.46;
        for (let k = 0; k < colors.length; k++) {
          const a = 2 + k, b = 3 + (k % 3), ph = t * (1 + k * 0.15);
          ctx.strokeStyle = colors[k]; ctx.globalAlpha = 0.16; ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i <= 220; i++) {
            const u = i / 220 * TAU;
            const x = cx + Math.sin(a * u + ph) * R * 1.4;
            const y = cy + Math.sin(b * u) * R * 0.72;
            i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      };
    },

    /* HÉROS B — champ de flux de particules (fond sombre) */
    heroField(ctx, colors) {
      const P = 110, ps = [];
      for (let i = 0; i < P; i++) ps.push({ x: Math.random(), y: Math.random(), c: colors[i % colors.length] });
      let t = 0;
      return (w, h) => {
        t += 0.0025;
        ctx.globalAlpha = 0.08; ctx.fillStyle = "#0c0c11"; ctx.fillRect(0, 0, w, h);
        for (const p of ps) {
          const ang = (Math.sin(p.x * 6 + t) + Math.cos(p.y * 6 - t)) * Math.PI;
          p.x += Math.cos(ang) * 0.0013; p.y += Math.sin(ang) * 0.0013;
          if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
          if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
          ctx.globalAlpha = 0.55; ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 1.5, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      };
    }
  };

  /* Monte un sketch sur un canvas : gère dpr, pause hors-écran, throttle. */
  function mountSketch(canvas, name, color, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    const fps = opts.fps || 30, interval = 1000 / fps;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cssW = 0, cssH = 0, last = 0, raf = 0, visible = true;

    function resize() {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cssW = r.width; cssH = r.height;
    }
    resize();
    const frame = Sketches[name](ctx, color);

    if (reduce) {
      let done = false;
      const run = () => { if (done || !cssW) { resize(); if (!cssW) return; } done = true; for (let i = 0; i < 90; i++) frame(cssW, cssH); };
      run();
      const ro = new ResizeObserver(() => { if (!done) run(); });
      ro.observe(canvas);
      return { stop() { ro.disconnect(); } };
    }

    function loop(ts) {
      raf = requestAnimationFrame(loop);
      if (!visible || !cssW) return;
      if (ts - last < interval) return;
      last = ts;
      frame(cssW, cssH);
    }
    raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(resize); ro.observe(canvas);
    const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.01 });
    io.observe(canvas);
    return { stop() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); } };
  }

  window.Sketches = Sketches;
  window.mountSketch = mountSketch;
})();
