LETTER_VALUES = {
    'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
    'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
    'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
}

VALID_WORDS = {
    "PYTHON", "DJANGO", "HTML", "CSS", "GRID", "CODE", "STACK", "API",
    "RENDER", "SERVER", "CLIENT", "GAME", "BOARD", "MOBILE", "TOUCH"
}

def is_valid_word(word: str) -> bool:
    return word.strip().upper() in VALID_WORDS

def calculate_word_score(word: str) -> int:
    return sum(LETTER_VALUES.get(char.upper(), 1) for char in word)