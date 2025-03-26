export const RARITY_LEVELS = {
    COMMON: 1,
    UNCOMMON: 2,
    RARE: 3,
    DOUBLE_RARE: 4,
    ACE_SPEC: 5,
    ILLUSTRATION_RARE: 6,
    ULTRA_RARE: 7,
    SHINY_RARE: 8,
    SHINY_ULTRA_RARE: 9,
    SPECIAL_ILLUSTRATION_RARE: 10,
    HYPER_RARE: 11
};

// Mapping des raretés vers leurs niveaux
const RARITY_MAPPING: { [key: string]: number } = {
    // Common
    'common': RARITY_LEVELS.COMMON,
    
    // Uncommon
    'uncommon': RARITY_LEVELS.UNCOMMON,
    
    // Rare
    'rare': RARITY_LEVELS.RARE,
    'rare holo': RARITY_LEVELS.RARE,
    'rare reverse': RARITY_LEVELS.RARE,
    
    // Double Rare
    'double rare': RARITY_LEVELS.DOUBLE_RARE,
    'rare ex': RARITY_LEVELS.DOUBLE_RARE,
    'rare v': RARITY_LEVELS.DOUBLE_RARE,
    
    // ACE SPEC
    'ace spec': RARITY_LEVELS.ACE_SPEC,
    
    // Illustration Rare
    'illustration rare': RARITY_LEVELS.ILLUSTRATION_RARE,
    'full art': RARITY_LEVELS.ILLUSTRATION_RARE,
    
    // Ultra Rare
    'ultra rare': RARITY_LEVELS.ULTRA_RARE,
    'rare vmax': RARITY_LEVELS.ULTRA_RARE,
    'rare vstar': RARITY_LEVELS.ULTRA_RARE,
    
    // Shiny Rare
    'shiny rare': RARITY_LEVELS.SHINY_RARE,
    
    // Shiny Ultra Rare
    'shiny ultra rare': RARITY_LEVELS.SHINY_ULTRA_RARE,
    
    // Special Illustration Rare
    'special illustration rare': RARITY_LEVELS.SPECIAL_ILLUSTRATION_RARE,
    
    // Hyper Rare
    'hyper rare': RARITY_LEVELS.HYPER_RARE,
    'golden': RARITY_LEVELS.HYPER_RARE,
    'gold': RARITY_LEVELS.HYPER_RARE
};

export function getRarityLevel(rarity: string): number {
    const normalizedRarity = rarity.toLowerCase();
    
    // Chercher une correspondance exacte
    if (RARITY_MAPPING[normalizedRarity]) {
        return RARITY_MAPPING[normalizedRarity];
    }
    
    // Chercher une correspondance partielle
    for (const [key, value] of Object.entries(RARITY_MAPPING)) {
        if (normalizedRarity.includes(key)) {
            return value;
        }
    }
    
    // Si aucune correspondance n'est trouvée, retourner le niveau le plus bas
    return RARITY_LEVELS.COMMON;
} 