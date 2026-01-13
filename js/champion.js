// ===== Champion Controller Module =====
import * as THREE from 'three';

export class Champion {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        this.mesh = null;
        this.position = new THREE.Vector3(0, 0, -20);
        
        this.moveSpeed = 8;
        this.attackDamage = 65;
        this.attackRange = 5;
        this.attackCooldown = 600; // ms
        this.lastAttackTime = 0;
        
        this.gold = 0;
        this.xp = 0;
        this.cs = 0;
        this.combo = 0;
        this.maxCombo = 0;
        
        // Right-click movement
        this.moveTarget = null;
        this.isMoving = false;
        
        this.isAttacking = false;
        this.targetMinion = null;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Attack indicator
        this.attackIndicator = null;
        this.moveIndicator = null;
        
        // Spells
        this.spells = {
            A: {
                name: 'Frappe Puissante',
                damage: 150,
                cooldown: 8000,
                lastUsed: -10000,
                range: 4,
                icon: '⚔️'
            },
            Z: {
                name: 'Onde de Choc',
                damage: 80,
                cooldown: 12000,
                lastUsed: -15000,
                range: 8,
                aoe: true,
                icon: '💫'
            },
            E: {
                name: 'Sprint',
                duration: 2000,
                cooldown: 15000,
                lastUsed: -20000,
                speedBoost: 2,
                icon: '💨'
            }
        };
        
        this.isSprinting = false;
        this.sprintEndTime = 0;
        
        // Callback for spell UI updates
        this.onSpellUpdate = null;
        
        this.createMesh();
        this.setupControls();
    }
    
    createMesh() {
        // Champion body
        const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 8, 16);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0x6d28d9,
            emissiveIntensity: 0.3,
            roughness: 0.4,
            metalness: 0.6
        });
        
        this.mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.mesh.castShadow = true;
        this.mesh.position.set(0, 1, -20);
        this.scene.add(this.mesh);
        
        // Attack range indicator (circle on ground)
        const rangeGeometry = new THREE.RingGeometry(this.attackRange - 0.1, this.attackRange, 32);
        const rangeMaterial = new THREE.MeshBasicMaterial({
            color: 0x8b5cf6,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        this.rangeIndicator = new THREE.Mesh(rangeGeometry, rangeMaterial);
        this.rangeIndicator.rotation.x = -Math.PI / 2;
        this.rangeIndicator.position.y = 0.05;
        this.mesh.add(this.rangeIndicator);
        
        // Champion glow
        const glowLight = new THREE.PointLight(0x8b5cf6, 1, 5);
        glowLight.position.set(0, 1, 0);
        this.mesh.add(glowLight);
        
        // Attack indicator (line to target)
        const attackMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            transparent: true,
            opacity: 0.5
        });
        const attackGeometry = new THREE.BufferGeometry();
        this.attackIndicator = new THREE.Line(attackGeometry, attackMaterial);
        this.attackIndicator.visible = false;
        this.scene.add(this.attackIndicator);
        
        // Move indicator (target marker)
        const moveGeometry = new THREE.RingGeometry(0.3, 0.5, 16);
        const moveMaterial = new THREE.MeshBasicMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        this.moveIndicator = new THREE.Mesh(moveGeometry, moveMaterial);
        this.moveIndicator.rotation.x = -Math.PI / 2;
        this.moveIndicator.visible = false;
        this.scene.add(this.moveIndicator);
    }
    
    setupControls() {
        // Keyboard controls for spells
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        
        // Right-click for movement
        window.addEventListener('contextmenu', (e) => this.onRightClick(e));
        
        // Left-click for attacking
        window.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }
    
    onKeyDown(event) {
        const currentTime = performance.now();
        
        switch (event.code) {
            case 'KeyA':
                this.castSpell('A', currentTime);
                break;
            case 'KeyZ':
                this.castSpell('Z', currentTime);
                break;
            case 'KeyE':
                this.castSpell('E', currentTime);
                break;
            case 'Space':
                this.tryAttackLowestHealth();
                break;
        }
    }
    
    castSpell(key, currentTime) {
        const spell = this.spells[key];
        if (!spell) return;
        
        // Check cooldown
        if (currentTime - spell.lastUsed < spell.cooldown) {
            return; // Still on cooldown
        }
        
        spell.lastUsed = currentTime;
        
        if (key === 'A') {
            // Strong single target attack
            if (this.targetMinion && !this.targetMinion.isDead) {
                const distance = this.position.distanceTo(this.targetMinion.position);
                if (distance <= spell.range) {
                    this.targetMinion.takeDamage(spell.damage, 'player');
                    this.createSpellEffect(this.targetMinion.position, 0xef4444);
                    
                    // Check if killed
                    if (this.targetMinion.isDead) {
                        this.onMinionKill(this.targetMinion);
                    }
                }
            }
        } else if (key === 'Z') {
            // AOE attack
            this.createSpellEffect(this.position, 0x3b82f6, spell.range);
            
            // Damage all enemies in range
            if (this.onAOEDamage) {
                this.onAOEDamage(spell.damage, spell.range);
            }
        } else if (key === 'E') {
            // Sprint
            this.isSprinting = true;
            this.sprintEndTime = currentTime + spell.duration;
            this.createSpellEffect(this.position, 0x22c55e, 2);
        }
        
        // Notify UI
        if (this.onSpellUpdate) {
            this.onSpellUpdate(this.getSpellCooldowns(currentTime));
        }
    }
    
    createSpellEffect(position, color, radius = 1) {
        // Create visual effect
        const effectGeometry = new THREE.RingGeometry(0.1, radius, 32);
        const effectMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        const effect = new THREE.Mesh(effectGeometry, effectMaterial);
        effect.rotation.x = -Math.PI / 2;
        effect.position.set(position.x, 0.1, position.z);
        this.scene.add(effect);
        
        // Animate and remove
        let scale = 0.1;
        const animate = () => {
            scale += 0.15;
            effect.scale.setScalar(scale);
            effect.material.opacity -= 0.05;
            
            if (effect.material.opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(effect);
                effect.geometry.dispose();
                effect.material.dispose();
            }
        };
        animate();
    }
    
    getSpellCooldowns(currentTime) {
        const cooldowns = {};
        for (const [key, spell] of Object.entries(this.spells)) {
            const elapsed = currentTime - spell.lastUsed;
            const remaining = Math.max(0, spell.cooldown - elapsed);
            cooldowns[key] = {
                ready: remaining === 0,
                remaining: remaining,
                percent: Math.min(100, (elapsed / spell.cooldown) * 100),
                icon: spell.icon,
                name: spell.name
            };
        }
        return cooldowns;
    }
    
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    onRightClick(event) {
        event.preventDefault();
        
        // Raycast to find ground position
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Create a ground plane for intersection
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersectPoint = new THREE.Vector3();
        
        this.raycaster.ray.intersectPlane(groundPlane, intersectPoint);
        
        if (intersectPoint) {
            // Clamp to lane bounds
            intersectPoint.x = Math.max(-10, Math.min(10, intersectPoint.x));
            intersectPoint.z = Math.max(-40, Math.min(40, intersectPoint.z));
            
            this.moveTarget = intersectPoint.clone();
            this.isMoving = true;
            
            // Show move indicator
            this.moveIndicator.position.set(intersectPoint.x, 0.1, intersectPoint.z);
            this.moveIndicator.visible = true;
            
            // Hide indicator after a short time
            setTimeout(() => {
                this.moveIndicator.visible = false;
            }, 500);
        }
    }
    
    onClick(event) {
        // Try to attack clicked minion
        if (this.targetMinion) {
            this.tryAttack(this.targetMinion);
        }
    }
    
    tryAttackLowestHealth() {
        if (this.onRequestLowestHealthAttack) {
            this.onRequestLowestHealthAttack();
        }
    }
    
    update(deltaTime, currentTime, minions = []) {
        // Check sprint status
        if (this.isSprinting && currentTime > this.sprintEndTime) {
            this.isSprinting = false;
        }
        
        // Handle right-click movement
        if (this.isMoving && this.moveTarget) {
            this.handleMoveToTarget(deltaTime);
        }
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
        }
        
        // Find minion under mouse
        this.updateMouseTarget(minions);
        
        // Update attack indicator
        this.updateAttackIndicator();
        
        // Update spell cooldowns UI
        if (this.onSpellUpdate) {
            this.onSpellUpdate(this.getSpellCooldowns(currentTime));
        }
    }
    
    handleMoveToTarget(deltaTime) {
        const direction = new THREE.Vector3();
        direction.subVectors(this.moveTarget, this.position);
        direction.y = 0;
        
        const distance = direction.length();
        
        if (distance < 0.3) {
            // Reached target
            this.isMoving = false;
            this.moveTarget = null;
            return;
        }
        
        direction.normalize();
        
        // Apply sprint bonus
        const speed = this.isSprinting 
            ? this.moveSpeed * this.spells.E.speedBoost 
            : this.moveSpeed;
        
        const moveAmount = Math.min(distance, speed * deltaTime);
        direction.multiplyScalar(moveAmount);
        
        this.position.add(direction);
        
        // Clamp to lane bounds
        this.position.x = Math.max(-10, Math.min(10, this.position.x));
        this.position.z = Math.max(-40, Math.min(40, this.position.z));
        
        // Face movement direction
        if (this.mesh && direction.length() > 0.01) {
            this.mesh.lookAt(
                this.position.x + direction.x,
                this.mesh.position.y,
                this.position.z + direction.z
            );
        }
    }
    
    updateMouseTarget(minions) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        const minionMeshes = minions
            .filter(m => !m.isDead && m.mesh)
            .map(m => m.mesh);
        
        const intersects = this.raycaster.intersectObjects(minionMeshes);
        
        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            this.targetMinion = hitMesh.userData.minion || null;
            
            if (this.targetMinion && this.targetMinion.mesh) {
                document.body.style.cursor = 'crosshair';
            }
        } else {
            this.targetMinion = null;
            document.body.style.cursor = 'default';
        }
    }
    
    updateAttackIndicator() {
        if (this.targetMinion && !this.targetMinion.isDead) {
            const distance = this.position.distanceTo(this.targetMinion.position);
            const inRange = distance <= this.attackRange;
            
            const points = [
                new THREE.Vector3(this.position.x, 1, this.position.z),
                new THREE.Vector3(
                    this.targetMinion.position.x,
                    1,
                    this.targetMinion.position.z
                )
            ];
            
            this.attackIndicator.geometry.dispose();
            this.attackIndicator.geometry = new THREE.BufferGeometry().setFromPoints(points);
            this.attackIndicator.material.color.setHex(inRange ? 0x00ff00 : 0xff0000);
            this.attackIndicator.visible = true;
        } else {
            this.attackIndicator.visible = false;
        }
    }
    
    tryAttack(minion, currentTime) {
        if (!minion || minion.isDead) return null;
        
        const distance = this.position.distanceTo(minion.position);
        if (distance > this.attackRange) return null;
        
        if (currentTime - this.lastAttackTime < this.attackCooldown) return null;
        
        this.lastAttackTime = currentTime;
        
        // Attack animation
        if (this.mesh) {
            const originalScale = this.mesh.scale.clone();
            this.mesh.scale.set(1.3, 0.8, 1.3);
            setTimeout(() => {
                if (this.mesh) {
                    this.mesh.scale.copy(originalScale);
                }
            }, 100);
        }
        
        // Deal damage
        const killed = minion.takeDamage(this.attackDamage, 'player');
        
        if (killed) {
            return this.onMinionKill(minion);
        }
        
        return null;
    }
    
    onMinionKill(minion) {
        const reward = {
            gold: minion.goldValue,
            xp: minion.xpValue
        };
        
        this.gold += reward.gold;
        this.xp += reward.xp;
        this.cs++;
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        
        if (this.combo >= 5) {
            reward.gold += 10;
            this.gold += 10;
        }
        
        return reward;
    }
    
    resetCombo() {
        this.combo = 0;
    }
    
    getStats() {
        return {
            gold: this.gold,
            xp: this.xp,
            cs: this.cs,
            combo: this.combo,
            maxCombo: this.maxCombo
        };
    }
    
    getPosition() {
        return this.position.clone();
    }
    
    setPosition(x, z) {
        this.position.set(x, 0, z);
        if (this.mesh) {
            this.mesh.position.x = x;
            this.mesh.position.z = z;
        }
    }
    
    reset() {
        this.gold = 0;
        this.xp = 0;
        this.cs = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.isMoving = false;
        this.moveTarget = null;
        this.isSprinting = false;
        
        // Reset spell cooldowns
        const now = performance.now();
        for (const spell of Object.values(this.spells)) {
            spell.lastUsed = now - spell.cooldown;
        }
        
        this.setPosition(0, -20);
    }
    
    cleanup() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.attackIndicator) {
            this.scene.remove(this.attackIndicator);
        }
        if (this.moveIndicator) {
            this.scene.remove(this.moveIndicator);
        }
    }
}
