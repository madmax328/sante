# Weeko

Weeko organise la semaine : menus des 7 jours, recettes, liste de courses par rayon,
budget, garde-manger, programme sportif, journal alimentaire, suivi du poids,
bilan hebdomadaire et coach IA. Version web (Next.js) ; les apps iOS/Android
viendront dans un second temps et réutiliseront le moteur et la base.

## Organisation du dépôt

| Dossier | Contenu |
|---|---|
| `packages/engine` | Moteur en TypeScript pur, testé : besoins (Mifflin-St Jeor), règles de sécurité santé, génération de la semaine (budget, restes, anti-gaspillage, famille), courses, adaptations, sport, bilan. Aucun appel réseau. |
| `packages/catalog` | Données : 199 ingrédients (valeurs nutritionnelles type CIQUAL, prix moyens France, conditionnements), 1 521 recettes, 47 exercices. |
| `apps/web` | Application Next.js 16 (App Router) : site public, espace connecté, paiement Stripe, API. |

Le moteur ne dépend ni de Next.js ni de MongoDB : l'app mobile (React Native / Expo) pourra l'utiliser tel quel.

## Démarrer en local

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # puis remplir au minimum MongoDB + secrets
pnpm dev                                        # http://localhost:3000
pnpm test                                       # tests du moteur, du catalogue et du web
```

## Déployer

### 1. MongoDB Atlas
1. Créer un cluster (M0 gratuit pour démarrer, M10 en production) en **région Europe** (Paris ou Francfort).
2. *Database Access* : créer un utilisateur avec un mot de passe fort.
3. *Network Access* : autoriser `0.0.0.0/0` (Vercel n'a pas d'IP fixe) ou utiliser l'intégration Vercel ↔ Atlas.
4. Copier la chaîne de connexion `mongodb+srv://…` dans `MONGODB_URI`.

Les collections et index sont créés automatiquement au premier lancement.

### 2. Stripe
1. Créer un produit **Weeko Premium** avec deux prix récurrents : 6,99 € / mois et 49,99 € / an.
   Copier leurs identifiants (`price_…`) dans `STRIPE_PRICE_MONTHLY` et `STRIPE_PRICE_YEARLY`.
2. *Développeurs → Clés API* : copier la clé secrète dans `STRIPE_SECRET_KEY` et la clé publiable
   dans `STRIPE_PUBLISHABLE_KEY` (le formulaire de carte s'affiche directement sur le site,
   aux couleurs de Weeko, sans redirection vers une page Stripe).
3. *Développeurs → Webhooks* : ajouter l'URL `https://getweeko.com/api/stripe/webhook`
   avec les événements `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
   Copier le secret de signature dans `STRIPE_WEBHOOK_SECRET`.
4. Facultatif : pour Apple Pay, enregistrer le domaine du site dans *Paramètres → Moyens de paiement → Domaines*.

Le statut Premium est enregistré dans la base (collection `profiles`, champ `subscription`) :
c'est ce champ que l'app mobile lira pour savoir si l'utilisateur est abonné.
Règle (identique à `apps/web/src/lib/premium.ts`) : Premium si `status` vaut `active` ou `past_due`,
ou `trialing` **avec** `hasPaymentMethod: true`, et si `currentPeriodEnd` n'est pas dépassé de plus de 3 jours.

L'abonnement Stripe n'est créé qu'au moment où l'utilisateur valide le formulaire avec une carte valide :
afficher la page de paiement ou changer de formule ne crée rien. Avec un essai gratuit
(`STRIPE_TRIAL_DAYS` > 0), la carte est d'abord enregistrée et vérifiée, puis l'essai démarre ;
l'essai n'est proposé qu'une fois par client.

La résiliation se fait sur le site (*Mon compte → Résilier mon abonnement*) : l'abonnement n'est
pas renouvelé, Premium reste actif jusqu'à la fin de la période payée, et l'utilisateur peut le
réactiver avant cette date. Le portail client Stripe n'est pas utilisé.

### 3. Vercel
1. *Add New → Project*, importer le dépôt GitHub.
2. **Root Directory : `apps/web`** (Vercel détecte pnpm et le monorepo).
   *Framework Preset* : **Next.js**. Laisser *Build Command* et *Output Directory* vides (valeurs par défaut).
   Si l'erreur « No Output Directory named "public" » apparaît, c'est que le Root Directory
   est resté à la racine du dépôt ou que le preset est sur « Other ».
3. Renseigner les variables de `apps/web/.env.example` dans *Settings → Environment Variables*.
4. Déployer. La région des fonctions est fixée à Paris (`cdg1`) dans `apps/web/vercel.json`.

Photos des recettes : Unsplash (`UNSPLASH_ACCESS_KEY`), ou Pexels (`PEXELS_API_KEY`) si une clé est disponible.
La tâche planifiée `/api/cron/photos` (une fois par jour) en récupère par lots. Pour aller plus vite,
ouvrir dans le navigateur `https://getweeko.com/api/cron/photos?key=CRON_SECRET` (une fois par heure :
Unsplash limite à 50 requêtes/heure en mode démo ; après validation « Production » par Unsplash, 5 000/heure,
et on peut ajouter `&max=150`). La réponse indique combien de recettes restent sans photo (`remaining`).

> Le plan gratuit Vercel (Hobby) est réservé aux projets non commerciaux : pour un lancement
> payant, il faut le plan Pro.

### 4. E-mails (getweeko.com)
Boîte : `contact@getweeko.com`, avec les alias `bonjour@`, `support@`, `rgpd@` et `noreply@`
(adresses publiques dans `apps/web/src/lib/contact.ts`).
- Envoi automatique (mot de passe oublié) par la boîte Hostinger : `SMTP_HOST=smtp.hostinger.com`,
  `SMTP_PORT=465`, `SMTP_USER=contact@getweeko.com`, `SMTP_PASSWORD` (mot de passe de la boîte).
  Limite Hostinger : 1 000 e-mails / 24 h. Au-delà, passer à Resend (`RESEND_API_KEY`, utilisé si SMTP est vide).
- Stripe : *Paramètres → Informations publiques* → e-mail de support `support@getweeko.com`.

### 5. Clés à générer
- `BETTER_AUTH_SECRET` : `openssl rand -base64 32`
- `HEALTH_DATA_KEY` : `openssl rand -base64 32` — **à sauvegarder** : sans cette clé, les données de santé chiffrées sont illisibles.
- `CRON_SECRET` : `openssl rand -hex 24`

## Ce qui reste à compléter avant le lancement
- Les mentions entre crochets dans `apps/web/src/content/legal.ts` (raison sociale, adresse, médiateur…) et une relecture par un juriste.
- Vérifier la disponibilité du nom « Weeko » (INPI, EUIPO, domaines, stores).
- Les valeurs nutritionnelles sont alignées sur la table CIQUAL mais saisies à la main :
  les recharger depuis l'export officiel avant le lancement est recommandé.
- Les prix sont des moyennes : à affiner avec de vraies données magasin.
