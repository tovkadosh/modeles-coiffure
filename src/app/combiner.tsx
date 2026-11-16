import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Bouton, C, Carte, Champ, Ecran, Note, s } from '@/composants/ui';
import { ImageIA, combinerPhotos } from '@/lib/ia';
import { enregistrerImage } from '@/lib/images';
import { CONSIGNE_COMBINAISON } from '@/lib/prompt';
import { enregistrerModele, nouvelId, useDonnees } from '@/lib/stockage';

function Photo({ titre, aide, photo, onChoisir }: { titre: string; aide: string; photo: ImageIA | null; onChoisir: (p: ImageIA) => void }) {
  const choisir = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8 });
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) onChoisir({ base64: a.base64, mime: a.mimeType ?? 'image/jpeg' });
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Choisir ${titre}`} onPress={choisir} style={{ flex: 1, minWidth: 140, gap: 6, alignItems: 'center' }}>
      <View style={{ width: '100%', aspectRatio: 1, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.brun, backgroundColor: '#F3E6D6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {photo ? <Image source={{ uri: `data:${photo.mime};base64,${photo.base64}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" /> : <Text style={{ color: C.brun, fontSize: 16, fontWeight: '600' }}>Choisir</Text>}
      </View>
      <Text style={{ fontWeight: '700', color: C.texte }}>{titre}</Text>
      <Note style={{ textAlign: 'center' }}>{aide}</Note>
    </Pressable>
  );
}

export default function Combiner() {
  const { reglages } = useDonnees();
  const [a, setA] = useState<ImageIA | null>(null);
  const [b, setB] = useState<ImageIA | null>(null);
  const [precision, setPrecision] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');

  const lancer = async () => {
    setErreur('');
    if (!a || !b) return;
    if (!reglages.cleGemini) {
      setErreur('Pour combiner des photos, ajoute d’abord ta clé Gemini dans les Réglages.');
      return;
    }
    setOccupe(true);
    try {
      const consigne = precision.trim() ? `${CONSIGNE_COMBINAISON}. Extra instructions (may be in French): ${precision.trim()}` : CONSIGNE_COMBINAISON;
      const image = await combinerPhotos([a, b], consigne, reglages);
      const ref = await enregistrerImage(image.base64, image.mime);
      const id = nouvelId();
      await enregistrerModele({ id, nom: 'Combinaison de photos', type: 'combinaison', creeLe: Date.now(), modifieLe: Date.now(), image: ref, consigne: precision.trim() || 'motif de la photo 1, accessoires de la photo 2' });
      router.replace({ pathname: '/modele/[id]', params: { id } });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La combinaison a échoué.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Ecran>
      <Note>Choisis deux photos de coiffures. L’IA garde le motif des tresses de la première et les perles ou accessoires de la seconde.</Note>
      <Carte style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        <Photo titre="Photo 1" aide="Le motif des tresses" photo={a} onChoisir={setA} />
        <Photo titre="Photo 2" aide="Les perles et accessoires" photo={b} onChoisir={setB} />
      </Carte>
      <Champ nom="Précisions (facultatif)">
        <TextInput style={s.saisie} value={precision} onChangeText={setPrecision} placeholder="Par exemple : perles dorées seulement devant" placeholderTextColor="#B5A598" accessibilityLabel="Précisions" multiline />
      </Champ>
      <Bouton titre="Combiner les deux coiffures" onPress={lancer} occupe={occupe} desactive={!a || !b} />
      {occupe ? <Note>L’IA travaille, cela prend environ une minute.</Note> : null}
      {erreur ? (
        <Carte>
          <Text style={{ color: C.rouge, fontSize: 15 }}>{erreur}</Text>
          {!reglages.cleGemini && <Bouton titre="Ouvrir les Réglages" variante="contour" onPress={() => router.push('/reglages')} />}
        </Carte>
      ) : null}
    </Ecran>
  );
}
