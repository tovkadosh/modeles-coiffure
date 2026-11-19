import * as FileSystem from 'expo-file-system/legacy';

// Sur téléphone, les images sont des fichiers dans le dossier de l'app.
const dossier = () => `${FileSystem.documentDirectory}images/`;

export async function enregistrerImage(base64: string, mime: string): Promise<string> {
  await FileSystem.makeDirectoryAsync(dossier(), { intermediates: true }).catch(() => {});
  const ref = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${mime.includes('png') ? 'png' : 'jpg'}`;
  await FileSystem.writeAsStringAsync(dossier() + ref, base64, { encoding: 'base64' });
  return ref;
}

export async function uriImage(ref: string): Promise<string | null> {
  return dossier() + ref;
}

export async function supprimerImage(ref: string): Promise<void> {
  await FileSystem.deleteAsync(dossier() + ref, { idempotent: true }).catch(() => {});
}

/** Relit une image enregistrée en base64, pour la renvoyer à l'IA. */
export async function base64Image(ref: string): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(dossier() + ref, { encoding: 'base64' });
  } catch {
    return null;
  }
}
