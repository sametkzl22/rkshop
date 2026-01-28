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
        const ctx = this.ctx;

        // Main floor base
        ctx.fillStyle = '#B8A080';
        ctx.fillRect(0, 280, CANVAS_WIDTH, 320);

        // Perspective floor tiles (smaller near top, larger near bottom)
        const tileRows = 8;
        for (let row = 0; row < tileRows; row++) {
            const yStart = 280 + row * 40;
            const tileHeight = 35 + row * 2;
            const tilesPerRow = 12 - row;
            const tileWidth = CANVAS_WIDTH / tilesPerRow;

            for (let col = 0; col < tilesPerRow; col++) {
                const xPos = col * tileWidth;
                const isLight = (row + col) % 2 === 0;

                ctx.fillStyle = isLight ? '#C9B896' : '#B8A785';
                ctx.fillRect(xPos, yStart, tileWidth + 1, tileHeight + 1);

                // Tile grout lines
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                ctx.lineWidth = 1;
                ctx.strokeRect(xPos, yStart, tileWidth, tileHeight);
            }
        }

        // Floor shadow near counter
        const shadowGrad = ctx.createLinearGradient(150, 380, 430, 380);
        shadowGrad.addColorStop(0, 'rgba(0,0,0,0)');
        shadowGrad.addColorStop(0.3, 'rgba(0,0,0,0.15)');
        shadowGrad.addColorStop(0.7, 'rgba(0,0,0,0.15)');
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.fillRect(150, 375, 280, 30);
    }

    drawBackShelves() {
        const ctx = this.ctx;

        // Left wall shelving unit (isometric)
        this.drawIsometricShelfUnit(0, 50, 80, 230, true);

        // Back wall shelving (main)
        ctx.fillStyle = '#E8E8E8';
        ctx.fillRect(80, 40, 640, 220);

        // Shelf unit depth (top face)
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(80, 35, 640, 8);

        // Individual shelves with depth
        for (let i = 0; i < 5; i++) {
            const shelfY = 55 + i * 42;

            // Shelf top surface
            ctx.fillStyle = '#D0D0D0';
            ctx.fillRect(85, shelfY + 32, 630, 6);

            // Shelf front edge
            ctx.fillStyle = '#B8B8B8';
            ctx.fillRect(85, shelfY + 38, 630, 3);

            // Products on this shelf
            this.drawProducts(90, shelfY, 620, i);
        }

        // Right wall shelving unit (isometric)
        this.drawIsometricShelfUnit(720, 50, 80, 230, false);
    }

    drawIsometricShelfUnit(x, y, w, h, isLeft) {
        const ctx = this.ctx;
        const depth = 15;

        // Main face
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(x, y, w, h);

        // Side face (2.5D depth)
        ctx.fillStyle = '#C8C8C8';
        if (isLeft) {
            // Right side visible
            ctx.beginPath();
            ctx.moveTo(x + w, y);
            ctx.lineTo(x + w + depth, y - depth);
            ctx.lineTo(x + w + depth, y + h - depth);
            ctx.lineTo(x + w, y + h);
            ctx.closePath();
            ctx.fill();
        } else {
            // Left side visible
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - depth, y - depth);
            ctx.lineTo(x - depth, y + h - depth);
            ctx.lineTo(x, y + h);
            ctx.closePath();
            ctx.fill();
        }

        // Products on side shelf
        const sideColors = ['#E74C3C', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6'];
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 2; col++) {
                const px = x + 10 + col * 30;
                const py = y + 15 + row * 52;
                ctx.fillStyle = sideColors[(row + col) % sideColors.length];
                ctx.fillRect(px, py, 25, 40);
                // Highlight
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(px, py, 25, 10);
            }
        }
    }

    drawProducts(x, y, width, row) {
        const ctx = this.ctx;

        // Different product types per row
        const productTypes = [
            { colors: ['#E74C3C', '#C0392B'], w: 22, h: 28, hasLabel: true },  // Canned goods
            { colors: ['#E67E22', '#D35400'], w: 20, h: 32, hasLabel: true },  // Boxes
            { colors: ['#F1C40F', '#F39C12'], w: 18, h: 26, hasLabel: false }, // Bags
            { colors: ['#2ECC71', '#27AE60'], w: 24, h: 30, hasLabel: true },  // Jars
            { colors: ['#3498DB', '#2980B9'], w: 20, h: 28, hasLabel: true }   // Bottles
        ];

        const type = productTypes[row % productTypes.length];
        const colorSets = [
            ['#E74C3C', '#E67E22', '#F1C40F', '#2ECC71', '#3498DB', '#9B59B6', '#1ABC9C'],
            ['#E91E63', '#FF5722', '#795548', '#607D8B', '#FFEB3B', '#4CAF50', '#00BCD4'],
            ['#673AB7', '#03A9F4', '#8BC34A', '#FF9800', '#9C27B0', '#F44336', '#2196F3']
        ];

        const rowColors = colorSets[row % colorSets.length];
        const gap = 4;
        const itemsCount = Math.floor(width / (type.w + gap));

        for (let i = 0; i < itemsCount; i++) {
            const px = x + i * (type.w + gap);
            const color = rowColors[i % rowColors.length];

            // Product body
            ctx.fillStyle = color;
            ctx.fillRect(px, y, type.w, type.h);

            // Highlight (top)
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(px, y, type.w, 6);

            // Shadow (bottom)
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(px, y + type.h - 4, type.w, 4);

            // Label stripe
            if (type.hasLabel && i % 2 === 0) {
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fillRect(px + 2, y + type.h / 2 - 4, type.w - 4, 8);
            }
        }
    }

    drawCounter() {
        const ctx = this.ctx;

        // Counter shadow on floor
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(160, 385, 270, 20);

        // Counter front face (2.5D)
        ctx.fillStyle = '#704020';
        ctx.fillRect(150, 290, 280, 95);

        // Wood grain lines on front
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(150, 305 + i * 14);
            ctx.lineTo(430, 305 + i * 14);
            ctx.stroke();
        }

        // Counter top surface
        ctx.fillStyle = '#8B5A2B';
        ctx.fillRect(145, 270, 295, 25);

        // Counter top highlight
        ctx.fillStyle = '#A0703B';
        ctx.fillRect(145, 270, 295, 8);

        // Counter depth edge (right side - 2.5D)
        ctx.fillStyle = '#5A3A1A';
        ctx.beginPath();
        ctx.moveTo(430, 270);
        ctx.lineTo(445, 260);
        ctx.lineTo(445, 375);
        ctx.lineTo(430, 385);
        ctx.closePath();
        ctx.fill();

        // Cash register
        this.drawCashRegister(355, 248);

        // Laptop with glow effect
        this.drawLaptopWithGlow(185, 248);
    }

    drawCashRegister(x, y) {
        const ctx = this.ctx;

        // Register body
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x, y, 65, 45);

        // Screen
        ctx.fillStyle = '#2a4a2a';
        ctx.fillRect(x + 5, y + 5, 40, 18);

        // Keypad
        ctx.fillStyle = '#333';
        ctx.fillRect(x + 5, y + 28, 55, 12);

        // Keys
        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = '#555';
            ctx.fillRect(x + 8 + i * 10, y + 30, 8, 8);
        }
    }

    drawLaptopWithGlow(x, y) {
        const ctx = this.ctx;
        const isStreaming = this.shopkeeper.state === ShopkeeperState.STREAMING;

        // GREEN GLOW EFFECT when streaming
        if (isStreaming) {
            ctx.save();
            const glowGrad = ctx.createRadialGradient(
                x + 40, y + 25, 10,
                x + 40, y - 20, 150
            );
            glowGrad.addColorStop(0, 'rgba(80, 255, 120, 0.4)');
            glowGrad.addColorStop(0.3, 'rgba(60, 220, 100, 0.25)');
            glowGrad.addColorStop(0.6, 'rgba(40, 180, 80, 0.1)');
            glowGrad.addColorStop(1, 'rgba(0, 100, 50, 0)');

            ctx.fillStyle = glowGrad;
            ctx.beginPath();
            ctx.ellipse(x + 40, y - 30, 120, 100, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Laptop base
        ctx.fillStyle = '#2C2C2C';
        ctx.fillRect(x, y + 35, 80, 12);

        // Laptop screen backing
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x + 5, y, 70, 40);

        // Laptop screen
        ctx.fillStyle = isStreaming ? '#2ecc71' : '#333';
        ctx.fillRect(x + 8, y + 3, 64, 34);

        if (isStreaming) {
            // Twitch/Kick style purple bar
            ctx.fillStyle = '#9146FF';
            ctx.fillRect(x + 10, y + 6, 40, 10);
            ctx.fillStyle = '#fff';
            ctx.font = '6px "Press Start 2P"';
            ctx.textAlign = 'left';
            ctx.fillText('KICK', x + 12, y + 13);

            // Viewer count
            ctx.fillStyle = '#ccc';
            ctx.font = '5px "Press Start 2P"';
            const viewers = 142 + Math.floor(Math.sin(this.frameCount * 0.02) * 20);
            ctx.fillText(`${viewers}`, x + 10, y + 32);
        }
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
        const scale = 1.3; // Larger sprite
        const s = scale;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + 165 * s, 35 * s, 10 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Jacket
        ctx.fillStyle = COLORS.jacket;
        ctx.fillRect(x - 35 * s, y + 55 * s, 70 * s, 80 * s);

        // Jacket lapels (darker sides)
        ctx.fillStyle = '#5A3A1A';
        ctx.fillRect(x - 35 * s, y + 55 * s, 8 * s, 80 * s);
        ctx.fillRect(x + 27 * s, y + 55 * s, 8 * s, 80 * s);

        // Striped shirt
        const stripeColors = [COLORS.shirtRed, COLORS.shirtWhite, COLORS.shirtBlue];
        for (let i = 0; i < 7; i++) {
            ctx.fillStyle = stripeColors[i % 3];
            ctx.fillRect(x - 18 * s, y + 55 * s + i * 11 * s, 36 * s, 11 * s);
        }

        // Head
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(x - 22 * s, y, 44 * s, 52 * s);

        // Hair (messy top)
        ctx.fillStyle = COLORS.beard;
        ctx.fillRect(x - 25 * s, y - 8 * s, 50 * s, 18 * s);

        // Side hair
        ctx.fillRect(x - 27 * s, y - 5 * s, 8 * s, 35 * s);
        ctx.fillRect(x + 19 * s, y - 5 * s, 8 * s, 35 * s);

        // Beard
        ctx.fillRect(x - 20 * s, y + 28 * s, 40 * s, 28 * s);

        // Glasses frames
        ctx.fillStyle = COLORS.glasses;
        ctx.strokeStyle = COLORS.glasses;
        ctx.lineWidth = 2 * s;
        ctx.fillRect(x - 20 * s, y + 12 * s, 17 * s, 12 * s);
        ctx.fillRect(x + 3 * s, y + 12 * s, 17 * s, 12 * s);

        // Glasses bridge
        ctx.beginPath();
        ctx.moveTo(x - 3 * s, y + 16 * s);
        ctx.lineTo(x + 3 * s, y + 16 * s);
        ctx.stroke();

        // Glasses lenses (dark)
        ctx.fillStyle = '#222';
        ctx.fillRect(x - 17 * s, y + 15 * s, 11 * s, 6 * s);
        ctx.fillRect(x + 6 * s, y + 15 * s, 11 * s, 6 * s);

        // Headphones (when streaming)
        if (this.shopkeeper.state === ShopkeeperState.STREAMING) {
            ctx.fillStyle = '#1a1a1a';
            // Headband
            ctx.beginPath();
            ctx.arc(x, y - 5 * s, 28 * s, Math.PI, 0);
            ctx.lineWidth = 6 * s;
            ctx.strokeStyle = '#333';
            ctx.stroke();
            // Ear cups
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(x - 32 * s, y + 5 * s, 12 * s, 22 * s);
            ctx.fillRect(x + 20 * s, y + 5 * s, 12 * s, 22 * s);
            // Ear cup cushions
            ctx.fillStyle = '#444';
            ctx.fillRect(x - 30 * s, y + 8 * s, 8 * s, 16 * s);
            ctx.fillRect(x + 22 * s, y + 8 * s, 8 * s, 16 * s);
        }

        // Jeans
        ctx.fillStyle = COLORS.jeans;
        ctx.fillRect(x - 28 * s, y + 135 * s, 25 * s, 35 * s);
        ctx.fillRect(x + 3 * s, y + 135 * s, 25 * s, 35 * s);

        // SPEECH BUBBLE ("Streaming LIVE!")
        if (this.shopkeeper.state === ShopkeeperState.STREAMING) {
            this.drawSpeechBubble(x + 80, y - 20);
        }
    }

    drawSpeechBubble(x, y) {
        const ctx = this.ctx;

        // Bubble body
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;

        // Rounded rectangle
        const w = 110;
        const h = 50;
        const r = 8;

        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();

        // Tail (pointing to shopkeeper)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(x + 5, y + h - 5);
        ctx.lineTo(x - 15, y + h + 15);
        ctx.lineTo(x + 20, y + h - 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cover stroke inside bubble where tail meets
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 6, y + h - 6, 16, 8);

        // Text: "Streaming"
        ctx.fillStyle = '#000';
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('Streaming', x + w / 2, y + 22);

        // Text: "LIVE!" in red
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 14px "Press Start 2P"';
        ctx.fillText('LIVE!', x + w / 2, y + 40);
    }

    drawPlayer() {
        const ctx = this.ctx;
        const p = this.player;
        const bob = Math.sin(this.frameCount * 0.2) * (p.isMoving ? 3 : 1);
        const scale = 1.4; // Larger sprite
        const s = scale;

        ctx.save();
        if (p.facingLeft) {
            ctx.translate(p.x * 2, 0);
            ctx.scale(-1, 1);
        }

        const x = p.x;
        const y = p.y;

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(x, y + 78 * s + bob, 18 * s, 6 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body (shirt)
        ctx.fillStyle = COLORS.kidShirt;
        ctx.fillRect(x - 14 * s, y + 22 * s + bob, 28 * s, 35 * s);

        // Shirt collar/details
        ctx.fillStyle = '#2980B9';
        ctx.fillRect(x - 14 * s, y + 22 * s + bob, 28 * s, 6 * s);

        // Head
        ctx.fillStyle = COLORS.kidSkin;
        ctx.fillRect(x - 12 * s, y + bob, 24 * s, 24 * s);

        // Ears
        ctx.fillRect(x - 15 * s, y + 8 * s + bob, 5 * s, 8 * s);
        ctx.fillRect(x + 10 * s, y + 8 * s + bob, 5 * s, 8 * s);

        // Hair (messy kid hair)
        ctx.fillStyle = COLORS.kidHair;
        ctx.fillRect(x - 13 * s, y - 6 * s + bob, 26 * s, 14 * s);
        // Hair spikes
        ctx.fillRect(x - 10 * s, y - 10 * s + bob, 6 * s, 6 * s);
        ctx.fillRect(x + 2 * s, y - 8 * s + bob, 8 * s, 5 * s);

        // Eyes
        ctx.fillStyle = '#000';
        if (p.state === PlayerState.STEALING) {
            // Sneaky squint eyes
            ctx.fillRect(x - 7 * s, y + 12 * s + bob, 6 * s, 2 * s);
            ctx.fillRect(x + 2 * s, y + 12 * s + bob, 6 * s, 2 * s);
        } else {
            // Normal eyes
            ctx.fillRect(x - 6 * s, y + 10 * s + bob, 4 * s, 4 * s);
            ctx.fillRect(x + 3 * s, y + 10 * s + bob, 4 * s, 4 * s);
            // Eye shine
            ctx.fillStyle = '#fff';
            ctx.fillRect(x - 5 * s, y + 11 * s + bob, 2 * s, 2 * s);
            ctx.fillRect(x + 4 * s, y + 11 * s + bob, 2 * s, 2 * s);
        }

        // Mouth (mischievous grin when stealing)
        ctx.fillStyle = '#000';
        if (p.state === PlayerState.STEALING) {
            ctx.fillRect(x - 4 * s, y + 18 * s + bob, 9 * s, 2 * s);
        }

        // Pants
        ctx.fillStyle = COLORS.kidPants;
        ctx.fillRect(x - 12 * s, y + 57 * s + bob, 11 * s, 22 * s);
        ctx.fillRect(x + 1 * s, y + 57 * s + bob, 11 * s, 22 * s);

        // Shoes
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 14 * s, y + 77 * s + bob, 12 * s, 6 * s);
        ctx.fillRect(x + 2 * s, y + 77 * s + bob, 12 * s, 6 * s);

        // Arms
        ctx.fillStyle = COLORS.kidShirt;
        ctx.fillRect(x - 20 * s, y + 25 * s + bob, 8 * s, 25 * s);
        ctx.fillRect(x + 12 * s, y + 25 * s + bob, 8 * s, 25 * s);

        // Hands
        ctx.fillStyle = COLORS.kidSkin;
        ctx.fillRect(x - 20 * s, y + 48 * s + bob, 8 * s, 8 * s);
        ctx.fillRect(x + 12 * s, y + 48 * s + bob, 8 * s, 8 * s);

        // If stealing, show hands reaching toward item
        if (p.state === PlayerState.STEALING) {
            ctx.fillStyle = COLORS.kidSkin;
            ctx.fillRect(x + 18 * s, y + 35 * s + bob, 12 * s, 10 * s);

            // Item being grabbed
            if (p.currentZone) {
                ctx.fillStyle = '#4A2C2A';
                ctx.fillRect(x + 22 * s, y + 38 * s + bob, 10 * s, 14 * s);
            }
        }

        ctx.restore();

        // Draw steal progress bar
        if (p.state === PlayerState.STEALING && p.currentZone) {
            const progress = p.stealProgress / p.stealDuration;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(p.x - 25, p.y - 25, 50, 10);
            ctx.fillStyle = COLORS.warning;
            ctx.fillRect(p.x - 24, p.y - 24, 48 * progress, 8);
            ctx.strokeStyle = COLORS.textLight;
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x - 25, p.y - 25, 50, 10);
        }

        // Draw inventory items above character
        if (p.inventory.length > 0) {
            for (let i = 0; i < p.inventory.length; i++) {
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(p.inventory[i].emoji, p.x - 15 + i * 18, p.y - 10 + bob);
            }
        }
    }

    renderUI() {
        const ctx = this.ctx;

        // ====== STOLEN ITEMS BOX (Top-Left) ======
        ctx.fillStyle = 'rgba(40, 40, 50, 0.95)';
        ctx.fillRect(10, 10, 180, 55);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 180, 55);

        // "Stolen Items:" label
        ctx.fillStyle = COLORS.textLight;
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText('Stolen Items:', 20, 30);

        // Chocolate icon + count
        ctx.font = '18px Arial';
        ctx.fillText('🍫', 25, 55);
        ctx.fillStyle = COLORS.textLight;
        ctx.font = '18px "Press Start 2P"';
        const stolenCount = this.score > 0 ? Math.floor(this.score / 40) : this.player.inventory.length;
        ctx.fillText(String(stolenCount).padStart(2, '0'), 55, 55);

        // ====== ALERT LEVEL BOX (Below Stolen Items) ======
        ctx.fillStyle = 'rgba(40, 40, 50, 0.95)';
        ctx.fillRect(10, 75, 180, 45);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 75, 180, 45);

        // "Alert Level:" label
        ctx.fillStyle = COLORS.textLight;
        ctx.font = '10px "Press Start 2P"';
        ctx.fillText('Alert Level:', 20, 92);

        // Segmented alert bar
        const barX = 20;
        const barY = 100;
        const barWidth = 160;
        const barHeight = 12;
        const segments = 10;
        const segmentWidth = barWidth / segments;
        const activeSegments = Math.ceil((this.alertLevel / this.maxAlert) * segments);

        for (let i = 0; i < segments; i++) {
            if (i < activeSegments) {
                // Filled segment (red gradient)
                const intensity = 0.5 + (i / segments) * 0.5;
                ctx.fillStyle = `rgba(239, 68, 68, ${intensity})`;
            } else {
                // Empty segment
                ctx.fillStyle = '#333';
            }
            ctx.fillRect(barX + i * segmentWidth, barY, segmentWidth - 2, barHeight);
        }

        // ====== INVENTORY (Bottom-Left, small) ======
        ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
        ctx.fillRect(10, CANVAS_HEIGHT - 50, 100, 40);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(10, CANVAS_HEIGHT - 50, 100, 40);

        ctx.fillStyle = '#888';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText('ÇANTA:', 15, CANVAS_HEIGHT - 35);

        // Inventory slots
        for (let i = 0; i < this.player.maxInventory; i++) {
            const slotX = 20 + i * 28;
            const slotY = CANVAS_HEIGHT - 28;
            ctx.strokeStyle = '#666';
            ctx.strokeRect(slotX, slotY, 22, 18);

            if (this.player.inventory[i]) {
                ctx.font = '12px Arial';
                ctx.fillText(this.player.inventory[i].emoji, slotX + 4, slotY + 14);
            }
        }

        // ====== SCORE (Top-Right, small) ======
        ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
        ctx.fillRect(CANVAS_WIDTH - 120, 10, 110, 35);
        ctx.strokeStyle = COLORS.money;
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_WIDTH - 120, 10, 110, 35);

        ctx.fillStyle = COLORS.money;
        ctx.font = '10px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`SKOR:${this.score}`, CANVAS_WIDTH - 112, 33);

        // ====== SHOPKEEPER STATE (Top-Right, below score) ======
        const elapsed = Date.now() - this.shopkeeper.stateTimer;
        const duration = this.shopkeeper.state === ShopkeeperState.STREAMING
            ? STREAMING_DURATION : PATROLLING_DURATION;
        const remaining = Math.ceil((duration - elapsed) / 1000);

        ctx.fillStyle = 'rgba(40, 40, 50, 0.9)';
        ctx.fillRect(CANVAS_WIDTH - 120, 50, 110, 30);
        ctx.fillStyle = this.shopkeeper.state === ShopkeeperState.STREAMING ? '#3498DB' : COLORS.danger;
        ctx.font = '8px "Press Start 2P"';
        const stateIcon = this.shopkeeper.state === ShopkeeperState.STREAMING ? '📺' : '�';
        ctx.fillText(`${stateIcon} ${remaining}s`, CANVAS_WIDTH - 110, 70);

        // ====== CONTROLS HINT (Bottom-Center) ======
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(CANVAS_WIDTH / 2 - 130, CANVAS_HEIGHT - 30, 260, 22);
        ctx.fillStyle = '#999';
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('↑←↓→/WASD Hareket   SPACE Çal   R Yeniden', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 14);
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
