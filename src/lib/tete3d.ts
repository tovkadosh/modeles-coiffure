import * as THREE from 'three';
import { TETE } from './geometrie';
import { Pt } from './types';

/**
 * La tête en 3D. Tout part d'un ellipsoïde déformé : le haut sert de crâne
 * (c'est là que se posent les rangs), le bas devient le visage et la nuque.
 * Les mêmes formules servent à dessiner la tête et à poser les tresses dessus,
 * donc les tresses collent toujours à la peau.
 */
export const A = 0.95;   // demi-largeur (gauche-droite)
export const B = 1.27;   // demi-profondeur (front-nuque)
export const H = 1.2;    // demi-hauteur

/** Un point de la surface. `phi` : 0 au sommet, π/2 à hauteur des oreilles. `theta` : 0 devant. */
export function pointTete(phi: number, theta: number): THREE.Vector3 {
  const s = Math.sin(phi);
  const c = Math.cos(phi);
  let x = A * s * Math.sin(theta);
  let z = B * s * Math.cos(theta);
  let y = H * c;
  // Sous la ligne des oreilles, la tête se resserre vers le menton et la nuque.
  const t = Math.max(0, (phi - Math.PI / 2) / (Math.PI / 2));
  if (t > 0) {
    const k = Math.pow(t, 1.35);
    const arriere = Math.max(0, -Math.cos(theta));
    // Le visage se resserre vers le menton, la nuque rentre sous le crâne.
    x *= 1 - 0.42 * k;
    z *= 1 - 0.12 * k - 0.42 * arriere * k;
    // Le bas du visage est moins haut qu'une demi-sphère : sinon la tête fait un œuf.
    y *= 1 - 0.2 * k;
  }
  // Le front est un peu plus plat que le haut du crâne.
  const devant = Math.max(0, Math.cos(theta));
  if (phi > 0.5 && phi < Math.PI / 2) z *= 1 - 0.05 * devant * Math.sin(phi);
  return new THREE.Vector3(x, y, z);
}

/** La normale à la surface : sert à poser les tresses juste au-dessus de la peau. */
export function normaleTete(p: THREE.Vector3): THREE.Vector3 {
  return new THREE.Vector3(p.x / (A * A), p.y / (H * H), p.z / (B * B)).normalize();
}

export type PointPose = { p: THREE.Vector3; n: THREE.Vector3 };

/**
 * Convertit un point du schéma vu de dessus (repère SVG, front en haut)
 * en un point posé sur le crâne en 3D.
 */
export function angleDepuisPlan(pt: Pt): { phi: number; theta: number } {
  const u = (pt[0] - TETE.cx) / TETE.rx;
  const v = (pt[1] - TETE.cy) / TETE.ry;
  // Les rangs extérieurs sont ramenés contre la lisière des cheveux : sinon,
  // vu en 3D, il resterait une bande de crâne nu au-dessus des oreilles.
  const r = Math.min(1, Math.hypot(u, v) * 1.07);
  const theta = r < 1e-4 ? Math.PI : Math.atan2(u, -v);
  // Le rayon vu de dessus devient un angle : les rangs s'étalent sur tout le dôme
  // au lieu de s'écraser sur les bords. Derrière, les cheveux descendent plus bas
  // (jusqu'à la nuque) que devant (où ils s'arrêtent au front).
  const arriere = (1 - Math.cos(theta)) / 2;
  return { phi: r * (Math.PI / 2) * (0.78 + 0.54 * Math.pow(arriere, 1.5)), theta };
}

export function poser(pt: Pt, decalage = 0): PointPose {
  const { phi, theta } = angleDepuisPlan(pt);
  const p = pointTete(phi, theta);
  const n = normaleTete(p);
  if (decalage) p.addScaledVector(n, decalage);
  return { p, n };
}

/** À quelle hauteur du crâne se trouve ce point du schéma (0 au sommet, 1 aux oreilles). */
export function avancee(pt: Pt): number {
  const u = (pt[0] - TETE.cx) / TETE.rx;
  const v = (pt[1] - TETE.cy) / TETE.ry;
  return Math.min(1, Math.hypot(u, v));
}

/** L'échelle entre les unités du schéma et celles de la 3D. */
export const ECHELLE = 1 / TETE.rx;

function deformer(g: THREE.BufferGeometry, f: (v: THREE.Vector3) => THREE.Vector3) {
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const w = f(v);
    pos.setXYZ(i, w.x, w.y, w.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Le maillage de la tête, construit à partir d'une sphère redessinée par `pointTete`. */
export function geometrieTete(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 72, 54, 0, Math.PI * 2, 0, Math.PI * 0.92);
  return deformer(g, (v) => {
    const phi = Math.acos(Math.max(-1, Math.min(1, v.y)));
    const theta = Math.atan2(v.x, v.z);
    return pointTete(phi, theta);
  });
}

/** Le cou, posé sous la tête. */
export function geometrieCou(): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(0.42, 0.52, 0.75, 40, 1, true);
  g.translate(0, -H * 0.92, -0.04);
  return g;
}

/** Une oreille, aplatie contre le côté de la tête. */
export function placementOreille(cote: 1 | -1) {
  const p = pointTete(Math.PI * 0.55, (cote * Math.PI) / 2);
  return { position: [p.x * 0.97, p.y + 0.02, p.z - 0.1] as [number, number, number], echelle: [0.035, 0.13, 0.085] as [number, number, number] };
}

export function placementNez() {
  const p = pointTete(Math.PI * 0.63, 0);
  return { position: [0, p.y + 0.02, p.z + 0.04] as [number, number, number] };
}

export function placementOeil(cote: 1 | -1) {
  const p = pointTete(Math.PI * 0.545, (cote * Math.PI) / 8);
  return { position: [p.x, p.y, p.z + 0.01] as [number, number, number] };
}

export function placementBouche() {
  const p = pointTete(Math.PI * 0.72, 0);
  return { position: [0, p.y, p.z + 0.01] as [number, number, number] };
}
