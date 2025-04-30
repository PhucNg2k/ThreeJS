import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import Stats from 'three/addons/libs/stats.module.js';
import GUI from 'lil-gui';

// Global variables
let camera, scene, renderer, controls, stats;
let podium, car, carContainer;
const textureLoader = new THREE.TextureLoader();
const fbxLoader = new FBXLoader();
const clock = new THREE.Clock();
let carControls;
let carRotationEnabled = true;
let carRotationSpeed = 0.5;
let customTexture = null;
let currentTextureName = 'Default';



// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    init();
    animate();
    
    // Set up UI interaction
    const startButton = document.getElementById('startButton');
    const startPanel = document.getElementById('startPanel');
    const backButton = document.getElementById('backButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    // Thêm input cho texture upload (ẩn)
    const textureUpload = document.createElement('input');
    textureUpload.type = 'file';
    textureUpload.id = 'textureUpload';
    textureUpload.accept = 'image/*';
    textureUpload.style.display = 'none';
    document.body.appendChild(textureUpload);
    
    // Xử lý upload texture
    textureUpload.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            
            reader.onload = function(event) {
                applyCustomTexture(event.target.result);
            };
            
            reader.readAsDataURL(file);
        }
    });
    
    startButton.addEventListener('click', () => {
        startPanel.style.display = 'none';
        loadingIndicator.style.display = 'block';
        loadPodiumModel();
    });
    
    backButton.addEventListener('click', () => {
        window.location.href = 'index.html'; // Go back to the main page
    });
});

function init() {
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.getElementById('webgl').appendChild(renderer.domElement);
    
    // Set up stats monitor
    stats = new Stats();
    document.getElementById('webgl').appendChild(stats.dom);
    
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xE0E0E0); // Lighter background color (light gray)
    
    // Create camera
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 150);
    
    // Create controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 20; // Allow closer zoom
    controls.maxDistance = 150; // Limit how far out user can zoom
    controls.minPolarAngle = Math.PI * 0.1; // Limit how high user can go
    controls.maxPolarAngle = Math.PI * 0.6; // Limit how low user can go
    controls.target.set(0, 15, 0);
    controls.update();
    
    // Add lights
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x505050, 1.0);
    scene.add(ambientLight);
    
    // Key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(50, 100, 30);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 400;
    keyLight.shadow.camera.left = -100;
    keyLight.shadow.camera.right = 100;
    keyLight.shadow.camera.top = 100;
    keyLight.shadow.camera.bottom = -100;
    scene.add(keyLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.3);
    fillLight.position.set(-50, 30, -30);
    scene.add(fillLight);
    
    // Add a reflective floor
    const floorGeometry = new THREE.PlaneGeometry(300, 300);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xCCCCCC,
        roughness: 0.1, 
        metalness: 0.3,
        envMapIntensity: 0.8
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

async function loadPodiumModel() {
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    try {
        // Load the car model first
        car = await loadCarModel('Car/Car.fbx');
        if (car) {
            car.name = "DisplayCar";
            // Car will be positioned after podium is loaded
            
            // Apply materials to car
            car.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }
        
        // Load textures for podium
        const normalMap = textureLoader.load('./Podium/low_podium_Normal.png');
        const emissiveMap = textureLoader.load('./Podium/low_podium_Emissive.png');
        const ormMap = textureLoader.load('./Podium/low_podium_OcclusionRoughnessMetallic.png');
        
        // Configure texture encoding
        normalMap.encoding = THREE.LinearEncoding;
        emissiveMap.encoding = THREE.sRGBEncoding;
        
        // Load the podium FBX model
        fbxLoader.load(
            './Podium/low.fbx',
            (object) => {
                podium = object;
                
                // Apply textures to the model
                podium.traverse((child) => {
                    if (child.isMesh) {
                        // Create a new PBR material
                        const material = new THREE.MeshStandardMaterial({
                            normalMap: normalMap,
                            normalScale: new THREE.Vector2(1, 1),
                            emissiveMap: emissiveMap,
                            emissive: new THREE.Color(0x00ffff), // Cyan emissive color
                            emissiveIntensity: 1.5,
                            aoMap: ormMap,
                            roughnessMap: ormMap,
                            metalnessMap: ormMap,
                            roughness: 0.5,
                            metalness: 0.8,
                            envMapIntensity: 1.5,
                            color: 0x444444
                        });
                        
                        // Apply material
                        child.material = material;
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                
                // Thêm chức năng texture mapping từ ảnh bitmap
                setupTextureMapping(podium);
                
                // Scale and position the model - significantly increased size
                podium.scale.set(0.5, 0.5, 0.5); // Increased from 0.5 to 1.0 (2x larger)
                podium.position.y = 0;
                podium.rotation.y = 0; // No rotation
                
                // Add to scene
                scene.add(podium);
                
                // Calculate podium bounding box for positioning the car
                const podiumBox = new THREE.Box3().setFromObject(podium);
                const podiumSize = podiumBox.getSize(new THREE.Vector3());
                const podiumCenter = podiumBox.getCenter(new THREE.Vector3());
                const podiumTopY = podiumBox.max.y;
                
                console.log("Podium bounding box:", {
                    min: { x: podiumBox.min.x, y: podiumBox.min.y, z: podiumBox.min.z },
                    max: { x: podiumBox.max.x, y: podiumBox.max.y, z: podiumBox.max.z },
                    size: { x: podiumSize.x, y: podiumSize.y, z: podiumSize.z }
                });
                
                // Position the car on top of the podium if it exists
                if (car) {
                    // First perform car scaling
                    const originalCarBox = new THREE.Box3().setFromObject(car);
                    const originalCarSize = originalCarBox.getSize(new THREE.Vector3());
                    
                    // Scale the car appropriately for the podium - make it much larger
                    const scaleFactor = Math.min(
                        podiumSize.x * 1.2 / originalCarSize.x,
                        podiumSize.z * 1.2 / originalCarSize.z
                    ) * 1.8; // Additional scaling factor to make car even larger
                    
                    car.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    
                    // Create a new helper to visualize podium top
                    const podiumTopHelper = new THREE.Mesh(
                        new THREE.BoxGeometry(5, 5, 5),
                        new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false })
                    );
                    podiumTopHelper.position.set(podiumCenter.x, podiumTopY, podiumCenter.z);
                    scene.add(podiumTopHelper);
                    
                    // Reset car position and rotation first
                    car.position.set(0, 0, 0);
                    car.rotation.set(0, 0, 0); // Reset rotation completely
                    
                    // Apply exact rotation values shown in the GUI
                    car.rotation.x = THREE.MathUtils.degToRad(-89.9999);
                    car.rotation.y = THREE.MathUtils.degToRad(0);
                    car.rotation.z = THREE.MathUtils.degToRad(-180);
                    
                    // Update matrix after rotation
                    car.updateMatrixWorld(true);
                    const updatedCarBox = new THREE.Box3().setFromObject(car);
                    const carSize = updatedCarBox.getSize(new THREE.Vector3());
                    const carHeight = carSize.y; // Height after rotation (will be the thickness of car)
                    
                    // Get the center of the car's bounding box
                    const carCenter = updatedCarBox.getCenter(new THREE.Vector3());
                    
                    // Create a container for the car to handle rotation around its center
                    carContainer = new THREE.Group();
                    scene.add(carContainer);
                    
                    // Position the car within the container so that it rotates around its center
                    car.position.sub(carCenter);
                    carContainer.add(car);
                    
                    // Position the container at the exact coordinates shown in the GUI
                    // UPDATED: Using the new position values from the image
                    carContainer.position.set(-0.51869, 10.56688, -53.5685);
                    
                    console.log("Podium top Y:", podiumTopY);
                    console.log("Car height:", carHeight);
                    console.log("Car center:", carCenter);
                    console.log("Final container position:", carContainer.position);
                    
                    // Add GUI controls for car position
                    addCarPositionControls(car, carContainer, podiumCenter, podiumTopHelper.position.y);
                }
                
                // Hide loading indicator
                loadingIndicator.style.display = 'none';
                
                // Calculate scene bounding box and adjust camera
                const combinedBox = new THREE.Box3().setFromObject(scene);
                const center = combinedBox.getCenter(new THREE.Vector3());
                const size = combinedBox.getSize(new THREE.Vector3());
                
                // Set camera to be directly in front of and close to the podium
                const podiumFrontZ = podiumBox.max.z + 20; // Position in front of the podium
                const podiumCenterX = podiumCenter.x;
                const podiumCenterY = podiumCenter.y + 10; // Slightly above podium center
                
                // Position camera directly in front of podium
                camera.position.set(
                    podiumCenterX, 
                    podiumCenterY,
                    podiumFrontZ + 60 // Closer to the podium
                );
                
                // Set camera to look at the center of the podium
                controls.target.set(podiumCenterX, podiumCenterY, podiumCenter.z);
                controls.update();
                
                // Add spotlight specifically for the car
                const carSpotlight = new THREE.SpotLight(0xffffff, 3); // Increased intensity
                carSpotlight.position.set(0, 120, 0); // Higher position
                carSpotlight.angle = Math.PI / 6; // Wider angle
                carSpotlight.penumbra = 0.5;
                carSpotlight.decay = 1.5;
                carSpotlight.distance = 500; // Increased distance
                carSpotlight.castShadow = true;
                carSpotlight.shadow.mapSize.width = 2048; // Higher resolution shadows
                carSpotlight.shadow.mapSize.height = 2048;
                scene.add(carSpotlight);
                
                // Add an additional spotlight from a different angle
                const sideSpotlight = new THREE.SpotLight(0xffffaa, 2);
                sideSpotlight.position.set(100, 80, 100);
                sideSpotlight.angle = Math.PI / 8;
                sideSpotlight.penumbra = 0.7;
                sideSpotlight.decay = 1.5;
                sideSpotlight.distance = 400;
                sideSpotlight.castShadow = true;
                scene.add(sideSpotlight);
                
                // Add a front spotlight for better visibility from camera position
                const frontSpotlight = new THREE.SpotLight(0xffffff, 2);
                frontSpotlight.position.set(podiumCenterX, podiumCenterY + 20, podiumFrontZ + 80);
                frontSpotlight.target.position.set(podiumCenterX, podiumCenterY, podiumCenter.z);
                frontSpotlight.angle = Math.PI / 6;
                frontSpotlight.penumbra = 0.5;
                frontSpotlight.decay = 1.5;
                frontSpotlight.distance = 300;
                frontSpotlight.castShadow = true;
                scene.add(frontSpotlight);
                scene.add(frontSpotlight.target);
                
                if (car) {
                    carSpotlight.target = car;
                    sideSpotlight.target = car;
                }
            },
            (xhr) => {
                // Show loading progress
                const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                loadingIndicator.textContent = `Loading models... ${percent}%`;
            },
            (error) => {
                console.error('Error loading FBX model:', error);
                loadingIndicator.textContent = 'Error loading model. Please try again.';
            }
        );
    } catch (error) {
        console.error('Error in loading models:', error);
        loadingIndicator.textContent = 'Error loading models. Please try again.';
    }
}

// Helper function to load car model
function loadCarModel(path) {
    return new Promise((resolve, reject) => {
        fbxLoader.load(
            path,
            (object) => {
                resolve(object);
            },
            (xhr) => {
                console.log(`Car loading: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`);
            },
            (error) => {
                console.error('Error loading car model:', error);
                reject(error);
            }
        );
    });
}

// Thiết lập chức năng texture mapping
function setupTextureMapping(model) {
    // Tạo controls trong GUI cho texture đã được thêm vào addCarPositionControls
}

// Áp dụng custom texture từ ảnh bitmap đã upload
function applyCustomTexture(imageUrl) {
    if (!podium) return;
    
    // Tạo texture mới từ ảnh bitmap đã upload
    customTexture = new THREE.TextureLoader().load(imageUrl, function(texture) {
        texture.encoding = THREE.sRGBEncoding;
        texture.needsUpdate = true;
        
        // Áp dụng texture lên podium
        podium.traverse((child) => {
            if (child.isMesh) {
                // Tạo material mới với custom texture là diffuse map
                const material = new THREE.MeshStandardMaterial({
                    map: texture,
                    normalMap: child.material.normalMap,
                    normalScale: child.material.normalScale,
                    emissiveMap: child.material.emissiveMap,
                    emissive: child.material.emissive,
                    emissiveIntensity: child.material.emissiveIntensity,
                    roughness: 0.7,
                    metalness: 0.3
                });
                
                // Cập nhật material cho mesh
                child.material = material;
                
                console.log("Applied custom texture to podium");
            }
        });
        
        currentTextureName = 'Custom Upload';
    });
}

// Reset podium textures về mặc định
function resetPodiumTextures() {
    if (!podium) return;
    
    // Tải lại các texture mặc định
    const normalMap = textureLoader.load('./Podium/low_podium_Normal.png');
    const emissiveMap = textureLoader.load('./Podium/low_podium_Emissive.png');
    const ormMap = textureLoader.load('./Podium/low_podium_OcclusionRoughnessMetallic.png');
    
    // Configure texture encoding
    normalMap.encoding = THREE.LinearEncoding;
    emissiveMap.encoding = THREE.sRGBEncoding;
    
    // Áp dụng lại texture mặc định
    podium.traverse((child) => {
        if (child.isMesh) {
            // Tạo lại material mặc định
            const material = new THREE.MeshStandardMaterial({
                normalMap: normalMap,
                normalScale: new THREE.Vector2(1, 1),
                emissiveMap: emissiveMap,
                emissive: new THREE.Color(0x00ffff), // Cyan emissive color
                emissiveIntensity: 1.5,
                aoMap: ormMap,
                roughnessMap: ormMap,
                metalnessMap: ormMap,
                roughness: 0.5,
                metalness: 0.8,
                envMapIntensity: 1.5,
                color: 0x444444
            });
            
            // Áp dụng material
            child.material = material;
        }
    });
    
    console.log("Reset podium textures to default");
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Update controls
    controls.update();
    
    // Auto-rotate the car container if enabled
    if (carRotationEnabled && carContainer) {
        // UPDATED: Change from rotateZ to rotateY to match the Z Rotation in the GUI
        // This seems counterintuitive but in Three.js, for a car positioned as shown 
        // in the image (with X rotation -89.9999), we need to use rotateY to get 
        // the same visual effect as adjusting Z rotation in the GUI
        carContainer.rotateY(carRotationSpeed * 0.01);
    }
    
    // Update stats
    stats.update();
    
    // Render scene
    renderer.render(scene, camera);
}

// Updated function to handle both car and container
// Thay thế toàn bộ hàm addCarPositionControls bằng hàm này
function addCarPositionControls(car, container, podiumCenter, defaultY) {
    const gui = new GUI();
    carControls = gui.addFolder('Car Position Controls');
    
    // Lưu vị trí mặc định dựa trên giá trị từ hình ảnh
    const defaultPosition = {
        x: -0.51869,
        y: 10.56688,
        z: -53.5685
    };
    
    // Position controls cho container (không phải cho car)
    carControls.add(container.position, 'x', defaultPosition.x - 30, defaultPosition.x + 30).name('X Position');
    carControls.add(container.position, 'y', defaultPosition.y - 20, defaultPosition.y + 20).name('Y Position');
    carControls.add(container.position, 'z', defaultPosition.z - 30, defaultPosition.z + 30).name('Z Position');
    
    // Thêm controls cho rotation
    const rotationFolder = carControls.addFolder('Car Rotation');
    
    // Tạo controls với chuyển đổi độ cho dễ hiểu
    // QUAN TRỌNG: Sử dụng rotation của CONTAINER thay vì car
    const rotationControl = {
        x: 0,  // Điều chỉnh về 0 vì bây giờ xe đã được đặt đúng trong container
        y: 0,
        z: 0
    };
    
    // Cập nhật rotation của CONTAINER khi giá trị điều khiển thay đổi
    const updateRotation = () => {
        container.rotation.x = THREE.MathUtils.degToRad(rotationControl.x);
        container.rotation.y = THREE.MathUtils.degToRad(rotationControl.y);
        container.rotation.z = THREE.MathUtils.degToRad(rotationControl.z);
    };
    
    // Thêm controls với độ (-180 đến 180)
    rotationFolder.add(rotationControl, 'x', -180, 180).name('X Rotation (deg)').onChange(updateRotation);
    rotationFolder.add(rotationControl, 'y', -180, 180).name('Y Rotation (deg)').onChange(updateRotation);
    rotationFolder.add(rotationControl, 'z', -180, 180).name('Z Rotation (deg)').onChange(updateRotation);
    
    // Thêm auto-rotation controls
    const autoRotationFolder = carControls.addFolder('Auto Rotation');
    autoRotationFolder.add({ enabled: carRotationEnabled }, 'enabled')
        .name('Enable Auto Rotation')
        .onChange(value => {
            carRotationEnabled = value;
        });
    autoRotationFolder.add({ speed: carRotationSpeed }, 'speed', 0.1, 3.0)
        .name('Rotation Speed')
        .onChange(value => {
            carRotationSpeed = value;
        });
    
    // Thêm nút reset
    carControls.add({
        resetPosition: function() {
            // Reset container position về mặc định
            container.position.x = defaultPosition.x;
            container.position.y = defaultPosition.y;
            container.position.z = defaultPosition.z;
            
            // Reset container rotation (không phải car rotation)
            container.rotation.x = 0;
            container.rotation.y = 0;
            container.rotation.z = 0;
            
            // Cập nhật giá trị rotation control
            rotationControl.x = 0;
            rotationControl.y = 0;
            rotationControl.z = 0;
            
            // Force GUI update
            for (const controller of rotationFolder.controllers) {
                controller.updateDisplay();
            }
        }
    }, 'resetPosition').name('Reset Car Position');
    
    // Thêm texture controls
    const textureFolder = gui.addFolder('Texture Controls');
    
    // Thêm tùy chọn texture và custom upload
    textureFolder.add({ texture: currentTextureName }, 'texture', [
        'Default', 
        'Custom Upload'
    ]).name('Texture').onChange(value => {
        if (value === 'Custom Upload') {
            document.getElementById('textureUpload').click();
        } else {
            currentTextureName = value;
            // Reset về texture mặc định
            resetPodiumTextures();
        }
    });
    
    // Mở tất cả các folder
    textureFolder.open();
    carControls.open();
    rotationFolder.open();
    autoRotationFolder.open();
}
