/* antsamath — SimKit : contrôles de simulation harmonisés.
   • horloge crédible (temps réel en secondes OU compteur d'étapes)
   • lecture / pause + pas-à-pas (image par image)
   • curseur de vitesse qui démarre lentement
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

      // Trouve le texte d'étiquette traduit (data-fr) à côté duquel poser l'icône.
      let labelText = null;
      if (host.classList.contains("ctrl")) labelText = host.querySelector("label > span");
      else {
        // toggle-row, etc. : 1er enfant <span> traduit
        const first = host.firstElementChild;
        if (first && first.tagName === "SPAN" && first.hasAttribute("data-fr")) labelText = first;
      }

      if (labelText) {
        // emballe [texte][icône] pour survivre aux réécritures de applyLang
        const wrap = el("span", "label-tip");
        labelText.parentNode.insertBefore(wrap, labelText);
        wrap.appendChild(labelText);
        wrap.appendChild(ic);
      } else {
        // .seg ou conteneur non traduit : on pose l'icône directement
        host.appendChild(ic);
      }
    });
  }
  document.addEventListener("click", () => document.querySelectorAll(".info-ic.open").forEach(i => i.classList.remove("open")));

  /* ---------- bloc de transport + horloge + vitesse ---------- */
  function mount(opts) {
    const host = typeof opts.el === "string" ? document.querySelector(opts.el) : opts.el;
    const cont = !!opts.continuous;
    host.classList.add("block");
    const tipFr = cont
      ? "À 1×, le temps de la simulation s’écoule comme dans la réalité (1 s = 1 s). Descends en dessous pour passer au ralenti et tout observer."
      : "Nombre d’étapes calculées chaque seconde. Baisse-le pour suivre la construction étape par étape.";
    const tipEn = cont
      ? "At 1×, simulation time flows like reality (1 s = 1 s). Go below it for slow-motion to observe everything."
      : "How many steps are computed each second. Lower it to follow the construction step by step.";
    host.innerHTML =
      '<div class="simctrl">' +
        '<div class="clock"><div class="clock-main" id="sk-main">—</div><div class="clock-sub" id="sk-sub"></div></div>' +
        '<div class="transport">' +
          '<button class="mini primary" id="sk-play" type="button"></button>' +
          '<button class="mini ghost" id="sk-step" type="button"></button>' +
          '<button class="mini ghost" id="sk-reset" type="button"></button>' +
        '</div>' +
        '<div class="ctrl" data-tip-fr="' + tipFr + '" data-tip-en="' + tipEn + '">' +
          '<label><span data-fr="Vitesse de simulation" data-en="Simulation speed">Vitesse de simulation</span><span class="val" id="sk-spv"></span></label>' +
          '<input type="range" id="sk-speed" />' +
        '</div>' +
      '</div>';

    const playBtn = host.querySelector("#sk-play"), stepBtn = host.querySelector("#sk-step"), resetBtn = host.querySelector("#sk-reset");
    const speed = host.querySelector("#sk-speed"), spv = host.querySelector("#sk-spv");
    const mainEl = host.querySelector("#sk-main"), subEl = host.querySelector("#sk-sub");

    const sp = opts.speed || {};
    speed.min = sp.min != null ? sp.min : 0.1;
    speed.max = sp.max != null ? sp.max : 3;
    speed.step = sp.step != null ? sp.step : 0.1;
    let speedMul = sp.value != null ? sp.value : 0.4;
    speed.value = speedMul;

    let playing = opts.autoplay !== false, simTime = 0, stepCount = 0, acc = 0, last = performance.now(), hidden = false;

    function setSpv() { spv.textContent = "×" + (speedMul >= 1 ? speedMul.toFixed(1) : speedMul.toFixed(2)); }
    function setLabels() {
      playBtn.innerHTML = playing ? "❚❚ " + t("Pause", "Pause") : "▶ " + t("Lecture", "Play");
      stepBtn.innerHTML = "⏭ " + t("Pas à pas", "Step");
      resetBtn.innerHTML = "↺ " + t("Reset", "Reset");
    }
    setSpv(); setLabels();
    document.addEventListener("antsa:lang", () => { setLabels(); readout(); });

    speed.addEventListener("input", () => { speedMul = parseFloat(speed.value); setSpv(); });
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
