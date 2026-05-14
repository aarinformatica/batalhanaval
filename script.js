/**
 * BATALHA NAVAL - COMANDO SUZANO v4.0
 * Desenvolvido por: Alexandro Alves Rodrigues
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const targetsElement = document.getElementById('targets-left');
const messageElement = document.getElementById('message');
const audioBtn = document.getElementById('audio-toggle');
const startBtn = document.getElementById('start-btn');
const menuElement = document.getElementById('game-menu');
const selectionButtons = document.querySelectorAll('.theme-select-btn');

// --- DATABASE DE TEMAS E MÚSICAS ---
const themes = {
    ocean: { 
        music: 'https://raw.githubusercontent.com/aarinformatica/batalhanaval/main/(FREE)%20Linkin%20Park%20x%20Nu%20Metal%20Type%20Beat%20-%20Lies%20(prod.%20SKYWAY)%20%5B320%20kbps%5D.mp3', 
        label: 'OCEANO' 
    },
    lava: { 
        music: 'https://raw.githubusercontent.com/aarinformatica/batalhanaval/main/(FREE)%20Linkin%20Park%20x%20Nu%20Metal%20Type%20Beat%20-%20Lies%20(prod.%20SKYWAY)%20%5B320%20kbps%5D.mp3', 
        label: 'VULCÂNICO' 
    },
    cyber: { 
        music: 'https://raw.githubusercontent.com/aarinformatica/batalhanaval/main/(FREE)%20Falling%20In%20Reverse%20x%20Metalcore%20Type%20Beat%20-%20Trigger%20(prod.%20SKYWAY)%20%5B320%20kbps%5D.mp3', 
        label: 'CYBERPUNK' 
    },
    abyssal: { 
        music: 'https://raw.githubusercontent.com/aarinformatica/batalhanaval/main/undefined.mp3', 
        label: 'ABISSAL' 
    }
};

// --- CONFIGURAÇÕES GERAIS ---
const gridSize = 10;
let tileW, tileH, offsetX, offsetY;
let score = 0;
let gameActive = false;
let lastTime = 0;
let scanLinePos = 0;
let currentTheme = 'ocean';

// --- ESTADO DO RADAR ---
let enemyMap = [];
let targetsRemaining = 0;
let particles = [];
let sonarPowerActive = false;
let sonarCooldown = false;

// --- ÁUDIO E ASSETS ---
let audioCtx = null;
let bgMusic = null;

const shipUrls = [
    'https://raw.githubusercontent.com/aarinformatica/batalhanaval/refs/heads/main/navio-de-guerra.png',
    'https://raw.githubusercontent.com/aarinformatica/batalhanaval/refs/heads/main/navio-de-guerra%20(1).png',
    'https://raw.githubusercontent.com/aarinformatica/batalhanaval/refs/heads/main/navio-de-guerra%20(2).png',
    'https://raw.githubusercontent.com/aarinformatica/batalhanaval/refs/heads/main/navio-de-guerra%20(3).png',
    'https://raw.githubusercontent.com/aarinformatica/batalhanaval/refs/heads/main/navio-de-guerra%20(4).png'
];

const shipImages = shipUrls.map(url => {
    const img = new Image();
    img.src = url;
    return img;
});

// --- SISTEMA DE SELEÇÃO DE TEMA (EXCLUSIVO TELA INICIAL) ---
selectionButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        selectionButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        currentTheme = btn.getAttribute('data-theme');
        document.body.className = `theme-${currentTheme}`;
        
        // Se o áudio já tiver começado, troca a música na hora
        if (bgMusic) {
            bgMusic.src = themes[currentTheme].music;
            bgMusic.play().catch(() => {});
        }
        
        displayMessage(`AMBIENTE: ${themes[currentTheme].label}`);
    });
});

function displayMessage(text) {
    messageElement.innerText = text;
}

// --- INICIALIZAÇÃO DO MAPA ---
function initMap() {
    enemyMap = [];
    targetsRemaining = 0;
    for (let x = 0; x < gridSize; x++) {
        enemyMap[x] = [];
        for (let y = 0; y < gridSize; y++) {
            const isShip = Math.random() > 0.85;
            if (isShip) targetsRemaining++;
            enemyMap[x][y] = {
                state: isShip ? 1 : 0, 
                shipType: Math.floor(Math.random() * 5)
            };
        }
    }
    targetsElement.innerText = targetsRemaining.toString().padStart(2, '0');
    score = 0;
    scoreElement.innerText = "0000";
}

// --- LÓGICA DE ÁUDIO ---
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    
    if (!bgMusic) {
        bgMusic = new Audio(themes[currentTheme].music);
        bgMusic.loop = true;
        bgMusic.volume = 0.4;
        bgMusic.play().catch(() => console.log("Aguardando interação."));
    }
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    } else if (type === 'miss') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    } else if (type === 'sonar') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    }
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// --- COORDENADAS ISOMÉTRICAS ---
function resizeCanvas() {
    const container = document.getElementById('canvas-wrapper');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    let padding = 60;
    tileW = Math.min((canvas.width - padding) / gridSize, (canvas.height - padding) / (gridSize / 2), 65);
    tileH = tileW / 2;
    offsetX = canvas.width / 2;
    offsetY = (canvas.height - (gridSize * tileH)) / 2;
}

function isoToScreen(gx, gy) {
    return { x: (gx - gy) * (tileW / 2) + offsetX, y: (gx + gy) * (tileH / 2) + offsetY };
}

function screenToIso(sx, sy) {
    let rx = sx - offsetX, ry = sy - offsetY;
    return {
        x: Math.floor((ry / (tileH / 2) + rx / (tileW / 2)) / 2),
        y: Math.floor((ry / (tileH / 2) - rx / (tileW / 2)) / 2)
    };
}

// --- PARTÍCULAS ---
function createExplosion(x, y, type) {
    const isHit = type === 'hit';
    const count = isHit ? 25 : 10;
    for (let i = 0; i < count; i++) {
        let color = isHit ? '#00f2ff' : '#fff';
        if (currentTheme === 'lava') color = Math.random() > 0.5 ? '#ff4500' : '#555';
        else if (currentTheme === 'cyber') color = Math.random() > 0.5 ? '#ff0055' : '#bc13fe';
        else if (currentTheme === 'abyssal') color = '#00ffcc';

        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * (isHit ? 6 : 3),
            vy: (Math.random() - 0.8) * (isHit ? 5 : 2),
            life: 1.0,
            decay: 0.01 + Math.random() * 0.02,
            color,
            size: Math.random() * 3 + 1,
            gravity: 0.15
        });
    }
}

// --- RENDERIZAÇÃO ---
function drawTile(x, y, cell, time) {
    const pos = isoToScreen(x, y);
    const isLava = currentTheme === 'lava';
    const waveFreq = (isLava || currentTheme === 'cyber') ? 1200 : 800;
    const waveAmp = isLava ? 4 : 2;
    const wave = Math.sin(time / waveFreq + (x + y) * 0.5) * waveAmp;

    const isDetected = sonarPowerActive && cell.state === 1;
    const scanGlow = Math.max(0, 1 - Math.abs((x + y) - scanLinePos) / 2);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y + wave);
    ctx.lineTo(pos.x + tileW / 2, pos.y + tileH / 2 + wave);
    ctx.lineTo(pos.x, pos.y + tileH + wave);
    ctx.lineTo(pos.x - tileW / 2, pos.y + tileH / 2 + wave);
    ctx.closePath();

    if (isDetected) {
        ctx.fillStyle = isLava ? "#ffcc00" : "#00ff41";
        ctx.strokeStyle = "#fff";
    } else if (cell.state === 2) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    } else if (cell.state === 3) {
        ctx.fillStyle = isLava ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 242, 255, 0.3)";
        ctx.strokeStyle = isLava ? "#fff" : "#00f2ff";
    } else {
        let r = 0, g = 242, b = 255;
        if (isLava) { r = 180 + Math.sin(time/500)*75; g = 45; b = 0; }
        else if (currentTheme === 'cyber') { r = 255; g = 0; b = 85; }
        else if (currentTheme === 'abyssal') { r = 0; g = 255; b = 204; }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.05 + scanGlow * 0.2})`;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.15 + scanGlow * 0.4})`;
    }

    ctx.fill();
    ctx.stroke();

    if (cell.state === 3) {
        const img = shipImages[cell.shipType];
        if (img.complete) {
            const sW = tileW * 0.8;
            const sH = img.height * (sW / img.width);
            if(isLava) ctx.filter = 'drop-shadow(0 0 8px #ff4500) brightness(1.3)';
            ctx.drawImage(img, pos.x - sW/2, pos.y - sH + (tileH * 0.8) + wave, sW, sH);
            ctx.filter = 'none';
        }
    }
}

function update(currentTime) {
    if (!gameActive) return;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    scanLinePos = (scanLinePos + deltaTime * 0.005) % (gridSize * 2);

    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            drawTile(x, y, enemyMap[x][y], currentTime);
        }
    }

    particles.forEach((p, i) => {
        p.vy += p.gravity; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
        if (p.life <= 0) particles.splice(i, 1);
        else {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    ctx.globalAlpha = 1.0;
    requestAnimationFrame(update);
}

// --- INPUTS ---
function handleAction(e) {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const mouseX = (clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (clientY - rect.top) * (canvas.height / rect.height);
    const coords = screenToIso(mouseX, mouseY);

    if (coords.x >= 0 && coords.x < gridSize && coords.y >= 0 && coords.y < gridSize) {
        const cell = enemyMap[coords.x][coords.y];
        if (cell.state > 1) return;

        const pos = isoToScreen(coords.x, coords.y);
        if (cell.state === 0) {
            cell.state = 2;
            playSound('miss');
            createExplosion(pos.x, pos.y, 'miss');
            displayMessage("ALVO PERDIDO");
        } else {
            cell.state = 3;
            score += 100;
            targetsRemaining--;
            playSound('hit');
            createExplosion(pos.x, pos.y, 'hit');
            scoreElement.innerText = score.toString().padStart(4, '0');
            targetsElement.innerText = targetsRemaining.toString().padStart(2, '0');
            displayMessage("ALVO ATINGIDO!");
            
            if(targetsRemaining === 0) {
                displayMessage("VITÓRIA! COSTA DE SUZANO SEGURA.");
                gameActive = false;
            }
        }
    }
}

// --- HABILIDADE SONAR ---
audioBtn.addEventListener('click', () => {
    if (!gameActive || sonarCooldown || score < 50) return;
    
    score -= 50;
    scoreElement.innerText = score.toString().padStart(4, '0');
    sonarCooldown = true;
    sonarPowerActive = true;
    audioBtn.innerText = "VARRENDO...";
    playSound('sonar');

    setTimeout(() => {
        sonarPowerActive = false;
        audioBtn.innerText = "RECARREGANDO...";
        setTimeout(() => {
            sonarCooldown = false;
            audioBtn.innerText = "SONAR PRONTO";
        }, 5000);
    }, 2000);
});

// --- CONTROLE DE INÍCIO ---
startBtn.addEventListener('click', () => {
    initAudio();
    initMap();
    gameActive = true;
    menuElement.classList.add('hidden');
    audioBtn.innerText = "SONAR PRONTO";
    displayMessage("SISTEMA OPERACIONAL ATIVO");
    requestAnimationFrame(update);
});

// EVENTOS
window.addEventListener('resize', resizeCanvas);
canvas.addEventListener('mousedown', handleAction);
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); handleAction(e); }, { passive: false });

// SETUP INICIAL
resizeCanvas();
