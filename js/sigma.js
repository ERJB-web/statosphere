/* Le chat du professeur Sigma (port de ConversationSigma) : ouverture (salut, chose à faire, conseil de l'écran), intentions
   (merci, salut, que faire, autre conseil, reprendre, mes erreurs, prochaine échéance, où j'en suis, plus loin, soutien, à propos),
   et les questions sur la matière au moteur local du cours. Aucun appel réseau. */
import * as M from "./modele.js";
import * as E from "./etat.js";
import * as T from "./tuteur.js";
import { C } from "./modele.js";
import { mots, developper, Correcteur, repondeur, couperTexte } from "./moteur.js";
import { tete } from "./dessins.js";
import { ico, icoPlein } from "./icones.js";
import { md, inl, carteFormule } from "./rendu.js";
import { esc, jour, ecart, dateLongue, insecables } from "./outils.js";

export const QUE_FAIRE = "Que faire maintenant ?", AUTRE_CONSEIL = "Autre conseil", REPRENDRE = "Reprendre", MES_ERREURS = "Mes erreurs",
  PROCHAINE_ECHEANCE = "Prochaine échéance", OU_J_EN_SUIS = "Où j'en suis ?", PLUS_LOIN = "Pour aller plus loin", AIDE = "Que sais-tu faire ?";
const TOUT_FAIT = "Tu as fait tout ce que je pouvais te proposer. Pose-moi une question quand tu veux.";
const APRES_UN_CONSEIL = [AUTRE_CONSEIL, OU_J_EN_SUIS, MES_ERREURS];
const decoupe = s => s.split(" ").filter(Boolean);
const MOTS_OUTILS = new Set(decoupe("le la les l un une des du de d au aux ce cet cette ces c ca mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs " +
  "je j tu t il elle on nous vous ils elles me m te se s moi toi lui y en a et ou pour par sur dans avec sans avant apres entre " +
  "est es suis sont ai as ont etait etaient sera seront que qu quoi qui quel quelle quels quelles ne n pas oui ok bon alors donc euh " +
  "maintenant aujourd hui etais veux voudrais aimerais peux pourrais peut avoir donne donner montre montrer dis " +
  "stp svp plait please merci bonjour salut sigma professeur prof"));
const MOTS_D_EXAMEN = ["examen", "examens", "intra", "final", "finale", "mi session"];
const MOTS_DE_PREPARATION = ["preparer", "prepare", "preparation", "reviser", "revision", "revisions", "etudier", "conseil", "conseils", "aide", "besoin", "comment"];
const MOTS_DU_SOUTIEN = new Set(decoupe("trop vraiment tellement super completement totalement beaucoup peu plus jamais encore tout tous toute rien truc chose choses " +
  "cours matiere stats stat statistique statistiques r examen examens intra final finale quiz qcm seance seances temps moment jour jours semaine semaines fois envie fin vais va fait rend"));
const contient = (phrase, m) => ` ${phrase} `.includes(` ${m} `);
class Regle {
  constructor(intention, declencheurs, vocabulaire, o = {}) {
    this.intention = intention; this.declencheurs = declencheurs.split(", "); this.politesse = !!o.politesse; this.requis = decoupe(o.requis || "");
    this.vocabulaire = new Set([...decoupe(vocabulaire), ...decoupe(declencheurs.replace(/,/g, ""))]);
  }
  reconnait(phrase, m) {
    return this.declencheurs.some(d => contient(phrase, d)) && (!this.requis.length || m.some(x => this.requis.includes(x)))
      && (m.every(x => MOTS_OUTILS.has(x) || this.vocabulaire.has(x)) || (this.politesse && m.length <= 2));
  }
}
const REGLES = [
  new Regle("merci", "merci, remercie", "beaucoup bcp bien tres infiniment mille fois encore super parfait genial cool top aide aider gentil compris clair demain bientot", { politesse: true }),
  new Regle("salut", "bonjour, salut, allo, bonsoir, coucou, hello, hey, ca va, comment vas tu, comment allez vous", "comment va question", { politesse: true }),
  new Regle("acquiescement", "ok, oui, d accord, parfait, super, genial, cool, top, compris, entendu, ca marche, tres bien", "bien merci", { politesse: true }),
  new Regle("aurevoir", "au revoir, bye, ciao, a plus, a demain, a bientot, bonne nuit, bonne soiree, bonne journee", "merci", { politesse: true }),
  new Regle("aide", "aide, aider, help, sais tu faire, tu sais faire, peux tu faire, tu peux faire, tu sers a quoi, a quoi tu sers, a quoi sers tu, sers tu, comment ca marche, fonctionne", "besoin peu"),
  new Regle("reprendre", "reprendre, reprends, reprenons, reprise, continuer, continue, continuons, j en etais", "lecon activite derniere"),
  new Regle("autre", "autre, autres, encore, suivant, deja fait, non, pas maintenant", "conseil conseils chose idee proposition suggestion propose faire fais conseille conseilles deja fait ca"),
  new Regle("quefaire", "faire, fais, fait, conseil, conseils, conseille, conseilles, commencer, reviser, etudier, travailler, et maintenant, et apres, ensuite, la suite, comment faire", "dois doit devrais faut puis sais ensuite"),
  new Regle("erreurs", "erreurs, erreur, fautes, faute, ratees, rate, ratee, rates", "question questions revoir voir refaire reprendre reviser travailler corriger qcm quiz serie fait",
    { requis: "mes mon ma j ratees rate ratee rates revoir refaire corriger questions" }),
  new Regle("echeance", "examen, examens, intra, final, finale, mi session, quiz, quizz, echeance, echeances, seance, seances, prochain cours, prochain qcm",
    "quand date jour jours heure prochain prochaine lieu combien temps reste classe porte matiere preparer prepare preparation reviser revision revisions " +
    "etudier conseil conseils aide besoin comment semaine semaines demain bientot deja mois dois doit devrais faut"),
  new Regle("parcours", "j en suis, en suis je, progression, progres, avancement, bilan, parcours, suis rendu, resultats", "cours voir rendu"),
  new Regle("plusloin", "plus loin, facultative, facultatives", "aller seance seances"),
];
const CONDUITE = new Correcteur(new Map([...new Set([...REGLES.flatMap(r => [...r.vocabulaire]), ...MOTS_OUTILS])].map(m => [m, 1])), 1);
const phrase = message => developper(mots(message || "", false)).map(j => (j.mot.length >= 6 ? CONDUITE.corriger(j.mot) : j.mot)).join(" ");
const DECOURAGEMENT = /\bc (?:est )?(?:vraiment |tellement |trop |super )?(?:dur|difficile|complique|lourd|beaucoup)\b|\btrop (?:dur|difficile|complique|de matiere)\b|\b(?:j )?y arrive(?:rai)? (?:pas|jamais|plus)\b|\bjy arrive(?:rai)? (?:pas|jamais|plus)\b|\bj arrive (?:pas|jamais|plus)\b|\bje (?:n )?y arriverai jamais\b|\bje vais (?:echouer|couler|rater|planter|pas y arriver|jamais y arriver)\b|\bje (?:vais )?pas (?:reussir|y arriver)\b|\bje suis (?:vraiment |trop |tellement |completement )?(?:nulle?|perdue?s?|decouragee?|stressee?|angoissee?|epuisee?|fatiguee?|demotivee?|deprimee?|depassee?|paniquee?|decue?)\b|\b(?:decourage|decouragee|decourageant|stress|stresse|stressee|stressant|angoisse|angoissee|panique|paniquer|deprime|demotive|epuise|epuisee)\b|\b(?:peur|trac)\b|\bmarre\b|\bj abandonne\b|\bje lache\b|\bpas (?:le|assez de) temps\b|\bje (?:comprends|capte|pige) (?:rien|plus rien)\b|\bj y comprends rien\b|\bj ai envie d abandonner\b|\bca me (?:decourage|stresse|fait peur)\b/g;
const PEUR = /\b(?:peur|trac|stress|stresse|stressee|angoisse|angoissee|panique|echouer|couler|rater)\b/;
const QUESTION_SUR_SIGMA = /\b(?:qui es tu|qui est tu|qui etes vous|t es qui|tu es qui|qui est sigma|c est qui sigma|comment tu t appelles?|tu t appelles? comment|ton nom|ton prenom)\b|\b(?:tu|t) (?:fonctionnes?|marches?|tournes?) (?:comment|avec quoi|sur quoi|en ligne|hors ligne|sans internet|sur internet|avec internet)\b|\b(?:comment|avec quoi|sur quoi) (?:tu|est ce que tu) (?:fonctionnes?|marches?|tournes?)\b|\bfonctionnes? tu\b|\b(?:tu|t) (?:es|as) (?:en ligne|hors ligne|connecte|connectee|internet|acces a internet)\b|\b(?:chatgpt|chat gpt|qwen|llm|modele de langue|modele de langage)\b|\b(?:mes|nos) (?:donnees|messages|conversations?|questions|reponses) (?:restent|sortent|partent|vont|sont envoyees|sont enregistrees|sont gardees|sont stockees|sont privees)\b|\bce que (?:j ecris|je t ecris|je te dis) (?:reste|sort|part|va)\b|\b(?:vie privee|confidentialite)\b/;
const TU_ES_UNE_IA = /\b(?:tu es|t es|es tu|etes vous|tu utilises?|utilises? tu|tu te sers d) (?:un |une |quelle |quel |de l |l |d )?(?:ia|intelligence artificielle|robot|bot|humain|humaine|vraie personne|vrai prof|vrai professeur|programme|chatgpt)\b|\bquel(?:le)? (?:ia|intelligence artificielle|modele) (?:tu|utilises? tu|es tu|est ce que tu)\b|\bc est quel(?:le)? (?:ia|intelligence artificielle|modele)\b/;
const decourage = p => { DECOURAGEMENT.lastIndex = 0; if (!new RegExp(DECOURAGEMENT.source).test(p)) return false; return decoupe(p.replace(new RegExp(DECOURAGEMENT.source, "g"), " ")).every(m => MOTS_OUTILS.has(m) || MOTS_DU_SOUTIEN.has(m)); };
export function classer(message) {
  const p = phrase(message);
  if (!p) return "vide";
  if (decourage(p)) return "soutien";
  if (QUESTION_SUR_SIGMA.test(p) || TU_ES_UNE_IA.test(p)) return "apropos";
  const m = p.split(" ");
  const r = REGLES.find(x => x.reconnait(p, m));
  return r ? r.intention : "recherche";
}

/* ---------- Conversation ---------- */
const minusculeSi = t => (t.length > 1 && t[1] === t[1].toLowerCase() && t[1] !== t[1].toUpperCase() ? t[0].toLowerCase() + t.slice(1) : t);
const bulle = (texte, cartes = [], suggestions = []) => ({ deSigma: true, texte, cartes, suggestions, passages: [] });
const salutHeure = () => { const h = new Date().getHours(); return h < 12 ? "Bonjour !" : h < 18 ? "Bon après-midi !" : "Bonsoir !"; };
class Conversation {
  constructor() { this.vus = new Set(); this.fil = { derniere: null, document: null, montres: new Set(), reponses: 0 }; }
  aFaire(j) { const l = T.conseiller(j, 20); const r = T.reprendre(); if (r) l.unshift(r); return l; }
  choseAFaire(j) { return this.aFaire(j)[0] || null; }
  montrer(c) { this.vus.add(E.cleCible(c.cible)); return { titre: c.titre, detail: c.pourquoi, cible: c.cible, bouton: c.genre === "reprendre" ? REPRENDRE : "Y aller" }; }
  bienvenue(j) { const b = T.encouragement(j); return b ? `${salutHeure()} ${b}` : `${salutHeure()} Je suis le professeur Sigma.`; }
  maintenant(j, suggestions = []) {
    const c = this.choseAFaire(j);
    return c ? bulle(c.genre === "reprendre" ? "Reprends où tu en étais :" : "Voici ce que je te propose :", [this.montrer(c)], suggestions) : bulle(TOUT_FAIT);
  }
  suggestions(j) { return T.conseiller(j, 20).some(c => c.genre === "plusloin") ? [QUE_FAIRE, MES_ERREURS, PROCHAINE_ECHEANCE, OU_J_EN_SUIS, PLUS_LOIN] : [QUE_FAIRE, MES_ERREURS, PROCHAINE_ECHEANCE, OU_J_EN_SUIS]; }
  finir(bulles, j) {
    const l = bulles.slice();
    if (!l[l.length - 1].suggestions.length) l[l.length - 1] = { ...l[l.length - 1], suggestions: this.suggestions(j) };
    if (!T.reprendre()) return l;
    return l.map(b => (b.suggestions.length ? { ...b, suggestions: [REPRENDRE, ...b.suggestions.filter(s => s !== REPRENDRE)] } : b));
  }
  ouvrir(conseilEcran) {
    const j = jour();
    const l = [bulle(this.bienvenue(j)), this.maintenant(j)];
    if (conseilEcran) l.push(bulle(`Sur cet écran :\n${conseilEcran.trim()}`));
    return this.finir(l, j);
  }
  saluer() { const j = jour(); return this.finir([bulle(this.bienvenue(j))], j); }
  surCetEcran(conseil) { return this.finir([bulle(`Sur cet écran :\n${conseil.trim()}`)], jour())[0]; }
  repondre(message) {
    const j = jour(), p = phrase(message), intention = classer(message);
    let l;
    switch (intention) {
      case "vide": l = [bulle("Écris-moi un mot ou une question, ou choisis une réponse ci-dessous.")]; break;
      case "merci": l = [bulle("Avec plaisir ! Continue comme ça.")]; break;
      case "salut": l = [bulle(contient(p, "ca va") || contient(p, "vas tu") || contient(p, "allez vous") ? "Très bien, merci ! Que veux-tu faire ?" : `${salutHeure()} Que veux-tu faire ?`, [], [...this.suggestions(j), AIDE])]; break;
      case "acquiescement": l = [bulle("Très bien. Écris-moi quand tu veux, ou choisis une réponse ci-dessous.")]; break;
      case "aurevoir": l = [bulle("À bientôt ! Je suis là quand tu reviens.")]; break;
      case "aide": l = [bulle("Je peux te dire quoi faire maintenant, te faire reprendre là où tu en étais, te faire revoir tes questions ratées, te rappeler la prochaine échéance ou te montrer où tu en es. Écris-moi aussi un mot ou une question sur la matière : je te mène à la bonne partie de leçon, à la bonne diapo, à la bonne carte ou à la bonne notion.")]; break;
      case "reprendre": { const r = T.reprendre(); l = r ? [bulle("Reprends où tu en étais :", [this.montrer(r)])] : [bulle("Rien à reprendre pour l'instant."), this.maintenant(j, APRES_UN_CONSEIL)]; break; }
      case "autre": {
        const liste = this.aFaire(j);
        if (!liste.length) { l = [bulle(TOUT_FAIT)]; break; }
        const suivant = liste.find(c => !this.vus.has(E.cleCible(c.cible)));
        if (suivant) l = [bulle("Alors, ceci :", [this.montrer(suivant)], APRES_UN_CONSEIL)];
        else { this.vus.clear(); l = [bulle("Je t'ai proposé tout ce que j'avais ; on reprend au début :", [this.montrer(liste[0])], APRES_UN_CONSEIL)]; }
        break;
      }
      case "quefaire": l = [this.maintenant(j, APRES_UN_CONSEIL)]; break;
      case "erreurs": {
        const er = T.conseiller(j, 20).filter(c => c.genre === "erreurs").slice(0, 2);
        l = er.length ? [bulle("Reprenons tes questions ratées :", er.map(c => this.montrer(c)))]
          : [bulle(E.P.qcm.length ? "Aucune question ratée à reprendre : bravo. Fais une série de QCM pour vérifier ce que tu retiens." : "Tu n'as pas encore fait de QCM : fais une série de 20 questions pour voir ce que tu retiens.")];
        break;
      }
      case "echeance": l = this.echeance(p, j); break;
      case "parcours": {
        const lignes = T.parcours();
        if (!lignes.length) { l = [bulle("Tu n'as encore rien commencé : la première séance t'attend.")]; break; }
        const der = E.P.qcm.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        const seance = der && M.trouver(der.seance) ? der.seance : (M.prochaine(j) || {}).cle;
        l = [bulle("Où tu en es dans le cours :\n" + lignes.map(x => `${x.libelle} : ${x.faits} sur ${x.total}`).join("\n"),
          [{ titre: "Tes progrès en graphiques", detail: "Ta maîtrise au fil du temps et séance par séance, d'après tes QCM.", cible: E.cible("reviser", { seance, onglet: "progres" }), bouton: "Ouvrir" }])];
        break;
      }
      case "plusloin": {
        const c = T.conseiller(j, 20).find(x => x.genre === "plusloin");
        if (c) { l = [bulle("Pour aller plus loin, si tu veux :", [this.montrer(c)])]; break; }
        const fac = M.facultatives();
        l = fac.length ? [bulle("Les séances facultatives, à faire quand ton cours est à jour :", fac.map(s => ({ titre: `${s.court} · ${s.titre}`, detail: "Séance facultative", cible: E.cible("reviser", { seance: s.cle, onglet: "lecons" }), bouton: "Ouvrir" })))]
          : [bulle("Il n'y a pas de séance facultative.")];
        break;
      }
      case "soutien": l = this.soutenir(p, j); break;
      case "apropos": l = [bulle("Je suis le professeur Sigma, ton tuteur pour ce cours. Je fonctionne entièrement sur ton appareil, hors ligne : rien de ce que tu m'écris n'en sort. Je réponds à partir du cours : ses leçons, ses diapos, ses fiches et ses notions. Pose-moi une question sur une notion, ou choisis une réponse ci-dessous.", [], [...this.suggestions(j), AIDE])]; break;
      default: {
        const b = repondeur().repondre(message.trim(), this.fil);
        l = [{ deSigma: true, ...b, passages: b.passages || [], suggestions: (b.passages || []).length ? [] : [...this.suggestions(j), AIDE] }];
      }
    }
    return this.finir(l, j);
  }
  echeance(p, j) {
    p = ` ${p} `.replace(" au final ", " ").replace(" en final ", " ").trim();
    const nom = contient(p, "final") || contient(p, "finale") ? "final" : contient(p, "intra") || contient(p, "mi session") ? "intra" : null;
    const nomme = nom ? M.datees().find(s => s.estExamen && contient(phrase(s.titre), nom)) : null;
    if (nomme && nomme.jour < j) {
      const titre = minusculeSi(nomme.titre), date = minusculeSi(M.longueSeance(nomme));
      return [bulle(/^[aeiouyéèêh]/.test(titre) ? `L'${titre} a eu lieu le ${date}.` : `${nomme.titre} : c'était le ${date}.`)];
    }
    const prochainExamen = M.datees().find(s => s.estExamen && s.jour >= j);
    if (nomme && (!prochainExamen || nomme.cle !== prochainExamen.cle)) return [bulle(`${nomme.titre} : ${minusculeSi(M.longueSeance(nomme))}.`)];
    const e = nomme || (MOTS_D_EXAMEN.some(m => contient(p, m)) ? prochainExamen : M.prochaine(j));
    if (!e) return [bulle(M.prochaine(j) ? "Il n'y a plus d'examen à venir." : "La session est terminée : il n'y a plus de quiz ni d'examen à venir.")];
    const txt = e.estExamen ? `${M.longueSeance(e)} · ${e.titre}` : `${M.longueSeance(e)} · ${e.titre} · ${M.textesChapitres(e)}`;
    const texte = `${e.estExamen ? "Prochain examen" : "Prochain quiz"} : ${minusculeSi(txt)}.`;
    const prep = T.conseiller(j, 20).find(c => (c.genre === "preparer" && c.cible.seance === e.cle) || (c.genre === "examen" && e.estExamen && c.cible.seance && e.couvre.includes(c.cible.seance)));
    if (prep) return [bulle(`${texte} Pour t'y préparer :`, [this.montrer(prep)])];
    const chose = MOTS_DE_PREPARATION.some(m => contient(p, m)) ? this.choseAFaire(j) : null;
    return chose ? [bulle(`${texte} Pour t'y préparer, commence par ceci :`, [this.montrer(chose)])] : [bulle(texte)];
  }
  soutenir(p, j) {
    const ex = M.datees().find(s => s.estExamen && s.jour >= j);
    let premier;
    if (PEUR.test(p) && ex) {
      const titre = minusculeSi(ex.titre), n = ecart(j, ex.jour), quand = n === 0 ? "aujourd'hui" : n === 1 ? "demain" : `dans ${n} jours`;
      premier = `C'est normal d'avoir le trac. ${/^[aeiouyéèêh]/.test(titre) ? `L'${titre}` : `Le ${titre}`} a lieu le ${minusculeSi(M.longueSeance(ex))}, ${quand} : c'est assez pour revoir les séances une à une, sans tout faire d'un coup.`;
    } else premier = "Ça demande de la pratique, pas un don : c'est normal de trouver ça dur au début. On avance par petits pas, une notion à la fois.";
    const suite = "Et si une notion te bloque, écris-la-moi : je te l'explique autrement, avec un exemple.";
    const chose = this.choseAFaire(j);
    return chose ? [bulle(premier), bulle(`Une petite étape pour maintenant, un quart d'heure, juste ici. ${suite}`, [this.montrer(chose)])] : [bulle(premier), bulle(suite)];
  }
}

/* ---------- Conseils par écran ---------- */
const derniersConseils = new Map();
function conseilEcran(ecran, onglet) {
  const l = (C.conseils && C.conseils.ecrans) || [];
  const x = (onglet && l.find(c => c.ecran === ecran && c.onglet === onglet)) || l.find(c => c.ecran === ecran && !c.onglet);
  const conseils = x ? x.conseils.filter(c => !/accord|Ctrl|Windows|palette|Word|Insérer/i.test(c)) : [];
  if (!conseils.length) return null;
  const cle = ecran + "/" + (onglet || "");
  const prec = derniersConseils.get(cle);
  const i = prec == null ? 0 : (conseils.indexOf(prec) + 1) % conseils.length;
  derniersConseils.set(cle, conseils[i]);
  return conseils[i];
}

/* ---------- Vue du chat ---------- */
let racine = null, liste = null, champ = null, rapides = null, rappels = null;
let conversation = new Conversation(), ouvert = false, derniereBulle = 0, dernierConseil = null, ecrit = false;
const ABSENCE = 2 * 3600e3;
export function monter(el, cb) {
  rappels = cb; racine = el;
  el.innerHTML = `<div class="haut"><div class="medaillon">${tete("normal", { anime: true })}</div><div class="espace"><div class="nom">Professeur Sigma</div><div class="role">Ton tuteur</div></div>
<button class="bouton-icone" data-fermer-sigma aria-label="Fermer le chat">${ico("croix", 2)}</button></div>
<div class="fil-chat" role="log" aria-live="polite"></div><div class="rapides"></div>
<form class="saisie-chat"><input class="champ-chat" type="text" placeholder="Écris un mot ou une question…" aria-label="Message pour le professeur Sigma" enterkeyhint="send" autocomplete="off"><button class="bouton-rond" type="submit" aria-label="Envoyer">${icoPlein("envoyer")}</button></form>`;
  liste = el.querySelector(".fil-chat"); champ = el.querySelector(".champ-chat"); rapides = el.querySelector(".rapides");
  el.querySelector("[data-fermer-sigma]").addEventListener("click", () => cb.fermer());
  el.querySelector("form").addEventListener("submit", e => { e.preventDefault(); dire(champ.value); });
  rapides.addEventListener("click", e => { const b = e.target.closest("button[data-dire]"); if (b) dire(b.getAttribute("data-dire")); });
  liste.addEventListener("click", e => {
    const b = e.target.closest("[data-cible]"); if (!b) return;
    try { cb.aller(JSON.parse(b.getAttribute("data-cible"))); } catch (x) { /* rien */ }
  });
}
function rendreBulle(b) {
  if (!b.deSigma) return `<div class="bulle eleve">${esc(b.texte)}</div>`;
  let h = `<div class="ligne-sigma">${tete("normal", { classe: "petite" })}<div class="bulle sigma">${md(insecables(b.texte))}`;
  for (const p of b.passages || []) {
    h += `<div class="passage">`;
    if (p.texte) h += md(p.texte);
    if (p.formule) h += carteFormule(p.formule, { classe: "compacte" });
    if (p.etapes && p.etapes.length) h += (p.titreEtapes ? `<p><strong>${inl(p.titreEtapes)}</strong></p>` : "") + `<ol>${p.etapes.map(x => `<li>${inl(x)}</li>`).join("")}</ol>`;
    if (p.code) h += `<pre class="code">${esc(p.code)}</pre>`;
    h += `</div>`;
  }
  if (b.cartes && b.cartes.length) {
    if (b.titreCartes) h += `<div class="etiquette-section titre-cartes">${esc(b.titreCartes)}</div>`;
    h += b.cartes.map(c => `<div class="carte-sigma"><div class="carte-sigma-texte"><b>${esc(insecables(c.titre))}</b><span>${esc(insecables(c.detail || ""))}</span></div><button class="bouton petit" data-cible='${esc(JSON.stringify(c.cible))}'>${esc(c.bouton || "Y aller")}</button></div>`).join("");
  }
  return h + `</div></div>`;
}
function ajouter(bulles) {
  for (const b of bulles) { const d = document.createElement("div"); d.className = "entree-bulle"; d.innerHTML = rendreBulle(b); liste.appendChild(d); }
  const der = bulles.filter(b => b.deSigma).pop();
  rapides.innerHTML = der && der.suggestions ? der.suggestions.map(s => `<button class="rapide" data-dire="${esc(s)}">${esc(s)}</button>`).join("") : "";
  derniereBulle = Date.now();
  requestAnimationFrame(() => { liste.scrollTop = liste.scrollHeight; });
}
function nouvelle() { conversation = new Conversation(); liste.innerHTML = ""; rapides.innerHTML = ""; dernierConseil = null; ouvert = false; }
export function ouvrir(contexte, question) {
  if (!racine) return;
  const maintenant = Date.now();
  if (ouvert && (new Date(derniereBulle).toDateString() !== new Date().toDateString() || maintenant - derniereBulle >= ABSENCE)) nouvelle();
  if (question) { dire(question); return; }
  let conseil = conseilEcran(contexte.ecran, contexte.onglet);
  if (!conseil || conseil === dernierConseil) conseil = null; else dernierConseil = conseil;
  if (!ouvert) { ouvert = true; ajouter(conversation.ouvrir(conseil)); }
  else if (conseil) ajouter([conversation.surCetEcran(conseil)]);
  setTimeout(() => { if (matchMedia("(min-width: 900px)").matches) champ.focus(); }, 260);
}
async function dire(texte) {
  texte = String(texte || "").trim();
  if (!texte || ecrit) return;
  if (!ouvert || Date.now() - derniereBulle >= ABSENCE) { if (ouvert) nouvelle(); ouvert = true; ajouter(conversation.saluer()); }
  champ.value = "";
  rapides.innerHTML = "";
  ajouter([{ deSigma: false, texte }]);
  ecrit = true;
  const indicateur = document.createElement("div");
  indicateur.className = "entree-bulle";
  indicateur.innerHTML = `<div class="ligne-sigma">${tete("reflechit", { classe: "petite" })}<div class="bulle sigma ecrit"><span></span><span></span><span></span></div></div>`;
  liste.appendChild(indicateur); liste.scrollTop = liste.scrollHeight;
  await new Promise(r => setTimeout(r, 60));
  let bulles;
  try { bulles = conversation.repondre(texte); }
  catch (e) { console.error(e); bulles = [bulle("Je n'ai pas réussi à chercher dans le cours. Réessaie avec d'autres mots.")]; }
  await new Promise(r => setTimeout(r, 380));
  indicateur.remove();
  ecrit = false;
  ajouter(bulles);
}
export const reponseDe = texte => new Conversation().repondre(texte);
