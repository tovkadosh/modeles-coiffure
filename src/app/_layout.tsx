import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { C } from '@/composants/ui';

export default function Layout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: C.brun },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: 'Retour',
          contentStyle: { backgroundColor: C.fond },
        }}>
        <Stack.Screen name="index" options={{ title: 'Modèles de coiffure' }} />
        <Stack.Screen name="creer" options={{ title: 'Créer un modèle' }} />
        <Stack.Screen name="dessin" options={{ title: 'Dessiner à la main' }} />
        <Stack.Screen name="combiner" options={{ title: 'Combiner des photos' }} />
        <Stack.Screen name="reglages" options={{ title: 'Réglages' }} />
        <Stack.Screen name="modele/[id]" options={{ title: 'Mon modèle' }} />
      </Stack>
    </>
  );
}
