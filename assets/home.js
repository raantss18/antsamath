/* antsamath — accueil : découverte des artefacts + sections Top / Nouveau / Tous */
(function () {
  const A = window.Antsa;
  let MODS = [];
  let activeCat = "all";

  /* ---------- DÉCOUVERTE ---------- */
  async function discoverIds() {
    const c = window.CONFIG;
    if (c.githubUser && c.githubRepo) {
      try {
        const url = `https://api.github.com/repos/${c.githubUser}/${c.githubRepo}/contents/artifacts?ref=${c.githubBranch}`;
        const r = await fetch(url);
        if (r.ok) {
          const list = await r.json();
          const ids = list.filter(x => x.type === "dir").map(x => x.name);
          if (ids.length) return ids;
        }
      } catch (e) { /* repli manifest */ }
    }
    try {
      const r = await fetch("artifacts/manifest.json", { cache: "no-cache" });
      if (r.ok) return await r.json();
    } catch (e) { /* */ }
    return [];
  }

  async function loadMeta(id) {
    try {
      const r = await fetch(`artifacts/${id}/meta.json`, { cache: "no-cache" });
      if (!r.ok) return null;
      const m = await r.json();
      m.id = id;
      return m;
    } catch (e) { return null; }
  }

  /* ---------- CARTES ---------- */
  function buildCard(m, opts) {
    opts = opts || {};
    const a = A.el("a", "card");
    a.href = `artifacts/${m.id}/index.html`;
    a.dataset.cat = m.cat || "";
    a.style.setProperty("--c", m.color || "#FF6B3D");
    if (opts.delay) a.style.animationDelay = opts.delay + "ms";
    const lvl = Math.max(1, Math.min(3, m.level || 1));
    const visits = A.getVisits()[m.id] || 0;
    a.innerHTML =
      '<div class="thumb"><canvas></canvas>' +
        (opts.isNew ? '<span class="badge-new" data-fr="Nouveau" data-en="New">Nouveau</span>' : '') +
        (opts.rank ? '<span class="num">#' + opts.rank + '</span>' : '') +
      '</div>' +
      '<div class="cbody">' +
        '<div class="ctop">' +
          '<span class="formula">' + (m.formula || "") + '</span>' +
          '<span class="level">' + "●".repeat(lvl) + "○".repeat(3 - lvl) + '</span>' +
        '</div>' +
        '<h3 class="ctitle" data-fr="' + esc(m.fr.title) + '" data-en="' + esc(m.en.title) + '"></h3>' +
        '<p class="cdesc" data-fr="' + esc(m.fr.desc) + '" data-en="' + esc(m.en.desc) + '"></p>' +
        '<div class="ctop" style="margin:0">' +
          '<span class="copen"><span data-fr="Ouvrir" data-en="Open"></span><span class="arr">→</span></span>' +
          (opts.showVisits && visits ? '<span class="visits">' + visits + ' ▸</span>' : '') +
        '</div>' +
      '</div>';
    if (m.sketch && window.mountSketch) {
      try { mountSketch(a.querySelector("canvas"), m.sketch, m.color || "#FF6B3D", { fps: 30, hoverOnly: true }); }
      catch (e) { /* vignette non bloquante */ }
    }
    return a;
  }
  function esc(s) { return String(s || "").replace(/"/g, "&quot;"); }

  /* ---------- SECTIONS ---------- */
  function renderTop() {
    const wrap = document.getElementById("top");
    const grid = document.getElementById("grid-top");
    const hint = document.getElementById("top-hint");
    grid.innerHTML = "";
    const visits = A.getVisits();
    const ranked = MODS.filter(m => (visits[m.id] || 0) > 0)
      .sort((a, b) => (visits[b.id] || 0) - (visits[a.id] || 0))
      .slice(0, window.CONFIG.topCount);
    if (!ranked.length) { hint.style.display = ""; grid.style.display = "none"; }
    else {
      hint.style.display = "none"; grid.style.display = "";
      ranked.forEach((m, i) => grid.appendChild(buildCard(m, { rank: i + 1, showVisits: true, delay: i * 60 })));
    }
    wrap.style.display = "";
  }

  function renderNew() {
    const grid = document.getElementById("grid-new");
    grid.innerHTML = "";
    const byDate = [...MODS].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    const news = byDate.slice(0, window.CONFIG.newCount);
    news.forEach((m, i) => grid.appendChild(buildCard(m, { isNew: true, delay: i * 60 })));
    document.getElementById("nouveau").style.display = news.length ? "" : "none";
  }

  function renderAll() {
    const grid = document.getElementById("grid-all");
    grid.innerHTML = "";
    const byDate = [...MODS].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    byDate.forEach((m, i) => grid.appendChild(buildCard(m, { delay: i * 40 })));
    applyFilter();
    document.getElementById("count-all").textContent = MODS.length;
  }

  function buildFilters() {
    const box = document.getElementById("filters");
    box.innerHTML = "";
    window.CONFIG.cats.forEach(c => {
      const b = A.el("button", "chip" + (c.id === "all" ? " active" : ""));
      b.type = "button";
      b.dataset.cat = c.id; b.dataset.fr = c.fr; b.dataset.en = c.en;
      b.textContent = c[A.getLang()];
      b.addEventListener("click", () => {
        activeCat = c.id;
        box.querySelectorAll(".chip").forEach(x => x.classList.toggle("active", x.dataset.cat === c.id));
        applyFilter();
      });
      box.appendChild(b);
    });
  }
  function applyFilter() {
    document.querySelectorAll("#grid-all .card").forEach(card => {
      card.classList.toggle("is-hidden", !(activeCat === "all" || card.dataset.cat === activeCat));
    });
  }

  /* ---------- INIT ---------- */
  async function init() {
    A.initChrome();
    const heroCanvas = document.getElementById("hero-canvas");
    if (heroCanvas && window.mountSketch)
      mountSketch(heroCanvas, "heroLissajous", ["#FF6B3D", "#2E8BFF", "#FF9F1C", "#7C5CFF", "#2EC4A6"], { fps: 60 });

    const ids = await discoverIds();
    const metas = await Promise.all(ids.map(loadMeta));
    MODS = metas.filter(Boolean);

    const empty = document.getElementById("empty");
    const sections = document.getElementById("sections");
    if (!MODS.length) {
      empty.style.display = "";
      sections.style.display = "none";
      A.applyLang(document);
      return;
    }
    empty.style.display = "none";
    sections.style.display = "";
    buildFilters();
    renderTop();
    renderNew();
    renderAll();
    A.applyLang(document);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
