/* antsamath — utilitaires partagés : langue, thème (mode sombre), visites.
   Exposé sous window.Antsa. Utilisé par l'accueil ET par chaque artefact. */
(function () {
  const LANG_KEY = "antsamath-lang";
  const THEME_KEY = "antsamath-theme";
  const VISITS_KEY = "antsamath-visits";

  let lang = localStorage.getItem(LANG_KEY) || "fr";
  let theme = localStorage.getItem(THEME_KEY) || "light";

  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ----- LANGUE ----- */
  function getLang() { return lang; }
  function applyLang(root) {
    root = root || document;
    document.documentElement.lang = lang;
    root.querySelectorAll("[data-fr]").forEach(e => {
      const v = e.dataset[lang];
      if (v == null) return;
      if (e.hasAttribute("data-html")) e.innerHTML = v; else e.textContent = v;
    });
    document.querySelectorAll(".langbtn").forEach(b => {
      b.textContent = lang === "fr" ? "EN" : "FR";
      b.setAttribute("aria-label", lang === "fr" ? "Switch to English" : "Passer en français");
    });
    document.dispatchEvent(new CustomEvent("antsa:lang", { detail: { lang } }));
  }
  function toggleLang() {
    lang = lang === "fr" ? "en" : "fr";
    localStorage.setItem(LANG_KEY, lang);
    applyLang(document);
  }
  function t(fr, en) { return lang === "fr" ? fr : en; }

  /* ----- THÈME ----- */
  function applyTheme() {
    document.documentElement.dataset.theme = theme;
    document.querySelectorAll(".themebtn").forEach(b => {
      b.setAttribute("aria-label", theme === "dark" ? "Mode clair" : "Mode sombre");
    });
    document.dispatchEvent(new CustomEvent("antsa:theme", { detail: { theme } }));
  }
  function toggleTheme() {
    theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, theme);
    applyTheme();
  }
  function getTheme() { return theme; }

  /* ----- VISITES ----- */
  function getVisits() {
    try { return JSON.parse(localStorage.getItem(VISITS_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function recordVisit(id) {
    if (!id) return;
    const v = getVisits();
    v[id] = (v[id] || 0) + 1;
    localStorage.setItem(VISITS_KEY, JSON.stringify(v));
  }

  /* ----- CHROME (branche les boutons) ----- */
  function initChrome() {
    applyTheme();
    document.querySelectorAll(".langbtn").forEach(b => b.addEventListener("click", toggleLang));
    document.querySelectorAll(".themebtn").forEach(b => b.addEventListener("click", toggleTheme));
    applyLang(document);
    const nav = document.querySelector(".nav");
    if (nav) {
      const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 8);
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
  }

  window.Antsa = { el, getLang, applyLang, toggleLang, t, getTheme, toggleTheme, getVisits, recordVisit, initChrome };
})();
