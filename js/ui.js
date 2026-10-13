/* Composants d'écran communs : en-tête de page, anneau de progression, barre d'avancement, sélecteur de séance, graphiques. */
import { esc, dateCourte } from "./outils.js";
import { ico } from "./icones.js";
import * as M from "./modele.js";

/** En-tête d'une page : tuile d'icône (teinte), surtitre « RÉVISER · 05 », titre, et à droite les onglets. */
export function entete({ icone, teinte, surtitre, titre, droite = "", classe = "" }) {
  return `<header class="entete-page ${classe}">${icone ? `<div class="tuile-entete" style="--teinte:${teinte || "var(--accent)"}">${ico(icone, 2)}</div>` : ""}
<div class="entete-textes"><div class="surtitre">${esc(surtitre)}</div><h1 class="titre">${esc(titre)}</h1></div>${droite ? `<div class="entete-droite">${droite}</div>` : ""}</header>`;
}
/** Piste d'onglets : [{ id, libelle, icone, href }] */
export function piste(onglets, actif, o = {}) {
  return `<nav class="piste${o.classe ? " " + o.classe : ""}" role="tablist">${onglets.map(x =>
    `<a class="onglet${x.id === actif ? " actif" : ""}" role="tab" aria-selected="${x.id === actif}" href="${x.href}"${o.remplacer ? " data-remplacer" : ""}>${x.icone ? ico(x.icone, 1.9) : ""}<span>${esc(x.libelle)}</span></a>`).join("")}</nav>`;
}
/** Anneau de progression : part de 0 à 1, couleur CSS, taille en px, épaisseur, texte au centre. */
export function anneau(part, { couleur = "var(--bleu)", taille = 100, epaisseur = 10, texte, sous = "", taillePolice = 21, classe = "" } = {}) {
  const p = Math.max(0, Math.min(1, part || 0));
  const r = 50 - epaisseur / 2 - 1, c = 2 * Math.PI * r;
  const valeur = texte != null ? texte : Math.round(p * 100) + " %";
  return `<div class="anneau ${classe}" style="width:${taille}px;height:${taille}px">
<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--piste)" stroke-width="${epaisseur}"/>
${p > 0 ? `<circle cx="50" cy="50" r="${r}" fill="none" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linecap="round" stroke-dasharray="${Math.max(0.01, p * c).toFixed(2)} ${c.toFixed(2)}"/>` : ""}</svg>
<div class="valeur" style="font-size:${taillePolice}px">${esc(valeur)}${sous ? `<small>${esc(sous)}</small>` : ""}</div></div>`;
}
export function barre(part, classe = "") { return `<div class="avancement ${classe}"><i style="width:${Math.round(Math.max(0, Math.min(1, part || 0)) * 100)}%"></i></div>`; }

/** Nom d'une séance dans un menu : « 26 oct · Régression linéaire », « Plus loin 1 · … », « 2 nov · Examen intra ». */
export function nomMenu(s) { return `${M.dateCourteSeance(s)} · ${s.titre}`; }
/**
 * Sélecteur de séance : ◀ [menu déroulant] ▶. seances : liste ; actuelle ; routeDe(s) → lien. Les séances facultatives sont groupées.
 */
export function selecteurSeance(seances, actuelle, routeDe, o = {}) {
  const i = seances.indexOf(actuelle);
  const prec = i > 0 ? seances[i - 1] : null, suiv = i >= 0 && i < seances.length - 1 ? seances[i + 1] : null;
  const fleche = (s, dir) => s
    ? `<a class="fleche-seance" href="${routeDe(s)}" data-remplacer data-sens="${dir}" aria-label="${dir < 0 ? "Séance précédente" : "Séance suivante"} : ${esc(nomMenu(s))}">${ico(dir < 0 ? "chevronGauche" : "chevronDroit", 2.4)}</a>`
    : `<span class="fleche-seance inactive" aria-hidden="true">${ico(dir < 0 ? "chevronGauche" : "chevronDroit", 2.4)}</span>`;
  const options = (liste) => liste.map(s => `<option value="${esc(routeDe(s))}"${s === actuelle ? " selected" : ""}>${esc(nomMenu(s))}</option>`).join("");
  const datees = seances.filter(s => !s.estFacultative), fac = seances.filter(s => s.estFacultative);
  const droite = o.detail ? o.detail(actuelle) : (actuelle ? actuelle.court : "");
  return `<div class="selecteur-seance">${fleche(prec, -1)}
<label class="menu-seance"><span class="vh">Séance</span><span class="menu-texte"><b>${esc(actuelle ? nomMenu(actuelle) : "")}</b><span class="menu-detail">${esc(droite || "")}</span>${ico("chevronBas", 2.2)}</span>
<select data-route-select aria-label="Choisir une séance">${options(datees)}${fac.length ? `<optgroup label="Pour aller plus loin">${options(fac)}</optgroup>` : ""}</select></label>
${fleche(suiv, 1)}</div>`;
}
/** Liens « Diapos » et « Exercices » d'une séance. */
export function liensSeance(s, API) {
  if (!s || s.estExamen) return "";
  const l = [];
  if (M.jeuxDe(s).length) l.push(`<a class="lien" href="${API.lien("diapos", s.cle)}">${ico("diapo", 1.9)}Diapos</a>`);
  if (M.devoirsDe(s).length) l.push(`<a class="lien" href="${API.lien("diapos", s.cle, "exercices")}">${ico("crayon", 1.9)}Exercices</a>`);
  return l.length ? `<div class="liens-seance">${l.join("")}</div>` : "";
}
export function lierSelecteurs(racine, API) {
  for (const s of racine.querySelectorAll("select[data-route-select]")) s.addEventListener("change", () => API.naviguer(s.value, { remplacer: true }));
}

/* ---------- Graphiques ---------- */
/** Courbe(s) de parts (0 à 1) au fil des jours : series = [{ points:[{jour, part}], couleur, nom }]. */
export function courbe(series, { hauteur = 200, largeur = 560 } = {}) {
  const tous = series.flatMap(s => s.points.map(p => p.jour));
  if (!tous.length) return `<div class="vide-graphique">Fais un premier QCM : ta courbe apparaîtra ici.</div>`;
  const jours = [...new Set(tous)].sort();
  const t = j => new Date(j + "T12:00").getTime();
  const t0 = t(jours[0]), t1 = t(jours[jours.length - 1]);
  const g = 44, d = 26, h = 14, b = 30, W = largeur, H = hauteur;
  const X = j => (t1 === t0 ? (g + W - d) / 2 : g + (t(j) - t0) / (t1 - t0) * (W - g - d));
  const Y = p => h + (1 - p) * (H - h - b);
  let s = `<svg class="courbe" viewBox="0 0 ${W} ${H}" role="img">`;
  for (const v of [0, 0.25, 0.5, 0.75, 1]) s += `<line x1="${g}" x2="${W - d}" y1="${Y(v)}" y2="${Y(v)}" class="grille"/><text x="${g - 8}" y="${Y(v) + 4}" text-anchor="end" class="axe">${v * 100} %</text>`;
  const marques = jours.length <= 6 ? jours : jours.filter((_, i) => i % Math.ceil(jours.length / 6) === 0 || i === jours.length - 1);
  for (const j of marques) { const [, m, jj] = j.split("-"); s += `<text x="${X(j)}" y="${H - 8}" text-anchor="middle" class="axe">${+jj}/${+m}</text>`; }
  for (const se of series) {
    if (!se.points.length) continue;
    const pts = se.points.map(p => `${X(p.jour).toFixed(1)},${Y(p.part).toFixed(1)}`).join(" ");
    s += `<polyline points="${pts}" fill="none" stroke="${se.couleur}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const p of se.points) s += `<circle cx="${X(p.jour)}" cy="${Y(p.part)}" r="4" fill="var(--surface)" stroke="${se.couleur}" stroke-width="2.4"/>`;
    const der = se.points[se.points.length - 1];
    s += `<circle cx="${X(der.jour)}" cy="${Y(der.part)}" r="6" fill="${se.couleur}"/>`;
    if (se.etiquette !== false) s += `<text x="${Math.min(X(der.jour), W - d - 4)}" y="${Y(der.part) - 12}" text-anchor="end" class="valeur-courbe">${Math.round(der.part * 100)} %</text>`;
  }
  return s + "</svg>";
}
export function legende(series) {
  return `<div class="legende">${series.map(s => `<span><i style="background:${s.couleur}"></i>${esc(s.nom)}</span>`).join("")}</div>`;
}
export const dateMenu = dateCourte;
