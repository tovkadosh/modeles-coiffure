import * as THREE from 'three';
import { Ligne, TETE, tracer, tracerDessin, zoneCheveux } from './geometrie';
import { A, B, ECHELLE, H, PointPose, angleDepuisPlan, avancee, normaleTete, pointTete, poser } from './tete3d';
import { Fiche, Longueur, Pt, StyleId, Trait } from './types';

/**
 * Transforme une fiche (ou un dessin à la main) en volumes 3D.
 * Le tracé vient de `geometrie.ts`, le même que le schéma : le nombre de rangs
 * est donc exactement le même en 2D et en 3D.
 */

export type Coiffure3D = {
  /** Toutes les tresses, torsades et vanilles fusionnées en un seul maillage. */
  cheveux: THREE.BufferGeometry;
  /** Les perles au bout des nattes, fusionnées (null s'il n'y en a pas). */
  perles: THREE.BufferGeometry | null;
  /** La zone rasée (côtés en dégradé), ou null. */
  rasage: THREE.BufferGeometry | null;
  /** Nombre de rangs, nattes ou vanilles. */
  total: number;
};

/** Longueur qui pend au bout de la natte, en unités 3D (1 ≈ une demi-largeur de tête). */
const PEND: Record<StyleId, Record<Longueur, number>> = {
  tresses: { court: 0, 'mi-long': 0.8, long: 1.6 },
  flat: { court: 0, 'mi-long': 0.7, long: 1.4 },
  barrel: { court: 0, 'mi-long': 0.7, long: 1.4 },
  vanilles: { court: 0.45, 'mi-long': 0.95, long: 1.7 },
  fulani: { court: 0.45, 'mi-long': 1, long: 1.8 },
};

/** Nombre de brins et serrage de la torsade, par style. */
const TORSADE: Record<StyleId, { brins: number; pas: number; aplat: number; brin: number; ecart: number }> = {
  // Tresse collée : trois brins bien serrés.
  tresses: { brins: 3, pas: 1.7, aplat: 0.45, brin: 0.44, ecart: 0.44 },
  // Flat twist : deux brins, plaqués au crâne.
  flat: { brins: 2, pas: 2.4, aplat: 0.4, brin: 0.5, ecart: 0.42 },
  // Barrel twist : deux gros brins, torsade longue.
  barrel: { brins: 2, pas: 3.4, aplat: 0.6, brin: 0.56, ecart: 0.44 },
  vanilles: { brins: 2, pas: 2.1, aplat: 1, brin: 0.52, ecart: 0.42 },
  fulani: { brins: 3, pas: 1.8, aplat: 0.5, brin: 0.44, ecart: 0.44 },
};

const BAS = new THREE.Vector3(0, -1, 0);

/** Repousse un point à l'extérieur de la tête et du cou, pour que les cheveux ne rentrent pas dedans. */
function horsTete(p: THREE.Vector3, marge: number) {
  const q = new THREE.Vector3(p.x / A, p.y / H, p.z / B);
  const n = q.length();
  if (n < 1 + marge && n > 1e-6) {
    const k = (1 + marge) / n;
    p.set(q.x * k * A, q.y * k * H, q.z * k * B);
  }
  if (p.y < -H * 0.75) {
    const r = Math.hypot(p.x, p.z + 0.04);
    const rmin = 0.5 + marge;
    if (r < rmin && r > 1e-6) {
      const k = rmin / r;
      p.x *= k;
      p.z = (p.z + 0.04) * k - 0.04;
    }
  }
  return p;
}

/** Prolonge une natte au-delà du crâne : elle descend en s'écartant un peu. */
function pendre(fin: PointPose, direction: THREE.Vector3, longueur: number, rayon: number): PointPose[] {
  if (longueur <= 0.02) return [];
  const pas = 0.07;
  const n = Math.max(3, Math.round(longueur / pas));
  const points: PointPose[] = [];
  const cur = fin.p.clone().addScaledVector(fin.n, rayon * 0.2);
  const d = direction.clone().normalize().lerp(BAS, 0.3).normalize();
  let up = fin.n.clone();
  for (let i = 1; i <= n; i++) {
    d.lerp(BAS, 0.22).normalize();
    cur.addScaledVector(d, longueur / n);
    horsTete(cur, rayon * 0.9);
    up = up.clone().lerp(new THREE.Vector3(cur.x, 0, cur.z).normalize(), 0.25).normalize();
    points.push({ p: cur.clone(), n: up.clone() });
  }
  return points;
}

/**
 * Une vanille libre : elle part de sa section, suit la courbe du crâne vers le bas
 * (comme un cheveu qui tombe depuis sa raie), puis pend dans le vide.
 */
function vanille(centre: Pt, longueur: number, rayon: number): PointPose[] {
  const dep = angleDepuisPlan(centre);
  const points: PointPose[] = [];
  const pas = 0.055;
  let phi = dep.phi;
  let restant = longueur;
  let p = pointTete(phi, dep.theta);
  let n = normaleTete(p);
  points.push({ p: p.clone().addScaledVector(n, rayon * 0.7), n: n.clone() });
  // 1. Le long du crâne, jusqu'un peu plus bas que les oreilles.
  const limite = Math.PI * 0.62;
  while (restant > 0 && phi < limite) {
    const suivant = Math.min(limite, phi + 0.07);
    const q = pointTete(suivant, dep.theta);
    const d = q.distanceTo(p);
    if (d < 1e-5) break;
    phi = suivant;
    restant -= d;
    p = q;
    n = normaleTete(p);
    points.push({ p: p.clone().addScaledVector(n, rayon * 0.7), n: n.clone() });
  }
  // 2. Puis dans le vide, en s'écartant un peu de la nuque et des joues.
  const horizontal = new THREE.Vector3(p.x, 0, p.z).normalize();
  const d = horizontal.clone().multiplyScalar(0.35).add(BAS).normalize();
  const cur = points[points.length - 1].p.clone();
  const n2 = Math.max(0, Math.round(restant / pas));
  for (let i = 0; i < n2; i++) {
    d.lerp(BAS, 0.3).normalize();
    cur.addScaledVector(d, pas);
    horsTete(cur, rayon * 0.9);
    points.push({ p: cur.clone(), n: horizontal.clone() });
  }
  return points;
}

function courbe(points: THREE.Vector3[]) {
  return new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.4);
}

/**
 * Construit les brins torsadés qui suivent un chemin posé sur la tête.
 * C'est ce qui donne le relief d'une vraie tresse : plusieurs brins qui
 * s'enroulent les uns autour des autres.
 */
function brins(chemin: PointPose[], rayon: number, reglage: (typeof TORSADE)[StyleId]): THREE.BufferGeometry[] {
  if (chemin.length < 2) return [];
  const centre = courbe(chemin.map((s) => s.p));
  const longueur = centre.getLength();
  if (longueur < 1e-3) return [];
  const pas = Math.max(0.02, rayon * reglage.pas);
  const tours = longueur / pas;
  const segments = Math.min(220, Math.max(22, Math.round(longueur / 0.035)));
  const ecart = rayon * reglage.ecart;
  const geos: THREE.BufferGeometry[] = [];

  // La normale de la peau, interpolée le long du chemin : elle dit où est « le haut ».
  const hauts = chemin.map((s) => s.n);
  const haut = (t: number) => {
    const x = t * (hauts.length - 1);
    const i = Math.min(hauts.length - 2, Math.floor(x));
    return hauts[i].clone().lerp(hauts[i + 1], x - i).normalize();
  };

  for (let k = 0; k < reglage.brins; k++) {
    const phase = (2 * Math.PI * k) / reglage.brins;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const p = centre.getPoint(t);
      const tan = centre.getTangent(t).normalize();
      const up = haut(t);
      const cote = new THREE.Vector3().crossVectors(up, tan).normalize();
      if (cote.lengthSq() < 0.5) cote.set(1, 0, 0);
      const vrai = new THREE.Vector3().crossVectors(tan, cote).normalize();
      const a = phase + t * tours * 2 * Math.PI;
      // Aux deux bouts, les brins se rejoignent : la natte est pointue, pas coupée net.
      const fuseau = Math.min(1, Math.sin(Math.min(1, t * 14)) * 1.02) * Math.min(1, Math.sin(Math.min(1, (1 - t) * 10)) * 1.02);
      pts.push(p.addScaledVector(cote, Math.cos(a) * ecart * fuseau).addScaledVector(vrai, Math.sin(a) * ecart * reglage.aplat * fuseau));
    }
    geos.push(new THREE.TubeGeometry(courbe(pts), segments, rayon * reglage.brin, 7, false));
  }
  return geos;
}

/** Colle plusieurs maillages en un seul, pour que l'affichage reste rapide. */
function fusionner(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const plats = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let n = 0;
  for (const g of plats) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of plats) {
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    const gn = g.attributes.normal;
    if (gn) nor.set(gn.array as Float32Array, o * 3);
    o += g.attributes.position.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.computeBoundingSphere();
  return out;
}

/** La calotte rasée des côtés, quand la coiffure est en dégradé. */
function geometrieRasage(degrade: boolean): THREE.BufferGeometry | null {
  if (!degrade) return null;
  const zone = zoneCheveux(true);
  // L'angle où s'arrêtent les cheveux : en dessous, le crâne est rasé.
  const debut = Math.min(1, zone.rx / TETE.rx) * (Math.PI / 2) * 0.99;
  const g = new THREE.SphereGeometry(1, 64, 22, 0, Math.PI * 2, debut - 0.03, Math.PI * 0.56 - debut);
  const pos = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const phi = Math.acos(Math.max(-1, Math.min(1, v.y)));
    const theta = Math.atan2(v.x, v.z);
    const p = pointTete(phi, theta);
    p.addScaledVector(normaleTete(p), 0.012);
    pos.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Les perles, toutes fusionnées en un seul maillage. */
function geometriePerles(positions: THREE.Vector3[], rayon: number): THREE.BufferGeometry | null {
  if (!positions.length) return null;
  const geos = positions.map((p) => {
    const g = new THREE.SphereGeometry(rayon, 12, 10);
    g.translate(p.x, p.y, p.z);
    return g;
  });
  return fusionner(geos);
}

function cheminLigne(l: Ligne, rayon: number, pend: number): { chemin: PointPose[]; bout: THREE.Vector3 | null } {
  const pts = l.pts;
  // On fait pendre la natte du bout le plus proche du bord de la tête.
  const inverse = avancee(pts[0]) > avancee(pts[pts.length - 1]);
  const ordonnes = inverse ? [...pts].reverse() : pts;
  const chemin = ordonnes.map((p) => poser(p, rayon * 0.55));
  const fin = chemin[chemin.length - 1];
  const avant = chemin[Math.max(0, chemin.length - 3)];
  const dir = fin.p.clone().sub(avant.p);
  if (dir.lengthSq() < 1e-8) dir.copy(fin.n);
  const longueur = avancee(ordonnes[ordonnes.length - 1]) > 0.62 ? pend : pend * 0.25;
  const queue = pendre(fin, dir, longueur, rayon);
  const complet = [...chemin, ...queue];
  return { chemin: complet, bout: complet[complet.length - 1].p.clone() };
}

export function construire(fiche: Fiche | undefined, traits?: Trait[], styleTraits: StyleId = 'tresses'): Coiffure3D {
  const style: StyleId = traits ? styleTraits : fiche?.style ?? 'tresses';
  const reglage = TORSADE[style];
  const perles: THREE.Vector3[] = [];
  const geos: THREE.BufferGeometry[] = [];

  if (traits) {
    const lignes = tracerDessin(traits);
    const rayon = (style === 'barrel' ? 22 : 16) * ECHELLE * 0.5;
    const pend = PEND[style]['court'];
    for (const l of lignes) {
      const { chemin } = cheminLigne(l, rayon, pend);
      geos.push(...brins(chemin, rayon, reglage));
    }
    return {
      cheveux: geos.length ? fusionner(geos) : new THREE.BufferGeometry(),
      perles: null,
      rasage: null,
      total: lignes.length,
    };
  }

  if (!fiche) {
    return { cheveux: new THREE.BufferGeometry(), perles: null, rasage: null, total: 0 };
  }

  const trace = tracer(fiche);
  const rayon = Math.max(0.018, trace.largeur * ECHELLE * 0.5);
  const pend = PEND[style][fiche.longueur];
  let rayonUtile = rayon;

  if (style === 'vanilles') {
    // Une vanille est bien plus fine que sa section de cheveux : `trace.largeur`
    // est la taille du carré, pas l'épaisseur de la torsade.
    const rayonVanille = Math.max(0.015, trace.largeur * ECHELLE * 0.19);
    for (const c of trace.cellules) {
      const chemin = vanille(c.centre, Math.max(0.35, pend), rayonVanille);
      geos.push(...brins(chemin, rayonVanille, reglage));
      if (fiche.perles) perles.push(chemin[chemin.length - 1].p.clone());
      rayonUtile = rayonVanille;
    }
  } else {
    for (const l of trace.lignes) {
      const { chemin, bout } = cheminLigne(l, rayon, pend);
      geos.push(...brins(chemin, rayon, reglage));
      if (fiche.perles && bout) perles.push(bout);
    }
  }

  return {
    cheveux: geos.length ? fusionner(geos) : new THREE.BufferGeometry(),
    perles: geometriePerles(perles, rayonUtile * 1.3),
    rasage: geometrieRasage(fiche.degrade),
    total: trace.total,
  };
}
