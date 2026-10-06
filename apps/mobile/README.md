# Weeko — app iOS / Android

App Expo (React Native) qui utilise les mêmes comptes et les mêmes données que le site :
elle appelle l'API du site (`apps/web/src/app/api/mobile/*`).

## Développer

```bash
pnpm install                      # à la racine du dépôt
cd apps/mobile
EXPO_PUBLIC_API_URL=http://<ip-de-ton-ordi>:3000 npx expo start
```

Sans `EXPO_PUBLIC_API_URL`, l'app utilise https://getweeko.com.

## Paiement

Aucun achat dans l'app : l'abonnement se prend sur le site (Stripe). L'app lit simplement
le statut Premium du compte. Ne pas ajouter de lien ou de bouton vers une page de paiement
(règles App Store / Play Store).

## Publier

Avec EAS (service de compilation d'Expo) : `npx eas-cli@latest build` puis `npx eas-cli@latest submit`.
