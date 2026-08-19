const GRID_SIZE = 10;
const RACK_SIZE = 7;

const boardEl = document.getElementById("board");
const rackEl = document.getElementById("rack");
const dirToggleBtn = document.getElementById("toggle-dir-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const swapBtn = document.getElementById("swap-btn");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const toastEl = document.getElementById("message-toast");
const scoreEl = document.getElementById("score");

let direction = "across";
let selectedTileData = null;
let currentScore = 0;
let pendingMoves = [];
let playerRack = [];
let tileCounter = 0;

const LETTER_POINTS = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
};

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'Y'];

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// 1. Initialize Board with Multiplier Labels
const specialTiles = {
  "0,0": { cls: "tw", text: "3W" }, "0,9": { cls: "tw", text: "3W" },
  "9,0": { cls: "tw", text: "3W" }, "9,9": { cls: "tw", text: "3W" },
  "2,2": { cls: "dl", text: "2L" }, "2,7": { cls: "dl", text: "2L" },
  "7,2": { cls: "dl", text: "2L" }, "7,7": { cls: "dl", text: "2L" },
  "4,4": { cls: "center-star", text: "★" }, "4,5": { cls: "center-star", text: "★" }
};

for (let r = 0; r < GRID_SIZE; r++) {
  for (let c = 0; c < GRID_SIZE; c++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.row = r;
    cell.dataset.col = c;

    const special = specialTiles[`${r},${c}`];
    if (special) {
      cell.classList.add(special.cls);
      cell.textContent = special.text;
    }

    cell.addEventListener("pointerdown", () => handleCellClick(cell, r, c));
    boardEl.appendChild(cell);
  }
}

// 2. Fixed Balanced Letter Generation (Ensures exactly 2-3 vowels)
function refillRack() {
  while (playerRack.length < RACK_SIZE) {
    tileCounter++;
    const currentVowels = playerRack.filter(t => VOWELS.includes(t.letter)).length;

    // Maintain 2 to 3 vowels in a 7-tile hand
    let letter;
    if (currentVowels < 2) {
      letter = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    } else if (currentVowels >= 3) {
      letter = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    } else {
      letter = Math.random() < 0.35
        ? VOWELS[Math.floor(Math.random() * VOWELS.length)]
        : CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    }

    playerRack.push({ id: `tile-${tileCounter}`, letter: letter });
  }
  renderRack();
}

function renderRack() {
  rackEl.innerHTML = "";
  playerRack.forEach(tile => {
    const tileDiv = document.createElement("div");
    tileDiv.className = "rack-tile";
    tileDiv.dataset.id = tile.id;
    tileDiv.dataset.letter = tile.letter;

    // Add letter and score subscript
    tileDiv.innerHTML = `${tile.letter}<span class="point-subscript">${LETTER_POINTS[tile.letter] || 1}</span>`;

    tileDiv.addEventListener("pointerdown", () => {
      rackEl.querySelectorAll(".rack-tile").forEach(t => t.classList.remove("selected-tile"));
      if (selectedTileData && selectedTileData.id === tile.id) {
        selectedTileData = null;
      } else {
        selectedTileData = tile;
        tileDiv.classList.add("selected-tile");
      }
    });

    rackEl.appendChild(tileDiv);
  });
}

// 3. Tile Placement
function handleCellClick(cell, r, c) {
  if (!selectedTileData || cell.classList.contains("occupied") || cell.classList.contains("selected")) return;

  cell.textContent = selectedTileData.letter;
  cell.classList.add("selected");

  pendingMoves.push({
    row: r,
    col: c,
    letter: selectedTileData.letter,
    rackId: selectedTileData.id
  });

  const rackTileEl = rackEl.querySelector(`[data-id='${selectedTileData.id}']`);
  if (rackTileEl) rackTileEl.style.display = "none";

  selectedTileData = null;
}

// 4. Controls
dirToggleBtn.addEventListener("click", () => {
  direction = direction === "across" ? "down" : "across";
  dirToggleBtn.textContent = direction === "across" ? "ACROSS ➔" : "DOWN ↓";
});

shuffleBtn.addEventListener("click", () => {
  resetPendingMoves();
  playerRack.sort(() => Math.random() - 0.5);
  renderRack();
});

swapBtn.addEventListener("click", () => {
  resetPendingMoves();
  playerRack = [];
  refillRack();
  showToast("Tiles swapped!", "#f59e0b");
});

clearBtn.addEventListener("click", resetPendingMoves);

// 5. Submit Word
submitBtn.addEventListener("click", async () => {
  if (pendingMoves.length === 0) {
    showToast("Place letters on the board first!");
    return;
  }

  pendingMoves.sort((a, b) => (direction === "across" ? a.col - b.col : a.row - b.row));

  let startRow = pendingMoves[0].row;
  let startCol = pendingMoves[0].col;

  if (direction === "across") {
    while (startCol > 0 && getCellLetter(startRow, startCol - 1)) startCol--;
  } else {
    while (startRow > 0 && getCellLetter(startRow - 1, startCol)) startRow--;
  }

  let fullWord = "";
  let currRow = startRow;
  let currCol = startCol;

  while (currRow < GRID_SIZE && currCol < GRID_SIZE) {
    const letter = getCellLetter(currRow, currCol);
    if (!letter) break;
    fullWord += letter;
    if (direction === "across") currCol++;
    else currRow++;
  }

  if (fullWord.length < 2) {
    showToast("Words must be at least 2 letters long!");
    return;
  }

  try {
    const res = await fetch("/api/validate-word/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken")
      },
      body: JSON.stringify({
        word: fullWord,
        row: startRow,
        col: startCol,
        direction: direction
      })
    });

    const data = await res.json();

    if (data.valid) {
      currentScore += data.points;
      scoreEl.textContent = currentScore;

      pendingMoves.forEach(m => {
        const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
        cell.className = "cell occupied";
        playerRack = playerRack.filter(t => t.id !== m.rackId);
      });

      pendingMoves = [];
      showToast(data.message, "#10b981");
      refillRack();
    } else {
      showToast(data.message, "#ef4444");
      resetPendingMoves();
    }
  } catch (err) {
    showToast("Network error!");
    resetPendingMoves();
  }
});

function getCellLetter(r, c) {
  const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
  if (!cell) return null;
  if (cell.classList.contains("selected") || cell.classList.contains("occupied")) {
    return cell.textContent.trim().charAt(0);
  }
  return null;
}

function resetPendingMoves() {
  pendingMoves.forEach(m => {
    const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
    const special = specialTiles[`${m.row},${m.col}`];
    cell.className = "cell" + (special ? ` ${special.cls}` : "");
    cell.textContent = special ? special.text : "";
  });
  rackEl.querySelectorAll(".rack-tile").forEach(t => (t.style.display = "flex"));
  pendingMoves = [];
  selectedTileData = null;
}

function showToast(msg, bg = "#ef4444") {
  toastEl.textContent = msg;
  toastEl.style.backgroundColor = bg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 2500);
}

refillRack();