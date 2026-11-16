import React, { useEffect, useState } from 'react';
import { TextInput } from 'react-native';
import { Bouton, Carte, Champ, Ecran, Note, Titre, s } from '@/composants/ui';
import { REGLAGES_DEFAUT, enregistrerReglages, useDonnees } from '@/lib/stockage';
import { Reglages } from '@/lib/types';

export default function EcranReglages() {
  const { reglages, pret } = useDonnees();
  const [r, setR] = useState<Reglages>(reglages);
  const [ok, setOk] = useState(false);
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
        <Titre>Combinaison de photos (Gemini)</Titre>
        <Note>Crée une clé sur aistudio.google.com, bouton « Get API key ».</Note>
        {champ('Clé Gemini', 'cleGemini', 'AIza…', true)}
        {champ('Modèle', 'modeleGemini', REGLAGES_DEFAUT.modeleGemini)}
      </Carte>
      <Bouton
        titre={ok ? 'Enregistré' : 'Enregistrer'}
        onPress={async () => {
          await enregistrerReglages({ ...r, modeleOpenAI: r.modeleOpenAI || REGLAGES_DEFAUT.modeleOpenAI, modeleGemini: r.modeleGemini || REGLAGES_DEFAUT.modeleGemini });
          setOk(true);
        }}
      />
    </Ecran>
  );
}
