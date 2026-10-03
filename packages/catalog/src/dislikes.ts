import type { Localized } from "@weeko/engine";

export interface DislikeGroup {
  id: string;
  name: Localized;
  /** Catalog ingredients covered by this choice */
  ingredients: string[];
}

/** The usual "I don't eat…" answers, each covering every form of the food. */
export const DISLIKE_GROUPS: DislikeGroup[] = [
  { id: "mushroom", name: { fr: "Champignons", en: "Mushrooms" }, ingredients: ["mushroom"] },
  { id: "tomato", name: { fr: "Tomates", en: "Tomatoes" }, ingredients: ["tomato", "cherry_tomato", "canned_tomato", "passata", "tomato_paste"] },
  { id: "onion", name: { fr: "Oignons", en: "Onions" }, ingredients: ["onion", "red_onion", "shallot", "spring_onion"] },
  { id: "garlic", name: { fr: "Ail", en: "Garlic" }, ingredients: ["garlic"] },
  { id: "bell_pepper", name: { fr: "Poivrons", en: "Bell peppers" }, ingredients: ["bell_pepper"] },
  { id: "eggplant", name: { fr: "Aubergine", en: "Eggplant" }, ingredients: ["eggplant"] },
  { id: "zucchini", name: { fr: "Courgette", en: "Zucchini" }, ingredients: ["zucchini"] },
  { id: "spinach", name: { fr: "Épinards", en: "Spinach" }, ingredients: ["spinach", "frozen_spinach"] },
  { id: "cabbage", name: { fr: "Choux", en: "Cabbage" }, ingredients: ["cabbage", "red_cabbage", "cauliflower"] },
  { id: "broccoli", name: { fr: "Brocoli", en: "Broccoli" }, ingredients: ["broccoli", "frozen_broccoli"] },
  { id: "green_beans", name: { fr: "Haricots verts", en: "Green beans" }, ingredients: ["green_beans", "frozen_green_beans"] },
  { id: "peas", name: { fr: "Petits pois", en: "Peas" }, ingredients: ["frozen_peas"] },
  { id: "leek", name: { fr: "Poireau", en: "Leek" }, ingredients: ["leek"] },
  { id: "celery", name: { fr: "Céleri", en: "Celery" }, ingredients: ["celery"] },
  { id: "fennel", name: { fr: "Fenouil", en: "Fennel" }, ingredients: ["fennel"] },
  { id: "beetroot", name: { fr: "Betterave", en: "Beetroot" }, ingredients: ["beetroot"] },
  { id: "radish", name: { fr: "Radis", en: "Radish" }, ingredients: ["radish"] },
  { id: "avocado", name: { fr: "Avocat", en: "Avocado" }, ingredients: ["avocado"] },
  { id: "olives", name: { fr: "Olives", en: "Olives" }, ingredients: ["olives"] },
  { id: "coriander", name: { fr: "Coriandre", en: "Coriander" }, ingredients: ["coriander"] },
  { id: "herbs", name: { fr: "Herbes fraîches", en: "Fresh herbs" }, ingredients: ["parsley", "basil", "coriander", "chives", "mint"] },
  { id: "ginger", name: { fr: "Gingembre", en: "Ginger" }, ingredients: ["ginger"] },
  { id: "spicy", name: { fr: "Piment / épicé", en: "Chili / spicy" }, ingredients: ["chili_flakes", "chili_powder", "curry_paste"] },
  { id: "curry", name: { fr: "Curry et épices fortes", en: "Curry & strong spices" }, ingredients: ["curry", "garam_masala", "ras_el_hanout", "five_spice", "cumin", "curry_paste"] },
  { id: "coconut", name: { fr: "Coco", en: "Coconut" }, ingredients: ["coconut_milk"] },
  { id: "lentils", name: { fr: "Lentilles", en: "Lentils" }, ingredients: ["green_lentils", "red_lentils"] },
  { id: "chickpeas", name: { fr: "Pois chiches", en: "Chickpeas" }, ingredients: ["chickpeas", "hummus"] },
  { id: "beans", name: { fr: "Haricots secs", en: "Beans" }, ingredients: ["kidney_beans", "white_beans"] },
  { id: "tofu", name: { fr: "Tofu et soja", en: "Tofu & soy" }, ingredients: ["tofu", "smoked_tofu", "soy_mince"] },
  { id: "quinoa", name: { fr: "Quinoa", en: "Quinoa" }, ingredients: ["quinoa"] },
  { id: "cheese", name: { fr: "Fromage", en: "Cheese" }, ingredients: ["emmental", "mozzarella", "parmesan", "feta", "goat_cheese", "comte", "ricotta", "raclette", "cream_cheese"] },
  { id: "goat_cheese", name: { fr: "Chèvre", en: "Goat cheese" }, ingredients: ["goat_cheese"] },
  { id: "salmon", name: { fr: "Saumon", en: "Salmon" }, ingredients: ["salmon", "frozen_salmon", "smoked_salmon"] },
  { id: "tuna", name: { fr: "Thon", en: "Tuna" }, ingredients: ["tuna_can"] },
  { id: "oily_fish", name: { fr: "Sardines, maquereau", en: "Sardines, mackerel" }, ingredients: ["sardines_can", "mackerel_can"] },
  { id: "shrimp", name: { fr: "Crevettes", en: "Shrimp" }, ingredients: ["shrimp", "surimi"] },
  { id: "mussels", name: { fr: "Moules", en: "Mussels" }, ingredients: ["mussels"] },
  { id: "cured_meat", name: { fr: "Charcuterie", en: "Cured meats" }, ingredients: ["ham", "bacon", "chorizo", "sausage", "merguez"] },
  { id: "nuts", name: { fr: "Fruits à coque", en: "Nuts" }, ingredients: ["almonds", "walnuts", "cashews", "peanut_butter"] },
  { id: "banana", name: { fr: "Banane", en: "Banana" }, ingredients: ["banana"] },
  { id: "kiwi", name: { fr: "Kiwi", en: "Kiwi" }, ingredients: ["kiwi"] },
  { id: "mango", name: { fr: "Mangue", en: "Mango" }, ingredients: ["mango"] },
  { id: "dried_fruit", name: { fr: "Fruits secs", en: "Dried fruit" }, ingredients: ["raisins", "dried_apricot", "dates"] },
];
