/**
 * Utility functions for voice command parsing and number recognition.
 */

// Command Mappings
export const COMMANDS = {
    PASS: ["pass", "past", "path", "bass", "passe", "tamrir"],
    SHOOT: ["shoot", "shot", "chute", "suit", "tir", "tasdid"],
    GOAL: ["goal", "go", "gold", "cold", "but", "hadaf"],
    FOUL: ["foul", "fall", "full", "fail", "faute", "khata"],
    OFFSIDE: ["offside", "hors-jeu", "tasallul"],
    PENALTY: ["penalty", "peno", "rkalat"],
    CORNER: ["corner", "ruknya"],
    SUBSTITUTION: ["substitution", "sub", "change", "remplacement", "tabdil"],
};

// Number Mappings
const NUMBERS_EN: Record<string, number> = {
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "mine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
};

const NUMBERS_FR: Record<string, number> = {
    "un": 1, "une": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5,
    "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10,
    "onze": 11, "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15,
    "seize": 16, "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19, "vingt": 20,
    "trente": 30, "quarante": 40, "cinquante": 50, "soixante": 60, "soixante-dix": 70, "quatre-vingt": 80, "quatre-vingt-dix": 90
};

const NUMBERS_AR: Record<string, number> = {
    "wahid": 1, "ithnan": 2, "thalatha": 3, "arbaa": 4, "khamsa": 5,
    "sitta": 6, "sab'a": 7, "thamaniya": 8, "tis'a": 9, "ashara": 10,
    "ahada ashara": 11, "ithna ashara": 12, "thalatha ashara": 13, "arbaa ashara": 14, "khamsa ashara": 15,
    "sitta ashara": 16, "sab'a ashara": 17, "thamaniya ashara": 18, "tis'a ashara": 19, "ishrun": 20,
    "thalathun": 30, "arba'un": 40, "khamsun": 50, "sittun": 60, "sab'un": 70, "thamanun": 80, "tis'un": 90
};

/**
 * Levenshtein distance for fuzzy matching
 */
export const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
};

/**
 * Match a transcript against a list of known commands using fuzzy logic
 */
export const matchCommand = (transcript: string, commandList: string[]): boolean => {
    const words = transcript.toLowerCase().split(/\s+/);

    for (const word of words) {
        for (const cmd of commandList) {
            // Exact match
            if (word === cmd) return true;

            // Fuzzy match (allow 1 edit for short words, 2 for longer)
            const threshold = cmd.length > 4 ? 2 : 1;
            if (levenshteinDistance(word, cmd) <= threshold) return true;
        }
    }
    return false;
};

/**
 * Parse a number from the transcript, supporting EN, FR, AR and digits.
 */
export const parseNumber = (transcript: string): number | null => {
    const lowerTranscript = transcript.toLowerCase();

    // 1. Check for digits directly (e.g., "10", "5")
    const digitMatch = lowerTranscript.match(/\d+/);
    if (digitMatch) {
        return parseInt(digitMatch[0], 10);
    }

    // 2. Check word mappings
    const words = lowerTranscript.split(/\s+/);

    for (const word of words) {
        // English
        if (NUMBERS_EN[word]) return NUMBERS_EN[word];
        // French
        if (NUMBERS_FR[word]) return NUMBERS_FR[word];
        // Arabic (simplified single word check)
        if (NUMBERS_AR[word]) return NUMBERS_AR[word];
    }

    // 3. Handle compound numbers (e.g., "twenty two", "vingt deux") - Simplified
    // This is complex for full coverage, but we can catch common ones by iterating pairs
    for (let i = 0; i < words.length - 1; i++) {
        const pair = `${words[i]} ${words[i + 1]}`;

        // English: "twenty two" -> 22
        if (NUMBERS_EN[words[i]] && NUMBERS_EN[words[i + 1]]) {
            // Only if first is a ten (20, 30...) and second is unit (1-9)
            if (NUMBERS_EN[words[i]] >= 20 && NUMBERS_EN[words[i + 1]] < 10) {
                return NUMBERS_EN[words[i]] + NUMBERS_EN[words[i + 1]];
            }
        }

        // French: "vingt deux" -> 22
        if (NUMBERS_FR[words[i]] && NUMBERS_FR[words[i + 1]]) {
            if (NUMBERS_FR[words[i]] >= 20 && NUMBERS_FR[words[i + 1]] < 20) { // French allows 20-19 sometimes (soixante-dix-neuf) but simplified here
                return NUMBERS_FR[words[i]] + NUMBERS_FR[words[i + 1]];
            }
        }

        // Arabic: "ahada ashara" (11) is already in map, but "wahid wa ishrun" (21) needs logic
        // Arabic typically says "unit and ten" (wahid wa ishrun)
        if (words[i + 1] === "wa" && i < words.length - 2) {
            const unit = words[i];
            const ten = words[i + 2];
            if (NUMBERS_AR[unit] && NUMBERS_AR[ten]) {
                return NUMBERS_AR[unit] + NUMBERS_AR[ten];
            }
        }
    }

    return null;
};
