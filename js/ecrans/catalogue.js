/* 02 · Catalogue : les notions du cours, avec leurs formules (recherche sans accents, chapitres, séance, favoris, tri),
   et chaque notion décortiquée (ce que ça fait, comment la lire, chaque symbole, explication, en clair, exemple pas à pas, à retenir). */
import * as M from "../modele.js";
import * as E from "../etat.js";
import { C } from "../modele.js";
import { ico } from "../icones.js";
import { entete } from "../ui.js";
import { md, inl, tex, carteFormule, listeEtapes, encadre } from "../rendu.js";
import { esc, normaliser, insecables } from "../outils.js";

export function nomChapitre(ch) {
  if (ch == null) return "Notes de cours";
  if (C.lecons[ch]) return C.lecons[ch].titre;
  const e = ((C.catalogue && C.catalogue.entries) || []).find(x => x.chapitre === ch);
  return e ? e.categorie : `Chapitre ${ch}`;
}
let index = null;
function preparer() {
  if (index) return index;
  index = new Map();
  for (const e of C.catalogue.entries) index.set(e.id, { terme: normaliser(e.terme), meule: normaliser([e.terme, e.categorie, e.symbole, e.unicode, e.sortie, e.latex, e.explication, ...(e.codes || []), ...(e.motsCles || [])].join(" ")) });
  return index;
}
const usage = id => (E.position("usage." + id) || 0);
export function noterUsage(id) { E.retenirPosition("usage." + id, usage(id) + 1); }
const popularite = e => (e.rangPopularite > 0 ? e.rangPopularite : 1e9);
function chercher(requete, filtre, tri) {
  const ix = preparer();
  const brut = requete.trim(), mots = normaliser(brut).split(/\s+/).map(w => w.replace(/^;+/, "")).filter(Boolean);
  const cands = C.catalogue.entries.filter(filtre).filter(e => mots.every(w => ix.get(e.id).meule.includes(w)));
  if (!mots.length) {
    if (tri === "cours") return cands.slice().sort((a, b) => a.rangCours - b.rangCours || (a.id < b.id ? -1 : 1));
    if (tri === "az") return cands.slice().sort((a, b) => a.terme.localeCompare(b.terme, "fr-CA", { sensitivity: "base" }) || (a.id < b.id ? -1 : 1));
    return cands.slice().sort((a, b) => usage(b.id) - usage(a.id) || popularite(a) - popularite(b) || (a.id < b.id ? -1 : 1));
  }
  const phrase = mots.join(" "), symbole = brut.replace(/^;+/, "");
  const palier = e => ((e.codes || []).includes(phrase) || e.sortie === symbole || e.symbole === symbole ? 0 : ix.get(e.id).terme.startsWith(phrase) ? 1 : ix.get(e.id).terme.includes(phrase) ? 2 : 3);
  return cands.slice().sort((a, b) => palier(a) - palier(b) || usage(b.id) - usage(a.id) || popularite(a) - popularite(b) || (a.id < b.id ? -1 : 1));
}
export function mathml(latex) {
  try { return window.katex.renderToString(latex, { output: "mathml", throwOnError: false }).replace(/^<span class="katex">|<\/span>$/g, ""); } catch (e) { return latex; }
}

function detail(e, API) {
  const ch = e.chapitre;
  const sur = ch != null ? `CH. ${ch} · ${nomChapitre(ch).toUpperCase()}` : "NOTES DE COURS";
  const favori = E.estFavori(e.id);
  const associees = (e.associees || []).map(id => C.catalogue.entries.find(x => x.id === id)).filter(Boolean);
  const symboles = [...new Set([...String(e.unicode || "").normalize("NFC")].filter(ch => ch.charCodeAt(0) > 0x2af && !/[  ]/.test(ch)))];
  let h = `<div class="detail-notion"><div class="detail-tete"><div><div class="surtitre">${esc(sur)}</div><h2 class="titre-notion">${inl(e.terme)}</h2></div>
<button class="bouton secondaire petit" data-favori="${esc(e.id)}" aria-pressed="${favori}">${favori ? "★ Favori" : "☆ Favori"}</button></div>`;
  h += carteFormule({ latex: e.latex, ceQueCaFait: e.ceQueCaFait, lecture: e.lecture, symboles: e.symboles }, { classe: "notion" });
  h += `<div class="rangee boutons-copie"><button class="bouton" data-copier-formule>${ico("copier")}Copier la formule</button><button class="bouton secondaire" data-copier-word>Pour Word</button><button class="bouton secondaire" data-copier-latex>LaTeX</button></div>`;
  if (e.explication) h += `<div class="etiquette-section sec">EXPLICATION</div><div class="bloc-texte">${md(e.explication)}</div>`;
  if (e.enClair) h += `<div class="etiquette-section sec">EN CLAIR</div><div class="bloc-texte">${md(e.enClair)}</div>`;
  if (e.exemple) h += `<div class="etiquette-section sec">EXEMPLE PAS À PAS</div><p><strong>${inl(e.exemple.titre)}</strong></p>${listeEtapes(e.exemple.etapes)}`;
  if (e.aRetenir) h += `<div class="bandeau-retenir"><span>À RETENIR</span><div>${inl(e.aRetenir, { lecture: true, source: e.aRetenir })}</div></div>`;
  if (e.attention) h += encadre("attention", e.attention, "ATTENTION");
  if ((e.codes || []).length) h += `<div class="code-notion"><span class="etiquette-section">CODE</span><code class="c">;${esc(e.codes[0])}</code></div>`;
  if (associees.length) h += `<div class="etiquette-section sec">FORMULES ASSOCIÉES</div><div class="associees">${associees.map(a => `<a class="associee" href="${API.lien("catalogue", a.id)}" data-remplacer><b>${esc(a.terme)}</b><span class="formule-ligne">${tex(a.latex || a.unicode)}</span><small>${esc(a.chapitre != null ? `ch. ${a.chapitre}` : "")}</small></a>`).join("")}</div>`;
  if (symboles.length) h += `<div class="symboles-contenus"><span class="etiquette-section">SYMBOLES CONTENUS</span>${symboles.map(s => `<button class="chip-symbole" data-copier-symbole="${esc(s)}">${esc(s)}</button>`).join("")}</div>`;
  return h + "</div>";
}

export default async function catalogue(r, API) {
  const entrees = C.catalogue.entries;
  const id = r.segments[0];
  const q = r.query.q || "", tri = r.query.tri || "utilises", chap = r.query.ch || "", seance = r.query.s || "", fav = r.query.fav === "1";
  const chapitres = [...new Set(entrees.map(e => e.chapitre).filter(c => c != null))].sort((a, b) => a - b);
  const sChoisie = seance && M.trouver(seance);
  const filtre = e => (!chap || (chap === "notes" ? e.origine === "notes" : e.chapitre === +chap)) && (!sChoisie || (e.chapitre != null && sChoisie.chapitres.includes(e.chapitre))) && (!fav || E.estFavori(e.id));
  const resultats = chercher(q, filtre, tri);
  const choisie = (id && entrees.find(e => e.id === id)) || (window.matchMedia("(min-width: 900px)").matches ? resultats[0] : null);
  const requete = (o = {}) => { const p = { q, tri, ch: chap, s: seance, fav: fav ? "1" : "", ...o }; const s = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&"); return s ? "?" + s : ""; };
  const lienNotion = e => API.lien("catalogue", e.id) + requete();
  const filtres = `<div class="filtres-catalogue"><label class="recherche">${ico("recherche", 2)}<input class="champ" type="search" data-recherche value="${esc(q)}" placeholder="Rechercher : esperance, biais, σ…" aria-label="Rechercher dans le catalogue" enterkeyhint="search" autocomplete="off"></label>
<select class="champ" data-filtre="ch" aria-label="Chapitre"><option value="">Chapitres : Tous</option>${chapitres.map(c => `<option value="${c}"${String(c) === chap ? " selected" : ""}>${String(c).padStart(2, "0")} ${esc(nomChapitre(c))}</option>`).join("")}<option value="notes"${chap === "notes" ? " selected" : ""}>Notes de cours</option></select>
<select class="champ" data-filtre="s" aria-label="Séance"><option value="">Toutes les séances</option>${C.seances.filter(s => !s.estExamen).map(s => `<option value="${esc(s.cle)}"${s.cle === seance ? " selected" : ""}>${esc(`${M.dateCourteSeance(s)} · ${s.titre}`)}</option>`).join("")}</select>
<button class="puce${fav ? " actif" : ""}" data-fav aria-pressed="${fav}">★ Favoris</button>
<select class="champ tri" data-filtre="tri" aria-label="Tri"><option value="utilises"${tri === "utilises" ? " selected" : ""}>Plus utilisés</option><option value="cours"${tri === "cours" ? " selected" : ""}>Ordre du cours</option><option value="az"${tri === "az" ? " selected" : ""}>A → Z</option></select></div>`;
  const compte = resultats.length && resultats.length !== entrees.length ? `<div class="attenue petit compte">${resultats.length === 1 ? "1 résultat" : `${resultats.length} résultats`}</div>` : "";
  const liste = resultats.length ? `<ul class="liste-notions">${resultats.map(e => `<li><a class="item-notion${choisie && e.id === choisie.id ? " courant" : ""}" href="${lienNotion(e)}" data-remplacer>
<span class="badge-chap">${e.chapitre != null ? String(e.chapitre).padStart(2, "0") : "NC"}</span><span class="item-texte"><b>${esc(e.terme)}</b><span class="formule-ligne">${esc(e.unicode)}</span><small>${esc(e.categorie)}</small></span></a></li>`).join("")}</ul>`
    : `<div class="carte message"><div>Aucune notion ne correspond. Essaie un autre mot, un autre chapitre, une autre séance, ou retire le filtre des favoris.</div></div>`;
  const tete = entete({ surtitre: "CATALOGUE · 02", titre: "Les notions du cours, avec leurs formules" });
  const mobileDetail = !!(id && choisie);
  const html = `${mobileDetail ? "" : ""}<div class="catalogue${mobileDetail ? " avec-detail" : ""}">${tete}${filtres}${compte}<div class="catalogue-corps"><div class="colonne-liste">${liste}</div><div class="colonne-detail">${choisie ? detail(choisie, API) : ""}</div></div></div>`;
  return {
    ecran: "catalogue", titreDocument: "Catalogue", titreMobile: mobileDetail ? "Notion" : "Catalogue",
    retour: mobileDetail && !window.matchMedia("(min-width: 900px)").matches ? { route: "#/catalogue" + requete(), libelle: "Catalogue" } : null,
    html,
    apres(main) {
      const champ = main.querySelector("[data-recherche]");
      let minuteur = null;
      champ.addEventListener("input", () => { clearTimeout(minuteur); minuteur = setTimeout(() => { const v = champ.value; history.replaceState(null, "", "#/catalogue" + requete({ q: v })); API.rendre({ garder: true, sansDefilement: true }).then(() => { const c = document.querySelector("[data-recherche]"); if (c) { c.focus(); c.setSelectionRange(v.length, v.length); } }); }, 180); });
      for (const s of main.querySelectorAll("[data-filtre]")) s.addEventListener("change", () => API.naviguer("#/catalogue" + requete({ [s.getAttribute("data-filtre")]: s.value }), { remplacer: true }));
      main.querySelector("[data-fav]").addEventListener("click", () => API.naviguer("#/catalogue" + requete({ fav: fav ? "" : "1" }), { remplacer: true }));
      const courant = main.querySelector(".item-notion.courant"); if (courant) courant.scrollIntoView({ block: "nearest" });
      if (!choisie) return;
      const f = main.querySelector("[data-favori]"); if (f) f.addEventListener("click", () => { E.basculerFavori(choisie.id); API.rendre({ garder: true }); });
      const copie = (texte, msg) => { noterUsage(choisie.id); API.copier(texte, msg); };
      main.querySelector("[data-copier-formule]").addEventListener("click", () => copie(choisie.sortie || choisie.unicode, "Formule copiée"));
      main.querySelector("[data-copier-word]").addEventListener("click", () => copie(mathml(choisie.latex), "Copiée pour Word : elle se collera comme une vraie équation."));
      main.querySelector("[data-copier-latex]").addEventListener("click", () => copie(choisie.latex, "LaTeX copié"));
      for (const b of main.querySelectorAll("[data-copier-symbole]")) b.addEventListener("click", () => API.copier(b.getAttribute("data-copier-symbole"), "Symbole copié"));
    },
  };
}
