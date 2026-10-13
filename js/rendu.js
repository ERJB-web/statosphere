/* Rendu du texte balisé du cours : **gras**, `code`, $formule$, $$formule$$, listes, tableaux ; lecture littérale (« Se lit ») de chaque
   formule symbolique que le texte ne lit pas lui-même, comme la version Windows (LecturesDuTexte) ; blocs de leçon, formules décortiquées. */
import { esc, insecables } from "./outils.js";
import { ico } from "./icones.js";
import { C } from "./modele.js";
import * as Contenu from "./contenu.js";
import { boutonCode } from "./positron.js";

/* ---------- Formules ---------- */
const cacheTex = new Map();
export function tex(latex, affichage = false) {
  const cle = (affichage ? "D" : "I") + latex;
  let h = cacheTex.get(cle);
  if (h === undefined) {
    try { h = window.katex.renderToString(String(latex), { throwOnError: false, displayMode: affichage, strict: false, output: "html", trust: false }); }
    catch (e) { h = `<code>${esc(latex)}</code>`; }
    if (cacheTex.size > 4000) cacheTex.clear();
    cacheTex.set(cle, h);
  }
  return h;
}
/** Lecture littérale d'une formule (précalculée par le lecteur de la version Windows) ; null si elle ne se lit pas. */
export function lectureDe(latex) { const l = C.lectures[String(latex).trim()]; return l ? l[0] : null; }
const estSymbolique = latex => { const l = C.lectures[latex]; return !!(l && l[1]); };

/** Formules d'un texte, avec leur position ; le code et les dollars échappés ne sont jamais des formules. */
export function formulesDuTexte(texte) {
  const t = String(texte || "").replace(/```[\s\S]*?```|`[^`\n]*`/g, m => " ".repeat(m.length));
  const r = [];
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== "$" || (i > 0 && t[i - 1] === "\\")) continue;
    if (t[i + 1] === "$") {
      let j = i + 2;
      while (j < t.length - 1 && !(t[j] === "$" && t[j + 1] === "$" && t[j - 1] !== "\\")) j++;
      if (j < t.length - 1) { const l = t.slice(i + 2, j).trim(); if (l) r.push({ debut: i, fin: j + 2, latex: l }); i = j + 1; continue; }
    }
    let j = i + 1, ok = false;
    while (j < t.length) { if (t[j] === "\\") { j += 2; continue; } if (t[j] === "$") { ok = true; break; } j++; }
    if (ok) { const l = t.slice(i + 1, j).trim(); if (l) r.push({ debut: i, fin: j + 1, latex: l }); i = j; }
  }
  return r;
}
/** Lectures qui manquent au texte : chaque formule symbolique qu'aucun « ne suit de près (160 caractères, sans autre formule entre les deux). */
export function lecturesManquantes(texte) {
  if (!texte) return [];
  const f = formulesDuTexte(texte).filter(x => estSymbolique(x.latex));
  const lues = new Set();
  f.forEach((x, k) => {
    let limite = Math.min(texte.length, x.fin + 160);
    if (k + 1 < f.length) limite = Math.min(limite, f[k + 1].debut);
    const i = texte.indexOf("«", x.fin);
    if (i >= 0 && i < limite) lues.add(x.latex);
  });
  const r = [];
  for (const x of f) if (!lues.has(x.latex) && !r.some(m => m.latex === x.latex)) r.push({ latex: x.latex, lecture: C.lectures[x.latex][0] });
  return r;
}
function lignesSeLit(liste) {
  return liste.map(l => `<div class="se-lit"><em>Se lit :</em> ${tex(l.latex)} « ${esc(insecables(l.lecture))} »</div>`).join("");
}

/* ---------- Texte en ligne ---------- */
/** Une ligne de texte balisé : `code`, $$…$$, $…$, **gras**, *italique*, <lien>. */
export function inl(s, options = {}) {
  if (s == null) return "";
  s = String(s);
  const jetons = [];
  const garder = html => { jetons.push(html); return "\u0000" + (jetons.length - 1) + "\u0001"; };
  s = s.replace(/`([^`\n]+)`/g, (m, c) => garder(`<code class="c">${esc(c)}</code>`));
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, c) => garder(tex(c.trim(), true)));
  s = s.replace(/\\\$/g, () => garder("$"));
  s = s.replace(/\$((?:\\.|[^$\\\n])+?)\$/g, (m, c) => garder(tex(c.trim(), false)));
  s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (m, u) => garder(`<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, ""))}</a>`));
  s = esc(insecables(s));
  s = s.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*\w])\*(?!\s)([^*\n]+?)\*(?![\w*])/g, "$1<em>$2</em>");
  s = s.replace(/\u0000(\d+)\u0001/g, (m, i) => jetons[+i]);
  if (options.lecture) s += lignesSeLit(lecturesManquantes(options.source || ""));
  return s;
}
/** Une ligne avec ses lectures « Se lit » (règles, idées clés, à retenir…). */
export const inlLu = s => inl(s, { lecture: true, source: s });

/* ---------- Texte en paragraphes ---------- */
/** Texte de plusieurs paragraphes : listes, intertitres, formules centrées, tableaux, code ; les lectures manquantes sous le premier bloc qui les contient. */
export function md(s, options = {}) {
  if (s == null) return "";
  const texte = String(s).replace(/\r/g, "");
  const aLire = options.sansLecture ? [] : lecturesManquantes(texte);
  const dites = new Set();
  const lectures = morceau => {
    if (!aLire.length) return "";
    const ici = aLire.filter(l => !dites.has(l.latex) && morceau.includes(l.latex));
    ici.forEach(l => dites.add(l.latex));
    return lignesSeLit(ici);
  };
  const lignes = texte.split("\n"), out = [];
  let para = [], liste = null;
  const finPara = () => { if (para.length) { const t = para.join(" "); out.push(`<p>${inl(t)}</p>${lectures(t)}`); para = []; } };
  const finListe = () => {
    if (!liste) return;
    out.push(`<${liste.t}>${liste.items.map(x => `<li>${inl(x)}</li>`).join("")}</${liste.t}>${lectures(liste.items.join(" "))}`);
    liste = null;
  };
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i], t = l.trim();
    let m;
    if (!t) { finPara(); finListe(); continue; }
    if (t.startsWith("```")) {
      finPara(); finListe();
      const bloc = [];
      while (++i < lignes.length && !lignes[i].trim().startsWith("```")) bloc.push(lignes[i]);
      out.push(`<pre class="code">${esc(bloc.join("\n"))}</pre>`);
      continue;
    }
    if (t.startsWith("$$") && (t.length === 2 || t.slice(2).indexOf("$$") < 0 || (t.endsWith("$$") && t.length > 4))) {
      finPara(); finListe();
      let contenu;
      if (t.length > 4 && t.endsWith("$$")) contenu = t.slice(2, -2);
      else {
        const bloc = [t.slice(2)];
        while (++i < lignes.length && lignes[i].indexOf("$$") < 0) bloc.push(lignes[i]);
        if (i < lignes.length) bloc.push(lignes[i].slice(0, lignes[i].indexOf("$$")));
        contenu = bloc.join("\n");
      }
      out.push(`<div class="formule-centree">${tex(contenu.trim(), true)}</div>${lectures(contenu.trim())}`);
      continue;
    }
    if (/^\|.*\|$/.test(t)) {
      finPara(); finListe();
      const rangs = [t];
      while (i + 1 < lignes.length && /^\|.*\|$/.test(lignes[i + 1].trim())) rangs.push(lignes[++i].trim());
      out.push(tableauMarkdown(rangs));
      continue;
    }
    if ((m = /^(#{1,6})\s+(.*)$/.exec(t))) { finPara(); finListe(); out.push(`<h4>${inl(m[2])}</h4>`); continue; }
    if ((m = /^>\s?(.*)$/.exec(t))) { finPara(); finListe(); out.push(`<blockquote>${inl(m[1])}</blockquote>`); continue; }
    if ((m = /^[-*•]\s+(.*)$/.exec(t))) { finPara(); if (!liste || liste.t !== "ul") { finListe(); liste = { t: "ul", items: [] }; } liste.items.push(m[1]); continue; }
    if ((m = /^\d+[.)]\s+(.*)$/.exec(t))) { finPara(); if (!liste || liste.t !== "ol") { finListe(); liste = { t: "ol", items: [] }; } liste.items.push(m[1]); continue; }
    if (liste && /^\s{2,}/.test(l)) { liste.items[liste.items.length - 1] += " " + t; continue; }
    finListe(); para.push(t);
  }
  finPara(); finListe();
  const reste = aLire.filter(l => !dites.has(l.latex));
  return out.join("") + lignesSeLit(reste);
}
function tableauMarkdown(rangs) {
  const cellules = r => r.replace(/\\\|/g, "\u0002").replace(/^\||\|$/g, "").split("|").map(c => c.trim().replace(/\u0002/g, "|"));
  const lignes = rangs.map(cellules);
  const separateur = lignes.length > 1 && lignes[1].every(c => /^:?-{2,}:?$/.test(c));
  const entete = separateur ? lignes[0] : null;
  const corps = separateur ? lignes.slice(2) : lignes;
  return tableau(entete, corps);
}
export function tableau(entetes, rangees) {
  let h = '<div class="tableau-defile"><table class="donnees">';
  if (entetes && entetes.length) h += "<thead><tr>" + entetes.map(x => `<th>${inl(x)}</th>`).join("") + "</tr></thead>";
  h += "<tbody>" + (rangees || []).map(r => "<tr>" + r.map(x => `<td>${inl(x)}</td>`).join("") + "</tr>").join("") + "</tbody></table></div>";
  return h;
}

/* ---------- Formule décortiquée ---------- */
/** Une formule et sa lecture : « ce que ça fait », « comment la lire », chaque symbole. */
export function carteFormule(f, options = {}) {
  if (!f) return "";
  const lecture = f.lecture || (f.latex && lectureDe(f.latex) ? `« ${lectureDe(f.latex)} »` : "");
  let h = `<div class="carte-formule${options.classe ? " " + options.classe : ""}">`;
  if (f.latex) h += `<div class="formule-grande">${tex(f.latex, true)}</div>`;
  else if (f.code) h += `<pre class="code formule-code">${esc(f.code)}</pre>`;
  else if (f.texte) h += `<div class="formule-texte">${inl(f.texte)}</div>`;
  if (f.resultat) h += `<div class="formule-resultat">${inl(f.resultat)}</div>`;
  if (f.ceQueCaFait) h += `<div class="sous-etiquette">CE QUE ÇA FAIT</div><div class="sous-texte">${inl(f.ceQueCaFait)}</div>`;
  if (lecture) h += `<div class="sous-etiquette">COMMENT LA LIRE</div><div class="sous-texte">${inl(lecture)}</div>`;
  if (f.symboles && f.symboles.length && !options.sansSymboles) h += symboles(f.symboles);
  if (f.texte && f.latex) h += `<div class="sous-texte">${md(f.texte)}</div>`;
  return h + "</div>";
}
export function symboles(liste) {
  if (!liste || !liste.length) return "";
  return `<div class="sous-etiquette">CHAQUE SYMBOLE</div><div class="symboles">${liste.map(s =>
    `<div class="symbole"><span class="sym">${tex(s[0])}</span><span class="sens">${inl(s[1])}</span></div>`).join("")}</div>`;
}

/* ---------- Encadrés et blocs de leçon ---------- */
const ENCADRES = {
  enclair: ["ampoule", "EN CLAIR"], definition: ["livre", "DÉFINITION"], attention: ["drapeau", "ATTENTION · PIÈGE"],
  aretenir: ["etoile", "À RETENIR"], texte: ["etincelle", ""], exemple: ["etincelle", "EXEMPLE"],
};
export function encadre(genre, texte, etiquette) {
  const [icone, defaut] = ENCADRES[genre] || ENCADRES.texte;
  return `<div class="encadre ${genre}"><div class="encadre-tete">${ico(icone, 2.1)}<span>${esc(etiquette || defaut)}</span></div>${md(texte)}</div>`;
}
function etapes(titre, liste) {
  return `<div class="carte-interieure etapes"><div class="encadre-tete bleu">${ico("listeCochee", 2.1)}<span>${esc(titre)}</span></div>${listeEtapes(liste)}</div>`;
}
export function listeEtapes(liste) {
  return `<ol class="etapes-num">${(liste || []).map((x, i) => `<li><span class="rond">${i + 1}</span><div>${inlLu(x)}</div></li>`).join("")}</ol>`;
}
let compteurQuestion = 0;
/** Bloc d'une partie de leçon (texte, encadrés, formule, étapes, code, question). */
export function blocLecon(b, ctx) {
  switch (b.genre) {
    case "texte": return `<div class="bloc-texte">${md(b.texte)}</div>`;
    case "enclair": case "attention": case "aretenir": return encadre(b.genre, b.texte);
    case "definition": return encadre("definition", (b.terme ? `**${b.terme}** · ` : "") + (b.texte || ""), b.terme ? "DÉFINITION" : "DÉFINITION");
    case "exemple": return encadre("exemple", (b.titre ? `**${b.titre}**\n\n` : "") + (b.texte || ""), "EXEMPLE");
    case "formule": return `<div class="bloc-formule">${carteFormule(b)}${b.texte ? "" : ""}</div>`;
    case "etapes": return etapes(b.titre ? "PAS À PAS · " + b.titre.toUpperCase() : "PAS À PAS", b.etapes);
    case "code": {
      const sp = ctx && ctx.script ? ctx.script(b) : null;
      return `<div class="bloc-code">${b.preparation ? `<div class="etiquette-section">PRÉPARATION</div><pre class="code">${esc(b.preparation)}</pre>` : ""}<pre class="code">${esc(b.code)}</pre>` +
        (sp ? `<div class="rangee-code">${boutonCode(sp)}</div>` : "") +
        (b.sortie ? `<div class="etiquette-section">SORTIE DE R</div><pre class="sortie">${esc(String(b.sortie).replace(/^\n+|\n+$/g, ""))}</pre>` : "") + "</div>";
    }
    case "question": {
      const id = "q" + (++compteurQuestion);
      return `<div class="carte-interieure question"><div class="encadre-tete sarcelle">${ico("cible", 2.1)}<span>QUESTION POUR VÉRIFIER</span></div>${md(b.texte)}` +
        `<button class="bouton secondaire" data-action="reveler" data-cible="${id}">${ico("retourner")}Voir la réponse</button><div class="reponse-cachee" id="${id}">${md(b.reponse)}</div></div>`;
    }
    default: return b.texte ? `<div class="bloc-texte">${md(b.texte)}</div>` : "";
  }
}

/* ---------- Graphes orientés acycliques ---------- */
export function goa(g) {
  const xs = g.noeuds.map(n => n.x), ys = g.noeuds.map(n => n.y);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const k = 80, p = 34, W = (maxx - minx) * k + 2 * p, H = (maxy - miny) * k + 2 * p, r = 21;
  const X = n => (n.x - minx) * k + p, Y = n => (maxy - n.y) * k + p;
  const par = {}; g.noeuds.forEach(n => { par[n.id] = n; });
  const id = "fl" + Math.random().toString(36).slice(2, 8);
  let s = `<svg viewBox="0 0 ${W} ${H}" style="max-width:${Math.max(W, 120)}px;width:100%" role="img"><defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor"/></marker></defs>`;
  for (const a of g.arcs || []) {
    const A = par[a.de], B = par[a.vers]; if (!A || !B) continue;
    const x1 = X(A), y1 = Y(A), x2 = X(B), y2 = Y(B), dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
    s += `<line x1="${x1 + dx / d * r}" y1="${y1 + dy / d * r}" x2="${x2 - dx / d * (r + 2)}" y2="${y2 - dy / d * (r + 2)}" stroke="currentColor" stroke-width="2"${a.pointille ? ' stroke-dasharray="6 5"' : ""} marker-end="url(#${id})"/>`;
  }
  for (const n of g.noeuds) {
    const parts = String(n.etiquette).split("_");
    s += `<circle cx="${X(n)}" cy="${Y(n)}" r="${r}" fill="var(--teinte-bleue)" stroke="var(--bleu)" stroke-width="2"/><text x="${X(n)}" y="${Y(n) + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="currentColor">${esc(parts[0])}${parts.slice(1).map(x => `<tspan baseline-shift="sub" font-size="12">${esc(x.replace(/[{}]/g, ""))}</tspan>`).join("")}</text>`;
  }
  return `<figure class="goa">${s}</svg>${g.legende ? `<figcaption>${inl(g.legende)}</figcaption>` : ""}</figure>`;
}

/* ---------- Blocs des devoirs et du tutoriel R ---------- */
function sortieR(so, dossier) {
  if (so.genre === "texte") return `<pre class="sortie">${esc(String(so.texte || "").replace(/\n$/, ""))}</pre>`;
  if (so.genre === "image") return `<div class="figure"><img alt="" data-contenu="${esc(cheminImage(so.image, dossier))}"></div>`;
  if (so.genre === "message" || so.genre === "avertissement") return `<div class="message-r">${esc(so.texte)}</div>`;
  if (so.genre === "tableau") {
    const t = so.tableau, cols = t.liste || [];
    const n = cols.length ? cols[0].affiche.length : 0, rangs = [];
    for (let i = 0; i < n; i++) rangs.push((t.nomsRangees ? [t.nomsRangees[i]] : []).concat(cols.map(c => c.affiche[i])));
    const ent = (t.nomsRangees ? [""] : []).concat(cols.map(c => c.nom));
    return `<div class="tableau-defile"><table class="donnees r"><thead><tr>${ent.map(x => `<th>${esc(x)}</th>`).join("")}</tr></thead><tbody>${rangs.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` +
      (t.tronque ? `<div class="message-r">… ${t.rangees} rangées au total</div>` : "");
  }
  return "";
}
function cheminImage(c, dossier) { return c.includes("/") ? `${dossier}/${c}` : `${dossier}/img/${c}`; }
/** Bloc d'un devoir ou du tutoriel ; ctx : { dossier, devoir, ouvert, evaluation(id) } */
export function blocExercice(b, ctx) {
  switch (b.genre) {
    case "intertitre": return `<h3 class="intertitre">${inl(b.texte)}</h3>`;
    case "texte": return `<div class="bloc-texte">${md(b.texte)}</div>`;
    case "encart": return encadre("enclair", b.texte, b.encart === "positron" ? "AVEC POSITRON" : "À NOTER");
    case "image": return `<figure class="figure"><img alt="" data-contenu="${esc(cheminImage(b.image, ctx.dossier))}">${b.texte ? `<figcaption>${inl(b.texte)}</figcaption>` : ""}</figure>`;
    case "exemple": case "donnees": {
      const sp = ctx.script ? ctx.script(b) : null;
      return (b.echo === false || !b.code ? "" : `<pre class="code">${esc(b.code)}</pre>`) + (sp ? `<div class="rangee-code">${boutonCode(sp)}</div>` : "") + (b.sorties || []).map(so => sortieR(so, ctx.dossier)).join("");
    }
    case "goa": return (b.texte ? `<div class="bloc-texte">${md(b.texte)}</div>` : "") + `<div class="goas">${(b.goas || []).map(goa).join("")}</div>`;
    case "exercice": {
      const ex = b.exercice || {}, sp = ctx.script ? ctx.script(b) : null;
      const bouton = sp ? boutonCode(sp, { principal: true }) : "";
      const solution = ex.solution ? `<button class="bouton secondaire petit" data-action="reveler" data-cible="sol-${esc(b.id)}">${ico("oeil")}Voir la solution</button>` : "";
      return `<div class="boite-code"><div class="boite-tete">${ico("code", 2)}<span>À TOI · CODE DE DÉPART</span><span class="espace"></span>${sp ? "" : `<button class="lien" data-action="copier" data-texte="${esc(ex.codeDepart || "")}">${ico("copier")}Copier</button>`}</div><pre class="code">${esc(ex.codeDepart || "")}</pre>` +
        (bouton || solution ? `<div class="rangee-code">${bouton}${solution}</div>` : "") +
        (ex.solution ? `<div class="reponse-cachee" id="sol-${esc(b.id)}"><pre class="code">${esc(ex.solution)}</pre></div>` : "") + "</div>";
    }
    case "correction": {
      const id = `${ctx.devoir}/${b.texte}`, ev = ctx.evaluation ? ctx.evaluation(id) : null;
      const cle = "cor-" + String(b.id).replace(/[^\w-]/g, "");
      return `<div class="correction${ev === true ? " reussie" : ev === false ? " a-revoir" : ""}" data-correction="${esc(id)}">
<div class="correction-tete"><button class="bouton secondaire" data-action="reveler" data-cible="${cle}">${ico("oeil")}Voir la correction${b.texte ? " : " + esc(b.texte) : ""}</button>
<span class="espace"></span>${ctx.evaluation ? `<span class="autoeval"><button class="puce${ev === true ? " actif ok" : ""}" data-action="autoeval" data-id="${esc(id)}" data-val="1">${ico("coche", 2.4)}Réussi</button><button class="puce${ev === false ? " actif ko" : ""}" data-action="autoeval" data-id="${esc(id)}" data-val="0">${ico("retourner", 2)}À revoir</button></span>` : ""}</div>
<div class="reponse-cachee${ctx.ouvert ? " ouverte" : ""}" id="${cle}">${(b.contenu || []).map(x => blocExercice(x, { ...ctx, script: null })).join("")}</div></div>`;
    }
    default: return b.texte ? `<div class="bloc-texte">${md(b.texte)}</div>` : "";
  }
}

/** Remplace les images du contenu (data-contenu) par leur adresse déchiffrée, une fois dans la page. */
export function hydrater(racine) {
  for (const img of racine.querySelectorAll("img[data-contenu]")) {
    const chemin = img.getAttribute("data-contenu");
    img.removeAttribute("data-contenu");
    Contenu.url(chemin).then(u => { if (u) img.src = u; else img.classList.add("absente"); });
  }
}
