const GRID_SIZE = 10;
const boardEl = document.getElementById("board");
const rackEl = document.getElementById("rack");
const dirToggleBtn = document.getElementById("toggle-dir-btn");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const toastEl = document.getElementById("message-toast");
const scoreEl = document.getElementById("score");

let direction = "across";
let selectedTile = null;
let currentScore = 0;
let pendingMoves = [];

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

rackEl.querySelectorAll(".rack-tile").forEach(tile => {
  tile.addEventListener("pointerdown", () => {
    rackEl.querySelectorAll(".rack-tile").forEach(t => t.classList.remove("selected-tile"));
    selectedTile = tile.dataset.letter;
    tile.classList.add("selected-tile");
  });
});

function handleCellClick(cell, r, c) {
  if (!selectedTile || cell.classList.contains("occupied") || cell.classList.contains("selected")) return;

  cell.textContent = selectedTile;
  cell.classList.add("selected");
  pendingMoves.push({ row: r, col: c, letter: selectedTile });

  const activeTile = rackEl.querySelector(".selected-tile");
  if (activeTile) {
    activeTile.style.visibility = "hidden";
    activeTile.classList.remove("selected-tile");
  }
  selectedTile = null;
}

dirToggleBtn.addEventListener("click", () => {
  direction = direction === "across" ? "down" : "across";
  dirToggleBtn.textContent = direction === "across" ? "Mode: ACROSS →" : "Mode: DOWN ↓";
});

clearBtn.addEventListener("click", resetPendingMoves);

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
      pendingMoves.forEach(m => {
        const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
        cell.classList.remove("selected");
        cell.classList.add("occupied");
      });
      pendingMoves = [];
      showToast(data.message, "#22c55e");
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
  rackEl.querySelectorAll(".rack-tile").forEach(t => (t.style.visibility = "visible"));
  pendingMoves = [];
}

function showToast(msg, bg = "#ef4444") {
  toastEl.textContent = msg;
  toastEl.style.backgroundColor = bg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 2500);
}