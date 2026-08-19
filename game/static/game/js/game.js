const GRID_SIZE = 10;
const RACK_SIZE = 7;

const boardEl = document.getElementById("board");
const rackEl = document.getElementById("rack");
const dirToggleBtn = document.getElementById("toggle-dir-btn");
const shuffleBtn = document.getElementById("shuffle-btn");
const swapBtn = document.getElementById("swap-btn");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const historyBtn = document.getElementById("history-btn");
const toastEl = document.getElementById("message-toast");
const scoreEl = document.getElementById("score");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

let direction = "across";
let selectedTileData = null;
let currentScore = 0;
let pendingMoves = [];
let playerRack = [];
let playedWordsHistory = [];
let isFirstTurn = true;
let tileCounter = 0;

const LETTER_POINTS = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
};

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = ['B', 'C', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'S', 'T', 'W', 'Y'];

// Web Audio Synthesizer
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playAudio(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'tap') {
    osc.frequency.setValueAtTime(450, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.06);
    osc.start(); osc.stop(audioCtx.currentTime + 0.06);
  } else if (type === 'success') {
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime);
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
    osc.start(); osc.stop(audioCtx.currentTime + 0.25);
  } else if (type === 'error') {
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
    osc.start(); osc.stop(audioCtx.currentTime + 0.18);
  }
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

// 1. Board Setup
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

// 2. Tile Generation
function refillRack() {
  while (playerRack.length < RACK_SIZE) {
    tileCounter++;
    const currentVowels = playerRack.filter(t => VOWELS.includes(t.letter)).length;
    let letter;
    if (currentVowels < 2) {
      letter = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    } else if (currentVowels >= 3) {
      letter = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    } else {
      letter = Math.random() < 0.35 ? VOWELS[Math.floor(Math.random() * VOWELS.length)] : CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
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
    tileDiv.innerHTML = `${tile.letter}<span class="point-subscript">${LETTER_POINTS[tile.letter] || 1}</span>`;

    tileDiv.addEventListener("pointerdown", () => {
      playAudio('tap');
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

function handleCellClick(cell, r, c) {
  if (!selectedTileData || cell.classList.contains("occupied") || cell.classList.contains("selected")) return;
  playAudio('tap');

  cell.innerHTML = `${selectedTileData.letter}<span class="point-subscript">${LETTER_POINTS[selectedTileData.letter] || 1}</span>`;
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

// 3. Controls
dirToggleBtn.addEventListener("click", () => {
  playAudio('tap');
  direction = direction === "across" ? "down" : "across";
  dirToggleBtn.textContent = direction === "across" ? "ACROSS ➔" : "DOWN ↓";
});

shuffleBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
  playerRack.sort(() => Math.random() - 0.5);
  renderRack();
});

swapBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
  playerRack = [];
  refillRack();
  showToast("Hand swapped!", "#f59e0b");
});

clearBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
});

// 4. Submit Word & Rule Verification
submitBtn.addEventListener("click", async () => {
  if (pendingMoves.length === 0) {
    playAudio('error');
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
  let connectedToExisting = false;

  while (currRow < GRID_SIZE && currCol < GRID_SIZE) {
    const letter = getCellLetter(currRow, currCol);
    if (!letter) break;

    const cell = boardEl.querySelector(`[data-row='${currRow}'][data-col='${currCol}']`);
    if (cell.classList.contains("occupied")) connectedToExisting = true;

    fullWord += letter;
    if (direction === "across") currCol++;
    else currRow++;
  }

  if (fullWord.length < 2) {
    playAudio('error');
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
        direction: direction,
        is_first_turn: isFirstTurn,
        connected_to_existing: connectedToExisting
      })
    });

    const data = await res.json();

    if (data.valid) {
      playAudio('success');
      currentScore += data.points;
      scoreEl.textContent = currentScore;
      isFirstTurn = false;
      playedWordsHistory.push({ word: fullWord, points: data.points });

      pendingMoves.forEach(m => {
        const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
        cell.className = "cell occupied";
        playerRack = playerRack.filter(t => t.id !== m.rackId);
      });

      pendingMoves = [];
      showToast(data.message, "#10b981");
      refillRack();
    } else {
      playAudio('error');
      showToast(data.message, "#ef4444");
      resetPendingMoves();
    }
  } catch (err) {
    playAudio('error');
    showToast("Network error!");
    resetPendingMoves();
  }
});

function getCellLetter(r, c) {
  const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
  if (!cell) return null;
  if (cell.classList.contains("selected") || cell.classList.contains("occupied")) {
    return cell.childNodes[0].textContent.trim();
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

// 5. Dictionary Definition Modal & Word History
historyBtn.addEventListener("click", () => {
  modalTitle.textContent = "Word History";
  if (playedWordsHistory.length === 0) {
    modalBody.innerHTML = `<p class="empty-history">No words played yet. Complete a turn to see history!</p>`;
  } else {
    modalBody.innerHTML = playedWordsHistory.map(item => `
      <div class="word-pill" onclick="fetchDefinition('${item.word}')">
        <span><strong>${item.word}</strong> (+${item.points} pts)</span>
        <span>🔍 Info</span>
      </div>
    `).join("");
  }
  modalOverlay.classList.remove("hidden");
});

window.fetchDefinition = async function(word) {
  modalTitle.textContent = `Definition: ${word}`;
  modalBody.innerHTML = `<p>Loading definition...</p>`;
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      const def = data[0].meanings[0].definitions[0].definition;
      const partOfSpeech = data[0].meanings[0].partOfSpeech;
      modalBody.innerHTML = `
        <p><strong>[${partOfSpeech}]</strong></p>
        <p style="margin-top: 6px; color: #cbd5e1;">${def}</p>
      `;
    } else {
      modalBody.innerHTML = `<p>No definition found for this word.</p>`;
    }
  } catch (e) {
    modalBody.innerHTML = `<p>Failed to load definition.</p>`;
  }
};

modalClose.addEventListener("click", () => modalOverlay.classList.add("hidden"));
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.add("hidden");
});

function showToast(msg, bg = "#ef4444") {
  toastEl.textContent = msg;
  toastEl.style.backgroundColor = bg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 2500);
}

refillRack();