const GRID_SIZE = 10;
const RACK_SIZE = 7;

const boardEl = document.getElementById("board");
const rackEl = document.getElementById("rack");
const dirToggleBtn = document.getElementById("toggle-dir-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const toastEl = document.getElementById("message-toast");
const scoreEl = document.getElementById("score");

let direction = "across";
let selectedTileData = null; // { id, letter }
let currentScore = 0;
let pendingMoves = [];       // [{ row, col, letter, rackId }]
let playerRack = [];         // Array of tile objects: [{ id: 1, letter: 'A' }, ...]
let tileCounter = 0;

// Standard English Letter Distribution Pool (Weighted)
const LETTER_POOL = [
  ...'AAAAAAAAA', ...'BB', ...'CC', ...'DDDD', ...'EEEEEEEEEEEE',
  ...'FF', ...'GGG', ...'HH', ...'IIIIIIIII', ...'J', ...'K',
  ...'LLLL', ...'MM', ...'NNNNNN', ...'OOOOOOOO', ...'PP', ...'Q',
  ...'RRRRRR', ...'SSSS', ...'TTTTTT', ...'UUUU', ...'VV', ...'WW',
  ...'X', ...'YY', ...'Z'
];

function getRandomLetter() {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
}

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

// 1. Initialize Board
for (let r = 0; r < GRID_SIZE; r++) {
  for (let c = 0; c < GRID_SIZE; c++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.row = r;
    cell.dataset.col = c;
    cell.addEventListener("pointerdown", () => handleCellClick(cell, r, c));
    boardEl.appendChild(cell);
  }
}

// 2. Initialize Dynamic Rack
function refillRack() {
  while (playerRack.length < RACK_SIZE) {
    tileCounter++;
    playerRack.push({
      id: `tile-${tileCounter}`,
      letter: getRandomLetter()
    });
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
    tileDiv.textContent = tile.letter;

    tileDiv.addEventListener("pointerdown", () => {
      rackEl.querySelectorAll(".rack-tile").forEach(t => t.classList.remove("selected-tile"));
      if (selectedTileData && selectedTileData.id === tile.id) {
        selectedTileData = null; // Toggle off if clicked again
      } else {
        selectedTileData = tile;
        tileDiv.classList.add("selected-tile");
      }
    });

    rackEl.appendChild(tileDiv);
  });
}

// 3. Handle Tile Placement
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

  // Hide placed tile from rack
  const rackTileEl = rackEl.querySelector(`[data-id='${selectedTileData.id}']`);
  if (rackTileEl) rackTileEl.style.display = "none";

  selectedTileData = null;
}

// 4. Direction Toggle & Controls
dirToggleBtn.addEventListener("click", () => {
  direction = direction === "across" ? "down" : "across";
  dirToggleBtn.textContent = direction === "across" ? "Mode: ACROSS →" : "Mode: DOWN ↓";
});

shuffleBtn.addEventListener("click", () => {
  resetPendingMoves();
  playerRack.sort(() => Math.random() - 0.5);
  renderRack();
});

clearBtn.addEventListener("click", resetPendingMoves);

// 5. Submit Word
submitBtn.addEventListener("click", async () => {
  if (pendingMoves.length === 0) {
    showToast("Place letters on the board first!");
    return;
  }

  pendingMoves.sort((a, b) => (direction === "across" ? a.col - b.col : a.row - b.row));
  const word = pendingMoves.map(m => m.letter).join("");

  try {
    const res = await fetch("/api/validate-word/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken")
      },
      body: JSON.stringify({
        word: word,
        row: pendingMoves[0].row,
        col: pendingMoves[0].col,
        direction: direction
      })
    });

    const data = await res.json();

    if (data.valid) {
      currentScore += data.points;
      scoreEl.textContent = currentScore;

      // Lock placed cells on the board
      pendingMoves.forEach(m => {
        const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
        cell.classList.remove("selected");
        cell.classList.add("occupied");

        // Remove successfully placed tile from player's hand
        playerRack = playerRack.filter(t => t.id !== m.rackId);
      });

      pendingMoves = [];
      showToast(data.message, "#22c55e");

      // Refill used letters with new random ones
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

function resetPendingMoves() {
  pendingMoves.forEach(m => {
    const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
    cell.textContent = "";
    cell.classList.remove("selected");
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

// Initial draw of 7 letters on game start
refillRack();