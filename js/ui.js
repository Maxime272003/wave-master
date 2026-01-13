// ===== UI Module =====

export class GameUI {
    constructor() {
        // Menu elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.mainMenu = document.getElementById('main-menu');
        
        // Game HUD elements
        this.gameHud = document.getElementById('game-hud');
        this.goldValue = document.getElementById('gold-value');
        this.csValue = document.getElementById('cs-value');
        this.xpValue = document.getElementById('xp-value');
        this.waveStateEl = document.getElementById('wave-state');
        this.gameTimer = document.getElementById('game-timer');
        
        // Tutorial panel
        this.tutorialPanel = document.getElementById('tutorial-panel');
        this.tutorialContent = document.getElementById('tutorial-content');
        this.tutorialStep = document.getElementById('tutorial-step');
        this.tutorialPrev = document.getElementById('tutorial-prev');
        this.tutorialNext = document.getElementById('tutorial-next');
        
        // Wave indicator
        this.waveIndicator = document.getElementById('wave-indicator');
        this.wavePositionMarker = document.getElementById('wave-position-marker');
        this.enemyMinionCount = document.getElementById('enemy-minion-count');
        this.allyMinionCount = document.getElementById('ally-minion-count');
        
        // Pause menu
        this.pauseMenu = document.getElementById('pause-menu');
        
        // Callbacks
        this.onModeSelect = null;
        this.onPause = null;
        this.onResume = null;
        this.onRestart = null;
        this.onQuit = null;
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Menu buttons
        document.querySelectorAll('.menu-btn[data-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                if (this.onModeSelect) {
                    this.onModeSelect(mode);
                }
            });
        });
        
        // HUD buttons
        document.getElementById('pause-btn').addEventListener('click', () => {
            if (this.onPause) this.onPause();
        });
        
        document.getElementById('exit-btn').addEventListener('click', () => {
            if (this.onQuit) this.onQuit();
        });
        
        // Pause menu buttons
        document.getElementById('resume-btn').addEventListener('click', () => {
            if (this.onResume) this.onResume();
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            if (this.onRestart) this.onRestart();
        });
        
        document.getElementById('quit-btn').addEventListener('click', () => {
            if (this.onQuit) this.onQuit();
        });
        
        // Tutorial navigation
        this.tutorialPrev.addEventListener('click', () => {
            if (this.onTutorialPrev) this.onTutorialPrev();
        });
        
        this.tutorialNext.addEventListener('click', () => {
            if (this.onTutorialNext) this.onTutorialNext();
        });
    }
    
    // === Screen Management ===
    
    hideLoading() {
        this.loadingScreen.classList.add('fade-out');
        setTimeout(() => {
            this.loadingScreen.classList.add('hidden');
        }, 500);
    }
    
    showMainMenu() {
        this.hideAll();
        this.mainMenu.classList.remove('hidden');
    }
    
    showGameHUD() {
        this.hideAll();
        this.gameHud.classList.remove('hidden');
    }
    
    showPauseMenu() {
        this.pauseMenu.classList.remove('hidden');
    }
    
    hidePauseMenu() {
        this.pauseMenu.classList.add('hidden');
    }
    
    hideAll() {
        this.mainMenu.classList.add('hidden');
        this.gameHud.classList.add('hidden');
        this.pauseMenu.classList.add('hidden');
        this.tutorialPanel.classList.add('hidden');
    }
    
    // === HUD Updates ===
    
    updateStats(stats) {
        this.goldValue.textContent = stats.gold;
        this.csValue.textContent = stats.cs;
        this.xpValue.textContent = stats.xp;
    }
    
    updateWaveState(state) {
        this.waveStateEl.textContent = state;
        
        // Update class for styling
        this.waveStateEl.className = 'wave-state-value';
        if (state.includes('FREEZE')) this.waveStateEl.classList.add('freeze');
        else if (state.includes('SLOW')) this.waveStateEl.classList.add('slow-push');
        else if (state.includes('FAST')) this.waveStateEl.classList.add('fast-push');
        else if (state.includes('BOUNCE')) this.waveStateEl.classList.add('bounce');
        else if (state.includes('CRASH')) this.waveStateEl.classList.add('crash');
    }
    
    updateTimer(timeMs) {
        const seconds = Math.floor(timeMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        this.gameTimer.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    updateWaveIndicator(position, counts) {
        // Position is -1 (ally tower) to 1 (enemy tower)
        // Map to 10% (top/enemy) to 90% (bottom/ally)
        const topPercent = 10 + (1 - position) * 40;
        this.wavePositionMarker.style.top = `${topPercent}%`;
        
        this.enemyMinionCount.textContent = counts.enemy;
        this.allyMinionCount.textContent = counts.ally;
    }
    
    // === Tutorial Panel ===
    
    showTutorial(content, step, totalSteps) {
        this.tutorialPanel.classList.remove('hidden');
        this.tutorialContent.innerHTML = content;
        this.tutorialStep.textContent = `${step}/${totalSteps}`;
        
        this.tutorialPrev.disabled = step === 1;
        this.tutorialNext.textContent = step === totalSteps ? 'Terminer' : 'Suivant →';
    }
    
    hideTutorial() {
        this.tutorialPanel.classList.add('hidden');
    }
    
    // === Gold Pop Effect ===
    
    showGoldPop(amount, x, y) {
        const pop = document.createElement('div');
        pop.className = 'gold-pop';
        pop.textContent = `+${amount}g`;
        pop.style.left = `${x}px`;
        pop.style.top = `${y}px`;
        
        document.body.appendChild(pop);
        
        setTimeout(() => {
            pop.remove();
        }, 1000);
    }
    
    // === Spell Cooldowns ===
    
    updateSpellCooldowns(cooldowns) {
        for (const [key, data] of Object.entries(cooldowns)) {
            const spellEl = document.getElementById(`spell-${key.toLowerCase()}`);
            const cdEl = document.getElementById(`spell-${key.toLowerCase()}-cd`);
            
            if (spellEl && cdEl) {
                if (data.ready) {
                    spellEl.classList.add('ready');
                    spellEl.classList.remove('on-cooldown');
                    cdEl.style.transform = 'scaleY(0)';
                } else {
                    spellEl.classList.remove('ready');
                    spellEl.classList.add('on-cooldown');
                    const cdPercent = 1 - (data.percent / 100);
                    cdEl.style.transform = `scaleY(${cdPercent})`;
                }
            }
        }
    }
}

