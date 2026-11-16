import { tracer } from './geometrie';
import { Fiche } from './types';

const DIRECTION: Record<Fiche['motif'], string> = {
  droit: 'du front vers la nuque, bien droites',
  diagonale: 'en biais, d’une tempe vers l’arrière opposé',
  courbe: 'en vagues, du front vers la nuque',
  zigzag: 'en zigzag, du front vers la nuque',
  rayons: 'en étoile, toutes à partir du sommet du crâne',
};
const TAILLE = { fine: 'fins', moyenne: 'moyens', grosse: 'gros' } as const;

/** Les étapes à suivre pour réaliser la coiffure, écrites à partir de la fiche. */
export function etapes(f: Fiche): string[] {
  const total = tracer(f).total;
  const liste: string[] = ['Démêle les cheveux et hydrate-les (eau, leave-in, un peu d’huile ou de beurre).'];
  if (f.degrade) liste.push('Les côtés sont en dégradé : on ne coiffe que le dessus de la tête.');
  if (f.style === 'vanilles') {
    liste.push(`Trace ${f.rangs} rangées du front à la nuque, puis découpe chaque rangée en sections ${f.sections === 'brique' ? 'décalées comme des briques' : 'carrées'}. Tu dois obtenir environ ${total} sections.`);
    liste.push('Dans chaque section, sépare la mèche en deux brins et enroule-les l’un autour de l’autre jusqu’à la pointe.');
    liste.push('Commence par la nuque et remonte vers le front, en attachant le reste des cheveux avec des pinces.');
  } else if (f.style === 'fulani') {
    liste.push('Trace une raie au milieu, du front à la nuque, et tresse la natte centrale (C sur le schéma) vers l’arrière.');
    liste.push(`De chaque côté, à l’avant, trace ${f.rangs} sections qui partent de la raie centrale et descendent vers le visage (nattes 1 à ${f.rangs}). Tresse-les vers l’avant.`);
    liste.push(`De chaque côté, à l’arrière, trace ${f.rangs} sections qui partent de la raie et descendent vers la nuque (nattes ${f.rangs + 1} à ${f.rangs * 2}). Tresse-les vers le bas.`);
    liste.push(`Au total : ${total} nattes. Continue chaque natte au-delà du crâne jusqu’à la longueur voulue.`);
  } else {
    const nom = f.style === 'tresses' ? 'tresses collées' : f.style === 'flat' ? 'flat twists' : 'barrel twists';
    liste.push(`Trace ${f.rangs} sections ${DIRECTION[f.motif]}, en suivant les numéros du schéma. Les rangs sont ${TAILLE[f.epaisseur]}.`);
    if (f.style === 'tresses') liste.push('Tresse chaque section à trois brins, en restant collé au crâne (le brin du milieu passe par-dessous).');
    if (f.style === 'flat') liste.push('Torsade chaque section à deux brins, à plat sur le crâne, en ramassant un peu de cheveux à chaque tour.');
    if (f.style === 'barrel') liste.push('Dans chaque section, enroule les mèches sur elles-mêmes pour former de gros rouleaux, l’un après l’autre le long du rang.');
    liste.push(`Fais les ${f.rangs} ${nom} dans l’ordre des numéros, en attachant les sections en attente avec des pinces.`);
  }
  if (f.perles) liste.push('Enfile les perles au bout de chaque natte et bloque-les avec un petit élastique ou un nœud.');
  liste.push('Termine avec un peu de mousse ou de gel sur les raies, puis laisse sécher.');
  return liste;
}
