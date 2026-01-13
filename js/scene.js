// ===== Scene Setup Module =====
import * as THREE from 'three';

export class GameScene {
    constructor(container) {
        this.container = container;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lane = null;
        this.towers = { ally: null, enemy: null };
        this.ground = null;
        
        // Camera follow settings
        this.cameraOffset = new THREE.Vector3(0, 35, 30);
        this.cameraLookOffset = new THREE.Vector3(0, 0, 5);
        this.cameraTarget = new THREE.Vector3(0, 0, 0);
        this.cameraSmoothing = 0.08;
        
        this.init();
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 150);
        
        // Create camera (isometric-like view)
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
        this.camera.position.set(0, 40, 35);
        this.camera.lookAt(0, 0, 0);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);
        
        // Add lighting
        this.setupLighting();
        
        // Create environment
        this.createEnvironment();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    setupLighting() {
        // Ambient light
        const ambient = new THREE.AmbientLight(0x6366f1, 0.4);
        this.scene.add(ambient);
        
        // Main directional light (sun)
        const sun = new THREE.DirectionalLight(0xffffff, 1);
        sun.position.set(20, 40, 20);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 100;
        sun.shadow.camera.left = -50;
        sun.shadow.camera.right = 50;
        sun.shadow.camera.top = 50;
        sun.shadow.camera.bottom = -50;
        this.scene.add(sun);
        
        // Accent lights
        const blueLight = new THREE.PointLight(0x3b82f6, 1, 30);
        blueLight.position.set(-10, 5, -40);
        this.scene.add(blueLight);
        
        const redLight = new THREE.PointLight(0xef4444, 1, 30);
        redLight.position.set(10, 5, 40);
        this.scene.add(redLight);
    }
    
    createEnvironment() {
        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 120);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x1e3a1e,
            roughness: 0.9,
            metalness: 0.1
        });
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        // Lane (center path)
        const laneGeometry = new THREE.PlaneGeometry(8, 100);
        const laneMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d3d5c,
            roughness: 0.7,
            metalness: 0.2
        });
        this.lane = new THREE.Mesh(laneGeometry, laneMaterial);
        this.lane.rotation.x = -Math.PI / 2;
        this.lane.position.y = 0.01;
        this.lane.receiveShadow = true;
        this.scene.add(this.lane);
        
        // Lane markings
        this.createLaneMarkings();
        
        // Towers
        this.createTowers();
        
        // River (horizontal stripe)
        this.createRiver();
        
        // Bushes
        this.createBushes();
        
        // Grid lines
        this.createGrid();
    }
    
    createLaneMarkings() {
        const markerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x4a4a6a,
            roughness: 0.5
        });
        
        for (let z = -45; z <= 45; z += 10) {
            const markerGeometry = new THREE.PlaneGeometry(6, 0.3);
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.rotation.x = -Math.PI / 2;
            marker.position.set(0, 0.02, z);
            this.scene.add(marker);
        }
    }
    
    createTowers() {
        const towerGeometry = new THREE.CylinderGeometry(1.5, 2, 8, 8);
        
        // Ally tower (blue)
        const allyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3b82f6,
            emissive: 0x1e40af,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.7
        });
        this.towers.ally = new THREE.Mesh(towerGeometry, allyMaterial);
        this.towers.ally.position.set(0, 4, -40);
        this.towers.ally.castShadow = true;
        this.scene.add(this.towers.ally);
        
        // Tower top (ally)
        const topGeometry = new THREE.ConeGeometry(2, 3, 8);
        const allyTop = new THREE.Mesh(topGeometry, allyMaterial);
        allyTop.position.set(0, 9.5, -40);
        allyTop.castShadow = true;
        this.scene.add(allyTop);
        
        // Ally tower glow
        const allyGlow = new THREE.PointLight(0x3b82f6, 2, 15);
        allyGlow.position.set(0, 10, -40);
        this.scene.add(allyGlow);
        
        // Enemy tower (red)
        const enemyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xef4444,
            emissive: 0x991b1b,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.7
        });
        this.towers.enemy = new THREE.Mesh(towerGeometry, enemyMaterial);
        this.towers.enemy.position.set(0, 4, 40);
        this.towers.enemy.castShadow = true;
        this.scene.add(this.towers.enemy);
        
        // Tower top (enemy)
        const enemyTop = new THREE.Mesh(topGeometry, enemyMaterial);
        enemyTop.position.set(0, 9.5, 40);
        enemyTop.castShadow = true;
        this.scene.add(enemyTop);
        
        // Enemy tower glow
        const enemyGlow = new THREE.PointLight(0xef4444, 2, 15);
        enemyGlow.position.set(0, 10, 40);
        this.scene.add(enemyGlow);
    }
    
    createRiver() {
        const riverGeometry = new THREE.PlaneGeometry(100, 8);
        const riverMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x22d3ee,
            transparent: true,
            opacity: 0.6,
            roughness: 0.1,
            metalness: 0.3
        });
        const river = new THREE.Mesh(riverGeometry, riverMaterial);
        river.rotation.x = -Math.PI / 2;
        river.position.set(0, 0.03, 0);
        this.scene.add(river);
        
        // River glow
        const riverGlow = new THREE.PointLight(0x22d3ee, 0.5, 20);
        riverGlow.position.set(0, 2, 0);
        this.scene.add(riverGlow);
    }
    
    createBushes() {
        const bushMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x166534,
            roughness: 0.8
        });
        
        const bushPositions = [
            [-8, 0.5, -20], [8, 0.5, -20],
            [-8, 0.5, 20], [8, 0.5, 20],
            [-12, 0.5, 0], [12, 0.5, 0]
        ];
        
        bushPositions.forEach(pos => {
            const bushGroup = new THREE.Group();
            
            for (let i = 0; i < 5; i++) {
                const size = 1 + Math.random() * 0.5;
                const bushGeometry = new THREE.SphereGeometry(size, 8, 8);
                const bush = new THREE.Mesh(bushGeometry, bushMaterial);
                bush.position.set(
                    (Math.random() - 0.5) * 3,
                    size * 0.5,
                    (Math.random() - 0.5) * 3
                );
                bush.castShadow = true;
                bushGroup.add(bush);
            }
            
            bushGroup.position.set(pos[0], pos[1], pos[2]);
            this.scene.add(bushGroup);
        });
    }
    
    createGrid() {
        const gridMaterial = new THREE.LineBasicMaterial({ 
            color: 0x333355,
            transparent: true,
            opacity: 0.3
        });
        
        // Create grid lines
        for (let i = -50; i <= 50; i += 10) {
            // Horizontal lines
            const hPoints = [
                new THREE.Vector3(-50, 0.02, i),
                new THREE.Vector3(50, 0.02, i)
            ];
            const hGeometry = new THREE.BufferGeometry().setFromPoints(hPoints);
            const hLine = new THREE.Line(hGeometry, gridMaterial);
            this.scene.add(hLine);
            
            // Vertical lines
            const vPoints = [
                new THREE.Vector3(i, 0.02, -50),
                new THREE.Vector3(i, 0.02, 50)
            ];
            const vGeometry = new THREE.BufferGeometry().setFromPoints(vPoints);
            const vLine = new THREE.Line(vGeometry, gridMaterial);
            this.scene.add(vLine);
        }
    }
    
    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    getScene() {
        return this.scene;
    }
    
    getCamera() {
        return this.camera;
    }
    
    updateCameraFollow(targetPosition) {
        if (!targetPosition) return;
        
        // Calculate desired camera position
        const desiredPosition = new THREE.Vector3(
            targetPosition.x + this.cameraOffset.x,
            this.cameraOffset.y,
            targetPosition.z + this.cameraOffset.z
        );
        
        // Smoothly interpolate camera position
        this.camera.position.lerp(desiredPosition, this.cameraSmoothing);
        
        // Calculate look target
        const lookTarget = new THREE.Vector3(
            targetPosition.x + this.cameraLookOffset.x,
            this.cameraLookOffset.y,
            targetPosition.z + this.cameraLookOffset.z
        );
        
        // Smoothly update camera target
        this.cameraTarget.lerp(lookTarget, this.cameraSmoothing);
        this.camera.lookAt(this.cameraTarget);
    }
}
