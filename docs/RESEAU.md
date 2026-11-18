# MILIEU — App membre (démo)

**MILIEU** est un studio de fitness boutique à Tunis (Phosphor District) qui propose du **Lagree** sur Megaformer, du **Hot Sculpt**, du **Mat Pilates**, de la **Mobility** et du **Functional**.

Ce projet est l'**application mobile des membres** du studio. Elle sert à :

- consulter le planning des cours et réserver une place ;
- payer les cours avec des **jetons**, achetés en packs ;
- présenter un **QR code** à l'accueil le jour du cours ;
- gérer sa liste d'attente, ses annulations, son solde et son profil ;
- suivre son programme de fidélité (niveaux, carte café, série, défis, parrainage).

> **État actuel : démo client, sans backend.** Toutes les données sont simulées dans l'app et tout se passe en mémoire. Les réservations, annulations et achats fonctionnent vraiment dans l'interface, mais rien n'est enregistré : un rechargement remet la démo à zéro. Les paiements sont simulés aussi. La « phase 2 » prévoit une vraie API, qui devra respecter les schémas de `packages/contracts`.
>
> **Nouveau : réseau multi-salles** (voir la section [Workflow réseau](#workflow-réseau-multi-salles--coach--accueil--client)). Ces données sont **enregistrées dans le navigateur** (localStorage) et partagées entre onglets.

---

## Workflow réseau multi-salles : coach → accueil → client

Le client exploite **plusieurs salles**. Chaque compte (accueil, coach, client) appartient à **une salle**. L'administrateur voit tout le réseau.

```
Admin ──crée──▶ comptes Coach / Accueil (par salle)
Coach ──propose un cours──▶ Accueil de sa salle ──valide / refuse (avec raison)──▶
   validé : visible dans TOUS les calendriers (coachs + clients) + « À l'affiche » dans l'app client
Client ──réserve──▶ jetons réservés + ticket QR
Coach ou Accueil ──scanne le QR──▶ présence validée, jetons débités
Absent sans annulation à 24 h ──▶ marqué absent automatiquement, jetons débités
Client paie au comptoir ──▶ Accueil recharge ses jetons (pas de paiement bancaire)
```

| Espace | URL | Ce qu'on y fait |
|---|---|---|
| **Portail pro** | `/pro` | Connexion du coach, de l'accueil ou de l'admin, avec les comptes de démo en un clic (mot de passe `milieu2026`) |
| **Coach** | `/pro/coach` | Tableau de bord, calendrier (toute la salle ou mes cours), **créer un cours** (jour, heure, durée, ponctuel/hebdo/mensuel/annuel, places max, prix en jetons, studio), mes demandes, scanner, profil |
| **Accueil** (back-office) | `/pro/backoffice` | **Valider ou refuser les cours** (avec alerte de chevauchement de studio), calendrier par coach, **Clients & jetons** (recharge, création de client), scanner et liste de présence |
| **Admin réseau** | `/pro/admin` | Vue réseau, salles (création), **Tarifs & promos** (prix du jeton en DT et promotions par salle, simulateur), **comptes** : seul l’admin crée les coachs et l’accueil |
| **Client** | `/` → Accueil | Carrousel **« À l'affiche »** + écran **Ma salle** (`/club`) : planning, réservation, tickets QR, historique de jetons |

**Règles appliquées** (`apps/app/src/backend/engine.ts`) :

- Un cours n'est réservable et visible qu'une fois **validé** par l'accueil de **sa** salle.
- À la réservation, les jetons sont **réservés**. Au scan, ils sont **débités**. Les places et le solde sont vérifiés.
- Annulation au moins **24 h** avant (réglable par salle) : jetons rendus. En dessous de 24 h : jetons débités.
- **Absence** : 1 h après la fin de la séance, un ticket non scanné passe en « absent » et ses jetons sont débités automatiquement.
- Scan accepté de 12 h avant jusqu'à 1 h après la séance. Un coach ne scanne que ses propres cours ; l'accueil scanne tous ceux de sa salle.
- Il est impossible d'agir sur une autre salle (validation, recharge, scan).
- **Tarifs** : l’admin fixe le prix d’un jeton dans chaque salle (ex. 10 DT). À la recharge, l’accueil voit le montant à encaisser.
- **Promotions** (admin, par salle et sur une période donnée) : remise en % ou jetons offerts à partir d’un minimum acheté. À la recharge, la meilleure remise et le meilleur bonus s’appliquent automatiquement. Les clients voient les promos en cours dans l’app et sont notifiés.
- **Évaluation des coachs** : après chaque séance terminée où il était présent, le client remplit une fiche (note de 1 à 5, obligatoire, et avis facultatif). Il a 30 jours pour le faire, une seule fois par séance.
- La moyenne de chaque coach est visible :
  - par le client, dans la modale « profil du coach » (photo, nom, parcours, note en haut à droite, derniers avis) ;
  - par le coach, dans son profil (répartition des notes et avis) ;
  - par l’admin, sur la liste des comptes.

**Code** :

- `packages/contracts/src/network.ts` : schémas Zod (le contrat du futur backend).
- `apps/app/src/backend/` : `engine.ts` (règles), `seed.ts` (3 salles de démo), `NetworkProvider.tsx` (stockage navigateur, synchronisation entre onglets, session par onglet, détection des absences).
- `apps/app/src/pro/` : composants des espaces pro (navigation responsive, calendrier, scanner, cartes).
- `apps/app/app/pro/**` et `apps/app/app/club/**` : écrans.

**Démo conseillée** : ouvre 3 onglets.

1. `/pro`, connecte-toi en coach (Mehdi) et crée un cours.
2. `/pro`, connecte-toi à l'accueil (Rania) et valide ce cours.
3. `/login`, utilise le compte de démo (Nour), réserve le cours depuis « À l'affiche » et récupère le ticket QR.
4. Retourne sur l'accueil (Rania), onglet Scanner, et saisis `MLU-NOUR-FLOW` : c'est la séance qui commence dans l'heure.

Ce qu'il reste à faire, dont le retrait du paiement bancaire côté client : voir [TODO.md](TODO.md).

---

## Stack

| Élément | Technologie |
|---|---|
| App | **Expo 58** + **React Native 0.88** + **React 19**, avec export web via `react-native-web` |
| Navigation | **Expo Router** (routes basées sur les fichiers dans `app/`) |
| Style | **NativeWind 4** (Tailwind pour React Native) et composants dans l'esprit shadcn/ui (`cva` + `cn`) |
| Données | **Zod** (schémas et types partagés) + données de démo générées |
| i18n | **i18next**, **FR** (langue de référence), **EN** et **AR** (avec RTL) |
| Animations | `react-native-reanimated` |
| Divers | `lucide-react-native` (icônes), `react-native-qrcode-svg` (QR codes) |

Identifiants natifs : `tn.milieu.app` (iOS et Android), scheme `milieu://`.

---

## Structure du dépôt

Le projet était à l'origine un monorepo `milieu` composé de 3 sous-modules git. Ici, les 3 dépôts GitHub sont regroupés dans un **workspace npm** qui reproduit cette structure :

```
Hippo/
├── package.json              # workspace npm (apps/*, packages/*) + scripts racine
├── apps/
│   └── app/                  # ← dépôt milieu-app : l'application Expo
└── packages/
    ├── contracts/            # ← dépôt milieu-contracts : @milieu/contracts
    └── ui/                   # ← dépôt milieu-ui : @milieu/ui (design system)
```

Chaque dossier reste un **dépôt git indépendant** : il faut faire `git pull`, commit et push dans chacun séparément.

### `packages/contracts` — `@milieu/contracts`

Il définit le **contrat de données** partagé entre l'app et la future API.

- [`src/schemas.ts`](packages/contracts/src/schemas.ts) contient les schémas Zod : `Studio`, `Room`, `Discipline`, `Coach`, `ClassSession`, `TokenPack`, `Wallet`, `LedgerEntry`, `Booking`, `Member` et `Notification`. On y trouve aussi `walletTotal()`, qui calcule le solde utilisable (achetés + récompenses + bonus non expirés).
- [`src/mocks/milieu.ts`](packages/contracts/src/mocks/milieu.ts) contient les données du studio de démo :
  - **2 salles** : *Studio Lagree* (5 machines) et *Studio Multi* (14 places) ;
  - **5 disciplines**, chacune avec son coût en jetons, sa durée et son intensité ;
  - **8 coachs** ;
  - **4 packs** de jetons : DISCOVER 10 jetons pour 100 TND, MOVE 25 jetons pour 225 TND, ROUTINE 40 jetons pour 340 TND (*populaire*) et ALL IN 60 jetons pour 480 TND (*meilleur prix*) ;
  - `buildSchedule()` génère un **planning de 10 créneaux par jour**, de J-3 à J+14 par rapport à la date du jour. Il est **déterministe** : les mêmes cours sont complets à chaque lancement, et ceux du soir sont plus remplis ;
  - `buildDemoState()` crée le compte de démo **Nour Ben Salem**, avec 2 réservations à venir, un historique, des mouvements de jetons et des notifications.

### `packages/ui` — `@milieu/ui`

Il contient le **design system**.

- [`tokens.js`](packages/ui/tokens.js) est la source unique des couleurs, rayons, tailles de texte et durées d'animation. Il définit deux palettes, **nuit** (par défaut) et **jour**, avec l'orange `brand` et le vert `energy`. Les contrastes respectent le niveau WCAG AA.
- `src/components` regroupe les composants `Text`, `Button`, `Card`, `PressableCard`, `Badge`, `Chip`, `TokenAmount`, `SeatsBadge`, `Avatar`, `SectionHeader`, `ListRow`, `Divider`, `EmptyState`, `Skeleton`, `Sheet` et `Screen`.
- `src/i18n.ts` est un point d'accroche : l'app y enregistre sa fonction de traduction, et le composant `Text` traduit automatiquement tout texte affiché.
- Règles d'accessibilité : contraste ≥ 4,5:1, zones tactiles ≥ 44 px et libellé d'accessibilité sur chaque élément interactif.

### `apps/app` — `@milieu/app`

| Dossier ou fichier | Rôle |
|---|---|
| `app/` | Écrans (routes Expo Router) |
| `app/(tabs)/` | Les 5 onglets : Accueil, Planning, Réservations, Portefeuille, Profil |
| [`src/demo/DemoProvider.tsx`](apps/app/src/demo/DemoProvider.tsx) | **Toute la logique métier de la démo** (voir plus bas) |
| `src/i18n/` | Traductions FR/EN/AR et mécanisme de traduction |
| `src/theme/AppTheme.tsx` | Bascule entre le mode nuit et le mode jour |
| `src/components/` | Composants propres à l'app : en-têtes, cartes de cours, toasts, animations, écran de lancement |
| `src/lib/` | Formatage des dates et prix (TND), style visuel par discipline, mise en page responsive |

---

## Écrans

Les codes (A01, A02…) reprennent la numérotation de la maquette client et figurent en commentaire dans chaque fichier.

| Code | Écran | Fichier |
|---|---|---|
| A01 | Lancement : logo sur fond orange, puis fondu | `src/components/LaunchScreen.tsx` |
| A02 | Bienvenue : 3 écrans de présentation et choix de la langue | `app/welcome.tsx` |
| A03 | Inscription rapide (3 champs + consentements) | `app/register.tsx` |
| A04 | Connexion par e-mail ou téléphone, avec raccourci « compte de démo » | `app/login.tsx` |
| A05 | Mot de passe oublié (e-mail → code à 6 chiffres → nouveau mot de passe) | `app/forgot.tsx` |
| A06 | **Accueil** : solde, prochain cours avec QR, cours du jour, disciplines | `app/(tabs)/index.tsx` |
| A07 | **Planning** : jours, filtres par discipline et par salle, places mises à jour en direct | `app/(tabs)/planning.tsx` |
| A08–A09, A11 | Détail d'un cours, confirmation de réservation, liste d'attente | `app/class/[id].tsx` |
| A10 | Réservation réussie : animation, QR, ajout au calendrier | `app/booking/success.tsx` |
| A12 | **Mes réservations** : à venir et historique | `app/(tabs)/bookings.tsx` |
| A13–A14 | Détail d'une réservation (QR plein écran) et annulation | `app/booking/[id].tsx` |
| A15 | **Portefeuille** : solde par type de jetons et derniers mouvements | `app/(tabs)/wallet.tsx` |
| A16 | Historique complet des jetons, groupé par jour | `app/history.tsx` |
| A17 | Boutique de packs : prix par jeton, économies, équivalence en cours | `app/shop.tsx` |
| A18 | Paiement : carte, paiement mobile ou paiement à l'accueil (simulé) | `app/checkout/[packId].tsx` |
| A19 | Résultat du paiement : réussi, en attente ou refusé | `app/payment-result.tsx` |
| A21 | Notifications | `app/notifications.tsx` |
| A22 | **Profil** et Mes informations | `app/(tabs)/profile.tsx`, `app/account.tsx` |
| A23 | Réglages : langue, notifications, sécurité, consentements, suppression du compte | `app/settings.tsx` |
| A24 | Aide : FAQ, règles du studio, contact | `app/help.tsx` |
| A25–A28 | **MILIEU Perks** : niveau, carte café, série, défis, parrainage | `app/perks.tsx` |
| DEMO | Catalogue de la direction visuelle (couleurs, typo, composants) | `app/catalogue.tsx` |

**Parcours au démarrage** ([`app/index.tsx`](apps/app/app/index.tsx)) : écran de bienvenue au premier lancement, puis connexion, puis les onglets.

---

## Règles métier simulées

Ces règles sont implémentées dans [`DemoProvider.tsx`](apps/app/src/demo/DemoProvider.tsx), qui fait office de faux backend.

- **Jetons**
  - Chaque discipline coûte un nombre fixe de jetons : Lagree 4, Hot Sculpt 3, Functional 3, Mat Pilates 2, Mobility 2.
  - Le solde se compose de jetons **achetés**, de jetons **bonus** (qui ont une date d'expiration) et de jetons de **récompense**.
- **Réservation**
  - Réserver retient le coût du cours (*hold*). Les bonus qui expirent le plus tôt sont utilisés en premier, puis les jetons achetés.
  - Chaque mouvement est inscrit dans le **journal** (*ledger*) : `purchase`, `bonus`, `hold`, `release`, etc.
- **Cours complet**
  - Le membre passe en **liste d'attente** (position simulée de 1 à 3), sans retenue de jetons.
  - `simulateSeatFreed()` simule la libération d'une place : le membre est promu, les jetons sont retenus et une notification est envoyée.
- **Annulation**
  - Plus de **12 h avant** le cours, les jetons sont remboursés intégralement (bonus compris).
  - À moins de 12 h, c'est une **annulation tardive** : les jetons sont perdus et le statut passe à `late_cancel`.
- **Solde insuffisant** : la réservation est refusée et l'app indique combien de jetons il manque.
- **Achat de pack**
  - Un paiement réussi crédite les jetons et envoie une notification.
  - Un paiement « à l'accueil » est en attente, et les jetons ne sont crédités qu'après paiement sur place.
  - Le mode démo permet de forcer un paiement refusé.
- **Places en direct** : toutes les 8 secondes, un cours au hasard gagne ou perd une place, pour simuler l'activité des autres membres.
- **Perks** : les données sont **codées en dur** dans `perks.tsx`. Ce programme de fidélité n'est pas encore dans les contrats.

---

## Internationalisation

Le système de traduction est original : **le texte français écrit dans les écrans sert directement de clé**, sur le principe de gettext.

- [`dict.en.ts`](apps/app/src/i18n/dict.en.ts) et [`dict.ar.ts`](apps/app/src/i18n/dict.ar.ts) font correspondre chaque texte français à sa traduction.
- Les variables s'écrivent `{n}` (nombre) ou `{s}` (texte) dans la clé, et `$1`, `$2`… dans la traduction.
- Le composant `Text` de `@milieu/ui` traduit tout automatiquement. Un texte absent du dictionnaire reste en français.
- En **arabe**, l'interface passe en **RTL**. Sur le web, le changement est immédiat ; sur téléphone, il faut redémarrer l'app.
- Sur le web, la langue et le thème sont mémorisés dans `localStorage`.

👉 **Si tu ajoutes un texte en français dans un écran, ajoute aussi son entrée dans `dict.en.ts` et `dict.ar.ts`.**

---

## Lancer le projet

Prérequis : **Node.js** (testé avec la v24) et npm.

```bash
# depuis la racine (Hippo/)
npm install          # installe les 3 packages et les relie (workspace)

npm run web          # lance l'app dans le navigateur → http://localhost:8081
npm start            # lance Expo (QR code à scanner avec Expo Go sur téléphone)
```

Autres commandes, depuis `apps/app` :

```bash
npm run android | ios      # ouvre l'app sur un émulateur ou un appareil
npm run export:web         # build web statique
npm run typecheck          # vérification TypeScript
```

Une fois dans l'app, utilise **« Utiliser le compte de démo »** sur l'écran de connexion pour entrer directement.

> Dans le dépôt parent `milieu` d'origine, l'app se lançait avec les scripts `demo-web.cmd` et `demo-telephone.cmd`. Ces scripts ne sont pas dans les dépôts publics. Les scripts `npm run web` et `npm start` ci-dessus les remplacent.

---

## Ce qu'il reste à faire (phase 2)

- Construire une **vraie API** qui respecte les schémas de `packages/contracts`, puis remplacer `DemoProvider` par des appels réseau.
- Mettre en place une vraie authentification (aujourd'hui, la connexion est simulée).
- Intégrer une vraie passerelle de paiement (carte ou paiement mobile tunisien).
- Ajouter la persistance des données et les notifications push.
- Ajouter le programme de fidélité (Perks) aux contrats et au backend.
