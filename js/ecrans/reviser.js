/* 05 · Réviser : séance par séance, onglets Leçons, Fiches, QCM, Mémoriser et Progrès (mêmes règles que la version Windows). */
import * as M from "../modele.js";
import * as E from "../etat.js";
import * as T from "../tuteur.js";
import { C } from "../modele.js";
import { ico } from "../icones.js";
import { tete } from "../dessins.js";
import { entete, piste, selecteurSeance, lierSelecteurs, anneau, barre, courbe, legende } from "../ui.js";
import { md, inl, inlLu, tex, blocLecon, carteFormule, tableau, lectureDe, hydrater } from "../rendu.js";
import { scriptsLecon } from "../positron.js";
import { esc, jour, S, insecables, melanger, distinct, trierPar, maintenant, jourDe, dateCourte } from "../outils.js";

const ONGLETS = [
  { id: "lecons", libelle: "Leçons", icone: "livre" }, { id: "fiches", libelle: "Fiches", icone: "feuillets" }, { id: "qcm", libelle: "QCM", icone: "listeCochee" },
  { id: "memoriser", libelle: "Mémoriser", icone: "cartes" }, { id: "progres", libelle: "Progrès", icone: "graphique" },
];
const libelleChap = ch => { const l = C.lecons[ch] || C.fiches[ch]; const e = M.Chap.etiquette(ch); return l && !(ch === 0 && l.titre === "Introduction") ? `${e} · ${l.titre}` : e; };
const aContenu = s => M.pool(s).length > 0 || M.leconsDe(s).length > 0;
function seanceParDefaut() {
  const memo = E.position("reviser.seance"); if (memo && M.trouver(memo)) return M.trouver(memo);
  const j = jour(), next = M.prochaine(j);
  if (next && aContenu(next)) return next;
  return C.seances.filter(s => s.jour && s.jour <= j && aContenu(s)).pop() || next || C.seances[0];
}
function puceChapitre(ch, actif, href) {
  const n = M.numeroDuChapitre(ch);
  return `<a class="puce teintee${actif ? " actif" : ""}" style="--teinte:${M.teinte(n)}" href="${href}" data-remplacer><span class="point"></span>${esc(libelleChap(ch))}</a>`;
}
const cartesMessage = (icone, texte) => `<div class="carte message"><div class="tuile-message">${ico(icone)}</div><div>${esc(texte)}</div></div>`;

/* ===================== Leçons ===================== */
function ongletLecons(s, r, API, ctx) {
  const chapitres = M.chapitresDe(s).filter(ch => C.lecons[ch]);
  if (!M.chapitresDe(s).length) return { html: cartesMessage("livre", "Aucun chapitre pour cette séance.") };
  if (!chapitres.length) return { html: cartesMessage("livre", "Pas de leçon pour ce chapitre.") };
  const [, , chArg, partieArg] = r.segments;
  const memo = E.position("lecon.chapitre." + s.cle);
  const ch = chapitres.includes(+chArg) ? +chArg : chapitres.includes(memo) ? memo : chapitres[0];
  E.retenirPosition("lecon.chapitre." + s.cle, ch);
  const L = C.lecons[ch], parties = L.parties;
  const memoPartie = E.position("lecon.partie." + ch);
  let i = parties.findIndex(p => p.id === partieArg);
  if (i < 0) i = parties.findIndex(p => p.id === memoPartie);
  if (i < 0) { i = parties.findIndex(p => !E.estLue(p.id)); if (i < 0) i = 0; }
  const p = parties[i];
  E.retenirPosition("lecon.partie." + ch, p.id);
  const route = k => API.lien("reviser", "lecons", s.cle, ch, parties[k].id);
  const lues = parties.filter(x => E.estLue(x.id)).length;
  const faibles = E.faibles();
  const aRevoir = new Set(M.pool(s).concat(s.estExamen ? [] : ((M.quizCours(s.cle) || {}).questions || [])).filter(q => q.lecon && faibles.has(q.id)).map(q => q.lecon));
  const n = M.numeroDuChapitre(ch);
  const sommaire = `<div class="sommaire-lecon"><div class="sommaire-tete"><b>${inl(L.titre)}</b>${barre(parties.length ? lues / parties.length : 0)}<span class="attenue petit">${lues} partie(s) lue(s) sur ${parties.length}</span></div>
<ol class="parties">${parties.map((x, k) => `<li><a class="partie${k === i ? " courante" : ""}${E.estLue(x.id) ? " lue" : ""}" href="${route(k)}" data-remplacer><span class="rond-lu">${E.estLue(x.id) ? ico("coche", 3) : ""}</span><span class="t">${k + 1}. ${inl(x.titre)}</span>${aRevoir.has(x.id) ? '<span class="badge-revoir">À REVOIR</span>' : ""}</a></li>`).join("")}</ol>
<div class="sommaire-boutons"><a class="bouton secondaire" href="${API.lien("reviser", "qcm", s.cle)}?serie=chapitre&chapitre=${ch}">${ico("listeCochee")}Tester ce chapitre (QCM)</a>${C.fiches[ch] ? `<a class="bouton secondaire" href="${API.lien("reviser", "fiches", s.cle, ch)}">${ico("feuillets")}Fiche du chapitre</a>` : ""}</div></div>`;
  let partie = `<div class="surtitre petit-fil">${esc(`${M.Chap.etiquette(ch).toUpperCase()} · ${L.titre.toUpperCase()} · PARTIE ${i + 1} SUR ${parties.length}`)}</div><h2 class="titre-partie">${inl(p.titre)}${p.horsProgramme ? ' <span class="badge-revoir">HORS PROGRAMME</span>' : ""}</h2>`;
  if (i === 0 && (L.objectifs || []).length) partie += `<div class="objectifs"><div class="encadre-tete vert">${ico("cible", 2.1)}<span>CE QUE TU SAURAS FAIRE À LA FIN DU CHAPITRE</span></div><ul>${L.objectifs.map(o => `<li>${ico("coche", 2.8)}<span>${inl(o)}</span></li>`).join("")}</ul></div>`;
  const ctxCode = { script: scriptsLecon({ numero: n, titre: L.titre, partie: i + 1, titrePartie: p.titre }) };
  partie += p.blocs.map(b => blocLecon(b, ctxCode)).join("");
  if (i === parties.length - 1 && (L.resume || []).length) partie += `<div class="resume-chapitre"><div class="encadre-tete">${ico("etoile", 2.1)}<span>RÉSUMÉ DU CHAPITRE</span></div>${L.resume.map(x => `<p>${inlLu(x)}</p>`).join("")}</div>`;
  partie += `<div class="fin-partie" id="fin-partie"></div>`;
  const prec = i > 0 ? route(i - 1) : null, suiv = i < parties.length - 1 ? route(i + 1) : null;
  partie += `<div class="barre-suite"><a class="bouton secondaire${prec ? "" : " desactive"}" ${prec ? `href="${prec}" data-remplacer data-sens="-1"` : 'aria-disabled="true"'}>${ico("gauche", 2)}<span class="lib-long">Partie précédente</span></a>
<div class="position">Partie ${i + 1} / ${parties.length}</div><a class="bouton${suiv ? "" : " desactive"}" ${suiv ? `href="${suiv}" data-remplacer data-sens="1"` : 'aria-disabled="true"'}><span class="lib-long">Partie suivante</span>${ico("droite", 2)}</a></div>`;
  const puces = chapitres.length > 1 ? `<div class="puces puces-chapitres">${chapitres.map(c => puceChapitre(c, c === ch, API.lien("reviser", "lecons", s.cle, c))).join("")}</div>` : "";
  E.noter("lecon", E.cible("reviser", { seance: s.cle, onglet: "lecons", chapitre: ch, partie: p.id }), `Leçon ${M.Chap.de(ch)} · ${p.titre}`);
  let observateur = null;
  return {
    html: `${puces}<div class="lecon" style="--teinte:${M.teinte(n)}"><details class="sommaire-mobile"><summary>${ico("listeCochee")}<span>Sommaire · partie ${i + 1} sur ${parties.length}</span>${ico("chevronBas", 2.2)}</summary></details><aside class="colonne-sommaire">${sommaire}</aside><article class="colonne-partie">${partie}</article></div>`,
    suite: { prec, suiv },
    apres(main) {
      const det = main.querySelector(".sommaire-mobile");
      if (det) det.addEventListener("toggle", () => { if (det.open && !det.querySelector(".sommaire-lecon")) det.insertAdjacentHTML("beforeend", sommaire); });
      const courante = main.querySelector(".colonne-sommaire .partie.courante");
      if (courante) courante.scrollIntoView({ block: "nearest" });
      const fin = main.querySelector("#fin-partie");
      if (fin && "IntersectionObserver" in window && !E.estLue(p.id)) {
        let vu = false;
        observateur = new IntersectionObserver(es => {
          if (vu || !es.some(e2 => e2.isIntersecting)) return;
          vu = true; observateur.disconnect();
          E.marquerLue(p.id);
          const lien = main.querySelector(".colonne-sommaire .partie.courante");
          if (lien) { lien.classList.add("lue"); lien.querySelector(".rond-lu").innerHTML = ico("coche", 3); }
        }, { threshold: 0.1 });
        setTimeout(() => observateur && observateur.observe(fin), 800);
      }
    },
    quitter() { if (observateur) observateur.disconnect(); },
  };
}

/* ===================== Fiches ===================== */
const COULEURS_FICHE = { bleu: "var(--bleu)", sarcelle: "var(--sarcelle)", vert: "var(--vert)", orange: "var(--orange)" };
function formuleFiche(f) {
  if (!f) return "";
  if (f.latex) { const l = f.lecture || (lectureDe(f.latex) ? `« ${lectureDe(f.latex)} »` : ""); return `<div class="fiche-formule">${tex(f.latex, true)}</div>${f.resultat ? `<div class="formule-resultat">${inl(f.resultat)}</div>` : ""}${l ? `<div class="se-lit">${inl(l)}</div>` : ""}`; }
  if (f.code) return `<pre class="code">${esc(f.code)}</pre>`;
  return f.texte ? `<div class="fiche-formule texte">${inl(f.texte)}</div>` : "";
}
function blocFiche(b) {
  const largeur = b.largeur === "demi" ? " demi" : "";
  const t = b.type || "cadre";
  if (t === "cadre") {
    return `<section class="cadre-fiche${largeur}" style="--c:${COULEURS_FICHE[b.couleur] || COULEURS_FICHE.bleu}"><div class="cadre-tete"><span class="num">${b.numero}</span><b>${inl(b.titre)}</b></div>
${b.explication ? `<p class="cadre-expl">${inlLu(b.explication)}</p>` : ""}${formuleFiche(b.formule)}${(b.secondaires || []).map(formuleFiche).join("")}
${(b.regles || []).length ? `<ul class="regles">${b.regles.map(x => `<li>${inlLu(x)}</li>`).join("")}</ul>` : ""}${(b.puces || []).length ? `<ul class="regles">${b.puces.map(x => `<li>${inlLu(x)}</li>`).join("")}</ul>` : ""}</section>`;
  }
  if (t === "bandeau") return `<div class="bandeau-fiche${largeur}">${inlLu(b.texte)}</div>`;
  if (t === "exemples") return `<section class="cadre-fiche${largeur} exemples" style="--c:var(--violet)"><div class="cadre-tete"><b>${inl(b.titre || "Exemples")}</b></div>${(b.items || []).map(formuleFiche).join("")}</section>`;
  if (t === "commandesR") return `<section class="cadre-fiche${largeur} commandes" style="--c:var(--bleu-profond)"><div class="cadre-tete"><b>${inl(b.titre || "Dans R")}</b></div>${(b.commandes || []).map(c => `<div class="commande-r"><code class="c">${esc(c.commande)}</code> <span>${inlLu(c.role)}</span></div>`).join("")}</section>`;
  if (t === "pieges") return `<section class="cadre-fiche${largeur} pieges" style="--c:var(--orange)"><div class="cadre-tete"><b>Pièges</b></div><ul class="regles">${(b.pieges || []).map(x => `<li>${inlLu(x)}</li>`).join("")}</ul></section>`;
  return "";
}
function ongletFiches(s, r, API) {
  const chapitres = M.chapitresDe(s).filter(ch => C.fiches[ch]);
  if (!chapitres.length) return { html: cartesMessage("feuillets", M.chapitresDe(s).length ? "Pas de fiche pour ce chapitre." : "Aucun chapitre pour cette séance.") };
  const [, , chArg, vueArg, iArg] = r.segments;
  const memo = E.position("fiche.chapitre." + s.cle);
  const ch = chapitres.includes(+chArg) ? +chArg : chapitres.includes(memo) ? memo : chapitres[0];
  E.retenirPosition("fiche.chapitre." + s.cle, ch);
  const vue = vueArg === "formules" || vueArg === "apercu" ? vueArg : E.position("fiche.vue") || "apercu";
  E.retenirPosition("fiche.vue", vue);
  const f = C.fiches[ch];
  const formules = M.formulesDecortiquees(f);
  E.noter("fiche", E.cible("reviser", { seance: s.cle, onglet: "fiches", chapitre: ch }), `Fiche ${M.Chap.de(ch)}`);
  const puces = `<div class="puces puces-chapitres">${chapitres.map(c => puceChapitre(c, c === ch, API.lien("reviser", "fiches", s.cle, c, vue))).join("")}</div>`;
  const choixVue = `<nav class="piste piste-vue">${[["apercu", "feuillets", "Aperçu recto verso"], ["formules", "racine", "Formules décortiquées"]].map(([id, ic, lib]) =>
    `<a class="onglet${id === vue ? " actif" : ""}" href="${API.lien("reviser", "fiches", s.cle, ch, id)}" data-remplacer>${ico(ic)}<span>${lib}</span></a>`).join("")}</nav>`;
  const outils = `<div class="outils-fiche"><button class="bouton" data-imprimer>${ico("imprimer")}Imprimer ou enregistrer en PDF</button><a class="bouton secondaire" href="${API.lien("reviser", "memoriser", s.cle, ch)}">${ico("cartes")}Mémoriser ce chapitre</a></div>`;
  let corps, suite = null;
  if (vue === "formules" && formules.length) {
    const i = Math.max(0, Math.min(formules.length - 1, +iArg || 0));
    const route = k => API.lien("reviser", "fiches", s.cle, ch, "formules", k);
    const x = formules[i];
    const prec = i > 0 ? route(i - 1) : null, suiv = i < formules.length - 1 ? route(i + 1) : null;
    suite = { prec, suiv };
    corps = `<div class="attenue petit legende-fiche">${esc(`${libelleChap(ch)} · ${formules.length} formule${S(formules.length)} décortiquée${S(formules.length)}`)}</div>
<div class="formules-fiche"><nav class="liste-formules">${formules.map((y, k) => `<a class="item-formule${k === i ? " courant" : ""}" href="${route(k)}" data-remplacer>${esc(`${String(y.cadre.numero).padStart(2, "0")} · ${y.cadre.titre}`)}</a>`).join("")}</nav>
<div class="detail-formule"><div class="attenue petit gras">${esc(`${String(x.cadre.numero).padStart(2, "0")} · ${x.cadre.titre}`)}</div>${carteFormule(x.formule)}
<div class="barre-suite"><a class="bouton secondaire${prec ? "" : " desactive"}" ${prec ? `href="${prec}" data-remplacer data-sens="-1"` : 'aria-disabled="true"'}>${ico("gauche", 2)}<span class="lib-long">Précédente</span></a><div class="position">${i + 1} / ${formules.length}</div><a class="bouton${suiv ? "" : " desactive"}" ${suiv ? `href="${suiv}" data-remplacer data-sens="1"` : 'aria-disabled="true"'}><span class="lib-long">Suivante</span>${ico("droite", 2)}</a></div></div></div>`;
  } else {
    const face = (cote, x) => `<section class="face-fiche"><div class="face-tete"><span>${cote}</span><b>${inl(x.titre)}</b></div><div class="grille-fiche">${x.blocs.map(blocFiche).join("")}</div></section>`;
    corps = `<div class="attenue petit legende-fiche">${esc(`${libelleChap(ch)} · recto, puis verso`)}</div><div class="fiche" id="fiche-imprimable"><header class="fiche-titre"><span>${esc(M.Chap.etiquette(ch))}</span><b>${inl(f.titre)}</b></header>${face("RECTO", f.recto)}${face("VERSO", f.verso)}</div>`;
  }
  return {
    html: `<div class="barre-fiche">${puces}${choixVue}</div>${corps}${outils}`, suite,
    apres(main) { const b = main.querySelector("[data-imprimer]"); if (b) b.addEventListener("click", () => { document.body.classList.add("impression-fiche"); window.print(); setTimeout(() => document.body.classList.remove("impression-fiche"), 500); }); },
  };
}

/* ===================== QCM ===================== */
const sessions = new Map(); // séance → session en cours
const CLE_SESSION = "statosphere.qcm.";
function sauverSession(cle, s) { try { if (s) localStorage.setItem(CLE_SESSION + cle, JSON.stringify(s)); else localStorage.removeItem(CLE_SESSION + cle); } catch (e) { /* rien */ } }
function lireSession(cle) {
  if (sessions.has(cle)) return sessions.get(cle);
  try { const v = JSON.parse(localStorage.getItem(CLE_SESSION + cle) || "null"); if (v) { sessions.set(cle, v); return v; } } catch (e) { /* rien */ }
  return null;
}
function tirer(pool, demande, faibles) {
  if (demande.format === "quiz") return pool.slice();
  let source = demande.format === "serie" ? pool.filter(q => q.serie === demande.serie) : demande.format === "chapitre" ? pool.filter(q => q.chapitre === demande.chapitre)
    : demande.format === "erreurs" ? pool.filter(q => faibles.has(q.id)) : pool.slice();
  source = melanger(source);
  if (demande.priorite) source = [...source.filter(q => faibles.has(q.id)), ...source.filter(q => !faibles.has(q.id))];
  const n = ["serie20", "chapitre", "erreurs"].includes(demande.format) ? M.SERIE : demande.format === "toutes" ? (demande.taille || M.TOUTES) : source.length;
  return source.slice(0, Math.min(n, source.length));
}
const CODE_SERIE = { serie20: "serie20", serie20p: "serie20-erreurs", chapitre: "chapitre", toutes: "toutes", serie: "serie", quiz: "quiz", erreurs: "erreurs" };
function lancer(s, demande) {
  const pool = demande.format === "quiz" ? M.quizCours(s.cle).questions : M.pool(s);
  const questions = tirer(pool, demande, E.faibles());
  if (!questions.length) return null;
  const taille = s.estExamen || !pool.length ? M.TOUTES : pool.length;
  const lib = {
    serie20: ["SÉRIE ALÉATOIRE", "Série de 20"], toutes: [`LES ${taille}`, `Les ${taille}`], serie: [`SÉRIE ${demande.serie}`, `Série ${demande.serie}`],
    chapitre: [M.Chap.etiquette(demande.chapitre).toUpperCase(), `Ce chapitre (${M.Chap.etiquette(demande.chapitre).toLowerCase()})`], quiz: ["QUIZ DU COURS", "Quiz du cours"], erreurs: ["MES ERREURS", "Mes erreurs"],
  }[demande.format];
  const code = demande.format === "serie20" && demande.priorite ? "serie20-erreurs" : CODE_SERIE[demande.format];
  E.noter("qcm", E.cible("reviser", { seance: s.cle, onglet: "qcm", chapitre: demande.chapitre, serie: code }), `QCM · ${lib[1]} · commencé`);
  const session = {
    seance: s.cle, tete: `QCM · ${M.dateCourteSeance(s).toUpperCase()} · ${lib[0]}`, format: lib[1], serie: code, demande,
    ids: questions.map(q => q.id), ordres: questions.map(q => (q.ordreFixe ? q.choix.map((_, k) => k) : melanger(q.choix.map((_, k) => k)))),
    reponses: questions.map(() => null), index: 0, fini: false, revue: null, iRevue: 0, vientDeRepondre: false,
  };
  sessions.set(s.cle, session); sauverSession(s.cle, session);
  return session;
}
function questionsDe(session, s) {
  const toutes = new Map();
  for (const q of [...M.pool(s), ...((M.quizCours(s.cle) || {}).questions || [])]) toutes.set(q.id, q);
  return session.ids.map(id => toutes.get(id)).filter(Boolean);
}
const juste = (session, qs, i) => session.reponses[i] != null && session.reponses[i] === qs[i].bonne;
function finir(session, qs, s) {
  session.fini = true;
  const bonnes = qs.filter((_, i) => juste(session, qs, i)).length;
  const note = qs.length ? Math.round(100 * bonnes / qs.length) : 0;
  const t = { date: maintenant(), seance: session.seance, format: session.format, note, reponses: qs.map((q, i) => ({ id: q.id, correct: session.reponses[i] == null ? null : session.reponses[i] === q.bonne })) };
  E.grouper(() => { E.ajouterTentative(t); E.noter("qcm", E.cible("reviser", { seance: session.seance, onglet: "qcm", serie: session.serie }), `QCM · ${session.format} · ${note} %`); });
}
function choixQcm(s, r, API) {
  const pool = M.pool(s);
  const quiz = s.estExamen ? null : M.quizCours(s.cle);
  const series = s.estExamen ? [] : distinct(pool.map(q => q.serie)).filter(x => x > 0).sort((a, b) => a - b);
  const chapitres = M.chapitresDe(s).filter(c => pool.some(q => q.chapitre === c));
  const faibles = E.faibles(), nErreurs = pool.filter(q => faibles.has(q.id)).length;
  const taille = s.estExamen || !pool.length ? M.TOUTES : pool.length;
  let texte;
  if (s.estExamen) texte = M.couvertes(s).some(c => M.banque(c.cle)) ? "Les questions viennent de toutes les séances que couvre l'examen." : "Pas de QCM pour cet examen.";
  else texte = pool.length ? "Choisis comment t'entraîner : une série au hasard, une série numérotée ou un seul chapitre." : "Pas de QCM pour cette séance.";
  const scores = E.meilleursScores(E.tentatives(s.cle));
  let h = `<section class="carte formats-qcm"><p>${esc(texte)}</p>`;
  if (pool.length) h += `<div class="rangee"><button class="bouton" data-lancer="serie20">${ico("etincelle")}Série de 20 au hasard</button><button class="bouton secondaire" data-lancer="toutes">${ico("listeCochee")}Les ${taille}</button>
${series.length ? `<select class="champ choix-serie" data-serie aria-label="Série numérotée">${series.map(x => `<option value="${x}">${x}</option>`).join("")}</select><button class="bouton secondaire" data-lancer="serie">Cette série</button>` : ""}
${nErreurs ? `<button class="bouton secondaire" data-lancer="erreurs">${ico("retourner")}Mes erreurs (${nErreurs})</button>` : ""}</div>
<label class="case"><input type="checkbox" data-priorite> Priorité à mes erreurs (les questions ratées d'abord)</label>`;
  h += `</section>`;
  if (chapitres.length) h += `<section class="carte"><div class="etiquette-section icone">${ico("cible", 2)}CE CHAPITRE : 20 QUESTIONS D'UN SEUL CHAPITRE</div><div class="puces">${chapitres.map(c => `<button class="puce teintee" style="--teinte:${M.teinte(M.numeroDuChapitre(c))}" data-lancer="chapitre" data-chapitre="${c}"><span class="point"></span>${esc(libelleChap(c))}</button>`).join("")}</div></section>`;
  if (quiz) h += `<section class="carte quiz-cours"><div class="tuile-quiz">${ico("trophee", 2)}</div><div class="espace"><div class="etiquette-section orange">QUIZ DU COURS</div><div class="gras">${esc(insecables(`${quiz.titre} · ${quiz.questions.length} questions, dans l'ordre du quiz fait en classe, avec le corrigé.`))}</div></div><button class="bouton" data-lancer="quiz">${ico("drapeau")}Faire le quiz du cours</button></section>`;
  if (scores.length) h += `<section class="carte"><div class="etiquette-section">TES RÉSULTATS</div><table class="scores">${scores.map(m => `<tr><td>${esc(m.format)}</td><td class="attenue">${esc(`dernière ${m.derniere} % · meilleure ${m.meilleure} % · ${m.essais} tentative${S(m.essais)}`)}</td></tr>`).join("")}</table></section>`;
  return h;
}
function ongletQcm(s, r, API) {
  // Lancement demandé par une cible (tuteur, plan, leçon) : ?serie=…
  if (r.query.serie) {
    const code = r.query.serie, ch = r.query.chapitre != null ? +r.query.chapitre : null, n = r.query.n != null ? +r.query.n : 1;
    const faibles = E.faibles();
    const demande = code === "erreurs" ? (M.pool(s).some(q => faibles.has(q.id)) ? { format: "erreurs" } : { format: "serie20" })
      : code === "serie20-erreurs" ? { format: "serie20", priorite: true } : code === "chapitre" && ch != null ? { format: "chapitre", chapitre: ch }
      : code === "toutes" ? { format: "toutes", taille: s.estExamen ? M.TOUTES : M.pool(s).length } : code === "serie" ? { format: "serie", serie: n }
      : code === "quiz" && M.quizCours(s.cle) ? { format: "quiz" } : { format: "serie20" };
    lancer(s, demande);
    history.replaceState(null, "", API.lien("reviser", "qcm", s.cle));
  }
  const session = lireSession(s.cle);
  const lierChoix = main => {
    const pr = main.querySelector("[data-priorite]"), sel = main.querySelector("[data-serie]");
    for (const b of main.querySelectorAll("[data-lancer]")) b.addEventListener("click", () => {
      const f = b.getAttribute("data-lancer"), priorite = !!(pr && pr.checked);
      const d = f === "serie20" ? { format: "serie20", priorite } : f === "toutes" ? { format: "toutes", priorite, taille: s.estExamen ? M.TOUTES : M.pool(s).length }
        : f === "serie" ? { format: "serie", serie: +(sel ? sel.value : 1), priorite } : f === "chapitre" ? { format: "chapitre", chapitre: +b.getAttribute("data-chapitre"), priorite }
        : f === "erreurs" ? { format: "erreurs" } : { format: "quiz" };
      if (lancer(s, d)) API.rendre();
    });
  };
  if (!session) return { html: choixQcm(s, r, API), apres: lierChoix };
  return vueQcm(s, session, API);
}
function vueQcm(s, session, API) {
  const qs = questionsDe(session, s);
  if (!qs.length) { sessions.delete(s.cle); sauverSession(s.cle, null); return { html: choixQcm(s, {}, API) }; }
  const rafraichir = (sens = 0) => { sauverSession(s.cle, session); API.rendre({ garder: !sens, sansDefilement: !sens }); };
  const abandonner = () => { sessions.delete(s.cle); sauverSession(s.cle, null); API.rendre(); };
  const nb = qs.length, rep = session.reponses;
  const bonnes = qs.filter((_, i) => juste(session, qs, i)).length, repondues = rep.filter(x => x != null).length, fausses = repondues - bonnes;
  const ligne = `${bonnes} ${bonnes > 1 ? "bonnes" : "bonne"} · ${fausses} ${fausses > 1 ? "fausses" : "fausse"} · ${nb - repondues} à faire` + (repondues ? ` · ${Math.round(100 * bonnes / repondues)} %` : "");
  if (session.fini) {
    const note = Math.round(100 * bonnes / nb);
    const parChap = trierPar([...new Set(qs.map(q => q.chapitre))], c => c).map(c => { const l = qs.map((q, i) => [q, i]).filter(([q]) => q.chapitre === c); return [M.Chap.long(c), `${l.filter(([, i]) => juste(session, qs, i)).length} / ${l.length}`]; });
    const parLecon = trierPar([...new Set(qs.filter(q => q.lecon).map(q => q.lecon))], x => x).map(id => {
      const l = qs.map((q, i) => [q, i]).filter(([q]) => q.lecon === id), b = l.filter(([, i]) => juste(session, qs, i)).length;
      const p = M.partie(id); return { id, titre: p ? p.lecon.parties[p.index].titre : id, bonnes: b, total: l.length };
    });
    const manquee = trierPar(parLecon.filter(x => x.bonnes < x.total), x => -(x.total - x.bonnes), x => x.bonnes / x.total)[0];
    const conseil = manquee ? `Sur « ${manquee.titre} », tu as manqué ${manquee.total - manquee.bonnes} question${S(manquee.total - manquee.bonnes)} sur ${manquee.total}. Relis cette partie, puis refais tes erreurs : c'est là que tu progresseras le plus.`
      : note === 100 ? "Sans faute. Refais une série dans quelques jours : c'est ce qui fixe une notion pour de bon."
      : note >= 80 ? `${note} % : bonne série. Revois tes erreurs maintenant, pendant que le raisonnement est frais.` : "Revois tes erreurs maintenant, puis refais une série demain : la deuxième fois, tout va plus vite.";
    const erreurs = qs.map((_, i) => i).filter(i => !juste(session, qs, i));
    const html = `<section class="carte fin-qcm"><div class="fin-qcm-tete">${anneau(note / 100, { couleur: note >= 80 ? "var(--succes)" : "var(--orange)", taille: 120, epaisseur: 11, taillePolice: 28 })}
<div><div class="surtitre">${esc(session.tete.replace("QCM ·", "QCM TERMINÉ ·"))}</div><div class="titre-carte grand">${note} %</div><div class="attenue">${bonnes} bonne${S(bonnes)} réponse${S(bonnes)} sur ${nb} · ${nb - repondues} sans réponse</div></div></div>
<div class="conseil-fin">${tete(note >= 80 ? "content" : "reflechit")}<p>${esc(insecables(conseil))}</p></div>
<div class="rangee"><button class="bouton" data-qcm="nouvelle">${ico("retourner")}Nouvelle série</button>${erreurs.length ? `<button class="bouton secondaire" data-qcm="revoir">Revoir mes erreurs</button>` : ""}${manquee ? `<a class="bouton secondaire" href="${API.lien("reviser", "lecons", (M.seanceDuChapitre(M.partie(manquee.id).lecon.chapitre) || s).cle, M.partie(manquee.id).lecon.chapitre, manquee.id)}">${ico("livre")}Relire cette partie</a>` : ""}<button class="lien" data-qcm="formats">Changer de format</button></div>
<div class="detail-fin"><div><div class="etiquette-section">PAR CHAPITRE</div><table class="scores">${parChap.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${b}</td></tr>`).join("")}</table></div>
${parLecon.length ? `<div><div class="etiquette-section">PAR PARTIE DE LEÇON</div><table class="scores">${parLecon.map(x => `<tr><td>${esc(x.titre)}</td><td>${x.bonnes} / ${x.total}</td></tr>`).join("")}</table></div>` : ""}</div></section>`;
    return {
      html, apres(main) {
        main.querySelector("[data-qcm='nouvelle']").addEventListener("click", () => { lancer(s, session.demande); API.rendre(); });
        main.querySelector("[data-qcm='formats']").addEventListener("click", abandonner);
        const rv = main.querySelector("[data-qcm='revoir']");
        if (rv) rv.addEventListener("click", () => { session.fini = false; session.revue = erreurs; session.iRevue = 0; session.index = erreurs[0]; rafraichir(); });
      },
    };
  }
  const i = session.index, q = qs[i], ordre = session.ordres[i], choix = rep[i];
  const revele = choix != null || session.revue != null;
  const tete2 = session.revue ? `RÉVISION DES ERREURS · ${session.iRevue + 1} / ${session.revue.length}` : `${session.tete} · QUESTION ${i + 1} / ${nb}`;
  const segments = qs.map((_, k) => `<button class="segment-q${rep[k] == null ? "" : juste(session, qs, k) ? " bon" : " faux"}${k === i ? " courant" : ""}" data-aller-q="${k}" aria-label="Question ${k + 1}"></button>`).join("");
  const n = M.numeroDuChapitre(q.chapitre);
  let h = `<section class="carte entete-qcm"><div class="entete-qcm-ligne"><span class="surtitre">${ico("listeCochee", 2)}${esc(tete2)}</span><span class="espace"></span><span class="score-ligne">${esc(ligne)}</span><button class="lien" data-qcm="formats">Changer de format</button></div>
${barre(repondues / nb)}<div class="segments-qcm">${segments}</div></section>
<section class="question-qcm" style="--teinte:${M.teinte(n)}"><div class="carte enonce">${md(q.enonce)}${q.tableau ? tableau(q.tableau.entetes, q.tableau.rangees) : ""}</div>
<div class="choix-qcm-grille${ordre.length > 4 ? " cinq" : ""}">${ordre.map((k, pos) => {
    const etat = !revele ? "" : k === q.bonne ? " bon" : k === choix ? " faux" : " eteint";
    const marque = !revele ? String.fromCharCode(65 + pos) : k === q.bonne ? ico("coche", 3) : k === choix ? ico("croix", 3) : String.fromCharCode(65 + pos);
    return `<button class="choix-qcm${etat}${session.vientDeRepondre && (k === q.bonne || k === choix) ? " anime" : ""}" data-choix="${pos}"${revele ? " disabled" : ""}><span class="lettre">${marque}</span><span class="texte-choix">${inl(q.choix[k])}</span></button>`;
  }).join("")}</div>`;
  if (revele) {
    const pos = k => String.fromCharCode(65 + ordre.indexOf(k));
    const lienLecon = q.lecon && M.partie(q.lecon) ? (() => { const p = M.partie(q.lecon); const sd = M.seanceDuChapitre(p.lecon.chapitre); return `<a class="lien" href="${API.lien("reviser", "lecons", (sd || s).cle, p.lecon.chapitre, q.lecon)}">Revoir la leçon</a>`; })() : "";
    if (choix != null && choix !== q.bonne) {
      const pourquoi = (q.pourquoiFaux[choix] && String(q.pourquoiFaux[choix]).trim()) || "Ce choix ne correspond pas à la notion interrogée.";
      h += `<div class="retour-sigma${session.vientDeRepondre ? " apparait" : ""}" id="retour">${tete("reflechit")}<div class="retour-texte"><div class="verdict faux">${ico("croix", 2.6)}TON CHOIX, ${pos(choix)}</div>${md(pourquoi)}
<div class="verdict bon">${ico("coche", 2.6)}LA BONNE RÉPONSE, ${pos(q.bonne)}</div><div class="bonne-reponse">${inl(q.choix[q.bonne])}</div>${md(q.explication)}${lienLecon ? `<div class="rangee">${lienLecon}</div>` : ""}</div></div>`;
    } else {
      h += `<div class="retour-simple${session.vientDeRepondre ? " apparait" : ""}" id="retour"><div class="verdict ${choix == null ? "neutre" : "bon"}">${choix == null ? "SANS RÉPONSE" : `${ico("coche", 2.6)}BONNE RÉPONSE`}</div>${md(q.explication)}${lienLecon ? `<div class="rangee">${lienLecon}</div>` : ""}</div>`;
    }
  }
  h += `</section>`;
  const dernier = session.revue ? session.iRevue >= session.revue.length - 1 : i === nb - 1;
  h += `<div class="barre-suite"><button class="bouton secondaire" data-qcm="prec"${(session.revue ? session.iRevue === 0 : i === 0) ? " disabled" : ""}>${ico("gauche", 2)}<span class="lib-long">Précédent</span></button>
<div class="position"><span class="aide-touches">${ico("etincelle", 2)}Touches : 1 à 5 ou A à E pour répondre, ← → pour naviguer</span><span class="pos-mobile">${i + 1} / ${nb}</span></div>
<button class="bouton" data-qcm="suiv">${dernier ? "Voir ma note" : `<span class="lib-long">Suivant</span>`}${ico("droite", 2)}</button></div>`;
  session.vientDeRepondre = false;
  const repondre = pos => {
    if (session.fini || session.revue || rep[i] != null || pos < 0 || pos >= ordre.length) return;
    rep[i] = ordre[pos]; session.vientDeRepondre = true; rafraichir();
  };
  const suivant = () => {
    if (session.revue) { if (session.iRevue >= session.revue.length - 1) { session.revue = null; session.fini = true; rafraichir(1); return; } session.index = session.revue[++session.iRevue]; }
    else if (i === nb - 1) { finir(session, qs, s); rafraichir(1); return; }
    else session.index++;
    rafraichir(1);
  };
  const precedent = () => {
    if (session.revue) { if (session.iRevue === 0) return; session.index = session.revue[--session.iRevue]; }
    else { if (i === 0) return; session.index--; }
    rafraichir(-1);
  };
  return {
    html: h,
    suite: { prec: i > 0 || (session.revue && session.iRevue > 0) ? precedent : null, suiv: suivant },
    clavier(ev) {
      const k = ev.key.toUpperCase();
      if (/^[1-5]$/.test(k)) { repondre(+k - 1); return true; }
      if (/^[A-E]$/.test(k)) { repondre(k.charCodeAt(0) - 65); return true; }
      if (ev.key === "Enter") { suivant(); return true; }
      return false;
    },
    apres(main) {
      for (const b of main.querySelectorAll("[data-choix]")) b.addEventListener("click", () => repondre(+b.getAttribute("data-choix")));
      for (const b of main.querySelectorAll("[data-aller-q]")) b.addEventListener("click", () => { if (session.revue) return; session.index = +b.getAttribute("data-aller-q"); rafraichir(1); });
      main.querySelector("[data-qcm='formats']").addEventListener("click", abandonner);
      main.querySelector("[data-qcm='suiv']").addEventListener("click", suivant);
      main.querySelector("[data-qcm='prec']").addEventListener("click", precedent);
      const retour = main.querySelector("#retour.apparait");
      if (retour) { const r2 = retour.getBoundingClientRect(); if (r2.bottom > innerHeight - 90) window.scrollBy({ top: r2.bottom - innerHeight + 110, behavior: "smooth" }); }
    },
  };
}

/* ===================== Mémoriser ===================== */
const paquets = new Map(); // chapitre → { ordre, index, sues, revele }
function ongletMemoriser(s, r, API) {
  const chapitres = M.chapitresDe(s).filter(ch => C.fiches[ch] && M.cartesDe(C.fiches[ch]).length);
  if (!chapitres.length) return { html: cartesMessage("cartes", "Pas de cartes pour ce chapitre.") };
  const [, , chArg, carteArg] = r.segments;
  const memo = E.position("memo.chapitre." + s.cle);
  const ch = chapitres.includes(+chArg) ? +chArg : chapitres.includes(memo) ? memo : chapitres[0];
  E.retenirPosition("memo.chapitre." + s.cle, ch);
  const cartes = M.cartesDe(C.fiches[ch]);
  let p = paquets.get(ch);
  if (!p) { p = { ordre: trierPar(cartes, c => M.ordreLeitner(E.boite(c.id))).map(c => c.id), index: 0, sues: 0, revele: false }; paquets.set(ch, p); }
  if (carteArg) { const k = p.ordre.indexOf(carteArg); if (k >= 0) { p.index = k; p.revele = false; } history.replaceState(null, "", API.lien("reviser", "memoriser", s.cle, ch)); }
  const puces = chapitres.length > 1 ? `<div class="puces puces-chapitres">${chapitres.map(c => puceChapitre(c, c === ch, API.lien("reviser", "memoriser", s.cle, c))).join("")}</div>` : "";
  const rendre = () => API.rendre({ garder: true, sansDefilement: true });
  if (p.index >= p.ordre.length) {
    return {
      html: `${puces}<section class="carte fin-memo">${anneau(p.sues / p.ordre.length, { couleur: "var(--vert)", taille: 120, epaisseur: 11, taillePolice: 26 })}<div><div class="titre-carte">Paquet terminé</div><p class="attenue">${esc(`${p.sues} carte${S(p.sues)} sue${S(p.sues)} sur ${p.ordre.length}. Les cartes « À revoir » reviendront en premier la prochaine fois.`)}</p><button class="bouton" data-memo="recommencer">${ico("retourner")}Recommencer</button></div></section>`,
      apres(main) { main.querySelector("[data-memo='recommencer']").addEventListener("click", () => { paquets.delete(ch); rendre(); }); },
    };
  }
  const c = cartes.find(x => x.id === p.ordre[p.index]);
  const b = E.boite(c.id);
  const boite = b === 0 ? "NOUVELLE CARTE" : b === 1 ? "À REVOIR" : b === 2 ? "SUE UNE FOIS" : "SUE";
  const lecture = f => f.lecture || (f.latex && lectureDe(f.latex) ? `« ${lectureDe(f.latex)} »` : "");
  const verso = `<div class="verso-contenu">${c.formule.latex ? carteFormule({ ...c.formule, lecture: lecture(c.formule) }) : c.formule.code ? `<pre class="code">${esc(c.formule.code)}</pre>` : `<div class="formule-texte">${inl(c.formule.texte || "")}</div>`}
${c.secondaires.map(f => `<div class="secondaire">${f.latex ? `<div class="fiche-formule">${tex(f.latex, true)}</div>${lecture(f) ? `<div class="se-lit">${inl(lecture(f))}</div>` : ""}` : f.code ? `<pre class="code">${esc(f.code)}</pre>` : inl(f.texte || "")}</div>`).join("")}
${c.regles.length ? `<ul class="regles">${c.regles.map(x => `<li>${inlLu(x)}</li>`).join("")}</ul>` : ""}${c.explication ? `<p class="attenue">${inlLu(c.explication)}</p>` : ""}</div>`;
  const ciel = '<span class="etoiles"></span>';
  const html = `${puces}<div class="memo"><div class="memo-tete"><span class="surtitre">${ico("cartes", 2)}Carte ${p.index + 1} / ${p.ordre.length}</span><span class="badge-boite">${boite}</span></div>${barre(p.index / p.ordre.length)}
<div class="carte-memo${p.revele ? " revelee" : ""}">${ciel}<div class="recto"><div class="memo-icone">${ico("cartes", 2)}</div><div class="memo-titre">${inl(c.titre)}</div><div class="memo-consigne">${inl(c.consigne)}</div>
${p.revele ? "" : `<button class="bouton-reveler" data-memo="reveler">${ico("retourner", 2)}<span class="clic">Clique pour révéler</span><span class="toucher">Touche pour révéler</span></button>`}</div>${p.revele ? verso : ""}</div>
${p.revele ? `<div class="memo-choix"><button class="bouton secondaire" data-memo="revoir">${ico("retourner")}À revoir</button><button class="bouton vert" data-memo="savais">${ico("coche", 2.4)}Je savais</button></div>` : ""}</div>`;
  const marquer = savait => {
    E.grouper(() => { E.marquerCarte(c.id, savait); E.noter("carte", E.cible("reviser", { seance: s.cle, onglet: "memoriser", chapitre: ch }), `Mémoriser · ${c.titre}`); });
    if (savait) p.sues++;
    p.index++; p.revele = false; rendre();
  };
  return {
    html,
    clavier(ev) {
      if (!p.revele && (ev.key === " " || ev.key === "Enter")) { p.revele = true; rendre(); return true; }
      if (p.revele && (ev.key === "Enter" || ev.key === "1")) { marquer(true); return true; }
      if (p.revele && (ev.key === "2" || ev.key === "Backspace")) { marquer(false); return true; }
      return false;
    },
    apres(main) {
      const rv = main.querySelector("[data-memo='reveler']");
      if (rv) { rv.addEventListener("click", () => { p.revele = true; rendre(); }); main.querySelector(".carte-memo").addEventListener("click", e => { if (!e.target.closest("button")) { p.revele = true; rendre(); } }); }
      const sv = main.querySelector("[data-memo='savais']"); if (sv) sv.addEventListener("click", () => marquer(true));
      const ar = main.querySelector("[data-memo='revoir']"); if (ar) ar.addEventListener("click", () => marquer(false));
    },
  };
}

/* ===================== Progrès ===================== */
function ongletProgres(s, r, API) {
  const tentatives = E.tentatives(s.cle);
  const scores = E.meilleursScores(s.estExamen ? E.P.qcm.filter(t => t.seance === s.cle) : tentatives);
  const teinte = M.teinteSeance(s);
  const banque = distinct(M.pool(s).map(q => q.id));
  const banqueCours = distinct(M.datees().filter(x => !x.estExamen).flatMap(x => (M.banque(x.cle) || { questions: [] }).questions.map(q => q.id)));
  const series = [{ nom: s.estExamen ? "Cet examen" : "Cette séance", couleur: teinte, points: E.serieMaitrise(banque) }, { nom: "Ensemble du cours", couleur: "var(--encre)", points: E.serieMaitrise(banqueCours), etiquette: false }];
  const lignes = [];
  for (const x of M.datees().filter(x => !x.estExamen)) lignes.push({ lib: M.dateCourteSeance(x), part: E.part((M.banque(x.cle) || { questions: [] }).questions.map(q => q.id)), teinte: M.teinteSeance(x) });
  lignes.push({ lib: "Ensemble", part: E.part(banqueCours), total: true });
  const plusLoin = M.facultatives().filter(x => E.tentatives(x.cle).length > 0);
  if (plusLoin.length) { lignes.push({ entete: "Pour aller plus loin" }); for (const x of plusLoin) lignes.push({ lib: M.dateCourteSeance(x), part: E.part((M.banque(x.cle) || { questions: [] }).questions.map(q => q.id)), teinte: M.teinteSeance(x) }); }
  const av = T.avancement(s), jeux = s.estExamen ? M.couvertes(s).flatMap(M.jeuxDe) : M.jeuxDe(s);
  const evs = (s.estExamen ? M.couvertes(s).flatMap(M.devoirsDe) : M.devoirsDe(s)).flatMap(T.evaluations);
  const parcours = [["Leçons lues", av.leconsLues, av.parties, "var(--bleu)"], ["Diapos vues", jeux.reduce((t, j) => t + T.vuesDuJeu(j), 0), jeux.reduce((t, j) => t + j.count, 0), "var(--sarcelle)"],
    ["Cartes sues", av.cartesSues, av.cartes, "var(--vert)"], ["Exercices réussis", evs.filter(v => v === true).length, evs.length, "var(--violet)"]].filter(l => l[2] > 0);
  const faibles = E.faibles();
  const erreurs = new Map();
  for (const q of [...M.pool(s), ...((!s.estExamen && M.quizCours(s.cle)) ? M.quizCours(s.cle).questions : [])]) if (q.lecon && faibles.has(q.id)) erreurs.set(q.lecon, (erreurs.get(q.lecon) || 0) + 1);
  const aRevoir = trierPar([...erreurs.entries()], e => -e[1], e => e[0]).slice(0, 6).map(([id, n]) => {
    const p = M.partie(id); if (!p) return "";
    const sd = M.seanceDuChapitre(p.lecon.chapitre);
    return `<li><span class="puce-point" style="background:var(--orange)"></span><span class="t">${esc(`${M.Chap.etiquette(p.lecon.chapitre)} · ${p.lecon.parties[p.index].titre}`)}</span><span class="badge-erreurs">${n} question${S(n)}</span><a class="lien" href="${API.lien("reviser", "lecons", (sd || s).cle, p.lecon.chapitre, id)}">Revoir</a></li>`;
  }).join("");
  const html = `<div class="grille-progres">
<section class="carte"><div class="etiquette-section icone">${ico("trophee", 2)}MEILLEURS SCORES</div>${scores.length ? scores.map(m => `<div class="score-ligne-progres"><span class="badge-score" style="--teinte:${teinte}">${m.meilleure} %</span><div><b>${esc(m.format)}</b><small class="attenue">le ${+m.date.slice(8)}/${+m.date.slice(5, 7)} · ${m.essais} essai${S(m.essais)} · dernier ${m.derniere} %</small></div></div>`).join("") : `<p class="attenue">Fais un premier QCM de cette séance : tes meilleurs scores s'affichent ici.</p>`}</section>
<section class="carte"><div class="etiquette-section icone">${ico("graphique", 2)}TA MAÎTRISE AU FIL DU TEMPS</div>${legende(series)}${courbe(series)}</section>
<section class="carte"><div class="etiquette-section icone">${ico("cible", 2)}MAÎTRISE PAR SÉANCE</div><div class="barres-maitrise">${lignes.map(l => l.entete ? `<div class="entete-barres">${esc(l.entete)}</div>`
    : `<div class="ligne-maitrise${l.total ? " total" : ""}"><span class="puce-point" style="background:${l.total ? "var(--encre)" : l.teinte}"></span><span class="lib">${esc(l.lib)}</span><div class="piste-barre"><i style="width:${Math.round(l.part * 100)}%;background:${l.total ? "var(--encre)" : l.teinte}"></i></div><b>${Math.round(l.part * 100)} %</b></div>`).join("")}</div></section>
<section class="carte"><div class="etiquette-section icone">${ico("drapeau", 2)}TON PARCOURS</div><div class="anneaux">${parcours.map(([lib, f, t, c]) => `<div class="anneau-ligne">${anneau(f / t, { couleur: c, taille: 80, epaisseur: 9, taillePolice: 17 })}<b>${esc(lib)}</b><span>${f} / ${t}</span></div>`).join("")}</div>
${aRevoir ? `<div class="etiquette-section" style="margin-top:14px">À REVOIR</div><ul class="a-revoir">${aRevoir}</ul>` : ""}</section></div>`;
  return { html };
}

/* ===================== Écran ===================== */
export default async function reviser(r, API) {
  const onglet = ONGLETS.some(o => o.id === r.segments[0]) ? r.segments[0] : (E.position("reviser.onglet") || "lecons");
  const s = (r.segments[1] && M.trouver(r.segments[1])) || seanceParDefaut();
  E.retenirPosition("reviser.seance", s.cle);
  E.retenirPosition("reviser.onglet", onglet);
  const teinte = M.teinteSeance(s);
  const onglets = piste(ONGLETS.map(o => ({ ...o, href: API.lien("reviser", o.id, s.cle) })), onglet, { classe: "onglets-reviser", remplacer: true });
  const tete = entete({ icone: "livre", teinte, surtitre: "RÉVISER · 05", titre: "Révise séance par séance", droite: onglets });
  const routeSeance = x => API.lien("reviser", onglet, x.cle);
  const detail = x => (x.estExamen ? x.court : x.estFacultative ? "séance facultative" : x.court);
  const exercices = s.devoirs.includes(M.DEVOIR_TUTORIEL) ? `<a class="lien" href="#/coder-r">${ico("crayon", 1.9)}Exercices</a>` : M.devoirsDe(s).length ? `<a class="lien" href="${API.lien("diapos", s.cle, "exercices")}">${ico("crayon", 1.9)}Exercices</a>` : "";
  const liens = s.estExamen ? "" : `<div class="liens-seance">${M.jeuxDe(s).length ? `<a class="lien" href="${API.lien("diapos", s.cle)}">${ico("diapo", 1.9)}Diapos</a>` : ""}${exercices}</div>`;
  const barreSeance = `<div class="barre-seance">${selecteurSeance(C.seances, s, routeSeance, { detail })}<span class="resume-seance" style="--teinte:${teinte}">${ico("graphique", 2)}${esc(T.resume(s))}</span></div>${liens}`;
  const contenu = onglet === "lecons" ? ongletLecons(s, r, API) : onglet === "fiches" ? ongletFiches(s, r, API) : onglet === "qcm" ? ongletQcm(s, r, API)
    : onglet === "memoriser" ? ongletMemoriser(s, r, API) : ongletProgres(s, r, API);
  return {
    ecran: "reviser", onglet, titreMobile: "Réviser", titreDocument: "Réviser",
    html: `${tete}${barreSeance}<div class="contenu-onglet onglet-${onglet}">${contenu.html}</div>`,
    suite: contenu.suite, clavier: contenu.clavier, quitter: contenu.quitter,
    apres(main) { lierSelecteurs(main, API); if (contenu.apres) contenu.apres(main); },
  };
}
