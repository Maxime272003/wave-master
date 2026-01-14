import * as THREE from 'three';

export class DodgeManager {
    constructor(scene, champion, ui) {
        this.scene = scene;
        this.champion = champion;
        this.ui = ui;
        
        this.isActive = false;
        this.startTime = 0;
        this.gameTime = 0;
        this.score = 0;
        this.highScore = localStorage.getItem('waveMaster_dodgeHighScore') || 0;
        
        this.projectiles = [];
        this.lastSpawnTime = 0;
        this.difficultyLevel = 1;
        
        // Settings
        this.spawnRate = 1000; // ms
        this.projectileSpeed = 10;
        
        this.onGameOver = null;
    }
    
    start() {
        this.isActive = true;
        this.startTime = performance.now();
        this.gameTime = 0;
        this.score = 0;
        this.projectiles = [];
        this.difficultyLevel = 1;
        this.spawnRate = 1500;
        this.spawnRate = 1500;
        this.projectileSpeed = 8;
        this.lastSpawnTime = -3000; // Allow immediate spawn
        
        // Reset champion position
        this.champion.reset();
        this.champion.setPosition(0, 0);
        
        // Show dodge UI (can reuse existing HUD or modify it)
        this.ui.updateWaveState('DODGE: 0s');
    }
    
    stop() {
        this.isActive = false;
        this.clearProjectiles();
    }
    
    update(deltaTime, currentTime) {
        if (!this.isActive) return;
        
        // Accumulate time using delta (currentTime passed from main.js is gameTime, but relying on delta is safer)
        this.gameTime += deltaTime * 1000;
        this.score = Math.floor(this.gameTime / 1000);
        
        // Update Difficulty
        this.updateDifficulty();
        
        // Spawn Projectiles
        if (currentTime - this.lastSpawnTime > this.spawnRate) {
            this.spawnProjectile();
            this.lastSpawnTime = currentTime;
        }
        
        // Update Projectiles
        this.updateProjectiles(deltaTime);
        
        // Check Collisions
        this.checkCollisions();
        
        // Update UI
        this.ui.updateWaveState(`SURVIE: ${this.score}s`);
    }
    
    updateDifficulty() {
        // Increase difficulty every 5 seconds (was 10)
        const newLevel = 1 + Math.floor(this.score / 5);
        
        if (newLevel > this.difficultyLevel) {
            this.difficultyLevel = newLevel;
            
            // Make it harder faster
            // Spawn rate decreases (min 150ms)
            this.spawnRate = Math.max(150, 1500 - (this.difficultyLevel * 150));
            
            // Speed increases linearly
            this.projectileSpeed = 8 + (this.difficultyLevel * 2);
            
            // Visual feedback
            this.ui.updateWaveState(`NIVEAU ${this.difficultyLevel}!`);
        }
    }
    
    spawnProjectile() {
        // Spawn from random edge
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        const spawnDist = 20;
        let startPos, targetPos;
        
        switch(side) {
            case 0: // Top
                startPos = new THREE.Vector3(
                    (Math.random() - 0.5) * 20, 
                    1, 
                    -spawnDist
                );
                break;
            case 1: // Right
                startPos = new THREE.Vector3(
                    spawnDist, 
                    1, 
                    (Math.random() - 0.5) * 40
                );
                break;
            case 2: // Bottom
                startPos = new THREE.Vector3(
                    (Math.random() - 0.5) * 20, 
                    1, 
                    spawnDist
                );
                break;
            case 3: // Left
                startPos = new THREE.Vector3(
                    -spawnDist, 
                    1, 
                    (Math.random() - 0.5) * 40
                );
                break;
        }
        
        // Target player position (with some prediction or just current pos)
        targetPos = this.champion.getPosition();
        
        // Direction
        const direction = new THREE.Vector3().subVectors(targetPos, startPos).normalize();
        direction.y = 0;
        
        // Create Mesh
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(startPos);
        
        this.scene.add(mesh);
        
        this.projectiles.push({
            mesh: mesh,
            direction: direction,
            speed: this.projectileSpeed
        });
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            
            // Move
            const moveAmt = proj.direction.clone().multiplyScalar(proj.speed * deltaTime);
            proj.mesh.position.add(moveAmt);
            
            // Remove if too far
            if (proj.mesh.position.length() > 40) {
                this.scene.remove(proj.mesh);
                proj.mesh.geometry.dispose();
                proj.mesh.material.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    checkCollisions() {
        const playerPos = this.champion.getPosition();
        const hitRadius = 0.8; // Player radius approx
        
        for (const proj of this.projectiles) {
            const dist = proj.mesh.position.distanceTo(playerPos);
            
            if (dist < hitRadius + 0.5) { // + projectile radius
                this.gameOver();
                break;
            }
        }
    }
    
    gameOver() {
        this.isActive = false;
        
        // Handle High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('waveMaster_dodgeHighScore', this.highScore);
        }
        
        // Handle Leaderboard
        let leaderboard = JSON.parse(localStorage.getItem('waveMaster_dodgeLeaderboard') || '[]');
        
        // Add new score
        leaderboard.push({
            score: this.score,
            date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()
        });
        
        // Sort descending
        leaderboard.sort((a, b) => b.score - a.score);
        
        // Keep top 5
        leaderboard = leaderboard.slice(0, 5);
        
        // Save
        localStorage.setItem('waveMaster_dodgeLeaderboard', JSON.stringify(leaderboard));
        
        // Callback to main
        if (this.onGameOver) {
            this.onGameOver(this.score, this.highScore, leaderboard);
        }
    }
    
    clearProjectiles() {
        for (const proj of this.projectiles) {
            this.scene.remove(proj.mesh);
            if (proj.mesh.geometry) proj.mesh.geometry.dispose();
            if (proj.mesh.material) proj.mesh.material.dispose();
        }
        this.projectiles = [];
    }
}
