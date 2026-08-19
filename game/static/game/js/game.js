const GRID_SIZE = 10;
const RACK_SIZE = 7;
const MATCH_DURATION = 300;

const boardEl = document.getElementById("board");
const rackEl = document.getElementById("rack");
const shuffleBtn = document.getElementById("shuffle-btn");
const swapBtn = document.getElementById("swap-btn");
const submitBtn = document.getElementById("submit-btn");
const clearBtn = document.getElementById("clear-btn");
const newGameBtn = document.getElementById("new-game-btn");
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
let cursorRow = 4, cursorCol = 4;

let timeLeft = MATCH_DURATION;
let timerInterval = null;
let isGameOver = false;

// 100 Tiles including 2 Blank Wildcards (*)
const FULL_BAG = [
  ...'AAAAAAAAA', ...'BB', ...'CC', ...'DDDD', ...'EEEEEEEEEEEE',
  ...'FF', ...'GGG', ...'HH', ...'IIIIIIIII', ...'J', ...'K',
  ...'LLLL', ...'MM', ...'NNNNNN', ...'OOOOOOOO', ...'PP', ...'Q',
  ...'RRRRRR', ...'SSSS', ...'TTTTTT', ...'UUUU', ...'VV', ...'WW',
  ...'X', ...'YY', ...'Z', '*', '*'
];
let tileBag = [...FULL_BAG];

const LETTER_POINTS = {
  'A': 1, 'B': 3, 'C': 3, 'D': 2, 'E': 1, 'F': 4, 'G': 2, 'H': 4, 'I': 1,
  'J': 8, 'K': 5, 'L': 1, 'M': 3, 'N': 1, 'O': 1, 'P': 3, 'Q': 10, 'R': 1,
  'S': 1, 'T': 1, 'U': 1, 'V': 4, 'W': 4, 'X': 8, 'Y': 4, 'Z': 10, '*': 0
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

// 1. Board Generation
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

function setCursor(r, c) {
  boardEl.querySelectorAll(".cell").forEach(cell => cell.classList.remove("keyboard-cursor"));
  cursorRow = Math.max(0, Math.min(GRID_SIZE - 1, r));
  cursorCol = Math.max(0, Math.min(GRID_SIZE - 1, c));
  const active = boardEl.querySelector(`[data-row='${cursorRow}'][data-col='${cursorCol}']`);
  if (active) active.classList.add("keyboard-cursor");
}
setCursor(4, 4);

// 2. Tile Bag & Dynamic Rack
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
    tileDiv.className = "rack-tile" + (tile.letter === '*' ? ' wildcard' : '');
    tileDiv.dataset.id = tile.id;
    tileDiv.dataset.letter = tile.letter;
    tileDiv.innerHTML = `${tile.letter === '*' ? '★' : tile.letter}<span class="point-subscript">${LETTER_POINTS[tile.letter]}</span>`;

    // Tap Support
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

// 3. Tile Placement & Wildcard Prompt
async function handleCellClick(cell, r, c) {
  if (isBotThinking || isGameOver) return;
  setCursor(r, c);

  // Individual Recall
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

  if (!selectedTileData || cell.classList.contains("occupied")) return;

  let assignedChar = selectedTileData.letter;
  let isBlank = false;

  // Wildcard Picker Modal
  if (selectedTileData.letter === '*') {
    isBlank = true;
    assignedChar = await promptWildcardChoice();
    if (!assignedChar) return;
  }

  playAudio('tap');
  cell.innerHTML = `${assignedChar}<span class="point-subscript">${isBlank ? '0' : LETTER_POINTS[assignedChar]}</span>`;
  cell.className = "cell selected" + (isBlank ? " wildcard" : "");

  pendingMoves.push({
    row: r,
    col: c,
    char: assignedChar,
    is_blank: isBlank,
    rackId: selectedTileData.id
  });

  const rackTileEl = rackEl.querySelector(`[data-id='${selectedTileData.id}']`);
  if (rackTileEl) rackTileEl.style.display = "none";
  selectedTileData = null;

  updateLivePreview();
}

function promptWildcardChoice() {
  return new Promise(resolve => {
    modalTitle.textContent = "Select Wildcard Letter";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    modalBody.innerHTML = `
      <p style="font-size:0.85rem; color:#94a3b8;">Choose a letter for your blank tile (Scores 0 pts):</p>
      <div class="wildcard-picker">
        ${letters.map(l => `<button class="wildcard-btn" onclick="selectWildcardChar('${l}')">${l}</button>`).join("")}
      </div>
    `;
    modalOverlay.classList.remove("hidden");

    window.selectWildcardChar = (char) => {
      modalOverlay.classList.add("hidden");
      resolve(char);
    };
  });
}

// 4. Keyboard Navigation
window.addEventListener("keydown", (e) => {
  if (isGameOver || isBotThinking || !modalOverlay.classList.contains("hidden")) return;
  const key = e.key.toUpperCase();

  if (key === "ARROWUP") { setCursor(cursorRow - 1, cursorCol); e.preventDefault(); }
  else if (key === "ARROWDOWN") { setCursor(cursorRow + 1, cursorCol); e.preventDefault(); }
  else if (key === "ARROWLEFT") { setCursor(cursorRow, cursorCol - 1); e.preventDefault(); }
  else if (key === "ARROWRIGHT") { setCursor(cursorRow, cursorCol + 1); e.preventDefault(); }
  else if (key === "BACKSPACE") {
    const targetCell = boardEl.querySelector(`[data-row='${cursorRow}'][data-col='${cursorCol}']`);
    if (targetCell && targetCell.classList.contains("selected")) {
      handleCellClick(targetCell, cursorRow, cursorCol);
    }
  } else if (/^[A-Z]$/.test(key)) {
    // Find matching letter or wildcard in player's rack
    const match = playerRack.find(t => {
      const el = rackEl.querySelector(`[data-id='${t.id}']`);
      return (t.letter === key || t.letter === '*') && el && el.style.display !== "none";
    });
    if (match) {
      selectedTileData = match;
      const targetCell = boardEl.querySelector(`[data-row='${cursorRow}'][data-col='${cursorCol}']`);
      if (targetCell && !targetCell.classList.contains("occupied") && !targetCell.classList.contains("selected")) {
        handleCellClick(targetCell, cursorRow, cursorCol);
        setCursor(cursorRow, cursorCol + 1); // auto-advance
      }
    }
  } else if (key === "ENTER") {
    submitBtn.click();
  }
});

// 5. Live Word Preview
function updateLivePreview() {
  if (pendingMoves.length === 0) {
    wordPreview.classList.add("hidden");
    return;
  }
  const isHoriz = new Set(pendingMoves.map(m => m.row)).size === 1;
  const sorted = [...pendingMoves].sort((a, b) => isHoriz ? a.col - b.col : a.row - b.row);
  const word = sorted.map(m => m.char).join("");
  const estScore = sorted.reduce((sum, m) => sum + (m.is_blank ? 0 : LETTER_POINTS[m.char] || 1), 0);

  previewWordEl.textContent = word;
  previewScoreEl.textContent = `+${estScore} pts`;
  wordPreview.classList.remove("hidden");
}

// 6. Controls & Shuffle Animation
shuffleBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
  const tiles = rackEl.querySelectorAll(".rack-tile");
  tiles.forEach(t => t.classList.add("shuffling"));
  setTimeout(() => {
    playerRack.sort(() => Math.random() - 0.5);
    renderRack();
  }, 200);
});

swapBtn.addEventListener("click", () => {
  if (isBotThinking || isGameOver) return;
  playAudio('tap');
  resetPendingMoves();
  tileBag.push(...playerRack.map(t => t.letter));
  playerRack = [];
  refillRack();
  showToast("Hand swapped!", "#f59e0b");
});

clearBtn.addEventListener("click", () => {
  playAudio('tap');
  resetPendingMoves();
});

newGameBtn.addEventListener("click", () => {
  if (confirm("Start a new game?")) restartGame();
});

modeBtn.addEventListener("click", () => {
  isAiMode = !isAiMode;
  botScoreBadge.style.display = isAiMode ? "block" : "none";
  botIndicator.textContent = isAiMode ? "🤖 AI Duel" : "👤 Solo Mode";
  showToast(isAiMode ? "AI Duel Mode Enabled!" : "Solo Mode Enabled!", "#38bdf8");
});

// 7. Submit Move with Multi-Word Validation
submitBtn.addEventListener("click", async () => {
  if (isBotThinking || isGameOver) return;
  if (pendingMoves.length === 0) {
    playAudio('error');
    showToast("Place letters on the board first!");
    return;
  }

  const currentBoard = {};
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
      if (cell && cell.classList.contains("occupied")) {
        currentBoard[`${r},${c}`] = cell.childNodes[0].textContent.trim();
      }
    }
  }

  try {
    const res = await fetch("/api/validate-word/", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
      body: JSON.stringify({
        board: currentBoard,
        new_tiles: pendingMoves,
        is_first_turn: isFirstTurn
      })
    });

    const data = await res.json();

    if (data.valid) {
      playAudio('success');
      currentScore += data.points;
      scoreEl.textContent = currentScore;
      isFirstTurn = false;
      const primaryWord = data.words[0] || "";
      if (primaryWord.length > bestWordPlayed.length) bestWordPlayed = primaryWord;
      data.words.forEach(w => playedWordsHistory.push({ word: w, points: data.points, player: "You" }));

      const anchor = pendingMoves[0];
      spawnScoreFloater(`+${data.points}`, anchor.row, anchor.col);
      if (data.points >= 20 || primaryWord.length >= 5) triggerConfetti();

      pendingMoves.forEach(m => {
        const cell = boardEl.querySelector(`[data-row='${m.row}'][data-col='${m.col}']`);
        cell.className = "cell occupied" + (m.is_blank ? " wildcard" : "");
        playerRack = playerRack.filter(t => t.id !== m.rackId);
      });

      pendingMoves = [];
      wordPreview.classList.add("hidden");
      showToast(data.message, "#10b981");
      refillRack();

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

// 8. Bot Execution
async function triggerBotTurn() {
  isBotThinking = true;
  botIndicator.textContent = "🤖 Bot thinking...";

  const currentBoard = {};
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
      if (cell && cell.classList.contains("occupied")) {
        currentBoard[`${r},${c}`] = cell.childNodes[0].textContent.trim();
      }
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
          cell.innerHTML = `${t.letter}<span class="point-subscript">${LETTER_POINTS[t.letter]}</span>`;
          cell.className = "cell occupied";
        });

        spawnScoreFloater(`+${move.points}`, move.row, move.col);
        showToast(`Bot played '${move.word}' (+${move.points} pts)!`, "#38bdf8");
      } else {
        showToast("Bot passed turn.", "#94a3b8");
      }
    } catch (e) {
      showToast("Bot skipped turn.", "#94a3b8");
    } finally {
      isBotThinking = false;
      botIndicator.textContent = "🤖 AI Duel";
    }
  }, 1200);
}

// 9. Floating Score FX & Confetti
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
function resizeCanvas() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function triggerConfetti() {
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: window.innerWidth / 2, y: window.innerHeight / 2,
      vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.7) * 12,
      color: ['#10b981', '#38bdf8', '#f59e0b', '#ec4899'][Math.floor(Math.random() * 4)],
      size: Math.random() * 6 + 4, life: 60
    });
  }
}
function updateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((p, idx) => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.25; p.life--;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
    if (p.life <= 0) particles.splice(idx, 1);
  });
  requestAnimationFrame(updateConfetti);
}
updateConfetti();

// 10. Timer & Modals
function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
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

  modalTitle.textContent = "⏱️ Match Complete!";
  modalBody.innerHTML = `
    <div style="text-align: center; padding: 10px;">
      <p style="font-size: 1.3rem; font-weight: 800;">Final Score: <span style="color: #38bdf8;">${currentScore}</span></p>
      <p style="color: #94a3b8; margin: 6px 0;">Best Word: <strong>${bestWordPlayed || "None"}</strong></p>
      <input type="text" id="player-name-input" placeholder="Enter name" maxlength="15" 
             style="width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: white; margin: 12px 0;">
      <div style="display: flex; gap: 8px;">
        <button id="save-score-btn" class="btn primary" style="flex: 1;">Save Score</button>
        <button id="play-again-btn" class="btn secondary" style="flex: 1;">🔄 Play Again</button>
      </div>
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
  document.getElementById("play-again-btn").addEventListener("click", restartGame);
}

function restartGame() {
  if (timerInterval) clearInterval(timerInterval);
  modalOverlay.classList.add("hidden");
  currentScore = 0; botScore = 0; scoreEl.textContent = "0";
  if (botScoreEl) botScoreEl.textContent = "0";
  timeLeft = MATCH_DURATION; timerText.textContent = "05:00";
  isGameOver = false; isFirstTurn = true; bestWordPlayed = "";
  pendingMoves = []; playerRack = []; playedWordsHistory = [];
  tileBag = [...FULL_BAG];
  bagCountEl.textContent = tileBag.length;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = boardEl.querySelector(`[data-row='${r}'][data-col='${c}']`);
      const special = specialTiles[`${r},${c}`];
      cell.className = "cell" + (special ? ` ${special.cls}` : "");
      cell.textContent = special ? special.text : "";
    }
  }
  wordPreview.classList.add("hidden");
  refillRack();
  startTimer();
  showToast("New match started!", "#38bdf8");
}

leaderboardBtn.addEventListener("click", showLeaderboard);
async function showLeaderboard() {
  modalTitle.textContent = "🏆 Global Leaderboard";
  modalBody.innerHTML = `<p>Loading...</p>`;
  modalOverlay.classList.remove("hidden");
  try {
    const res = await fetch("/api/leaderboard/");
    const data = await res.json();
    modalBody.innerHTML = data.leaderboard.length === 0 ? `<p class="empty-history">No records yet!</p>` :
      data.leaderboard.map((s, idx) => `
        <div class="leader-pill">
          <span><strong>#${idx + 1} ${s.player_name}</strong> (${s.best_word})</span>
          <span style="color: #38bdf8; font-weight: 800;">${s.score} pts</span>
        </div>
      `).join("");
  } catch (e) {
    modalBody.innerHTML = `<p>Failed to load leaderboard.</p>`;
  }
}

historyBtn.addEventListener("click", () => {
  modalTitle.textContent = "Word History";
  modalBody.innerHTML = playedWordsHistory.length === 0 ? `<p class="empty-history">No words played yet.</p>` :
    playedWordsHistory.map(item => `
      <div class="word-pill" onclick="fetchDefinition('${item.word}')">
        <span><strong>${item.word}</strong> [${item.player}] (+${item.points} pts)</span>
        <span>🔍 Info</span>
      </div>
    `).join("");
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
      modalBody.innerHTML = `<p><strong>[${partOfSpeech}]</strong></p><p style="margin-top:6px; color:#cbd5e1;">${def}</p>`;
    } else {
      modalBody.innerHTML = `<p>No definition found.</p>`;
    }
  } catch (e) {
    modalBody.innerHTML = `<p>Failed to load definition.</p>`;
  }
};

modalClose.addEventListener("click", () => modalOverlay.classList.add("hidden"));
modalOverlay.addEventListener("click", (e) => { if (e.target === modalOverlay) modalOverlay.classList.add("hidden"); });

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

refillRack();
startTimer();