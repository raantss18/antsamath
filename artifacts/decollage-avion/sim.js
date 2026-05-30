/* Décollage d'un avion — dynamique sur piste + portance (SimKit, temps réel). */
(function () {
  Antsa.recordVisit("decollage-avion");
  Antsa.initChrome();

  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const TAU = Math.PI * 2;
  const RHO = 1.225, G = 9.81, CD = 0.07; // air, gravité, traînée

  const P = { mass: 70, wing: 120, thrust: 220, cl: 1.4 };
  let v = 0, x = 0, alt = 0, pitch = 0, airborne = false, climbT = 0;

  function massKg() { return P.mass * 1000; }
  function thrustN() { return P.thrust * 1000; }
  function lift(vv) { return 0.5 * RHO * vv * vv * P.wing * P.cl; }
  function drag(vv) { return 0.5 * RHO * vv * vv * P.wing * CD; }
  function VR() { return Math.sqrt(2 * massKg() * G / (RHO * P.wing * P.cl)); }

  function reset() { v = 0; x = 0; alt = 0; pitch = 0; airborne = false; climbT = 0; render(); updateReadouts(); }

  function advance(dt) {
    const vr = VR();
    if (!airborne) {
      const a = (thrustN() - drag(v)) / massKg();
      v += a * dt; if (v < 0) v = 0;
      x += v * dt;
      if (v >= vr) { airborne = true; climbT = 0; }
    } else {
      // après rotation : montée, accélération réduite
      climbT += dt;
      const a = (thrustN() - drag(v)) / massKg() * 0.6;
      v += a * dt; x += v * dt;
      pitch = Math.min(0.18, pitch + 0.25 * dt);
      const excess = (lift(v) - massKg() * G) / (massKg() * G);
      alt += Math.max(0, excess) * 26 * dt + 6 * dt;
    }
  }

  let W = 0, H = 0;
  function fit() { const r = cv.getBoundingClientRect(); if (!r.width || !r.height) return; const dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); W = r.width; H = r.height; render(); }
  function css(v) { return getComputedStyle(document.body).getPropertyValue(v).trim(); }

  function drawPlane(cx, cy, s, ang, color) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(-ang); ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-2.2 * s, 0); ctx.lineTo(1.6 * s, 0); ctx.lineTo(2.4 * s, -0.5 * s); ctx.lineTo(1.5 * s, -0.7 * s);
    ctx.lineTo(0.2 * s, -0.8 * s); ctx.lineTo(-1.4 * s, -0.9 * s); ctx.lineTo(-2.2 * s, -0.3 * s); ctx.closePath(); ctx.fill();
    // aile
    ctx.beginPath(); ctx.moveTo(-0.2 * s, -0.4 * s); ctx.lineTo(0.9 * s, 0.5 * s); ctx.lineTo(-0.1 * s, 0.5 * s); ctx.closePath(); ctx.fill();
    // dérive
    ctx.beginPath(); ctx.moveTo(-2.1 * s, -0.3 * s); ctx.lineTo(-1.7 * s, -1.1 * s); ctx.lineTo(-1.3 * s, -0.7 * s); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function render() {
    if (!W) return;
    const sky = css("--card");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    const groundY = H * 0.8, acc = css("--accent"), line = css("--line"), ink = css("--ink-soft");
    // piste
    ctx.strokeStyle = line; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
    // marques de piste défilant avec x
    ctx.strokeStyle = ink; ctx.globalAlpha = 0.4; ctx.lineWidth = 3; ctx.setLineDash([18, 22]);
    const off = (x * 2) % 40;
    ctx.beginPath(); ctx.moveTo(-off, groundY + 0.5); ctx.lineTo(W, groundY + 0.5); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // repère V_R
    const vr = VR(), frac = Math.min(1, v / vr);
    // avion : reste vers 32% de l'écran horizontalement ; altitude monte
    const planeX = W * 0.32;
    const planeY = groundY - 10 - Math.min(alt, 1000) / 1000 * (H * 0.55);
    const s = Math.min(W, H) * 0.05;
    drawPlane(planeX, planeY, s, airborne ? pitch : 0, acc);
    // barre de vitesse vs V_R
    const barY = H * 0.1, barX = W * 0.08, barW = W * 0.84;
    ctx.fillStyle = line; ctx.globalAlpha = 0.5; ctx.fillRect(barX, barY, barW, 6); ctx.globalAlpha = 1;
    ctx.fillStyle = acc; ctx.fillRect(barX, barY, barW * frac, 6);
    ctx.fillStyle = "#FF5247"; ctx.fillRect(barX + barW - 2, barY - 4, 3, 14);
    ctx.fillStyle = ink; ctx.font = "11px 'Space Mono', monospace";
    ctx.fillText("V_R", barX + barW - 16, barY - 8);
  }

  function updateReadouts() {
    const vr = VR(), ratio = lift(v) / (massKg() * G);
    const kmh = v * 3.6;
    document.getElementById("r-v").textContent = Math.round(kmh) + " km/h";
    document.getElementById("r-lift").textContent = Math.round(ratio * 100) + "%";
    document.getElementById("k-vr").textContent = Math.round(vr * 3.6) + " km/h";
    document.getElementById("k-v").textContent = Math.round(kmh) + " km/h";
    document.getElementById("k-dist").textContent = x < 1000 ? Math.round(x) + " m" : (x / 1000).toFixed(2) + " km";
    document.getElementById("k-ratio").textContent = Math.round(ratio * 100) + "%";
    const st = document.getElementById("r-state"), u = Antsa.t;
    st.textContent = airborne ? u("EN VOL ✈", "AIRBORNE ✈") : v >= vr * 0.98 ? u("ROTATION", "ROTATE") : u("ROULAGE", "TAXI/ROLL");
  }
  function setLegend() {
    const L = document.getElementById("legend"), u = Antsa.t;
    L.innerHTML = '<span><i style="background:' + css("--accent") + '"></i>' + u("vitesse v ⁄ V_R", "speed v ⁄ V_R") + '</span><span><i style="background:#FF5247"></i>' + u("seuil de décollage", "takeoff threshold") + '</span>';
  }

  function bind(id, valId, key, fmt) {
    const s = document.getElementById(id), v2 = document.getElementById(valId);
    const upd = () => { P[key] = parseFloat(s.value); v2.textContent = fmt(P[key]); updateReadouts(); render(); };
    s.addEventListener("input", upd); v2.textContent = fmt(P[key]);
  }
  bind("s-mass", "v-mass", "mass", x => Math.round(x) + " t");
  bind("s-wing", "v-wing", "wing", x => Math.round(x) + " m²");
  bind("s-thrust", "v-thrust", "thrust", x => Math.round(x) + " kN");
  bind("s-cl", "v-cl", "cl", x => x.toFixed(2));

  document.addEventListener("antsa:theme", () => { setLegend(); render(); });
  document.addEventListener("antsa:lang", () => { updateReadouts(); setLegend(); });

  setLegend();
  new ResizeObserver(fit).observe(cv);
  fit();

  const sim = SimKit.mount({
    el: "#sim-controls", continuous: true, stepDt: 0.1,
    speed: { min: 0.1, max: 2, step: 0.1, value: 0.5 },
    onStep: (dt) => { advance(dt); updateReadouts(); if (alt > 1100) sim.reset(); },
    onReset: reset,
    render: render,
    readout: ({ simTime }) => ({
      main: Math.round(v * 3.6) + " km/h",
      sub: (airborne ? Antsa.t("altitude ", "altitude ") + Math.round(alt) + " m" : Antsa.t("piste ", "runway ") + Math.round(x) + " m") + " · t=" + simTime.toFixed(1) + "s"
    })
  });
})();
