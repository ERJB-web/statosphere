/* Le cours chargé en mémoire : calendrier des séances, leçons, fiches, banques de QCM, diapos, devoirs, catalogue, tutoriel R.
   Mêmes règles que la version Windows (SeanceCalendar, RevisionContent, DiaposContent, DevoirsContent, MemorizeDeck, Maitrise…). */
import * as Contenu from "./contenu.js";
import { dateCourte, dateLongue, trierPar, distinct } from "./outils.js";

export const C = {
  seances: [], lecons: {}, fiches: {}, banques: {}, quiz: {}, jeux: {}, devoirs: {}, catalogue: null, tutoriel: null, ajouts: null,
  conseils: null, lexique: null, lectures: {}, jeuxContenu: null, pret: false,
};
export const DEVOIR_TUTORIEL = "20_R";
export const PREMIER_FACULTATIF = 31;
export const SERIE = 20, TOUTES = 100;

/* ---------- Chargement ---------- */
export async function charger() {
  const J = Contenu.lireJson;
  const brutes = await J("seances.json");
  const seances = (brutes && brutes.seances) || [];
  for (const s of seances) {
    s.type = s.type || "seance"; s.chapitres = s.chapitres || []; s.diapos = s.diapos || []; s.devoirs = s.devoirs || []; s.couvre = s.couvre || []; s.court = s.court || "";
    s.cle = s.date || s.id || ""; s.estExamen = s.type === "examen"; s.estFacultative = s.type === "facultative"; s.jour = s.date || null;
  }
  C.seances = trierPar(seances.filter(s => !s.estFacultative), s => s.date || "").concat(seances.filter(s => s.estFacultative));
  const fichiers = Contenu.liste("");
  const taches = [];
  for (const f of fichiers) {
    let m;
    if ((m = /^lecons\/chapitre-(\d+)\.json$/.exec(f))) taches.push(J(f).then(x => { if (x) C.lecons[x.chapitre] = x; }));
    else if ((m = /^fiches\/chapitre-(\d+)\.json$/.exec(f))) taches.push(J(f).then(x => { if (x) C.fiches[x.chapitre] = x; }));
    else if ((m = /^qcm\/seance-(.+)\.json$/.exec(f))) taches.push(J(f).then(x => { if (x) C.banques[x.seance] = x; }));
    else if ((m = /^qcm\/quiz-cours-(.+)\.json$/.exec(f))) taches.push(J(f).then(x => { if (x) C.quiz[x.seance] = x; }));
    else if ((m = /^diapos\/([^/]+)\.json$/.exec(f))) {
      const nom = m[1];
      if (Contenu.existe(`diapos/${nom}/decoupage.json`))
        taches.push(Promise.all([J(f), J(`diapos/${nom}/decoupage.json`)]).then(([x, d]) => { if (x && d) C.jeux[nom] = creerJeu(nom, x, d); }));
    } else if ((m = /^exercices\/([^/]+)\.json$/.exec(f))) taches.push(J(f).then(x => { if (x) C.devoirs[x.devoir] = x; }));
  }
  taches.push(J("catalogue.json").then(x => { C.catalogue = x; }));
  taches.push(J("tuteur/conseils.json").then(x => { C.conseils = x; }));
  taches.push(J("tuteur/lexique.json").then(x => { C.lexique = x; }));
  taches.push(J("tutoriel-r/tutoriel.json").then(x => { C.tutoriel = x; }));
  taches.push(J("precalcul/lectures.json").then(x => { C.lectures = x || {}; }));
  await Promise.all(taches);
  for (const q of Object.values(C.banques)) for (const x of q.questions) normaliserQuestion(x);
  for (const q of Object.values(C.quiz)) for (const x of q.questions) normaliserQuestion(x);
  C.pret = true;
}
function normaliserQuestion(q) { q.serie = q.serie || 0; q.chapitre = q.chapitre || 0; q.type = q.type || "concept"; q.choix = q.choix || []; q.pourquoiFaux = q.pourquoiFaux || []; }
export async function chargerJeux() {
  if (!C.jeuxContenu) C.jeuxContenu = await Contenu.lireJson("precalcul/jeux.json");
  return C.jeuxContenu;
}

/* ---------- Calendrier ---------- */
export const datees = () => C.seances.filter(s => !s.estFacultative);
export const facultatives = () => C.seances.filter(s => s.estFacultative);
export const trouver = cle => C.seances.find(s => s.cle === cle) || null;
export const seanceDuChapitre = ch => C.seances.find(s => !s.estExamen && s.chapitres.includes(ch)) || null;
/** Numéro de séance : 1 à n pour les séances du plan de cours, puis les séances facultatives à la suite ; 0 pour un examen. */
export function numero(s) { if (!s || s.estExamen) return 0; return C.seances.filter(x => !x.estExamen).indexOf(s) + 1; }
export const numeroDuChapitre = ch => { const s = seanceDuChapitre(ch); return s ? numero(s) : 0; };
/** Première séance ou premier examen datés à partir du jour (la séance du jour reste la prochaine jusqu'à minuit). */
export const prochaine = j => datees().find(s => s.jour >= j) || null;
export const couvertes = examen => examen.couvre.map(trouver).filter(Boolean);
/** « 28 sept » ; le nom court d'une séance facultative (« Plus loin 1 »). */
export const dateCourteSeance = s => (s.jour ? dateCourte(s.jour) : s.court);
export const longueSeance = s => (s.jour ? dateLongue(s.jour) : s.court);
export const nomDeSeance = s => (s.estFacultative ? `la séance ${s.court}` : `la séance du ${dateCourteSeance(s)}`);
/** « chapitres 3 et 4 », « chapitres 8 à 13 et 17 », « introduction et chapitre 1 », « séance facultative ». */
export function textesChapitres(s) {
  if (s.estFacultative) return "séance facultative";
  const c = s.chapitres;
  if (c.length && c[0] === 0) return c.length === 1 ? "introduction" : "introduction et " + chapitres(c.slice(1), s.sources);
  return chapitres(c, s.sources);
}
function chapitres(c, sources) {
  if (!c.length) return "";
  if (c.length === 1) return `chapitre ${c[0]}`;
  const morceaux = [];
  for (let i = 0; i < c.length;) {
    let j = i;
    while (j + 1 < c.length && c[j + 1] === c[j] + 1) j++;
    if (j - i >= 2) morceaux.push(`${c[i]} à ${c[j]}`); else for (let k = i; k <= j; k++) morceaux.push(String(c[k]));
    i = j + 1;
  }
  return "chapitres " + (morceaux.length === 1 ? morceaux[0] : morceaux.slice(0, -1).join(", ") + " et " + morceaux[morceaux.length - 1]);
}
/** Encart de la barre latérale : étiquette et texte de la prochaine échéance. */
export function encart(j) {
  if (!datees().length) return { lib: "", txt: "" };
  const s = prochaine(j);
  if (!s) return { lib: "SESSION TERMINÉE", txt: "L'examen final est passé : bonne fin de session." };
  return { lib: s.estExamen ? "PROCHAIN EXAMEN" : "PROCHAIN QUIZ", txt: s.estExamen ? `${longueSeance(s)} · ${s.titre}` : `${longueSeance(s)} · ${s.titre} · ${textesChapitres(s)}` };
}

/* ---------- Noms de chapitre ---------- */
const estFacultatif = ch => ch >= PREMIER_FACULTATIF;
const plusLoin = ch => `Plus loin ${ch - PREMIER_FACULTATIF + 1}`;
export const Chap = {
  etiquette: ch => (ch === 0 ? "Introduction" : estFacultatif(ch) ? plusLoin(ch) : `Ch. ${ch}`),
  long: ch => (ch === 0 ? "Introduction" : estFacultatif(ch) ? plusLoin(ch) : `Chapitre ${ch}`),
  court: ch => (ch === 0 ? "l'introduction" : estFacultatif(ch) ? plusLoin(ch) : `ch. ${ch}`),
  de: ch => (ch === 0 ? "de l'introduction" : estFacultatif(ch) ? `de la séance ${plusLoin(ch)}` : `du ch. ${ch}`),
};

/* ---------- Leçons, fiches, banques ---------- */
export function chapitresDe(s) { return s.estExamen ? distinct(couvertes(s).flatMap(x => x.chapitres)) : s.chapitres; }
export const leconsDe = s => chapitresDe(s).map(ch => C.lecons[ch]).filter(Boolean);
export const fichesDe = s => chapitresDe(s).map(ch => C.fiches[ch]).filter(Boolean);
export function partie(id) {
  for (const l of Object.values(C.lecons)) { const i = l.parties.findIndex(p => p.id === id); if (i >= 0) return { lecon: l, index: i }; }
  return null;
}
export const banque = cle => C.banques[cle] || null;
export const quizCours = cle => C.quiz[cle] || null;
/** Questions d'une séance, ou de toutes les séances couvertes par un examen. */
export function pool(s) { return s.estExamen ? couvertes(s).flatMap(x => (banque(x.cle) || { questions: [] }).questions) : (banque(s.cle) || { questions: [] }).questions; }

/* ---------- Mémoriser : chaque cadre de fiche qui a une formule devient une carte ---------- */
export function cadres(f) { return [...f.recto.blocs, ...f.verso.blocs].filter(b => (b.type || "cadre") === "cadre"); }
export function cartesDe(f) {
  if (!f) return [];
  return cadres(f).filter(c => c.formule).map(c => ({
    id: `ch${String(f.chapitre).padStart(2, "0")}/${String(c.numero).padStart(2, "0")}`, numero: c.numero, titre: c.titre,
    consigne: c.consigne || "Retrouve la formule principale du cadre.", formule: c.formule, secondaires: c.secondaires || [], regles: c.regles || [],
    explication: c.explication || "", chapitre: f.chapitre,
  }));
}
export const ordreLeitner = boite => (boite === 0 ? 1.5 : boite);
export function formulesDecortiquees(f) {
  const r = [];
  for (const c of cadres(f)) for (const x of (c.formule ? [c.formule, ...(c.secondaires || [])] : (c.secondaires || []))) if (x.latex) r.push({ cadre: c, formule: x });
  return r;
}

/* ---------- Diapos ---------- */
const ETIQUETTES_DIAPO = { titre: "TITRE", section: "SECTION", notion: "NOTION", exemple: "EXEMPLE", interpretation: "INTERPRÉTATION", code: "CODE R", figure: "FIGURE" };
export const etiquetteDiapo = t => ETIQUETTES_DIAPO[t] || String(t || "").toUpperCase();
function creerJeu(nom, explications, decoupage) {
  return {
    nom, explications, decoupage, count: decoupage.diapos.length,
    id: n => `${nom}/${n}`,
    libelle: `${Chap.etiquette(explications.chapitre)} · ${explications.titre}`,
    image: page => `diapos/${nom}/${decoupage.images[page - 1]}`,
    diapo: n => explications.diapos.find(d => d.n === n) || null,
  };
}
export const jeu = nom => C.jeux[nom] || null;
export const jeuxDe = s => (s.diapos || []).map(jeu).filter(Boolean);

/* ---------- Devoirs ---------- */
export const devoirsDe = s => (s.devoirs || []).filter(d => d !== DEVOIR_TUTORIEL).map(d => C.devoirs[d]).filter(Boolean);
export function corrections(d) { const r = []; (function parcourir(blocs) { for (const b of blocs || []) if (b.genre === "correction") r.push(b); })(d.sujet.blocs); return r; }
export const TYPES_PARTIE = { calcul: "CALCUL", concept: "CONCEPT", "r-donnees": "R · DONNÉES FOURNIES", "r-en-ligne": "R · DONNÉES EN LIGNE", "r-fichier": "R · FICHIER À FOURNIR", article: "ANALYSE D'ARTICLE", activite: "ACTIVITÉ" };
export const etiquettesDevoir = d => distinct((d.parties || []).flatMap(p => p.types || [])).map(t => TYPES_PARTIE[t] || t.toUpperCase());

/* ---------- Teintes des séances ---------- */
/** Variable CSS de la teinte d'une séance (une teinte par numéro ; la treizième reprend la première ; examen à part). */
export function teinte(n) { return n <= 0 ? "var(--seance-examen)" : `var(--seance-${((n - 1) % 12) + 1})`; }
export const teinteSeance = s => (s && s.estExamen ? "var(--seance-examen)" : teinte(numero(s)));
