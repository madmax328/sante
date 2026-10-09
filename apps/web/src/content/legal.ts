/**
 * Legal texts. Values between brackets must be completed before launch
 * (company details, contact address). Have them reviewed by a lawyer.
 */
export type LegalDoc = "privacy" | "terms" | "notice";

interface Section {
  h: string;
  p: string[];
}
interface Doc {
  title: string;
  updated: string;
  intro?: string;
  sections: Section[];
}

const fr: Record<LegalDoc, Doc> = {
  privacy: {
    title: "Politique de confidentialité",
    updated: "Dernière mise à jour : octobre 2026",
    intro:
      "Sorloo vous aide à organiser vos repas, vos courses et votre activité physique. Pour cela, nous traitons des données personnelles, dont certaines sont des données de santé. Cette page explique lesquelles, pourquoi, et quels sont vos droits.",
    sections: [
      {
        h: "Responsable du traitement",
        p: ["[Raison sociale], [adresse], immatriculée sous le numéro [SIREN]. Contact pour toute question relative à vos données : rgpd@sorloo.com."],
      },
      {
        h: "Données traitées",
        p: [
          "Données de compte : nom, adresse e-mail, mot de passe (stocké sous forme chiffrée irréversible).",
          "Données de profil : préférences alimentaires, budget, temps disponible, matériel, disponibilités sportives.",
          "Données de santé : âge, sexe, taille, poids, mensurations, objectif, allergies, grossesse ou allaitement, situations médicales déclarées, données des membres du foyer que vous ajoutez.",
          "Données d'usage : menus générés, repas enregistrés, hydratation, séances réalisées, échanges avec l'assistant.",
          "Données de paiement : gérées exclusivement par Stripe. Nous ne voyons ni ne stockons votre numéro de carte.",
        ],
      },
      {
        h: "Base légale",
        p: [
          "Les données de santé ne sont traitées qu'avec votre consentement explicite (article 9.2.a du RGPD), recueilli lors de la création de votre profil. Vous pouvez le retirer à tout moment depuis votre compte : nous supprimerons alors ces données.",
          "Les autres données sont traitées pour exécuter le contrat qui nous lie (fourniture du service) et, pour la facturation, pour respecter nos obligations légales.",
        ],
      },
      {
        h: "Sécurité et séparation des données sensibles",
        p: [
          "Les données de santé sont stockées séparément des autres données et chiffrées (AES-256-GCM) avec une clé qui ne quitte jamais nos serveurs.",
          "Les communications sont chiffrées (HTTPS). L'accès aux bases de données est restreint et journalisé.",
        ],
      },
      {
        h: "Apple Santé et appareils connectés",
        p: [
          "Si vous connectez Apple Santé dans l'application iPhone, Sorloo lit uniquement vos pas quotidiens, vos pesées et la durée de vos entraînements (y compris ceux d'une montre ou d'une balance connectée qui alimente Apple Santé). Sorloo n'écrit rien dans Apple Santé.",
          "Ces données servent uniquement à votre suivi dans Sorloo (objectif de pas, courbe de poids, séances cochées). Elles ne sont jamais vendues, ni utilisées à des fins publicitaires, ni transmises à des tiers. Vous pouvez retirer l'accès à tout moment dans Réglages → Santé → Accès aux données → Sorloo.",
        ],
      },
      {
        h: "Sous-traitants",
        p: [
          "Vercel (hébergement de l'application, région Europe), MongoDB Atlas (base de données, région Europe), Stripe (paiements), Anthropic (assistant IA : seules les informations nécessaires à la demande sont transmises, sans votre nom ni votre e-mail), Hostinger (e-mails transactionnels), Unsplash et Pexels (photos de recettes, aucune donnée personnelle transmise ; les photos Unsplash sont chargées depuis leurs serveurs).",
          "Certains sous-traitants peuvent traiter des données hors de l'Union européenne ; ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne.",
        ],
      },
      {
        h: "Durées de conservation",
        p: [
          "Vos données sont conservées tant que votre compte est actif. Un compte inactif pendant 3 ans est supprimé après notification.",
          "Les données de facturation sont conservées 10 ans conformément aux obligations comptables.",
        ],
      },
      {
        h: "Vos droits",
        p: [
          "Vous pouvez à tout moment accéder à vos données, les rectifier, les exporter (fichier JSON téléchargeable depuis votre compte), retirer votre consentement ou supprimer votre compte et toutes vos données en un clic.",
          "Vous pouvez aussi nous contacter à rgpd@sorloo.com et introduire une réclamation auprès de la CNIL (www.cnil.fr).",
        ],
      },
      {
        h: "Avertissement",
        p: ["Sorloo est une application de bien-être et d'organisation. Elle ne remplace pas un avis médical. En cas de pathologie, de grossesse ou de trouble du comportement alimentaire, parlez-en à un professionnel de santé."],
      },
    ],
  },
  terms: {
    title: "Conditions générales d'utilisation et de vente",
    updated: "Dernière mise à jour : octobre 2026",
    sections: [
      { h: "Objet", p: ["Les présentes conditions encadrent l'utilisation de Sorloo, service en ligne d'organisation des repas, des courses et de l'activité physique, édité par [Raison sociale]."] },
      { h: "Compte", p: ["L'inscription est réservée aux personnes âgées de 15 ans et plus. Vous êtes responsable de la confidentialité de votre mot de passe."] },
      {
        h: "Nature du service",
        p: [
          "Les menus, quantités, budgets et programmes sportifs sont des suggestions calculées à partir des informations que vous fournissez et de données de référence (table CIQUAL de l'ANSES, prix moyens observés). Les prix réels peuvent varier selon les magasins.",
          "Sorloo n'est pas un dispositif médical et ne fournit pas de conseil médical. Vérifiez toujours la composition des produits en cas d'allergie.",
        ],
      },
      {
        h: "Offre gratuite et abonnement Premium",
        p: [
          "L'offre gratuite donne accès aux fonctions essentielles. L'abonnement Premium, mensuel ou annuel, donne accès à l'ensemble des fonctions décrites sur la page Tarifs.",
          "Le paiement s'effectue sur notre site web via Stripe. L'abonnement est renouvelé automatiquement et peut être résilié à tout moment depuis votre compte ; il reste actif jusqu'à la fin de la période payée.",
          "Conformément à l'article L221-28 du Code de la consommation, en demandant l'accès immédiat au service, vous renoncez à votre droit de rétractation pour la période en cours.",
        ],
      },
      { h: "Responsabilité", p: ["Nous mettons tout en œuvre pour assurer la disponibilité et l'exactitude du service, sans pouvoir garantir l'absence d'erreur. Notre responsabilité ne saurait être engagée en cas d'usage contraire aux présentes conditions ou aux recommandations de santé."] },
      { h: "Droit applicable", p: ["Les présentes conditions sont soumises au droit français. En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation : [nom et coordonnées du médiateur]."] },
    ],
  },
  notice: {
    title: "Mentions légales",
    updated: "Dernière mise à jour : octobre 2026",
    sections: [
      { h: "Éditeur", p: ["[Raison sociale], [forme juridique] au capital de [montant], [adresse], RCS [ville] [numéro]. Directeur de la publication : [nom]. Contact : contact@sorloo.com."] },
      { h: "Hébergement", p: ["Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — application servie depuis la région Europe.", "MongoDB Atlas (MongoDB, Inc.) — base de données hébergée en Europe."] },
      { h: "Crédits", p: ["Données nutritionnelles : table de composition nutritionnelle CIQUAL, ANSES. Photos de recettes : Unsplash, Pexels et leurs auteurs, crédités sur chaque recette."] },
    ],
  },
};

const en: Record<LegalDoc, Doc> = {
  privacy: {
    title: "Privacy policy",
    updated: "Last updated: October 2026",
    intro: "Sorloo helps you organise meals, groceries and exercise. To do so we process personal data, some of which is health data. This page explains what we collect, why, and your rights.",
    sections: [
      { h: "Controller", p: ["[Company name], [address], registration [number]. Data protection contact: rgpd@sorloo.com."] },
      { h: "Data we process", p: ["Account data (name, email, hashed password); profile data (food preferences, budget, time, equipment, availability); health data (age, sex, height, weight, measurements, goal, allergies, pregnancy, declared medical situations, household members you add); usage data (plans, logged meals, water, workouts, assistant conversations). Payment data is handled by Stripe only."] },
      { h: "Legal basis", p: ["Health data is processed only with your explicit consent (GDPR art. 9.2.a), which you can withdraw at any time from your account. Other data is processed to provide the service and to meet legal obligations."] },
      { h: "Security", p: ["Health data is stored separately and encrypted with AES-256-GCM using a key that never leaves our servers. All traffic uses HTTPS."] },
      { h: "Apple Health and connected devices", p: ["If you connect Apple Health in the iPhone app, Sorloo only reads your daily steps, weigh-ins and workout durations (including those from a watch or scale that feeds Apple Health). Sorloo never writes to Apple Health.", "This data is only used for your tracking in Sorloo (step goal, weight curve, ticked sessions). It is never sold, used for advertising or shared with third parties. You can remove access at any time in Settings → Health → Data Access → Sorloo."] },
      { h: "Processors", p: ["Vercel (hosting, EU region), MongoDB Atlas (database, EU region), Stripe (payments), Anthropic (AI assistant, only the data needed for each request, without your name or email), Hostinger (emails), Unsplash and Pexels (recipe photos, no personal data; Unsplash photos load from their servers). Transfers outside the EU rely on standard contractual clauses."] },
      { h: "Retention", p: ["Data is kept while your account is active; inactive accounts are deleted after 3 years with prior notice. Billing records are kept 10 years."] },
      { h: "Your rights", p: ["Access, rectification, export (JSON download from your account), consent withdrawal and one-click deletion of your account and data. Contact rgpd@sorloo.com; you may also complain to your data protection authority."] },
      { h: "Disclaimer", p: ["Sorloo is a wellness and organisation app, not medical advice."] },
    ],
  },
  terms: {
    title: "Terms of use and sale",
    updated: "Last updated: October 2026",
    sections: [
      { h: "Service", p: ["Sorloo is an online service to plan meals, groceries and exercise, published by [Company name]. Accounts are for people aged 15 and over."] },
      { h: "Nature of the service", p: ["Menus, quantities, budgets and workouts are suggestions based on the information you provide and reference data. Sorloo is not a medical device. Always check labels for allergens."] },
      { h: "Free plan and Premium", p: ["Premium is billed monthly or yearly on our website through Stripe, renews automatically and can be cancelled at any time from your account; it stays active until the end of the paid period."] },
      { h: "Governing law", p: ["French law applies."] },
    ],
  },
  notice: {
    title: "Legal notice",
    updated: "Last updated: October 2026",
    sections: [
      { h: "Publisher", p: ["[Company name], [address], [registration]. Contact: contact@sorloo.com."] },
      { h: "Hosting", p: ["Vercel Inc. (EU region) and MongoDB Atlas (EU region)."] },
      { h: "Credits", p: ["Nutrition data: ANSES CIQUAL table. Recipe photos: Unsplash, Pexels and their authors."] },
    ],
  },
};

export function legalDoc(locale: string, doc: LegalDoc): Doc {
  return (locale === "en" ? en : fr)[doc];
}

export const LEGAL_DOCS: LegalDoc[] = ["privacy", "terms", "notice"];
