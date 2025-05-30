import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import Stats from "three/addons/libs/stats.module.js";
import GUI from "lil-gui";

// Global variables
let camera, scene, renderer, controls, stats;
let podium, car, carContainer;
const textureLoader = new THREE.TextureLoader();
const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();
const clock = new THREE.Clock();
let carControls;
let carRotationEnabled = true;
let carRotationSpeed = 0.5;
let customTexture = null;
let currentTextureName = "Default";
let customCarTexture = null;
let currentCarTextureName = "Default";
let skyboxTexture = null;

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  init();
  animate();

  // Set up UI interaction
  const startButton = document.getElementById("startButton");
  const startPanel = document.getElementById("startPanel");
  const backButton = document.getElementById("backButton");
  const loadingIndicator = document.getElementById("loadingIndicator");

  // Thêm input cho texture upload (ẩn)
  const textureUpload = document.createElement("input");
  textureUpload.type = "file";
  textureUpload.id = "textureUpload";
  textureUpload.accept = "image/*";
  textureUpload.style.display = "none";
  document.body.appendChild(textureUpload);

  // Thêm input cho car texture upload (ẩn)
  const carTextureUpload = document.createElement("input");
  carTextureUpload.type = "file";
  carTextureUpload.id = "carTextureUpload";
  carTextureUpload.accept = "image/*";
  carTextureUpload.style.display = "none";
  document.body.appendChild(carTextureUpload);

  // Xử lý upload texture cho podium
  textureUpload.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        applyCustomTexture(event.target.result);
      };

      reader.readAsDataURL(file);
    }
  });

  // Xử lý upload texture cho xe
  carTextureUpload.addEventListener("change", function (e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        applyCustomCarTexture(event.target.result);
      };

      reader.readAsDataURL(file);
    }
  });
  startButton.addEventListener("click", () => {
    startPanel.style.display = "none";
    loadingIndicator.style.display = "block";
    loadPodiumModel();
  });

  backButton.addEventListener("click", () => {
    // Clear selected car from localStorage before going back
    localStorage.removeItem("selectedCar");
    window.location.href = "index.html"; // Go back to the main page
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
  document.getElementById("webgl").appendChild(renderer.domElement);

  // Set up stats monitor
  stats = new Stats();
  document.getElementById("webgl").appendChild(stats.dom);

  // Create scene
  scene = new THREE.Scene();

  // Load and apply cubemap as environment
  loadCubemap();

  // Create camera
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
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

  // Handle window resize
  window.addEventListener("resize", onWindowResize);
}

// Load cubemap texture for environment
function loadCubemap() {
  // Load cubemap texture từ SkyBox_Img.png
  textureLoader.load(
    "./SkyBox/SkyBox_Img.png",
    function (texture) {
      // Tạo cubemap bằng cách sử dụng equirectangular mapping
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.encoding = THREE.sRGBEncoding;

      // Áp dụng làm background và environment
      scene.background = texture;
      scene.environment = texture;
      skyboxTexture = texture;

      console.log("Cubemap loaded successfully");

      // Cập nhật tất cả materials trong scene để sử dụng environment map
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.envMap = texture;
          child.material.envMapIntensity = 1.0;
          child.material.needsUpdate = true;
        }
      });
    },
    undefined,
    function (error) {
      console.error("Error loading cubemap:", error);
      // Fallback về màu nền mặc định nếu không load được
      scene.background = new THREE.Color(0xe0e0e0);
    }
  );
}

async function loadPodiumModel() {
  const loadingIndicator = document.getElementById("loadingIndicator");

  try {
    // Check for selected car info in localStorage
    let carPath = "Car/Car.fbx"; // Default fallback
    let carName = "DefaultCar";

    // Try to get selected car from localStorage
    const selectedCarJSON = localStorage.getItem("selectedCar");
    if (selectedCarJSON) {
      try {
        const selectedCar = JSON.parse(selectedCarJSON);
        carPath = selectedCar.path;
        carName = selectedCar.name;
        console.log(`Loading selected car: ${carName} from path: ${carPath}`);
      } catch (e) {
        console.error("Error parsing selected car from localStorage:", e);
      }
    }

    // Load the car model
    try {
      car = await loadCarModel(carPath);
      if (car) {
        car.name = carName;
        // Apply materials to car
        car.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Lưu material gốc để có thể reset
            if (!child.userData) {
              child.userData = {};
            }
            child.userData.originalMaterial = child.material.clone();
            
            // Áp dụng environment map cho car materials
            if (child.material && skyboxTexture) {
              child.material.envMap = skyboxTexture;
              child.material.envMapIntensity = 1.0;
              child.material.needsUpdate = true;
            }
          }
        });
      }
    } catch (error) {
      console.error(`Failed to load car model from ${carPath}:`, error);
      // Fall back to default car if selected car fails to load
      try {
        console.log("Falling back to default car model");
        car = await loadCarModel("Car/Car.fbx");
        if (car) {
          car.name = "DefaultCar";
          car.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              
              // Lưu material gốc để có thể reset
              if (!child.userData) {
                child.userData = {};
              }
              child.userData.originalMaterial = child.material.clone();
              
              if (child.material && skyboxTexture) {
                child.material.envMap = skyboxTexture;
                child.material.envMapIntensity = 1.0;
                child.material.needsUpdate = true;
              }
            }
          });
        }
      } catch (fallbackError) {
        console.error("Failed to load fallback car model:", fallbackError);
        // Continue without a car model
      }
    }

    // Load textures for podium
    const normalMap = textureLoader.load("./Podium/low_podium_Normal.png");
    const emissiveMap = textureLoader.load("./Podium/low_podium_Emissive.png");
    const ormMap = textureLoader.load(
      "./Podium/low_podium_OcclusionRoughnessMetallic.png"
    );

    // Configure texture encoding
    normalMap.encoding = THREE.LinearEncoding;
    emissiveMap.encoding = THREE.sRGBEncoding;

    // Load the podium FBX model
    fbxLoader.load(
      "./Podium/low.fbx",
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
              envMap: skyboxTexture, // Sử dụng environment map
              envMapIntensity: 1.5,
              color: 0x444444,
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
          size: { x: podiumSize.x, y: podiumSize.y, z: podiumSize.z },
        });

        // Position the car on top of the podium if it exists
        if (car) {
          // First perform car scaling
          const originalCarBox = new THREE.Box3().setFromObject(car);
          const originalCarSize = originalCarBox.getSize(new THREE.Vector3());

          // Scaling factor based on podium size, but with more reasonable values
          const scaleFactor =
            Math.min(
              (podiumSize.x * 0.4) / originalCarSize.x,
              (podiumSize.z * 0.4) / originalCarSize.z
            ) * 0.5; // Reduced scaling factor to make car smaller

          // Store original scale to be modified later
          const originalScale = {
            x: car.scale.x,
            y: car.scale.y,
            z: car.scale.z,
          };

          // Create a new helper to visualize podium top
          const podiumTopHelper = new THREE.Mesh(
            new THREE.BoxGeometry(5, 5, 5),
            new THREE.MeshBasicMaterial({ color: 0xff0000, visible: false })
          );
          podiumTopHelper.position.set(
            podiumCenter.x,
            podiumTopY,
            podiumCenter.z
          );
          scene.add(podiumTopHelper);
          // Reset car position and rotation first
          car.position.set(0, 0, 0);
          car.rotation.set(0, 0, 0); // Reset rotation completely

          // Apply rotation to make car horizontal and facing forward
          car.rotation.y = Math.PI; // Rotate 180 degrees to face forward

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
          // Adjust scale based on the model type
          const isGLTF = car.userData && car.userData.isGLTF;

          // Scale the car model appropriately based on car type
          if (isGLTF) {
            // Apply more reasonable scaling for different models
            if (car.name.includes("Ferrari")) {
              car.scale.set(8, 8, 8);
            } else if (car.name.includes("Aspark")) {
              car.scale.set(8, 8, 8);
            } else if (car.name.includes("Bugatti")) {
              car.scale.set(8, 8, 8);
            } else if (car.name.includes("Nilu")) {
              car.scale.set(800, 800, 800);
            } else {
              car.scale.set(7, 7, 7); // Default scale for other GLTF models
            }
          } else {
            // For FBX models like the default Car.fbx
            car.scale.set(1, 1, 1);
          }
          
          // Đặt tọa độ mặc định cho xe
          const defaultCarPosition = {
            x: 0,
            y: podiumTopY + 0.2,
            z: -52
          };
          
          // Position the container at the default position
          carContainer.position.set(
            defaultCarPosition.x, 
            defaultCarPosition.y, 
            defaultCarPosition.z
          );

          console.log("Podium top Y:", podiumTopY);
          console.log("Car height:", carHeight);
          console.log("Car center:", carCenter);
          console.log("Final container position:", carContainer.position);

          // Add GUI controls for car position - truyền tọa độ mặc định thực tế
          addCarPositionControls(
            car,
            carContainer,
            podiumCenter,
            defaultCarPosition // Truyền object chứa tọa độ mặc định đầy đủ
          );
        }

        // Hide loading indicator
        loadingIndicator.style.display = "none";

        // Calculate scene bounding box and adjust camera
        const combinedBox = new THREE.Box3().setFromObject(scene);
        const center = combinedBox.getCenter(new THREE.Vector3());
        const size = combinedBox.getSize(new THREE.Vector3());

        // Set camera to be directly in front of and close to the podium
        const podiumFrontZ = podiumBox.max.z + 20; // Position in front of the podium
        const podiumCenterX = podiumCenter.x;
        const podiumCenterY = podiumCenter.y + 10; // Slightly above podium center
        // Position camera for a good diagonal view of podium and car
        camera.position.set(
          podiumCenterX + 30,
          podiumCenterY + 15,
          podiumFrontZ + 40 // Closer to the podium and at an angle
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
        frontSpotlight.position.set(
          podiumCenterX,
          podiumCenterY + 20,
          podiumFrontZ + 80
        );
        frontSpotlight.target.position.set(
          podiumCenterX,
          podiumCenterY,
          podiumCenter.z
        );
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
        console.error("Error loading FBX model:", error);
        loadingIndicator.textContent = "Error loading model. Please try again.";
      }
    );
  } catch (error) {
    console.error("Error in loading models:", error);
    loadingIndicator.textContent = "Error loading models. Please try again.";
  }
}

// Helper function to load car model
function loadCarModel(path) {
  return new Promise((resolve, reject) => {
    // Check file extension to determine which loader to use
    const fileExtension = path.split(".").pop().toLowerCase();

    if (fileExtension === "fbx") {
      fbxLoader.load(
        path,
        (object) => {
          // Mark this as an FBX model in userData
          object.userData = object.userData || {};
          object.userData.isGLTF = false;
          resolve(object);
        },
        (xhr) => {
          console.log(
            `Car loading: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`
          );
        },
        (error) => {
          console.error("Error loading car model:", error);
          reject(error);
        }
      );
    } else if (fileExtension === "gltf" || fileExtension === "glb") {
      // Use GLTFLoader for GLTF/GLB files
      gltfLoader.load(
        path,
        (gltf) => {
          // GLTF loader returns an object with a scene property
          // We need to extract the scene to be consistent with FBX loader
          const model = gltf.scene;

          // Mark this as a GLTF model in userData and store the path
          model.userData = model.userData || {};
          model.userData.isGLTF = true;
          model.userData.modelPath = path;

          // Store model name for better identification
          if (path.includes("ferrari")) {
            model.userData.modelType = "Ferrari";
          } else if (path.includes("bugatti")) {
            model.userData.modelType = "Bugatti";
          } else if (path.includes("aspark")) {
            model.userData.modelType = "Aspark";
          }

          resolve(model);
        },
        (xhr) => {
          console.log(
            `Car loading: ${Math.floor((xhr.loaded / xhr.total) * 100)}%`
          );
        },
        (error) => {
          console.error("Error loading GLTF model:", error);
          reject(error);
        }
      );
    } else {
      reject(new Error(`Unsupported file format: ${fileExtension}`));
    }
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
  customTexture = new THREE.TextureLoader().load(imageUrl, function (texture) {
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
          metalness: 0.3,
          envMap: skyboxTexture, // Sử dụng environment map
          envMapIntensity: child.material.envMapIntensity || 1.0,
        });

        // Cập nhật material cho mesh
        child.material = material;

        console.log("Applied custom texture to podium");
      }
    });

    currentTextureName = "Custom Upload";
  });
}

// Reset podium textures về mặc định
function resetPodiumTextures() {
  if (!podium) return;

  // Tải lại các texture mặc định
  const normalMap = textureLoader.load("./Podium/low_podium_Normal.png");
  const emissiveMap = textureLoader.load("./Podium/low_podium_Emissive.png");
  const ormMap = textureLoader.load(
    "./Podium/low_podium_OcclusionRoughnessMetallic.png"
  );

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
        envMap: skyboxTexture, // Sử dụng environment map
        envMapIntensity: 1.5,
        color: 0x444444,
      });

      // Áp dụng material
      child.material = material;
    }
  });

  console.log("Reset podium textures to default");
}

// Áp dụng custom texture cho xe từ ảnh bitmap đã upload
function applyCustomCarTexture(imageUrl) {
  if (!car) return;

  // Tạo texture mới từ ảnh bitmap đã upload
  customCarTexture = new THREE.TextureLoader().load(imageUrl, function (texture) {
    texture.encoding = THREE.sRGBEncoding;
    texture.needsUpdate = true;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    // Áp dụng texture lên xe
    car.traverse((child) => {
      if (child.isMesh) {
        // Tạo material mới với custom texture
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.3,
          metalness: 0.7,
          envMap: skyboxTexture, // Sử dụng environment map
          envMapIntensity: 1.2,
        });

        // Cập nhật material cho mesh
        child.material = material;

        console.log("Applied custom texture to car");
      }
    });

    currentCarTextureName = "Custom Upload";
  });
}

// Reset car textures về mặc định
function resetCarTextures() {
  if (!car) return;

  // Áp dụng lại material mặc định cho xe
  car.traverse((child) => {
    if (child.isMesh) {
      // Sử dụng original material nếu có, nếu không tạo material mặc định
      if (child.userData && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial.clone();
        // Cập nhật environment map
        if (skyboxTexture) {
          child.material.envMap = skyboxTexture;
          child.material.envMapIntensity = 1.0;
          child.material.needsUpdate = true;
        }
      } else {
        // Tạo lại material mặc định cho xe với màu và thuộc tính phù hợp
        const material = new THREE.MeshStandardMaterial({
          color: child.material.color || 0xffffff, // Giữ màu gốc hoặc trắng
          roughness: 0.2,
          metalness: 0.8,
          envMap: skyboxTexture, // Sử dụng environment map
          envMapIntensity: 1.5,
        });

        // Áp dụng material
        child.material = material;
      }
    }
  });

  console.log("Reset car textures to default");
  currentCarTextureName = "Default";
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
function addCarPositionControls(car, container, podiumCenter, defaultCarPosition) {
  const gui = new GUI();
  carControls = gui.addFolder("Car Position Controls");

  // Lưu tọa độ mặc định thực tế (bao gồm cả z = -52)
  const defaultPosition = {
    x: defaultCarPosition.x,
    y: defaultCarPosition.y,
    z: defaultCarPosition.z,
  };

  // Position controls for the container với range phù hợp
  const xControl = carControls.add(container.position, "x", -20, 20).name("X Position");
  const yControl = carControls.add(container.position, "y", defaultPosition.y - 2, defaultPosition.y + 20).name("Y Position");
  const zControl = carControls.add(container.position, "z", defaultPosition.z - 20, defaultPosition.z + 20).name("Z Position");

  // Thêm controls cho rotation
  const rotationFolder = carControls.addFolder("Car Rotation");

  // Tạo controls với chuyển đổi độ cho dễ hiểu
  // QUAN TRỌNG: Sử dụng rotation của CONTAINER thay vì car
  const rotationControl = {
    x: 0, // Điều chỉnh về 0 vì bây giờ xe đã được đặt đúng trong container
    y: 0,
    z: 0,
  };

  // Cập nhật rotation của CONTAINER khi giá trị điều khiển thay đổi
  const updateRotation = () => {
    container.rotation.x = THREE.MathUtils.degToRad(rotationControl.x);
    container.rotation.y = THREE.MathUtils.degToRad(rotationControl.y);
    container.rotation.z = THREE.MathUtils.degToRad(rotationControl.z);
  };

  // Thêm controls với độ (-180 đến 180)
  const xRotControl = rotationFolder
    .add(rotationControl, "x", -180, 180)
    .name("X Rotation (deg)")
    .onChange(updateRotation);
  const yRotControl = rotationFolder
    .add(rotationControl, "y", -180, 180)
    .name("Y Rotation (deg)")
    .onChange(updateRotation);
  const zRotControl = rotationFolder
    .add(rotationControl, "z", -180, 180)
    .name("Z Rotation (deg)")
    .onChange(updateRotation);

  // Thêm auto-rotation controls
  const autoRotationFolder = carControls.addFolder("Auto Rotation");
  autoRotationFolder
    .add({ enabled: carRotationEnabled }, "enabled")
    .name("Enable Auto Rotation")
    .onChange((value) => {
      carRotationEnabled = value;
    });
  autoRotationFolder
    .add({ speed: carRotationSpeed }, "speed", 0.1, 3.0)
    .name("Rotation Speed")
    .onChange((value) => {
      carRotationSpeed = value;
    });

  // Thêm nút reset với logic sửa đổi
  carControls
    .add(
      {
        resetPosition: function () {
          // Reset container position về tọa độ mặc định thực tế
          container.position.x = defaultPosition.x;
          container.position.y = defaultPosition.y;
          container.position.z = defaultPosition.z;

          // Reset container rotation
          container.rotation.x = 0;
          container.rotation.y = 0;
          container.rotation.z = 0;

          // Reset rotation control values
          rotationControl.x = 0;
          rotationControl.y = 0;
          rotationControl.z = 0;

          // Force GUI update cho tất cả controls
          xControl.updateDisplay();
          yControl.updateDisplay();
          zControl.updateDisplay();
          xRotControl.updateDisplay();
          yRotControl.updateDisplay();
          zRotControl.updateDisplay();

          console.log("Reset car to default position:", defaultPosition);
        },
      },
      "resetPosition"
    )
    .name("Reset Car Position");

  // Thêm texture controls cho podium
  const textureFolder = gui.addFolder("Podium Texture Controls");

  // Thêm tùy chọn texture và custom upload cho podium
  textureFolder
    .add({ texture: currentTextureName }, "texture", [
      "Default",
      "Custom Upload",
    ])
    .name("Podium Texture")
    .onChange((value) => {
      if (value === "Custom Upload") {
        document.getElementById("textureUpload").click();
      } else {
        currentTextureName = value;
        // Reset về texture mặc định
        resetPodiumTextures();
      }
    });

  // Thêm texture controls cho xe
  const carTextureFolder = gui.addFolder("Car Texture Controls");

  // Thêm tùy chọn texture và custom upload cho xe
  carTextureFolder
    .add({ texture: currentCarTextureName }, "texture", [
      "Default",
      "Custom Upload",
    ])
    .name("Car Texture")
    .onChange((value) => {
      if (value === "Custom Upload") {
        document.getElementById("carTextureUpload").click();
      } else {
        currentCarTextureName = value;
        // Reset về texture mặc định
        resetCarTextures();
      }
    });

  // Thêm material properties controls cho xe
  const carMaterialFolder = carTextureFolder.addFolder("Car Material Properties");
  
  // Roughness control cho xe
  carMaterialFolder
    .add({ roughness: 0.2 }, "roughness", 0, 1)
    .name("Car Roughness")
    .onChange((value) => {
      if (car) {
        car.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.roughness = value;
          }
        });
      }
    });

  // Metalness control cho xe
  carMaterialFolder
    .add({ metalness: 0.8 }, "metalness", 0, 1)
    .name("Car Metalness")
    .onChange((value) => {
      if (car) {
        car.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.metalness = value;
          }
        });
      }
    });

  // Environment map intensity cho xe
  carMaterialFolder
    .add({ envIntensity: 1.5 }, "envIntensity", 0, 3)
    .name("Car Env Intensity")
    .onChange((value) => {
      if (car) {
        car.traverse((child) => {
          if (child.isMesh && child.material && child.material.envMapIntensity !== undefined) {
            child.material.envMapIntensity = value;
          }
        });
      }
    });

  // Thêm skybox controls
  const skyboxFolder = gui.addFolder("Skybox Controls");
  skyboxFolder
    .add({ enabled: true }, "enabled")
    .name("Enable Skybox")
    .onChange((value) => {
      if (value && skyboxTexture) {
        scene.background = skyboxTexture;
        scene.environment = skyboxTexture;
      } else {
        scene.background = new THREE.Color(0xe0e0e0);
        scene.environment = null;
      }
    });

  // Thêm environment intensity control
  skyboxFolder
    .add({ intensity: 1.0 }, "intensity", 0, 3)
    .name("Environment Intensity")
    .onChange((value) => {
      scene.traverse((child) => {
        if (
          child.isMesh &&
          child.material &&
          child.material.envMapIntensity !== undefined
        ) {
          child.material.envMapIntensity = value;
        }
      });
    });

  // Mở tất cả các folder
  textureFolder.open();
  carTextureFolder.open();
  carMaterialFolder.open();
  skyboxFolder.open();
  carControls.open();
  rotationFolder.open();
  autoRotationFolder.open();
}