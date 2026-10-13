/* 08 · Plan de révision : conseils du jour de Sigma, préparation à l'examen, série de jours, semainier (temps par jour, jours de
   repos, tâches à cocher, à reporter, où aller) et progression des séances de l'examen. */
import * as M from "../modele.js";
import * as E from "../etat.js";
import * as P from "../plan.js";
import { C } from "../modele.js";
import { tete } from "../dessins.js";
import { ico } from "../icones.js";
import { anneau, barre, courbe, legende } from "../ui.js";
import { carteAujourdhui, couleurPlan, duree, quand, nomExamen, messageVide, lierCoches } from "./accueil.js";
import { esc, jour, decaler, lundi, dateLongue, dateDe, jourSemaine, JOURS_ABREGES, insecables, S, ecart } from "../outils.js";

const GENRES = { lecon: "Leçon", fiche: "Fiche", qcm: "QCM", exercices: "Exercices", cartes: "Cartes", diapos: "Diapos", tutoriel: "Tutoriel R", "examen-blanc": "Examen blanc", travail: "Travaillée" };
const ICONES = { lecon: "livre", fiche: "feuillets", qcm: "listeCochee", exercices: "crayon", cartes: "cartes", diapos: "diapo", tutoriel: "n06", "examen-blanc": "horloge", travail: "coche" };
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const quantieme = j => { const d = +j.slice(8); return d === 1 ? "1er" : String(d); };
const flamme = allumee => `<svg class="flamme${allumee ? " allumee" : ""}" viewBox="0 0 24 30" aria-hidden="true"><path d="M12,0 C14,6 20,9 20,18 C20,25 16,30 12,30 C8,30 4,25.5 4,19.5 C4,14.5 7,11.5 8,7.5 C9,10.5 10,12 11.5,13 C11.5,8 10.5,4 12,0 Z" fill="var(--orange)"/><path d="M12,14.5 C14,18 16,20.5 16,23.6 C16,27.2 14.2,29.2 12,29.2 C9.8,29.2 8,27.4 8,24.4 C8,21.4 10,19.4 12,14.5 Z" fill="var(--ampoule)"/></svg>`;

function sousTitre(t) {
  const s = M.trouver(t.seance || "");
  if (!s) return "";
  return s.estExamen ? `${s.titre} · ${dateLongue(s.jour).toLowerCase()}` : `Séance ${P.numeroCours(s)} · ${s.titre}`;
}
function ligneTache(t, jp, API) {
  const peutReporter = !jp.passe && !t.faite && t.genre !== "travail";
  const cible = t.cible ? API.routeDe(t.serieQcm != null ? { ...t.cible, serieQcm: t.serieQcm } : t.cible) : null;
  return `<li class="tache${t.faite ? " faite" : ""}" style="--c:${couleurPlan(t.numero)}"><i class="trait"></i>
${jp.aujourdhui || jp.passe ? `<button class="coche${t.faite ? " cochee" : ""}" data-cocher='${esc(JSON.stringify({ id: t.id, jour: t.jour }))}' aria-pressed="${!!t.faite}" aria-label="${esc(t.titre)}"${jp.passe ? " disabled" : ""}>${ico("coche", 3)}</button>` : ""}
<span class="icone-tache">${ico(ICONES[t.genre] || "feuillets", 1.9)}</span>
<div class="tache-texte"><b>${esc(insecables(t.titre))}</b><small>${esc(insecables(sousTitre(t)))}</small><span class="badges">${t.raison ? `<i class="raison${t.enRetard ? " retard" : ""}">${esc(t.raison)}</i>` : ""}${t.minutes ? `<i>${ico("horloge", 2)}${duree(t.minutes)}</i>` : ""}</span></div>
<div class="tache-actions">${peutReporter ? `<button class="bouton secondaire petit" data-reporter='${esc(JSON.stringify({ id: t.id, jour: t.jour }))}'>Reporter à demain</button>` : ""}${cible ? `<a class="bouton petit" href="${cible}">Y aller${ico("droite", 2)}</a>` : ""}</div></li>`;
}

export default async function plan(r, API) {
  const j = jour();
  let c = P.contexte(j);
  const res = P.aujourdhui(c); c = res.c; const jp = res.jp;
  const vue = r.segments[0] === "progression" ? "progression" : "semainier";
  const serie = P.serieDeJours(j);
  const conseils = P.conseilsDuJour(c, jp, serie);
  const pret = P.pretPour(c);
  const examens = C.seances.filter(s => s.estExamen && s.jour >= j);
  const actifs = new Set(P.joursActifs());
  const ex = examens[0] || null;

  const chips = examens.map((s, i) => `<span class="chip-examen${i === 0 ? " prochain" : ""}">${ico("calendrier", 2)}${esc(insecables(`${s.titre} · ${dateLongue(s.jour).toLowerCase()} · ${quand(s.jour, j)}`))}</span>`).join("");
  const cartesHaut = `<div class="plan-haut">
<section class="carte plan-conseils"><div class="conseils-tete">${tete("normal")}<div><div class="etiquette-section">CONSEILS DU JOUR</div><div class="titre-carte">Professeur Sigma</div></div></div>
${conseils.length ? `<ol class="conseils">${conseils.map((x, i) => `<li><span class="rond-num">${i + 1}</span><div><p>${esc(insecables(x.texte))}</p>${x.cible ? `<a class="lien" href="${API.routeDe(x.serieQcm != null ? { ...x.cible, serieQcm: x.serieQcm } : x.cible)}">${esc(x.action)}${ico("droite", 2)}</a>` : ""}</div></li>`).join("")}</ol>` : `<p class="attenue">Tout est à jour : profite de ta journée, ou fais une série de QCM pour garder la main.</p>`}</section>
<section class="carte plan-pret"><div class="titre-carte">${esc(pret ? `Prête pour ${nomExamen(pret.examen)}` : "Session terminée")}</div>${anneau(pret ? pret.pourcent / 100 : 1, { couleur: "var(--sarcelle)", taille: 150, epaisseur: 14, texte: pret ? pret.pourcent + " %" : "✓", sous: "prête", taillePolice: 34 })}<p class="attenue petit">${esc(insecables(pret ? pret.explication : ""))}</p></section>
<section class="carte plan-serie"><div class="etiquette-section">SÉRIE</div><div class="serie-ligne">${flamme(actifs.has(j))}<b>${serie}</b></div><div class="gras">${serie > 1 ? "jours d'affilée" : "jour d'affilée"}</div>
<p class="attenue petit">${esc(insecables(actifs.has(j) ? "Aujourd'hui compte déjà : bravo." : serie > 0 ? "Une tâche aujourd'hui prolonge ta série." : "Une tâche aujourd'hui lance ta série."))}</p>
<div class="sept-jours" aria-label="Les sept derniers jours">${Array.from({ length: 7 }, (_, k) => decaler(j, k - 6)).map(d => `<span class="jour-serie${actifs.has(d) ? " actif" : ""}${d === j ? " aujourdhui" : ""}"><i></i>${JOURS_ABREGES[jourSemaine(d)][0]}</span>`).join("")}</div></section></div>`;

  const onglets = `<nav class="piste piste-plan"><a class="onglet${vue === "semainier" ? " actif" : ""}" href="#/plan" data-remplacer>Semainier</a><a class="onglet${vue === "progression" ? " actif" : ""}" href="#/plan/progression" data-remplacer>Progression</a></nav>`;
  let corps;
  if (vue === "semainier") {
    const debutCours = (M.datees().find(s => s.jour) || {}).jour || j;
    const fin = (C.seances.filter(s => s.estExamen).pop() || M.datees().slice(-1)[0] || {}).jour || j;
    const premierLundi = lundi(debutCours), dernierLundi = lundi(fin);
    let l = r.query.semaine && /^\d{4}-\d\d-\d\d$/.test(r.query.semaine) ? lundi(r.query.semaine) : lundi(j);
    if (l < premierLundi) l = premierLundi; if (l > dernierLundi && lundi(j) <= dernierLundi) l = dernierLundi;
    const dim = decaler(l, 6);
    const libelle = l.slice(5, 7) === dim.slice(5, 7) ? `Semaine du ${quantieme(l)} au ${quantieme(dim)} ${MOIS[+dim.slice(5, 7) - 1]}` : `Semaine du ${quantieme(l)} ${MOIS[+l.slice(5, 7) - 1]} au ${quantieme(dim)} ${MOIS[+dim.slice(5, 7) - 1]}`;
    const semaine = P.jours(c, l, dim);
    const choisi = r.query.jour && semaine.find(x => x.jour === r.query.jour) || semaine.find(x => x.aujourdhui) || semaine[0];
    const lienSemaine = (x, jr) => `#/plan?semaine=${x}${jr ? "&jour=" + jr : ""}`;
    const colonnes = semaine.map(x => {
      const m = P.minutesDuJour(x), charge = Math.min(1, m / c.donnees.minutesParJour);
      return `<a class="jour-plan${x.aujourdhui ? " aujourdhui" : ""}${x === choisi ? " choisi" : ""}${x.passe ? " passe" : ""}${x.repos ? " repos" : ""}" href="${lienSemaine(l, x.jour)}" data-remplacer>
<div class="jour-tete"><span>${JOURS_ABREGES[jourSemaine(x.jour)]}</span><b>${+x.jour.slice(8)}</b></div>
<div class="jour-evenements">${x.evenements.map(e => `<i class="evt ${e.genre}">${esc(e.genre === "seance" ? "Séance" : e.genre === "quiz" ? "Quiz" : e.texte)}</i>`).join("")}</div>
<div class="jour-taches">${x.taches.map(t => `<span class="mini-tache${t.faite ? " faite" : ""}" style="--c:${couleurPlan(t.numero)}">${esc(`${t.numero > 0 ? "S" + t.numero : "EX"} · ${GENRES[t.genre] || ""}`)}${t.faite ? ico("coche", 3) : ""}</span>`).join("")}</div>
<div class="jour-pied">${x.repos && !x.taches.length ? "Repos" : m ? duree(m) : ""}${!x.passe && x.taches.length ? `<span class="charge"><i style="width:${Math.round(charge * 100)}%"></i></span>` : ""}</div></a>`;
    }).join("");
    const nb = choisi.taches.length, faites = choisi.taches.filter(t => t.faite).length, m = P.minutesDuJour(choisi), mf = choisi.taches.filter(t => t.faite).reduce((x, t) => x + (t.minutes || 0), 0);
    const travaillees = choisi.taches.filter(t => t.genre === "travail").length;
    const bilan = choisi.passe ? [faites - travaillees > 0 ? `${faites - travaillees} tâche${S(faites - travaillees)} cochée${S(faites - travaillees)}` : "", travaillees ? `${travaillees} séance${S(travaillees)} travaillée${S(travaillees)}` : ""].filter(Boolean).join(" · ")
      : choisi.aujourdhui ? (nb ? `Aujourd'hui · ${faites} tâche${S(faites)} sur ${nb} faite${S(faites)} · ${duree(mf)} sur ${duree(Math.max(m, c.donnees.minutesParJour))}` : "Aujourd'hui") : nb ? `${nb} tâche${S(nb)} · ${duree(m)}` : "";
    corps = `<div class="barre-semaine"><div class="nav-semaine"><a class="fleche-seance${l > premierLundi ? "" : " inactive"}" ${l > premierLundi ? `href="${lienSemaine(decaler(l, -7))}" data-remplacer` : ""} aria-label="Semaine précédente">${ico("chevronGauche", 2.4)}</a><b>${esc(libelle)}</b>
<a class="fleche-seance${l < dernierLundi ? "" : " inactive"}" ${l < dernierLundi ? `href="${lienSemaine(decaler(l, 7))}" data-remplacer` : ""} aria-label="Semaine suivante">${ico("chevronDroit", 2.4)}</a>${l !== lundi(j) ? `<a class="bouton secondaire petit" href="#/plan" data-remplacer>Cette semaine</a>` : ""}</div>
<div class="reglages-plan"><span class="etiquette-section">PAR JOUR</span><span class="segments">${P.CHARGES.map(x => `<button class="segment" data-charge="${x}" aria-pressed="${c.donnees.minutesParJour === x}">${duree(x)}</button>`).join("")}</span>
<span class="etiquette-section">REPOS</span><span class="repos">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="rond-repos" data-repos="${d}" aria-pressed="${c.donnees.joursDeRepos.includes(d)}" aria-label="Repos le ${["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d]}">${"DLMMJVS"[d]}</button>`).join("")}</span></div></div>
<div class="semainier">${colonnes}</div>
<section class="carte jour-detail"><div class="titre-carte grand-jour">${esc(dateLongue(choisi.jour))}</div><div class="attenue">${esc(bilan)}</div>${nb ? barre(m ? mf / m : 0, "succes") : ""}
${nb ? `<ul class="taches">${choisi.taches.map(t => ligneTache(t, choisi, API)).join("")}</ul>` : `<p class="attenue">${esc(messageVide(choisi))}</p>`}</section>`;
  } else {
    const couv = ex ? new Set(ex.couvre) : null;
    const bs = c.bilans.filter(b => !couv || couv.has(b.id));
    const cartes = bs.map(b => {
      const coul = couleurPlan(b.numero);
      const mesures = [["Leçon lue", b.parties ? b.partiesLues / b.parties : 0, b.parties ? `${b.partiesLues}/${b.parties}` : "—"], ["Diapos vues", b.diapos ? b.diaposVues / b.diapos : 0, b.diapos ? `${b.diaposVues}/${b.diapos}` : "—"],
        ["Fiche vue", b.ficheVue ? 1 : 0, !b.aFiche ? "—" : b.ficheVue ? "Oui" : "Pas encore"], ["QCM réussis", b.qcm || 0, b.questions ? `${Math.round((b.qcm || 0) * 100)} %` : "—"],
        b.tutoriel ? ["Tutoriel R", b.tutoriel ? b.tutorielTermines / b.tutoriel : 0, `${b.tutorielTermines}/${b.tutoriel}`] : ["Exercices réussis", b.exercices + b.tutoriel ? (b.exercicesReussis + b.tutorielTermines) / (b.exercices + b.tutoriel) : 0, b.exercices + b.tutoriel ? `${b.exercicesReussis + b.tutorielTermines}/${b.exercices + b.tutoriel}` : "—"],
        ["Cartes sues", b.cartes ? b.cartesSues / b.cartes : 0, b.cartes ? `${b.cartesSues}/${b.cartes}` : "—"]];
      return `<a class="carte seance-progres" href="${API.lien("reviser", "lecons", b.id)}" title="Ouvrir la séance dans Réviser"><div class="seance-progres-tete">${anneau(b.score, { couleur: coul, taille: 64, epaisseur: 7, taillePolice: 14 })}<div><span class="badge-s" style="background:${coul}">S${b.numero}</span><b>${esc(b.seance.titre)}</b>${b.seance.jour > j ? `<small class="attenue">Cours le ${esc(M.dateCourteSeance(b.seance))}</small>` : ""}</div></div>
<div class="mesures">${mesures.map(([lib, part, val]) => `<div class="mesure"><span>${esc(lib)}</span><div class="piste-barre"><i style="width:${Math.round(part * 100)}%;background:${coul}"></i></div><b>${esc(val)}</b></div>`).join("")}</div></a>`;
    }).join("");
    const series = ex ? [{ nom: "Tes séries de QCM", couleur: "var(--sarcelle)", points: P.scoresDesSeries(ex) }, { nom: `Maîtrise de ${nomExamen(ex)}`, couleur: "var(--bleu)", points: P.courbe(ex) }] : [];
    corps = `${ex ? `<section class="carte"><div class="etiquette-section icone">${ico("graphique", 2)}ÉVOLUTION DE TES SCORES</div><p class="attenue petit">${esc(insecables(`Tes bonnes réponses aux séries de QCM, et la part des questions de ${nomExamen(ex)} que tu maîtrises`))}</p>${legende(series)}${courbe(series, { hauteur: 220, largeur: 900 })}</section>` : ""}
<h2 class="titre-section">${esc(ex ? `Séances de ${nomExamen(ex)}` : "Tes séances")}</h2><div class="grille-seances">${cartes}</div>`;
  }
  return {
    ecran: "plan", titreDocument: "Plan de révision",
    html: `<header class="entete-page entete-plan"><div class="entete-textes"><h1 class="titre">Plan de révision</h1><div class="chips-examens">${chips}</div></div></header>${cartesHaut}${onglets}<div class="plan-corps">${corps}</div>`,
    apres(main) {
      lierCoches(main, () => API.rendre({ garder: true }));
      for (const b of main.querySelectorAll("[data-reporter]")) b.addEventListener("click", () => {
        const { id, jour: jr } = JSON.parse(b.getAttribute("data-reporter"));
        const jpx = P.jours(P.contexte(), jr, jr)[0], t = jpx.taches.find(x => x.id === id);
        if (t) { E.reporter(t); API.toast("Reportée au lendemain"); API.rendre({ garder: true }); }
      });
      for (const b of main.querySelectorAll("[data-charge]")) b.addEventListener("click", () => { E.regler(+b.getAttribute("data-charge"), E.PLAN.joursDeRepos); API.rendre({ garder: true }); });
      for (const b of main.querySelectorAll("[data-repos]")) b.addEventListener("click", () => {
        const d = +b.getAttribute("data-repos"), repos = E.PLAN.joursDeRepos.includes(d) ? E.PLAN.joursDeRepos.filter(x => x !== d) : [...E.PLAN.joursDeRepos, d];
        E.regler(E.PLAN.minutesParJour, repos); API.rendre({ garder: true });
      });
    },
  };
}
