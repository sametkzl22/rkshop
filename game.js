/**
 * Streamer Bakkal - TOPLA-KAÇ Edition
 * 2nd-gen stealth mechanics with dynamic assets and Exit Zone scoring
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
const STREAMING_DURATION = 25000;  // 25 seconds streaming
const PATROLLING_DURATION = 8000;  // 8 seconds patrolling

// ============================================
// ASSET LOADING SYSTEM
// ============================================
const ASSETS = {
    // Background
    dukkan: new Image(),

    // Player sprites
    cocukIdle: new Image(),
    cocukStealing: new Image(),

    // Shopkeeper sprites
    bekciPatrol: new Image(),
    bekciStreaming: new Image(),

    loaded: false
};

let assetsLoaded = 0;
const totalAssets = 5;

// ============================================
// STEAL ZONES (coordinated with rkdükkan.png 1344x768)
// Scaled to 800x600 canvas
// ============================================
const STEAL_ZONES = [
    // Back shelves (top area) - scaled from original coords
    { id: 'cikolata', name: 'Çikolata', x: 520, y: 80, w: 100, h: 60, value: 50, emoji: '🍫' },
    { id: 'biskuvi', name: 'Bisküvi', x: 380, y: 80, w: 100, h: 60, value: 35, emoji: '🍪' },
    { id: 'konserve', name: 'Konserve', x: 240, y: 80, w: 100, h: 60, value: 25, emoji: '🥫' },

    // Left shelf (side area)
    { id: 'icecek', name: 'İçecek', x: 40, y: 200, w: 60, h: 120, value: 30, emoji: '🥤' },

    // Display stands (floor area)
    { id: 'cips', name: 'Cips', x: 450, y: 320, w: 100, h: 80, value: 40, emoji: '🍿' },
    { id: 'seker', name: 'Şeker', x: 300, y: 450, w: 120, h: 70, value: 20, emoji: '🍬' }
];

// EXIT ZONE - Left side (door area)
const EXIT_ZONE = {
    x: 0,
    y: 350,
    w: 60,
    h: 200,
    name: 'Çıkış'
};

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
        this.width = 60;
        this.height = 80;
        this.speed = 3.5;
        this.state = PlayerState.IDLE;

        // Collision box (feet area)
        this.collisionWidth = 30;
        this.collisionHeight = 20;
        this.collisionOffsetX = (this.width - this.collisionWidth) / 2;
        this.collisionOffsetY = this.height - this.collisionHeight;

        // Inventory system - items collected but not yet scored
        this.inventory = [];
        this.inventoryValue = 0;  // Total value in bag

        this.stealProgress = 0;
        this.stealTime = 1500;  // 1.5 seconds to steal
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
            if (this.state !== PlayerState.STEALING) {
                this.state = PlayerState.WALKING;
            }

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
            this.x = Math.max(0, Math.min(CANVAS_WIDTH - this.width, this.x));
            this.y = Math.max(120, Math.min(CANVAS_HEIGHT - this.height - 20, this.y));
        }

        // Stealing mechanic
        if (this.keys.space) {
            const zone = this.getStealZone(game);
            if (zone && !this.inventory.includes(zone.id)) {
                this.state = PlayerState.STEALING;
                this.targetZone = zone;
                this.stealProgress += 16.67;

                if (this.stealProgress >= this.stealTime) {
                    // Add to inventory (NOT to score yet!)
                    this.inventory.push(zone.id);
                    this.inventoryValue += zone.value;
                    game.addChatMessage(`${zone.emoji} çantaya atıldı!`, 'system');
                    this.stealProgress = 0;
                    this.targetZone = null;
                }
            }
        } else {
            this.stealProgress = 0;
            this.targetZone = null;
            if (!this.isMoving) this.state = PlayerState.IDLE;
        }

        // Check Exit Zone - this is where score updates!
        this.checkEscape(game);
    }

    checkEscape(game) {
        // Check if player is in exit zone with items
        const px = this.x + this.width / 2;
        const py = this.y + this.height / 2;

        if (px > EXIT_ZONE.x && px < EXIT_ZONE.x + EXIT_ZONE.w &&
            py > EXIT_ZONE.y && py < EXIT_ZONE.y + EXIT_ZONE.h) {

            if (this.inventory.length > 0) {
                // Cash out! Transfer inventory value to score
                game.score += this.inventoryValue;
                game.addChatMessage(`💰 ${this.inventoryValue} TL kazanıldı!`, 'donation');

                // Clear inventory
                this.inventory = [];
                this.inventoryValue = 0;

                // Check victory condition
                if (game.score >= 200) {
                    game.gameState = GameState.VICTORY;
                }
            }
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
        this.width = 100;
        this.height = 130;
        this.state = ShopkeeperState.STREAMING;
        this.stateTimer = 0;
        this.visionAngle = 0;
        this.visionRange = 180;
        this.visionConeAngle = Math.PI / 3;
    }

    update(deltaTime, game) {
        this.stateTimer += deltaTime;

        if (this.state === ShopkeeperState.STREAMING) {
            this.visionRange = 100;
            this.visionConeAngle = Math.PI / 8;

            if (this.stateTimer >= STREAMING_DURATION) {
                this.state = ShopkeeperState.PATROLLING;
                this.stateTimer = 0;
                game.addChatMessage("Bi dk bakıyorum...", 'system');
            }
        } else {
            this.visionRange = 250;
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
        this.score = 0;  // Only updates when exiting with items!
        this.alertLevel = 0;
        this.maxAlert = 100;

        // Player starts near entrance (right side)
        this.player = new Player(700, 450);
        // Shopkeeper behind counter
        this.shopkeeper = new Shopkeeper(200, 180);

        // Obstacles for collision
        this.obstacles = [
            { x: 130, y: 200, w: 200, h: 80 }  // Counter
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

        // Set up load handlers
        ASSETS.dukkan.onload = onLoad;
        ASSETS.cocukIdle.onload = onLoad;
        ASSETS.cocukStealing.onload = onLoad;
        ASSETS.bekciPatrol.onload = onLoad;
        ASSETS.bekciStreaming.onload = onLoad;

        ASSETS.dukkan.onerror = onError;
        ASSETS.cocukIdle.onerror = onError;
        ASSETS.cocukStealing.onerror = onError;
        ASSETS.bekciPatrol.onerror = onError;
        ASSETS.bekciStreaming.onerror = onError;

        // Load assets with URL-encoded paths for Turkish characters
        ASSETS.dukkan.src = 'assets/rkd%C3%BCkkan.png';
        ASSETS.cocukIdle.src = 'assets/%C3%A7ocuk.png';
        ASSETS.cocukStealing.src = 'assets/kidcalarken.jpg';
        ASSETS.bekciPatrol.src = 'assets/rkbekci-front.png';
        ASSETS.bekciStreaming.src = 'assets/rkyay%C4%B1nda.png';
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
        this.player = new Player(700, 450);
        this.shopkeeper = new Shopkeeper(200, 180);
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
            this.alertLevel += 0.8;
            if (this.alertLevel >= this.maxAlert) {
                this.gameState = GameState.GAME_OVER;
            }
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - 0.3);
        }

        // Random chat
        if (Date.now() - this.lastChatTime > 4000 + Math.random() * 3000) {
            const msg = STEALTH_CHAT[Math.floor(Math.random() * STEALTH_CHAT.length)];
            this.addChatMessage(msg.text, msg.type);
            this.lastChatTime = Date.now();
        }
    }

    // ============================================
    // RENDERING WITH DYNAMIC ASSETS
    // ============================================

    render() {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        if (!ASSETS.loaded) return;

        // Draw environment (background)
        this.drawEnvironment();

        // Draw exit zone indicator
        this.drawExitZone();

        // Draw steal zone highlights (debug/gameplay aid)
        this.drawStealZones();

        // Draw shopkeeper (state-based sprite)
        this.drawShopkeeper();

        // Draw player (state-based sprite)
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

    drawEnvironment() {
        // Draw the full store background from rkdükkan.png
        const img = ASSETS.dukkan;

        // Scale to fit canvas (1344x768 -> 800x600)
        this.ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    drawExitZone() {
        const ctx = this.ctx;
        const zone = EXIT_ZONE;

        // Pulsing green glow for exit
        const pulse = 0.3 + Math.sin(this.frameCount * 0.1) * 0.15;

        ctx.fillStyle = `rgba(50, 255, 100, ${pulse})`;
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);

        // Border
        ctx.strokeStyle = '#32FF64';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
        ctx.setLineDash([]);

        // Label
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.save();
        ctx.translate(zone.x + zone.w / 2, zone.y + zone.h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('ÇIKIŞ', 0, 0);
        ctx.restore();
    }

    drawStealZones() {
        const ctx = this.ctx;

        for (const zone of STEAL_ZONES) {
            // Check if already stolen
            const stolen = this.player.inventory.includes(zone.id);

            if (!stolen) {
                // Subtle highlight for steal zones
                ctx.fillStyle = 'rgba(255, 200, 50, 0.15)';
                ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
            }
        }
    }

    drawShopkeeper() {
        const ctx = this.ctx;
        const s = this.shopkeeper;

        // Select sprite based on state
        let img;
        if (s.state === ShopkeeperState.STREAMING) {
            img = ASSETS.bekciStreaming;
        } else {
            img = ASSETS.bekciPatrol;
        }

        // Calculate draw dimensions (maintain aspect ratio)
        const aspectRatio = img.width / img.height;
        const drawHeight = s.height;
        const drawWidth = drawHeight * aspectRatio;

        // Draw the shopkeeper sprite
        ctx.drawImage(
            img,
            s.x - (drawWidth - s.width) / 2,
            s.y,
            drawWidth,
            drawHeight
        );
    }

    drawPlayer() {
        const ctx = this.ctx;
        const p = this.player;
        const bob = Math.sin(this.frameCount * 0.15) * (p.isMoving ? 3 : 1);

        // Select sprite based on state
        let img;
        if (p.state === PlayerState.STEALING) {
            img = ASSETS.cocukStealing;
        } else {
            img = ASSETS.cocukIdle;
        }

        // Calculate draw dimensions (maintain aspect ratio)
        const aspectRatio = img.width / img.height;
        const drawHeight = p.height;
        const drawWidth = drawHeight * aspectRatio;

        ctx.save();

        // Flip if facing left
        if (p.facingLeft) {
            ctx.translate(p.x + drawWidth, p.y + bob);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
        } else {
            ctx.drawImage(img, p.x, p.y + bob, drawWidth, drawHeight);
        }

        ctx.restore();

        // Draw inventory indicator above player if carrying items
        if (p.inventory.length > 0) {
            this.drawInventoryBubble(p.x + drawWidth / 2, p.y - 10);
        }
    }

    drawInventoryBubble(x, y) {
        const ctx = this.ctx;
        const items = this.player.inventory.length;
        const value = this.player.inventoryValue;

        // Bag icon with count
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.beginPath();
        ctx.roundRect(x - 35, y - 25, 70, 25, 5);
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`🎒${items} (₺${value})`, x, y - 8);
    }

    drawVisionCone() {
        const ctx = this.ctx;
        const s = this.shopkeeper;

        const centerX = s.getCenterX();
        const centerY = s.getCenterY() + 30;

        let baseAngle = s.state === ShopkeeperState.STREAMING ? Math.PI / 2 : s.visionAngle;
        const halfCone = s.visionConeAngle / 2;

        const color = s.state === ShopkeeperState.STREAMING
            ? 'rgba(255, 255, 0, 0.15)'
            : 'rgba(255, 50, 50, 0.25)';

        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, s.visionRange, baseAngle - halfCone, baseAngle + halfCone);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }

    drawUI() {
        const ctx = this.ctx;

        // Main UI panel (top-left)
        ctx.fillStyle = 'rgba(25, 30, 40, 0.95)';
        ctx.fillRect(8, 8, 180, 130);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(8, 8, 180, 130);

        // Score (already cashed out)
        ctx.fillStyle = '#4ADE80';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText("Kasada:", 18, 28);
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillText(`₺${this.score}`, 18, 48);

        // Inventory (in bag, not cashed yet)
        ctx.fillStyle = '#FFD700';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText("Çantada:", 18, 70);
        ctx.font = '14px "Press Start 2P", monospace';
        ctx.fillText(`₺${this.player.inventoryValue}`, 18, 88);

        // Alert Level
        ctx.fillStyle = '#FFF';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.fillText("Şüphe:", 18, 108);

        // Alert bar
        ctx.fillStyle = '#333';
        ctx.fillRect(18, 115, 155, 14);

        const alertWidth = (this.alertLevel / this.maxAlert) * 155;
        ctx.fillStyle = this.alertLevel > 70 ? '#FF3333' : this.alertLevel > 40 ? '#FF9933' : '#CC2222';
        ctx.fillRect(18, 115, alertWidth, 14);

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(18, 115, 155, 14);

        // Mode indicator (top right)
        const modeText = this.shopkeeper.state === ShopkeeperState.STREAMING ? "YAYINDA 📺" : "İZLİYOR 👀";
        const modeColor = this.shopkeeper.state === ShopkeeperState.STREAMING ? '#4ADE80' : '#EF4444';

        ctx.fillStyle = 'rgba(25, 30, 40, 0.95)';
        ctx.fillRect(CANVAS_WIDTH - 140, 8, 132, 35);
        ctx.strokeStyle = modeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_WIDTH - 140, 8, 132, 35);

        ctx.fillStyle = modeColor;
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(modeText, CANVAS_WIDTH - 74, 30);

        // Goal indicator
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(CANVAS_WIDTH - 140, 48, 132, 24);
        ctx.fillStyle = '#AAA';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillText(`Hedef: ₺200`, CANVAS_WIDTH - 74, 64);

        // Controls hint
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(8, CANVAS_HEIGHT - 28, 360, 22);
        ctx.fillStyle = '#AAA';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText("WASD:Hareket SPACE:Çal ÇIKIŞ:Skoru al", 14, CANVAS_HEIGHT - 12);
    }

    drawStealProgress() {
        const ctx = this.ctx;
        const zone = this.player.targetZone;
        const progress = this.player.stealProgress / this.player.stealTime;

        const barX = zone.x + zone.w / 2 - 40;
        const barY = zone.y - 25;
        const barW = 80;
        const barH = 12;

        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(barX, barY, barW * progress, barH);

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

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

        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.textAlign = 'center';

        if (this.gameState === GameState.VICTORY) {
            ctx.fillStyle = '#4ADE80';
            ctx.font = '28px "Press Start 2P", monospace';
            ctx.fillText("KAZANDIN!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = '#FFD700';
            ctx.font = '18px "Press Start 2P", monospace';
            ctx.fillText(`Toplam: ₺${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

            ctx.fillStyle = '#FFF';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText("Usta bir hırsız oldun! 🎉", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        } else {
            ctx.fillStyle = '#EF4444';
            ctx.font = '28px "Press Start 2P", monospace';
            ctx.fillText("YAKALANDIN!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 60);

            ctx.fillStyle = '#FFF';
            ctx.font = '14px "Press Start 2P", monospace';
            ctx.fillText("Bakkalcı seni gördü!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

            ctx.fillStyle = '#AAA';
            ctx.font = '12px "Press Start 2P", monospace';
            ctx.fillText(`Kaybedilen: ₺${this.player.inventoryValue}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
        }

        ctx.fillStyle = '#888';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillText("Tekrar için 'R' tuşuna bas", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }
}

// ============================================
// GAME INITIALIZATION
// ============================================
window.addEventListener('load', () => {
    new Game();
});
