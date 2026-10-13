/* Le tuteur (port de Core/Tutorat/Tuteur.cs) : reprendre la dernière activité, conseiller la suite, rappeler et encourager.
   Des règles explicables, sans réseau. */
import * as M from "./modele.js";
import * as E from "./etat.js";
import { C } from "./modele.js";
import { S, jourDe, decaler, ecart, dans, distinct, trierPar } from "./outils.js";

const { cible } = E;
export const SEUIL_FAIBLE = 0.6;
const RepriseP = 200, ErreursP = 100, SerieErreursP = 90, CartesP = 80, DevoirP = 75, PreparerP = 70, ExamenP = 65, FaibleP = 60, CommencerP = 50, AvancerP = 40, PlusLoinP = 30;
const conseil = (genre, titre, pourquoi, c, priorite) => ({ genre, titre, pourquoi, cible: c, priorite });
const pct = p => Math.round(p * 100);

/* ---------- Mesures ---------- */
export function evaluations(d) { return M.corrections(d).map(c => E.autoevaluation(`${d.devoir}/${c.texte}`)); }
export const vuesDuJeu = j => { let n = 0; for (let k = 1; k <= j.count; k++) if (E.estVue(j.id(k))) n++; return n; };
export function avancement(s) {
  const parties = M.leconsDe(s).flatMap(l => l.parties);
  const cartes = M.fichesDe(s).flatMap(M.cartesDe);
  return { leconsLues: parties.filter(p => E.estLue(p.id)).length, parties: parties.length, cartesSues: cartes.filter(c => E.boite(c.id) >= 3).length, cartes: cartes.length };
}
/** « Leçons 5/19 · Maîtrise 37 % · Cartes 6/14 ». */
export function resume(s) {
  const a = avancement(s);
  const q = M.pool(s).map(x => x.id);
  const m = q.length && (s.estExamen ? M.couvertes(s).some(x => E.tentatives(x.cle).length) : E.tentatives(s.cle).length) ? E.part(q) : null;
  return `Leçons ${a.leconsLues}/${a.parties} · Maîtrise ${m == null ? "—" : pct(m) + " %"} · Cartes ${a.cartesSues}/${a.cartes}`;
}
function erreursParPartie(pool, faibles) {
  const m = new Map();
  for (const q of pool) if (q.lecon && faibles.has(q.id)) m.set(q.lecon, (m.get(q.lecon) || 0) + 1);
  return trierPar([...m.entries()].map(([lecon, erreurs]) => ({ lecon, erreurs })), e => -e.erreurs, e => e.lecon);
}

/* ---------- Série de jours et parcours ---------- */
export function serie(j) {
  const jours = new Set([...E.P.activites.map(a => jourDe(a.date)), ...E.P.qcm.map(t => jourDe(t.date))]);
  const auj = jours.has(j);
  let n = 0;
  for (let d = auj ? j : decaler(j, -1); jours.has(d); d = decaler(d, -1)) n++;
  return { jours: n, aujourdhui: auj };
}
/** Où en est l'élève dans tout le cours (séances datées hors examens). */
export function parcours() {
  const seances = M.datees().filter(s => !s.estExamen);
  const av = seances.map(avancement);
  const jeux = distinct(seances.flatMap(M.jeuxDe), j => j.nom);
  const dern = E.dernieres();
  const questions = distinct(seances.flatMap(s => (M.banque(s.cle) || { questions: [] }).questions).map(q => q.id));
  const evals = distinct(seances.flatMap(M.devoirsDe), d => d.devoir).flatMap(evaluations);
  const somme = (t, f) => t.reduce((x, y) => x + f(y), 0);
  return [
    { libelle: "Leçons lues", faits: somme(av, a => a.leconsLues), total: somme(av, a => a.parties) },
    { libelle: "Diapos vues", faits: somme(jeux, vuesDuJeu), total: somme(jeux, j => j.count) },
    { libelle: "Questions réussies", faits: questions.filter(id => dern.get(id) === true).length, total: questions.length },
    { libelle: "Cartes sues", faits: somme(av, a => a.cartesSues), total: somme(av, a => a.cartes) },
    { libelle: "Exercices réussis", faits: evals.filter(v => v === true).length, total: evals.length },
  ].filter(l => l.total > 0);
}

/* ---------- Validité d'une cible ---------- */
export function valide(c) {
  if (!c) return false;
  const seance = c.seance == null || !!M.trouver(c.seance);
  switch (c.ecran) {
    case "accueil": case "coder-r": case "jeux": case "plan": case "outils": case "raccourcis": case "reglages": return true;
    case "catalogue": return c.notion == null || !C.catalogue || C.catalogue.entries.some(e => e.id === c.notion);
    case "reviser":
      if (!seance) return false;
      if (c.partie != null && !M.partie(c.partie)) return false;
      if (c.chapitre != null) {
        if (c.onglet === "lecons" && !C.lecons[c.chapitre]) return false;
        if ((c.onglet === "fiches" || c.onglet === "memoriser") && !C.fiches[c.chapitre]) return false;
      }
      if (c.carte != null && !(c.chapitre != null && C.fiches[c.chapitre] && M.cartesDe(C.fiches[c.chapitre]).some(x => x.id === c.carte))) return false;
      return true;
    case "diapos": {
      if (!seance) return false;
      if (c.jeu != null) { const j = M.jeu(c.jeu); if (!j || (c.diapo != null && (c.diapo < 1 || c.diapo > j.count))) return false; }
      if (c.devoir != null && !C.devoirs[c.devoir]) return false;
      return true;
    }
    default: return false;
  }
}

/* ---------- Reprendre ---------- */
export function reprendre() {
  const der = E.P.activites[E.P.activites.length - 1];
  if (!der) return null;
  if (!valide(der.cible)) return ramener(der);
  switch (der.genre) {
    case "lecon": return reprendreLecon(der.cible);
    case "diapo": return reprendreDiapos(der.cible);
    case "devoir": return reprendreDevoir(der.cible);
    case "carte": case "fiche": return reprendreCartes(der.cible);
    case "qcm": return reprendreQcm(der);
    default: return null;
  }
}
function chapitreTeste(seance, chapitre) {
  if (E.P.activites.some(a => a.genre === "qcm" && a.cible.serie === "chapitre" && a.cible.chapitre === chapitre)) return true;
  const s = seance && M.trouver(seance); if (!s) return false;
  const du = new Set(M.pool(s).filter(q => q.chapitre === chapitre).map(q => q.id));
  return E.tentatives(seance).some(t => t.reponses.length >= 10 && t.reponses.every(r => du.has(r.id)));
}
function reprendreLecon(c) {
  const p = c.partie && M.partie(c.partie); if (!p) return null;
  const { lecon, index: i } = p, partie = lecon.parties[i];
  const sd = M.seanceDuChapitre(lecon.chapitre), seance = sd ? sd.cle : c.seance;
  const vers = id => cible("reviser", { seance, onglet: "lecons", chapitre: lecon.chapitre, partie: id });
  if (!E.estLue(partie.id)) return conseil("reprendre", `Reprends la leçon ${M.Chap.de(lecon.chapitre)}`, `Tu étais sur « ${partie.titre} ».`, vers(partie.id), RepriseP);
  const suivante = lecon.parties.slice(i + 1).find(x => !E.estLue(x.id));
  if (suivante) return conseil("reprendre", `Continue la leçon ${M.Chap.de(lecon.chapitre)}`, `Tu as fini « ${partie.titre} » ; la suite : « ${suivante.titre} ».`, vers(suivante.id), RepriseP);
  const oubliee = lecon.parties.slice(0, i).find(x => !E.estLue(x.id));
  if (oubliee) return conseil("reprendre", `Continue la leçon ${M.Chap.de(lecon.chapitre)}`, `Tu as lu la fin de la leçon ; il te reste « ${oubliee.titre} », plus haut.`, vers(oubliee.id), RepriseP);
  if (!chapitreTeste(seance, lecon.chapitre))
    return conseil("reprendre", `Teste-toi sur la leçon ${M.Chap.de(lecon.chapitre)}`, "Tu as lu toute la leçon : vérifie ce que tu en as retenu avec 20 questions du chapitre.",
      cible("reviser", { seance, onglet: "qcm", chapitre: lecon.chapitre, serie: "chapitre" }), RepriseP);
  const f = C.fiches[lecon.chapitre];
  const nouvelles = f ? M.cartesDe(f).filter(x => E.boite(x.id) === 0).length : 0;
  if (nouvelles > 0) return conseil("reprendre", `Passe aux cartes ${M.Chap.de(lecon.chapitre)}`, `Tu as lu la leçon et fait le test ; ${nouvelles} carte${S(nouvelles)} à découvrir dans Mémoriser.`,
    cible("reviser", { seance, onglet: "memoriser", chapitre: lecon.chapitre }), RepriseP);
  const s = seance && M.trouver(seance);
  if (s) for (const nom of s.diapos) {
    const j = M.jeu(nom); if (!j) continue;
    for (let k = 1; k <= j.count; k++) if (!E.estVue(j.id(k)))
      return conseil("reprendre", `Passe aux diapos : ${j.libelle}`, "Tu as lu la leçon et fait le test ; les diapos de la séance la reprennent autrement.", cible("diapos", { seance: s.cle, jeu: j.nom, diapo: k }), RepriseP);
  }
  return null;
}
function devoirAFaire(s) { return M.devoirsDe(s).find(d => evaluations(d).some(v => v == null)) || null; }
function reprendreDiapos(c) {
  const j = c.jeu && M.jeu(c.jeu); if (!j) return null;
  const n = c.diapo || 0;
  const ordre = []; for (let k = n + 1; k <= j.count; k++) ordre.push(k); for (let k = 1; k <= Math.min(n, j.count); k++) ordre.push(k);
  const suivante = ordre.find(k => !E.estVue(j.id(k)));
  if (suivante) {
    const v = vuesDuJeu(j);
    return conseil("reprendre", `Reprends les diapos : ${j.libelle}`, c.diapo ? `Ta dernière diapo vue : la ${c.diapo} sur ${j.count}.` : `Tu en as vu ${v} sur ${j.count}.`,
      cible("diapos", { seance: c.seance, jeu: j.nom, diapo: suivante }), RepriseP);
  }
  const s = c.seance && M.trouver(c.seance); if (!s) return null;
  for (const nom of s.diapos.filter(x => x !== j.nom)) {
    const autre = M.jeu(nom); if (!autre) continue;
    for (let k = 1; k <= autre.count; k++) if (!E.estVue(autre.id(k)))
      return conseil("reprendre", `Passe aux diapos suivantes : ${autre.libelle}`, `Tu as vu les diapos : ${j.libelle}.`, cible("diapos", { seance: s.cle, jeu: autre.nom, diapo: k }), RepriseP);
  }
  const d = devoirAFaire(s);
  if (d) return conseil("reprendre", "Passe aux exercices de la séance", `Tu as vu les diapos : ${j.libelle}. Mets-les en pratique.`, cible("diapos", { seance: s.cle, onglet: "exercices", devoir: d.devoir }), RepriseP);
  return qcmDeLaSeance(s, `Tu as vu les diapos : ${j.libelle}.`);
}
function reprendreDevoir(c) {
  const d = c.devoir && C.devoirs[c.devoir]; if (!d) return null;
  const ev = evaluations(d), restantes = ev.filter(v => v == null).length;
  if (restantes > 0) return conseil("reprendre", `Reprends le devoir : ${d.titre}`, `${restantes} correction${S(restantes)} sur ${ev.length} attend${restantes > 1 ? "ent" : ""} ton autoévaluation.`,
    cible("diapos", { seance: d.seance, onglet: "exercices", devoir: d.devoir }), RepriseP);
  const s = M.trouver(d.seance); if (!s) return null;
  const autre = devoirAFaire(s);
  if (autre) return conseil("reprendre", `Passe au devoir suivant : ${autre.titre}`, `Tu as autoévalué tout le devoir « ${d.titre} ».`, cible("diapos", { seance: autre.seance, onglet: "exercices", devoir: autre.devoir }), RepriseP);
  return qcmDeLaSeance(s, `Tu as autoévalué tout le devoir « ${d.titre} ».`);
}
function qcmDeLaSeance(s, fait) {
  return M.banque(s.cle) && E.tentatives(s.cle).length === 0
    ? conseil("reprendre", "Teste-toi sur la séance", `${fait} Vérifie ce que tu en as retenu avec 20 questions.`, cible("reviser", { seance: s.cle, onglet: "qcm", serie: "serie20" }), RepriseP)
    : null;
}
function reprendreCartes(c) {
  const f = c.chapitre != null && C.fiches[c.chapitre]; if (!f) return null;
  const restantes = M.cartesDe(f).filter(x => E.boite(x.id) <= 1).length;
  const sd = M.seanceDuChapitre(c.chapitre);
  return restantes === 0 ? null : conseil("reprendre", `Continue Mémoriser : ${M.Chap.court(c.chapitre)}`, `Il te reste ${restantes} carte${S(restantes)} à revoir ou à découvrir.`,
    cible("reviser", { seance: sd ? sd.cle : c.seance, onglet: "memoriser", chapitre: c.chapitre }), RepriseP);
}
function reprendreQcm(der) {
  const s = der.cible.seance && M.trouver(der.cible.seance); if (!s) return null;
  const f = E.faibles();
  const ratees = M.pool(s).filter(q => f.has(q.id)).length;
  return ratees === 0 ? null : conseil("reprendre", "Refais tes questions ratées",
    `Ta dernière série : ${der.libelle}. ${ratees} question${S(ratees)} de la séance attend${ratees > 1 ? "ent" : ""} une bonne réponse.`,
    cible("reviser", { seance: s.cle, onglet: "qcm", serie: "erreurs" }), RepriseP);
}
function ramener(der) {
  const ecran = der.cible.ecran;
  if (!["diapos", "reviser", "coder-r", "catalogue"].includes(ecran)) return null;
  const seance = der.cible.seance && M.trouver(der.cible.seance) ? der.cible.seance : null;
  return conseil("reprendre", "Reprends où tu en étais", `Ta dernière activité : ${der.libelle}.`, cible(ecran, { seance, onglet: ecran === "reviser" ? der.cible.onglet : null }), RepriseP);
}

/* ---------- Conseiller ---------- */
export function conseiller(j, nombre = 3) {
  const rep = reprendre(), reprise = rep && rep.cible;
  const candidats = [...erreurs(), ...cartes(), ...devoirsARevoir(), ...preparer(j), ...examen(j), ...faiblesSeances()];
  if (rienFait()) { const p = commencer(); if (p) candidats.push(p); }
  else candidats.push(...avancer(), ...plusLoin(j));
  const vus = new Set(), r = [];
  for (const c of trierPar(candidats.filter(c => !E.memeCible(c.cible, reprise) && valide(c.cible)), c => -c.priorite)) {
    const k = E.cleCible(c.cible); if (vus.has(k)) continue; vus.add(k); r.push(c);
    if (r.length === nombre) break;
  }
  return r;
}
function erreurs() {
  const f = E.faibles(); if (!f.size) return [];
  let pire = null;
  for (const s of C.seances.filter(s => !s.estExamen && M.banque(s.cle))) {
    const p = M.pool(s), top = erreursParPartie(p, f)[0];
    if (top && (!pire || top.erreurs > pire.top.erreurs)) pire = { seance: s, pool: p, top };
  }
  if (!pire) return [];
  const r = [];
  const pt = M.partie(pire.top.lecon);
  if (pt) {
    const n = pire.top.erreurs, sd = M.seanceDuChapitre(pt.lecon.chapitre);
    r.push(conseil("erreurs", `Revois « ${pt.lecon.parties[pt.index].titre} »`,
      `${n} question${S(n)} du QCM sur cette partie de la leçon ${M.Chap.de(pt.lecon.chapitre)} attend${n > 1 ? "ent" : ""} encore une bonne réponse.`,
      cible("reviser", { seance: sd ? sd.cle : pire.seance.cle, onglet: "lecons", chapitre: pt.lecon.chapitre, partie: pt.lecon.parties[pt.index].id }), ErreursP + n));
  }
  const ratees = pire.pool.filter(q => f.has(q.id)).length, serie = Math.min(ratees, M.SERIE);
  r.push(conseil("erreurs", `Refais tes questions ratées (${ratees})`, `Une série de ${serie} question${S(serie)} : celles que tu as ratées ou pas encore faites dans cette séance.`,
    cible("reviser", { seance: pire.seance.cle, onglet: "qcm", serie: "erreurs" }), SerieErreursP));
  return r;
}
function cartes() {
  let pire = null;
  for (const f of Object.values(C.fiches).sort((a, b) => a.chapitre - b.chapitre)) {
    const n = M.cartesDe(f).filter(c => E.boite(c.id) === 1).length;
    if (n > 0 && (!pire || n > pire.n)) pire = { f, n };
  }
  if (!pire) return [];
  const ch = pire.f.chapitre, sd = M.seanceDuChapitre(ch);
  return [conseil("cartes", `Revois ${pire.n} carte${S(pire.n)} ${M.Chap.de(ch)}`,
    pire.n === 1 ? "Tu l'as marquée « À revoir » : la reprendre aujourd'hui la fixe dans ta mémoire." : "Tu les as marquées « À revoir » : les reprendre aujourd'hui les fixe dans ta mémoire.",
    cible("reviser", { seance: sd ? sd.cle : null, onglet: "memoriser", chapitre: ch }), CartesP)];
}
function devoirsARevoir() {
  const l = trierPar(Object.values(C.devoirs).map(d => ({ d, n: evaluations(d).filter(v => v === false).length })).filter(x => x.n > 0), x => x.d.seance, x => x.d.devoir);
  if (!l.length) return [];
  const x = l[0];
  return [conseil("devoir", `Reprends la correction : ${x.d.titre}`, `Tu as marqué ${x.n} correction${S(x.n)} « À revoir ».`, cible("diapos", { seance: x.d.seance, onglet: "exercices", devoir: x.d.devoir }), DevoirP)];
}
function preparer(j) {
  const s = M.prochaine(j);
  if (!s || s.estExamen || !s.jour || ecart(j, s.jour) > 7) return [];
  const p = pas(s); if (!p) return [];
  return [conseil("preparer", `Prépare la séance du ${M.dateCourteSeance(s)}`, `Elle a lieu ${dans(ecart(j, s.jour))} ; ${p.quoi}.`, p.cible, PreparerP)];
}
function examen(j) {
  const ex = M.datees().find(s => s.estExamen && s.jour >= j && ecart(j, s.jour) <= 14);
  if (!ex) return [];
  let pire = null;
  for (const s of M.couvertes(ex).filter(s => M.banque(s.cle))) {
    const p = E.part(M.banque(s.cle).questions.map(q => q.id));
    if (!pire || p < pire.part) pire = { seance: s, part: p };
  }
  if (!pire) return [];
  const quand = `L'examen a lieu ${dans(ecart(j, ex.jour))}`;
  const pourquoi = E.tentatives(pire.seance.cle).length === 0
    ? `${quand} ; tu n'as encore fait aucun QCM sur la séance du ${M.dateCourteSeance(pire.seance)}.`
    : `${quand} ; c'est la séance du ${M.dateCourteSeance(pire.seance)} que tu maîtrises le moins (${pct(pire.part)} %).`;
  return [conseil("examen", `Prépare l'${ex.titre.toLowerCase()}`, pourquoi, cible("reviser", { seance: pire.seance.cle, onglet: "qcm", serie: "serie20" }), ExamenP)];
}
function faiblesSeances() {
  const dern = E.dernieres();
  let pire = null;
  for (const s of M.datees().filter(s => !s.estExamen && M.banque(s.cle) && E.tentatives(s.cle).length > 0)) {
    const rep = M.banque(s.cle).questions.filter(q => dern.has(q.id)).map(q => dern.get(q.id));
    const taux = rep.length ? rep.filter(v => v === true).length / rep.length : 1;
    if (rep.length >= 10 && taux < SEUIL_FAIBLE && (!pire || taux < pire.taux)) pire = { s, taux };
  }
  if (!pire) return [];
  return [conseil("faible", `Consolide la séance du ${M.dateCourteSeance(pire.s)}`, `Tu y réussis ${pct(pire.taux)} % des questions : une série de 20, en commençant par tes erreurs.`,
    cible("reviser", { seance: pire.s.cle, onglet: "qcm", serie: "serie20-erreurs" }), FaibleP)];
}
function avancer() {
  const r = []; let rang = 0;
  for (const s of M.datees().filter(s => !s.estExamen)) {
    const p = pas(s); if (!p) continue;
    r.push(conseil("avancer", `Avance dans la séance du ${M.dateCourteSeance(s)}`, `${s.titre} : ${p.quoi}.`, p.cible, AvancerP - rang));
    if (++rang === 2) break;
  }
  return r;
}
function commencee(s) {
  return s.chapitres.some(ch => C.lecons[ch] && C.lecons[ch].parties.some(p => E.estLue(p.id)))
    || s.diapos.some(n => { const j = M.jeu(n); return j && vuesDuJeu(j) > 0; })
    || E.tentatives(s.cle).length > 0
    || s.chapitres.some(ch => C.fiches[ch] && M.cartesDe(C.fiches[ch]).some(c => E.boite(c.id) > 0))
    || M.devoirsDe(s).some(d => evaluations(d).some(v => v != null));
}
function plusLoin(j) {
  const passees = M.datees().filter(s => !s.estExamen && s.jour < j);
  if (!passees.length || passees.some(s => pas(s))) return [];
  const fac = M.facultatives().map(s => ({ s, p: pas(s) })).filter(x => x.p);
  const enCours = fac.find(x => commencee(x.s));
  if (enCours) return [conseil("plusloin", `Continue la séance facultative : ${enCours.s.titre}`, `Ton cours est à jour ; dans cette séance pour aller plus loin, ${enCours.p.quoi}.`, enCours.p.cible, PlusLoinP)];
  if (fac.length) return [conseil("plusloin", `Pour aller plus loin, si tu veux : ${fac[0].s.titre}`, "Séance facultative : ton cours est à jour, et celle-ci va au-delà de ce que le cours demande.", fac[0].p.cible, PlusLoinP)];
  return [];
}
/** Ce qui reste à faire dans une séance. */
export function pas(s) {
  for (const ch of s.chapitres) {
    const l = C.lecons[ch]; if (!l) continue;
    const p = l.parties.find(x => !E.estLue(x.id));
    if (p) return { cible: cible("reviser", { seance: s.cle, onglet: "lecons", chapitre: ch, partie: p.id }), quoi: `la partie « ${p.titre} » n'est pas encore lue` };
  }
  for (const nom of s.diapos) {
    const jj = M.jeu(nom); if (!jj) continue;
    for (let k = 1; k <= jj.count; k++) if (!E.estVue(jj.id(k))) return { cible: cible("diapos", { seance: s.cle, jeu: nom, diapo: k }), quoi: `les diapos « ${jj.libelle} » ne sont pas toutes vues` };
  }
  if (M.banque(s.cle) && E.tentatives(s.cle).length === 0) return { cible: cible("reviser", { seance: s.cle, onglet: "qcm", serie: "serie20" }), quoi: "fais une première série de 20 questions" };
  const d = devoirAFaire(s);
  if (d) return { cible: cible("diapos", { seance: s.cle, onglet: "exercices", devoir: d.devoir }), quoi: evaluations(d).some(v => v != null) ? `le devoir « ${d.titre} » n'est pas terminé` : `le devoir « ${d.titre} » n'est pas encore fait` };
  for (const ch of s.chapitres) {
    const f = C.fiches[ch];
    if (f && M.cartesDe(f).some(c => E.boite(c.id) === 0)) return { cible: cible("reviser", { seance: s.cle, onglet: "memoriser", chapitre: ch }), quoi: `des cartes ${M.Chap.de(ch)} attendent dans Mémoriser` };
  }
  return null;
}
function rienFait() { const p = E.P; return !p.activites.length && !p.qcm.length && !p.leconsLues.length && !Object.keys(p.memoriser).length && !Object.keys(p.exercices).length && !p.diaposVues.length; }
function commencer() {
  for (const s of M.datees().filter(s => !s.estExamen))
    for (const ch of s.chapitres) {
      const l = C.lecons[ch];
      if (l && l.parties.length) return conseil("commencer", "Commence par la première séance", `${M.longueSeance(s)} · ${s.titre} : la leçon commence par « ${l.parties[0].titre} ».`,
        cible("reviser", { seance: s.cle, onglet: "lecons", chapitre: ch, partie: l.parties[0].id }), CommencerP);
    }
  return null;
}

/* ---------- Rappels et encouragement ---------- */
export function rappels(j) {
  const r = [];
  const s = M.prochaine(j);
  if (s) { const d = M.longueSeance(s); r.push(`${s.estExamen ? "Prochain examen" : "Prochaine séance"} : ${d[0].toLowerCase() + d.slice(1)} · ${s.titre}`); }
  const n = Object.values(E.P.memoriser).filter(v => v === 1).length;
  if (n > 0) r.push(`${n} carte${S(n)} à revoir dans Mémoriser`);
  const c = Object.values(C.devoirs).reduce((x, d) => x + evaluations(d).filter(v => v === false).length, 0);
  if (c > 0) r.push(`${c} correction${S(c)} de devoir à revoir`);
  return r;
}
export function encouragement(j) {
  const { jours, aujourdhui } = serie(j);
  if (jours >= 2) return aujourdhui ? `${jours} jours d'étude d'affilée : continue sur ta lancée !` : `${jours} jours d'étude d'affilée jusqu'à hier : un peu de travail aujourd'hui prolonge la série.`;
  const sues = Object.values(E.P.memoriser).filter(v => v >= 2).length;
  if (sues > 0) return `Tu connais déjà ${sues} carte${S(sues)} de mémoire : chaque révision compte.`;
  const lues = E.P.leconsLues.length;
  if (!lues) return null;
  return lues <= 5 ? `${lues} partie${S(lues)} de leçon lue${S(lues)} : beau départ, garde le rythme.` : `${lues} parties de leçon lues : garde le rythme.`;
}
