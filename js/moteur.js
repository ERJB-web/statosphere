/* Le moteur local du professeur Sigma, sans réseau (port de Core/Tutorat/Moteur) : découpage du texte, français écrit vite,
   correction des fautes de frappe, racinisation (Snowball français), lexique du cours, index BM25 sur trois champs, analyse de la
   question, choix du passage qui répond, réponse rédigée et documents pour aller plus loin. */
import * as M from "./modele.js";
import { C } from "./modele.js";

/* ===================== Découpage ===================== */
const GRECQUES = new Set(["alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho",
  "sigma", "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega"]);
const LETTRE_CHIFFRE = /[\p{L}\p{N}]/u;
export function normaliser(t) {
  return String(t).replace(/œ/g, "oe").replace(/Œ/g, "oe").replace(/æ/g, "ae").replace(/Æ/g, "ae").normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase();
}
function formuleEnMots(latex) {
  let s = "";
  for (let i = 0; i < latex.length; i++) {
    const c = latex[i];
    if (c === "\\") {
      const debut = i + 1;
      while (i + 1 < latex.length && /[A-Za-z]/.test(latex[i + 1])) i++;
      const nom = latex.slice(debut, i + 1);
      s += " ";
      if (GRECQUES.has(nom)) s += (nom.startsWith("var") ? nom.slice(3) : nom) + " ";
    } else s += "{}_^".includes(c) ? " " : c;
  }
  return s;
}
function preparer(texte) {
  let t = texte;
  if (/[²^]/.test(t)) t = t.replace(/χ²/g, "khi2").replace(/χ\^2/g, "khi2").replace(/(^|[^\p{L}\p{N}_])([Rr])\}?(?:²|\^\{?2\}?)/gu, (m, a, r) => a + r + "2");
  if (/[-−–]|moins/.test(t)) t = t.replace(/(^|[^\p{L}\p{N}_])([nNkK])\s*(?:-|−|–|moins(?![\p{L}\p{N}_]))\s*(?=1(?![\p{L}\p{N}_]))/gu, "$1$2-");
  if (t.includes("$")) t = t.replace(/\$\$?([^$]*)\$\$?/g, (m, f) => " " + formuleEnMots(f) + " ");
  if (t.includes("+")) t = t.replace(/(^|[^\p{L}\p{N}])[aA]\+/gu, "$1a plus");
  if (t.includes(">")) t = t.replace(/%>%/g, " pipe ").replace(/\|>/g, " pipe ");
  return t.replace(/’/g, "'").replace(/ʼ/g, "'");
}
const repete = m => { for (let i = 2; i < m.length; i++) if (m[i] === m[i - 1] && m[i] === m[i - 2]) return true; return false; };
/** Les mots du texte : { mot (normalisé), brut, apresCoupure }. */
export function mots(texte, recoller = true) {
  const r = [];
  if (!texte || !String(texte).trim()) return r;
  const p = preparer(String(texte));
  let coupure = false, precedent = null, finPrecedent = 0;
  for (let debut = 0; debut < p.length;) {
    if (!LETTRE_CHIFFRE.test(p[debut])) { if (".:;!?".includes(p[debut])) coupure = true; debut++; continue; }
    let fin = debut;
    while (fin < p.length && LETTRE_CHIFFRE.test(p[fin])) fin++;
    const valeur = p.slice(debut, fin), index = debut;
    debut = fin;
    const brut = repete(valeur) && !/^[IVXivx]+$/.test(valeur) ? valeur.replace(/(\p{L})\1{2,}/gu, "$1") : valeur;
    const mot = /^[\x00-\x7f]*$/.test(brut) ? brut.toLowerCase() : normaliser(brut);
    if (!mot) continue;
    const lie = recoller && precedent && !coupure && index - 1 === finPrecedent && p[index - 1] === "-";
    const j = { mot, brut, apresCoupure: coupure && r.length > 0 };
    r.push(j);
    if (lie) r.push({ mot: precedent.mot + mot, brut: precedent.brut + brut, apresCoupure: false });
    precedent = j; finPrecedent = fin; coupure = false;
  }
  return r;
}

/* ===================== Français écrit ===================== */
const ABREVIATIONS = {
  koi: "quoi", kwa: "quoi", quoa: "quoi", ke: "que", kel: "quel", kelle: "quelle", kels: "quels", ki: "qui",
  pk: "pourquoi", pq: "pourquoi", pkoi: "pourquoi", pourkoi: "pourquoi", prq: "pourquoi",
  cmt: "comment", cmnt: "comment", coment: "comment", koman: "comment", comen: "comment",
  kan: "quand", kand: "quand", qd: "quand", qnd: "quand",
  kesako: "c est quoi", kezako: "c est quoi", cest: "c est", ya: "il y a",
  jcomprends: "je comprends", jcomprend: "je comprends", jcomprens: "je comprends", jcompren: "je comprends",
  jcapte: "je capte", jpige: "je pige", jsais: "je sais", jsp: "je sais pas", chais: "je sais", chepa: "je sais pas",
  chui: "je suis", chuis: "je suis", jsuis: "je suis", jfais: "je fais", jfait: "je fais", jdois: "je dois",
  jpeux: "je peux", jpx: "je peux", jvais: "je vais", jveux: "je veux", jai: "j ai", jarrive: "j arrive",
  jen: "j en", jetais: "j etais", jme: "je me", jcomprenais: "je comprenais",
  tjs: "toujours", tjrs: "toujours", ds: "dans", dc: "donc", pr: "pour", ac: "avec", avc: "avec",
  bcp: "beaucoup", mtn: "maintenant", mnt: "maintenant", auj: "aujourd hui", ajd: "aujourd hui",
  pcq: "parce que", pcque: "parce que", psk: "parce que", paske: "parce que", qqch: "quelque chose",
  qqc: "quelque chose", tt: "tout", ms: "mais", vrm: "vraiment", dsl: "desole",
  diff: "difference", diffs: "differences", ex: "exemple", exs: "exemples", nb: "nombre",
  exam: "examen", exams: "examens", exo: "exercice", exos: "exercices", qcms: "qcm",
  slt: "salut", bjr: "bonjour", bsr: "bonsoir", cc: "coucou", mrc: "merci", mrci: "merci", mci: "merci",
  thx: "merci", thanks: "merci", merki: "merci", dac: "d accord", dacc: "d accord", dak: "d accord",
  daccord: "d accord", oki: "ok", okk: "ok", okay: "ok", okey: "ok", oke: "ok",
  svp: "stp", pls: "stp", plz: "stp", expliq: "explique", explik: "explique",
};
const APRES_C = new Set(["est", "etait", "etaient", "ete", "a", "b"]);
export const MOTS_VIDES = new Set(("le la les l un une des du de d au aux ce cet cette ces c ca cela ceci mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs " +
  "je j tu t il elle on nous vous ils elles me m te se s moi toi lui y en a et ou ni mais donc or car que qu quoi qui quel quelle quels " +
  "quelles lequel laquelle lesquels dont pour par sur sous dans avec sans avant apres entre chez vers contre selon pendant depuis " +
  "est es suis sont ai as ont avons avez etait etais etaient etre ete sera seront serait fait fais faire font faut peut peux pouvez " +
  "veux veut voudrais voulais aimerais vais va dois doit devrais devons ne n pas plus tres bien aussi encore deja alors bon euh " +
  "oui non ok stp svp merci bonjour salut allo coucou hello svp please si comme tout tous toute toutes quelque chose truc trucs " +
  "comment pourquoi quand combien ici maintenant aujourd hui vraiment juste genre bref plutot autant " +
  "dire dit dis dites donne donner montre montrer explique expliquer expliques avoir eu").split(" "));
export const ADRESSE = new Set(["sigma", "prof", "professeur", "monsieur", "madame"]);
export function developper(liste) {
  const r = [];
  for (let i = 0; i < liste.length; i++) {
    const j = liste[i];
    if (j.mot === "c" && i + 1 < liste.length && !APRES_C.has(liste[i + 1].mot)) { r.push(j); r.push({ mot: "est", brut: "est", apresCoupure: false }); continue; }
    const forme = ABREVIATIONS[j.mot];
    if (!forme) { r.push(j); continue; }
    forme.split(" ").forEach((m, k) => r.push({ mot: m, brut: m, apresCoupure: k === 0 && j.apresCoupure }));
  }
  return r;
}

/* ===================== Correcteur ===================== */
export function distance(a, b, maximum) {
  const d = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) d[i][0] = i;
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let minLigne = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cout);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2][j - 2] + 1);
      d[i][j] = v; minLigne = Math.min(minLigne, v);
    }
    if (minLigne > maximum) return maximum + 1;
  }
  return d[a.length][b.length];
}
export class Correcteur {
  constructor(frequences, distanceMax = 2) { this.f = frequences; this.max = distanceMax; this.mots = [...frequences.entries()].filter(([k]) => k.length >= 3); }
  connait(m) { return this.f.has(m); }
  corriger(mot) {
    if (mot.length < 4 || /\d/.test(mot)) return mot;
    const connu = this.f.has(mot), propre = this.f.get(mot) || 0;
    if (connu && (propre >= 3 || mot.length < 5)) return mot;
    const maximum = connu ? 1 : Math.min(mot.length <= 4 ? 1 : 2, this.max);
    const plancher = connu ? Math.max(20, 30 * propre) : 0;
    let meilleur = mot, cout = Infinity, freq = 0;
    for (const [c, f] of this.mots) {
      if (Math.abs(c.length - mot.length) > maximum || f < plancher || c === mot) continue;
      const d = distance(mot, c, maximum);
      if (d > maximum) continue;
      const k = d + (c[0] === mot[0] ? 0 : 0.5);
      if (k < cout || (k === cout && f > freq)) { meilleur = c; cout = k; freq = f; }
    }
    return cout <= maximum ? meilleur : mot;
  }
}

/* ===================== Racinisation (Snowball français, mots a à z) ===================== */
const VOY = "aeiouy";
const estVoyelle = c => VOY.includes(c);
const S2A = ["imes", "it", "ites", "i", "ie", "ies", "ir", "ira", "irai", "iraIent", "irais", "irait", "iras", "irent", "irez", "iriez", "irions",
  "irons", "iront", "is", "issaIent", "issais", "issait", "issant", "issante", "issantes", "issants", "isse", "issent", "isses", "issez",
  "issiez", "issions", "issons"].sort((a, b) => b.length - a.length);
const S2B = [["ions", 0], ...["e", "ee", "ees", "es", "erent", "er", "era", "erai", "eraIent", "erais", "erait", "eras", "erez", "eriez", "erions", "erons", "eront", "ez", "iez"].map(s => [s, 1]),
  ...["ames", "at", "ates", "a", "ai", "aIent", "ais", "ait", "ant", "ante", "antes", "ants", "as", "asse", "assent", "asses", "assiez", "assions"].map(s => [s, 2])]
  .sort((a, b) => b[0].length - a[0].length);
const S1 = ["ance", "iqUe", "isme", "able", "iste", "eux", "ances", "iqUes", "ismes", "ables", "istes", "atrice", "ateur", "ation", "atrices", "ateurs", "ations",
  "logie", "logies", "usion", "ution", "usions", "utions", "ence", "ences", "ement", "ements", "ite", "ites", "if", "ive", "ifs", "ives", "eaux", "aux", "euse", "euses",
  "issement", "issements", "amment", "emment", "ment", "ments"];
function marquer(mot) {
  const s = mot.split("");
  for (let i = 0; i < s.length; i++) {
    const avant = i > 0 && estVoyelle(s[i - 1]), apres = i + 1 < s.length && estVoyelle(s[i + 1]);
    if ((s[i] === "u" || s[i] === "i") && avant && apres) s[i] = s[i].toUpperCase();
    else if (s[i] === "y" && (avant || apres)) s[i] = "Y";
    else if (s[i] === "u" && i > 0 && s[i - 1] === "q") s[i] = "U";
  }
  return s.join("");
}
function regionRV(t) {
  if (t.length >= 2 && estVoyelle(t[0]) && estVoyelle(t[1])) return Math.min(3, t.length);
  if (t.startsWith("par") || t.startsWith("col") || t.startsWith("tap")) return 3;
  for (let i = 1; i < t.length; i++) if (estVoyelle(t[i])) return i + 1;
  return t.length;
}
function regionR(t, debut) { for (let i = debut + 1; i < t.length; i++) if (!estVoyelle(t[i]) && estVoyelle(t[i - 1])) return i + 1; return t.length; }
export function racine(mot) {
  if (mot.length < 3 || /[^a-z]/.test(mot)) return mot;
  let t = marquer(mot);
  const rv = regionRV(t), r1 = regionR(t, 0), r2 = regionR(t, r1);
  const finit = s => t.endsWith(s), dans = (reg, s) => t.length - s.length >= reg;
  const couper = s => { t = t.slice(0, t.length - s.length); }, remplacer = (s, p) => { t = t.slice(0, t.length - s.length) + p; };
  function etape1() {
    const s = S1.filter(finit).sort((a, b) => b.length - a.length)[0];
    if (!s) return "rien";
    switch (s) {
      case "ance": case "iqUe": case "isme": case "able": case "iste": case "eux": case "ances": case "iqUes": case "ismes": case "ables": case "istes":
        if (!dans(r2, s)) return "rien"; couper(s); return "modifie";
      case "atrice": case "ateur": case "ation": case "atrices": case "ateurs": case "ations":
        if (!dans(r2, s)) return "rien"; couper(s);
        if (finit("ic")) { if (dans(r2, "ic")) couper("ic"); else remplacer("ic", "iqU"); }
        return "modifie";
      case "logie": case "logies": if (!dans(r2, s)) return "rien"; remplacer(s, "log"); return "modifie";
      case "usion": case "ution": case "usions": case "utions": if (!dans(r2, s)) return "rien"; remplacer(s, "u"); return "modifie";
      case "ence": case "ences": if (!dans(r2, s)) return "rien"; remplacer(s, "ent"); return "modifie";
      case "ement": case "ements":
        if (!dans(rv, s)) return "rien"; couper(s);
        if (finit("iv") && dans(r2, "iv")) { couper("iv"); if (finit("at") && dans(r2, "at")) couper("at"); }
        else if (finit("eus")) { if (dans(r2, "eus")) couper("eus"); else if (dans(r1, "eus")) remplacer("eus", "eux"); }
        else if ((finit("abl") && dans(r2, "abl")) || (finit("iqU") && dans(r2, "iqU"))) t = t.slice(0, -3);
        else if ((finit("ier") || finit("Ier")) && dans(rv, "ier")) remplacer("ier", "i");
        return "modifie";
      case "ite": case "ites":
        if (!dans(r2, s)) return "rien"; couper(s);
        if (finit("abil")) { if (dans(r2, "abil")) couper("abil"); else remplacer("abil", "abl"); }
        else if (finit("ic")) { if (dans(r2, "ic")) couper("ic"); else remplacer("ic", "iqU"); }
        else if (finit("iv") && dans(r2, "iv")) couper("iv");
        return "modifie";
      case "if": case "ive": case "ifs": case "ives":
        if (!dans(r2, s)) return "rien"; couper(s);
        if (finit("at") && dans(r2, "at")) { couper("at"); if (finit("ic")) { if (dans(r2, "ic")) couper("ic"); else remplacer("ic", "iqU"); } }
        return "modifie";
      case "eaux": remplacer(s, "eau"); return "modifie";
      case "aux": if (!dans(r1, s)) return "rien"; remplacer(s, "al"); return "modifie";
      case "euse": case "euses":
        if (dans(r2, s)) couper(s); else if (dans(r1, s)) remplacer(s, "eux"); else return "rien";
        return "modifie";
      case "issement": case "issements":
        if (!dans(r1, s) || t.length <= s.length || estVoyelle(t[t.length - s.length - 1])) return "rien";
        couper(s); return "modifie";
      case "amment": if (!dans(rv, s)) return "rien"; remplacer(s, "ant"); return "ment";
      case "emment": if (!dans(rv, s)) return "rien"; remplacer(s, "ent"); return "ment";
      default: {
        const avant = t.length - s.length - 1;
        if (avant < rv || !estVoyelle(t[avant])) return "rien";
        couper(s); return "ment";
      }
    }
  }
  function etape2a() {
    for (const s of S2A) {
      if (!finit(s) || !dans(rv, s)) continue;
      const avant = t.length - s.length - 1;
      if (avant < 0 || avant < rv || estVoyelle(t[avant])) return false;
      couper(s); return true;
    }
    return false;
  }
  function etape2b() {
    for (const [s, g] of S2B) {
      if (!finit(s) || !dans(rv, s)) continue;
      if (g === 0 && !dans(r2, s)) return false;
      couper(s);
      if (g === 2 && finit("e") && dans(rv, "e")) couper("e");
      return true;
    }
    return false;
  }
  const e1 = etape1();
  let modifie = e1 === "modifie";
  if (e1 === "rien" || e1 === "ment") { if (etape2a()) modifie = true; else if (etape2b()) modifie = true; }
  if (modifie) { if (finit("Y")) remplacer("Y", "i"); }
  else {
    if (t.length > 1 && t[t.length - 1] === "s" && !"aious".includes(t[t.length - 2])) couper("s");
    if (finit("ion") && dans(r2, "ion") && t.length - 4 >= rv && (t[t.length - 4] === "s" || t[t.length - 4] === "t")) couper("ion");
    else if ((finit("ier") || finit("Ier")) && dans(rv, "ier")) remplacer("ier", "i");
    else if ((finit("iere") || finit("Iere")) && dans(rv, "iere")) remplacer("iere", "i");
    else if (finit("e") && dans(rv, "e")) couper("e");
  }
  if (finit("enn") || finit("onn") || finit("ett") || finit("ell") || finit("eill")) t = t.slice(0, -1);
  return t.toLowerCase();
}

/* ===================== Lexique compilé ===================== */
const ELISIONS = new Set(["l", "d", "j", "m", "s", "c", "y", "a", "n", "qu"]);
export const estUtile = m => m.length >= 2 && !MOTS_VIDES.has(m);
export const compteDansUnTitre = m => estUtile(m) || (m.length === 1 && /\p{L}/u.test(m) && !ELISIONS.has(m));
export const motsEcrits = texte => new Set(mots(texte).filter(j => compteDansUnTitre(j.mot)).map(j => "~" + j.mot));
export const termeDeGroupe = g => "=" + g;
export class Lexique {
  constructor(lex) {
    lex = lex || {};
    const syn = lex.synonymes || [], abr = lex.abreviations || [], fr = lex.fonctionsR || [];
    this.cache = new Map();
    this.proteges = new Set();
    for (const e of syn.flat().map(x => mots(x))) if (e.length === 1 && e[0].mot.length <= 6) this.proteges.add(e[0].mot);
    this.expressions = new Map();
    syn.forEach((groupe, g) => {
      for (const e of groupe) {
        const racines = this.sequence(mots(e)).map(x => x.racine);
        if (!racines.length) continue;
        if (!this.expressions.has(racines[0])) this.expressions.set(racines[0], []);
        this.expressions.get(racines[0]).push({ racines, groupe: g });
      }
    });
    for (const l of this.expressions.values()) l.sort((a, b) => b.racines.length - a.racines.length);
    this.abreviations = new Map();
    for (const a of abr) { const k = normaliser(a.forme); if (!this.abreviations.has(k)) this.abreviations.set(k, a); }
    this.racinesDesGroupes = syn.map(g => new Set([...this.racines(g[0]), ...motsEcrits(g[0])]));
    this.fonctions = fr.filter(f => f.length > 1).map(f => ({ expression: this.racines(f[0]), fonctions: f.slice(1).map(normaliser) }));
    this.motsDuLexique = new Set();
    for (const e of [...syn.flat(), ...abr.map(a => a.sens)]) for (const m of mots(e)) this.motsDuLexique.add(m.mot);
  }
  racine(mot) { let r = this.cache.get(mot); if (r === undefined) { r = this.proteges.has(mot) ? mot : racine(mot); this.cache.set(mot, r); } return r; }
  racines(texte) { return new Set(mots(texte).filter(j => compteDansUnTitre(j.mot)).map(j => this.racine(j.mot))); }
  fonctionsR(racines) { return this.fonctions.filter(f => f.expression.size > 0 && [...f.expression].every(x => racines.has(x))).flatMap(f => f.fonctions); }
  abreviation(mot) { return this.abreviations.get(mot) || null; }
  sequence(liste) {
    const r = []; let coupure = false;
    liste.forEach((j, i) => {
      coupure = coupure || j.apresCoupure;
      const m = j.mot;
      if (m.length > 1 ? MOTS_VIDES.has(m) : ELISIONS.has(m)) return;
      r.push({ racine: this.racine(m), rang: i, apresCoupure: coupure }); coupure = false;
    });
    return r;
  }
  trouverExpressions(liste) {
    const s = this.sequence(liste), r = [];
    for (let i = 0; i < s.length;) {
      let longueur = 0;
      const cand = this.expressions.get(s[i].racine);
      if (cand) for (const { racines, groupe } of cand) {
        if (i + racines.length > s.length) continue;
        let ok = true;
        for (let k = 1; k < racines.length && ok; k++) ok = s[i + k].racine === racines[k] && !s[i + k].apresCoupure;
        if (!ok) continue;
        r.push({ groupe, debut: s[i].rang, fin: s[i + racines.length - 1].rang }); longueur = racines.length; break;
      }
      i += Math.max(1, longueur);
    }
    return r;
  }
  termes(texteOuMots, f) {
    const liste = typeof texteOuMots === "string" ? mots(texteOuMots) : texteOuMots;
    let prec = null;
    for (const j of liste) {
      if (j.apresCoupure) prec = null;
      if (!estUtile(j.mot)) continue;
      const r = this.racine(j.mot);
      f(r);
      if (prec !== null && prec !== r) f(prec + "_" + r);
      prec = r;
    }
    for (const e of this.trouverExpressions(liste)) f(termeDeGroupe(e.groupe));
  }
}

/* ===================== Documents du cours ===================== */
function couper(texte, longueur) {
  if (texte.length <= longueur) return texte;
  let phrase = null, espace = null, dollars = 0, gras = 0;
  for (let i = 0; i < longueur; i++) {
    if (texte[i] === "$") dollars++;
    else if (texte[i] === "*" && i + 1 < texte.length && texte[i + 1] === "*") { gras++; i++; continue; }
    if (dollars % 2 || gras % 2) continue;
    if (".!?".includes(texte[i]) && (i + 1 === texte.length || /\s/.test(texte[i + 1]))) phrase = i + 1;
    else if (/\s/.test(texte[i])) espace = i;
  }
  if (phrase !== null && phrase > longueur / 3) return texte.slice(0, phrase).trimEnd();
  return espace !== null ? texte.slice(0, espace).trimEnd() + " …" : texte.slice(0, longueur) + " …";
}
export const couperTexte = couper;
const morceau = (genre, texte, o = {}) => ({ genre, texte: texte || "", titre: o.titre ?? null, formule: o.formule ?? null, etapes: o.etapes || [], code: o.code ?? null });
const avecSortie = (code, sortie) => (!sortie || !String(sortie).trim() ? code.trimEnd() : code.trimEnd() + "\n" + sortie.replace(/^\n+|\n+$/g, "").split("\n").map(l => "## " + l).join("\n"));
function documents() {
  const docs = [];
  const entrees = (C.catalogue && C.catalogue.entries) || [];
  const nombre = Math.max(1, entrees.length);
  const cible = (ecran, o) => ({ ecran, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) });
  for (const e of entrees.filter(e => e.chapitre != null)) {
    const m = [morceau("definition", e.explication || "", { titre: e.terme })];
    if (e.enClair) m.push(morceau("enclair", e.enClair));
    if (e.latex && e.lecture && (e.symboles || []).length) m.push(morceau("formule", "", { formule: { latex: e.latex, ceQueCaFait: e.ceQueCaFait || "", lecture: e.lecture, symboles: e.symboles } }));
    if (e.exemple) m.push(morceau("exemple", "", { titre: e.exemple.titre, etapes: e.exemple.etapes || [] }));
    if (e.aRetenir) m.push(morceau("aretenir", e.aRetenir));
    if (e.attention) m.push(morceau("attention", e.attention));
    docs.push({ id: `notion:${e.id}`, origine: "notion", titre: e.terme, source: "Notion du catalogue", cible: cible("catalogue", { notion: e.id }), morceaux: m,
      motsCles: e.motsCles || [], associes: (e.associees || []).map(x => `notion:${x}`),
      poids: (1 + 0.2 * (1 - Math.min(Math.max(e.rangPopularite || 0, 0), nombre) / nombre)) * (C.lecons[e.chapitre] ? 1 : 0.85) });
  }
  for (const l of Object.values(C.lecons).sort((a, b) => a.chapitre - b.chapitre)) {
    const s = M.seanceDuChapitre(l.chapitre);
    for (const p of l.parties) {
      const m = [];
      for (const b of p.blocs) {
        const x = b.genre === "definition" ? morceau("definition", b.texte, { titre: b.terme })
          : b.genre === "enclair" ? morceau("enclair", b.texte)
          : b.genre === "formule" ? morceau("formule", b.texte, { formule: { latex: b.latex || "", ceQueCaFait: b.ceQueCaFait || "", lecture: b.lecture || "", symboles: b.symboles || [] } })
          : b.genre === "etapes" || b.genre === "exemple" ? morceau("exemple", b.texte, { titre: b.titre, etapes: b.etapes || [] })
          : b.genre === "code" && b.code ? morceau("code", b.texte, { code: avecSortie(b.code, b.sortie) })
          : b.genre === "attention" ? morceau("attention", b.texte)
          : b.genre === "aretenir" ? morceau("aretenir", b.texte)
          : b.genre === "question" ? morceau("question", `**Question.** ${b.texte}\n\n**Réponse.** ${b.reponse}`)
          : b.texte ? morceau("texte", b.texte, { titre: b.titre }) : null;
        if (x) m.push(x);
      }
      docs.push({ id: `lecon:${p.id}`, origine: "lecon", titre: p.titre, source: `Leçon ${M.Chap.de(l.chapitre)}`, motsCles: [p.section].filter(Boolean), associes: [], poids: 1,
        cible: cible("reviser", { seance: s ? s.cle : null, onglet: "lecons", chapitre: l.chapitre, partie: p.id }), morceaux: m });
    }
  }
  for (const j of Object.values(C.jeux).sort((a, b) => (a.nom < b.nom ? -1 : 1))) {
    const s = C.seances.find(x => x.diapos.includes(j.nom));
    for (const y of j.explications.diapos.filter(y => y.titre && y.type !== "titre" && y.type !== "section")) {
      const m = [morceau(y.type === "exemple" ? "exemple" : "texte", y.explication || "")];
      if (y.enClair) m.push(morceau("enclair", y.enClair));
      for (const f of y.formules || []) m.push(morceau("formule", "", { formule: f }));
      if ((y.pasAPas || []).length) m.push(morceau("exemple", "", { etapes: y.pasAPas }));
      if ((y.ideesCles || []).length) m.push(morceau("texte", y.ideesCles.map(i => "- " + i).join("\n")));
      if ((y.aRetenir || []).length) m.push(morceau("aretenir", [].concat(y.aRetenir).join(" ")));
      if (y.attention) m.push(morceau("attention", y.attention));
      if ((y.commandesR || []).length) m.push(morceau("code", y.commandesR.map(c => `- \`${c.commande}\` : ${c.role}`).join("\n"), { code: y.commandesR.map(c => c.commande).join("\n") }));
      docs.push({ id: `diapo:${j.nom}/${y.n}`, origine: "diapo", titre: y.titre, source: `${j.libelle} · diapo ${y.n}`, motsCles: [], associes: [], poids: 1,
        cible: cible("diapos", { seance: s ? s.cle : null, jeu: j.nom, diapo: y.n }), morceaux: m });
    }
  }
  for (const f of Object.values(C.fiches).sort((a, b) => a.chapitre - b.chapitre)) {
    const s = M.seanceDuChapitre(f.chapitre);
    for (const c of M.cartesDe(f)) {
      const m = [];
      if (c.formule.latex) m.push(morceau("formule", c.explication, { formule: { latex: c.formule.latex, ceQueCaFait: c.formule.ceQueCaFait || "", lecture: c.formule.lecture || "", symboles: c.formule.symboles || [] } }));
      else if (c.formule.code) m.push(morceau("code", c.explication, { code: c.formule.code }));
      else m.push(morceau("texte", [c.formule.texte, c.explication].filter(Boolean).join(" ")));
      for (const x of c.secondaires.filter(x => x.latex)) m.push(morceau("formule", "", { formule: { latex: x.latex, ceQueCaFait: x.ceQueCaFait || "", lecture: x.lecture || "", symboles: x.symboles || [] } }));
      if (c.regles.length) m.push(morceau("aretenir", c.regles.map(r => "- " + r).join("\n")));
      docs.push({ id: `carte:${c.id}`, origine: "carte", titre: c.titre, source: `Carte ${M.Chap.de(f.chapitre)}`, motsCles: [], associes: [], poids: 1,
        cible: cible("reviser", { seance: s ? s.cle : null, onglet: "memoriser", chapitre: f.chapitre, carte: c.id }), morceaux: m });
    }
  }
  for (const cle of Object.keys(C.banques).sort()) {
    for (const q of C.banques[cle].questions.filter(q => q.explication)) {
      const bonne = q.bonne >= 0 && q.bonne < q.choix.length ? q.choix[q.bonne] : "";
      const p = q.lecon && M.partie(q.lecon);
      const sd = p && M.seanceDuChapitre(p.lecon.chapitre);
      const cib = p ? cible("reviser", { seance: sd ? sd.cle : cle, onglet: "lecons", chapitre: p.lecon.chapitre, partie: q.lecon }) : cible("reviser", { seance: cle, onglet: "qcm" });
      docs.push({ id: `qcm:${q.id}`, origine: "qcm", titre: couper(q.enonce.replace(/\n/g, " "), 90), source: `QCM ${M.Chap.de(q.chapitre)}`, motsCles: [], associes: [], poids: 1, cible: cib,
        morceaux: [morceau("question", `**Question.** ${q.enonce}\n\n**Réponse.** ${bonne}\n\n${q.explication}`)] });
    }
  }
  for (const s of ((C.tutoriel && C.tutoriel.sujets) || []).filter(s => !s.estExercices)) {
    const m = [];
    for (const b of s.blocs) {
      if ((b.genre === "texte" || b.genre === "encart") && b.texte) m.push(morceau("texte", b.texte));
      else if (b.genre === "exemple" && b.code) m.push(morceau("code", "", { code: avecSortie(b.code, (b.sorties || []).map(x => x.texte).filter(Boolean).join("\n")) }));
    }
    docs.push({ id: `tutoriel:${s.numero}`, origine: "tutoriel", titre: s.titre.replace(/`/g, ""), source: "Tutoriel R", motsCles: [], associes: [], poids: 1, cible: cible("coder-r", { sujet: s.numero }), morceaux: m });
  }
  for (const d of docs) d.titreComplet = `${d.source} · ${d.titre}`;
  return docs;
}

/* ===================== Index BM25 ===================== */
const K1 = 1.2, POIDS_CHAMP = [4, 2.5, 1], B_CHAMP = [0.75, 0.4, 0.75];
const corps = d => d.morceaux.flatMap(m => [m.texte, m.formule && m.formule.latex ? `$${m.formule.latex}$` : null, m.formule && m.formule.ceQueCaFait, m.formule && m.formule.lecture, m.code,
  ...((m.formule && m.formule.symboles) || []).map(s => (s.length > 1 ? s[1] : "")), ...m.etapes].filter(x => typeof x === "string")).join(" . ");
const sansParentheses = t => t.replace(/\([^)]*\)/g, " ");
export class Index {
  constructor(docs, lexique) {
    this.lexique = lexique; this.docs = docs;
    this.postings = new Map(); this.longueurs = []; this.titres = []; this.titresEcrits = []; this.definitions = [];
    this.formule = []; this.code = []; this.exemple = []; this.termesDesTitres = new Set();
    const frequences = new Map();
    docs.forEach((doc, d) => {
      const tf = new Map();
      const champs = [doc.titre, [...doc.motsCles, ...doc.morceaux.map(m => m.titre).filter(Boolean)].join(" . "), corps(doc)];
      const longueurs = [0, 0, 0];
      for (let c = 0; c < 3; c++) {
        const liste = mots(champs[c]);
        lexique.termes(liste, terme => {
          let f = tf.get(terme); if (!f) { f = [0, 0, 0]; tf.set(terme, f); }
          f[c]++;
          if (!terme.includes("_") && !terme.startsWith("=")) longueurs[c]++;
        });
        for (const m of liste) if (m.mot.length >= 3) frequences.set(m.mot, (frequences.get(m.mot) || 0) + 1);
      }
      this.longueurs[d] = longueurs;
      for (const [terme, f] of tf) { let l = this.postings.get(terme); if (!l) { l = []; this.postings.set(terme, l); } l.push([d, f]); }
      const definitions = doc.morceaux.filter(m => m.genre === "definition").map(m => m.titre).filter(Boolean);
      for (const t of [...definitions, ...(doc.origine === "qcm" ? [] : [doc.titre]), ...(doc.origine === "notion" ? doc.motsCles : [])]) lexique.termes(t, x => this.termesDesTitres.add(x));
      this.titres[d] = [doc.titre, ...definitions].map(t => lexique.racines(sansParentheses(t))).filter(r => r.size > 0);
      this.titresEcrits[d] = [doc.titre, ...definitions].map(t => motsEcrits(sansParentheses(t))).filter(r => r.size > 0);
      this.definitions[d] = definitions.map(t => { const s = new Set(); lexique.termes(t, x => s.add(x)); return s; });
      this.formule[d] = doc.morceaux.some(m => m.formule); this.code[d] = doc.morceaux.some(m => m.code); this.exemple[d] = doc.morceaux.some(m => m.etapes.length > 0);
    });
    this.moyennes = [0, 1, 2].map(c => Math.max(1, this.longueurs.reduce((x, l) => x + l[c], 0) / Math.max(1, docs.length)));
    this.correcteur = new Correcteur(frequences);
  }
  contient(t) { return this.postings.has(t); }
  dansUnTitre(t) { return this.termesDesTitres.has(t); }
  idf(t) { const p = this.postings.get(t); return p ? Math.log(1 + (this.docs.length - p.length + 0.5) / (p.length + 0.5)) : 0; }
  *scores(terme) {
    const p = this.postings.get(terme); if (!p) return;
    const idf = this.idf(terme);
    for (const [d, tf] of p) {
      let pondere = 0;
      for (let c = 0; c < 3; c++) if (tf[c] > 0) pondere += POIDS_CHAMP[c] * tf[c] / (1 - B_CHAMP[c] + B_CHAMP[c] * this.longueurs[d][c] / this.moyennes[c]);
      yield [d, idf * pondere * (K1 + 1) / (pondere + K1), tf[0] > 0 || tf[1] > 0];
    }
  }
  chercher(concepts, bonus, racines, genre, nombre = 10, fonctions = []) {
    const utiles = concepts.filter(c => c.termes.some(t => this.contient(t)));
    if (!utiles.length) return [];
    const poids = utiles.map(c => Math.max(...c.termes.map(t => this.idf(t))) * c.poids);
    const total = poids.reduce((a, b) => a + b, 0);
    const scores = new Map();
    utiles.forEach((c, k) => {
      const meilleurs = new Map();
      for (const terme of c.termes) for (const [d, s, titre] of this.scores(terme)) {
        const m = meilleurs.get(d) || [0, false];
        meilleurs.set(d, [Math.max(s, m[0]), titre || m[1]]);
      }
      for (const [d, [s, titre]] of meilleurs) {
        const v = scores.get(d) || [0, 0, 0];
        scores.set(d, [v[0] + s * c.poids, v[1] + poids[k] / total, v[2] + (titre ? poids[k] / total : 0)]);
      }
    });
    for (const [terme, pb] of [...bonus.map(b => [b, 0.5]), ...fonctions.map(f => [f, 1.2])].filter(b => this.contient(b[0])))
      for (const [d, s] of this.scores(terme)) { const v = scores.get(d); if (v) scores.set(d, [v[0] + pb * s, v[1], v[2]]); }
    const r = [];
    for (const [d, [score, couverture, titre]] of scores) {
      const exact = Math.max(0, ...this.titres[d].map(t => [...t].filter(x => racines.has(x)).length / t.size));
      const defini = (genre === "definition" || genre === "incomprehension") && this.definitions[d].some(t => utiles.every(c => c.termes.some(x => t.has(x))));
      const ecrit = this.titresEcrits[d].some(t => [...t].every(x => racines.has(x)));
      const final = score * couverture * couverture * (1 + 0.5 * titre) * (1 + 1.5 * exact * exact) * (ecrit ? 1.3 : 1) * (defini ? 1.25 : 1) * this.ponderation(d, genre) * this.docs[d].poids;
      r.push({ document: this.docs[d], score: final, couverture, couvertureTitre: titre });
    }
    return r.sort((a, b) => b.score - a.score).slice(0, nombre);
  }
  ponderation(d, genre) {
    let p = priorite(this.docs[d].origine, genre);
    if (genre === "formule" && !this.formule[d]) p *= 0.4;
    if (genre === "calcul" && !this.formule[d] && !this.exemple[d]) p *= 0.5;
    if (genre === "coder" && !this.code[d]) p *= 0.5;
    if (genre === "exemple" && !this.exemple[d]) p *= 0.6;
    return p;
  }
}
function priorite(o, g) {
  switch (o) {
    case "notion": return g === "coder" ? 0.3 : g === "interpretation" || g === "pourquoi" ? 0.8 : g === "exemple" || g === "difference" ? 0.9 : 1;
    case "lecon": return g === "definition" ? 0.85 : g === "incomprehension" || g === "formule" ? 0.9 : g === "calcul" ? 0.95 : 1;
    case "diapo": return g === "definition" ? 0.6 : g === "incomprehension" ? 0.65 : g === "interpretation" ? 0.85 : 0.75;
    case "carte": return g === "formule" ? 0.8 : g === "calcul" ? 0.7 : g === "coder" ? 0.3 : 0.5;
    case "qcm": return g === "pourquoi" ? 0.4 : 0.25;
    case "tutoriel": return g === "coder" ? 1 : g === "definition" || g === "incomprehension" ? 0.6 : 0.35;
    default: return 0.7;
  }
}

/* ===================== Analyse de la question ===================== */
const ORDRE_GENRES = ["definition", "incomprehension", "interpretation", "formule", "calcul", "exemple", "pourquoi", "difference", "coder"];
const MARQUES_TEXTE = {
  coder: "dans r|en r|avec r|sur r|sous r|via r|code r|codes r|commande r|commandes r|fonction r|fonctions r|script r|langage r|r studio|" +
    "rstudio|positron|commande|commandes|code|script|+package|+packages|+paquet|+paquets|+librairie|+librairies|+library|syntaxe|" +
    "+dplyr|+tidyverse|+ggplot|+ggplot2|+lm|+mutate|+summarise|+summarize|+ifelse|+tibble|+csv|+excel|+importer|+installer|+marginaleffects|" +
    "+rnorm|+runif|+pnorm|+lmer|+aov|+chisq|+rbind|+cbind",
  difference: "difference|differences|differencier|distinguer|distingue|distinction|vs|versus|confondre|confonds|confond|c est pareil|est pareil|" +
    "pas pareil|meme chose|la meme|le meme",
  pourquoi: "pourquoi|a quoi sert|a quoi servent|a quoi ca sert|sert a quoi|servent a quoi|ca sert a quoi|ca sert|sert|servent|utilite|a quoi bon|" +
    "raison|raisons|interet|pourquoi faire|quand utiliser|quand faut il|dans quel cas|quand est ce qu on utilise|quand on utilise",
  exemple: "exemple|exemples|illustration|illustrer|illustre|concret|concrete|concretement|cas concret",
  calcul: "calcul|calculs|calculer|calcule|calcules|calculee|calculees|calculent|calculez|calculons|a la main|comment trouver|comment on trouve|" +
    "on trouve comment|comment obtenir|comment on obtient|combien vaut|combien fait|se calcule",
  formule: "formule|formules|equation|equations|notation|notations|s ecrit|ecrire|ecrit|symbole|symboles",
  interpretation: "interpreter|interprete|interpretes|interpretation|interpretations|comment lire|lire|conclure|conclusion|+significatif|" +
    "+significative|+significatifs|+significatives",
  incomprehension: "comprends pas|comprend pas|compris|comprendre|comprends|comprend|pige|capte|saisis|perdu|perdue|flou|floue|galere|du mal|difficile|" +
    "complique|compliquee|explique|expliquer|expliques|expliquez|explication|explications|simplement|plus simple|plus simplement|" +
    "termes simples|mots simples|help|au secours|aide moi|aider|aide|j arrive pas|rien compris|confus|confuse|bloque|bloquee",
  definition: "c est quoi|c est qui|qu est ce que|qu est ce qu|qu est ce|definition|definitions|definir|defini|definit|veut dire|veulent dire|" +
    "veux dire|signifie|signifient|signification|designe|sens de",
};
const MARQUES = Object.entries(MARQUES_TEXTE).flatMap(([genre, v]) => v.split("|").map(m => ({ genre, mots: m.replace(/^\+/, "").split(" "), gardee: m.startsWith("+") })));
const MOTS_DES_MARQUES = new Set(MARQUES.flatMap(m => m.mots));
const DETERMINANTS = new Set(["l", "le", "la", "les", "un", "une", "d", "de", "du", "des", "mon", "ton", "son", "ma", "ta", "sa", "mes", "tes", "ses", "cette", "ce", "notre", "votre", "leur"]);
const SEPARATEURS = new Set(["et", "vs", "versus", "ou", "avec", "contre"]);
const MOTS_GENERAUX = new Set(("savoir sais sait connaitre connais utiliser utilise utilisent mettre met mets prendre prend prends voir vois aller falloir pouvoir devoir vouloir " +
  "penser pense croire crois parler besoin cours question questions notion notions concept concepts chose choses truc trucs mot mots terme termes veut fait faire " +
  "fais faites font on quoi rien peu beaucoup toujours jamais encore svp stp aime aimes aimer adore adores fonctionne fonctionnes utilises vais vas").split(" "));
const garde = mot => MARQUES.some(m => m.gardee && m.mots.length === 1 && m.mots[0] === mot);
const indice = mot => (/^(interpreter|interprete|interpretes|interpretation|interpretations)$/.test(mot) ? "interpreter" : mot === "formule" || mot === "formules" ? "formule"
  : /^(calcul|calculs|calculer|calcule|calcules)$/.test(mot) ? "calculer" : mot === "exemple" || mot === "exemples" ? "exemple" : mot === "pourquoi" ? "pourquoi" : null);
const enContexte = (liste, rang) => { let i = rang - 1; if (i >= 0 && DETERMINANTS.has(liste[i].mot)) i--; return i >= 0 && (liste[i].mot === "en" || liste[i].mot === "dans"); };

export class Analyseur {
  constructor(index) { this.index = index; this.lexique = index.lexique; }
  analyser(question, fil) {
    const lx = this.lexique;
    const liste = this.corriger(this.abreger(developper(mots(question))));
    const expressions = lx.trouverExpressions(liste);
    const dansExpression = new Array(liste.length).fill(false);
    for (const e of expressions) for (let i = e.debut; i <= e.fin; i++) dansExpression[i] = true;
    const { genres, rangs } = this.marquer(liste, question, dansExpression);
    const explicite = genres.length > 0;
    let genre = explicite ? genres.reduce((a, b) => (ORDRE_GENRES.indexOf(b) > ORDRE_GENRES.indexOf(a) ? b : a)) : "definition";
    const pris = new Array(liste.length).fill(false), bonus = [];
    for (const i of rangs) { pris[i] = true; const x = indice(liste[i].mot); if (x) bonus.push(lx.racine(x)); }
    const racines = new Set();
    for (const m of liste.filter(m => compteDansUnTitre(m.mot))) { racines.add(lx.racine(m.mot)); racines.add("~" + m.mot); }
    const concepts = [];
    for (const e of expressions) {
      concepts.push({ concept: { libelle: liste.slice(e.debut, e.fin + 1).map(m => m.brut).join(" "), termes: [termeDeGroupe(e.groupe)], poids: 1 }, rang: e.debut });
      for (const r of lx.racinesDesGroupes[e.groupe]) racines.add(r);
      for (let i = e.debut; i <= e.fin; i++) pris[i] = true;
    }
    const inconnus = [];
    const seulementAdresse = liste.every(m => !estUtile(m.mot) || ADRESSE.has(m.mot) || MOTS_GENERAUX.has(m.mot));
    liste.forEach((m, i) => {
      const mot = m.mot;
      if (dansExpression[i] || (pris[i] && !garde(mot)) || !estUtile(mot) || MOTS_GENERAUX.has(mot) || /^\d+$/.test(mot)) return;
      if (ADRESSE.has(mot) && !seulementAdresse) return;
      const r = lx.racine(mot);
      if (!this.index.contient(r)) { inconnus.push(m.brut); return; }
      concepts.push({ concept: { libelle: m.brut, termes: [r], poids: 1 }, rang: i });
    });
    bonus.push(...this.paires(liste, pris));
    let ordonnes = concepts.slice().sort((a, b) => a.rang - b.rang);
    if (ordonnes.length > 1 && ordonnes.some(c => !enContexte(liste, c.rang)))
      ordonnes = ordonnes.map(c => (enContexte(liste, c.rang) ? { concept: { ...c.concept, poids: 0.5 }, rang: c.rang } : c));
    let premiers = ordonnes.map(c => c.concept), seconds = [];
    if (genre === "difference") { const s = this.separer(liste, ordonnes); if (s) [premiers, seconds] = s; }
    const der = fil && fil.derniere;
    let suite = false;
    if (!premiers.length && der) {
      suite = true; premiers = der.concepts; seconds = genre === "difference" ? der.seconds : [];
      if (!explicite) genre = der.genre;
      for (const r of der.racines) racines.add(r);
    } else if (genre === "difference" && !seconds.length && der && premiers.length && !liste.some(m => m.mot === "entre")) {
      suite = true; seconds = premiers; premiers = der.concepts;
    } else if (!explicite && der && liste.length && liste[0].mot === "et") genre = der.genre;
    return {
      genre, concepts: premiers, genreExplicite: explicite, seconds, bonus: [...new Set(bonus)],
      fonctions: genre === "coder" ? [...new Set(lx.fonctionsR(racines).map(f => lx.racine(f)))] : [],
      suite, sujet: suite && der ? der.sujet : ordonnes.map(c => c.concept.libelle).join(" "), inconnus, racines,
    };
  }
  abreger(liste) {
    const r = [];
    liste.forEach((j, i) => {
      const a = this.lexique.abreviation(j.mot);
      if (!a || (a.majuscules && !(j.brut.length > 1 && /^\p{Lu}+$/u.test(j.brut)) && !(i > 0 && DETERMINANTS.has(liste[i - 1].mot)))) { r.push(j); return; }
      mots(a.sens).forEach((m, k) => r.push({ ...m, apresCoupure: k === 0 && j.apresCoupure }));
    });
    return r;
  }
  corriger(liste) {
    for (let i = 0; i < liste.length; i++) {
      const mot = liste[i].mot;
      if (mot.length < 4 || MOTS_VIDES.has(mot) || MOTS_DES_MARQUES.has(mot) || MOTS_GENERAUX.has(mot) || ADRESSE.has(mot) || this.lexique.motsDuLexique.has(mot)) continue;
      const c = this.index.correcteur.corriger(mot);
      if (c !== mot) liste[i] = { ...liste[i], mot: c, brut: c };
    }
    return liste;
  }
  marquer(liste, question, dansExpression) {
    const genres = [], rangs = [], pris = new Array(liste.length).fill(false);
    for (const { genre, mots: marque } of MARQUES.slice().sort((a, b) => b.mots.length - a.mots.length))
      for (let i = 0; i + marque.length <= liste.length; i++) {
        let ok = true;
        for (let k = 0; k < marque.length && ok; k++) ok = !pris[i + k] && !dansExpression[i + k] && liste[i + k].mot === marque[k];
        if (!ok) continue;
        genres.push(genre);
        for (let k = 0; k < marque.length; k++) { pris[i + k] = true; rangs.push(i + k); }
      }
    if (/\b[a-z_][a-z0-9_.]+\(|%>%|\|>|<-/.test(question)) genres.push("coder");
    return { genres, rangs };
  }
  *paires(liste, pris) {
    let prec = null;
    for (let i = 0; i < liste.length; i++) {
      if (liste[i].apresCoupure || (pris[i] && !garde(liste[i].mot))) prec = null;
      if ((pris[i] && !garde(liste[i].mot)) || !estUtile(liste[i].mot) || MOTS_GENERAUX.has(liste[i].mot)) continue;
      const r = this.lexique.racine(liste[i].mot);
      if (prec !== null && prec !== r) yield prec + "_" + r;
      prec = r;
    }
  }
  separer(liste, concepts) {
    for (let s = liste.length - 1; s > 0; s--) {
      if (!SEPARATEURS.has(liste[s].mot)) continue;
      const avant = concepts.filter(c => c.rang < s).map(c => c.concept), apres = concepts.filter(c => c.rang > s).map(c => c.concept);
      if (avant.length && apres.length) return [avant, apres];
    }
    return null;
  }
}

/* ===================== Répondeur ===================== */
const LONGUEUR_TEXTE = 480, LONGUEUR_DIFFERENCE = 320, ETAPES_MAX = 5, LIGNES_DE_CODE = 16, CARTES_MAX = 3;
function affinite(genre, m) {
  const g = m.genre;
  switch (genre) {
    case "definition": if (g === "definition") return 3; if (g === "enclair") return 1.6; if (g === "texte") return 1.3; if (g === "aretenir" || g === "formule") return 1.1; break;
    case "incomprehension": if (g === "enclair") return 3; if (g === "definition") return 2.2; if (g === "texte") return 1.4; if (g === "aretenir" || g === "exemple") return 1.1; break;
    case "interpretation": if (g === "texte") return 2; if (g === "aretenir") return 1.8; if (g === "enclair" || g === "attention") return 1.5; if (g === "definition" || g === "exemple") return 1.2; break;
    case "formule": if (g === "formule") return 3; if (g === "definition" || g === "aretenir") return 0.8; break;
    case "calcul": if (g === "formule") return m.etapes.length > 0 ? 3 : 2.5; if (g === "exemple") return 2.5; break;
    case "exemple": if (g === "exemple") return 3; if (g === "enclair") return 1.5; break;
    case "pourquoi": if (g === "texte") return 2; if (g === "attention") return 1.8; if (g === "enclair") return 1.6; if (g === "definition" || g === "aretenir") return 1.3; break;
    case "difference": if (g === "attention") return 2.2; if (g === "texte") return 1.8; if (g === "exemple") return 1.6; if (g === "definition" || g === "enclair" || g === "aretenir") return 1.4; break;
    case "coder": if (g === "code") return 3; if (g === "texte") return 1; break;
  }
  if (g === "code") return 0.3;
  if (g === "question") return 0.4;
  return 0.7;
}
function indiceFrancais(genre, termes) {
  if (genre === "interpretation" && (termes.has("interpret") || termes.has("signif"))) return 1.5;
  if (genre === "pourquoi" && (termes.has("pourquoi") || termes.has("car") || termes.has("parc") || termes.has("raison"))) return 1.3;
  if (genre === "difference" && (termes.has("confond") || termes.has("distingu") || termes.has("contrair") || termes.has("different"))) return 1.4;
  return 1;
}
export class Repondeur {
  constructor() {
    this.lexique = new Lexique(C.lexique);
    this.index = new Index(documents(), this.lexique);
    this.analyseur = new Analyseur(this.index);
    this.termesMorceaux = new WeakMap();
  }
  get idfAbsent() { return Math.log(1 + (this.index.docs.length + 0.5) / 0.5); }
  termesDe(m) {
    let t = this.termesMorceaux.get(m);
    if (!t) { t = new Set(); this.lexique.termes([m.titre, m.texte, m.formule && m.formule.ceQueCaFait, m.formule && m.formule.lecture, m.code, ...m.etapes].filter(x => typeof x === "string").join(" . "), x => t.add(x)); this.termesMorceaux.set(m, t); }
    return t;
  }
  suffisant(t, n) { return t.couverture >= 0.99 || (n > 1 && t.couverture >= 0.6 && t.couvertureTitre >= 0.4); }
  notes(doc, q) {
    const poids = [...q.concepts, ...q.seconds].map(c => ({ c, p: Math.max(...c.termes.map(t => this.index.idf(t))) * c.poids })).filter(x => x.p > 0);
    const total = Math.max(poids.reduce((a, x) => a + x.p, 0), 1e-9);
    return doc.morceaux.map((m, i) => {
      const termes = this.termesDe(m);
      const part = poids.filter(x => x.c.termes.some(t => termes.has(t))).reduce((a, x) => a + x.p, 0) / total;
      const r = m.titre ? this.lexique.racines(m.titre) : null;
      const exact = r && r.size > 0 && [...r].every(x => q.racines.has(x));
      return { m, rang: i, note: affinite(q.genre, m) * (0.3 + part) * (exact ? 1.5 : 1) * indiceFrancais(q.genre, termes) };
    });
  }
  reclasser(trouves, q) {
    if (trouves.length < 2) return trouves;
    const tete = trouves.slice(0, 8);
    const notes = tete.map(t => Math.max(0, ...this.notes(t.document, q).map(n => n.note)));
    const maximum = Math.max(...notes, 1e-9);
    return tete.map((t, i) => ({ ...t, score: t.score * (0.6 + 0.4 * notes[i] / maximum) })).sort((a, b) => b.score - a.score).concat(trouves.slice(8));
  }
  extraire(doc, q) {
    const notes = this.notes(doc, q);
    if (!notes.length) return { id: doc.id, titre: doc.titre, source: doc.source, texte: "", cible: doc.cible, etapes: [] };
    const principal = notes.reduce((a, b) => (b.note > a.note ? b : a));
    const extras = [];
    const meilleur = f => { const l = notes.filter(n => f(n.m) && n.m !== principal.m).sort((a, b) => b.note - a.note); return l.length ? l[0].m : null; };
    if ((q.genre === "definition" || q.genre === "formule" || q.genre === "interpretation") && !principal.m.formule) {
      const f = meilleur(m => m.formule && (doc.origine === "notion" || notes.find(n => n.m === m).note > 0.6)); if (f) extras.push(f);
    } else if (q.genre === "calcul") {
      if (!principal.m.formule) { const f = meilleur(m => m.formule); if (f) extras.push(f); }
      if (!principal.m.etapes.length) { const e = meilleur(m => m.etapes.length > 0); if (e) extras.push(e); }
    } else if (q.genre === "coder" && principal.m.code && !String(principal.m.texte || "").trim()) {
      const avant = notes.filter(n => n.rang < principal.rang && ["texte", "enclair", "definition"].includes(n.m.genre)).map(n => n.m).pop();
      if (avant) extras.push(avant);
    }
    return this.passage(doc, principal.m, extras, q);
  }
  passage(doc, principal, extras, q) {
    const textuels = ["texte", "enclair", "definition"];
    const tous = [...extras.filter(e => textuels.includes(e.genre)), principal, ...extras.filter(e => !textuels.includes(e.genre))];
    const texte = [...new Set(tous.map(m => m.texte).filter(t => t && t.trim()))].slice(0, 2).join("\n\n");
    const formule = tous.map(m => m.formule).find(Boolean);
    const exemple = tous.find(m => m.etapes.length > 0);
    const code = tous.map(m => m.code).find(Boolean);
    return {
      id: doc.id, titre: doc.titre, source: doc.source, texte: couper(texte, LONGUEUR_TEXTE), cible: doc.cible,
      formule: formule ? { ...formule, symboles: q.genre === "formule" || q.genre === "calcul" ? (formule.symboles || []).slice(0, 6) : [] } : null,
      titreEtapes: exemple ? exemple.titre : null, etapes: exemple ? exemple.etapes.slice(0, ETAPES_MAX) : [],
      code: code ? code.split("\n").slice(0, LIGNES_DE_CODE).join("\n") : null,
    };
  }
  introduction(q, p, n) {
    const une = (...ph) => ph[n % ph.length];
    switch (q.genre) {
      case "incomprehension": return une("Pas de panique, reprenons simplement :", "Je t'explique autrement :", "Reprenons pas à pas :");
      case "interpretation": return une("Voici comment l'interpréter :", "Pour l'interpréter, retiens ceci :");
      case "formule": return !p.formule ? "Le cours ne donne pas de formule pour cela ; voici ce qu'il en dit :" : q.suite ? "Voici sa formule, et comment la lire :" : une("Voici la formule, et comment la lire :", "La formule, décortiquée :");
      case "calcul": return !p.formule && !p.etapes.length ? "Le cours ne détaille pas ce calcul ; voici ce qu'il en dit :" : une("Voici comment on calcule, pas à pas :", "Le calcul, étape par étape :");
      case "exemple": return !p.etapes.length ? "Voici un exemple tiré du cours :" : une("Voici un exemple chiffré :", "Un exemple concret, pas à pas :");
      case "pourquoi": return une("Bonne question ; voici la raison :", "Voici pourquoi :");
      case "coder": return !p.code ? "Le cours ne montre pas de code R pour cela ; voici ce qu'il en dit :" : une("Voici comment faire dans R :", "Dans R, ça s'écrit ainsi :");
      case "difference": return une("Les deux se ressemblent, mais ne disent pas la même chose :", "Voici ce qui les distingue :");
      default: return q.suite ? "Voici ce qu'en dit le cours :" : une("Voici ce que dit le cours :", "Voici l'idée, en clair :", "Bonne question. Voici la définition :");
    }
  }
  static extrait(d) {
    const texte = (d.morceaux.map(m => m.texte).find(t => t && t.trim()) || "");
    const propre = texte.replace(/\$[^$]*\$|\*\*|`/g, " ").replace(/\s+/g, " ").trim();
    if (propre.length <= 140) return propre;
    const c = propre.lastIndexOf(" ", 140);
    return propre.slice(0, c > 0 ? c : 140) + " …";
  }
  carte(d) { return { titre: d.titreComplet, detail: Repondeur.extrait(d), cible: d.cible, bouton: "Ouvrir" }; }
  plusLoin(principal, trouves) {
    const cartes = [this.carte(principal)], origines = new Set([principal.origine]);
    const seuil = trouves.length ? trouves[0].score * 0.2 : 0;
    const cle = c => JSON.stringify(c);
    const vus = new Set();
    const cand = [...trouves.filter(t => t.score >= seuil && t.document.origine !== "qcm").map(t => t.document),
      ...principal.associes.map(id => this.index.docs.find(d => d.id === id)).filter(Boolean)]
      .filter(d => d.id !== principal.id && cle(d.cible) !== cle(principal.cible) && d.titre !== principal.titre)
      .filter(d => { const k = cle(d.cible); if (vus.has(k)) return false; vus.add(k); return true; });
    for (const d of cand.slice().sort((a, b) => (origines.has(a.origine) ? 1 : 0) - (origines.has(b.origine) ? 1 : 0))) {
      if (cartes.length >= CARTES_MAX) break;
      if (cartes.some(c => cle(c.cible) === cle(d.cible) || c.titre === d.titreComplet)) continue;
      cartes.push(this.carte(d)); origines.add(d.origine);
    }
    return cartes;
  }
  rienTrouve(question, q, trouves) {
    const quoi = q.inconnus.length && !q.concepts.length ? q.inconnus.join(" ") : question.trim().replace(/[?!. ]+$/, "");
    const vus = new Set();
    const proches = trouves.filter(t => t.couverture > 0.3).map(t => t.document).filter(d => { const k = JSON.stringify(d.cible); if (vus.has(k)) return false; vus.add(k); return true; }).slice(0, CARTES_MAX).map(d => this.carte(d));
    return proches.length
      ? { texte: `Je n'ai rien trouvé dans le cours qui réponde exactement à « ${quoi} ». Voici les notions les plus proches :`, cartes: proches, suggestions: [] }
      : { texte: `Je n'ai rien trouvé dans le cours sur « ${quoi} ». Essaie un autre mot, ou demande-moi quoi faire.`, cartes: [], suggestions: [] };
  }
  retenir(fil, q, doc) { fil.derniere = q; fil.document = doc.id; fil.montres.add(doc.id); fil.reponses++; }
  repondre(question, fil) {
    const q = this.analyseur.analyser(question, fil);
    if (!q.concepts.length) return !q.inconnus.length && q.genreExplicite ? { texte: "Sur quelle notion ? Écris-moi son nom avec ta question.", cartes: [], suggestions: [] } : this.rienTrouve(question, q, []);
    if (!q.genreExplicite && !q.suite && !q.concepts.some(c => c.termes.some(t => this.index.dansUnTitre(t)))) return this.rienTrouve(question, q, []);
    if (q.genre === "difference" && q.seconds.length) { const d = this.difference(q, fil); if (d) return d; }
    const trouves = this.reclasser(this.index.chercher(q.concepts, q.bonus, q.racines, q.genre, 12, q.fonctions), q);
    if (!trouves.length || !this.suffisant(trouves[0], q.concepts.length)) return this.rienTrouve(question, q, trouves);
    let principal = trouves[0];
    if (q.suite && fil.derniere && fil.derniere.genre === q.genre && principal.document.id === fil.document) {
      const autre = trouves.slice(1).find(t => !fil.montres.has(t.document.id) && this.suffisant(t, q.concepts.length));
      if (autre) principal = autre;
    }
    const passage = this.extraire(principal.document, q);
    const intro = this.introduction(q, passage, fil.reponses);
    this.retenir(fil, q, principal.document);
    return { texte: intro, passages: [passage], cartes: this.plusLoin(principal.document, trouves), titreCartes: "Pour aller plus loin", suggestions: [] };
  }
  difference(q, fil) {
    const ok = (l, n) => l.filter(t => this.suffisant(t, n));
    const a = ok(this.index.chercher(q.concepts, q.bonus, q.racines, "definition", 6), q.concepts.length);
    const b = ok(this.index.chercher(q.seconds, q.bonus, q.racines, "definition", 6), q.seconds.length);
    const ensemble = this.index.chercher([...q.concepts, ...q.seconds], q.bonus, q.racines, "difference", 6);
    if (!a.length && !b.length) return null;
    const commun = ensemble.find(t => t.couverture > 0.99 && t.couvertureTitre > 0.99);
    let passages, source;
    const oppose = commun && this.morceauQuiOppose(commun.document, q);
    if (oppose) { source = commun.document; passages = [this.passage(source, oppose, [], q)]; }
    else if (a.length && b.length && a[0].document.id !== b[0].document.id) {
      source = a[0].document;
      const court = p => ({ ...p, texte: couper(p.texte, LONGUEUR_DIFFERENCE), formule: p.formule ? { ...p.formule, symboles: [] } : null, etapes: [], titreEtapes: null, code: null });
      passages = [court(this.extraire(a[0].document, { ...q, genre: "definition" })), court(this.extraire(b[0].document, { ...q, genre: "definition", concepts: q.seconds }))];
    } else return null;
    this.retenir(fil, q, source);
    const cartes = [];
    for (const p of passages) { const d = this.index.docs.find(x => x.id === p.id); if (d) cartes.push(this.carte(d)); }
    const vus = new Set(cartes.map(c => JSON.stringify(c.cible)));
    for (const t of [...ensemble, ...a, ...b]) {
      if (cartes.length >= CARTES_MAX) break;
      if (passages.some(p => p.id === t.document.id)) continue;
      const k = JSON.stringify(t.document.cible); if (vus.has(k)) continue; vus.add(k);
      cartes.push(this.carte(t.document));
    }
    return { texte: this.introduction(q, passages[0], fil.reponses), passages, cartes, titreCartes: "Pour aller plus loin", suggestions: [] };
  }
  morceauQuiOppose(doc, q) {
    const l = doc.morceaux.filter(m => ["attention", "texte", "exemple", "enclair", "aretenir", "definition"].includes(m.genre))
      .map(m => ({ m, t: this.termesDe(m) }))
      .filter(x => q.concepts.some(c => c.termes.some(t => x.t.has(t))) && q.seconds.some(c => c.termes.some(t => x.t.has(t))) && (x.m.genre === "attention" || indiceFrancais("difference", x.t) > 1))
      .sort((a, b) => affinite("difference", b.m) - affinite("difference", a.m));
    return l.length ? l[0].m : null;
  }
}
let instance = null;
/** Le répondeur, construit une fois (l'index du cours) à la première question sur la matière. */
export function repondeur() { if (!instance) instance = new Repondeur(); return instance; }
export const pret = () => !!instance;
