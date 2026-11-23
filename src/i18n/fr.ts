// Français : langue de référence. Chaque clé ajoutée ici doit exister en anglais et en arabe.
export const fr = {
  common: { tokens: 'jetons', token: 'jeton', soon: 'Bientôt dans la démo', back: 'Retour', close: 'Fermer', confirm: 'Confirmer', cancel: 'Annuler' },
  tabs: { home: 'Accueil', planning: 'Réserver', bookings: 'Réservations', wallet: 'M Tokens', tokens: 'Jetons', profile: 'Profil' },
  launch: { tagline: 'Move. Recover. Belong.' },
  placeholder: {
    planning: 'Le planning de la semaine arrive mercredi.',
    bookings: 'Vos réservations et vos QR arrivent jeudi.',
    wallet: 'Votre portefeuille de jetons arrive jeudi.',
    profile: 'Votre profil et vos réglages arrivent vendredi.',
  },
  home: { hello: 'Bonjour {{name}}', balance: 'Votre solde', seeCatalogue: 'Voir le design system' },
  catalogue: {
    title: 'Direction visuelle',
    intro: 'Les couleurs, textes et composants de l’app MILIEU. Ils sont utilisés par tous les écrans.',
    colors: 'Couleurs', type: 'Typographie', buttons: 'Boutons', badges: 'Badges et places', chips: 'Filtres',
    cards: 'Cartes', sheet: 'Feuille de confirmation', states: 'États', openSheet: 'Ouvrir la feuille',
    sheetTitle: 'Réserver ce cours ?', sheetBody: 'Lagree · demain 18:00 · 4 jetons. Il vous restera 12 jetons.',
    empty: 'Aucune réservation à venir', emptyBody: 'Réservez votre premier cours depuis le planning.',
  },
};
export type Dict = typeof fr;
