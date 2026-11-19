import React, { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { Bouton, Carte, Champ, Ecran, Note, Titre, s } from '@/composants/ui';
import { modelesQuiLisentLesImages } from '@/lib/ia';
import { REGLAGES_DEFAUT, enregistrerReglages, useDonnees } from '@/lib/stockage';
import { Reglages } from '@/lib/types';

export default function EcranReglages() {
  const { reglages, pret } = useDonnees();
  const [r, setR] = useState<Reglages>(reglages);
  const [ok, setOk] = useState(false);
  const [cherche, setCherche] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (pret) setR(reglages);
  }, [pret, reglages]);
  const maj = (p: Partial<Reglages>) => {
    setOk(false);
    setR((x) => ({ ...x, ...p }));
  };
  const champ = (nom: string, cle: keyof Reglages, placeholder: string, secret = false) => (
    <Champ nom={nom}>
      <TextInput style={s.saisie} value={r[cle]} onChangeText={(v) => maj({ [cle]: v.trim() })} placeholder={placeholder} placeholderTextColor="#B5A598" autoCapitalize="none" autoCorrect={false} secureTextEntry={secret} accessibilityLabel={nom} />
    </Champ>
  );
  return (
    <Ecran>
      <Note>Les schémas et le dessin à la main fonctionnent sans rien régler. Les clés ci-dessous servent seulement aux images faites par l’IA. Elles restent sur cet appareil.</Note>
      <Carte>
        <Titre>Image réaliste (OpenAI)</Titre>
        <Note>Crée une clé sur platform.openai.com, rubrique « API keys ». Ce service est payant à l’usage (quelques centimes par image).</Note>
        {champ('Clé OpenAI', 'cleOpenAI', 'sk-…', true)}
        {champ('Modèle', 'modeleOpenAI', REGLAGES_DEFAUT.modeleOpenAI)}
      </Carte>
      <Carte>
        <Titre>Reconnaissance de photos (OpenAI)</Titre>
        <Note>Même clé que ci-dessus, mais un autre modèle : celui qui sait regarder une photo et répondre en texte. Si le nom n’est pas le bon, le bouton va chercher la liste de ton compte.</Note>
        {champ('Modèle qui lit les photos', 'modeleVision', REGLAGES_DEFAUT.modeleVision)}
        <Bouton
          titre={cherche ? 'Recherche…' : 'Trouver un modèle qui lit les photos'}
          variante="contour"
          occupe={cherche}
          onPress={async () => {
            setMessage('');
            if (!r.cleOpenAI) return setMessage('Ajoute d’abord ta clé OpenAI.');
            setCherche(true);
            try {
              const liste = await modelesQuiLisentLesImages(r.cleOpenAI);
              if (!liste.length) setMessage('Aucun modèle trouvé sur ce compte.');
              else {
                maj({ modeleVision: liste[0] });
                setMessage(`Choisi : ${liste[0]}. Autres possibles : ${liste.slice(1, 4).join(', ') || 'aucun'}.`);
              }
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'La recherche a échoué.');
            } finally {
              setCherche(false);
            }
          }}
        />
        {message ? <Note>{message}</Note> : null}
      </Carte>
      <Carte>
        <Titre>Combinaison de photos (Gemini)</Titre>
        <Note>Crée une clé sur aistudio.google.com, bouton « Get API key ».</Note>
        {champ('Clé Gemini', 'cleGemini', 'AIza…', true)}
        {champ('Modèle', 'modeleGemini', REGLAGES_DEFAUT.modeleGemini)}
      </Carte>
      <Bouton
        titre={ok ? 'Enregistré' : 'Enregistrer'}
        onPress={async () => {
          await enregistrerReglages({ ...r, modeleOpenAI: r.modeleOpenAI || REGLAGES_DEFAUT.modeleOpenAI, modeleVision: r.modeleVision || REGLAGES_DEFAUT.modeleVision, modeleGemini: r.modeleGemini || REGLAGES_DEFAUT.modeleGemini });
          setOk(true);
        }}
      />
    </Ecran>
  );
}
