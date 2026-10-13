/* 00 · Accueil : tableau de bord (bandeau de Sigma, anneaux de progression, conseil de Sigma, prochaines échéances, carte « Aujourd'hui »). */
import * as M from "../modele.js";
import * as E from "../etat.js";
import * as T from "../tuteur.js";
import * as Plan from "../plan.js";
import { tete } from "../dessins.js";
import { ico, icoPlein } from "../icones.js";
import { anneau, barre } from "../ui.js";
import { esc, jour, dateLongue, dateCourte, ecart, insecables, S } from "../outils.js";

const COULEURS = { Diapos: "var(--sarcelle)", Questions: "var(--orange)", Cartes: "var(--vert)", Exercices: "var(--violet)" };
const PALETTE_PLAN = ["var(--bleu)", "var(--sarcelle)", "var(--vert)", "var(--orange)", "var(--bleu-profond)", "var(--ampoule)"];
export const couleurPlan = n => (n <= 0 ? "var(--erreur)" : PALETTE_PLAN[(n - 1) % PALETTE_PLAN.length]);
export const duree = m => (m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60} h` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`);
export function quand(j, auj) { const n = ecart(auj, j); return n <= 0 ? "aujourd'hui" : n === 1 ? "demain" : n < 14 ? `dans ${n} jours` : `dans ${Math.floor(n / 7)} semaines`; }
export function nomExamen(ex) { let n = ex.titre.startsWith("Examen ") ? ex.titre.slice(7) : ex.titre; n = n.toLowerCase(); return /^[aeiouyéèêh]/.test(n) ? `l'${n}` : `le ${n}`; }

/** Ciel étoilé (graine fixe : le même ciel à chaque affichage). */
export function ciel(densite = 2.6, graine = 11, largeur = 1200, hauteur = 260) {
  let a = graine >>> 0;
  const hasard = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const n = Math.round(densite * largeur * hauteur / 10000);
  let s = `<svg class="ciel" viewBox="0 0 ${largeur} ${hauteur}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">`;
  for (let i = 0; i < n; i++) s += `<circle cx="${(hasard() * largeur).toFixed(1)}" cy="${(hasard() * hauteur).toFixed(1)}" r="${(0.5 + hasard() * 1.3).toFixed(2)}" fill="#fff" opacity="${(0.25 + hasard() * 0.6).toFixed(2)}"/>`;
  return s + "</svg>";
}
const flamme = allumee => `<svg class="flamme${allumee ? " allumee" : ""}" viewBox="0 0 24 30" aria-hidden="true"><path d="M12,0 C14,6 20,9 20,18 C20,25 16,30 12,30 C8,30 4,25.5 4,19.5 C4,14.5 7,11.5 8,7.5 C9,10.5 10,12 11.5,13 C11.5,8 10.5,4 12,0 Z" fill="var(--orange)"/><path d="M12,14.5 C14,18 16,20.5 16,23.6 C16,27.2 14.2,29.2 12,29.2 C9.8,29.2 8,27.4 8,24.4 C8,21.4 10,19.4 12,14.5 Z" fill="var(--ampoule)"/></svg>`;

/** La carte « Aujourd'hui » du plan de révision (aussi sur l'écran 08). */
export function carteAujourdhui(c, jp, API, o = {}) {
  const pret = Plan.pretPour(c);
  const ex = M.C.seances.find(s => s.estExamen && s.jour >= c.aujourdhui);
  const faites = jp.taches.filter(t => t.faite).length, minutes = Plan.minutesDuJour(jp), minutesFaites = jp.taches.filter(t => t.faite).reduce((x, t) => x + (t.minutes || 0), 0);
  const resume = jp.taches.length ? `${faites} tâche${S(faites)} sur ${jp.taches.length} faite${S(faites)} · ${duree(minutesFaites)} sur ${duree(Math.max(minutes, c.donnees.minutesParJour))}` : "";
  const vide = jp.taches.length ? "" : messageVide(jp);
  const lignes = jp.taches.map(t => {
    const s = M.trouver(t.seance || ""); const sous = s ? (s.estExamen ? `${s.titre} · ${dateLongue(s.jour).toLowerCase()}` : `Séance ${Plan.numeroCours(s)} · ${s.titre}`) : "";
    return `<li class="tache-courte${t.faite ? " faite" : ""}"><button class="coche${t.faite ? " cochee" : ""}" data-cocher='${esc(JSON.stringify({ id: t.id, jour: t.jour }))}' aria-pressed="${!!t.faite}" aria-label="${esc(t.titre)}${t.faite ? ", faite" : ""}">${ico("coche", 3)}</button>
<a class="tache-lien" href="${t.cible ? API.routeDe(t.serieQcm != null ? { ...t.cible, serieQcm: t.serieQcm } : t.cible) : "#/plan"}" title="${esc(t.raison || "")}"><i class="trait" style="background:${couleurPlan(t.numero)}"></i><span><b>${esc(insecables(t.titre))}</b><small>${esc(insecables(sous))}</small></span></a><span class="duree">${duree(t.minutes || 0)}</span></li>`;
  }).join("");
  return `<section class="carte accueil carte-aujourdhui${o.classe ? " " + o.classe : ""}">
<div class="aujourdhui-tete"><div><div class="etiquette-section">AUJOURD'HUI</div><div class="date-jour">${esc(dateLongue(c.aujourdhui))}</div>
${ex ? `<div class="examen-ligne">${esc(insecables(`${ex.titre} · ${dateLongue(ex.jour).toLowerCase()} · ${quand(ex.jour, c.aujourdhui)}`))}</div>` : ""}</div>
${anneau(pret ? pret.pourcent / 100 : 1, { couleur: "var(--sarcelle)", taille: 78, epaisseur: 8, texte: pret ? pret.pourcent + " %" : "✓", sous: "prête", taillePolice: 17 })}</div>
${lignes ? `<ul class="taches-courtes">${lignes}</ul>` : `<p class="attenue petit">${esc(vide)}</p>`}
${jp.taches.length ? barre(minutes ? minutesFaites / minutes : 0, "succes") : ""}
<div class="aujourdhui-pied"><span class="attenue">${esc(resume)}</span>${o.sansLien ? "" : `<a class="lien" href="#/plan">Voir le plan ${ico("droite", 2)}</a>`}</div></section>`;
}
export function messageVide(jp) {
  if (jp.taches.length) return "";
  if (jp.evenements.some(e => e.genre === "examen")) return "Jour d'examen : bonne chance !";
  if (jp.repos) return "Jour de repos : rien de prévu, profites-en.";
  if (jp.passe) return "Rien de coché ce jour-là.";
  const dernier = M.C.seances.filter(s => s.estExamen).pop();
  if (dernier && jp.jour > dernier.jour) return "La session est terminée.";
  return "Rien à réviser ce jour-là.";
}
export function lierCoches(racine, rendre) {
  for (const b of racine.querySelectorAll("[data-cocher]")) b.addEventListener("click", ev => {
    ev.preventDefault();
    const { id, jour: j } = JSON.parse(b.getAttribute("data-cocher"));
    if (E.estCochee(j, id)) E.decocher(j, id);
    else {
      const c = Plan.contexte();
      const jp = Plan.jours(c, j, j)[0];
      const t = jp.taches.find(x => x.id === id);
      if (t) E.cocher(t);
    }
    rendre();
  });
}

export default async function accueil(r, API) {
  const j = jour(), maintenant = new Date();
  const h = maintenant.getHours();
  const salut = h < 12 ? "Bonjour !" : h < 18 ? "Bon après-midi !" : "Bonsoir !";
  const serie = T.serie(j);
  const anneaux = T.parcours();
  const c0 = Plan.contexte(j);
  const { c, jp } = Plan.aujourdhui(c0);
  const conseil = T.reprendre() || T.conseiller(j, 1)[0] || null;
  const prochaines = M.datees().filter(s => s.jour >= j).slice(0, 4);
  const horizon = prochaines.length ? Math.max(14, ecart(j, prochaines[prochaines.length - 1].jour)) : 14;

  const bandeau = `<section class="bandeau-accueil">${ciel()}<span class="orbite o1"></span><span class="orbite o2"></span>
<div class="bandeau-contenu"><div class="portrait">${tete("normal", { anime: true })}</div>
<div class="bandeau-textes"><div class="salut">${salut}</div><div class="date-bandeau">${esc(dateLongue(j))}</div>
<form class="question-sigma" id="question-sigma"><input class="champ-chat" type="text" name="q" placeholder="Pose ta question à Sigma…" aria-label="Question pour le professeur Sigma" enterkeyhint="send" autocomplete="off">
<button class="bouton-rond" type="submit" aria-label="Demander à Sigma">${icoPlein("envoyer")}</button></form></div>
<div class="serie" aria-label="Série : ${serie.jours} ${serie.jours > 1 ? "jours d'affilée" : "jour d'étude"}">${flamme(serie.aujourdhui)}<b>${serie.jours}</b><span>${serie.jours > 1 ? "jours d'affilée" : "jour d'étude"}</span></div></div></section>`;

  const progression = `<section class="carte accueil carte-progression"><div class="carte-tete"><span class="etiquette-section">MA PROGRESSION DANS LE COURS</span><a class="lien" href="#/reviser/progres">Mes progrès en graphiques</a></div>
<div class="anneaux">${anneaux.map(l => `<div class="anneau-ligne" aria-label="${esc(l.libelle)} : ${l.faits} sur ${l.total}">${anneau(l.total ? l.faits / l.total : 0, { couleur: COULEURS[l.libelle.split(" ")[0]] || "var(--bleu)" })}<b>${esc(l.libelle)}</b><span>${l.faits} / ${l.total}</span></div>`).join("")}</div></section>`;

  const carteConseil = `<section class="carte accueil carte-conseil"><div class="conseil-tete">${tete("normal")}<span class="etiquette-section bleu">LE CONSEIL DE SIGMA</span></div>
<div class="conseil-titre">${esc(insecables(conseil ? conseil.titre : "Tout est à jour"))}</div>
<p class="conseil-pourquoi">${esc(insecables(conseil ? conseil.pourquoi : "Tu as fait tout ce que je pouvais te proposer. Pose-moi une question quand tu veux."))}</p>
${conseil ? `<a class="bouton" href="${API.routeDe(conseil.cible)}">${conseil.genre === "reprendre" ? "Reprendre" : "Y aller"}${ico("droite", 2)}</a>` : ""}</section>`;

  const frise = prochaines.length ? `<div class="frise"><div class="frise-ligne"></div>
<div class="frise-point aujourdhui" style="--pos:0"><b>Aujourd'hui</b><i></i></div>
${prochaines.map(s => {
    const n = ecart(j, s.jour);
    return `<a class="frise-point${s.estExamen ? " examen" : ""}" style="--pos:${(n / horizon).toFixed(4)}" href="${API.lien("reviser", "qcm", s.cle)}" aria-label="${esc(s.titre)}, ${esc(dateCourte(s.jour))}, ${n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`}">
<b>${esc(dateCourte(s.jour))}</b><i></i><span class="t">${esc(insecables(s.estExamen ? s.titre : `Quiz · ${s.titre}`))}</span><span class="q">${n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`}</span></a>`;
  }).join("")}</div>
<ul class="echeances-liste">${prochaines.map(s => { const n = ecart(j, s.jour); return `<li class="${s.estExamen ? "examen" : ""}"><a href="${API.lien("reviser", "qcm", s.cle)}"><i></i><b>${esc(dateCourte(s.jour))}</b><span>${esc(insecables(s.estExamen ? s.titre : `Quiz · ${s.titre}`))}</span><small>${n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`}</small></a></li>`; }).join("")}</ul>`
    : `<p class="attenue">La session est terminée : il n'y a plus de quiz ni d'examen à venir.</p>`;
  const echeances = `<section class="carte accueil carte-echeances"><div class="etiquette-section">PROCHAINES ÉCHÉANCES</div>${frise}</section>`;

  return {
    ecran: "accueil", titreMobile: "Statosphère",
    html: `<div class="tableau-bord apparait">${bandeau}<div class="rangee-accueil">${progression}${carteConseil}</div>${echeances}${carteAujourdhui(c, jp, API)}</div>`,
    apres(main) {
      const f = main.querySelector("#question-sigma");
      f.addEventListener("submit", e => { e.preventDefault(); const q = f.q.value.trim(); f.q.value = ""; API.ouvrirSigma(q); });
      lierCoches(main, () => API.rendre({ garder: true }));
    },
  };
}
