/**
 * Streamer Bakkal - STEALTH EDITION
 * Neighbours from Hell-style stealth game
 * Player controls the Naughty Kid trying to steal items while the Shopkeeper streams
 */

// ============================================
// GAME CONSTANTS
// ============================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const GameState = {
    PLAYING: 'playing',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

const ShopkeeperState = {
    STREAMING: 'streaming',   // Focused on laptop - reduced vision
    PATROLLING: 'patrolling'  // Checking shelves - full vision
};

const PlayerState = {
    IDLE: 'idle',
    WALKING: 'walking',
    STEALING: 'stealing'
};

// Timing constants
const STREAMING_DURATION = 30000;  // 30 seconds streaming
const PATROLLING_DURATION = 10000; // 10 seconds patrolling

// Color Palette (8-bit style)
const COLORS = {
    floor: '#C9B896',
    floorTile: '#B8A785',
    wall: '#8BA5B5',
    wallDark: '#7A94A4',
    counter: '#8B5A2B',
    counterTop: '#A0703B',
    shelf: '#E8E8E8',
    shelfShadow: '#D0D0D0',
    laptopBody: '#2C2C2C',
    laptopScreen: '#1a1a2e',
    textLight: '#FFFFFF',
    textDark: '#1a1a2e',
    money: '#4ADE80',
    danger: '#EF4444',
    warning: '#F59E0B',
    safe: '#10B981',
    visionCone: 'rgba(255, 0, 0, 0.15)',
    visionConeStreaming: 'rgba(255, 255, 0, 0.08)',
    // Shopkeeper colors
    skin: '#D4A574',
    beard: '#2C2C2C',
    glasses: '#FFD700',
    jacket: '#6B4423',
    shirtRed: '#CC3333',
    shirtWhite: '#FFFFFF',
    shirtBlue: '#1E3A5F',
    jeans: '#4A5568',
    // Kid (player) colors
    kidSkin: '#E8C4A0',
    kidHair: '#3D2314',
    kidShirt: '#3498DB',
    kidPants: '#2C3E50'
};

// Steal zones with positions and values
const STEAL_ZONES = [
    { id: 'chocolate', name: 'Çikolata', x: 500, y: 350, w: 100, h: 80, value: 50, emoji: '🍫' },
    { id: 'drinks', name: 'İçecek', x: 100, y: 420, w: 150, h: 120, value: 30, emoji: '🥤' },
    { id: 'chips', name: 'Cips', x: 550, y: 420, w: 150, h: 120, value: 40, emoji: '🍿' }
];

// Chat messages for "mysterious" happenings
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
// PLAYER CLASS (The Kid)
// ============================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 70;
        this.speed = 3;
        this.state = PlayerState.IDLE;
        this.inventory = [];
        this.maxInventory = 3;
        this.stealProgress = 0;
        this.stealDuration = 1500; // 1.5 seconds to steal
        this.currentZone = null;
        this.facingLeft = false;
        this.isMoving = false;

        // Movement state
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            space: false
        };
    }

    update(deltaTime, obstacles) {
        this.isMoving = false;
        let dx = 0;
        let dy = 0;

        // Don't allow movement while stealing
        if (this.state === PlayerState.STEALING) {
            return;
        }

        // Calculate movement
        if (this.keys.up) dy -= this.speed;
        if (this.keys.down) dy += this.speed;
        if (this.keys.left) { dx -= this.speed; this.facingLeft = true; }
        if (this.keys.right) { dx += this.speed; this.facingLeft = false; }

        // Apply movement with bounds checking
        const newX = this.x + dx;
        const newY = this.y + dy;

        // Check bounds (floor area only: y 320 to 580)
        if (newX > 20 && newX < CANVAS_WIDTH - 40) {
            // Check obstacle collision
            if (!this.collidesWithObstacles(newX, this.y, obstacles)) {
                this.x = newX;
            }
        }
        if (newY > 320 && newY < 530) {
            if (!this.collidesWithObstacles(this.x, newY, obstacles)) {
                this.y = newY;
            }
        }

        this.isMoving = dx !== 0 || dy !== 0;
        this.state = this.isMoving ? PlayerState.WALKING : PlayerState.IDLE;
    }

    collidesWithObstacles(x, y, obstacles) {
        const playerRect = {
            x: x - this.width / 2,
            y: y,
            w: this.width,
            h: this.height
        };

        for (const obs of obstacles) {
            if (this.rectIntersect(playerRect, obs)) {
                return true;
            }
        }
        return false;
    }

    rectIntersect(a, b) {
        return a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
    }

    isInZone(zone) {
        return this.x > zone.x && this.x < zone.x + zone.w &&
            this.y > zone.y - 30 && this.y < zone.y + zone.h;
    }

    canSteal() {
        return this.inventory.length < this.maxInventory;
    }

    addToInventory(item) {
        if (this.canSteal()) {
            this.inventory.push(item);
            return true;
        }
        return false;
    }

    getTotalValue() {
        return this.inventory.reduce((sum, item) => sum + item.value, 0);
    }

    hasEscaped() {
        return this.x < 30;
    }
}

// ============================================
// SHOPKEEPER AI CLASS
// ============================================
class Shopkeeper {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.state = ShopkeeperState.STREAMING;
        this.stateTimer = Date.now();
        this.facingAngle = Math.PI / 2; // Facing down initially

        // Vision properties
        this.visionRange = 200;
        this.visionAngle = Math.PI * 2 / 3; // 120 degrees
        this.streamingVisionRange = 80;
        this.streamingVisionAngle = Math.PI / 4; // 45 degrees (focused on laptop)

        // Patrol waypoints
        this.patrolPoints = [
            { x: 280, y: 320, angle: Math.PI / 2 },      // Counter (down)
            { x: 400, y: 400, angle: Math.PI },          // Center (left)
            { x: 600, y: 400, angle: -Math.PI / 2 },     // Right side (up)
            { x: 300, y: 450, angle: 0 }                 // Left side (right)
        ];
        this.currentPatrolIndex = 0;
        this.patrolSpeed = 1.5;
    }

    update(deltaTime) {
        const now = Date.now();
        const elapsed = now - this.stateTimer;

        if (this.state === ShopkeeperState.STREAMING) {
            // Focused on laptop - minimal movement
            this.facingAngle = -Math.PI / 2; // Looking at laptop (up-left)

            if (elapsed >= STREAMING_DURATION) {
                this.state = ShopkeeperState.PATROLLING;
                this.stateTimer = now;
                this.currentPatrolIndex = 0;
            }
        } else {
            // Patrolling - move between waypoints
            const target = this.patrolPoints[this.currentPatrolIndex];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                // Reached waypoint, look around
                this.facingAngle = target.angle;
                this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
            } else {
                // Move towards waypoint
                this.x += (dx / dist) * this.patrolSpeed;
                this.y += (dy / dist) * this.patrolSpeed;
                this.facingAngle = Math.atan2(dy, dx);
            }

            if (elapsed >= PATROLLING_DURATION) {
                this.state = ShopkeeperState.STREAMING;
                this.stateTimer = now;
                // Return to counter
                this.x = 280;
                this.y = 320;
            }
        }
    }

    getCurrentVisionRange() {
        return this.state === ShopkeeperState.STREAMING
            ? this.streamingVisionRange
            : this.visionRange;
    }

    getCurrentVisionAngle() {
        return this.state === ShopkeeperState.STREAMING
            ? this.streamingVisionAngle
            : this.visionAngle;
    }

    canSeePlayer(player, obstacles) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check distance
        if (distance > this.getCurrentVisionRange()) {
            return false;
        }

        // Check angle
        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = angleToPlayer - this.facingAngle;

        // Normalize angle difference
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) > this.getCurrentVisionAngle() / 2) {
            return false;
        }

        // Check for obstacles blocking line of sight
        for (const obs of obstacles) {
            if (this.lineIntersectsRect(this.x, this.y, player.x, player.y, obs)) {
                return false;
            }
        }

        return true;
    }

    lineIntersectsRect(x1, y1, x2, y2, rect) {
        // Simple line-rect intersection check
        const left = rect.x;
        const right = rect.x + rect.w;
        const top = rect.y;
        const bottom = rect.y + rect.h;

        // Check if line endpoints are on opposite sides of rect
        const dx = x2 - x1;
        const dy = y2 - y1;

        let tmin = 0;
        let tmax = 1;

        if (dx !== 0) {
            const t1 = (left - x1) / dx;
            const t2 = (right - x1) / dx;
            tmin = Math.max(tmin, Math.min(t1, t2));
            tmax = Math.min(tmax, Math.max(t1, t2));
        }

        if (dy !== 0) {
            const t1 = (top - y1) / dy;
            const t2 = (bottom - y1) / dy;
            tmin = Math.max(tmin, Math.min(t1, t2));
            tmax = Math.min(tmax, Math.max(t1, t2));
        }

        return tmax >= tmin && tmax > 0 && tmin < 1;
    }
}

// ============================================
// MAIN GAME CLASS
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        // Game state
        this.gameState = GameState.PLAYING;
        this.score = 0;
        this.alertLevel = 0;
        this.maxAlert = 100;

        // Entities
        this.player = new Player(700, 450);
        this.shopkeeper = new Shopkeeper(280, 320);

        // Obstacles (for collision and LoS blocking)
        this.obstacles = [
            { x: 145, y: 270, w: 290, h: 110 },  // Counter
            { x: 100, y: 420, w: 150, h: 120 },  // Left shelf
            { x: 550, y: 420, w: 150, h: 120 }   // Right shelf
        ];

        // Chat
        this.chatMessages = [];
        this.maxChatMessages = 5;
        this.lastChatTime = 0;

        // Animation
        this.frameCount = 0;
        this.lastTime = 0;

        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.gameLoop = this.gameLoop.bind(this);

        // Setup
        this.setupEventListeners();
        this.addChatMessage("Yayın başladı!", 'system');

        // Start game loop
        requestAnimationFrame(this.gameLoop);
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
        document.addEventListener('keyup', this.handleKeyUp);
    }

    handleKeyDown(e) {
        if (this.gameState !== GameState.PLAYING) {
            if (e.key.toLowerCase() === 'r') {
                this.restart();
            }
            return;
        }

        const key = e.key.toLowerCase();

        // Arrow keys or WASD
        if (key === 'arrowup' || key === 'w') this.player.keys.up = true;
        if (key === 'arrowdown' || key === 's') this.player.keys.down = true;
        if (key === 'arrowleft' || key === 'a') this.player.keys.left = true;
        if (key === 'arrowright' || key === 'd') this.player.keys.right = true;
        if (key === ' ') {
            e.preventDefault();
            this.player.keys.space = true;
        }
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
        this.shopkeeper = new Shopkeeper(280, 320);
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

    // ============================================
    // UPDATE LOGIC
    // ============================================
    update(deltaTime) {
        if (this.gameState !== GameState.PLAYING) return;

        this.frameCount++;

        // Update entities
        this.player.update(deltaTime, this.obstacles);
        this.shopkeeper.update(deltaTime);

        // Check stealing
        this.updateStealing();

        // Check detection
        this.updateDetection();

        // Check escape
        this.checkEscape();

        // Generate chat messages
        this.updateChat();

        // Check game over conditions
        if (this.alertLevel >= this.maxAlert) {
            this.gameState = GameState.GAME_OVER;
        }
    }

    updateStealing() {
        if (!this.player.keys.space) {
            this.player.stealProgress = 0;
            this.player.state = this.player.isMoving ? PlayerState.WALKING : PlayerState.IDLE;
            this.player.currentZone = null;
            return;
        }

        // Find current zone
        let inZone = null;
        for (const zone of STEAL_ZONES) {
            if (this.player.isInZone(zone)) {
                inZone = zone;
                break;
            }
        }

        if (inZone && this.player.canSteal()) {
            this.player.currentZone = inZone;
            this.player.state = PlayerState.STEALING;
            this.player.stealProgress += 16; // ~60fps

            if (this.player.stealProgress >= this.player.stealDuration) {
                // Successfully stole item
                this.player.addToInventory({
                    name: inZone.name,
                    value: inZone.value,
                    emoji: inZone.emoji
                });
                this.player.stealProgress = 0;
                this.player.state = PlayerState.IDLE;

                // Chat reaction
                if (Math.random() < 0.5) {
                    const msg = STEALTH_CHAT.find(m => m.type === 'suspicious');
                    if (msg) this.addChatMessage(msg.text, 'suspicious');
                }
            }
        } else {
            this.player.stealProgress = 0;
            this.player.currentZone = null;
        }
    }

    updateDetection() {
        const canSee = this.shopkeeper.canSeePlayer(this.player, this.obstacles);

        if (canSee) {
            // Increase alert based on factors
            let alertIncrease = 0.5; // Base rate

            if (this.player.isMoving) alertIncrease += 0.3;
            if (this.player.state === PlayerState.STEALING) alertIncrease += 0.8;

            // Reduced detection when streaming
            if (this.shopkeeper.state === ShopkeeperState.STREAMING) {
                alertIncrease *= 0.3;
            }

            this.alertLevel = Math.min(this.maxAlert, this.alertLevel + alertIncrease);

            // Chat warning at high alert
            if (this.alertLevel > 70 && Math.random() < 0.02) {
                this.addChatMessage("ABI ARKANA BAK!", 'warning');
            }
        } else {
            // Decrease alert when not seen
            this.alertLevel = Math.max(0, this.alertLevel - 0.2);
        }
    }

    checkEscape() {
        if (this.player.hasEscaped() && this.player.inventory.length > 0) {
            this.score += this.player.getTotalValue();
            this.player.inventory = [];
            this.player.x = 700;
            this.player.y = 450;

            // Victory if score is high enough
            if (this.score >= 200) {
                this.gameState = GameState.VICTORY;
            }
        }
    }

    updateChat() {
        const now = Date.now();
        if (now - this.lastChatTime > 4000) {
            this.lastChatTime = now;
            const msg = STEALTH_CHAT[Math.floor(Math.random() * STEALTH_CHAT.length)];
            this.addChatMessage(msg.text, msg.type);
        }
    }

    // ============================================
    // RENDERING
    // ============================================
    render() {
        // Clear canvas
        this.ctx.fillStyle = COLORS.wall;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw store
        this.drawFloor();
        this.drawBackShelves();
        this.drawCounter();
        this.drawDisplayShelves();

        // Draw vision cone (under characters)
        this.drawVisionCone();

        // Draw exit zone indicator
        this.drawExitZone();

        // Draw steal zone highlights
        this.drawStealZones();

        // Draw characters
        this.drawShopkeeper();
        this.drawPlayer();

        // Draw UI
        this.renderUI();

        // Draw game over / victory screens
        if (this.gameState === GameState.GAME_OVER) {
            this.drawGameOver();
        } else if (this.gameState === GameState.VICTORY) {
            this.drawVictory();
        }
    }

    drawFloor() {
        this.ctx.fillStyle = COLORS.floor;
        this.ctx.fillRect(0, 300, CANVAS_WIDTH, 300);

        this.ctx.fillStyle = COLORS.floorTile;
        for (let x = 0; x < CANVAS_WIDTH; x += 60) {
            for (let y = 300; y < CANVAS_HEIGHT; y += 60) {
                if ((x / 60 + y / 60) % 2 === 0) {
                    this.ctx.fillRect(x, y, 60, 60);
                }
            }
        }
    }

    drawBackShelves() {
        this.ctx.fillStyle = COLORS.shelf;
        this.ctx.fillRect(50, 50, 700, 200);

        for (let i = 0; i < 4; i++) {
            const y = 70 + i * 45;
            this.ctx.fillStyle = COLORS.shelfShadow;
            this.ctx.fillRect(50, y + 35, 700, 8);
            this.drawProducts(60, y, 680, i);
        }
    }

    drawProducts(x, y, width, row) {
        const colors = [
            ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6'],
            ['#1ABC9C', '#E91E63', '#FF5722', '#795548', '#607D8B', '#FFEB3B'],
            ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#00BCD4', '#8BC34A'],
            ['#F44336', '#673AB7', '#03A9F4', '#4CAF50', '#FFC107', '#FF5722']
        ];

        const rowColors = colors[row % colors.length];
        const productWidth = 25;
        const gap = 5;

        for (let i = 0; i < 22; i++) {
            const px = x + i * (productWidth + gap);
            const color = rowColors[i % rowColors.length];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(px, y, productWidth, 30);
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(px, y, productWidth, 8);
        }
    }

    drawCounter() {
        this.ctx.fillStyle = COLORS.counter;
        this.ctx.fillRect(150, 280, 280, 100);
        this.ctx.fillStyle = COLORS.counterTop;
        this.ctx.fillRect(145, 270, 290, 20);

        // Laptop on counter
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(180, 250, 80, 50);
        this.ctx.fillStyle = this.shopkeeper.state === ShopkeeperState.STREAMING ? '#3498DB' : '#333';
        this.ctx.fillRect(185, 255, 70, 35);

        // "LIVE" when streaming
        if (this.shopkeeper.state === ShopkeeperState.STREAMING) {
            this.ctx.fillStyle = '#EF4444';
            this.ctx.fillRect(190, 260, 25, 10);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '6px "Press Start 2P"';
            this.ctx.fillText('LIVE', 192, 268);
        }

        // Cash register
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(350, 250, 60, 40);
    }

    drawDisplayShelves() {
        // Left display (drinks)
        this.drawDisplayShelf(100, 420, 150, 120, ['#E74C3C', '#3498DB', '#2ECC71']);

        // Right display (chips)
        this.drawDisplayShelf(550, 420, 150, 120, ['#F1C40F', '#E67E22', '#9B59B6']);

        // Center chocolate display
        this.drawChocolateDisplay(500, 350, 100, 80);
    }

    drawDisplayShelf(x, y, w, h, colors) {
        this.ctx.fillStyle = COLORS.shelf;
        this.ctx.fillRect(x, y, w, h);

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                const px = x + 10 + col * 28;
                const py = y + 10 + row * 35;
                this.ctx.fillStyle = colors[(row + col) % colors.length];
                this.ctx.fillRect(px, py, 22, 28);
            }
        }
    }

    drawChocolateDisplay(x, y, w, h) {
        this.ctx.fillStyle = '#D4A574';
        this.ctx.fillRect(x, y, w, h);

        const chocoColors = ['#4A2C2A', '#6B4423', '#8B4513', '#5D3A1A'];
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                const px = x + 8 + col * 23;
                const py = y + 10 + row * 32;
                this.ctx.fillStyle = chocoColors[(row + col) % chocoColors.length];
                this.ctx.fillRect(px, py, 20, 26);
                this.ctx.fillStyle = 'rgba(255,215,0,0.3)';
                this.ctx.fillRect(px, py, 20, 6);
            }
        }

        this.ctx.fillStyle = COLORS.textDark;
        this.ctx.font = '6px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ÇİKOLATA', x + w / 2, y + h - 5);
    }

    drawVisionCone() {
        const ctx = this.ctx;
        const sk = this.shopkeeper;

        const range = sk.getCurrentVisionRange();
        const angle = sk.getCurrentVisionAngle();
        const color = sk.state === ShopkeeperState.STREAMING
            ? COLORS.visionConeStreaming
            : COLORS.visionCone;

        ctx.save();
        ctx.translate(sk.x, sk.y + 40);
        ctx.rotate(sk.facingAngle);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, range, -angle / 2, angle / 2);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();

        // Vision cone border
        ctx.strokeStyle = sk.state === ShopkeeperState.STREAMING
            ? 'rgba(255, 255, 0, 0.3)'
            : 'rgba(255, 0, 0, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    drawExitZone() {
        // Left side exit indicator
        const ctx = this.ctx;
        const pulse = Math.sin(this.frameCount * 0.1) * 0.3 + 0.7;

        ctx.fillStyle = `rgba(16, 185, 129, ${0.2 * pulse})`;
        ctx.fillRect(0, 300, 40, 300);

        ctx.strokeStyle = COLORS.safe;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(5, 305, 30, 290);
        ctx.setLineDash([]);

        // Arrow
        ctx.fillStyle = COLORS.safe;
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('←', 20, 460);
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('ÇIKIŞ', 20, 480);
    }

    drawStealZones() {
        for (const zone of STEAL_ZONES) {
            const isNear = this.player.isInZone(zone);
            const isActive = this.player.currentZone === zone;

            if (isNear || isActive) {
                const ctx = this.ctx;
                const pulse = Math.sin(this.frameCount * 0.15) * 0.2 + 0.8;

                ctx.strokeStyle = isActive ? COLORS.warning : `rgba(245, 158, 11, ${0.5 * pulse})`;
                ctx.lineWidth = isActive ? 3 : 2;
                ctx.setLineDash([5, 3]);
                ctx.strokeRect(zone.x - 5, zone.y - 5, zone.w + 10, zone.h + 10);
                ctx.setLineDash([]);

                // Steal prompt
                if (!isActive && this.player.canSteal()) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(zone.x + zone.w / 2 - 40, zone.y - 30, 80, 20);
                    ctx.fillStyle = COLORS.textLight;
                    ctx.font = '8px "Press Start 2P"';
                    ctx.textAlign = 'center';
                    ctx.fillText('[SPACE]', zone.x + zone.w / 2, zone.y - 15);
                }
            }
        }
    }

    drawShopkeeper() {
        const ctx = this.ctx;
        const x = this.shopkeeper.x;
        const y = this.shopkeeper.y;

        // Jacket
        ctx.fillStyle = COLORS.jacket;
        ctx.fillRect(x - 30, y + 50, 60, 70);

        // Striped shirt
        const stripeColors = [COLORS.shirtRed, COLORS.shirtWhite, COLORS.shirtBlue];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = stripeColors[i % 3];
            ctx.fillRect(x - 15, y + 50 + i * 10, 30, 10);
        }

        // Head
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(x - 20, y, 40, 45);

        // Hair
        ctx.fillStyle = COLORS.beard;
        ctx.fillRect(x - 22, y - 5, 44, 15);

        // Beard
        ctx.fillRect(x - 18, y + 25, 36, 25);

        // Glasses
        ctx.fillStyle = COLORS.glasses;
        ctx.fillRect(x - 18, y + 10, 15, 10);
        ctx.fillRect(x + 3, y + 10, 15, 10);
        ctx.fillStyle = '#333';
        ctx.fillRect(x - 15, y + 13, 9, 5);
        ctx.fillRect(x + 6, y + 13, 9, 5);

        // State indicator
        const stateText = this.shopkeeper.state === ShopkeeperState.STREAMING ? '📺' : '👀';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(stateText, x, y - 15);
    }

    drawPlayer() {
        const ctx = this.ctx;
        const p = this.player;
        const bob = Math.sin(this.frameCount * 0.2) * (p.isMoving ? 3 : 1);

        ctx.save();
        if (p.facingLeft) {
            ctx.translate(p.x * 2, 0);
            ctx.scale(-1, 1);
        }

        const x = p.x;
        const y = p.y;

        // Body
        ctx.fillStyle = COLORS.kidShirt;
        ctx.fillRect(x - 12, y + 20 + bob, 24, 30);

        // Head
        ctx.fillStyle = COLORS.kidSkin;
        ctx.fillRect(x - 10, y + bob, 20, 20);

        // Hair
        ctx.fillStyle = COLORS.kidHair;
        ctx.fillRect(x - 10, y - 5 + bob, 20, 10);

        // Eyes
        ctx.fillStyle = '#000';
        if (p.state === PlayerState.STEALING) {
            // Concentrated eyes
            ctx.fillRect(x - 5, y + 10 + bob, 4, 2);
            ctx.fillRect(x + 2, y + 10 + bob, 4, 2);
        } else {
            ctx.fillRect(x - 5, y + 8 + bob, 3, 3);
            ctx.fillRect(x + 3, y + 8 + bob, 3, 3);
        }

        // Pants
        ctx.fillStyle = COLORS.kidPants;
        ctx.fillRect(x - 10, y + 50 + bob, 9, 20);
        ctx.fillRect(x + 1, y + 50 + bob, 9, 20);

        // Stealing hands
        if (p.state === PlayerState.STEALING) {
            ctx.fillStyle = COLORS.kidSkin;
            ctx.fillRect(x + 12, y + 25 + bob, 10, 8);
        }

        ctx.restore();

        // Draw steal progress bar
        if (p.state === PlayerState.STEALING && p.currentZone) {
            const progress = p.stealProgress / p.stealDuration;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(p.x - 20, p.y - 20, 40, 8);
            ctx.fillStyle = COLORS.warning;
            ctx.fillRect(p.x - 19, p.y - 19, 38 * progress, 6);
            ctx.strokeStyle = COLORS.textLight;
            ctx.strokeRect(p.x - 20, p.y - 20, 40, 8);
        }

        // Draw inventory
        if (p.inventory.length > 0) {
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            let invX = p.x - 15;
            for (const item of p.inventory) {
                ctx.fillText(item.emoji, invX, p.y + 85 + bob);
                invX += 15;
            }
        }
    }

    renderUI() {
        const ctx = this.ctx;

        // Alert meter (top-center)
        const meterWidth = 200;
        const meterX = CANVAS_WIDTH / 2 - meterWidth / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(meterX - 10, 10, meterWidth + 20, 50);

        // Alert label
        ctx.fillStyle = this.alertLevel > 70 ? COLORS.danger :
            this.alertLevel > 40 ? COLORS.warning : COLORS.safe;
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ ALERT', CANVAS_WIDTH / 2, 30);

        // Alert bar background
        ctx.fillStyle = '#333';
        ctx.fillRect(meterX, 38, meterWidth, 15);

        // Alert bar fill
        const alertColor = this.alertLevel > 70 ? COLORS.danger :
            this.alertLevel > 40 ? COLORS.warning : COLORS.safe;
        ctx.fillStyle = alertColor;
        ctx.fillRect(meterX, 38, meterWidth * (this.alertLevel / this.maxAlert), 15);

        // Alert percentage
        ctx.fillStyle = COLORS.textLight;
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText(`${Math.floor(this.alertLevel)}%`, CANVAS_WIDTH / 2, 50);

        // Score (top-left)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 150, 40);
        ctx.strokeStyle = COLORS.money;
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 150, 40);

        ctx.fillStyle = COLORS.money;
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`SKOR: ${this.score}`, 20, 38);

        // Inventory display (top-right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(CANVAS_WIDTH - 160, 10, 150, 40);
        ctx.strokeStyle = COLORS.warning;
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_WIDTH - 160, 10, 150, 40);

        ctx.fillStyle = COLORS.textLight;
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('ÇANTA:', CANVAS_WIDTH - 150, 30);

        // Inventory slots
        for (let i = 0; i < this.player.maxInventory; i++) {
            const slotX = CANVAS_WIDTH - 150 + i * 35 + 60;
            ctx.strokeStyle = '#666';
            ctx.strokeRect(slotX, 25, 25, 20);

            if (this.player.inventory[i]) {
                ctx.font = '14px Arial';
                ctx.fillText(this.player.inventory[i].emoji, slotX + 5, 42);
            }
        }

        // Shopkeeper state timer
        const elapsed = Date.now() - this.shopkeeper.stateTimer;
        const duration = this.shopkeeper.state === ShopkeeperState.STREAMING
            ? STREAMING_DURATION : PATROLLING_DURATION;
        const remaining = Math.ceil((duration - elapsed) / 1000);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 60, 120, 30);
        ctx.fillStyle = this.shopkeeper.state === ShopkeeperState.STREAMING ? '#3498DB' : COLORS.danger;
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'left';
        const stateIcon = this.shopkeeper.state === ShopkeeperState.STREAMING ? '📺' : '👀';
        ctx.fillText(`${stateIcon} ${remaining}s`, 20, 80);

        // Controls hint
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 120, CANVAS_HEIGHT - 35, 240, 25);
        ctx.fillStyle = '#aaa';
        ctx.font = '8px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('↑←↓→ Hareket   SPACE Çal', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 18);
    }

    drawGameOver() {
        const ctx = this.ctx;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Game over text
        ctx.fillStyle = COLORS.danger;
        ctx.font = '32px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('YAKALANDIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = COLORS.textLight;
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText(`Final Skor: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('R tuşuna bas - Tekrar Dene', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 80);
    }

    drawVictory() {
        const ctx = this.ctx;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Victory text
        ctx.fillStyle = COLORS.money;
        ctx.font = '28px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('BAŞARDIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

        ctx.fillStyle = COLORS.textLight;
        ctx.font = '16px "Press Start 2P"';
        ctx.fillText(`Final Skor: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        ctx.font = '12px Arial';
        ctx.fillText('🍫🥤🍿 Tüm ganimetler toplandı! 🍫🥤🍿', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);

        ctx.fillStyle = '#aaa';
        ctx.font = '12px "Press Start 2P"';
        ctx.fillText('R tuşuna bas - Tekrar Oyna', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
    }

    // ============================================
    // GAME LOOP
    // ============================================
    gameLoop(timestamp) {
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(this.gameLoop);
    }
}

// ============================================
// INITIALIZE GAME
// ============================================
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
