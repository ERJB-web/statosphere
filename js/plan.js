/* Plan de révision (port de Core/Planification) : bilan de chaque séance, tâches de chaque jour (répétition espacée J+1, J+3, J+7, J+14,
   activité prioritaire, examen blanc), conseils du jour, préparation à l'examen, série de jours. */
import * as M from "./modele.js";
import * as E from "./etat.js";
import { C } from "./modele.js";
import { evaluations } from "./tuteur.js";
import { S, jour as aujourdhuiJour, jourDe, decaler, ecart, jourSemaine, dateCourte, dateLongue, distinct, trierPar } from "./outils.js";

const { cible } = E;
export const INTERVALLES = [1, 3, 7, 14];
export const CHARGES = [30, 60, 120];
const TACHES_PAR_JOUR_MAX = 6, JOURS_PREPARATION = 2, JOURS_AVANT_EXAMEN = 5, SEUIL_FAIBLE = 0.6, POIDS_PRIORITAIRE = 2;
const MIN = { lecon: 25, relecture: 20, diapos: 20, fiche: 10, qcm: 15, exercices: 25, tutoriel: 25, cartes: 10, examenBlanc: 60 };
const RATEES_POUR_ERREURS = 5;
const POIDS = { qcm: 0.4, lecon: 0.15, diapos: 0.15, cartes: 0.15, exercices: 0.15 };
const pct = p => Math.round(p * 100);

/* ---------- Séances du cours ---------- */
export const seancesDuCours = () => M.datees().filter(s => !s.estExamen);
export function numeroCours(s) { const l = seancesDuCours(); const i = l.findIndex(x => x.cle === s.cle); return i + 1; }
/** La séance du cours (ni examen ni séance facultative) d'une cible. */
export function seanceDe(c) {
  if (!c) return null;
  if (c.seance != null) { const s = M.trouver(c.seance); if (s) return s.estExamen || s.estFacultative ? null : s.cle; }
  if (c.chapitre != null) { const s = M.seanceDuChapitre(c.chapitre); return s && !s.estFacultative ? s.cle : null; }
  return null;
}

/* ---------- Bilan d'une séance ---------- */
function score(b) {
  const m = [];
  if (b.questions > 0) m.push([POIDS.qcm, b.qcm || 0]);
  if (b.parties > 0) m.push([POIDS.lecon, b.partiesLues / b.parties]);
  if (b.diapos > 0) m.push([POIDS.diapos, b.diaposVues / b.diapos]);
  if (b.cartes > 0) m.push([POIDS.cartes, b.cartesSues / b.cartes]);
  if (b.exercices + b.tutoriel > 0) m.push([POIDS.exercices, (b.exercicesReussis + b.tutorielTermines) / (b.exercices + b.tutoriel)]);
  const t = m.reduce((x, y) => x + y[0], 0);
  return t === 0 ? 0 : m.reduce((x, y) => x + y[0] * y[1], 0) / t;
}
export function bilans() {
  const dern = E.dernieres();
  const r = [];
  seancesDuCours().forEach((s, i) => {
    const parties = M.leconsDe(s).flatMap(l => l.parties.map(p => ({ chapitre: l.chapitre, partie: p })));
    const jeux = M.jeuxDe(s);
    const diapos = jeux.flatMap(j => Array.from({ length: j.count }, (_, k) => ({ jeu: j.nom, n: k + 1, id: j.id(k + 1) })));
    const fiches = M.fichesDe(s), cartes = fiches.flatMap(M.cartesDe);
    const questions = (M.banque(s.cle) || { questions: [] }).questions;
    const devoirs = M.devoirsDe(s);
    const sujets = s.devoirs.includes(M.DEVOIR_TUTORIEL) && C.tutoriel ? C.tutoriel.sujets : [];
    if (!parties.length && !diapos.length && !cartes.length && !questions.length && !devoirs.length && !sujets.length) return;
    const evs = devoirs.flatMap(evaluations);
    const devoir = devoirs.find(d => evaluations(d).some(v => v === false)) || devoirs.find(d => evaluations(d).some(v => v == null)) || devoirs[0];
    const nonLue = parties.find(p => !E.estLue(p.partie.id)), nonVue = diapos.find(d => !E.estVue(d.id));
    const travail = distinct([...(E.PLAN.travail[s.cle] || []), ...E.tentatives(s.cle).map(t => jourDe(t.date)), ...E.PLAN.cochees.filter(t => t.seance === s.cle).map(t => t.jour)]).sort();
    const parSerie = new Map();
    for (const q of questions.filter(q => q.serie > 0)) { if (!parSerie.has(q.serie)) parSerie.set(q.serie, []); parSerie.get(q.serie).push(q); }
    const b = {
      seance: s, id: s.cle, numero: i + 1, chapitre: s.chapitres.length ? s.chapitres[0] : null,
      parties: parties.length, partiesLues: parties.filter(p => E.estLue(p.partie.id)).length,
      partieNonLue: nonLue ? nonLue.partie.id : null, chapitreNonLu: nonLue ? nonLue.chapitre : null,
      diapos: diapos.length, diaposVues: diapos.filter(d => E.estVue(d.id)).length, jeuNonVu: nonVue ? nonVue.jeu : null, diapoNonVue: nonVue ? nonVue.n : null,
      aFiche: fiches.length > 0, ficheVue: s.chapitres.some(ch => E.PLAN.fichesVues.includes(ch)),
      questions: questions.length,
      qcm: questions.length && E.tentatives(s.cle).length ? E.part(questions.map(q => q.id)) : null,
      questionsRatees: questions.filter(q => dern.has(q.id) && dern.get(q.id) === false).length,
      series: [...parSerie.keys()].sort((a, b2) => a - b2).map(n => { const g = parSerie.get(n); return { serie: n, part: g.filter(q => dern.get(q.id) === true).length / g.length, tentee: g.some(q => dern.has(q.id)) }; }),
      exercices: evs.length, exercicesReussis: evs.filter(v => v === true).length, exercicesARevoir: evs.filter(v => v === false).length, devoir: devoir ? devoir.devoir : null,
      tutoriel: sujets.length, tutorielTermines: sujets.filter(x => E.estTermine(x.numero)).length, sujetTutoriel: (sujets.find(x => !E.estTermine(x.numero)) || {}).numero || null,
      cartes: cartes.length, cartesSues: cartes.filter(c => E.boite(c.id) >= 3).length, cartesARevoir: cartes.filter(c => E.boite(c.id) === 1).length,
      travail,
    };
    b.score = score(b);
    b.commencee = b.travail.length > 0 || b.partiesLues > 0 || b.diaposVues > 0 || b.qcm > 0 || b.cartesSues > 0 || b.exercicesReussis > 0 || b.tutorielTermines > 0;
    r.push(b);
  });
  return r;
}

/* ---------- Activités possibles d'une séance ---------- */
const act = (genre, titre, minutes, c, poids, o = {}) => ({ genre, titre, minutes, cible: c, poids, poidsAvantExamen: o.poidsAvantExamen ?? null, prioritaire: !!o.prioritaire, serieQcm: o.serieQcm ?? null });
export function serieAConseiller(series) {
  if (!series.length) return null;
  const ratee = trierPar(series.filter(s => s.tentee && s.part < SEUIL_FAIBLE), s => s.part, s => s.serie)[0];
  if (ratee) return ratee.serie;
  const nouvelle = series.find(s => !s.tentee); if (nouvelle) return nouvelle.serie;
  return trierPar(series, s => s.part, s => s.serie)[0].serie;
}
function activiteQcm(b) {
  const poids = 1 - (b.qcm || 0) + (b.questionsRatees >= RATEES_POUR_ERREURS ? 0.2 : 0);
  const n = serieAConseiller(b.series);
  if (n != null) return act("qcm", `${b.series.find(s => s.serie === n).tentee ? "Refais" : "Fais"} la série ${n} des QCM`, MIN.qcm, cible("reviser", { seance: b.id, onglet: "qcm", serie: "serie" }), poids, { serieQcm: n });
  return b.questionsRatees >= RATEES_POUR_ERREURS
    ? act("qcm", "Refais une série de 20, tes erreurs d'abord", MIN.qcm, cible("reviser", { seance: b.id, onglet: "qcm", serie: "serie20-erreurs" }), poids)
    : act("qcm", "Fais une série de 20 questions", MIN.qcm, cible("reviser", { seance: b.id, onglet: "qcm", serie: "serie20" }), poids);
}
function sujet(b) {
  const a = [];
  if (b.parties > 0 && b.partiesLues < b.parties) {
    const reste = b.parties - b.partiesLues;
    a.push(act("lecon", b.partiesLues === 0 ? "Lis la leçon" : `Termine la leçon (${reste} partie${S(reste)})`, MIN.lecon,
      cible("reviser", { seance: b.id, onglet: "lecons", chapitre: b.chapitreNonLu ?? b.chapitre, partie: b.partieNonLue }), 1, { prioritaire: true }));
  }
  if (b.questions > 0) a.push(activiteQcm(b));
  if (b.diapos > 0 && b.diaposVues < b.diapos) {
    const reste = b.diapos - b.diaposVues;
    a.push(act("diapos", b.diaposVues === 0 ? "Regarde les diapos" : `Termine les diapos (${reste} à voir)`, MIN.diapos, cible("diapos", { seance: b.id, jeu: b.jeuNonVu, diapo: b.diapoNonVue }), 1 - b.diaposVues / b.diapos));
  }
  if (b.cartes > 0) a.push(act("cartes", b.cartesARevoir > 0 ? `Révise tes ${b.cartesARevoir} carte${S(b.cartesARevoir)} à revoir` : b.cartesSues < b.cartes ? "Apprends les cartes de la séance" : "Repasse les cartes de la séance",
    MIN.cartes, cible("reviser", { seance: b.id, onglet: "memoriser", chapitre: b.chapitre }), 1 - b.cartesSues / b.cartes + (b.cartesARevoir > 0 ? 0.3 : 0)));
  if (b.exercices > 0 && b.devoir) {
    const aFaire = b.exercices - b.exercicesReussis - b.exercicesARevoir, part = b.exercicesReussis / b.exercices;
    a.push(act("exercices", b.exercicesARevoir > 0 ? "Refais les exercices à revoir" : aFaire === b.exercices ? "Fais les exercices de la séance" : aFaire > 0 ? "Termine les exercices de la séance" : "Refais un exercice de la séance",
      MIN.exercices, cible("diapos", { seance: b.id, onglet: "exercices", devoir: b.devoir }), 1 - part + (b.exercicesARevoir > 0 ? 0.3 : 0)));
  }
  if (b.tutoriel > 0) {
    const reste = b.tutoriel - b.tutorielTermines;
    a.push(act("tutoriel", b.tutorielTermines === 0 ? "Commence le tutoriel R" : reste > 0 ? `Continue le tutoriel R (${reste} sujet${S(reste)})` : "Refais un sujet du tutoriel R",
      MIN.tutoriel, cible("coder-r", { sujet: b.sujetTutoriel }), reste > 0 ? 1 - b.tutorielTermines / b.tutoriel : 0.1));
  }
  if (b.aFiche && b.chapitre != null) a.push(act("fiche", b.ficheVue ? "Relis la fiche" : "Découvre la fiche", MIN.fiche, cible("reviser", { seance: b.id, onglet: "fiches", chapitre: b.chapitre }), b.ficheVue ? 0.25 : 0.6));
  if (b.parties > 0 && b.partiesLues === b.parties) a.push(act("lecon", "Relis la leçon", MIN.relecture, cible("reviser", { seance: b.id, onglet: "lecons", chapitre: b.chapitre }), 0.15));
  return { id: b.id, numero: b.numero, cours: b.seance.jour, score: b.score, commence: b.commencee, travail: b.travail, cible: cible("reviser", { seance: b.id }), activites: a };
}
export function libelleExamenBlanc(ex) {
  const nom = ex.titre.startsWith("Examen ") ? ex.titre.slice(7) : ex.titre;
  return ex.court ? `Examen blanc : ${nom} (${ex.court})` : `Examen blanc : ${nom}`;
}
function echeances(bs) {
  return C.seances.filter(s => s.estExamen && s.jour).map(s => ({
    id: s.cle, jour: s.jour, titre: s.titre, genre: "examen", couvre: s.couvre,
    examenBlanc: bs.some(b => s.couvre.includes(b.id) && b.questions > 0) ? act("examen-blanc", libelleExamenBlanc(s), MIN.examenBlanc, cible("reviser", { seance: s.cle, onglet: "qcm", serie: "toutes" }), 1) : null,
  }));
}
export function evenements(j) {
  const l = [];
  for (const s of M.datees().filter(s => s.jour === j)) {
    if (s.estExamen) { l.push({ genre: "examen", texte: s.titre }); continue; }
    l.push({ genre: "seance", texte: `Séance ${numeroCours(s)} : ${s.titre}` }, { genre: "quiz", texte: "Quiz en classe" });
  }
  return l;
}

/* ---------- Moteur ---------- */
export function joursExamenBlanc(minutes) { return minutes >= 60 ? [5, 2] : [3]; }
export function prochaineRepetition(travail) {
  const jours = distinct(travail).sort();
  if (!jours.length) return null;
  const ecartRang = r => INTERVALLES[r] - (r === 0 ? 0 : INTERVALLES[r - 1]);
  let ancre = jours[0], rang = 0;
  for (const j of jours.slice(1)) {
    if (rang === INTERVALLES.length) break;
    if (j < decaler(ancre, ecartRang(rang))) continue;
    ancre = j; rang++;
  }
  return rang === INTERVALLES.length ? null : { jour: decaler(ancre, ecartRang(rang)), rang: rang + 1 };
}
export function contexte(j = aujourdhuiJour()) {
  const bs = bilans();
  return { bilans: bs, sujets: bs.map(sujet), echeances: echeances(bs), donnees: E.PLAN, aujourdhui: j };
}
function passe(c, j) {
  const cochees = c.donnees.cochees.filter(t => t.jour === j);
  const travailles = c.sujets.filter(s => s.travail.includes(j) && !cochees.some(t => t.seance === s.id)).map(s => ({
    id: `travail:${s.id}`, jour: j, genre: "travail", titre: "Séance travaillée", seance: s.id, numero: s.numero, cible: s.cible, faite: true, minutes: 0, raison: "",
  }));
  return { jour: j, repos: c.donnees.joursDeRepos.includes(jourSemaine(j)), passe: true, aujourdhui: false, evenements: evenements(j), taches: [...cochees, ...travailles] };
}
/** Les jours de du à au ; les jours à venir sont projetés depuis aujourd'hui. */
export function jours(c, du, au) {
  const r = [], sim = simulation(c);
  for (let j = du < c.aujourdhui ? du : c.aujourdhui; j <= au; j = decaler(j, 1)) {
    const p = j < c.aujourdhui ? passe(c, j) : sim(j);
    if (j >= du) r.push(p);
  }
  return r;
}
function simulation(c) {
  const travail = {}, dernierGenre = {};
  const sujets = c.sujets.map(s => ({ ...s, activites: s.activites.slice() }));
  for (const s of c.sujets) travail[s.id] = new Set([...s.travail, ...c.donnees.cochees.filter(t => t.seance === s.id).map(t => t.jour)]);
  for (const t of trierPar(c.donnees.cochees, t => t.jour)) if (t.seance) dernierGenre[t.seance] = t.genre;
  function travailler(t, j) {
    if (!t.seance || !travail[t.seance]) return;
    travail[t.seance].add(j); dernierGenre[t.seance] = t.genre;
    const i = sujets.findIndex(s => s.id === t.seance);
    if (i >= 0 && sujets[i].activites.some(a => a.prioritaire && a.genre === t.genre))
      sujets[i] = { ...sujets[i], activites: sujets[i].activites.filter(a => !(a.prioritaire && a.genre === t.genre)), commence: true };
  }
  function options(s, avantExamen) {
    const dernier = dernierGenre[s.id];
    const o = s.activites.map(a => ({ a, poids: a.prioritaire ? POIDS_PRIORITAIRE : avantExamen <= JOURS_AVANT_EXAMEN && a.poidsAvantExamen != null ? a.poidsAvantExamen : a.poids }));
    return trierPar(o, x => (o.length > 1 && !x.a.prioritaire && x.a.genre === dernier ? 1 : 0), x => -x.poids).map(x => ({
      id: `${x.a.genre}:${s.id}`, genre: x.a.genre, titre: x.a.titre, seance: s.id, numero: s.numero, minutes: x.a.minutes, cible: x.a.cible, serieQcm: x.a.serieQcm,
    }));
  }
  return function generer(j) {
    const d = c.donnees, ev = evenements(j);
    const taches = d.cochees.filter(t => t.jour === j);
    for (const r of d.reports.filter(r => r.vers === j && !taches.some(t => t.id === r.id))) taches.push({ ...r.tache, jour: j, reportee: true, raison: "Reportée" });
    const parties = d.reports.filter(r => r.de <= j && j < r.vers);
    const ids = new Set([...taches.map(t => t.id), ...parties.map(r => r.id)]);
    const sujetsDuJour = new Set([...taches.map(t => t.seance), ...parties.map(r => r.tache.seance)].filter(Boolean));
    for (const t of taches) travailler(t, j);
    const repos = d.joursDeRepos.includes(jourSemaine(j)), aujourdhui = j === c.aujourdhui;
    const examen = trierPar(c.echeances.filter(e => e.genre === "examen" && e.jour >= j), e => e.jour)[0];
    if (repos || !examen || examen.jour === j) return { jour: j, repos, passe: false, aujourdhui, evenements: ev, taches };
    let capacite = d.minutesParJour - taches.reduce((x, t) => x + (t.minutes || 0), 0);
    const nouvelles = [];
    const rien = () => !taches.length && !nouvelles.length;
    const plein = () => taches.length + nouvelles.length >= TACHES_PAR_JOUR_MAX || (capacite <= 0 && !rien());
    const ajouter = t => { nouvelles.push(t); capacite -= t.minutes; ids.add(t.id); if (t.seance) sujetsDuJour.add(t.seance); travailler(t, j); };
    const avant = ecart(j, examen.jour);
    const placer = (s, raison, enRetard = false) => {
      const o = options(s, avant).filter(t => !ids.has(t.id));
      const choix = o.find(t => t.minutes <= capacite) || (rien() ? o[0] : null);
      if (choix) ajouter({ ...choix, jour: j, raison, enRetard });
    };
    const couverts = new Set(examen.couvre);
    const blanc = examen.examenBlanc;
    if (blanc && joursExamenBlanc(d.minutesParJour).includes(avant) && !ids.has(`${blanc.genre}:${examen.id}`))
      ajouter({ id: `${blanc.genre}:${examen.id}`, jour: j, genre: blanc.genre, titre: blanc.titre, seance: examen.id, numero: 0, minutes: blanc.minutes, raison: `Examen dans ${avant} jours`, cible: blanc.cible });
    const candidats = sujets.filter(s => couverts.has(s.id) && !sujetsDuJour.has(s.id) && (s.cours <= j || travail[s.id].size > 0 || ecart(j, s.cours) <= JOURS_PREPARATION));
    const repetitions = trierPar(candidats.map(s => ({ s, e: prochaineRepetition([...travail[s.id]]) })).filter(x => x.e && x.e.jour <= j), x => x.s.score, x => x.s.id);
    for (const { s, e } of repetitions) {
      if (plein()) break;
      const enRetard = e.jour < c.aujourdhui;
      placer(s, `Répétition J+${INTERVALLES[e.rang - 1]}${enRetard ? " · en retard" : ""}`, enRetard);
    }
    const hier = decaler(j, -1);
    const aPreparer = s => s.cours > j && s.activites.some(a => a.prioritaire);
    for (const s of trierPar(candidats, s => (aPreparer(s) ? 0 : 1), s => (travail[s.id].has(hier) ? 1 : 0), s => s.score, s => s.id)) {
      if (plein()) break;
      if (sujetsDuJour.has(s.id)) continue;
      placer(s, aPreparer(s) ? `Cours le ${dateCourte(s.cours)}` : !s.commence && travail[s.id].size === 0 ? "À commencer" : s.score < SEUIL_FAIBLE ? `Séance faible · ${pct(s.score)} %` : `En vue de l'${examen.titre.toLowerCase()}`);
    }
    return { jour: j, repos: false, passe: false, aujourdhui, evenements: ev, taches: [...taches, ...nouvelles] };
  };
}
export const minutesDuJour = jp => jp.taches.reduce((x, t) => x + (t.minutes || 0), 0);

/** Tâches de QCM et d'examen blanc du jour pas encore cochées dont une série a été faite ce jour-là. */
export function faitesAujourdhui(jp) {
  const seances = new Set(E.P.qcm.filter(t => jourDe(t.date) === jp.jour).map(t => t.seance));
  return jp.taches.filter(t => !t.faite && (t.genre === "qcm" || t.genre === "examen-blanc") && t.seance && seances.has(t.seance));
}
/** Le jour d'aujourd'hui, après avoir coché d'office les QCM faits. */
export function aujourdhui(c) {
  E.absorber(seanceDe);
  let jp = jours(c, c.aujourdhui, c.aujourdhui)[0];
  const faites = faitesAujourdhui(jp);
  if (faites.length) { for (const t of faites) E.cocher(t); c = contexte(c.aujourdhui); jp = jours(c, c.aujourdhui, c.aujourdhui)[0]; }
  return { c, jp };
}

/* ---------- Conseils du jour ---------- */
export function conseilsDuJour(c, jp, serieDeJours, nombre = 3) {
  const ex = C.seances.find(s => s.estExamen && s.jour >= c.aujourdhui);
  const couv = ex ? new Set(ex.couvre) : null;
  const bs = c.bilans.filter(b => !couv || couv.has(b.id)).filter(b => b.seance.jour <= c.aujourdhui || b.commencee);
  const nom = ex ? ex.titre.toLowerCase() : "";
  const cand = [];
  const k = (texte, action, cib, serieQcm, priorite, seance) => ({ texte, action, cible: cib, serieQcm, priorite, seance });
  const premiere = c.bilans.find(b => b.parties > 0);
  if (c.bilans.every(b => !b.commencee) && !c.donnees.cochees.length && premiere)
    cand.push(k(`Commence par la leçon de la séance ${premiere.numero} : sa première partie se lit en quelques minutes.`, "Lire la leçon",
      cible("reviser", { seance: premiere.id, onglet: "lecons", chapitre: premiere.chapitreNonLu, partie: premiere.partieNonLue }), null, 95, premiere.id));
  const faible = trierPar(bs.filter(b => b.qcm != null), b => b.qcm, b => b.id)[0];
  if (faible && faible.qcm < 0.8) {
    const n = serieAConseiller(faible.series);
    cand.push(n != null
      ? k(`La séance ${faible.numero} est ta plus faible (${pct(faible.qcm)} % de questions réussies) : fais la série ${n} des QCM.`, `Faire la série ${n}`, cible("reviser", { seance: faible.id, onglet: "qcm", serie: "serie" }), n, 90, faible.id)
      : k(`La séance ${faible.numero} est ta plus faible (${pct(faible.qcm)} % de questions réussies) : refais une série de 20, tes erreurs d'abord.`, "Faire la série", cible("reviser", { seance: faible.id, onglet: "qcm", serie: "serie20-erreurs" }), null, 90, faible.id));
  } else if (bs.length && bs.every(b => b.qcm == null)) {
    const sansQcm = bs.find(b => b.questions > 0 && b.commencee);
    if (sansQcm) cand.push(k(`Tu n'as encore fait aucun QCM : commence par la série 1 de la séance ${sansQcm.numero}.`, "Faire la série 1", cible("reviser", { seance: sansQcm.id, onglet: "qcm", serie: "serie" }), 1, 85, sansQcm.id));
  }
  const crt = trierPar(bs.filter(b => b.cartesARevoir > 0), b => -b.cartesARevoir, b => b.id)[0];
  if (crt) cand.push(k(`${crt.cartesARevoir} carte${S(crt.cartesARevoir)} de la séance ${crt.numero} ${crt.cartesARevoir > 1 ? "sont" : "est"} à revoir : 10 minutes dans Mémoriser suffisent.`, "Réviser les cartes",
    cible("reviser", { seance: crt.id, onglet: "memoriser", chapitre: crt.chapitre }), null, 80, crt.id));
  const lec = ex ? trierPar(bs.filter(b => b.partieNonLue && b.partiesLues > 0), b => b.id)[0] : null;
  if (lec) { const reste = lec.parties - lec.partiesLues; cand.push(k(`Il te reste ${reste} partie${S(reste)} de la leçon de la séance ${lec.numero} à lire avant l'${nom}.`, "Continuer la leçon", cible("reviser", { seance: lec.id, onglet: "lecons", chapitre: lec.chapitreNonLu, partie: lec.partieNonLue }), null, 75, lec.id)); }
  if (ex) { const j = ecart(c.aujourdhui, ex.jour); if (j > 0 && j <= 21) cand.push(conseilExamen(c, ex, nom, j)); }
  const exo = trierPar(bs.filter(b => b.exercicesARevoir > 0), b => b.id)[0];
  if (exo) cand.push(k(`${exo.exercicesARevoir} correction${S(exo.exercicesARevoir)} de la séance ${exo.numero} ${exo.exercicesARevoir > 1 ? "sont marquées" : "est marquée"} « À revoir » : refais ces exercices.`, "Refaire les exercices",
    cible("diapos", { seance: exo.id, onglet: "exercices", devoir: exo.devoir }), null, 70, exo.id));
  const rep = jp.taches.find(t => !t.faite && (t.raison || "").startsWith("Répétition"));
  const revue = rep && c.bilans.find(b => b.id === rep.seance);
  if (revue && revue.travail.length) {
    const avant = revue.travail.filter(x => x < c.aujourdhui);
    const depuis = avant.length ? ecart(avant[avant.length - 1], c.aujourdhui) : 0;
    cand.push(k(depuis > 0 ? `Tu as travaillé la séance ${revue.numero} il y a ${depuis} jour${S(depuis)} : revois-la aujourd'hui pour bien la retenir.` : `Revois la séance ${revue.numero} aujourd'hui pour bien la retenir.`,
      "Revoir la séance", rep.cible, rep.serieQcm, 65, revue.id));
  }
  if (serieDeJours >= 2) { const t = jp.taches.find(x => !x.faite); cand.push(k(`${serieDeJours} jours d'affilée : une tâche aujourd'hui prolonge ta série.`, "Voir la tâche", t ? t.cible : null, t ? t.serieQcm : null, 50)); }
  const choisis = [];
  for (const x of trierPar(cand, x => -x.priorite)) {
    if (x.seance && choisis.some(y => y.seance === x.seance)) continue;
    choisis.push(x); if (choisis.length === nombre) break;
  }
  return choisis;
}
function conseilExamen(c, ex, nom, j) {
  const cib = cible("reviser", { seance: ex.cle, onglet: "qcm", serie: "toutes" });
  const blancs = joursExamenBlanc(c.donnees.minutesParJour).map(x => decaler(ex.jour, -x)).sort();
  const prochain = blancs.find(x => x >= c.aujourdhui);
  if (prochain === c.aujourdhui) return { texte: `Aujourd'hui, examen blanc : ${M.TOUTES} questions tirées des séances de l'${nom}.`, action: "Faire l'examen blanc", cible: cib, serieQcm: null, priorite: 72 };
  if (prochain) { const d = dateLongue(prochain); return { texte: `L'${nom} a lieu dans ${j} jour${S(j)} : ton ${prochain === blancs[0] ? "premier" : "prochain"} examen blanc est prévu ${d[0].toLowerCase() + d.slice(1)}.`, action: "Voir l'examen blanc", cible: cib, serieQcm: null, priorite: 72 }; }
  return { texte: j === 1 ? `L'${nom} a lieu demain : relis tes fiches et repose-toi.` : `L'${nom} a lieu dans ${j} jours : relis tes fiches et tes formules.`, action: "Voir les fiches", cible: cible("reviser", { seance: ex.cle, onglet: "fiches" }), serieQcm: null, priorite: 72 };
}

/* ---------- Progression ---------- */
export function pretPour(c, j = c.aujourdhui) {
  const ex = C.seances.find(s => s.estExamen && s.jour >= j); if (!ex) return null;
  const couv = new Set(ex.couvre), ss = c.bilans.filter(b => couv.has(b.id));
  if (!ss.length) return null;
  const p = Math.round(ss.reduce((x, b) => x + b.score, 0) / ss.length * 100);
  return { examen: ex, pourcent: p, joursRestants: ecart(j, ex.jour),
    explication: `Moyenne de tes ${ss.length} séance${S(ss.length)} : questions réussies (40 %), leçon lue, diapos vues, cartes sues et exercices réussis (15 % chacun).` };
}
export function joursActifs() {
  return distinct([...E.PLAN.joursActifs, ...E.P.activites.map(a => jourDe(a.date)), ...E.P.qcm.map(t => jourDe(t.date)), ...E.PLAN.cochees.map(t => t.jour)]).sort();
}
export function serieDeJours(j) { const a = new Set(joursActifs()); let n = 0; for (let d = a.has(j) ? j : decaler(j, -1); a.has(d); d = decaler(d, -1)) n++; return n; }
export function scoresDesSeries(ex) {
  const ss = new Set([...ex.couvre, ex.cle]);
  const parJour = new Map();
  for (const t of E.P.qcm.filter(t => ss.has(t.seance) && t.reponses.length)) { const j = jourDe(t.date); if (!parJour.has(j)) parJour.set(j, []); parJour.get(j).push(t); }
  return [...parJour.keys()].sort().map(j => { const ts = parJour.get(j); return { jour: j, part: ts.reduce((x, t) => x + t.reponses.filter(r => r.correct === true).length, 0) / ts.reduce((x, t) => x + t.reponses.length, 0) }; });
}
export function courbe(ex) { return E.serieMaitrise(distinct(M.pool(ex).map(q => q.id))); }
