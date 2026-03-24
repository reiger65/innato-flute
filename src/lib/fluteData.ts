/**
 * INNATO Flute Data and Logic
 * 
 * Contains tuning data for all INNATO flute types and functions
 * to calculate notes from fingering patterns.
 */

export type FluteType = 
	| "Em4" | "D#m4" | "Dm4" | "C#m4" | "Cm4"
	| "Bm3" | "Bbm3" | "Am3" | "G#m3" | "Gm3"
	| "F#m3" | "Fm3" | "Em3";

export type TuningFrequency = "440" | "432" | "256";

export interface Fingering {
	leftUpper: boolean;
	leftLower: boolean;
	rightUpper: boolean;
	rightLower: boolean;
	frontLeft: boolean;
	frontRight: boolean;
}

// Define the notes for each flute type
// Each chamber has 4 notes based on hole combinations:
// [both closed, bottom open, top open, both open]
const fluteNotes: Record<FluteType, {
	left: string[];
	right: string[];
	front: string[];
}> = {
	"Em4": {
		left: ["B3", "E4", "D4", "F#4"],
		right: ["E4", "A4", "G4", "B4"],
		front: ["B4", "D5", "E5", "F#5"]
	},
	"D#m4": {
		left: ["Bb3", "Eb4", "Db4", "F4"],
		right: ["Eb4", "Ab4", "Gb4", "Bb4"],
		front: ["Bb4", "Db5", "Eb5", "F5"]
	},
	"Dm4": {
		left: ["A3", "D4", "C4", "E4"],
		right: ["D4", "G4", "F4", "A4"],
		front: ["A4", "C5", "D5", "E5"]
	},
	"C#m4": {
		left: ["G#3", "C#4", "B3", "D#4"],
		right: ["C#4", "F#4", "E4", "G#4"],
		front: ["G#4", "B4", "C#5", "D#5"]
	},
	"Cm4": {
		left: ["G3", "Bb3", "C4", "D4"],
		right: ["C4", "Eb4", "F4", "G4"],
		front: ["G4", "Bb4", "C5", "D5"]
	},
	"Bm3": {
		left: ["F#3", "B3", "A3", "C#4"],
		right: ["B3", "E4", "D4", "F#4"],
		front: ["F#4", "A4", "B4", "C#5"]
	},
	"Bbm3": {
		left: ["F3", "Bb3", "Ab3", "C4"],
		right: ["Bb3", "Eb4", "Db4", "F4"],
		front: ["F4", "Ab4", "Bb4", "C5"]
	},
	"Am3": {
		left: ["E3", "A3", "G3", "B3"],
		right: ["A3", "D4", "C4", "E4"],
		front: ["E4", "G4", "A4", "B4"]
	},
	"G#m3": {
		left: ["D#3", "G#3", "F#3", "A#3"],
		right: ["G#3", "C#4", "B3", "D#4"],
		front: ["D#4", "F#4", "G#4", "A#4"]
	},
	"Gm3": {
		left: ["G3", "C4", "Bb3", "D4"],
		right: ["C4", "F4", "Eb4", "G4"],
		front: ["G4", "Bb4", "C5", "D5"]
	},
	"F#m3": {
		left: ["C#3", "F#3", "E3", "G#3"],
		right: ["F#3", "B3", "A3", "C#4"],
		front: ["C#4", "E4", "F#4", "G#4"]
	},
	"Fm3": {
		left: ["C3", "F3", "Eb3", "G3"],
		right: ["F3", "Bb3", "Ab3", "C4"],
		front: ["C4", "Eb4", "F4", "G4"]
	},
	"Em3": {
		left: ["B2", "E3", "D3", "F#3"],
		right: ["E3", "A3", "G3", "B3"],
		front: ["B3", "D4", "E4", "F#4"]
	}
};

/**
 * Get note for a specific fingering configuration in a chamber
 * 
 * Logic:
 * - Both holes closed: lowest note (index 0)
 * - Bottom open, top closed: next note (index 1)
 * - Top open, bottom closed: next note (index 2)
 * - Both open: highest note (index 3)
 */
export function getNoteForFingering(
	fluteType: FluteType,
	chamber: 'left' | 'right' | 'front',
	upperOpen: boolean,
	lowerOpen: boolean
): string {
	const notes = fluteNotes[fluteType][chamber];
	
	if (!upperOpen && !lowerOpen) return notes[0];  // Both closed
	if (!upperOpen && lowerOpen) return notes[1];   // Bottom open, top closed
	if (upperOpen && !lowerOpen) return notes[2];   // Top open, bottom closed
	return notes[3];  // Both open
}

/**
 * Calculate all three notes for a given fingering pattern
 * 
 * @param fingering - The fingering pattern (which holes are open/closed)
 * @param fluteType - The type of INNATO flute (default: Cm4)
 * @returns Object with left, right, and front notes
 */
export function getNotesForFingering(
	fingering: Fingering,
	fluteType: FluteType = 'Cm4'
): { left: string; right: string; front: string } {
	// For left chamber, the naming is inverted: leftUpper is physically lower, leftLower is physically upper
	const leftNote = getNoteForFingering(
		fluteType,
		'left',
		fingering.leftLower,  // Swap: leftLower is the upper hole
		fingering.leftUpper   // Swap: leftUpper is the lower hole
	);
	
	// For right chamber, the naming is inverted: rightUpper is physically lower, rightLower is physically upper
	const rightNote = getNoteForFingering(
		fluteType,
		'right',
		fingering.rightLower,  // Swap: rightLower is the upper hole
		fingering.rightUpper   // Swap: rightUpper is the lower hole
	);
	
	// For front chamber, use frontLeft as upper and frontRight as lower
	const frontNote = getNoteForFingering(
		fluteType,
		'front',
		fingering.frontLeft,
		fingering.frontRight
	);
	
	return { left: leftNote, right: rightNote, front: frontNote };
}

/**
 * Convert openStates array (6 booleans) to Fingering object
 * 
 * The openStates array corresponds to holes positioned clockwise starting from top-left.
 * With rotationDeg=90, startAngle = -90 + 90 = 0°, so:
 * [0] = 0° (right, 3 o'clock) → rightUpper
 * [1] = 60° (right-bottom) → rightLower
 * [2] = 120° (left-bottom) → leftLower
 * [3] = 180° (left, 9 o'clock) → leftUpper
 * [4] = 240° (left-top) → frontLeft
 * [5] = 300° (right-top) → frontRight
 * 
 * However, we need to map to match the original FingeringDiagram where:
 * - frontLeft is at top-left (~-120°)
 * - frontRight is at top-right (~-60°)
 * - rightUpper is at right (0°)
 * - rightLower is at right-bottom (60°)
 * - leftLower is at left-bottom (120°)
 * - leftUpper is at left (180°)
 * 
 * So we need to rotate the mapping by -2 positions (or +4 positions)
 */
export function openStatesToFingering(openStates: boolean[]): Fingering {
	if (openStates.length !== 6) {
		throw new Error('openStates must have exactly 6 elements');
	}
	
	// With rotationDeg=90, startAngle = 0°, holes are at: 0°, 60°, 120°, 180°, 240°, 300°
	// We need to map these to: frontLeft, frontRight, rightUpper, rightLower, leftLower, leftUpper
	// Which are at physical positions: ~-120°, ~-60°, 0°, 60°, 120°, 180°
	
	// So: [4] → frontLeft, [5] → frontRight, [0] → rightUpper, [1] → rightLower, [2] → leftLower, [3] → leftUpper
	return {
		frontLeft: openStates[4],   // Top-left (~240° or -120° equivalent)
		frontRight: openStates[5],  // Top-right (~300° or -60° equivalent)
		rightUpper: openStates[0],  // Right (0°)
		rightLower: openStates[1],  // Right-bottom (60°)
		leftLower: openStates[2],   // Left-bottom (120°)
		leftUpper: openStates[3]    // Left (180°)
	};
}

/**
 * Get notes from openStates array directly
 */
export function getNotesFromOpenStates(
	openStates: boolean[],
	fluteType: FluteType = 'Cm4'
): { left: string; right: string; front: string } {
	const fingering = openStatesToFingering(openStates);
	return getNotesForFingering(fingering, fluteType);
}

