// Food Family taxonomy (ADR-020): the level below Subcategory that decides
// interchangeability. A Food Item with no Family is never generated into a
// plan, which is how flours, offal, sausages, confectionery and babyfood
// leave the generation pool without a rule of their own.
import overrides from './data/food-families.json';

export const FOOD_FAMILIES = [
  'poultry',
  'red_meat',
  'white_fish',
  'red_fish',
  'seafood',
  'eggs',
  'casein_dairy',
  'legume_protein',
  'porridge',
  'grain_garnish',
  'starchy_vegetable',
  'bread',
  'salad_vegetable',
  'cooked_vegetable',
  'berries',
  'fruit',
  'culinary_oil',
  'nuts_seeds',
  'fatty_fruit',
] as const;

export type FoodFamily = (typeof FOOD_FAMILIES)[number];

const FAMILY_SET: ReadonlySet<string> = new Set(FOOD_FAMILIES);

export function isFoodFamily(value: string): value is FoodFamily {
  return FAMILY_SET.has(value);
}

export const RU_TABLE_SOURCE = 'ru_kbju_table';
export const OFF_SOURCE = 'open_food_facts';

// Open Food Facts rows are branded retail products ("Picnic Eggs",
// "Beurre planta", "GALETTES EXTRA-FINES MAΪS"). ADR-020 puts them outside
// the generation pool as a group, so none is inferred into a Family; one
// that is genuinely a staple is opted back in through the override file.
//
// USDA's generic entries are exactly the pool we want, but the same dataset
// files babyfood, candy, restaurant items and prepared dishes under the same
// subcategories, and only the name separates them.
const NOT_A_STAPLE = [
  'babyfood',
  'candies',
  'candied',
  'burrito',
  'pizza',
  'sandwich',
  'mcdonald',
  'restaurant',
  'fast food',
  'bagels',
  'crackers',
  'cookie',
  'cake',
  ' pie',
  'rolls',
  'beverage',
  'drink mix',
  'bologna',
  'frankfurter',
  'sausage',
  'luncheon',
  'soup',
  'gravy',
  'sauce',
  'canned, with',
  'liquid from',
  'toasted',
  'substitute',
  'salad',
  'snack',
  'dried',
  'snap',
];

// `null` is a deliberate "never generate this", distinct from a missing key,
// which falls through to the inference rules.
const FAMILY_OVERRIDES: Record<string, FoodFamily | null | undefined> =
  overrides as Record<string, FoodFamily | null>;

const has = (name: string, ...needles: string[]) =>
  needles.some((needle) => name.includes(needle));

// sourceId is `${section}:${lowercased ru name}` - see tableSourceId().
function splitRuSourceId(sourceId: string): [string, string] {
  const at = sourceId.indexOf(':');
  return at === -1
    ? ['', sourceId]
    : [sourceId.slice(0, at), sourceId.slice(at + 1)];
}

// Russian names, because that is what the RU table stores; the English base
// name on those rows is DeepL output and a far weaker signal.
export function inferRuTableFamily(
  section: string,
  name: string,
): FoodFamily | null {
  switch (section) {
    case 'porridge':
      return 'porridge';
    case 'mushrooms':
      return has(name, 'сушен') ? null : 'cooked_vegetable';
    case 'fats':
      return name.startsWith('масло') ? 'culinary_oil' : null;
    case 'eggs':
      return name.startsWith('яйцо') ? 'eggs' : null;
    case 'dairy':
      if (has(name, 'сливки', 'сметана', 'сырки', 'сухое', 'сгущен'))
        return null;
      return 'casein_dairy';
    case 'meat':
      if (has(name, 'почк', 'печен', 'сердц', 'мозг', 'вымя', 'язык'))
        return null;
      if (has(name, 'куры', 'цыплят', 'индейка', 'утки', 'гусиное'))
        return 'poultry';
      return 'red_meat';
    case 'fish':
      if (has(name, 'палочки')) return null;
      if (
        has(
          name,
          'кальмар',
          'креветк',
          'мидии',
          'осьминог',
          'раки',
          'устриц',
          'крабовое',
        )
      )
        return 'seafood';
      if (has(name, 'горбуша', 'кета', 'лосось', 'семга', 'форель'))
        return 'red_fish';
      return 'white_fish';
    case 'vegetables':
      if (has(name, 'бобы', 'фасоль', 'горошек')) return 'legume_protein';
      if (has(name, 'оливки')) return 'fatty_fruit';
      if (has(name, 'картофель')) return 'starchy_vegetable';
      if (has(name, 'чеснок', 'хрен', 'корень')) return null;
      if (
        has(
          name,
          'салат',
          'огурцы',
          'томаты',
          'перец',
          'редис',
          'редька',
          'лук зеленый',
          'петрушка',
          'шпинат',
          'щавель',
          'капуста белокочанная',
          'капуста краснокочанная',
        )
      )
        return 'salad_vegetable';
      return 'cooked_vegetable';
    case 'fruits':
      if (has(name, 'шиповник')) return null;
      if (
        has(
          name,
          'брусника',
          'голубика',
          'ежевика',
          'земляника',
          'кизил',
          'клубника',
          'клюква',
          'крыжовник',
          'малина',
          'морошка',
          'облепиха',
          'рябина',
          'смородина',
          'черника',
          'шелковица',
        )
      )
        return 'berries';
      return 'fruit';
    case 'nuts_and_dried_fruits':
      return has(
        name,
        'арахис',
        'грецкий',
        'кешью',
        'миндаль',
        'фисташки',
        'фундук',
        'семя',
      )
        ? 'nuts_seeds'
        : null;
    case 'bread':
      return has(name, 'хлеб', 'батон', 'лаваш') ? 'bread' : null;
    default:
      return null;
  }
}

// Open Food Facts / USDA rows, which carry an English name and a subcategory
// but no section.
export function inferCatalogFamily(
  subcategory: string,
  name: string,
): FoodFamily | null {
  const lower = name.toLowerCase();
  const seafood = has(
    lower,
    'shrimp',
    'prawn',
    'squid',
    'calamari',
    'octopus',
    'mussel',
    'oyster',
    'clam',
    'scallop',
    'crab',
    'lobster',
  );

  switch (subcategory) {
    case 'lean_meat':
    case 'fatty_meat':
      return has(lower, 'chicken', 'turkey', 'duck', 'goose', 'poultry')
        ? 'poultry'
        : 'red_meat';
    case 'lean_fish':
    case 'fatty_fish':
      if (seafood) return 'seafood';
      return has(lower, 'salmon', 'trout') ? 'red_fish' : 'white_fish';
    case 'shellfish':
      return 'seafood';
    case 'whole_eggs':
    case 'egg_whites':
      return 'eggs';
    case 'low_fat_dairy':
    case 'full_fat_dairy':
    case 'fermented_dairy':
      return 'casein_dairy';
    case 'beans':
    case 'lentils_and_peas':
      return 'legume_protein';
    case 'complex_carbs':
      if (has(lower, 'flour', 'semolina', 'starch')) return null;
      if (has(lower, 'oat', 'porridge', 'muesli', 'granola')) return 'porridge';
      if (has(lower, 'bread', 'lavash', 'tortilla', 'pita', 'baguette'))
        return 'bread';
      return 'grain_garnish';
    case 'leafy_vegetables':
      return 'salad_vegetable';
    case 'cruciferous_vegetables':
      return has(lower, 'cabbage', 'radish', 'arugula', 'rocket')
        ? 'salad_vegetable'
        : 'cooked_vegetable';
    case 'starchy_vegetables':
      return 'starchy_vegetable';
    case 'other_vegetables':
      if (has(lower, 'olive', 'avocado')) return 'fatty_fruit';
      if (has(lower, 'garlic', 'ginger', 'herb', 'spice')) return null;
      return has(lower, 'cucumber', 'tomato', 'pepper', 'lettuce', 'celery')
        ? 'salad_vegetable'
        : 'cooked_vegetable';
    case 'fresh_fruit':
      if (has(lower, 'avocado', 'olive')) return 'fatty_fruit';
      return has(
        lower,
        'berry',
        'berries',
        'raspberr',
        'blueberr',
        'strawberr',
        'blackberr',
        'cranberr',
        'currant',
        'gooseberr',
      )
        ? 'berries'
        : 'fruit';
    case 'tree_nuts':
    case 'seeds':
      return 'nuts_seeds';
    case 'healthy_oils':
    case 'saturated_oils':
      return 'culinary_oil';
    default:
      return null;
  }
}

export interface FamilyInput {
  source: string | null;
  sourceId: string | null;
  subcategory: string;
  name: string;
}

export function familyOverrideKey(source: string, sourceId: string): string {
  return `${source}:${sourceId}`;
}

export function resolveFamily(input: FamilyInput): FoodFamily | null {
  const { source, sourceId, subcategory, name } = input;
  if (source && sourceId) {
    const override = FAMILY_OVERRIDES[familyOverrideKey(source, sourceId)];
    if (override !== undefined) return override;
    if (source === RU_TABLE_SOURCE) {
      const [section, ruName] = splitRuSourceId(sourceId);
      return inferRuTableFamily(section, ruName);
    }
    if (source === OFF_SOURCE) return null;
  }
  const lower = name.toLowerCase();
  if (NOT_A_STAPLE.some((needle) => lower.includes(needle))) return null;
  return inferCatalogFamily(subcategory, name);
}

export const familyOverrideKeys = Object.keys(FAMILY_OVERRIDES);
