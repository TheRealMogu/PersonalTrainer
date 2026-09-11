/**
 * Dati iniziali caricati da `npm run db:seed`:
 * i tasti rapidi del diario e il programma di allenamento (Team Schiavi, T1).
 */

export type QuickFoodSeed = {
  name: string;
  portion: string | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export const QUICK_FOODS_SEED: QuickFoodSeed[] = [
  {
    name: "Colazione",
    portion: "150 ml latte parz. scremato + caffè + 30 g Coco Pops",
    kcal: 185,
    carbs: 32,
    protein: 6.5,
    fat: 3.5,
  },
  { name: "Yogurt greco Fage 0%", portion: "200 g", kcal: 118, carbs: 8, protein: 20, fat: 0.4 },
  { name: "Yogurt greco Fage 5%", portion: "150 g", kcal: 140, carbs: 6, protein: 13.5, fat: 7.5 },
  { name: "Banana", portion: "1 media", kcal: 105, carbs: 27, protein: 1.3, fat: 0.4 },
  { name: "Barretta fitness", portion: "66 kcal", kcal: 66, carbs: 4, protein: 8, fat: 2 },
  {
    name: "Whey isolate Yamamoto",
    portion: "1 scoop, 30 g",
    kcal: 110,
    carbs: 1,
    protein: 25,
    fat: 0.5,
  },
  { name: "Bresaola", portion: "50 g", kcal: 84, carbs: 0.3, protein: 21, fat: 0.6 },
  {
    name: "Salmone affumicato selvaggio",
    portion: "100 g",
    kcal: 117,
    carbs: 0,
    protein: 18,
    fat: 4,
  },
  { name: "Riso / pasta", portion: "100 g crudo", kcal: 365, carbs: 78, protein: 7, fat: 1 },
  { name: "Petto di pollo", portion: "150 g", kcal: 165, carbs: 0, protein: 46, fat: 3.6 },
  { name: "Uova sode", portion: "2 uova", kcal: 155, carbs: 1, protein: 13, fat: 11 },
  {
    name: "Tonno sgocciolato",
    portion: "1 scatoletta, 52 g",
    kcal: 65,
    carbs: 0,
    protein: 14,
    fat: 2,
  },
];

export type WorkoutExerciseSeed = {
  name: string;
  sets: number;
  reps: string;
};

export type WorkoutDaySeed = {
  label: string;
  focus: string;
  exercises: WorkoutExerciseSeed[];
};

export const WORKOUT_SEED: WorkoutDaySeed[] = [
  {
    label: "Day 1",
    focus: "Push",
    exercises: [
      { name: "Curl manubri con rotazione in piedi", sets: 3, reps: "8-10" },
      { name: "Curl panca inclinata senza rotazione", sets: 3, reps: "8-10" },
      { name: "Spinte manubri panca piana", sets: 4, reps: "5-7" },
      { name: "Chest incline", sets: 3, reps: "8-10" },
      { name: "Hack-squat", sets: 4, reps: "5-7" },
      { name: "Leg extension", sets: 3, reps: "8-10" },
      { name: "Lento avanti manubri", sets: 4, reps: "5-7" },
    ],
  },
  {
    label: "Day 2",
    focus: "Pull",
    exercises: [
      { name: "French press manubri", sets: 3, reps: "8-10" },
      { name: "Push down fune", sets: 3, reps: "8-10" },
      { name: "Hammer row presa stretta", sets: 4, reps: "5-7" },
      { name: "Iliac pulldown", sets: 3, reps: "8-10" },
      { name: "Alzate laterali in piedi con manubri", sets: 3, reps: "8-10" },
      { name: "Rear delt ai cavi doppi", sets: 3, reps: "8-10" },
      { name: "Leg curl seduto", sets: 4, reps: "5-7" },
      { name: "Leg curl sdraiato", sets: 3, reps: "8-10" },
    ],
  },
  {
    label: "Day 3",
    focus: "Full Body",
    exercises: [
      { name: "Spinte manubri panca piana", sets: 4, reps: "5-7" },
      { name: "Alzate laterali al cavo singolo", sets: 3, reps: "8-10" },
      { name: "Hammer row presa stretta", sets: 4, reps: "5-7" },
      { name: "Pressa orizzontale", sets: 3, reps: "8-10" },
      { name: "Leg curl seduto", sets: 3, reps: "8-10" },
      { name: "Spider curl con manubri prono su panca", sets: 3, reps: "8-10" },
      { name: "Dac con fune", sets: 3, reps: "8-10" },
      { name: "Crunch machine", sets: 3, reps: "8-10" },
    ],
  },
];
