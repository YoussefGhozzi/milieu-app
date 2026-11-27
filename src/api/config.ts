import { Platform } from 'react-native';

/*
 * Source des données de l'app :
 * - `local` (par défaut) : démo autonome, données simulées dans l'app (démo Vercel, présentations) ;
 * - `api` : vraie API MILIEU (comptes, réservations, jetons, temps réel).
 * Réglée au moment du build : EXPO_PUBLIC_DATA_SOURCE=api EXPO_PUBLIC_API_URL=https://api.milieu.tn
 */
export const DATA_SOURCE: 'local' | 'api' = process.env.EXPO_PUBLIC_DATA_SOURCE === 'api' ? 'api' : 'local';
export const isApi = DATA_SOURCE === 'api';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');

/**
 * Adresse du temps réel (Socket.IO). Par défaut celle de l'API.
 * Différente seulement quand l'app joint l'API par un relais qui ne transmet pas les WebSockets
 * (recette Render : l'app appelle /api sur son propre domaine, le temps réel va directement à l'API).
 */
export const REALTIME_URL = (process.env.EXPO_PUBLIC_REALTIME_URL || API_URL).replace(/\/+$/, '');
export const isWeb = Platform.OS === 'web' && typeof window !== 'undefined';
