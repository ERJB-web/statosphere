/* Contenu chiffré du cours : clé tirée du mot de passe (PBKDF2-SHA-256), gardée non exportable dans IndexedDB ;
   chaque fichier se déchiffre à la volée (AES-256-GCM), hors ligne compris ; préparation hors ligne dans le cache. */
const BASE = "statosphere", MAGASIN = "cles", NOM_CLE = "cours";
export const CACHE_CONTENU = "statosphere-contenu";

let cle = null, index = null, parametres = null;
const json = new Map();
const urls = new Map(); // chemin → { promesse, vu }
let memoireSeule = false;

/* ---------- Clé ---------- */
function base() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open(BASE, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(MAGASIN);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}
async function lireCle() {
  try {
    const db = await base();
    return await new Promise(ok => {
      const t = db.transaction(MAGASIN).objectStore(MAGASIN).get(NOM_CLE);
      t.onsuccess = () => ok(t.result || null);
      t.onerror = () => ok(null);
    });
  } catch (e) { return null; }
}
async function garderCle(k) {
  try {
    const db = await base();
    await new Promise((ok, ko) => {
      const t = db.transaction(MAGASIN, "readwrite");
      t.objectStore(MAGASIN).put(k, NOM_CLE);
      t.oncomplete = ok; t.onerror = () => ko(t.error);
    });
  } catch (e) { memoireSeule = true; }
}
export async function oublierCle() {
  cle = null; index = null; json.clear();
  try {
    const db = await base();
    await new Promise(ok => { const t = db.transaction(MAGASIN, "readwrite"); t.objectStore(MAGASIN).delete(NOM_CLE); t.oncomplete = ok; t.onerror = ok; });
  } catch (e) { /* rien à oublier */ }
}
async function lireParametres() {
  if (parametres) return parametres;
  const r = await fetch("cle.json", { cache: "no-cache" });
  if (!r.ok) throw new Error("parametres");
  parametres = await r.json();
  return parametres;
}
function octetsBase64(b64) { const s = atob(b64); const o = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i); return o; }
/** Le mot de passe tel qu'il a été tapé : minuscules, tirets (un tiret long ou une espace deviennent un tiret). */
export function nettoyerMotDePasse(m) {
  return String(m || "").normalize("NFC").trim().toLowerCase().replace(/[‐-―−]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-");
}

async function dechiffrer(k, tampon) {
  const octets = new Uint8Array(tampon);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: octets.subarray(0, 12) }, k, octets.subarray(12));
}
async function degzip(tampon) {
  const flux = new Blob([tampon]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Response(flux).arrayBuffer();
}
async function chargerIndex(k) {
  const p = await lireParametres();
  const r = await fetch(p.index || "d/index.bin");
  if (!r.ok) throw new Error("index");
  const clair = await degzip(await dechiffrer(k, await r.arrayBuffer()));
  return JSON.parse(new TextDecoder().decode(clair));
}

/** Prêt sans mot de passe : la clé de cet appareil ouvre l'index. Faux s'il faut demander le mot de passe. */
export async function ouvrirAvecCleGardee() {
  const k = await lireCle();
  if (!k) return false;
  try { index = await chargerIndex(k); cle = k; return true; }
  catch (e) { if (e && e.name === "OperationError") await oublierCle(); return false; }
}

/** Essaie un mot de passe : vrai s'il ouvre le contenu (la clé est alors gardée sur l'appareil). */
export async function ouvrirAvecMotDePasse(motDePasse) {
  const p = await lireParametres();
  const brut = await crypto.subtle.importKey("raw", new TextEncoder().encode(nettoyerMotDePasse(motDePasse)), "PBKDF2", false, ["deriveKey"]);
  const k = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: octetsBase64(p.sel), iterations: p.iterations, hash: "SHA-256" },
    brut, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  try { index = await chargerIndex(k); } catch (e) { return false; }
  cle = k;
  await garderCle(k);
  return true;
}
export function cleSeulementEnMemoire() { return memoireSeule; }
export function infos() { return index ? { version: index.version, commit: index.commit, construit: index.construit } : null; }

/* ---------- Lecture ---------- */
export function existe(chemin) { return !!(index && index.fichiers[chemin]); }
export function liste(prefixe) { return index ? Object.keys(index.fichiers).filter(c => c.startsWith(prefixe)).sort() : []; }
async function octets(chemin) {
  const e = index && index.fichiers[chemin];
  if (!e) throw new Error("absent : " + chemin);
  const r = await fetch("d/" + e[0] + ".bin");
  if (!r.ok) throw new Error("hors ligne : " + chemin);
  const clair = await dechiffrer(cle, await r.arrayBuffer());
  return e[3] ? degzip(clair) : clair;
}
/** Un fichier JSON du contenu, gardé en mémoire ; null s'il n'existe pas ou ne se lit pas. */
export function lireJson(chemin) {
  if (!existe(chemin)) return Promise.resolve(null);
  if (!json.has(chemin)) {
    json.set(chemin, octets(chemin).then(b => JSON.parse(new TextDecoder().decode(b))).catch(e => { json.delete(chemin); console.warn(e); return null; }));
  }
  return json.get(chemin);
}
export async function lireTexte(chemin) {
  if (!existe(chemin)) return null;
  try { return new TextDecoder().decode(await octets(chemin)); } catch (e) { return null; }
}
const TYPES = { p: "image/png", g: "image/jpeg", s: "image/svg+xml", c: "text/csv", t: "text/plain" };
/** Adresse locale (blob:) d'une image du contenu ; les plus anciennes sont libérées au-delà de 160. */
export function url(chemin) {
  if (!existe(chemin)) return Promise.resolve(null);
  const deja = urls.get(chemin);
  if (deja) { deja.vu = Date.now(); return deja.promesse; }
  const type = TYPES[index.fichiers[chemin][2]] || "application/octet-stream";
  const promesse = octets(chemin).then(b => URL.createObjectURL(new Blob([b], { type }))).catch(e => { urls.delete(chemin); console.warn(e); return null; });
  urls.set(chemin, { promesse, vu: Date.now() });
  if (urls.size > 160) {
    const anciens = [...urls.entries()].sort((a, b) => a[1].vu - b[1].vu).slice(0, urls.size - 140);
    for (const [c, v] of anciens) { urls.delete(c); v.promesse.then(u => u && setTimeout(() => URL.revokeObjectURL(u), 20000)); }
  }
  return promesse;
}

/* ---------- Hors ligne ---------- */
function adresses() {
  return Object.entries(index.fichiers).map(([, e]) => ({ url: new URL("d/" + e[0] + ".bin", location.href).href, taille: e[1] }));
}
/** Où en est le contenu hors ligne : octets déjà gardés sur l'appareil et total. */
export async function etatHorsLigne() {
  if (!index || !("caches" in window)) return { fait: 0, total: 0, manquants: [] };
  const c = await caches.open(CACHE_CONTENU);
  const presents = new Set((await c.keys()).map(r => r.url));
  const toutes = adresses();
  const manquants = toutes.filter(a => !presents.has(a.url));
  const total = toutes.reduce((s, a) => s + a.taille, 0);
  return { fait: total - manquants.reduce((s, a) => s + a.taille, 0), total, manquants, toutes };
}
/** Télécharge ce qui manque (six à la fois) ; rappel(fait, total) à chaque fichier ; retire du cache ce qui n'est plus au contenu. */
export async function preparerHorsLigne(rappel, signal) {
  const etat = await etatHorsLigne();
  if (!etat.total) return true;
  const c = await caches.open(CACHE_CONTENU);
  let fait = etat.fait, erreurs = 0;
  rappel(fait, etat.total);
  const file = etat.manquants.slice();
  async function ouvrier() {
    while (file.length && !(signal && signal.aborted)) {
      const a = file.shift();
      try {
        const r = await fetch(a.url, { cache: "no-store" });
        if (!r.ok) throw new Error(r.status);
        await c.put(a.url, r);
        fait += a.taille;
        rappel(fait, etat.total);
      } catch (e) { erreurs++; }
    }
  }
  await Promise.all(Array.from({ length: 6 }, ouvrier));
  if (!erreurs) {
    const voulues = new Set(etat.toutes.map(a => a.url));
    for (const r of await c.keys()) if (!voulues.has(r.url)) await c.delete(r);
  }
  return erreurs === 0 && !(signal && signal.aborted);
}
