# Modèles de coiffure

Une application (téléphone et web) pour créer des modèles de coiffures : tresses collées, flat twists, barrel twists, vanilles et fulani.

## Ce que fait l'app

- **Créer un modèle** : on choisit un style, le nombre de rangs, la direction, l'épaisseur, la longueur, les perles, le dégradé. L'app construit le **modèle 3D** elle-même : un buste blanc façon tête de mannequin de coiffeur, que l'on tourne avec le doigt, avec les tresses, torsades et vanilles posées dessus. Le **schéma numéroté** vu de dessus reste disponible dans le second onglet, pour compter les rangs. Les deux viennent du même calcul : le nombre de rangs est toujours exact.
- **Dessiner à la main** : on trace chaque rang avec le doigt ou la souris sur la tête.
- **Image réaliste** : l'IA (GPT Image, OpenAI) crée une photo à partir du modèle, à comparer avec le schéma.
- **Combiner des photos** : l'IA (Gemini) mélange deux photos de coiffures en une seule.
- **Étapes** : chaque modèle donne la marche à suivre pour se coiffer.
- **Mes modèles** : tout est enregistré sur l'appareil.

Les schémas et le dessin fonctionnent sans aucun compte. Les images par IA demandent une clé OpenAI et une clé Gemini, à coller dans l'écran Réglages. Les clés restent sur l'appareil.

## Lancer l'app

```bash
npm install
npm run web        # dans le navigateur
npx expo start     # sur téléphone, avec l'app Expo Go (scanner le QR code)
```

## Organisation du code

- `src/app/` : les écrans (accueil, créer, dessin, combiner, modèle, réglages).
- `src/composants/Vue3D.tsx` : la vue 3D (three.js + react-three-fiber), la rotation et les vues Face / Profil / Dos / Dessus.
- `src/composants/Apercu.tsx` : la bascule entre le modèle 3D et le schéma numéroté.
- `src/composants/Schema.tsx` : le dessin du schéma (SVG), vu de dessus.
- `src/lib/geometrie.ts` : le calcul du tracé des rangs à partir de la fiche (source unique, en 2D).
- `src/lib/tete3d.ts` : la forme de la tête et du buste en 3D, et le passage du schéma vu de dessus au crâne en volume.
- `src/lib/volume3d.ts` : la fabrication des tresses, torsades, vanilles et perles en 3D.
- `src/lib/prompt.ts` : le texte envoyé à l'IA, construit à partir de la fiche.
- `src/lib/etapes.ts` : les étapes pour réaliser la coiffure.
- `src/lib/ia.ts` : les appels à OpenAI et Gemini.
- `src/lib/stockage.ts`, `src/lib/images*.ts` : l'enregistrement des modèles et des images.

## État des vérifications

- Version web : testée dans un navigateur (création, modèle 3D dans les cinq styles, dessin, enregistrement, réglages). Les appels IA ont été testés avec de fausses réponses, pas encore avec de vraies clés.
- Version téléphone : le code est commun (la 3D passe par `expo-gl`), mais elle n'a pas encore été essayée sur un vrai téléphone. La 3D demande un *development build* ou Expo Go avec `expo-gl` ; sur l'accueil, seuls les huit premiers modèles ont un aperçu 3D, les suivants gardent le schéma pour rester fluides.

## Mise en ligne

À chaque envoi sur la branche `main`, `.github/workflows/site.yml` construit le site et le publie sur GitHub Pages (à activer dans les réglages du dépôt : Pages, source « GitHub Actions »).
