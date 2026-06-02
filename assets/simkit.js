/* antsamath — SimKit : contrôles de simulation harmonisés.
   • horloge crédible (temps réel en secondes OU compteur d'étapes)
   • lecture / pause + pas-à-pas (image par image)
   • curseur de vitesse avec badge ×N
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

  /* ---------- badge vitesse ---------- */
  function fmtSpeed(v) {
    return '×' + (v >= 10 ? Math.round(v) : v >= 1 ? v.toFixed(1) : v.toFixed(2));
  }

  /* ---------- bloc de transport + horloge + vitesse ---------- */
  function mount(opts) {
    const host = typeof opts.el === "string" ? document.querySelector(opts.el) : opts.el;
    const cont = !!opts.continuous;
    host.classList.add("block");
    const tipFr = cont
      ? "À 1×, le temps de la simulation s'écoule comme dans la réalité (1 s = 1 s). Glisse le curseur pour ralentir ou accélérer."
      : "Nombre d'étapes calculées par seconde. Descends le curseur pour suivre la construction pas à pas.";
    const tipEn = cont
      ? "At 1×, simulation time flows like reality (1 s = 1 s). Drag the slider to slow down or speed up."
      : "How many steps are computed per second. Lower the slider to follow the construction step by step.";
    host.innerHTML =
      '<div class="simctrl">' +
        '<div class="clock"><div class="clock-main" id="sk-main">—</div><div class="clock-sub" id="sk-sub"></div></div>' +
        '<div class="transport">' +
          '<button class="mini primary" id="sk-play" type="button"></button>' +
          '<button class="mini ghost" id="sk-step" type="button"></button>' +
          '<button class="mini ghost" id="sk-reset" type="button"></button>' +
        '</div>' +
        '<div class="ctrl sk-speed-ctrl" data-tip-fr="' + tipFr + '" data-tip-en="' + tipEn + '">' +
          '<label>' +
            '<span data-fr="Vitesse de simulation" data-en="Simulation speed">Vitesse de simulation</span>' +
            '<span class="val" id="sk-spv">×1.0</span>' +
          '</label>' +
          '<input type="range" id="sk-speed" aria-label="' + t('Vitesse', 'Speed') + '" tabindex="0"/>' +
        '</div>' +
      '</div>';

    const playBtn = host.querySelector("#sk-play"), stepBtn = host.querySelector("#sk-step"), resetBtn = host.querySelector("#sk-reset");
    const speedEl = host.querySelector("#sk-speed");
    const spdBadge = host.querySelector("#sk-spv");
    const mainEl = host.querySelector("#sk-main"), subEl = host.querySelector("#sk-sub");

    const sp = opts.speed || {};
    speedEl.min = sp.min != null ? sp.min : 0.1;
    speedEl.max = sp.max != null ? sp.max : 3;
    speedEl.step = sp.step != null ? sp.step : 0.1;
    let speedMul = sp.value != null ? sp.value : 1;
    speedEl.value = speedMul;

    let playing = opts.autoplay !== false, simTime = 0, stepCount = 0, acc = 0, last = performance.now();

    function setSpeed(v) {
      speedMul = v;
      speedEl.value = v;
      spdBadge.textContent = fmtSpeed(v);
      speedEl.style.setProperty('--pct', ((v - speedEl.min) / (speedEl.max - speedEl.min) * 100).toFixed(1) + '%');
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

    /* initialise l'état visuel du curseur */
    setSpeed(speedMul);

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
