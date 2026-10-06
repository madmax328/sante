import { describe, expect, it } from "vitest";
import { tutoie } from "../src/tutoie";
import { exercises, recipes } from "../src";

describe("tutoiement", () => {
  it.each([
    ["Coupez la banane en rondelles.", "Coupe la banane en rondelles."],
    ["Faites-les dorer, puis servez aussitôt.", "Fais-les dorer, puis sers aussitôt."],
    ["Asseyez-vous au bord d'une chaise.", "Assieds-toi au bord d'une chaise."],
    ["Descendez les fesses en arrière comme pour vous asseoir.", "Descends les fesses en arrière comme pour t'asseoir."],
    ["Égouttez, séchez et garnissez.", "Égoutte, sèche et garnis."],
    ["Ne forcez pas, accélérez progressivement.", "Ne force pas, accélère progressivement."],
    ["Ajoutez les merguez et salez, poivrez.", "Ajoute les merguez et sale, poivre."],
    ["Faites griller le pain si vous le souhaitez.", "Fais griller le pain si tu le souhaites."],
    ["Préchauffez le four, émincez l'oignon.", "Préchauffe le four, émince l'oignon."],
    ["Laissez cuire puis glissez au four.", "Laisse cuire puis glisse au four."],
    ["Aplatissez, répartissez, fléchissez, nettoyez.", "Aplatis, répartis, fléchis, nettoie."],
  ])("%s", (from, to) => expect(tutoie(from)).toBe(to));

  it("leaves no 'vous' in recipes and exercises", () => {
    const texts = [
      ...recipes.flatMap((r) => [...r.steps.map((s) => s.fr), r.description?.fr ?? ""]),
      ...exercises.flatMap((x) => [...x.steps, ...x.tips].map((s) => s.fr)),
    ];
    const left = texts.filter((t) => /\b(vous|votre|vos)\b/i.test(t) || /(?<!\p{L})\p{L}+ez(?!\p{L})/u.test(t.replace(/merguez/gi, "")));
    expect(left.slice(0, 5)).toEqual([]);
  });
});
