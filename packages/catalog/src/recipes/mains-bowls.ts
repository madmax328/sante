import { MAIN, P, S, type Ing, type Protein, type R, type Starch } from "../dsl";

const out: R[] = [];

// ------------------------------------------------------------------ Salades composées
interface ColdProtein {
  key: string;
  au: string;
  ing: Ing[];
  step: string;
  img: string;
}
const coldP: ColdProtein[] = [
  { key: "poulet", au: "au poulet", ing: [["chicken_breast", 120], ["olive_oil", 3]], step: "Faites cuire le poulet 8 min à la poêle avec un filet d'huile, laissez refroidir puis coupez-le en lamelles.", img: "chicken" },
  { key: "thon", au: "au thon", ing: [["tuna_can", 90]], step: "Égouttez et émiettez le thon.", img: "tuna" },
  { key: "pois-chiches", au: "aux pois chiches", ing: [["chickpeas", 140]], step: "Égouttez et rincez les pois chiches.", img: "chickpeas" },
  { key: "oeufs", au: "aux œufs durs", ing: [["egg", 2]], step: "Faites cuire les œufs 9 min dans l'eau bouillante, refroidissez-les, écalez-les et coupez-les en quartiers.", img: "boiled eggs" },
  { key: "feta", au: "à la feta", ing: [["feta", 50], ["white_beans", 80]], step: "Égouttez les haricots blancs et émiettez la feta.", img: "feta" },
  { key: "maquereau", au: "au maquereau", ing: [["mackerel_can", 100]], step: "Égouttez et émiettez le maquereau.", img: "mackerel" },
  { key: "dinde", au: "à la dinde", ing: [["turkey", 120], ["olive_oil", 3]], step: "Faites cuire la dinde 5 min de chaque côté, laissez refroidir et coupez-la en lamelles.", img: "turkey" },
  { key: "tofu-fume", au: "au tofu fumé", ing: [["smoked_tofu", 110]], step: "Coupez le tofu fumé en dés.", img: "smoked tofu" },
];
const saladStyles: { key: string; label: string; ing: Ing[]; step: string; dressing: string; img: string }[] = [
  {
    key: "mediterraneenne",
    label: "méditerranéenne",
    ing: [["cherry_tomato", 100], ["cucumber", 80], ["red_onion", 20], ["olives", 15], ["parsley", 4], ["olive_oil", 10], ["lemon", 0.25]],
    step: "Coupez les tomates cerises en deux, le concombre en dés et émincez l'oignon rouge. Hachez le persil.",
    dressing: "Assaisonnez avec l'huile d'olive, le jus de citron, sel et poivre.",
    img: "mediterranean salad",
  },
  {
    key: "fraicheur",
    label: "fraîcheur",
    ing: [["cucumber", 100], ["radish", 60], ["salad_mix", 30], ["mint", 3], ["yogurt", 30], ["olive_oil", 5], ["lemon", 0.25]],
    step: "Coupez le concombre en dés et les radis en rondelles. Ciselez la menthe.",
    dressing: "Mélangez le yaourt, l'huile, le jus de citron, sel et poivre, puis nappez la salade.",
    img: "fresh salad cucumber radish",
  },
  {
    key: "hiver",
    label: "d'hiver",
    ing: [["red_cabbage", 80], ["carrot", 80], ["apple", 60], ["walnuts", 8], ["olive_oil", 10], ["mustard", 3], ["vinegar", 5]],
    step: "Émincez finement le chou rouge, râpez la carotte et coupez la pomme en dés.",
    dressing: "Fouettez la moutarde, le vinaigre et l'huile, puis mélangez avec la salade et les noix.",
    img: "winter salad red cabbage",
  },
  {
    key: "crudites",
    label: "aux crudités",
    ing: [["carrot", 80], ["beetroot", 80], ["corn", 40], ["lettuce", 30], ["olive_oil", 10], ["vinegar", 5], ["mustard", 3]],
    step: "Râpez la carotte, coupez la betterave en dés et égouttez le maïs.",
    dressing: "Préparez une vinaigrette avec la moutarde, le vinaigre et l'huile, et assaisonnez.",
    img: "salad carrot beetroot corn",
  },
];
const lentils: Starch = {
  key: "lentilles",
  ing: [["green_lentils", 60]],
  name: "lentilles",
  de: "de lentilles",
  cook: "Faites cuire les lentilles 20 à 25 min dans l'eau non salée, puis égouttez et salez.",
  img: "lentils",
  min: 25,
};
const saladS = [S.quinoa, S.bulgur, S.pasta, S.potato, S.couscous, lentils] as Starch[];
for (const p of coldP)
  for (const st of saladStyles)
    for (const s of saladS) {
      if (p.key === "feta" && s.key === "lentilles") continue;
      out.push({
        id: `salade-${st.key}-${s.key}-${p.key}`,
        name: `Salade ${st.label} ${s.de} ${p.au}`,
        meals: MAIN,
        ing: [...s.ing, ...p.ing, ...st.ing],
        steps: [`${s.cook} Laissez refroidir.`, p.step, st.step, `Mélangez le tout dans un saladier. ${st.dressing}`],
        prep: 15,
        cook: s.min,
        tags: ["lunchbox", "batch"],
        cuisine: "méditerranéenne",
        keeps: 2,
        img: `${s.img} salad ${p.img}`,
      });
    }

// ------------------------------------------------------------------ Bowls
const bowlStyles: { key: string; name: string; ing: Ing[]; steps: string[]; cuisine: string; img: string; skip?: string[] }[] = [
  {
    key: "buddha",
    name: "Buddha bowl",
    ing: [["avocado", 0.5], ["carrot", 60], ["red_cabbage", 60], ["spinach", 30], ["tahini", 12], ["lemon", 0.25]],
    steps: [
      "Râpez la carotte, émincez le chou rouge et coupez l'avocat en tranches.",
      "Délayez le tahin avec le jus de citron et 2 cuillères à soupe d'eau, salez.",
    ],
    cuisine: "végétale",
    img: "buddha bowl",
  },
  {
    key: "mexicain",
    name: "Bowl mexicain",
    ing: [["corn", 50], ["kidney_beans", 60], ["cherry_tomato", 80], ["avocado", 0.5], ["lime", 0.5], ["coriander", 3], ["cumin", 1]],
    steps: [
      "Égouttez le maïs et les haricots rouges, et réchauffez-les 3 min avec le cumin.",
      "Coupez les tomates et l'avocat en dés, arrosez de jus de citron vert et ajoutez la coriandre.",
    ],
    cuisine: "mexicaine",
    img: "mexican bowl",
    skip: ["saumon", "crevettes"],
  },
  {
    key: "asiatique",
    name: "Bowl asiatique",
    ing: [["cabbage", 70], ["carrot", 60], ["cucumber", 70], ["peanut_butter", 12], ["soy_sauce", 10], ["lime", 0.5], ["sesame", 3]],
    steps: [
      "Émincez finement le chou, râpez la carotte et coupez le concombre en bâtonnets.",
      "Mélangez le beurre de cacahuète, la sauce soja, le jus de citron vert et un peu d'eau chaude pour faire la sauce.",
    ],
    cuisine: "asiatique",
    img: "asian bowl peanut sauce",
  },
];
const bowlP = [P.chicken, P.tofu, P.chickpeas, P.salmon, P.egg, P.turkey, P.shrimp] as Protein[];
const bowlS = [S.quinoa, S.brownRice, S.bulgur, S.sweetPotato] as Starch[];
for (const st of bowlStyles)
  for (const p of bowlP)
    for (const s of bowlS) {
      if (st.skip?.includes(p.key)) continue;
      const eggStep = "Faites cuire les œufs 7 min dans l'eau bouillante, refroidissez-les et écalez-les.";
      out.push({
        id: `bowl-${st.key}-${p.key}-${s.key}`,
        name: `${st.name} ${p.de}, ${s.name}`.replace("de œufs", "d'œufs"),
        meals: MAIN,
        ing: [...p.ing, ...s.ing, ...st.ing, ["olive_oil", 5]],
        steps: [
          s.cook,
          p.key === "oeufs" ? eggStep : p.prep,
          p.key === "oeufs" ? "Coupez les œufs en deux." : `Dans une poêle avec l'huile, ${p.sear.charAt(0).toLowerCase()}${p.sear.slice(1)}`,
          ...st.steps,
          "Composez les bols avec la base, la garniture et les légumes, puis nappez de sauce.",
        ],
        prep: 15,
        cook: Math.max(s.min, p.min),
        tags: ["lunchbox"],
        cuisine: st.cuisine,
        keeps: 2,
        img: `${st.img} ${p.img}`,
      });
    }

// ------------------------------------------------------------------ Sandwichs & wraps
const breads: { key: string; label: (f: string) => string; ing: Ing[]; img: string }[] = [
  { key: "baguette", label: (f) => `Sandwich baguette ${f}`, ing: [["baguette", 90]], img: "baguette sandwich" },
  { key: "pita", label: (f) => `Pita ${f}`, ing: [["pita", 1.5]], img: "pita sandwich" },
  { key: "wrap", label: (f) => `Wrap ${f}`, ing: [["tortilla", 1.5]], img: "wrap" },
  { key: "pain-mie", label: (f) => `Sandwich complet ${f}`, ing: [["sandwich_bread", 80]], img: "sandwich" },
];
const fillings: { key: string; label: string; ing: Ing[]; steps: string[]; img: string }[] = [
  {
    key: "poulet-crudites",
    label: "poulet-crudités",
    ing: [["chicken_breast", 100], ["lettuce", 20], ["tomato", 60], ["yogurt", 20], ["mustard", 3], ["olive_oil", 3]],
    steps: ["Faites cuire le poulet 8 min à la poêle avec l'huile, puis émincez-le.", "Mélangez le yaourt et la moutarde pour la sauce."],
    img: "chicken",
  },
  {
    key: "thon-mais",
    label: "thon, maïs et concombre",
    ing: [["tuna_can", 80], ["corn", 30], ["cucumber", 50], ["fromage_blanc", 25], ["lemon", 0.1]],
    steps: ["Mélangez le thon émietté, le maïs, le fromage blanc et un trait de citron.", "Coupez le concombre en fines rondelles."],
    img: "tuna",
  },
  {
    key: "jambon-fromage",
    label: "jambon-emmental",
    ing: [["ham", 60], ["emmental", 20], ["lettuce", 15], ["butter", 6], ["tomato", 50]],
    steps: ["Beurrez légèrement le pain.", "Coupez la tomate en rondelles."],
    img: "ham cheese",
  },
  {
    key: "houmous-legumes",
    label: "houmous, légumes et feta",
    ing: [["hummus", 45], ["carrot", 60], ["cucumber", 50], ["spinach", 20], ["feta", 25]],
    steps: ["Râpez la carotte et coupez le concombre en bâtonnets.", "Émiettez la feta."],
    img: "hummus vegetables",
  },
  {
    key: "oeuf-salade",
    label: "œuf, tomate et salade",
    ing: [["egg", 2], ["lettuce", 20], ["tomato", 60], ["mayonnaise", 8]],
    steps: ["Faites cuire les œufs 9 min, refroidissez-les, écalez-les et coupez-les en rondelles.", "Coupez la tomate en rondelles."],
    img: "egg salad",
  },
  {
    key: "saumon-fume",
    label: "saumon fumé et fromage frais",
    ing: [["smoked_salmon", 50], ["cream_cheese", 25], ["cucumber", 50], ["arugula", 15]],
    steps: ["Coupez le concombre en fines lamelles."],
    img: "smoked salmon",
  },
  {
    key: "dinde-avocat",
    label: "dinde et avocat",
    ing: [["turkey", 100], ["avocado", 0.5], ["tomato", 50], ["arugula", 15], ["olive_oil", 3]],
    steps: ["Faites cuire la dinde 5 min à la poêle avec l'huile, puis émincez-la.", "Écrasez l'avocat avec sel et poivre."],
    img: "turkey avocado",
  },
];
for (const b of breads)
  for (const f of fillings) {
    out.push({
      id: `sandwich-${b.key}-${f.key}`,
      name: b.label(f.label),
      meals: ["lunch"],
      ing: [...b.ing, ...f.ing],
      steps: [...f.steps, "Garnissez le pain avec tous les ingrédients, salez, poivrez.", "Emballez bien serré si vous l'emportez."],
      prep: 10,
      cook: f.ing.some(([id]) => ["chicken_breast", "turkey", "egg"].includes(id)) ? 9 : 0,
      tags: ["lunchbox", "quick"],
      cuisine: "française",
      keeps: 1,
      img: `${b.img} ${f.img}`,
    });
  }

export const bowlMains = out;
