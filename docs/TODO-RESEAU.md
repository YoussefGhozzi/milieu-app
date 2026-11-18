# TODO — MILIEU

## 1. Supprimer le paiement bancaire de l'app client (à faire en dernier)

Décision client : **pas de paiement en ligne**. Le client paie au comptoir (espèces, TPE, virement) et l'accueil crédite ses jetons depuis **Espace pro → Clients & jetons**. Cette recharge est déjà en place.

Il reste à nettoyer l'app client existante :

- [ ] Retirer le parcours de paiement par carte et paiement mobile : `apps/app/app/checkout/[packId].tsx` et `apps/app/app/payment-result.tsx`.
- [ ] Transformer la boutique (`apps/app/app/shop.tsx`) en simple grille de prix « à régler à l'accueil », sans bouton de paiement.
- [ ] Remplacer les boutons « Recharger » de l'accueil et du portefeuille par « Recharger à l'accueil » (avec l'adresse de la salle).
- [ ] **Unifier les deux soldes.** L'ancien portefeuille de démo (`DemoProvider`, « M Tokens ») et les jetons du réseau (`useClientAccount` → `walletOf`) coexistent pour l'instant. Il faudra n'en garder qu'un, celui du réseau.
- [ ] Faire de même pour le planning et les réservations de démo (`DemoProvider`) : à terme, seuls les cours créés par les coachs et validés par l'accueil doivent rester.

## 2. Backend réel (après confirmation avec le client)

- [ ] Créer l'API qui implémente le contrat `packages/contracts/src/network.ts` (salles, comptes, cours, tickets, mouvements de jetons, notifications).
- [ ] Remplacer `load` / `save` de `apps/app/src/backend/NetworkProvider.tsx` par des appels à l'API. Les règles métier sont isolées dans `engine.ts` et se portent telles quelles côté serveur.
- [ ] Mettre en place une vraie authentification (mots de passe hachés, sessions et jetons d'accès). Aujourd'hui, tous les comptes de démo utilisent `milieu2026`.
- [ ] Faire tourner côté serveur la détection des absences, avec un job planifié (aujourd'hui `sweepNoShows` s'exécute dans l'app toutes les 30 s).
- [ ] Rendre les QR non falsifiables : code signé (HMAC) ou à usage unique.
- [ ] Envoyer de vraies notifications push (cours validé, rappel, jetons crédités, absence).
- [ ] Stocker les photos de profil des coachs dans un vrai stockage de fichiers. Aujourd'hui, une image de 320 px est enregistrée en base64 dans les données de démo.
- [ ] Ajouter la modération des avis (signalement par le coach, masquage par l'admin) et un rappel push pour évaluer la séance.
- [ ] Garder l'historique des prix du jeton. Aujourd'hui, seul le montant encaissé est conservé sur chaque recharge.

## 3. Finitions

- [ ] Traduire en EN et AR les écrans du réseau (espace pro, « Ma salle », tickets), dans `src/i18n/dict.en.ts` et `dict.ar.ts`.
- [ ] Persister les données sur téléphone. Aujourd'hui, en dehors du web, elles restent en mémoire (piste : AsyncStorage, en attendant l'API).
- [ ] Ajouter une liste d'attente pour les cours du réseau (elle existe déjà dans l'ancienne démo).
- [ ] Permettre au coach de modifier un cours validé, avec une nouvelle validation de l'accueil.
