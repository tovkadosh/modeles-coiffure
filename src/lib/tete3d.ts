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
  // Quelques reliefs du visage, comme sur une tête de mannequin : l'arcade
  // sourcilière, les pommettes, le menton. Tout est devant, sous les cheveux.
  if (devant > 0 && phi > Math.PI * 0.45) {
    const bosse = (centre: number, largeur: number) => Math.exp(-Math.pow((phi - centre) / largeur, 2));
    const arcade = bosse(Math.PI * 0.53, 0.1) * devant * 0.05;
    const pommette = bosse(Math.PI * 0.63, 0.12) * Math.max(0, Math.cos(theta * 2.2)) * 0.035;
    const menton = bosse(Math.PI * 0.85, 0.09) * Math.pow(devant, 3) * 0.035;
    z += arcade + pommette + menton;
  }
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
  return { phi: r * (Math.PI / 2) * (0.95 + 0.38 * Math.pow(arriere, 1.5)), theta };
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

/** Le bas du buste : c'est là que s'arrête le modèle. */
export const BAS_BUSTE = -2.55;

/**
 * Le cou et le buste, comme une tête de mannequin de coiffeur :
 * un profil tourné autour de l'axe, puis aplati d'avant en arrière.
 */
export function geometrieBuste(): THREE.BufferGeometry {
  const profil: [number, number][] = [
    [0.38, -0.78],
    [0.39, -1.05],
    [0.43, -1.3],
    [0.56, -1.52],
    [0.88, -1.72],
    [1.26, -1.92],
    [1.56, -2.14],
    [1.68, -2.4],
    [1.7, BAS_BUSTE],
    [1.2, BAS_BUSTE],
    [0.001, BAS_BUSTE],
  ];
  const g = new THREE.LatheGeometry(
    profil.map(([r, y]) => new THREE.Vector2(r, y)),
    64,
  );
  g.scale(1.22, 1, 0.6);
  g.translate(0, 0, -0.05);
  g.computeVertexNormals();
  return g;
}

/** Une oreille, aplatie contre le côté de la tête. */
export function placementOreille(cote: 1 | -1) {
  const p = pointTete(Math.PI * 0.55, (cote * Math.PI) / 2);
  return { position: [p.x * 0.95, p.y + 0.02, p.z - 0.08] as [number, number, number], echelle: [0.05, 0.14, 0.095] as [number, number, number] };
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
