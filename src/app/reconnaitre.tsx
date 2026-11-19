import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, Text, TextInput, View } from 'react-native';
import { Bouton, C, Carte, Champ, Ecran, Note, Puces, Titre, s } from '@/composants/ui';
import { ajouterExemple, useEcole } from '@/lib/ecole';
import { ImageIA } from '@/lib/ia';
import { enregistrerImage } from '@/lib/images';
import { Reponse, differenceEntre, reconnaitre } from '@/lib/reconnaissance';
import { nouvelId, useDonnees } from '@/lib/stockage';
import { ORDRE_STYLES, STYLES } from '@/lib/styles';
import { StyleId } from '@/lib/types';

const pourcent = (n: number) => `${Math.round(n * 100)} %`;

export default function Reconnaitre() {
  const { reglages } = useDonnees();
  const { ecole } = useEcole();
  const [photo, setPhoto] = useState<ImageIA | null>(null);
  const [reponse, setReponse] = useState<Reponse | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [corrige, setCorrige] = useState(false);
  const [bonStyle, setBonStyle] = useState<StyleId>('tresses');
  const [note, setNote] = useState('');
  const [enregistre, setEnregistre] = useState(false);

  const choisir = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], base64: true, quality: 0.8 });
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) {
      setPhoto({ base64: a.base64, mime: a.mimeType ?? 'image/jpeg' });
      setReponse(null);
      setCorrige(false);
      setEnregistre(false);
      setErreur('');
    }
  };

  const demander = async () => {
    if (!photo) return;
    setErreur('');
    setOccupe(true);
    try {
      const r = await reconnaitre(photo, ecole, reglages);
      setReponse(r);
      setBonStyle(r.style);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La reconnaissance a échoué.');
    } finally {
      setOccupe(false);
    }
  };

  const apprendre = async (style: StyleId) => {
    if (!photo) return;
    const ref = await enregistrerImage(photo.base64, photo.mime);
    await ajouterExemple({ id: nouvelId(), image: ref, style, devine: reponse?.style, note: note.trim(), creeLe: Date.now() });
    setEnregistre(true);
    setCorrige(false);
  };

  return (
    <Ecran>
      <Note>
        Donne une photo de coiffure : l’IA dit de quelle famille il s’agit et pourquoi. Ensuite tu lui dis si elle a raison. Chaque correction est gardée et renvoyée à l’IA les fois
        suivantes : c’est comme ça qu’elle s’améliore.
      </Note>

      <Pressable accessibilityRole="button" accessibilityLabel="Choisir une photo" onPress={choisir}>
        <View style={{ width: '100%', aspectRatio: 1, maxHeight: 340, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.brun, backgroundColor: '#F3E6D6', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          {photo ? (
            <Image source={{ uri: `data:${photo.mime};base64,${photo.base64}` }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <Text style={{ color: C.brun, fontSize: 17, fontWeight: '600' }}>Choisir une photo</Text>
          )}
        </View>
      </Pressable>

      {photo && <Bouton titre={reponse ? 'Redemander à l’IA' : 'Demander à l’IA'} onPress={demander} occupe={occupe} />}
      {occupe ? <Note>L’IA regarde la photo…</Note> : null}

      {erreur ? (
        <Carte>
          <Text style={{ color: C.rouge, fontSize: 15 }}>{erreur}</Text>
          <Bouton titre="Ouvrir les Réglages" variante="contour" onPress={() => router.push('/reglages')} />
        </Carte>
      ) : null}

      {reponse && (
        <Carte>
          <Titre>{STYLES[reponse.style].nom}</Titre>
          <Note>Sûre à {pourcent(reponse.confiance)}{reponse.rangs ? ` · environ ${reponse.rangs} rangs comptés` : ''}</Note>
          {reponse.pourquoi ? <Text style={{ fontSize: 16, lineHeight: 23, color: C.texte }}>{reponse.pourquoi}</Text> : null}
          {reponse.observations.length ? (
            <View style={{ gap: 6 }}>
              <Text style={s.champ}>Ce qu’elle a regardé</Text>
              {reponse.observations.map((o, i) => (
                <Text key={i} style={{ fontSize: 15, lineHeight: 22, color: C.doux }}>• {o}</Text>
              ))}
            </View>
          ) : null}
          {reponse.autres.length ? (
            <View style={{ gap: 6 }}>
              <Text style={s.champ}>Pourquoi pas les autres</Text>
              {reponse.autres.map((a) => (
                <Text key={a.style} style={{ fontSize: 15, lineHeight: 22, color: C.doux }}>
                  • {STYLES[a.style].nom} ({pourcent(a.confiance)}) : {a.pourquoi}
                </Text>
              ))}
            </View>
          ) : null}
        </Carte>
      )}

      {reponse && !enregistre && (
        <Carte>
          <Titre>Elle a raison ?</Titre>
          {!corrige ? (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Bouton titre="Oui, c’est ça" onPress={() => apprendre(reponse.style)} />
              </View>
              <View style={{ flex: 1 }}>
                <Bouton titre="Non, je corrige" variante="contour" onPress={() => setCorrige(true)} />
              </View>
            </View>
          ) : (
            <>
              <Champ nom="La bonne réponse">
                <Puces options={ORDRE_STYLES.map((id) => ({ valeur: id, nom: STYLES[id].nom }))} valeur={bonStyle} onChange={setBonStyle} />
              </Champ>
              {bonStyle !== reponse.style ? <Note>À retenir : {differenceEntre(bonStyle, reponse.style)}</Note> : null}
              <Champ nom="Ce qui te fait dire ça (facultatif)">
                <TextInput style={s.saisie} value={note} onChangeText={setNote} placeholder="Par exemple : on voit les V des trois mèches sur chaque rang" placeholderTextColor="#B5A598" multiline accessibilityLabel="Explication" />
              </Champ>
              <Bouton titre="Apprendre ça à l’IA" onPress={() => apprendre(bonStyle)} />
            </>
          )}
        </Carte>
      )}

      {enregistre && (
        <Carte>
          <Titre>C’est enregistré</Titre>
          <Note>Cette photo fait maintenant partie des exemples renvoyés à l’IA. Tu les retrouves dans « Apprendre à l’IA ».</Note>
          <Bouton titre="Voir les exemples" variante="contour" onPress={() => router.push('/ecole')} />
        </Carte>
      )}

      {reponse && (
        <Bouton
          titre="Créer un modèle à partir de cette coiffure"
          variante="contour"
          onPress={() => router.push({ pathname: '/creer', params: { style: enregistre ? bonStyle : reponse.style, rangs: reponse.rangs ? String(reponse.rangs) : undefined } })}
        />
      )}
    </Ecran>
  );
}
