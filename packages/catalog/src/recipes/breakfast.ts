import { BREAKFAST, F, capitalize, type Fruit, type R } from "../dsl";

const out: R[] = [];
const fruits = Object.values(F) as Fruit[];
const fresh = fruits.filter((f) => f.key !== "compote");

// Porridge — cow's milk or soy drink
for (const f of fresh) {
  for (const milk of [
    { id: "milk", key: "", phrase: "le lait", adj: "" },
    { id: "soy_drink", key: "-vegetal", phrase: "la boisson au soja", adj: " végétal" },
  ]) {
    out.push({
      id: `porridge${milk.key}-${f.key}`,
      name: `Porridge${milk.adj} ${f.au}`,
      desc: "Des flocons d'avoine crémeux, rassasiants jusqu'au déjeuner.",
      meals: BREAKFAST,
      ing: [["oats", 50], [milk.id, 250], ...f.ing, ["cinnamon", 0.5]],
      steps: [
        `Versez les flocons d'avoine et ${milk.phrase} dans une casserole.`,
        "Faites chauffer à feu doux 4 à 5 min en remuant, jusqu'à ce que le mélange épaississe.",
        f.prep,
        `Servez le porridge dans un bol, ajoutez les fruits et saupoudrez de cannelle.`,
      ],
      prep: 3,
      cook: 5,
      tags: ["quick", "budget"],
      cuisine: "international",
      keeps: 0,
      img: `porridge ${f.img}`,
    });
  }
}

// Overnight oats
for (const f of fresh) {
  out.push({
    id: `overnight-oats-${f.key}`,
    name: `Overnight oats ${f.au}`,
    desc: "Préparés la veille, prêts à emporter le matin.",
    meals: BREAKFAST,
    ing: [["oats", 45], ["yogurt", 125], ["milk", 100], ["chia", 10], ...f.ing],
    steps: [
      "La veille, mélangez les flocons d'avoine, le yaourt, le lait et les graines de chia dans un bocal.",
      "Fermez et laissez reposer toute la nuit au réfrigérateur.",
      f.prep,
      "Le matin, ajoutez les fruits sur le dessus et dégustez froid.",
    ],
    prep: 5,
    cook: 0,
    tags: ["no-cook", "quick", "lunchbox"],
    cuisine: "international",
    keeps: 2,
    img: `overnight oats ${f.img}`,
  });
}

// Skyr bowls
const toppings = [
  { key: "muesli", ing: [["muesli", 35]] as R["ing"], label: "et muesli", step: "Parsemez de muesli." },
  { key: "avoine-miel", ing: [["oats", 30], ["honey", 8]] as R["ing"], label: "avoine et miel", step: "Ajoutez les flocons d'avoine et un filet de miel." },
  { key: "amandes", ing: [["almonds", 15]] as R["ing"], label: "et amandes", step: "Concassez grossièrement les amandes et parsemez-les." },
  { key: "noix", ing: [["walnuts", 15]] as R["ing"], label: "et noix", step: "Émiettez les cerneaux de noix sur le dessus." },
];
for (const f of fresh) {
  for (const t of toppings.slice(0, 3)) {
    out.push({
      id: `bol-skyr-${f.key}-${t.key}`,
      name: `Bol de skyr ${f.au} ${t.label}`,
      desc: "Riche en protéines, prêt en 3 minutes.",
      meals: BREAKFAST,
      ing: [["skyr", 170], ...f.ing, ...t.ing],
      steps: ["Versez le skyr dans un bol.", f.prep, t.step],
      prep: 3,
      cook: 0,
      tags: ["no-cook", "quick", "high-protein"],
      cuisine: "nordique",
      keeps: 0,
      img: `skyr bowl ${f.img}`,
    });
  }
}

// Fromage blanc
for (const f of fresh) {
  out.push({
    id: `fromage-blanc-${f.key}-noix`,
    name: `Fromage blanc ${f.au} et noix`,
    meals: BREAKFAST,
    ing: [["fromage_blanc", 200], ...f.ing, ["walnuts", 12], ["honey", 6], ["wholemeal_bread", 40]],
    steps: [
      "Versez le fromage blanc dans un bol.",
      f.prep,
      "Ajoutez les fruits, les noix émiettées et un filet de miel.",
      "Servez avec une tranche de pain complet.",
    ],
    prep: 4,
    cook: 0,
    tags: ["no-cook", "quick"],
    cuisine: "française",
    keeps: 0,
    img: `fromage blanc ${f.img}`,
  });
}

// Plant-based yogurt bowls
for (const f of fresh) {
  out.push({
    id: `bol-soja-${f.key}`,
    name: `Bol végétal ${f.au}, avoine et graines`,
    meals: BREAKFAST,
    ing: [["soy_yogurt", 200], ...f.ing, ["oats", 35], ["chia", 8], ["maple_syrup", 8]],
    steps: [
      "Versez le dessert au soja dans un bol.",
      f.prep,
      "Ajoutez les fruits, les flocons d'avoine, les graines de chia et un filet de sirop d'érable.",
    ],
    prep: 4,
    cook: 0,
    tags: ["no-cook", "quick"],
    cuisine: "international",
    keeps: 0,
    img: `vegan yogurt bowl ${f.img}`,
  });
}

// Muesli bowls
for (const f of fresh) {
  out.push({
    id: `muesli-${f.key}`,
    name: `Muesli ${f.au} et lait`,
    meals: BREAKFAST,
    ing: [["muesli", 50], ["milk", 200], ...f.ing],
    steps: ["Versez le muesli dans un bol.", f.prep, "Ajoutez les fruits et le lait froid."],
    prep: 2,
    cook: 0,
    tags: ["no-cook", "quick", "budget"],
    cuisine: "suisse",
    keeps: 0,
    img: `muesli ${f.img}`,
  });
}

// Pancakes
for (const f of fresh) {
  out.push({
    id: `pancakes-${f.key}`,
    name: `Pancakes ${f.au}`,
    desc: "Pour les matins où l'on a un peu plus de temps.",
    meals: BREAKFAST,
    ing: [["flour", 45], ["egg", 1], ["milk", 70], ["baking_powder", 2], ["neutral_oil", 3], ...f.ing, ["maple_syrup", 10]],
    steps: [
      "Mélangez la farine et la levure, puis ajoutez l'œuf et le lait en fouettant jusqu'à obtenir une pâte lisse.",
      "Faites chauffer une poêle légèrement huilée à feu moyen.",
      "Versez de petites louches de pâte et faites cuire 1 à 2 min de chaque côté.",
      f.prep,
      "Servez les pancakes avec les fruits et un filet de sirop d'érable.",
    ],
    prep: 10,
    cook: 10,
    tags: ["weekend", "kid-friendly"],
    cuisine: "américaine",
    keeps: 1,
    img: `pancakes ${f.img}`,
  });
}

// Smoothies
const smoothies: { key: string; name: string; ing: R["ing"]; img: string }[] = [
  { key: "banane-avoine", name: "Smoothie banane, avoine et lait", ing: [["banana", 120], ["oats", 30], ["milk", 250], ["peanut_butter", 10]], img: "banana smoothie" },
  { key: "fruits-rouges", name: "Smoothie fruits rouges et yaourt", ing: [["frozen_berries", 120], ["banana", 80], ["yogurt", 125], ["milk", 100], ["oats", 25]], img: "berry smoothie" },
  { key: "mangue", name: "Smoothie mangue et skyr", ing: [["mango", 130], ["skyr", 150], ["milk", 100], ["oats", 20]], img: "mango smoothie" },
  { key: "vert", name: "Smoothie vert épinard, pomme et banane", ing: [["spinach", 40], ["apple", 120], ["banana", 100], ["yogurt", 125], ["oats", 20]], img: "green smoothie" },
  { key: "vegetal", name: "Smoothie végétal banane et fruits rouges", ing: [["banana", 120], ["frozen_berries", 80], ["soy_drink", 250], ["oats", 30]], img: "vegan smoothie" },
  { key: "kiwi", name: "Smoothie kiwi, banane et fromage blanc", ing: [["kiwi", 120], ["banana", 80], ["fromage_blanc", 150], ["oats", 20]], img: "kiwi smoothie" },
];
for (const s of smoothies) {
  out.push({
    id: `smoothie-${s.key}`,
    name: s.name,
    meals: BREAKFAST,
    ing: s.ing,
    steps: ["Épluchez et coupez les fruits si nécessaire.", "Mixez tous les ingrédients 1 min jusqu'à obtenir une texture lisse.", "Servez aussitôt."],
    prep: 5,
    cook: 0,
    tags: ["no-cook", "quick"],
    eq: ["blender"],
    cuisine: "international",
    keeps: 0,
    img: s.img,
  });
}

// Toasts
const toasts: { key: string; name: string; ing: R["ing"]; steps: string[]; img: string; tags?: R["tags"] }[] = [
  { key: "beurre-confiture", name: "Tartines beurre-confiture et fruit", ing: [["wholemeal_bread", 80], ["butter", 10], ["jam", 20], ["apple", 130], ["yogurt", 125]], steps: ["Faites griller le pain si vous le souhaitez.", "Tartinez de beurre et de confiture.", "Servez avec la pomme et le yaourt."], img: "toast jam", tags: ["budget", "kid-friendly"] },
  { key: "avocat-oeuf", name: "Tartines avocat et œuf mollet", ing: [["wholemeal_bread", 70], ["avocado", 0.5], ["egg", 1], ["lemon", 0.1], ["chili_flakes", 0.2]], steps: ["Plongez l'œuf 6 min dans l'eau bouillante puis refroidissez-le et écalez-le.", "Faites griller le pain.", "Écrasez l'avocat avec un filet de citron, sel et poivre, et tartinez.", "Posez l'œuf coupé en deux et une pincée de piment."], img: "avocado toast egg" },
  { key: "cacahuete-banane", name: "Tartines beurre de cacahuète et banane", ing: [["wholemeal_bread", 70], ["peanut_butter", 20], ["banana", 100]], steps: ["Faites griller le pain.", "Tartinez de beurre de cacahuète.", "Ajoutez la banane en rondelles."], img: "peanut butter banana toast", tags: ["quick", "kid-friendly"] },
  { key: "ricotta-miel", name: "Tartines ricotta, miel et fruits rouges", ing: [["wholemeal_bread", 70], ["ricotta", 60], ["honey", 8], ["frozen_berries", 80]], steps: ["Faites griller le pain.", "Étalez la ricotta.", "Ajoutez les fruits rouges décongelés et un filet de miel."], img: "ricotta toast berries" },
  { key: "fromage-frais-concombre", name: "Tartines fromage frais, concombre et ciboulette", ing: [["wholemeal_bread", 70], ["cream_cheese", 30], ["cucumber", 80], ["chives", 3], ["skyr", 100]], steps: ["Tartinez le pain de fromage frais.", "Ajoutez de fines rondelles de concombre et la ciboulette ciselée.", "Servez avec le skyr."], img: "cream cheese cucumber toast" },
  { key: "jambon-fromage", name: "Tartines jambon et fromage frais", ing: [["wholemeal_bread", 70], ["cream_cheese", 25], ["ham", 40], ["orange", 150]], steps: ["Tartinez le pain de fromage frais.", "Ajoutez le jambon.", "Servez avec l'orange."], img: "ham toast" },
  { key: "saumon-fume", name: "Tartines saumon fumé et fromage frais", ing: [["wholemeal_bread", 70], ["cream_cheese", 25], ["smoked_salmon", 40], ["lemon", 0.1], ["chives", 2]], steps: ["Tartinez le pain de fromage frais.", "Ajoutez le saumon fumé, un trait de citron et la ciboulette."], img: "smoked salmon toast", tags: ["weekend"] },
  { key: "houmous-tomate", name: "Tartines houmous et tomate", ing: [["wholemeal_bread", 70], ["hummus", 40], ["tomato", 100], ["soy_yogurt", 125]], steps: ["Tartinez le pain de houmous.", "Ajoutez la tomate en rondelles, sel, poivre.", "Servez avec le dessert au soja."], img: "hummus toast tomato" },
  { key: "comte-pomme", name: "Tartines comté et pomme", ing: [["wholemeal_bread", 70], ["comte", 25], ["apple", 130]], steps: ["Coupez le comté en fines lamelles.", "Posez-les sur le pain, faites gratiner 3 min au four si vous le souhaitez.", "Servez avec la pomme."], img: "cheese toast apple" },
];
for (const t of toasts) {
  out.push({
    id: `tartines-${t.key}`,
    name: t.name,
    meals: BREAKFAST,
    ing: t.ing,
    steps: t.steps,
    prep: 5,
    cook: 2,
    tags: t.tags ?? ["quick"],
    cuisine: "française",
    keeps: 0,
    img: t.img,
  });
}

// Scrambled eggs
const scrambles: { key: string; en: string; label: string; ing: R["ing"]; step: string }[] = [
  { key: "nature", en: "", label: "", ing: [["chives", 3]], step: "Parsemez de ciboulette ciselée." },
  { key: "epinards", en: "spinach", label: "aux épinards", ing: [["spinach", 60]], step: "Faites tomber les épinards 1 min dans la poêle avant d'ajouter les œufs." },
  { key: "tomates", en: "tomatoes", label: "aux tomates cerises", ing: [["cherry_tomato", 100]], step: "Faites revenir les tomates cerises coupées en deux 2 min avant les œufs." },
  { key: "champignons", en: "mushrooms", label: "aux champignons", ing: [["mushroom", 100]], step: "Faites dorer les champignons émincés 4 min avant d'ajouter les œufs." },
  { key: "fromage", en: "cheese", label: "au fromage", ing: [["emmental", 15]], step: "Ajoutez le fromage râpé en fin de cuisson." },
  { key: "saumon", en: "smoked salmon", label: "au saumon fumé", ing: [["smoked_salmon", 30], ["chives", 2]], step: "Ajoutez le saumon fumé en lanières hors du feu." },
];
for (const s of scrambles) {
  out.push({
    id: `oeufs-brouilles-${s.key}`,
    name: capitalize(`œufs brouillés ${s.label}`.trim() + " et pain complet"),
    meals: BREAKFAST,
    ing: [["egg", 2], ["butter", 5], ["wholemeal_bread", 50], ...s.ing],
    steps: [
      "Battez les œufs avec une pincée de sel et de poivre.",
      s.step,
      "Faites fondre le beurre à feu doux, versez les œufs et remuez sans arrêt 2 à 3 min jusqu'à ce qu'ils soient crémeux.",
      "Servez avec le pain grillé.",
    ],
    prep: 3,
    cook: 5,
    tags: ["quick", "high-protein"],
    cuisine: "française",
    keeps: 0,
    img: `scrambled eggs ${s.en}`.trim(),
  });
}

// Tofu scramble (vegan)
for (const v of [
  { key: "epinards", label: "aux épinards", ing: [["spinach", 60]] as R["ing"] },
  { key: "tomates", label: "aux tomates", ing: [["cherry_tomato", 100]] as R["ing"] },
  { key: "champignons", label: "aux champignons", ing: [["mushroom", 100]] as R["ing"] },
]) {
  out.push({
    id: `tofu-brouille-${v.key}`,
    name: `Tofu brouillé ${v.label}`,
    desc: "L'alternative végétale aux œufs brouillés.",
    meals: BREAKFAST,
    ing: [["tofu", 120], ["turmeric", 0.5], ["olive_oil", 5], ["wholemeal_bread", 50], ...v.ing],
    steps: [
      "Émiettez le tofu à la fourchette.",
      "Faites revenir les légumes 2 à 3 min dans l'huile.",
      "Ajoutez le tofu et le curcuma, salez, poivrez et faites cuire 4 min en remuant.",
      "Servez avec le pain grillé.",
    ],
    prep: 5,
    cook: 7,
    tags: ["quick", "high-protein"],
    cuisine: "international",
    keeps: 0,
    img: "tofu scramble",
  });
}

// French toast
for (const f of [F.banana, F.berries, F.apple] as Fruit[]) {
  out.push({
    id: `pain-perdu-${f.key}`,
    name: `Pain perdu ${f.au}`,
    meals: BREAKFAST,
    ing: [["wholemeal_bread", 70], ["egg", 1], ["milk", 80], ["cinnamon", 0.5], ["butter", 5], ...f.ing],
    steps: [
      "Battez l'œuf avec le lait et la cannelle.",
      "Trempez les tranches de pain dans le mélange.",
      "Faites-les dorer 2 min de chaque côté dans le beurre.",
      f.prep,
      "Servez avec les fruits.",
    ],
    prep: 5,
    cook: 6,
    tags: ["weekend", "kid-friendly", "budget"],
    cuisine: "française",
    keeps: 0,
    img: `french toast ${f.img}`,
  });
}

out.push({
  id: "banana-bread-avoine",
  name: "Banana bread à l'avoine",
  desc: "Un cake moelleux peu sucré, à préparer le week-end pour plusieurs matins.",
  meals: ["breakfast", "snack"],
  ing: [["banana", 90], ["oats", 30], ["flour", 20], ["egg", 0.5], ["milk", 20], ["brown_sugar", 6], ["baking_powder", 2], ["walnuts", 8]],
  steps: [
    "Préchauffez le four à 180 °C.",
    "Écrasez les bananes, ajoutez les œufs, le lait et le sucre.",
    "Incorporez les flocons d'avoine, la farine, la levure et les noix concassées.",
    "Versez dans un moule à cake et faites cuire 40 min.",
    "Laissez refroidir avant de trancher. Se conserve 4 jours dans un torchon.",
  ],
  prep: 15,
  cook: 40,
  tags: ["batch", "weekend", "kid-friendly"],
  eq: ["oven"],
  cuisine: "américaine",
  keeps: 4,
  img: "banana bread",
});

// Porridge with toppings
const porridgeToppings: { key: string; label: string; ing: R["ing"]; step: string }[] = [
  { key: "cacahuete", label: "et beurre de cacahuète", ing: [["peanut_butter", 12]], step: "Ajoutez une cuillère de beurre de cacahuète." },
  { key: "amandes", label: "et amandes", ing: [["almonds", 12]], step: "Parsemez d'amandes concassées." },
  { key: "cacao", label: "au cacao", ing: [["cocoa", 5], ["honey", 5]], step: "Ajoutez le cacao et le miel pendant la cuisson." },
];
for (const f of fresh)
  for (const t of porridgeToppings) {
    out.push({
      id: `porridge-${f.key}-${t.key}`,
      name: `Porridge ${f.au} ${t.label}`,
      meals: BREAKFAST,
      ing: [["oats", 45], ["milk", 220], ...f.ing, ...t.ing],
      steps: [
        "Faites chauffer les flocons d'avoine et le lait à feu doux 4 à 5 min en remuant.",
        f.prep,
        t.step,
        "Servez chaud avec les fruits.",
      ],
      prep: 3,
      cook: 5,
      tags: ["quick", "budget"],
      cuisine: "internationale",
      keeps: 0,
      img: `porridge ${f.img}`,
    });
  }

// Plant-based overnight oats, chia puddings, muesli + yogurt
for (const f of fresh) {
  out.push({
    id: `overnight-oats-vegetal-${f.key}`,
    name: `Overnight oats végétaux ${f.au}`,
    meals: BREAKFAST,
    ing: [["oats", 45], ["soy_yogurt", 125], ["soy_drink", 100], ["chia", 10], ...f.ing],
    steps: [
      "La veille, mélangez les flocons, le dessert au soja, la boisson au soja et le chia dans un bocal.",
      "Laissez reposer toute la nuit au réfrigérateur.",
      f.prep,
      "Le matin, ajoutez les fruits.",
    ],
    prep: 5,
    cook: 0,
    tags: ["no-cook", "lunchbox"],
    cuisine: "internationale",
    keeps: 2,
    img: `overnight oats ${f.img}`,
  });
  out.push({
    id: `chia-pudding-${f.key}`,
    name: `Chia pudding ${f.au}`,
    meals: BREAKFAST,
    ing: [["chia", 25], ["milk", 200], ["honey", 6], ["yogurt", 60], ...f.ing, ["oats", 20]],
    steps: [
      "La veille, mélangez les graines de chia, le lait et le miel, remuez à nouveau après 10 min.",
      "Laissez prendre toute la nuit au réfrigérateur.",
      f.prep,
      "Servez avec le yaourt, les flocons d'avoine et les fruits.",
    ],
    prep: 5,
    cook: 0,
    tags: ["no-cook", "lunchbox"],
    cuisine: "internationale",
    keeps: 2,
    img: `chia pudding ${f.img}`,
  });
  out.push({
    id: `muesli-yaourt-${f.key}`,
    name: `Muesli au yaourt ${f.au}`,
    meals: BREAKFAST,
    ing: [["muesli", 45], ["yogurt", 150], ...f.ing],
    steps: ["Versez le yaourt dans un bol.", f.prep, "Ajoutez le muesli et les fruits."],
    prep: 3,
    cook: 0,
    tags: ["no-cook", "quick"],
    cuisine: "suisse",
    keeps: 0,
    img: `muesli yogurt ${f.img}`,
  });
}

export const breakfasts = out;
