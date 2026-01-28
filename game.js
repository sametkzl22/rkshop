/**
 * Streamer Bakkal - 8-bit Grocer Simulator
 * A split-attention game where you manage a Turkish grocery store while streaming
 */

// ============================================
// GAME CONSTANTS
// ============================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

const GameMode = {
    STORE: 'store',
    STREAM: 'stream'
};

const ThiefState = {
    OUTSIDE: 'outside',
    ENTERING: 'entering',
    STEALING: 'stealing',
    ESCAPING: 'escaping',
    SCARED: 'scared'
};

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
    chatBg: '#0f0f1a',
    textLight: '#FFFFFF',
    textDark: '#1a1a2e',
    money: '#4ADE80',
    danger: '#EF4444',
    // Shopkeeper colors
    skin: '#D4A574',
    beard: '#2C2C2C',
    glasses: '#FFD700',
    jacket: '#6B4423',
    shirtRed: '#CC3333',
    shirtWhite: '#FFFFFF',
    shirtBlue: '#1E3A5F',
    jeans: '#4A5568',
    // Thief (kid) colors
    kidSkin: '#E8C4A0',
    kidHair: '#3D2314',
    kidShirt: '#3498DB',
    kidPants: '#2C3E50'
};

// Turkish chat messages
const CHAT_MESSAGES = [
    { text: "Abi arkanda çocuk var!", type: 'warning' },
    { text: "KEKW", type: 'normal' },
    { text: "Bağış attım abi", type: 'donation' },
    { text: "Selam herkese!", type: 'normal' },
    { text: "Hırsız girdi dikkat!", type: 'warning' },
    { text: "abi çikolata çalıyor", type: 'warning' },
    { text: "merhaba stream", type: 'normal' },
    { text: "LUL", type: 'normal' },
    { text: "Efsane yayın", type: 'normal' },
    { text: "Takip attım abi", type: 'normal' },
    { text: "PogChamp", type: 'normal' },
    { text: "güzel yayın", type: 'normal' }
];

const USERNAMES = [
    "TurkishGamer42",
    "AliVeli_TR",
    "KickFan2026",
    "StreamLover",
    "BakkalSever",
    "Viewer_123",
    "CrazyDonator",
    "NightOwl_TR",
    "GamerBoy99",
    "ChatStalker"
];

// ============================================
// GAME STATE
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        // Game state
        this.mode = GameMode.STORE;
        this.cash = 0;
        this.stolenCount = 0;
        this.lastDonationTime = 0;
        this.donationInterval = 3000; // 3 seconds between donations in stream mode
        
        // Chat state
        this.chatMessages = [];
        this.maxChatMessages = 5;
        
        // Thief state
        this.thief = {
            state: ThiefState.OUTSIDE,
            x: -50,
            y: 400,
            targetX: 550,
            speed: 2,
            stealTimer: 0,
            stealDuration: 2000, // 2 seconds to steal
            nextSpawnTime: this.getRandomSpawnTime()
        };
        
        // Animation
        this.frameCount = 0;
        this.lastTime = 0;
        
        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        
        // Setup
        this.setupEventListeners();
        this.addChatMessage("Yayın başladı!", 'system');
        
        // Start game loop
        requestAnimationFrame(this.gameLoop);
    }
    
    getRandomSpawnTime() {
        return Date.now() + (8000 + Math.random() * 7000); // 8-15 seconds
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        
        if (key === 'l') {
            this.switchToStreamMode();
        } else if (key === 'd') {
            this.switchToStoreMode();
        }
    }
    
    switchToStreamMode() {
        if (this.mode !== GameMode.STREAM) {
            this.mode = GameMode.STREAM;
            this.addChatMessage("Yayına döndün!", 'system');
        }
    }
    
    switchToStoreMode() {
        if (this.mode !== GameMode.STORE) {
            this.mode = GameMode.STORE;
            
            // Scare the thief if they're stealing
            if (this.thief.state === ThiefState.ENTERING || 
                this.thief.state === ThiefState.STEALING) {
                this.thief.state = ThiefState.SCARED;
                this.thief.speed = 4; // Run faster when scared
            }
        }
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
        this.frameCount++;
        
        // Stream mode: Generate donations and chat
        if (this.mode === GameMode.STREAM) {
            this.updateStreamMode(deltaTime);
        }
        
        // Update thief AI
        this.updateThief(deltaTime);
    }
    
    updateStreamMode(deltaTime) {
        const now = Date.now();
        
        // Generate donations periodically
        if (now - this.lastDonationTime > this.donationInterval) {
            this.lastDonationTime = now;
            
            // 40% chance of donation, 60% chance of random chat
            if (Math.random() < 0.4) {
                const amount = Math.floor(5 + Math.random() * 21); // 5-25 TL
                this.cash += amount;
                this.addChatMessage(`${amount} TL bağış attım!`, 'donation');
            } else {
                const msg = CHAT_MESSAGES[Math.floor(Math.random() * CHAT_MESSAGES.length)];
                this.addChatMessage(msg.text, msg.type);
            }
        }
    }
    
    updateThief(deltaTime) {
        const now = Date.now();
        
        switch (this.thief.state) {
            case ThiefState.OUTSIDE:
                // Check if it's time to spawn
                if (now >= this.thief.nextSpawnTime) {
                    this.thief.state = ThiefState.ENTERING;
                    this.thief.x = -50;
                    this.thief.speed = 2;
                }
                break;
                
            case ThiefState.ENTERING:
                // Move towards chocolate zone
                this.thief.x += this.thief.speed;
                
                if (this.thief.x >= this.thief.targetX) {
                    this.thief.state = ThiefState.STEALING;
                    this.thief.stealTimer = now;
                }
                
                // If player is watching, get scared
                if (this.mode === GameMode.STORE) {
                    this.thief.state = ThiefState.SCARED;
                    this.thief.speed = 4;
                }
                break;
                
            case ThiefState.STEALING:
                // Check if steal is complete
                if (now - this.thief.stealTimer >= this.thief.stealDuration) {
                    this.stolenCount++;
                    this.thief.state = ThiefState.ESCAPING;
                    
                    // Add chat warning if streaming
                    if (this.mode === GameMode.STREAM && Math.random() < 0.7) {
                        this.addChatMessage("ABI ÇOCUK ÇALDI!", 'warning');
                    }
                }
                
                // If player switches to store mode, get scared
                if (this.mode === GameMode.STORE) {
                    this.thief.state = ThiefState.SCARED;
                    this.thief.speed = 4;
                }
                break;
                
            case ThiefState.ESCAPING:
            case ThiefState.SCARED:
                // Run away
                this.thief.x += this.thief.speed;
                
                if (this.thief.x > CANVAS_WIDTH + 50) {
                    this.thief.state = ThiefState.OUTSIDE;
                    this.thief.nextSpawnTime = this.getRandomSpawnTime();
                }
                break;
        }
    }
    
    // ============================================
    // RENDERING
    // ============================================
    render() {
        // Clear canvas
        this.ctx.fillStyle = COLORS.wall;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        if (this.mode === GameMode.STORE) {
            this.renderStoreMode();
        } else {
            this.renderStreamMode();
        }
        
        // Always render UI
        this.renderUI();
    }
    
    renderStoreMode() {
        // Draw floor
        this.drawFloor();
        
        // Draw back wall with shelves
        this.drawBackShelves();
        
        // Draw counter
        this.drawCounter();
        
        // Draw shopkeeper
        this.drawShopkeeper(280, 200);
        
        // Draw display shelves (front)
        this.drawDisplayShelves();
        
        // Draw thief if visible
        if (this.thief.state !== ThiefState.OUTSIDE) {
            this.drawThief();
        }
        
        // Mode indicator
        this.ctx.fillStyle = COLORS.textLight;
        this.ctx.font = '12px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('DÜKKÂN MODU', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 20);
    }
    
    renderStreamMode() {
        // Draw laptop screen background
        this.ctx.fillStyle = COLORS.laptopScreen;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // Draw laptop frame
        this.ctx.strokeStyle = COLORS.laptopBody;
        this.ctx.lineWidth = 20;
        this.ctx.strokeRect(10, 10, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);
        
        // Draw "webcam" view of shopkeeper (small preview)
        this.ctx.fillStyle = '#1a2a3a';
        this.ctx.fillRect(50, 50, 200, 150);
        this.drawShopkeeper(100, 60, 0.6);
        
        // Draw "LIVE" indicator
        this.ctx.fillStyle = '#EF4444';
        this.ctx.fillRect(60, 60, 50, 20);
        this.ctx.fillStyle = COLORS.textLight;
        this.ctx.font = '10px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('LIVE', 65, 75);
        
        // Draw viewer count
        this.ctx.fillStyle = COLORS.textLight;
        const viewers = 142 + Math.floor(Math.sin(this.frameCount * 0.02) * 20);
        this.ctx.fillText(`👁 ${viewers}`, 60, 190);
        
        // Draw chat box
        this.drawChatBox();
        
        // Draw streaming platform logo mockup
        this.ctx.fillStyle = '#00FF00';
        this.ctx.font = '16px "Press Start 2P"';
        this.ctx.textAlign = 'right';
        this.ctx.fillText('KICK', CANVAS_WIDTH - 60, 70);
        
        // Mode indicator
        this.ctx.fillStyle = COLORS.textLight;
        this.ctx.font = '12px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('STREAM MODU', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 30);
    }
    
    drawFloor() {
        // Main floor
        this.ctx.fillStyle = COLORS.floor;
        this.ctx.fillRect(0, 300, CANVAS_WIDTH, 300);
        
        // Tile pattern
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
        // Shelf unit background
        this.ctx.fillStyle = COLORS.shelf;
        this.ctx.fillRect(50, 50, 700, 200);
        
        // Shelf layers
        for (let i = 0; i < 4; i++) {
            const y = 70 + i * 45;
            
            // Shelf shadow
            this.ctx.fillStyle = COLORS.shelfShadow;
            this.ctx.fillRect(50, y + 35, 700, 8);
            
            // Products on shelf
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
            
            // Product box
            this.ctx.fillStyle = color;
            this.ctx.fillRect(px, y, productWidth, 30);
            
            // Highlight
            this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
            this.ctx.fillRect(px, y, productWidth, 8);
        }
    }
    
    drawCounter() {
        // Counter body
        this.ctx.fillStyle = COLORS.counter;
        this.ctx.fillRect(150, 280, 280, 100);
        
        // Counter top
        this.ctx.fillStyle = COLORS.counterTop;
        this.ctx.fillRect(145, 270, 290, 20);
        
        // Cash register
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(350, 250, 60, 40);
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(355, 255, 50, 20);
        
        // Wood grain lines
        this.ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(150, 290 + i * 18);
            this.ctx.lineTo(430, 290 + i * 18);
            this.ctx.stroke();
        }
    }
    
    drawDisplayShelves() {
        // Left display
        this.drawDisplayShelf(100, 420, 150, 120);
        
        // Right display
        this.drawDisplayShelf(550, 420, 150, 120);
        
        // Center snack display (where thief targets)
        this.drawChocolateDisplay(500, 350, 100, 80);
    }
    
    drawDisplayShelf(x, y, w, h) {
        // Shelf frame
        this.ctx.fillStyle = COLORS.shelf;
        this.ctx.fillRect(x, y, w, h);
        
        // Products
        const miniColors = ['#E74C3C', '#3498DB', '#F1C40F', '#2ECC71', '#9B59B6', '#E67E22'];
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 5; col++) {
                const px = x + 10 + col * 28;
                const py = y + 10 + row * 35;
                this.ctx.fillStyle = miniColors[(row + col) % miniColors.length];
                this.ctx.fillRect(px, py, 22, 28);
            }
        }
    }
    
    drawChocolateDisplay(x, y, w, h) {
        // Chocolate stand (target for thief)
        this.ctx.fillStyle = '#D4A574';
        this.ctx.fillRect(x, y, w, h);
        
        // Chocolate bars
        const chocoColors = ['#4A2C2A', '#6B4423', '#8B4513', '#5D3A1A'];
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 4; col++) {
                const px = x + 8 + col * 23;
                const py = y + 10 + row * 32;
                this.ctx.fillStyle = chocoColors[(row + col) % chocoColors.length];
                this.ctx.fillRect(px, py, 20, 26);
                
                // Wrapper shine
                this.ctx.fillStyle = 'rgba(255,215,0,0.3)';
                this.ctx.fillRect(px, py, 20, 6);
            }
        }
        
        // Label
        this.ctx.fillStyle = COLORS.textDark;
        this.ctx.font = '6px "Press Start 2P"';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ÇİKOLATA', x + w/2, y + h - 5);
    }
    
    drawShopkeeper(x, y, scale = 1) {
        const s = scale;
        const ctx = this.ctx;
        
        // Body position
        const bx = x;
        const by = y;
        
        // Jacket
        ctx.fillStyle = COLORS.jacket;
        ctx.fillRect(bx - 30*s, by + 50*s, 60*s, 70*s);
        
        // Striped shirt (visible in jacket opening)
        const stripeColors = [COLORS.shirtRed, COLORS.shirtWhite, COLORS.shirtBlue];
        for (let i = 0; i < 6; i++) {
            ctx.fillStyle = stripeColors[i % 3];
            ctx.fillRect(bx - 15*s, by + 50*s + i*10*s, 30*s, 10*s);
        }
        
        // Head
        ctx.fillStyle = COLORS.skin;
        ctx.fillRect(bx - 20*s, by, 40*s, 45*s);
        
        // Hair
        ctx.fillStyle = COLORS.beard;
        ctx.fillRect(bx - 22*s, by - 5*s, 44*s, 15*s);
        
        // Beard
        ctx.fillRect(bx - 18*s, by + 25*s, 36*s, 25*s);
        
        // Glasses
        ctx.fillStyle = COLORS.glasses;
        ctx.fillRect(bx - 18*s, by + 10*s, 15*s, 10*s);
        ctx.fillRect(bx + 3*s, by + 10*s, 15*s, 10*s);
        ctx.fillStyle = '#333';
        ctx.fillRect(bx - 15*s, by + 13*s, 9*s, 5*s);
        ctx.fillRect(bx + 6*s, by + 13*s, 9*s, 5*s);
        
        // Jeans
        ctx.fillStyle = COLORS.jeans;
        ctx.fillRect(bx - 25*s, by + 120*s, 22*s, 40*s);
        ctx.fillRect(bx + 3*s, by + 120*s, 22*s, 40*s);
    }
    
    drawThief() {
        const x = this.thief.x;
        const y = this.thief.y;
        const ctx = this.ctx;
        
        // Animate bobbing
        const bob = Math.sin(this.frameCount * 0.2) * 2;
        
        // Kid body
        ctx.fillStyle = COLORS.kidShirt;
        ctx.fillRect(x - 12, y + 20 + bob, 24, 30);
        
        // Head
        ctx.fillStyle = COLORS.kidSkin;
        ctx.fillRect(x - 10, y + bob, 20, 20);
        
        // Hair
        ctx.fillStyle = COLORS.kidHair;
        ctx.fillRect(x - 10, y - 5 + bob, 20, 10);
        
        // Eyes (look shifty if stealing)
        ctx.fillStyle = '#000';
        if (this.thief.state === ThiefState.STEALING) {
            // Shifty eyes
            const eyeOffset = Math.sin(this.frameCount * 0.3) * 2;
            ctx.fillRect(x - 5 + eyeOffset, y + 8 + bob, 3, 3);
            ctx.fillRect(x + 3 + eyeOffset, y + 8 + bob, 3, 3);
        } else if (this.thief.state === ThiefState.SCARED) {
            // Wide scared eyes
            ctx.fillRect(x - 6, y + 6 + bob, 5, 5);
            ctx.fillRect(x + 2, y + 6 + bob, 5, 5);
        } else {
            // Normal eyes
            ctx.fillRect(x - 5, y + 8 + bob, 3, 3);
            ctx.fillRect(x + 3, y + 8 + bob, 3, 3);
        }
        
        // Pants
        ctx.fillStyle = COLORS.kidPants;
        ctx.fillRect(x - 10, y + 50 + bob, 9, 20);
        ctx.fillRect(x + 1, y + 50 + bob, 9, 20);
        
        // If stealing, show hands reaching
        if (this.thief.state === ThiefState.STEALING) {
            ctx.fillStyle = COLORS.kidSkin;
            ctx.fillRect(x - 20, y + 25 + bob, 10, 8);
            
            // Stealing progress indicator
            const progress = (Date.now() - this.thief.stealTimer) / this.thief.stealDuration;
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            ctx.fillRect(x - 15, y - 15, 30 * progress, 5);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(x - 15, y - 15, 30, 5);
        }
        
        // If escaping with loot, show chocolate
        if (this.thief.state === ThiefState.ESCAPING) {
            ctx.fillStyle = '#4A2C2A';
            ctx.fillRect(x + 12, y + 30 + bob, 12, 18);
        }
        
        // Scared expression (wavy mouth)
        if (this.thief.state === ThiefState.SCARED) {
            ctx.fillStyle = '#000';
            ctx.fillRect(x - 3, y + 14 + bob, 6, 2);
        }
    }
    
    drawChatBox() {
        const x = CANVAS_WIDTH - 350;
        const y = 100;
        const w = 300;
        const h = 400;
        
        // Chat background
        this.ctx.fillStyle = 'rgba(15, 15, 26, 0.9)';
        this.ctx.fillRect(x, y, w, h);
        
        // Chat border
        this.ctx.strokeStyle = '#3a3a5a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, w, h);
        
        // Chat header
        this.ctx.fillStyle = '#2a2a4a';
        this.ctx.fillRect(x, y, w, 30);
        this.ctx.fillStyle = COLORS.textLight;
        this.ctx.font = '10px "Press Start 2P"';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('CHAT', x + 10, y + 20);
        
        // Chat messages
        let msgY = y + 60;
        for (const msg of this.chatMessages) {
            // Username
            let usernameColor = '#9B59B6';
            if (msg.type === 'donation') usernameColor = '#F1C40F';
            if (msg.type === 'warning') usernameColor = '#E74C3C';
            if (msg.type === 'system') usernameColor = '#00FF00';
            
            this.ctx.fillStyle = usernameColor;
            this.ctx.font = '8px "Press Start 2P"';
            const displayName = msg.type === 'system' ? 'SİSTEM' : msg.username;
            this.ctx.fillText(displayName + ':', x + 10, msgY);
            
            // Message
            this.ctx.fillStyle = COLORS.textLight;
            this.ctx.fillText(msg.text, x + 10, msgY + 15);
            
            // Donation highlight
            if (msg.type === 'donation') {
                this.ctx.fillStyle = 'rgba(241, 196, 15, 0.1)';
                this.ctx.fillRect(x + 5, msgY - 12, w - 10, 35);
            }
            
            msgY += 45;
        }
    }
    
    renderUI() {
        const ctx = this.ctx;
        
        // Cash display (top-left)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 180, 40);
        ctx.strokeStyle = COLORS.money;
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, 180, 40);
        
        ctx.fillStyle = COLORS.money;
        ctx.font = '14px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`₺ ${this.cash}`, 25, 38);
        
        // Thief counter (top-right)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(CANVAS_WIDTH - 200, 10, 190, 40);
        ctx.strokeStyle = COLORS.danger;
        ctx.lineWidth = 2;
        ctx.strokeRect(CANVAS_WIDTH - 200, 10, 190, 40);
        
        ctx.fillStyle = COLORS.danger;
        ctx.font = '12px "Press Start 2P"';
        ctx.textAlign = 'right';
        ctx.fillText(`🍫 Çalınan: ${this.stolenCount}`, CANVAS_WIDTH - 20, 38);
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
