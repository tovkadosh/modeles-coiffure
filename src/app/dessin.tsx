import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { GestureResponderEvent, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import { Schema } from '@/composants/Schema';
import { Vue3D } from '@/composants/Vue3D';
import { Bouton, C, Champ, Note, Puces, s } from '@/composants/ui';
import { TETE, VB, dansZone } from '@/lib/geometrie';
import { enregistrerModele, nouvelId, useDonnees } from '@/lib/stockage';
import { ficheParDefaut } from '@/lib/styles';
import { Pt, StyleId, Trait } from '@/lib/types';

export default function Dessin() {
  const params = useLocalSearchParams<{ id?: string }>();
  const { modeles, pret } = useDonnees();
  const existant = params.id ? modeles.find((m) => m.id === params.id) : undefined;
  const { width, height } = useWindowDimensions();
  const largeur = Math.max(200, Math.min(width - 32, 360, (height - 300) * (VB.w / VB.h)));
  const [traits, setTraits] = useState<Trait[]>([]);
  const [style, setStyle] = useState<StyleId>('tresses');
  const [nom, setNom] = useState('');
  const [charge, setCharge] = useState(false);
  const enCours = useRef<Pt[] | null>(null);

  useEffect(() => {
    if (pret && existant?.traits && !charge) {
      setTraits(existant.traits);
      setStyle(existant.fiche?.style ?? 'tresses');
      setNom(existant.nom);
      setCharge(true);
    }
  }, [pret, existant, charge]);

  const point = (e: GestureResponderEvent): Pt => {
    const k = VB.w / largeur;
    return [Math.round(e.nativeEvent.locationX * k * 10) / 10, Math.round(e.nativeEvent.locationY * k * 10) / 10];
  };
  const commencer = (e: GestureResponderEvent) => {
    const p = point(e);
    enCours.current = dansZone(TETE, p) ? [p] : [];
    setTraits((t) => [...t, enCours.current!]);
  };
  const continuer = (e: GestureResponderEvent) => {
    const pts = enCours.current;
    if (!pts) return;
    const p = point(e);
    const dernier = pts[pts.length - 1];
    // On ne garde que les points sur la tête, et assez espacés pour un trait net.
    if (!dansZone(TETE, p) || (dernier && Math.hypot(p[0] - dernier[0], p[1] - dernier[1]) < 3)) return;
    const suite = [...pts, p];
    enCours.current = suite;
    setTraits((t) => [...t.slice(0, -1), suite]);
  };
  const finir = () => {
    const pts = enCours.current;
    enCours.current = null;
    if (!pts || pts.length < 3) setTraits((t) => t.slice(0, -1));
  };

  const enregistrer = async () => {
    const id = existant?.id ?? nouvelId();
    await enregistrerModele({
      id,
      nom: nom.trim() || `Dessin, ${traits.length} rangs`,
      type: 'dessin',
      creeLe: existant?.creeLe ?? Date.now(),
      modifieLe: Date.now(),
      fiche: { ...(existant?.fiche ?? ficheParDefaut(style)), style, rangs: traits.length },
      traits,
      image: existant?.image,
    });
    router.replace({ pathname: '/modele/[id]', params: { id } });
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.fond }} contentContainerStyle={{ alignItems: 'center', padding: 16, paddingBottom: 48 }}>
      <View style={{ width: '100%', maxWidth: 720, gap: 12, alignItems: 'center' }}>
        <Note>Trace chaque rang avec le doigt (ou la souris) sur la tête. Un trait = un rang.</Note>
        <View style={{ width: largeur, height: (largeur * VB.h) / VB.w, backgroundColor: C.carte, borderRadius: 16, borderWidth: 1, borderColor: C.bord }}>
          <Schema largeur={largeur} traits={traits} styleTraits={style} />
          <View
            accessibilityLabel="Zone de dessin"
            style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, { touchAction: 'none', cursor: 'crosshair' } as object]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={commencer}
            onResponderMove={continuer}
            onResponderRelease={finir}
            onResponderTerminate={finir}
          />
        </View>
        <Note>{traits.length === 0 ? 'Aucun rang pour l’instant.' : `${traits.length} rang${traits.length > 1 ? 's' : ''} tracé${traits.length > 1 ? 's' : ''}.`}</Note>
        {traits.length > 0 && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Note>Ton dessin en 3D :</Note>
            <Vue3D largeur={Math.min(largeur, 260)} traits={traits} styleTraits={style} />
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Bouton titre="Annuler le dernier" variante="contour" desactive={traits.length === 0} onPress={() => setTraits((t) => t.slice(0, -1))} />
          <Bouton titre="Tout effacer" variante="contour" desactive={traits.length === 0} onPress={() => setTraits([])} />
        </View>
        <View style={{ width: '100%', gap: 12 }}>
          <Champ nom="Style des rangs">
            <Puces options={[{ valeur: 'tresses', nom: 'Tresses collées' }, { valeur: 'flat', nom: 'Flat twists' }, { valeur: 'barrel', nom: 'Barrel twists' }]} valeur={style} onChange={setStyle} />
          </Champ>
          <TextInput style={s.saisie} value={nom} onChangeText={setNom} placeholder="Nom du modèle (facultatif)" placeholderTextColor="#B5A598" accessibilityLabel="Nom du modèle" />
          <Bouton titre="Enregistrer le dessin" onPress={enregistrer} desactive={traits.length === 0} />
        </View>
      </View>
    </ScrollView>
  );
}
