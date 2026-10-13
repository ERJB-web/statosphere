/* 04 · Diapositives des séances expliquées : la page d'origine, ses étapes, les miniatures, le plein écran, et chaque diapo
   expliquée (ce que montre la diapo, en clair, formules décortiquées, pas à pas, idées clés, à retenir, attention, synthèse) ;
   l'onglet « Exercices de la séance » (devoirs, corrections, autoévaluation). */
import * as M from "../modele.js";
import * as E from "../etat.js";
import * as Contenu from "../contenu.js";
import * as T from "../tuteur.js";
import { C } from "../modele.js";
import { ico } from "../icones.js";
import { entete, selecteurSeance, lierSelecteurs } from "../ui.js";
import { md, inl, inlLu, carteFormule, blocExercice, hydrater } from "../rendu.js";
import { esc, jour, S, insecables } from "../outils.js";

const pad = n => String(n).padStart(2, "0");
function seanceParDefaut() {
  const j = jour(), memo = E.position("diapos.seance");
  if (memo && M.trouver(memo)) return M.trouver(memo);
  const prets = C.seances.filter(s => M.jeuxDe(s).length);
  return prets.find(s => s.jour && s.jour >= j) || prets.filter(s => s.jour && s.jour <= j).pop() || C.seances[0];
}
function detail(s) {
  if (s.estExamen) return s.court;
  if (!s.diapos.length) return "Pas de diapos";
  const jeux = M.jeuxDe(s), portee = s.court || "";
  return jeux.length ? `${portee} · ${jeux.reduce((x, j) => x + j.count, 0)} diapos` : portee;
}

/* ---------- Explications d'une diapo ---------- */
function explications(d, n, synthese) {
  let num = 0;
  const numero = e => `${pad(++num)} · ${e}`;
  const carte = (genre, entete, contenu) => `<section class="carte-expl ${genre}"><div class="expl-tete">${esc(entete)}</div>${contenu}</section>`;
  const liste = (items, classe = "") => `<ol class="liste-num ${classe}">${items.map((x, i) => `<li><span class="n">${i + 1}</span><div>${inlLu(x)}</div></li>`).join("")}</ol>`;
  let h = `<div class="surtitre">${esc(d ? `${M.etiquetteDiapo(d.type)} · DIAPO ${n}` : `DIAPO ${n}`)}</div><h2 class="titre-diapo">${inl(d ? d.titre : "")}</h2>`;
  if (d) {
    h += carte("explication", numero("CE QUE MONTRE LA DIAPO"), md(d.explication));
    if (d.enClair) h += carte("enclair", numero("EN CLAIR"), md(d.enClair));
    if ((d.formules || []).length) h += carte("formules", numero(d.formules.length > 1 ? "LES FORMULES DÉCORTIQUÉES" : "LA FORMULE DÉCORTIQUÉE"), d.formules.map(f => carteFormule(f)).join(""));
    if ((d.pasAPas || []).length) h += carte("pasapas", numero("PAS À PAS"), liste(d.pasAPas));
    if ((d.ideesCles || []).length) h += carte("idees", numero("IDÉES CLÉS"), liste(d.ideesCles));
    if ((d.commandesR || []).length) h += carte("commandes", "COMMANDES R", d.commandesR.map(c => `<div class="commande-r"><pre class="code">${esc(c.commande)}</pre><div>${inlLu(c.role)}</div></div>`).join(""));
    if ([].concat(d.aRetenir || []).length) h += carte("aretenir", "À RETENIR", liste([].concat(d.aRetenir)));
    if (d.attention) h += carte("attention", "ATTENTION", md([].concat(d.attention).join("\n\n")));
  }
  if (synthese && synthese.length) h += carte("synthese", "SYNTHÈSE DE LA PRÉSENTATION", liste(synthese));
  return h;
}

/* ---------- Plein écran ---------- */
function pleinEcran(jeu, etat, rendreRoute) {
  const z = document.createElement("div");
  z.className = "plein-ecran";
  let { n, e } = etat;
  const pagesDe = k => jeu.decoupage.diapos[k - 1].pages;
  async function maj() {
    const pages = pagesDe(n), page = pages[Math.min(e, pages.length - 1)];
    z.innerHTML = `<img alt="Diapo ${n}"><button class="pe-fermer" aria-label="Fermer le plein écran">${ico("croix", 2.2)}</button>
<button class="pe-prec" aria-label="Précédente"${n === 1 && e === 0 ? " disabled" : ""}>${ico("chevronGauche", 2.4)}</button><button class="pe-suiv" aria-label="Suivante"${n === jeu.count && e === pages.length - 1 ? " disabled" : ""}>${ico("chevronDroit", 2.4)}</button>
<div class="pe-num">${n} / ${jeu.count}${pages.length > 1 ? ` · étape ${e + 1} sur ${pages.length}` : ""}</div>`;
    const u = await Contenu.url(jeu.image(page));
    const img = z.querySelector("img"); if (img && u) img.src = u;
  }
  function aller(dir) {
    const pages = pagesDe(n);
    if (dir > 0) { if (e + 1 < pages.length) e++; else if (n < jeu.count) { n++; e = 0; } else return; }
    else { if (e > 0) e--; else if (n > 1) { n--; e = pagesDe(n).length - 1; } else return; }
    maj();
  }
  function fermer() {
    document.removeEventListener("keydown", clavier, true);
    z.remove();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    rendreRoute(n, e);
  }
  function clavier(ev) {
    if (ev.key === "Escape" || ev.key === "f" || ev.key === "F") { ev.preventDefault(); ev.stopPropagation(); fermer(); }
    else if (ev.key === "ArrowRight" || ev.key === "PageDown" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); aller(1); }
    else if (ev.key === "ArrowLeft" || ev.key === "PageUp") { ev.preventDefault(); ev.stopPropagation(); aller(-1); }
  }
  z.addEventListener("click", ev => {
    if (ev.target.closest(".pe-fermer")) fermer();
    else if (ev.target.closest(".pe-prec")) aller(-1);
    else if (ev.target.closest(".pe-suiv")) aller(1);
    else if (ev.target.tagName === "IMG") aller(ev.clientX > window.innerWidth / 2 ? 1 : -1);
  });
  let x0 = null;
  z.addEventListener("touchstart", ev => { x0 = ev.touches[0].clientX; }, { passive: true });
  z.addEventListener("touchend", ev => { if (x0 == null) return; const dx = ev.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) aller(dx < 0 ? 1 : -1); });
  document.addEventListener("keydown", clavier, true);
  document.body.appendChild(z);
  if (z.requestFullscreen && matchMedia("(min-width: 900px)").matches) z.requestFullscreen().catch(() => {});
  maj();
}

/* ---------- Exercices de la séance ---------- */
function exercices(s, devoirId, API, r) {
  const devoirs = M.devoirsDe(s);
  const seulement = r.query.revoir === "1";
  const d = devoirs.find(x => x.devoir === devoirId) || devoirs[0];
  const items = devoirs.filter(x => !seulement || T.evaluations(x).some(v => v === false)).map(x => {
    const ev = T.evaluations(x), arevoir = ev.filter(v => v === false).length;
    return `<a class="devoir${x === d ? " courant" : ""}" href="${API.lien("diapos", s.cle, "exercices", x.devoir)}${seulement ? "?revoir=1" : ""}" data-remplacer>
<b>${inl(x.titre)}</b><span class="etiquettes">${M.etiquettesDevoir(x).map(t => `<i>${esc(t)}</i>`).join("")}</span><small>Réussi ${ev.filter(v => v === true).length} / ${ev.length}${arevoir ? ` · À revoir ${arevoir}` : ""}</small></a>`;
  }).join("");
  const ctx = { dossier: "exercices", devoir: d.devoir, evaluation: id => E.autoevaluation(id) };
  return `<div class="exercices-seance"><aside class="liste-devoirs"><label class="case"><input type="checkbox" data-revoir${seulement ? " checked" : ""}> À revoir seulement</label>${items || `<p class="attenue petit">Aucun devoir à revoir.</p>`}</aside>
<article class="devoir-courant"><h2 class="titre-devoir">${inl(d.titre)}</h2>${d.sujet.blocs.map(b => blocExercice(b, ctx)).join("")}</article></div>`;
}

export default async function diapos(r, API) {
  const [cle, quoi, x] = r.segments;
  const s = (cle && M.trouver(cle)) || seanceParDefaut();
  E.retenirPosition("diapos.seance", s.cle);
  const routeSeance = t => API.lien("diapos", t.cle);
  const tete = entete({ surtitre: "DIAPOSITIVES DES SÉANCES EXPLIQUÉES · 04", titre: "Chaque diapo du cours, expliquée" });
  let html = tete + `<div class="barre-seance">${selecteurSeance(C.seances, s, routeSeance, { detail })}</div>`;
  const base = { ecran: "diapos", titreDocument: "Diapositives" };
  const apresCommun = main => lierSelecteurs(main, API);

  if (s.estExamen) {
    html += `<div class="carte message-liens"><p>Les diapos de l'examen sont celles des séances couvertes :</p>${M.couvertes(s).map(c => `<a class="bouton secondaire" href="${API.lien("diapos", c.cle)}">${esc(`${M.dateCourteSeance(c)} · ${c.titre}`)}</a>`).join("")}</div>`;
    return { ...base, html, apres: apresCommun };
  }
  const jeux = M.jeuxDe(s), devoirs = M.devoirsDe(s), tutoriel = s.devoirs.includes(M.DEVOIR_TUTORIEL);
  if (!jeux.length && !devoirs.length && !tutoriel) {
    html += `<div class="carte message"><div class="tuile-message">${ico("diapo")}</div><div>${esc(s.renvoi || "Pas de diapos pour cette séance.")}</div></div>`;
    return { ...base, html, apres: apresCommun };
  }
  const memoJeu = E.position("diapos.jeu." + s.cle);
  const onglet = quoi === "exercices" || quoi === "tutoriel" ? quoi : (jeux.find(j => j.nom === quoi) || jeux.find(j => j.nom === memoJeu) || jeux[0] || {}).nom || (devoirs.length ? "exercices" : "tutoriel");
  const jeu = M.jeu(onglet);
  const totalVues = jeux.reduce((t, j) => t + T.vuesDuJeu(j), 0), total = jeux.reduce((t, j) => t + j.count, 0);
  const puces = [...jeux.map(j => `<a class="puce${j === jeu ? " actif" : ""}" href="${API.lien("diapos", s.cle, j.nom)}" data-remplacer>${esc(`${j.libelle} · ${j.count} diapo${S(j.count)}`)}</a>`),
    ...(devoirs.length ? [`<a class="puce${onglet === "exercices" ? " actif" : ""}" href="${API.lien("diapos", s.cle, "exercices")}" data-remplacer>Exercices de la séance · ${devoirs.length} devoir${S(devoirs.length)}</a>`]
      : tutoriel ? [`<a class="puce${onglet === "tutoriel" ? " actif" : ""}" href="${API.lien("diapos", s.cle, "tutoriel")}" data-remplacer>Exercices de la séance · tutoriel R</a>`] : [])];
  html += `<div class="onglets-diapos"><div class="puces">${puces.join("")}</div>${total ? `<span class="attenue petit vus">Tu as vu ${totalVues} diapo${S(totalVues)} sur ${total}</span>` : ""}</div>`;

  if (onglet === "tutoriel") {
    html += `<div class="carte message-liens"><p>Les exercices de cette séance sont ceux du tutoriel R de l'écran 06.</p><a class="bouton" href="#/coder-r">Ouvrir le tutoriel R</a></div>`;
    return { ...base, html, apres: apresCommun };
  }
  if (onglet === "exercices") {
    const d = devoirs.find(v => v.devoir === x) || devoirs[0];
    if (x && d) E.noter("devoir", E.cible("diapos", { seance: s.cle, onglet: "exercices", devoir: d.devoir }), `Devoir · ${d.titre}`);
    html += exercices(s, d.devoir, API, r);
    return {
      ...base, onglet: "exercices", html,
      apres(main) {
        apresCommun(main);
        const c = main.querySelector("[data-revoir]");
        if (c) c.addEventListener("change", () => API.naviguer(API.lien("diapos", s.cle, "exercices", d.devoir) + (c.checked ? "?revoir=1" : ""), { remplacer: true }));
        main.addEventListener("click", ev => {
          const b = ev.target.closest("[data-action='autoeval']"); if (!b) return;
          const id = b.getAttribute("data-id"), val = b.getAttribute("data-val") === "1";
          E.autoevaluer(id, E.autoevaluation(id) === val ? null : val);
          API.rendre({ garder: true });
        });
      },
    };
  }

  // Visionneuse
  E.retenirPosition("diapos.jeu." + s.cle, jeu.nom);
  const n = Math.max(1, Math.min(jeu.count, +x || E.position("diapos.n." + jeu.nom) || 1));
  E.retenirPosition("diapos.n." + jeu.nom, n);
  const pages = jeu.decoupage.diapos[n - 1].pages;
  const e = Math.max(0, Math.min(pages.length - 1, r.query.e != null ? +r.query.e - 1 : pages.length - 1 === 0 ? 0 : 0));
  const indicateur = pages.length > 1 ? `Diapo ${n} / ${jeu.count} · étape ${e + 1} sur ${pages.length}` : `Diapo ${n} / ${jeu.count}`;
  const routeDiapo = (k, etape) => API.lien("diapos", s.cle, jeu.nom, k) + (etape ? `?e=${etape}` : "");
  const prec = e > 0 ? routeDiapo(n, e) : n > 1 ? routeDiapo(n - 1, jeu.decoupage.diapos[n - 2].pages.length > 1 ? jeu.decoupage.diapos[n - 2].pages.length : null) : null;
  const suiv = e + 1 < pages.length ? routeDiapo(n, e + 2) : n < jeu.count ? routeDiapo(n + 1) : null;
  const debut = Math.max(0, Math.min(n - 3, jeu.count - 5));
  const miniatures = Array.from({ length: Math.min(5, jeu.count) }, (_, i) => debut + i + 1);
  const plan = jeu.explications.diapos.filter(d => d.type === "section" && d.n <= jeu.count).sort((a, b) => a.n - b.n);
  const vue = E.estVue(jeu.id(n));
  const d = jeu.diapo(n);
  html += `<div class="visionneuse">
<div class="colonne-diapo"><div class="cadre-diapo"><img class="page-diapo" alt="Page d'origine de la diapo ${n}" data-contenu="${esc(jeu.image(pages[e]))}"><button class="plein-coin" data-plein aria-label="Plein écran">${ico("agrandir", 2.2)}</button>${vue ? `<span class="pastille-vue" title="Diapo vue">${ico("coche", 3)}</span>` : ""}</div>
${pages.length > 1 ? `<div class="etapes-diapo"><span class="attenue petit">Étapes :</span>${pages.map((_, k) => `<a class="puce${k === e ? " actif" : ""}" href="${routeDiapo(n, k + 1)}" data-remplacer>${k + 1}</a>`).join("")}</div>` : ""}
<div class="barre-suite"><a class="bouton secondaire${prec ? "" : " desactive"}" ${prec ? `href="${prec}" data-remplacer data-sens="-1"` : 'aria-disabled="true"'}>${ico("gauche", 2)}<span class="lib-long">Précédente</span></a>
<div class="position">${esc(indicateur)}</div><a class="bouton${suiv ? "" : " desactive"}" ${suiv ? `href="${suiv}" data-remplacer data-sens="1"` : 'aria-disabled="true"'}><span class="lib-long">Suivante</span>${ico("droite", 2)}</a></div>
<div class="miniatures">${miniatures.map(k => `<a class="miniature${k === n ? " courante" : ""}" href="${routeDiapo(k)}" data-remplacer aria-label="Diapo ${k}"><img alt="" data-contenu="${esc(jeu.image(jeu.decoupage.diapos[k - 1].pages.slice(-1)[0]))}"><span>${k}</span></a>`).join("")}</div>
<div class="outils-diapo"><label class="aller-a"><span class="attenue petit">Aller à :</span><select class="champ" data-aller><option value="">Choisir…</option>${plan.map(p => `<option value="${p.n}">${esc(`${p.n} · ${p.titre}`)}</option>`).join("")}<option value="${jeu.count}">Synthèse de la présentation</option></select></label>
<button class="bouton secondaire" data-plein>${ico("agrandir", 2)}Plein écran</button></div></div>
<aside class="colonne-expl" id="explications">${explications(d, n, n === jeu.count ? jeu.explications.synthese : null)}</aside></div>`;

  let minuterie = null;
  return {
    ...base, html,
    suite: { prec, suiv },
    clavier(ev) {
      if (ev.key === "f" || ev.key === "F") { pleinEcran(jeu, { n, e }, (k, et) => API.naviguer(routeDiapo(k, et ? et + 1 : null), { remplacer: true })); return true; }
      if (ev.shiftKey && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) {
        const k = n + (ev.key === "ArrowRight" ? 1 : -1);
        if (k >= 1 && k <= jeu.count) API.naviguer(routeDiapo(k), { remplacer: true, sens: k > n ? 1 : -1 });
        return true;
      }
      if (ev.key === "Home") { API.naviguer(routeDiapo(1), { remplacer: true }); return true; }
      if (ev.key === "End") { API.naviguer(routeDiapo(jeu.count), { remplacer: true }); return true; }
      return false;
    },
    apres(main) {
      apresCommun(main);
      for (const b of main.querySelectorAll("[data-plein]")) b.addEventListener("click", () => pleinEcran(jeu, { n, e }, (k, et) => API.naviguer(routeDiapo(k, et ? et + 1 : null), { remplacer: true })));
      const sel = main.querySelector("[data-aller]");
      sel.addEventListener("change", () => { if (sel.value) API.naviguer(routeDiapo(+sel.value), { remplacer: true }); });
      // Précharge la page suivante.
      const prochaine = e + 1 < pages.length ? pages[e + 1] : n < jeu.count ? jeu.decoupage.diapos[n].pages[0] : null;
      if (prochaine) setTimeout(() => Contenu.url(jeu.image(prochaine)), 300);
      // Une diapo affichée 3 secondes est vue.
      minuterie = setTimeout(() => {
        if (!main.isConnected) return;
        E.grouper(() => {
          E.marquerVue(jeu.id(n));
          E.noter("diapo", E.cible("diapos", { seance: s.cle, jeu: jeu.nom, diapo: n }), `${jeu.libelle} · diapo ${n}`);
        });
        const c = main.querySelector(".cadre-diapo");
        if (c && !c.querySelector(".pastille-vue")) c.insertAdjacentHTML("beforeend", `<span class="pastille-vue apparait" title="Diapo vue">${ico("coche", 3)}</span>`);
        const v = main.querySelector(".vus"); if (v) { const tv = jeux.reduce((t, j) => t + T.vuesDuJeu(j), 0); v.textContent = `Tu as vu ${tv} diapo${S(tv)} sur ${total}`; }
      }, 3000);
    },
    quitter() { clearTimeout(minuterie); },
  };
}
