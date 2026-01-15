import * as THREE from 'three';
import { GameConfig } from '/js/config/GameConfig.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;

        // Initialize Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(GameConfig.COLORS.BACKGROUND);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            1, // Increased near plane for better z-buffer precision
            1500 // Reduced far plane
        );
        this.camera.rotation.order = 'YXZ';

        // OPTIMIZED: Performance-focused renderer settings
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: false, // Disabled for performance
            powerPreference: 'high-performance',
            stencil: false,
            depth: true
        });

        // Limit pixel ratio to 2 max (retina displays can be 3+)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        // Lighting - simplified for performance
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 200, 100);
        this.scene.add(directionalLight);

        // Floor tiles (destructible)
        this.floorTiles = new Map();
        this.floorTileSize = 40;
        this.floorGridSize = 50;

        // OPTIMIZED: Use basic material instead of standard for floor
        this.floorMaterial = new THREE.MeshBasicMaterial({
            color: GameConfig.FLOOR_COLOR
        });

        // Grid helper for better depth perception - using fewer divisions
        const gridHelper = new THREE.GridHelper(2000, 25, 0x4ecdc4, 0x24243e);
        gridHelper.position.set(1000, 1, 1000);
        this.scene.add(gridHelper);

        this.wallMeshes = [];
        this.bulletMeshes = [];
        this.textureLoader = new THREE.TextureLoader();

        // OPTIMIZED: No fog for better performance
        // this.scene.fog = new THREE.Fog(GameConfig.COLORS.BACKGROUND, 100, 1000);

        this.shakeAmplitude = 0;
        this.shakeDecay = 0.9;

        window.addEventListener('resize', () => this.resize());
    }

    initFloorTiles(mapData) {
        // OPTIMIZED: Use single floor mesh + track destroyed tiles as holes
        // This reduces draw calls from 2500+ to just a few

        // Remove old floor if exists
        if (this.floorMesh) {
            this.scene.remove(this.floorMesh);
        }

        // Create single floor plane - OPTIMIZED with basic material
        const floorGeometry = new THREE.PlaneGeometry(2000, 2000);
        const floorMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a3a
        });
        this.floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floorMesh.rotation.x = -Math.PI / 2;
        this.floorMesh.position.set(1000, 0, 1000);
        this.scene.add(this.floorMesh);

        // Store tile settings
        this.floorTileSize = mapData.floorTileSize || 40;
        this.floorGridSize = mapData.floorGridSize || 50;

        // Track destroyed tiles as "holes" - only render markers for destroyed ones
        this.destroyedTiles = new Map();
        this.holeGeometry = new THREE.PlaneGeometry(this.floorTileSize - 2, this.floorTileSize - 2);
        this.holeMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.9
        });

        // Mark initially destroyed tiles
        if (mapData.destroyedTiles) {
            for (const tile of mapData.destroyedTiles) {
                this.removeFloorTile(tile.gx, tile.gy);
            }
        }
    }

    removeFloorTile(gx, gy) {
        const key = `${gx}_${gy}`;
        if (this.destroyedTiles.has(key)) return; // Already destroyed

        // Create a dark "hole" marker at this position
        const hole = new THREE.Mesh(this.holeGeometry, this.holeMaterial);
        hole.rotation.x = -Math.PI / 2;
        hole.position.set(
            gx * this.floorTileSize + this.floorTileSize / 2,
            0.1, // Slightly above floor to render on top
            gy * this.floorTileSize + this.floorTileSize / 2
        );
        this.scene.add(hole);
        this.destroyedTiles.set(key, hole);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    updateCamera(player) {
        if (!player) return;

        // FPS camera position (at player height + head offset)
        this.camera.position.set(player.x, 25 + (player.height || 0), player.y);

        // Apply rotation
        this.camera.rotation.set(player.pitch || 0, -player.angle, 0);

        // Visual effects for dash
        if (player.isDashing) {
            this.camera.fov = 85;
            if (Math.random() > 0.5) this.addShake(0.5);
        } else {
            this.camera.fov = 75;
        }
        this.camera.updateProjectionMatrix();

        // Shake effect
        if (this.shakeAmplitude > 0.1) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeAmplitude;
            this.camera.position.z += (Math.random() - 0.5) * this.shakeAmplitude;
            this.shakeAmplitude *= this.shakeDecay;
        } else {
            this.shakeAmplitude = 0;
        }
    }

    addShake(amount) {
        this.shakeAmplitude += amount;
    }

    setupMap(mapData) {
        // Clear existing walls
        for (const wall of Object.values(this.wallMeshes)) {
            this.scene.remove(wall);
        }
        this.wallMeshes = {}; // Store as object with IDs

        // Create new walls
        for (const wall of mapData.walls) {
            const wallGeo = new THREE.BoxGeometry(wall.width, 100, wall.height);

            // Edge walls get different color and can support ad textures
            let wallMat;
            if (wall.isEdge) {
                wallMat = new THREE.MeshLambertMaterial({
                    color: 0x2a2a5a // Darker color for edge walls
                });
            } else {
                wallMat = new THREE.MeshLambertMaterial({
                    color: GameConfig.WALL_COLOR
                });
            }

            const mesh = new THREE.Mesh(wallGeo, wallMat);

            mesh.position.set(
                wall.x + wall.width / 2,
                50,
                wall.y + wall.height / 2
            );

            // Load ad texture for edge walls
            if (wall.isEdge && wall.adSlot) {
                mesh.userData.adSlot = wall.adSlot;
                mesh.userData.isEdge = true;

                // Load and apply ad texture
                this.loadAdTexture(mesh, wall.adSlot);
            }

            this.scene.add(mesh);

            if (wall.id) {
                this.wallMeshes[wall.id] = mesh;
            }
        }

        // Load ads config
        this.adTextures = {
            north: '/ads/splash-1200x630.png',
            south: '/ads/splash-1200x630.png',
            east: '/ads/splash-1200x630.png',
            west: '/ads/splash-1200x630.png'
        };
    }

    loadAdTexture(mesh, adSlot) {
        const adPath = `/ads/splash-1200x630.png`; // Use same ad for now

        this.textureLoader.load(adPath, (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;

            // Create material with ad texture
            const adMaterial = new THREE.MeshBasicMaterial({
                map: texture,
                color: 0xffffff
            });

            // Apply to the inner face of the wall (face facing the arena)
            // Walls have 6 faces: right, left, top, bottom, front, back
            const darkMat = new THREE.MeshLambertMaterial({ color: 0x2a2a5a });

            // Determine which face is "inside" based on wall direction (slot prefix)
            let faceIndex;
            const direction = adSlot.split('_')[0]; // Extract north/south/east/west
            if (direction === 'north') faceIndex = 4;      // Back face (facing south into arena)
            else if (direction === 'south') faceIndex = 5; // Front face (facing north into arena)
            else if (direction === 'west') faceIndex = 0;  // Right face (facing east into arena)
            else if (direction === 'east') faceIndex = 1;  // Left face (facing west into arena)

            const matArray = [darkMat, darkMat, darkMat, darkMat, darkMat, darkMat];
            matArray[faceIndex] = adMaterial;

            mesh.material = matArray;
        });
    }

    removeWall(wallId) {
        const mesh = this.wallMeshes[wallId];
        if (mesh) {
            this.scene.remove(mesh);
            delete this.wallMeshes[wallId];
        }
    }

    addWall(wall) {
        // Create wall mesh for regenerated wall
        const wallGeo = new THREE.BoxGeometry(wall.width, 100, wall.height);
        const wallMat = new THREE.MeshLambertMaterial({
            color: GameConfig.WALL_COLOR
        });
        const mesh = new THREE.Mesh(wallGeo, wallMat);

        mesh.position.set(
            wall.x + wall.width / 2,
            50,
            wall.y + wall.height / 2
        );
        this.scene.add(mesh);

        if (wall.id) {
            this.wallMeshes[wall.id] = mesh;
        }
    }

    updatePlayerAnimation(mesh, player, deltaTime) {
        if (!mesh) return;

        // Determine if player is moving
        const isMoving = Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1 || (player.isMovingFromServer);

        if (!mesh.userData.walkCycle) mesh.userData.walkCycle = 0;

        if (isMoving) {
            mesh.userData.walkCycle += deltaTime * 10;
        } else {
            // Smoothly return to idle
            mesh.userData.walkCycle *= 0.9;
        }

        const cycle = mesh.userData.walkCycle;
        const speed = 1.0;
        const amplitude = 0.5;

        // Animate legs
        if (mesh.userData.leftLeg) {
            mesh.userData.leftLeg.rotation.x = Math.sin(cycle * speed) * amplitude;
        }
        if (mesh.userData.rightLeg) {
            mesh.userData.rightLeg.rotation.x = Math.sin(cycle * speed + Math.PI) * amplitude;
        }

        // Animate arms
        if (mesh.userData.leftArm) {
            mesh.userData.leftArm.rotation.x = Math.sin(cycle * speed + Math.PI) * amplitude;
        }
        if (mesh.userData.rightArm) {
            mesh.userData.rightArm.rotation.x = Math.sin(cycle * speed) * amplitude;
        }

        // Slight bobbing
        mesh.position.y += Math.abs(Math.sin(cycle * speed * 2)) * 1.5;
    }

    updateFloorTexture(texturePath) {
        if (!texturePath) {
            this.floorMaterial.map = null;
            this.floorMaterial.needsUpdate = true;
            return;
        }

        this.textureLoader.load(texturePath, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(10, 10);
            this.floorMaterial.map = texture;
            this.floorMaterial.needsUpdate = true;
        });
    }

    updateBullets(deltaTime) {
        for (let i = this.bulletMeshes.length - 1; i >= 0; i--) {
            const bullet = this.bulletMeshes[i];
            bullet.mesh.position.x += bullet.vx * deltaTime;
            bullet.mesh.position.y += bullet.vy * deltaTime;
            bullet.mesh.position.z += bullet.vz * deltaTime;

            bullet.life -= deltaTime;
            if (bullet.life <= 0) {
                this.scene.remove(bullet.mesh);
                this.bulletMeshes.splice(i, 1);
            }
        }
    }

    addBullet(bulletData, color = 0xffff00) {
        // 50% smaller bullet geometry
        const geo = new THREE.SphereGeometry(0.25, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
            color: color
        });
        const mesh = new THREE.Mesh(geo, mat);

        // Spawn at server position (with Y/Z swap)
        mesh.position.set(bulletData.x, bulletData.z || 25, bulletData.y);
        this.scene.add(mesh);

        // Speed up client bullets 2x to better match server hit detection
        const speedMultiplier = 2.0;

        this.bulletMeshes.push({
            mesh,
            id: bulletData.id,
            vx: (bulletData.vx || 0) * speedMultiplier,
            vy: (bulletData.vz || 0) * speedMultiplier, // Server vz is Three.js vy (height)
            vz: (bulletData.vy || 0) * speedMultiplier, // Server vy is Three.js vz (depth)
            life: 1.0 // Shorter life since faster
        });
    }

    removeBulletById(bulletId) {
        const index = this.bulletMeshes.findIndex(b => b.id === bulletId);
        if (index !== -1) {
            this.scene.remove(this.bulletMeshes[index].mesh);
            this.bulletMeshes.splice(index, 1);
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    // Improved helper to create a detailed voxel pony mesh
    createPonyMesh(playerColor) {
        const group = new THREE.Group();

        // Standard voxel size
        const v = 4; // Voxel unit

        // Colors
        const colors = {
            green: playerColor || 0x59C040,      // Primary color
            pink: 0xB01A80,                      // Hair/Tail
            orange: 0xFF661A,                    // Shirt
            brown: 0x4D331A,                     // Shorts/Boots
            black: 0x111111,                     // Sunglasses
            white: 0xFFFFFF,                     // Details
            yellow: 0xE6CC1A                     // Detail
        };

        // OPTIMIZED: Use basic material for better performance
        const createBox = (w, h, d, x, y, z, color, parent = group) => {
            const geo = new THREE.BoxGeometry(w, h, d);
            const mat = new THREE.MeshLambertMaterial({ color }); // Lambert is faster than Standard
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, y, z);
            parent.add(mesh);
            return mesh;
        };

        // 1. LEGS (Pivot groups for animation)
        const leftLegPivot = new THREE.Group();
        leftLegPivot.position.set(-v * 1.5, v * 5, 0);
        group.add(leftLegPivot);
        createBox(v, v * 2, v, 0, -v * 4, 0, colors.brown, leftLegPivot); // Boot
        createBox(v, v * 3, v, 0, -v * 1.5, 0, colors.green, leftLegPivot); // Skin
        group.userData.leftLeg = leftLegPivot;

        const rightLegPivot = new THREE.Group();
        rightLegPivot.position.set(v * 1.5, v * 5, 0);
        group.add(rightLegPivot);
        createBox(v, v * 2, v, 0, -v * 4, 0, colors.brown, rightLegPivot);
        createBox(v, v * 3, v, 0, -v * 1.5, 0, colors.green, rightLegPivot);
        group.userData.rightLeg = rightLegPivot;

        // 2. TORSO (Shirt)
        createBox(v * 4, v * 6, v * 2.5, 0, v * 8, 0, colors.orange);

        // Add shirt details (Flowers)
        const flowerPositions = [
            [-1.8, 10.5, 1.3], [1.5, 8.5, 1.3], [0, 6.5, 1.3],
            [-1.5, 7.5, -1.3], [1.2, 9.5, -1.3], [-0.5, 5.5, -1.3]
        ];
        flowerPositions.forEach(pos => {
            createBox(v * 0.4, v * 0.4, v * 0.1, pos[0] * v / 1.5, pos[1] * v / 1.5 + v * 1.5, pos[2] * v / 2, colors.white);
        });

        // 3. ARMS
        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-v * 2.5, v * 11, 0);
        group.add(leftArmPivot);
        createBox(v, v * 4, v, 0, -v * 2, 0, colors.green, leftArmPivot);
        createBox(v * 1.1, v * 1.5, v * 1.1, 0, -v * 0.5, 0, colors.orange, leftArmPivot); // Sleeve
        group.userData.leftArm = leftArmPivot;

        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(v * 2.5, v * 11, 0);
        group.add(rightArmPivot);
        createBox(v, v * 4, v, 0, -v * 2, 0, colors.green, rightArmPivot);
        createBox(v * 1.1, v * 1.5, v * 1.1, 0, -v * 0.5, 0, colors.orange, rightArmPivot); // Sleeve
        group.userData.rightArm = rightArmPivot;

        // 4. HEAD
        const head = createBox(v * 4, v * 4, v * 4, 0, v * 14, 0, colors.green);

        // Muzzle (Snout)
        createBox(v * 1.8, v * 1.2, v * 1.2, 0, v * 13, v * 2.5, colors.green);

        // Ears
        createBox(v * 0.6, v * 1.2, v * 0.4, -v * 1.5, v * 16.5, 0.2, colors.green);
        createBox(v * 0.6, v * 1.2, v * 0.4, v * 1.5, v * 16.5, 0.2, colors.green);

        // 5. SUNGLASSES (Blocky pixel look)
        createBox(v * 4.4, v * 1.2, v * 0.3, 0, v * 14.5, v * 2.1, colors.black); // Wrap-around frame
        // Highlight glints (2 pixels per lens)
        createBox(v * 0.4, v * 0.4, v * 0.1, -v * 1.2, v * 14.7, v * 2.25, colors.white);
        createBox(v * 0.2, v * 0.2, v * 0.1, -v * 0.8, v * 14.5, v * 2.25, colors.white);

        createBox(v * 0.4, v * 0.4, v * 0.1, v * 0.8, v * 14.7, v * 2.25, colors.white);
        createBox(v * 0.2, v * 0.2, v * 0.1, v * 1.2, v * 14.5, v * 2.25, colors.white);

        // 6. HAIR (Mohawk - more vertical blocks)
        for (let i = 0; i < 6; i++) {
            const y_pos = v * (14 + i * 0.6);
            const z_pos = -v * (i * 0.3);
            createBox(v * 1.2, v * 2, v * 1, 0, y_pos, z_pos, colors.pink);
        }

        // 7. TAIL (Bushy voxel cluster)
        for (let i = 0; i < 12; i++) {
            const tx = (Math.random() - 0.5) * v * 1.5;
            const ty = v * 6 + (Math.random() - 0.5) * v * 2;
            const tz = -v * (1.5 + Math.random() * 2);
            createBox(v * 0.8, v * 0.8, v * 0.8, tx, ty, tz, colors.pink);
        }

        group.scale.set(0.6, 0.6, 0.6);
        return group;
    }
}
