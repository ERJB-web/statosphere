/* Ce que l'élève a fait, gardé sur l'appareil (localStorage) : progression (QCM, Mémoriser, leçons lues, diapos vues,
   exercices, journal des activités), plan de révision, réglages, jeux, tutoriel R, favoris. Même forme que la version Windows. */
import { jour, jourDe, maintenant, decaler, jourSemaine } from "./outils.js";

const CLES = { progression: "statosphere.progression", plan: "statosphere.plan", reglages: "statosphere.reglages", jeux: "statosphere.jeux",
  tutoriel: "statosphere.tutoriel", favoris: "statosphere.favoris", positions: "statosphere.positions" };
function lire(cle, defaut) {
  try { const v = localStorage.getItem(cle); return v ? Object.assign(defaut, JSON.parse(v)) : defaut; } catch (e) { return defaut; }
}
function ecrire(cle, valeur) { try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) { /* stockage plein ou refusé : reste en mémoire */ } }
function prevenir(quoi) { try { document.dispatchEvent(new CustomEvent("statosphere:etat", { detail: quoi })); } catch (e) { /* rien */ } }

export const P = lire(CLES.progression, { qcm: [], memoriser: {}, raccourcis: {}, exercices: {}, leconsLues: [], diaposVues: [], activites: [] });
export const PLAN = lire(CLES.plan, { minutesParJour: 60, joursDeRepos: [], cochees: [], reports: [], travail: {}, fichesVues: [], joursActifs: [] });
export const REGLAGES = lire(CLES.reglages, { theme: "systeme" });
export const JEUX = lire(CLES.jeux, { parties: [], points: 0, bonnes: 0, jours: [], badges: [], calculsReussis: [], meilleurs: {} });
export const TUTORIEL = lire(CLES.tutoriel, { termines: [] });
export const FAVORIS = lire(CLES.favoris, { ids: [] });
export const POSITIONS = lire(CLES.positions, {});

const lues = new Set(P.leconsLues), vues = new Set(P.diaposVues);
let groupe = 0, modifiee = false;
function sauver() {
  if (groupe > 0) { modifiee = true; return; }
  P.leconsLues = [...lues]; P.diaposVues = [...vues];
  ecrire(CLES.progression, P);
  prevenir("progression");
}
/** Plusieurs changements, une seule écriture. */
export function grouper(f) { groupe++; try { f(); } finally { if (--groupe === 0 && modifiee) { modifiee = false; sauver(); } } }

/* ---------- Cibles et activités ---------- */
/** Endroit où mener l'élève : écran, séance, onglet, chapitre, partie, jeu, diapo, devoir, série, notion, carte, sujet. */
export function cible(ecran, o = {}) { const c = { ecran }; for (const k of Object.keys(o)) if (o[k] != null) c[k] = o[k]; return c; }
const ORDRE = ["ecran", "seance", "onglet", "chapitre", "partie", "jeu", "diapo", "devoir", "serie", "notion", "carte", "sujet"];
export function cleCible(c) { return c ? ORDRE.map(k => (c[k] == null ? "" : String(c[k]))).join("|") : ""; }
export const memeCible = (a, b) => cleCible(a) === cleCible(b);

export function noter(genre, c, libelle) {
  const a = { date: maintenant(), genre, cible: c, libelle };
  const der = P.activites[P.activites.length - 1];
  const t = s => new Date(s).getTime();
  if (der && ((memeCible(der.cible, c) && t(a.date) - t(der.date) < 60e3)
    || (der.genre === "diapo" && genre === "diapo" && der.cible.jeu && der.cible.jeu === c.jeu && t(a.date) - t(der.date) < 600e3))) P.activites[P.activites.length - 1] = a;
  else P.activites.push(a);
  if (P.activites.length > 50) P.activites.splice(0, P.activites.length - 50);
  sauver();
}

/* ---------- Leçons, diapos ---------- */
export const estLue = id => lues.has(id);
export function marquerLue(id) { if (lues.has(id)) return; lues.add(id); sauver(); }
export const estVue = id => vues.has(id);
export function marquerVue(id) { if (vues.has(id)) return; vues.add(id); sauver(); }

/* ---------- QCM ---------- */
export function ajouterTentative(t) { P.qcm.push(t); sauver(); }
export const tentatives = seance => P.qcm.filter(t => t.seance === seance).sort((a, b) => (a.date < b.date ? -1 : 1));
/** Dernière réponse de chaque question (tentatives dans l'ordre) ; ids limite aux questions d'une banque. */
export function dernieres(liste = P.qcm, ids = null) {
  const m = new Map();
  for (const t of liste.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)))
    for (const r of t.reponses) if (!ids || ids.has(r.id)) m.set(r.id, r.correct);
  return m;
}
/** Questions dont la dernière réponse est fausse ou absente. */
export function faibles() { const s = new Set(); for (const [id, v] of dernieres()) if (v !== true) s.add(id); return s; }
/** Part des questions de la banque dont la dernière réponse est juste. */
export function part(idsBanque, liste = P.qcm) {
  const ids = new Set(idsBanque); if (!ids.size) return 0;
  let n = 0; for (const v of dernieres(liste, ids).values()) if (v === true) n++;
  return n / ids.size;
}
/** Maîtrise à la fin de chaque jour où un QCM a été fait. */
export function serieMaitrise(idsBanque, liste = P.qcm) {
  const ids = new Set(idsBanque); if (!ids.size) return [];
  const pts = [], m = new Map(); let courant = null;
  for (const t of liste.slice().sort((a, b) => (a.date < b.date ? -1 : 1))) {
    const j = jourDe(t.date);
    if (courant !== null && j !== courant) pts.push({ jour: courant, part: compte(m) / ids.size });
    courant = j;
    for (const r of t.reponses) if (ids.has(r.id)) m.set(r.id, r.correct);
  }
  if (courant !== null) pts.push({ jour: courant, part: compte(m) / ids.size });
  return pts;
}
function compte(m) { let n = 0; for (const v of m.values()) if (v === true) n++; return n; }
/** Meilleure note, dernière note et nombre de tentatives de chaque format. */
export function meilleursScores(liste) {
  const parFormat = new Map();
  for (const t of liste.slice().sort((a, b) => (a.date < b.date ? -1 : 1))) { if (!parFormat.has(t.format)) parFormat.set(t.format, []); parFormat.get(t.format).push(t); }
  return [...parFormat.entries()].map(([format, ts]) => {
    const meilleure = ts.slice().sort((a, b) => b.note - a.note || (a.date < b.date ? -1 : 1))[0];
    return { format, meilleure: meilleure.note, date: jourDe(meilleure.date), essais: ts.length, derniere: ts[ts.length - 1].note };
  }).sort((a, b) => (a.format < b.format ? -1 : 1));
}

/* ---------- Mémoriser (boîtes de Leitner : 1 à revoir, 3 sue, 0 jamais vue) ---------- */
export const boite = id => P.memoriser[id] || 0;
export function marquerCarte(id, savait) { const b = boite(id); P.memoriser[id] = savait ? Math.min(3, Math.max(b, 1) + 1) : 1; sauver(); }

/* ---------- Exercices (autoévaluation) ---------- */
export function autoevaluer(id, reussi) { if (reussi == null) delete P.exercices[id]; else P.exercices[id] = reussi ? "reussi" : "a-revoir"; sauver(); }
export function autoevaluation(id) { const v = P.exercices[id]; return v === "reussi" ? true : v === "a-revoir" ? false : null; }

/* ---------- Plan de révision ---------- */
function sauverPlan() { ecrire(CLES.plan, PLAN); prevenir("plan"); }
export const estCochee = (j, id) => PLAN.cochees.some(t => t.jour === j && t.id === id);
export function cocher(t) { if (estCochee(t.jour, t.id)) return; PLAN.cochees.push({ ...t, faite: true }); sauverPlan(); }
export function decocher(j, id) { const n = PLAN.cochees.length; PLAN.cochees = PLAN.cochees.filter(t => !(t.jour === j && t.id === id)); if (PLAN.cochees.length !== n) sauverPlan(); }
export function reporter(t) {
  let vers = decaler(t.jour, 1);
  for (let i = 0; i < 7 && PLAN.joursDeRepos.includes(jourSemaine(vers)); i++) vers = decaler(vers, 1);
  const depart = PLAN.reports.find(r => r.id === t.id && r.vers === t.jour);
  PLAN.reports = PLAN.reports.filter(r => !(r.id === t.id && r.vers === t.jour)).filter(r => r.vers >= decaler(t.jour, -30));
  const original = depart ? depart.tache : t;
  PLAN.reports.push({ id: t.id, de: depart ? depart.de : t.jour, vers, tache: { ...original, reportee: false, enRetard: false, faite: false } });
  sauverPlan();
}
export function regler(minutes, repos) { PLAN.minutesParJour = minutes; PLAN.joursDeRepos = [...new Set(repos)].sort(); sauverPlan(); }
function ajouterJour(liste, j) { if (liste.includes(j)) return false; liste.push(j); liste.sort(); return true; }
/** Retient du journal et des QCM les jours de travail de chaque séance, les fiches ouvertes et les jours actifs. */
export function absorber(seanceDe) {
  let nouveau = false;
  for (const a of P.activites) {
    const j = jourDe(a.date);
    nouveau = ajouterJour(PLAN.joursActifs, j) || nouveau;
    const s = seanceDe(a.cible);
    if (s) { if (!PLAN.travail[s]) PLAN.travail[s] = []; nouveau = ajouterJour(PLAN.travail[s], j) || nouveau; }
    if (a.genre === "fiche" && a.cible && a.cible.chapitre != null && !PLAN.fichesVues.includes(a.cible.chapitre)) { PLAN.fichesVues.push(a.cible.chapitre); PLAN.fichesVues.sort((x, y) => x - y); nouveau = true; }
  }
  for (const t of P.qcm) nouveau = ajouterJour(PLAN.joursActifs, jourDe(t.date)) || nouveau;
  if (nouveau) ecrire(CLES.plan, PLAN);
  return nouveau;
}

/* ---------- Réglages, jeux, tutoriel, favoris, positions ---------- */
export function sauverReglages() { ecrire(CLES.reglages, REGLAGES); prevenir("reglages"); }
export function sauverJeux() { ecrire(CLES.jeux, JEUX); prevenir("jeux"); }
export function sauverTutoriel() { ecrire(CLES.tutoriel, TUTORIEL); prevenir("tutoriel"); }
export const estTermine = n => TUTORIEL.termines.includes(n);
export function terminerSujet(n, oui) { TUTORIEL.termines = TUTORIEL.termines.filter(x => x !== n); if (oui) TUTORIEL.termines.push(n); sauverTutoriel(); }
export const estFavori = id => FAVORIS.ids.includes(id);
export function basculerFavori(id) { FAVORIS.ids = estFavori(id) ? FAVORIS.ids.filter(x => x !== id) : [...FAVORIS.ids, id]; ecrire(CLES.favoris, FAVORIS); }
export function position(cle) { return POSITIONS[cle]; }
export function retenirPosition(cle, valeur) { if (POSITIONS[cle] === valeur) return; POSITIONS[cle] = valeur; ecrire(CLES.positions, POSITIONS); }

/* ---------- Exporter, importer, effacer ---------- */
export function exporter() {
  return { application: "Statosphère", format: 1, exporte: maintenant(), progression: { ...P, leconsLues: [...lues], diaposVues: [...vues] }, plan: PLAN,
    jeux: JEUX, tutoriel: TUTORIEL, favoris: FAVORIS, reglages: REGLAGES };
}
export function importer(donnees) {
  if (!donnees || typeof donnees !== "object" || !donnees.progression) throw new Error("format");
  ecrire(CLES.progression, donnees.progression);
  if (donnees.plan) ecrire(CLES.plan, donnees.plan);
  if (donnees.jeux) ecrire(CLES.jeux, donnees.jeux);
  if (donnees.tutoriel) ecrire(CLES.tutoriel, donnees.tutoriel);
  if (donnees.favoris) ecrire(CLES.favoris, donnees.favoris);
}
export function effacerTout() {
  try {
    const cles = Object.values(CLES).filter(c => c !== CLES.reglages);
    for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith("statosphere.qcm.")) cles.push(k); }
    for (const c of cles) localStorage.removeItem(c);
  } catch (e) { /* rien */ }
}
export const aujourdhui = () => jour();
