import os
import random
from pathlib import Path
from collections import Counter

LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10,
    '*': 0  # Blank wildcard
}

DOUBLE_LETTERS = {(2, 2), (2, 7), (7, 2), (7, 7)}
TRIPLE_WORDS = {(0, 0), (0, 9), (9, 0), (9, 9)}
CENTER_STARS = {(4, 4), (4, 5)}

DICTIONARY_PATH = Path(__file__).resolve().parent / "words.txt"

def load_dictionary() -> set:
    if not DICTIONARY_PATH.exists():
        return {"PYTHON", "DJANGO", "HTML", "CSS", "GAME", "BAT", "FAKE", "OAK", "CAT", "ROBOT", "AI", "STAR", "PLAY", "AT", "TO", "IN", "ON", "HE", "BE"}
    with open(DICTIONARY_PATH, "r", encoding="utf-8", errors="ignore") as f:
        return {line.strip().upper() for line in f if 2 <= len(line.strip()) <= 15}

VALID_WORDS = load_dictionary()

def is_valid_word(word: str) -> bool:
    return word.strip().upper() in VALID_WORDS

def calculate_single_word_score(word_tiles: list) -> int:
    """
    word_tiles: list of dicts [{'row': r, 'col': c, 'char': 'A', 'is_new': True, 'is_blank': False}]
    """
    word_multiplier = 1
    total = 0
    for tile in word_tiles:
        val = 0 if tile.get('is_blank', False) else LETTER_VALUES.get(tile['char'].upper(), 1)
        r, c = tile['row'], tile['col']
        if tile.get('is_new', False):
            if (r, c) in DOUBLE_LETTERS:
                val *= 2
            if (r, c) in TRIPLE_WORDS:
                word_multiplier *= 3
        total += val
    return total * word_multiplier

def validate_entire_turn(board_dict: dict, newly_placed: list, is_first_turn: bool) -> tuple[bool, str, int, list]:
    """
    Scans the board and validates:
    1. Main primary word.
    2. All newly formed perpendicular cross-words.
    3. Center start & connectivity rules.
    4. 50-pt Bingo bonus for using all 7 tiles.
    """
    if not newly_placed:
        return False, "No tiles placed.", 0, []

    # Check alignment (all in 1 row or 1 column)
    rows = {t['row'] for t in newly_placed}
    cols = {t['col'] for t in newly_placed}

    if len(rows) > 1 and len(cols) > 1:
        return False, "Tiles must be in a single straight row or column.", 0, []

    direction = "across" if len(rows) == 1 and len(cols) >= 1 else "down"
    if len(newly_placed) == 1:
        # Check adjacent neighbors to decide primary axis
        r, c = newly_placed[0]['row'], newly_placed[0]['col']
        has_h = f"{r},{c-1}" in board_dict or f"{r},{c+1}" in board_dict
        has_v = f"{r-1},{c}" in board_dict or f"{r+1},{c}" in board_dict
        if has_v and not has_h:
            direction = "down"

    # 1. Trace the MAIN word
    new_lookup = {f"{t['row']},{t['col']}": t for t in newly_placed}
    start_r = min(t['row'] for t in newly_placed)
    start_c = min(t['col'] for t in newly_placed)

    if direction == "across":
        while start_c > 0 and (f"{start_r},{start_c-1}" in board_dict or f"{start_r},{start_c-1}" in new_lookup):
            start_c -= 1
    else:
        while start_r > 0 and (f"{start_r-1},{start_c}" in board_dict or f"{start_r-1},{start_c}" in new_lookup):
            start_r -= 1

    main_tiles = []
    curr_r, curr_c = start_r, start_c
    connected_to_existing = False

    while curr_r < 10 and curr_c < 10:
        pos = f"{curr_r},{curr_c}"
        if pos in new_lookup:
            t = new_lookup[pos]
            main_tiles.append({'row': curr_r, 'col': curr_c, 'char': t['char'], 'is_new': True, 'is_blank': t.get('is_blank', False)})
        elif pos in board_dict:
            char = board_dict[pos]
            main_tiles.append({'row': curr_r, 'col': curr_c, 'char': char, 'is_new': False, 'is_blank': False})
            connected_to_existing = True
        else:
            break
        if direction == "across":
            curr_c += 1
        else:
            curr_r += 1

    # Center rule for first turn
    if is_first_turn:
        if not any((t['row'], t['col']) in CENTER_STARS for t in newly_placed):
            return False, "First turn must cover a center star (★)!", 0, []
    else:
        if not connected_to_existing and not any(
            f"{t['row']-1},{t['col']}" in board_dict or f"{t['row']+1},{t['col']}" in board_dict or
            f"{t['row']},{t['col']-1}" in board_dict or f"{t['row']},{t['col']+1}" in board_dict
            for t in newly_placed
        ):
            return False, "New tiles must connect to existing words!", 0, []

    words_formed = []
    main_word_str = "".join(t['char'] for t in main_tiles)
    if len(main_tiles) > 1:
        if not is_valid_word(main_word_str):
            return False, f"'{main_word_str}' is not in the dictionary.", 0, []
        words_formed.append((main_word_str, calculate_single_word_score(main_tiles)))

    # 2. Trace PERPENDICULAR Cross-Words for each newly placed tile
    for t in newly_placed:
        pr, pc = t['row'], t['col']
        perp_dir = "down" if direction == "across" else "across"
        p_start_r, p_start_c = pr, pc

        if perp_dir == "down":
            while p_start_r > 0 and (f"{p_start_r-1},{pc}" in board_dict or f"{p_start_r-1},{pc}" in new_lookup):
                p_start_r -= 1
        else:
            while p_start_c > 0 and (f"{pr},{p_start_c-1}" in board_dict or f"{pr},{p_start_c-1}" in new_lookup):
                p_start_c -= 1

        perp_tiles = []
        cr, cc = p_start_r, p_start_c
        while cr < 10 and cc < 10:
            pos = f"{cr},{cc}"
            if pos in new_lookup:
                nt = new_lookup[pos]
                perp_tiles.append({'row': cr, 'col': cc, 'char': nt['char'], 'is_new': True, 'is_blank': nt.get('is_blank', False)})
            elif pos in board_dict:
                perp_tiles.append({'row': cr, 'col': cc, 'char': board_dict[pos], 'is_new': False, 'is_blank': False})
            else:
                break
            if perp_dir == "down":
                cr += 1
            else:
                cc += 1

        if len(perp_tiles) > 1:
            perp_word_str = "".join(pt['char'] for pt in perp_tiles)
            if not is_valid_word(perp_word_str):
                return False, f"Formed invalid cross-word: '{perp_word_str}'", 0, []
            words_formed.append((perp_word_str, calculate_single_word_score(perp_tiles)))

    if not words_formed:
        return False, "Must form at least one word of 2+ letters.", 0, []

    total_score = sum(pts for _, pts in words_formed)

    # 50-Point BINGO Bonus
    if len(newly_placed) == 7:
        total_score += 50

    return True, "Valid", total_score, [w[0] for w in words_formed]

def find_bot_move(board_dict: dict, bot_letters: list) -> dict:
    bot_counter = Counter([char.upper() for char in bot_letters if char != '*'])
    possible_moves = []

    if not board_dict:
        center_row, center_col = 4, 4
        for word in VALID_WORDS:
            if 3 <= len(word) <= 5:
                word_counter = Counter(word)
                if all(word_counter[k] <= bot_counter[k] for k in word_counter):
                    tiles = [{'row': center_row, 'col': center_col - 1 + idx, 'char': ch, 'is_new': True} for idx, ch in enumerate(word)]
                    pts = calculate_single_word_score(tiles)
                    return {
                        "word": word, "row": center_row, "col": center_col - 1, "direction": "across",
                        "tiles": [{"row": t['row'], "col": t['col'], "letter": t['char']} for t in tiles],
                        "points": pts
                    }

    anchors = [(int(k.split(",")[0]), int(k.split(",")[1]), v) for k, v in board_dict.items()]
    random.shuffle(anchors)

    for r, c, anchor_char in anchors[:15]:
        for direction in ["across", "down"]:
            for word in VALID_WORDS:
                if 3 <= len(word) <= 6 and anchor_char in word:
                    idx = word.index(anchor_char)
                    start_r = r if direction == "across" else r - idx
                    start_c = c - idx if direction == "across" else c

                    if start_r < 0 or start_c < 0: continue
                    if direction == "across" and (start_c + len(word) > 10): continue
                    if direction == "down" and (start_r + len(word) > 10): continue

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
                            new_tiles.append({'row': curr_r, 'col': curr_c, 'char': ch, 'is_new': True})

                    if can_fit and needed_letters:
                        needed_counter = Counter(needed_letters)
                        if all(needed_counter[k] <= bot_counter[k] for k in needed_counter):
                            valid, _, pts, _ = validate_entire_turn(board_dict, new_tiles, is_first_turn=False)
                            if valid:
                                possible_moves.append({
                                    "word": word, "row": start_r, "col": start_c, "direction": direction,
                                    "tiles": [{"row": t['row'], "col": t['col'], "letter": t['char']} for t in new_tiles],
                                    "points": pts
                                })
                                if len(possible_moves) >= 3: break
            if possible_moves: break
        if possible_moves: break

    if possible_moves:
        possible_moves.sort(key=lambda m: m["points"], reverse=True)
        return possible_moves[0]
    return None