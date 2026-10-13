/* Statosphère pour Safari (iPhone, iPad, Mac) : mot de passe du cours, coquille (barre latérale ou barre d'onglets), routeur,
   panneau de Sigma, préparation hors ligne et mise à jour. */
import * as Contenu from "./contenu.js";
import * as M from "./modele.js";
import * as E from "./etat.js";
import { C } from "./modele.js";
import { logo, tete } from "./dessins.js";
import { ico } from "./icones.js";
import { esc, jour, attendre } from "./outils.js";
import { hydrater } from "./rendu.js";
import { agirScript } from "./positron.js";
import * as Sigma from "./sigma.js";

export const NAV = [
  { num: "00", id: "accueil", libelle: "Accueil", route: "#/accueil" },
  { num: "01", id: "raccourcis", libelle: "Raccourcis", route: "#/raccourcis" },
  { num: "02", id: "catalogue", libelle: "Catalogue", route: "#/catalogue" },
  { num: "03", id: "outils", libelle: "Outils", route: "#/outils" },
  { num: "04", id: "diapos", libelle: "Diapositives des séances expliquées", court: "Diapos", route: "#/diapos" },
  { num: "05", id: "reviser", libelle: "Réviser", route: "#/reviser" },
  { num: "06", id: "coder-r", libelle: "Apprendre à coder avec R (Positron)", court: "Coder avec R", route: "#/coder-r" },
  { num: "07", id: "reglages", libelle: "Réglages", route: "#/reglages" },
  { num: "08", id: "plan", libelle: "Plan de révision", court: "Plan", route: "#/plan" },
  { num: "09", id: "jeux", libelle: "Jeux", route: "#/jeux" },
];
const ONGLETS_BAS = ["accueil", "diapos", "reviser", "plan"];
const ECRANS = {
  accueil: () => import("./ecrans/accueil.js"), raccourcis: () => import("./ecrans/raccourcis.js"), catalogue: () => import("./ecrans/catalogue.js"),
  outils: () => import("./ecrans/outils.js"), diapos: () => import("./ecrans/diapos.js"), reviser: () => import("./ecrans/reviser.js"),
  "coder-r": () => import("./ecrans/coder-r.js"), reglages: () => import("./ecrans/reglages.js"), plan: () => import("./ecrans/plan.js"), jeux: () => import("./ecrans/jeux.js"),
};
const racine = document.getElementById("app");
let vue = null, suite = null, sensEntree = 0, jeton = 0;

/* ---------- Thème ---------- */
export function appliquerTheme() {
  const t = E.REGLAGES.theme;
  if (t === "clair" || t === "sombre") document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
  const sombre = t === "sombre" || (t !== "clair" && matchMedia("(prefers-color-scheme: dark)").matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", sombre ? "#0A1219" : "#102A3A");
}
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", appliquerTheme);
appliquerTheme();

/* ---------- Petits services ---------- */
let minuteurToast = null;
export function toast(message) {
  let t = document.querySelector(".toast");
  if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = message;
  requestAnimationFrame(() => t.classList.add("visible"));
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => t.classList.remove("visible"), 2200);
}
export async function copier(texte, message = "Copié") {
  try { await navigator.clipboard.writeText(texte); toast(message); }
  catch (e) {
    const z = document.createElement("textarea"); z.value = texte; z.style.position = "fixed"; z.style.opacity = "0"; document.body.appendChild(z); z.select();
    try { document.execCommand("copy"); toast(message); } catch (x) { toast("Copie impossible"); }
    z.remove();
  }
}

/* ---------- Routes ---------- */
export function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [chemin, requete] = h.split("?");
  const segments = (chemin || "").split("/").filter(Boolean).map(decodeURIComponent);
  const query = {};
  if (requete) for (const p of requete.split("&")) { const [k, v] = p.split("="); query[decodeURIComponent(k)] = decodeURIComponent(v || ""); }
  return { ecran: segments[0] || "accueil", segments: segments.slice(1), query };
}
export function lien(...morceaux) { return "#/" + morceaux.filter(x => x != null && x !== "").map(x => encodeURIComponent(String(x))).join("/"); }
/** Va à une route ; remplacer : sans entrée d'historique (Précédent/Suivant d'une même vue). */
export function naviguer(h, o = {}) {
  if (o.sens) sensEntree = o.sens;
  if (h === location.hash) { rendre({ garder: o.garder }); return; }
  if (o.remplacer) { history.replaceState(null, "", h); rendre({ garder: o.garder }); }
  else location.hash = h;
}
/** Route d'une cible du tuteur. */
export function routeDe(c) {
  if (!c) return "#/accueil";
  switch (c.ecran) {
    case "diapos":
      if (c.onglet === "exercices") return lien("diapos", c.seance, "exercices", c.devoir);
      return lien("diapos", c.seance, c.jeu, c.diapo);
    case "reviser": {
      const o = c.onglet || "lecons";
      if (o === "lecons") return lien("reviser", "lecons", c.seance, c.chapitre, c.partie);
      if (o === "fiches" || o === "memoriser") return lien("reviser", o, c.seance, c.chapitre, c.carte);
      if (o === "qcm") return lien("reviser", "qcm", c.seance) + (c.serie ? `?serie=${encodeURIComponent(c.serie)}${c.chapitre != null ? "&chapitre=" + c.chapitre : ""}${c.serieQcm != null ? "&n=" + c.serieQcm : ""}` : "");
      return lien("reviser", o, c.seance);
    }
    case "catalogue": return lien("catalogue", c.notion);
    case "coder-r": return lien("coder-r", c.sujet);
    default: return lien(c.ecran);
  }
}
export function aller(c, serieQcm) { fermerSigma(); fermerPlus(); naviguer(routeDe(serieQcm != null ? { ...c, serieQcm } : c)); }

/* ---------- Coquille ---------- */
function itemNav(n, actif, classe = "nav-item") {
  return `<a class="${classe}" href="${n.route}"${actif ? ' aria-current="page"' : ""}>${ico("n" + n.num, 1.8)}<span>${esc(n.libelle)}</span><span class="num">${n.num}</span></a>`;
}
function encartHtml() {
  const e = M.encart(jour());
  return `<div class="encart"><button class="bouton" data-action="sigma">${tete("normal", { classe: "petite" })}<span>Demande à Sigma</span></button>` +
    (e.lib ? `<div class="sep"></div><div class="lib">${esc(e.lib)}</div><div class="txt">${esc(e.txt)}</div>` : "") + "</div>";
}
function marque(classe = "marque") {
  return `<a class="${classe}" href="#/accueil" aria-label="Statosphère, accueil">${logo("logo")}<span><span class="nom">Statosphère</span><span class="devise">Analyse causale et méthodes quantitatives avec R</span></span></a>`;
}
function coquille() {
  racine.className = "";
  racine.innerHTML = `
<aside class="barre-laterale" aria-label="Navigation">${marque()}<nav class="nav" id="nav"></nav><div id="encart"></div></aside>
<div class="contenu">
  <header class="entete-mobile" id="entete-mobile"></header>
  <div class="barre-haut"><button class="bouton-sigma" data-action="sigma">${tete("normal", { classe: "petite" })}<span>Demande à Sigma</span></button></div>
  <main class="ecran" id="ecran" tabindex="-1"></main>
</div>
<nav class="onglets-bas" id="onglets-bas" aria-label="Sections"></nav>
<div class="voile masque" id="voile"></div>
<div class="feuille-plus" id="feuille-plus" role="dialog" aria-label="Toutes les sections"></div>
<section class="panneau-sigma" id="panneau-sigma" aria-label="Professeur Sigma" aria-hidden="true"></section>`;
  Sigma.monter(document.getElementById("panneau-sigma"), { aller, fermer: fermerSigma, ecranCourant: () => vue ? { ecran: vue.ecran, onglet: vue.onglet } : { ecran: "accueil" } });
}
function majCoquille(ecranId) {
  const nav = document.getElementById("nav");
  if (!nav) return;
  nav.innerHTML = NAV.map(n => itemNav(n, n.id === ecranId)).join("");
  document.getElementById("encart").innerHTML = encartHtml();
  const n = NAV.find(x => x.id === ecranId) || NAV[0];
  const titre = (vue && vue.titreMobile) || n.court || n.libelle;
  const retour = vue && vue.retour;
  document.getElementById("entete-mobile").innerHTML =
    (retour ? `<button class="retour" data-action="retour" data-route="${esc(retour.route)}">${ico("chevronGauche", 2.4)}<span>${esc(retour.libelle)}</span></button>` : logo("logo"))
    + `<div class="titre-mobile">${esc(titre)}</div><button class="bouton-sigma" data-action="sigma" aria-label="Demande à Sigma">${tete("normal", { classe: "petite" })}<span>Demande à Sigma</span></button>`;
  const plusActif = !ONGLETS_BAS.includes(ecranId);
  document.getElementById("onglets-bas").innerHTML = ONGLETS_BAS.map(id => {
    const x = NAV.find(k => k.id === id);
    return `<a class="onglet-bas" href="${x.route}"${id === ecranId ? ' aria-current="page"' : ""}>${ico("n" + x.num, 1.9)}<span>${esc(x.court || x.libelle)}</span></a>`;
  }).join("") + `<button class="onglet-bas" data-action="plus"${plusActif ? ' aria-current="page"' : ""}>${ico("plus", 2)}<span>Plus</span></button>`;
}
function ouvrirPlus() {
  const f = document.getElementById("feuille-plus"), v = document.getElementById("voile");
  f.innerHTML = `<div class="poignee"></div>${marque()}<nav>${NAV.map(n => itemNav(n, vue && n.id === vue.ecran)).join("")}</nav>${encartHtml()}`;
  v.classList.remove("masque");
  requestAnimationFrame(() => { v.classList.add("ouvert"); f.classList.add("ouvert"); });
}
function fermerPlus() {
  const f = document.getElementById("feuille-plus"), v = document.getElementById("voile");
  if (!f) return;
  f.classList.remove("ouvert"); v.classList.remove("ouvert");
  setTimeout(() => { if (!f.classList.contains("ouvert")) v.classList.add("masque"); }, 260);
}
export function ouvrirSigma(question) {
  const p = document.getElementById("panneau-sigma"); if (!p) return;
  fermerPlus();
  p.classList.add("ouvert"); p.setAttribute("aria-hidden", "false");
  document.body.classList.add("sigma-ouvert");
  Sigma.ouvrir(vue ? { ecran: vue.ecran, onglet: vue.onglet } : { ecran: "accueil" }, question);
}
export function fermerSigma() {
  const p = document.getElementById("panneau-sigma"); if (!p || !p.classList.contains("ouvert")) return;
  p.classList.remove("ouvert"); p.setAttribute("aria-hidden", "true"); document.body.classList.remove("sigma-ouvert");
}

/* ---------- Rendu d'un écran ---------- */
export async function rendre(o = {}) {
  if (!C.pret) return;
  const r = route(), mon = ++jeton;
  const charger = ECRANS[r.ecran] || ECRANS.accueil;
  const y = window.scrollY;
  let v;
  try {
    const mod = await charger();
    v = await mod.default(r, API);
  } catch (e) {
    console.error(e);
    v = { ecran: r.ecran, html: `<div class="carte message">Cet écran ne s'ouvre pas pour l'instant.</div>` };
  }
  if (mon !== jeton) return;
  if (vue && vue.quitter) try { vue.quitter(); } catch (e) { /* rien */ }
  vue = v; vue.ecran = vue.ecran || r.ecran; suite = v.suite || null;
  const main = document.getElementById("ecran");
  main.innerHTML = v.html;
  majCoquille(vue.ecran);
  document.title = v.titreDocument ? `${v.titreDocument} · Statosphère` : "Statosphère";
  if (sensEntree) { main.classList.remove("entree-droite", "entree-gauche"); void main.offsetWidth; main.classList.add(sensEntree > 0 ? "entree-droite" : "entree-gauche"); }
  else main.classList.remove("entree-droite", "entree-gauche");
  sensEntree = 0;
  hydrater(main);
  if (o.garder) window.scrollTo(0, y); else if (!o.sansDefilement) window.scrollTo(0, 0);
  if (v.apres) try { v.apres(main); } catch (e) { console.error(e); }
}
export const API = { naviguer, aller, routeDe, lien, rendre, toast, copier, ouvrirSigma, fermerSigma, appliquerTheme, suiteActuelle: () => suite, poserSuite: s => { suite = s; } };

/* ---------- Précédent / Suivant : clavier et glissement ---------- */
function allerSuite(dir) {
  const f = suite && (dir < 0 ? suite.prec : suite.suiv);
  if (!f) return false;
  sensEntree = dir;
  if (typeof f === "function") f(); else naviguer(f, { remplacer: true, sens: dir });
  return true;
}
document.addEventListener("keydown", e => {
  if (e.key === "Escape") { if (document.querySelector(".plein-ecran")) return; fermerSigma(); fermerPlus(); return; }
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
  if (document.querySelector(".plein-ecran") || document.body.classList.contains("sigma-ouvert")) return;
  if (vue && vue.clavier && vue.clavier(e)) { e.preventDefault(); return; }
  const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
  if (d && allerSuite(d)) e.preventDefault();
});
(function glissement() {
  let x0 = null, y0 = null, dx = 0, actif = false, zone = null;
  const defilable = el => {
    for (; el && el !== document.body; el = el.parentElement) {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
      if (el.classList && (el.classList.contains("sans-glisser") || el.classList.contains("katex-display"))) return true;
      if (el.scrollWidth > el.clientWidth + 2) { const ov = getComputedStyle(el).overflowX; if (ov === "auto" || ov === "scroll") return true; }
    }
    return false;
  };
  document.addEventListener("touchstart", e => {
    x0 = null; actif = false; dx = 0;
    if (!suite || e.touches.length !== 1 || document.body.classList.contains("sigma-ouvert") || document.querySelector(".plein-ecran")) return;
    if (!e.target.closest || !e.target.closest("#ecran") || defilable(e.target)) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; zone = document.getElementById("ecran");
  }, { passive: true });
  document.addEventListener("touchmove", e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (!actif) { if (Math.abs(mx) > 14 && Math.abs(mx) > 1.4 * Math.abs(my)) actif = true; else if (Math.abs(my) > 14) { x0 = null; return; } else return; }
    dx = mx;
    const possible = dx < 0 ? suite.suiv : suite.prec;
    const d = possible ? dx * 0.4 : dx * 0.1;
    zone.style.transition = "none"; zone.style.transform = `translateX(${d}px)`; zone.style.opacity = String(Math.max(0.6, 1 - Math.abs(d) / 600));
  }, { passive: true });
  const fin = () => {
    if (x0 == null) return; x0 = null;
    const z = zone; if (!z) return;
    z.style.transition = "transform .18s, opacity .18s"; z.style.transform = ""; z.style.opacity = "";
    if (actif && Math.abs(dx) > 70) allerSuite(dx < 0 ? 1 : -1);
    actif = false;
  };
  document.addEventListener("touchend", fin);
  document.addEventListener("touchcancel", fin);
})();

/* ---------- Actions communes ---------- */
document.addEventListener("click", e => {
  const el = e.target.closest("[data-action]");
  if (!el) {
    const a = e.target.closest("a[href^='#/']");
    if (a && a.hasAttribute("data-remplacer")) { e.preventDefault(); naviguer(a.getAttribute("href"), { remplacer: true, sens: +a.getAttribute("data-sens") || 0 }); }
    else if (a) { fermerPlus(); fermerSigma(); }
    return;
  }
  const act = el.getAttribute("data-action");
  if (act === "sigma") { e.preventDefault(); ouvrirSigma(); }
  else if (act === "plus") ouvrirPlus();
  else if (act === "retour") { const r = el.getAttribute("data-route"); naviguer(r); }
  else if (act === "reveler") {
    const z = document.getElementById(el.getAttribute("data-cible"));
    if (z) { z.classList.toggle("ouverte"); el.classList.toggle("ouvert"); if (z.classList.contains("ouverte")) hydrater(z); }
  } else if (act === "copier") copier(el.getAttribute("data-texte") || "");
  else if (act === "script") agirScript(el.getAttribute("data-script"), API);
  else if (act === "suite") allerSuite(+el.getAttribute("data-dir"));
  else if (act === "aller-cible") { try { aller(JSON.parse(el.getAttribute("data-cible")), el.hasAttribute("data-serie") ? +el.getAttribute("data-serie") : undefined); } catch (x) { /* rien */ } }
});
document.addEventListener("click", e => { if (e.target.id === "voile") fermerPlus(); });
window.addEventListener("hashchange", () => { fermerPlus(); rendre(); });
document.addEventListener("statosphere:etat", e => {
  if (e.detail === "reglages") appliquerTheme();
  const enc = document.getElementById("encart"); if (enc && C.pret) enc.innerHTML = encartHtml();
});

/* ---------- Mot de passe ---------- */
function ecranVerrou(message) {
  document.title = "Statosphère — mot de passe";
  racine.className = "verrou";
  racine.innerHTML = `<div class="boite apparait">${logo("logo")}<h1>Statosphère</h1><div class="sous">Analyse causale et méthodes quantitatives avec R</div>
<form id="form-mdp" autocomplete="off"><label for="mdp">Mot de passe du cours</label>
<input class="champ" id="mdp" name="mdp" type="password" autocomplete="current-password" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" required>
<button class="bouton" type="submit">${ico("cadenas", 2)}Ouvrir</button><div class="message" id="message-mdp" role="status">${esc(message || "")}</div></form></div>`;
  const f = document.getElementById("form-mdp"), champ = document.getElementById("mdp"), msg = document.getElementById("message-mdp");
  setTimeout(() => champ.focus(), 50);
  f.addEventListener("submit", async ev => {
    ev.preventDefault();
    const b = f.querySelector("button");
    b.disabled = true; msg.className = "message ok"; msg.textContent = "Vérification…";
    let ok = false;
    try { ok = await Contenu.ouvrirAvecMotDePasse(champ.value); }
    catch (x) { msg.className = "message"; msg.textContent = navigator.onLine ? "Le site ne répond pas. Réessaie dans un instant." : "Connecte-toi à Internet pour la première ouverture."; b.disabled = false; return; }
    if (!ok) { msg.className = "message"; msg.textContent = "Mot de passe incorrect."; b.disabled = false; champ.select(); return; }
    demarrer();
  });
}

/* ---------- Préparation hors ligne ---------- */
let preparation = null;
function bandeau(html, classe = "") {
  let b = document.getElementById("bandeau-etat");
  if (!html) { if (b) b.remove(); return null; }
  if (!b) { b = document.createElement("div"); b.id = "bandeau-etat"; document.body.appendChild(b); }
  b.className = "bandeau-etat " + classe; b.innerHTML = html;
  return b;
}
export async function preparerHorsLigne(force = false) {
  if (preparation || !("caches" in window)) return;
  const etat = await Contenu.etatHorsLigne();
  if (!etat.manquants.length) { if (force) toast("Tout le cours est déjà disponible hors ligne."); return; }
  if (!navigator.onLine) return;
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* rien */ }
  const arret = new AbortController();
  preparation = arret;
  const maj = (fait, total) => {
    const p = Math.floor(100 * fait / total);
    bandeau(`${ico("nuage", 2)}<div class="jauge">Préparation hors ligne : ${p} %<div class="avancement"><i style="width:${p}%"></i></div></div>`, "preparation");
  };
  const ok = await Contenu.preparerHorsLigne(maj, arret.signal);
  preparation = null;
  if (ok) { bandeau(`${ico("coche", 2.4)}<div class="jauge">Prêt hors ligne : tout le cours est sur cet appareil.</div>`); setTimeout(() => bandeau(""), 3500); }
  else bandeau(`${ico("alerte", 2)}<div class="jauge">Préparation hors ligne interrompue.</div><button class="bouton" id="reprendre-prep">Reprendre</button><button class="fermer" aria-label="Fermer" id="fermer-prep">${ico("croix", 2)}</button>`);
  const r = document.getElementById("reprendre-prep"); if (r) r.onclick = () => { bandeau(""); preparerHorsLigne(true); };
  const fe = document.getElementById("fermer-prep"); if (fe) fe.onclick = () => bandeau("");
}
window.addEventListener("online", () => { if (C.pret) preparerHorsLigne(); });

/* ---------- Service worker et nouvelle version ---------- */
let attente = null;
function proposerMiseAJour(reg) {
  attente = reg.waiting;
  if (!attente || !C.pret) return;
  bandeau(`${ico("maj", 2)}<div class="jauge">Une nouvelle version de Statosphère est prête.</div><button class="bouton" id="maj">Mettre à jour</button>`, "maj");
  document.getElementById("maj").onclick = () => { attente.postMessage({ type: "ACTIVER" }); };
}
async function enregistrerSW() {
  if (!("serviceWorker" in navigator)) return;
  if (/[?&]dev\b/.test(location.search)) {
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register("sw.js", { scope: "./" });
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (recharge || !navigator.serviceWorker.controller) return; recharge = true; location.reload(); });
    if (reg.waiting && navigator.serviceWorker.controller) proposerMiseAJour(reg);
    reg.addEventListener("updatefound", () => {
      const n = reg.installing;
      n && n.addEventListener("statechange", () => { if (n.state === "installed" && navigator.serviceWorker.controller) proposerMiseAJour(reg); });
    });
    const verifier = () => { if (navigator.onLine) reg.update().catch(() => {}); };
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") verifier(); });
    setInterval(verifier, 30 * 60e3);
  } catch (e) { console.warn(e); }
}

/* ---------- Démarrage ---------- */
async function demarrer() {
  racine.className = "chargement";
  racine.innerHTML = `<div class="ouverture">${tete("normal", { anime: true })}<div>Ouverture du cours…</div></div>`;
  const t0 = performance.now();
  try { await M.charger(); console.info(`Cours ouvert en ${Math.round(performance.now() - t0)} ms`); }
  catch (e) {
    console.error(e);
    racine.innerHTML = `<div class="ouverture">${tete("reflechit")}<div>Le cours ne s'ouvre pas : ${navigator.onLine ? "réessaie dans un instant." : "connecte-toi à Internet une première fois pour le préparer."}</div><button class="bouton" onclick="location.reload()">Réessayer</button></div>`;
    return;
  }
  document.title = "Statosphère";
  coquille();
  if (!location.hash) history.replaceState(null, "", "#/accueil");
  await rendre();
  setTimeout(() => preparerHorsLigne(), 1200);
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(r => r && r.waiting && navigator.serviceWorker.controller && proposerMiseAJour(r));
}
async function init() {
  enregistrerSW();
  if (!window.crypto || !crypto.subtle || typeof DecompressionStream === "undefined") {
    racine.className = "verrou";
    racine.innerHTML = `<div class="boite">${logo("logo")}<h1>Statosphère</h1><div class="sous">Cette version de Safari est trop ancienne. Mets à jour iOS ou macOS, puis rouvre la page.</div></div>`;
    return;
  }
  let ok = false;
  try { ok = await Contenu.ouvrirAvecCleGardee(); } catch (e) { ok = false; }
  if (ok) demarrer(); else ecranVerrou();
}
export async function verrouiller() { await Contenu.oublierCle(); location.hash = ""; location.reload(); }
init();
