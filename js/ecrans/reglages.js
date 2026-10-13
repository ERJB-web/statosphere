/* 07 · Réglages : thème, données de l'élève (exporter, importer, effacer), cours hors ligne, mot de passe sur cet appareil, à propos. */
import * as E from "../etat.js";
import * as Contenu from "../contenu.js";
import { ico } from "../icones.js";
import { entete } from "../ui.js";
import { esc, jour } from "../outils.js";
import { verrouiller, preparerHorsLigne } from "../app.js";

const THEMES = [["clair", "Clair"], ["sombre", "Sombre"], ["systeme", "Comme le système"]];
const mo = n => `${(n / 1048576).toLocaleString("fr-CA", { maximumFractionDigits: n >= 10485760 ? 0 : 1 })} Mo`;
let message = "";

export default async function reglages(r, API) {
  const theme = E.REGLAGES.theme || "systeme";
  const infos = Contenu.infos();
  const version = infos && infos.version ? infos.version : "";
  const html = `${entete({ surtitre: "RÉGLAGES · 07", titre: "Règle Statosphère à ta façon" })}
<div class="reglages">
<section class="carte reglage"><div class="etiquette-section">APPARENCE</div>
  <div class="ligne-reglage"><div><b>Thème</b></div><div class="segments" role="group" aria-label="Thème">${THEMES.map(([v, l]) => `<button class="segment" data-theme-choix="${v}" aria-pressed="${v === theme}">${l}</button>`).join("")}</div></div>
</section>
<section class="carte reglage"><div class="etiquette-section">HORS LIGNE</div>
  <div class="ligne-reglage"><div><b>Le cours sur cet appareil</b><p class="attenue petit" data-etat-hl>…</p></div><button class="bouton secondaire" data-preparer>${ico("telecharger", 2)}Tout préparer</button></div>
</section>
<section class="carte reglage"><div class="etiquette-section">TES DONNÉES</div>
  <p class="attenue">Tout reste sur cet appareil. Aucun texte tapé n'est enregistré.</p>
  <div class="rangee"><button class="bouton" data-exporter>${ico("telecharger", 2)}Exporter mes données</button><label class="bouton secondaire">${ico("maj", 2)}Importer des données<input type="file" accept="application/json,.json" data-importer hidden></label><button class="bouton secondaire" data-effacer>${ico("poubelle", 2)}Tout effacer</button></div>
  ${message ? `<p class="message-reglage">${esc(message)}</p>` : ""}
</section>
<section class="carte reglage"><div class="etiquette-section">MOT DE PASSE DU COURS</div>
  <div class="ligne-reglage"><div><b>Retenu sur cet appareil</b><p class="attenue petit">Le cours s'ouvre sans le redemander. Pour le retirer de cet appareil, verrouille le cours : il faudra retaper le mot de passe.</p></div><button class="bouton secondaire" data-verrouiller>${ico("cadenas", 2)}Verrouiller</button></div>
</section>
<section class="carte reglage"><div class="etiquette-section">À PROPOS</div>
  <div class="a-propos"><b>Statosphère${version ? " " + esc(version) : ""}</b></div>
</section>
</div>`;
  return {
    ecran: "reglages", titreDocument: "Réglages", html,
    apres(main) {
      for (const b of main.querySelectorAll("[data-theme-choix]")) b.addEventListener("click", () => { E.REGLAGES.theme = b.getAttribute("data-theme-choix"); E.sauverReglages(); API.appliquerTheme(); API.rendre({ garder: true }); });
      const etat = main.querySelector("[data-etat-hl]");
      (async () => {
        const e = await Contenu.etatHorsLigne();
        let t = !e.total ? "Ce navigateur ne garde pas le cours hors ligne." : !e.manquants.length ? `Tout le cours est prêt hors ligne (${mo(e.total)}).` : `${Math.floor((e.fait / e.total) * 100)} % du cours est prêt hors ligne (${mo(e.fait)} sur ${mo(e.total)}).`;
        try { if (navigator.storage && navigator.storage.persisted && await navigator.storage.persisted()) t += " Gardé durablement."; } catch (x) { /* rien */ }
        if (etat) etat.textContent = t;
      })();
      main.querySelector("[data-preparer]").addEventListener("click", async () => {
        try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (x) { /* rien */ }
        preparerHorsLigne(true);
      });
      main.querySelector("[data-exporter]").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(E.exporter(), null, 1)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = `Statosphère - mes données - ${jour()}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        message = `Données exportées : ${a.download}.`; API.rendre({ garder: true });
      });
      main.querySelector("[data-importer]").addEventListener("change", async ev => {
        const f = ev.target.files && ev.target.files[0]; if (!f) return;
        let donnees;
        try { donnees = JSON.parse(await f.text()); if (!donnees || !donnees.progression) throw new Error("format"); }
        catch (x) { message = "Ce fichier n'est pas un export de Statosphère."; API.rendre({ garder: true }); return; }
        if (!confirm("Tes données actuelles seront remplacées par celles de ce fichier. Statosphère se rouvrira ensuite.\n\nContinuer ?")) return;
        E.importer(donnees); message = ""; location.reload();
      });
      main.querySelector("[data-effacer]").addEventListener("click", () => {
        if (!confirm("Tout ton avancement sur cet appareil sera effacé : QCM, cartes, plan de révision, jeux et tutoriel.\n\nContinuer ?")) return;
        E.effacerTout(); location.reload();
      });
      main.querySelector("[data-verrouiller]").addEventListener("click", () => {
        if (!confirm("Le mot de passe du cours sera retiré de cet appareil. Ton avancement reste.\n\nVerrouiller ?")) return;
        verrouiller();
      });
    },
    quitter() { message = ""; },
  };
}
