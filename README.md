# Modèles de coiffure

Une application (téléphone et web) pour créer des modèles de coiffures : tresses collées, flat twists, barrel twists, vanilles et fulani.

## Ce que fait l'app

- **Créer un modèle** : on choisit un style, le nombre de rangs, la direction, l'épaisseur, les perles, le dégradé. L'app dessine le **schéma** elle-même, vu de dessus, avec les rangs numérotés. Le nombre de rangs est donc toujours exact.
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
- `src/composants/Schema.tsx` : le dessin du schéma (SVG).
- `src/lib/geometrie.ts` : le calcul du tracé des rangs à partir de la fiche.
- `src/lib/prompt.ts` : le texte envoyé à l'IA, construit à partir de la fiche.
- `src/lib/etapes.ts` : les étapes pour réaliser la coiffure.
- `src/lib/ia.ts` : les appels à OpenAI et Gemini.
- `src/lib/stockage.ts`, `src/lib/images*.ts` : l'enregistrement des modèles et des images.

## État des vérifications

- Version web : testée dans un navigateur (création, dessin, enregistrement, réglages). Les appels IA ont été testés avec de fausses réponses, pas encore avec de vraies clés.
- Version téléphone : le code est commun, mais elle n'a pas encore été essayée sur un vrai téléphone.

## Mise en ligne

À chaque envoi sur la branche `main`, `.github/workflows/site.yml` construit le site et le publie sur GitHub Pages (à activer dans les réglages du dépôt : Pages, source « GitHub Actions »).
