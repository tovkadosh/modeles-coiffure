/**
 * Prépare la tête sculptée utilisée par la vue 3D.
 *
 * Source : « Infinite, 3D Head Scan » de Lee Perry-Smith (Creative Commons
 * Attribution 3.0, voir assets/tete/LICENCE.txt), tel que fourni dans les
 * exemples de three.js.
 *
 * Le script lit assets/tete/tete-source.glb et écrit src/lib/teteScan.ts :
 *  - le maillage, recentré et mis à l'échelle sur le repère de l'app
 *    (crâne centré sur l'origine, demi-largeur du crâne = 0.95, visage vers +z) ;
 *  - une carte des rayons : pour chaque direction (phi, theta) partant du centre
 *    du crâne, la distance jusqu'à la peau. C'est elle qui permet de poser les
 *    tresses exactement sur le crâne.
 *
 * À relancer seulement si la tête source change :  node scripts/preparer-tete.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RACINE = new URL('..', import.meta.url).pathname;
const glb = readFileSync(RACINE + 'assets/tete/tete-source.glb');

// --- Lecture du GLB (un seul maillage, une seule primitive) ---
const longJson = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + longJson).toString('utf8'));
const debutBin = 20 + longJson + 8;
const bin = glb.subarray(debutBin);
function accesseur(i) {
  const a = json.accessors[i];
  const vue = json.bufferViews[a.bufferView];
  const debut = (vue.byteOffset ?? 0) + (a.byteOffset ?? 0);
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3 }[a.type];
  const Type = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType];
  const copie = Buffer.from(bin.subarray(debut, debut + a.count * n * Type.BYTES_PER_ELEMENT));
  return new Type(copie.buffer, copie.byteOffset, a.count * n);
}
const prim = json.meshes[0].primitives[0];
const pos = accesseur(prim.attributes.POSITION);
const nor = accesseur(prim.attributes.NORMAL);
const idx = accesseur(prim.indices);

// --- Mise dans le repère de l'app ---
// Mesures faites sur la tête source : milieu du visage x = -0.075, sommet y = 4.05,
// crâne de demi-largeur 1.6 et de demi-profondeur 2.1 autour de y = 2.0.
const CENTRE = [-0.075, 2.0, 0.08];
const ECHELLE = 0.95 / 1.6;
const n = pos.length / 3;
const P = new Float32Array(pos.length);
for (let i = 0; i < n; i++) {
  for (let k = 0; k < 3; k++) P[i * 3 + k] = (pos[i * 3 + k] - CENTRE[k]) * ECHELLE;
}

// --- Carte des rayons, par lancer de rayons depuis le centre du crâne ---
// Les directions suivent l'ellipsoïde du crâne (mêmes A, B, H que tete3d.ts).
const A = 0.95, B = 1.25, H = 1.22;
const NPHI = 97, NTHETA = 192;
const tri = idx.length / 3;
// Boîtes englobantes des triangles, pour aller plus vite.
function rayon(dx, dy, dz) {
  let loin = -1;
  for (let t = 0; t < tri; t++) {
    const a = idx[t * 3] * 3, b = idx[t * 3 + 1] * 3, c = idx[t * 3 + 2] * 3;
    const e1x = P[b] - P[a], e1y = P[b + 1] - P[a + 1], e1z = P[b + 2] - P[a + 2];
    const e2x = P[c] - P[a], e2y = P[c + 1] - P[a + 1], e2z = P[c + 2] - P[a + 2];
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (Math.abs(det) < 1e-12) continue;
    const inv = 1 / det;
    const tx = -P[a], ty = -P[a + 1], tz = -P[a + 2];
    const u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * inv;
    if (v < 0 || u + v > 1) continue;
    const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
    if (d > loin) loin = d;
  }
  return loin;
}
const carte = new Float32Array(NPHI * NTHETA);
const t0 = Date.now();
for (let i = 0; i < NPHI; i++) {
  const phi = (i / (NPHI - 1)) * Math.PI;
  for (let j = 0; j < NTHETA; j++) {
    const theta = (j / NTHETA) * 2 * Math.PI - Math.PI;
    let dx = A * Math.sin(phi) * Math.sin(theta), dy = H * Math.cos(phi), dz = B * Math.sin(phi) * Math.cos(theta);
    const l = Math.hypot(dx, dy, dz);
    dx /= l; dy /= l; dz /= l;
    carte[i * NTHETA + j] = rayon(dx, dy, dz);
  }
}
// Les directions sans peau (sous les épaules) reprennent la valeur voisine.
for (let i = 0; i < NPHI; i++) {
  for (let j = 0; j < NTHETA; j++) {
    if (carte[i * NTHETA + j] > 0) continue;
    carte[i * NTHETA + j] = i > 0 ? carte[(i - 1) * NTHETA + j] : 1;
  }
}
console.log(`Carte des rayons : ${NPHI}×${NTHETA} en ${((Date.now() - t0) / 1000).toFixed(1)} s`);

// --- Écriture compacte (entiers 16 bits en base64) ---
let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], P[i * 3 + k]); max[k] = Math.max(max[k], P[i * 3 + k]); }
const q = new Uint16Array(P.length);
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) q[i * 3 + k] = Math.round(((P[i * 3 + k] - min[k]) / (max[k] - min[k])) * 65535);
const qn = new Int8Array(nor.length);
for (let i = 0; i < nor.length; i++) qn[i] = Math.round(nor[i] * 127);
let rmax = 0;
for (const r of carte) rmax = Math.max(rmax, r);
const qr = new Uint16Array(carte.length);
for (let i = 0; i < carte.length; i++) qr[i] = Math.round((carte[i] / rmax) * 65535);
const b64 = (t) => Buffer.from(t.buffer, t.byteOffset, t.byteLength).toString('base64');

const sortie = `/* Fichier généré par scripts/preparer-tete.mjs : ne pas modifier à la main. */
/* Tête : « Infinite, 3D Head Scan » de Lee Perry-Smith, licence CC BY 3.0 (voir assets/tete/LICENCE.txt). */

export const SCAN = {
  sommets: ${n},
  min: [${min.map((v) => v.toFixed(5)).join(', ')}],
  max: [${max.map((v) => v.toFixed(5)).join(', ')}],
  /** Positions, entiers 16 bits normalisés entre min et max. */
  positions: '${b64(q)}',
  /** Normales, entiers 8 bits signés. */
  normales: '${b64(qn)}',
  /** Triangles, indices 16 bits. */
  indices: '${b64(idx)}',
  carte: {
    nPhi: ${NPHI},
    nTheta: ${NTHETA},
    rayonMax: ${rmax.toFixed(5)},
    /** Distance du centre du crâne à la peau, entiers 16 bits normalisés sur rayonMax. */
    rayons: '${b64(qr)}',
  },
};
`;
writeFileSync(RACINE + 'src/lib/teteScan.ts', sortie);
console.log(`src/lib/teteScan.ts écrit (${(sortie.length / 1024).toFixed(0)} Ko), ${n} sommets, ${tri} triangles.`);
