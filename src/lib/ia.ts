import { Reglages } from './types';

export type ImageIA = { base64: string; mime: string };

export class ErreurIA extends Error {}

async function lireErreur(r: Response, service: string): Promise<never> {
  let detail = '';
  try {
    const j = await r.json();
    detail = j?.error?.message ?? JSON.stringify(j).slice(0, 300);
  } catch {
    detail = await r.text().catch(() => '');
  }
  if (r.status === 401 || r.status === 403) throw new ErreurIA(`${service} refuse la clé. Vérifie-la dans les Réglages. (${detail})`);
  if (r.status === 429) throw new ErreurIA(`${service} : limite ou crédit atteint. (${detail})`);
  throw new ErreurIA(`${service} a répondu une erreur ${r.status}. ${detail}`);
}

/** Texte → image réaliste, avec GPT Image (choix du banc d'essai). */
export async function genererImage(prompt: string, r: Reglages): Promise<ImageIA> {
  if (!r.cleOpenAI) throw new ErreurIA('Ajoute ta clé OpenAI dans les Réglages pour générer une image.');
  const rep = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r.cleOpenAI}` },
    body: JSON.stringify({ model: r.modeleOpenAI, prompt, n: 1, size: '1024x1024', quality: 'medium', output_format: 'jpeg' }),
  });
  if (!rep.ok) await lireErreur(rep, 'OpenAI');
  const j = await rep.json();
  const base64 = j?.data?.[0]?.b64_json;
  if (!base64) throw new ErreurIA('OpenAI n’a pas renvoyé d’image.');
  return { base64, mime: 'image/jpeg' };
}

/** Cherche la première image dans une réponse, quelle que soit sa forme exacte. */
function trouverImage(o: unknown): ImageIA | null {
  if (!o || typeof o !== 'object') return null;
  const x = o as Record<string, any>;
  if (x.type === 'image' && typeof x.data === 'string') return { base64: x.data, mime: x.mime_type ?? 'image/png' };
  const inline = x.inlineData ?? x.inline_data;
  if (inline && typeof inline.data === 'string') return { base64: inline.data, mime: inline.mimeType ?? inline.mime_type ?? 'image/png' };
  let derniere: ImageIA | null = null;
  for (const v of Object.values(x)) derniere = trouverImage(v) ?? derniere;
  return derniere;
}

/** Plusieurs photos + une consigne → une nouvelle coiffure, avec Gemini (choix du banc d'essai). */
export async function combinerPhotos(photos: ImageIA[], consigne: string, r: Reglages): Promise<ImageIA> {
  if (!r.cleGemini) throw new ErreurIA('Ajoute ta clé Gemini dans les Réglages pour combiner des photos.');
  const rep = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': r.cleGemini },
    body: JSON.stringify({
      model: r.modeleGemini,
      input: [{ type: 'text', text: consigne }, ...photos.map((p) => ({ type: 'image', mime_type: p.mime, data: p.base64 }))],
    }),
  });
  if (!rep.ok) await lireErreur(rep, 'Gemini');
  const image = trouverImage(await rep.json());
  if (!image) throw new ErreurIA('Gemini n’a pas renvoyé d’image. Essaie avec une consigne plus simple.');
  return image;
}

const dataUri = (p: ImageIA) => `data:${p.mime};base64,${p.base64}`;

/**
 * Images + question → réponse en texte, avec un modèle qui sait lire les images (OpenAI).
 * Sert à reconnaître une coiffure sur une photo.
 */
export async function analyserImages(photos: ImageIA[], question: string, r: Reglages): Promise<string> {
  if (!r.cleOpenAI) throw new ErreurIA('Ajoute ta clé OpenAI dans les Réglages pour que l’IA puisse regarder une photo.');
  const rep = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r.cleOpenAI}` },
    body: JSON.stringify({
      model: r.modeleVision,
      messages: [
        {
          role: 'user',
          content: [{ type: 'text', text: question }, ...photos.map((p) => ({ type: 'image_url', image_url: { url: dataUri(p), detail: 'high' } }))],
        },
      ],
    }),
  });
  if (!rep.ok) {
    if (rep.status === 404 || rep.status === 400) {
      const dispo = await modelesQuiLisentLesImages(r.cleOpenAI).catch(() => []);
      if (dispo.length) throw new ErreurIA(`OpenAI ne connaît pas le modèle « ${r.modeleVision} ». Dans les Réglages, mets plutôt : ${dispo.slice(0, 3).join(', ')}.`);
    }
    await lireErreur(rep, 'OpenAI');
  }
  const j = await rep.json();
  const c = j?.choices?.[0]?.message?.content;
  const texte = typeof c === 'string' ? c : Array.isArray(c) ? c.map((x: any) => x?.text ?? '').join('') : '';
  if (!texte.trim()) throw new ErreurIA('OpenAI n’a rien répondu. Réessaie.');
  return texte;
}

/** Les modèles du compte qui savent lire une image, du plus récent au plus ancien. */
export async function modelesQuiLisentLesImages(cle: string): Promise<string[]> {
  const rep = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${cle}` } });
  if (!rep.ok) await lireErreur(rep, 'OpenAI');
  const j = await rep.json();
  const exclus = /image|audio|tts|whisper|embedding|moderation|realtime|transcribe|search|sora|dall|codex/i;
  return (j?.data ?? [])
    .filter((m: any) => typeof m?.id === 'string' && /^(gpt|o\d|chatgpt)/i.test(m.id) && !exclus.test(m.id))
    .sort((a: any, b: any) => (b?.created ?? 0) - (a?.created ?? 0))
    .map((m: any) => m.id as string);
}
