/* ==========================================================================
   CONFIGURAÇÃO ABLY (REALTIME)
   ========================================================================== */
const ABLY_KEY = 'zfqwdA.QY0KxQ:_RQcTI6NCeRMNnLLyC8Ebb6Lg50xnDlcwvRv4wQ3H5o';
const ably = new Ably.Realtime({ 
    key: ABLY_KEY, 
    clientId: Math.random().toString(36).substring(7) 
});
const channel = ably.channels.get('batalha-naval-global');

/* ==========================================================================
   VARIÁVEIS DE ESTADO
   ========================================================================== */
const BOARD_SIZE = 10;
const SHIPS = [5, 4, 3, 3, 2];
const TOTAL_SHIP_PARTS = SHIPS.reduce((a, b) => a + b, 0);

let playerName = "";
let enemyName = "FROTA INIMIGA";
let playerBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
let myTurn = false;
let resetCharges = 3;
const playerId = ably.auth.clientId;

/* ==========================================================================
   ELEMENTOS DO DOM
   ========================================================================== */
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const usernameInput = document.getElementById('username');
const turnMsgElement = document.getElementById('header-turn-msg');
const playerListElement = document.getElementById('player-list');
const radarBlips = document.getElementById('radar-blips');
const resetBtn = document.getElementById('reset-fleet-btn');
const resetCountDisplay = document.getElementById('reset-count');

// Elementos do Modal
const modal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalIcon = document.getElementById('modal-icon');
const rematchBtn = document.getElementById('rematch-btn');
const exitBtn = document.getElementById('exit-btn');

/* ==========================================================================
   INICIALIZAÇÃO E EVENTOS
   ========================================================================== */

startBtn.addEventListener('click', () => {
    playerName = usernameInput.value.trim() || "Almirante";
    document.getElementById('display-name').innerText = playerName.toUpperCase();
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    inicializarCombate();
});

resetBtn.addEventListener('click', resetarFrota);
exitBtn.onclick = () => location.reload();
rematchBtn.onclick = pedirRevanche;

document.addEventListener('mousemove', (e) => {
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    }
});

/* ==========================================================================
   LOGICA DE JOGO E TABULEIROS
   ========================================================================== */

function inicializarCombate() {
    const pGrid = document.getElementById('player-grid');
    const eGrid = document.getElementById('enemy-grid');
    pGrid.innerHTML = '';
    eGrid.innerHTML = '';

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const pCell = document.createElement('div');
            pCell.className = 'cell';
            pCell.id = `p-${r}-${c}`;
            pGrid.appendChild(pCell);

            const eCell = document.createElement('div');
            eCell.className = 'cell';
            eCell.id = `e-${r}-${c}`;
            eCell.onclick = () => disparar(r, c);
            eGrid.appendChild(eCell);
        }
    }
    posicionarNavios();
    conectarMultiplayer();
    atualizarSonarTatico();
}

function posicionarNavios() {
    playerBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
    SHIPS.forEach((size, index) => {
        let colocado = false;
        while (!colocado) {
            const horiz = Math.random() < 0.5;
            const r = Math.floor(Math.random() * (horiz ? BOARD_SIZE : BOARD_SIZE - size));
            const c = Math.floor(Math.random() * (horiz ? BOARD_SIZE - size : BOARD_SIZE));

            let ocupado = false;
            for (let i = 0; i < size; i++) {
                if (playerBoard[horiz ? r : r + i][horiz ? c + i : c] === 1) ocupado = true;
            }

            if (!ocupado) {
                for (let i = 0; i < size; i++) {
                    const row = horiz ? r : r + i;
                    const col = horiz ? c + i : c;
                    playerBoard[row][col] = 1;
                    const cell = document.getElementById(`p-${row}-${col}`);
                    cell.classList.add('ship');
                    const shipIcon = document.createElement('i');
                    shipIcon.className = 'fa-solid fa-ship';
                    shipIcon.style.animationDelay = `${(index * 0.5) + (i * 0.1)}s`;
                    cell.appendChild(shipIcon);
                }
                colocado = true;
            }
        }
    });
}

function resetarFrota() {
    if (resetCharges <= 0) return;
    resetCharges--;
    const cells = document.querySelectorAll('#player-grid .cell');
    cells.forEach(cell => { cell.className = 'cell'; cell.innerHTML = ''; });
    posicionarNavios();
    resetCountDisplay.innerText = `Cargas de emergência: ${resetCharges}/3`;
    atualizarSonarTatico();
    if (resetCharges === 0) {
        resetBtn.disabled = true;
        resetCountDisplay.style.color = "#ff4d4d";
    }
}

/* ==========================================================================
   SONAR E RADAR
   ========================================================================== */

function atualizarSonarTatico() {
    radarBlips.innerHTML = '';
    const meusNaviosVivos = document.querySelectorAll('#player-grid .cell.ship:not(.hit)').length;
    const acertosNoInimigo = document.querySelectorAll('#enemy-grid .cell.hit').length;
    const inimigosDetectados = TOTAL_SHIP_PARTS - acertosNoInimigo;

    gerarPontosRadar(meusNaviosVivos, 'blue-blip');
    gerarPontosRadar(inimigosDetectados, 'red-blip');

    playerListElement.innerHTML = `
        <li class="player-item is-me">${playerName.toUpperCase()}: ${meusNaviosVivos}</li>
        <li class="player-item enemy-status" style="color: #ff4d4d">${enemyName.toUpperCase()}: ${inimigosDetectados}</li>
    `;
}

function gerarPontosRadar(quantidade, classe) {
    for (let i = 0; i < quantidade; i++) {
        const blip = document.createElement('div');
        blip.className = `blip ${classe}`;
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 65; 
        const x = 82 + radius * Math.cos(angle); 
        const y = 82 + radius * Math.sin(angle);
        blip.style.left = `${x}px`;
        blip.style.top = `${y}px`;
        blip.style.animationDelay = `${Math.random() * 2}s`;
        radarBlips.appendChild(blip);
    }
}

/* ==========================================================================
   MULTIPLAYER E COMUNICAÇÃO
   ========================================================================== */

function conectarMultiplayer() {
    channel.presence.enter(playerName);

    channel.presence.subscribe('enter', (member) => {
        if (member.clientId !== playerId) {
            enemyName = member.data;
            atualizarSonarTatico();
        }
    });

    channel.presence.get((err, members) => {
        const enemy = members.find(m => m.clientId !== playerId);
        if (enemy) { enemyName = enemy.data; atualizarSonarTatico(); }
    });

    channel.subscribe('ataque', (msg) => {
        if (msg.data.autor !== playerId) {
            const { r, c } = msg.data;
            const acertou = playerBoard[r][c] === 1;
            const cell = document.getElementById(`p-${r}-${c}`);
            cell.classList.add(acertou ? 'hit' : 'miss');
            if (acertou) cell.innerHTML = '<i class="fa-solid fa-fire" style="color: #e63946"></i>';
            channel.publish('resultado', { r, c, acertou, alvo: msg.data.autor });
            myTurn = true;
            atualizarUI();
            atualizarSonarTatico();
            verificarFimDeJogo();
        }
    });

    channel.subscribe('resultado', (msg) => {
        if (msg.data.alvo === playerId) {
            const cell = document.getElementById(`e-${msg.data.r}-${msg.data.c}`);
            cell.classList.add(msg.data.acertou ? 'hit' : 'miss');
            if (msg.data.acertou) cell.innerHTML = '<i class="fa-solid fa-burst" style="color: #ff4d4d"></i>';
            atualizarSonarTatico();
            verificarFimDeJogo();
        }
    });

    channel.subscribe('revanche_solicitada', (msg) => {
        if (msg.data.autor !== playerId && confirm(`${enemyName} pede uma revanche! Aceitar?`)) {
            channel.publish('revanche_aceita', {});
            reiniciarPartida();
        }
    });

    channel.subscribe('revanche_aceita', reiniciarPartida);

    myTurn = true;
    atualizarUI();
}

function disparar(r, c) {
    const targetCell = document.getElementById(`e-${r}-${c}`);
    if (!myTurn || targetCell.classList.contains('hit') || targetCell.classList.contains('miss')) return;
    myTurn = false;
    channel.publish('ataque', { r, c, autor: playerId });
    atualizarUI();
}

/* ==========================================================================
   FINALIZAÇÃO E REVANCHE
   ========================================================================== */

function verificarFimDeJogo() {
    const meusNaviosVivos = document.querySelectorAll('#player-grid .cell.ship:not(.hit)').length;
    const acertosNoInimigo = document.querySelectorAll('#enemy-grid .cell.hit').length;

    if (meusNaviosVivos === 0) exibirFinal(false);
    else if (acertosNoInimigo === TOTAL_SHIP_PARTS) exibirFinal(true);
}

function exibirFinal(vitoria) {
    modal.style.display = 'flex';
    if (vitoria) {
        modalIcon.className = "fa-solid fa-trophy";
        modalIcon.style.color = "#FFD700";
        modalTitle.innerText = "VITÓRIA!";
        modalMessage.innerText = `Excelente Almirante ${playerName}! O oceano é seu.`;
    } else {
        modalIcon.className = "fa-solid fa-skull-crossbones";
        modalIcon.style.color = "#ff4d4d";
        modalTitle.innerText = "GAME OVER";
        modalMessage.innerText = "Sua frota foi afundada.";
    }
}

function pedirRevanche() {
    modal.style.display = 'none';
    channel.publish('revanche_solicitada', { autor: playerId });
}

function reiniciarPartida() {
    modal.style.display = 'none';
    resetCharges = 3;
    resetBtn.disabled = false;
    resetCountDisplay.innerText = `Cargas de emergência: 3/3`;
    resetCountDisplay.style.color = "#90e0ef";
    inicializarCombate();
}

function atualizarUI() {
    const enemyGrid = document.getElementById('enemy-grid');
    if (myTurn) {
        turnMsgElement.innerText = "SUA VEZ!";
        turnMsgElement.classList.add('your-turn-glow');
        enemyGrid.classList.remove('waiting-turn');
    } else {
        turnMsgElement.innerText = "AGUARDANDO...";
        turnMsgElement.classList.remove('your-turn-glow');
        enemyGrid.classList.add('waiting-turn');
    }
}
