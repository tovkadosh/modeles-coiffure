import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Schema } from '@/composants/Schema';
import { Vue3D } from '@/composants/Vue3D';
import { C, Note } from '@/composants/ui';
import { Fiche, StyleId, Trait } from '@/lib/types';

type Props = {
  largeur: number;
  fiche?: Fiche;
  traits?: Trait[];
  styleTraits?: StyleId;
  /** Texte affiché sous l'aperçu (le compte des rangs, par exemple). */
  legende?: string;
};

/** L'aperçu d'une coiffure : la 3D d'abord, le schéma numéroté en second choix. */
export function Apercu({ largeur, fiche, traits, styleTraits, legende }: Props) {
  const [vue, setVue] = useState<'3d' | 'schema'>('3d');
  return (
    <View style={{ gap: 10, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', backgroundColor: '#F3E6D6', borderRadius: 999, padding: 3 }}>
        {([
          ['3d', 'Modèle 3D'],
          ['schema', 'Schéma numéroté'],
        ] as const).map(([v, nom]) => (
          <Pressable
            key={v}
            accessibilityRole="button"
            onPress={() => setVue(v)}
            style={{ paddingVertical: 7, paddingHorizontal: 16, borderRadius: 999, backgroundColor: vue === v ? C.carte : 'transparent' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: vue === v ? C.brun : C.doux }}>{nom}</Text>
          </Pressable>
        ))}
      </View>
      {vue === '3d' ? (
        <Vue3D largeur={largeur} fiche={fiche} traits={traits} styleTraits={styleTraits ?? fiche?.style ?? 'tresses'} />
      ) : (
        <Schema largeur={largeur} fiche={fiche} traits={traits} styleTraits={styleTraits ?? fiche?.style} />
      )}
      {vue === '3d' ? <Note>Fais glisser sur la tête pour la tourner.</Note> : null}
      {legende ? <Note style={{ textAlign: 'center' }}>{legende}</Note> : null}
    </View>
  );
}
