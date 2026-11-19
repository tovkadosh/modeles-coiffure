import { Canvas, useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import * as THREE from 'three';
import { geometrieBuste, geometrieTete, placementBouche, placementNez, placementOeil, placementOreille } from '@/lib/tete3d';
import { construire } from '@/lib/volume3d';
import { Fiche, StyleId, Trait } from '@/lib/types';

/** Les couleurs d'une tête de mannequin de coiffeur : buste blanc, cheveux noirs. */
const BUSTE = '#E9E9EC';
const CREUX = '#1C1B1F';
const CHEVEU = '#191114';
const RASE = '#9C9BA2';
const FOND = '#EFEBE5';

type Props = {
  largeur: number;
  hauteur?: number;
  fiche?: Fiche;
  traits?: Trait[];
  styleTraits?: StyleId;
  /** Vue fixe (vignettes) : pas de rotation ni de boutons. */
  fige?: boolean;
  /** Angle de départ, en degrés : 0 de face, 90 de profil, 180 de dos. */
  angleDepart?: number;
};

type Vue = { lacet: number; tangage: number };

/** La peau du mannequin : un blanc laqué, qui prend la lumière comme du plâtre verni. */
function Plastique({ couleur = BUSTE }: { couleur?: string }) {
  return <meshPhysicalMaterial color={couleur} roughness={0.34} metalness={0} clearcoat={0.7} clearcoatRoughness={0.3} sheen={0.3} sheenColor="#FFFFFF" />;
}

function Tete() {
  const tete = useMemo(geometrieTete, []);
  const buste = useMemo(geometrieBuste, []);
  const oreilleG = placementOreille(-1);
  const oreilleD = placementOreille(1);
  const nez = placementNez();
  const oeilG = placementOeil(-1);
  const oeilD = placementOeil(1);
  const bouche = placementBouche();
  return (
    <group>
      <mesh geometry={tete}>
        <Plastique />
      </mesh>
      <mesh geometry={buste}>
        <Plastique />
      </mesh>
      {[oreilleG, oreilleD].map((o, i) => (
        <mesh key={i} position={o.position} scale={o.echelle}>
          <sphereGeometry args={[1, 18, 14]} />
          <Plastique />
        </mesh>
      ))}
      <mesh position={[nez.position[0], nez.position[1] - 0.02, nez.position[2] - 0.08]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.15]}>
        <coneGeometry args={[0.095, 0.2, 22]} />
        <Plastique />
      </mesh>
      {/* Les yeux sont creusés en sombre, comme sur les têtes d'entraînement. */}
      {[oeilG, oeilD].map((o, i) => (
        <mesh key={i} position={o.position} rotation={[0, 0, (i === 0 ? 1 : -1) * 0.12]} scale={[0.085, 0.042, 0.03]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={CREUX} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[bouche.position[0], bouche.position[1], bouche.position[2] - 0.055]} scale={[0.145, 0.055, 0.055]}>
        <sphereGeometry args={[1, 20, 14]} />
        <Plastique couleur="#DCDADF" />
      </mesh>
    </group>
  );
}

function Cheveux({ fiche, traits, styleTraits, couleurPerles }: { fiche?: Fiche; traits?: Trait[]; styleTraits: StyleId; couleurPerles: string }) {
  const clef = JSON.stringify([fiche, traits?.length, traits?.map((t) => t.length), styleTraits]);
  const coiffure = useMemo(() => construire(fiche, traits, styleTraits), [clef]);
  useEffect(() => () => {
    coiffure.cheveux.dispose();
    coiffure.perles?.dispose();
    coiffure.rasage?.dispose();
  }, [coiffure]);
  return (
    <group>
      {coiffure.rasage && (
        <mesh geometry={coiffure.rasage}>
          <meshStandardMaterial color={RASE} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh geometry={coiffure.cheveux}>
        <meshPhysicalMaterial color={CHEVEU} roughness={0.46} metalness={0.05} clearcoat={0.35} clearcoatRoughness={0.4} />
      </mesh>
      {coiffure.perles && (
        <mesh geometry={coiffure.perles}>
          <meshStandardMaterial color={couleurPerles} roughness={0.22} metalness={0.45} />
        </mesh>
      )}
    </group>
  );
}

/** Tourne la tête selon la vue demandée, en rattrapant doucement l'angle visé. */
function Pivot({ vue, children }: { vue: React.MutableRefObject<Vue>; children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = g.current;
    if (!o) return;
    o.rotation.y += (vue.current.lacet - o.rotation.y) * 0.18;
    o.rotation.x += (vue.current.tangage - o.rotation.x) * 0.18;
  });
  return <group ref={g}>{children}</group>;
}

const rad = (deg: number) => (deg * Math.PI) / 180;

const VUES: { nom: string; lacet: number; tangage: number }[] = [
  { nom: 'Face', lacet: 0, tangage: 0 },
  { nom: 'Profil', lacet: rad(-90), tangage: 0 },
  { nom: 'Dos', lacet: rad(180), tangage: 0 },
  { nom: 'Dessus', lacet: 0, tangage: rad(68) },
];

/** La coiffure en 3D : une tête que l'on peut tourner, avec les rangs posés dessus. */
export function Vue3D({ largeur, hauteur, fiche, traits, styleTraits = 'tresses', fige = false, angleDepart = -28 }: Props) {
  const h = hauteur ?? largeur * 1.15;
  const depart = { lacet: rad(angleDepart), tangage: rad(fige ? 18 : 12) };
  const vue = useRef<Vue>({ ...depart });
  const [actif, setActif] = useState<string | null>(null);
  const dernier = useRef<{ x: number; y: number } | null>(null);

  const bouger = (e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    const d = dernier.current;
    if (d) {
      vue.current = {
        lacet: vue.current.lacet + (pageX - d.x) * 0.012,
        tangage: Math.max(rad(-35), Math.min(rad(80), vue.current.tangage + (pageY - d.y) * 0.009)),
      };
      setActif(null);
    }
    dernier.current = { x: pageX, y: pageY };
  };

  return (
    <View style={{ gap: 8, alignItems: 'center' }}>
      <View style={{ width: largeur, height: h, borderRadius: 16, overflow: 'hidden', backgroundColor: FOND }}>
        <Canvas
          style={{ width: largeur, height: h }}
          camera={{ position: [0, 0, fige ? 6 : 6.4], fov: 32 }}
          gl={{ antialias: true }}
          dpr={typeof window !== 'undefined' ? Math.min(2, (window.devicePixelRatio as number) || 1) : 1}
        >
          <color attach="background" args={[FOND]} />
          {/* Lumière de studio : une dominante en haut à droite, un remplissage
              doux à gauche, et un contre-jour qui détache la nuque du fond. */}
          <ambientLight intensity={0.9} />
          <hemisphereLight args={['#FFFFFF', '#8C8A93', 1.1]} />
          <directionalLight position={[3, 4.2, 3.4]} intensity={2.4} />
          <directionalLight position={[-3.6, 0.8, 2]} intensity={0.9} color="#E8ECF4" />
          <directionalLight position={[-1.4, 2.2, -4]} intensity={1.5} color="#FFFFFF" />
          <group position={[0, fige ? 0.3 : 0.42, 0]}>
          <Pivot vue={vue}>
            <Tete />
            <Cheveux fiche={fiche} traits={traits} styleTraits={styleTraits} couleurPerles={fiche?.couleurPerles ?? '#D9A520'} />
          </Pivot>
          </group>
        </Canvas>
        {!fige && (
          <View
            accessibilityLabel="Tourner la tête"
            style={[{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }, { touchAction: 'none', cursor: 'grab' } as object]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={() => {
              dernier.current = null;
            }}
            onResponderMove={bouger}
            onResponderRelease={() => {
              dernier.current = null;
            }}
            onResponderTerminate={() => {
              dernier.current = null;
            }}
          />
        )}
      </View>
      {!fige && (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {VUES.map((v) => (
            <Pressable
              key={v.nom}
              accessibilityRole="button"
              onPress={() => {
                vue.current = { lacet: v.lacet, tangage: v.tangage };
                setActif(v.nom);
              }}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: actif === v.nom ? '#7A3E1D' : '#EADFD3',
                backgroundColor: actif === v.nom ? '#7A3E1D' : '#FFFFFF',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: actif === v.nom ? '#FFFFFF' : '#7B6557' }}>{v.nom}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
