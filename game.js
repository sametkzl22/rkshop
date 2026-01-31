/**
 * Streamer Bakkal - VISUAL OVERHAUL EDITION
 * Using reference images as texture atlases for authentic pixel art rendering
 */

// ============================================
// GAME CONSTANTS
// ============================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const GameState = {
    LOADING: 'loading',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

const ShopkeeperState = {
    STREAMING: 'streaming',
    PATROLLING: 'patrolling'
};

const PlayerState = {
    IDLE: 'idle',
    WALKING: 'walking',
    STEALING: 'stealing'
};

// Timing constants
const STREAMING_DURATION = 30000;
const PATROLLING_DURATION = 10000;

// ============================================
// ASSET LOADING SYSTEM
// ============================================
const ASSETS = {
    sceneStreaming: new Image(),
    sceneStore: new Image(),
    shopkeeperFull: new Image(),
    loaded: false
};

let assetsLoaded = 0;
const totalAssets = 3;

// ============================================
// SPRITE SLICE DEFINITIONS (from reference images)
// ============================================
const SPRITES = {
    // From scene_streaming.jpg (848x1024 pixels)
    // Kid is at bottom-right corner
    KID_STEALING: { img: 'sceneStreaming', sx: 660, sy: 800, sw: 140, sh: 195 },

    // From scene_store.png (1024x585 pixels) - used as full background
    FULL_BACKGROUND: { img: 'sceneStore', sx: 0, sy: 0, sw: 1024, sh: 585 }
};

// Steal zones
const STEAL_ZONES = [
    { id: 'chocolate', name: 'Çikolata', x: 580, y: 450, w: 100, h: 80, value: 50, emoji: '🍫' },
    { id: 'drinks', name: 'İçecek', x: 100, y: 400, w: 120, h: 100, value: 30, emoji: '🥤' },
    { id: 'chips', name: 'Cips', x: 350, y: 480, w: 120, h: 80, value: 40, emoji: '🍿' }
];

// Chat messages
const STEALTH_CHAT = [
    { text: "Arkada bi hareket var?", type: 'suspicious' },
    { text: "KEKW bişey düştü mü", type: 'normal' },
    { text: "Abi raflar sallanıyor", type: 'suspicious' },
    { text: "Paranormal aktivite LUL", type: 'normal' },
    { text: "Bi ses geldi sanki", type: 'suspicious' },
    { text: "Hayalet var galiba", type: 'normal' },
    { text: "Abi arkana bak!", type: 'warning' },
    { text: "Bağış attım", type: 'donation' },
    { text: "PogChamp", type: 'normal' },
    { text: "Selam stream", type: 'normal' }
];

const USERNAMES = [
    "TurkishGamer42", "AliVeli_TR", "KickFan2026", "StreamLover",
    "BakkalSever", "Viewer_123", "NightOwl_TR", "GamerBoy99"
];

// ============================================
// PLAYER CLASS
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 50;
        this.height = 70;
        this.speed = 3;
        this.state = PlayerState.IDLE;

        // Collision box (feet area)
        this.collisionWidth = 30;
        this.collisionHeight = 20;
        this.collisionOffsetX = (this.width - this.collisionWidth) / 2;
        this.collisionOffsetY = this.height - this.collisionHeight;

        this.inventory = [];
        this.stealProgress = 0;
        this.stealTime = 2000;
        this.targetZone = null;
        this.isMoving = false;
        this.facingLeft = false;

        this.keys = { up: false, down: false, left: false, right: false, space: false };
    }

    update(game) {
        this.isMoving = false;
        let dx = 0, dy = 0;

        if (this.keys.up) dy -= this.speed;
        if (this.keys.down) dy += this.speed;
        if (this.keys.left) { dx -= this.speed; this.facingLeft = true; }
        if (this.keys.right) { dx += this.speed; this.facingLeft = false; }

        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;
            this.state = PlayerState.WALKING;

            // Apply movement with collision check
            const newX = this.x + dx;
            const newY = this.y + dy;

            if (!this.checkCollision(newX, this.y, game.obstacles)) {
                this.x = newX;
            }
            if (!this.checkCollision(this.x, newY, game.obstacles)) {
                this.y = newY;
            }

            // Clamp to canvas bounds
            this.x = Math.max(30, Math.min(CANVAS_WIDTH - this.width - 30, this.x));
            this.y = Math.max(280, Math.min(CANVAS_HEIGHT - this.height - 20, this.y));
        }

        // Stealing mechanic
        if (this.keys.space) {
            const zone = this.getStealZone(game);
            if (zone && !this.inventory.includes(zone.id)) {
                this.state = PlayerState.STEALING;
                this.targetZone = zone;
                this.stealProgress += 16.67;

                if (this.stealProgress >= this.stealTime) {
                    this.inventory.push(zone.id);
                    game.score += zone.value;
                    game.addChatMessage(`${zone.emoji} çalındı!`, 'system');
                    this.stealProgress = 0;
                    this.targetZone = null;

                    if (this.inventory.length >= STEAL_ZONES.length) {
                        game.gameState = GameState.VICTORY;
                    }
                }
            }
        } else {
            this.stealProgress = 0;
            this.targetZone = null;
            if (!this.isMoving) this.state = PlayerState.IDLE;
        }
    }

    checkCollision(x, y, obstacles) {
        const collX = x + this.collisionOffsetX;
        const collY = y + this.collisionOffsetY;

        for (const obs of obstacles) {
            if (collX < obs.x + obs.w &&
                collX + this.collisionWidth > obs.x &&
                collY < obs.y + obs.h &&
                collY + this.collisionHeight > obs.y) {
                return true;
            }
        }
        return false;
    }

    getStealZone(game) {
        const px = this.x + this.width / 2;
        const py = this.y + this.height / 2;

        for (const zone of STEAL_ZONES) {
            if (px > zone.x && px < zone.x + zone.w &&
                py > zone.y && py < zone.y + zone.h) {
                return zone;
            }
        }
        return null;
    }

    getCenterX() { return this.x + this.width / 2; }
    getCenterY() { return this.y + this.height / 2; }
}

// ============================================
// SHOPKEEPER CLASS
// ============================================
class Shopkeeper {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 80;
        this.height = 120;
        this.state = ShopkeeperState.STREAMING;
        this.stateTimer = 0;
        this.visionAngle = 0;
        this.visionRange = 200;
        this.visionConeAngle = Math.PI / 3;
    }

    update(deltaTime, game) {
        this.stateTimer += deltaTime;

        if (this.state === ShopkeeperState.STREAMING) {
            this.visionRange = 120;
            this.visionConeAngle = Math.PI / 6;

            if (this.stateTimer >= STREAMING_DURATION) {
                this.state = ShopkeeperState.PATROLLING;
                this.stateTimer = 0;
                game.addChatMessage("Bakıyorum bi dk", 'system');
            }
        } else {
            this.visionRange = 280;
            this.visionConeAngle = Math.PI / 2;
            this.visionAngle += 0.02;

            if (this.stateTimer >= PATROLLING_DURATION) {
                this.state = ShopkeeperState.STREAMING;
                this.stateTimer = 0;
                game.addChatMessage("Devam ediyoruz!", 'system');
            }
        }
    }

    canSeePlayer(player) {
        const dx = player.getCenterX() - (this.x + this.width / 2);
        const dy = player.getCenterY() - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.visionRange) return false;

        const angleToPlayer = Math.atan2(dy, dx);
        let baseAngle = this.state === ShopkeeperState.STREAMING ? Math.PI / 2 : this.visionAngle;
        let angleDiff = Math.abs(angleToPlayer - baseAngle);

        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        return angleDiff < this.visionConeAngle / 2;
    }

    getCenterX() { return this.x + this.width / 2; }
    getCenterY() { return this.y + this.height / 2; }
}

// ============================================
// MAIN GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.gameState = GameState.LOADING;
        this.score = 0;
        this.alertLevel = 0;
        this.maxAlert = 100;

        this.player = new Player(650, 480);
        this.shopkeeper = new Shopkeeper(280, 180);

        // Obstacles for collision
        this.obstacles = [
            { x: 150, y: 220, w: 280, h: 100 },  // Counter
            { x: 80, y: 380, w: 130, h: 100 },   // Left display
            { x: 580, y: 380, w: 130, h: 100 }   // Right display
        ];

        this.chatMessages = [];
        this.maxChatMessages = 5;
        this.lastChatTime = 0;
        this.frameCount = 0;
        this.lastTime = 0;

        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.gameLoop = this.gameLoop.bind(this);

        this.setupEventListeners();
        this.loadAssets();
    }

    loadAssets() {
        const onLoad = () => {
            assetsLoaded++;
            if (assetsLoaded === totalAssets) {
                ASSETS.loaded = true;
                this.gameState = GameState.PLAYING;
                this.addChatMessage("Yayın başladı!", 'system');
                requestAnimationFrame(this.gameLoop);
            }
        };

        const onError = (e) => {
            console.error('Failed to load asset:', e.target.src);
        };

        ASSETS.sceneStreaming.onload = onLoad;
        ASSETS.sceneStore.onload = onLoad;
        ASSETS.shopkeeperFull.onload = onLoad;

        ASSETS.sceneStreaming.onerror = onError;
        ASSETS.sceneStore.onerror = onError;
        ASSETS.shopkeeperFull.onerror = onError;

        ASSETS.sceneStreaming.src = 'assets/scene_streaming.jpg';
        ASSETS.sceneStore.src = 'assets/scene_store.png';
        ASSETS.shopkeeperFull.src = 'assets/shopkeeper_full.png';
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown(e) {
        if (this.gameState === GameState.GAME_OVER || this.gameState === GameState.VICTORY) {
            if (e.key.toLowerCase() === 'r') this.restart();
            return;
        }

        const key = e.key.toLowerCase();
        if (key === 'arrowup' || key === 'w') this.player.keys.up = true;
        if (key === 'arrowdown' || key === 's') this.player.keys.down = true;
        if (key === 'arrowleft' || key === 'a') this.player.keys.left = true;
        if (key === 'arrowright' || key === 'd') this.player.keys.right = true;
        if (key === ' ') { e.preventDefault(); this.player.keys.space = true; }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (key === 'arrowup' || key === 'w') this.player.keys.up = false;
        if (key === 'arrowdown' || key === 's') this.player.keys.down = false;
        if (key === 'arrowleft' || key === 'a') this.player.keys.left = false;
        if (key === 'arrowright' || key === 'd') this.player.keys.right = false;
        if (key === ' ') this.player.keys.space = false;
    }

    restart() {
        this.gameState = GameState.PLAYING;
        this.score = 0;
        this.alertLevel = 0;
        this.player = new Player(650, 480);
        this.shopkeeper = new Shopkeeper(280, 180);
        this.chatMessages = [];
        this.addChatMessage("Yayın başladı!", 'system');
    }

    addChatMessage(text, type = 'normal') {
        const username = USERNAMES[Math.floor(Math.random() * USERNAMES.length)];
        this.chatMessages.push({ username, text, type, time: Date.now() });
        if (this.chatMessages.length > this.maxChatMessages) {
            this.chatMessages.shift();
        }
    }

    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.frameCount++;

        if (this.gameState === GameState.LOADING) {
            this.drawLoadingScreen();
        } else if (this.gameState === GameState.PLAYING) {
            this.update(deltaTime);
            this.render();
        } else {
            this.render();
            this.drawEndScreen();
        }

        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        this.player.update(this);
        this.shopkeeper.update(deltaTime, this);

        // Detection check
        if (this.shopkeeper.canSeePlayer(this.player)) {
            this.alertLevel += 0.5;
            if (this.alertLevel >= this.maxAlert) {
                this.gameState = GameState.GAME_OVER;
            }
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - 0.2);
        }

        // Random chat
        if (Date.now() - this.lastChatTime > 4000 + Math.random() * 3000) {
            const msg = STEALTH_CHAT[Math.floor(Math.random() * STEALTH_CHAT.length)];
            this.addChatMessage(msg.text, msg.type);
            this.lastChatTime = Date.now();
        }
    }

    // ============================================
    // SPRITE-BASED RENDERING (from reference images)
    // ============================================

    render() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (!ASSETS.loaded) return;

        // Draw background first
        this.drawEnvironment();

        // Draw shopkeeper (depends on state)
        this.drawShopkeeper();

        // Draw player (kid)
        this.drawPlayer();

        // Draw vision cone
        this.drawVisionCone();

        // Draw UI overlay
        this.drawUI();

        // Draw steal progress if active
        if (this.player.targetZone) {
            this.drawStealProgress();
        }
    }

    drawSprite(spriteKey, destX, destY, destW = null, destH = null, flipH = false) {
        const sprite = SPRITES[spriteKey];
        if (!sprite) return;

        const img = ASSETS[sprite.img];
        if (!img) return;

        const dw = destW || sprite.sw;
        const dh = destH || sprite.sh;

        this.ctx.save();

        if (flipH) {
            this.ctx.translate(destX + dw, destY);
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh, 0, 0, dw, dh);
        } else {
            this.ctx.drawImage(img, sprite.sx, sprite.sy, sprite.sw, sprite.sh, destX, destY, dw, dh);
        }

        this.ctx.restore();
    }

    drawEnvironment() {
        // Draw the full store background from scene_store.png
        // Scale to fit canvas while maintaining aspect ratio
        const img = ASSETS.sceneStore;
        const scale = Math.max(CANVAS_WIDTH / img.width, CANVAS_HEIGHT / img.height);
        const scaledW = img.width * scale;
        const scaledH = img.height * scale;
        const offsetX = (CANVAS_WIDTH - scaledW) / 2;
        const offsetY = (CANVAS_HEIGHT - scaledH) / 2;

        this.ctx.drawImage(img, offsetX, offsetY, scaledW, scaledH);

        // If streaming, overlay the laptop glow area
        if (this.shopkeeper.state === ShopkeeperState.STREAMING) {
            this.drawLaptopGlow();
        }
    }

    drawLaptopGlow() {
        // Draw pulsing green glow effect for the laptop
        const glowIntensity = 0.4 + Math.sin(this.frameCount * 0.1) * 0.2;
        const centerX = 340;
        const centerY = 275;
        const glowRadius = 80;

        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, glowRadius
        );
        gradient.addColorStop(0, `rgba(80, 255, 120, ${glowIntensity})`);
        gradient.addColorStop(0.4, `rgba(60, 200, 100, ${glowIntensity * 0.6})`);
        gradient.addColorStop(1, 'rgba(40, 150, 80, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, centerY, glowRadius, glowRadius * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawShopkeeper() {
        // The shopkeeper sprite is already part of the background image (scene_store.png)
        // We only need to draw overlays: speech bubble for streaming mode
        const s = this.shopkeeper;

        if (s.state === ShopkeeperState.STREAMING) {
            // Draw "Streaming LIVE!" speech bubble above shopkeeper
            this.drawSpeechBubble(350, 95);
        }
    }

    drawSpeechBubble(x, y) {
        const ctx = this.ctx;
        const text = this.shopkeeper.state === ShopkeeperState.STREAMING ? "Streaming\nLIVE!" : "Hmm...";

        // Draw bubble background
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;

        const bubbleW = 100;
        const bubbleH = 50;

        ctx.beginPath();
        ctx.roundRect(x, y, bubbleW, bubbleH, 8);
        ctx.fill();
        ctx.stroke();

        // Bubble tail
        ctx.beginPath();
        ctx.moveTo(x + 20, y + bubbleH);
        ctx.lineTo(x + 10, y + bubbleH + 15);
        ctx.lineTo(x + 35, y + bubbleH);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.stroke();

        // Text
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 11px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("Streaming", x + bubbleW / 2, y + 20);

        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.fillText("LIVE!", x + bubbleW / 2, y + 38);
    }

    drawPlayer() {
        const ctx = this.ctx;
        const p = this.player;
        const bob = Math.sin(this.frameCount * 0.15) * (p.isMoving ? 3 : 1);

        // Draw the kid sprite from the reference image
        const sprite = SPRITES.KID_STEALING;
        const img = ASSETS.sceneStreaming;

        const destW = 60;
        const destH = 85;
        const destX = p.x;
        const destY = p.y + bob;

        ctx.save();

        // Flip if facing left
        if (p.facingLeft) {
            ctx.translate(destX + destW, destY);
            ctx.scale(-1, 1);
            ctx.drawImage(
                img,
                sprite.sx, sprite.sy, sprite.sw, sprite.sh,
                0, 0, destW, destH
            );
        } else {
            ctx.drawImage(
                img,
                sprite.sx, sprite.sy, sprite.sw, sprite.sh,
                destX, destY, destW, destH
            );
        }

        ctx.restore();

        // Draw green glow around player for visibility
        this.drawPlayerGlow(p.x + destW / 2, p.y + destH / 2);
    }

    drawPlayerGlow(centerX, centerY) {
        const glowIntensity = 0.25 + Math.sin(this.frameCount * 0.08) * 0.1;
        const glowRadius = 45;

        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, glowRadius
        );
        gradient.addColorStop(0, `rgba(100, 255, 150, ${glowIntensity})`);
        gradient.addColorStop(0.5, `rgba(60, 200, 100, ${glowIntensity * 0.4})`);
        gradient.addColorStop(1, 'rgba(40, 150, 80, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawVisionCone() {
        const ctx = this.ctx;
        const s = this.shopkeeper;

        const centerX = s.getCenterX() + 30;
        const centerY = s.getCenterY() + 40;

        let baseAngle = s.state === ShopkeeperState.STREAMING ? Math.PI / 2 : s.visionAngle;
        const halfCone = s.visionConeAngle / 2;

        const color = s.state === ShopkeeperState.STREAMING
            ? 'rgba(255, 255, 0, 0.12)'
            : 'rgba(255, 50, 50, 0.18)';

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, s.visionRange, baseAngle - halfCone, baseAngle + halfCone);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    drawUI() {
        const ctx = this.ctx;

        // Draw UI panel background (from reference or recreated)
        ctx.fillStyle = 'rgba(30, 35, 45, 0.92)';
        ctx.fillRect(8, 8, 175, 105);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 175, 105);

        // Stolen Items header
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText("Stolen Items:", 18, 30);

        // Stolen count with chocolate icon
        ctx.font = '20px "Press Start 2P", monospace';
        ctx.fillText("🍫", 20, 58);
        ctx.fillStyle = '#FFF';
        ctx.fillText(String(this.player.inventory.length).padStart(2, '0'), 55, 58);

        // Alert Level header
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillText("Alert Level:", 18, 82);

        // Alert bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(18, 90, 155, 16);

        // Alert bar fill (red)
        const alertWidth = (this.alertLevel / this.maxAlert) * 155;
        ctx.fillStyle = this.alertLevel > 70 ? '#FF3333' : this.alertLevel > 40 ? '#FF9933' : '#CC2222';
        ctx.fillRect(18, 90, alertWidth, 16);

        // Alert bar border
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(18, 90, 155, 16);

        // Score display (top right)
        ctx.fillStyle = 'rgba(30, 35, 45, 0.9)';
        ctx.fillRect(CANVAS_WIDTH - 120, 8, 112, 40);
        ctx.strokeStyle = '#555';
        ctx.strokeRect(CANVAS_WIDTH - 120, 8, 112, 40);

        ctx.fillStyle = '#4ADE80';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.fillText("SKOR:", CANVAS_WIDTH - 18, 25);
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillText(this.score.toString(), CANVAS_WIDTH - 18, 42);

        // Controls hint
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(8, CANVAS_HEIGHT - 28, 340, 22);
        ctx.fillStyle = '#AAA';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText("WASD: Hareket | SPACE: Çal | R: Yeniden", 14, CANVAS_HEIGHT - 12);
    }

    drawStealProgress() {
        const ctx = this.ctx;
        const zone = this.player.targetZone;
        const progress = this.player.stealProgress / this.player.stealTime;

        const barX = zone.x + zone.w / 2 - 40;
        const barY = zone.y - 25;
        const barW = 80;
        const barH = 12;

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // Progress fill
        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(barX, barY, barW * progress, barH);

        // Border
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // Label
        ctx.fillStyle = '#FFF';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${zone.emoji} ${zone.name}`, zone.x + zone.w / 2, barY - 6);
    }

    drawLoadingScreen() {
        const ctx = this.ctx;

        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '18px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText("Yükleniyor...", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        // Loading bar
        const barW = 300;
        const barH = 20;
        const barX = (CANVAS_WIDTH - barW) / 2;
        const barY = CANVAS_HEIGHT / 2 + 10;
        const progress = assetsLoaded / totalAssets;

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        ctx.fillStyle = '#4ADE80';
        ctx.fillRect(barX + 2, barY + 2, (barW - 4) * progress, barH - 4);

        ctx.fillStyle = '#888';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText(`${assetsLoaded}/${totalAssets} assets`, CANVAS_WIDTH / 2, barY + barH + 25);
    }

    drawEndScreen() {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.textAlign = 'center';

        if (this.gameState === GameState.VICTORY) {
            ctx.fillStyle = '#4ADE80';
            ctx.font = '28px "Press Start 2P", monospace';
            ctx.fillText("KAZANDIN!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

            ctx.fillStyle = '#FFF';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText(`Toplam Çalınan: ${this.score} TL`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        } else {
            ctx.fillStyle = '#EF4444';
            ctx.font = '28px "Press Start 2P", monospace';
            ctx.fillText("YAKALANDIN!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

            ctx.fillStyle = '#FFF';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText("Dükkan sahibi seni gördü!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        }

        ctx.fillStyle = '#AAA';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillText("Tekrar için 'R' tuşuna bas", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    }
}

// ============================================
// GAME INITIALIZATION
// ============================================
window.addEventListener('load', () => {
    new Game();
});
