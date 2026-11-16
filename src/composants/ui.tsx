import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';

export const C = {
  fond: '#FBF6F0',
  carte: '#FFFFFF',
  bord: '#EADFD3',
  texte: '#2B1B12',
  doux: '#7B6557',
  brun: '#7A3E1D',
  or: '#E0A038',
  rouge: '#B3362B',
};

export function Ecran({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.fond }} contentContainerStyle={s.ecran} keyboardShouldPersistTaps="handled">
      <View style={s.colonne}>{children}</View>
    </ScrollView>
  );
}

export function Titre({ children }: { children: React.ReactNode }) {
  return <Text style={s.titre}>{children}</Text>;
}

export function Note({ children, style }: { children: React.ReactNode; style?: object }) {
  return <Text style={[s.note, style]}>{children}</Text>;
}

export function Carte({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.carte, style]}>{children}</View>;
}

type BoutonProps = { titre: string; onPress: () => void; variante?: 'plein' | 'contour' | 'danger'; occupe?: boolean; desactive?: boolean };
export function Bouton({ titre, onPress, variante = 'plein', occupe, desactive }: BoutonProps) {
  const plein = variante === 'plein';
  const couleur = variante === 'danger' ? C.rouge : C.brun;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={occupe || desactive}
      style={({ pressed }) => [s.bouton, { backgroundColor: plein ? couleur : 'transparent', borderColor: couleur, opacity: desactive ? 0.4 : pressed ? 0.75 : 1 }]}>
      {occupe ? <ActivityIndicator color={plein ? '#fff' : couleur} /> : <Text style={[s.boutonTexte, { color: plein ? '#fff' : couleur }]}>{titre}</Text>}
    </Pressable>
  );
}

type PucesProps<T extends string> = { options: { valeur: T; nom: string; couleur?: string }[]; valeur: T; onChange: (v: T) => void };
export function Puces<T extends string>({ options, valeur, onChange }: PucesProps<T>) {
  return (
    <View style={s.puces}>
      {options.map((o) => {
        const actif = o.valeur === valeur;
        return (
          <Pressable key={o.valeur} accessibilityRole="button" onPress={() => onChange(o.valeur)} style={[s.puce, actif && s.puceActive]}>
            {o.couleur && <View style={[s.pastille, { backgroundColor: o.couleur }]} />}
            <Text style={[s.puceTexte, actif && { color: '#fff' }]}>{o.nom}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Compteur({ valeur, min, max, onChange, unite }: { valeur: number; min: number; max: number; onChange: (n: number) => void; unite: string }) {
  const Btn = ({ d, nom }: { d: number; nom: string }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={nom} onPress={() => onChange(Math.max(min, Math.min(max, valeur + d)))} style={s.rond}>
      <Text style={s.rondTexte}>{d > 0 ? '+' : '−'}</Text>
    </Pressable>
  );
  return (
    <View style={s.compteur}>
      <Btn d={-1} nom="Moins" />
      <Text style={s.compteurTexte}>
        {valeur} <Text style={{ fontSize: 14, fontWeight: '400', color: C.doux }}>{unite}</Text>
      </Text>
      <Btn d={1} nom="Plus" />
    </View>
  );
}

export function Champ({ nom, children }: { nom: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.champ}>{nom}</Text>
      {children}
    </View>
  );
}

export const s = StyleSheet.create({
  ecran: { padding: 16, paddingBottom: 48, alignItems: 'center' },
  colonne: { width: '100%', maxWidth: 720, gap: 16 },
  titre: { fontSize: 20, fontWeight: '700', color: C.texte },
  note: { fontSize: 14, color: C.doux, lineHeight: 20 },
  carte: { backgroundColor: C.carte, borderRadius: 16, borderWidth: 1, borderColor: C.bord, padding: 16, gap: 14 },
  bouton: { minHeight: 48, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  boutonTexte: { fontSize: 16, fontWeight: '600' },
  puces: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  puce: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, minHeight: 40, borderRadius: 20, borderWidth: 1, borderColor: C.bord, backgroundColor: C.carte },
  puceActive: { backgroundColor: C.brun, borderColor: C.brun },
  puceTexte: { fontSize: 15, color: C.texte },
  pastille: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: '#00000033' },
  compteur: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  compteurTexte: { fontSize: 22, fontWeight: '700', color: C.texte, minWidth: 110, textAlign: 'center' },
  rond: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.brun, alignItems: 'center', justifyContent: 'center' },
  rondTexte: { color: '#fff', fontSize: 24, fontWeight: '600', lineHeight: 28 },
  champ: { fontSize: 13, fontWeight: '700', color: C.doux, textTransform: 'uppercase', letterSpacing: 0.5 },
  saisie: { borderWidth: 1, borderColor: C.bord, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.texte },
});
