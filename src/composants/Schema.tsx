import React, { useMemo } from 'react';
import { Platform } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { chemin, Ligne, TETE, tracer, tracerDessin, VB, zoneCheveux } from '@/lib/geometrie';
import { Fiche, StyleId, Trait } from '@/lib/types';

const PEAU = '#D8A47A';
const PEAU_BORD = '#A9744C';
const CHEVEU = '#2E1B11';
const REFLET = '#7A5540';
const POLICE = Platform.OS === 'web' ? 'system-ui, sans-serif' : undefined;

type Props = {
  largeur: number;
  fiche?: Fiche;
  /** Dessin à la main : remplace le tracé calculé. */
  traits?: Trait[];
  styleTraits?: StyleId;
  numeros?: boolean;
};

function Rang({ ligne, style, w }: { ligne: Ligne; style: StyleId; w: number }) {
  const d = chemin(ligne.pts);
  // Chaque style a sa texture : chevrons serrés (tresse), brins longs (flat twist), rouleaux (barrel).
  const motif = style === 'tresses' ? [w * 0.55, w * 0.5] : style === 'barrel' ? [w * 0.9, w * 0.45] : [w * 1.3, w * 0.4];
  const fin = style === 'barrel' ? w * 0.62 : style === 'flat' ? w * 0.3 : w * 0.42;
  return (
    <G>
      <Path d={d} stroke={CHEVEU} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d={d} stroke={REFLET} strokeWidth={fin} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={motif} fill="none" />
    </G>
  );
}

/** Le schéma d'une coiffure, dessiné par l'app : le nombre de rangs est toujours exact. */
export function Schema({ largeur, fiche, traits, styleTraits = 'tresses', numeros = true }: Props) {
  const trace = useMemo(() => (fiche && !traits ? tracer(fiche) : null), [fiche, traits]);
  const dessin = useMemo(() => (traits ? tracerDessin(traits) : null), [traits]);
  const zone = trace?.zone ?? zoneCheveux(false);
  const degrade = !!fiche?.degrade && !traits;
  const style = traits ? styleTraits : fiche?.style ?? 'tresses';
  const lignes = dessin ?? trace?.lignes ?? [];
  const w = dessin ? (style === 'barrel' ? 13 : 9) : trace?.largeur ?? 8;
  const couleurPerle = fiche?.couleurPerles ?? '#D9A520';
  const { cx, cy, rx, ry } = TETE;

  return (
    <Svg width={largeur} height={(largeur * VB.h) / VB.w} viewBox={`0 0 ${VB.w} ${VB.h}`}>
      <Defs>
        <ClipPath id="cheveux">
          <Ellipse cx={zone.cx} cy={zone.cy} rx={zone.rx} ry={zone.ry} />
        </ClipPath>
      </Defs>
      {/* Oreilles et nez, pour se repérer */}
      <Ellipse cx={cx - rx - 3} cy={cy + 8} rx={9} ry={20} fill={PEAU} stroke={PEAU_BORD} strokeWidth={1.5} />
      <Ellipse cx={cx + rx + 3} cy={cy + 8} rx={9} ry={20} fill={PEAU} stroke={PEAU_BORD} strokeWidth={1.5} />
      <Polygon points={`${cx - 11},${cy - ry + 4} ${cx},${cy - ry - 13} ${cx + 11},${cy - ry + 4}`} fill={PEAU} stroke={PEAU_BORD} strokeWidth={1.5} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={PEAU} stroke={PEAU_BORD} strokeWidth={1.5} />
      {degrade && (
        <G>
          <Ellipse cx={cx} cy={cy} rx={rx - 2} ry={ry - 2} fill="#8C6A54" opacity={0.45} />
          <Ellipse cx={zone.cx} cy={zone.cy} rx={zone.rx + 4} ry={zone.ry + 4} fill={PEAU} />
        </G>
      )}

      {trace && trace.cellules.length > 0 && (
        <G clipPath="url(#cheveux)">
          {trace.cellules.map((c, i) => (
            <G key={i}>
              <Polygon points={c.contour.map((p) => p.join(',')).join(' ')} fill="#4A2F20" stroke={PEAU} strokeWidth={2} />
              <Circle cx={c.centre[0]} cy={c.centre[1]} r={trace.largeur * 0.27} fill={CHEVEU} />
              <Path
                d={`M${c.centre[0] - trace.largeur * 0.16} ${c.centre[1] + trace.largeur * 0.1} Q${c.centre[0]} ${c.centre[1] - trace.largeur * 0.3} ${c.centre[0] + trace.largeur * 0.16} ${c.centre[1] + trace.largeur * 0.1}`}
                stroke={REFLET}
                strokeWidth={Math.max(1, trace.largeur * 0.07)}
                fill="none"
              />
              {fiche?.perles && <Circle cx={c.centre[0]} cy={c.centre[1] + trace.largeur * 0.3} r={Math.max(1.6, trace.largeur * 0.09)} fill={couleurPerle} stroke="#00000055" strokeWidth={0.5} />}
            </G>
          ))}
        </G>
      )}

      {lignes.map((l, i) => (
        <Rang key={i} ligne={l} style={style} w={w} />
      ))}
      {lignes.map((l, i) =>
        l.perle ? <Circle key={`p${i}`} cx={l.perle[0]} cy={l.perle[1]} r={Math.max(3, w * 0.55)} fill={couleurPerle} stroke="#00000066" strokeWidth={0.8} /> : null,
      )}
      {numeros &&
        lignes.map((l, i) =>
          l.label && l.posLabel ? (
            <SvgText key={`n${i}`} x={l.posLabel[0]} y={l.posLabel[1] + 3} fontSize={lignes.length > 16 ? 7.5 : 9} fontWeight="bold" fontFamily={POLICE} fill="#5B3A26" textAnchor="middle">
              {l.label}
            </SvgText>
          ) : null,
        )}

      {numeros && (
        <G>
          <SvgText x={cx} y={14} fontSize={10} fill="#8A6F5E" textAnchor="middle" fontWeight="bold" fontFamily={POLICE}>
            FRONT
          </SvgText>
          <SvgText x={cx} y={VB.h - 5} fontSize={10} fill="#8A6F5E" textAnchor="middle" fontWeight="bold" fontFamily={POLICE}>
            NUQUE
          </SvgText>
        </G>
      )}
    </Svg>
  );
}
