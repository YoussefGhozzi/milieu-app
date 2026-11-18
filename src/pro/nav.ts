import { router } from 'expo-router';
import type { GymSession } from '@/backend/engine';

/** Détail d'une séance (liste de présence) pour le coach et l'accueil. */
export const openSession = (s: GymSession) =>
  router.push({ pathname: '/pro/session', params: { c: s.course.id, at: s.start.toISOString() } });

/** Détail d'une séance côté client (réservation). */
export const openClubSession = (s: GymSession) =>
  router.push({ pathname: '/club/session', params: { c: s.course.id, at: s.start.toISOString() } });
