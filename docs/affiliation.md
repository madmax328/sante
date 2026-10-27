# Programme affiliés

Les créateurs de contenu recommandent Sorloo et touchent **25 %** de ce que
Sorloo reçoit vraiment (hors TVA, et après la part d'Apple ou de Google dans
l'app) sur chaque paiement des abonnés qu'ils amènent, pendant les
**12 premiers mois** de chaque abonnement.

Les affiliés **n'ont pas de compte Sorloo** : ils ont leur propre espace,
avec e-mail et mot de passe, et n'apparaissent pas dans la liste des inscrits.

## Le parcours

1. **Candidature** : le lien « Affiliation » en bas du site ouvre
   **sorloo.com/affiliates** (présentation, règles, formulaire). Le créateur
   donne son nom, son e-mail, ses réseaux sociaux (lien ou @pseudo, nombre
   d'abonnés) et quelques mots. Tu reçois un e-mail (`ADMIN_EMAIL`).
2. **Ta décision**, dans **Administration → Affiliés** (`/admin/affiliates`) :
   les liens vers ses profils s'ouvrent dans un nouvel onglet.
   - **Valider** : un code aléatoire de 6 caractères lui est attribué (sans
     0/O ni 1/I/L, par exemple `K7M4QX`) et il reçoit un e-mail avec un lien
     pour **choisir son mot de passe** (valable 7 jours).
   - **Refuser** : il reçoit un e-mail et peut compléter sa candidature avec
     la même adresse.
   - **Suspendre** : ses nouveaux abonnés ne rapportent plus rien.
   - **Envoyer le lien du mot de passe** : pour un affilié qui a perdu l'e-mail
     (ou ceux validés pendant les tests, qui n'ont pas encore de mot de passe).
3. **Espace affilié** (`/affiliates/login`, mot de passe oublié possible) :
   son lien `sorloo.com/r/CODE` et son code, ses visites, inscriptions et
   abonnés, le **compteur disponible** avec une barre jusqu'à 50 €, les
   montants en attente, demandés et versés, ses informations de paiement, ses
   versements avec leur PDF, et le détail de ses commissions.
4. **Attribution des clients** : le lien retient le visiteur 60 jours ; le
   compte créé est lié au créateur pour toujours. Un client peut aussi saisir
   le code dans **Mon compte** (site ou app) jusqu'à 30 jours après son
   inscription, s'il n'a pas encore payé. Le code ne débloque rien (règle
   Apple 3.1.1).
5. **Commissions** : chaque paiement d'un client parrainé crée une commission
   « en attente ». Elle devient « disponible » 30 jours plus tard ; un
   remboursement avant ce délai l'annule. Les achats de test ne comptent pas.
6. **Versement** : quand le disponible atteint **50 €** et que ses
   informations de paiement sont remplies, le bouton **Demander mon
   versement** se débloque. Tu reçois un e-mail ; la demande apparaît en haut
   de la page admin avec le montant, le titulaire, l'**IBAN complet** et le
   **PDF à télécharger**. Tu fais le virement, puis **Versé** : l'affilié est
   prévenu par e-mail. **Annuler** remet les commissions en « disponible ».

## Particulier ou professionnel

L'affilié choisit son statut dans son espace :

- **Particulier** (pas besoin de SIRET) : chaque versement est accompagné d'un
  **relevé de commissions** (numéros `RC-2026-0001`…). Ce n'est pas une
  facture ; le particulier déclare lui-même ces sommes dans ses revenus.
- **Professionnel** (SIRET pour la France, numéro de TVA pour l'étranger) : il
  accepte une fois le **mandat d'autofacturation**, et Sorloo émet la
  **facture à sa place** (numéros `AF-2026-0001`…), avec la bonne mention de
  TVA : franchise (art. 293 B du CGI), TVA à 20 % ajoutée au versement, ou
  autoliquidation pour une entreprise d'un autre pays de l'UE.

L'IBAN est vérifié (clé de contrôle), **chiffré** dans la base et n'est
affiché en entier que dans l'admin et sur le PDF.

**DAS2** : au-delà de **1 200 € versés dans l'année** à une même personne,
Sorloo doit le déclarer aux impôts. La page admin affiche le total versé dans
l'année par affilié et signale ceux qui dépassent le seuil.

À faire valider par ton comptable, en particulier l'autofacturation.

## À régler une fois

- **Vercel** : les informations de la société imprimées sur les factures et
  relevés (sans elles, le PDF affiche « [Raison sociale] », « [SIREN] ») :

  | Variable | Exemple |
  | --- | --- |
  | `COMPANY_NAME` | `Sorloo SAS` |
  | `COMPANY_ADDRESS` | `12 rue Exemple\|75001 Paris\|France` (lignes séparées par `\|`) |
  | `COMPANY_SIREN` | `123 456 789` |
  | `COMPANY_VAT_NUMBER` | `FR12123456789` (facultatif) |

- **Stripe** → Développeurs → Webhooks → l'endpoint
  `https://sorloo.com/api/stripe/webhook` : ajoute les événements
  **`invoice.paid`** et **`charge.refunded`**.
- **RevenueCat** : rien de plus, le webhook de `docs/paiement-app.md` suffit.

## Règles affichées aux créateurs

Mention « Collaboration commerciale » obligatoire, pas de promesse de
résultat sur la santé ou le poids, pas de contenu minceur pour les mineurs,
pas de publicité payante sur le nom Sorloo ni de spam ou de site de codes
promo ; Sorloo peut refuser ou suspendre un affilié.

## Où c'est dans le code

- `apps/web/src/lib/affiliates.ts` : les règles (taux, durées, calculs,
  mots de passe, versements).
- `apps/web/src/lib/affiliate-auth.ts` : la session de l'espace affilié.
- `apps/web/src/lib/affiliate-pdf.ts` : la facture et le relevé.
- `apps/web/src/app/[locale]/r/[code]/route.ts` : le lien de parrainage.
- `apps/web/src/lib/stripe.ts` et `apps/web/src/lib/revenuecat.ts` :
  création et annulation des commissions.
- Pages : `(site)/affiliates` (candidature, connexion, mot de passe, espace),
  `admin/affiliates`, et le PDF `api/affiliates/payouts/[id]`.
