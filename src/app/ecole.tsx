import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { Bouton, C, Carte, Champ, Ecran, Note, Puces, Titre, s } from '@/composants/ui';
import { Exemple, enregistrerNote, score, supprimerExemple, useEcole } from '@/lib/ecole';
import { REFERENCES } from '@/lib/reference';
import { useImage } from '@/lib/stockage';
import { ORDRE_STYLES, STYLES } from '@/lib/styles';
import { StyleId } from '@/lib/types';

function Vignette({ e }: { e: Exemple }) {
  const uri = useImage(e.image);
  const [confirmer, setConfirmer] = useState(false);
  return (
    <Carte style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
      <View style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3E6D6' }}>{uri ? <Image source={{ uri }} style={{ width: 72, height: 72 }} resizeMode="cover" /> : null}</View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: C.texte }}>{STYLES[e.style].nom}</Text>
        {e.devine && e.devine !== e.style ? <Note style={{ color: C.rouge }}>L’IA avait dit : {STYLES[e.devine].nom}</Note> : <Note>L’IA avait vu juste</Note>}
        {e.note ? <Note>« {e.note} »</Note> : null}
        <Text
          accessibilityRole="button"
          onPress={async () => {
            if (!confirmer) return setConfirmer(true);
            await supprimerExemple(e.id);
          }}
          style={{ color: C.rouge, fontSize: 14, fontWeight: '600', paddingVertical: 6 }}>
          {confirmer ? 'Confirmer la suppression' : 'Supprimer'}
        </Text>
      </View>
    </Carte>
  );
}

export default function EcoleEcran() {
  const { ecole, pret } = useEcole();
  const [style, setStyle] = useState<StyleId>('tresses');
  const [note, setNote] = useState('');
  const [ok, setOk] = useState(false);
  useEffect(() => {
    setNote(ecole.notes[style] ?? '');
    setOk(false);
  }, [style, ecole.notes]);

  const sc = score(ecole.exemples);
  const ref = REFERENCES[style];

  return (
    <Ecran>
      <Note>
        L’IA ne s’entraîne pas vraiment comme un cerveau : on ne peut pas la réécrire depuis le téléphone. Ce qu’on fait ici marche autrement, et ça marche bien : tout ce que tu
        notes ici lui est renvoyé à chaque question, avec tes photos corrigées. Plus tu corriges, plus elle répond comme toi.
      </Note>

      <Carte>
        <Titre>Où elle en est</Titre>
        {sc.total === 0 ? (
          <Note>Aucun essai enregistré pour l’instant. Donne-lui une photo pour commencer.</Note>
        ) : (
          <Note>
            Sur {sc.total} photo{sc.total > 1 ? 's' : ''} jugée{sc.total > 1 ? 's' : ''}, elle a vu juste {sc.justes} fois et tu l’as corrigée {sc.corriges} fois.
          </Note>
        )}
        <Bouton titre="Donner une photo à reconnaître" onPress={() => router.push('/reconnaitre')} />
      </Carte>

      <Carte>
        <Titre>Tes notes par coiffure</Titre>
        <Note>Écris ce que l’IA doit savoir pour ne plus se tromper sur ce style. Ces phrases passent avant la description livrée avec l’app, et servent aussi quand elle crée une image.</Note>
        <Puces options={ORDRE_STYLES.map((id) => ({ valeur: id, nom: STYLES[id].nom }))} valeur={style} onChange={setStyle} />
        <Note>{ref.enBref}</Note>
        <View style={{ gap: 4 }}>
          <Text style={s.champ}>Ce qu’on voit</Text>
          {ref.signes.map((x, i) => (
            <Text key={i} style={{ fontSize: 15, lineHeight: 22, color: C.doux }}>• {x}</Text>
          ))}
        </View>
        <View style={{ gap: 4 }}>
          <Text style={s.champ}>Ne pas confondre</Text>
          {ref.pasConfondre.map((c) => (
            <Text key={c.avec} style={{ fontSize: 15, lineHeight: 22, color: C.doux }}>
              • Avec {STYLES[c.avec].nom} : {c.difference}
            </Text>
          ))}
        </View>
        <Champ nom={`Ta note sur « ${STYLES[style].nom} »`}>
          <TextInput
            style={[s.saisie, { minHeight: 90, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={(v) => {
              setNote(v);
              setOk(false);
            }}
            multiline
            placeholder="Par exemple : chez moi les barrel twists font toujours moins de 6 rangs, très épais."
            placeholderTextColor="#B5A598"
            accessibilityLabel="Ta note"
          />
        </Champ>
        <Bouton
          titre={ok ? 'Enregistré' : 'Enregistrer la note'}
          onPress={async () => {
            await enregistrerNote(style, note.trim());
            setOk(true);
          }}
        />
      </Carte>

      <Titre>Tes exemples corrigés</Titre>
      {pret && ecole.exemples.length === 0 ? (
        <Carte>
          <Note>Pas encore d’exemple. Les six plus récents sont renvoyés à l’IA à chaque question, avec ta réponse à toi.</Note>
        </Carte>
      ) : (
        ecole.exemples.map((e) => <Vignette key={e.id} e={e} />)
      )}
    </Ecran>
  );
}
