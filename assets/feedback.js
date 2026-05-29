/* antsamath — notation (étoiles) + forum (Giscus) sous chaque simulation.
   Inclure APRÈS config.js, common.js et sim.js. Cible : <section id="feedback">. */
(function () {
  const A = window.Antsa;
  if (!A) return;
  const host = document.getElementById("feedback");
  if (!host) return;

  let p = location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");
  const ID = window.ARTIFACT_ID || p.split("/").pop() || "artifact";
  const RKEY = "antsamath-rating-" + ID;
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88-5-4.87 7.1-1.01z"/></svg>';

  host.innerHTML =
    '<div class="block">' +
      '<h3><span class="ic">★</span><span data-fr="Ta note" data-en="Your rating">Ta note</span></h3>' +
      '<div class="stars" id="fb-stars">' +
        [1, 2, 3, 4, 5].map(n => '<button type="button" data-n="' + n + '" aria-label="' + n + '/5">' + STAR + '</button>').join("") +
      '</div>' +
      '<div class="rate-note" id="fb-note"></div>' +
    '</div>' +
    '<div class="block">' +
      '<h3><span class="ic">💬</span><span data-fr="Discussion" data-en="Discussion">Discussion</span></h3>' +
      '<div class="giscus-mount" id="fb-giscus"></div>' +
    '</div>';

  /* ---- étoiles (note du visiteur, mémorisée) ---- */
  const starsEl = host.querySelector("#fb-stars");
  const note = host.querySelector("#fb-note");
  let rating = parseInt(localStorage.getItem(RKEY), 10) || 0;
  function paint(n) { starsEl.querySelectorAll("button").forEach(b => b.classList.toggle("fill", parseInt(b.dataset.n, 10) <= n)); }
  function showNote() {
    note.innerHTML = rating
      ? A.t("Merci ! Ta note : ", "Thanks! Your rating: ") + "<b>" + rating + "/5</b>"
      : A.t("Clique sur une étoile pour noter cette simulation.", "Click a star to rate this simulation.");
  }
  starsEl.querySelectorAll("button").forEach(b => {
    const n = parseInt(b.dataset.n, 10);
    b.addEventListener("mouseenter", () => paint(n));
    b.addEventListener("click", () => { rating = n; localStorage.setItem(RKEY, n); paint(n); showNote(); });
  });
  starsEl.addEventListener("mouseleave", () => paint(rating));
  paint(rating); showNote();
  document.addEventListener("antsa:lang", showNote);

  /* ---- forum (Giscus si configuré, sinon encart) ---- */
  const g = (window.CONFIG && window.CONFIG.giscus) || {};
  const mount = host.querySelector("#fb-giscus");
  if (g.repo && g.repoId && g.categoryId) {
    const s = document.createElement("script");
    s.src = "https://giscus.app/client.js";
    s.setAttribute("data-repo", g.repo);
    s.setAttribute("data-repo-id", g.repoId);
    s.setAttribute("data-category", g.category || "General");
    s.setAttribute("data-category-id", g.categoryId);
    s.setAttribute("data-mapping", "specific");
    s.setAttribute("data-term", ID);
    s.setAttribute("data-strict", "0");
    s.setAttribute("data-reactions-enabled", "1");
    s.setAttribute("data-emit-metadata", "0");
    s.setAttribute("data-input-position", "top");
    s.setAttribute("data-theme", A.getTheme() === "dark" ? "dark" : "light");
    s.setAttribute("data-lang", A.getLang());
    s.crossOrigin = "anonymous"; s.async = true;
    mount.appendChild(s);
    document.addEventListener("antsa:theme", e => {
      const f = document.querySelector("iframe.giscus-frame");
      if (f) f.contentWindow.postMessage({ giscus: { setConfig: { theme: e.detail.theme === "dark" ? "dark" : "light" } } }, "https://giscus.app");
    });
  } else {
    mount.innerHTML =
      '<div class="giscus-ph">' +
        '<p data-fr="Une question, une idée, un bug ? Viens en discuter :" data-en="A question, an idea, a bug? Come and discuss it:"></p>' +
        '<div class="ph-row">' +
          '<a class="pill-link" href="' + "https://www.facebook.com/share/18awvnN48U/" + '" target="_blank" rel="noopener">Facebook · Mathmantique</a>' +
          '<a class="pill-link" href="mailto:antsamath.cdf@gmail.com?subject=' + encodeURIComponent("Discussion : " + ID) + '">Email</a>' +
        '</div>' +
      '</div>';
  }

  A.applyLang(document);
})();
