/* antsamath — données des modules (bilingue FR/EN) */
(function () {
  const CATS = [
    { id: "all",        fr: "Tout",          en: "All" },
    { id: "analyse",    fr: "Analyse",       en: "Analysis" },
    { id: "geometrie",  fr: "Géométrie",     en: "Geometry" },
    { id: "probas",     fr: "Probabilités",  en: "Probability" },
    { id: "dynamique",  fr: "Dynamique",     en: "Dynamics" },
    { id: "nombres",    fr: "Nombres",       en: "Numbers" }
  ];

  const MODULES = [
    {
      id: "fractales", sketch: "fractal", color: "#7C5CFF", cat: "geometrie", level: 2,
      formula: "z ↦ z² + c",
      fr: { title: "Fractales", desc: "Zoome à l’infini dans des motifs qui se répètent à toutes les échelles." },
      en: { title: "Fractals", desc: "Zoom forever into patterns that repeat at every scale." }
    },
    {
      id: "courbes", sketch: "curve", color: "#2E8BFF", cat: "analyse", level: 1,
      formula: "y = f(x)",
      fr: { title: "Courbes de fonctions", desc: "Fais bouger les paramètres et regarde la courbe danser." },
      en: { title: "Function Curves", desc: "Drag the parameters and watch the curve dance." }
    },
    {
      id: "pi", sketch: "approx", color: "#FF9F1C", cat: "nombres", level: 2,
      formula: "π ≈ 4·k⁄n",
      fr: { title: "Approximation de π", desc: "Lance des milliers de points au hasard pour estimer π." },
      en: { title: "Approximating π", desc: "Throw thousands of random points to estimate π." }
    },
    {
      id: "geometrie", sketch: "geometry", color: "#2EC4A6", cat: "geometrie", level: 1,
      formula: "a² + b² = c²",
      fr: { title: "Géométrie", desc: "Construis triangles et cercles, et vois les théorèmes en direct." },
      en: { title: "Geometry", desc: "Build triangles and circles, watch theorems come alive." }
    },
    {
      id: "probabilites", sketch: "proba", color: "#FF5DA2", cat: "probas", level: 2,
      formula: "P(X = k)",
      fr: { title: "Probabilités", desc: "Des milliers de tirages dessinent peu à peu la courbe en cloche." },
      en: { title: "Probability", desc: "Thousands of trials slowly draw the bell curve." }
    },
    {
      id: "chaos", sketch: "chaos", color: "#FF5247", cat: "dynamique", level: 3,
      formula: "δx₀ → ∞",
      fr: { title: "Théorie du chaos", desc: "Un double pendule : minuscule écart de départ, destin totalement différent." },
      en: { title: "Chaos Theory", desc: "A double pendulum: a tiny change, a wildly different fate." }
    },
    {
      id: "fibonacci", sketch: "sequence", color: "#5A6CFF", cat: "analyse", level: 1,
      formula: "φ = 1.618…",
      fr: { title: "Suite de Fibonacci", desc: "Le nombre d’or fait fleurir une spirale de graines parfaite." },
      en: { title: "Fibonacci", desc: "The golden ratio blooms a perfect spiral of seeds." }
    },
    {
      id: "trigo", sketch: "trig", color: "#18C2E8", cat: "analyse", level: 2,
      formula: "sin² + cos² = 1",
      fr: { title: "Trigonométrie", desc: "Le cercle qui tourne fabrique, point par point, la fonction sinus." },
      en: { title: "Trigonometry", desc: "The spinning circle builds the sine wave, point by point." }
    },
    {
      id: "algebre", sketch: "linalg", color: "#FF6B3D", cat: "geometrie", level: 3,
      formula: "v ↦ A·v",
      fr: { title: "Algèbre linéaire", desc: "Étire, tourne et déforme l’espace tout entier avec une matrice." },
      en: { title: "Linear Algebra", desc: "Stretch, rotate and warp all of space with a matrix." }
    },
    {
      id: "graphes", sketch: "graph", color: "#9B59FF", cat: "dynamique", level: 2,
      formula: "G = (V, E)",
      fr: { title: "Théorie des graphes", desc: "Des nœuds et des liens qui s’organisent tout seuls à l’écran." },
      en: { title: "Graph Theory", desc: "Nodes and links that arrange themselves on screen." }
    },
    {
      id: "automates", sketch: "automata", color: "#1FB36B", cat: "dynamique", level: 2,
      formula: "B3 / S23",
      fr: { title: "Automates cellulaires", desc: "Quelques règles toutes simples, et une vie complexe émerge." },
      en: { title: "Cellular Automata", desc: "A few simple rules, and complex life emerges." }
    },
    {
      id: "premiers", sketch: "primes", color: "#F4C20D", cat: "nombres", level: 3,
      formula: "2, 3, 5, 7, 11…",
      fr: { title: "Nombres premiers", desc: "La spirale d’Ulam révèle l’ordre caché des nombres premiers." },
      en: { title: "Prime Numbers", desc: "Ulam’s spiral reveals the hidden order of the primes." }
    }
  ];

  window.CATS = CATS;
  window.MODULES = MODULES;
})();
