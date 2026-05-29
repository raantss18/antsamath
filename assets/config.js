/* antsamath — configuration du site.
   ┌──────────────────────────────────────────────────────────────────────┐
   │  AJOUTER UNE SIMULATION                                                │
   │  1. Crée un dossier dans  artifacts/<mon-id>/                          │
   │  2. Dedans : un fichier  meta.json  (voir un artefact existant)        │
   │     et ta page  index.html.                                            │
   │  3. Détection automatique :                                            │
   │     • Option A (zéro config) : renseigne githubUser + githubRepo       │
   │       ci-dessous → le site liste tout seul le dossier artifacts/ via   │
   │       l'API GitHub. Tu n'as plus rien à toucher quand tu ajoutes.      │
   │     • Option B (repli) : ajoute l'id du dossier dans                   │
   │       artifacts/manifest.json. Marche partout, y compris en local.     │
   └──────────────────────────────────────────────────────────────────────┘ */

window.CONFIG = {
  // Renseigne ces deux champs pour la détection 100% automatique (Option A).
  // Laisse vide pour utiliser artifacts/manifest.json (Option B).
  githubUser: "",
  githubRepo: "",
  githubBranch: "main",

  topCount: 4,   // nb de cartes dans « Top simulations »
  newCount: 6,   // nb de cartes dans « Nouveau »

  // ─── FORUM / DISCUSSION (Giscus, adossé aux GitHub Discussions) ───
  // Pour activer le forum sous chaque simulation :
  //  1. Rends le dépôt public et active l'onglet "Discussions" sur GitHub.
  //  2. Installe l'app giscus : https://github.com/apps/giscus
  //  3. Va sur https://giscus.app, choisis ton dépôt → il te donne
  //     repoId et categoryId. Recopie-les ici. (mapping = "specific",
  //     chaque simulation a son propre fil via son identifiant de dossier.)
  giscus: {
    repo: "",          // ex: "antsamath/antsamath.github.io"
    repoId: "",        // ex: "R_kgD..."
    category: "General",
    categoryId: ""     // ex: "DIC_kwD..."
  },

  // Catégories proposées dans les filtres (doivent matcher meta.cat)
  cats: [
    { id: "all",       fr: "Tout",         en: "All" },
    { id: "analyse",   fr: "Analyse",      en: "Analysis" },
    { id: "geometrie", fr: "Géométrie",    en: "Geometry" },
    { id: "probas",    fr: "Probabilités", en: "Probability" },
    { id: "dynamique", fr: "Dynamique",    en: "Dynamics" },
    { id: "informatique", fr: "Informatique", en: "Computer science" },
    { id: "nombres",   fr: "Nombres",      en: "Numbers" }
  ]
};
