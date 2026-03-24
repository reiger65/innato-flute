# INNATO Flute: Physics and Fingering System Documentation

## Overview

The INNATO Flute is a harmonic three-chambered wind instrument that produces three-note chords simultaneously. It uses a unique fingering system with 6 holes arranged in a perfect circle around the flute body, creating 64 distinct chord combinations (2^6 = 64).

---

## Physical Structure

### Three Chambers

The flute consists of three separate chambers, each producing one note:

1. **Left Chamber** - Produces the bass/lowest note of the chord
2. **Right Chamber** - Produces the middle note of the chord  
3. **Front Chamber** - Produces the highest note of the chord

### Six Holes

Each chamber has two holes, arranged in a circular pattern around the flute body at 60° intervals:

- **Left Chamber Holes:**
  - `leftUpper` - Upper hole (physically located at 180° / 9 o'clock position)
  - `leftLower` - Lower hole (physically located at 120° / left-bottom position)
  
- **Right Chamber Holes:**
  - `rightUpper` - Upper hole (physically located at 0° / 3 o'clock position)
  - `rightLower` - Lower hole (physically located at 60° / right-bottom position)
  
- **Front Chamber Holes:**
  - `frontLeft` - Left front hole (physically located at 240° / top-left position)
  - `frontRight` - Right front hole (physically located at 300° / top-right position)

**Note:** There is a naming convention inversion in the code:
- For left chamber: `leftUpper` is physically the lower hole, `leftLower` is physically the upper hole
- For right chamber: `rightUpper` is physically the lower hole, `rightLower` is physically the upper hole
- For front chamber: `frontLeft` is the upper hole, `frontRight` is the lower hole

---

## Physics: How Holes Affect Pitch

### Basic Principle

In wind instruments, opening holes shortens the effective length of the air column, raising the pitch. Closing holes lengthens the effective air column, lowering the pitch.

### Per-Chamber Behavior

Each chamber can produce **4 distinct notes** based on the combination of its two holes:

| Upper Hole | Lower Hole | Result | Note Index |
|------------|------------|--------|------------|
| Closed     | Closed     | Lowest note (longest air column) | 0 |
| Closed     | Open        | Second note | 1 |
| Open       | Closed     | Third note | 2 |
| Open       | Open        | Highest note (shortest air column) | 3 |

### Physical Explanation

1. **Both holes closed:** The entire chamber length is used, producing the lowest resonant frequency (fundamental note).

2. **Lower hole open, upper closed:** The effective length is shortened from the bottom, raising the pitch. The air escapes through the lower hole, creating a shorter resonant path.

3. **Upper hole open, lower closed:** The effective length is shortened from the top, raising the pitch further. The air escapes through the upper hole.

4. **Both holes open:** The effective length is maximally shortened, producing the highest pitch. Air can escape through both holes, creating the shortest resonant path.

### Mathematical Relationship

The frequency of a note is inversely proportional to the effective length of the air column:

```
f ∝ 1/L_effective
```

Where:
- `f` = frequency (Hz)
- `L_effective` = effective length of the air column

Opening holes reduces `L_effective`, which increases `f`.

---

## Fingering System

### Fingering Data Structure

A fingering is represented as 6 boolean values:

```typescript
interface Fingering {
    leftUpper: boolean;    // true = open, false = closed
    leftLower: boolean;
    rightUpper: boolean;
    rightLower: boolean;
    frontLeft: boolean;
    frontRight: boolean;
}
```

### Total Combinations

With 6 binary states, there are **2^6 = 64** possible fingering combinations, numbered from 1 to 64.

### Binary Mapping System

Each fingering combination maps to a unique chord ID (1-64) using binary encoding:

**Bit Order (LSB to MSB):**
- Bit 0 (value 1): `frontRight`
- Bit 1 (value 2): `frontLeft`
- Bit 2 (value 4): `rightLower`
- Bit 3 (value 8): `rightUpper`
- Bit 4 (value 16): `leftLower`
- Bit 5 (value 32): `leftUpper`

**Formula:**
```
Chord ID = 1 + (frontRight × 1 + frontLeft × 2 + rightLower × 4 + rightUpper × 8 + leftLower × 16 + leftUpper × 32)
```

**Examples:**
- Chord 1 (binary 000000): All holes closed
- Chord 2 (binary 000001): Only `frontRight` open
- Chord 32 (binary 100000): Only `leftUpper` open
- Chord 64 (binary 111111): All holes open

### Systematic Progression

The binary mapping creates a logical progression:
- **Chords 1-4:** Only front chamber variations
- **Chords 5-16:** Right chamber variations (with front chamber combinations)
- **Chords 17-32:** Left lower hole variations
- **Chords 33-48:** Left upper hole variations
- **Chords 49-64:** Both left hole variations

---

## Note Calculation Logic

### Per-Chamber Note Lookup

Each flute type has a predefined set of 4 notes per chamber, stored as an array:

```typescript
fluteNotes[fluteType][chamber] = [note0, note1, note2, note3]
```

Where:
- `note0` = Both holes closed (lowest)
- `note1` = Lower open, upper closed
- `note2` = Upper open, lower closed
- `note3` = Both open (highest)

### Calculation Algorithm

For each chamber, determine which note to play:

```typescript
function getNoteForFingering(chamber, upperOpen, lowerOpen):
    if (!upperOpen && !lowerOpen) return notes[0]  // Both closed
    if (!upperOpen && lowerOpen)  return notes[1]  // Bottom open, top closed
    if (upperOpen && !lowerOpen)  return notes[2]  // Top open, bottom closed
    return notes[3]  // Both open
```

### Full Chord Calculation

To get all three notes for a fingering pattern:

1. **Left Chamber Note:**
   - Use `leftLower` as upper hole, `leftUpper` as lower hole (inverted naming)
   - Look up note from `fluteNotes[fluteType].left`

2. **Right Chamber Note:**
   - Use `rightLower` as upper hole, `rightUpper` as lower hole (inverted naming)
   - Look up note from `fluteNotes[fluteType].right`

3. **Front Chamber Note:**
   - Use `frontLeft` as upper hole, `frontRight` as lower hole
   - Look up note from `fluteNotes[fluteType].front`

**Result:** A chord with three simultaneous notes: `{ left: "G3", right: "C4", front: "G4" }`

---

## Flute Types and Tuning

### Available Flute Types

The INNATO Flute comes in 13 different types, each tuned to a different key:

- **Em4, D#m4, Dm4, C#m4, Cm4** (4th octave minor keys)
- **Bm3, Bbm3, Am3, G#m3, Gm3, F#m3, Fm3, Em3** (3rd octave minor keys)

### Note Ranges

Each flute type has a specific range:

**Example - Cm4 Flute:**
- Left chamber: `["G3", "Bb3", "C4", "D4"]`
- Right chamber: `["C4", "Eb4", "F4", "G4"]`
- Front chamber: `["G4", "Bb4", "C5", "D5"]`

**Example - Em3 Flute:**
- Left chamber: `["B2", "E3", "D3", "F#3"]`
- Right chamber: `["E3", "A3", "G3", "B3"]`
- Front chamber: `["B3", "D4", "E4", "F#4"]`

### Tuning Standards

The flute supports three tuning standards:

1. **A440 Hz** (Standard modern tuning)
2. **A432 Hz** (Verdi tuning / natural tuning)
3. **C256 Hz** (Scientific pitch / Schumann resonance)

---

## Frequency Calculation

### Equal Temperament Formula

Notes are converted to frequencies using the equal temperament system:

```
f = f₀ × 2^(n/12)
```

Where:
- `f` = frequency of the target note (Hz)
- `f₀` = frequency of the reference note (A4 = 440 Hz, 432 Hz, or 256 Hz × 2^0.75)
- `n` = number of semitones from the reference note

### Implementation

1. **Parse note name:** Extract note name (C, C#, D, etc.) and octave number
2. **Convert flats to sharps:** Bb → A#, Eb → D#, Ab → G#, Db → C#, Gb → F#
3. **Calculate semitone offset:** 
   ```
   stepsFromA4 = (noteIndex - A_index) + (octave - 4) × 12
   ```
4. **Calculate frequency:**
   ```
   frequency = tuningFrequency × 2^(stepsFromA4 / 12)
   ```

### Example Calculation

For note "C4" with A440 tuning:
- C is 3 semitones below A
- C4 is in octave 4 (same as A4)
- Steps from A4: -3
- Frequency: 440 × 2^(-3/12) = 440 × 2^(-0.25) ≈ 261.63 Hz

---

## Sound Generation

### Web Audio API Implementation

The flute uses the Web Audio API to generate sound:

1. **Oscillator:** Creates a sine wave at the calculated frequency
2. **Gain Node:** Controls volume with an ADSR envelope:
   - **Attack:** 40ms fade-in
   - **Sustain:** Hold at 20% volume
   - **Release:** 80ms fade-out
3. **Master Gain:** Overall volume control (30% default)

### Chord Playback

When playing a chord:
- Three oscillators are created simultaneously (one per chamber)
- Each oscillator plays its respective note frequency
- All three notes play together, creating a harmonic chord
- The envelope ensures smooth attack and release without clicks

---

## Key Design Principles

### Harmonic Design

The INNATO Flute is designed so that **all 64 possible fingering combinations produce only pleasant-sounding chords**. The note selection for each chamber is carefully chosen to eliminate dissonant intervals.

### Intuitive Playability

The instrument is designed to be playable by anyone with hands and ears, requiring minimal learning. The fingering system is systematic and logical.

### Three-Dimensional Sound

The three chambers produce notes in different octaves, creating a rich, three-dimensional harmonic experience. The left chamber typically plays bass notes, the right chamber plays mid-range notes, and the front chamber plays high notes.

---

## Summary

The INNATO Flute physics can be summarized as:

1. **Structure:** 3 chambers × 2 holes each = 6 holes total
2. **Combinations:** 2^6 = 64 unique fingering patterns
3. **Notes per chamber:** 4 notes (based on hole combinations)
4. **Total notes per chord:** 3 simultaneous notes (one per chamber)
5. **Pitch control:** Opening holes shortens air column → raises pitch
6. **Frequency calculation:** Equal temperament formula based on tuning standard
7. **Sound generation:** Web Audio API sine wave oscillators with ADSR envelopes

The system is mathematically elegant: binary encoding maps directly to fingering patterns, and the physics of wind instruments (air column length) determines pitch, creating a harmonious and intuitive musical instrument.

