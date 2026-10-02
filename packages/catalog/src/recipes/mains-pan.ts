import { MAIN, P, S, capitalize, type Ing, type Protein, type R, type Starch } from "../dsl";

const out: R[] = [];
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

// ------------------------------------------------------------------ Pâtes + légume
const pastaVeg: { key: string; label: string; ing: Ing[]; step: string; img: string }[] = [
  { key: "brocolis", label: "et brocolis", ing: [["broccoli", 150]], step: "Ajoutez les fleurettes de brocoli dans l'eau des pâtes 4 min avant la fin de la cuisson.", img: "broccoli" },
  { key: "courgettes", label: "et courgettes", ing: [["zucchini", 150]], step: "Faites revenir les courgettes en demi-rondelles 6 min dans la poêle.", img: "zucchini" },
  { key: "epinards", label: "et épinards", ing: [["spinach", 80]], step: "Faites tomber les épinards 1 à 2 min dans la poêle.", img: "spinach" },
  { key: "champignons", label: "et champignons", ing: [["mushroom", 150]], step: "Faites dorer les champignons émincés 6 min dans la poêle.", img: "mushrooms" },
  { key: "tomates-cerises", label: "et tomates cerises", ing: [["cherry_tomato", 150], ["basil", 3]], step: "Faites revenir les tomates cerises coupées en deux 3 min, puis ajoutez le basilic.", img: "cherry tomatoes" },
];
const pastaP = [P.chicken, P.tuna, P.shrimp, P.salmon, P.turkey, P.chickpeas] as Protein[];
for (const p of pastaP)
  for (const v of pastaVeg)
    for (const s of [S.pasta, S.wholePasta] as Starch[]) {
      out.push({
        id: `pates-${s.key}-${p.key}-${v.key}`,
        name: `${capitalize(s.name)} ${p.au} ${v.label}`,
        meals: MAIN,
        ing: [...s.ing, ...p.ing, ...v.ing, ["garlic", 1], ["olive_oil", 8], ["light_cream", 30], ["parmesan", 8]],
        steps: [
          s.cook + " Gardez un peu d'eau de cuisson.",
          p.prep,
          p.key === "thon" ? "Faites revenir l'ail haché 1 min dans l'huile d'olive." : `Dans une poêle avec l'huile et l'ail haché, ${lower(p.sear)}`,
          v.step,
          p.key === "thon" ? "Ajoutez le thon, la crème et 3 cuillères à soupe d'eau de cuisson." : "Ajoutez la crème et 3 cuillères à soupe d'eau de cuisson.",
          "Mélangez avec les pâtes, parsemez de parmesan et poivrez.",
        ],
        prep: 10,
        cook: 15,
        tags: ["quick", "kid-friendly"],
        cuisine: "italienne",
        keeps: 2,
        img: `pasta ${p.img} ${v.img}`,
      });
    }

// ------------------------------------------------------------------ Pâtes + sauce
const sauces: { key: string; label: string; ing: Ing[]; step: string; img: string; withP: string[] }[] = [
  { key: "tomate", label: "sauce tomate-basilic", ing: [["passata", 150], ["onion", 40], ["basil", 3], ["olive_oil", 8], ["garlic", 1]], step: "Faites revenir l'oignon et l'ail, ajoutez le coulis de tomate et laissez mijoter 10 min. Ajoutez le basilic.", img: "tomato sauce", withP: ["poulet", "thon", "crevettes", "pois-chiches", "dinde", "oeufs"] },
  { key: "pesto", label: "au pesto", ing: [["pesto", 25], ["cherry_tomato", 80], ["arugula", 20]], step: "Mélangez les pâtes avec le pesto, les tomates cerises coupées et la roquette.", img: "pesto", withP: ["poulet", "crevettes", "dinde", "saumon", "pois-chiches"] },
  { key: "citron", label: "crème citronnée", ing: [["light_cream", 50], ["lemon", 0.3], ["spinach", 50], ["parmesan", 8]], step: "Faites chauffer la crème avec le zeste et le jus de citron, puis ajoutez les épinards 1 min.", img: "lemon cream", withP: ["poulet", "saumon", "crevettes", "dinde"] },
  { key: "arrabbiata", label: "arrabbiata", ing: [["canned_tomato", 150], ["garlic", 2], ["chili_flakes", 0.5], ["olive_oil", 8], ["parsley", 3]], step: "Faites revenir l'ail et le piment dans l'huile, ajoutez les tomates concassées et laissez réduire 10 min.", img: "arrabbiata", withP: ["poulet", "crevettes", "thon", "pois-chiches"] },
];
const allP = [P.chicken, P.tuna, P.shrimp, P.salmon, P.turkey, P.chickpeas, P.egg] as Protein[];
for (const sc of sauces)
  for (const p of allP.filter((x) => sc.withP.includes(x.key)))
    for (const s of [S.pasta, S.wholePasta] as Starch[]) {
      const pStep = p.key === "oeufs" ? "Faites cuire les œufs 7 min, refroidissez-les, écalez-les et coupez-les en deux." : `${p.prep} Dans une poêle, ${lower(p.sear)}`;
      out.push({
        id: `pates-sauce-${sc.key}-${p.key}-${s.key}`,
        name: `${capitalize(s.name)} ${sc.label} ${p.au}`,
        meals: MAIN,
        ing: [...s.ing, ...p.ing, ...sc.ing],
        steps: [s.cook, pStep, sc.step, "Mélangez les pâtes avec la sauce et la garniture, puis servez bien chaud."],
        prep: 10,
        cook: 15,
        tags: ["quick", "budget"],
        cuisine: "italienne",
        keeps: 2,
        img: `pasta ${sc.img} ${p.img}`,
      });
    }

// ------------------------------------------------------------------ Poêlées
const panVeg: { key: string; label: string; ing: Ing[]; step: string; img: string }[] = [
  { key: "courgettes-poivrons", label: "aux courgettes et poivrons", ing: [["zucchini", 120], ["bell_pepper", 80], ["onion", 30]], step: "Faites revenir l'oignon, la courgette et le poivron coupés en dés 8 min.", img: "zucchini peppers" },
  { key: "haricots-verts", label: "aux haricots verts", ing: [["frozen_green_beans", 180], ["shallot", 15]], step: "Faites cuire les haricots verts 8 min à l'eau bouillante, puis faites-les revenir 2 min avec l'échalote.", img: "green beans" },
  { key: "brocolis", label: "aux brocolis", ing: [["broccoli", 180], ["garlic", 1]], step: "Faites cuire les fleurettes de brocoli 5 min à la vapeur, puis faites-les sauter 2 min avec l'ail.", img: "broccoli" },
  { key: "champignons-epinards", label: "aux champignons et épinards", ing: [["mushroom", 120], ["spinach", 60], ["garlic", 1]], step: "Faites dorer les champignons émincés 5 min, ajoutez l'ail et les épinards et laissez-les tomber 1 min.", img: "mushrooms spinach" },
  { key: "legumes-surgeles", label: "aux légumes du marché", ing: [["frozen_veg_mix", 200]], step: "Faites revenir la poêlée de légumes 8 à 10 min à feu moyen.", img: "vegetables" },
];
const panP = [P.chicken, P.turkey, P.pork, P.fish, P.tofu, P.salmon, P.beef, P.shrimp] as Protein[];
const panS = [S.rice, S.potato, S.quinoa, S.bulgur, S.sweetPotato] as Starch[];
for (const p of panP)
  for (const v of panVeg)
    for (const s of panS) {
      out.push({
        id: `poelee-${p.key}-${v.key}-${s.key}`,
        name: `${capitalize(p.name)} ${v.label}, ${s.name}`,
        meals: MAIN,
        ing: [...p.ing, ...v.ing, ...s.ing, ["olive_oil", 10], ["herbes_provence", 1]],
        steps: [s.cook, p.prep, `Dans une poêle avec la moitié de l'huile, ${lower(p.sear)} Réservez.`, `Dans la même poêle avec le reste de l'huile : ${lower(v.step)}`, "Remettez la garniture, ajoutez les herbes, salez, poivrez et servez avec l'accompagnement."],
        prep: 10,
        cook: Math.max(15, s.min),
        tags: s.key === "riz" || s.key === "pommes-de-terre" ? ["budget"] : [],
        cuisine: "française",
        keeps: 2,
        img: `${p.img} ${v.img} ${s.img}`,
      });
    }

// ------------------------------------------------------------------ Papillotes
const fishes: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "saumon", label: "saumon", ing: [["salmon", 120]], img: "salmon" },
  { key: "colin", label: "colin", ing: [["white_fish", 150]], img: "white fish" },
  { key: "cabillaud", label: "cabillaud", ing: [["cod", 150]], img: "cod" },
  { key: "saumon-surgele", label: "saumon (surgelé)", ing: [["frozen_salmon", 120]], img: "salmon" },
];
const papVeg: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "courgette-tomate", label: "courgette et tomate", ing: [["zucchini", 120], ["tomato", 100], ["thyme", 0.5]], img: "zucchini tomato" },
  { key: "poireaux", label: "fondue de poireaux", ing: [["leek", 150], ["light_cream", 20]], img: "leeks" },
  { key: "fenouil", label: "fenouil et citron", ing: [["fennel", 150], ["lemon", 0.25]], img: "fennel" },
  { key: "julienne", label: "julienne de légumes", ing: [["carrot", 80], ["zucchini", 80], ["leek", 50]], img: "julienne vegetables" },
];
for (const f of fishes)
  for (const v of papVeg)
    for (const s of [S.rice, S.quinoa, S.potato] as Starch[]) {
      out.push({
        id: `papillote-${f.key}-${v.key}-${s.key}`,
        name: `Papillote de ${f.label}, ${v.label}, ${s.name}`,
        meals: MAIN,
        ing: [...f.ing, ...v.ing, ...s.ing, ["olive_oil", 8], ["parsley", 3]],
        steps: [
          "Préchauffez le four à 200 °C.",
          "Lavez les légumes et émincez-les finement.",
          `Déposez les légumes sur une feuille de papier cuisson, posez le poisson par-dessus, arrosez d'huile, salez et poivrez.`,
          "Refermez la papillote et enfournez 18 à 20 min.",
          s.cook,
          "Ouvrez la papillote à table, parsemez de persil et servez avec l'accompagnement.",
        ],
        prep: 10,
        cook: 20,
        tags: ["light"],
        eq: ["oven"],
        cuisine: "française",
        keeps: 1,
        img: `fish papillote ${f.img} ${v.img}`,
      });
    }

// ------------------------------------------------------------------ Plaque au four (sheet pan)
const sheetP: { key: string; label: string; adj: string; ing: Ing[]; img: string; time: number }[] = [
  { key: "cuisses-poulet", label: "Cuisses de poulet", adj: "rôties", ing: [["chicken_whole_legs", 250]], img: "chicken legs", time: 40 },
  { key: "pilons", label: "Pilons de poulet", adj: "rôtis", ing: [["chicken_drumstick", 220]], img: "chicken drumsticks", time: 35 },
  { key: "saucisses", label: "Saucisses", adj: "rôties", ing: [["sausage", 120]], img: "sausages", time: 30 },
  { key: "saumon", label: "Saumon", adj: "rôti", ing: [["salmon", 120]], img: "salmon", time: 15 },
  { key: "tofu", label: "Tofu", adj: "rôti", ing: [["tofu", 150]], img: "tofu", time: 25 },
  { key: "pois-chiches", label: "Pois chiches", adj: "rôtis", ing: [["chickpeas", 140]], img: "chickpeas", time: 30 },
];
const sheetVeg: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "pdt-carottes", label: "pommes de terre et carottes", ing: [["potato", 220], ["carrot", 100], ["onion", 40]], img: "potatoes carrots" },
  { key: "patate-brocoli", label: "patate douce et brocoli", ing: [["sweet_potato", 220], ["broccoli", 100]], img: "sweet potato broccoli" },
  { key: "courge-oignon", label: "courge butternut et oignon rouge", ing: [["butternut", 250], ["red_onion", 50], ["potato", 100]], img: "butternut squash" },
  { key: "soleil", label: "légumes du soleil", ing: [["zucchini", 120], ["bell_pepper", 80], ["eggplant", 100], ["potato", 150]], img: "roasted vegetables" },
  { key: "chou-fleur", label: "chou-fleur et pommes de terre au curry", ing: [["cauliflower", 180], ["potato", 180], ["curry", 2]], img: "roasted cauliflower" },
];
for (const p of sheetP)
  for (const v of sheetVeg) {
    out.push({
      id: `plaque-${p.key}-${v.key}`,
      name: `${p.label} ${p.adj} au four, ${v.label}`,
      desc: "Tout cuit sur la même plaque : peu de vaisselle.",
      meals: MAIN,
      ing: [...p.ing, ...v.ing, ["olive_oil", 12], ["paprika", 1], ["herbes_provence", 1], ["garlic", 1]],
      steps: [
        "Préchauffez le four à 210 °C.",
        `Coupez les légumes (${v.label}) en morceaux de même taille.`,
        "Mélangez-les sur une plaque avec l'huile, le paprika, les herbes, l'ail écrasé, sel et poivre. Enfournez 15 min.",
        `Ajoutez ${p.label.toLowerCase()} sur la plaque et poursuivez la cuisson ${p.time === 15 ? "15 min" : `${p.time - 10} à ${p.time} min`}, en retournant à mi-cuisson.`,
        "Vérifiez la cuisson (la viande ne doit plus être rosée près de l'os) et servez.",
      ],
      prep: 15,
      cook: p.time + 15,
      tags: ["one-pot", "kid-friendly"],
      eq: ["oven"],
      cuisine: "française",
      keeps: 2,
      img: `sheet pan ${p.img} ${v.img}`,
    });
  }

// ------------------------------------------------------------------ Brochettes
const skewerP = [P.chicken, P.turkey, P.shrimp, P.tofu, P.salmon] as Protein[];
for (const p of skewerP)
  for (const s of [S.couscous, S.rice, S.bulgur] as Starch[]) {
    out.push({
      id: `brochettes-${p.key}-${s.key}`,
      name: `Brochettes ${p.de} marinées, sauce yaourt et ${s.name}`,
      meals: MAIN,
      ing: [...p.ing, ...s.ing, ["bell_pepper", 80], ["red_onion", 40], ["lemon", 0.25], ["olive_oil", 8], ["paprika", 1], ["cumin", 1], ["yogurt", 50], ["cucumber", 50], ["mint", 2]],
      steps: [
        `${p.prep} Faites-le mariner 15 min avec l'huile, le citron, le paprika et le cumin.`,
        "Coupez le poivron et l'oignon en morceaux et enfilez-les sur les piques en alternance.",
        "Faites cuire les brochettes 10 à 12 min à la poêle-gril ou au four, en les retournant.",
        s.cook,
        "Mélangez le yaourt, le concombre râpé et la menthe ciselée pour la sauce.",
      ],
      prep: 20,
      cook: 12,
      tags: ["weekend"],
      cuisine: "méditerranéenne",
      keeps: 1,
      img: `skewers ${p.img}`,
    });
  }

// ------------------------------------------------------------------ Mijotés
const stews: { key: string; name: string; ing: Ing[]; steps: string[]; cook: number; img: string; cuisine: string }[] = [
  {
    key: "poulet-basquaise",
    name: "Poulet basquaise",
    ing: [["chicken_thigh", 150], ["bell_pepper", 150], ["onion", 50], ["canned_tomato", 120], ["garlic", 1], ["smoked_paprika", 1], ["olive_oil", 8]],
    steps: ["Faites dorer les morceaux de poulet 5 min dans l'huile.", "Ajoutez l'oignon et les poivrons en lanières, faites revenir 5 min.", "Ajoutez l'ail, le paprika et les tomates, couvrez et laissez mijoter 30 min."],
    cook: 40,
    img: "chicken basquaise",
    cuisine: "française",
  },
  {
    key: "boeuf-carottes",
    name: "Bœuf carottes",
    ing: [["beef_stew", 140], ["carrot", 180], ["onion", 50], ["stock_cube", 0.5], ["thyme", 0.5], ["bay_leaf", 1], ["flour", 5], ["olive_oil", 6]],
    steps: ["Faites dorer le bœuf en morceaux dans l'huile, saupoudrez de farine.", "Ajoutez l'oignon émincé, puis les carottes en rondelles.", "Couvrez d'eau avec le bouillon, le thym et le laurier, et laissez mijoter 2 h à feu doux."],
    cook: 120,
    img: "beef carrot stew",
    cuisine: "française",
  },
  {
    key: "porc-moutarde",
    name: "Sauté de porc à la moutarde",
    ing: [["pork_tenderloin", 140], ["mushroom", 100], ["shallot", 20], ["light_cream", 40], ["mustard", 8], ["olive_oil", 6]],
    steps: ["Faites dorer le porc en morceaux 5 min.", "Ajoutez l'échalote et les champignons émincés, faites revenir 5 min.", "Ajoutez la crème et la moutarde, laissez mijoter 15 min à feu doux."],
    cook: 25,
    img: "pork mustard sauce",
    cuisine: "française",
  },
  {
    key: "agneau-printanier",
    name: "Navarin d'agneau aux légumes",
    ing: [["lamb", 140], ["carrot", 100], ["potato", 150], ["frozen_peas", 50], ["onion", 40], ["tomato_paste", 10], ["stock_cube", 0.5], ["thyme", 0.5], ["olive_oil", 6]],
    steps: ["Faites dorer l'agneau en morceaux dans l'huile.", "Ajoutez l'oignon, le concentré de tomate, le thym et couvrez d'eau avec le bouillon. Laissez mijoter 1 h.", "Ajoutez les carottes et les pommes de terre et poursuivez 30 min, puis les petits pois 10 min."],
    cook: 100,
    img: "lamb stew vegetables",
    cuisine: "française",
  },
  {
    key: "pois-chiches-epinards",
    name: "Mijoté de pois chiches aux épinards et tomates",
    ing: [["chickpeas", 160], ["frozen_spinach", 120], ["canned_tomato", 120], ["onion", 40], ["garlic", 1], ["cumin", 1], ["paprika", 1], ["olive_oil", 8]],
    steps: ["Faites revenir l'oignon et l'ail dans l'huile avec les épices.", "Ajoutez les tomates, les pois chiches égouttés et les épinards.", "Laissez mijoter 20 min à couvert."],
    cook: 25,
    img: "chickpea spinach stew",
    cuisine: "méditerranéenne",
  },
  {
    key: "haricots-blancs-saucisse",
    name: "Haricots blancs à la tomate et saucisse",
    ing: [["white_beans", 150], ["sausage", 80], ["canned_tomato", 120], ["onion", 40], ["carrot", 60], ["thyme", 0.5]],
    steps: ["Faites dorer les saucisses en tronçons 5 min.", "Ajoutez l'oignon et la carotte en dés, faites revenir 5 min.", "Ajoutez les tomates, les haricots égouttés et le thym, et laissez mijoter 20 min."],
    cook: 30,
    img: "white beans sausage",
    cuisine: "française",
  },
];
for (const st of stews)
  for (const s of [S.rice, S.potato, S.bulgur] as Starch[]) {
    const includesPotato = st.ing.some(([id]) => id === "potato");
    if (includesPotato && s.key !== "riz") continue;
    out.push({
      id: `mijote-${st.key}-${s.key}`,
      name: includesPotato ? st.name : `${st.name}, ${s.name}`,
      desc: "Encore meilleur réchauffé : parfait pour le batch cooking.",
      meals: MAIN,
      ing: includesPotato ? st.ing : [...st.ing, ...s.ing],
      steps: includesPotato ? st.steps : [...st.steps, s.cook],
      prep: 15,
      cook: st.cook,
      tags: ["batch", "comfort"],
      cuisine: st.cuisine,
      keeps: 3,
      img: st.img,
    });
  }

export const panMains = out;
