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
        
        this.movement = { forward: false, backward: false, left: false, right: false };
        this.isAttacking = false;
        this.targetMinion = null;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Attack indicator
        this.attackIndicator = null;
        
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
    }
    
    setupControls() {
        // Keyboard controls
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse controls for attacking
        window.addEventListener('click', (e) => this.onClick(e));
        window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    }
    
    onKeyDown(event) {
        switch (event.code) {
            case 'KeyZ': // AZERTY
            case 'KeyW': // QWERTY
            case 'ArrowUp':
                this.movement.backward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.movement.forward = true;
                break;
            case 'KeyQ': // AZERTY
            case 'KeyA': // QWERTY
            case 'ArrowLeft':
                this.movement.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.movement.right = true;
                break;
            case 'Space':
                this.tryAttackLowestHealth();
                break;
        }
    }
    
    onKeyUp(event) {
        switch (event.code) {
            case 'KeyZ': // AZERTY
            case 'KeyW': // QWERTY
            case 'ArrowUp':
                this.movement.backward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.movement.forward = false;
                break;
            case 'KeyQ': // AZERTY
            case 'KeyA': // QWERTY
            case 'ArrowLeft':
                this.movement.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.movement.right = false;
                break;
        }
    }
    
    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
    
    onClick(event) {
        // Try to attack clicked minion
        if (this.targetMinion) {
            this.tryAttack(this.targetMinion);
        }
    }
    
    tryAttackLowestHealth() {
        // This will be called by the game to attack the lowest health enemy in range
        if (this.onRequestLowestHealthAttack) {
            this.onRequestLowestHealthAttack();
        }
    }
    
    update(deltaTime, currentTime, minions = []) {
        // Handle movement
        this.handleMovement(deltaTime);
        
        // Update mesh position
        if (this.mesh) {
            this.mesh.position.x = this.position.x;
            this.mesh.position.z = this.position.z;
        }
        
        // Find minion under mouse
        this.updateMouseTarget(minions);
        
        // Update attack indicator
        this.updateAttackIndicator();
    }
    
    handleMovement(deltaTime) {
        const moveVector = new THREE.Vector3();
        
        if (this.movement.forward) moveVector.z += 1;
        if (this.movement.backward) moveVector.z -= 1;
        if (this.movement.left) moveVector.x -= 1;
        if (this.movement.right) moveVector.x += 1;
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(this.moveSpeed * deltaTime);
            
            this.position.add(moveVector);
            
            // Clamp to lane bounds
            this.position.x = Math.max(-10, Math.min(10, this.position.x));
            this.position.z = Math.max(-40, Math.min(40, this.position.z));
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
            
            // Highlight target
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
            
            // Update line
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
        
        // Combo bonus
        if (this.combo >= 5) {
            reward.gold += 10; // Bonus gold for combo
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
        this.setPosition(0, -20);
    }
    
    cleanup() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        if (this.attackIndicator) {
            this.scene.remove(this.attackIndicator);
        }
    }
}
