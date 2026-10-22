import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type IngredientRow = {
  slug: string;
  name: string;
  category: string;
  units: string[];
  allergens?: string[];
  description: string;
  hazards?: string[];
};

type IngredientSeed =
  | [
      slug: string,
      name: string,
      category: string,
      units: string[],
      description: string,
      hazards?: string[],
    ]
  | [
      slug: string,
      name: string,
      category: string,
      units: string[],
      allergens: string[],
      description: string,
      hazards?: string[],
    ];

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

const ingredients: IngredientRow[] = (
  [
    ["avocado", "Avocado", "fruit", ["g"], "Soft, ripe flesh is easy to mash."],
    ["banana", "Banana", "fruit", ["g"], "Choose ripe fruit; mash or cut into a safe shape."],
    [
      "apple",
      "Apple",
      "fruit",
      ["g"],
      "Cook until soft for babies; raw apple is hard and can be a choking hazard.",
      ["Hard raw pieces can cause choking."],
    ],
    ["pear", "Pear", "fruit", ["g"], "Use ripe soft fruit or cook until soft."],
    ["peach", "Peach", "fruit", ["g"], "Remove the stone and offer ripe, soft fruit."],
    ["plum", "Plum", "fruit", ["g"], "Remove the stone; use ripe fruit or cook until soft."],
    ["mango", "Mango", "fruit", ["g"], "Remove the stone and offer ripe, soft flesh."],
    ["papaya", "Papaya", "fruit", ["g"], "Remove seeds and offer ripe, soft flesh."],
    ["melon", "Melon", "fruit", ["g"], "Remove rind and seeds; cut safely and supervise."],
    [
      "blueberry",
      "Blueberry",
      "fruit",
      ["g"],
      "Squash or quarter lengthways; whole berries can be a choking hazard.",
      ["Round whole berries can cause choking."],
    ],
    [
      "strawberry",
      "Strawberry",
      "fruit",
      ["g"],
      "Offer ripe, soft pieces cut to an age-appropriate shape.",
    ],
    ["raspberry", "Raspberry", "fruit", ["g"], "Wash and offer soft berries, mashed if helpful."],
    ["kiwi", "Kiwi", "fruit", ["g"], "Peel and offer ripe, soft pieces."],
    ["orange", "Orange", "fruit", ["g"], "Remove pips, peel and tough membranes."],
    [
      "apricot",
      "Apricot",
      "fruit",
      ["g"],
      "Remove the stone and offer ripe fruit or cook until soft.",
    ],
    [
      "broccoli",
      "Broccoli",
      "vegetable",
      ["g"],
      "Steam or boil until very soft; offer a soft floret or mash.",
    ],
    [
      "carrot",
      "Carrot",
      "vegetable",
      ["g"],
      "Cook until soft; hard raw carrot is a choking hazard.",
      ["Hard raw pieces can cause choking."],
    ],
    [
      "sweet-potato",
      "Sweet potato",
      "vegetable",
      ["g"],
      "Cook until soft enough to squash easily.",
    ],
    ["potato", "Potato", "vegetable", ["g"], "Cook until soft and mash; avoid adding salt."],
    ["pumpkin", "Pumpkin", "vegetable", ["g"], "Cook until very soft and remove the skin."],
    ["courgette", "Courgette", "vegetable", ["g"], "Cook until soft; offer strips or mash."],
    ["cauliflower", "Cauliflower", "vegetable", ["g"], "Cook until soft enough to squash."],
    [
      "peas",
      "Peas",
      "vegetable",
      ["g"],
      "Cook and squash each pea to reduce choking risk.",
      ["Whole round peas can cause choking."],
    ],
    ["green-beans", "Green beans", "vegetable", ["g"], "Cook until very soft and cut lengthways."],
    ["spinach", "Spinach", "vegetable", ["g"], "Cook until wilted and chop finely."],
    ["kale", "Kale", "vegetable", ["g"], "Remove tough stems and cook until soft."],
    ["aubergine", "Aubergine", "vegetable", ["g"], "Cook until soft throughout."],
    [
      "bell-pepper",
      "Bell pepper",
      "vegetable",
      ["g"],
      "Cook until soft; remove seeds and tough skin if needed.",
    ],
    [
      "tomato",
      "Tomato",
      "vegetable",
      ["g"],
      "Cook or use ripe soft tomato; cut small round tomatoes lengthways.",
    ],
    ["parsnip", "Parsnip", "vegetable", ["g"], "Cook until very soft and mash or cut safely."],
    [
      "oats",
      "Oats",
      "grain",
      ["g"],
      "Cook to a soft texture; cool before serving.",
      ["Contains gluten unless certified gluten-free."],
    ],
    [
      "rice",
      "Rice",
      "grain",
      ["g"],
      "Cook until soft, following pack instructions; cool before serving.",
    ],
    ["quinoa", "Quinoa", "grain", ["g"], "Rinse and cook until soft, following pack instructions."],
    [
      "couscous",
      "Couscous",
      "grain",
      ["g"],
      "Prepare until soft and moisten to avoid a dry, clumpy texture.",
      ["Contains gluten."],
    ],
    [
      "pasta",
      "Pasta",
      "grain",
      ["g"],
      "Cook until soft and cut into manageable pieces.",
      ["Contains gluten unless certified gluten-free."],
    ],
    [
      "wholemeal-bread",
      "Wholemeal bread",
      "grain",
      ["slice"],
      "Choose a soft texture and cut into safe strips.",
      ["Contains gluten."],
    ],
    ["polenta", "Polenta", "grain", ["g"], "Cook until smooth and soft."],
    ["barley", "Pearl barley", "grain", ["g"], "Cook until very soft.", ["Contains gluten."]],
    [
      "buckwheat",
      "Buckwheat",
      "grain",
      ["g"],
      "Cook until soft; despite its name it is not wheat.",
    ],
    ["millet", "Millet", "grain", ["g"], "Cook until soft and moist."],
    [
      "egg",
      "Egg",
      "protein",
      ["piece"],
      "Cook until white and yolk are fully set.",
      ["Egg is a common allergen."],
    ],
    [
      "salmon",
      "Salmon",
      "protein",
      ["g"],
      "Cook thoroughly and carefully remove all bones.",
      ["Fish is a common allergen."],
    ],
    [
      "white-fish",
      "White fish",
      "protein",
      ["g"],
      "Cook thoroughly and carefully remove all bones.",
      ["Fish is a common allergen."],
    ],
    [
      "chicken",
      "Chicken",
      "protein",
      ["g"],
      "Cook thoroughly; shred finely and check for firm pieces.",
    ],
    ["turkey", "Turkey", "protein", ["g"], "Cook thoroughly and shred finely."],
    ["beef", "Beef", "protein", ["g"], "Cook thoroughly until tender; mince or shred finely."],
    [
      "red-lentils",
      "Red lentils",
      "protein",
      ["g"],
      "Cook until very soft and break down any firm pieces.",
    ],
    [
      "chickpeas",
      "Chickpeas",
      "protein",
      ["g"],
      "Cook until soft and mash; whole chickpeas can cause choking.",
      ["Whole firm pulses can cause choking."],
    ],
    ["black-beans", "Black beans", "protein", ["g"], "Cook until soft and mash or squash."],
    [
      "tofu",
      "Tofu",
      "protein",
      ["g"],
      ["soya"],
      "Use plain tofu and cook until soft.",
      ["Soya is a common allergen."],
    ],
    [
      "plain-yogurt",
      "Plain full-fat yogurt",
      "dairy",
      ["g"],
      ["milk"],
      "Use pasteurised, unsweetened yogurt.",
      ["Milk is a common allergen."],
    ],
    [
      "cheddar",
      "Cheddar cheese",
      "dairy",
      ["g"],
      ["milk"],
      "Use pasteurised cheese, grated finely; avoid high-salt additions.",
      ["Milk is a common allergen."],
    ],
    [
      "ricotta",
      "Ricotta",
      "dairy",
      ["g"],
      ["milk"],
      "Use pasteurised ricotta.",
      ["Milk is a common allergen."],
    ],
    [
      "peanut-butter",
      "Smooth peanut butter",
      "protein",
      ["g"],
      ["peanuts"],
      "Use a thinly spread or mixed-in smooth form, never a spoonful of sticky paste.",
      ["Peanuts are a common allergen; thick sticky spoonfuls are a choking risk."],
    ],
    [
      "tahini",
      "Tahini",
      "protein",
      ["g"],
      ["sesame"],
      "Mix smooth tahini into food rather than serving a thick spoonful.",
      ["Sesame is a common allergen."],
    ],
    ["olive-oil", "Olive oil", "seasoning", ["ml"], "Use a small amount in cooking."],
    ["garlic", "Garlic", "seasoning", ["g"], "Cook until soft and use a small amount."],
    ["basil", "Basil", "seasoning", ["g"], "Wash and chop finely."],
    ["cinnamon", "Cinnamon", "seasoning", ["g"], "Use a small pinch mixed into moist food."],
    ["lemon", "Lemon", "fruit", ["ml"], "Use a small amount of juice; remove seeds."],
  ] satisfies IngredientSeed[]
).map((row) => {
  const [slug, name, category, units] = row;
  const knownAllergens: Record<string, string[]> = {
    oats: ["gluten"],
    couscous: ["gluten"],
    pasta: ["gluten"],
    "wholemeal-bread": ["gluten"],
    barley: ["gluten"],
    egg: ["egg"],
    salmon: ["fish"],
    "white-fish": ["fish"],
  };
  const hasExplicitAllergens = Array.isArray(row[4]);
  const allergens = hasExplicitAllergens ? stringList(row[4]) : (knownAllergens[slug] ?? []);
  const descriptionValue = typeof row[4] === "string" ? row[4] : row[5];
  const hazards = stringList(hasExplicitAllergens ? row[6] : row[5]);
  return {
    slug,
    name,
    category,
    units,
    allergens,
    description: typeof descriptionValue === "string" ? descriptionValue : "",
    hazards,
  };
});

type RecipeRow = {
  slug: string;
  title: string;
  mealType: "breakfast" | "lunch" | "dinner";
  description: string;
  age: number;
  servings: number;
  prep: number;
  cook: number;
  ingredients: Array<[string, number, string, string?]>;
  steps: string[];
};

const recipes: RecipeRow[] = [
  {
    slug: "banana-oat-porridge",
    title: "Banana oat porridge",
    mealType: "breakfast",
    description: "Soft oats with ripe banana.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 8,
    ingredients: [
      ["oats", 40, "g"],
      ["banana", 60, "g"],
      ["plain-yogurt", 40, "g"],
    ],
    steps: [
      "Cook oats with water until soft, stirring often.",
      "Mash ripe banana and stir through the oats.",
      "Cool, then add yogurt if suitable; check the texture before serving.",
    ],
  },
  {
    slug: "apple-cinnamon-oats",
    title: "Apple and cinnamon oats",
    mealType: "breakfast",
    description: "Gently cooked apple folded into soft porridge.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 12,
    ingredients: [
      ["oats", 40, "g"],
      ["apple", 80, "g"],
      ["cinnamon", 0.2, "g"],
    ],
    steps: [
      "Peel and grate the apple, then cook it with a splash of water until soft.",
      "Cook oats until soft and stir in the apple and a small pinch of cinnamon.",
      "Cool and check for firm pieces before offering.",
    ],
  },
  {
    slug: "pear-quinoa-breakfast",
    title: "Pear and quinoa breakfast bowl",
    mealType: "breakfast",
    description: "Soft quinoa with ripe pear.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 18,
    ingredients: [
      ["quinoa", 50, "g"],
      ["pear", 80, "g"],
      ["plain-yogurt", 30, "g"],
    ],
    steps: [
      "Rinse quinoa and cook until soft, following pack instructions.",
      "Mash or finely chop ripe pear, removing any hard core.",
      "Stir together and cool; add yogurt if suitable.",
    ],
  },
  {
    slug: "blueberry-yogurt-oats",
    title: "Blueberry yogurt oats",
    mealType: "breakfast",
    description: "Soft oats with crushed blueberries and yogurt.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 8,
    ingredients: [
      ["oats", 40, "g"],
      ["blueberry", 40, "g"],
      ["plain-yogurt", 60, "g"],
    ],
    steps: [
      "Cook oats with water until soft.",
      "Warm blueberries until soft and squash each one thoroughly.",
      "Cool the oats and fold in berries and yogurt.",
    ],
  },
  {
    slug: "sweet-potato-pancakes",
    title: "Sweet potato pancakes",
    mealType: "breakfast",
    description: "Soft, unsalted pancakes with egg.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 12,
    ingredients: [
      ["sweet-potato", 100, "g"],
      ["egg", 1, "piece"],
      ["oats", 30, "g"],
    ],
    steps: [
      "Cook and mash sweet potato until smooth, then mix with egg and oats.",
      "Cook small spoonfuls in a lightly oiled pan until set through on both sides.",
      "Cool and cut into soft strips; check the centre is fully cooked.",
    ],
  },
  {
    slug: "spinach-egg-cups",
    title: "Spinach and egg cups",
    mealType: "breakfast",
    description: "Soft baked egg with finely chopped spinach.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 15,
    ingredients: [
      ["egg", 2, "piece"],
      ["spinach", 20, "g"],
      ["cheddar", 10, "g"],
    ],
    steps: [
      "Wilt spinach, cool and chop finely; whisk the eggs.",
      "Mix with finely grated cheddar and bake in small portions until fully set.",
      "Cool completely and break into soft, manageable pieces.",
    ],
  },
  {
    slug: "avocado-toast-fingers",
    title: "Avocado toast fingers",
    mealType: "breakfast",
    description: "Ripe avocado on soft wholemeal toast.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 2,
    ingredients: [
      ["avocado", 60, "g"],
      ["wholemeal-bread", 1, "slice"],
      ["lemon", 2, "ml"],
    ],
    steps: [
      "Toast bread lightly so it stays soft rather than crisp.",
      "Mash ripe avocado with a little lemon juice.",
      "Spread thinly and cut toast into safe strips.",
    ],
  },
  {
    slug: "peach-ricotta-toast",
    title: "Peach and ricotta toast",
    mealType: "breakfast",
    description: "Soft toast with ripe peach and pasteurised ricotta.",
    age: 6,
    servings: 2,
    prep: 7,
    cook: 2,
    ingredients: [
      ["wholemeal-bread", 1, "slice"],
      ["peach", 60, "g"],
      ["ricotta", 30, "g"],
    ],
    steps: [
      "Toast bread lightly and cut into strips.",
      "Remove the peach stone and mash ripe flesh.",
      "Spread ricotta thinly and top with peach; check for any firm skin.",
    ],
  },
  {
    slug: "plum-millet-porridge",
    title: "Plum and millet porridge",
    mealType: "breakfast",
    description: "Soft millet with gently cooked plum.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 20,
    ingredients: [
      ["millet", 40, "g"],
      ["plum", 80, "g"],
      ["cinnamon", 0.2, "g"],
    ],
    steps: [
      "Rinse and cook millet until soft and moist.",
      "Remove the plum stone and cook flesh until soft, then mash.",
      "Fold together with a small pinch of cinnamon and cool before serving.",
    ],
  },
  {
    slug: "carrot-oat-pancakes",
    title: "Carrot oat pancakes",
    mealType: "breakfast",
    description: "Soft cooked carrot pancakes with egg.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 12,
    ingredients: [
      ["carrot", 60, "g"],
      ["egg", 1, "piece"],
      ["oats", 30, "g"],
    ],
    steps: [
      "Cook carrot until very soft and mash; mix with egg and oats.",
      "Cook small pancakes in a lightly oiled pan until fully set.",
      "Cool and cut into soft strips; do not serve firm raw carrot.",
    ],
  },
  {
    slug: "pumpkin-yogurt-bowl",
    title: "Pumpkin and yogurt bowl",
    mealType: "breakfast",
    description: "Soft pumpkin with plain yogurt and oats.",
    age: 6,
    servings: 2,
    prep: 6,
    cook: 14,
    ingredients: [
      ["pumpkin", 100, "g"],
      ["plain-yogurt", 50, "g"],
      ["oats", 20, "g"],
    ],
    steps: [
      "Cook peeled pumpkin until soft and mash.",
      "Cook oats until soft and cool.",
      "Stir together with plain yogurt; adjust texture with water if needed.",
    ],
  },
  {
    slug: "mango-chia-oats",
    title: "Mango oat breakfast",
    mealType: "breakfast",
    description: "Soft oats topped with ripe mango.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 8,
    ingredients: [
      ["oats", 40, "g"],
      ["mango", 60, "g"],
      ["plain-yogurt", 30, "g"],
    ],
    steps: [
      "Cook oats until very soft and let them cool.",
      "Remove mango stone and mash ripe flesh.",
      "Serve together with yogurt if suitable; avoid firm chunks.",
    ],
  },
  {
    slug: "berry-buckwheat-bowl",
    title: "Berry buckwheat breakfast",
    mealType: "breakfast",
    description: "Soft buckwheat with mashed berries.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 15,
    ingredients: [
      ["buckwheat", 40, "g"],
      ["raspberry", 30, "g"],
      ["strawberry", 30, "g"],
    ],
    steps: [
      "Cook buckwheat until soft, following pack instructions.",
      "Wash berries; mash them well and cut any firmer pieces small.",
      "Stir into the grain and cool before serving.",
    ],
  },
  {
    slug: "peanut-banana-oats",
    title: "Banana and peanut oat bowl",
    mealType: "breakfast",
    description: "Soft oats with banana and thinned smooth peanut butter.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 8,
    ingredients: [
      ["oats", 40, "g"],
      ["banana", 50, "g"],
      ["peanut-butter", 5, "g"],
    ],
    steps: [
      "Cook oats until soft and let them cool slightly.",
      "Mash banana and mix smooth peanut butter with a little warm water until runny.",
      "Stir thoroughly through the oats; never offer a sticky spoonful of nut butter.",
    ],
  },
  {
    slug: "apricot-barley-breakfast",
    title: "Apricot and barley bowl",
    mealType: "breakfast",
    description: "Soft barley with cooked apricot.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 25,
    ingredients: [
      ["barley", 35, "g"],
      ["apricot", 70, "g"],
      ["plain-yogurt", 30, "g"],
    ],
    steps: [
      "Cook barley until very soft, following pack instructions.",
      "Remove apricot stones and cook fruit until soft, then mash.",
      "Combine and cool; offer yogurt if suitable.",
    ],
  },
  {
    slug: "broccoli-lentil-mash",
    title: "Broccoli and red lentil mash",
    mealType: "lunch",
    description: "Soft lentils with very tender broccoli.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 18,
    ingredients: [
      ["broccoli", 70, "g"],
      ["red-lentils", 40, "g"],
      ["olive-oil", 2, "ml"],
    ],
    steps: [
      "Rinse lentils and simmer until soft, following pack instructions.",
      "Steam broccoli until very soft and cut the florets into manageable pieces.",
      "Mash to the texture your child manages; cool and add a little oil.",
    ],
  },
  {
    slug: "salmon-potato-cakes",
    title: "Salmon and potato cakes",
    mealType: "lunch",
    description: "Soft potato cakes with fully cooked, carefully checked salmon.",
    age: 6,
    servings: 2,
    prep: 12,
    cook: 16,
    ingredients: [
      ["salmon", 60, "g"],
      ["potato", 120, "g"],
      ["egg", 1, "piece"],
    ],
    steps: [
      "Cook potato until soft and mash; cook salmon thoroughly and check carefully for bones.",
      "Mix salmon and potato with beaten egg, then shape into small soft cakes.",
      "Cook until fully set through, cool and break open to check the centre.",
    ],
  },
  {
    slug: "chicken-sweet-potato-bowl",
    title: "Chicken and sweet potato bowl",
    mealType: "lunch",
    description: "Tender chicken with soft sweet potato.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 20,
    ingredients: [
      ["chicken", 60, "g"],
      ["sweet-potato", 100, "g"],
      ["peas", 30, "g"],
    ],
    steps: [
      "Cook chicken thoroughly and shred finely.",
      "Cook sweet potato and peas until very soft; squash the peas.",
      "Combine and mash or finely chop to a safe texture; cool before offering.",
    ],
  },
  {
    slug: "chickpea-tomato-stew",
    title: "Chickpea and tomato stew",
    mealType: "lunch",
    description: "Soft chickpeas cooked with tomato and courgette.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 18,
    ingredients: [
      ["chickpeas", 60, "g"],
      ["tomato", 60, "g"],
      ["courgette", 50, "g"],
    ],
    steps: [
      "Cook courgette and tomato until soft.",
      "Add cooked chickpeas and simmer until they squash easily.",
      "Mash chickpeas thoroughly and cool; do not offer whole firm chickpeas.",
    ],
  },
  {
    slug: "pea-mint-rice",
    title: "Pea and rice bowl",
    mealType: "lunch",
    description: "Soft rice with mashed peas and basil.",
    age: 6,
    servings: 2,
    prep: 5,
    cook: 20,
    ingredients: [
      ["rice", 40, "g"],
      ["peas", 50, "g"],
      ["basil", 2, "g"],
    ],
    steps: [
      "Cook rice until soft and moist, following pack instructions.",
      "Cook peas until soft and squash each one thoroughly.",
      "Mix with finely chopped basil and cool; check the texture is not dry or clumpy.",
    ],
  },
  {
    slug: "courgette-pasta",
    title: "Courgette and tomato pasta",
    mealType: "lunch",
    description: "Soft pasta with a simple courgette tomato sauce.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 15,
    ingredients: [
      ["pasta", 45, "g"],
      ["courgette", 60, "g"],
      ["tomato", 60, "g"],
    ],
    steps: [
      "Cook pasta until soft and cut into manageable pieces.",
      "Cook courgette and tomato until soft, then mash into a sauce.",
      "Stir together and cool; check for clumps and firm pieces.",
    ],
  },
  {
    slug: "turkey-pumpkin-rice",
    title: "Turkey and pumpkin rice",
    mealType: "lunch",
    description: "Soft rice with tender turkey and pumpkin.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 22,
    ingredients: [
      ["turkey", 50, "g"],
      ["pumpkin", 80, "g"],
      ["rice", 35, "g"],
    ],
    steps: [
      "Cook rice until soft; steam pumpkin until it squashes easily.",
      "Cook turkey thoroughly and mince or shred finely.",
      "Combine with a little cooking water, cool and check the texture.",
    ],
  },
  {
    slug: "tofu-vegetable-bowl",
    title: "Tofu and vegetable bowl",
    mealType: "lunch",
    description: "Soft tofu with broccoli and sweet potato.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 16,
    ingredients: [
      ["tofu", 50, "g"],
      ["broccoli", 50, "g"],
      ["sweet-potato", 80, "g"],
    ],
    steps: [
      "Steam broccoli and sweet potato until very soft.",
      "Warm plain tofu until hot throughout, then cool and crumble.",
      "Combine and mash or serve in soft pieces; note the soya allergen.",
    ],
  },
  {
    slug: "cauliflower-cheddar-mash",
    title: "Cauliflower and cheddar mash",
    mealType: "lunch",
    description: "Tender cauliflower with a little pasteurised cheddar.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 12,
    ingredients: [
      ["cauliflower", 100, "g"],
      ["potato", 60, "g"],
      ["cheddar", 8, "g"],
    ],
    steps: [
      "Cook cauliflower and potato until very soft.",
      "Mash with finely grated pasteurised cheddar.",
      "Cool before serving; do not add salt.",
    ],
  },
  {
    slug: "beef-parsnip-stew",
    title: "Beef and parsnip stew",
    mealType: "lunch",
    description: "Tender beef with soft parsnip and carrot.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 35,
    ingredients: [
      ["beef", 50, "g"],
      ["parsnip", 60, "g"],
      ["carrot", 50, "g"],
    ],
    steps: [
      "Simmer beef until tender and fully cooked.",
      "Add chopped parsnip and carrot and cook until very soft.",
      "Mince or shred beef finely, mash vegetables and cool before serving.",
    ],
  },
  {
    slug: "black-bean-avocado",
    title: "Black bean and avocado mash",
    mealType: "lunch",
    description: "Soft mashed black beans with ripe avocado.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 10,
    ingredients: [
      ["black-beans", 60, "g"],
      ["avocado", 50, "g"],
      ["lemon", 2, "ml"],
    ],
    steps: [
      "Cook beans until soft and mash thoroughly.",
      "Mash ripe avocado with a little lemon juice.",
      "Mix together and check there are no whole beans.",
    ],
  },
  {
    slug: "quinoa-vegetable-patties",
    title: "Quinoa and vegetable patties",
    mealType: "lunch",
    description: "Soft patties with quinoa, carrot and egg.",
    age: 6,
    servings: 2,
    prep: 12,
    cook: 15,
    ingredients: [
      ["quinoa", 45, "g"],
      ["carrot", 50, "g"],
      ["egg", 1, "piece"],
    ],
    steps: [
      "Cook quinoa until soft; cook carrot until very tender and mash.",
      "Mix with beaten egg and form small soft patties.",
      "Cook through in a lightly oiled pan, cool and check the centre is fully set.",
    ],
  },
  {
    slug: "white-fish-carrot-mash",
    title: "White fish and carrot mash",
    mealType: "lunch",
    description: "Soft carrot and potato with flaked fish.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 16,
    ingredients: [
      ["white-fish", 50, "g"],
      ["carrot", 50, "g"],
      ["potato", 70, "g"],
    ],
    steps: [
      "Cook carrot and potato until very soft.",
      "Cook fish thoroughly and carefully check for every bone.",
      "Flake finely, mash with vegetables and cool; note the fish allergen.",
    ],
  },
  {
    slug: "lentil-shepherd-bowl",
    title: "Lentil and potato shepherd bowl",
    mealType: "dinner",
    description: "Red lentils with soft vegetables and potato.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 25,
    ingredients: [
      ["red-lentils", 45, "g"],
      ["potato", 100, "g"],
      ["carrot", 40, "g"],
    ],
    steps: [
      "Cook lentils and carrot until very soft.",
      "Boil potato until tender and mash.",
      "Serve together or combine; cool and check for firm pieces.",
    ],
  },
  {
    slug: "chicken-broccoli-pasta",
    title: "Chicken and broccoli pasta",
    mealType: "dinner",
    description: "Soft pasta with finely shredded chicken and broccoli.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 18,
    ingredients: [
      ["chicken", 55, "g"],
      ["broccoli", 50, "g"],
      ["pasta", 40, "g"],
    ],
    steps: [
      "Cook pasta until soft and cut to a safe size.",
      "Cook chicken thoroughly and shred finely; steam broccoli until very soft.",
      "Mix with a little water, cool and check each piece is manageable.",
    ],
  },
  {
    slug: "salmon-quinoa-bowl",
    title: "Salmon and quinoa bowl",
    mealType: "dinner",
    description: "Flaked salmon with soft quinoa and peas.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 20,
    ingredients: [
      ["salmon", 55, "g"],
      ["quinoa", 40, "g"],
      ["peas", 35, "g"],
    ],
    steps: [
      "Rinse and cook quinoa until soft.",
      "Cook salmon thoroughly and check carefully for bones; cook peas until soft and squash them.",
      "Flake salmon finely, combine and cool; retain the fish allergen warning.",
    ],
  },
  {
    slug: "turkey-couscous-bowl",
    title: "Turkey and vegetable couscous",
    mealType: "dinner",
    description: "Moist couscous with soft turkey and courgette.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 18,
    ingredients: [
      ["turkey", 50, "g"],
      ["couscous", 35, "g"],
      ["courgette", 50, "g"],
    ],
    steps: [
      "Prepare couscous until soft and moist, following pack instructions.",
      "Cook turkey thoroughly and shred finely; cook courgette until soft.",
      "Mix well with extra water if needed to prevent a dry texture; note gluten.",
    ],
  },
  {
    slug: "tofu-tomato-rice",
    title: "Tofu tomato rice",
    mealType: "dinner",
    description: "Soft rice with tomato and plain tofu.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 20,
    ingredients: [
      ["tofu", 50, "g"],
      ["tomato", 60, "g"],
      ["rice", 40, "g"],
    ],
    steps: [
      "Cook rice until soft and moist.",
      "Cook tomato until soft and warm tofu through.",
      "Crumble tofu, mix with rice and cool; note the soya allergen.",
    ],
  },
  {
    slug: "beef-potato-carrot",
    title: "Beef, potato and carrot",
    mealType: "dinner",
    description: "A soft, simple bowl of tender beef and vegetables.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 35,
    ingredients: [
      ["beef", 50, "g"],
      ["potato", 70, "g"],
      ["carrot", 50, "g"],
    ],
    steps: [
      "Simmer beef until tender and fully cooked.",
      "Cook potato and carrot until very soft.",
      "Mince beef finely and mash vegetables; cool and check texture.",
    ],
  },
  {
    slug: "chickpea-pumpkin-stew",
    title: "Chickpea and pumpkin stew",
    mealType: "dinner",
    description: "Soft pumpkin with well-mashed chickpeas.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 18,
    ingredients: [
      ["chickpeas", 55, "g"],
      ["pumpkin", 90, "g"],
      ["garlic", 1, "g"],
    ],
    steps: [
      "Cook pumpkin until soft and cook garlic gently until tender.",
      "Add cooked chickpeas and simmer until they squash easily.",
      "Mash thoroughly and cool; do not serve whole firm chickpeas.",
    ],
  },
  {
    slug: "aubergine-lentil-rice",
    title: "Aubergine lentil rice",
    mealType: "dinner",
    description: "Soft aubergine and lentils served with rice.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 22,
    ingredients: [
      ["aubergine", 60, "g"],
      ["red-lentils", 40, "g"],
      ["rice", 35, "g"],
    ],
    steps: [
      "Cook aubergine until soft throughout.",
      "Simmer lentils until they break down and cook rice until soft.",
      "Combine or serve separately, cool and check texture.",
    ],
  },
  {
    slug: "white-fish-pea-potato",
    title: "White fish with peas and potato",
    mealType: "dinner",
    description: "Flaked white fish with soft potato and crushed peas.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 18,
    ingredients: [
      ["white-fish", 50, "g"],
      ["peas", 35, "g"],
      ["potato", 80, "g"],
    ],
    steps: [
      "Cook potato and peas until soft; squash every pea.",
      "Cook fish thoroughly and carefully check for bones.",
      "Flake fish finely, combine and cool; note the fish allergen.",
    ],
  },
  {
    slug: "spinach-ricotta-pasta",
    title: "Spinach and ricotta pasta",
    mealType: "dinner",
    description: "Soft pasta with spinach and pasteurised ricotta.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 14,
    ingredients: [
      ["pasta", 40, "g"],
      ["spinach", 25, "g"],
      ["ricotta", 25, "g"],
    ],
    steps: [
      "Cook pasta until soft and cut into manageable pieces.",
      "Wilt spinach, chop finely and stir through pasteurised ricotta.",
      "Mix with pasta and a little water; cool and note gluten and milk allergens.",
    ],
  },
  {
    slug: "turkey-bean-stew",
    title: "Turkey and black bean stew",
    mealType: "dinner",
    description: "Finely shredded turkey with soft beans and tomato.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 22,
    ingredients: [
      ["turkey", 50, "g"],
      ["black-beans", 50, "g"],
      ["tomato", 50, "g"],
    ],
    steps: [
      "Cook turkey thoroughly and shred finely.",
      "Cook tomato and beans until soft; mash beans thoroughly.",
      "Combine, cool and check for firm pieces before offering.",
    ],
  },
  {
    slug: "vegetable-quinoa-bowl",
    title: "Vegetable quinoa bowl",
    mealType: "dinner",
    description: "Soft quinoa with cauliflower and courgette.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 18,
    ingredients: [
      ["quinoa", 40, "g"],
      ["cauliflower", 50, "g"],
      ["courgette", 50, "g"],
    ],
    steps: [
      "Rinse and cook quinoa until soft.",
      "Steam cauliflower and courgette until very tender.",
      "Combine and mash lightly or serve separately in soft pieces; cool before serving.",
    ],
  },
  {
    slug: "chicken-aubergine-polenta",
    title: "Chicken with aubergine and polenta",
    mealType: "dinner",
    description: "Soft polenta with finely shredded chicken and aubergine.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 22,
    ingredients: [
      ["chicken", 50, "g"],
      ["aubergine", 50, "g"],
      ["polenta", 35, "g"],
    ],
    steps: [
      "Cook polenta until smooth and soft, following pack instructions.",
      "Cook chicken thoroughly and shred finely; cook aubergine until very soft.",
      "Serve together with enough moisture for a soft texture; cool before offering.",
    ],
  },
  {
    slug: "spinach-chickpea-couscous",
    title: "Spinach and chickpea couscous",
    mealType: "dinner",
    description: "Soft, moist couscous with spinach and mashed chickpeas.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 14,
    ingredients: [
      ["spinach", 20, "g"],
      ["chickpeas", 50, "g"],
      ["couscous", 35, "g"],
    ],
    steps: [
      "Prepare couscous until soft and moist.",
      "Wilt spinach and cook chickpeas until very soft, then mash thoroughly.",
      "Mix well with water if needed; cool and note gluten.",
    ],
  },
  {
    slug: "tomato-lentil-polenta",
    title: "Tomato lentils with polenta",
    mealType: "dinner",
    description: "Soft red lentils and tomato over smooth polenta.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 20,
    ingredients: [
      ["tomato", 60, "g"],
      ["red-lentils", 40, "g"],
      ["polenta", 35, "g"],
    ],
    steps: [
      "Simmer lentils with tomato until they are completely soft.",
      "Cook polenta until smooth, following pack instructions.",
      "Serve together, cool and check the texture before offering.",
    ],
  },
  {
    slug: "chicken-carrot-millet",
    title: "Chicken, carrot and millet",
    mealType: "dinner",
    description: "Soft millet with tender chicken and carrot.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 25,
    ingredients: [
      ["chicken", 50, "g"],
      ["carrot", 50, "g"],
      ["millet", 35, "g"],
    ],
    steps: [
      "Rinse and cook millet until soft and moist.",
      "Cook chicken thoroughly and shred finely; cook carrot until very soft.",
      "Combine and cool; check there are no firm pieces.",
    ],
  },
  {
    slug: "pumpkin-white-bean-rice",
    title: "Pumpkin and bean rice",
    mealType: "dinner",
    description: "Soft pumpkin with rice and mashed black beans.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 20,
    ingredients: [
      ["pumpkin", 70, "g"],
      ["black-beans", 45, "g"],
      ["rice", 35, "g"],
    ],
    steps: [
      "Cook rice until soft and pumpkin until very tender.",
      "Cook beans until soft and mash thoroughly.",
      "Combine and cool; check the meal is moist and free of whole beans.",
    ],
  },
  {
    slug: "pea-basil-pasta",
    title: "Pea and basil pasta",
    mealType: "dinner",
    description: "Soft pasta with crushed peas and finely chopped basil.",
    age: 6,
    servings: 2,
    prep: 7,
    cook: 14,
    ingredients: [
      ["pasta", 40, "g"],
      ["peas", 45, "g"],
      ["basil", 2, "g"],
    ],
    steps: [
      "Cook pasta until soft and cut into manageable pieces.",
      "Cook peas until soft and squash every pea.",
      "Stir together with finely chopped basil and a little water; cool before serving.",
    ],
  },
  {
    slug: "turkey-parsnip-barley",
    title: "Turkey, parsnip and barley",
    mealType: "dinner",
    description: "Tender turkey with soft parsnip and barley.",
    age: 6,
    servings: 2,
    prep: 10,
    cook: 30,
    ingredients: [
      ["turkey", 50, "g"],
      ["parsnip", 55, "g"],
      ["barley", 35, "g"],
    ],
    steps: [
      "Cook barley until very soft, following pack instructions.",
      "Cook turkey thoroughly and shred finely; cook parsnip until soft.",
      "Combine with a little water and cool; note barley contains gluten.",
    ],
  },
  {
    slug: "courgette-tofu-quinoa",
    title: "Courgette tofu quinoa",
    mealType: "dinner",
    description: "Soft quinoa with courgette and plain tofu.",
    age: 6,
    servings: 2,
    prep: 8,
    cook: 18,
    ingredients: [
      ["courgette", 50, "g"],
      ["tofu", 45, "g"],
      ["quinoa", 35, "g"],
    ],
    steps: [
      "Rinse and cook quinoa until soft.",
      "Cook courgette until tender and warm tofu through.",
      "Crumble tofu, combine and cool; note the soya allergen.",
    ],
  },
];

const guideFor = (ingredient: IngredientRow) => ({
  fingerFood: {
    title: "Finger-food preparation",
    instructions: `${ingredient.description} Offer only a soft, age-appropriate shape while your baby sits upright and is closely supervised.`,
    hazards: ingredient.hazards ?? [],
  },
  mashed: {
    title: "Mashed preparation",
    instructions: `Cook ${ingredient.name.toLowerCase()} until soft enough to squash easily, then mash with a fork. Check carefully for bones, stones, skins or firm pieces.`,
    hazards: ingredient.hazards ?? [],
  },
  puree: {
    title: "Purée preparation",
    instructions: `Cook ${ingredient.name.toLowerCase()} until soft and blend with a little safe cooking liquid to a texture your baby can manage. Cool before serving.`,
    hazards: ingredient.hazards ?? [],
  },
});

const allergenIndex = new Map(ingredients.map((item) => [item.slug, item.allergens ?? []]));
const recipeAllergens = (recipe: RecipeRow) =>
  new Set(recipe.ingredients.flatMap(([slug]) => allergenIndex.get(slug) ?? []));
const uses = (recipe: RecipeRow, slugs: string[]) =>
  recipe.ingredients.some(([slug]) => slugs.includes(slug));
const FISH = ["salmon", "white-fish"];
const MEAT = ["chicken", "turkey", "beef"];
const IRON_SOURCES = [
  ...MEAT,
  "egg",
  "red-lentils",
  "chickpeas",
  "black-beans",
  "tofu",
  "spinach",
  "kale",
];
const PULSES = ["red-lentils", "chickpeas", "black-beans", "tofu"];
const VEGETABLE_SLUGS = ingredients
  .filter((item) => item.category === "vegetable")
  .map((item) => item.slug);

type TemplateDefinition = {
  slug: string;
  name: string;
  description: string;
  /** Recipes matching this filter are preferred; other recipes of the same meal type fill gaps. */
  prefer: (recipe: RecipeRow) => boolean;
  /** Smaller pools repeat recipes, which suits batch cooking. */
  poolSize?: number;
};

const templates: TemplateDefinition[] = [
  {
    slug: "gentle-first-week",
    name: "A gentle variety week",
    description:
      "Simple six-month-friendly recipes with as few common allergens as possible; check each meal against your child's readiness and restrictions.",
    prefer: (recipe) => recipe.age <= 6 && recipeAllergens(recipe).size <= 1,
  },
  {
    slug: "plant-forward-week",
    name: "Plant-forward week",
    description:
      "Vegetarian grain, vegetable and pulse recipes with no meat or fish; check allergens and textures before use.",
    prefer: (recipe) => !uses(recipe, [...MEAT, ...FISH]),
  },
  {
    slug: "fish-and-family-favourites",
    name: "Fish and familiar favourites",
    description:
      "Includes fish recipes alongside other family meals; retain fish warnings and check bones carefully.",
    prefer: (recipe) => uses(recipe, FISH) || recipe.mealType === "breakfast",
  },
  {
    slug: "quick-family-week",
    name: "Quick family week",
    description:
      "Recipes that take around 25 minutes or less in total; adapt textures and portions for your child.",
    prefer: (recipe) => recipe.prep + recipe.cook <= 25,
  },
  {
    slug: "iron-rich-week",
    name: "Iron-focused week",
    description:
      "Features iron-containing foods such as meat, eggs, pulses and leafy greens. General ideas only — ask a health professional about individual nutrition needs.",
    prefer: (recipe) => uses(recipe, IRON_SOURCES),
  },
  {
    slug: "dairy-free-week",
    name: "Dairy-free week",
    description:
      "Recipes without milk-based ingredients. Always check labels and seek professional advice for suspected cows' milk allergy.",
    prefer: (recipe) => !recipeAllergens(recipe).has("milk"),
  },
  {
    slug: "egg-free-week",
    name: "Egg-free week",
    description:
      "Recipes without egg as an ingredient. Check packaged foods for hidden egg before serving.",
    prefer: (recipe) => !recipeAllergens(recipe).has("egg"),
  },
  {
    slug: "gluten-free-week",
    name: "Gluten-free week",
    description:
      "Recipes without wheat, barley or oats as listed ingredients. Check labels for cross-contamination before serving.",
    prefer: (recipe) => !recipeAllergens(recipe).has("gluten"),
  },
  {
    slug: "veg-packed-week",
    name: "Veg-packed week",
    description:
      "Vegetable-rich recipes (at least two vegetables at lunch and dinner) to help little ones meet lots of different vegetable flavours.",
    prefer: (recipe) =>
      recipe.ingredients.filter(([slug]) => VEGETABLE_SLUGS.includes(slug)).length >=
      (recipe.mealType === "breakfast" ? 1 : 2),
  },
  {
    slug: "pulse-power-week",
    name: "Lentils, beans and tofu week",
    description:
      "Lunches and dinners built around lentils, beans, chickpeas or tofu. Cook pulses until very soft and mash or flatten for younger babies.",
    prefer: (recipe) => uses(recipe, PULSES) || recipe.mealType === "breakfast",
  },
  {
    slug: "batch-cook-week",
    name: "Batch-cook and leftovers week",
    description:
      "Repeats a small set of recipes so you can cook once and serve again. Cool leftovers quickly, refrigerate and reheat only once until steaming hot.",
    prefer: (recipe) => recipe.servings >= 2,
    poolSize: 3,
  },
  {
    slug: "family-table-week",
    name: "Family table week",
    description:
      "Meat, fish and vegetarian family dinners that can be shared, with baby portions adapted for texture and no added salt.",
    prefer: (recipe) => recipe.mealType !== "dinner" || uses(recipe, [...MEAT, ...FISH, ...PULSES]),
  },
];

/** Deterministically chooses a recipe for each day and meal type of a template. */
function templateRecipe(
  template: TemplateDefinition,
  templateIndex: number,
  day: number,
  mealType: RecipeRow["mealType"],
) {
  const ofType = recipes.filter((recipe) => recipe.mealType === mealType);
  const preferred = ofType.filter(template.prefer);
  const pool = (preferred.length ? preferred : ofType).slice(0, template.poolSize ?? ofType.length);
  return pool[(day + templateIndex) % pool.length];
}
function validateCatalogue() {
  const ingredientSlugs = new Set(ingredients.map((ingredient) => ingredient.slug));
  if (ingredients.length < 60 || ingredientSlugs.size !== ingredients.length) {
    throw new Error("The catalogue requires at least 60 uniquely slotted ingredients.");
  }
  if (
    ingredients.some((ingredient) => !ingredient.description.trim() || !ingredient.units.length)
  ) {
    throw new Error(
      "Every ingredient requires preparation guidance and at least one supported unit.",
    );
  }
  if (
    recipes.length < 40 ||
    new Set(recipes.map((recipe) => recipe.slug)).size !== recipes.length
  ) {
    throw new Error("The catalogue requires at least 40 uniquely slotted recipes.");
  }
  for (const recipe of recipes) {
    if (
      recipe.ingredients.length < 2 ||
      recipe.steps.length < 2 ||
      recipe.steps.some((step) => !step.trim()) ||
      recipe.ingredients.some(
        ([slug, quantity, unit]) =>
          !ingredientSlugs.has(slug) || !Number.isFinite(quantity) || quantity <= 0 || !unit.trim(),
      )
    ) {
      throw new Error(`Recipe ${recipe.slug} is incomplete or references an unknown ingredient.`);
    }
  }
  if (
    templates.length < 12 ||
    new Set(templates.map((item) => item.slug)).size !== templates.length
  ) {
    throw new Error("The catalogue requires at least twelve uniquely slotted seven-day templates.");
  }
  for (const template of templates) {
    for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
      if (!recipes.some((recipe) => recipe.mealType === mealType && template.prefer(recipe))) {
        throw new Error(`Template ${template.slug} has no matching ${mealType} recipes.`);
      }
    }
  }
  for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
    if (!recipes.some((recipe) => recipe.mealType === mealType)) {
      throw new Error(`No recipes are available for ${mealType}.`);
    }
  }
}

async function main() {
  validateCatalogue();
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_CATALOG_SEED !== "true") {
    throw new Error("Production catalogue seeding requires explicit ALLOW_CATALOG_SEED=true.");
  }

  for (const ingredient of ingredients) {
    const row = await prisma.ingredient.upsert({
      where: { slug: ingredient.slug },
      create: {
        slug: ingredient.slug,
        name: ingredient.name,
        category: ingredient.category,
        supportedUnits: ingredient.units,
        allergens: ingredient.allergens ?? [],
      },
      update: {
        name: ingredient.name,
        category: ingredient.category,
        supportedUnits: ingredient.units,
        allergens: ingredient.allergens ?? [],
      },
    });
    await prisma.food.upsert({
      where: { slug: ingredient.slug },
      create: {
        slug: ingredient.slug,
        name: ingredient.name,
        description: ingredient.description,
        category: ingredient.category,
        ageGuidance:
          "Generally introduce solid foods around six months when all readiness signs are present. Seek professional guidance for individual concerns.",
        allergens: ingredient.allergens ?? [],
        preparationGuides: guideFor(ingredient),
        hazards: ingredient.hazards ?? [],
        ingredientId: row.id,
      },
      update: {
        name: ingredient.name,
        description: ingredient.description,
        category: ingredient.category,
        allergens: ingredient.allergens ?? [],
        preparationGuides: guideFor(ingredient),
        hazards: ingredient.hazards ?? [],
        ingredientId: row.id,
      },
    });
  }

  const bySlug = new Map(ingredients.map((item) => [item.slug, item]));
  for (const recipe of recipes) {
    const allergens = [
      ...new Set(recipe.ingredients.flatMap(([slug]) => bySlug.get(slug)?.allergens ?? [])),
    ];
    const saved = await prisma.recipe.upsert({
      where: { slug: recipe.slug },
      create: {
        slug: recipe.slug,
        title: recipe.title,
        description: recipe.description,
        mealType: recipe.mealType,
        suitableAgeMonths: recipe.age,
        allergens,
        servings: recipe.servings,
        preparationMinutes: recipe.prep,
        cookingMinutes: recipe.cook,
        instructions: recipe.steps,
        source:
          "Original Little Bites recipe; general food guidance cross-checked against NHS sources.",
      },
      update: {
        title: recipe.title,
        description: recipe.description,
        mealType: recipe.mealType,
        suitableAgeMonths: recipe.age,
        allergens,
        servings: recipe.servings,
        preparationMinutes: recipe.prep,
        cookingMinutes: recipe.cook,
        instructions: recipe.steps,
      },
    });
    await prisma.recipeIngredient.deleteMany({ where: { recipeId: saved.id } });
    await prisma.recipeIngredient.createMany({
      data: await Promise.all(
        recipe.ingredients.map(async ([slug, quantity, unit, preparationNote]) => {
          const ingredient = await prisma.ingredient.findUniqueOrThrow({
            where: { slug },
            select: { id: true },
          });
          return {
            recipeId: saved.id,
            ingredientId: ingredient.id,
            quantity,
            unit,
            preparationNote,
          };
        }),
      ),
    });
  }

  const recipeIds = await prisma.recipe.findMany({
    select: { id: true, slug: true, mealType: true },
    orderBy: { slug: "asc" },
  });
  for (const [templateIndex, template] of templates.entries()) {
    const record = { slug: template.slug, name: template.name, description: template.description };
    const saved = await prisma.mealPlanTemplate.upsert({
      where: { slug: template.slug },
      create: record,
      update: record,
    });
    await prisma.templateMeal.deleteMany({ where: { templateId: saved.id } });
    const data = Array.from({ length: 7 }, (_, day) =>
      (["breakfast", "lunch", "dinner"] as const).map((mealType) => {
        const chosen = templateRecipe(template, templateIndex, day, mealType);
        const recipe = recipeIds.find((row) => row.slug === chosen.slug);
        if (!recipe) throw new Error(`Recipe ${chosen.slug} was not seeded.`);
        return { templateId: saved.id, recipeId: recipe.id, dayOffset: day, mealType };
      }),
    ).flat();
    await prisma.templateMeal.createMany({ data });
  }
  console.info(
    `Seeded ${ingredients.length} canonical ingredients, ${recipes.length} recipes and ${templates.length} seven-day templates.`,
  );
}

if (process.argv.includes("--validate")) {
  try {
    validateCatalogue();
    console.info(
      `Catalogue validated: ${ingredients.length} ingredients, ${recipes.length} recipes and ${templates.length} seven-day templates.`,
    );
  } catch (error) {
    console.error(
      "Catalogue validation failed.",
      error instanceof Error ? error.message : "Unknown error",
    );
    process.exitCode = 1;
  }
} else {
  main()
    .catch((error: unknown) => {
      console.error(
        "Catalogue seed failed.",
        error instanceof Error ? error.name : "Unknown error",
      );
      process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
}
