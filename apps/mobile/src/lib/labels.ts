import { lang } from "./i18n";

/** Labels shared with the website (copied from apps/web/src/messages/*.json, "enums"). */
const FR = {
  "activity": {
    "sedentary": "Sédentaire (bureau, peu de marche)",
    "light": "Légère (marche quotidienne)",
    "moderate": "Modérée (debout une bonne partie de la journée)",
    "active": "Active (métier physique)",
    "very_active": "Très active (métier très physique)"
  },
  "goal": {
    "lose_weight": "Perdre du poids",
    "maintain": "Maintenir mon poids",
    "gain_muscle": "Prendre du muscle",
    "eat_better": "Mieux manger",
    "save_money": "Petit budget",
    "family_meals": "Repas de famille"
  },
  "allergen": {
    "gluten": "Gluten",
    "dairy": "Lait / lactose",
    "egg": "Œufs",
    "peanut": "Arachides",
    "nuts": "Fruits à coque",
    "fish": "Poisson",
    "seafood": "Crustacés et mollusques",
    "soy": "Soja",
    "sesame": "Sésame",
    "celery": "Céleri",
    "mustard": "Moutarde",
    "sulphites": "Sulfites",
    "lupin": "Lupin"
  },
  "diet": {
    "omnivore": "Je mange de tout",
    "flexitarian": "Flexitarien",
    "pescatarian": "Pesco-végétarien",
    "vegetarian": "Végétarien",
    "vegan": "Végétalien"
  },
  "avoid": {
    "pork": "Porc",
    "beef": "Bœuf",
    "lamb": "Agneau",
    "alcohol": "Alcool",
    "fish": "Poisson",
    "seafood": "Fruits de mer"
  },
  "equipment": {
    "oven": "Four",
    "microwave": "Micro-ondes",
    "blender": "Mixeur",
    "airfryer": "Airfryer",
    "slowcooker": "Mijoteuse"
  },
  "sportEquipment": {
    "dumbbells": "Haltères",
    "band": "Élastique",
    "kettlebell": "Kettlebell",
    "pullup_bar": "Barre de traction",
    "bike": "Vélo",
    "pool": "Piscine"
  },
  "limitation": {
    "knees": "Genoux",
    "back": "Dos",
    "shoulders": "Épaules",
    "wrists": "Poignets"
  },
  "level": {
    "beginner": "Débutant",
    "intermediate": "Intermédiaire",
    "advanced": "Confirmé"
  },
  "pregnancy": {
    "none": "Non concernée",
    "pregnant_t1": "Enceinte, 1er trimestre",
    "pregnant_t2": "Enceinte, 2e trimestre",
    "pregnant_t3": "Enceinte, 3e trimestre",
    "breastfeeding": "J'allaite"
  },
  "medical": {
    "diabetes": "Diabète",
    "kidney_disease": "Maladie rénale",
    "heart_disease": "Maladie cardiovasculaire",
    "eating_disorder_history": "Antécédents de trouble alimentaire",
    "bariatric_surgery": "Chirurgie bariatrique",
    "other": "Autre situation suivie"
  }
} as const;

const EN: { [K in keyof typeof FR]: Record<keyof (typeof FR)[K], string> } = {
  "activity": {
    "sedentary": "Sedentary (desk job, little walking)",
    "light": "Light (daily walking)",
    "moderate": "Moderate (on your feet much of the day)",
    "active": "Active (physical job)",
    "very_active": "Very active (very physical job)"
  },
  "goal": {
    "lose_weight": "Lose weight",
    "maintain": "Maintain my weight",
    "gain_muscle": "Build muscle",
    "eat_better": "Eat better",
    "save_money": "Tight budget",
    "family_meals": "Family meals"
  },
  "allergen": {
    "gluten": "Gluten",
    "dairy": "Milk / lactose",
    "egg": "Eggs",
    "peanut": "Peanuts",
    "nuts": "Tree nuts",
    "fish": "Fish",
    "seafood": "Shellfish",
    "soy": "Soy",
    "sesame": "Sesame",
    "celery": "Celery",
    "mustard": "Mustard",
    "sulphites": "Sulphites",
    "lupin": "Lupin"
  },
  "diet": {
    "omnivore": "I eat everything",
    "flexitarian": "Flexitarian",
    "pescatarian": "Pescatarian",
    "vegetarian": "Vegetarian",
    "vegan": "Vegan"
  },
  "avoid": {
    "pork": "Pork",
    "beef": "Beef",
    "lamb": "Lamb",
    "alcohol": "Alcohol",
    "fish": "Fish",
    "seafood": "Seafood"
  },
  "equipment": {
    "oven": "Oven",
    "microwave": "Microwave",
    "blender": "Blender",
    "airfryer": "Air fryer",
    "slowcooker": "Slow cooker"
  },
  "sportEquipment": {
    "dumbbells": "Dumbbells",
    "band": "Resistance band",
    "kettlebell": "Kettlebell",
    "pullup_bar": "Pull-up bar",
    "bike": "Bike",
    "pool": "Pool"
  },
  "limitation": {
    "knees": "Knees",
    "back": "Back",
    "shoulders": "Shoulders",
    "wrists": "Wrists"
  },
  "level": {
    "beginner": "Beginner",
    "intermediate": "Intermediate",
    "advanced": "Advanced"
  },
  "pregnancy": {
    "none": "Not applicable",
    "pregnant_t1": "Pregnant, 1st trimester",
    "pregnant_t2": "Pregnant, 2nd trimester",
    "pregnant_t3": "Pregnant, 3rd trimester",
    "breastfeeding": "Breastfeeding"
  },
  "medical": {
    "diabetes": "Diabetes",
    "kidney_disease": "Kidney disease",
    "heart_disease": "Heart disease",
    "eating_disorder_history": "History of eating disorder",
    "bariatric_surgery": "Bariatric surgery",
    "other": "Other monitored condition"
  }
};

export const L: { [K in keyof typeof FR]: Record<keyof (typeof FR)[K], string> } = lang === "en" ? EN : FR;
