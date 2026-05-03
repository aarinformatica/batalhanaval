/* --- CONFIGURAÇÃO ABLY --- */
const ABLY_KEY = 'zfqwdA.QY0KxQ:_RQcTI6NCeRMNnLLyC8Ebb6Lg50xnDlcwvRv4wQ3H5o';
const ably = new Ably.Realtime({ 
    key: ABLY_KEY, 
    clientId: Math.random().toString(36).substring(7) 
});
const channel = ably.channels.get('batalha-naval-global');

/* --- VARIÁVEIS DE ESTADO --- */
const BOARD_SIZE = 10;
const SHIPS = [5, 4, 3, 3, 2];
const TOTAL_SHIP_PARTS = SHIPS.reduce((a, b) => a + b, 0); // 17 partes no total

let playerName = "";
let playerBoard = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(0));
let myTurn = false;
const playerId = ably.auth.clientId;

/* --- ELEMENTOS DO DOM --- */
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const usernameInput = document.getElementById('username');
const turnMsgElement = document.getElementById('header-turn-msg');
const playerListElement = document.getElementById('player-list');
const radarBlips = document.getElementById('radar-blips');
const enemyGridContainer = document.getElementById('enemy-grid');

/* --- INÍCIO DO JOGO --- */
startBtn.addEventListener('click', () => {
    playerName = usernameInput.value.trim() || "Almirante";
    document.getElementById('display-name').innerText = playerName;
    
    loginScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    inicializarCombate();
});

function inicializarCombate() {
    const pGrid = document.getElementById('player-grid');
    const eGrid = document.getElementById('enemy-grid');

    pGrid.innerHTML = '';
    eGrid.innerHTML = '';

    // Gerar Grids
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

/* --- LÓGICA DE POSICIONAMENTO COM BALANÇO --- */
function posicionarNavios() {
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
                    
                    // Ícone com animação de balanço
                    const shipIcon = document.createElement('i');
                    shipIcon.className = 'fa-solid fa-ship';
                    // Variamos o delay para o balanço não ser síncrono
                    shipIcon.style.animationDelay = `${(index * 0.5) + (i * 0.1)}s`;
                    cell.appendChild(shipIcon);
                }
                colocado = true;
            }
        }
    });
}

/* --- SONAR TÁTICO (AZUL vs VERMELHO) --- */
function atualizarSonarTatico() {
    radarBlips.innerHTML = '';
    playerListElement.innerHTML = '';

    // Frota Aliada (Azul): Baseado no que ainda não foi atingido no seu grid
    const meusNaviosVivos = document.querySelectorAll('#player-grid .cell.ship:not(.hit)').length;

    // Frota Inimiga (Vermelho): Partes que você ainda precisa atingir
    const acertosNoInimigo = document.querySelectorAll('#enemy-grid .cell.hit').length;
    const inimigosDetectados = TOTAL_SHIP_PARTS - acertosNoInimigo;

    gerarPontosRadar(meusNaviosVivos, 'blue-blip');
    gerarPontosRadar(inimigosDetectados, 'red-blip');

    playerListElement.innerHTML = `
        <li class="player-item is-me">FROTA ALIADA: ${meusNaviosVivos}</li>
        <li class="player-item enemy-status" style="color: #ff4d4d">FROTA INIMIGA: ${inimigosDetectados}</li>
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

/* --- COMUNICAÇÃO MULTIPLAYER --- */
function conectarMultiplayer() {
    channel.presence.enter(playerName);

    // Receber ataques do oponente
    channel.subscribe('ataque', (msg) => {
        if (msg.data.autor !== playerId) {
            const { r, c } = msg.data;
            const acertou = playerBoard[r][c] === 1;
            
            const cell = document.getElementById(`p-${r}-${c}`);
            cell.classList.add(acertou ? 'hit' : 'miss');
            
            // Se acertar, troca o ícone para fogo
            if (acertou) cell.innerHTML = '<i class="fa-solid fa-fire" style="color: #e63946"></i>';
            
            channel.publish('resultado', { r, c, acertou, alvo: msg.data.autor });
            myTurn = true;
            atualizarUI();
            atualizarSonarTatico();
        }
    });

    // Receber confirmação do meu ataque
    channel.subscribe('resultado', (msg) => {
        if (msg.data.alvo === playerId) {
            const cell = document.getElementById(`e-${msg.data.r}-${msg.data.c}`);
            cell.classList.add(msg.data.acertou ? 'hit' : 'miss');
            
            if (msg.data.acertou) {
                cell.innerHTML = '<i class="fa-solid fa-burst" style="color: #ff4d4d"></i>';
            }
            
            atualizarSonarTatico();
        }
    });

    myTurn = true; 
    atualizarUI();
}

/* --- AÇÕES DE COMBATE --- */
function disparar(r, c) {
    const targetCell = document.getElementById(`e-${r}-${c}`);
    
    // Só dispara se for o turno e a célula não tiver sido clicada
    if (!myTurn || targetCell.classList.contains('hit') || targetCell.classList.contains('miss')) return;
    
    myTurn = false;
    channel.publish('ataque', { r, c, autor: playerId });
    atualizarUI();
}

/* --- ATUALIZAÇÃO DE INTERFACE E CURSOR --- */
function atualizarUI() {
    const enemyGrid = document.getElementById('enemy-grid');

    if (myTurn) {
        turnMsgElement.innerText = "SUA VEZ DE ATACAR!";
        turnMsgElement.classList.add('your-turn-glow');
        
        // Ativa a mira SVG via CSS
        enemyGrid.classList.remove('waiting-turn');
    } else {
        turnMsgElement.innerText = "AGUARDANDO INIMIGO...";
        turnMsgElement.classList.remove('your-turn-glow');
        
        // Ativa o cursor de bloqueio (not-allowed)
        enemyGrid.classList.add('waiting-turn');
    }
}
