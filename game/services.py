import os
import random
from pathlib import Path
from collections import Counter

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
        return {"PYTHON", "DJANGO", "HTML", "CSS", "GAME", "BAT", "FAKE", "OAK", "CAT", "ROBOT", "AI", "STAR", "PLAY"}
    with open(DICTIONARY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        return {line.strip().upper() for line in f if 2 <= len(line.strip()) <= 10}

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
    if not is_valid_word(word):
        return False, f"'{word}' is not in the dictionary."

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
            return False, "First word must touch a center star (★)!"
    else:
        if not connected_to_existing:
            return False, "New word must connect to existing tiles!"

    return True, "Valid"

def find_bot_move(board_dict: dict, bot_letters: list) -> dict:
    """
    Scans existing board tiles, cross-references bot's hand against VALID_WORDS,
    and returns the best scoring legal move.
    """
    bot_counter = Counter([char.upper() for char in bot_letters])
    possible_moves = []

    # If board is empty, play across center
    if not board_dict:
        center_row, center_col = 4, 4
        for word in VALID_WORDS:
            if 3 <= len(word) <= 5:
                word_counter = Counter(word)
                if all(word_counter[k] <= bot_counter[k] for k in word_counter):
                    pts = calculate_word_score(word, center_row, center_col - 1, "across")
                    return {
                        "word": word,
                        "row": center_row,
                        "col": center_col - 1,
                        "direction": "across",
                        "tiles": [{"row": center_row, "col": center_col - 1 + idx, "letter": ch} for idx, ch in enumerate(word)],
                        "points": pts
                    }

    # Find open board anchor cells
    anchors = []
    for pos_str, char in board_dict.items():
        r, c = map(int, pos_str.split(","))
        anchors.append((r, c, char))

    random.shuffle(anchors)

    for r, c, anchor_char in anchors[:15]: # check top 15 anchors for performance
        for direction in ["across", "down"]:
            for word in VALID_WORDS:
                if 3 <= len(word) <= 6 and anchor_char in word:
                    idx = word.index(anchor_char)
                    start_r = r if direction == "across" else r - idx
                    start_c = c - idx if direction == "across" else c

                    if start_r < 0 or start_c < 0:
                        continue
                    if direction == "across" and (start_c + len(word) > 10):
                        continue
                    if direction == "down" and (start_r + len(word) > 10):
                        continue

                    # Check collision/fit with board
                    can_fit = True
                    needed_letters = []
                    new_tiles = []

                    for i, ch in enumerate(word):
                        curr_r = start_r if direction == "across" else start_r + i
                        curr_c = start_c + i if direction == "across" else start_c
                        existing = board_dict.get(f"{curr_r},{curr_c}")

                        if existing:
                            if existing != ch:
                                can_fit = False
                                break
                        else:
                            needed_letters.append(ch)
                            new_tiles.append({"row": curr_r, "col": curr_c, "letter": ch})

                    if can_fit and needed_letters:
                        needed_counter = Counter(needed_letters)
                        if all(needed_counter[k] <= bot_counter[k] for k in needed_counter):
                            pts = calculate_word_score(word, start_r, start_c, direction)
                            possible_moves.append({
                                "word": word,
                                "row": start_r,
                                "col": start_c,
                                "direction": direction,
                                "tiles": new_tiles,
                                "points": pts
                            })
                            if len(possible_moves) >= 5:
                                break
            if possible_moves:
                break
        if possible_moves:
            break

    if possible_moves:
        possible_moves.sort(key=lambda m: m["points"], reverse=True)
        return possible_moves[0]

    return None