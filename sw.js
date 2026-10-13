/* Service worker de Statosphère : l'application (coquille) en cache à chaque version, le contenu chiffré servi depuis le cache
   rempli par la page (« Préparation hors ligne »). Tout marche ensuite sans réseau. */
const VERSION = "1.9.0-2757d1c322";
const COQUILLE = ["./","cle.json","css/autres.css","css/base.css","css/composants.css","css/coquille.css","css/ecrans.css","css/jetons.css","css/plan.css","css/reviser.css","d/index.bin","fonts/Cascadia-OFL.txt","fonts/CascadiaMono-Regular.ttf","fonts/Lato-Black.ttf","fonts/Lato-Bold.ttf","fonts/Lato-Regular.ttf","fonts/OFL.txt","icones/apple-touch-icon.png","icones/icone-192.png","icones/icone-32.png","icones/icone-512.png","icones/icone-masque-512.png","icones/logo.svg","js/app.js","js/contenu.js","js/dessins.js","js/ecrans/accueil.js","js/ecrans/catalogue.js","js/ecrans/coder-r.js","js/ecrans/diapos.js","js/ecrans/jeux.js","js/ecrans/outils.js","js/ecrans/plan.js","js/ecrans/raccourcis.js","js/ecrans/reglages.js","js/ecrans/reviser.js","js/etat.js","js/icones.js","js/modele.js","js/moteur.js","js/outils.js","js/plan.js","js/positron.js","js/rendu.js","js/sigma.js","js/tuteur.js","js/ui.js","lib/katex/LICENSE","lib/katex/fonts/KaTeX_AMS-Regular.woff2","lib/katex/fonts/KaTeX_Caligraphic-Bold.woff2","lib/katex/fonts/KaTeX_Caligraphic-Regular.woff2","lib/katex/fonts/KaTeX_Fraktur-Bold.woff2","lib/katex/fonts/KaTeX_Fraktur-Regular.woff2","lib/katex/fonts/KaTeX_Main-Bold.woff2","lib/katex/fonts/KaTeX_Main-BoldItalic.woff2","lib/katex/fonts/KaTeX_Main-Italic.woff2","lib/katex/fonts/KaTeX_Main-Regular.woff2","lib/katex/fonts/KaTeX_Math-BoldItalic.woff2","lib/katex/fonts/KaTeX_Math-Italic.woff2","lib/katex/fonts/KaTeX_SansSerif-Bold.woff2","lib/katex/fonts/KaTeX_SansSerif-Italic.woff2","lib/katex/fonts/KaTeX_SansSerif-Regular.woff2","lib/katex/fonts/KaTeX_Script-Regular.woff2","lib/katex/fonts/KaTeX_Size1-Regular.woff2","lib/katex/fonts/KaTeX_Size2-Regular.woff2","lib/katex/fonts/KaTeX_Size3-Regular.woff2","lib/katex/fonts/KaTeX_Size4-Regular.woff2","lib/katex/fonts/KaTeX_Typewriter-Regular.woff2","lib/katex/katex.min.css","lib/katex/katex.min.js","manifest.webmanifest"];
const CACHE_COQUILLE = "statosphere-coquille-" + VERSION;
const CACHE_CONTENU = "statosphere-contenu";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE_COQUILLE).then(c => c.addAll(COQUILLE.map(u => new Request(u, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const nom of await caches.keys()) if (nom.startsWith("statosphere-coquille-") && nom !== CACHE_COQUILLE) await caches.delete(nom);
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => {
  if (e.data && e.data.type === "ACTIVER") self.skipWaiting();
  if (e.data && e.data.type === "VERSION" && e.ports[0]) e.ports[0].postMessage(VERSION);
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const portee = new URL(self.registration.scope);
  const chemin = url.pathname.startsWith(portee.pathname) ? url.pathname.slice(portee.pathname.length) : url.pathname;

  // Pages : toujours la coquille en cache (l'application s'ouvre sans réseau).
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(CACHE_COQUILLE);
      return (await c.match("./")) || fetch(req);
    })());
    return;
  }
  // Contenu chiffré : cache du contenu, sinon réseau.
  if (/^d\/[0-9a-f]{32}\.bin$/.test(chemin)) {
    e.respondWith((async () => {
      const c = await caches.open(CACHE_CONTENU);
      return (await c.match(req.url)) || fetch(req);
    })());
    return;
  }
  // Coquille : cache de la version, sinon réseau.
  e.respondWith((async () => {
    const c = await caches.open(CACHE_COQUILLE);
    return (await c.match(req, { ignoreSearch: true })) || fetch(req);
  })());
});
