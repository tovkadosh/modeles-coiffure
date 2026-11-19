import { StyleId } from './types';

/**
 * Les « fiches de référence ».
 *
 * Le problème de départ : les prompts ne donnaient qu'une ligne par coiffure
 * (« cornrows », « flat twists »…). Or ces coiffures se ressemblent beaucoup sur
 * une photo, et une IA qui ne reçoit qu'un mot choisit la coiffure la plus
 * fréquente sur Internet (presque toujours les tresses collées).
 *
 * Chaque fiche dit donc trois choses : ce que c'est, à quoi on le reconnaît,
 * et surtout avec quoi il ne faut PAS le confondre. C'est ce dernier point qui
 * change le plus les résultats, en génération comme en reconnaissance.
 */
export type Confusion = { avec: StyleId; difference: string };

export type Reference = {
  /** Une phrase, en français simple. */
  enBref: string;
  /** Comment la coiffure est faite, geste par geste. */
  commentCestFait: string;
  /** Ce qu'on voit sur une photo : les signes qui ne trompent pas. */
  signes: string[];
  /** Les erreurs classiques, avec la différence à regarder. */
  pasConfondre: Confusion[];
  /** Description envoyée aux IA (en anglais : elles la suivent mieux). */
  anglais: string;
  /** Ce que l'image ne doit surtout pas montrer (en anglais). */
  pasCeci: string[];
};

export const REFERENCES: Record<StyleId, Reference> = {
  tresses: {
    enBref: 'Des nattes à trois mèches, serrées contre le crâne, qui suivent une raie bien nette.',
    commentCestFait:
      'On sépare une raie, on prend trois mèches et on tresse par en dessous en ajoutant des cheveux à chaque passage. La natte reste collée au cuir chevelu du début à la fin et forme un relief en creux.',
    signes: [
      'La natte est en relief sur le crâne, comme une petite corde posée dans un sillon.',
      'On voit des chevrons, des petits V ou des épis qui se suivent le long du rang (c’est la marque des trois mèches).',
      'Les raies entre les rangs sont droites et le cuir chevelu est bien visible entre deux rangs.',
      'La natte grossit du front vers la nuque, puisqu’on ajoute des cheveux en avançant.',
    ],
    pasConfondre: [
      { avec: 'flat', difference: 'Trois mèches donnent des V ; deux mèches (flat twists) donnent une spirale lisse, en escalier penché.' },
      { avec: 'barrel', difference: 'Les tresses collées restent plaquées ; les barrel twists sont grosses et se décollent du crâne.' },
      { avec: 'fulani', difference: 'Le fulani, ce sont des tresses collées disposées d’une façon précise (raie du milieu + nattes vers le visage + perles), pas une technique différente.' },
    ],
    anglais:
      'cornrows: three-strand underhand braids attached flat to the scalp, each row raised like a small rope sitting in its own clean parting, with the little V / chevron pattern of a three-strand braid clearly visible along every row, scalp showing between the rows',
    pasCeci: ['no two-strand twists', 'no loose hanging twists', 'no chunky raised rope twists'],
  },
  flat: {
    enBref: 'Deux mèches enroulées l’une sur l’autre, à plat sur le crâne.',
    commentCestFait:
      'On prend deux mèches seulement et on les enroule l’une par-dessus l’autre en ajoutant des cheveux au fur et à mesure, en restant collé au crâne. C’est plus rapide qu’une tresse et le rendu est plus souple.',
    signes: [
      'Le rang ressemble à une corde à deux brins : des traits penchés réguliers, pas des V.',
      'Le relief est plus plat et plus lisse qu’une tresse collée, avec des bords arrondis.',
      'Les raies sont souvent moins nettes, et les rangs ont tendance à faire des vagues.',
      'Les pointes se terminent souvent en petite vanille libre ou en chignon.',
    ],
    pasConfondre: [
      { avec: 'tresses', difference: 'Regarde le motif : spirale penchée = flat twist, chevrons en V = tresse collée.' },
      { avec: 'barrel', difference: 'Même geste à deux mèches, mais la flat twist est plaquée et fine, la barrel est grosse et bombée.' },
      { avec: 'vanilles', difference: 'La flat twist suit le crâne ; la vanille part d’une section et pend librement.' },
    ],
    anglais:
      'flat twists: two-strand twists done flat against the scalp, each row looking like a smooth two-ply rope with slanted spiral ridges (NOT the V-shaped chevrons of a braid), lying flatter and softer than cornrows, clean parts between rows',
    pasCeci: ['not cornrows', 'no three-strand braid pattern', 'no V-shaped chevrons', 'no loose hanging twists'],
  },
  barrel: {
    enBref: 'De grosses torsades en rouleaux, qui prennent du volume et se décollent du crâne.',
    commentCestFait:
      'On travaille de grosses sections : on tord chaque section sur elle-même jusqu’à obtenir un rouleau épais, posé en rangée. Le cheveu est souvent humide ou enduit de gel pour que la torsade tienne.',
    signes: [
      'Peu de rangs, mais très épais : on compte souvent entre 4 et 8 rouleaux sur toute la tête.',
      'Les torsades sont bombées, elles font de l’ombre sur le crâne au lieu d’y être plaquées.',
      'La spirale est large et visible de loin, comme une corde de marin.',
      'Les raies entre les sections sont larges parce que les sections sont grosses.',
    ],
    pasConfondre: [
      { avec: 'flat', difference: 'Même torsion à deux mèches, mais le volume change tout : la barrel est épaisse et relevée.' },
      { avec: 'tresses', difference: 'Une barrel est tordue, pas tressée : pas de V, une grosse spirale.' },
      { avec: 'vanilles', difference: 'La barrel suit le crâne en rangées ; les vanilles pendent.' },
    ],
    anglais:
      'barrel twists (also called rope twists): few but very thick chunky two-strand twisted sections arranged in rows over the head, raised with real volume and casting shadows on the scalp instead of lying flat, wide visible spiral like a ship rope, wide parts between the thick sections',
    pasCeci: ['not thin flat twists', 'not cornrows', 'not small individual twists hanging down'],
  },
  vanilles: {
    enBref: 'Des torsades à deux mèches qui pendent librement, à partir de sections carrées ou en briques.',
    commentCestFait:
      'On quadrille toute la tête en petites sections, puis on tord chaque section sur elle-même, en deux brins, du cuir chevelu jusqu’à la pointe. Rien n’est collé au crâne : seule la racine est attachée.',
    signes: [
      'Les torsades partent du crâne et tombent : on voit leur longueur, pas un tracé sur la tête.',
      'Vu du dessus, on voit un quadrillage de raies : des carrés, ou des briques décalées.',
      'Chaque torsade est une spirale à deux brins, souvent plus fine que les barrel twists.',
      'Les pointes sont souvent bouclées ou laissées libres.',
    ],
    pasConfondre: [
      { avec: 'barrel', difference: 'Les vanilles tombent ; les barrel twists restent couchées sur la tête en rangées.' },
      { avec: 'flat', difference: 'La flat twist est plaquée sur le crâne du début à la fin, la vanille se détache dès la racine.' },
      { avec: 'tresses', difference: 'Deux brins tordus, pas trois brins tressés : pas de motif en V.' },
    ],
    anglais:
      'free-hanging two-strand twists (vanilles / Senegalese-style twists): the whole head parted into a grid of small sections, each section twisted on itself from root to tip and left hanging free, nothing braided along the scalp, the grid of parts clearly visible on top',
    pasCeci: ['no cornrows', 'no twists attached along the scalp', 'not dreadlocks'],
  },
  fulani: {
    enBref: 'La coiffure peule : une raie et une natte au milieu, des nattes vers le visage sur les côtés, et des perles.',
    commentCestFait:
      'On trace une raie au milieu avec une natte collée qui part du front vers l’arrière. De chaque côté, quelques nattes sont tressées vers le visage, et d’autres vers la nuque. On ajoute souvent des perles ou des cauris aux pointes, et quelques nattes libres encadrent le visage.',
    signes: [
      'Une natte centrale très nette, du front à l’arrière, au milieu de la tête.',
      'Des nattes penchées vers le visage sur les tempes, souvent fines.',
      'Des perles, des anneaux dorés ou des cauris aux pointes.',
      'Souvent des nattes libres qui tombent, mélangées à des rangs collés.',
    ],
    pasConfondre: [
      { avec: 'tresses', difference: 'Le fulani utilise bien des tresses collées, mais la disposition compte : raie et natte au milieu, nattes vers le visage, perles. Sans ça, ce sont de simples tresses collées.' },
      { avec: 'flat', difference: 'Le fulani est tressé, pas tordu.' },
    ],
    anglais:
      'Fulani braids: one cornrow running down the centre parting from the forehead to the back of the head, a few thin cornrows on each temple braided forward toward the face, other cornrows going back to the nape, some free hanging braids framing the face, beads or gold rings at the ends',
    pasCeci: ['not plain all-back cornrows', 'not twists'],
  },
};

/** Les 5 styles, décrits les uns par rapport aux autres : c'est ce bloc qui sert à reconnaître une photo. */
export function texteReference(notesPerso: Partial<Record<StyleId, string>> = {}): string {
  const noms: Record<StyleId, string> = {
    tresses: 'tresses (cornrows)',
    flat: 'flat (flat twists)',
    barrel: 'barrel (barrel / rope twists)',
    vanilles: 'vanilles (free two-strand twists)',
    fulani: 'fulani (Fulani braids)',
  };
  return (Object.keys(REFERENCES) as StyleId[])
    .map((id) => {
      const r = REFERENCES[id];
      const confusions = r.pasConfondre.map((c) => `  - vs ${c.avec}: ${c.difference}`).join('\n');
      const perso = notesPerso[id]?.trim();
      return [
        `### ${noms[id]}`,
        r.enBref,
        `Comment c'est fait: ${r.commentCestFait}`,
        `Signes visibles:\n${r.signes.map((s) => `  - ${s}`).join('\n')}`,
        `Ne pas confondre:\n${confusions}`,
        perso ? `Notes de l'utilisateur (prioritaires sur tout le reste):\n  ${perso}` : '',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
