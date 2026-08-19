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
const modeBtn = document.getElementById("mode-btn");
const leaderboardBtn = document.getElementById("leaderboard-btn");
const toastEl = document.getElementById("message-toast");
const scoreEl = document.getElementById("score");
const botScoreEl = document.getElementById("bot-score");
const botScoreBadge = document.getElementById("bot-score-badge");
const botIndicator = document.getElementById("bot-indicator");
const timerText = document.getElementById("timer-text");
const bagCountEl = document.getElementById("bag-count");

const wordPreview = document.getElementById("word-preview");
const previewWordEl = document.getElementById("preview-word");
const previewScoreEl = document.getElementById("preview-score");

const modalOverlay = document.getElementById("modal-overlay");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

let direction = "across";
let selectedTileData = null;
let currentScore = 0;
let botScore = 0;
let pendingMoves = [];
let playerRack = [];
let botRack = ["C", "A", "T", "E", "R", "S", "T"];
let playedWordsHistory = [];
let isFirstTurn = true;
let tileCounter = 0;
let isAiMode = false;
let isBotThinking = false;
let bestWordPlayed = "";

// Blitz Mode Timer & Tile Bag
let timeLeft = 120;
let timerInterval = null;
let isGameOver = false;
let tileBag = [
  ...'AAAAAAAAA', ...'BB', ...'CC', ...'DDDD', ...'EEEEEEEEEEEE',
  ...'FF', ...'GGG', ...'HH', ...'IIIIIIIII', ...'J', ...'K',
  ...'LLLL', ...'MM', ...'NNNNNN', ...'OOOOOOOO', ...'PP', ...'Q',
  ...'RRRRRR', ...'SSSS', ...'TTTTTT', ...'UUUU', ...'VV', ...'WW',
  ...'X', ...'YY', ...'Z'
];

const LETTER_POINTS = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10
};

// Web Audio
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playAudio(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'tap') {
    osc.frequency.setValueAtTime(450, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
  } else if (type === 'recall') {
    osc.frequency.setValueAtTime(320, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.05);
    osc.start(); osc.stop(audioCtx.currentTime + 0.05);
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

// 2. Tile Bag & Rack Refill
function drawFromBag() {
  if (tileBag.length === 0) return null;
  const idx = Math.floor(Math.random() * tileBag.length);
  const letter = tileBag.splice(idx, 1)[0];
  bagCountEl.textContent = tileBag.length;
  return letter;
}

function refillRack() {
  while (playerRack.length < RACK_SIZE && tileBag.length > 0) {
    tileCounter++;
    const letter = drawFromBag();
    if (letter) playerRack.push({ id: `tile-${tileCounter}`, letter: letter });
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
      if (isBotThinking || isGameOver) return;
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

// 3. Tile Placement & Individual Recall
function handleCellClick(cell, r, c) {
  if (isBotThinking || isGameOver) return;

  // If tapping an uncommitted pending tile on the board -> RECALL IT to rack
  if (cell.classList.contains("selected")) {
    const moveIdx = pendingMoves.findIndex(m => m.row === r && m.col === c);
    if (moveIdx !== -1) {
      const recalled = pendingMoves.splice(moveIdx, 1)[0];
      const rackTileEl = rackEl.querySelector(`[data-id='${recalled.rackId}']`);
      if (rackTileEl) rackTileEl.style.display = "flex";

      const special = specialTiles[`${r},${c}`];
      cell.className = "cell" + (special ? ` ${special.cls}` : "");
      cell.textContent = special ? special.text : "";
      playAudio('recall');
      updateLivePreview();
      return;
    }
  }

  // Place selected tile
  if (!selectedTileData || cell.classList.contains("occupied")) return;
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

  updateLivePreview();
}

// 4. Live Word Preview Pill
function updateLivePreview() {
  if (pendingMoves.length === 0) {
    wordPreview.classList.add("hidden");
    return;
  }
  const sorted = [...pendingMoves].sort((a, b) => (direction === "across" ? a.col - b.col : a.row - b.row));
  const word = sorted.map(m => m.letter).join("");
  const estScore = sorted.reduce((sum, m) => sum + (LETTER_POINTS[m.letter] || 1), 0);

  previewWordEl.textContent = word;
  previewScoreEl.textContent = `+${estScore} pts`;
  wordPreview.classList.remove("hidden");
}

// 5. Controls
dirToggleBtn.addEventListener("click", () => {
  playAudio('tap');
  direction = direction === "across" ? "down" : "across";
  dirToggleBtn.textContent = direction === "across" ? "ACROSS ➔" : "DOWN ↓";
  updateLivePreview();
});

shuffleBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
  playerRack.sort(() => Math.random() - 0.5);
  renderRack();
});

swapBtn.addEventListener("click", () => {
  if (isBotThinking || isGameOver) return;
  playAudio('tap');
  resetPendingMoves();
  tileBag.push(...playerRack.map(t => t.letter));
  playerRack = [];
  refillRack();
  showToast("Tiles swapped!", "#f59e0b");
});

clearBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
});

modeBtn.addEventListener("click", () => {
  isAiMode = !isAiMode;
  botScoreBadge.style.display = isAiMode ? "block" : "none";
  botIndicator.textContent = isAiMode ? "🤖 AI Duel" : "👤 Solo Mode";
  showToast(isAiMode ? "AI Duel Mode Enabled!" : "Solo Mode Enabled!", "#38bdf8");
});

// 6. Submit Move & Floating Score FX
submitBtn.addEventListener("click", async () => {
  if (isBotThinking || isGameOver) return;
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
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
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
      if (fullWord.length > bestWordPlayed.length) bestWordPlayed = fullWord;
      playedWordsHistory.push({ word: fullWord, points: data.points, player: "You" });

      // Trigger Floating Score FX & Confetti
      spawnScoreFloater(`+${data.points}`, startRow, startCol);
      if (data.points >= 15 || fullWord.length >= 5) triggerConfetti();

      pendingMoves.forEach(m => {
        const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
        cell.className = "cell occupied";
        playerRack = playerRack.filter(t => t.id !== m.rackId);
      });

      pendingMoves = [];
      wordPreview.classList.add("hidden");
      showToast(data.message, "#10b981");
      refillRack();

      // Trigger AI turn if enabled
      if (isAiMode) triggerBotTurn();
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

// 7. AI Bot Turn Execution
async function triggerBotTurn() {
  isBotThinking = true;
  botIndicator.textContent = "🤖 Bot thinking...";

  const currentBoard = {};
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const ch = getCellLetter(r, c);
      if (ch) currentBoard[`${r},${c}`] = ch;
    }
  }

  setTimeout(async () => {
    try {
      const res = await fetch("/api/bot-move/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
        body: JSON.stringify({ board: currentBoard, bot_rack: botRack })
      });
      const data = await res.json();

      if (data.success && data.move) {
        const move = data.move;
        botScore += move.points;
        botScoreEl.textContent = botScore;
        playedWordsHistory.push({ word: move.word, points: move.points, player: "Bot" });

        move.tiles.forEach(t => {
          const cell = boardEl.querySelector(`[data-row='${t.row}'][data-col='${t.col}']`);
          cell.innerHTML = `${t.letter}<span class="point-subscript">${LETTER_POINTS[t.letter] || 1}</span>`;
          cell.className = "cell occupied";
        });

        spawnScoreFloater(`+${move.points}`, move.row, move.col);
        showToast(`Bot played '${move.word}' (+${move.points} pts)!`, "#38bdf8");
      } else {
        showToast("Bot passes its turn.", "#94a3b8");
      }
    } catch (e) {
      showToast("Bot skipped turn.", "#94a3b8");
    } finally {
      isBotThinking = false;
      botIndicator.textContent = "🤖 AI Duel";
    }
  }, 1200);
}

// 8. Visual FX (Score Float & Confetti)
function spawnScoreFloater(text, r, c) {
  const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
  if (!cell) return;
  const floater = document.createElement("div");
  floater.className = "score-floater";
  floater.textContent = text;
  cell.appendChild(floater);
  setTimeout(() => floater.remove(), 900);
}

const canvas = document.getElementById("confetti-canvas");
const ctx = canvas.getContext("2d");
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function triggerConfetti() {
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.7) * 12,
      color: ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 4)],
      size: Math.random() * 6 + 4,
      life: 60
    });
  }
}

function updateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, idx) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.25; // gravity
    p.life--;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    if (p.life <= 0) particles.splice(idx, 1);
  });
  requestAnimationFrame(updateConfetti);
}
updateConfetti();

// 9. Blitz Countdown Timer & Game Over Modal
function startTimer() {
  timerInterval = setInterval(() => {
    timeLeft--;
    const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
    const secs = String(timeLeft % 60).padStart(2, '0');
    timerText.textContent = `${mins}:${secs}`;

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      triggerGameOver();
    }
  }, 1000);
}

function triggerGameOver() {
  isGameOver = true;
  playAudio('success');
  triggerConfetti();

  modalTitle.textContent = "🎉 Match Complete!";
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 10px;">
      <p style="font-size: 1.2rem; font-weight: 800;">Final Score: <span style="color: #38bdf8;">${currentScore}</span></p>
      <p style="color: #94a3b8; margin: 6px 0;">Best Word: <strong>${bestWordPlayed || "None"}</strong></p>
      <input type="text" id="player-name-input" placeholder="Enter your name" maxlength="15" 
             style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; margin: 12px 0;">
      <button id="save-score-btn" class="btn primary" style="width: 100%;">Save to Leaderboard</button>
    </div>
  `;
  modalOverlay.classList.remove("hidden");

  document.getElementById("save-score-btn").addEventListener("click", async () => {
    const name = document.getElementById("player-name-input").value.trim() || "Player";
    await fetch("/api/submit-score/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
      body: JSON.stringify({ name: name, score: currentScore, best_word: bestWordPlayed })
    });
    modalOverlay.classList.add("hidden");
    showLeaderboard();
  });
}

// 10. Modals: Leaderboard & History
leaderboardBtn.addEventListener("click", showLeaderboard);
async function showLeaderboard() {
  modalTitle.textContent = "🏆 Global Leaderboard";
  modalBody.innerHTML = `<p>Loading high scores...</p>`;
  modalOverlay.classList.remove("hidden");

  try {
    const res = await fetch("/api/leaderboard/");
    const data = await res.json();
    if (data.leaderboard.length === 0) {
      modalBody.innerHTML = `<p class="empty-history">No high scores yet. Set the first record!</p>`;
    } else {
      modalBody.innerHTML = data.leaderboard.map((item, idx) => `
        <div class="leader-pill">
          <span><strong>#${idx + 1} ${item.player_name}</strong> (${item.best_word})</span>
          <span style="color: #38bdf8; font-weight: 800;">${item.score} pts</span>
        </div>
      `).join("");
    }
  } catch (e) {
    modalBody.innerHTML = `<p>Failed to load leaderboard.</p>`;
  }
}

historyBtn.addEventListener("click", () => {
  modalTitle.textContent = "Word History";
  if (playedWordsHistory.length === 0) {
    modalBody.innerHTML = `<p class="empty-history">No words played yet.</p>`;
  } else {
    modalBody.innerHTML = playedWordsHistory.map(item => `
      <div class="word-pill" onclick="fetchDefinition('${item.word}')">
        <span><strong>${item.word}</strong> [${item.player}] (+${item.points} pts)</span>
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
      modalBody.innerHTML = `<p>No definition found.</p>`;
    }
  } catch (e) {
    modalBody.innerHTML = `<p>Failed to load definition.</p>`;
  }
};

modalClose.addEventListener("click", () => modalOverlay.classList.add("hidden"));
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.add("hidden");
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
  wordPreview.classList.add("hidden");
}

function showToast(msg, bg = "#ef4444") {
  toastEl.textContent = msg;
  toastEl.style.backgroundColor = bg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 2500);
}

const newGameBtn = document.getElementById("new-game-btn");

// New Game Button with confirmation
newGameBtn.addEventListener("click", () => {
  if (currentScore > 0 || pendingMoves.length > 0) {
    if (confirm("Start a new match? Current progress will be reset.")) {
      restartGame();
    }
  } else {
    restartGame();
  }
});

function restartGame() {
  if (timerInterval) clearInterval(timerInterval);
  modalOverlay.classList.add("hidden");

  // 1. Reset Game State
  currentScore = 0;
  botScore = 0;
  scoreEl.textContent = "0";
  if (botScoreEl) botScoreEl.textContent = "0";
  timeLeft = 120;
  timerText.textContent = "02:00";
  isGameOver = false;
  isFirstTurn = true;
  bestWordPlayed = "";
  pendingMoves = [];
  playerRack = [];
  playedWordsHistory = [];

  // 2. Refill 100-Tile Bag
  tileBag = [
    ...'AAAAAAAAA', ...'BB', ...'CC', ...'DDDD', ...'EEEEEEEEEEEE',
    ...'FF', ...'GGG', ...'HH', ...'IIIIIIIII', ...'J', ...'K',
    ...'LLLL', ...'MM', ...'NNNNNN', ...'OOOOOOOO', ...'PP', ...'Q',
    ...'RRRRRR', ...'SSSS', ...'TTTTTT', ...'UUUU', ...'VV', ...'WW',
    ...'X', ...'YY', ...'Z'
  ];
  bagCountEl.textContent = tileBag.length;

  // 3. Clear Board to Default Multipliers
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
      const special = specialTiles[`${r},${c}`];
      cell.className = "cell" + (special ? ` ${special.cls}` : "");
      cell.textContent = special ? special.text : "";
    }
  }

  wordPreview.classList.add("hidden");

  // 4. Draw Fresh Hand & Start Timer
  refillRack();
  startTimer();
  showToast("New game started!", "#38bdf8");
}

refillRack();
startTimer();