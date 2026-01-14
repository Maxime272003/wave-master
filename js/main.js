// ===== Wave Master - Main Entry Point =====
import { GameScene } from './scene.js';
import { WaveManager, WaveState } from './wave.js';
import { Champion } from './champion.js';
import { GameUI } from './ui.js';
import { TUTORIAL_STEPS } from './scenarios.js';

class WaveMasterGame {
    constructor() {
        this.gameScene = null;
        this.waveManager = null;
        this.champion = null;
        this.ui = null;
        
        this.gameState = 'loading'; // loading, menu, playing, paused
        this.gameMode = null; // tutorial, freeplay
        
        this.gameTime = 0;
        this.lastTime = 0;
        this.isPaused = false;
        
        this.tutorialStep = 0;
        
        this.init();
    }
    
    async init() {
        // Initialize UI first
        this.ui = new GameUI();
        this.setupUICallbacks();
        
        // Initialize Three.js scene
        const container = document.getElementById('game-canvas');
        this.gameScene = new GameScene(container);
        
        // Initialize wave manager
        this.waveManager = new WaveManager(this.gameScene.getScene());
        this.waveManager.onWaveStateChange = (state) => this.onWaveStateChange(state);
        
        // Initialize champion
        this.champion = new Champion(
            this.gameScene.getScene(),
            this.gameScene.getCamera()
        );
        this.champion.onRequestLowestHealthAttack = () => this.attackLowestHealth();
        this.champion.onSpellUpdate = (cooldowns) => this.ui.updateSpellCooldowns(cooldowns);
        this.champion.onAOEDamage = (damage, range) => this.handleAOEDamage(damage, range);
        this.champion.onProjectileHit = (pos, damage) => this.handleProjectileHit(pos, damage);
        this.champion.onNuclearBomb = () => this.handleNuclearBomb();
        
        // Simulate loading
        await this.simulateLoading();
        
        // Show main menu
        this.ui.hideLoading();
        this.ui.showMainMenu();
        this.gameState = 'menu';
        
        // Start render loop
        this.animate();
    }
    
    async simulateLoading() {
        return new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setupUICallbacks() {
        this.ui.onModeSelect = (mode) => this.startMode(mode);
        this.ui.onPause = () => this.pause();
        this.ui.onResume = () => this.resume();
        this.ui.onRestart = () => this.restart();
        this.ui.onQuit = () => this.quit();
        this.ui.onTutorialPrev = () => this.tutorialPrevious();
        this.ui.onTutorialNext = () => this.tutorialNext();
    }
    
    startMode(mode) {
        this.gameMode = mode;
        
        switch (mode) {
            case 'tutorial':
                this.startTutorial();
                break;
            case 'freeplay':
                this.startFreeplay();
                break;
        }
    }
    
    startTutorial() {
        this.gameState = 'playing';
        this.tutorialStep = 0;
        
        this.ui.showGameHUD();
        this.showTutorialStep(0);
        
        this.resetGame();
        this.waveManager.setWaveInterval(20000);
        this.waveManager.forceSpawnWave();
    }
    
    showTutorialStep(step) {
        if (step >= 0 && step < TUTORIAL_STEPS.length) {
            const tutorialData = TUTORIAL_STEPS[step];
            this.ui.showTutorial(
                `<h3>${tutorialData.title}</h3>${tutorialData.content}`,
                step + 1,
                TUTORIAL_STEPS.length
            );
        }
    }
    
    tutorialPrevious() {
        if (this.tutorialStep > 0) {
            this.tutorialStep--;
            this.showTutorialStep(this.tutorialStep);
        }
    }
    
    tutorialNext() {
        if (this.tutorialStep < TUTORIAL_STEPS.length - 1) {
            this.tutorialStep++;
            this.showTutorialStep(this.tutorialStep);
        } else {
            // End tutorial
            this.ui.hideTutorial();
            this.gameMode = 'freeplay';
        }
    }
    
    startFreeplay() {
        this.gameState = 'playing';
        this.ui.showGameHUD();
        
        this.resetGame();
        this.waveManager.setWaveInterval(15000); // 15 seconds between waves in freeplay
        this.waveManager.forceSpawnWave();
    }
    
    resetGame() {
        this.gameTime = 0;
        this.lastTime = performance.now();
        this.isPaused = false;
        
        this.waveManager.clearAllMinions();
        this.waveManager.waveNumber = 0;
        this.waveManager.lastWaveTime = -30000;
        
        this.champion.reset();
        
        this.ui.updateStats({ gold: 0, cs: 0, xp: 0 });
        this.ui.updateWaveState(WaveState.EVEN);
        this.ui.updateTimer(0);
    }
    
    pause() {
        if (this.gameState === 'playing') {
            this.isPaused = true;
            this.gameState = 'paused';
            this.ui.showPauseMenu();
        }
    }
    
    resume() {
        if (this.gameState === 'paused') {
            this.isPaused = false;
            this.gameState = 'playing';
            this.lastTime = performance.now();
            this.ui.hidePauseMenu();
        }
    }
    
    restart() {
        this.ui.hidePauseMenu();
        
        if (this.gameMode === 'tutorial') {
            this.startTutorial();
        } else {
            this.startFreeplay();
        }
    }
    
    quit() {
        this.gameState = 'menu';
        this.isPaused = false;
        this.waveManager.clearAllMinions();
        this.ui.showMainMenu();
    }
    
    onWaveStateChange(state) {
        this.ui.updateWaveState(state);
    }
    
    attackLowestHealth() {
        const lowest = this.waveManager.getLowestHealthEnemy();
        if (lowest) {
            const result = this.champion.tryAttack(lowest, this.gameTime);
            if (result) {
                this.showGoldPopAt(lowest);
            }
        }
    }
    
    handleAOEDamage(damage, range) {
        const enemies = this.waveManager.getEnemyMinions();
        const championPos = this.champion.getPosition();
        
        for (const minion of enemies) {
            const distance = championPos.distanceTo(minion.position);
            if (distance <= range) {
                const killed = minion.takeDamage(damage, 'player');
                if (killed) {
                    this.champion.onMinionKill(minion);
                    this.showGoldPopAt(minion);
                }
            }
        }
    }
    
    handleProjectileHit(projectilePos, damage) {
        const enemies = this.waveManager.getEnemyMinions();
        const hitRadius = 1.5; // Projectile hit detection radius
        
        for (const minion of enemies) {
            const distance = projectilePos.distanceTo(minion.position);
            if (distance <= hitRadius + minion.collisionRadius) {
                const killed = minion.takeDamage(damage, 'player');
                if (killed) {
                    this.champion.onMinionKill(minion);
                    this.showGoldPopAt(minion);
                }
                return true; // Hit something
            }
        }
        return false; // No hit
    }
    
    handleNuclearBomb() {
        // Kill ALL minions - allies and enemies
        const allMinions = this.waveManager.getAllMinions();
        
        for (const minion of allMinions) {
            if (!minion.isDead) {
                // Enemy minions give gold
                if (minion.team === 'enemy') {
                    this.champion.onMinionKill(minion);
                    this.showGoldPopAt(minion);
                }
                minion.takeDamage(9999, 'player');
            }
        }
    }
    
    showGoldPopAt(minion) {
        if (!minion.mesh) return;
        
        // Project 3D position to screen
        const vector = minion.mesh.position.clone();
        vector.project(this.gameScene.getCamera());
        
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        
        this.ui.showGoldPop(minion.goldValue, x, y);
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing' || this.isPaused) return;
        
        this.gameTime += deltaTime * 1000;
        
        // Update wave manager
        this.waveManager.update(deltaTime, this.gameTime);
        
        // Update champion
        const allMinions = this.waveManager.getAllMinions();
        this.champion.update(deltaTime, this.gameTime, allMinions);
        
        // Update UI
        this.ui.updateStats(this.champion.getStats());
        this.ui.updateTimer(this.gameTime);
        this.ui.updateWaveIndicator(
            this.waveManager.getWavePosition(),
            this.waveManager.getMinionCounts()
        );
        
        // Update camera to follow champion
        this.gameScene.updateCameraFollow(this.champion.getPosition());
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const now = performance.now();
        const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        
        this.update(deltaTime);
        this.gameScene.render();
    }
}

// Keyboard shortcut for pause
document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
        if (window.game && window.game.gameState === 'playing') {
            window.game.pause();
        } else if (window.game && window.game.gameState === 'paused') {
            window.game.resume();
        }
    }
});

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new WaveMasterGame();
});
