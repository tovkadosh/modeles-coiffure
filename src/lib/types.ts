export type StyleId = 'tresses' | 'flat' | 'barrel' | 'vanilles' | 'fulani';
export type Motif = 'droit' | 'diagonale' | 'courbe' | 'zigzag' | 'rayons';
export type Epaisseur = 'fine' | 'moyenne' | 'grosse';
export type Longueur = 'court' | 'mi-long' | 'long';
export type Sections = 'carre' | 'brique';
export type Genre = 'homme' | 'femme';

/** La « fiche coiffure » : la description exacte d'un modèle. Elle produit le schéma et le texte envoyé à l'IA. */
export type Fiche = {
  style: StyleId;
  /** Nombre de rangs (ou de rangées pour les vanilles, ou de nattes par côté pour le fulani). */
  rangs: number;
  motif: Motif;
  epaisseur: Epaisseur;
  longueur: Longueur;
  sections: Sections;
  perles: boolean;
  couleurPerles: string;
  degrade: boolean;
  genre: Genre;
  details: string;
};

export type Pt = [number, number];
export type Trait = Pt[];

export type Modele = {
  id: string;
  nom: string;
  type: 'fiche' | 'dessin' | 'combinaison';
  creeLe: number;
  modifieLe: number;
  fiche?: Fiche;
  /** Dessin à la main : chaque trait est un rang. */
  traits?: Trait[];
  /** Référence de l'image réaliste enregistrée (voir lib/images). */
  image?: string;
  /** Consigne utilisée pour une combinaison de photos. */
  consigne?: string;
};

export type Reglages = {
  cleOpenAI: string;
  modeleOpenAI: string;
  cleGemini: string;
  modeleGemini: string;
};
