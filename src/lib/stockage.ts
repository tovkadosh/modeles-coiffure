import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { supprimerImage, uriImage } from './images';
import { Modele, Reglages } from './types';

const CLE_MODELES = 'modeles-v1';
const CLE_REGLAGES = 'reglages-v1';

export const REGLAGES_DEFAUT: Reglages = {
  cleOpenAI: '',
  modeleOpenAI: 'gpt-image-2.5-flare',
  modeleVision: 'gpt-5.2',
  cleGemini: '',
  modeleGemini: 'gemini-nano-banana-2.1',
};

type Etat = { pret: boolean; modeles: Modele[]; reglages: Reglages };
let etat: Etat = { pret: false, modeles: [], reglages: REGLAGES_DEFAUT };
const abonnes = new Set<() => void>();
const publier = (e: Etat) => {
  etat = e;
  abonnes.forEach((f) => f());
};

let chargement: Promise<void> | null = null;
function charger(): Promise<void> {
  chargement ??= (async () => {
    try {
      const [m, r] = await Promise.all([AsyncStorage.getItem(CLE_MODELES), AsyncStorage.getItem(CLE_REGLAGES)]);
      publier({ pret: true, modeles: m ? JSON.parse(m) : [], reglages: { ...REGLAGES_DEFAUT, ...(r ? JSON.parse(r) : {}) } });
    } catch {
      publier({ ...etat, pret: true });
    }
  })();
  return chargement;
}

export function useDonnees(): Etat {
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

export const nouvelId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function enregistrerModele(m: Modele): Promise<void> {
  await charger();
  const autres = etat.modeles.filter((x) => x.id !== m.id);
  const modeles = [{ ...m, modifieLe: Date.now() }, ...autres];
  publier({ ...etat, modeles });
  await AsyncStorage.setItem(CLE_MODELES, JSON.stringify(modeles));
}

export async function supprimerModele(id: string): Promise<void> {
  await charger();
  const m = etat.modeles.find((x) => x.id === id);
  if (m?.image) await supprimerImage(m.image);
  const modeles = etat.modeles.filter((x) => x.id !== id);
  publier({ ...etat, modeles });
  await AsyncStorage.setItem(CLE_MODELES, JSON.stringify(modeles));
}

export async function enregistrerReglages(r: Reglages): Promise<void> {
  publier({ ...etat, reglages: r });
  await AsyncStorage.setItem(CLE_REGLAGES, JSON.stringify(r));
}

/** Donne l'adresse affichable d'une image enregistrée. */
export function useImage(ref?: string): string | null {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let actif = true;
    setUri(null);
    if (ref) uriImage(ref).then((u) => actif && setUri(u));
    return () => {
      actif = false;
    };
  }, [ref]);
  return uri;
}
