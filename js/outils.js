/* Outils communs : échappement, dates (fr-CA), accords, normalisation du texte. */
export function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
export const S = n => (n > 1 ? "s" : "");
export function pourcent(part) { return Math.round((part || 0) * 100); }
export function arrondi(x) { return Math.sign(x) * Math.round(Math.abs(x)); }

/* ---------- Dates : un jour s'écrit « AAAA-MM-JJ » (heure locale) ---------- */
const MOIS_COURTS = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
export const JOURS_COURTS = ["D", "L", "M", "M", "J", "V", "S"];
export const JOURS_ABREGES = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const deux = n => (n < 10 ? "0" : "") + n;
export function jour(d = new Date()) { return d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate()); }
export function dateDe(j) { const p = j.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
export function decaler(j, n) { const d = dateDe(j); d.setDate(d.getDate() + n); return jour(d); }
export function ecart(de, a) { return Math.round((dateDe(a) - dateDe(de)) / 864e5); }
export function jourSemaine(j) { return dateDe(j).getDay(); }
export function lundi(j) { return decaler(j, -((jourSemaine(j) + 6) % 7)); }
export function maintenant() { const d = new Date(); return jour(d) + "T" + deux(d.getHours()) + ":" + deux(d.getMinutes()) + ":" + deux(d.getSeconds()); }
export function jourDe(dateHeure) { return String(dateHeure || "").slice(0, 10); }
function quantieme(d) { return d.getDate() === 1 ? "1er" : String(d.getDate()); }
/** « 28 sept » */
export function dateCourte(j) { const d = dateDe(j); return quantieme(d) + " " + MOIS_COURTS[d.getMonth()]; }
/** « Lundi 28 septembre » */
export function dateLongue(j) { const d = dateDe(j); const t = JOURS[d.getDay()] + " " + quantieme(d) + " " + MOIS[d.getMonth()]; return t[0].toUpperCase() + t.slice(1); }
/** « lundi 28 septembre » */
export function dateLongueMin(j) { const t = dateLongue(j); return t[0].toLowerCase() + t.slice(1); }
export function nomMois(m) { return MOIS[m]; }
export function dans(n) { return n === 0 ? "aujourd'hui" : n === 1 ? "demain" : "dans " + n + " jours"; }
export function dansSemaines(n) {
  if (n <= 1) return dans(n);
  if (n < 14) return "dans " + n + " jours";
  return "dans " + Math.round(n / 7) + " semaines";
}

/* ---------- Texte ---------- */
/** Minuscules sans accents, pour chercher (« esperance » trouve « espérance »). */
export function normaliser(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae");
}
/** Espaces insécables avant : ; ! ? » et après «, comme la typographie de la version Windows. */
export function insecables(s) {
  return String(s || "").replace(/ ([:;!?»])/g, " $1").replace(/« /g, "« ");
}
export function majuscule(s) { s = String(s || ""); return s ? s[0].toUpperCase() + s.slice(1) : s; }
export function minuscule(s) { s = String(s || ""); return s ? s[0].toLowerCase() + s.slice(1) : s; }
export function nombreFr(x, dec = 2) { return Number(x).toLocaleString("fr-CA", { maximumFractionDigits: dec }); }

/* ---------- Hasard ---------- */
export function melanger(t) {
  const l = t.slice();
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
}

/* ---------- Divers ---------- */
export function attendre(ms) { return new Promise(r => setTimeout(r, ms)); }
export function grouperPar(liste, cle) { const m = new Map(); for (const x of liste) { const k = cle(x); if (!m.has(k)) m.set(k, []); m.get(k).push(x); } return m; }
export function distinct(liste, cle = x => x) { const vus = new Set(); return liste.filter(x => { const k = cle(x); if (vus.has(k)) return false; vus.add(k); return true; }); }
export function maxPar(liste, f) { let m = null, v = -Infinity; for (const x of liste) { const y = f(x); if (y > v) { v = y; m = x; } } return m; }
export function minPar(liste, f) { let m = null, v = Infinity; for (const x of liste) { const y = f(x); if (y < v) { v = y; m = x; } } return m; }
export function trierPar(liste, ...cles) {
  return liste.slice().sort((a, b) => {
    for (const k of cles) { const x = k(a), y = k(b); if (x < y) return -1; if (x > y) return 1; }
    return 0;
  });
}
