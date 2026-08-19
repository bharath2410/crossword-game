import os
from pathlib import Path

LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
}

DOUBLE_LETTERS = {(2, 2), (2, 7), (7, 2), (7, 7)}
TRIPLE_WORDS = {(0, 0), (0, 9), (9, 0), (9, 9)}
CENTER_STARS = {(4, 4), (4, 5)}

DICTIONARY_PATH = Path(__file__).resolve().parent / "words.txt"

def load_dictionary() -> set:
    if not DICTIONARY_PATH.exists():
        return {"PYTHON", "DJANGO", "HTML", "CSS", "GAME", "BAT", "FAKE", "OAK", "CAT"}
    with open(DICTIONARY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        return {line.strip().upper() for line in f if line.strip()}

VALID_WORDS = load_dictionary()

def is_valid_word(word: str) -> bool:
    return word.strip().upper() in VALID_WORDS

def calculate_word_score(word: str, start_row: int, start_col: int, direction: str) -> int:
    word_multiplier = 1
    total_score = 0
    curr_row, curr_col = start_row, start_col

    for char in word.upper():
        base_val = LETTER_VALUES.get(char, 1)
        if (curr_row, curr_col) in DOUBLE_LETTERS:
            base_val *= 2
        if (curr_row, curr_col) in TRIPLE_WORDS:
            word_multiplier *= 3
        total_score += base_val

        if direction == "across":
            curr_col += 1
        else:
            curr_row += 1

    return total_score * word_multiplier

def validate_game_rules(word: str, start_row: int, start_col: int, direction: str, is_first_turn: bool, connected_to_existing: bool) -> tuple[bool, str]:
    # 1. Dictionary Check
    if not is_valid_word(word):
        return False, f"'{word}' is not in the dictionary."

    # 2. First turn must touch center star
    if is_first_turn:
        touches_center = False
        r, c = start_row, start_col
        for _ in word:
            if (r, c) in CENTER_STARS:
                touches_center = True
                break
            if direction == "across":
                c += 1
            else:
                r += 1
        if not touches_center:
            return False, "First move must cover a center star (★)!"
    else:
        # 3. Subsequent turns must hook to existing board tiles
        if not connected_to_existing:
            return False, "New word must connect to an existing tile!"

    return True, "Valid"