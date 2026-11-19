import { REFERENCES } from './reference';
import { MOTIFS, PERLES, STYLES } from './styles';
import { Fiche, StyleId } from './types';

const MOTIF_EN: Record<Fiche['motif'], string> = {
  droit: 'going straight back from the hairline to the nape',
  diagonale: 'going diagonally across the head',
  courbe: 'in curved S-shaped wavy lines from front to back',
  zigzag: 'in a zigzag pattern from front to back',
  rayons: 'radiating from the crown like a star, toward the hairline',
};
const TAILLE_EN = { fine: 'thin', moyenne: 'medium-size', grosse: 'thick' } as const;
const LONGUEUR_EN = { court: 'short, ending at the nape', 'mi-long': 'shoulder-length', long: 'long, reaching the mid-back' } as const;

/**
 * Texte envoyé à l'IA (en anglais : les IA d'images le suivent mieux, voir le banc d'essai).
 *
 * Le texte est construit à partir de la fiche de référence du style (lib/reference),
 * et il dit aussi ce que l'image ne doit PAS montrer : sans ça, les IA ramènent
 * presque toujours des tresses collées, qui sont la coiffure la plus représentée
 * dans leurs données.
 */
export function construirePrompt(f: Fiche, notes: Partial<Record<StyleId, string>> = {}): string {
  const qui = f.genre === 'homme' ? 'a Black man' : 'a Black woman';
  const perle = PERLES.find((p) => p.couleur === f.couleurPerles)?.anglais ?? 'gold';
  const taille = TAILLE_EN[f.epaisseur];
  const ref = REFERENCES[f.style];

  // Les précisions qui dépendent des réglages de la fiche, en plus de la description de référence.
  let precisions = '';
  if (f.style === 'tresses') precisions = `exactly ${f.rangs} ${taille} rows ${MOTIF_EN[f.motif]}`;
  if (f.style === 'flat') precisions = `exactly ${f.rangs} ${taille} rows ${MOTIF_EN[f.motif]}`;
  if (f.style === 'barrel') precisions = `exactly ${f.rangs} thick rows ${MOTIF_EN[f.motif]}`;
  if (f.style === 'vanilles') precisions = `${taille} twists, ${LONGUEUR_EN[f.longueur]}, ${f.sections === 'brique' ? 'brick-layout' : 'square'} parts in a grid of ${f.rangs} rows from front to back`;
  if (f.style === 'fulani') precisions = `${f.rangs} ${taille} cornrows braided toward the face on each side and ${f.rangs} going to the nape, braids ${LONGUEUR_EN[f.longueur]}`;

  const morceaux = [
    `Photorealistic photo of ${qui} with ${ref.anglais}`,
    precisions,
    f.perles ? `${perle} beads at the ends of the braids` : '',
    f.degrade ? 'taper fade on the sides' : '',
    f.style === 'vanilles' ? 'front view' : 'top view and side view',
    'natural 4C hair, studio lighting, plain background',
    notes[f.style]?.trim() ?? '',
    f.details.trim(),
    `IMPORTANT: ${ref.pasCeci.join(', ')}`,
  ];
  return morceaux.filter(Boolean).join(', ');
}

export const CONSIGNE_COMBINAISON =
  'Combine these two hairstyles into one: keep the braid pattern and parts from the first image, and the beads and accessories from the second image. Photorealistic, same person style, studio lighting, plain background';

/** Petit résumé en français d'une fiche, pour les listes. */
export function resumeFiche(f: Fiche): string {
  const s = STYLES[f.style];
  const bouts = [`${f.rangs} ${s.unite}`];
  if (f.style !== 'vanilles' && f.style !== 'fulani') bouts.push(MOTIFS[f.motif].toLowerCase());
  if (f.perles) bouts.push('perles');
  if (f.degrade) bouts.push('dégradé');
  return bouts.join(' · ');
}
