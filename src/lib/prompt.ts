import { MOTIFS, PERLES, STYLES } from './styles';
import { Fiche } from './types';

const MOTIF_EN: Record<Fiche['motif'], string> = {
  droit: 'going straight back from the hairline to the nape',
  diagonale: 'going diagonally across the head',
  courbe: 'in curved S-shaped wavy lines from front to back',
  zigzag: 'in a zigzag pattern from front to back',
  rayons: 'radiating from the crown like a star, toward the hairline',
};
const TAILLE_EN = { fine: 'thin', moyenne: 'medium-size', grosse: 'thick' } as const;
const LONGUEUR_EN = { court: 'short, ending at the nape', 'mi-long': 'shoulder-length', long: 'long, reaching the mid-back' } as const;

/** Texte envoyé à l'IA (en anglais : les IA d'images le suivent mieux, voir le banc d'essai). */
export function construirePrompt(f: Fiche): string {
  const qui = f.genre === 'homme' ? 'a Black man' : 'a Black woman';
  const perle = PERLES.find((p) => p.couleur === f.couleurPerles)?.anglais ?? 'gold';
  const taille = TAILLE_EN[f.epaisseur];
  let coiffure = '';
  if (f.style === 'tresses') coiffure = `exactly ${f.rangs} ${taille} cornrows ${MOTIF_EN[f.motif]}, neat even parts`;
  if (f.style === 'flat') coiffure = `exactly ${f.rangs} ${taille} flat twists ${MOTIF_EN[f.motif]}, two-strand twists lying flat against the scalp, clean parts`;
  if (f.style === 'barrel') coiffure = `exactly ${f.rangs} barrel twists, thick rope-like twisted sections arranged in rows ${MOTIF_EN[f.motif]}`;
  if (f.style === 'vanilles') coiffure = `${taille} two-strand twists (vanilles), ${LONGUEUR_EN[f.longueur]}, ${f.sections === 'brique' ? 'brick-layout' : 'square'} parts in a grid of ${f.rangs} rows from front to back`;
  if (f.style === 'fulani') coiffure = `Fulani braids: one cornrow down the middle of the head toward the back, ${f.rangs} ${taille} cornrows on each side braided toward the face, ${f.rangs} cornrows on each side going to the nape, braids ${LONGUEUR_EN[f.longueur]}`;
  const morceaux = [
    `Photorealistic photo of ${qui} with ${coiffure}`,
    f.perles ? `${perle} beads at the ends of the braids` : '',
    f.degrade ? 'taper fade on the sides' : '',
    f.style === 'vanilles' ? 'front view' : 'top view and side view',
    'natural 4C hair, studio lighting, plain background',
    f.details.trim(),
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
