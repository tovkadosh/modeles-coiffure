import { router } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Schema } from '@/composants/Schema';
import { C, Carte, Ecran, Note, Titre } from '@/composants/ui';
import { resumeFiche } from '@/lib/prompt';
import { useDonnees, useImage } from '@/lib/stockage';
import { ORDRE_STYLES, STYLES, ficheParDefaut } from '@/lib/styles';
import { Modele } from '@/lib/types';

function Vignette({ m }: { m: Modele }) {
  const uri = useImage(m.image);
  const sousTitre = m.type === 'combinaison' ? 'Combinaison de photos' : m.type === 'dessin' ? `Dessin · ${m.traits?.length ?? 0} rangs` : m.fiche ? `${STYLES[m.fiche.style].nom} · ${resumeFiche(m.fiche)}` : '';
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/modele/[id]', params: { id: m.id } })} style={st.vignette}>
      <View style={st.apercu}>
        {m.type === 'combinaison' ? uri ? <Image source={{ uri }} style={st.photo} /> : null : <Schema largeur={84} fiche={m.fiche} traits={m.traits} styleTraits={m.fiche?.style} numeros={false} />}
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={st.nom}>{m.nom}</Text>
        <Note>{sousTitre}</Note>
        {m.image && m.type !== 'combinaison' ? <Note style={{ color: C.brun }}>Avec image réaliste</Note> : null}
      </View>
    </Pressable>
  );
}

export default function Accueil() {
  const { modeles, pret } = useDonnees();
  return (
    <Ecran>
      <Titre>Choisis un style pour commencer</Titre>
      <View style={st.grille}>
        {ORDRE_STYLES.map((id) => (
          <Pressable key={id} accessibilityRole="button" onPress={() => router.push({ pathname: '/creer', params: { style: id } })} style={st.style}>
            <Schema largeur={96} fiche={ficheParDefaut(id)} numeros={false} />
            <Text style={st.nomStyle}>{STYLES[id].nom}</Text>
            <Text style={st.resume}>{STYLES[id].resume}</Text>
          </Pressable>
        ))}
      </View>

      <View style={st.actions}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/dessin')} style={st.action}>
          <Text style={st.actionTitre}>Dessiner à la main</Text>
          <Note>Trace toi-même chaque rang avec le doigt.</Note>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/combiner')} style={st.action}>
          <Text style={st.actionTitre}>Combiner des photos</Text>
          <Note>Mélange deux coiffures en une seule image.</Note>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/reconnaitre')} style={st.action}>
          <Text style={st.actionTitre}>Reconnaître une photo</Text>
          <Note>L’IA dit quelle coiffure c’est, et tu la corriges si elle se trompe.</Note>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/ecole')} style={st.action}>
          <Text style={st.actionTitre}>Apprendre à l’IA</Text>
          <Note>Tes exemples corrigés et tes notes, que l’IA relit à chaque fois.</Note>
        </Pressable>
      </View>

      <Titre>Mes modèles</Titre>
      {pret && modeles.length === 0 ? (
        <Carte>
          <Note>Tu n’as pas encore de modèle. Choisis un style ci-dessus, règle le nombre de rangs, puis enregistre.</Note>
        </Carte>
      ) : (
        modeles.map((m) => <Vignette key={m.id} m={m} />)
      )}

      <Pressable accessibilityRole="button" onPress={() => router.push('/reglages')} style={{ alignSelf: 'center', padding: 12 }}>
        <Text style={{ color: C.brun, fontSize: 16, fontWeight: '600' }}>Réglages et clés d’IA</Text>
      </Pressable>
    </Ecran>
  );
}

const st = StyleSheet.create({
  grille: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  style: { flexGrow: 1, flexBasis: 150, backgroundColor: C.carte, borderRadius: 16, borderWidth: 1, borderColor: C.bord, padding: 12, alignItems: 'center', gap: 4 },
  nomStyle: { fontSize: 16, fontWeight: '700', color: C.texte, textAlign: 'center' },
  resume: { fontSize: 13, color: C.doux, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { flexGrow: 1, flexBasis: 220, backgroundColor: '#F3E6D6', borderRadius: 16, padding: 16, gap: 4 },
  actionTitre: { fontSize: 17, fontWeight: '700', color: C.brun },
  vignette: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: C.carte, borderRadius: 16, borderWidth: 1, borderColor: C.bord, padding: 12 },
  apercu: { width: 84, height: 112, alignItems: 'center', justifyContent: 'center', borderRadius: 10, overflow: 'hidden' },
  photo: { width: 84, height: 112, borderRadius: 10 },
  nom: { fontSize: 17, fontWeight: '700', color: C.texte },
});
