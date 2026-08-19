import os
from pathlib import Path

# Scrabble standard letter values
LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
}

DICTIONARY_PATH = Path(__file__).resolve().parent / "words.txt"

def load_dictionary() -> set:
    """
    Loads all words from words.txt into an in-memory set.
    Executes once on server startup for instantaneous O(1) lookups.
    """
    if not DICTIONARY_PATH.exists():
        # Fallback baseline in case the file is missing
        return {"PYTHON", "DJANGO", "HTML", "CSS", "GAME"}

    with open(DICTIONARY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        return {line.strip().upper() for line in f if line.strip()}

# Global in-memory dictionary set
VALID_WORDS = load_dictionary()

def is_valid_word(word: str) -> bool:
    """Instant O(1) hash table lookup across 270,000+ words"""
    return word.strip().upper() in VALID_WORDS

def calculate_word_score(word: str) -> int:
    return sum(LETTER_VALUES.get(char.upper(), 1) for char in word)