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
    COMBAT: 'combat',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

const ShopkeeperState = {
    STREAMING: 'streaming',
    PATROLLING: 'patrolling',
    SERVING: 'serving'
};

const CustomerState = {
    ENTERING: 'entering',
    WAITING_FOR_SERVICE: 'waitingForService',
    BEING_SERVED: 'beingServed',
    LEAVING: 'leaving'
};

const PlayerState = {
    IDLE: 'idle',
    WALKING: 'walking',
    STEALING: 'stealing'
};

const CombatState = {
    IDLE: 'idle',
    ATTACKING: 'attacking',
    HIT: 'hit',
    BLOCKING: 'blocking',
    KO: 'ko'
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

    // Player sprites - Stealth
    cocukIdle: new Image(),
    cocukStealing: new Image(),

    // Player sprites - Combat
    kidMeydanokuma: new Image(),
    kidSaplama: new Image(),
    kidDamage: new Image(),
    kidNakavt: new Image(),

    // Shopkeeper sprites - Stealth
    bekciPatrol: new Image(),
    bekciStreaming: new Image(),

    // Shopkeeper sprites - Combat
    rkKavgahazir: new Image(),
    rkKavgavurdu: new Image(),
    rkDamage: new Image(),
    rkNakavt: new Image(),

    // Customer sprites
    manCustomer: new Image(),
    womanCustomer: new Image(),

    loaded: false
};

let assetsLoaded = 0;
const totalAssets = 15;  // 13 + 2 customer sprites

// ============================================
// STEAL ZONES - Accessible lower shelf positions
// ============================================
const STEAL_ZONES = [
    // Mid-level shelves - accessible Y coordinates
    { id: 'cikolata', name: 'Çikolata', x: 520, y: 280, w: 100, h: 60, value: 50, emoji: '🍫' },
    { id: 'biskuvi', name: 'Bisküvi', x: 380, y: 280, w: 100, h: 60, value: 35, emoji: '🍪' },
    { id: 'konserve', name: 'Konserve', x: 240, y: 280, w: 100, h: 60, value: 25, emoji: '🥫' },

    // Left shelf (side area)
    { id: 'icecek', name: 'İçecek', x: 40, y: 350, w: 60, h: 100, value: 30, emoji: '🥤' },

    // Floor display stands
    { id: 'cips', name: 'Cips', x: 450, y: 420, w: 100, h: 80, value: 40, emoji: '🍿' },
    { id: 'seker', name: 'Şeker', x: 300, y: 480, w: 120, h: 70, value: 20, emoji: '🍬' }
];

// EXIT ZONE - Right side (door area)
const EXIT_ZONE = {
    x: 720,
    y: 380,
    w: 80,
    h: 180,
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
        this.baseSpeed = 3.5;
        this.speed = this.baseSpeed;
        this.state = PlayerState.IDLE;

        // Collision box (feet area)
        this.collisionWidth = 30;
        this.collisionHeight = 20;
        this.collisionOffsetX = (this.width - this.collisionWidth) / 2;
        this.collisionOffsetY = this.height - this.collisionHeight;

        // Inventory system - items collected but not yet scored (max 3)
        this.inventory = [];
        this.inventoryValue = 0;
        this.maxInventory = 3;

        this.stealProgress = 0;
        this.stealTime = 1500;
        this.targetZone = null;
        this.isMoving = false;
        this.facingLeft = false;

        // Sneaking mechanic (Shift key)
        this.isSneaking = false;
        this.isRunning = false;

        this.keys = { up: false, down: false, left: false, right: false, space: false, shift: false };
    }

    update(game) {
        this.isMoving = false;
        this.isSneaking = this.keys.shift;

        // Calculate speed with bag weight penalty (10% per item, max 3 items)
        const bagPenalty = Math.min(this.inventory.length, this.maxInventory) * 0.1;
        const sneakMultiplier = this.isSneaking ? 0.5 : 1;
        this.speed = this.baseSpeed * (1 - bagPenalty) * sneakMultiplier;

        let dx = 0, dy = 0;

        if (this.keys.up) dy -= this.speed;
        if (this.keys.down) dy += this.speed;
        if (this.keys.left) { dx -= this.speed; this.facingLeft = true; }
        if (this.keys.right) { dx += this.speed; this.facingLeft = false; }

        if (dx !== 0 || dy !== 0) {
            this.isMoving = true;
            this.isRunning = !this.isSneaking;

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
        } else {
            this.isRunning = false;
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
        this.startX = x;
        this.startY = y;
        this.width = 100;
        this.height = 130;
        this.state = ShopkeeperState.STREAMING;
        this.stateTimer = 0;
        this.visionAngle = 0;
        this.visionRange = 0;
        this.visionConeAngle = 0;

        // Patrol system with 4 waypoints
        this.patrolWaypoints = [
            { x: 400, y: 350 },  // Center floor
            { x: 600, y: 400 },  // Near right shelves
            { x: 200, y: 450 },  // Near left shelves
            { x: 500, y: 280 }   // Near back shelves
        ];
        this.currentWaypoint = 0;
        this.patrolSpeed = 1.5;
        this.facingAngle = Math.PI / 2;  // Facing down by default
        this.lookTimer = 0;
        this.isLooking = false;

        // Warning system
        this.showWarning = false;
        this.warningTimer = 0;
    }

    update(deltaTime, game) {
        this.stateTimer += deltaTime;

        if (this.state === ShopkeeperState.STREAMING) {
            // STREAMING: Zero vision - fully focused on stream
            this.visionRange = 0;
            this.visionConeAngle = 0;

            // Check for warning (2 seconds before patrol)
            const timeUntilPatrol = STREAMING_DURATION - this.stateTimer;
            if (timeUntilPatrol <= 2000 && timeUntilPatrol > 0) {
                this.showWarning = true;
            } else {
                this.showWarning = false;
            }

            if (this.stateTimer >= STREAMING_DURATION) {
                this.state = ShopkeeperState.PATROLLING;
                this.stateTimer = 0;
                this.showWarning = false;
                this.currentWaypoint = Math.floor(Math.random() * this.patrolWaypoints.length);
                game.addChatMessage("Bi dk bakıyorum...", 'system');
            }
        } else if (this.state === ShopkeeperState.SERVING) {
            // SERVING: Zero vision - focused on customer
            this.visionRange = 0;
            this.visionConeAngle = 0;
            this.showWarning = false;

            // Stay at counter position while serving
            this.x = this.startX;
            this.y = this.startY;

            // Customer class handles returning shopkeeper to STREAMING state
        } else {
            // PATROLLING: Active vision and movement
            this.visionRange = 250;
            this.visionConeAngle = Math.PI / 2;
            this.showWarning = false;

            // Move towards current waypoint
            const target = this.patrolWaypoints[this.currentWaypoint];
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 10) {
                // Move towards waypoint
                this.x += (dx / distance) * this.patrolSpeed;
                this.y += (dy / distance) * this.patrolSpeed;

                // Update facing angle towards movement direction
                this.facingAngle = Math.atan2(dy, dx);
                this.visionAngle = this.facingAngle;
                this.isLooking = false;
                this.lookTimer = 0;
            } else {
                // Arrived at waypoint - look around
                this.isLooking = true;
                this.lookTimer += deltaTime;

                // Scan by rotating vision
                this.visionAngle += 0.03;
                this.facingAngle = this.visionAngle;

                // Stay at waypoint for 1.5 seconds, then move to next
                if (this.lookTimer >= 1500) {
                    this.currentWaypoint = Math.floor(Math.random() * this.patrolWaypoints.length);
                    this.lookTimer = 0;
                }
            }

            if (this.stateTimer >= PATROLLING_DURATION) {
                // Return to counter position
                this.x = this.startX;
                this.y = this.startY;
                this.state = ShopkeeperState.STREAMING;
                this.stateTimer = 0;
                game.addChatMessage("Devam ediyoruz!", 'system');
            }
        }
    }

    canSeePlayer(player) {
        // No vision during streaming
        if (this.visionRange === 0) return false;

        const dx = player.getCenterX() - (this.x + this.width / 2);
        const dy = player.getCenterY() - (this.y + this.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.visionRange) return false;

        const angleToPlayer = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToPlayer - this.visionAngle);

        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        return angleDiff < this.visionConeAngle / 2;
    }

    getCenterX() { return this.x + this.width / 2; }
    getCenterY() { return this.y + this.height / 2; }
}

// ============================================
// CUSTOMER CLASS - NPC with hue-rotation variety
// ============================================
class Customer {
    constructor() {
        // Random sprite selection (man or woman)
        this.isMale = Math.random() > 0.5;
        this.sprite = this.isMale ? ASSETS.manCustomer : ASSETS.womanCustomer;

        // Random hue rotation for color variety (0-360 degrees)
        this.colorHue = Math.floor(Math.random() * 360);

        // Position and dimensions
        this.width = 50;
        this.height = 70;

        // Start from right door (entry point)
        this.x = 780;
        this.y = 450;

        // Target position (counter area)
        this.counterX = 350;
        this.counterY = 280;

        // Movement
        this.speed = 1.2;
        this.state = CustomerState.ENTERING;

        // Service timing
        this.waitTimer = 0;
        this.serviceTime = 3000 + Math.random() * 2000; // 3-5 seconds to serve

        // Request (what they want to buy)
        this.requestItems = ['🍫', '🍪', '🥫', '🥤', '🍿', '🍬'];
        this.request = this.requestItems[Math.floor(Math.random() * this.requestItems.length)];

        this.facingLeft = true;
    }

    update(deltaTime, game) {
        switch (this.state) {
            case CustomerState.ENTERING:
                // Walk towards counter
                const dxEnter = this.counterX - this.x;
                const dyEnter = this.counterY - this.y;
                const distEnter = Math.sqrt(dxEnter * dxEnter + dyEnter * dyEnter);

                if (distEnter > 10) {
                    this.x += (dxEnter / distEnter) * this.speed;
                    this.y += (dyEnter / distEnter) * this.speed;
                    this.facingLeft = dxEnter < 0;
                } else {
                    // Arrived at counter
                    this.state = CustomerState.WAITING_FOR_SERVICE;
                    this.waitTimer = 0;

                    // Trigger shopkeeper to serve (if streaming)
                    if (game.shopkeeper.state === ShopkeeperState.STREAMING) {
                        game.shopkeeper.state = ShopkeeperState.SERVING;
                        game.shopkeeper.stateTimer = 0;
                        game.addChatMessage("Müşteri geldi!", 'system');
                    }
                }
                break;

            case CustomerState.WAITING_FOR_SERVICE:
                // Wait for shopkeeper to serve
                if (game.shopkeeper.state === ShopkeeperState.SERVING) {
                    this.state = CustomerState.BEING_SERVED;
                    this.waitTimer = 0;
                }
                break;

            case CustomerState.BEING_SERVED:
                // Being served - wait for service to complete
                this.waitTimer += deltaTime;

                if (this.waitTimer >= this.serviceTime) {
                    // Service complete - leave
                    this.state = CustomerState.LEAVING;
                    game.addChatMessage("Teşekkürler!", 'system');

                    // Shopkeeper returns to streaming
                    game.shopkeeper.state = ShopkeeperState.STREAMING;
                    game.shopkeeper.stateTimer = 0;
                    game.shopkeeper.x = game.shopkeeper.startX;
                    game.shopkeeper.y = game.shopkeeper.startY;
                }
                break;

            case CustomerState.LEAVING:
                // Walk towards exit
                const exitX = 780;
                const exitY = 450;
                const dxLeave = exitX - this.x;
                const dyLeave = exitY - this.y;
                const distLeave = Math.sqrt(dxLeave * dxLeave + dyLeave * dyLeave);

                if (distLeave > 10) {
                    this.x += (dxLeave / distLeave) * this.speed * 1.5;
                    this.y += (dyLeave / distLeave) * this.speed * 1.5;
                    this.facingLeft = dxLeave < 0;
                } else {
                    // Customer left - remove from game
                    this.remove = true;
                }
                break;
        }
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

        // Player starts at right door entrance
        this.player = new Player(750, 500);
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

        // Customer system
        this.customers = [];
        this.customerSpawnTimer = 0;
        this.customerSpawnInterval = 15000; // Spawn customer every 15 seconds
        this.maxCustomers = 2; // Max simultaneous customers

        // ============================================
        // COMBAT SYSTEM
        // ============================================
        this.combat = {
            // HP
            playerHP: 100,
            shopkeeperHP: 100,
            maxHP: 100,

            // States
            playerState: CombatState.IDLE,
            shopkeeperState: CombatState.IDLE,

            // Timers
            playerAttackTimer: 0,
            shopkeeperAttackTimer: 0,
            hitStunTimer: 0,

            // Attack cooldowns
            playerAttackCooldown: 0,
            shopkeeperAttackCooldown: 0,

            // Damage values
            playerDamage: 15,
            shopkeeperDamage: 20,

            // Screen effects
            screenShake: 0,
            flashAlpha: 0,

            // FIGHT! transition
            fightTransitionTimer: 0,
            showFightText: false,

            // Combat controls
            keys: { j: false, k: false }
        };

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

        // Set up load handlers - Stealth assets
        ASSETS.dukkan.onload = onLoad;
        ASSETS.cocukIdle.onload = onLoad;
        ASSETS.cocukStealing.onload = onLoad;
        ASSETS.bekciPatrol.onload = onLoad;
        ASSETS.bekciStreaming.onload = onLoad;

        // Set up load handlers - Combat assets
        ASSETS.kidMeydanokuma.onload = onLoad;
        ASSETS.kidSaplama.onload = onLoad;
        ASSETS.kidDamage.onload = onLoad;
        ASSETS.kidNakavt.onload = onLoad;
        ASSETS.rkKavgahazir.onload = onLoad;
        ASSETS.rkKavgavurdu.onload = onLoad;
        ASSETS.rkDamage.onload = onLoad;
        ASSETS.rkNakavt.onload = onLoad;

        // Set up load handlers - Customer assets
        ASSETS.manCustomer.onload = onLoad;
        ASSETS.womanCustomer.onload = onLoad;

        ASSETS.dukkan.onerror = onError;
        ASSETS.cocukIdle.onerror = onError;
        ASSETS.cocukStealing.onerror = onError;
        ASSETS.bekciPatrol.onerror = onError;
        ASSETS.bekciStreaming.onerror = onError;
        ASSETS.kidMeydanokuma.onerror = onError;
        ASSETS.kidSaplama.onerror = onError;
        ASSETS.kidDamage.onerror = onError;
        ASSETS.kidNakavt.onerror = onError;
        ASSETS.rkKavgahazir.onerror = onError;
        ASSETS.rkKavgavurdu.onerror = onError;
        ASSETS.rkDamage.onerror = onError;
        ASSETS.rkNakavt.onerror = onError;
        ASSETS.manCustomer.onerror = onError;
        ASSETS.womanCustomer.onerror = onError;

        // Load assets with URL-encoded paths for Turkish characters
        ASSETS.dukkan.src = 'assets/rkd%C3%BCkkan.png';
        ASSETS.cocukIdle.src = 'assets/%C3%A7ocuk.png';
        ASSETS.cocukStealing.src = 'assets/kidcalarken.png';
        ASSETS.bekciPatrol.src = 'assets/rkbekci-front.png';
        ASSETS.bekciStreaming.src = 'assets/rkyay%C4%B1nda.png';

        // Combat sprites
        ASSETS.kidMeydanokuma.src = 'assets/kidmeydanokuma.png';
        ASSETS.kidSaplama.src = 'assets/kidsaplama.png';
        ASSETS.kidDamage.src = 'assets/kidkavgadamage.png';
        ASSETS.kidNakavt.src = 'assets/kidnakavt.png';
        ASSETS.rkKavgahazir.src = 'assets/rkkavgahaz%C4%B1r.png';
        ASSETS.rkKavgavurdu.src = 'assets/rkkavgavurdu.png';
        ASSETS.rkDamage.src = 'assets/rkdamage.png';
        ASSETS.rkNakavt.src = 'assets/rknakavt.png';

        // Customer sprites
        ASSETS.manCustomer.src = 'assets/mancustomer.png';
        ASSETS.womanCustomer.src = 'assets/womancustomer.png';
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

        // Combat mode controls
        if (this.gameState === GameState.COMBAT) {
            const key = e.key.toLowerCase();
            if (key === 'j') this.combat.keys.j = true;
            if (key === 'k') this.combat.keys.k = true;
            return;
        }

        const key = e.key.toLowerCase();
        if (key === 'arrowup' || key === 'w') this.player.keys.up = true;
        if (key === 'arrowdown' || key === 's') this.player.keys.down = true;
        if (key === 'arrowleft' || key === 'a') this.player.keys.left = true;
        if (key === 'arrowright' || key === 'd') this.player.keys.right = true;
        if (key === ' ') { e.preventDefault(); this.player.keys.space = true; }
        if (key === 'shift') this.player.keys.shift = true;
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();

        // Combat mode
        if (key === 'j') this.combat.keys.j = false;
        if (key === 'k') this.combat.keys.k = false;

        // Stealth mode
        if (key === 'arrowup' || key === 'w') this.player.keys.up = false;
        if (key === 'arrowdown' || key === 's') this.player.keys.down = false;
        if (key === 'arrowleft' || key === 'a') this.player.keys.left = false;
        if (key === 'arrowright' || key === 'd') this.player.keys.right = false;
        if (key === ' ') this.player.keys.space = false;
        if (key === 'shift') this.player.keys.shift = false;
    }

    restart() {
        this.gameState = GameState.PLAYING;
        this.score = 0;
        this.alertLevel = 0;
        this.player = new Player(750, 500);
        this.shopkeeper = new Shopkeeper(200, 180);
        this.chatMessages = [];
        this.addChatMessage("Yayın başladı!", 'system');

        // Reset customer system
        this.customers = [];
        this.customerSpawnTimer = 0;

        // Reset combat
        this.combat.playerHP = 100;
        this.combat.shopkeeperHP = 100;
        this.combat.playerState = CombatState.IDLE;
        this.combat.shopkeeperState = CombatState.IDLE;
        this.combat.screenShake = 0;
        this.combat.flashAlpha = 0;
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
        } else if (this.gameState === GameState.COMBAT) {
            this.updateCombat(deltaTime);
            this.renderCombat();
        } else {
            this.render();
            this.drawEndScreen();
        }

        requestAnimationFrame(this.gameLoop);
    }

    update(deltaTime) {
        this.player.update(this);
        this.shopkeeper.update(deltaTime, this);

        // Detection check - vision based
        if (this.shopkeeper.canSeePlayer(this.player)) {
            this.alertLevel += 0.8;
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - 0.3);
        }

        // Noise mechanic - running without Shift increases alert during patrol
        if (this.player.isRunning && this.shopkeeper.state === ShopkeeperState.PATROLLING) {
            this.alertLevel += 0.15;
        }

        // Trigger COMBAT when alert maxes out
        if (this.alertLevel >= this.maxAlert) {
            this.gameState = GameState.COMBAT;
            this.combat.showFightText = true;
            this.combat.fightTransitionTimer = 2000; // 2 second FIGHT! display
            this.combat.playerHP = 100;
            this.combat.shopkeeperHP = 100;
        }

        // Customer spawn system
        this.customerSpawnTimer += deltaTime;
        if (this.customerSpawnTimer >= this.customerSpawnInterval &&
            this.customers.length < this.maxCustomers) {
            this.customers.push(new Customer());
            this.customerSpawnTimer = 0;
        }

        // Update customers
        for (const customer of this.customers) {
            customer.update(deltaTime, this);
        }

        // Remove customers that have left
        this.customers = this.customers.filter(c => !c.remove);

        // Random chat
        if (Date.now() - this.lastChatTime > 4000 + Math.random() * 3000) {
            const msg = STEALTH_CHAT[Math.floor(Math.random() * STEALTH_CHAT.length)];
            this.addChatMessage(msg.text, msg.type);
            this.lastChatTime = Date.now();
        }
    }

    // ============================================
    // COMBAT SYSTEM UPDATE
    // ============================================
    updateCombat(deltaTime) {
        const c = this.combat;

        // FIGHT! transition timer
        if (c.showFightText) {
            c.fightTransitionTimer -= deltaTime;
            if (c.fightTransitionTimer <= 0) {
                c.showFightText = false;
            }
            return; // Don't process combat during transition
        }

        // Update cooldowns
        if (c.playerAttackCooldown > 0) c.playerAttackCooldown -= deltaTime;
        if (c.shopkeeperAttackCooldown > 0) c.shopkeeperAttackCooldown -= deltaTime;

        // Update screen effects
        if (c.screenShake > 0) c.screenShake -= deltaTime * 0.1;
        if (c.flashAlpha > 0) c.flashAlpha -= deltaTime * 0.003;

        // Reset states after animation
        if (c.playerAttackTimer > 0) {
            c.playerAttackTimer -= deltaTime;
            if (c.playerAttackTimer <= 0) c.playerState = CombatState.IDLE;
        }
        if (c.shopkeeperAttackTimer > 0) {
            c.shopkeeperAttackTimer -= deltaTime;
            if (c.shopkeeperAttackTimer <= 0) c.shopkeeperState = CombatState.IDLE;
        }

        // Player attack (J key)
        if (c.keys.j && c.playerAttackCooldown <= 0 && c.playerState === CombatState.IDLE) {
            c.playerState = CombatState.ATTACKING;
            c.playerAttackTimer = 300; // 300ms attack animation
            c.playerAttackCooldown = 500; // 500ms cooldown

            // Check if shopkeeper is blocking
            if (c.shopkeeperState !== CombatState.BLOCKING) {
                c.shopkeeperHP -= c.playerDamage;
                c.shopkeeperState = CombatState.HIT;
                c.shopkeeperAttackTimer = 200;
                c.screenShake = 10;
                c.flashAlpha = 0.5;
            }
        }

        // Player block (K key)
        if (c.keys.k && c.playerState === CombatState.IDLE) {
            c.playerState = CombatState.BLOCKING;
        } else if (!c.keys.k && c.playerState === CombatState.BLOCKING) {
            c.playerState = CombatState.IDLE;
        }

        // Shopkeeper AI - random attacks
        if (c.shopkeeperState === CombatState.IDLE && c.shopkeeperAttackCooldown <= 0) {
            if (Math.random() < 0.02) { // 2% chance per frame to attack
                c.shopkeeperState = CombatState.ATTACKING;
                c.shopkeeperAttackTimer = 400;
                c.shopkeeperAttackCooldown = 1000;

                // Check if player is blocking
                if (c.playerState !== CombatState.BLOCKING) {
                    c.playerHP -= c.shopkeeperDamage;
                    c.playerState = CombatState.HIT;
                    c.playerAttackTimer = 200;
                    c.screenShake = 15;
                    c.flashAlpha = 0.7;
                }
            }
        }

        // Check win/lose conditions
        if (c.shopkeeperHP <= 0) {
            c.shopkeeperState = CombatState.KO;
            // Player wins! Add inventory value to score
            setTimeout(() => {
                this.score += this.player.inventoryValue;
                this.gameState = GameState.VICTORY;
            }, 1500);
        }

        if (c.playerHP <= 0) {
            c.playerState = CombatState.KO;
            setTimeout(() => {
                this.gameState = GameState.GAME_OVER;
            }, 1500);
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

        // Draw customers with hue-rotation
        this.drawCustomers();

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
        if (s.state === ShopkeeperState.STREAMING || s.state === ShopkeeperState.SERVING) {
            img = ASSETS.bekciStreaming;
        } else {
            img = ASSETS.bekciPatrol;
        }

        // Calculate draw dimensions (maintain aspect ratio)
        const aspectRatio = img.width / img.height;
        const drawHeight = s.height;
        const drawWidth = drawHeight * aspectRatio;

        // Margin-start offset for streaming sprite (rkyayında.png)
        const marginStart = (s.state === ShopkeeperState.STREAMING || s.state === ShopkeeperState.SERVING) ? 45 : 0;

        // Draw the shopkeeper sprite with margin offset
        ctx.drawImage(
            img,
            s.x + marginStart,
            s.y,
            drawWidth,
            drawHeight
        );

        // Draw warning indicator (!) when about to patrol
        if (s.showWarning) {
            const warningX = s.x + s.width / 2 + marginStart;
            const warningY = s.y - 20;
            const pulse = 0.7 + Math.sin(this.frameCount * 0.2) * 0.3;

            // Yellow exclamation mark with pulsing effect
            ctx.fillStyle = `rgba(255, 220, 0, ${pulse})`;
            ctx.font = 'bold 32px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('!', warningX, warningY);

            // Glow effect
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 15;
            ctx.fillText('!', warningX, warningY);
            ctx.shadowBlur = 0;
        }
    }

    drawCustomers() {
        const ctx = this.ctx;

        for (const customer of this.customers) {
            ctx.save();

            // Apply hue-rotation filter for color variety
            ctx.filter = `hue-rotate(${customer.colorHue}deg)`;

            // Get customer sprite
            const img = customer.sprite;

            // Calculate draw dimensions (maintain aspect ratio)
            const aspectRatio = img.width / img.height;
            const drawHeight = customer.height;
            const drawWidth = drawHeight * aspectRatio;

            // Flip if facing right
            if (!customer.facingLeft) {
                ctx.translate(customer.x + drawWidth, customer.y);
                ctx.scale(-1, 1);
                ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
            } else {
                ctx.drawImage(img, customer.x, customer.y, drawWidth, drawHeight);
            }

            ctx.restore();

            // Draw speech bubble when waiting for service
            if (customer.state === CustomerState.WAITING_FOR_SERVICE ||
                customer.state === CustomerState.BEING_SERVED) {
                this.drawCustomerBubble(customer, ctx);
            }
        }
    }

    drawCustomerBubble(customer, ctx) {
        const bubbleX = customer.x + customer.width / 2;
        const bubbleY = customer.y - 30;

        // Bubble background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.ellipse(bubbleX, bubbleY, 25, 18, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bubble border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bubble tail
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(bubbleX - 5, bubbleY + 15);
        ctx.lineTo(bubbleX, bubbleY + 25);
        ctx.lineTo(bubbleX + 5, bubbleY + 15);
        ctx.fill();

        // Request emoji
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(customer.request, bubbleX, bubbleY + 5);
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
        ctx.fillText("WASD:Hareket SHIFT:Sessiz SPACE:Çal", 14, CANVAS_HEIGHT - 12);
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

    // ============================================
    // COMBAT RENDERING
    // ============================================
    renderCombat() {
        const ctx = this.ctx;
        const c = this.combat;

        // Apply screen shake
        ctx.save();
        if (c.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * c.screenShake;
            const shakeY = (Math.random() - 0.5) * c.screenShake;
            ctx.translate(shakeX, shakeY);
        }

        // Dark arena background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw ground line
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT - 80);
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 80);
        ctx.stroke();

        // Draw HP bars
        this.drawCombatHPBars();

        // Draw characters (2.5x scale)
        this.drawCombatCharacters();

        // Draw damage flash
        if (c.flashAlpha > 0) {
            ctx.fillStyle = `rgba(255, 0, 0, ${c.flashAlpha})`;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        }

        ctx.restore();

        // Draw FIGHT! transition text
        if (c.showFightText) {
            this.drawFightTransition();
        }

        // Draw combat controls hint
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(8, CANVAS_HEIGHT - 28, 280, 22);
        ctx.fillStyle = '#FFF';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText("J:Saldır  K:Blok", 14, CANVAS_HEIGHT - 12);
    }

    drawCombatHPBars() {
        const ctx = this.ctx;
        const c = this.combat;
        const barW = 300;
        const barH = 30;
        const margin = 50;

        // Player HP (left)
        ctx.fillStyle = '#333';
        ctx.fillRect(margin, 30, barW, barH);

        const playerHPWidth = (c.playerHP / c.maxHP) * barW;
        ctx.fillStyle = c.playerHP > 30 ? '#22C55E' : '#EF4444';
        ctx.fillRect(margin, 30, playerHPWidth, barH);

        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(margin, 30, barW, barH);

        ctx.fillStyle = '#FFF';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('ÇOCUK', margin, 22);
        ctx.fillText(`${Math.max(0, c.playerHP)}`, margin + 10, 52);

        // Shopkeeper HP (right)
        const rightX = CANVAS_WIDTH - margin - barW;
        ctx.fillStyle = '#333';
        ctx.fillRect(rightX, 30, barW, barH);

        const shopkeeperHPWidth = (c.shopkeeperHP / c.maxHP) * barW;
        ctx.fillStyle = c.shopkeeperHP > 30 ? '#EF4444' : '#22C55E';
        ctx.fillRect(rightX + barW - shopkeeperHPWidth, 30, shopkeeperHPWidth, barH);

        ctx.strokeStyle = '#FFF';
        ctx.strokeRect(rightX, 30, barW, barH);

        ctx.textAlign = 'right';
        ctx.fillText('BAKKALCI', CANVAS_WIDTH - margin, 22);
        ctx.fillText(`${Math.max(0, c.shopkeeperHP)}`, CANVAS_WIDTH - margin - 10, 52);
    }

    drawCombatCharacters() {
        const ctx = this.ctx;
        const c = this.combat;
        const scale = 2.5;

        // Get player sprite based on state
        let playerImg;
        switch (c.playerState) {
            case CombatState.ATTACKING:
                playerImg = ASSETS.kidSaplama;
                break;
            case CombatState.HIT:
                playerImg = ASSETS.kidDamage;
                break;
            case CombatState.KO:
                playerImg = ASSETS.kidNakavt;
                break;
            case CombatState.BLOCKING:
                playerImg = ASSETS.kidMeydanokuma; // Use idle for block
                break;
            default:
                playerImg = ASSETS.kidMeydanokuma;
        }

        // Get shopkeeper sprite based on state
        let shopkeeperImg;
        switch (c.shopkeeperState) {
            case CombatState.ATTACKING:
                shopkeeperImg = ASSETS.rkKavgavurdu;
                break;
            case CombatState.HIT:
                shopkeeperImg = ASSETS.rkDamage;
                break;
            case CombatState.KO:
                shopkeeperImg = ASSETS.rkNakavt;
                break;
            default:
                shopkeeperImg = ASSETS.rkKavgahazir;
        }

        // Calculate dimensions maintaining aspect ratio
        const playerBaseH = 150;
        const playerH = playerBaseH * scale;
        const playerW = playerImg.width ? (playerImg.width / playerImg.height) * playerH : playerH * 0.6;

        const shopkeeperBaseH = 180;
        const shopkeeperH = shopkeeperBaseH * scale;
        const shopkeeperW = shopkeeperImg.width ? (shopkeeperImg.width / shopkeeperImg.height) * shopkeeperH : shopkeeperH * 0.7;

        // Draw player (left side)
        const playerX = 100;
        const playerY = CANVAS_HEIGHT - 80 - playerH;
        ctx.drawImage(playerImg, playerX, playerY, playerW, playerH);

        // Draw shopkeeper (right side, flipped)
        const shopkeeperX = CANVAS_WIDTH - 100 - shopkeeperW;
        const shopkeeperY = CANVAS_HEIGHT - 80 - shopkeeperH;

        ctx.save();
        ctx.translate(shopkeeperX + shopkeeperW, shopkeeperY);
        ctx.scale(-1, 1);
        ctx.drawImage(shopkeeperImg, 0, 0, shopkeeperW, shopkeeperH);
        ctx.restore();
    }

    drawFightTransition() {
        const ctx = this.ctx;

        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // FIGHT! text with pulsing effect
        const pulse = 1 + Math.sin(this.frameCount * 0.2) * 0.1;

        ctx.save();
        ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.scale(pulse, pulse);

        ctx.fillStyle = '#FF0000';
        ctx.font = '64px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        ctx.fillText('FIGHT!', 0, 0);

        // Yellow outline
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.strokeText('FIGHT!', 0, 0);

        ctx.restore();
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
