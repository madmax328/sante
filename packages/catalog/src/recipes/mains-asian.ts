import { MAIN, P, S, capitalize, type Ing, type Protein, type R, type Starch } from "../dsl";

const out: R[] = [];

// ------------------------------------------------------------------ Woks
const wokVeg: { key: string; label: string; ing: Ing[]; step: string; img: string }[] = [
  {
    key: "legumes",
    label: "aux légumes croquants",
    ing: [["bell_pepper", 80], ["carrot", 60], ["broccoli", 80], ["spring_onion", 15]],
    step: "Ajoutez le poivron, la carotte en julienne et les fleurettes de brocoli, et faites sauter 4 à 5 min à feu vif.",
    img: "vegetables",
  },
  {
    key: "chou",
    label: "au chou et aux carottes",
    ing: [["cabbage", 120], ["carrot", 80], ["spring_onion", 15]],
    step: "Ajoutez le chou émincé finement et la carotte en julienne, et faites sauter 5 min à feu vif.",
    img: "cabbage",
  },
  {
    key: "haricots-champignons",
    label: "aux haricots verts et champignons",
    ing: [["frozen_green_beans", 100], ["mushroom", 80]],
    step: "Ajoutez les haricots verts et les champignons émincés, et faites sauter 5 min à feu vif.",
    img: "green beans mushrooms",
  },
  {
    key: "courgette-poivron",
    label: "à la courgette et au poivron",
    ing: [["zucchini", 120], ["bell_pepper", 70], ["spring_onion", 15]],
    step: "Ajoutez la courgette et le poivron coupés en lanières, et faites sauter 4 min à feu vif.",
    img: "zucchini",
  },
  {
    key: "epinards-champignons",
    label: "aux champignons et pousses d'épinards",
    ing: [["mushroom", 120], ["spinach", 60], ["spring_onion", 15]],
    step: "Ajoutez les champignons émincés et faites sauter 4 min, puis les épinards 1 min.",
    img: "mushrooms spinach",
  },
];
const wokP = [P.chicken, P.turkey, P.beef, P.pork, P.shrimp, P.tofu] as Protein[];
const wokS = [S.riceNoodles, S.eggNoodles, S.rice, S.basmati] as Starch[];
for (const p of wokP)
  for (const v of wokVeg)
    for (const s of wokS) {
      out.push({
        id: `wok-${p.key}-${v.key}-${s.key}`,
        name: `Wok ${p.de} ${v.label}, ${s.name}`,
        meals: MAIN,
        ing: [
          ...p.ing,
          ...s.ing,
          ...v.ing,
          ["garlic", 1],
          ["ginger", 4],
          ["soy_sauce", 15],
          ["sesame_oil", 4],
          ["neutral_oil", 6],
        ],
        steps: [
          s.cook,
          p.prep,
          "Hachez l'ail et râpez le gingembre.",
          `Dans un wok bien chaud avec l'huile, ${lower(p.sear)}`,
          v.step,
          "Ajoutez l'ail, le gingembre, la sauce soja et l'huile de sésame, puis remettez la garniture dans le wok.",
          `Mélangez avec ${s.key.startsWith("nouilles") ? "les nouilles" : "le riz"} 1 min et servez aussitôt.`,
        ],
        prep: 12,
        cook: Math.max(10, s.min),
        tags: ["quick"],
        cuisine: "asiatique",
        keeps: 1,
        img: `${p.img} stir fry ${v.img}`,
      });
    }

// ------------------------------------------------------------------ Curries
const curryVeg: { key: string; label: string; ing: Ing[]; img: string }[] = [
  { key: "poivron", label: "", ing: [["bell_pepper", 100]], img: "" },
  { key: "epinards", label: "aux épinards", ing: [["spinach", 80]], img: "spinach" },
  { key: "patate-douce", label: "à la patate douce", ing: [["sweet_potato", 120]], img: "sweet potato" },
  { key: "chou-fleur", label: "au chou-fleur", ing: [["cauliflower", 150]], img: "cauliflower" },
  { key: "courgette", label: "à la courgette", ing: [["zucchini", 150]], img: "zucchini" },
];
const curryP = [P.chicken, P.thigh, P.turkey, P.shrimp, P.tofu, P.chickpeas, P.fish] as Protein[];
for (const p of curryP)
  for (const v of curryVeg)
    for (const s of [S.basmati, S.brownRice, S.quinoa] as Starch[]) {
      const lightCurry = v.key === "patate-douce";
      out.push({
        id: `curry-${p.key}-${v.key}-${s.key}`,
        name: `Curry ${p.de} ${v.label} au lait de coco, ${s.name}`.replace(/\s+/g, " "),
        meals: MAIN,
        ing: [
          ...p.ing,
          ...s.ing,
          ...v.ing,
          ["onion", 50],
          ["garlic", 1],
          ["ginger", 4],
          ["coconut_milk", lightCurry ? 60 : 80],
          ["tomato_paste", 10],
          ["curry", 3],
          ["neutral_oil", 5],
          ["coriander", 3],
        ],
        steps: [
          s.cook,
          p.prep,
          "Émincez l'oignon, hachez l'ail et râpez le gingembre.",
          "Faites revenir l'oignon 3 min dans l'huile, puis ajoutez l'ail, le gingembre et le curry 1 min.",
          `Ajoutez les légumes${v.key === "epinards" ? " en fin de cuisson" : " coupés en morceaux"}, le concentré de tomate et le lait de coco. Laissez mijoter 10 min.`,
          p.kind === "fish"
            ? `Ajoutez ${p.le} dans la sauce et laissez cuire 5 min à frémissement.`
            : `Dans une autre poêle, ${lower(p.sear)} Incorporez ensuite à la sauce.`,
          "Parsemez de coriandre et servez avec le riz.",
        ],
        prep: 15,
        cook: 20,
        tags: ["batch"],
        cuisine: "indienne",
        keeps: 3,
        img: `${p.img} curry ${v.img}`.trim(),
      });
    }

// ------------------------------------------------------------------ Fried rice
for (const p of [P.chicken, P.shrimp, P.pork, P.egg, P.tofu] as Protein[])
  for (const s of [S.rice, S.brownRice] as Starch[]) {
    const extraEgg: Ing[] = p.key === "oeufs" ? [] : [["egg", 1]];
    out.push({
      id: `riz-saute-${p.key}-${s.key}`,
      name: `${capitalize(s.name)} sauté ${p.au} et petits pois`,
      desc: "Idéal pour utiliser du riz cuit la veille.",
      meals: MAIN,
      ing: [...p.ing, ...s.ing, ...extraEgg, ["frozen_peas", 60], ["carrot", 60], ["spring_onion", 15], ["soy_sauce", 15], ["neutral_oil", 8], ["garlic", 1]],
      steps: [
        `${s.cook} Étalez-le pour qu'il refroidisse (ou utilisez un reste de riz).`,
        p.prep,
        `Dans un wok chaud avec l'huile, ${lower(p.sear)}`,
        "Ajoutez la carotte en petits dés, les petits pois et l'ail haché, et faites sauter 4 min.",
        p.key === "oeufs" ? "Ajoutez le riz et la sauce soja, mélangez 3 min à feu vif." : "Poussez la garniture sur le côté, cassez l'œuf et brouillez-le, puis ajoutez le riz et la sauce soja et mélangez 3 min à feu vif.",
        "Parsemez d'oignon nouveau émincé.",
      ],
      prep: 10,
      cook: s.min + 10,
      tags: ["quick", "budget", "kid-friendly"],
      cuisine: "asiatique",
      keeps: 2,
      img: `fried rice ${p.img}`,
    });
  }

// ------------------------------------------------------------------ Teriyaki / caramel
for (const p of [P.chicken, P.salmon, P.tofu, P.pork, P.turkey] as Protein[])
  for (const s of [S.rice, S.basmati, S.brownRice, S.eggNoodles] as Starch[]) {
    out.push({
      id: `teriyaki-${p.key}-${s.key}`,
      name: `${capitalize(p.name)} teriyaki, brocolis et ${s.name}`,
      meals: MAIN,
      ing: [...p.ing, ...s.ing, ["broccoli", 120], ["soy_sauce", 15], ["honey", 8], ["ginger", 3], ["garlic", 1], ["cornstarch", 2], ["sesame", 3], ["neutral_oil", 5]],
      steps: [
        s.cook,
        "Faites cuire les fleurettes de brocoli 5 min à la vapeur.",
        "Mélangez la sauce soja, le miel, le gingembre râpé, l'ail haché, la fécule et 2 cuillères à soupe d'eau.",
        p.prep,
        `Dans une poêle avec l'huile, ${lower(p.sear)}`,
        "Versez la sauce et laissez réduire 1 à 2 min jusqu'à ce qu'elle nappe.",
        "Servez avec le brocoli, parsemez de sésame.",
      ],
      prep: 10,
      cook: Math.max(12, s.min),
      tags: ["quick", "kid-friendly"],
      cuisine: "japonaise",
      keeps: 2,
      img: `teriyaki ${p.img}`,
    });
  }

// ------------------------------------------------------------------ Pad thai & noodle soups
for (const p of [P.chicken, P.shrimp, P.tofu] as Protein[]) {
  out.push({
    id: `pad-thai-${p.key}`,
    name: `Pad thaï ${p.au}`,
    meals: MAIN,
    ing: [...p.ing, ["rice_noodles", 75], ["egg", 1], ["carrot", 60], ["spring_onion", 15], ["lime", 0.5], ["soy_sauce", 15], ["brown_sugar", 5], ["coriander", 3], ["neutral_oil", 8], ["garlic", 1]],
    steps: [
      S.riceNoodles.cook,
      p.prep,
      `Dans un wok avec l'huile, ${lower(p.sear)}`,
      "Ajoutez l'ail et la carotte en julienne, faites sauter 2 min.",
      "Poussez sur le côté, brouillez l'œuf, puis ajoutez les nouilles, la sauce soja, le sucre et le jus de citron vert.",
      "Mélangez 2 min et servez avec l'oignon nouveau et la coriandre.",
    ],
    prep: 15,
    cook: 12,
    tags: ["quick"],
    cuisine: "thaïe",
    keeps: 1,
    img: `pad thai ${p.img}`,
  });
  out.push({
    id: `soupe-nouilles-${p.key}`,
    name: `Bouillon de nouilles ${p.au} et légumes`,
    meals: MAIN,
    ing: [...p.ing, ["egg_noodles", 60], ["stock_cube", 1], ["mushroom", 60], ["spinach", 40], ["carrot", 50], ["ginger", 4], ["soy_sauce", 10], ["spring_onion", 10]],
    steps: [
      "Portez 400 ml d'eau à ébullition avec le cube de bouillon, le gingembre en lamelles et la sauce soja.",
      p.prep,
      "Ajoutez la carotte en rondelles et les champignons émincés, laissez cuire 5 min.",
      p.kind === "veg" ? `Ajoutez ${p.le} et les nouilles, et laissez cuire 4 min.` : `Ajoutez ${p.le} en fines lamelles et les nouilles, et laissez cuire 4 à 5 min jusqu'à cuisson complète.`,
      "Ajoutez les épinards hors du feu, parsemez d'oignon nouveau et servez.",
    ],
    prep: 10,
    cook: 15,
    tags: ["light", "one-pot"],
    cuisine: "asiatique",
    keeps: 1,
    img: `noodle soup ${p.img}`,
  });
}

// ------------------------------------------------------------------ Poke bowls
const pokeP: { key: string; label: string; ing: Ing[]; step: string; img: string }[] = [
  { key: "saumon", label: "au saumon snacké", ing: [["salmon", 110]], step: "Coupez le saumon en cubes et saisissez-le 1 min de chaque côté dans une poêle chaude.", img: "salmon" },
  { key: "thon", label: "au thon", ing: [["tuna_can", 90]], step: "Égouttez le thon et émiettez-le grossièrement.", img: "tuna" },
  { key: "tofu", label: "au tofu mariné", ing: [["tofu", 140]], step: "Coupez le tofu en dés, faites-le mariner 10 min dans la sauce soja puis dorer 6 min à la poêle.", img: "tofu" },
  { key: "crevettes", label: "aux crevettes", ing: [["shrimp", 120]], step: "Faites sauter les crevettes 3 à 4 min dans une poêle chaude.", img: "shrimp" },
  { key: "poulet", label: "au poulet", ing: [["chicken_breast", 120]], step: "Coupez le poulet en dés et faites-le dorer 6 à 8 min, jusqu'à cuisson complète.", img: "chicken" },
];
for (const p of pokeP)
  for (const s of [S.rice, S.quinoa, S.brownRice] as Starch[]) {
    out.push({
      id: `poke-${p.key}-${s.key}`,
      name: `Poke bowl ${p.label}, ${s.name}`,
      meals: MAIN,
      ing: [...p.ing, ...s.ing, ["avocado", 0.5], ["cucumber", 80], ["carrot", 50], ["red_cabbage", 50], ["soy_sauce", 12], ["sesame", 4], ["rice_cakes", 0], ["lime", 0.25]],
      steps: [
        `${s.cook} Laissez tiédir.`,
        p.step,
        "Coupez l'avocat et le concombre en dés, râpez la carotte et émincez finement le chou rouge.",
        "Disposez le riz dans un bol, puis la garniture et les légumes en sections.",
        "Arrosez de sauce soja et de jus de citron vert, parsemez de sésame.",
      ],
      prep: 15,
      cook: Math.max(5, s.min),
      tags: ["lunchbox"],
      cuisine: "hawaïenne",
      keeps: 1,
      img: `poke bowl ${p.img}`,
    });
  }

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

export const asianMains = out.map((r) => ({ ...r, ing: r.ing.filter(([, q]) => q > 0) }));
