import { Fiche, Motif, StyleId } from './types';

export const STYLES: Record<StyleId, { nom: string; resume: string; min: number; max: number; defaut: number; unite: string }> = {
  tresses: { nom: 'Tresses collées', resume: 'Nattes plaquées sur le crâne', min: 2, max: 20, defaut: 8, unite: 'rangs' },
  flat: { nom: 'Flat twists', resume: 'Vanilles plaquées, à deux brins', min: 2, max: 14, defaut: 6, unite: 'rangs' },
  barrel: { nom: 'Barrel twists', resume: 'Grosses torsades en rouleaux', min: 2, max: 10, defaut: 5, unite: 'rangs' },
  vanilles: { nom: 'Vanilles', resume: 'Torsades libres à deux brins', min: 3, max: 10, defaut: 7, unite: 'rangées' },
  fulani: { nom: 'Fulani', resume: 'Natte centrale et nattes sur les côtés', min: 2, max: 7, defaut: 4, unite: 'nattes par côté' },
};

export const ORDRE_STYLES: StyleId[] = ['tresses', 'flat', 'barrel', 'vanilles', 'fulani'];

export const MOTIFS: Record<Motif, string> = {
  droit: 'Vers l’arrière',
  diagonale: 'En biais',
  courbe: 'En vagues',
  zigzag: 'Zigzag',
  rayons: 'En étoile',
};

export const PERLES: { nom: string; couleur: string; anglais: string }[] = [
  { nom: 'Or', couleur: '#D9A520', anglais: 'gold' },
  { nom: 'Argent', couleur: '#B8BCC4', anglais: 'silver' },
  { nom: 'Bleu', couleur: '#2F6FD6', anglais: 'blue' },
  { nom: 'Rouge', couleur: '#C8372D', anglais: 'red' },
  { nom: 'Blanc', couleur: '#F4F1EA', anglais: 'white' },
  { nom: 'Bois', couleur: '#8A5A33', anglais: 'wooden' },
];

export function ficheParDefaut(style: StyleId): Fiche {
  return {
    style,
    rangs: STYLES[style].defaut,
    motif: 'droit',
    epaisseur: 'moyenne',
    longueur: style === 'vanilles' || style === 'fulani' ? 'mi-long' : 'court',
    sections: 'carre',
    perles: style === 'fulani',
    couleurPerles: PERLES[0].couleur,
    degrade: false,
    genre: 'homme',
    details: '',
  };
}

/** Les styles en rangs plaqués acceptent un motif ; vanilles et fulani ont leur propre tracé. */
export const aUnMotif = (s: StyleId) => s === 'tresses' || s === 'flat' || s === 'barrel';
