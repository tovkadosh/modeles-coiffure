import { Ecole } from './ecole';
import { ErreurIA, ImageIA, analyserImages } from './ia';
import { base64Image } from './images';
import { REFERENCES, texteReference } from './reference';
import { ORDRE_STYLES, STYLES } from './styles';
import { Reglages, StyleId } from './types';

export type Candidat = { style: StyleId; confiance: number; pourquoi: string };
export type Reponse = {
  style: StyleId;
  confiance: number;
  pourquoi: string;
  autres: Candidat[];
  rangs?: number;
  /** Ce qui a été observé sur la photo, dans l'ordre où l'IA l'a regardé. */
  observations: string[];
};

/** On limite le nombre d'exemples renvoyés : au-delà, la réponse coûte cher et ne s'améliore plus. */
const MAX_EXEMPLES = 6;

const CONSIGNE = `Tu es un expert des coiffures afro tressées et torsadées. Tu dois dire laquelle de ces 5 familles est sur la photo, et rien d'autre.

Les 5 réponses possibles sont exactement: ${ORDRE_STYLES.join(', ')}.

Méthode obligatoire, dans cet ordre:
1. Est-ce que les sections sont attachées au crâne sur toute leur longueur, ou est-ce qu'elles pendent librement ? Si elles pendent => vanilles.
2. Si elles suivent le crâne: est-ce tressé (trois mèches, motif en V / chevrons) ou tordu (deux mèches, spirale penchée) ?
   - Tressé => tresses, sauf si la disposition est celle du fulani (natte centrale sur la raie du milieu + nattes vers le visage + perles) => fulani.
   - Tordu => flat si c'est plat et fin, barrel si c'est gros, bombé et peu nombreux.
3. Compte les rangs ou les sections visibles si tu peux.

Règles:
- Zoome mentalement sur un seul rang avant de décider: le motif d'un rang tranche entre tressé et tordu.
- Ne choisis pas "tresses" par défaut. C'est la réponse la plus fréquente sur Internet, et c'est l'erreur la plus fréquente.
- Si la photo est floue, de dos, ou si tu hésites, dis-le avec une confiance basse plutôt que d'inventer.

Réponds UNIQUEMENT avec un objet JSON, sans texte autour, de cette forme:
{"observations":["ce que tu vois, 2 à 4 phrases courtes en français"],"style":"<une des 5 valeurs>","confiance":0.0,"rangs":0,"pourquoi":"une phrase en français","autres":[{"style":"<valeur>","confiance":0.0,"pourquoi":"pourquoi ce n'est pas ça, en français"}]}`;

function extraireJson(texte: string): any {
  const debut = texte.indexOf('{');
  const fin = texte.lastIndexOf('}');
  if (debut < 0 || fin < debut) throw new ErreurIA(`L’IA n’a pas répondu dans le bon format. Elle a dit : ${texte.slice(0, 200)}`);
  return JSON.parse(texte.slice(debut, fin + 1));
}

const estStyle = (v: unknown): v is StyleId => typeof v === 'string' && (ORDRE_STYLES as string[]).includes(v);
const clamp = (n: unknown) => {
  const x = typeof n === 'number' ? n : Number(n);
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x > 1 ? x / 100 : x)) : 0.5;
};

/** Reconnaît la coiffure d'une photo, en s'aidant des fiches de référence et des exemples corrigés. */
export async function reconnaitre(photo: ImageIA, ecole: Ecole, reglages: Reglages): Promise<Reponse> {
  const exemples = ecole.exemples.slice(0, MAX_EXEMPLES);
  const images: ImageIA[] = [];
  const legendes: string[] = [];
  for (const e of exemples) {
    const base64 = await base64Image(e.image);
    if (!base64) continue;
    images.push({ base64, mime: 'image/jpeg' });
    legendes.push(`Exemple ${images.length} (corrigé par l'utilisateur) : c'est "${e.style}" (${STYLES[e.style].nom}).${e.note.trim() ? ` Il précise : ${e.note.trim()}` : ''}${e.devine && e.devine !== e.style ? ` Une IA avait répondu "${e.devine}" à tort.` : ''}`);
  }

  const texte = [
    CONSIGNE,
    '',
    'Fiches de référence :',
    texteReference(ecole.notes),
    '',
    images.length
      ? `Les ${images.length} premières images sont des exemples déjà corrigés par l'utilisateur. Sers-t'en : sa façon de nommer les coiffures prime sur la tienne.\n${legendes.join('\n')}\n\nLa DERNIÈRE image est la photo à reconnaître.`
      : 'La photo à reconnaître suit.',
  ].join('\n');

  const brut = await analyserImages([...images, photo], texte, reglages);
  const j = extraireJson(brut);
  if (!estStyle(j.style)) throw new ErreurIA(`L’IA a répondu un style inconnu : ${String(j.style)}`);
  const autres: Candidat[] = Array.isArray(j.autres)
    ? j.autres
        .filter((c: any) => estStyle(c?.style) && c.style !== j.style)
        .map((c: any) => ({ style: c.style as StyleId, confiance: clamp(c.confiance), pourquoi: String(c.pourquoi ?? '') }))
    : [];
  return {
    style: j.style,
    confiance: clamp(j.confiance),
    pourquoi: String(j.pourquoi ?? ''),
    rangs: Number.isFinite(Number(j.rangs)) && Number(j.rangs) > 0 ? Math.round(Number(j.rangs)) : undefined,
    observations: Array.isArray(j.observations) ? j.observations.map(String).slice(0, 5) : [],
    autres,
  };
}

/** La différence à regarder entre deux styles, pour expliquer une correction. */
export function differenceEntre(bon: StyleId, faux: StyleId): string {
  return (
    REFERENCES[bon].pasConfondre.find((c) => c.avec === faux)?.difference ??
    REFERENCES[faux].pasConfondre.find((c) => c.avec === bon)?.difference ??
    `${REFERENCES[bon].enBref}`
  );
}
