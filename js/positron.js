/* « Ouvrir dans Positron » : le code à pratiquer devient un script .R téléchargé (et copié) sur Mac ;
   sur iPhone et iPad, qui n'ont pas Positron, le bouton copie le code. */
import * as Contenu from "./contenu.js";
import * as E from "./etat.js";
import { ico } from "./icones.js";
import { normaliser } from "./outils.js";

/** iPhone, iPad (même en mode « ordinateur ») et Android : pas de Positron. */
export function surTactile() {
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod|Android/.test(ua) || (/Mac/.test(navigator.platform || "") && navigator.maxTouchPoints > 1);
}
const pad = n => String(n).padStart(2, "0");
export const slug = s => normaliser(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const sansMarques = s => String(s || "").replace(/`/g, "").replace(/\*\*/g, "");
const JETON = /(['"])\{\{DONNEES\}\}\/([\w.-]+)\1/g;
const TIDYVERSE = /ggplot|mutate\(|summari[sz]e\(|group_by\(|tibble\(|read_csv\(|pivot_|%>%|\bfilter\(|\bselect\(|\barrange\(|\bcount\(/;

/* ---------- Registre : chaque bloc de code affiché garde de quoi fabriquer son script ---------- */
const registre = new Map();
let compteur = 0;
const donneesChargees = new Map();
function donnee(nom) {
  if (!donneesChargees.has(nom)) donneesChargees.set(nom, Contenu.lireTexte("tutoriel-r/donnees/" + nom));
  return donneesChargees.get(nom);
}
function fichiersDonnees(spec) {
  const noms = new Set();
  for (const t of [...spec.prep, spec.code]) for (const m of t.matchAll(JETON)) noms.add(m[2]);
  return [...noms];
}
/** spec : { fichier, entete: [lignes de commentaire], etiquette, prep: [code], code, affiche } ; rend le HTML du bouton. */
export function boutonCode(spec, { principal = false } = {}) {
  const id = "sc" + (++compteur);
  registre.set(id, spec);
  if (registre.size > 300) registre.delete(registre.keys().next().value);
  fichiersDonnees(spec).forEach(donnee);
  const tactile = surTactile();
  return `<button class="bouton petit${principal ? "" : " secondaire"}" data-action="script" data-script="${id}">${tactile ? ico("copier") + "Copier le code" : ico("code", 2) + "Ouvrir dans Positron"}</button>`;
}

/** Fabrique les scripts des blocs d'une série (sujet du tutoriel, devoir) : b → spec ou null.
    o.entete(genre, partie, titrePartie, b) → lignes ; o.nom(genre, partie, rangPartie, rangGenre, b) → nom de fichier. */
export function scriptsDeSerie(blocs, o) {
  const tous = new Map(), prep = [], parGenre = {}, parPartie = {};
  let partie = 0, titrePartie = "";
  for (const b of blocs) {
    if (b.genre === "intertitre") { partie++; titrePartie = sansMarques(b.texte); continue; }
    const exo = b.genre === "exercice";
    const code = exo ? (b.exercice && b.exercice.codeDepart) : (b.genre === "exemple" && b.echo !== false ? b.code : null);
    if (code != null && code !== "") {
      const genre = exo ? "exercice" : "exemple";
      const rg = parGenre[genre] = (parGenre[genre] || 0) + 1, rp = parPartie[genre + partie] = (parPartie[genre + partie] || 0) + 1;
      tous.set(b, {
        fichier: o.nom(genre, partie, rp, rg, b), entete: o.entete(genre, partie, titrePartie, b), etiquette: exo ? "Ton code :" : "Exemple :",
        prep: exo ? (b.exercice.preparation || []) : prep.slice(), code: exo ? code : (b.codeExecution || code), affiche: code,
      });
    }
    if ((b.genre === "exemple" || b.genre === "donnees") && b.eval !== false && (b.codeExecution || b.code)) prep.push(b.codeExecution || b.code);
  }
  return b => tous.get(b) || null;
}
const lettre = r => (r > 1 ? "-" + String.fromCharCode(96 + r) : "");
/** Un sujet du tutoriel R. */
export function scriptsSujet(s) {
  const t = sansMarques(s.titre);
  return scriptsDeSerie(s.blocs, {
    entete: (genre, p, tp, b) => ["# Statosphère · tutoriel R du cours", `# Sujet ${s.numero} : ${t}${genre === "exercice" ? ` · exercice « ${b.exercice.nom} »` : " · exemple"}`],
    nom: (genre, p, rp, rg, b) => `statosphere-tutoriel-${pad(s.numero)}-${genre}-${genre === "exercice" ? slug(b.exercice.nom) : rg}.R`,
  });
}
/** Un devoir de la séance. */
export function scriptsDevoir(d) {
  const n = d.sujet.numero;
  return scriptsDeSerie(d.sujet.blocs, {
    entete: (genre, p, tp) => ["# Statosphère · exercices de la séance", `# ${sansMarques(d.titre)}${p ? ` · partie ${p}${tp ? " : " + tp : ""}` : ""}`],
    nom: (genre, p, rp) => `statosphere-${genre}-${pad(n)}${p ? "-partie-" + p : ""}${lettre(rp)}.R`,
  });
}
/** Les blocs de code d'une partie de leçon. */
export function scriptsLecon({ numero, titre, partie, titrePartie }) {
  const prise = new Map();
  let k = 0;
  return b => {
    if (!b.code) return null;
    if (!prise.has(b)) {
      k++;
      prise.set(b, {
        fichier: `statosphere-lecon-${pad(numero)}-partie-${partie}-code-${k}.R`,
        entete: ["# Statosphère · leçon du cours", `# ${sansMarques(titre)} · partie ${partie} : ${sansMarques(titrePartie)}`],
        etiquette: "Exemple :", prep: b.preparation ? [b.preparation] : [], code: b.code, affiche: b.code,
      });
    }
    return prise.get(b);
  };
}

/* ---------- Le script ---------- */
async function construire(spec) {
  const mac = /Mac/.test(navigator.platform || "") || /Macintosh/.test(navigator.userAgent || "");
  const noms = fichiersDonnees(spec);
  const csv = await Promise.all(noms.map(donnee));
  const remplacer = t => t.replace(JETON, (m, q, f) => `file.path(donnees, '${f}')`);
  const L = [...spec.entete, `# Exécute une ligne ou une sélection avec ${mac ? "Cmd" : "Ctrl"}+Entrée.`, ""];
  if (noms.length) {
    L.push("# Données du cours, écrites dans un dossier temporaire :", 'donnees <- file.path(tempdir(), "donnees-statosphere")', "dir.create(donnees, showWarnings = FALSE)");
    noms.forEach((f, i) => { if (csv[i]) L.push(`writeLines(r"---(${csv[i].replace(/\r/g, "").trimEnd()})---", file.path(donnees, "${f}"))`); });
    L.push("");
  }
  const prep = spec.prep.map(remplacer), code = remplacer(spec.code).replace(/\s+$/, "");
  const utile = prep.concat([code]).join("\n");
  const avant = [];
  if (TIDYVERSE.test(utile)) avant.push("library(tidyverse)");
  avant.push(...prep);
  if (avant.length) L.push("# Préparation, comme dans Statosphère :", ...avant, "");
  L.push("# " + spec.etiquette.replace(/ :$/, "") + " :", code);
  return L.join("\n") + "\n";
}
function telecharger(nom, texte) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texte], { type: "application/octet-stream" }));
  a.download = nom;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 5000);
}
/** Copie un texte qui n'existe pas encore (Safari exige l'appel dans le geste de l'élève). */
export async function copierPlusTard(promesseTexte) {
  try {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": promesseTexte.then(t => new Blob([t], { type: "text/plain" })) })]);
      return true;
    }
  } catch (e) { /* repli ci-dessous */ }
  try { await navigator.clipboard.writeText(await promesseTexte); return true; } catch (e) { return false; }
}
export { telecharger };

/** Clic sur « Ouvrir dans Positron » ou « Copier le code ». */
export async function agirScript(id, API) {
  const spec = registre.get(id);
  if (!spec) return;
  if (surTactile()) { API.copier(spec.affiche, "Code copié"); return; }
  const promesse = construire(spec);
  const copie = copierPlusTard(promesse);
  let texte;
  try { texte = await promesse; } catch (e) { API.toast("Le script ne se prépare pas pour l'instant."); return; }
  telecharger(spec.fichier, texte);
  const ok = await copie;
  API.toast(ok ? "Script téléchargé, code copié" : "Script téléchargé");
  aidePositron();
}

/** Aide courte, une seule fois. */
function aidePositron() {
  if (E.REGLAGES.aidePositron) return;
  E.REGLAGES.aidePositron = true;
  E.sauverReglages();
  const d = document.createElement("dialog");
  d.className = "aide-dialogue";
  d.setAttribute("aria-labelledby", "titre-aide-positron");
  d.innerHTML = `<h2 id="titre-aide-positron">Ouvrir dans Positron</h2>
<p>Le script est dans <b>Téléchargements</b> : double-clique-le pour l'ouvrir dans Positron (la première fois : clic droit › Ouvrir avec › Positron, puis « Toujours ouvrir avec »).</p>
<p>Le code est aussi copié : colle-le dans Positron.</p>
<div class="rangee fin"><button class="bouton" autofocus>Compris</button></div>`;
  d.querySelector("button").addEventListener("click", () => d.close());
  d.addEventListener("close", () => d.remove());
  document.body.appendChild(d);
  if (d.showModal) d.showModal(); else d.setAttribute("open", "");
}
