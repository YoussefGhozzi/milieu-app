# Scénarios de test — réseau MILIEU (coachs, accueil, admin, clients)

## Avant de commencer

1. Lancer l'app web : `npx expo start --web` dans `apps/app`, puis ouvrir http://localhost:8081.
2. Aller sur `/pro` et cliquer sur **« Réinitialiser les données de démo »** en bas de la page.
3. Les données sont stockées dans le navigateur (localStorage). Pour jouer plusieurs rôles en même temps, ouvrir plusieurs onglets du **même navigateur** : ils se synchronisent automatiquement.

Mot de passe de tous les comptes : `milieu2026`. Sur `/pro`, on peut aussi choisir un compte d'un clic.

| Rôle | Compte | Salle |
| --- | --- | --- |
| Admin réseau | admin@milieu.tn | toutes |
| Accueil | accueil.phosphor@milieu.tn (Rania Kefi) | Phosphor |
| Accueil | accueil.lac@milieu.tn (Walid Sassi) | Lac 2 |
| Coach | yasmine@milieu.tn, mehdi@milieu.tn | Phosphor |
| Coach | ines@milieu.tn | Lac 2 |
| Client | nour@example.com (client de démo de l'app) | Phosphor |
| Client | aziz@example.com | Lac 2 |

Tickets de démo utiles : `MLU-NOUR-FLOW` et `MLU-SAMI-FLOW` (cours « Lagree Flow » qui commence dans environ 1 h).

---

## A. Création et validation d'un cours

| # | Action | Résultat attendu |
| --- | --- | --- |
| A1 | Admin → Comptes → créer un coach pour Phosphor | Le compte apparaît, rattaché à Phosphor. Un compte accueil ne peut créer que des clients. |
| A2 | Coach Yasmine → Créer un cours : hebdomadaire, date, heure, durée, salle, places max, coût en jetons | Le cours passe « En attente ». L'accueil Phosphor reçoit une notification. |
| A3 | Recommencer avec un cours mensuel le 31 | Après validation, le calendrier place la séance le dernier jour des mois plus courts (30 ou 28/29). |
| A4 | Accueil Rania → Demandes → **Refuser** avec un motif | Le coach voit « Refusé » et le motif. Le cours n'apparaît nulle part côté client. |
| A5 | Accueil Rania → Demandes → **Valider** | Le cours apparaît dans le calendrier de tous les coachs de la salle, de l'accueil et des clients de Phosphor. |
| A6 | Se connecter avec Walid (Lac 2) | Il ne voit **pas** les cours de Phosphor (séparation des salles). |
| A7 | Proposer un cours dans une salle déjà occupée au même créneau | L'accueil voit un avertissement de conflit avant de valider. |

## B. Réservation et ticket QR (client)

| # | Action | Résultat attendu |
| --- | --- | --- |
| B1 | Client Nour → accueil → bloc « Ma salle », ou `/club` | Les cours validés s'affichent comme des annonces, avec le prix du jeton et les promos. |
| B2 | Ouvrir un cours → Réserver → confirmer | Les jetons sont bloqués et un **ticket QR** s'affiche (code `MLU-XXXX-XXXX`). |
| B3 | Réserver sans assez de jetons | La réservation est refusée avec un message clair. |
| B4 | Réserver une séance complète | Refusé : « Plus de place disponible pour cette séance ». |
| B5 | Annuler **plus de 24 h** avant le cours | Les jetons sont rendus. |
| B6 | Annuler **moins de 24 h** avant le cours | Un avertissement s'affiche, puis les jetons sont perdus. |

## C. Recharge de jetons au comptoir (accueil)

| # | Action | Résultat attendu |
| --- | --- | --- |
| C1 | Rania → Clients & jetons → Nour → Recharger → **40 jetons**, espèces | Le récapitulatif affiche 40 × 10 DT = 400 DT, Black Friday −80 DT, Pack fidélité +5 jetons. **À encaisser : 320 DT.** |
| C2 | Valider | Message « +40 jetons (+5 offerts), 320 DT encaissés ». Le solde de Nour augmente de 45 et elle est notifiée. |
| C3 | Recharger 10 jetons | Pas de remise (minimum de 20) : 100 DT. |
| C4 | Walid (Lac 2) recharge Aziz de 10 jetons | 10 × 9,5 DT = 95 DT, +3 jetons offerts (Ouverture Lac 2). |

## D. Prix du jeton et promos (admin)

| # | Action | Résultat attendu |
| --- | --- | --- |
| D1 | Admin → **Tarifs & promos** → changer le prix de Phosphor à 12 DT | Le simulateur, la recharge à l'accueil et l'app client affichent 12 DT. |
| D2 | Créer une promo « −30 % dès 10 jetons » pour Lac 2, qui démarre aujourd'hui | Les clients de Lac 2 (Aziz) sont notifiés ; ceux de Phosphor ne le sont pas. |
| D3 | Désactiver la promo, puis la supprimer | Elle disparaît de la recharge et de l'app client. |
| D4 | Promo programmée (Rentrée Sousse) | Le badge indique « Programmée ». Elle n'est pas appliquée avant sa date. |

## E. Présence : scan du QR

| # | Action | Résultat attendu |
| --- | --- | --- |
| E1 | Coach Yasmine → Scanner → saisir `MLU-NOUR-FLOW` (ou scanner le QR avec la caméra) | « Présence validée », 4 jetons débités. Le ticket de Nour passe à « Présent ». |
| E2 | Scanner le même code une 2ᵉ fois | Refusé : déjà scanné. |
| E3 | Coach Mehdi scanne `MLU-SAMI-FLOW` | Refusé : ce n'est pas son cours. Rania (accueil) peut, elle, le scanner. |
| E4 | Scanner un ticket d'un cours qui commence dans plusieurs jours | Refusé : trop tôt. Le scan est possible de 12 h avant le début jusqu'à 1 h après la fin. |
| E5 | Scanner un code inventé | Refusé : « Ticket inconnu ». |

## F. Absence sans annulation

| # | Action | Résultat attendu |
| --- | --- | --- |
| F1 | Réserver un cours puis ne pas être scanné | Une fois le cours terminé (+1 h), le ticket passe automatiquement à « Absent » (vérification toutes les 30 s) et les jetons sont débités. |
| F2 | Consulter le ticket de Leila (`MLU-LEIL-ABS1`) | Il est déjà marqué « Absent » dans la démo. |

## G. Profil et note des coachs

| # | Action | Résultat attendu |
| --- | --- | --- |
| G1 | Client Nour → page d'une séance → **Voir le profil du coach** | Une fenêtre s'ouvre avec la photo, le nom et prénom, les spécialités, le parcours, la **note en haut à droite** et les derniers avis. |
| G2 | Client Nour → accueil ou « Ma salle » → carte **« Comment était Hot Sculpt Express ? »** | La fiche d'évaluation s'ouvre : étoiles de 1 à 5 (obligatoire) et avis (facultatif). |
| G3 | Envoyer une note de 5 avec un avis | La note de Mehdi est recalculée et il reçoit une notification. La carte disparaît. |
| G4 | Tenter d'évaluer la même séance une 2ᵉ fois | Impossible : le ticket affiche les étoiles déjà données. |
| G5 | Ticket d'une séance réservée mais pas encore faite | Aucune fiche d'évaluation n'est proposée. |
| G6 | Coach Mehdi → Mon profil → ajouter une photo | La photo apparaît dans la fenêtre côté client. On y voit aussi la moyenne, la répartition des notes et les avis, et le bouton « Voir comme un client ». |
| G7 | Admin → Comptes | La note de chaque coach est affichée. |

## H. Affichage sur tous les écrans

Refaire quelques écrans (calendrier, recharge, tarifs, fenêtre du coach) à 3 largeurs : **téléphone (390 px)**, **tablette (820 px)** et **ordinateur (1440 px)**. Dans Chrome ou Edge : F12 puis le mode appareil (Ctrl+Shift+M).

Résultat attendu :

- aucun débordement horizontal ;
- la barre de navigation est en bas sur téléphone et à gauche sur grand écran ;
- le calendrier montre 7 colonnes à partir de 900 px, sinon une bande de jours suivie de la liste.
