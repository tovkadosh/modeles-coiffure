import { Fiche, Pt, Trait } from './types';

/** Le schéma est une tête vue de dessus, le front en haut et la nuque en bas. */
export const VB = { w: 300, h: 400 };
export const TETE = { cx: 150, cy: 204, rx: 110, ry: 146 };

export type Zone = { cx: number; cy: number; rx: number; ry: number };

export type Ligne = {
  pts: Pt[];
  /** Numéro affiché au bord de la tête, pour compter les rangs. */
  label?: string;
  posLabel?: Pt;
  /** Position de la perle au bout du rang. */
  perle?: Pt;
};

export type Cellule = { contour: Pt[]; centre: Pt };

export type Trace = {
  zone: Zone;
  lignes: Ligne[];
  cellules: Cellule[];
  /** Largeur d'un rang, en unités du schéma. */
  largeur: number;
  /** Écart entre deux rangs (ou taille d'une section), en unités du schéma.
   *  La 3D s'en sert pour que les tresses remplissent leur part de crâne. */
  pas: number;
  /** Nombre total d'éléments à réaliser (rangs, nattes ou vanilles). */
  total: number;
};

/** Zone couverte par les cheveux : plus étroite quand les côtés sont en dégradé. */
export function zoneCheveux(degrade: boolean): Zone {
  const { cx, cy, rx, ry } = TETE;
  return degrade ? { cx, cy: cy - 6, rx: rx * 0.66, ry: ry * 0.9 } : { cx, cy, rx: rx * 0.97, ry: ry * 0.97 };
}

export const dansZone = (z: Zone, p: Pt, k = 1) => ((p[0] - z.cx) / z.rx) ** 2 + ((p[1] - z.cy) / z.ry) ** 2 <= k;

const FACTEUR: Record<Fiche['epaisseur'], number> = { fine: 0.34, moyenne: 0.5, grosse: 0.66 };

function versExterieur(z: Zone, p: Pt, d: number): Pt {
  const vx = p[0] - z.cx;
  const vy = p[1] - z.cy;
  const n = Math.hypot(vx, vy) || 1;
  return [p[0] + (vx / n) * d, p[1] + (vy / n) * d];
}

function bord(z: Zone, angleDepuisAvant: number, cote: 1 | -1, k = 1): Pt {
  return [z.cx + cote * z.rx * k * Math.sin(angleDepuisAvant), z.cy - z.ry * k * Math.cos(angleDepuisAvant)];
}

function bezier(p0: Pt, p1: Pt, p2: Pt, n = 24): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]);
  }
  return pts;
}

function rangsParalleles(f: Fiche, z: Zone): { lignes: Ligne[]; largeur: number; pas: number } {
  const n = f.rangs;
  const angle = f.motif === 'diagonale' ? (32 * Math.PI) / 180 : 0;
  const d: Pt = [Math.sin(angle), Math.cos(angle)];
  const nm: Pt = [Math.cos(angle), -Math.sin(angle)];
  const h = Math.hypot(z.rx * nm[0], z.ry * nm[1]) * 0.95;
  const L = Math.hypot(z.rx * d[0], z.ry * d[1]) + 12;
  const pas = (2 * h) / n;
  const lignes: Ligne[] = [];
  for (let i = 0; i < n; i++) {
    const base = ((i + 0.5) / n) * 2 * h - h;
    const pts: Pt[] = [];
    for (let t = -L; t <= L; t += 3) {
      let lat = base;
      if (f.motif === 'droit') lat = base * (0.9 + 0.1 * Math.cos(((t / L) * Math.PI) / 2));
      if (f.motif === 'courbe') lat = base + Math.min(18, pas * 0.9) * Math.sin((t / L) * Math.PI * 2);
      if (f.motif === 'zigzag') {
        const periode = 56;
        const phase = (((t + L) % periode) + periode) % periode;
        const tri = phase < periode / 2 ? phase / (periode / 4) - 1 : 3 - phase / (periode / 4);
        lat = base + tri * Math.min(10, pas * 0.32);
      }
      const p: Pt = [z.cx + nm[0] * lat + d[0] * t, z.cy + nm[1] * lat + d[1] * t];
      if (dansZone(z, p)) pts.push(p);
    }
    if (pts.length < 2) continue;
    const debut = pts[0];
    const fin = pts[pts.length - 1];
    lignes.push({ pts, label: String(i + 1), posLabel: [debut[0], debut[1] - 9], perle: f.perles ? fin : undefined });
  }
  return { lignes, largeur: pas * FACTEUR[f.epaisseur], pas };
}

function rangsEnEtoile(f: Fiche, z: Zone): { lignes: Ligne[]; largeur: number; pas: number } {
  const n = f.rangs;
  const c: Pt = [z.cx, z.cy + 8];
  const lignes: Ligne[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n - Math.PI / 2;
    const pts: Pt[] = [];
    for (let r = 15; r < 200; r += 3) {
      const p: Pt = [c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r];
      if (!dansZone(z, p)) break;
      pts.push(p);
    }
    const fin = pts[pts.length - 1];
    lignes.push({ pts, label: String(i + 1), posLabel: versExterieur(z, fin, 10), perle: f.perles ? pts[0] : undefined });
  }
  const pas = Math.min((2 * Math.PI * Math.min(z.rx, z.ry) * 0.5) / n, 26);
  return { lignes, largeur: pas * FACTEUR[f.epaisseur], pas };
}

function traceFulani(f: Fiche, z: Zone): { lignes: Ligne[]; largeur: number; pas: number } {
  const n = f.rangs;
  const lignes: Ligne[] = [];
  const largeur = Math.min(11, (z.ry * 0.85) / n) * (FACTEUR[f.epaisseur] + 0.25);
  // La natte centrale, du front à la nuque.
  const centre: Pt[] = [];
  for (let y = z.cy - z.ry + 2; y <= z.cy + z.ry - 2; y += 3) centre.push([z.cx, y]);
  lignes.push({ pts: centre, label: 'C', posLabel: [z.cx, z.cy - z.ry - 9], perle: f.perles ? centre[centre.length - 1] : undefined });
  const rad = (deg: number) => (deg * Math.PI) / 180;
  for (const cote of [-1, 1] as const) {
    for (let k = 0; k < n; k++) {
      const t = n === 1 ? 0.5 : k / (n - 1);
      // Devant : les nattes partent de la raie centrale et descendent vers le visage.
      const p0: Pt = [z.cx + cote * (largeur * 0.9 + 3), z.cy - z.ry * (0.78 - 0.74 * t)];
      const p2 = bord(z, rad(30 + 62 * t), cote);
      const p1: Pt = [p0[0] + (p2[0] - p0[0]) * 0.55, p0[1] - 6 + (p2[1] - p0[1]) * 0.1];
      const avant = bezier(p0, p1, p2);
      lignes.push({ pts: avant, label: String(k + 1), posLabel: versExterieur(z, p2, f.perles ? 15 : 9), perle: f.perles ? p2 : undefined });
      // Derrière : les nattes partent de la raie et descendent vers la nuque.
      const q0: Pt = [z.cx + cote * (largeur * 0.9 + 3), z.cy + z.ry * (0.16 + 0.62 * t)];
      const q2 = bord(z, rad(108 + 58 * t), cote);
      const q1: Pt = [q0[0] + (q2[0] - q0[0]) * 0.5, q0[1] + (q2[1] - q0[1]) * 0.2];
      const arriere = bezier(q0, q1, q2);
      lignes.push({ pts: arriere, label: String(n + k + 1), posLabel: versExterieur(z, q2, f.perles ? 15 : 9), perle: f.perles ? q2 : undefined });
    }
  }
  return { lignes, largeur, pas: largeur * 2.1 };
}

function grilleVanilles(f: Fiche, z: Zone): { cellules: Cellule[]; largeur: number } {
  const rangees = f.rangs;
  const s = (2 * z.ry) / rangees;
  const colonnes = Math.ceil((2 * z.rx) / s) + 2;
  const cellules: Cellule[] = [];
  for (let r = 0; r < rangees; r++) {
    const y0 = z.cy - z.ry + r * s;
    const decalage = f.sections === 'brique' && r % 2 === 1 ? s / 2 : 0;
    for (let c = -Math.ceil(colonnes / 2) - 1; c <= Math.ceil(colonnes / 2); c++) {
      const x0 = z.cx + c * s + decalage - (colonnes % 2 === 0 ? 0 : s / 2);
      const centre: Pt = [x0 + s / 2, y0 + s / 2];
      if (!dansZone(z, centre)) continue;
      cellules.push({ centre, contour: [[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s]] });
    }
  }
  return { cellules, largeur: s };
}

/** Calcule le tracé exact d'une fiche : c'est ce qui garantit le bon nombre de rangs. */
export function tracer(f: Fiche): Trace {
  const zone = zoneCheveux(f.degrade);
  if (f.style === 'vanilles') {
    const g = grilleVanilles(f, zone);
    return { zone, lignes: [], cellules: g.cellules, largeur: g.largeur, pas: g.largeur, total: g.cellules.length };
  }
  if (f.style === 'fulani') {
    const t = traceFulani(f, zone);
    return { zone, lignes: t.lignes, cellules: [], largeur: t.largeur, pas: t.pas, total: t.lignes.length };
  }
  const t = f.motif === 'rayons' ? rangsEnEtoile(f, zone) : rangsParalleles(f, zone);
  const largeur = f.style === 'barrel' ? t.largeur * 1.25 : t.largeur;
  return { zone, lignes: t.lignes, cellules: [], largeur: Math.max(2.5, largeur), pas: t.pas, total: t.lignes.length };
}

/** Tracé d'un dessin fait à la main : un trait = un rang. */
export function tracerDessin(traits: Trait[]): Ligne[] {
  return traits
    .filter((t) => t.length > 1)
    .map((pts, i) => {
      const debut = pts[0];
      const suivant = pts[Math.min(3, pts.length - 1)];
      const vx = debut[0] - suivant[0];
      const vy = debut[1] - suivant[1];
      const n = Math.hypot(vx, vy) || 1;
      return { pts, label: String(i + 1), posLabel: [debut[0] + (vx / n) * 9, debut[1] + (vy / n) * 9] as Pt };
    });
}

export function chemin(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
}
