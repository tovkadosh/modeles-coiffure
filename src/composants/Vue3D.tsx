import { Canvas, useFrame } from '@react-three/fiber';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, Text, View } from 'react-native';
import * as THREE from 'three';
import { geometrieCou, geometrieTete, placementBouche, placementNez, placementOeil, placementOreille } from '@/lib/tete3d';
import { construire } from '@/lib/volume3d';
import { Fiche, StyleId, Trait } from '@/lib/types';

const PEAU = '#C58A5E';
const CHEVEU = '#2A1A12';
const RASE = '#4A2F20';

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

function Tete() {
  const tete = useMemo(geometrieTete, []);
  const cou = useMemo(geometrieCou, []);
  const oreilleG = placementOreille(-1);
  const oreilleD = placementOreille(1);
  const nez = placementNez();
  const oeilG = placementOeil(-1);
  const oeilD = placementOeil(1);
  const bouche = placementBouche();
  return (
    <group>
      <mesh geometry={tete}>
        <meshStandardMaterial color={PEAU} roughness={0.78} metalness={0.02} />
      </mesh>
      <mesh geometry={cou}>
        <meshStandardMaterial color="#B87C52" roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {[oreilleG, oreilleD].map((o, i) => (
        <mesh key={i} position={o.position} scale={o.echelle}>
          <sphereGeometry args={[1, 18, 14]} />
          <meshStandardMaterial color="#B57A4F" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={nez.position} rotation={[Math.PI / 2.1, 0, 0]}>
        <coneGeometry args={[0.115, 0.26, 18]} />
        <meshStandardMaterial color="#C0855A" roughness={0.8} />
      </mesh>
      {[oeilG, oeilD].map((o, i) => (
        <mesh key={i} position={o.position} scale={[0.072, 0.045, 0.03]}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color="#2C1C14" roughness={0.3} />
        </mesh>
      ))}
      <mesh position={bouche.position} scale={[0.1, 0.03, 0.03]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshStandardMaterial color="#8E4A3C" roughness={0.6} />
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
          <meshStandardMaterial color={RASE} roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      )}
      <mesh geometry={coiffure.cheveux}>
        <meshStandardMaterial color={CHEVEU} roughness={0.42} metalness={0.08} />
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
      <View style={{ width: largeur, height: h, borderRadius: 16, overflow: 'hidden', backgroundColor: '#F3E6D6' }}>
        <Canvas
          style={{ width: largeur, height: h }}
          camera={{ position: [0, fige ? -0.1 : 0.05, fige ? 5.3 : 5.1], fov: 32 }}
          gl={{ antialias: true }}
          dpr={typeof window !== 'undefined' ? Math.min(2, (window.devicePixelRatio as number) || 1) : 1}
        >
          <color attach="background" args={['#F3E6D6']} />
          <ambientLight intensity={1.1} />
          <hemisphereLight args={['#FFF4E6', '#6B4A33', 0.8]} />
          <directionalLight position={[2.6, 3.6, 3.2]} intensity={2.1} />
          <directionalLight position={[-3.2, 1.2, -2.4]} intensity={0.8} color="#FFE2BE" />
          <Pivot vue={vue}>
            <Tete />
            <Cheveux fiche={fiche} traits={traits} styleTraits={styleTraits} couleurPerles={fiche?.couleurPerles ?? '#D9A520'} />
          </Pivot>
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
