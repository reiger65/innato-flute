#!/bin/bash

# Script to generate missing audio files using pitch shifting
# Based on closest available notes:
# - E.mp3 (hoge E4) from D# (1 semitone up)
# - F.mp3 (altijd laag F3) from G (2 semitones down)
# - Fsharp.mp3 from G (1 semitone down)
# 
# Note: E works for both E3 and E4 since code removes octave

TANPURA_DIR="/Users/hanshoukes/Desktop/innato-flute/public/audio/drone_player/tanpura"
SHRUTIBOX_DIR="/Users/hanshoukes/Desktop/innato-flute/public/audio/drone_player/shrutibox"

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg not found. Installing via Homebrew..."
    if command -v brew &> /dev/null; then
        brew install ffmpeg
    else
        echo "Error: Homebrew not found. Please install ffmpeg manually:"
        echo "  brew install ffmpeg"
        echo "Or download from: https://ffmpeg.org/download.html"
        exit 1
    fi
fi

# Pitch shift factors (using equal temperament)
# 1 semitone = 2^(1/12) ≈ 1.059463
# 2 semitones = 2^(2/12) ≈ 1.122462
# 3 semitones = 2^(3/12) ≈ 1.189207
SEMITONE_UP="1.059463"
TWO_SEMITONES_DOWN="0.890899"  # 1 / 1.122462
THREE_SEMITONES_DOWN="0.840896"  # 1 / 1.189207
SEMITONE_DOWN="0.943874"

echo "Generating missing audio files for both Tanpura and Shrutibox..."

# Generate E.mp3 from Dsharp.mp3 (1 semitone up) - works for both E3 and E4
if [ -f "$TANPURA_DIR/Dsharp.mp3" ]; then
    echo "Generating Tanpura E.mp3 from Dsharp.mp3 (1 semitone up)..."
    ffmpeg -i "$TANPURA_DIR/Dsharp.mp3" -af "asetrate=44100*$SEMITONE_UP,aresample=44100" "$TANPURA_DIR/E.mp3" -y -loglevel error
    
    echo "Generating Shrutibox E.mp3 from Dsharp.mp3 (1 semitone up)..."
    ffmpeg -i "$SHRUTIBOX_DIR/Dsharp.mp3" -af "asetrate=44100*$SEMITONE_UP,aresample=44100" "$SHRUTIBOX_DIR/E.mp3" -y -loglevel error
    
    if [ -f "$TANPURA_DIR/E.mp3" ] && [ -f "$SHRUTIBOX_DIR/E.mp3" ]; then
        echo "✓ E.mp3 created for both instruments"
    fi
else
    echo "Error: Dsharp.mp3 not found in tanpura directory"
fi

# Generate F.mp3 from G.mp3 (2 semitones down) - always low F3
if [ -f "$TANPURA_DIR/G.mp3" ]; then
    echo "Generating Tanpura F.mp3 from G.mp3 (2 semitones down)..."
    ffmpeg -i "$TANPURA_DIR/G.mp3" -af "asetrate=44100*$TWO_SEMITONES_DOWN,aresample=44100" "$TANPURA_DIR/F.mp3" -y -loglevel error
    
    echo "Generating Shrutibox F.mp3 from G.mp3 (2 semitones down)..."
    ffmpeg -i "$SHRUTIBOX_DIR/G.mp3" -af "asetrate=44100*$TWO_SEMITONES_DOWN,aresample=44100" "$SHRUTIBOX_DIR/F.mp3" -y -loglevel error
    
    if [ -f "$TANPURA_DIR/F.mp3" ] && [ -f "$SHRUTIBOX_DIR/F.mp3" ]; then
        echo "✓ F.mp3 created for both instruments"
    fi
else
    echo "Error: G.mp3 not found in tanpura directory"
fi

# Generate Fsharp.mp3 from G.mp3 (1 semitone down)
if [ -f "$TANPURA_DIR/G.mp3" ]; then
    echo "Generating Tanpura Fsharp.mp3 from G.mp3 (1 semitone down)..."
    ffmpeg -i "$TANPURA_DIR/G.mp3" -af "asetrate=44100*$SEMITONE_DOWN,aresample=44100" "$TANPURA_DIR/Fsharp.mp3" -y -loglevel error
    
    echo "Generating Shrutibox Fsharp.mp3 from G.mp3 (1 semitone down)..."
    ffmpeg -i "$SHRUTIBOX_DIR/G.mp3" -af "asetrate=44100*$SEMITONE_DOWN,aresample=44100" "$SHRUTIBOX_DIR/Fsharp.mp3" -y -loglevel error
    
    if [ -f "$TANPURA_DIR/Fsharp.mp3" ] && [ -f "$SHRUTIBOX_DIR/Fsharp.mp3" ]; then
        echo "✓ Fsharp.mp3 created for both instruments"
    fi
else
    echo "Error: G.mp3 not found in tanpura directory"
fi

echo ""
echo "Done! Checking results:"
echo ""
echo "Tanpura files:"
ls -lh "$TANPURA_DIR"/{E,F,Fsharp}.mp3 2>/dev/null || echo "Some tanpura files may be missing"
echo ""
echo "Shrutibox files:"
ls -lh "$SHRUTIBOX_DIR"/{E,F,Fsharp}.mp3 2>/dev/null || echo "Some shrutibox files may be missing"

