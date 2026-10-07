# Sorloo — app iOS / Android

App Expo (React Native) qui utilise les mêmes comptes et les mêmes données que le site :
elle appelle l'API du site (`apps/web/src/app/api/mobile/*`).

## Développer

```bash
pnpm install                      # à la racine du dépôt
cd apps/mobile
EXPO_PUBLIC_API_URL=http://<ip-de-ton-ordi>:3000 npx expo start
```

Sans `EXPO_PUBLIC_API_URL`, l'app utilise https://sorloo.com.

## Paiement

Aucun achat dans l'app : l'abonnement se prend sur le site (Stripe). L'app lit simplement
le statut Premium du compte. Ne pas ajouter de lien ou de bouton vers une page de paiement
(règles App Store / Play Store).

## Publier

Avec EAS (service de compilation d'Expo) : `npx eas-cli@latest build` puis `npx eas-cli@latest submit`.

Le nom affiché est « Sorloo ». Le `slug` Expo (`weeko`), l'identifiant iOS (`com.getweeko.app`)
et le préfixe de stockage restent ceux d'avant le changement de nom : ils sont invisibles pour
les utilisateurs, et les changer obligerait à recréer le projet EAS et la fiche App Store Connect.
L'app Android n'étant pas encore publiée, elle utilise directement `com.sorloo.app`.
