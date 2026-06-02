/* antsamath — SimKit : contrôles de simulation harmonisés.
   • horloge crédible (temps réel en secondes OU compteur d'étapes)
   • lecture / pause + pas-à-pas (image par image)
   • tachymètre SVG interactif (remplace le curseur de vitesse)
   • info-bulles ⓘ : décrit chaque réglage [data-tip-fr]/[data-tip-en]
   Dépend de window.Antsa (common.js). */
(function () {
  const A = window.Antsa;
  const t = (fr, en) => (A ? A.t(fr, en) : fr);
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* ---------- info-bulles ⓘ ---------- */
  function decorateTips(root) {
    root = root || document;
    root.querySelectorAll("[data-tip-fr]").forEach(host => {
      if (host.dataset.tipDone) return;
      host.dataset.tipDone = "1";

      const ic = el("span", "info-ic", "i");
      ic.setAttribute("role", "button"); ic.setAttribute("tabindex", "0");
      ic.setAttribute("aria-label", t("Aide", "Help"));
      const pop = el("span", "info-pop");
      const upd = () => { pop.textContent = t(host.dataset.tipFr, host.dataset.tipEn); };
      upd(); document.addEventListener("antsa:lang", upd);
      ic.appendChild(pop);
      ic.addEventListener("click", e => {
        e.preventDefault(); e.stopPropagation();
        const open = ic.classList.contains("open");
        document.querySelectorAll(".info-ic.open").forEach(i => i.classList.remove("open"));
        if (!open) ic.classList.add("open");
      });

      let labelText = null;
      if (host.classList.contains("ctrl")) labelText = host.querySelector("label > span");
      else {
        const first = host.firstElementChild;
        if (first && first.tagName === "SPAN" && first.hasAttribute("data-fr")) labelText = first;
      }
      if (labelText) {
        const wrap = el("span", "label-tip");
        labelText.parentNode.insertBefore(wrap, labelText);
        wrap.appendChild(labelText);
        wrap.appendChild(ic);
      } else {
        host.appendChild(ic);
      }
    });
  }
  document.addEventListener("click", () => document.querySelectorAll(".info-ic.open").forEach(i => i.classList.remove("open")));

  /* ---------- tachymètre SVG ---------- */
  function snapStep(v, step) { return +(Math.round(v / step) * step).toFixed(10); }

  function buildTacho(wrap, sp, onSet) {
    const CX = 100, CY = 104, R = 80, NR = 67;
    const spMin = parseFloat(sp.min) || 0.1;
    const spMax = parseFloat(sp.max) || 3;
    const spStep = parseFloat(sp.step) || 0.1;

    /* vitesse → angle (°) : min→180°, ×1→90°, max→0° (échelle bilinéaire) */
    function s2a(s) {
      const c = Math.max(spMin, Math.min(spMax, s));
      if (c <= 1) return 180 - ((c - spMin) / Math.max(1e-6, 1 - spMin)) * 90;
      return 90 - ((c - 1) / Math.max(1e-6, spMax - 1)) * 90;
    }
    /* angle → vitesse */
    function a2s(a) {
      const ang = Math.max(0, Math.min(180, a));
      return ang >= 90
        ? spMin + ((180 - ang) / 90) * (1 - spMin)
        : 1 + ((90 - ang) / 90) * (spMax - 1);
    }
    /* point sur le cercle (coord SVG) */
    function pt(deg, r) {
      const rad = deg * Math.PI / 180;
      return [+(CX + r * Math.cos(rad)).toFixed(2), +(CY - r * Math.sin(rad)).toFixed(2)];
    }
    /* arc SVG de fromDeg à toDeg (sens trigo = sweep=0) */
    function arcPath(fd, td) {
      if (Math.abs(fd - td) < 0.15) return null;
      const [x1, y1] = pt(fd, R), [x2, y2] = pt(td, R);
      const large = (fd - td) > 180 ? 1 : 0;
      return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 0 ${x2} ${y2}`;
    }

    /* graduations */
    const TICK_VALS = [0.1, 0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 5, 10, 15, 20, 30];
    const ticks = TICK_VALS.filter(s => s >= spMin * 0.999 && s <= spMax * 1.001);
    const LABEL_VALS = [0.2, 0.5, 1, 2, 5, 10, 20];
    /* filtre les labels trop proches des extrémités de l'arc ou hors plage */
    const labels = LABEL_VALS.filter(s => {
      if (s < spMin * 0.999 || s > spMax * 1.001) return false;
      const a = s2a(s);
      return a > 8 && a < 172; /* évite les positions sur les bords de l'arc */
    });
    if (!labels.includes(1) && spMin < 1 && spMax > 1) labels.push(1);

    let ticksSVG = '';
    for (const s of ticks) {
      const a = s2a(s), maj = s === 1;
      const [ox, oy] = pt(a, R + 3), [ix, iy] = pt(a, R - (maj ? 13 : 6));
      ticksSVG += `<line x1="${ox}" y1="${oy}" x2="${ix}" y2="${iy}" class="${maj ? 'sk-tmaj' : 'sk-tmin'}"/>`;
    }
    /* labels à l'intérieur de l'arc (style tachymètre classique) */
    let labelsSVG = '';
    for (const s of labels) {
      const a = s2a(s), maj = s === 1;
      const [lx, ly] = pt(a, R - 22);
      const clx = Math.max(6, Math.min(194, lx));
      const lbl = s < 1 ? `×${s}` : `×${s % 1 === 0 ? s : s.toFixed(1)}`;
      const anch = a > 110 ? 'end' : a < 70 ? 'start' : 'middle';
      labelsSVG += `<text x="${clx}" y="${ly.toFixed(2)}" class="${maj ? 'sk-tlmaj' : 'sk-tl'}" text-anchor="${anch}" dominant-baseline="middle">${lbl}</text>`;
    }

    const zArc = arcPath(101, 79) || '';

    wrap.innerHTML =
      `<svg class="sk-tacho" viewBox="0 0 200 116" role="img" aria-label="${t('Vitesse de simulation','Simulation speed')}">` +
        `<path d="M 20 ${CY} A ${R} ${R} 0 0 0 180 ${CY}" class="sk-tbg"/>` +
        (zArc ? `<path d="${zArc}" class="sk-tzone"/>` : '') +
        `<path id="sk-tfill" class="sk-tfill"/>` +
        ticksSVG + labelsSVG +
        `<line id="sk-tneedle" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - NR}" class="sk-tneedle"/>` +
        `<circle cx="${CX}" cy="${CY}" r="7" class="sk-thub"/>` +
        `<circle cx="${CX}" cy="${CY}" r="3.5" class="sk-thubin"/>` +
        `<text id="sk-tspd" x="${CX}" y="${CY - 20}" class="sk-tspd">×1.00</text>` +
      `</svg>`;

    const svg = wrap.querySelector('.sk-tacho');
    const fillEl = svg.querySelector('#sk-tfill');
    const needleEl = svg.querySelector('#sk-tneedle');
    const spdEl = svg.querySelector('#sk-tspd');

    function update(speed) {
      const a = s2a(speed);
      const fp = arcPath(180, a);
      if (fp) fillEl.setAttribute('d', fp); else fillEl.removeAttribute('d');
      const [nx, ny] = pt(a, NR);
      needleEl.setAttribute('x2', String(nx)); needleEl.setAttribute('y2', String(ny));
      const v = speed;
      spdEl.textContent = '×' + (v >= 10 ? Math.round(v) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
    }

    /* interaction souris / tactile */
    function getAngleDeg(e) {
      const rect = svg.getBoundingClientRect();
      const ex = e.clientX, ey = e.clientY;
      const svgX = (ex - rect.left) / rect.width * 200 - CX;
      const svgY = (ey - rect.top) / rect.height * 116 - CY;
      let d = Math.atan2(-svgY, svgX) * 180 / Math.PI;
      if (d < 0) d += 360;
      if (d > 180 && d <= 270) d = 180;
      if (d > 270) d = 0;
      return d;
    }
    function applyPointer(e) {
      const spd = snapStep(Math.max(spMin, Math.min(spMax, a2s(getAngleDeg(e)))), spStep);
      onSet(spd);
    }
    let pdown = false;
    svg.addEventListener('pointerdown', e => { pdown = true; svg.setPointerCapture(e.pointerId); applyPointer(e); e.preventDefault(); });
    svg.addEventListener('pointermove', e => { if (pdown) { applyPointer(e); e.preventDefault(); } });
    svg.addEventListener('pointerup', () => { pdown = false; });
    svg.addEventListener('pointercancel', () => { pdown = false; });

    update(parseFloat(sp.value) || 1);
    return { update };
  }

  /* ---------- bloc de transport + horloge + vitesse ---------- */
  function mount(opts) {
    const host = typeof opts.el === "string" ? document.querySelector(opts.el) : opts.el;
    const cont = !!opts.continuous;
    host.classList.add("block");
    const tipFr = cont
      ? "À 1×, le temps de la simulation s'écoule comme dans la réalité (1 s = 1 s). Glisse la jauge pour ralentir ou accélérer."
      : "Nombre d'étapes calculées par seconde. Descends la jauge pour suivre la construction pas à pas.";
    const tipEn = cont
      ? "At 1×, simulation time flows like reality (1 s = 1 s). Drag the gauge to slow down or speed up."
      : "How many steps are computed per second. Lower the gauge to follow the construction step by step.";
    host.innerHTML =
      '<div class="simctrl">' +
        '<div class="clock"><div class="clock-main" id="sk-main">—</div><div class="clock-sub" id="sk-sub"></div></div>' +
        '<div class="transport">' +
          '<button class="mini primary" id="sk-play" type="button"></button>' +
          '<button class="mini ghost" id="sk-step" type="button"></button>' +
          '<button class="mini ghost" id="sk-reset" type="button"></button>' +
        '</div>' +
        '<div class="ctrl sk-speed-ctrl" data-tip-fr="' + tipFr + '" data-tip-en="' + tipEn + '">' +
          '<label><span data-fr="Vitesse de simulation" data-en="Simulation speed">Vitesse de simulation</span></label>' +
          '<div id="sk-tacho-wrap"></div>' +
          '<input type="range" id="sk-speed" class="sk-range-sr" aria-label="' + t('Vitesse', 'Speed') + '" tabindex="0"/>' +
        '</div>' +
      '</div>';

    const playBtn = host.querySelector("#sk-play"), stepBtn = host.querySelector("#sk-step"), resetBtn = host.querySelector("#sk-reset");
    const speedEl = host.querySelector("#sk-speed");
    const mainEl = host.querySelector("#sk-main"), subEl = host.querySelector("#sk-sub");
    const tachoWrap = host.querySelector("#sk-tacho-wrap");

    const sp = opts.speed || {};
    speedEl.min = sp.min != null ? sp.min : 0.1;
    speedEl.max = sp.max != null ? sp.max : 3;
    speedEl.step = sp.step != null ? sp.step : 0.1;
    let speedMul = sp.value != null ? sp.value : 1;
    speedEl.value = speedMul;

    let playing = opts.autoplay !== false, simTime = 0, stepCount = 0, acc = 0, last = performance.now();

    let tacho = null;
    function setSpeed(v) {
      speedMul = v;
      speedEl.value = v;
      if (tacho) tacho.update(v);
    }

    function setLabels() {
      playBtn.innerHTML = playing ? "❚❚ " + t("Pause", "Pause") : "▶ " + t("Lecture", "Play");
      stepBtn.innerHTML = "⏭ " + t("Pas à pas", "Step");
      resetBtn.innerHTML = "↺ " + t("Reset", "Reset");
    }
    setLabels();
    document.addEventListener("antsa:lang", () => { setLabels(); readout(); });

    speedEl.addEventListener("input", () => { setSpeed(parseFloat(speedEl.value)); });
    playBtn.addEventListener("click", () => { playing = !playing; setLabels(); });
    resetBtn.addEventListener("click", doReset);
    stepBtn.addEventListener("click", () => {
      if (playing) { playing = false; setLabels(); }
      if (cont) { const d = opts.stepDt || (1 / 30); simTime += d; if (opts.onStep) opts.onStep(d, true); }
      else { const n = opts.stepSize || 1; if (opts.onStep) opts.onStep(n, true); stepCount += n; }
      if (opts.render) opts.render(); readout();
    });

    function doReset() {
      simTime = 0; stepCount = 0; acc = 0; last = performance.now();
      if (opts.onReset) opts.onReset();
      if (opts.render) opts.render(); readout();
    }

    function readout() {
      let main = "", sub = "";
      if (opts.readout) { const r = opts.readout({ simTime, stepCount, playing }) || {}; main = r.main || ""; sub = r.sub || ""; }
      else if (cont) main = "t = " + simTime.toFixed(1) + " s";
      else main = stepCount.toLocaleString(A && A.getLang() === "fr" ? "fr-FR" : "en-US");
      mainEl.innerHTML = main; subEl.innerHTML = sub;
    }

    function frame(ts) {
      requestAnimationFrame(frame);
      const dtReal = Math.min(0.05, (ts - last) / 1000); last = ts;
      if (playing) {
        if (cont) { const simDt = dtReal * speedMul; simTime += simDt; if (opts.onStep) opts.onStep(simDt, false); }
        else {
          acc += dtReal * speedMul * (opts.baseRate || 20);
          let n = Math.floor(acc); acc -= n;
          if (opts.maxPerFrame) n = Math.min(n, opts.maxPerFrame);
          if (n > 0 && opts.onStep) { opts.onStep(n, false); stepCount += n; }
        }
      }
      if (opts.render) opts.render();
      readout();
    }

    document.addEventListener("visibilitychange", () => { last = performance.now(); });

    /* construit le tachymètre après avoir les config sp */
    tacho = buildTacho(tachoWrap, { min: speedEl.min, max: speedEl.max, step: speedEl.step, value: speedMul }, setSpeed);

    decorateTips(document);
    if (opts.onReset) opts.onReset();
    readout();
    requestAnimationFrame(frame);

    return {
      isPlaying: () => playing,
      speed: () => speedMul,
      get simTime() { return simTime; },
      get stepCount() { return stepCount; },
      addSteps(n) { stepCount += n; },
      setStepCount(v) { stepCount = v; },
      setSimTime(v) { simTime = v; },
      reset: doReset,
      readout
    };
  }

  window.SimKit = { mount, decorateTips };
})();
