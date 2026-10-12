import { lang, type Lang } from "./i18n";

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

type Labels = { [K in keyof typeof FR]: Record<keyof (typeof FR)[K], string> };

const OTHERS: Record<Exclude<Lang, "fr">, Labels> = {
  "en": {
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
  },
  "de": {
    "activity": {
      "sedentary": "Sitzend (Büro, wenig Gehen)",
      "light": "Leicht (tägliches Gehen)",
      "moderate": "Mäßig (viel auf den Beinen)",
      "active": "Aktiv (körperliche Arbeit)",
      "very_active": "Sehr aktiv (sehr körperliche Arbeit)"
    },
    "goal": {
      "lose_weight": "Abnehmen",
      "maintain": "Gewicht halten",
      "gain_muscle": "Muskeln aufbauen",
      "eat_better": "Besser essen",
      "save_money": "Kleines Budget",
      "family_meals": "Familienessen"
    },
    "allergen": {
      "gluten": "Gluten",
      "dairy": "Milch / Laktose",
      "egg": "Eier",
      "peanut": "Erdnüsse",
      "nuts": "Schalenfrüchte",
      "fish": "Fisch",
      "seafood": "Krebs- und Weichtiere",
      "soy": "Soja",
      "sesame": "Sesam",
      "celery": "Sellerie",
      "mustard": "Senf",
      "sulphites": "Sulfite",
      "lupin": "Lupinen"
    },
    "diet": {
      "omnivore": "Ich esse alles",
      "flexitarian": "Flexitarisch",
      "pescatarian": "Pescetarisch",
      "vegetarian": "Vegetarisch",
      "vegan": "Vegan"
    },
    "avoid": {
      "pork": "Schwein",
      "beef": "Rind",
      "lamb": "Lamm",
      "alcohol": "Alkohol",
      "fish": "Fisch",
      "seafood": "Meeresfrüchte"
    },
    "equipment": {
      "oven": "Backofen",
      "microwave": "Mikrowelle",
      "blender": "Mixer",
      "airfryer": "Heißluftfritteuse",
      "slowcooker": "Schongarer"
    },
    "sportEquipment": {
      "dumbbells": "Kurzhanteln",
      "band": "Widerstandsband",
      "kettlebell": "Kettlebell",
      "pullup_bar": "Klimmzugstange",
      "bike": "Fahrrad",
      "pool": "Schwimmbad"
    },
    "limitation": {
      "knees": "Knie",
      "back": "Rücken",
      "shoulders": "Schultern",
      "wrists": "Handgelenke"
    },
    "level": {
      "beginner": "Anfänger",
      "intermediate": "Fortgeschritten",
      "advanced": "Erfahren"
    },
    "pregnancy": {
      "none": "Nicht zutreffend",
      "pregnant_t1": "Schwanger, 1. Trimester",
      "pregnant_t2": "Schwanger, 2. Trimester",
      "pregnant_t3": "Schwanger, 3. Trimester",
      "breastfeeding": "Ich stille"
    },
    "medical": {
      "diabetes": "Diabetes",
      "kidney_disease": "Nierenerkrankung",
      "heart_disease": "Herz-Kreislauf-Erkrankung",
      "eating_disorder_history": "Frühere Essstörung",
      "bariatric_surgery": "Bariatrische Operation",
      "other": "Andere ärztlich begleitete Situation"
    }
  },
  "es": {
    "activity": {
      "sedentary": "Sedentaria (oficina, poco caminar)",
      "light": "Ligera (camino a diario)",
      "moderate": "Moderada (de pie buena parte del día)",
      "active": "Activa (trabajo físico)",
      "very_active": "Muy activa (trabajo muy físico)"
    },
    "goal": {
      "lose_weight": "Perder peso",
      "maintain": "Mantener mi peso",
      "gain_muscle": "Ganar músculo",
      "eat_better": "Comer mejor",
      "save_money": "Presupuesto ajustado",
      "family_meals": "Comidas en familia"
    },
    "allergen": {
      "gluten": "Gluten",
      "dairy": "Leche / lactosa",
      "egg": "Huevos",
      "peanut": "Cacahuetes",
      "nuts": "Frutos de cáscara",
      "fish": "Pescado",
      "seafood": "Crustáceos y moluscos",
      "soy": "Soja",
      "sesame": "Sésamo",
      "celery": "Apio",
      "mustard": "Mostaza",
      "sulphites": "Sulfitos",
      "lupin": "Altramuces"
    },
    "diet": {
      "omnivore": "Como de todo",
      "flexitarian": "Flexitariana",
      "pescatarian": "Pescetariana",
      "vegetarian": "Vegetariana",
      "vegan": "Vegana"
    },
    "avoid": {
      "pork": "Cerdo",
      "beef": "Ternera",
      "lamb": "Cordero",
      "alcohol": "Alcohol",
      "fish": "Pescado",
      "seafood": "Marisco"
    },
    "equipment": {
      "oven": "Horno",
      "microwave": "Microondas",
      "blender": "Batidora",
      "airfryer": "Freidora de aire",
      "slowcooker": "Olla de cocción lenta"
    },
    "sportEquipment": {
      "dumbbells": "Mancuernas",
      "band": "Banda elástica",
      "kettlebell": "Kettlebell",
      "pullup_bar": "Barra de dominadas",
      "bike": "Bicicleta",
      "pool": "Piscina"
    },
    "limitation": {
      "knees": "Rodillas",
      "back": "Espalda",
      "shoulders": "Hombros",
      "wrists": "Muñecas"
    },
    "level": {
      "beginner": "Principiante",
      "intermediate": "Intermedio",
      "advanced": "Avanzado"
    },
    "pregnancy": {
      "none": "No aplica",
      "pregnant_t1": "Embarazada, 1.er trimestre",
      "pregnant_t2": "Embarazada, 2.º trimestre",
      "pregnant_t3": "Embarazada, 3.er trimestre",
      "breastfeeding": "Doy el pecho"
    },
    "medical": {
      "diabetes": "Diabetes",
      "kidney_disease": "Enfermedad renal",
      "heart_disease": "Enfermedad cardiovascular",
      "eating_disorder_history": "Antecedentes de trastorno alimentario",
      "bariatric_surgery": "Cirugía bariátrica",
      "other": "Otra situación con seguimiento"
    }
  },
  "it": {
    "activity": {
      "sedentary": "Sedentaria (ufficio, poco cammino)",
      "light": "Leggera (cammino ogni giorno)",
      "moderate": "Moderata (in piedi gran parte della giornata)",
      "active": "Attiva (lavoro fisico)",
      "very_active": "Molto attiva (lavoro molto fisico)"
    },
    "goal": {
      "lose_weight": "Perdere peso",
      "maintain": "Mantenere il peso",
      "gain_muscle": "Aumentare la massa muscolare",
      "eat_better": "Mangiare meglio",
      "save_money": "Budget ridotto",
      "family_meals": "Pasti in famiglia"
    },
    "allergen": {
      "gluten": "Glutine",
      "dairy": "Latte / lattosio",
      "egg": "Uova",
      "peanut": "Arachidi",
      "nuts": "Frutta a guscio",
      "fish": "Pesce",
      "seafood": "Crostacei e molluschi",
      "soy": "Soia",
      "sesame": "Sesamo",
      "celery": "Sedano",
      "mustard": "Senape",
      "sulphites": "Solfiti",
      "lupin": "Lupini"
    },
    "diet": {
      "omnivore": "Mangio di tutto",
      "flexitarian": "Flessitariano",
      "pescatarian": "Pescetariano",
      "vegetarian": "Vegetariano",
      "vegan": "Vegano"
    },
    "avoid": {
      "pork": "Maiale",
      "beef": "Manzo",
      "lamb": "Agnello",
      "alcohol": "Alcol",
      "fish": "Pesce",
      "seafood": "Frutti di mare"
    },
    "equipment": {
      "oven": "Forno",
      "microwave": "Microonde",
      "blender": "Frullatore",
      "airfryer": "Friggitrice ad aria",
      "slowcooker": "Slow cooker"
    },
    "sportEquipment": {
      "dumbbells": "Manubri",
      "band": "Elastico",
      "kettlebell": "Kettlebell",
      "pullup_bar": "Sbarra per trazioni",
      "bike": "Bicicletta",
      "pool": "Piscina"
    },
    "limitation": {
      "knees": "Ginocchia",
      "back": "Schiena",
      "shoulders": "Spalle",
      "wrists": "Polsi"
    },
    "level": {
      "beginner": "Principiante",
      "intermediate": "Intermedio",
      "advanced": "Avanzato"
    },
    "pregnancy": {
      "none": "Non pertinente",
      "pregnant_t1": "Incinta, 1° trimestre",
      "pregnant_t2": "Incinta, 2° trimestre",
      "pregnant_t3": "Incinta, 3° trimestre",
      "breastfeeding": "Allatto"
    },
    "medical": {
      "diabetes": "Diabete",
      "kidney_disease": "Malattia renale",
      "heart_disease": "Malattia cardiovascolare",
      "eating_disorder_history": "Precedenti di disturbi alimentari",
      "bariatric_surgery": "Chirurgia bariatrica",
      "other": "Altra situazione seguita da un medico"
    }
  },
  "pt": {
    "activity": {
      "sedentary": "Sedentária (escritório, pouca caminhada)",
      "light": "Leve (caminhada diária)",
      "moderate": "Moderada (em pé boa parte do dia)",
      "active": "Ativa (trabalho físico)",
      "very_active": "Muito ativa (trabalho muito físico)"
    },
    "goal": {
      "lose_weight": "Emagrecer",
      "maintain": "Manter o peso",
      "gain_muscle": "Ganhar massa muscular",
      "eat_better": "Comer melhor",
      "save_money": "Orçamento apertado",
      "family_meals": "Refeições em família"
    },
    "allergen": {
      "gluten": "Glúten",
      "dairy": "Leite / lactose",
      "egg": "Ovos",
      "peanut": "Amendoim",
      "nuts": "Oleaginosas",
      "fish": "Peixe",
      "seafood": "Crustáceos e moluscos",
      "soy": "Soja",
      "sesame": "Gergelim",
      "celery": "Aipo",
      "mustard": "Mostarda",
      "sulphites": "Sulfitos",
      "lupin": "Tremoço"
    },
    "diet": {
      "omnivore": "Como de tudo",
      "flexitarian": "Flexitariana",
      "pescatarian": "Pescetariana",
      "vegetarian": "Vegetariana",
      "vegan": "Vegana"
    },
    "avoid": {
      "pork": "Porco",
      "beef": "Carne bovina",
      "lamb": "Cordeiro",
      "alcohol": "Álcool",
      "fish": "Peixe",
      "seafood": "Frutos do mar"
    },
    "equipment": {
      "oven": "Forno",
      "microwave": "Micro-ondas",
      "blender": "Liquidificador",
      "airfryer": "Air fryer",
      "slowcooker": "Panela elétrica de cozimento lento"
    },
    "sportEquipment": {
      "dumbbells": "Halteres",
      "band": "Elástico",
      "kettlebell": "Kettlebell",
      "pullup_bar": "Barra fixa",
      "bike": "Bicicleta",
      "pool": "Piscina"
    },
    "limitation": {
      "knees": "Joelhos",
      "back": "Costas",
      "shoulders": "Ombros",
      "wrists": "Punhos"
    },
    "level": {
      "beginner": "Iniciante",
      "intermediate": "Intermediário",
      "advanced": "Avançado"
    },
    "pregnancy": {
      "none": "Não se aplica",
      "pregnant_t1": "Grávida, 1º trimestre",
      "pregnant_t2": "Grávida, 2º trimestre",
      "pregnant_t3": "Grávida, 3º trimestre",
      "breastfeeding": "Estou amamentando"
    },
    "medical": {
      "diabetes": "Diabetes",
      "kidney_disease": "Doença renal",
      "heart_disease": "Doença cardiovascular",
      "eating_disorder_history": "Histórico de transtorno alimentar",
      "bariatric_surgery": "Cirurgia bariátrica",
      "other": "Outra situação acompanhada"
    }
  }
};

export const L: Labels = lang === "fr" ? FR : OTHERS[lang];
