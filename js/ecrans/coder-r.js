/* 06 · Apprendre à coder avec R (Positron) : le tutoriel R du cours, sujet par sujet, avec les exemples, leurs sorties et les exercices. */
import { C } from "../modele.js";
import * as E from "../etat.js";
import { ico } from "../icones.js";
import { entete } from "../ui.js";
import { inl } from "../rendu.js";
import { blocExercice } from "../rendu.js";
import { esc } from "../outils.js";
import { scriptsSujet } from "../positron.js";

export default async function coderR(r, API) {
  const t = C.tutoriel;
  if (!t || !t.sujets || !t.sujets.length) return { ecran: "coder-r", html: `<div class="carte message">Le tutoriel ne s'ouvre pas pour l'instant.</div>` };
  const total = t.sujets.length;
  const n = Math.min(total, Math.max(1, +(r.segments[0] || E.position("coder-r.sujet") || 1)));
  E.retenirPosition("coder-r.sujet", n);
  const s = t.sujets.find(x => x.numero === n) || t.sujets[0];
  const termines = t.sujets.filter(x => E.estTermine(x.numero)).length;
  const titre = x => x.titre.replace(/`/g, "");
  const ctx = { dossier: "tutoriel-r", devoir: "tutoriel", evaluation: id => E.autoevaluation(id), script: scriptsSujet(s) };
  const liste = `<nav class="sujets-r" aria-label="Sujets"><div class="etiquette-section">SUJETS · ${termines} SUR ${total} TERMINÉS</div>${t.sujets.map(x =>
    `${x.ajout ? `<div class="etiquette-section separateur-r">DEVOIR DU COURS · CH. 21</div>` : ""}<a class="sujet-r${x.estExercices ? " retrait" : ""}${x.numero === n ? " courant" : ""}${E.estTermine(x.numero) ? " termine" : ""}" href="${API.lien("coder-r", x.numero)}" data-remplacer>
<span class="rond-sujet">${E.estTermine(x.numero) ? ico("coche", 2.6) : x.numero}</span><span>${inl(x.titre)}</span></a>`).join("")}</nav>`;
  const prec = n > 1 ? n - 1 : null, suiv = n < total ? n + 1 : null;
  const contenu = `<article class="sujet-contenu carte"><div class="surtitre">${esc(s.ajout ? `Sujet ${n} sur ${total} · devoir` : `Sujet ${n} sur ${total}`)}</div><h2 class="titre-sujet">${inl(s.titre)}</h2>
${s.blocs.map(b => blocExercice(b, ctx)).join("")}
<div class="rangee fin-sujet"><button class="bouton${E.estTermine(n) ? " secondaire" : ""}" data-terminer aria-pressed="${E.estTermine(n)}">${ico("coche", 2.4)}${E.estTermine(n) ? "Terminé" : "Marquer comme terminé"}</button></div></article>
<div class="barre-suite"><a class="bouton secondaire" ${prec ? `href="${API.lien("coder-r", prec)}"` : 'aria-disabled="true"'}>${ico("gauche", 2)}<span>${esc(prec ? titre(t.sujets[prec - 1]) : "Début")}</span></a>
<a class="bouton" ${suiv ? `href="${API.lien("coder-r", suiv)}"` : 'aria-disabled="true"'}><span>${esc(suiv ? titre(t.sujets[suiv - 1]) : "Fin")}</span>${ico("droite", 2)}</a></div>`;
  const html = `${entete({ surtitre: "APPRENDRE À CODER AVEC R (POSITRON) · 06", titre: "Le tutoriel R du cours" })}
<details class="sommaire-mobile sujets-mobile"><summary>${esc(`Sujet ${n} : ${titre(s)}`)}</summary>${liste}</details>
<div class="coder-r">${liste}<div class="colonne-sujet">${contenu}</div></div>`;
  return {
    ecran: "coder-r", titreDocument: "Tutoriel R", html,
    suite: { prec: prec ? () => API.naviguer(API.lien("coder-r", prec), { sens: -1 }) : null, suiv: suiv ? () => API.naviguer(API.lien("coder-r", suiv), { sens: 1 }) : null },
    apres(main) {
      main.querySelector("[data-terminer]").addEventListener("click", () => { E.terminerSujet(n, !E.estTermine(n)); API.rendre({ garder: true }); });
    },
  };
}
