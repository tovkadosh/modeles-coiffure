import * as THREE from 'three';
import { TETE } from './geometrie';
import { SCAN } from './teteScan';
import { Pt } from './types';

/**
 * La tête en 3D : une vraie tête sculptée (scan libre de droits, voir
 * assets/tete/LICENCE.txt), préparée par scripts/preparer-tete.mjs.
 *
 * Pour poser les cheveux, on repère un point du crâne par deux angles depuis le
 * centre du crâne : `phi` (0 au sommet, π/2 à hauteur des sourcils) et `theta`
 * (0 devant). La carte des rayons donne, pour chaque direction, la distance
 * jusqu'à la peau : les tresses tombent donc exactement sur le crâne sculpté.
 */
export const A = 0.95; // demi-largeur du crâne (gauche-droite)
export const B = 1.25; // demi-profondeur du crâne (front-nuque)
export const H = 1.22; // hauteur du crâne au-dessus de son centre

// --- Décodage des données compactes ---------------------------------------

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALEUR = new Uint8Array(128);
for (let i = 0; i < ALPHABET.length; i++) VALEUR[ALPHABET.charCodeAt(i)] = i;

/** Base64 → octets, sans dépendre d'atob (absent de certains moteurs mobiles). */
function octets(b64: string): Uint8Array {
  const propre = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((propre.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < propre.length; i += 4) {
    const a = VALEUR[propre.charCodeAt(i)];
    const b = VALEUR[propre.charCodeAt(i + 1)];
    const c = i + 2 < propre.length ? VALEUR[propre.charCodeAt(i + 2)] : 0;
    const d = i + 3 < propre.length ? VALEUR[propre.charCodeAt(i + 3)] : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

const u16 = (b64: string) => {
  const o = octets(b64);
  return new Uint16Array(o.buffer, o.byteOffset, o.byteLength >> 1);
};

const { nPhi: NPHI, nTheta: NTHETA, rayonMax } = SCAN.carte;
const RAYONS = (() => {
  const q = u16(SCAN.carte.rayons);
  const r = new Float32Array(q.length);
  for (let i = 0; i < q.length; i++) r[i] = (q[i] / 65535) * rayonMax;
  return r;
})();

// --- La surface du crâne ---------------------------------------------------

/** La direction (normée) qui part du centre du crâne pour ces deux angles. */
function direction(phi: number, theta: number): THREE.Vector3 {
  const s = Math.sin(phi);
  return new THREE.Vector3(A * s * Math.sin(theta), H * Math.cos(phi), B * s * Math.cos(theta)).normalize();
}

/** Les deux angles qui correspondent à la direction d'un point. */
export function anglesDe(p: THREE.Vector3): { phi: number; theta: number } {
  const x = p.x / A;
  const y = p.y / H;
  const z = p.z / B;
  return { phi: Math.atan2(Math.hypot(x, z), y), theta: Math.atan2(x, z) };
}

/** Distance du centre du crâne à la peau, lue dans la carte (interpolation bilinéaire). */
function rayonEn(phi: number, theta: number): number {
  const fi = Math.max(0, Math.min(NPHI - 1.0001, (phi / Math.PI) * (NPHI - 1)));
  const i = Math.floor(fi);
  const ti = fi - i;
  let fj = ((theta + Math.PI) / (2 * Math.PI)) * NTHETA;
  fj = ((fj % NTHETA) + NTHETA) % NTHETA;
  const j = Math.floor(fj);
  const tj = fj - j;
  const j2 = (j + 1) % NTHETA;
  const r = (a: number, b: number) => RAYONS[a * NTHETA + b];
  const haut = r(i, j) * (1 - tj) + r(i, j2) * tj;
  const bas = r(i + 1, j) * (1 - tj) + r(i + 1, j2) * tj;
  return haut * (1 - ti) + bas * ti;
}

/** Un point de la peau. */
export function pointTete(phi: number, theta: number): THREE.Vector3 {
  return direction(phi, theta).multiplyScalar(rayonEn(phi, theta));
}

/** La normale à la peau en ce point, calculée sur la surface sculptée elle-même. */
export function normaleEn(phi: number, theta: number): THREE.Vector3 {
  const e = 0.012;
  const p = pointTete(phi, theta);
  if (phi < 0.05) return new THREE.Vector3(0, 1, 0);
  const dPhi = pointTete(phi + e, theta).sub(pointTete(phi - e, theta));
  const dTheta = pointTete(phi, theta + e).sub(pointTete(phi, theta - e));
  const n = new THREE.Vector3().crossVectors(dPhi, dTheta).normalize();
  if (n.dot(p) < 0) n.negate();
  return n;
}

/** La normale à la peau sous un point quelconque. */
export function normaleTete(p: THREE.Vector3): THREE.Vector3 {
  const { phi, theta } = anglesDe(p);
  return normaleEn(phi, theta);
}

/**
 * Repousse un point hors de la peau (tête, cou, épaules) : les cheveux qui
 * pendent ne doivent jamais rentrer dans le buste.
 */
export function horsPeau(p: THREE.Vector3, marge: number): THREE.Vector3 {
  const l = p.length();
  if (l < 1e-6) return p;
  const { phi, theta } = anglesDe(p);
  const r = rayonEn(phi, theta) + marge;
  if (l < r) p.multiplyScalar(r / l);
  return p;
}

export type PointPose = { p: THREE.Vector3; n: THREE.Vector3 };

/**
 * Jusqu'où descendent les cheveux, selon le côté de la tête : la lisière est
 * au milieu du front devant, juste au-dessus des oreilles sur les côtés, et à
 * la nuque derrière.
 */
export function etendue(theta: number): number {
  const arriere = (1 - Math.cos(theta)) / 2;
  return 0.73 + 0.7 * Math.pow(arriere, 1.22);
}

/** Facteur qui ramène les rangs extérieurs contre la lisière des cheveux. */
const ETIREMENT = 1.07;

/**
 * Convertit un point du schéma vu de dessus (repère SVG, front en haut, droite
 * de la personne à droite) en deux angles sur le crâne.
 */
export function angleDepuisPlan(pt: Pt): { phi: number; theta: number } {
  const u = (pt[0] - TETE.cx) / TETE.rx;
  const v = (pt[1] - TETE.cy) / TETE.ry;
  const r = Math.min(1, Math.hypot(u, v) * ETIREMENT);
  // Vu de dessus, la droite de la personne est à droite du schéma ; en 3D,
  // face à nous, sa droite est du côté des x négatifs.
  const theta = r < 1e-4 ? Math.PI : Math.atan2(-u, -v);
  // Le rayon vu de dessus devient un angle : les rangs s'étalent sur tout le
  // dôme au lieu de s'écraser sur les bords.
  return { phi: r * (Math.PI / 2) * etendue(theta), theta };
}

/** L'inverse : le point du schéma qui tombe sur ces deux angles (null hors des cheveux). */
export function planDepuisAngle(phi: number, theta: number): Pt | null {
  const r = phi / ((Math.PI / 2) * etendue(theta));
  if (r > 1) return null;
  const h = r / ETIREMENT;
  const u = -h * Math.sin(theta);
  const v = -h * Math.cos(theta);
  return [TETE.cx + u * TETE.rx, TETE.cy + v * TETE.ry];
}

export function poser(pt: Pt, decalage = 0): PointPose {
  const { phi, theta } = angleDepuisPlan(pt);
  const p = pointTete(phi, theta);
  const n = normaleEn(phi, theta);
  if (decalage) p.addScaledVector(n, decalage);
  return { p, n };
}

/** À quelle hauteur du crâne se trouve ce point du schéma (0 au sommet, 1 à la lisière). */
export function avancee(pt: Pt): number {
  const u = (pt[0] - TETE.cx) / TETE.rx;
  const v = (pt[1] - TETE.cy) / TETE.ry;
  return Math.min(1, Math.hypot(u, v));
}

/** L'échelle entre les unités du schéma et celles de la 3D. */
export const ECHELLE = 1 / TETE.rx;

// --- Le maillage de la tête ------------------------------------------------

/** Les yeux, creusés en noir comme sur les têtes de mannequin. */
const YEUX = { x: 0.37, y: -0.215, rx: 0.155, ry: 0.07, zMin: 0.9 };
/** La couleur du buste et celle des yeux. */
export const COULEUR_BUSTE = new THREE.Color('#ECECEF');
const COULEUR_YEUX = new THREE.Color('#121114');

/** Le maillage du buste sculpté, avec les yeux peints en noir. */
export function geometrieTete(): THREE.BufferGeometry {
  const q = u16(SCAN.positions);
  const nq = octets(SCAN.normales);
  const n = SCAN.sommets;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    for (let k = 0; k < 3; k++) {
      pos[i * 3 + k] = SCAN.min[k] + (q[i * 3 + k] / 65535) * (SCAN.max[k] - SCAN.min[k]);
      const v = (nq[i * 3 + k] << 24) >> 24; // octet signé
      nor[i * 3 + k] = v / 127;
    }
    const x = pos[i * 3];
    const y = pos[i * 3 + 1];
    const z = pos[i * 3 + 2];
    // Un œil en amande de chaque côté : plein noir au centre, fondu sur le bord.
    let oeil = 0;
    if (z > YEUX.zMin) {
      for (const cote of [-1, 1]) {
        const d = Math.hypot((x - cote * YEUX.x) / YEUX.rx, (y - YEUX.y) / YEUX.ry);
        oeil = Math.max(oeil, Math.min(1, Math.max(0, (1.12 - d) / 0.25)));
      }
    }
    const c = COULEUR_BUSTE.clone().lerp(COULEUR_YEUX, oeil);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setIndex(new THREE.BufferAttribute(u16(SCAN.indices), 1));
  g.computeBoundingSphere();
  return g;
}
