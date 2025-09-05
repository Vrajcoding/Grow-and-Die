// Game State Management
class GameState {
    constructor() {
        this.currentLevel = 0;
        this.levels = [
            { name: 'Seed', icon: '🌱', turnsToNext: 5, background: 'soil', special: null },
            { name: 'Sprout', icon: '🌿', turnsToNext: 8, background: 'grassland', special: 'photosynthesis' },
            { name: 'Sapling', icon: '🌳', turnsToNext: 10, background: 'forest', special: 'root_network' },
            { name: 'Young Tree', icon: '🌲', turnsToNext: 12, background: 'forest', special: 'seasonal_cycle' },
            { name: 'Mature Tree', icon: '🌳', turnsToNext: 15, background: 'forest', special: 'ecosystem' },
            { name: 'Ancient Tree', icon: '🌲', turnsToNext: 0, background: 'forest', special: 'immortal' }
        ];
        
        this.stats = {
            health: 100,
            water: 50,
            sunlight: 50,
            nutrients: 50
        };
        
        this.score = 0;
        this.turns = 0;
        this.turnsInCurrentLevel = 0;
        this.gameOver = false;
        this.won = false;
        
        // Upgrades
        this.upgrades = {
            strongRoots: 0,    // Water drains slower
            wideLeaves: 0,    // More sunlight gain
            thickBark: 0      // Pests do less damage
        };
        
        // Event system
        this.eventActive = false;
        this.eventTurns = 0;
        this.currentEvent = null;
        
        // Tips system
        this.tipsUsed = localStorage.getItem('growOrDieTipsUsed') === 'true';
        this.currentTip = null;
        
        // Special abilities
        this.specialCooldown = 0;
        
        this.loadHighScore();
    }
    
    loadHighScore() {
        this.highScore = parseInt(localStorage.getItem('growOrDieHighScore')) || 0;
    }
    
    saveHighScore() {
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('growOrDieHighScore', this.highScore.toString());
        }
    }
    
    getCurrentLevel() {
        return this.levels[this.currentLevel];
    }
    
    isMaxLevel() {
        return this.currentLevel >= this.levels.length - 1;
    }
    
    canLevelUp() {
        const level = this.getCurrentLevel();
        return this.turnsInCurrentLevel >= level.turnsToNext && !this.isMaxLevel();
    }
    
    levelUp() {
        if (this.canLevelUp()) {
            this.currentLevel++;
            this.turnsInCurrentLevel = 0;
            return true;
        }
        return false;
    }
    
    takeTurn(action) {
        if (this.gameOver) return;
        
        this.turns++;
        this.turnsInCurrentLevel++;
        
        // Process action
        this.processAction(action);
        
        // Natural decay
        this.naturalDecay();
        
        // Check for random events
        this.checkRandomEvent();
        
        // Process active event
        if (this.eventActive) {
            this.processEvent();
        }
        
        // Check win/lose conditions
        this.checkGameEnd();
        
        // Check for level up
        if (this.canLevelUp()) {
            this.showUpgradeModal();
        }
        
        this.updateUI();
    }
    
    processAction(action) {
        const baseGain = 20;
        const baseCost = 5;
        const level = this.getCurrentLevel();
        
        // Apply special abilities
        let bonusGain = 0;
        if (level.special) {
            bonusGain = this.getSpecialBonus(action, level.special);
        }
        
        switch (action) {
            case 'water':
                this.stats.water = Math.min(100, this.stats.water + baseGain + bonusGain);
                this.stats.health = Math.min(100, this.stats.health + 5);
                this.score += 10 + (bonusGain > 0 ? 5 : 0);
                break;
            case 'sunlight':
                this.stats.sunlight = Math.min(100, this.stats.sunlight + baseGain + bonusGain);
                this.stats.health = Math.min(100, this.stats.health + 5);
                this.score += 10 + (bonusGain > 0 ? 5 : 0);
                break;
            case 'nutrients':
                this.stats.nutrients = Math.min(100, this.stats.nutrients + baseGain + bonusGain);
                this.stats.health = Math.min(100, this.stats.health + 5);
                this.score += 10 + (bonusGain > 0 ? 5 : 0);
                break;
            case 'rest':
                this.stats.health = Math.min(100, this.stats.health + 15);
                this.stats.water = Math.max(0, this.stats.water - 5);
                this.stats.sunlight = Math.max(0, this.stats.sunlight - 5);
                this.stats.nutrients = Math.max(0, this.stats.nutrients - 5);
                this.score += 5;
                break;
            case 'special':
                this.useSpecialAbility();
                break;
        }
        
        // Reduce special cooldown
        if (this.specialCooldown > 0) {
            this.specialCooldown--;
        }
    }
    
    naturalDecay() {
        const waterDecay = 8 - (this.upgrades.strongRoots * 2);
        const sunlightDecay = 6;
        const nutrientsDecay = 7;
        
        this.stats.water = Math.max(0, this.stats.water - waterDecay);
        this.stats.sunlight = Math.max(0, this.stats.sunlight - sunlightDecay);
        this.stats.nutrients = Math.max(0, this.stats.nutrients - nutrientsDecay);
        
        // Health decay if any stat is too low
        const minThreshold = 20;
        if (this.stats.water < minThreshold || this.stats.sunlight < minThreshold || this.stats.nutrients < minThreshold) {
            this.stats.health = Math.max(0, this.stats.health - 10);
        }
    }
    
    checkRandomEvent() {
        if (this.eventActive) return;
        
        const eventChance = 0.15; // 15% chance per turn
        if (Math.random() < eventChance) {
            this.triggerRandomEvent();
        }
    }
    
    triggerRandomEvent() {
        const events = [
            {
                name: 'pests',
                icon: '🐛',
                text: 'Pests are attacking!',
                duration: 3,
                effect: () => {
                    const damage = Math.max(5, 15 - (this.upgrades.thickBark * 3));
                    this.stats.health = Math.max(0, this.stats.health - damage);
                }
            },
            {
                name: 'drought',
                icon: '☀️',
                text: 'Severe drought! Water is scarce.',
                duration: 2,
                effect: () => {
                    this.stats.water = Math.max(0, this.stats.water - 15);
                }
            },
            {
                name: 'rainstorm',
                icon: '🌧️',
                text: 'Heavy rainstorm!',
                duration: 2,
                effect: () => {
                    this.stats.water = Math.min(100, this.stats.water + 25);
                    this.stats.sunlight = Math.max(0, this.stats.sunlight - 10);
                }
            },
            {
                name: 'heatwave',
                icon: '🔥',
                text: 'Extreme heatwave!',
                duration: 2,
                effect: () => {
                    this.stats.water = Math.max(0, this.stats.water - 20);
                    this.stats.sunlight = Math.min(100, this.stats.sunlight + 15);
                }
            }
        ];
        
        this.currentEvent = events[Math.floor(Math.random() * events.length)];
        this.eventActive = true;
        this.eventTurns = this.currentEvent.duration;
        
        this.showEvent();
    }
    
    processEvent() {
        if (!this.eventActive) return;
        
        this.currentEvent.effect();
        this.eventTurns--;
        
        if (this.eventTurns <= 0) {
            this.eventActive = false;
            this.currentEvent = null;
            this.hideEvent();
        }
    }
    
    checkGameEnd() {
        if (this.stats.health <= 0) {
            this.gameOver = true;
            this.won = false;
            this.saveHighScore();
            this.showEndScreen();
        } else if (this.isMaxLevel() && this.turnsInCurrentLevel >= this.getCurrentLevel().turnsToNext) {
            this.gameOver = true;
            this.won = true;
            this.saveHighScore();
            this.showEndScreen();
        }
    }
    
    showUpgradeModal() {
        const modal = document.getElementById('upgradeModal');
        modal.classList.remove('hidden');
    }
    
    hideUpgradeModal() {
        const modal = document.getElementById('upgradeModal');
        modal.classList.add('hidden');
    }
    
    applyUpgrade(upgradeType) {
        this.upgrades[upgradeType]++;
        this.hideUpgradeModal();
    }
    
    showEvent() {
        const eventDisplay = document.getElementById('eventDisplay');
        const eventIcon = document.getElementById('eventIcon');
        const eventText = document.getElementById('eventText');
        
        eventIcon.textContent = this.currentEvent.icon;
        eventText.textContent = this.currentEvent.text;
        eventDisplay.classList.remove('hidden');
    }
    
    hideEvent() {
        const eventDisplay = document.getElementById('eventDisplay');
        eventDisplay.classList.add('hidden');
    }
    
    showEndScreen() {
        const gameScreen = document.getElementById('gameScreen');
        const endScreen = document.getElementById('endScreen');
        const endIcon = document.getElementById('endIcon');
        const endTitle = document.getElementById('endTitle');
        const endMessage = document.getElementById('endMessage');
        const finalScore = document.getElementById('finalScore');
        const finalHighScore = document.getElementById('finalHighScore');
        
        gameScreen.classList.remove('active');
        endScreen.classList.add('active');
        
        if (this.won) {
            endIcon.textContent = '🌲';
            endTitle.textContent = 'Congratulations!';
            endMessage.textContent = 'You\'ve grown into a magnificent tree!';
        } else {
            endIcon.textContent = '💀';
            endTitle.textContent = 'Game Over';
            endMessage.textContent = 'Your plant didn\'t survive...';
        }
        
        finalScore.textContent = this.score;
        finalHighScore.textContent = this.highScore;
    }
    
    updateUI() {
        // Update level display
        const levelIcon = document.getElementById('levelIcon');
        const levelName = document.getElementById('levelName');
        const currentLevel = this.getCurrentLevel();
        
        levelIcon.textContent = currentLevel.icon;
        levelName.textContent = currentLevel.name;
        
        // Update background
        const backgroundLayer = document.getElementById('backgroundLayer');
        backgroundLayer.className = `background-layer ${currentLevel.background}`;
        
        // Update plant display
        const plantDisplay = document.getElementById('plantDisplay');
        plantDisplay.innerHTML = `<div class="plant-stage ${currentLevel.name.toLowerCase().replace(' ', '-')}">${currentLevel.icon}</div>`;
        
        // Update scores
        document.getElementById('currentScore').textContent = this.score;
        document.getElementById('highScore').textContent = this.highScore;
        
        // Update status bars
        this.updateStatusBar('health', this.stats.health);
        this.updateStatusBar('water', this.stats.water);
        this.updateStatusBar('sunlight', this.stats.sunlight);
        this.updateStatusBar('nutrients', this.stats.nutrients);
        
        // Update special ability button
        this.updateSpecialButton();
        
        // Update tips button
        this.updateTipsButton();
    }
    
    updateSpecialButton() {
        const specialBtn = document.getElementById('specialBtn');
        const cooldownIndicator = document.getElementById('specialCooldown');
        const currentLevel = this.getCurrentLevel();
        
        if (currentLevel.special) {
            specialBtn.classList.remove('hidden');
            
            if (this.specialCooldown > 0) {
                specialBtn.disabled = true;
                cooldownIndicator.textContent = this.specialCooldown;
                cooldownIndicator.style.display = 'flex';
            } else {
                specialBtn.disabled = false;
                cooldownIndicator.style.display = 'none';
            }
        } else {
            specialBtn.classList.add('hidden');
        }
    }
    
    updateTipsButton() {
        const tipsBtn = document.getElementById('tipsBtn');
        if (this.tipsUsed) {
            tipsBtn.style.opacity = '0.5';
            tipsBtn.title = 'Tips already used';
        } else {
            tipsBtn.style.opacity = '1';
            tipsBtn.title = 'Get a helpful tip';
        }
    }
    
    updateStatusBar(statName, value) {
        const bar = document.getElementById(`${statName}Bar`);
        const valueSpan = document.getElementById(`${statName}Value`);
        
        bar.style.width = `${value}%`;
        valueSpan.textContent = value;
        
        // Add warning colors for low values
        if (value < 20) {
            bar.style.background = 'linear-gradient(90deg, #ff4757, #ff6b7a)';
        } else if (value < 40) {
            bar.style.background = 'linear-gradient(90deg, #ffa502, #ffb142)';
        } else {
            // Reset to original colors
            const colors = {
                health: 'linear-gradient(90deg, #ff6b6b, #ff8e8e)',
                water: 'linear-gradient(90deg, #4ecdc4, #44a08d)',
                sunlight: 'linear-gradient(90deg, #feca57, #ff9ff3)',
                nutrients: 'linear-gradient(90deg, #48dbfb, #0abde3)'
            };
            bar.style.background = colors[statName];
        }
    }
    
    getSpecialBonus(action, special) {
        switch (special) {
            case 'photosynthesis':
                return action === 'sunlight' ? 10 : 0;
            case 'root_network':
                return action === 'water' ? 8 : 0;
            case 'seasonal_cycle':
                return Math.random() < 0.3 ? 15 : 0; // Random bonus
            case 'ecosystem':
                return action === 'nutrients' ? 12 : 0;
            case 'immortal':
                return 5; // Small bonus to all actions
            default:
                return 0;
        }
    }
    
    useSpecialAbility() {
        if (this.specialCooldown > 0) return;
        
        const level = this.getCurrentLevel();
        this.specialCooldown = 3; // 3 turn cooldown
        
        switch (level.special) {
            case 'photosynthesis':
                this.stats.sunlight = Math.min(100, this.stats.sunlight + 30);
                this.stats.health = Math.min(100, this.stats.health + 10);
                this.score += 25;
                this.showSpecialEffect('☀️ Enhanced Photosynthesis!');
                break;
            case 'root_network':
                this.stats.water = Math.min(100, this.stats.water + 25);
                this.stats.nutrients = Math.min(100, this.stats.nutrients + 15);
                this.score += 20;
                this.showSpecialEffect('🌿 Root Network Activated!');
                break;
            case 'seasonal_cycle':
                this.stats.health = Math.min(100, this.stats.health + 20);
                this.stats.water = Math.min(100, this.stats.water + 15);
                this.stats.sunlight = Math.min(100, this.stats.sunlight + 15);
                this.stats.nutrients = Math.min(100, this.stats.nutrients + 15);
                this.score += 30;
                this.showSpecialEffect('🍂 Seasonal Growth!');
                break;
            case 'ecosystem':
                this.stats.health = Math.min(100, this.stats.health + 25);
                this.score += 35;
                this.showSpecialEffect('🌍 Ecosystem Harmony!');
                break;
            case 'immortal':
                this.stats.health = Math.min(100, this.stats.health + 30);
                this.stats.water = Math.min(100, this.stats.water + 20);
                this.stats.sunlight = Math.min(100, this.stats.sunlight + 20);
                this.stats.nutrients = Math.min(100, this.stats.nutrients + 20);
                this.score += 50;
                this.showSpecialEffect('🌲 Ancient Wisdom!');
                break;
        }
    }
    
    showSpecialEffect(text) {
        const eventDisplay = document.getElementById('eventDisplay');
        const eventIcon = document.getElementById('eventIcon');
        const eventText = document.getElementById('eventText');
        
        eventIcon.textContent = '✨';
        eventText.textContent = text;
        eventDisplay.classList.remove('hidden');
        eventDisplay.style.background = 'rgba(76, 175, 80, 0.9)';
        
        setTimeout(() => {
            eventDisplay.classList.add('hidden');
            eventDisplay.style.background = 'rgba(255, 193, 7, 0.9)';
        }, 2000);
    }
    
    showTip() {
        if (this.tipsUsed) return;
        
        const tips = [
            "💡 Tip: Keep all stats between 40-70 for optimal growth!",
            "💡 Tip: Use Rest when Health is below 70 and other stats are safe.",
            "💡 Tip: Water drains fastest - prioritize it when low!",
            "💡 Tip: Choose Strong Roots upgrade first - it helps the most!",
            "💡 Tip: React immediately to events - they can be dangerous!",
            "💡 Tip: Higher levels have special abilities - use them wisely!"
        ];
        
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        this.currentTip = randomTip;
        
        const eventDisplay = document.getElementById('eventDisplay');
        const eventIcon = document.getElementById('eventIcon');
        const eventText = document.getElementById('eventText');
        
        eventIcon.textContent = '💡';
        eventText.textContent = randomTip;
        eventDisplay.classList.remove('hidden');
        eventDisplay.style.background = 'rgba(33, 150, 243, 0.9)';
        
        setTimeout(() => {
            eventDisplay.classList.add('hidden');
            eventDisplay.style.background = 'rgba(255, 193, 7, 0.9)';
        }, 4000);
        
        this.tipsUsed = true;
        localStorage.setItem('growOrDieTipsUsed', 'true');
    }
    
    reset() {
        this.currentLevel = 0;
        this.stats = {
            health: 100,
            water: 50,
            sunlight: 50,
            nutrients: 50
        };
        this.score = 0;
        this.turns = 0;
        this.turnsInCurrentLevel = 0;
        this.gameOver = false;
        this.won = false;
        this.eventActive = false;
        this.eventTurns = 0;
        this.currentEvent = null;
        this.specialCooldown = 0;
        this.upgrades = {
            strongRoots: 0,
            wideLeaves: 0,
            thickBark: 0
        };
    }
}

// Game Instance
let game = new GameState();

// DOM Elements
const startScreen = document.getElementById('startScreen');
const gameScreen = document.getElementById('gameScreen');
const endScreen = document.getElementById('endScreen');

// Event Listeners
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', restartGame);
const expandBtn = document.getElementById('expandBtn');
if (expandBtn) {
    expandBtn.addEventListener('click', toggleFullscreen);
}

// Action buttons
document.getElementById('waterBtn').addEventListener('click', () => game.takeTurn('water'));
document.getElementById('sunlightBtn').addEventListener('click', () => game.takeTurn('sunlight'));
document.getElementById('nutrientsBtn').addEventListener('click', () => game.takeTurn('nutrients'));
document.getElementById('restBtn').addEventListener('click', () => game.takeTurn('rest'));
document.getElementById('specialBtn').addEventListener('click', () => game.takeTurn('special'));

// Control buttons
document.getElementById('tipsBtn').addEventListener('click', () => game.showTip());
document.getElementById('restartGameBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to restart? Your progress will be lost!')) {
        restartGame();
    }
});

// Fullscreen functionality
document.getElementById('expandBtn').addEventListener('click', toggleFullscreen);

function toggleFullscreen() {
    if (!isFullscreenEnabled()) {
        requestFullscreen();
    } else {
        exitFullscreen();
    }
}

function requestFullscreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function isFullscreenEnabled() {
    return !!(document.fullscreenElement || 
              document.webkitFullscreenElement || 
              document.msFullscreenElement);
}

function updateExpandButton() {
    const expandBtn = document.getElementById('expandBtn');
    const expandIcon = document.querySelector('.expand-icon');
    
    if (isFullscreenEnabled()) {
        expandIcon.textContent = '⤡';
        expandBtn.title = 'Exit Fullscreen';
    } else {
        expandIcon.textContent = '⤢';
        expandBtn.title = 'Expand to Fullscreen';
    }
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', updateExpandButton);
document.addEventListener('webkitfullscreenchange', updateExpandButton);
document.addEventListener('msfullscreenchange', updateExpandButton);

// Upgrade buttons
document.getElementById('strongRootsBtn').addEventListener('click', () => {
    game.applyUpgrade('strongRoots');
    game.levelUp();
});
document.getElementById('wideLeavesBtn').addEventListener('click', () => {
    game.applyUpgrade('wideLeaves');
    game.levelUp();
});
document.getElementById('thickBarkBtn').addEventListener('click', () => {
    game.applyUpgrade('thickBark');
    game.levelUp();
});

// Game Functions
function startGame() {
    game.reset();
    startScreen.classList.remove('active');
    gameScreen.classList.add('active');
    game.updateUI();
    
    // Show tip for new players
    if (!game.tipsUsed) {
        setTimeout(() => {
            game.showTip();
        }, 1000);
    }
}

function restartGame() {
    game.reset();
    endScreen.classList.remove('active');
    gameScreen.classList.add('active');
    game.updateUI();
}

// Fullscreen utilities
function isFullscreenEnabled() {
    return document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement;
}

function requestFullscreen(elem) {
    if (elem.requestFullscreen) return elem.requestFullscreen();
    if (elem.webkitRequestFullscreen) return elem.webkitRequestFullscreen();
    if (elem.msRequestFullscreen) return elem.msRequestFullscreen();
}

function exitFullscreen() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
}

function toggleFullscreen() {
    if (isFullscreenEnabled()) {
        exitFullscreen();
        updateExpandButton(false);
    } else {
        requestFullscreen(document.documentElement);
        updateExpandButton(true);
    }
}

function updateExpandButton(isFullscreen) {
    const expandIcon = document.querySelector('.expand-icon');
    const expandBtn = document.getElementById('expandBtn');
    
    if (isFullscreen) {
        expandIcon.textContent = '⤡';
        expandBtn.title = 'Exit Fullscreen';
        expandBtn.setAttribute('aria-label', 'Exit Fullscreen');
    } else {
        expandIcon.textContent = '⤢';
        expandBtn.title = 'Expand to Fullscreen';
        expandBtn.setAttribute('aria-label', 'Expand Game');
    }
}

// Listen for fullscreen changes
document.addEventListener('fullscreenchange', () => {
    updateExpandButton(isFullscreenEnabled());
});

document.addEventListener('webkitfullscreenchange', () => {
    updateExpandButton(isFullscreenEnabled());
});

document.addEventListener('msfullscreenchange', () => {
    updateExpandButton(isFullscreenEnabled());
});

// Initialize game
game.updateUI();
