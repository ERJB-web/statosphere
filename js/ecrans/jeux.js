/* 09 · Jeux : Paires, Quelle commande R ?, Calcul éclair, Vrai ou faux éclair ; niveau, série de jours, records et badges.
   Le contenu des jeux est tiré du cours à la construction, avec les mêmes règles que la version Windows. */
import * as M from "../modele.js";
import * as E from "../etat.js";
import { C } from "../modele.js";
import { ico } from "../icones.js";
import { tete } from "../dessins.js";
import { entete, anneau, barre } from "../ui.js";
import { md, inl, tex } from "../rendu.js";
import { esc, jour, decaler, melanger, S, insecables } from "../outils.js";

const JEUX = [
  { id: "paires", titre: "Paires", texte: "Retourne les cartes et associe chaque notion à sa formule.", duree: "2 min", icone: "cartes" },
  { id: "commande", titre: "Quelle commande R ?", texte: "Une tâche à faire dans R : choisis la bonne commande.", duree: "3 min", icone: "code" },
  { id: "calcul", titre: "Calcul éclair", texte: "Un calcul du cours à faire de tête ou sur papier, arrondi comme à l'examen.", duree: "5 min", icone: "calcul" },
  { id: "vrai-faux", titre: "Vrai ou faux éclair", texte: "60 secondes pour juger le plus d'affirmations possible.", duree: "1 min", icone: "etincelle" },
];
const PAIRES_PAR_PARTIE = 6, SITUATIONS_PAR_PARTIE = 8, CALCULS_PAR_PARTIE = 5, AFFIRMATIONS_PAR_PARTIE = 60, DUREE_VF = 60;
const BADGES_FIXES = [
  ["premiere-partie", "Première partie", "Termine une première partie, à n'importe quel jeu.", "drapeau"], ["sans-faute", "Sans faute", "Termine une série d'au moins cinq réponses sans une seule erreur.", "coche"],
  ["trois-jours", "Trois jours de suite", "Joue trois jours de suite.", "flamme"], ["sept-jours", "Sept jours de suite", "Joue sept jours de suite.", "flamme"],
  ["memoire", "Mémoire d'éléphant", "Trouve toutes les paires avec au plus deux coups ratés.", "cartes"], ["eclair", "Éclair", "Donne 15 bonnes réponses au vrai ou faux éclair, en 60 secondes.", "etincelle"],
  ["serie-10", "Série de 10", "Enchaîne dix bonnes réponses dans une même partie.", "trophee"], ["niveau-5", "Niveau 5", "Atteins le niveau 5.", "etoile"],
  ["cent-bonnes", "Cent bonnes réponses", "Cumule cent bonnes réponses, tous jeux confondus.", "cible"],
];
const J = () => { const d = E.JEUX; d.points = d.points || 0; d.bonnes = d.bonnes || 0; d.jours = d.jours || []; d.records = d.records || {}; d.badges = d.badges || []; d.calculsReussis = d.calculsReussis || []; return d; };
const seuil = n => 50 * n * (n - 1);
function niveau(points) { let n = 1; while (seuil(n + 1) <= points) n++; return { niveau: n, acquis: points - seuil(n), requis: seuil(n + 1) - seuil(n) }; }
function serieJours(j) { const s = new Set(J().jours); let d = s.has(j) ? j : decaler(j, -1), n = 0; while (s.has(d)) { n++; d = decaler(d, -1); } return n; }
function badges(contenu) {
  return [...BADGES_FIXES.map(([id, titre, texte, icone]) => ({ id, titre, texte, icone })),
    ...contenu.calculsParSeance.map(s => {
      const nom = s.pastille.startsWith("Séance ") ? "la séance " + s.pastille.slice(7) : s.pastille;
      return { id: "calculs-" + s.cle, titre: `Tous les calculs de ${nom}`, texte: `Calcule juste chaque calcul de ${nom} au calcul éclair.`, icone: "calcul", pastille: s.pastille };
    })];
}
function enregistrer(res, contenu) {
  const d = J(), j = jour(), avant = niveau(d.points).niveau;
  const parfaite = res.erreurs === 0 && res.bonnes >= 5;
  const gagnes = res.bonnes * 10 + Math.max(0, res.meilleureSerie - 2) * 2 + (parfaite ? 30 : 0);
  d.points += gagnes; d.bonnes += res.bonnes;
  if (!d.jours.includes(j)) d.jours.push(j);
  for (const c of res.calculsReussis || []) if (!d.calculsReussis.includes(c)) d.calculsReussis.push(c);
  const cle = `${res.jeu}|${res.portee}`, ancien = d.records[cle], record = !ancien || res.score > ancien.score;
  if (record) d.records[cle] = { score: res.score, secondes: res.secondes, coups: res.coups, date: j };
  const serie = serieJours(j), merites = ["premiere-partie"];
  if (parfaite) merites.push("sans-faute");
  if (serie >= 3) merites.push("trois-jours");
  if (serie >= 7) merites.push("sept-jours");
  if (res.jeu === "paires" && res.coups != null && res.bonnes > 0 && res.coups - res.bonnes <= 2) merites.push("memoire");
  if (res.jeu === "vrai-faux" && res.bonnes >= 15) merites.push("eclair");
  if (res.meilleureSerie >= 10) merites.push("serie-10");
  if (niveau(d.points).niveau >= 5) merites.push("niveau-5");
  if (d.bonnes >= 100) merites.push("cent-bonnes");
  for (const s of contenu.calculsParSeance) if (s.calculs.length && s.calculs.every(c => d.calculsReussis.includes(c))) merites.push("calculs-" + s.cle);
  const tous = badges(contenu), nouveaux = [];
  for (const id of [...new Set(merites)]) { if (d.badges.some(b => b.id === id)) continue; const b = tous.find(x => x.id === id); if (!b) continue; d.badges.push({ id, date: j }); nouveaux.push(b); }
  E.sauverJeux();
  return { gagnes, avant, apres: niveau(d.points).niveau, record, nouveaux, serie };
}

/* ---------- Calcul éclair : lecture et jugement de la réponse (port de CalculEclair) ---------- */
function lire(saisie) {
  if (!saisie || !String(saisie).trim()) return null;
  const t = String(saisie).trim().replace(/[\s  ]/g, "").replace(/−/g, "-").replace(/,/g, ".");
  const f = /^(-?\d+)\/(\d+)$/.exec(t);
  if (f) { const d = +f[2]; return d === 0 ? null : +f[1] / d; }
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const x = parseFloat(t); return isFinite(x) ? x : null;
}
const decimalesMin = x => { const a = Math.abs(x); if (a >= 0.1 || a === 0) return 1; return Math.min(12, Math.max(1, Math.ceil(-Math.log10(a) - 1e-12))); };
const arrondir = (x, d) => { const k = Math.pow(10, d); return Math.sign(x) * Math.round(Math.abs(x) * k + 1e-9) / k; };
function verifier(p, saisie) {
  const texte = String(saisie || "").trim().replace(/%$/, "").trim();
  const x = lire(texte);
  if (x == null) return "illisible";
  if (Math.abs(x - p.exact) < 1e-9) return "juste";
  if (texte.includes("/") || (p.leurres || []).some(l => Math.abs(l - x) < 1e-9)) return "faux";
  const n = texte.replace(/\./g, ","), v = n.lastIndexOf(","), dec = v < 0 ? 0 : n.length - v - 1;
  return Math.abs(arrondir(p.exact, Math.max(dec, decimalesMin(p.exact))) - x) < 1e-9 ? "juste" : "faux";
}

/* ---------- Partie en cours ---------- */
let partie = null, chrono = null;
function nouvellePartie(jeu, portee, contenu) {
  const el = contenu.elements;
  const p = { jeu, portee, debut: Date.now(), bonnes: 0, erreurs: 0, serie: 0, meilleureSerie: 0, revue: [], fini: false, bilan: null };
  if (jeu === "paires") {
    const paires = [], cand = melanger(portee.paires.map(id => el.paires[id]));
    const voisines = (a, b) => {
      const mots = t => new Set(t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z]+/).filter(m => m.length >= 5).map(m => m.slice(0, 6)));
      const ma = mots(a.terme), mb = mots(b.terme); for (const m of ma) if (mb.has(m)) return true;
      const compacte = f => String(f || "").replace(/\s+|\\[,;!]|\\cdot/g, "");
      const fa = compacte(a.latex || a.definition), fb = compacte(b.latex || b.definition);
      const [c1, c2] = fa.length <= fb.length ? [fa, fb] : [fb, fa];
      if (c1.length >= 2 && c2.includes(c1)) return true;
      const g = f => { const i = f.indexOf("="); return i > 0 ? f.slice(0, i) : null; };
      if (g(fa) && g(fa).length >= 2 && g(fa) === g(fb)) return true;
      const sq = f => f.replace(/\\leftrightarrow/g, "↔").replace(/\\rightarrow|\\leftarrow/g, "→").replace(/_\{[^{}]*\}|_[A-Za-z0-9]/g, "").replace(/\\[A-Za-z]+|[A-Za-z]+/g, "L").replace(/L+/g, "L");
      return sq(fa).length > 1 && sq(fa) === sq(fb);
    };
    for (const x of cand) { if (paires.length >= PAIRES_PAR_PARTIE) break; if (!paires.some(y => voisines(y, x))) paires.push(x); }
    p.cartes = melanger(paires.flatMap(x => [{ paire: x.id, terme: true, x }, { paire: x.id, terme: false, x }])).map(c => ({ ...c, visible: false, trouvee: false }));
    p.premiere = null; p.ratees = null; p.coups = 0; p.trouvees = 0; p.nbPaires = paires.length; p.suite = 0;
  } else if (jeu === "commande") {
    const vus = new Set();
    p.situations = melanger(portee.situations.map(id => el.situations[id])).filter(s => !vus.has(s.id) && vus.add(s.id)).slice(0, SITUATIONS_PAR_PARTIE)
      .map(s => ({ ...s, ordre: s.ordreFixe ? s.cases.map((_, i) => i) : melanger(s.cases.map((_, i) => i)) }));
    p.i = 0; p.verdict = null;
  } else if (jeu === "calcul") {
    const reussis = new Set(J().calculsReussis), tous = portee.calculs.map(id => el.calculs[id]);
    let tires = melanger(tous.filter(x => !reussis.has(x.id))).slice(0, CALCULS_PAR_PARTIE);
    if (tires.length < CALCULS_PAR_PARTIE) tires = tires.concat(melanger(tous.filter(x => !tires.includes(x))).slice(0, CALCULS_PAR_PARTIE - tires.length));
    p.problemes = melanger(tires); p.i = 0; p.verdict = null; p.saisie = ""; p.message = ""; p.reussis = [];
  } else {
    const aff = portee.affirmations.map(id => el.affirmations[id]);
    const groupes = new Set(), vraies = melanger(aff.filter(a => a.vraie)), fausses = melanger(aff.filter(a => !a.vraie)), tirees = [];
    let prendreVraie = Math.random() < 0.5;
    while (tirees.length < AFFIRMATIONS_PAR_PARTIE && (vraies.length || fausses.length)) {
      const file = (prendreVraie && vraies.length) || !fausses.length ? vraies : fausses;
      const a = file.shift(); if (groupes.has(a.groupe)) continue;
      groupes.add(a.groupe); tirees.push(a); prendreVraie = !prendreVraie;
    }
    p.affirmations = melanger(tirees); p.i = 0; p.dernier = null;
  }
  return p;
}
function juste(p) { p.bonnes++; p.serie++; p.meilleureSerie = Math.max(p.meilleureSerie, p.serie); }
function faux(p) { p.erreurs++; p.serie = 0; }
function terminer(p, contenu, extra = {}) {
  p.fini = true; clearInterval(chrono);
  const secondes = Math.round((Date.now() - p.debut) / 100) / 10;
  let score;
  if (p.jeu === "paires") score = Math.max(0, p.trouvees * 20 - (p.coups - p.trouvees) * 5 + Math.max(0, 60 - Math.floor(secondes)));
  else if (p.jeu === "commande") score = p.bonnes * 10 + Math.max(0, p.meilleureSerie - 2) * 2;
  else if (p.jeu === "calcul") score = p.bonnes * 20 + Math.max(0, p.meilleureSerie - 1) * 5;
  else score = Math.max(0, p.bonnes * 10 - p.erreurs * 5) + p.meilleureSerie * 2;
  const res = { jeu: p.jeu, portee: p.portee.id, bonnes: p.jeu === "paires" ? p.trouvees : p.bonnes, erreurs: p.jeu === "paires" ? p.coups - p.trouvees : p.erreurs, meilleureSerie: p.meilleureSerie, score, secondes: p.jeu === "vrai-faux" ? DUREE_VF : secondes, coups: p.jeu === "paires" ? p.coups : null, calculsReussis: p.reussis || [], ...extra };
  p.resultat = res;
  p.bilan = enregistrer(res, contenu);
}

/* ---------- Vues ---------- */
function vueAccueil(contenu, API, porteeId) {
  const d = J(), n = niveau(d.points), serie = serieJours(jour());
  const portees = contenu.portees;
  const groupes = [["Examens", portees.filter(p => !p.plusLoin && p.seances.length > 1)], ["Séances", portees.filter(p => !p.plusLoin && p.seances.length <= 1)], ["Pour aller plus loin", portees.filter(p => p.plusLoin)]];
  const portee = portees.find(p => p.id === porteeId) || portees[0];
  const tous = badges(contenu), obtenus = new Set(d.badges.map(b => b.id));
  const dispo = j2 => j2 === "paires" ? [portee.paires.length >= 3, "Pas assez de formules pour cette séance : essaie « Tout l'intra »."] : j2 === "commande" ? [portee.situations.length >= 4, "Pas assez de commandes R pour cette séance : essaie « Tout l'intra »."]
    : j2 === "calcul" ? [portee.calculs.length > 0, "Pas de calcul pour cette séance : essaie « Tout l'intra »."] : [portee.affirmations.length > 0, "Pas encore d'affirmations pour cette séance."];
  const tuiles = JEUX.map(x => {
    const [ok, manque] = dispo(x.id), rec = d.records[`${x.id}|${portee.id}`];
    return `<section class="carte tuile-jeu"><div class="tuile-jeu-tete"><span class="icone-jeu">${ico(x.icone, 2)}</span><span class="duree-jeu">${ico("horloge", 2)}${x.duree}</span></div><h3>${esc(x.titre)}</h3><p class="attenue">${esc(x.texte)}</p>
<div class="tuile-jeu-pied"><span class="attenue petit">${esc(!ok ? manque : rec ? `Record : ${rec.score} points` : "Pas encore joué")}</span><a class="bouton${ok ? "" : " desactive"}" ${ok ? `href="${API.lien("jeux", x.id)}?portee=${encodeURIComponent(portee.id)}"` : 'aria-disabled="true"'}>Jouer</a></div></section>`;
  }).join("");
  return `${entete({ surtitre: "JEUX · 09", titre: "Révise en jouant" })}<p class="chapeau">Des parties de 1 à 5 minutes, sur une séance ou sur tout l'intra.</p>
<div class="jeux-haut"><section class="carte niveau-jeux">${anneau(n.acquis / n.requis, { couleur: "var(--violet)", taille: 92, epaisseur: 9, texte: String(n.niveau), sous: "niveau", taillePolice: 30 })}<div><div class="titre-carte">Niveau ${n.niveau}</div><p class="attenue petit">${d.points} points · encore ${n.requis - n.acquis} pour le niveau ${n.niveau + 1}</p></div></section>
<section class="carte serie-jeux"><div class="etiquette-section">SÉRIE</div><div class="titre-carte">${ico("flamme", 2)}${esc(serie === 0 ? "Joue aujourd'hui pour lancer ta série" : serie === 1 ? "1 jour de suite" : `${serie} jours de suite`)}</div></section>
<section class="carte badges-jeux"><div class="etiquette-section">BADGES · ${obtenus.size} / ${tous.length}</div><div class="badges-grille">${tous.map(b => `<span class="badge-jeu${obtenus.has(b.id) ? " obtenu" : ""}" title="${esc(b.titre + " · " + b.texte)}">${b.pastille ? `<small>${esc(b.pastille.replace("Séance ", "S"))}</small>` : ico(b.icone, 2)}</span>`).join("")}</div></section></div>
<label class="portee-jeux"><span class="etiquette-section">SUR QUOI JOUER</span><select class="champ" data-portee>${groupes.filter(g => g[1].length).map(([lib, l]) => `<optgroup label="${esc(lib)}">${l.map(p => `<option value="${esc(p.id)}"${p === portee ? " selected" : ""}>${esc(p.detail ? `${p.libelle} · ${p.detail}` : p.libelle)}</option>`).join("")}</optgroup>`).join("")}</select></label>
<div class="grille-jeux">${tuiles}</div>`;
}
function vueBilan(p, contenu, API) {
  const r = p.resultat, b = p.bilan, n = niveau(J().points);
  const reussite = r.bonnes + r.erreurs ? r.bonnes / (r.bonnes + r.erreurs) : 0;
  const titre = reussite >= 0.9 ? "Bravo !" : reussite >= 0.6 ? "Bien joué !" : "Continue, ça rentre !";
  const resume = r.jeu === "paires" ? `${r.bonnes} paires en ${r.coups} coups et ${r.secondes < 60 ? Math.floor(r.secondes) + " s" : Math.floor(r.secondes / 60) + " min " + String(Math.floor(r.secondes % 60)).padStart(2, "0") + " s"}`
    : r.jeu === "vrai-faux" ? `${r.bonnes} bonnes réponses en 60 secondes, série de ${r.meilleureSerie}` : `${r.bonnes} sur ${r.bonnes + r.erreurs}, série de ${r.meilleureSerie}`;
  const fete = reussite >= 0.75 || (b.record && r.bonnes > 0) || b.nouveaux.length > 0;
  return `<section class="carte bilan-jeu">${fete ? `<div class="confettis" aria-hidden="true">${Array.from({ length: 26 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.12}s;--c:${["var(--orange)", "var(--sarcelle)", "var(--violet)", "var(--ampoule)", "var(--bleu)"][i % 5]}"></i>`).join("")}</div>` : ""}
<div class="bilan-tete">${tete(fete ? "content" : "reflechit")}<div><div class="titre">${esc(titre)}</div><p class="attenue">${esc(resume)}</p></div></div>
<div class="bilan-chiffres"><div><span class="etiquette-section">SCORE</span><b>${r.score}</b>${b.record && r.bonnes > 0 ? `<small class="record">Nouveau record !</small>` : ""}</div><div><span class="etiquette-section">POINTS</span><b>+${b.gagnes}</b><small>${esc(b.apres > b.avant ? `Tu passes au niveau ${b.apres} !` : `Niveau ${n.niveau}`)}</small></div>
<div class="bilan-niveau">${barre(n.acquis / n.requis)}<small class="attenue">${n.acquis} / ${n.requis} points vers le niveau ${n.niveau + 1}</small></div></div>
${b.nouveaux.map(x => `<div class="nouveau-badge"><span class="badge-jeu obtenu">${ico(x.icone, 2)}</span><div><span class="etiquette-section">NOUVEAU BADGE</span><b>${esc(x.titre)}</b><small class="attenue">${esc(x.texte)}</small></div></div>`).join("")}
${p.revue.length ? `<div class="etiquette-section" style="margin-top:14px">À REVOIR</div><ul class="revue-jeu">${p.revue.map(x => `<li><div>${inl(x.texte)}</div><div class="gras">Réponse : ${inl(x.reponse)}</div><div class="attenue">${md(x.explication)}</div></li>`).join("")}</ul>` : ""}
<div class="rangee"><button class="bouton" data-rejouer>${ico("retourner")}Rejouer</button><a class="bouton secondaire" href="#/jeux">Retour aux jeux</a></div></section>`;
}
function vuePartie(p, contenu, API) {
  const titre = JEUX.find(x => x.id === p.jeu).titre;
  let corps = "", avancement = "";
  if (p.jeu === "paires") {
    avancement = `${p.trouvees} / ${p.nbPaires}`;
    corps = `<p class="attenue">Retourne deux cartes à la fois : une notion et sa formule.</p><div class="grille-paires${p.cartes.length <= 6 ? " trois" : ""}">${p.cartes.map((c, i) =>
      `<button class="carte-paire${c.visible || c.trouvee ? " visible" : ""}${c.trouvee ? " trouvee" : ""}" data-carte="${i}" aria-label="${c.visible || c.trouvee ? esc(c.terme ? c.x.terme : c.x.definition) : `Carte ${i + 1}, face cachée`}">
<span class="dos">σ</span><span class="face">${c.terme ? esc(c.x.terme) : c.x.latex ? tex(c.x.latex) : esc(c.x.definition)}</span></button>`).join("")}</div>`;
  } else if (p.jeu === "commande") {
    const s = p.situations[p.i]; avancement = `${p.i + 1} / ${p.situations.length}`;
    corps = `<div class="carte situation"><div class="etiquette-section">TÂCHE</div><div class="enonce-jeu">${md(s.texte)}</div></div>
<div class="cases-commande">${s.ordre.map(k => `<button class="case-commande${p.verdict ? (k === s.bonne ? " bonne" : k === p.verdict.choisie ? " fausse" : "") : ""}" data-case="${k}"${p.verdict ? " disabled" : ""}>${inl(s.cases[k])}</button>`).join("")}</div>
${p.verdict ? `<div class="verdict-jeu ${p.verdict.juste ? "bon" : "faux"}"><b>${p.verdict.juste ? "Juste !" : `Pas tout à fait : c'est ${inl(s.cases[s.bonne])}`}</b>${md(p.verdict.explication)}</div><div class="rangee fin"><button class="bouton" data-suivant>${p.i + 1 >= p.situations.length ? "Voir le bilan" : "Tâche suivante"}${ico("droite", 2)}</button></div>` : ""}`;
  } else if (p.jeu === "calcul") {
    const q = p.problemes[p.i]; avancement = `${p.i + 1} / ${p.problemes.length}`;
    corps = `<div class="carte situation"><div class="etiquette-section">CALCULE</div><div class="enonce-jeu">${md(q.enonce)}</div>
<form class="saisie-calcul" data-calcul><input class="champ" inputmode="decimal" autocomplete="off" placeholder="Ta réponse" value="${esc(p.saisie)}"${p.verdict ? " disabled" : ""}>${q.unite ? `<span class="unite">${esc(q.unite)}</span>` : ""}<button class="bouton" type="submit"${p.verdict ? " disabled" : ""}>Vérifier</button></form>
<p class="attenue petit">Arrondis à la fin seulement, avec un ou deux chiffres après la virgule, ou écris la fraction.</p>${p.message ? `<p class="message-calcul">${esc(p.message)}</p>` : ""}</div>
${p.verdict ? `<div class="verdict-jeu ${p.verdict === "juste" ? "bon" : "faux"}"><b>${esc(p.verdict === "juste" ? `Juste ! ${q.reponse}${q.unite ? " " + q.unite : ""}` : `Pas tout à fait : la réponse est ${q.reponse}${q.unite ? " " + q.unite : ""}`)}</b><div class="attenue petit">À l'examen : ${esc(q.admises.join(" ou "))}</div><div class="etiquette-section" style="margin-top:8px">CORRIGÉ PAS À PAS</div>${md(q.explication)}</div>
<div class="rangee fin"><button class="bouton" data-suivant>${p.i + 1 >= p.problemes.length ? "Voir le bilan" : "Calcul suivant"}${ico("droite", 2)}</button></div>` : ""}`;
  } else {
    const a = p.affirmations[p.i];
    avancement = p.bonnes <= 1 ? `${p.bonnes} bonne réponse` : `${p.bonnes} bonnes réponses`;
    corps = `<div class="chrono-vf"><div class="piste-barre"><i data-reste style="width:100%"></i></div><b data-secondes>${DUREE_VF} s</b></div>
<div class="carte affirmation${p.dernier ? " " + p.dernier : ""}">${a.contexte ? `<div class="attenue petit">${inl(a.contexte)}</div>` : ""}<div class="texte-affirmation">${inl(a.texte)}</div></div>
<div class="boutons-vf"><button class="bouton vf vrai" data-vf="1">${ico("coche", 2.6)}Vrai</button><button class="bouton vf faux" data-vf="0">${ico("croix", 2.6)}Faux</button></div><p class="attenue petit centre aide-touches-vf">Au clavier : V ou ← pour vrai, F ou → pour faux.</p>`;
  }
  return `<div class="partie-jeu"><div class="partie-tete"><a class="bouton secondaire petit" href="#/jeux">${ico("gauche", 2)}Quitter</a><div class="partie-titre"><b>${esc(titre)}</b><small class="attenue">${esc(p.portee.libelle)}</small></div><span class="avancement-jeu">${esc(avancement)}</span><span class="serie-jeu">${ico("flamme", 2)}${p.serie}</span></div>${corps}</div>`;
}

export default async function jeux(r, API) {
  const contenu = await M.chargerJeux();
  if (!contenu) return { ecran: "jeux", html: `<div class="carte message">Les jeux ne s'ouvrent pas pour l'instant.</div>` };
  const jeu = r.segments[0], porteeId = r.query.portee || E.position("jeux.portee");
  if (r.query.portee) E.retenirPosition("jeux.portee", r.query.portee);
  if (!jeu) {
    partie = null; clearInterval(chrono);
    return {
      ecran: "jeux", titreDocument: "Jeux", html: vueAccueil(contenu, API, porteeId),
      apres(main) { main.querySelector("[data-portee]").addEventListener("change", e => { E.retenirPosition("jeux.portee", e.target.value); API.rendre({ garder: true }); }); },
    };
  }
  const portee = contenu.portees.find(p => p.id === porteeId) || contenu.portees[0];
  if (!partie || partie.jeu !== jeu || partie.portee.id !== portee.id) partie = nouvellePartie(jeu, portee, contenu);
  const p = partie;
  const rendre = () => API.rendre({ garder: true, sansDefilement: true });
  if (p.fini) {
    return { ecran: "jeux", titreDocument: "Jeux", html: vueBilan(p, contenu, API), apres(main) { main.querySelector("[data-rejouer]").addEventListener("click", () => { partie = nouvellePartie(jeu, portee, contenu); rendre(); }); } };
  }
  const repondreVF = vraie => {
    if (p.fini) return;
    const a = p.affirmations[p.i]; p.i++;
    if (a.vraie === vraie) { juste(p); p.dernier = "juste"; } else { faux(p); p.dernier = "faux"; p.revue.push({ texte: a.texte, reponse: a.vraie ? "Vrai" : "Faux", explication: a.explication }); }
    if (p.i >= p.affirmations.length) terminer(p, contenu);
    rendre();
  };
  return {
    ecran: "jeux", titreDocument: "Jeux", html: vuePartie(p, contenu, API),
    clavier(ev) {
      if (p.jeu === "vrai-faux") { const k = ev.key.toLowerCase(); if (k === "v" || ev.key === "ArrowLeft") { repondreVF(true); return true; } if (k === "f" || ev.key === "ArrowRight") { repondreVF(false); return true; } }
      if ((p.jeu === "commande" || p.jeu === "calcul") && ev.key === "Enter" && p.verdict) { const b = document.querySelector("[data-suivant]"); if (b) b.click(); return true; }
      return false;
    },
    apres(main) {
      if (p.jeu === "paires") {
        for (const b of main.querySelectorAll("[data-carte]")) b.addEventListener("click", () => {
          const i = +b.getAttribute("data-carte"), c = p.cartes[i];
          if (c.visible || c.trouvee || p.fini) return;
          if (p.ratees) { for (const k of p.ratees) p.cartes[k].visible = false; p.ratees = null; clearTimeout(p.minuteur); }
          c.visible = true;
          if (p.premiere == null) { p.premiere = i; rendre(); return; }
          const autre = p.cartes[p.premiere]; p.coups++;
          if (autre.paire === c.paire) { autre.trouvee = c.trouvee = true; p.trouvees++; p.suite++; p.meilleureSerie = Math.max(p.meilleureSerie, p.suite); }
          else { p.suite = 0; p.ratees = [p.premiere, i]; p.minuteur = setTimeout(() => { if (p.ratees) { for (const k of p.ratees) p.cartes[k].visible = false; p.ratees = null; rendre(); } }, 1100); }
          p.premiere = null;
          if (p.trouvees === p.nbPaires) terminer(p, contenu);
          rendre();
        });
      } else if (p.jeu === "commande") {
        for (const b of main.querySelectorAll("[data-case]")) b.addEventListener("click", () => {
          if (p.verdict) return;
          const s = p.situations[p.i], k = +b.getAttribute("data-case"), ok = k === s.bonne;
          if (ok) juste(p); else faux(p);
          const pourquoi = ok ? null : s.pourquoiFaux && s.pourquoiFaux[k];
          p.verdict = { juste: ok, choisie: k, explication: pourquoi && pourquoi.trim() ? `${pourquoi.trim()} ${s.explication}` : s.explication };
          if (!ok) p.revue.push({ texte: s.texte, reponse: s.cases[s.bonne], explication: s.explication });
          rendre();
        });
        const sv = main.querySelector("[data-suivant]"); if (sv) sv.addEventListener("click", () => { p.verdict = null; p.i++; if (p.i >= p.situations.length) terminer(p, contenu); rendre(); });
      } else if (p.jeu === "calcul") {
        const f = main.querySelector("[data-calcul]");
        const champ = f.querySelector("input"); if (!p.verdict) setTimeout(() => champ.focus(), 50);
        f.addEventListener("submit", e => {
          e.preventDefault(); if (p.verdict) return;
          const q = p.problemes[p.i], v = verifier(q, champ.value);
          p.saisie = champ.value;
          if (v === "illisible") { p.message = "Écris un nombre, par exemple 0,25 ou 5/6."; rendre(); return; }
          p.message = ""; p.verdict = v;
          if (v === "juste") { juste(p); p.reussis.push(q.id); } else { faux(p); p.revue.push({ texte: `${q.enonce} Tu as écrit ${champ.value.trim()}.`, reponse: q.reponse + (q.unite ? " " + q.unite : ""), explication: q.explication }); }
          rendre();
        });
        const sv = main.querySelector("[data-suivant]"); if (sv) sv.addEventListener("click", () => { if (!p.verdict) { faux(p); } p.verdict = null; p.saisie = ""; p.i++; if (p.i >= p.problemes.length) terminer(p, contenu); rendre(); });
      } else {
        for (const b of main.querySelectorAll("[data-vf]")) b.addEventListener("click", () => repondreVF(b.getAttribute("data-vf") === "1"));
        clearInterval(chrono);
        const maj = () => {
          const reste = Math.max(0, DUREE_VF - (Date.now() - p.debut) / 1000);
          const s = main.querySelector("[data-secondes]"), i = main.querySelector("[data-reste]");
          if (s) s.textContent = `${Math.ceil(reste)} s`; if (i) i.style.width = `${(reste / DUREE_VF) * 100}%`;
          if (reste <= 0 && !p.fini) { terminer(p, contenu); rendre(); }
        };
        maj(); chrono = setInterval(maj, 250);
      }
    },
    quitter() { clearInterval(chrono); },
  };
}
