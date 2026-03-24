/**
 * INNATO Chord Mappings
 * 
 * Systematic mapping of all 64 chord combinations.
 * 
 * Logic:
 * - Chord 1: All holes closed (binary 000000)
 * - Chord 64: All holes open (binary 111111)
 * - Each chord ID (1-64) corresponds to binary value 0-63
 * 
 * Binary bit order (LSB to MSB):
 *   bit 0: frontRight  (1)
 *   bit 1: frontLeft  (2)
 *   bit 2: rightLower (4)
 *   bit 3: rightUpper (8)
 *   bit 4: leftLower  (16)
 *   bit 5: leftUpper  (32)
 * 
 * This creates a systematic progression where:
 * - Chords 1-4: Only front holes variations
 * - Chords 5-16: Right chamber variations
 * - Chords 17-32: Left lower variations
 * - Chords 33-48: Left upper variations
 * - Chords 49-64: Both left variations
 */

import type { Fingering } from './fluteData';

// Generate all 64 chords using binary mapping
// Chord ID = binary value + 1
export const chordToFingering: Record<number, Fingering> = {};

for (let id = 1; id <= 64; id++) {
	const binaryValue = id - 1; // 0-63
	const binary = binaryValue.toString(2).padStart(6, '0');
	
	// Extract bits: bit 0 (LSB) to bit 5 (MSB)
	chordToFingering[id] = {
		frontRight: binary[5] === '1',  // bit 0 (value 1)
		frontLeft: binary[4] === '1',   // bit 1 (value 2)
		rightLower: binary[3] === '1',  // bit 2 (value 4)
		rightUpper: binary[2] === '1',  // bit 3 (value 8)
		leftLower: binary[1] === '1',   // bit 4 (value 16)
		leftUpper: binary[0] === '1'    // bit 5 (value 32)
	};
}

/**
 * Get fingering pattern for a chord ID (1-64)
 */
export function getFingeringForChord(chordId: number): Fingering {
	if (chordId < 1 || chordId > 64) {
		console.warn(`Invalid chord ID: ${chordId}. Using chord #1 as fallback.`);
		return chordToFingering[1];
	}
	return chordToFingering[chordId];
}

/**
 * Convert Fingering object to openStates array for visual display
 * 
 * The openStates array order matches the ChordCard component's visual layout:
 * [rightUpper, rightLower, leftLower, leftUpper, frontLeft, frontRight]
 * Which corresponds to angles: 0°, 60°, 120°, 180°, 240°, 300°
 */
export function fingeringToOpenStates(fingering: Fingering): boolean[] {
	return [
		fingering.rightUpper,  // [0] = 0° (right, 3 o'clock)
		fingering.rightLower,  // [1] = 60° (right-bottom)
		fingering.leftLower,   // [2] = 120° (left-bottom)
		fingering.leftUpper,   // [3] = 180° (left, 9 o'clock)
		fingering.frontLeft,   // [4] = 240° (left-top / top-left)
		fingering.frontRight   // [5] = 300° (right-top / top-right)
	];
}

/**
 * Get chord ID from fingering pattern
 * Uses binary calculation: ID = 1 + (frontRight * 1 + frontLeft * 2 + rightLower * 4 + rightUpper * 8 + leftLower * 16 + leftUpper * 32)
 */
export function getChordIdFromFingering(fingering: Fingering): number {
	const binaryValue = 
		(fingering.frontRight ? 1 : 0) +
		(fingering.frontLeft ? 2 : 0) +
		(fingering.rightLower ? 4 : 0) +
		(fingering.rightUpper ? 8 : 0) +
		(fingering.leftLower ? 16 : 0) +
		(fingering.leftUpper ? 32 : 0);
	
	return binaryValue + 1; // Chord IDs are 1-64, binary values are 0-63
}
