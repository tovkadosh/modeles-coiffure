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
- `src/lib/reference.ts` : les fiches de référence des 5 coiffures (ce que c'est, les signes visibles, les confusions à éviter). C'est la source de vérité, pour la génération comme pour la reconnaissance.
- `src/lib/reconnaissance.ts` : photo → famille de coiffure, avec explication.
- `src/lib/ecole.ts` : les exemples corrigés par l'utilisateur et ses notes par style.
- `src/lib/etapes.ts` : les étapes pour réaliser la coiffure.
- `src/lib/ia.ts` : les appels à OpenAI et Gemini.
- `src/lib/stockage.ts`, `src/lib/images*.ts` : l'enregistrement des modèles et des images.

## Reconnaître une coiffure, et améliorer l'IA

L'écran « Reconnaître une photo » envoie la photo, les fiches de référence et les
exemples déjà corrigés au modèle. Il répond en JSON : la famille, sa confiance, ce
qu'il a regardé, et pourquoi ce n'est pas les autres styles.

L'utilisateur valide ou corrige. Chaque correction (photo + bonne réponse + son
explication) est gardée sur l'appareil ; les 6 plus récentes repartent avec la
question suivante, et ses notes par style passent avant les descriptions livrées
avec l'app — y compris quand l'IA crée une image.

Ce n'est pas un entraînement de modèle (impossible depuis un téléphone, et il
faudrait des milliers de photos étiquetées). C'est de l'apprentissage par
l'exemple, dans la question elle-même. Pour aller plus loin, il faudrait un jeu de
photos étiquetées et un vrai fine-tuning côté serveur.

## État des vérifications

- Reconnaissance et école : testées dans un navigateur avec de fausses réponses d'IA (choix de la photo, réponse, correction, notes, renvoi des exemples dans la question suivante).
- Version web : testée dans un navigateur (création, dessin, enregistrement, réglages). Les appels IA ont été testés avec de fausses réponses, pas encore avec de vraies clés.
- Version téléphone : le code est commun, mais elle n'a pas encore été essayée sur un vrai téléphone.

## Mise en ligne

À chaque envoi sur la branche `main`, `.github/workflows/site.yml` construit le site et le publie sur GitHub Pages (à activer dans les réglages du dépôt : Pages, source « GitHub Actions »).
