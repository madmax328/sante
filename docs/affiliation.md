# Programme affiliés

Les créateurs de contenu recommandent Sorloo et touchent **25 %** de ce que
Sorloo reçoit vraiment (hors TVA, et après la part d'Apple ou de Google dans
l'app) sur chaque paiement des abonnés qu'ils amènent, pendant les
**12 premiers mois** de chaque abonnement.

## Le parcours

1. Le créateur lit la page publique **sorloo.com/affiliates** (lien en bas de
   chaque page du site), crée un compte Sorloo puis envoie sa candidature
   depuis **Mon compte → Programme affiliés** (`/app/affiliate`) : ses réseaux
   sociaux (lien ou @pseudo, nombre d'abonnés) et quelques mots.
2. Tu reçois un e-mail (à l'adresse `ADMIN_EMAIL`) et tu examines la
   candidature dans **Administration → Affiliés** (`/admin/affiliates`) : les
   liens vers ses profils s'ouvrent dans un nouvel onglet.
3. **Valider** : tu peux choisir son code (sinon il est créé à partir du nom,
   par exemple `JULIEMARTIN`). Le créateur reçoit un e-mail avec son code et
   son lien `sorloo.com/r/CODE`. **Refuser** : il reçoit un e-mail et peut
   compléter sa candidature et la renvoyer.
4. Les personnes qui ouvrent le lien sont retenues 60 jours ; le compte
   qu'elles créent est lié au créateur pour toujours. Dans l'app (ou sur le
   site), une personne peut aussi saisir le code dans **Mon compte** jusqu'à
   30 jours après son inscription, si elle n'a pas encore payé. Le code sert
   seulement à savoir qui l'a envoyée : il ne débloque rien (règle Apple 3.1.1).
5. Chaque paiement (site ou app) d'un client parrainé crée une commission
   « en attente ». Elle devient « à verser » 30 jours plus tard ; un
   remboursement avant ce délai l'annule.
6. Une fois par mois, le créateur t'envoie sa facture et son IBAN (dès 50 € à
   verser). Tu fais le virement, puis tu cliques sur **Versé** dans la page
   admin : ses commissions passent en « versées ».

Le créateur suit tout dans son espace : visites, inscriptions, abonnés,
commissions en attente, à verser et versées.

## À régler une fois

- **Stripe** → Développeurs → Webhooks → ton endpoint
  `https://sorloo.com/api/stripe/webhook` : ajoute les événements
  **`invoice.paid`** (commissions des paiements sur le site) et
  **`charge.refunded`** (annulation en cas de remboursement).
- **RevenueCat** : rien de plus, le webhook déjà prévu dans
  `docs/paiement-app.md` suffit. Les achats de test (sandbox) ne comptent pas.

## Règles affichées aux créateurs

Mention « Collaboration commerciale » obligatoire, pas de promesse de
résultat sur la santé ou le poids, pas de contenu minceur pour les mineurs,
pas de publicité payante sur le nom Sorloo ni de spam, facture obligatoire
pour être payé. Un affilié suspendu ne gagne plus rien sur les nouveaux
paiements.

## Où c'est dans le code

- `apps/web/src/lib/affiliates.ts` : les règles (taux, durées, calculs).
- `apps/web/src/app/[locale]/r/[code]/route.ts` : le lien de parrainage.
- `apps/web/src/lib/stripe.ts` et `apps/web/src/lib/revenuecat.ts` :
  création et annulation des commissions.
- Pages : `(site)/affiliates`, `app/affiliate`, `admin/affiliates`.
