/* Dessins vectoriels repris de la version Windows : le logo de Statosphère (Theme/Logo.xaml) et le professeur Sigma
   (Theme/ProfesseurSigma.xaml et ProfesseurSigmaClignement.xaml), convertis en SVG trait pour trait. */
let compteur = 0;
function uid(prefixe) { compteur += 1; return prefixe + compteur.toString(36); }

/** Logo de Statosphère (boîte 64 × 64) : tuile encre, étoile, anneau d'orbite, sphère bleue à trois barres en cloche, satellite. */
export function logo(classe = "logo", options = {}) {
  const a = uid("la"), b = uid("lb");
  const anneau = (trait, epaisseur) =>
    `<ellipse cx="32" cy="34" rx="27" ry="8.5" transform="rotate(-18 32 34)" fill="none" stroke="${trait}" stroke-width="${epaisseur}"/>`;
  return `<svg class="${classe}" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
<defs><clipPath id="${a}"><rect x="0" y="0" width="64" height="34"/></clipPath><clipPath id="${b}"><rect x="0" y="34" width="64" height="30"/></clipPath></defs>
${options.carre ? `<rect width="64" height="64" fill="#102A3A"/>` : `<rect width="64" height="64" rx="14" ry="14" fill="#102A3A"/>`}
<path d="M14,10.5 Q14.6,13.9 18,14.5 Q14.6,15.1 14,18.5 Q13.4,15.1 10,14.5 Q13.4,13.9 14,10.5 Z" fill="#9FE0D7"/>
<g clip-path="url(#${a})">${anneau("#16A6A1", 4)}</g>
<circle cx="32" cy="34" r="17" fill="#0A6FB8"/>
<g fill="#FFFFFF"><rect x="22" y="30" width="5" height="7" rx="1"/><rect x="28" y="22" width="5" height="15" rx="1"/><rect x="34" y="27" width="5" height="10" rx="1"/></g>
<g clip-path="url(#${b})">${anneau("#102A3A", 6.8)}${anneau("#16A6A1", 4)}</g>
<circle cx="54.5" cy="31.8" r="5.6" fill="#5BAE3F" stroke="#102A3A" stroke-width="2"/>
</svg>`;
}

const CRINIERE = "M26,44 A22,19 0 1 1 70,44 A22,19 0 1 1 26,44 Z M35.2,69.8 C28.7,75.3 20.8,73.8 18.2,74 Q15.5,74.6 16.6,72 C18,69.9 22.3,67.6 28.8,62.2 A5,5 0 0 1 35.2,69.8 Z M29.6,64.3 C17.4,67.3 8,60.3 4,59.2 Q1.1,58.5 3.3,56.5 C7.1,54.6 14.3,54.7 26.4,51.7 A6.5,6.5 0 0 1 29.6,64.3 Z M26.4,55 C15.9,53.9 10.3,47.3 7.6,45.3 Q5.3,43.7 7.9,42.7 C11.3,42.1 17.2,41.9 27.6,43 A6,6 0 0 1 26.4,55 Z M26.1,50.2 C13.2,46.3 8.1,35.2 4.9,32.1 Q2.7,30 5.7,29.4 C10.3,29.8 17,33.8 29.9,37.8 A6.5,6.5 0 0 1 26.1,50.2 Z M27.1,40.6 C18.7,33.5 18,24.1 16.9,20.8 Q15.8,18 18.7,18.6 C21.9,20.1 26.4,24.3 34.9,31.4 A6,6 0 0 1 27.1,40.6 Z M29.5,34.4 C22.9,23.8 27.5,12.1 27.2,8 Q27,5 29.6,6.5 C32.6,9.5 33.9,17 40.5,27.6 A6.5,6.5 0 0 1 29.5,34.4 Z M35.2,29.5 C32.9,20.2 32.4,14.5 33.5,11.6 Q34.2,8.9 36,11 C37.6,13.6 44.5,17.3 46.8,26.5 A6,6 0 0 1 35.2,29.5 Z M39.5,27.5 C38.6,14 36.2,6 37.8,1.9 Q39,-0.8 40.6,1.7 C41.9,6.2 51.5,13.1 52.5,26.5 A6.5,6.5 0 0 1 39.5,27.5 Z M47.8,25.2 C50.9,14.2 60.7,9.8 63.4,7.2 Q65.5,5.1 66.1,8 C66,11.8 63.4,17.7 60.2,28.8 A6.5,6.5 0 0 1 47.8,25.2 Z M54.6,25.4 C61.9,14.6 73.8,13.2 77.6,11.2 Q80.2,9.8 79.9,12.7 C78.3,16.9 72.7,21.9 65.4,32.6 A6.5,6.5 0 0 1 54.6,25.4 Z M61.6,29 C70.3,23.2 74.9,18.6 78.2,18.6 Q81.2,18.2 79.8,20.9 C77.6,23.4 77.1,33.1 68.4,39 A6,6 0 0 1 61.6,29 Z M66.3,34.7 C79.4,31.2 86.4,26.4 90.8,27.2 Q93.7,27.9 91.5,29.9 C87.4,32 82.7,43.8 69.7,47.3 A6.5,6.5 0 0 1 66.3,34.7 Z M68.8,43 C78.8,42.7 84.8,42.3 87.5,44 Q90.1,45.3 87.6,46.6 C84.6,47.7 79.2,54.6 69.2,55 A6,6 0 0 1 68.8,43 Z M69.4,48.6 C81.6,51.2 89.5,50 92.6,52.7 Q94.9,54.6 92,55.4 C87.8,55.5 78.9,64 66.6,61.4 A6.5,6.5 0 0 1 69.4,48.6 Z M67.1,60.1 C73.8,65.3 78.9,67 79.6,69.5 Q80.8,72 78,71.5 C75.6,70.6 67.6,73.2 60.9,67.9 A5,5 0 0 1 67.1,60.1 Z";
const BOUCLE = "M48,31.5 C47,27.5 49.5,24.5 52.5,25.2 C55,25.8 54.6,28.8 52.6,28.8";
const SOURCILS = "M32.5,47.5 Q33,43 37,42.5 Q38,40 41,41.2 Q43.5,40 45.5,42.5 Q46.8,44.5 45.6,46 Q41,44.6 36.5,46.3 Q34,47 32.5,47.5 Z M63.5,47.5 Q63,43 59,42.5 Q58,40 55,41.2 Q52.5,40 50.5,42.5 Q49.2,44.5 50.4,46 Q55,44.6 59.5,46.3 Q62,47 63.5,47.5 Z";
const TRAIT = "#6F8597", MECHE = "#B6C6D4", CONTOUR_PEAU = "#B9785A", RIDE = "#D89C7C", OEIL = "#1E2A38";
const JOUE = "rgba(255,127,120,0.4)", JOUE_VIVE = "rgba(255,127,120,0.6)", BOUCHE = "#7A2E2E", LANGUE = "#E8787A";
const rond = 'stroke-linecap="round"', joint = 'stroke-linejoin="round"';

/**
 * Tête du professeur Sigma en médaillon (boîte 96 × 96). Expressions : « normal » (bienveillant), « content », « reflechit ».
 * Avec anime, les paupières se ferment de temps en temps (clignement).
 */
export function tete(expression = "normal", options = {}) {
  const id = uid("s");
  const g = n => `${n}${id}`;
  const u = n => `url(#${g(n)})`;
  const defs = `<defs>
<radialGradient id="${g("ciel")}" gradientUnits="userSpaceOnUse" cx="40" cy="36" r="58" fx="36" fy="30"><stop offset="0" stop-color="#2A6B93"/><stop offset=".55" stop-color="#16405C"/><stop offset="1" stop-color="#0E2536"/></radialGradient>
<radialGradient id="${g("peau")}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" fx="-0.125" fy="-0.2" gradientTransform="translate(47 52) scale(24 30)"><stop offset="0" stop-color="#FFE7D4"/><stop offset=".6" stop-color="#FAD0B0"/><stop offset="1" stop-color="#EDB08A"/></radialGradient>
<radialGradient id="${g("cheveux")}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" fx="-0.0417" fy="-0.25" gradientTransform="translate(48 40) scale(48 40)"><stop offset=".4" stop-color="#FFFFFF"/><stop offset=".72" stop-color="#EEF3F7"/><stop offset="1" stop-color="#D2DEE8"/></radialGradient>
<linearGradient id="${g("poils")}" gradientUnits="userSpaceOnUse" x1="0" y1="61" x2="0" y2="75"><stop offset=".3" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DAE4EC"/></linearGradient>
<radialGradient id="${g("nez")}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" fx="-0.25" fy="-0.37" gradientTransform="translate(48 59.5) scale(6 5.4)"><stop offset="0" stop-color="#FBC3A8"/><stop offset="1" stop-color="#E9937A"/></radialGradient>
<linearGradient id="${g("veste")}" gradientUnits="userSpaceOnUse" x1="48" y1="78" x2="48" y2="96"><stop offset="0" stop-color="#1FB5AF"/><stop offset="1" stop-color="#0E7C78"/></linearGradient>
<radialGradient id="${g("or")}" gradientUnits="userSpaceOnUse" cx="58.6" cy="85.6" r="3.9" fx="57.4" fy="84.4"><stop offset="0" stop-color="#FFE27A"/><stop offset="1" stop-color="#E7A900"/></radialGradient>
<clipPath id="${g("rond")}"><circle cx="48" cy="51" r="42"/></clipPath>
</defs>`;

  const buste = `<circle cx="48" cy="51" r="42" fill="${u("ciel")}"/>
<g clip-path="${u("rond")}">
<path fill-rule="evenodd" d="M4,98 C6,87 20,80.5 34,79 L48,96 L62,79 C76,80.5 90,87 92,98 Z" fill="${u("veste")}"/>
<path d="M34,79 C38,77.4 43.5,77 48,77 C52.5,77 58,77.4 62,79 L48,97 Z" fill="#FFFFFF"/>
<ellipse cx="48" cy="80.6" rx="10" ry="2.6" fill="rgba(16,42,58,0.15)"/>
<path fill-rule="evenodd" d="M33.5,79.2 L46.5,95.5 L41,97 L27.5,84.5 Z M62.5,79.2 L49.5,95.5 L55,97 L68.5,84.5 Z" fill="#0B6461"/>
<path fill-rule="evenodd" d="M36.5,78.2 L48,83.2 L43.4,88.6 Z M59.5,78.2 L48,83.2 L52.6,88.6 Z" fill="#FFFFFF" stroke="${MECHE}" stroke-width="0.8" ${joint}/>
<path fill-rule="evenodd" d="M48,84.6 L43,81.6 Q42.2,84.6 43.1,87.8 Z M48,84.6 L53,81.6 Q53.8,84.6 52.9,87.8 Z" fill="#E07A22" stroke="#A95A12" stroke-width="0.9" ${joint}/>
<ellipse cx="48" cy="84.6" rx="1.6" ry="1.8" fill="#A95A12"/>
<circle cx="58.6" cy="85.6" r="3.9" fill="${u("or")}" stroke="#B88400" stroke-width="0.9"/>
<path d="M57.9,85.15 A1.5,1.5 0 1 0 57.95,85.15 M57.9,85.15 L60.5,85.15" fill="none" stroke="#102A3A" stroke-width="1.05" ${rond}/>
</g>
<circle cx="48" cy="51" r="42" fill="none" stroke="#16A6A1" stroke-width="2.6"/>`;

  const teteCalque = `<path d="${CRINIERE}" fill="${u("cheveux")}" stroke="${TRAIT}" stroke-width="2.6" ${joint}/>
<path d="${CRINIERE}" fill="${u("cheveux")}"/>
<path d="M27.9,69.1 Q23.4,71 19.9,72.8 M20.6,59.5 Q13.3,59.1 7.7,59.1 M20.3,41.3 Q13.7,37.1 8.5,34 M26.1,31.5 Q22.4,26.4 19.2,22.7 M31.3,24.5 Q29.6,17.2 28.3,11.6 M45.8,18.9 Q44.1,11.4 41.3,5.7 M56.2,20.5 Q59.7,14.8 62.2,10.2 M64.6,22.7 Q70.5,17.9 74.9,13.9 M70.4,30.7 Q74.8,26.7 77.5,22.5 M75.9,39.2 Q82.8,35.8 87.9,31.6 M75.3,56.9 Q82.4,56.9 88.4,55.3 M67.9,67.3 Q72.2,69.5 76.3,70.3" fill="none" stroke="${MECHE}" stroke-width="1.1" ${rond}/>
<g fill="${u("peau")}" stroke="${CONTOUR_PEAU}" stroke-width="1.3"><ellipse cx="28.4" cy="56" rx="4.4" ry="6.4"/><ellipse cx="67.6" cy="56" rx="4.4" ry="6.4"/></g>
<path d="M29.6,52.2 Q26.8,56 29.6,59.8 M66.4,52.2 Q69.2,56 66.4,59.8" fill="none" stroke="${RIDE}" stroke-width="1" ${rond}/>
<path d="M48,31 C59.5,31 67.5,39.5 68,51.5 C68.5,62 66.5,71 60.5,77 C56.5,80.5 52.5,82 48,82 C43.5,82 39.5,80.5 35.5,77 C29.5,71 27.5,62 28,51.5 C28.5,39.5 36.5,31 48,31 Z" fill="${u("peau")}" stroke="${CONTOUR_PEAU}" stroke-width="1.3"/>
<path d="${BOUCLE}" fill="none" stroke="${TRAIT}" stroke-width="3.4" ${rond} ${joint}/>
<path d="${BOUCLE}" fill="none" stroke="#FFFFFF" stroke-width="1.8" ${rond} ${joint}/>
<path d="M40.5,38.6 Q48,36.4 55.5,38.6 M42.8,41.6 Q48,40.2 53.2,41.6" fill="none" stroke="${RIDE}" stroke-width="1" ${rond}/>`;

  const sourcils = (dy = 0) => `<path fill-rule="evenodd" d="${SOURCILS}" fill="${u("cheveux")}" stroke="${TRAIT}" stroke-width="1.1" ${joint}${dy ? ` transform="translate(0 ${dy})"` : ""}/>`;
  const visages = {
    normal: `<g fill="${JOUE}"><ellipse cx="35" cy="61.5" rx="4.6" ry="3"/><ellipse cx="61" cy="61.5" rx="4.6" ry="3"/></g>
<g fill="${OEIL}"><ellipse cx="40" cy="51.5" rx="2.7" ry="3.3"/><ellipse cx="56" cy="51.5" rx="2.7" ry="3.3"/></g>
<g fill="#FFFFFF"><circle cx="41" cy="50.3" r="1"/><circle cx="57" cy="50.3" r="1"/></g>
<path fill-rule="evenodd" d="M36.5,53.6 Q40,51.4 43.5,53.6 L43.5,56.5 L36.5,56.5 Z M52.5,53.6 Q56,51.4 59.5,53.6 L59.5,56.5 L52.5,56.5 Z" fill="${u("peau")}"/>
<path d="M36.8,53.7 Q40,51.7 43.2,53.7 M52.8,53.7 Q56,51.7 59.2,53.7 M35.6,51.6 L34.3,51.1 M60.4,51.6 L61.7,51.1" fill="none" stroke="${CONTOUR_PEAU}" stroke-width="0.9" ${rond}/>
${sourcils()}
<path d="M43,73.2 Q48,78.8 53,73.2 Q48,74.8 43,73.2 Z" fill="${BOUCHE}"/>
<path d="M45.2,75.4 Q48,77.4 50.8,75.4 Q48,76.1 45.2,75.4 Z" fill="${LANGUE}"/>`,
    reflechit: `<g fill="${JOUE}"><ellipse cx="35" cy="62" rx="4.4" ry="2.8"/><ellipse cx="61" cy="62" rx="4.4" ry="2.8"/></g>
<g fill="#FFFFFF" stroke="${CONTOUR_PEAU}" stroke-width="0.9"><ellipse cx="40" cy="51.6" rx="3.5" ry="3.9"/><ellipse cx="56" cy="51.6" rx="3.5" ry="3.9"/></g>
<g fill="${OEIL}"><ellipse cx="41.4" cy="50" rx="2" ry="2.3"/><ellipse cx="57.4" cy="50" rx="2" ry="2.3"/></g>
<g fill="#FFFFFF"><circle cx="42" cy="49.2" r="0.7"/><circle cx="58" cy="49.2" r="0.7"/></g>
<path fill-rule="evenodd" d="M32.8,45.5 Q33,40.6 37,39.8 Q38.4,37.4 41.4,38.6 Q44,37.6 45.8,40.4 Q46.8,42.6 45.4,43.8 Q41,42.4 36.6,44.4 Q34.2,45.2 32.8,45.5 Z M63.2,46 Q62.6,43.2 59,43.4 Q57.6,41.6 55,42.8 Q52.2,42.4 50.6,44.6 Q49.8,46.6 51,47.6 Q55.4,46.4 59.6,47.6 Q61.8,47.8 63.2,46 Z" fill="${u("cheveux")}" stroke="${TRAIT}" stroke-width="1.1" ${joint}/>
<path d="M45.6,74.4 Q49,73.2 52.2,74.4 Q49,77.2 45.6,74.4 Z" fill="${BOUCHE}"/>`,
    content: `<g fill="${JOUE_VIVE}"><ellipse cx="35" cy="60.8" rx="5" ry="3.3"/><ellipse cx="61" cy="60.8" rx="5" ry="3.3"/></g>
<path d="M36.6,53 Q40,48.2 43.4,53 M52.6,53 Q56,48.2 59.4,53" fill="none" stroke="${OEIL}" stroke-width="2" ${rond}/>
<path d="M35.4,52.6 L34,53.4 M60.6,52.6 L62,53.4" fill="none" stroke="${CONTOUR_PEAU}" stroke-width="0.9" ${rond}/>
${sourcils(-2)}
<path d="M41.4,72.6 Q48,84 54.6,72.6 Q48,74.4 41.4,72.6 Z" fill="${BOUCHE}"/>
<path d="M44,77.4 Q48,81.4 52,77.4 Q48,75.8 44,77.4 Z" fill="${LANGUE}"/>`,
  };
  const moustache = `<path d="M48,63 C44.5,61.5 39,61.2 35.5,63.2 C32,65.2 30.4,69.6 31.2,74.6 C32.4,72.6 34.2,71.6 36.2,72 C37.6,70.6 39.8,70.6 41.2,71.6 C43,70 45.6,70 48,71.2 C50.4,70 53,70 54.8,71.6 C56.2,70.6 58.4,70.6 59.8,72 C61.8,71.6 63.6,72.6 64.8,74.6 C65.6,69.6 64,65.2 60.5,63.2 C57,61.2 51.5,61.5 48,63 Z" fill="${u("poils")}" stroke="${TRAIT}" stroke-width="1.3" ${joint}/>
<path d="M40,64.6 Q38,67 37.4,69.6 M44,64 Q43,67 42.6,69.6 M52,64 Q53,67 53.4,69.6 M56,64.6 Q58,67 58.6,69.6" fill="none" stroke="${MECHE}" stroke-width="0.9" ${rond}/>
<ellipse cx="48" cy="59.5" rx="5.4" ry="4.8" fill="${u("nez")}" stroke="#C46F55" stroke-width="1.1"/>
<ellipse cx="46.3" cy="57.6" rx="1.7" ry="1.1" fill="rgba(255,255,255,0.8)"/>
<path d="M44.6,79.4 Q48,80.8 51.4,79.4" fill="none" stroke="${RIDE}" stroke-width="0.9" ${rond}/>`;
  const main = `<g clip-path="${u("rond")}">
<path d="M19,98 L27.4,86.6 Q32.4,84 37.8,87.6 L33.4,98 Z" fill="${u("veste")}" stroke="#0B6461" stroke-width="1" ${joint}/>
<path d="M27,86.8 Q32.4,83.6 38.2,87.4 L37.2,89.4 Q32.2,86.4 26.2,88.6 Z" fill="#FFFFFF"/>
</g>
<path d="M39.4,82 Q41.6,79.8 43.9,77.3" fill="none" stroke="${CONTOUR_PEAU}" stroke-width="4.2" ${rond}/>
<path d="M39.4,82 Q41.6,79.8 43.9,77.3" fill="none" stroke="#FAD0B0" stroke-width="2.6" ${rond}/>
<path d="M30.2,85.4 C29.6,82 31.8,79.8 34.8,79.8 C37.2,79.8 39.6,80.4 41.2,81.2 C43,82.2 43.4,84.6 42.4,86.4 C41.2,88.6 38.4,89.6 35.4,89.2 C32.6,88.8 30.6,87.6 30.2,85.4 Z" fill="#FAD0B0" stroke="${CONTOUR_PEAU}" stroke-width="1.2" ${joint}/>
<path d="M36.4,81.8 Q39.4,81.4 41,83.6 M32.8,83.4 Q33.9,84.8 35.6,84.2 M33.8,85.8 Q35,87.1 36.8,86.5 M35.6,88 Q36.8,89 38.4,88.4" fill="none" stroke="${CONTOUR_PEAU}" stroke-width="0.9" ${rond}/>`;
  const etincelles = `<path d="M88,2.5 Q88.7,6.6 92.5,7.5 Q88.7,8.4 88,12.5 Q87.3,8.4 83.5,7.5 Q87.3,6.6 88,2.5 Z M9,8 Q9.5,10.9 12,11.5 Q9.5,12.1 9,15 Q8.5,12.1 6,11.5 Q8.5,10.9 9,8 Z" fill="#F2B705"/>`;
  const paupieres = expression === "content" ? "" : expression === "reflechit"
    ? `<g class="paupieres"><g fill="${u("peau")}"><ellipse cx="40" cy="51.6" rx="4.2" ry="4.5"/><ellipse cx="56" cy="51.6" rx="4.2" ry="4.5"/></g><path d="M36.3,52.2 Q40,54.8 43.7,52.2 M52.3,52.2 Q56,54.8 59.7,52.2" fill="none" stroke="${OEIL}" stroke-width="1.4" ${rond}/></g>`
    : `<g class="paupieres"><g fill="${u("peau")}"><ellipse cx="40" cy="51.2" rx="3.4" ry="3.7"/><ellipse cx="56" cy="51.2" rx="3.4" ry="3.7"/></g><path d="M36.7,52 Q40,54.4 43.3,52 M52.7,52 Q56,54.4 59.3,52" fill="none" stroke="${OEIL}" stroke-width="1.4" ${rond}/></g>`;
  const delai = options.anime ? ` style="--delai:${(Math.random() * 4).toFixed(2)}s"` : "";
  return `<svg class="tete${options.anime ? " anime" : ""}${options.classe ? " " + options.classe : ""}" viewBox="0 0 96 96" role="img" aria-label="Professeur Sigma"${delai}>${defs}${buste}${teteCalque}${visages[expression] || visages.normal}${moustache}${expression === "reflechit" ? main : ""}${expression === "content" ? etincelles : ""}${options.anime ? paupieres : ""}</svg>`;
}
