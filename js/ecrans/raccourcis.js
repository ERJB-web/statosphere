/* 01 · Raccourcis : les symboles du cours à copier d'un toucher, les codes « ;code » et un champ pour les essayer. */
import { C } from "../modele.js";
import { ico } from "../icones.js";
import { entete, piste } from "../ui.js";
import { esc, normaliser } from "../outils.js";
import { listeEtapes } from "../rendu.js";
import { telecharger, surTactile } from "../positron.js";

const FAMILLES = ["Lettres grecques", "Opérateurs, relations et flèches", "Variables, estimés et espérances"];
const COULEURS = ["#0A6FB8", "#16A6A1", "#5BAE3F"];
const SYMBOLES = [
  [1, "α", "alpha"], [1, "β", "bêta"], [1, "χ", "khi"], [1, "δ", "delta"], [1, "ε", "epsilon"], [1, "φ", "phi"], [1, "γ", "gamma"], [1, "η", "êta"], [1, "κ", "kappa"],
  [1, "λ", "lambda"], [1, "μ", "mu"], [1, "ν", "nu"], [1, "π", "pi"], [1, "θ", "thêta"], [1, "ρ", "rhô"], [1, "σ", "sigma"], [1, "τ", "tau"], [1, "υ", "upsilon"], [1, "ω", "oméga"],
  [1, "∑", "somme"], [1, "∏", "produit"], [1, "Δ", "delta majuscule"], [1, "Γ", "gamma majuscule"], [1, "Λ", "lambda majuscule"], [1, "Θ", "thêta majuscule"], [1, "Φ", "phi majuscule"], [1, "Ω", "oméga majuscule"],
  [2, "∑ⁿᵢ₌₁", "somme de 1 à n"], [2, "∂", "dérivée partielle"], [2, "√", "racine"], [2, "∞", "infini"], [2, "±", "plus ou moins"], [2, "∈", "appartient"], [2, "⊥", "indépendant"],
  [2, "⊥̸", "non indépendant"], [2, "≠", "différent"], [2, "≈", "environ"], [2, "∼", "distribué selon"], [2, "≤", "inférieur ou égal"], [2, "≥", "supérieur ou égal"], [2, "∀", "pour tout"],
  [2, "→", "flèche, cause"], [2, "←", "flèche gauche"], [2, "↔", "double flèche"], [2, "⇒", "implique"], [2, "⇔", "équivaut"], [2, "·", "multiplié par"], [2, "×", "fois"],
  [3, "X̄", "moyenne de X"], [3, "Ȳ", "moyenne de Y"], [3, "X̂", "X chapeau"], [3, "Ŷ", "valeur prédite"], [3, "X̃", "X mesurée avec erreur"], [3, "Ỹ", "Y mesurée avec erreur"],
  [3, "β̂", "bêta estimé"], [3, "α̂", "alpha estimé"], [3, "Xᵢ", "X indice i"], [3, "Yᵢ", "Y indice i"], [3, "εᵢ", "erreur de i"], [3, "β₀", "constante"], [3, "β₁", "coefficient 1"],
  [3, "β₂", "coefficient 2"], [3, "α₀", "alpha 0"], [3, "α₁", "alpha 1"], [3, "H₀", "hypothèse nulle"], [3, "μ₀", "mu 0"], [3, "σ²", "variance"], [3, "χ²", "khi carré"], [3, "R²", "R carré"],
  [3, "X²", "X carré"], [3, "E[X]", "espérance"], [3, "E[Y]", "espérance de Y"], [3, "Var(X)", "variance de X"], [3, "Cov(X, Y)", "covariance"], [3, "P(Y|X)", "probabilité conditionnelle"],
];
const ALIAS = [["sigma2", "σ²", "Variance (alias)"], ["chi2", "χ²", "Khi carré (alias)"], ["khi2", "χ²", "Khi carré (alias)"], ["r2", "R²", "R carré (alias)"]];
let codes = null;
function lesCodes() {
  if (codes) return codes;
  const vus = new Map();
  for (const [code, sortie, terme] of ALIAS) vus.set(code, { code, sortie, terme, chapitre: null });
  for (const e of C.catalogue.entries) for (const c of e.codes || []) {
    const code = normaliser(c).replace(/\s+/g, "");
    if (!/^[a-z0-9_]+$/.test(code) || vus.has(code)) continue;
    const sortie = e.sortie || e.unicode; if (!sortie) continue;
    vus.set(code, { code, sortie, terme: e.terme, chapitre: e.chapitre });
  }
  return (codes = [...vus.values()]);
}

/** Fichier de remplacements de texte macOS (Réglages Système › Clavier › Remplacements de texte) : « ;code » devient le symbole. */
function remplacements() {
  const xml = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lignes = lesCodes().map(c => `\t<dict>\n\t\t<key>phrase</key>\n\t\t<string>${xml(c.sortie)}</string>\n\t\t<key>shortcut</key>\n\t\t<string>;${xml(c.code)}</string>\n\t</dict>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<array>\n${lignes.join("\n")}\n</array>\n</plist>\n`;
}
const ETAPES_CLAVIER = [
  "Télécharge le fichier avec le bouton ci-dessus.",
  "Sur le Mac, ouvre Réglages Système › Clavier › Remplacements de texte, puis glisse le fichier dans la liste.",
  "Les raccourcis arrivent aussi sur l'iPhone et l'iPad par iCloud (même identifiant Apple) : tape ;sigma puis Espace.",
];

export default async function raccourcis(r, API) {
  const vue = r.segments[0] === "codes" ? "codes" : "symboles";
  const famille = +(r.query.f || 0), q = r.query.q || "";
  const qs = q.trim(), n = normaliser(qs).replace(/^;+/, "");
  const onglets = piste([{ id: "symboles", libelle: "Symboles", href: "#/raccourcis" }, { id: "codes", libelle: "Codes", href: "#/raccourcis/codes" }], vue, { remplacer: true });
  const recherche = `<label class="recherche">${ico("recherche", 2)}<input class="champ" type="search" data-q value="${esc(q)}" placeholder="Chercher un code, une notion ou un symbole" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search"></label>`;
  const copie = '<span class="badge-copie" aria-hidden="true">Copié</span>';
  let corps;
  if (vue === "symboles") {
    const codesDe = new Map();
    for (const c of lesCodes()) { if (!codesDe.has(c.sortie)) codesDe.set(c.sortie, []); codesDe.get(c.sortie).push(c.code); }
    const garde = ([, s, nom]) => !n || normaliser(nom).includes(n) || s.includes(qs) || (codesDe.get(s) || []).some(c => c.includes(n.replace(/\s+/g, "")));
    const lien = i => "#/raccourcis" + (i || q ? "?" : "") + [i ? "f=" + i : "", q ? "q=" + encodeURIComponent(q) : ""].filter(Boolean).join("&");
    const filtres = `<div class="segments filtres-symboles" role="group" aria-label="Famille">${["Tout", "01 Grec", "02 Opérateurs", "03 Variables"].map((l, i) => `<a class="segment" href="${lien(i)}" data-remplacer aria-pressed="${i === famille}">${l}</a>`).join("")}</div>`;
    const familles = [1, 2, 3].filter(f => !famille || f === famille).map(f => ({ f, liste: SYMBOLES.filter(s => s[0] === f && garde(s)) })).filter(x => x.liste.length);
    corps = recherche + filtres + (familles.length ? familles.map(({ f, liste }) => `<section class="famille-symboles"><div class="famille-tete"><span class="num-famille" style="--c:${COULEURS[f - 1]}">0${f}</span><b>${esc(FAMILLES[f - 1])}</b></div>
<div class="grille-symboles">${liste.map(([, s, nom]) => `<button class="tuile-symbole" style="--c:${COULEURS[f - 1]}" data-symbole="${esc(s)}" title="Copier « ${esc(s)} »" aria-label="${esc(`${s}, ${nom}`)}"><span class="glyphe">${esc(s)}</span><small>${esc(nom)}</small>${copie}</button>`).join("")}</div></section>`).join("") : `<p class="attenue">Aucun symbole ne correspond. Essaie l'onglet « Codes ».</p>`);
  } else {
    const liste = lesCodes().filter(c => !n || c.code.includes(n.replace(/\s+/g, "")) || normaliser(c.terme).includes(n) || c.sortie.includes(qs));
    corps = `${recherche}
<div class="attenue petit compte">${liste.length} code${liste.length > 1 ? "s" : ""}</div>
<div class="table-codes">${liste.slice(0, 400).map(c => `<button class="ligne-code" data-symbole="${esc(c.sortie)}"><code>;${esc(c.code)}</code><span class="sortie-code">${esc(c.sortie)}</span><span class="terme-code">${esc(c.terme)}</span><small>${c.chapitre != null ? "ch. " + c.chapitre : ""}</small>${copie}</button>`).join("")}</div>`;
  }
  const html = `${entete({ surtitre: "RACCOURCIS · 01", titre: "Tes symboles au clavier" })}
<div class="raccourcis-haut"><section class="carte comment-faire"><div class="etiquette-section">COMMENT FAIRE</div><p>Touche ou clique un symbole ou un code pour le copier, puis colle-le là où tu écris. Ou tape <code>;</code> puis un code, et Espace ou Entrée, dans le champ « Tester ici ».</p></section>
<section class="carte tester"><div class="etiquette-section">TESTER ICI</div><textarea class="champ" data-tester rows="2" placeholder=";sigma puis Espace" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false"></textarea>
<div class="rangee"><button class="bouton secondaire petit" data-copier-test>${ico("copier")}Copier</button></div></section></div>
<section class="carte clavier-mac"><div class="etiquette-section">CLAVIER SUR MAC ET IPHONE, SANS RIEN INSTALLER</div>
<p>Tous les codes <code>;code</code> deviennent des remplacements de texte : tu les tapes dans n'importe quelle application, comme un raccourci du clavier.</p>
<div class="rangee"><button class="bouton" data-telecharger-codes>${ico("telecharger", 2)}Télécharger mes raccourcis pour Mac et iPhone</button></div>
${listeEtapes(ETAPES_CLAVIER)}
<p class="attenue petit">Certaines applications (Word, par exemple) gardent leur propre correction automatique : si un raccourci ne se remplace pas, touche le symbole pour le copier.${surTactile() ? " Le fichier se glisse dans les réglages d'un Mac : depuis un iPhone ou un iPad seul, touche les symboles pour les copier." : ""}</p></section>
${onglets}<div class="corps-raccourcis">${corps}</div>`;
  return {
    ecran: "raccourcis", titreDocument: "Raccourcis", html,
    apres(main) {
      for (const b of main.querySelectorAll("[data-symbole]")) b.addEventListener("click", () => {
        const s = b.getAttribute("data-symbole");
        API.copier(s, `« ${s} » copié dans le presse-papiers.`);
        b.classList.add("copie"); clearTimeout(b._m); b._m = setTimeout(() => b.classList.remove("copie"), 1300);
      });
      main.querySelector("[data-telecharger-codes]").addEventListener("click", () => {
        telecharger("Statosphere-remplacements-de-texte.plist", remplacements());
        API.toast("Fichier téléchargé : glisse-le dans Remplacements de texte");
      });
      const champ = main.querySelector("[data-q]");
      if (champ) {
        let m = null;
        champ.addEventListener("input", () => {
          clearTimeout(m);
          m = setTimeout(() => {
            const v = champ.value, p = [famille && vue === "symboles" ? "f=" + famille : "", v ? "q=" + encodeURIComponent(v) : ""].filter(Boolean).join("&");
            history.replaceState(null, "", (vue === "codes" ? "#/raccourcis/codes" : "#/raccourcis") + (p ? "?" + p : ""));
            API.rendre({ garder: true, sansDefilement: true }).then(() => { const c = document.querySelector("[data-q]"); if (c) { c.focus(); c.setSelectionRange(v.length, v.length); } });
          }, 180);
        });
      }
      const t = main.querySelector("[data-tester]");
      const table = new Map(lesCodes().map(c => [c.code, c.sortie]));
      const convertir = fin => {
        const pos = t.selectionStart, avant = t.value.slice(0, pos);
        const m = /;([A-Za-z0-9_]+)$/.exec(avant);
        if (!m) return false;
        const sortie = table.get(m[1].toLowerCase()); if (!sortie) return false;
        const debut = pos - m[0].length;
        t.value = t.value.slice(0, debut) + sortie + fin + t.value.slice(pos);
        const p = debut + sortie.length + fin.length; t.setSelectionRange(p, p);
        return true;
      };
      t.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && convertir(e.key === " " ? " " : "")) e.preventDefault(); });
      t.addEventListener("input", e => {
        if (e.inputType !== "insertText" && e.inputType !== "insertLineBreak") return;
        const pos = t.selectionStart, c = t.value[pos - 1];
        if (c !== " " && c !== "\n") return;
        t.setSelectionRange(pos - 1, pos - 1);
        const avant = t.value;
        if (convertir(c === " " ? " " : "")) { const p = t.selectionStart; t.value = t.value.slice(0, p) + t.value.slice(p + 1); t.setSelectionRange(p, p); }
        else { t.value = avant; t.setSelectionRange(pos, pos); }
      });
      main.querySelector("[data-copier-test]").addEventListener("click", () => { if (t.value) API.copier(t.value, "Texte copié"); });
    },
  };
}
