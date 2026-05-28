/* antsamath — logique partagée : langue, filtres, galerie */
(function () {
  const LANG_KEY = "antsamath-lang";
  let LANG = localStorage.getItem(LANG_KEY) || "fr";
  let activeCat = "all";
  const cardRefs = [];
  let toastT;

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildFilters(container) {
    if (!container) return;
    CATS.forEach(c => {
      const b = el("button", "chip" + (c.id === "all" ? " active" : ""));
      b.type = "button";
      b.dataset.cat = c.id;
      b.dataset.fr = c.fr;
      b.dataset.en = c.en;
      b.textContent = c[LANG];
      b.addEventListener("click", () => {
        activeCat = c.id;
        container.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x.dataset.cat === c.id));
        applyFilter();
      });
      container.appendChild(b);
    });
  }

  function applyFilter() {
    cardRefs.forEach(({ wrap, m }) => {
      wrap.classList.toggle("is-hidden", !(activeCat === "all" || m.cat === activeCat));
    });
  }

  function buildGallery(container) {
    if (!container) return;
    MODULES.forEach((m, i) => {
      const a = el("a", "card");
      a.href = "#";
      a.dataset.cat = m.cat;
      a.style.setProperty("--c", m.color);
      a.style.setProperty("--i", i);
      a.innerHTML =
        '<div class="thumb"><canvas></canvas><span class="num">' + String(i + 1).padStart(2, "0") + '</span></div>' +
        '<div class="cbody">' +
          '<div class="ctop">' +
            '<span class="formula">' + m.formula + '</span>' +
            '<span class="level" title="niveau">' + "●".repeat(m.level) + "○".repeat(3 - m.level) + '</span>' +
          '</div>' +
          '<h3 class="ctitle"></h3>' +
          '<p class="cdesc"></p>' +
          '<span class="copen"><span class="copen-txt"></span><span class="copen-arr">→</span></span>' +
        '</div>';
      a.addEventListener("click", e => { e.preventDefault(); toast(); });
      container.appendChild(a);
      cardRefs.push({
        wrap: a, m,
        titleEl: a.querySelector(".ctitle"),
        descEl: a.querySelector(".cdesc"),
        openEl: a.querySelector(".copen-txt")
      });
      mountSketch(a.querySelector("canvas"), m.sketch, m.color, { fps: 30 });
    });
  }

  function applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll("[data-fr]").forEach(e => {
      const v = e.dataset[LANG];
      if (e.hasAttribute("data-html")) e.innerHTML = v; else e.textContent = v;
    });
    cardRefs.forEach(r => {
      r.titleEl.textContent = r.m[LANG].title;
      r.descEl.textContent = r.m[LANG].desc;
      r.openEl.textContent = LANG === "fr" ? "Ouvrir" : "Open";
    });
    document.querySelectorAll(".langbtn").forEach(b => {
      const other = LANG === "fr" ? "EN" : "FR";
      b.textContent = other;
      b.setAttribute("aria-label", LANG === "fr" ? "Switch to English" : "Passer en français");
    });
  }

  function toggleLang() {
    LANG = LANG === "fr" ? "en" : "fr";
    localStorage.setItem(LANG_KEY, LANG);
    applyLang();
  }

  function toast() {
    let t = document.querySelector(".toast");
    if (!t) { t = el("div", "toast"); document.body.appendChild(t); }
    t.textContent = LANG === "fr"
      ? "✦ Module en préparation — bientôt jouable !"
      : "✦ Module in the works — playable soon!";
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2200);
  }

  function initPage(hero) {
    buildFilters(document.getElementById("filters"));
    buildGallery(document.getElementById("gallery"));
    document.querySelectorAll(".langbtn").forEach(b => b.addEventListener("click", toggleLang));
    applyLang();
    if (hero) {
      const c = document.getElementById("hero-canvas");
      if (c) mountSketch(c, hero.sketch, hero.colors, { fps: hero.fps || 60 });
    }
  }

  window.initPage = initPage;
})();
