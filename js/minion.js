// ===== Minion Module =====
import * as THREE from 'three';

export class Minion {
    constructor(scene, team, type = 'melee') {
        this.scene = scene;
        this.team = team; // 'ally' or 'enemy'
        this.type = type; // 'melee', 'caster', 'cannon'
        
        this.mesh = null;
        this.healthBar = null;
        this.healthBarBg = null;
        
        this.maxHealth = this.getMaxHealth();
        this.health = this.maxHealth;
        this.damage = this.getDamage();
        this.attackRange = this.getAttackRange();
        this.collisionRadius = this.getCollisionRadius();
        this.attackSpeed = 1000; // ms between attacks
        this.lastAttackTime = 0;
        this.moveSpeed = 2;
        
        this.target = null;
        this.isDead = false;
        this.goldValue = this.getGoldValue();
        this.xpValue = this.getXPValue();
        
        this.position = new THREE.Vector3();
        
        this.createMesh();
    }
    
    getMaxHealth() {
        switch (this.type) {
            case 'melee': return 480;
            case 'caster': return 290;
            case 'cannon': return 900;
            default: return 480;
        }
    }
    
    getDamage() {
        switch (this.type) {
            case 'melee': return 12;
            case 'caster': return 23;
            case 'cannon': return 40;
            default: return 12;
        }
    }
    
    getAttackRange() {
        switch (this.type) {
            case 'melee': return 2.5;   // Corps à corps
            case 'caster': return 8;    // Attaque à distance
            case 'cannon': return 10;   // Longue portée
            default: return 2.5;
        }
    }
    
    getCollisionRadius() {
        switch (this.type) {
            case 'melee': return 2.0;
            case 'caster': return 1.8;
            case 'cannon': return 2.5;
            default: return 2.0;
        }
    }
    
    getGoldValue() {
        switch (this.type) {
            case 'melee': return 21;
            case 'caster': return 14;
            case 'cannon': return 60;
            default: return 21;
        }
    }
    
    getXPValue() {
        switch (this.type) {
            case 'melee': return 30;
            case 'caster': return 30;
            case 'cannon': return 93;
            default: return 30;
        }
    }
    
    createMesh() {
        // Different geometries for different minion types
        let geometry;
        let size = 1;
        
        switch (this.type) {
            case 'melee':
                geometry = new THREE.BoxGeometry(1.2, 1.4, 1.2); // Original size
                size = 1;
                break;
            case 'caster':
                geometry = new THREE.ConeGeometry(0.7, 1.2, 6); // Original size
                size = 0.9;
                break;
            case 'cannon':
                geometry = new THREE.CylinderGeometry(0.8, 1.0, 1.8, 8); // Original size
                size = 1.4;
                break;
            default:
                geometry = new THREE.BoxGeometry(1.2, 1.4, 1.2);
        }
        
        // Team-based colors
        const color = this.team === 'ally' ? 0x3b82f6 : 0xef4444;
        const emissive = this.team === 'ally' ? 0x1d4ed8 : 0xb91c1c;
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: emissive,
            emissiveIntensity: 0.2,
            roughness: 0.5,
            metalness: 0.3
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        this.mesh.scale.setScalar(size);
        
        // Store reference to this minion on the mesh
        this.mesh.userData.minion = this;
        
        // Create health bar
        this.createHealthBar();
        
        this.scene.add(this.mesh);
    }
    
    createHealthBar() {
        // Background
        const bgGeometry = new THREE.PlaneGeometry(1.2, 0.15);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x1a1a1a,
            side: THREE.DoubleSide
        });
        this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
        
        // Health fill
        const fillGeometry = new THREE.PlaneGeometry(1.1, 0.1);
        const fillColor = this.team === 'ally' ? 0x22c55e : 0xef4444;
        const fillMaterial = new THREE.MeshBasicMaterial({ 
            color: fillColor,
            side: THREE.DoubleSide
        });
        this.healthBar = new THREE.Mesh(fillGeometry, fillMaterial);
        this.healthBar.position.z = 0.01;
        
        this.healthBarBg.add(this.healthBar);
        this.scene.add(this.healthBarBg);
    }
    
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        if (this.mesh) {
            this.mesh.position.set(x, y + 0.6, z);
        }
        this.updateHealthBarPosition();
    }
    
    updateHealthBarPosition() {
        if (this.healthBarBg && this.mesh) {
            this.healthBarBg.position.set(
                this.mesh.position.x,
                this.mesh.position.y + 1.5,
                this.mesh.position.z
            );
            this.healthBarBg.lookAt(
                this.mesh.position.x,
                this.mesh.position.y + 100,
                this.mesh.position.z + 100
            );
        }
    }
    
    updateHealthBar() {
        if (this.healthBar) {
            const healthPercent = this.health / this.maxHealth;
            this.healthBar.scale.x = Math.max(0, healthPercent);
            this.healthBar.position.x = -(1.1 * (1 - healthPercent)) / 2;
        }
    }
    
    takeDamage(amount, attacker = null) {
        if (this.isDead) return false;
        
        this.health -= amount;
        this.updateHealthBar();
        
        // Flash effect
        if (this.mesh) {
            const originalColor = this.mesh.material.emissive.getHex();
            this.mesh.material.emissive.setHex(0xffffff);
            setTimeout(() => {
                if (this.mesh && this.mesh.material) {
                    this.mesh.material.emissive.setHex(originalColor);
                }
            }, 100);
        }
        
        if (this.health <= 0) {
            this.die(attacker);
            return true;
        }
        return false;
    }
    
    die(killer = null) {
        this.isDead = true;
        
        // Death animation
        if (this.mesh) {
            const startY = this.mesh.position.y;
            const animateDeath = () => {
                if (this.mesh) {
                    this.mesh.scale.multiplyScalar(0.9);
                    this.mesh.position.y -= 0.1;
                    this.mesh.material.opacity = Math.max(0, this.mesh.material.opacity - 0.1);
                    
                    if (this.mesh.scale.x > 0.1) {
                        requestAnimationFrame(animateDeath);
                    } else {
                        this.cleanup();
                    }
                }
            };
            this.mesh.material.transparent = true;
            animateDeath();
        }
        
        return { gold: this.goldValue, xp: this.xpValue };
    }
    
    cleanup() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }
        if (this.healthBarBg) {
            this.scene.remove(this.healthBarBg);
            this.healthBarBg.geometry.dispose();
            this.healthBarBg.material.dispose();
            this.healthBar.geometry.dispose();
            this.healthBar.material.dispose();
            this.healthBarBg = null;
            this.healthBar = null;
        }
    }
    
    findTarget(enemies) {
        if (this.isDead) return null;
        
        let closestEnemy = null;
        let closestDistance = Infinity;
        
        for (const enemy of enemies) {
            if (enemy.isDead) continue;
            const distance = this.position.distanceTo(enemy.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        }
        
        return closestEnemy;
    }
    
    update(deltaTime, enemies, currentTime) {
        if (this.isDead) return;
        
        // Find target
        this.target = this.findTarget(enemies);
        
        if (this.target) {
            const distance = this.position.distanceTo(this.target.position);
            
            if (distance <= this.attackRange) {
                // Attack
                if (currentTime - this.lastAttackTime >= this.attackSpeed) {
                    this.attack(this.target);
                    this.lastAttackTime = currentTime;
                }
            } else {
                // Move towards target
                this.moveTowards(this.target.position, deltaTime);
            }
        } else {
            // Move towards enemy base
            const targetZ = this.team === 'ally' ? 40 : -40;
            const targetPos = new THREE.Vector3(0, 0, targetZ);
            this.moveTowards(targetPos, deltaTime);
        }
        
        this.updateHealthBarPosition();
    }
    
    moveTowards(targetPosition, deltaTime) {
        const direction = new THREE.Vector3();
        direction.subVectors(targetPosition, this.position);
        direction.y = 0;
        direction.normalize();
        
        const movement = direction.multiplyScalar(this.moveSpeed * deltaTime);
        this.position.add(movement);
        
        if (this.mesh) {
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
            
            // Face movement direction
            if (direction.length() > 0.01) {
                this.mesh.lookAt(
                    this.mesh.position.x + direction.x,
                    this.mesh.position.y,
                    this.mesh.position.z + direction.z
                );
            }
        }
    }
    
    attack(target) {
        if (target && !target.isDead) {
            target.takeDamage(this.damage, this);
            
            // Visual attack effect - different for ranged vs melee
            if (this.mesh) {
                if (this.type === 'melee') {
                    // Melee: scale pulse
                    this.mesh.scale.setScalar(1.2);
                    setTimeout(() => {
                        if (this.mesh) {
                            this.mesh.scale.setScalar(1);
                        }
                    }, 100);
                } else {
                    // Ranged: create projectile effect
                    this.createProjectile(target);
                }
            }
        }
    }
    
    createProjectile(target) {
        // Create a simple projectile that travels to target
        const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const projectileColor = this.team === 'ally' ? 0x60a5fa : 0xf87171;
        const projectileMaterial = new THREE.MeshBasicMaterial({ 
            color: projectileColor,
            emissive: projectileColor,
            emissiveIntensity: 1
        });
        
        const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
        projectile.position.copy(this.mesh.position);
        this.scene.add(projectile);
        
        // Animate projectile
        const startPos = projectile.position.clone();
        const endPos = target.mesh ? target.mesh.position.clone() : target.position.clone();
        const duration = 200; // ms
        const startTime = performance.now();
        
        const animateProjectile = () => {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            projectile.position.lerpVectors(startPos, endPos, progress);
            
            if (progress < 1) {
                requestAnimationFrame(animateProjectile);
            } else {
                // Remove projectile
                this.scene.remove(projectile);
                projectileGeometry.dispose();
                projectileMaterial.dispose();
            }
        };
        
        animateProjectile();
    }
    
    isLowHealth() {
        return this.health / this.maxHealth < 0.3;
    }
    
    getPosition() {
        return this.position.clone();
    }
}
