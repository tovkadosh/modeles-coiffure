import { del, get, set } from 'idb-keyval';

// Sur le web, les images sont gardées dans la base du navigateur (IndexedDB).
export async function enregistrerImage(base64: string, mime: string): Promise<string> {
  const ref = `img-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  await set(ref, `data:${mime};base64,${base64}`);
  return ref;
}

export async function uriImage(ref: string): Promise<string | null> {
  return (await get<string>(ref)) ?? null;
}

export async function supprimerImage(ref: string): Promise<void> {
  await del(ref);
}
