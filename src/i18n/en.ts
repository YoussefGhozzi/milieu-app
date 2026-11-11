import type { Dict } from './fr';

export const en: Dict = {
  common: { tokens: 'tokens', token: 'token', soon: 'Coming soon in the demo', back: 'Back', close: 'Close', confirm: 'Confirm', cancel: 'Cancel' },
  tabs: { home: 'Home', planning: 'Book', bookings: 'Bookings', wallet: 'M Tokens', profile: 'Profile' },
  launch: { tagline: 'Move. Recover. Belong.' },
  placeholder: {
    planning: 'The weekly schedule lands on Wednesday.',
    bookings: 'Your bookings and QR codes land on Thursday.',
    wallet: 'Your token wallet lands on Thursday.',
    profile: 'Your profile and settings land on Friday.',
  },
  home: { hello: 'Hi {{name}}', balance: 'Your balance', seeCatalogue: 'See the design system' },
  catalogue: {
    title: 'Visual direction',
    intro: 'The colours, type and components of the MILIEU app, shared by every screen.',
    colors: 'Colours', type: 'Typography', buttons: 'Buttons', badges: 'Badges and seats', chips: 'Filters',
    cards: 'Cards', sheet: 'Confirmation sheet', states: 'States', openSheet: 'Open the sheet',
    sheetTitle: 'Book this class?', sheetBody: 'Lagree · tomorrow 18:00 · 4 tokens. You will have 12 tokens left.',
    empty: 'No upcoming bookings', emptyBody: 'Book your first class from the schedule.',
  },
};
