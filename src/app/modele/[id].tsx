import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Image, Text, View, useWindowDimensions } from 'react-native';
import { Apercu } from '@/composants/Apercu';
import { Bouton, C, Carte, Ecran, Note, Titre } from '@/composants/ui';
import { useEcole } from '@/lib/ecole';
import { etapes } from '@/lib/etapes';
import { genererImage } from '@/lib/ia';
import { enregistrerImage, supprimerImage } from '@/lib/images';
import { construirePrompt, resumeFiche } from '@/lib/prompt';
import { enregistrerModele, supprimerModele, useDonnees, useImage } from '@/lib/stockage';
import { STYLES } from '@/lib/styles';

export default function DetailModele() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { modeles, reglages, pret } = useDonnees();
  const { ecole } = useEcole();
  const m = modeles.find((x) => x.id === id);
  const uri = useImage(m?.image);
  const { width } = useWindowDimensions();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [confirmer, setConfirmer] = useState(false);

  if (!pret) return <Ecran>{null}</Ecran>;
  if (!m) {
    return (
      <Ecran>
        <Carte>
          <Note>Ce modèle n’existe plus.</Note>
          <Bouton titre="Retour à l’accueil" onPress={() => router.replace('/')} />
        </Carte>
      </Ecran>
    );
  }

  const large = width >= 640;
  const tailleVue = large ? Math.min((Math.min(width, 720) - 80) / 2, 300) : Math.min(width - 64, 320);
  const fiche = m.fiche;
  const prompt = fiche ? construirePrompt(m.type === 'dessin' ? { ...fiche, rangs: m.traits?.length ?? fiche.rangs, details: `custom braid pattern, ${fiche.details}` } : fiche, ecole.notes) : '';

  const generer = async () => {
    setErreur('');
    if (!reglages.cleOpenAI) {
      setErreur('Pour créer l’image réaliste, ajoute d’abord ta clé OpenAI dans les Réglages.');
      return;
    }
    setOccupe(true);
    try {
      const image = await genererImage(prompt, reglages);
      const ref = await enregistrerImage(image.base64, image.mime);
      if (m.image) await supprimerImage(m.image);
      await enregistrerModele({ ...m, image: ref });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'La génération a échoué.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Ecran>
      <View style={{ gap: 4 }}>
        <Titre>{m.nom}</Titre>
        <Note>{m.type === 'combinaison' ? 'Combinaison de photos' : m.type === 'dessin' ? `Dessin à la main · ${m.traits?.length ?? 0} rangs` : fiche ? `${STYLES[fiche.style].nom} · ${resumeFiche(fiche)}` : ''}</Note>
      </View>

      <Carte style={{ flexDirection: large && m.type !== 'combinaison' ? 'row' : 'column', justifyContent: 'space-around', alignItems: 'center' }}>
        {m.type !== 'combinaison' && (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '700', color: C.doux }}>LE MODÈLE</Text>
            <Apercu largeur={tailleVue} fiche={fiche} traits={m.traits} styleTraits={fiche?.style} />
          </View>
        )}
        <View style={{ alignItems: 'center', gap: 6 }}>
          <Text style={{ fontWeight: '700', color: C.doux }}>IMAGE RÉALISTE</Text>
          {uri ? (
            <Image source={{ uri }} style={{ width: tailleVue, height: tailleVue, borderRadius: 12 }} resizeMode="cover" accessibilityLabel="Image réaliste de la coiffure" />
          ) : (
            <View style={{ width: tailleVue, height: m.image ? tailleVue : 120, borderRadius: 12, backgroundColor: '#F3E6D6', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <Note style={{ textAlign: 'center' }}>{m.image ? 'Chargement…' : 'Pas encore d’image. L’IA peut en créer une à partir de ce modèle.'}</Note>
            </View>
          )}
        </View>
      </Carte>

      {m.type !== 'combinaison' && (
        <>
          <Bouton titre={m.image ? 'Refaire l’image réaliste' : 'Créer l’image réaliste avec l’IA'} onPress={generer} occupe={occupe} />
          {occupe ? <Note>L’IA dessine, cela prend environ une minute.</Note> : null}
          {erreur ? (
            <Carte>
              <Text style={{ color: C.rouge, fontSize: 15 }}>{erreur}</Text>
              {!reglages.cleOpenAI && <Bouton titre="Ouvrir les Réglages" variante="contour" onPress={() => router.push('/reglages')} />}
            </Carte>
          ) : null}
          <Note>L’IA ne respecte pas toujours le nombre de rangs. Pour compter, fie-toi au modèle 3D ou au schéma numéroté.</Note>
        </>
      )}

      {fiche && m.type === 'fiche' && (
        <Carte>
          <Titre>Comment la réaliser</Titre>
          {etapes(fiche).map((e, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={{ fontWeight: '700', color: C.brun, fontSize: 16, width: 22 }}>{i + 1}.</Text>
              <Text style={{ flex: 1, fontSize: 16, lineHeight: 23, color: C.texte }}>{e}</Text>
            </View>
          ))}
        </Carte>
      )}
      {m.type === 'combinaison' && m.consigne ? (
        <Carte>
          <Note>Consigne donnée à l’IA : {m.consigne}</Note>
        </Carte>
      ) : null}

      {m.type === 'fiche' && <Bouton titre="Modifier le modèle" variante="contour" onPress={() => router.push({ pathname: '/creer', params: { id: m.id } })} />}
      {m.type === 'dessin' && <Bouton titre="Modifier le dessin" variante="contour" onPress={() => router.push({ pathname: '/dessin', params: { id: m.id } })} />}
      <Bouton
        titre={confirmer ? 'Confirmer la suppression' : 'Supprimer le modèle'}
        variante={confirmer ? 'danger' : 'contour'}
        onPress={async () => {
          if (!confirmer) return setConfirmer(true);
          await supprimerModele(m.id);
          router.replace('/');
        }}
      />
    </Ecran>
  );
}
