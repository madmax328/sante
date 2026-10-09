import { tutoie } from "./tutoie";
import type { Exercise, ExerciseKind, Limitation, MuscleGroup, SportEquipment } from "@weeko/engine";

interface Def {
  id: string;
  fr: string;
  en: string;
  kind: ExerciseKind;
  muscles: MuscleGroup[];
  eq?: SportEquipment[];
  level: 1 | 2 | 3;
  unit?: "reps" | "seconds";
  met: number;
  low?: boolean;
  stresses?: Limitation[];
  steps: string[];
  tips: string[];
  easier?: string;
}

const defs: Def[] = [
  // ---------------------------------------------------------- Bas du corps
  { id: "squat", fr: "Squat", en: "Squat", kind: "strength", muscles: ["legs", "glutes"], level: 1, met: 5, low: true, stresses: ["knees"], steps: ["Pieds écartés largeur d'épaules, pointes légèrement ouvertes.", "Descendez les fesses en arrière comme pour vous asseoir, dos droit.", "Descendez jusqu'à ce que les cuisses soient parallèles au sol, puis remontez en poussant dans les talons."], tips: ["Les genoux suivent la direction des pieds.", "Gardez la poitrine ouverte."], easier: "squat-chaise" },
  { id: "squat-chaise", fr: "Assis-debout sur chaise", en: "Chair sit-to-stand", kind: "strength", muscles: ["legs", "glutes"], level: 1, met: 3.5, low: true, steps: ["Asseyez-vous au bord d'une chaise, pieds à plat.", "Levez-vous sans vous aider des mains.", "Rasseyez-vous lentement en contrôlant la descente."], tips: ["Croisez les bras sur la poitrine pour plus de difficulté."] },
  { id: "fentes", fr: "Fentes arrière alternées", en: "Alternating reverse lunges", kind: "strength", muscles: ["legs", "glutes"], level: 2, met: 5, low: true, stresses: ["knees"], steps: ["Debout, pieds joints, mains sur les hanches.", "Faites un grand pas en arrière et descendez jusqu'à ce que le genou arrière frôle le sol.", "Poussez sur le talon avant pour revenir pieds joints, puis changez de jambe."], tips: ["Le genou avant reste au-dessus de la cheville.", "Buste droit.", "Le pas en arrière ménage les genoux."], easier: "squat" },
  { id: "pont-fessier", fr: "Pont fessier", en: "Glute bridge", kind: "strength", muscles: ["glutes", "core"], eq: ["mat"], level: 1, met: 3.5, low: true, steps: ["Allongé sur le dos, genoux fléchis, pieds à plat.", "Soulevez le bassin en serrant les fessiers jusqu'à aligner genoux, hanches et épaules.", "Redescendez lentement."], tips: ["Ne cambrez pas le bas du dos.", "Poussez dans les talons."] },
  { id: "pont-une-jambe", fr: "Pont fessier sur une jambe", en: "Single-leg glute bridge", kind: "strength", muscles: ["glutes", "legs"], eq: ["mat"], level: 2, met: 4, low: true, steps: ["Position de pont, une jambe tendue en l'air.", "Montez le bassin en poussant sur le talon au sol.", "Faites toutes les répétitions puis changez de côté."], tips: ["Gardez le bassin bien horizontal."], easier: "pont-fessier" },
  { id: "squat-saute", fr: "Squat sauté", en: "Jump squat", kind: "strength", muscles: ["legs", "glutes"], level: 3, met: 8, stresses: ["knees"], steps: ["Descendez en squat.", "Poussez fort pour sauter.", "Réceptionnez-vous en douceur, genoux souples, et enchaînez."], tips: ["Atterrissez sur l'avant du pied."], easier: "squat" },
  { id: "squat-goblet", fr: "Squat goblet avec haltère", en: "Goblet squat", kind: "strength", muscles: ["legs", "glutes"], eq: ["dumbbells"], level: 2, met: 5.5, stresses: ["knees"], steps: ["Tenez un haltère verticalement contre la poitrine.", "Descendez en squat, coudes entre les genoux.", "Remontez en poussant dans les talons."], tips: ["Gardez l'haltère près du corps."], easier: "squat" },
  { id: "souleve-de-terre-halteres", fr: "Soulevé de terre jambes tendues aux haltères", en: "Dumbbell Romanian deadlift", kind: "strength", muscles: ["glutes", "back", "legs"], eq: ["dumbbells"], level: 2, met: 5, stresses: ["back"], steps: ["Debout, un haltère dans chaque main devant les cuisses.", "Basculez le buste en avant en reculant les fesses, dos plat, genoux légèrement fléchis.", "Remontez en serrant les fessiers."], tips: ["Les haltères frôlent les jambes.", "Ne descendez pas plus bas que ce que permet un dos plat."] },
  { id: "chaise-murale", fr: "Chaise contre le mur", en: "Wall sit", kind: "strength", muscles: ["legs"], level: 1, unit: "seconds", met: 4, low: true, stresses: ["knees"], steps: ["Dos contre un mur, descendez jusqu'à ce que les genoux forment un angle droit.", "Tenez la position en respirant normalement."], tips: ["Remontez un peu si c'est trop difficile."] },
  { id: "mollets", fr: "Élévations des mollets", en: "Calf raises", kind: "strength", muscles: ["legs"], level: 1, met: 3, low: true, steps: ["Debout, en vous tenant à un mur si besoin.", "Montez sur la pointe des pieds.", "Redescendez lentement."], tips: ["Marquez une pause en haut."] },
  { id: "swing-kettlebell", fr: "Swing kettlebell", en: "Kettlebell swing", kind: "strength", muscles: ["glutes", "back", "full"], eq: ["kettlebell"], level: 3, met: 8, stresses: ["back"], steps: ["Pieds écartés, kettlebell à deux mains entre les jambes.", "Poussez les hanches vers l'avant pour projeter la kettlebell à hauteur d'épaules.", "Laissez-la redescendre en basculant les hanches en arrière."], tips: ["Le mouvement vient des hanches, pas des bras."] },

  // ---------------------------------------------------------- Haut du corps
  { id: "pompes-murales", fr: "Pompes contre le mur", en: "Wall push-ups", kind: "strength", muscles: ["chest", "arms", "shoulders"], level: 1, met: 3, low: true, steps: ["Face à un mur, mains à hauteur d'épaules.", "Fléchissez les bras pour approcher la poitrine du mur.", "Repoussez pour revenir."], tips: ["Corps gainé, aligné de la tête aux talons."] },
  { id: "pompes-genoux", fr: "Pompes sur les genoux", en: "Knee push-ups", kind: "strength", muscles: ["chest", "arms", "shoulders"], eq: ["mat"], level: 1, met: 3.8, stresses: ["wrists", "shoulders"], steps: ["À genoux, mains un peu plus larges que les épaules.", "Descendez la poitrine vers le sol.", "Remontez en poussant."], tips: ["Gardez le dos droit."], easier: "pompes-murales" },
  { id: "pompes", fr: "Pompes", en: "Push-ups", kind: "strength", muscles: ["chest", "arms", "shoulders", "core"], level: 2, met: 4.5, stresses: ["wrists", "shoulders"], steps: ["En appui sur les mains et les pointes de pieds, corps aligné.", "Descendez la poitrine près du sol.", "Remontez en poussant."], tips: ["Coudes à 45° du corps."], easier: "pompes-genoux" },
  { id: "dips-chaise", fr: "Dips sur chaise", en: "Chair dips", kind: "strength", muscles: ["arms", "chest"], level: 2, met: 4, stresses: ["shoulders", "wrists"], steps: ["Mains sur le bord d'une chaise stable, jambes devant vous.", "Fléchissez les coudes pour descendre.", "Remontez en tendant les bras."], tips: ["Gardez le dos proche de la chaise."] },
  { id: "rowing-halteres", fr: "Rowing aux haltères", en: "Dumbbell row", kind: "strength", muscles: ["back", "arms"], eq: ["dumbbells"], level: 1, met: 4, steps: ["Buste penché en avant, dos plat, un haltère dans chaque main.", "Tirez les haltères vers les hanches en serrant les omoplates.", "Redescendez lentement."], tips: ["Ne tirez pas avec le dos arrondi."] },
  { id: "rowing-elastique", fr: "Tirage avec élastique", en: "Band row", kind: "strength", muscles: ["back", "arms"], eq: ["band"], level: 1, met: 3.5, low: true, steps: ["Assis, jambes tendues, élastique autour des pieds.", "Tirez les poignées vers le ventre en serrant les omoplates.", "Revenez lentement."], tips: ["Épaules basses, loin des oreilles."] },
  { id: "superman", fr: "Superman", en: "Superman", kind: "strength", muscles: ["back", "glutes"], eq: ["mat"], level: 1, met: 3, low: true, steps: ["Allongé sur le ventre, bras tendus devant.", "Soulevez bras et jambes quelques centimètres.", "Tenez 2 secondes et redescendez."], tips: ["Regardez le sol pour protéger la nuque."] },
  { id: "tractions", fr: "Tractions", en: "Pull-ups", kind: "strength", muscles: ["back", "arms"], eq: ["pullup_bar"], level: 3, met: 6, stresses: ["shoulders"], steps: ["Suspendu à la barre, mains en pronation.", "Tirez jusqu'à passer le menton au-dessus de la barre.", "Redescendez lentement."], tips: ["Utilisez un élastique d'assistance au début."] },
  { id: "developpe-epaules", fr: "Développé épaules aux haltères", en: "Dumbbell shoulder press", kind: "strength", muscles: ["shoulders", "arms"], eq: ["dumbbells"], level: 1, met: 4, stresses: ["shoulders"], steps: ["Haltères à hauteur d'épaules, paumes vers l'avant.", "Poussez vers le plafond sans cambrer.", "Redescendez lentement."], tips: ["Serrez les abdominaux."] },
  { id: "elevations-laterales", fr: "Élévations latérales", en: "Lateral raises", kind: "strength", muscles: ["shoulders"], eq: ["dumbbells"], level: 2, met: 3.5, stresses: ["shoulders"], steps: ["Debout, haltères le long du corps.", "Levez les bras sur les côtés jusqu'à hauteur d'épaules.", "Redescendez lentement."], tips: ["Coudes légèrement fléchis, charges légères."] },
  { id: "curl-biceps", fr: "Curl biceps", en: "Biceps curl", kind: "strength", muscles: ["arms"], eq: ["dumbbells"], level: 1, met: 3, steps: ["Debout, haltères en main, paumes vers l'avant.", "Fléchissez les coudes pour monter les haltères.", "Redescendez lentement."], tips: ["Coudes collés au corps."] },
  { id: "developpe-couche", fr: "Développé couché au sol", en: "Dumbbell floor press", kind: "strength", muscles: ["chest", "arms"], eq: ["dumbbells", "mat"], level: 2, met: 4, stresses: ["shoulders"], steps: ["Allongé au sol, genoux fléchis, haltères au-dessus de la poitrine.", "Descendez jusqu'à ce que les coudes touchent le sol.", "Poussez pour remonter."], tips: ["Contrôlez la descente."] },
  { id: "elastique-ecartes", fr: "Écartés à l'élastique", en: "Band pull-apart", kind: "strength", muscles: ["back", "shoulders"], eq: ["band"], level: 1, met: 3, low: true, steps: ["Bras tendus devant vous, élastique en main.", "Écartez les bras en serrant les omoplates.", "Revenez lentement."], tips: ["Gardez les bras à hauteur d'épaules."] },

  // ---------------------------------------------------------- Gainage
  { id: "planche", fr: "Gainage planche", en: "Plank", kind: "strength", muscles: ["core"], eq: ["mat"], level: 1, unit: "seconds", met: 3.5, low: true, stresses: ["shoulders"], steps: ["En appui sur les avant-bras et les pointes de pieds.", "Alignez tête, dos et talons, serrez les abdominaux.", "Tenez en respirant normalement."], tips: ["Posez les genoux au sol si besoin."] },
  { id: "planche-laterale", fr: "Gainage latéral", en: "Side plank", kind: "strength", muscles: ["core"], eq: ["mat"], level: 2, unit: "seconds", met: 3.5, low: true, stresses: ["shoulders"], steps: ["Sur le côté, en appui sur un avant-bras.", "Soulevez le bassin pour aligner le corps.", "Tenez, puis changez de côté."], tips: ["Genou au sol pour une version plus facile."], easier: "planche" },
  { id: "dead-bug", fr: "Dead bug", en: "Dead bug", kind: "strength", muscles: ["core"], eq: ["mat"], level: 1, met: 3, low: true, steps: ["Sur le dos, bras vers le plafond, genoux à 90°.", "Tendez lentement un bras et la jambe opposée sans décoller le bas du dos.", "Revenez et alternez."], tips: ["Le bas du dos reste plaqué au sol."] },
  { id: "crunch-velo", fr: "Crunch vélo", en: "Bicycle crunch", kind: "strength", muscles: ["core"], eq: ["mat"], level: 2, met: 4, stresses: ["back"], steps: ["Sur le dos, mains derrière la tête.", "Amenez un coude vers le genou opposé en pédalant.", "Alternez de façon contrôlée."], tips: ["Ne tirez pas sur la nuque."] },
  { id: "bird-dog", fr: "Bird dog", en: "Bird dog", kind: "strength", muscles: ["core", "back"], eq: ["mat"], level: 1, met: 3, low: true, steps: ["À quatre pattes.", "Tendez un bras et la jambe opposée à l'horizontale.", "Revenez et alternez."], tips: ["Gardez le dos immobile."] },
  { id: "mountain-climbers", fr: "Mountain climbers", en: "Mountain climbers", kind: "cardio", muscles: ["core", "full"], level: 2, met: 8, stresses: ["wrists", "shoulders"], steps: ["En position de pompe.", "Ramenez alternativement les genoux vers la poitrine rapidement."], tips: ["Gardez les hanches basses."] },

  // ---------------------------------------------------------- Cardio
  { id: "marche-sur-place", fr: "Marche rapide sur place", en: "Marching in place", kind: "cardio", muscles: ["full"], level: 1, unit: "seconds", met: 4, low: true, steps: ["Marchez sur place en montant les genoux.", "Balancez les bras."], tips: ["Accélérez progressivement."] },
  { id: "rotations-bras", fr: "Rotations des bras", en: "Arm circles", kind: "mobility", muscles: ["shoulders"], level: 1, unit: "seconds", met: 2.5, low: true, steps: ["Bras tendus sur les côtés.", "Faites de grands cercles vers l'avant puis vers l'arrière."], tips: ["Mouvement ample et contrôlé."] },
  { id: "jumping-jacks", fr: "Jumping jacks", en: "Jumping jacks", kind: "cardio", muscles: ["full"], level: 1, unit: "seconds", met: 8, stresses: ["knees"], steps: ["Sautez en écartant bras et jambes.", "Revenez pieds joints, bras le long du corps."], tips: ["Version sans saut : écartez une jambe à la fois."], easier: "jacks-sans-saut" },
  { id: "jacks-sans-saut", fr: "Jumping jacks sans saut", en: "Low-impact jacks", kind: "cardio", muscles: ["full"], level: 1, unit: "seconds", met: 5, low: true, steps: ["Écartez une jambe sur le côté en levant les bras.", "Revenez et alternez de côté."], tips: ["Gardez un rythme soutenu."] },
  { id: "montees-genoux", fr: "Montées de genoux", en: "High knees", kind: "cardio", muscles: ["legs", "full"], level: 2, unit: "seconds", met: 8, stresses: ["knees"], steps: ["Courez sur place en montant les genoux à hauteur de hanches."], tips: ["Restez sur l'avant des pieds."], easier: "marche-sur-place" },
  { id: "talons-fesses", fr: "Talons-fesses", en: "Butt kicks", kind: "cardio", muscles: ["legs"], level: 1, unit: "seconds", met: 7, stresses: ["knees"], steps: ["Courez sur place en ramenant les talons vers les fesses."], tips: ["Buste droit."] },
  { id: "burpees", fr: "Burpees", en: "Burpees", kind: "cardio", muscles: ["full"], level: 3, unit: "seconds", met: 10, stresses: ["knees", "wrists", "shoulders"], steps: ["Descendez en squat, mains au sol.", "Sautez les pieds en arrière en position de pompe.", "Revenez pieds sous les mains et sautez bras en l'air."], tips: ["Version facile : sans saut ni pompe."], easier: "squat" },
  { id: "pas-chasses", fr: "Pas chassés", en: "Side shuffles", kind: "cardio", muscles: ["legs"], level: 1, unit: "seconds", met: 6, low: true, steps: ["Fléchissez légèrement les genoux.", "Déplacez-vous latéralement en pas chassés, aller-retour."], tips: ["Restez bas et dynamique."] },
  { id: "boxe-air", fr: "Boxe dans le vide", en: "Shadow boxing", kind: "cardio", muscles: ["arms", "shoulders", "core"], level: 1, unit: "seconds", met: 6, low: true, steps: ["En garde, pieds décalés.", "Enchaînez des coups de poing rapides devant vous en tournant le buste."], tips: ["Ne verrouillez pas les coudes."] },
  { id: "step-marche", fr: "Montées sur marche", en: "Step-ups", kind: "cardio", muscles: ["legs", "glutes"], level: 1, unit: "seconds", met: 6, low: true, stresses: ["knees"], steps: ["Face à une marche stable.", "Montez un pied puis l'autre, redescendez et alternez la jambe de départ."], tips: ["Posez tout le pied sur la marche."] },
  { id: "corde-a-sauter", fr: "Corde à sauter (sans corde)", en: "Jump rope (no rope)", kind: "cardio", muscles: ["legs", "full"], level: 2, unit: "seconds", met: 9, stresses: ["knees"], steps: ["Sautillez sur l'avant des pieds en mimant la corde avec les poignets."], tips: ["Petits sauts, genoux souples."] },
  { id: "patineur", fr: "Sauts du patineur", en: "Skater hops", kind: "cardio", muscles: ["legs", "glutes"], level: 2, unit: "seconds", met: 8, stresses: ["knees"], steps: ["Sautez latéralement d'une jambe sur l'autre.", "Ramenez la jambe libre derrière."], tips: ["Atterrissez en douceur."], easier: "pas-chasses" },

  // ---------------------------------------------------------- Mobilité
  { id: "chat-vache", fr: "Chat-vache", en: "Cat-cow", kind: "mobility", muscles: ["back"], eq: ["mat"], level: 1, unit: "seconds", met: 2.3, low: true, steps: ["À quatre pattes.", "Arrondissez le dos en expirant, puis creusez-le en inspirant."], tips: ["Mouvement lent, suivez la respiration."] },
  { id: "etirement-ischios", fr: "Étirement des ischio-jambiers", en: "Hamstring stretch", kind: "mobility", muscles: ["legs"], eq: ["mat"], level: 1, unit: "seconds", met: 2.3, low: true, steps: ["Assis, une jambe tendue.", "Penchez le buste vers l'avant, dos droit, jusqu'à sentir l'étirement."], tips: ["Pas d'à-coups."] },
  { id: "fente-flechisseurs", fr: "Étirement des fléchisseurs de hanche", en: "Hip flexor stretch", kind: "mobility", muscles: ["legs", "glutes"], eq: ["mat"], level: 1, unit: "seconds", met: 2.3, low: true, steps: ["Un genou au sol, l'autre pied devant.", "Avancez doucement le bassin.", "Changez de côté à mi-temps."], tips: ["Serrez le fessier de la jambe arrière."] },
  { id: "posture-enfant", fr: "Posture de l'enfant", en: "Child's pose", kind: "mobility", muscles: ["back"], eq: ["mat"], level: 1, unit: "seconds", met: 2, low: true, steps: ["À genoux, asseyez-vous sur les talons.", "Allongez les bras devant vous, front au sol.", "Respirez profondément."], tips: ["Écartez les genoux si c'est plus confortable."] },
  { id: "rotation-thoracique", fr: "Rotations du buste au sol", en: "Thoracic rotations", kind: "mobility", muscles: ["back", "shoulders"], eq: ["mat"], level: 1, unit: "seconds", met: 2.3, low: true, steps: ["Allongé sur le côté, genoux fléchis, bras tendus devant.", "Ouvrez le bras du dessus vers l'arrière en suivant du regard.", "Changez de côté à mi-temps."], tips: ["Les genoux restent au sol."] },
  { id: "etirement-pectoraux", fr: "Étirement des pectoraux", en: "Chest stretch", kind: "mobility", muscles: ["chest", "shoulders"], level: 1, unit: "seconds", met: 2, low: true, steps: ["Avant-bras contre un encadrement de porte.", "Avancez doucement le buste.", "Changez de côté à mi-temps."], tips: ["Respirez lentement."] },
  { id: "papillon", fr: "Étirement papillon", en: "Butterfly stretch", kind: "mobility", muscles: ["legs"], eq: ["mat"], level: 1, unit: "seconds", met: 2, low: true, steps: ["Assis, plantes de pieds l'une contre l'autre.", "Laissez descendre les genoux, dos droit."], tips: ["Ne forcez pas sur les genoux."] },
];

export const exercises: Exercise[] = defs.map((d) => ({
  id: d.id,
  name: { fr: d.fr, en: d.en },
  kind: d.kind,
  muscles: d.muscles,
  equipment: d.eq ?? ["none"],
  level: d.level,
  unit: d.unit ?? "reps",
  met: d.met,
  lowImpact: d.low ?? false,
  stresses: d.stresses ?? [],
  steps: d.steps.map((fr) => ({ fr: tutoie(fr) })),
  tips: d.tips.map((fr) => ({ fr: tutoie(fr) })),
  easier: d.easier,
}));
