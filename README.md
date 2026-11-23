# milieu-app

App membre MILIEU (submodule `apps/app` du dépôt `milieu`) : Expo Router, NativeWind, i18n FR/EN/AR.

- `app/` : écrans (routes Expo Router), `app/(tabs)` pour les 5 onglets.
- `src/i18n` : traductions FR (référence), EN, AR (RTL).
- `src/demo/DemoProvider.tsx` : démo autonome en mémoire, sans backend.
- `src/api/` : l'app branchée sur la vraie API MILIEU (même interface `useDemo()` que la démo).

## Source des données

| Variable | Valeurs | Effet |
| --- | --- | --- |
| `EXPO_PUBLIC_DATA_SOURCE` | `local` (défaut) ou `api` | Démo autonome, ou vraie API |
| `EXPO_PUBLIC_API_URL` | ex. `https://api.milieu.tn` | Adresse de l'API (défaut `http://localhost:3000`) |
| `EXPO_PUBLIC_STAFF_URL` | ex. `https://staff.milieu.tn` | Lien « Ouvrir MILIEU Staff » pour les comptes de l'équipe |

En mode `api` :

- **Connexion** avec l'e-mail et le mot de passe donnés par l'accueil. À la première connexion, le mot de passe temporaire est remplacé. Inscription et mot de passe oublié passent par l'accueil.
- **Jetons de connexion :**
  - sur téléphone : jeton de session dans `expo-secure-store` (Keychain ou Keystore) ;
  - sur le web : cookie httpOnly posé par l'API, illisible par JavaScript ;
  - le jeton d'accès reste en mémoire seulement.
- **Données** : planning, réservations, QR signé et code court, solde réel, historique, notifications, promotions, avis. Elles passent par le client typé de `@milieu/contracts` et sont mises en cache par TanStack Query.
- **Temps réel** (Socket.IO) : places, solde, tickets et notifications se mettent à jour sans recharger. Les données sont rechargées au retour de l'app au premier plan.
- **Recharges** : uniquement à l'accueil, il n'y a plus de paiement en ligne. La page « Recharger » montre le prix du jeton de la salle et les promotions en cours.
- **Espace pro** (`/pro`) : les comptes de l'équipe utilisent l'app MILIEU Staff. Un compte coach, accueil ou admin est refusé ici.

## Lancer

Depuis le dépôt parent : `demo-web.cmd` ou `demo-telephone.cmd` (démo).

Avec l'API locale (`apps/api`, `npm run dev`) :

```powershell
$env:EXPO_PUBLIC_DATA_SOURCE='api'; npx expo start --web
```

Tests : `npx vitest run`. Types : `npx tsc --noEmit`.
