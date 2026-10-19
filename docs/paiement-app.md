# Paiement dans l'app (Apple et Google)

L'abonnement Premium peut maintenant être pris dans l'app iPhone et Android.
Les achats passent par **RevenueCat**, qui vérifie les reçus auprès d'Apple
et de Google et prévient le site à chaque changement (achat, renouvellement,
résiliation, expiration). Premium est lié au compte Sorloo : il marche sur le
site comme dans l'app, quel que soit l'endroit où il a été payé.

Les prix restent ceux du site : **6,99 € par mois** ou **49,99 € par an**.

## Ce qu'il faut avant de commencer

- Le SIREN et un compte bancaire professionnel.
- **Apple** : dans App Store Connect, rubrique *Accords, taxes et banques*,
  signer l'accord *Paid Applications* et remplir la banque et les impôts.
  Sans cet accord, aucun achat ne peut fonctionner, même en test.
- **Google** : un profil de paiement (Play Console, rubrique *Configurer un
  profil de paiement*).

## 1. Créer les abonnements chez Apple (App Store Connect)

1. App Store Connect → ton app → *Monétisation* → *Abonnements*.
2. Créer un groupe d'abonnements : **Sorloo Premium**.
3. Dans ce groupe, créer deux abonnements :
   - identifiant produit `sorloo_premium_monthly`, durée **1 mois**, prix 6,99 € ;
   - identifiant produit `sorloo_premium_yearly`, durée **1 an**, prix 49,99 €.
4. Pour chacun : un nom affiché (« Premium mensuel », « Premium annuel »), une
   courte description, et la capture d'écran demandée pour la vérification
   (une capture de l'écran Premium de l'app suffit).
5. Facultatif : un essai gratuit (*Offre de lancement* → gratuit, 7 jours par
   exemple). L'app l'affichera toute seule.
6. App Store Connect → *Utilisateurs et accès* → *Intégrations* → *Achats
   intégrés* : générer une **clé d'API d'achats intégrés** (fichier `.p8`) ;
   elle servira à RevenueCat.

## 2. Créer les abonnements chez Google (Play Console)

1. Play Console → ton app → *Monétiser* → *Produits* → *Abonnements*.
2. Créer deux abonnements avec les mêmes identifiants :
   `sorloo_premium_monthly` (offre de base mensuelle, 6,99 €) et
   `sorloo_premium_yearly` (offre de base annuelle, 49,99 €).
3. Pour RevenueCat : créer un compte de service Google Cloud avec accès à la
   Play Console (RevenueCat explique la marche à suivre, étape par étape,
   dans son tableau de bord).

Google n'autorise les abonnements qu'une fois une première version de l'app
envoyée sur un canal de test (test interne suffit).

## 3. Configurer RevenueCat

1. Créer un compte sur revenuecat.com, puis un projet **Sorloo**.
2. Ajouter l'app **App Store** (identifiant `com.getweeko.app`) avec la clé
   `.p8`, et l'app **Play Store** (paquet `com.sorloo.app`) avec le compte de
   service.
3. *Product catalog* → *Entitlements* : créer l'accès **`premium`**
   (exactement ce nom) et y rattacher les 4 produits (2 Apple, 2 Google).
4. *Offerings* : dans l'offre **default** (offre courante), créer deux
   packages : **Monthly** (les deux produits mensuels) et **Annual** (les deux
   produits annuels).
5. *Integrations* → *Webhooks* : ajouter un webhook
   - URL : `https://sorloo.com/api/revenuecat/webhook`
   - *Authorization header* : une longue phrase secrète de ton choix (la même
     que `REVENUECAT_WEBHOOK_AUTH` ci-dessous).
6. *API keys* : noter
   - la **clé publique iOS** (commence par `appl_`) ;
   - la **clé publique Android** (commence par `goog_`) ;
   - une **clé secrète** (*Secret API key*, version 1, commence par `sk_`).

## 4. Réglages du site (Vercel)

Dans Vercel → *Settings* → *Environment Variables* (production) :

| Variable | Valeur |
| --- | --- |
| `REVENUECAT_SECRET_KEY` | la clé secrète `sk_…` |
| `REVENUECAT_WEBHOOK_AUTH` | la phrase secrète du webhook |

Puis redéployer le site.

## 5. Réglages de l'app

Les deux clés publiques (`appl_…` et `goog_…`) vont dans l'app, au moment du
build. Elles ne sont pas secrètes : envoie-les à Claude, qui les ajoute dans
`apps/mobile/eas.json` (`EXPO_PUBLIC_REVENUECAT_IOS_KEY` et
`EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`).

## 6. Nouveau build (obligatoire)

Le module d'achat est du code natif : une simple mise à jour (`eas update`)
ne suffit pas. La version de l'app passe à **1.2.0** ; il faut un build :

```bash
cd sante
git pull
pnpm install
cd apps/mobile
npx eas-cli@latest build --platform ios --profile production
```

Les téléphones qui ont encore la 1.1.0 ne reçoivent pas ce code par mise à
jour ; ils l'auront en installant la 1.2.0.

## 7. Tester sans payer

- **iPhone** : App Store Connect → *Utilisateurs et accès* → *Sandbox* →
  créer un testeur. Sur le téléphone : *Réglages* → *App Store* → *Compte
  sandbox*. Installer la build via TestFlight, puis s'abonner : rien n'est
  débité, et les abonnements de test se renouvellent toutes les quelques
  minutes.
- **Android** : Play Console → *Paramètres* → *Test des licences* : ajouter
  ton adresse Gmail.
- Dans RevenueCat, *Customers* montre chaque achat de test ; sur le site,
  *Mon compte* doit afficher Premium sur le même compte.
- Pour offrir Premium à quelqu'un (testeur, partenaire) : RevenueCat →
  *Customers* → le compte (son identifiant Sorloo) → *Grant entitlement*.
  L'app et le site l'affichent alors comme « Premium offert ».

## Fonctionnement côté code

- `apps/mobile/src/lib/purchases.ts` : achat, restauration, lien avec le
  compte Sorloo (l'identifiant RevenueCat est l'identifiant de l'utilisateur).
- `apps/mobile/src/app/(app)/premium.tsx` : l'écran d'abonnement (prix venant
  du store, essai gratuit éventuel, mentions de renouvellement, liens vers les
  conditions et la confidentialité, bouton « Restaurer mes achats »).
- `apps/web/src/lib/revenuecat.ts` : le site demande toujours l'état réel à
  RevenueCat (jamais au téléphone), à chaque achat et à chaque webhook.
- Un abonnement pris dans l'app se gère dans les réglages Apple ou Google :
  l'app ouvre la bonne page avec « Gérer mon abonnement ». Sorloo ne peut pas
  le résilier lui-même ; l'écran de suppression de compte le rappelle.
- Un abonné du site garde Premium dans l'app, et le site ne propose pas de
  payer une deuxième fois à quelqu'un qui a déjà Premium via l'app.
