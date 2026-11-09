# milieu-app

App membre MILIEU (submodule `apps/app` du dépôt `milieu`) : Expo Router, NativeWind, i18n FR/EN/AR.
Démo client sur données simulées (`@milieu/contracts`), composants de `@milieu/ui`.

- `app/` : écrans (routes Expo Router), `app/(tabs)` pour les 5 onglets.
- `src/i18n` : traductions FR (référence), EN, AR (RTL).
- `src/demo/DemoProvider.tsx` : état de la démo en mémoire, sans backend.

Lancer depuis le dépôt parent : `demo-web.cmd` ou `demo-telephone.cmd`.
