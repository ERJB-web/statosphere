/* 03 · Outils : fraction pour Word, exposants, indices et accents, formule libre (LaTeX vers Word ou texte Unicode). */
import { ico } from "../icones.js";
import { entete } from "../ui.js";
import { esc } from "../outils.js";
import { mathml } from "./catalogue.js";

const MOT_WORD = "Copiée pour Word : colle-la dans ton document, elle devient une équation.";
const GRECS = { α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "varepsilon", ζ: "zeta", η: "eta", θ: "theta", ι: "iota", κ: "kappa", λ: "lambda", μ: "mu", ν: "nu", ξ: "xi", π: "pi", ρ: "rho", σ: "sigma", τ: "tau", υ: "upsilon", φ: "varphi", χ: "chi", ψ: "psi", ω: "omega", Γ: "Gamma", Δ: "Delta", Θ: "Theta", Λ: "Lambda", Ξ: "Xi", Π: "Pi", Σ: "Sigma", Φ: "Phi", Ψ: "Psi", Ω: "Omega" };
const OPERATEURS = { "·": "\\cdot ", "×": "\\times ", "≤": "\\leq ", "≥": "\\geq ", "≠": "\\neq ", "≈": "\\approx ", "±": "\\pm ", "∞": "\\infty ", "∑": "\\sum ", "∏": "\\prod ", "∂": "\\partial ", "∈": "\\in ", "→": "\\rightarrow ", "←": "\\leftarrow ", "↔": "\\leftrightarrow ", "⇒": "\\Rightarrow ", "⇔": "\\Leftrightarrow ", "∼": "\\sim ", "⊥": "\\perp ", "∀": "\\forall ", "−": "-" };
const INDICES = { "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4", "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9", "₊": "+", "₋": "-", "₌": "=", "₍": "(", "₎": ")", "ₐ": "a", "ₑ": "e", "ₕ": "h", "ᵢ": "i", "ⱼ": "j", "ₖ": "k", "ₗ": "l", "ₘ": "m", "ₙ": "n", "ₒ": "o", "ₚ": "p", "ᵣ": "r", "ₛ": "s", "ₜ": "t", "ᵤ": "u", "ᵥ": "v", "ₓ": "x", "ᵦ": "β", "ᵧ": "γ", "ᵨ": "ρ", "ᵩ": "φ", "ᵪ": "χ" };
const EXPOSANTS = { "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "⁺": "+", "⁻": "-", "⁼": "=", "⁽": "(", "⁾": ")", "ᵃ": "a", "ᵇ": "b", "ᶜ": "c", "ᵈ": "d", "ᵉ": "e", "ᶠ": "f", "ᵍ": "g", "ʰ": "h", "ⁱ": "i", "ʲ": "j", "ᵏ": "k", "ˡ": "l", "ᵐ": "m", "ⁿ": "n", "ᵒ": "o", "ᵖ": "p", "ʳ": "r", "ˢ": "s", "ᵗ": "t", "ᵘ": "u", "ᵛ": "v", "ʷ": "w", "ˣ": "x", "ʸ": "y", "ᶻ": "z", "ᵝ": "β", "ᵞ": "γ", "ᵟ": "δ", "ᶿ": "θ", "ᵠ": "φ", "ᵡ": "χ" };
const VERS_INDICE = Object.fromEntries(Object.entries(INDICES).map(([k, v]) => [v, k]));
const VERS_EXPOSANT = Object.fromEntries(Object.entries(EXPOSANTS).map(([k, v]) => [v, k]));
const ACCENTS = [["aucun", "Aucun", "", ""], ["barre", "Barre", "̄", "bar"], ["chapeau", "Chapeau", "̂", "hat"], ["tilde", "Tilde", "̃", "tilde"]];

/** Texte Unicode (σₓ, √n, β̂₁, X̄²) vers LaTeX. */
function versLatex(texte) {
  const t = String(texte || "").trim().normalize("NFD");
  let r = "", i = 0;
  const grec = c => (GRECS[c] ? "\\" + GRECS[c] + " " : c);
  while (i < t.length) {
    const c = t[i];
    if (c === "√") {
      i++;
      if (t[i] === "(") { let p = 1, j = i + 1; while (j < t.length && p) { if (t[j] === "(") p++; else if (t[j] === ")") p--; j++; } r += "\\sqrt{" + versLatex(t.slice(i + 1, j - 1)) + "}"; i = j; }
      else { let j = i; while (j < t.length && /[\p{L}\p{N}̀-ͯ₀-₉ᵢⱼₙₓ]/u.test(t[j])) j++; r += "\\sqrt{" + versLatex(t.slice(i, j)) + "}"; i = j; }
      continue;
    }
    if (/\p{L}|\p{N}/u.test(c)) {
      let base = grec(c).trim(); i++;
      while (i < t.length && /[̀-ͯ]/.test(t[i])) { const a = ACCENTS.find(x => x[2] === t[i]); if (a) base = `\\${a[3]}{${base}}`; i++; }
      r += base + (/^\\[a-zA-Z]+$/.test(base) ? " " : "");
      continue;
    }
    if (INDICES[c]) { let s = ""; while (i < t.length && INDICES[t[i]]) s += INDICES[t[i++]]; r = r.trimEnd() + "_{" + versLatex(s) + "}"; continue; }
    if (EXPOSANTS[c]) { let s = ""; while (i < t.length && EXPOSANTS[t[i]]) s += EXPOSANTS[t[i++]]; r = r.trimEnd() + "^{" + versLatex(s) + "}"; continue; }
    r += OPERATEURS[c] || c; i++;
  }
  return r.replace(/\s+/g, " ").trim();
}
const operande = s => { const t = String(s || "").trim(); return /[\s+\-−·×=]/.test(t) && !/^\(.*\)$/.test(t) ? `(${t})` : t; };

/** LaTeX vers texte Unicode, pour les formules simples du cours. */
function versUnicode(latex) {
  let s = String(latex || "");
  const groupe = "\\{((?:[^{}]|\\{[^{}]*\\})*)\\}";
  for (let k = 0; k < 4; k++) {
    s = s.replace(new RegExp("\\\\frac" + groupe + groupe, "g"), (m, a, b) => `${operande(versUnicode(a))}/${operande(versUnicode(b))}`)
      .replace(new RegExp("\\\\sqrt" + groupe, "g"), (m, a) => { const u = versUnicode(a); return u.length > 1 ? `√(${u})` : "√" + u; })
      .replace(new RegExp("\\\\(hat|widehat|bar|overline|tilde|widetilde)" + groupe, "g"), (m, a, b) => { const marque = /hat/.test(a) ? "̂" : /tilde/.test(a) ? "̃" : "̄"; const u = versUnicode(b); return u.length === 1 ? u + marque : u.split("").join(marque) + marque; })
      .replace(new RegExp("\\\\(text|mathrm|mathbf|operatorname|mathit)" + groupe, "g"), (m, a, b) => b);
  }
  s = s.replace(/\\(hat|bar|tilde)\s*([A-Za-z])/g, (m, a, b) => b + (a === "hat" ? "̂" : a === "tilde" ? "̃" : "̄"));
  s = s.replace(/\\left|\\right|\\,|\\;|\\!|\\quad|\\qquad/g, m => (/quad/.test(m) ? " " : ""));
  const macros = Object.fromEntries([...Object.entries(GRECS).map(([u, n]) => [n, u]), ["epsilon", "ε"], ["phi", "φ"], ["cdot", "·"], ["times", "×"], ["leq", "≤"], ["le", "≤"], ["geq", "≥"], ["ge", "≥"], ["neq", "≠"], ["ne", "≠"], ["approx", "≈"], ["pm", "±"], ["infty", "∞"], ["sum", "∑"], ["prod", "∏"], ["partial", "∂"], ["in", "∈"], ["rightarrow", "→"], ["to", "→"], ["leftarrow", "←"], ["leftrightarrow", "↔"], ["Rightarrow", "⇒"], ["Leftrightarrow", "⇔"], ["sim", "∼"], ["perp", "⊥"], ["forall", "∀"], ["mid", "|"], ["ldots", "…"], ["dots", "…"], ["cdots", "⋯"], ["log", "log"], ["ln", "ln"], ["exp", "exp"]]);
  s = s.replace(/\\([A-Za-z]+)\s?/g, (m, n) => (macros[n] != null ? macros[n] : m));
  const scripts = (table, marque) => (m, g1, g2) => { const v = g1 != null ? g1 : g2; const conv = [...v].map(c => table[c]); return conv.every(Boolean) ? conv.join("") : `${marque}(${v})`; };
  s = s.replace(/_\{([^{}]*)\}|_(\S)/g, scripts(VERS_INDICE, "_")).replace(/\^\{([^{}]*)\}|\^(\S)/g, scripts(VERS_EXPOSANT, "^"));
  return s.replace(/[{}]/g, "").replace(/\s+/g, " ").replace(/-/g, "−").trim().normalize("NFC");
}
function rendreKatex(latex) {
  try { return window.katex.renderToString(latex, { throwOnError: true, displayMode: true, output: "html" }); } catch (e) { return null; }
}
function erreurKatex(latex) {
  try { window.katex.renderToString(latex, { throwOnError: true }); return ""; } catch (e) { return "LaTeX non reconnu : " + String(e.message || "").replace(/^KaTeX parse error: /, ""); }
}
function construire(base, accent, sub, sup) {
  const b = base.trim();
  if (!b) return { erreur: "Choisis une base : une lettre ou un symbole." };
  if ([...b.normalize("NFC")].length > 3) return { erreur: "La base tient en 1 à 3 caractères." };
  let t = b.normalize("NFD") + (ACCENTS.find(a => a[0] === accent) || ACCENTS[0])[2];
  for (const [v, table, nom] of [[sub, VERS_INDICE, "Indice"], [sup, VERS_EXPOSANT, "Exposant"]]) {
    const val = v.trim().replace(/−/g, "-");
    for (const c of val) { if (!table[c]) return { erreur: `${nom} impossible en Unicode (lettre « ${c} ») : utilise la formule libre.` }; t += table[c]; }
  }
  return { texte: t.normalize("NFC") };
}

const etat = { num: "σₓ", den: "√n", base: "β", sub: "1", sup: "", accent: "chapeau", libre: "\\hat{\\alpha}_1 = \\beta_1 + \\beta_2 \\cdot \\pi_1" };

export default async function outils(r, API) {
  const html = `${entete({ surtitre: "OUTILS · 03", titre: "Fractions, exposants et formules, prêts pour Word" })}
<div class="grille-outils">
<section class="carte outil"><div class="outil-tete"><span class="num-outil">01</span><span class="etiquette-section">FRACTION POUR WORD</span></div>
  <div class="fraction-saisie"><label><span class="etiquette-section">NUMÉRATEUR</span><input class="champ symbole" data-o="num" value="${esc(etat.num)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
  <label><span class="etiquette-section">DÉNOMINATEUR</span><input class="champ symbole" data-o="den" value="${esc(etat.den)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label></div>
  <div class="apercu-outil" data-apercu="fraction"></div><p class="attenue petit" data-erreur="fraction"></p>
  <div class="rangee"><button class="bouton" data-copie="fraction-word">Copier pour Word</button><button class="bouton secondaire" data-copie="fraction-latex">Copier en LaTeX</button><button class="bouton secondaire" data-copie="fraction-texte">Copier en texte</button></div>
</section>
<section class="carte outil sarcelle"><div class="outil-tete"><span class="num-outil">02</span><span class="etiquette-section">EXPOSANTS, INDICES ET ACCENTS</span></div>
  <div class="script-saisie"><label><span class="etiquette-section">BASE</span><input class="champ symbole" data-o="base" value="${esc(etat.base)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
  <label><span class="etiquette-section">INDICE</span><input class="champ symbole" data-o="sub" value="${esc(etat.sub)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
  <label><span class="etiquette-section">EXPOSANT</span><input class="champ symbole" data-o="sup" value="${esc(etat.sup)}" autocomplete="off" autocapitalize="off" spellcheck="false"></label></div>
  <div class="etiquette-section">ACCENT</div><div class="segments accents" role="group" aria-label="Accent">${ACCENTS.map(([v, l]) => `<button class="segment" data-accent="${v}" aria-pressed="${v === etat.accent}">${l}</button>`).join("")}</div>
  <div class="apercu-outil symbole-construit"><span data-construit></span></div><p class="attenue petit" data-erreur="script"></p>
  <div class="rangee"><button class="bouton" data-copie="script">Copier</button></div>
</section>
<section class="carte outil large"><div class="outil-tete"><span class="num-outil">03</span><span class="etiquette-section">FORMULE LIBRE · LATEX VERS WORD</span></div>
  <label><span class="etiquette-section">LATEX</span><textarea class="champ code" data-o="libre" rows="3" autocomplete="off" autocapitalize="off" spellcheck="false">${esc(etat.libre)}</textarea></label>
  <div class="apercu-outil" data-apercu="libre"></div><p class="gras petit" data-erreur="libre"></p><p class="attenue petit" data-unicode></p>
  <div class="rangee"><button class="bouton" data-copie="libre-word">Copier pour Word</button><button class="bouton secondaire" data-copie="libre-texte">Copier en texte Unicode</button></div>
</section>
</div>`;
  const calculer = () => {
    const fraction = { latex: `\\frac{${versLatex(etat.num)}}{${versLatex(etat.den)}}`, texte: `${operande(etat.num)}/${operande(etat.den)}` };
    fraction.erreur = !etat.num.trim() || !etat.den.trim() ? "Remplis le numérateur et le dénominateur." : erreurKatex(fraction.latex);
    const script = construire(etat.base, etat.accent, etat.sub, etat.sup);
    const libre = { latex: etat.libre, erreur: etat.libre.trim() ? erreurKatex(etat.libre) : "Formule vide." };
    libre.texte = libre.erreur ? "" : versUnicode(etat.libre);
    return { fraction, script, libre };
  };
  return {
    ecran: "outils", titreDocument: "Outils", html,
    apres(main) {
      const maj = () => {
        const c = calculer();
        main.querySelector('[data-apercu="fraction"]').innerHTML = c.fraction.erreur ? "" : rendreKatex(c.fraction.latex) || "";
        main.querySelector('[data-erreur="fraction"]').textContent = c.fraction.erreur;
        main.querySelector("[data-construit]").textContent = c.script.texte || "";
        main.querySelector('[data-erreur="script"]').textContent = c.script.erreur || "";
        main.querySelector('[data-apercu="libre"]').innerHTML = c.libre.erreur ? "" : rendreKatex(c.libre.latex) || "";
        main.querySelector('[data-erreur="libre"]').textContent = c.libre.erreur;
        main.querySelector("[data-unicode]").textContent = c.libre.texte ? `En texte : ${c.libre.texte}` : "";
        for (const b of main.querySelectorAll("[data-copie^='fraction']")) b.disabled = !!c.fraction.erreur;
        main.querySelector("[data-copie='script']").disabled = !c.script.texte;
        for (const b of main.querySelectorAll("[data-copie^='libre']")) b.disabled = !!c.libre.erreur;
        return c;
      };
      for (const champ of main.querySelectorAll("[data-o]")) champ.addEventListener("input", () => { etat[champ.getAttribute("data-o")] = champ.value; maj(); });
      for (const b of main.querySelectorAll("[data-accent]")) b.addEventListener("click", () => {
        etat.accent = b.getAttribute("data-accent");
        for (const x of main.querySelectorAll("[data-accent]")) x.setAttribute("aria-pressed", String(x === b));
        maj();
      });
      for (const b of main.querySelectorAll("[data-copie]")) b.addEventListener("click", () => {
        const c = maj(), k = b.getAttribute("data-copie");
        if (k === "fraction-word") API.copier(mathml(c.fraction.latex), MOT_WORD);
        else if (k === "fraction-latex") API.copier(c.fraction.latex, `Copiée en LaTeX : ${c.fraction.latex}`);
        else if (k === "fraction-texte") API.copier(c.fraction.texte, `Copiée en texte : ${c.fraction.texte}`);
        else if (k === "script") API.copier(c.script.texte, `« ${c.script.texte} » copié dans le presse-papiers.`);
        else if (k === "libre-word") API.copier(mathml(c.libre.latex), MOT_WORD);
        else if (k === "libre-texte") API.copier(c.libre.texte, `Copiée en texte : ${c.libre.texte}`);
      });
      maj();
    },
  };
}
