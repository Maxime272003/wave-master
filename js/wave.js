// ===== Wave Management Module =====
import { Minion } from './minion.js';

export const WaveState = {
    EVEN: 'EVEN',
    FREEZE_ALLY: 'FREEZE (ALLY)',
    FREEZE_ENEMY: 'FREEZE (ENEMY)',
    SLOW_PUSH_ALLY: 'SLOW PUSH →',
    SLOW_PUSH_ENEMY: '← SLOW PUSH',
    FAST_PUSH_ALLY: 'FAST PUSH →→',
    FAST_PUSH_ENEMY: '←← FAST PUSH',
    BOUNCE: 'BOUNCE',
    CRASH_ALLY: 'CRASH →',
    CRASH_ENEMY: '← CRASH'
};

export class WaveManager {
    constructor(scene) {
        this.scene = scene;
        this.allyMinions = [];
        this.enemyMinions = [];
        
        this.waveNumber = 0;
        this.lastWaveTime = 0;
        this.waveInterval = 30000; // 30 seconds between waves
        this.gameTime = 0;
        
        this.currentWaveState = WaveState.EVEN;
        this.wavePosition = 0; // -1 = ally tower, 0 = middle, 1 = enemy tower
        
        // Spawn positions
        this.allySpawnZ = -45;
        this.enemySpawnZ = 45;
        this.allyTowerZ = -35;
        this.enemyTowerZ = 35;
        
        // Callbacks
        this.onMinionDeath = null;
        this.onWaveStateChange = null;
    }
    
    spawnWave() {
        this.waveNumber++;
        
        // Standard wave composition: 3 melee + 3 caster
        // Every 3rd wave adds a cannon
        const hasCannon = this.waveNumber % 3 === 0;
        
        // Spawn ally minions
        this.spawnMinionGroup('ally', hasCannon);
        
        // Spawn enemy minions
        this.spawnMinionGroup('enemy', hasCannon);
        
        console.log(`Wave ${this.waveNumber} spawned`);
    }
    
    spawnMinionGroup(team, hasCannon) {
        const spawnZ = team === 'ally' ? this.allySpawnZ : this.enemySpawnZ;
        const minions = team === 'ally' ? this.allyMinions : this.enemyMinions;
        
        // Spawn 3 melee minions
        for (let i = 0; i < 3; i++) {
            const minion = new Minion(this.scene, team, 'melee');
            const xOffset = (i - 1) * 1.5;
            minion.setPosition(xOffset, 0, spawnZ);
            minions.push(minion);
        }
        
        // Spawn 3 caster minions (slightly behind)
        for (let i = 0; i < 3; i++) {
            const minion = new Minion(this.scene, team, 'caster');
            const xOffset = (i - 1) * 1.5;
            const zOffset = team === 'ally' ? -3 : 3;
            minion.setPosition(xOffset, 0, spawnZ + zOffset);
            minions.push(minion);
        }
        
        // Spawn cannon if applicable
        if (hasCannon) {
            const cannon = new Minion(this.scene, team, 'cannon');
            const zOffset = team === 'ally' ? -5 : 5;
            cannon.setPosition(0, 0, spawnZ + zOffset);
            minions.push(cannon);
        }
    }
    
    update(deltaTime, currentTime) {
        this.gameTime = currentTime;
        
        // Check for wave spawn
        if (currentTime - this.lastWaveTime >= this.waveInterval) {
            this.spawnWave();
            this.lastWaveTime = currentTime;
        }
        
        // Update all minions
        this.updateMinions(deltaTime, currentTime);
        
        // Clean up dead minions
        this.cleanupDeadMinions();
        
        // Calculate wave state
        this.calculateWaveState();
        
        // Check for tower crashes
        this.checkTowerCrash();
    }
    
    updateMinions(deltaTime, currentTime) {
        // Update ally minions
        for (const minion of this.allyMinions) {
            if (!minion.isDead) {
                minion.update(deltaTime, this.enemyMinions, currentTime);
            }
        }
        
        // Update enemy minions
        for (const minion of this.enemyMinions) {
            if (!minion.isDead) {
                minion.update(deltaTime, this.allyMinions, currentTime);
            }
        }
    }
    
    cleanupDeadMinions() {
        this.allyMinions = this.allyMinions.filter(m => !m.isDead || m.mesh);
        this.enemyMinions = this.enemyMinions.filter(m => !m.isDead || m.mesh);
    }
    
    calculateWaveState() {
        const aliveAllyCount = this.allyMinions.filter(m => !m.isDead).length;
        const aliveEnemyCount = this.enemyMinions.filter(m => !m.isDead).length;
        
        // Calculate average position
        let avgAllyZ = 0;
        let avgEnemyZ = 0;
        let allyPositionCount = 0;
        let enemyPositionCount = 0;
        
        for (const minion of this.allyMinions) {
            if (!minion.isDead) {
                avgAllyZ += minion.position.z;
                allyPositionCount++;
            }
        }
        
        for (const minion of this.enemyMinions) {
            if (!minion.isDead) {
                avgEnemyZ += minion.position.z;
                enemyPositionCount++;
            }
        }
        
        if (allyPositionCount > 0) avgAllyZ /= allyPositionCount;
        if (enemyPositionCount > 0) avgEnemyZ /= enemyPositionCount;
        
        // Average wave position
        const avgZ = (allyPositionCount > 0 || enemyPositionCount > 0) 
            ? (avgAllyZ + avgEnemyZ) / 2 
            : 0;
        
        // Normalize to -1 (ally tower) to 1 (enemy tower)
        this.wavePosition = avgZ / 40;
        
        const diff = aliveEnemyCount - aliveAllyCount;
        const prevState = this.currentWaveState;
        
        // Determine wave state based on position and minion advantage
        if (Math.abs(diff) <= 1 && Math.abs(avgZ) < 10) {
            this.currentWaveState = WaveState.EVEN;
        } else if (avgZ < this.allyTowerZ + 10 && diff >= 3) {
            // Near ally tower with enemy advantage = freeze for ally
            this.currentWaveState = WaveState.FREEZE_ALLY;
        } else if (avgZ > this.enemyTowerZ - 10 && diff <= -3) {
            // Near enemy tower with ally advantage = freeze for enemy
            this.currentWaveState = WaveState.FREEZE_ENEMY;
        } else if (diff >= 4) {
            this.currentWaveState = WaveState.FAST_PUSH_ENEMY;
        } else if (diff <= -4) {
            this.currentWaveState = WaveState.FAST_PUSH_ALLY;
        } else if (diff >= 2) {
            this.currentWaveState = WaveState.SLOW_PUSH_ENEMY;
        } else if (diff <= -2) {
            this.currentWaveState = WaveState.SLOW_PUSH_ALLY;
        } else if (avgZ < this.allyTowerZ + 5) {
            this.currentWaveState = WaveState.CRASH_ENEMY;
        } else if (avgZ > this.enemyTowerZ - 5) {
            this.currentWaveState = WaveState.CRASH_ALLY;
        }
        
        // Notify on state change
        if (prevState !== this.currentWaveState && this.onWaveStateChange) {
            this.onWaveStateChange(this.currentWaveState);
        }
    }
    
    checkTowerCrash() {
        const towerDamage = 200;
        const towerAttackSpeed = 1000; // ms between attacks
        const minionTowerDamage = 5; // damage minions deal to tower
        
        // Initialize tower attack timers if needed
        if (!this.allyTowerLastAttack) this.allyTowerLastAttack = 0;
        if (!this.enemyTowerLastAttack) this.enemyTowerLastAttack = 0;
        
        // Ally tower attacks enemy minions in range
        const enemiesNearAllyTower = this.enemyMinions.filter(
            m => !m.isDead && m.position.z < this.allyTowerZ + 8
        );
        
        if (enemiesNearAllyTower.length > 0 && this.gameTime - this.allyTowerLastAttack >= towerAttackSpeed) {
            // Attack the closest enemy minion
            const target = enemiesNearAllyTower.reduce((closest, m) => {
                return m.position.z < closest.position.z ? m : closest;
            });
            target.takeDamage(towerDamage);
            this.allyTowerLastAttack = this.gameTime;
            this.createTowerAttackEffect(-40, target.position);
        }
        
        // Enemy tower attacks ally minions in range
        const alliesNearEnemyTower = this.allyMinions.filter(
            m => !m.isDead && m.position.z > this.enemyTowerZ - 8
        );
        
        if (alliesNearEnemyTower.length > 0 && this.gameTime - this.enemyTowerLastAttack >= towerAttackSpeed) {
            // Attack the closest ally minion
            const target = alliesNearEnemyTower.reduce((closest, m) => {
                return m.position.z > closest.position.z ? m : closest;
            });
            target.takeDamage(towerDamage);
            this.enemyTowerLastAttack = this.gameTime;
            this.createTowerAttackEffect(40, target.position);
        }
        
        // Minions attack tower if no enemy minions nearby
        for (const minion of this.enemyMinions) {
            if (!minion.isDead && minion.position.z < this.allyTowerZ + 5) {
                // Enemy minion reached ally tower - stop and attack tower
                minion.isAttackingTower = true;
            }
        }
        
        for (const minion of this.allyMinions) {
            if (!minion.isDead && minion.position.z > this.enemyTowerZ - 5) {
                // Ally minion reached enemy tower - stop and attack tower
                minion.isAttackingTower = true;
            }
        }
    }
    
    createTowerAttackEffect(towerZ, targetPos) {
        // Simple tower shot effect (line from tower to target)
        const material = new THREE.LineBasicMaterial({ 
            color: towerZ < 0 ? 0x3b82f6 : 0xef4444,
            transparent: true,
            opacity: 1
        });
        
        const points = [
            new THREE.Vector3(0, 8, towerZ),
            new THREE.Vector3(targetPos.x, 1, targetPos.z)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        // Fade out and remove
        let opacity = 1;
        const fade = () => {
            opacity -= 0.1;
            line.material.opacity = opacity;
            if (opacity > 0) {
                requestAnimationFrame(fade);
            } else {
                this.scene.remove(line);
                geometry.dispose();
                material.dispose();
            }
        };
        fade();
    }
    
    getWaveState() {
        return this.currentWaveState;
    }
    
    getWavePosition() {
        return this.wavePosition;
    }
    
    getMinionCounts() {
        return {
            ally: this.allyMinions.filter(m => !m.isDead).length,
            enemy: this.enemyMinions.filter(m => !m.isDead).length
        };
    }
    
    getAllMinions() {
        return [...this.allyMinions, ...this.enemyMinions].filter(m => !m.isDead);
    }
    
    getEnemyMinions() {
        return this.enemyMinions.filter(m => !m.isDead);
    }
    
    getAllyMinions() {
        return this.allyMinions.filter(m => !m.isDead);
    }
    
    // Player attacks a minion
    playerAttackMinion(minion, damage) {
        if (minion && !minion.isDead) {
            const killed = minion.takeDamage(damage, 'player');
            if (killed && this.onMinionDeath) {
                return { gold: minion.goldValue, xp: minion.xpValue };
            }
        }
        return null;
    }
    
    // Get the lowest health enemy minion (for last hitting)
    getLowestHealthEnemy() {
        let lowest = null;
        let lowestHealth = Infinity;
        
        for (const minion of this.enemyMinions) {
            if (!minion.isDead && minion.health < lowestHealth) {
                lowestHealth = minion.health;
                lowest = minion;
            }
        }
        
        return lowest;
    }
    
    // Force spawn a wave immediately
    forceSpawnWave() {
        this.spawnWave();
        this.lastWaveTime = this.gameTime;
    }
    
    // Set wave spawn interval
    setWaveInterval(intervalMs) {
        this.waveInterval = intervalMs;
    }
    
    // Clear all minions
    clearAllMinions() {
        for (const minion of [...this.allyMinions, ...this.enemyMinions]) {
            minion.cleanup();
        }
        this.allyMinions = [];
        this.enemyMinions = [];
    }
    
    // Set specific wave state for scenarios
    setupScenarioWave(allyCount, enemyCount, position = 0) {
        this.clearAllMinions();
        
        // Spawn ally minions
        for (let i = 0; i < allyCount; i++) {
            const type = i < Math.ceil(allyCount / 2) ? 'melee' : 'caster';
            const minion = new Minion(this.scene, 'ally', type);
            const xOffset = (i % 3 - 1) * 1.5;
            const zOffset = Math.floor(i / 3) * -2;
            minion.setPosition(xOffset, 0, position * 30 + zOffset);
            this.allyMinions.push(minion);
        }
        
        // Spawn enemy minions
        for (let i = 0; i < enemyCount; i++) {
            const type = i < Math.ceil(enemyCount / 2) ? 'melee' : 'caster';
            const minion = new Minion(this.scene, 'enemy', type);
            const xOffset = (i % 3 - 1) * 1.5;
            const zOffset = Math.floor(i / 3) * 2;
            minion.setPosition(xOffset, 0, position * 30 + zOffset + 5);
            this.enemyMinions.push(minion);
        }
    }
}
