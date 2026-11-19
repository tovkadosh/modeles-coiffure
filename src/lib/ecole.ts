import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import { supprimerImage } from './images';
import { StyleId } from './types';

/**
 * « L'école » : ce que l'utilisateur apprend à l'IA.
 *
 * Deux choses seulement, et elles suffisent :
 *  - des exemples corrigés (une photo + la bonne réponse + une explication) ;
 *  - des notes personnelles par style, qui passent avant les fiches de référence.
 *
 * Tout est renvoyé à l'IA à chaque question. Ce n'est pas un entraînement de
 * modèle (impossible depuis un téléphone), mais le résultat ressemble :
 * plus il y a d'exemples corrigés, mieux l'IA répond.
 */
export type Exemple = {
  id: string;
  /** Référence de l'image enregistrée (voir lib/images). */
  image: string;
  /** La bonne réponse, donnée par l'utilisateur. */
  style: StyleId;
  /** Ce que l'IA avait répondu, quand elle s'est trompée. */
  devine?: StyleId;
  /** L'explication de l'utilisateur : « on voit les V des trois mèches ». */
  note: string;
  creeLe: number;
};

export type Ecole = {
  exemples: Exemple[];
  notes: Partial<Record<StyleId, string>>;
};

const CLE = 'ecole-v1';
const VIDE: Ecole = { exemples: [], notes: {} };

type Etat = { pret: boolean; ecole: Ecole };
let etat: Etat = { pret: false, ecole: VIDE };
const abonnes = new Set<() => void>();
const publier = (e: Etat) => {
  etat = e;
  abonnes.forEach((f) => f());
};

let chargement: Promise<void> | null = null;
function charger(): Promise<void> {
  chargement ??= (async () => {
    try {
      const brut = await AsyncStorage.getItem(CLE);
      publier({ pret: true, ecole: { ...VIDE, ...(brut ? JSON.parse(brut) : {}) } });
    } catch {
      publier({ ...etat, pret: true });
    }
  })();
  return chargement;
}

async function ecrire(ecole: Ecole): Promise<void> {
  publier({ pret: true, ecole });
  await AsyncStorage.setItem(CLE, JSON.stringify(ecole));
}

export function useEcole(): Etat {
  useEffect(() => {
    charger();
  }, []);
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => etat,
    () => etat,
  );
}

export async function ajouterExemple(e: Exemple): Promise<void> {
  await charger();
  await ecrire({ ...etat.ecole, exemples: [e, ...etat.ecole.exemples.filter((x) => x.id !== e.id)] });
}

export async function supprimerExemple(id: string): Promise<void> {
  await charger();
  const e = etat.ecole.exemples.find((x) => x.id === id);
  if (e) await supprimerImage(e.image);
  await ecrire({ ...etat.ecole, exemples: etat.ecole.exemples.filter((x) => x.id !== id) });
}

export async function enregistrerNote(style: StyleId, note: string): Promise<void> {
  await charger();
  await ecrire({ ...etat.ecole, notes: { ...etat.ecole.notes, [style]: note } });
}

/** Combien de fois l'IA a vu juste du premier coup, sur les exemples enregistrés. */
export function score(exemples: Exemple[]): { corriges: number; justes: number; total: number } {
  const juges = exemples.filter((e) => e.devine);
  return {
    corriges: juges.filter((e) => e.devine !== e.style).length,
    justes: juges.filter((e) => e.devine === e.style).length,
    total: juges.length,
  };
}
