// ===== Model Loader Module =====
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

// Free models available from Three.js examples CDN
const MODEL_URLS = {
    // Soldier model from Three.js examples
    champion: 'https://threejs.org/examples/models/gltf/Soldier.glb',
    // Robot model - for enemy minions
    robot: 'https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb'
};

// Cache loaded models
const modelCache = {};

export async function loadModel(type) {
    const url = MODEL_URLS[type];
    if (!url) {
        console.warn(`Unknown model type: ${type}`);
        return null;
    }
    
    // Return cached if available
    if (modelCache[type]) {
        return modelCache[type].clone();
    }
    
    return new Promise((resolve, reject) => {
        loader.load(
            url,
            (gltf) => {
                const model = gltf.scene;
                modelCache[type] = model;
                resolve(model.clone());
            },
            (progress) => {
                // Loading progress
            },
            (error) => {
                console.error(`Error loading model ${type}:`, error);
                resolve(null); // Return null on error, use fallback
            }
        );
    });
}

export function createFallbackChampionMesh() {
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x8b5cf6,
        emissive: 0x6d28d9,
        emissiveIntensity: 0.3,
        roughness: 0.4,
        metalness: 0.6
    });
    const mesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mesh.castShadow = true;
    return mesh;
}

export function createFallbackMinionMesh(team, type) {
    let geometry;
    let size = 1;
    
    switch (type) {
        case 'melee':
            geometry = new THREE.BoxGeometry(1.2, 1.4, 1.2);
            size = 1;
            break;
        case 'caster':
            geometry = new THREE.ConeGeometry(0.7, 1.2, 6);
            size = 0.9;
            break;
        case 'cannon':
            geometry = new THREE.CylinderGeometry(0.8, 1.0, 1.8, 8);
            size = 1.4;
            break;
        default:
            geometry = new THREE.BoxGeometry(1.2, 1.4, 1.2);
    }
    
    const color = team === 'ally' ? 0x3b82f6 : 0xef4444;
    const emissive = team === 'ally' ? 0x1d4ed8 : 0xb91c1c;
    
    const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: emissive,
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.3
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(size);
    
    return mesh;
}
