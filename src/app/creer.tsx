import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Apercu } from '@/composants/Apercu';
import { Bouton, C, Carte, Champ, Compteur, Ecran, Note, Puces, s } from '@/composants/ui';
import { tracer } from '@/lib/geometrie';
import { enregistrerModele, nouvelId, useDonnees } from '@/lib/stockage';
import { MOTIFS, ORDRE_STYLES, PERLES, STYLES, aUnMotif, ficheParDefaut } from '@/lib/styles';
import { Fiche, Motif, StyleId } from '@/lib/types';

function Interrupteur({ nom, valeur, onChange }: { nom: string; valeur: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
      <Text style={{ fontSize: 16, color: C.texte }}>{nom}</Text>
      <Switch value={valeur} onValueChange={onChange} accessibilityLabel={nom} trackColor={{ true: C.or, false: '#D9CFC5' }} thumbColor="#fff" {...({ activeThumbColor: '#fff' } as object)} />
    </View>
  );
}

export default function Creer() {
  const params = useLocalSearchParams<{ style?: string; id?: string; rangs?: string }>();
  const { modeles, pret } = useDonnees();
  const existant = params.id ? modeles.find((m) => m.id === params.id) : undefined;
  const styleInitial = (ORDRE_STYLES as string[]).includes(params.style ?? '') ? (params.style as StyleId) : 'tresses';
  const [fiche, setFiche] = useState<Fiche>(() => {
    const d = ficheParDefaut(styleInitial);
    const n = Number(params.rangs);
    const info = STYLES[styleInitial];
    return Number.isFinite(n) && n > 0 ? { ...d, rangs: Math.max(info.min, Math.min(info.max, Math.round(n))) } : d;
  });
  const [nom, setNom] = useState('');
  const [charge, setCharge] = useState(false);
  const { width } = useWindowDimensions();

  // Quand on modifie un modèle existant, on repart de sa fiche.
  useEffect(() => {
    if (pret && existant?.fiche && !charge) {
      setFiche(existant.fiche);
      setNom(existant.nom);
      setCharge(true);
    }
  }, [pret, existant, charge]);

  const maj = (p: Partial<Fiche>) => setFiche((f) => ({ ...f, ...p }));
  const info = STYLES[fiche.style];
  const total = tracer(fiche).total;
  const changerStyle = (style: StyleId) => {
    const d = ficheParDefaut(style);
    setFiche((f) => ({ ...d, genre: f.genre, degrade: f.degrade, perles: f.perles || d.perles, couleurPerles: f.couleurPerles, details: f.details }));
  };

  const enregistrer = async () => {
    const id = existant?.id ?? nouvelId();
    await enregistrerModele({
      id,
      nom: nom.trim() || `${info.nom}, ${fiche.rangs} ${info.unite}`,
      type: 'fiche',
      creeLe: existant?.creeLe ?? Date.now(),
      modifieLe: Date.now(),
      fiche,
      image: existant?.image,
    });
    router.replace({ pathname: '/modele/[id]', params: { id } });
  };

  return (
    <Ecran>
      <Carte style={{ alignItems: 'center' }}>
        <Apercu
          largeur={Math.min(width - 64, 300)}
          fiche={fiche}
          legende={fiche.style === 'vanilles' ? `${total} vanilles à faire` : fiche.style === 'fulani' ? `${total} nattes à faire : la centrale (C), puis ${fiche.rangs} devant et ${fiche.rangs} derrière de chaque côté` : `${total} ${info.unite}, numérotés dans l’ordre sur le schéma`}
        />
      </Carte>

      <Carte>
        <Champ nom="Style">
          <Puces options={ORDRE_STYLES.map((id) => ({ valeur: id, nom: STYLES[id].nom }))} valeur={fiche.style} onChange={changerStyle} />
        </Champ>
        <Champ nom={`Nombre de ${info.unite}`}>
          <Compteur valeur={fiche.rangs} min={info.min} max={info.max} unite={info.unite} onChange={(rangs) => maj({ rangs })} />
        </Champ>
        {aUnMotif(fiche.style) && (
          <Champ nom="Direction">
            <Puces options={(Object.keys(MOTIFS) as Motif[]).map((m) => ({ valeur: m, nom: MOTIFS[m] }))} valeur={fiche.motif} onChange={(motif) => maj({ motif })} />
          </Champ>
        )}
        {fiche.style === 'vanilles' ? (
          <Champ nom="Forme des sections">
            <Puces options={[{ valeur: 'carre', nom: 'Carrées' }, { valeur: 'brique', nom: 'En briques' }]} valeur={fiche.sections} onChange={(sections) => maj({ sections })} />
          </Champ>
        ) : (
          <Champ nom="Épaisseur">
            <Puces options={[{ valeur: 'fine', nom: 'Fines' }, { valeur: 'moyenne', nom: 'Moyennes' }, { valeur: 'grosse', nom: 'Grosses' }]} valeur={fiche.epaisseur} onChange={(epaisseur) => maj({ epaisseur })} />
          </Champ>
        )}
        <Champ nom="Longueur">
          <Puces options={[{ valeur: 'court', nom: 'Court' }, { valeur: 'mi-long', nom: 'Mi-long' }, { valeur: 'long', nom: 'Long' }]} valeur={fiche.longueur} onChange={(longueur) => maj({ longueur })} />
        </Champ>
        <Interrupteur nom="Côtés en dégradé" valeur={fiche.degrade} onChange={(degrade) => maj({ degrade })} />
        <Interrupteur nom="Perles" valeur={fiche.perles} onChange={(perles) => maj({ perles })} />
        {fiche.perles && <Puces options={PERLES.map((p) => ({ valeur: p.couleur, nom: p.nom, couleur: p.couleur }))} valeur={fiche.couleurPerles} onChange={(couleurPerles) => maj({ couleurPerles })} />}
      </Carte>

      <Carte>
        <Champ nom="Pour l’image réaliste">
          <Puces options={[{ valeur: 'homme', nom: 'Homme' }, { valeur: 'femme', nom: 'Femme' }]} valeur={fiche.genre} onChange={(genre) => maj({ genre })} />
        </Champ>
        <Champ nom="Détails en plus (facultatif)">
          <TextInput style={s.saisie} value={fiche.details} onChangeText={(details) => maj({ details })} placeholder="Par exemple : barbe courte, mèches blondes" placeholderTextColor="#B5A598" accessibilityLabel="Détails en plus" />
        </Champ>
        <Champ nom="Nom du modèle">
          <TextInput style={s.saisie} value={nom} onChangeText={setNom} placeholder={`${info.nom}, ${fiche.rangs} ${info.unite}`} placeholderTextColor="#B5A598" accessibilityLabel="Nom du modèle" />
        </Champ>
      </Carte>

      <Bouton titre={existant ? 'Enregistrer les changements' : 'Enregistrer le modèle'} onPress={enregistrer} />
    </Ecran>
  );
}
