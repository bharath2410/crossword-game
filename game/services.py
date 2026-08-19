import os
from pathlib import Path

LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
}

# Special Multipliers on the 10x10 board
DOUBLE_LETTERS = {(2, 2), (2, 7), (7, 2), (7, 7)}
TRIPLE_WORDS = {(0, 0), (0, 9), (9, 0), (9, 9)}

DICTIONARY_PATH = Path(__file__).resolve().parent / "words.txt"

def load_dictionary() -> set:
    if not DICTIONARY_PATH.exists():
        return {"PYTHON", "DJANGO", "HTML", "CSS", "GAME", "LAT", "TAIL", "TINK"}
    with open(DICTIONARY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        return {line.strip().upper() for line in f if line.strip()}

VALID_WORDS = load_dictionary()

def is_valid_word(word: str) -> bool:
    return word.strip().upper() in VALID_WORDS

def calculate_word_score(word: str, start_row: int, start_col: int, direction: str) -> int:
    """Calculates score including 2L and 3W board bonuses"""
    word_multiplier = 1
    total_score = 0

    curr_row = start_row
    curr_col = start_col

    for char in word.upper():
        base_val = LETTER_VALUES.get(char, 1)

        # 2x Letter bonus
        if (curr_row, curr_col) in DOUBLE_LETTERS:
            base_val *= 2

        # 3x Word bonus
        if (curr_row, curr_col) in TRIPLE_WORDS:
            word_multiplier *= 3

        total_score += base_val

        if direction == "across":
            curr_col += 1
        else:
            curr_row += 1

    return total_score * word_multiplier