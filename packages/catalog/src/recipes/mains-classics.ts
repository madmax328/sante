import { MAIN, S, capitalize, type Ing, type R, type Starch } from "../dsl";

const out: R[] = [];

function add(r: Omit<R, "meals"> & { meals?: R["meals"] }) {
  out.push({ meals: MAIN, ...r });
}

// ------------------------------------------------------------------ Viande / poisson + accompagnement
const mains: { key: string; name: string; ing: Ing[]; step: string; img: string; tags?: R["tags"] }[] = [
  { key: "steak-hache", name: "Steak haché", ing: [["ground_beef", 125]], step: "Faites cuire le steak haché 3 à 4 min de chaque côté dans une poêle chaude, jusqu'à ce qu'il soit cuit à cœur.", img: "burger patty", tags: ["kid-friendly"] },
  { key: "bavette", name: "Bavette à l'échalote", ing: [["beef_steak", 130], ["shallot", 25], ["vinegar", 5]], step: "Saisissez la bavette 2 à 3 min de chaque côté, laissez-la reposer. Faites fondre l'échalote émincée dans la poêle et déglacez au vinaigre.", img: "flank steak shallots" },
  { key: "escalope-dinde", name: "Escalope de dinde à la crème", ing: [["turkey", 130], ["light_cream", 30], ["mushroom", 60]], step: "Faites dorer l'escalope 4 min de chaque côté. Ajoutez les champignons émincés puis la crème et laissez réduire 3 min.", img: "turkey cream sauce" },
  { key: "colin-pane", name: "Colin pané maison", ing: [["white_fish", 150], ["breadcrumbs", 20], ["egg", 0.5], ["flour", 8]], step: "Passez le colin dans la farine, l'œuf battu puis la chapelure. Faites-le dorer 3 min de chaque côté dans un fond d'huile.", img: "breaded fish", tags: ["kid-friendly"] },
  { key: "saumon-grille", name: "Pavé de saumon grillé", ing: [["salmon", 130], ["lemon", 0.25]], step: "Faites cuire le saumon côté peau 5 min, retournez-le 2 min. Arrosez de citron.", img: "grilled salmon" },
  { key: "cote-porc", name: "Côte de porc aux herbes", ing: [["pork_chop", 160], ["thyme", 0.5]], step: "Faites cuire la côte de porc 5 à 6 min de chaque côté avec le thym, jusqu'à ce qu'elle soit cuite à cœur.", img: "pork chop" },
  { key: "poulet-citron", name: "Blanc de poulet au citron", ing: [["chicken_breast", 140], ["lemon", 0.25], ["thyme", 0.5]], step: "Faites dorer le poulet 6 à 7 min de chaque côté, jusqu'à cuisson complète. Arrosez de jus de citron en fin de cuisson.", img: "lemon chicken" },
];
const sides: { key: string; name: string; ing: Ing[]; step: string; img: string; oven?: boolean; min: number }[] = [
  { key: "frites-four", name: "frites au four", ing: [["potato", 250], ["olive_oil", 8], ["paprika", 0.5]], step: "Coupez les pommes de terre en frites, mélangez-les avec l'huile et le paprika et faites-les cuire 30 min à 220 °C en les retournant.", img: "oven fries", oven: true, min: 30 },
  { key: "puree", name: "purée maison", ing: [["potato", 250], ["milk", 60], ["butter", 8], ["nutmeg", 0.2]], step: "Faites cuire les pommes de terre 20 min à l'eau, écrasez-les avec le lait chaud, le beurre et la muscade.", img: "mashed potatoes", min: 20 },
  { key: "haricots-pdt", name: "haricots verts et pommes de terre vapeur", ing: [["frozen_green_beans", 150], ["potato", 180], ["olive_oil", 5]], step: "Faites cuire les pommes de terre 20 min et les haricots verts 10 min à la vapeur, arrosez d'un filet d'huile.", img: "green beans potatoes", min: 20 },
  { key: "riz-pilaf", name: "riz pilaf et carottes", ing: [["rice", 75], ["onion", 30], ["carrot", 100], ["olive_oil", 5], ["stock_cube", 0.3]], step: "Faites revenir l'oignon dans l'huile, ajoutez le riz 1 min puis 1,5 fois son volume d'eau et le bouillon. Couvrez 15 min. Faites cuire les carottes en rondelles à la vapeur.", img: "rice pilaf", min: 18 },
  { key: "poelee-legumes", name: "poêlée de légumes et pain complet", ing: [["frozen_veg_mix", 200], ["wholemeal_bread", 60], ["olive_oil", 5]], step: "Faites revenir la poêlée de légumes 10 min dans l'huile.", img: "vegetables", min: 10 },
  { key: "lentilles", name: "lentilles aux carottes", ing: [["green_lentils", 60], ["carrot", 80], ["onion", 30], ["thyme", 0.5], ["bay_leaf", 1]], step: "Faites cuire les lentilles 25 min avec la carotte en dés, l'oignon, le thym et le laurier.", img: "lentils carrots", min: 25 },
];
for (const m of mains)
  for (const s of sides) {
    add({
      id: `${m.key}-${s.key}`,
      name: `${m.name}, ${s.name}`,
      ing: [...m.ing, ...s.ing, ["neutral_oil", 5]],
      steps: [s.step, m.step, "Salez, poivrez et servez aussitôt."],
      prep: 10,
      cook: Math.max(12, s.min),
      tags: [...(m.tags ?? []), ...(s.key === "lentilles" || s.key === "puree" ? (["comfort"] as const) : [])],
      eq: s.oven ? ["oven"] : [],
      cuisine: "française",
      keeps: 1,
      img: `${m.img} ${s.img}`,
    });
  }

// ------------------------------------------------------------------ Gratins de pâtes / riz
const gratinP: { key: string; au: string; ing: Ing[]; img: string }[] = [
  { key: "poulet", au: "au poulet", ing: [["chicken_breast", 110]], img: "chicken" },
  { key: "jambon", au: "au jambon", ing: [["ham", 70]], img: "ham" },
  { key: "thon", au: "au thon", ing: [["tuna_can", 80]], img: "tuna" },
  { key: "saumon", au: "au saumon", ing: [["salmon", 100]], img: "salmon" },
  { key: "pois-chiches", au: "aux pois chiches", ing: [["chickpeas", 120]], img: "chickpeas" },
];
const gratinV: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "brocolis", label: "et brocolis", ing: [["broccoli", 130]], img: "broccoli" },
  { key: "courgettes", label: "et courgettes", ing: [["zucchini", 140]], img: "zucchini" },
  { key: "epinards", label: "et épinards", ing: [["frozen_spinach", 120]], img: "spinach" },
  { key: "poireaux", label: "et poireaux", ing: [["leek", 130]], img: "leeks" },
];
for (const p of gratinP)
  for (const v of gratinV)
    for (const s of [S.pasta, S.wholePasta] as Starch[]) {
      add({
        id: `gratin-${s.key}-${p.key}-${v.key}`,
        name: `Gratin de ${s.name} ${p.au} ${v.label}`,
        ing: [...s.ing, ...p.ing, ...v.ing, ["milk", 100], ["flour", 8], ["butter", 6], ["emmental", 20], ["nutmeg", 0.1]],
        steps: [
          "Préchauffez le four à 200 °C.",
          `${s.cook} Les pâtes doivent rester un peu fermes.`,
          `Faites cuire les légumes 5 min à la vapeur (ou faites revenir ${v.key === "poireaux" ? "les poireaux émincés" : "les légumes"} 5 min).`,
          "Préparez une béchamel légère : faites fondre le beurre, ajoutez la farine puis le lait en fouettant jusqu'à épaississement. Salez, poivrez, ajoutez la muscade.",
          p.key === "poulet" || p.key === "saumon" ? `Coupez le ${p.key} en dés et faites-le dorer 5 min.` : `Préparez la garniture (${p.au.replace(/^au |^aux /, "")}) en morceaux.`,
          "Mélangez le tout dans un plat, parsemez d'emmental et enfournez 20 min.",
        ],
        prep: 15,
        cook: 30,
        tags: ["batch", "kid-friendly", "comfort"],
        eq: ["oven"],
        cuisine: "française",
        keeps: 3,
        img: `pasta bake ${p.img} ${v.img}`,
      });
    }

// ------------------------------------------------------------------ Risottos
const risottoV: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "champignons", label: "aux champignons", ing: [["mushroom", 150]], img: "mushroom risotto" },
  { key: "courgette", label: "à la courgette et au citron", ing: [["zucchini", 150], ["lemon", 0.25]], img: "zucchini risotto" },
  { key: "butternut", label: "à la butternut", ing: [["butternut", 180]], img: "butternut risotto" },
  { key: "petits-pois", label: "aux petits pois", ing: [["frozen_peas", 100], ["mint", 2]], img: "pea risotto" },
  { key: "epinards", label: "aux épinards", ing: [["spinach", 80]], img: "spinach risotto" },
];
const risottoP: { key: string; label: string; ing: Ing[]; step: string }[] = [
  { key: "parmesan", label: "", ing: [["parmesan", 15], ["white_beans", 60]], step: "Ajoutez les haricots blancs égouttés en même temps que les légumes." },
  { key: "poulet", label: " et poulet", ing: [["chicken_breast", 110], ["parmesan", 10]], step: "Faites dorer le poulet en dés 6 à 8 min à part et ajoutez-le en fin de cuisson." },
  { key: "crevettes", label: " et crevettes", ing: [["shrimp", 110], ["parmesan", 8]], step: "Faites sauter les crevettes 3 min à part et ajoutez-les en fin de cuisson." },
];
for (const v of risottoV)
  for (const p of risottoP) {
    add({
      id: `risotto-${v.key}-${p.key}`,
      name: `Risotto ${v.label}${p.label}`,
      ing: [["risotto_rice", 75], ["onion", 30], ["stock_cube", 0.5], ["olive_oil", 6], ["butter", 5], ...v.ing, ...p.ing],
      steps: [
        "Faites chauffer 300 ml d'eau avec le bouillon.",
        "Faites revenir l'oignon haché dans l'huile, ajoutez le riz et nacrez-le 2 min.",
        "Versez le bouillon louche par louche en remuant, pendant 18 min. Ajoutez les légumes coupés en petits morceaux à mi-cuisson.",
        p.step,
        "Hors du feu, ajoutez le beurre et le parmesan, couvrez 2 min et servez.",
      ],
      prep: 10,
      cook: 25,
      tags: ["comfort", "weekend"],
      cuisine: "italienne",
      keeps: 1,
      img: v.img,
    });
  }

// ------------------------------------------------------------------ One-pot quinoa / semoule
const onePotP: { key: string; au: string; ing: Ing[]; img: string }[] = [
  { key: "poulet", au: "au poulet", ing: [["chicken_breast", 120]], img: "chicken" },
  { key: "pois-chiches", au: "aux pois chiches", ing: [["chickpeas", 140]], img: "chickpeas" },
  { key: "dinde", au: "à la dinde", ing: [["turkey", 120]], img: "turkey" },
  { key: "crevettes", au: "aux crevettes", ing: [["shrimp", 120]], img: "shrimp" },
  { key: "lentilles", au: "aux lentilles corail", ing: [["red_lentils", 50]], img: "lentils" },
];
const onePotV: { key: string; label: string; ing: Ing[] }[] = [
  { key: "soleil", label: "et légumes du soleil", ing: [["zucchini", 100], ["bell_pepper", 70], ["canned_tomato", 100]] },
  { key: "epinards", label: "et épinards", ing: [["frozen_spinach", 120], ["onion", 30]] },
  { key: "carottes-cumin", label: "carottes et cumin", ing: [["carrot", 120], ["onion", 30], ["cumin", 1]] },
  { key: "champignons", label: "et champignons", ing: [["mushroom", 120], ["shallot", 15]] },
];
for (const p of onePotP)
  for (const v of onePotV)
    for (const s of [
      { key: "quinoa", name: "Quinoa", ing: [["quinoa", 65]] as Ing[], min: 15 },
      { key: "boulgour", name: "Boulgour", ing: [["bulgur", 65]] as Ing[], min: 12 },
    ]) {
      add({
        id: `one-pot-${s.key}-${p.key}-${v.key}`,
        name: `${s.name} one-pot ${p.au} ${v.label}`.replace(" et et ", " et "),
        desc: "Tout cuit dans la même casserole.",
        ing: [...s.ing, ...p.ing, ...v.ing, ["stock_cube", 0.5], ["olive_oil", 8], ["garlic", 1]],
        steps: [
          "Faites revenir l'ail et les légumes coupés en dés 5 min dans l'huile.",
          p.key === "lentilles" || p.key === "pois-chiches" ? "Ajoutez la garniture (rincée et égouttée)." : "Ajoutez la garniture coupée en morceaux et faites-la dorer 3 min.",
          `Ajoutez le ${s.name.toLowerCase()} rincé, le bouillon émietté et 2 fois son volume d'eau.`,
          `Couvrez et laissez cuire ${s.min} min à feu doux jusqu'à absorption, en vérifiant que la garniture est cuite.`,
          "Salez, poivrez et servez.",
        ],
        prep: 10,
        cook: s.min + 8,
        tags: ["one-pot", "batch"],
        cuisine: "méditerranéenne",
        keeps: 3,
        img: `${s.key} one pot ${p.img}`,
      });
    }

// ------------------------------------------------------------------ Dhal
const dhalV: { key: string; label: string; ing: Ing[] }[] = [
  { key: "nature", label: "", ing: [["canned_tomato", 80]] },
  { key: "epinards", label: "aux épinards", ing: [["spinach", 80]] },
  { key: "patate-douce", label: "à la patate douce", ing: [["sweet_potato", 120]] },
  { key: "butternut", label: "à la butternut", ing: [["butternut", 150]] },
  { key: "chou-fleur", label: "au chou-fleur", ing: [["cauliflower", 150]] },
];
for (const v of dhalV)
  for (const s of [S.basmati, S.brownRice] as Starch[]) {
    add({
      id: `dhal-${v.key}-${s.key}`,
      name: `Dhal de lentilles corail ${v.label}, ${s.name}`.replace("  ", " "),
      desc: "Un plat végétal complet, économique et rassasiant.",
      ing: [["red_lentils", 70], ...s.ing, ...v.ing, ["onion", 40], ["garlic", 1], ["ginger", 4], ["coconut_milk", 50], ["curry", 2], ["turmeric", 0.5], ["neutral_oil", 5], ["coriander", 3]],
      steps: [
        "Faites revenir l'oignon, l'ail et le gingembre hachés dans l'huile avec les épices 3 min.",
        "Ajoutez les lentilles rincées, les légumes coupés en dés, le lait de coco et 250 ml d'eau.",
        "Laissez mijoter 20 min en remuant, jusqu'à ce que les lentilles soient fondantes.",
        s.cook,
        "Parsemez de coriandre et servez avec le riz.",
      ],
      prep: 10,
      cook: 25,
      tags: ["batch", "budget", "high-protein"],
      cuisine: "indienne",
      keeps: 3,
      img: "red lentil dhal",
    });
  }

// ------------------------------------------------------------------ Chili & bolognaise
const mincers: { key: string; label: string; ing: Ing[]; step: string; img: string }[] = [
  { key: "boeuf", label: "", ing: [["ground_beef", 110]], step: "Faites dorer le bœuf haché 5 min en l'émiettant.", img: "beef" },
  { key: "soja", label: "végétarien (soja)", ing: [["soy_mince", 35]], step: "Réhydratez les protéines de soja 10 min dans de l'eau chaude, égouttez-les et faites-les revenir 3 min.", img: "vegetarian" },
  { key: "lentilles", label: "aux lentilles", ing: [["green_lentils", 50]], step: "Faites cuire les lentilles 20 min à l'eau puis égouttez-les.", img: "lentil" },
];
for (const m of mincers) {
  for (const s of [S.rice, S.brownRice] as Starch[]) {
    add({
      id: `chili-${m.key}-${s.key}`,
      name: `Chili ${m.key === "boeuf" ? "con carne" : m.label}, ${s.name}`,
      ing: [...m.ing, ...s.ing, ["kidney_beans", 80], ["canned_tomato", 150], ["onion", 40], ["bell_pepper", 60], ["corn", 30], ["garlic", 1], ["chili_powder", 2], ["cumin", 1], ["olive_oil", 6]],
      steps: [
        "Faites revenir l'oignon, l'ail et le poivron en dés 5 min dans l'huile.",
        m.step,
        "Ajoutez les épices, les tomates, les haricots rouges et le maïs égouttés. Laissez mijoter 20 min.",
        s.cook,
        "Servez le chili sur le riz.",
      ],
      prep: 15,
      cook: 30,
      tags: ["batch", "budget", "comfort"],
      cuisine: "tex-mex",
      keeps: 3,
      img: `chili ${m.img}`,
    });
  }
  for (const s of [S.pasta, S.wholePasta] as Starch[]) {
    add({
      id: `bolognaise-${m.key}-${s.key}`,
      name: `${capitalize(s.name)} à la bolognaise ${m.label}`.trim(),
      ing: [...m.ing, ...s.ing, ["passata", 150], ["onion", 40], ["carrot", 60], ["garlic", 1], ["oregano", 0.5], ["olive_oil", 6], ["parmesan", 8]],
      steps: [
        "Faites revenir l'oignon, la carotte et l'ail finement hachés 5 min dans l'huile.",
        m.step,
        "Ajoutez le coulis de tomate et l'origan, et laissez mijoter 20 min à feu doux.",
        s.cook,
        "Servez la sauce sur les pâtes avec le parmesan.",
      ],
      prep: 15,
      cook: 30,
      tags: ["batch", "kid-friendly", "comfort"],
      cuisine: "italienne",
      keeps: 3,
      img: `bolognese ${m.img}`,
    });
  }
}

// ------------------------------------------------------------------ Couscous & tajines
const couscousP: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "poulet", label: "au poulet", ing: [["chicken_thigh", 140]], img: "chicken" },
  { key: "agneau", label: "à l'agneau", ing: [["lamb", 130]], img: "lamb" },
  { key: "merguez", label: "aux merguez", ing: [["merguez", 100]], img: "merguez" },
  { key: "legumes", label: "aux légumes et pois chiches", ing: [["chickpeas", 120]], img: "vegetable" },
];
for (const p of couscousP) {
  add({
    id: `couscous-${p.key}`,
    name: `Couscous ${p.label}`,
    ing: [...p.ing, ["couscous", 70], ["carrot", 100], ["zucchini", 100], ["onion", 40], ["chickpeas", p.key === "legumes" ? 0 : 50], ["canned_tomato", 80], ["ras_el_hanout", 2], ["olive_oil", 6], ["stock_cube", 0.5]],
    steps: [
      "Faites dorer la viande (ou les pois chiches) dans l'huile avec l'oignon et le ras el hanout.",
      "Ajoutez les carottes, les tomates, le bouillon et 400 ml d'eau. Laissez mijoter 25 min.",
      "Ajoutez les courgettes et les pois chiches et poursuivez 15 min.",
      S.couscous.cook,
      "Servez la semoule avec les légumes, la viande et le bouillon.",
    ],
    prep: 20,
    cook: 45,
    tags: ["batch", "weekend"],
    cuisine: "maghrébine",
    keeps: 3,
    img: `couscous ${p.img}`,
  });
  add({
    id: `tajine-${p.key}`,
    name: `Tajine ${p.label}, carottes et abricots`,
    ing: [...p.ing, ["carrot", 120], ["dried_apricot", 20], ["onion", 50], ["chickpeas", p.key === "legumes" ? 0 : 40], ["ras_el_hanout", 2], ["cinnamon", 0.5], ["olive_oil", 6], ["coriander", 3], ["bulgur", 60]],
    steps: [
      "Faites dorer la garniture avec l'oignon émincé dans l'huile.",
      "Ajoutez les épices, les carottes en rondelles, les abricots, les pois chiches et 200 ml d'eau.",
      "Couvrez et laissez mijoter 40 min à feu doux.",
      S.bulgur.cook,
      "Parsemez de coriandre et servez avec le boulgour.",
    ],
    prep: 15,
    cook: 45,
    tags: ["batch"],
    cuisine: "maghrébine",
    keeps: 3,
    img: `tagine ${p.img}`,
  });
}

// ------------------------------------------------------------------ Soupes complètes
const soups: { key: string; name: string; ing: Ing[]; steps: string[]; img: string }[] = [
  { key: "carotte-cumin", name: "Velouté de carottes au cumin", ing: [["carrot", 250], ["onion", 40], ["potato", 80], ["cumin", 1], ["stock_cube", 0.5], ["olive_oil", 5]], steps: ["Faites revenir l'oignon avec le cumin.", "Ajoutez les carottes et la pomme de terre en morceaux, couvrez d'eau avec le bouillon et laissez cuire 25 min.", "Mixez."], img: "carrot soup" },
  { key: "courgette", name: "Velouté de courgettes au fromage frais", ing: [["zucchini", 300], ["onion", 30], ["potato", 60], ["cream_cheese", 20], ["stock_cube", 0.5]], steps: ["Faites cuire les courgettes, l'oignon et la pomme de terre 20 min dans l'eau avec le bouillon.", "Mixez avec le fromage frais."], img: "zucchini soup" },
  { key: "butternut", name: "Velouté de butternut", ing: [["butternut", 300], ["onion", 40], ["light_cream", 15], ["nutmeg", 0.1], ["stock_cube", 0.5]], steps: ["Épluchez et coupez la courge en cubes.", "Faites-la cuire 25 min avec l'oignon dans l'eau et le bouillon.", "Mixez avec la crème et la muscade."], img: "butternut soup" },
  { key: "brocoli", name: "Velouté de brocoli", ing: [["broccoli", 250], ["onion", 30], ["potato", 80], ["stock_cube", 0.5], ["light_cream", 15]], steps: ["Faites cuire le brocoli, l'oignon et la pomme de terre 20 min dans l'eau avec le bouillon.", "Mixez avec la crème."], img: "broccoli soup" },
  { key: "poireaux-pdt", name: "Soupe poireaux-pommes de terre", ing: [["leek", 200], ["potato", 150], ["butter", 5], ["stock_cube", 0.5], ["milk", 50]], steps: ["Faites suer les poireaux émincés dans le beurre 5 min.", "Ajoutez les pommes de terre en dés, couvrez d'eau avec le bouillon et laissez cuire 25 min.", "Mixez avec le lait."], img: "leek potato soup" },
  { key: "lentilles-carotte", name: "Soupe de lentilles corail et carottes", ing: [["red_lentils", 50], ["carrot", 150], ["onion", 40], ["coconut_milk", 30], ["cumin", 1], ["stock_cube", 0.5]], steps: ["Faites revenir l'oignon avec le cumin.", "Ajoutez les lentilles, les carottes, le bouillon et 500 ml d'eau. Laissez cuire 20 min.", "Mixez avec le lait de coco."], img: "red lentil soup" },
  { key: "minestrone", name: "Minestrone", ing: [["zucchini", 80], ["carrot", 70], ["celery", 40], ["white_beans", 70], ["canned_tomato", 100], ["pasta", 25], ["stock_cube", 0.5], ["olive_oil", 5], ["parmesan", 8]], steps: ["Faites revenir les légumes coupés en petits dés dans l'huile 5 min.", "Ajoutez les tomates, le bouillon et 500 ml d'eau, laissez cuire 15 min.", "Ajoutez les pâtes et les haricots blancs et poursuivez 10 min. Servez avec le parmesan."], img: "minestrone" },
  { key: "tomate", name: "Soupe de tomates rôties", ing: [["tomato", 300], ["onion", 40], ["garlic", 1], ["olive_oil", 8], ["basil", 3], ["stock_cube", 0.3]], steps: ["Faites rôtir les tomates, l'oignon et l'ail 25 min à 200 °C avec l'huile.", "Mixez avec 200 ml de bouillon chaud et le basilic."], img: "tomato soup" },
  { key: "chou-fleur", name: "Velouté de chou-fleur", ing: [["cauliflower", 300], ["onion", 30], ["milk", 80], ["nutmeg", 0.1], ["stock_cube", 0.5]], steps: ["Faites cuire le chou-fleur et l'oignon 20 min dans l'eau avec le bouillon.", "Mixez avec le lait et la muscade."], img: "cauliflower soup" },
  { key: "petits-pois", name: "Velouté de petits pois à la menthe", ing: [["frozen_peas", 200], ["onion", 30], ["mint", 3], ["stock_cube", 0.5], ["light_cream", 15]], steps: ["Faites cuire les petits pois et l'oignon 12 min dans l'eau avec le bouillon.", "Mixez avec la menthe et la crème."], img: "pea soup" },
];
const soupSides: { key: string; label: string; ing: Ing[]; step: string }[] = [
  { key: "chevre", label: "et tartines de chèvre", ing: [["wholemeal_bread", 70], ["goat_cheese", 35]], step: "Garnissez le pain de chèvre et faites gratiner 5 min au four." },
  { key: "oeuf", label: "œuf mollet et pain complet", ing: [["egg", 2], ["wholemeal_bread", 60]], step: "Faites cuire les œufs 6 min, refroidissez-les et servez-les dans la soupe avec le pain." },
  { key: "houmous", label: "et tartines de houmous", ing: [["wholemeal_bread", 70], ["hummus", 40]], step: "Servez avec le pain grillé tartiné de houmous." },
  { key: "comte", label: "et croûtons au comté", ing: [["wholemeal_bread", 60], ["comte", 30]], step: "Faites griller le pain coupé en cubes avec le comté râpé 5 min au four." },
];
for (const sp of soups)
  for (const side of soupSides) {
    add({
      id: `soupe-${sp.key}-${side.key}`,
      name: `${sp.name}${side.key === "oeuf" ? ", " : " "}${side.label}`,
      meals: ["dinner", "lunch"],
      ing: [...sp.ing, ...side.ing],
      steps: [...sp.steps, "Salez, poivrez.", side.step],
      prep: 10,
      cook: 25,
      tags: ["batch", "light", "comfort"],
      eq: side.key === "oeuf" || side.key === "houmous" ? ["blender"] : ["oven", "blender"],
      cuisine: "française",
      keeps: 3,
      img: sp.img,
    });
  }

// ------------------------------------------------------------------ Omelettes
const omelettes: { key: string; label: string; ing: Ing[] }[] = [
  { key: "courgettes", label: "aux courgettes", ing: [["zucchini", 150]] },
  { key: "epinards-feta", label: "épinards et feta", ing: [["spinach", 80], ["feta", 30]] },
  { key: "champignons", label: "aux champignons", ing: [["mushroom", 150]] },
  { key: "pdt", label: "espagnole aux pommes de terre", ing: [["potato", 200], ["onion", 40]] },
  { key: "poivrons", label: "aux poivrons", ing: [["bell_pepper", 120], ["onion", 30]] },
  { key: "jambon-fromage", label: "jambon-fromage", ing: [["ham", 50], ["emmental", 20]] },
  { key: "fines-herbes", label: "aux fines herbes et chèvre", ing: [["chives", 5], ["parsley", 5], ["goat_cheese", 30]] },
];
const omeletteSides: { key: string; label: string; ing: Ing[]; step: string }[] = [
  { key: "salade", label: "salade verte et pain complet", ing: [["lettuce", 60], ["wholemeal_bread", 60], ["olive_oil", 5], ["mustard", 2], ["vinegar", 3]], step: "Servez avec la salade assaisonnée et le pain." },
  { key: "pdt", label: "pommes de terre sautées", ing: [["potato", 200], ["olive_oil", 5], ["lettuce", 40]], step: "Faites sauter les pommes de terre cuites en rondelles 10 min et servez avec un peu de salade." },
];
for (const o of omelettes)
  for (const side of omeletteSides) {
    if (o.key === "pdt" && side.key === "pdt") continue;
    add({
      id: `omelette-${o.key}-${side.key}`,
      name: `Omelette ${o.label}, ${side.label}`,
      ing: [["egg", 3], ["olive_oil", 5], ...o.ing, ...side.ing],
      steps: [
        "Faites revenir la garniture coupée en petits morceaux 5 à 8 min dans l'huile.",
        "Battez les œufs avec sel et poivre, versez-les sur la garniture.",
        "Laissez cuire à feu doux 5 min, couvert, jusqu'à ce que l'omelette soit prise.",
        side.step,
      ],
      prep: 10,
      cook: 15,
      tags: ["quick", "budget", "high-protein"],
      cuisine: "française",
      keeps: 1,
      img: "omelette",
    });
  }

// ------------------------------------------------------------------ Tartes & quiches
const tarts: { key: string; name: string; ing: Ing[]; img: string }[] = [
  { key: "lorraine", name: "Quiche lorraine", ing: [["bacon", 40], ["emmental", 15]], img: "quiche lorraine" },
  { key: "poireaux", name: "Quiche aux poireaux", ing: [["leek", 130], ["emmental", 15]], img: "leek quiche" },
  { key: "saumon-epinards", name: "Quiche saumon et épinards", ing: [["salmon", 70], ["frozen_spinach", 80]], img: "salmon spinach quiche" },
  { key: "chevre-courgette", name: "Tarte chèvre et courgette", ing: [["zucchini", 120], ["goat_cheese", 35]], img: "goat cheese zucchini tart" },
  { key: "thon-tomate", name: "Tarte thon, tomate et moutarde", ing: [["tuna_can", 60], ["tomato", 100], ["mustard", 8], ["emmental", 10]], img: "tuna tomato tart" },
  { key: "brocoli-comte", name: "Quiche brocoli et comté", ing: [["broccoli", 120], ["comte", 20]], img: "broccoli quiche" },
];
for (const t of tarts)
  for (const side of [
    { key: "salade", label: "salade verte", ing: [["lettuce", 70], ["olive_oil", 5], ["vinegar", 3]] as Ing[] },
    { key: "crudites", label: "carottes râpées", ing: [["carrot", 120], ["lemon", 0.2], ["olive_oil", 5]] as Ing[] },
  ]) {
    add({
      id: `tarte-${t.key}-${side.key}`,
      name: `${t.name} et ${side.label}`,
      ing: [["shortcrust", 55], ["egg", 1], ["milk", 60], ["light_cream", 20], ...t.ing, ...side.ing],
      steps: [
        "Préchauffez le four à 190 °C et foncez un moule avec la pâte.",
        "Préparez la garniture : coupez les légumes, faites-les revenir 5 min (les lardons à sec), émiettez le poisson ou le fromage.",
        "Battez les œufs avec le lait et la crème, salez (peu si lardons), poivrez.",
        "Répartissez la garniture sur la pâte, versez l'appareil et enfournez 35 min.",
        `Servez avec la ${side.label} assaisonnée.`,
      ],
      prep: 20,
      cook: 35,
      tags: ["batch", "lunchbox"],
      eq: ["oven"],
      cuisine: "française",
      keeps: 3,
      img: t.img,
    });
  }

// ------------------------------------------------------------------ Burgers, pizzas, Tex-Mex
for (const b of [
  { key: "boeuf", name: "Burger maison au bœuf", ing: [["ground_beef", 120], ["emmental", 15]] as Ing[], step: "Formez un steak et faites-le cuire 3 à 4 min de chaque côté, jusqu'à cuisson à cœur." },
  { key: "poulet", name: "Burger au poulet croustillant", ing: [["chicken_breast", 120], ["breadcrumbs", 15], ["egg", 0.3]] as Ing[], step: "Aplatissez le poulet, passez-le dans l'œuf puis la chapelure et faites-le dorer 5 min de chaque côté." },
  { key: "vege", name: "Burger végétarien aux pois chiches", ing: [["chickpeas", 120], ["breadcrumbs", 15], ["cumin", 1], ["egg", 0.3]] as Ing[], step: "Écrasez les pois chiches avec la chapelure, l'œuf et le cumin, formez une galette et faites-la dorer 4 min de chaque côté." },
])
  for (const side of [
    { key: "frites", label: "et frites au four", ing: [["potato", 200], ["olive_oil", 8]] as Ing[], step: "Faites cuire les frites 30 min à 220 °C.", oven: true },
    { key: "salade", label: "et salade", ing: [["salad_mix", 50], ["cherry_tomato", 80], ["olive_oil", 5]] as Ing[], step: "Servez avec la salade et les tomates cerises.", oven: false },
  ]) {
    add({
      id: `burger-${b.key}-${side.key}`,
      name: `${b.name} ${side.label}`,
      ing: [["burger_bun", 1], ["lettuce", 15], ["tomato", 50], ["red_onion", 15], ["ketchup", 8], ...b.ing, ...side.ing],
      steps: [side.step, b.step, "Faites toaster les pains et garnissez-les de salade, tomate, oignon et sauce."],
      prep: 15,
      cook: side.oven ? 30 : 10,
      tags: ["weekend", "kid-friendly"],
      eq: side.oven ? ["oven"] : [],
      cuisine: "américaine",
      keeps: 0,
      img: `burger ${b.key === "vege" ? "veggie" : b.key === "poulet" ? "chicken" : "beef"}`,
    });
  }

for (const pz of [
  { key: "margherita", name: "Pizza margherita maison", ing: [["passata", 60], ["mozzarella", 60], ["basil", 3]] as Ing[] },
  { key: "reine", name: "Pizza reine maison", ing: [["passata", 60], ["mozzarella", 50], ["ham", 40], ["mushroom", 50]] as Ing[] },
  { key: "legumes", name: "Pizza aux légumes grillés", ing: [["passata", 60], ["mozzarella", 50], ["zucchini", 70], ["bell_pepper", 50], ["eggplant", 50]] as Ing[] },
  { key: "chevre-miel", name: "Pizza chèvre, miel et roquette", ing: [["cream", 20], ["goat_cheese", 45], ["honey", 5], ["arugula", 20]] as Ing[] },
  { key: "thon", name: "Pizza au thon et oignons rouges", ing: [["passata", 60], ["mozzarella", 40], ["tuna_can", 50], ["red_onion", 30], ["olives", 10]] as Ing[] },
]) {
  add({
    id: `pizza-${pz.key}`,
    name: pz.name,
    ing: [["pizza_dough", 130], ["olive_oil", 4], ["oregano", 0.3], ["salad_mix", 30], ...pz.ing],
    steps: [
      "Préchauffez le four à 240 °C.",
      "Étalez la pâte sur une plaque, garnissez de sauce puis des ingrédients.",
      "Enfournez 12 à 15 min jusqu'à ce que la pâte soit dorée.",
      "Servez avec un peu de salade.",
    ],
    prep: 15,
    cook: 15,
    tags: ["weekend", "kid-friendly"],
    eq: ["oven"],
    cuisine: "italienne",
    keeps: 1,
    img: `pizza ${pz.key === "legumes" ? "vegetables" : pz.key}`,
  });
}

const texMexP: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "poulet", label: "au poulet", ing: [["chicken_breast", 120]], img: "chicken" },
  { key: "boeuf", label: "au bœuf", ing: [["beef_steak", 110]], img: "beef" },
  { key: "dinde", label: "à la dinde", ing: [["turkey", 120]], img: "turkey" },
  { key: "crevettes", label: "aux crevettes", ing: [["shrimp", 120]], img: "shrimp" },
  { key: "haricots", label: "aux haricots rouges", ing: [["kidney_beans", 140]], img: "beans" },
  { key: "tofu", label: "au tofu", ing: [["tofu", 140]], img: "tofu" },
];
for (const p of texMexP) {
  add({
    id: `fajitas-${p.key}`,
    name: `Fajitas ${p.label}`,
    ing: [...p.ing, ["tortilla", 2], ["bell_pepper", 100], ["onion", 50], ["chili_powder", 1], ["cumin", 1], ["greek_yogurt", 30], ["lime", 0.25], ["neutral_oil", 6]],
    steps: [
      "Émincez les poivrons et l'oignon.",
      "Faites revenir la garniture coupée en lanières avec les épices dans l'huile jusqu'à cuisson complète, puis ajoutez les légumes 5 min.",
      "Réchauffez les tortillas, garnissez-les et ajoutez une cuillère de yaourt et un trait de citron vert.",
    ],
    prep: 15,
    cook: 12,
    tags: ["quick", "kid-friendly"],
    cuisine: "tex-mex",
    keeps: 1,
    img: `fajitas ${p.img}`,
  });
  add({
    id: `burrito-bowl-${p.key}`,
    name: `Burrito bowl ${p.label}`,
    ing: [...p.ing, ["rice", 65], ["kidney_beans", p.key === "haricots" ? 0 : 60], ["corn", 40], ["tomato", 80], ["lettuce", 30], ["avocado", 0.3], ["lime", 0.25], ["cumin", 1], ["chili_powder", 1], ["neutral_oil", 5]],
    steps: [
      S.rice.cook,
      "Faites cuire la garniture avec les épices dans l'huile, jusqu'à cuisson complète.",
      "Réchauffez les haricots et le maïs.",
      "Composez le bol avec le riz, la garniture, les haricots, le maïs, la tomate, la salade et l'avocat. Arrosez de citron vert.",
    ],
    prep: 15,
    cook: 15,
    tags: ["lunchbox"],
    cuisine: "tex-mex",
    keeps: 2,
    img: `burrito bowl ${p.img}`,
  });
  add({
    id: `quesadillas-${p.key}`,
    name: `Quesadillas ${p.label} et salade`,
    ing: [...p.ing.map(([id, q]) => [id, q * 0.8] as Ing), ["tortilla", 2], ["emmental", 30], ["bell_pepper", 50], ["salad_mix", 40], ["neutral_oil", 4]],
    steps: [
      "Faites cuire la garniture émincée avec le poivron 6 à 8 min jusqu'à cuisson complète.",
      "Garnissez une tortilla, parsemez de fromage, recouvrez d'une seconde tortilla.",
      "Faites dorer 2 min de chaque côté dans une poêle, coupez en parts et servez avec la salade.",
    ],
    prep: 10,
    cook: 12,
    tags: ["quick", "kid-friendly"],
    cuisine: "tex-mex",
    keeps: 0,
    img: `quesadilla ${p.img}`,
  });
}

// ------------------------------------------------------------------ Gnocchis, légumes farcis
for (const g of [
  { key: "pesto-poulet", name: "Gnocchis au pesto, poulet et tomates cerises", ing: [["chicken_breast", 100], ["pesto", 20], ["cherry_tomato", 100]] as Ing[] },
  { key: "tomate-mozza", name: "Gnocchis gratinés tomate-mozzarella", ing: [["passata", 120], ["mozzarella", 50], ["basil", 3]] as Ing[] },
  { key: "epinards-ricotta", name: "Gnocchis épinards et ricotta", ing: [["spinach", 100], ["ricotta", 50], ["parmesan", 8]] as Ing[] },
  { key: "champignons", name: "Gnocchis poêlés aux champignons et crème légère", ing: [["mushroom", 150], ["light_cream", 30], ["parsley", 3]] as Ing[] },
]) {
  add({
    id: `gnocchis-${g.key}`,
    name: g.name,
    ing: [["gnocchi", 200], ["olive_oil", 6], ["garlic", 1], ...g.ing],
    steps: [
      "Faites dorer les gnocchis 6 à 8 min à la poêle dans l'huile (inutile de les précuire).",
      "Ajoutez la garniture et faites cuire 5 min (le poulet doit être bien cuit).",
      "Assaisonnez et servez.",
    ],
    prep: 5,
    cook: 15,
    tags: ["quick", "kid-friendly"],
    cuisine: "italienne",
    keeps: 1,
    img: `gnocchi ${g.key.split("-")[0]}`,
  });
}

for (const v of [
  { key: "tomates", label: "Tomates", ing: [["tomato", 300]] as Ing[] },
  { key: "courgettes", label: "Courgettes", ing: [["zucchini", 300]] as Ing[] },
  { key: "poivrons", label: "Poivrons", ing: [["bell_pepper", 250]] as Ing[] },
])
  for (const f of [
    { key: "boeuf", label: "farcis au bœuf", ing: [["ground_beef", 100]] as Ing[] },
    { key: "vege", label: "farcis au boulgour et feta", ing: [["feta", 35], ["chickpeas", 60]] as Ing[] },
  ]) {
    add({
      id: `farcis-${v.key}-${f.key}`,
      name: `${v.label} ${f.label}, ${f.key === "boeuf" ? "riz" : "boulgour"}`,
      ing: [...v.ing, ...f.ing, [f.key === "boeuf" ? "rice" : "bulgur", 60], ["onion", 30], ["garlic", 1], ["parsley", 4], ["olive_oil", 6]],
      steps: [
        "Préchauffez le four à 190 °C.",
        "Videz les légumes en gardant un chapeau.",
        `Faites revenir l'oignon et l'ail, ajoutez la farce et ${f.key === "boeuf" ? "faites cuire le bœuf 5 min" : "les pois chiches écrasés et la feta"}, puis le persil.`,
        `Faites cuire le ${f.key === "boeuf" ? "riz" : "boulgour"} et mélangez-en un tiers à la farce. Garnissez les légumes.`,
        "Enfournez 35 min et servez avec le reste de l'accompagnement.",
      ],
      prep: 25,
      cook: 35,
      tags: ["weekend"],
      eq: ["oven"],
      cuisine: "française",
      keeps: 2,
      img: `stuffed ${v.key === "tomates" ? "tomatoes" : v.key === "courgettes" ? "zucchini" : "peppers"}`,
    });
  }

// ------------------------------------------------------------------ Grands classiques
const singles: (Omit<R, "meals"> & { meals?: R["meals"] })[] = [
  { id: "hachis-parmentier", name: "Hachis parmentier", ing: [["ground_beef", 110], ["potato", 250], ["milk", 60], ["butter", 6], ["onion", 40], ["emmental", 15]], steps: ["Préchauffez le four à 200 °C.", "Préparez une purée avec les pommes de terre cuites, le lait et le beurre.", "Faites revenir l'oignon et le bœuf haché 6 min.", "Étalez la viande dans un plat, couvrez de purée, parsemez de fromage et enfournez 20 min."], prep: 20, cook: 45, tags: ["batch", "comfort", "kid-friendly"], eq: ["oven"], cuisine: "française", keeps: 3, img: "shepherds pie" },
  { id: "parmentier-lentilles", name: "Parmentier de lentilles et patate douce", ing: [["green_lentils", 60], ["sweet_potato", 200], ["potato", 80], ["carrot", 60], ["onion", 40], ["milk", 50], ["emmental", 15]], steps: ["Préchauffez le four à 200 °C.", "Faites cuire les lentilles 25 min avec la carotte et l'oignon.", "Préparez une purée de patate douce et pommes de terre avec le lait.", "Superposez lentilles et purée, parsemez de fromage, enfournez 20 min."], prep: 20, cook: 45, tags: ["batch", "budget"], eq: ["oven"], cuisine: "française", keeps: 3, img: "lentil shepherds pie" },
  { id: "parmentier-poisson", name: "Parmentier de colin aux épinards", ing: [["white_fish", 130], ["potato", 250], ["frozen_spinach", 80], ["milk", 70], ["butter", 6], ["emmental", 15]], steps: ["Préchauffez le four à 200 °C.", "Faites pocher le colin 8 min, émiettez-le avec les épinards égouttés.", "Préparez une purée avec le lait et le beurre.", "Montez le parmentier, parsemez de fromage, enfournez 20 min."], prep: 20, cook: 40, tags: ["batch", "kid-friendly"], eq: ["oven"], cuisine: "française", keeps: 2, img: "fish pie" },
  { id: "lasagnes-bolognaise", name: "Lasagnes à la bolognaise", ing: [["lasagna_sheets", 60], ["ground_beef", 100], ["passata", 120], ["onion", 30], ["carrot", 40], ["milk", 100], ["flour", 8], ["butter", 6], ["emmental", 20]], steps: ["Préparez la bolognaise : oignon, carotte, bœuf haché, coulis de tomate, 20 min de cuisson.", "Préparez une béchamel avec le beurre, la farine et le lait.", "Alternez pâtes, bolognaise et béchamel dans un plat, terminez par le fromage.", "Enfournez 35 min à 180 °C."], prep: 30, cook: 55, tags: ["batch", "comfort", "kid-friendly", "weekend"], eq: ["oven"], cuisine: "italienne", keeps: 3, img: "lasagna" },
  { id: "lasagnes-epinards-ricotta", name: "Lasagnes épinards et ricotta", ing: [["lasagna_sheets", 60], ["frozen_spinach", 150], ["ricotta", 70], ["passata", 100], ["mozzarella", 30], ["parmesan", 8], ["nutmeg", 0.1]], steps: ["Mélangez les épinards décongelés et pressés avec la ricotta, la muscade, sel et poivre.", "Alternez pâtes, sauce tomate et mélange épinards-ricotta.", "Terminez par la mozzarella et le parmesan, enfournez 35 min à 180 °C."], prep: 25, cook: 35, tags: ["batch", "weekend"], eq: ["oven"], cuisine: "italienne", keeps: 3, img: "spinach ricotta lasagna" },
  { id: "lasagnes-saumon", name: "Lasagnes saumon et épinards", ing: [["lasagna_sheets", 60], ["salmon", 90], ["frozen_spinach", 120], ["milk", 120], ["flour", 8], ["butter", 6], ["emmental", 15]], steps: ["Préparez une béchamel avec le beurre, la farine et le lait.", "Coupez le saumon en dés.", "Alternez pâtes, épinards, saumon et béchamel, terminez par le fromage.", "Enfournez 35 min à 180 °C."], prep: 25, cook: 35, tags: ["batch", "weekend"], eq: ["oven"], cuisine: "française", keeps: 2, img: "salmon lasagna" },
  { id: "ratatouille-quinoa", name: "Ratatouille et quinoa", ing: [["zucchini", 120], ["eggplant", 120], ["bell_pepper", 80], ["tomato", 120], ["onion", 40], ["garlic", 1], ["olive_oil", 10], ["herbes_provence", 1], ["quinoa", 65], ["feta", 25]], steps: ["Coupez tous les légumes en dés.", "Faites revenir l'oignon et l'ail dans l'huile, ajoutez les légumes et les herbes et laissez mijoter 35 min.", S.quinoa.cook, "Servez la ratatouille sur le quinoa avec la feta émiettée."], prep: 20, cook: 40, tags: ["batch"], cuisine: "provençale", keeps: 4, img: "ratatouille" },
  { id: "ratatouille-oeufs", name: "Ratatouille aux œufs pochés et pain", ing: [["zucchini", 120], ["eggplant", 120], ["bell_pepper", 80], ["tomato", 120], ["onion", 40], ["olive_oil", 10], ["herbes_provence", 1], ["egg", 2], ["baguette", 60]], steps: ["Préparez la ratatouille : légumes en dés mijotés 35 min avec l'huile et les herbes.", "Creusez deux puits, cassez-y les œufs et couvrez 6 min.", "Servez avec le pain."], prep: 20, cook: 45, tags: ["budget"], cuisine: "provençale", keeps: 2, img: "ratatouille eggs" },
  { id: "shakshuka", name: "Shakshuka et pain pita", ing: [["egg", 2], ["canned_tomato", 200], ["bell_pepper", 80], ["onion", 40], ["garlic", 1], ["cumin", 1], ["paprika", 1], ["olive_oil", 8], ["pita", 1], ["coriander", 3]], steps: ["Faites revenir l'oignon, l'ail et le poivron avec les épices 6 min.", "Ajoutez les tomates et laissez réduire 10 min.", "Cassez les œufs dans la sauce, couvrez et laissez cuire 6 à 8 min.", "Parsemez de coriandre et servez avec la pita."], prep: 10, cook: 25, tags: ["budget", "one-pot"], cuisine: "orientale", keeps: 0, img: "shakshuka" },
  { id: "shakshuka-feta", name: "Shakshuka verte aux épinards et feta", ing: [["egg", 2], ["spinach", 100], ["leek", 80], ["feta", 30], ["garlic", 1], ["cumin", 1], ["olive_oil", 8], ["wholemeal_bread", 60]], steps: ["Faites fondre le poireau émincé et l'ail 6 min dans l'huile avec le cumin.", "Ajoutez les épinards et laissez-les tomber.", "Cassez les œufs, ajoutez la feta, couvrez 6 min.", "Servez avec le pain."], prep: 10, cook: 15, tags: ["quick"], cuisine: "orientale", keeps: 0, img: "green shakshuka" },
  { id: "falafels-pita", name: "Falafels au four en pita, sauce yaourt", ing: [["chickpeas", 130], ["onion", 20], ["parsley", 5], ["cumin", 1], ["flour", 10], ["olive_oil", 8], ["pita", 1], ["yogurt", 40], ["tomato", 60], ["lettuce", 20]], steps: ["Préchauffez le four à 200 °C.", "Mixez les pois chiches, l'oignon, le persil, le cumin et la farine.", "Formez des boulettes, badigeonnez-les d'huile et enfournez 20 min en les retournant.", "Garnissez les pitas de salade, tomate, falafels et sauce yaourt."], prep: 20, cook: 20, tags: ["lunchbox"], eq: ["oven", "blender"], cuisine: "libanaise", keeps: 2, img: "falafel pita" },
  { id: "falafels-bowl", name: "Bowl de falafels, quinoa et houmous", ing: [["chickpeas", 120], ["onion", 20], ["parsley", 5], ["cumin", 1], ["flour", 10], ["olive_oil", 8], ["quinoa", 55], ["hummus", 30], ["cucumber", 80], ["cherry_tomato", 80]], steps: ["Préparez et faites cuire les falafels au four 20 min à 200 °C.", S.quinoa.cook, "Composez le bol avec le quinoa, les falafels, les légumes et le houmous."], prep: 20, cook: 20, tags: ["lunchbox"], eq: ["oven", "blender"], cuisine: "libanaise", keeps: 2, img: "falafel bowl" },
  { id: "galettes-lentilles", name: "Galettes de lentilles, salade et yaourt", ing: [["red_lentils", 60], ["egg", 0.5], ["breadcrumbs", 15], ["carrot", 50], ["cumin", 1], ["olive_oil", 8], ["salad_mix", 50], ["yogurt", 50]], steps: ["Faites cuire les lentilles corail 12 min, égouttez-les bien.", "Mélangez avec l'œuf, la chapelure, la carotte râpée et le cumin.", "Formez des galettes et faites-les dorer 4 min de chaque côté.", "Servez avec la salade et le yaourt."], prep: 15, cook: 20, tags: ["budget"], cuisine: "végétale", keeps: 2, img: "lentil patties" },
  { id: "galettes-courgette-feta", name: "Galettes de courgette et feta, quinoa", ing: [["zucchini", 200], ["feta", 35], ["egg", 1], ["flour", 20], ["mint", 2], ["olive_oil", 8], ["quinoa", 55]], steps: ["Râpez la courgette et pressez-la pour retirer l'eau.", "Mélangez avec la feta, l'œuf, la farine et la menthe.", "Faites dorer des galettes 3 min de chaque côté.", S.quinoa.cook], prep: 15, cook: 20, tags: [], cuisine: "grecque", keeps: 1, img: "zucchini fritters" },
  { id: "poulet-roti-pdt", name: "Poulet rôti et pommes de terre au thym", ing: [["chicken_whole_legs", 250], ["potato", 250], ["thyme", 0.5], ["garlic", 2], ["olive_oil", 8], ["lettuce", 40]], steps: ["Préchauffez le four à 200 °C.", "Disposez les cuisses et les pommes de terre en quartiers dans un plat avec l'ail, le thym et l'huile.", "Enfournez 45 min en arrosant de temps en temps.", "Servez avec un peu de salade."], prep: 10, cook: 45, tags: ["weekend", "kid-friendly", "comfort"], eq: ["oven"], cuisine: "française", keeps: 2, img: "roast chicken potatoes" },
  { id: "blanquette-dinde", name: "Blanquette de dinde légère et riz", ing: [["turkey", 140], ["carrot", 100], ["mushroom", 80], ["onion", 30], ["light_cream", 30], ["egg", 0.3], ["lemon", 0.15], ["stock_cube", 0.5], ["rice", 65]], steps: ["Faites cuire la dinde en morceaux 25 min dans l'eau avec le bouillon, les carottes et l'oignon.", "Ajoutez les champignons 10 min.", "Liez la sauce avec un peu de bouillon, la crème, le jaune d'œuf et le citron, sans faire bouillir.", S.rice.cook], prep: 20, cook: 40, tags: ["batch", "comfort"], cuisine: "française", keeps: 3, img: "blanquette" },
  { id: "poulet-creme-champignons", name: "Poulet à la crème et aux champignons, tagliatelles", ing: [["chicken_breast", 130], ["mushroom", 120], ["shallot", 15], ["light_cream", 40], ["fresh_pasta", 90]], steps: ["Faites dorer le poulet en morceaux 6 à 8 min.", "Ajoutez l'échalote et les champignons 5 min, puis la crème 3 min.", "Faites cuire les tagliatelles fraîches 3 min et servez avec la sauce."], prep: 10, cook: 20, tags: ["comfort"], cuisine: "française", keeps: 2, img: "chicken mushroom cream pasta" },
  { id: "saucisses-lentilles", name: "Saucisses aux lentilles", ing: [["sausage", 100], ["green_lentils", 60], ["carrot", 80], ["onion", 40], ["thyme", 0.5], ["bay_leaf", 1]], steps: ["Faites dorer les saucisses 5 min.", "Ajoutez l'oignon, la carotte en dés, les lentilles, le thym, le laurier et 3 fois leur volume d'eau.", "Laissez mijoter 30 min."], prep: 10, cook: 35, tags: ["batch", "comfort", "budget"], cuisine: "française", keeps: 3, img: "sausage lentils" },
  { id: "petit-sale-lentilles", name: "Lentilles aux lardons et carottes", ing: [["bacon", 40], ["green_lentils", 70], ["carrot", 100], ["onion", 40], ["thyme", 0.5]], steps: ["Faites revenir les lardons et l'oignon.", "Ajoutez les lentilles, les carottes en rondelles, le thym et l'eau.", "Laissez mijoter 30 min."], prep: 10, cook: 35, tags: ["batch", "budget"], cuisine: "française", keeps: 3, img: "lentils bacon" },
  { id: "moules-frites", name: "Moules marinières et frites au four", ing: [["mussels", 400], ["shallot", 25], ["parsley", 5], ["butter", 6], ["light_cream", 20], ["potato", 220], ["olive_oil", 8]], steps: ["Faites cuire les frites 30 min à 220 °C.", "Nettoyez les moules.", "Faites fondre l'échalote dans le beurre, ajoutez les moules, couvrez et faites cuire 6 à 8 min en remuant.", "Ajoutez la crème et le persil (jetez les moules restées fermées)."], prep: 20, cook: 30, tags: ["weekend"], eq: ["oven"], cuisine: "française", keeps: 0, img: "mussels fries" },
  { id: "cabillaud-sauce-vierge", name: "Cabillaud sauce vierge et riz", ing: [["cod", 150], ["tomato", 120], ["basil", 3], ["lemon", 0.25], ["olive_oil", 10], ["rice", 70]], steps: [S.rice.cook, "Préparez la sauce vierge : tomates en petits dés, basilic, citron, huile, sel, poivre.", "Faites cuire le cabillaud 3 min de chaque côté.", "Nappez de sauce vierge et servez."], prep: 10, cook: 15, tags: ["light"], cuisine: "provençale", keeps: 1, img: "cod tomato basil" },
  { id: "saumon-gratine-haricots", name: "Saumon en croûte de moutarde, haricots verts et quinoa", ing: [["salmon", 120], ["mustard", 8], ["breadcrumbs", 8], ["frozen_green_beans", 150], ["quinoa", 55]], steps: ["Préchauffez le four à 200 °C.", "Badigeonnez le saumon de moutarde et de chapelure, enfournez 12 min.", "Faites cuire les haricots verts 10 min et le quinoa 12 min."], prep: 10, cook: 15, tags: [], eq: ["oven"], cuisine: "française", keeps: 1, img: "mustard crusted salmon" },
  { id: "brandade", name: "Brandade de colin", ing: [["white_fish", 130], ["potato", 220], ["milk", 60], ["garlic", 1], ["olive_oil", 10], ["salad_mix", 40]], steps: ["Préchauffez le four à 200 °C.", "Faites pocher le colin 8 min dans le lait avec l'ail.", "Écrasez les pommes de terre cuites avec le poisson, le lait de cuisson et l'huile.", "Gratinez 15 min et servez avec la salade."], prep: 20, cook: 35, tags: ["batch", "comfort"], eq: ["oven"], cuisine: "française", keeps: 2, img: "fish brandade" },
  { id: "tartiflette-legere", name: "Tartiflette allégée et salade verte", ing: [["potato", 250], ["bacon", 30], ["onion", 40], ["raclette", 35], ["light_cream", 20], ["lettuce", 60]], steps: ["Préchauffez le four à 200 °C.", "Faites cuire les pommes de terre et coupez-les en rondelles.", "Faites revenir les lardons et l'oignon.", "Superposez dans un plat, ajoutez la crème et le fromage, enfournez 20 min. Servez avec la salade."], prep: 20, cook: 40, tags: ["comfort", "weekend"], eq: ["oven"], cuisine: "savoyarde", keeps: 1, img: "tartiflette" },
  { id: "croque-monsieur", name: "Croque-monsieur et salade", ing: [["sandwich_bread", 80], ["ham", 50], ["emmental", 25], ["milk", 20], ["butter", 5], ["salad_mix", 50], ["olive_oil", 5]], steps: ["Garnissez le pain de jambon et de fromage, beurrez légèrement l'extérieur.", "Faites dorer 4 min de chaque côté à la poêle ou 10 min au four.", "Servez avec la salade."], prep: 10, cook: 10, tags: ["quick", "kid-friendly"], cuisine: "française", keeps: 0, img: "croque monsieur" },
  { id: "croque-vege", name: "Croque tomate-mozzarella et salade", ing: [["sandwich_bread", 80], ["mozzarella", 50], ["tomato", 80], ["basil", 3], ["salad_mix", 50], ["olive_oil", 5]], steps: ["Garnissez le pain de mozzarella, tomate et basilic.", "Faites dorer 4 min de chaque côté.", "Servez avec la salade."], prep: 10, cook: 10, tags: ["quick"], cuisine: "française", keeps: 0, img: "tomato mozzarella toastie" },
  { id: "pot-au-feu", name: "Pot-au-feu", ing: [["beef_stew", 150], ["carrot", 120], ["leek", 100], ["potato", 200], ["onion", 30], ["bay_leaf", 1], ["thyme", 0.5], ["stock_cube", 0.5], ["mustard", 5]], steps: ["Couvrez la viande d'eau froide avec le bouillon, le laurier et le thym, portez à frémissement et écumez.", "Laissez cuire 2 h à petit feu.", "Ajoutez les carottes, les poireaux et l'oignon 40 min, puis les pommes de terre 25 min.", "Servez avec de la moutarde."], prep: 20, cook: 180, tags: ["batch", "comfort", "weekend"], cuisine: "française", keeps: 3, img: "pot au feu" },
  { id: "paella", name: "Paella poulet, crevettes et chorizo", ing: [["chicken_thigh", 90], ["shrimp", 60], ["chorizo", 15], ["rice", 75], ["bell_pepper", 60], ["frozen_peas", 40], ["onion", 30], ["canned_tomato", 60], ["turmeric", 0.5], ["smoked_paprika", 1], ["stock_cube", 0.5], ["olive_oil", 6]], steps: ["Faites dorer le poulet et le chorizo dans l'huile, puis l'oignon et le poivron.", "Ajoutez le riz, les épices, les tomates et 2,5 fois le volume du riz en bouillon.", "Laissez cuire 15 min sans remuer, ajoutez les crevettes et les petits pois et poursuivez 5 min."], prep: 20, cook: 30, tags: ["weekend", "one-pot"], cuisine: "espagnole", keeps: 2, img: "paella" },
  { id: "jambalaya", name: "Jambalaya au poulet", ing: [["chicken_breast", 110], ["chorizo", 15], ["rice", 75], ["bell_pepper", 70], ["celery", 40], ["onion", 30], ["canned_tomato", 100], ["chili_powder", 1], ["stock_cube", 0.5], ["olive_oil", 5]], steps: ["Faites dorer le poulet et le chorizo.", "Ajoutez l'oignon, le céleri et le poivron 5 min.", "Ajoutez le riz, les épices, les tomates et 2 fois le volume du riz en bouillon. Couvrez 18 min."], prep: 15, cook: 25, tags: ["one-pot", "batch"], cuisine: "cajun", keeps: 3, img: "jambalaya" },
  { id: "moussaka", name: "Moussaka légère", ing: [["eggplant", 200], ["ground_beef", 100], ["passata", 100], ["onion", 30], ["cinnamon", 0.3], ["greek_yogurt", 50], ["egg", 0.5], ["parmesan", 8], ["olive_oil", 8], ["wholemeal_bread", 40]], steps: ["Préchauffez le four à 200 °C. Faites rôtir les tranches d'aubergine 20 min avec l'huile.", "Faites revenir l'oignon et le bœuf, ajoutez le coulis et la cannelle 10 min.", "Alternez aubergines et viande, couvrez de yaourt mélangé à l'œuf et au parmesan.", "Enfournez 25 min. Servez avec le pain."], prep: 25, cook: 50, tags: ["batch", "weekend"], eq: ["oven"], cuisine: "grecque", keeps: 3, img: "moussaka" },
  { id: "parmigiana", name: "Aubergines à la parmigiana et pâtes", ing: [["eggplant", 250], ["passata", 120], ["mozzarella", 50], ["parmesan", 10], ["basil", 3], ["olive_oil", 8], ["pasta", 50]], steps: ["Faites rôtir les tranches d'aubergine 20 min au four à 200 °C avec l'huile.", "Alternez aubergines, sauce tomate, mozzarella et basilic, terminez par le parmesan.", "Enfournez 25 min. Servez avec les pâtes."], prep: 20, cook: 45, tags: ["batch"], eq: ["oven"], cuisine: "italienne", keeps: 3, img: "eggplant parmigiana" },
  { id: "polenta-champignons", name: "Polenta crémeuse aux champignons et œuf", ing: [["polenta", 60], ["milk", 150], ["mushroom", 150], ["parmesan", 10], ["egg", 1], ["garlic", 1], ["olive_oil", 6]], steps: ["Faites cuire la polenta 5 min dans le lait et 150 ml d'eau en remuant, ajoutez le parmesan.", "Faites dorer les champignons à l'ail.", "Faites cuire l'œuf au plat et servez sur la polenta avec les champignons."], prep: 10, cook: 15, tags: ["comfort", "quick"], cuisine: "italienne", keeps: 0, img: "creamy polenta mushrooms" },
  { id: "polenta-ratatouille", name: "Polenta grillée et ratatouille", ing: [["polenta", 60], ["zucchini", 100], ["eggplant", 100], ["bell_pepper", 60], ["canned_tomato", 100], ["olive_oil", 10], ["herbes_provence", 1], ["feta", 25]], steps: ["Préparez la polenta, étalez-la et laissez-la prendre 20 min.", "Préparez la ratatouille : légumes en dés mijotés 30 min avec les tomates.", "Faites griller des parts de polenta et servez avec la ratatouille et la feta."], prep: 20, cook: 35, tags: ["batch"], cuisine: "provençale", keeps: 3, img: "grilled polenta ratatouille" },
  { id: "salade-cesar", name: "Salade César au poulet", ing: [["chicken_breast", 120], ["lettuce", 120], ["parmesan", 12], ["wholemeal_bread", 40], ["greek_yogurt", 30], ["lemon", 0.2], ["mustard", 3], ["olive_oil", 6]], steps: ["Faites cuire le poulet 8 min et émincez-le.", "Faites griller le pain en croûtons.", "Mélangez le yaourt, le citron, la moutarde et le parmesan pour la sauce.", "Assemblez la salade."], prep: 15, cook: 10, tags: ["high-protein"], cuisine: "américaine", keeps: 0, img: "caesar salad" },
  { id: "salade-nicoise", name: "Salade niçoise", ing: [["tuna_can", 80], ["egg", 1], ["potato", 150], ["frozen_green_beans", 80], ["tomato", 100], ["olives", 15], ["lettuce", 50], ["olive_oil", 10], ["vinegar", 5]], steps: ["Faites cuire les pommes de terre 20 min, les haricots 10 min et l'œuf 9 min.", "Coupez les tomates en quartiers.", "Assemblez avec le thon, les olives et la salade, assaisonnez."], prep: 20, cook: 20, tags: ["lunchbox"], cuisine: "niçoise", keeps: 1, img: "nicoise salad" },
  { id: "salade-grecque-pita", name: "Salade grecque et pain pita", ing: [["tomato", 150], ["cucumber", 120], ["feta", 50], ["red_onion", 20], ["olives", 15], ["oregano", 0.3], ["olive_oil", 10], ["pita", 1], ["chickpeas", 70]], steps: ["Coupez tomates et concombre en morceaux, émincez l'oignon.", "Ajoutez la feta, les olives, les pois chiches et l'origan, assaisonnez.", "Servez avec la pita grillée."], prep: 15, cook: 0, tags: ["no-cook", "quick"], cuisine: "grecque", keeps: 0, img: "greek salad" },
  { id: "salade-lyonnaise", name: "Salade lyonnaise", ing: [["salad_mix", 80], ["bacon", 40], ["egg", 2], ["wholemeal_bread", 50], ["vinegar", 5], ["mustard", 3], ["olive_oil", 8]], steps: ["Faites dorer les lardons et les croûtons.", "Faites pocher les œufs 3 min.", "Assemblez la salade avec la vinaigrette, les lardons, les croûtons et les œufs."], prep: 10, cook: 10, tags: ["quick"], cuisine: "lyonnaise", keeps: 0, img: "lyonnaise salad" },
  { id: "salade-chevre-chaud", name: "Salade de chèvre chaud", ing: [["salad_mix", 80], ["goat_cheese", 50], ["baguette", 60], ["honey", 5], ["walnuts", 10], ["apple", 80], ["olive_oil", 8], ["balsamic", 5]], steps: ["Posez des rondelles de chèvre sur les tranches de pain, ajoutez un peu de miel.", "Gratinez 5 min au four.", "Servez sur la salade avec la pomme, les noix et la vinaigrette."], prep: 10, cook: 5, tags: ["quick"], eq: ["oven"], cuisine: "française", keeps: 0, img: "warm goat cheese salad" },
  { id: "taboule-libanais", name: "Taboulé libanais aux pois chiches", ing: [["bulgur", 50], ["parsley", 25], ["mint", 8], ["tomato", 120], ["cucumber", 80], ["chickpeas", 100], ["lemon", 0.5], ["olive_oil", 10]], steps: ["Faites gonfler le boulgour 10 min dans l'eau chaude, égouttez.", "Hachez finement le persil et la menthe, coupez les légumes en petits dés.", "Mélangez avec les pois chiches, le citron et l'huile. Laissez reposer au frais."], prep: 20, cook: 10, tags: ["lunchbox", "batch"], cuisine: "libanaise", keeps: 2, img: "tabbouleh" },
  { id: "salade-piemontaise", name: "Salade piémontaise", ing: [["potato", 200], ["ham", 50], ["egg", 1], ["tomato", 80], ["olives", 10], ["greek_yogurt", 30], ["mustard", 4]], steps: ["Faites cuire les pommes de terre 20 min et l'œuf 9 min.", "Coupez les pommes de terre, le jambon, l'œuf et la tomate en dés.", "Mélangez avec le yaourt, la moutarde et les olives."], prep: 15, cook: 20, tags: ["lunchbox", "kid-friendly"], cuisine: "française", keeps: 2, img: "potato salad ham" },
  { id: "salade-lentilles-saumon", name: "Salade tiède de lentilles et saumon fumé", ing: [["green_lentils", 60], ["smoked_salmon", 50], ["shallot", 15], ["arugula", 30], ["mustard", 3], ["vinegar", 5], ["olive_oil", 8]], steps: ["Faites cuire les lentilles 25 min, égouttez.", "Assaisonnez-les tièdes avec l'échalote, la moutarde, le vinaigre et l'huile.", "Servez avec la roquette et le saumon fumé."], prep: 10, cook: 25, tags: [], cuisine: "française", keeps: 1, img: "lentil salad smoked salmon" },
  { id: "coleslaw-poulet", name: "Coleslaw au poulet et pommes de terre", ing: [["cabbage", 120], ["carrot", 80], ["chicken_breast", 110], ["greek_yogurt", 40], ["mustard", 3], ["potato", 180], ["olive_oil", 3]], steps: ["Faites cuire les pommes de terre 20 min.", "Faites cuire le poulet 8 min et émincez-le.", "Émincez le chou, râpez la carotte et mélangez avec le yaourt et la moutarde.", "Servez ensemble."], prep: 20, cook: 20, tags: ["lunchbox"], cuisine: "américaine", keeps: 2, img: "coleslaw chicken" },
];
for (const s of singles) add(s);

export const classicMains = out.map((r) => ({ ...r, ing: r.ing.filter(([, q]) => q > 0) }));
