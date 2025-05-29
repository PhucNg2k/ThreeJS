import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import GUI from "lil-gui";

// Cars array and selected car
let cars = [];
let selectedCar = null;

// Available maps and selected map
let maps = [];
let currentMapIndex = 0;
let selectedMap = null;

// Audio player for background music
let musicEnabled = false;
let backgroundMusic = null;
let musicVolume = 0.7; // Default volume (0-1)
let currentTrackInfo = "No track selected";
let currentTrackIndex = 0; // Track the current song index

// Available music tracks
const musicTracks = [
  { url: "/audio/driving_music_1.mp3", name: "Driving Theme 1" },
  { url: "/audio/driving_music_2.mp3", name: "Driving Theme 2" },
  { url: "/audio/driving_music_3.mp3", name: "Driving Theme 3" },
];

// Car driving variables
let isDriving = true;
let carSpeed = 0;
let carMaxSpeed = 15;
let carAcceleration = 0.2;
let carDeceleration = 0.1;
let carTurnSpeed = 0.03;
let thirdPersonCameraDistance = 300;
let thirdPersonCameraHeight = 350;
let cameraLerpFactor = 0.1;
let carControls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
};

// Camera variables for smooth transitions
let prevCameraTarget = new THREE.Vector3();
let prevLookAtPoint = new THREE.Vector3();
let targetCameraRotationZ = 0;
let currentTurnInfluence = 0;

// Main scene components
let renderer, camera, scene, stats;
let orthoCamera, minimapRenderer; // For minimap
let composer, outlinePass;
let clock = new THREE.Clock();
let settingsGui;

// URL parameters for car selection
const urlParams = new URLSearchParams(window.location.search);
const carId = urlParams.get("car");

// Loading screen management
const loadingManager = new THREE.LoadingManager();
const loadingScreen = document.getElementById("loadingScreen");
const progressBar = document.querySelector(".progress-bar");
const loadingInfo = document.querySelector(".loading-info");

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
  const progress = (itemsLoaded / itemsTotal) * 100;
  progressBar.style.width = progress + "%";
  loadingInfo.textContent = `Loading: ${Math.round(
    progress
  )}% (${itemsLoaded}/${itemsTotal})`;
};

loadingManager.onLoad = function () {
  // Fade out the loading screen
  loadingScreen.style.opacity = 0;
  // Hide it completely after transition
  setTimeout(() => {
    loadingScreen.style.display = "none";
  }, 500);
};

loadingManager.onError = function (url) {
  console.error("Error loading:", url);
  loadingInfo.textContent = `Error loading resource: ${url.split("/").pop()}`;
  loadingInfo.style.color = "#ff3a3a";
};

// Initialize the scene
async function init() {
  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  // Stats for performance monitoring
  stats = new Stats();
  document.getElementById("webgl").appendChild(stats.dom);
  document.getElementById("webgl").appendChild(renderer.domElement);

  // Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1.0,
    10000
  );
  camera.updateProjectionMatrix();
  // Create scene
  scene = new THREE.Scene();
  // Create ortho camera for minimap with initially neutral dimensions
  // We'll set proper dimensions in updateMapCamera function
  orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 2000);
  orthoCamera.position.set(0, 1000, 0);
  orthoCamera.lookAt(0, 0, 0);
  scene.add(orthoCamera);

  // Setup minimap renderer
  minimapRenderer = new THREE.WebGLRenderer({
    alpha: true,
    canvas: document.getElementById("minimapCanvas"),
  });
  minimapRenderer.setPixelRatio(window.devicePixelRatio);
  minimapRenderer.setClearColor(0x000000, 0); // transparent background

  // Create a skybox for urban environment
  const skyboxLoader = new THREE.CubeTextureLoader();
  const skyboxTexture = skyboxLoader.load([
    "/BoxPieces/px.bmp",
    "/BoxPieces/nx.bmp",
    "/BoxPieces/py.bmp",
    "/BoxPieces/ny.bmp",
    "/BoxPieces/pz.bmp",
    "/BoxPieces/nz.bmp",
  ]);

  // Fallback to blue sky if skybox fails to load
  scene.background = skyboxTexture;

  scene.add(new THREE.AxesHelper(100)); // Helper for orientation

  // Initialize audio system
  setupAudio();

  // Add lighting
  setupLighting();

  // Load car models
  await loadCars();

  // Set car from URL parameter if provided, otherwise use first car
  if (carId && parseInt(carId) >= 0 && parseInt(carId) < cars.length) {
    selectedCar = cars[parseInt(carId)];
  } else {
    selectedCar = cars[0]; // Default to first car
  }

  // Set camera position initially
  updateCarFollowCamera(true);

  // Setup post-processing
  setupPostProcessing();

  // Event listeners
  setupEventListeners();

  // Create GUI for car settings
  createSettingsGUI();
  // Display car name
  document.getElementById("current-car-name").textContent = selectedCar
    ? selectedCar.name
    : "Unknown Car";

  // Display map name and description if available
  if (selectedMap) {
    document.getElementById("current-map-name").textContent = selectedMap.name;
    document.getElementById("map-description").textContent =
      selectedMap.userData.description;
  } // Start animation loop
  animate();

  // Show notification about unlimited driving and fixed exit button
  document.getElementById("map-notification").textContent =
    "Unlimited Driving Enabled & Exit Button Fixed";
  document.getElementById("map-notification").style.opacity = 1;
  document.getElementById("map-notification").style.color = "#00cc00";

  // Hide notification after 3 seconds
  setTimeout(() => {
    document.getElementById("map-notification").style.opacity = 0;
  }, 3000);
}

function setupAudio() {
  try {
    // Initialize the audio listener and add it to the camera
    const listener = new THREE.AudioListener();
    camera.add(listener);

    // Create a global audio source
    backgroundMusic = new THREE.Audio(listener);

    // Load a sound and set it as the Audio object's buffer
    const audioLoader = new THREE.AudioLoader();

    // Start with the first track (index 0) instead of random
    const selectedTrack = musicTracks[currentTrackIndex];

    // Display the selected track name
    currentTrackInfo = selectedTrack.name;
    document.getElementById("currentTrack").textContent = currentTrackInfo;

    // Load and set up the audio
    audioLoader.load(
      selectedTrack.url,
      function (buffer) {
        backgroundMusic.setBuffer(buffer);
        backgroundMusic.setLoop(true);
        backgroundMusic.setVolume(musicVolume);

        // Enable all music control buttons
        document.getElementById("toggleMusic").disabled = false;
        document.getElementById("prevTrack").disabled = false;
        document.getElementById("nextTrack").disabled = false;

        // Do not autoplay - wait for user interaction
        console.log("Music loaded: " + selectedTrack.name);
      },
      function (xhr) {
        // Progress callback
        if (xhr.lengthComputable) {
          console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
        }
      },
      function (err) {
        // Error callback
        handleAudioLoadError(err, selectedTrack.name);
      }
    );

    // Set up button event listeners
    document
      .getElementById("toggleMusic")
      .addEventListener("click", toggleMusic);
    document
      .getElementById("prevTrack")
      .addEventListener("click", () => changeTrack("prev"));
    document
      .getElementById("nextTrack")
      .addEventListener("click", () => changeTrack("next"));
    document
      .getElementById("volumeSlider")
      .addEventListener("input", updateVolume);
  } catch (error) {
    console.error("Error setting up audio system:", error);
    document.getElementById("currentTrack").textContent =
      "Audio system unavailable";
    document.getElementById("toggleMusic").disabled = true;
    document.getElementById("prevTrack").disabled = true;
    document.getElementById("nextTrack").disabled = true;
  }
}

function handleAudioLoadError(error, trackName) {
  console.error(`Error loading track "${trackName}":`, error);
  document.getElementById(
    "currentTrack"
  ).innerHTML = `<span style="color:#ff3a3a">Audio file missing</span><br>
     <span style="font-size:10px">See /audio/README.md</span>`;

  // Disable all music control buttons
  const toggleMusicBtn = document.getElementById("toggleMusic");
  toggleMusicBtn.disabled = true;
  toggleMusicBtn.textContent = "Audio Unavailable";
  toggleMusicBtn.style.backgroundColor = "#666";

  document.getElementById("prevTrack").disabled = true;
  document.getElementById("nextTrack").disabled = true;

  // Show alert with instructions on first error only
  if (!window.audioErrorShown) {
    window.audioErrorShown = true;
    setTimeout(() => {
      alert(
        "Audio files are missing!\n\nTo enable music while driving, please add MP3 files to the audio folder. See the README.md file in that folder for instructions."
      );
    }, 1000);
  }
}

function toggleMusic() {
  const toggleBtn = document.getElementById("toggleMusic");

  if (toggleBtn.disabled) {
    return; // Do nothing if the button is disabled
  }

  if (!musicEnabled) {
    // Start music
    if (backgroundMusic && backgroundMusic.buffer) {
      try {
        backgroundMusic.play();
        musicEnabled = true;
        toggleBtn.textContent = "Pause Music";
        toggleBtn.classList.add("playing");
      } catch (error) {
        console.error("Error playing music:", error);
        alert(
          "There was an error playing the music. This might be due to the browser's autoplay policy. Try clicking the play button again."
        );
      }
    } else {
      console.error("Music not loaded yet");
      document.getElementById("currentTrack").textContent =
        "Music loading... please wait";
    }
  } else {
    // Pause music
    if (backgroundMusic) {
      backgroundMusic.pause();
      musicEnabled = false;
      toggleBtn.textContent = "Play Music";
      toggleBtn.classList.remove("playing");
    }
  }
}

function updateVolume() {
  const volumeSlider = document.getElementById("volumeSlider");
  musicVolume = volumeSlider.value / 100;

  if (backgroundMusic) {
    backgroundMusic.setVolume(musicVolume);
  }
}

// Function to change tracks (next or previous)
function changeTrack(direction) {
  // Calculate the new track index
  const wasPlaying = musicEnabled;
  let newIndex = currentTrackIndex;

  if (direction === "next") {
    newIndex = (currentTrackIndex + 1) % musicTracks.length;
  } else if (direction === "prev") {
    newIndex =
      (currentTrackIndex - 1 + musicTracks.length) % musicTracks.length;
  }

  // Only change if it's a different track
  if (newIndex === currentTrackIndex) return;

  // If music was playing, pause it first
  if (musicEnabled && backgroundMusic) {
    backgroundMusic.pause();
  }

  // Update the current track index
  currentTrackIndex = newIndex;
  const selectedTrack = musicTracks[currentTrackIndex];

  // Update the UI
  currentTrackInfo = selectedTrack.name;
  document.getElementById("currentTrack").textContent = currentTrackInfo;

  // Load the new track
  const audioLoader = new THREE.AudioLoader();

  // Show loading indicator
  document.getElementById(
    "currentTrack"
  ).textContent = `Loading: ${selectedTrack.name}...`;

  // Temporarily disable buttons
  document.getElementById("toggleMusic").disabled = true;
  document.getElementById("prevTrack").disabled = true;
  document.getElementById("nextTrack").disabled = true;

  // Load the new audio
  audioLoader.load(
    selectedTrack.url,
    function (buffer) {
      backgroundMusic.setBuffer(buffer);
      backgroundMusic.setLoop(true);
      backgroundMusic.setVolume(musicVolume);

      // Re-enable buttons
      document.getElementById("toggleMusic").disabled = false;
      document.getElementById("prevTrack").disabled = false;
      document.getElementById("nextTrack").disabled = false;

      // Update the UI
      document.getElementById("currentTrack").textContent = selectedTrack.name;

      // If music was playing before, auto-play the new track
      if (wasPlaying) {
        backgroundMusic.play();
        musicEnabled = true;
        document.getElementById("toggleMusic").textContent = "Pause Music";
        document.getElementById("toggleMusic").classList.add("playing");
      }

      console.log(`Changed to track: ${selectedTrack.name}`);
    },
    function (xhr) {
      // Progress callback
      if (xhr.lengthComputable) {
        console.log(
          `Loading ${selectedTrack.name}: ${Math.round(
            (xhr.loaded / xhr.total) * 100
          )}% complete`
        );
      }
    },
    function (error) {
      // Error callback
      handleAudioLoadError(error, selectedTrack.name);
    }
  );
}

function setupLighting() {
  // Add ambient light - slightly brighter for better visibility in the city
  const ambientLight = new THREE.AmbientLight(0xffffff, 10);
  scene.add(ambientLight);

  // Add directional light (sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(500, 1000, -800);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 100;
  directionalLight.shadow.camera.far = 5000; // Extended shadow distance for city
  directionalLight.shadow.camera.left = -3000; // Wider shadow camera for city
  directionalLight.shadow.camera.right = 3000;
  directionalLight.shadow.camera.top = 3000;
  directionalLight.shadow.camera.bottom = -3000;
  scene.add(directionalLight);

  // Add multiple street lights for city atmosphere
  const streetLightPositions = [
    [500, 200, -500],
    [-500, 200, -1000],
    [500, 200, -1500],
    [-500, 200, -2000],
    [500, 200, -2500],
    [-500, 200, -3000],
    [0, 200, -3500],
  ];

  streetLightPositions.forEach((position, index) => {
    // Create street light
    const streetLight = new THREE.PointLight(0xffffcc, 8000, 800, 2);
    streetLight.position.set(position[0], position[1], position[2]);
    streetLight.castShadow = index < 3; // Only first few lights cast shadows for performance
    if (streetLight.castShadow) {
      streetLight.shadow.mapSize.width = 512;
      streetLight.shadow.mapSize.height = 512;
      streetLight.shadow.camera.near = 10;
      streetLight.shadow.camera.far = 1000;
    }
    scene.add(streetLight);

    // Visual representation of the light source
    const lightGeometry = new THREE.SphereGeometry(5, 16, 8);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
    lightMesh.position.copy(streetLight.position);
    scene.add(lightMesh);
  });

  // Add spotlight for dramatic car lighting - now warmer color
  const spotLight = new THREE.SpotLight(0xffaa00, 15000);
  spotLight.position.set(500, 800, -1200);
  spotLight.angle = Math.PI / 6;
  spotLight.penumbra = 0.3;
  spotLight.decay = 2;
  spotLight.distance = 3000;
  spotLight.castShadow = true;
  spotLight.shadow.mapSize.width = 1024;
  spotLight.shadow.mapSize.height = 1024;
  spotLight.shadow.camera.near = 10;
  spotLight.shadow.camera.far = spotLight.distance;
  scene.add(spotLight);
}

function loadTexture(path) {
  return new Promise((resolve, reject) => {
    // Use path as-is since files in public are served at root
    const fullPath = path.startsWith("/") ? path : `/${path}`;
    console.log(`Loading texture from: ${fullPath}`);

    new THREE.TextureLoader(loadingManager).load(
      fullPath,
      (texture) => {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(100, 100); // Tile the texture
        texture.anisotropy = 16; // Better texture quality at angles
        resolve(texture);
      },
      undefined,
      (err) => {
        console.error(`Error loading texture from ${fullPath}:`, err);
        reject(err);
      }
    );
  });
}

async function loadCars() {
  // Load all car models
  try {
    // Get the selected car ID from URL
    const urlCarId = parseInt(carId);
    const carOptions = [
      {
        path: "mclaren/aspark_owl_2020__www.vecarz.com/scene.gltf",
        name: "Aspark Owl",
        scale: [150, 150, 150],
      },
      {
        path: "mclaren/bugatti_bolide_2024__www.vecarz.com/scene.gltf",
        name: "Bugatti Bolide",
        scale: [150, 150, 150],
      },
      {
        path: "mclaren/nilu_27_concept_2024__www.vecarz.com/scene.gltf",
        name: "Nilu 27 Concept",
        scale: [13000, 13000, 13000],
      },
      {
        path: "mclaren/ferrari_laferrari__www.vecarz.com/scene.gltf",
        name: "Ferrari LaFerrari",
        scale: [150, 150, 150],
      },
    ]; // Define map options
    const mapOptions = [
      {
        path: "mclaren/city_nyc_times_square/scene.gltf",
        name: "NYC Times Square",
        scale: [1500, 1500, 1500],
        position: [0, -5, -2000],
        description: "Busy urban city environment inspired by Times Square",
      },
      {
        path: "mclaren/full_gameready_city_buildings/scene.gltf",
        name: "Game-Ready City",
        scale: [200, 200, 200],
        position: [0, -5, -2000],
        description: "Modern city with realistic buildings and wide streets",
      },
    ];

    // Check if URL has a map parameter
    const mapId = urlParams.get("map");
    if (mapId && parseInt(mapId) >= 0 && parseInt(mapId) < mapOptions.length) {
      currentMapIndex = parseInt(mapId);
    }

    // Load all maps but only add the selected one to the scene
    for (let i = 0; i < mapOptions.length; i++) {
      const mapOption = mapOptions[i];
      console.log(`Loading map: ${mapOption.name}...`);

      try {
        const map = await loadGLTFModel(mapOption.path);
        map.name = mapOption.name;
        map.userData.description = mapOption.description;

        // Configure map
        map.scale.set(
          mapOption.scale[0],
          mapOption.scale[1],
          mapOption.scale[2]
        );
        map.position.set(
          mapOption.position[0],
          mapOption.position[1],
          mapOption.position[2]
        );

        // Add to maps array
        maps.push(map);

        // Add the selected map to the scene
        if (i === currentMapIndex) {
          scene.add(map);
          selectedMap = map;
          console.log(`Added ${map.name} to scene as the selected map`);
        }
      } catch (error) {
        console.error(`Error loading map ${mapOption.name}:`, error);
      }
    }

    // Load all car models but only add the selected one to the scene
    for (let i = 0; i < carOptions.length; i++) {
      const carOption = carOptions[i];
      console.log(`Loading ${carOption.name}...`);

      const car = await loadGLTFModel(carOption.path);
      car.name = carOption.name;
      setupCarPhysics(car);

      // Apply scale
      car.scale.set(carOption.scale[0], carOption.scale[1], carOption.scale[2]);

      // Position in the center of the scene
      car.position.set(0, 5, 0);

      // Rotate car to face forward
      car.rotation.y = Math.PI;

      // Add car to array
      cars.push(car);

      // Only add the selected car (or the first one if no selection) to the scene
      if (i === (isNaN(urlCarId) ? 0 : urlCarId)) {
        scene.add(car);
        console.log(`Added ${car.name} to scene as the selected car`);
      }
    }
  } catch (error) {
    console.error("Error loading car models:", error);
  }
}

function setupCarPhysics(car) {
  // Setup car physics properties
  car.userData.velocity = new THREE.Vector3();
  car.userData.acceleration = new THREE.Vector3();
  car.userData.direction = new THREE.Vector3(0, 0, 1);
  car.userData.wheels = car.userData.wheels || [];

  // Enable shadows for all car meshes
  car.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });
}

function loadGLTFModel(gltfPath) {
  return new Promise((resolve, reject) => {
    // Setup DRACO decoder
    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(
      "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
    );
    dracoLoader.setDecoderConfig({ type: "js" });

    // Setup GLTF loader
    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setDRACOLoader(dracoLoader);

    console.log(`Loading 3D model from: ${gltfPath}`);

    gltfLoader.load(
      gltfPath,
      (gltf) => {
        const model = gltf.scene;
        console.log(`Successfully loaded model: ${gltfPath}`);
        resolve(model);
      },
      (xhr) => {
        if (xhr.lengthComputable) {
          const percentComplete = ((xhr.loaded / xhr.total) * 100).toFixed(2);
          console.log(`Loading ${gltfPath}: ${percentComplete}% complete`);
        }
      },
      (error) => {
        console.error(`Error loading model ${gltfPath}:`, error);
        reject(error);
      }
    );
  });
}

function setupPostProcessing() {
  // Create effect composer and add render pass
  const renderPass = new RenderPass(scene, camera);
  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );

  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(outlinePass);

  // Configure outline effect
  outlinePass.edgeStrength = 3;
  outlinePass.edgeGlow = 0.5;
  outlinePass.edgeThickness = 1.0;
  outlinePass.visibleEdgeColor.set(0xff0000);
}

function setupEventListeners() {
  // Key events for driving controls
  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", onWindowResize);

  // Exit button
  document
    .getElementById("exitButton")
    .addEventListener("click", exitDrivingMode);
}

function onKeyDown(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      carControls.forward = true;
      break;
    case "KeyS":
    case "ArrowDown":
      carControls.backward = true;
      break;
    case "KeyA":
    case "ArrowLeft":
      carControls.left = true;
      break;
    case "KeyD":
    case "ArrowRight":
      carControls.right = true;
      break;
    case "Space":
      carControls.brake = true;
      break;
    case "KeyM":
      // Toggle music with M key
      toggleMusic();
      break;
    case "KeyP":
      // Also toggle music with P key
      toggleMusic();
      break;
    case "KeyN":
      // Next track with N key
      if (!document.getElementById("nextTrack").disabled) {
        changeTrack("next");
      }
      break;
    case "KeyB":
      // Previous track with B key
      if (!document.getElementById("prevTrack").disabled) {
        changeTrack("prev");
      }
      break;
    case "Equal": // + key
      // Increase volume
      const increaseVolumeSlider = document.getElementById("volumeSlider");
      increaseVolumeSlider.value = Math.min(
        100,
        parseInt(increaseVolumeSlider.value) + 10
      );
      updateVolume();
      break;
    case "Minus": // - key
      // Decrease volume
      const decreaseVolumeSlider = document.getElementById("volumeSlider");
      decreaseVolumeSlider.value = Math.max(
        0,
        parseInt(decreaseVolumeSlider.value) - 10
      );
      updateVolume();
      break;
    case "KeyX":
      // Switch to next map
      switchMap("next");
      break;
    case "KeyZ":
      // Switch to previous map
      switchMap("prev");
      break;
    case "Escape":
      exitDrivingMode();
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "KeyW":
    case "ArrowUp":
      carControls.forward = false;
      break;
    case "KeyS":
    case "ArrowDown":
      carControls.backward = false;
      break;
    case "KeyA":
    case "ArrowLeft":
      carControls.left = false;
      break;
    case "KeyD":
    case "ArrowRight":
      carControls.right = false;
      break;
    case "Space":
      carControls.brake = false;
      break;
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);

  // Update minimap camera with proper dimensions
  // This will be done in updateMapCamera, no need to manually adjust here
}

function createSettingsGUI() {
  // Create GUI using lil-gui for car settings
  settingsGui = new GUI({
    container: document.getElementById("settingsContent"),
    autoPlace: false,
  });

  const carFolder = settingsGui.addFolder("Performance");
  carFolder
    .add({ "Max Speed": carMaxSpeed }, "Max Speed", 5, 50)
    .onChange((value) => {
      carMaxSpeed = value;
    });
  carFolder
    .add({ Acceleration: carAcceleration }, "Acceleration", 0.1, 1)
    .onChange((value) => {
      carAcceleration = value;
    });
  carFolder
    .add({ "Turn Speed": carTurnSpeed }, "Turn Speed", 0.01, 0.1)
    .onChange((value) => {
      carTurnSpeed = value;
    });
  carFolder
    .add({ "Braking Power": carDeceleration }, "Braking Power", 0.05, 0.5)
    .onChange((value) => {
      carDeceleration = value;
    });

  const cameraFolder = settingsGui.addFolder("Camera");
  cameraFolder
    .add({ Distance: thirdPersonCameraDistance }, "Distance", 100, 500)
    .onChange((value) => {
      thirdPersonCameraDistance = value;
    });
  cameraFolder
    .add({ Height: thirdPersonCameraHeight }, "Height", 50, 300)
    .onChange((value) => {
      thirdPersonCameraHeight = value;
    });
  cameraFolder
    .add({ Smoothness: cameraLerpFactor }, "Smoothness", 0.01, 1)
    .onChange((value) => {
      cameraLerpFactor = value;
    });
  const mapFolder = settingsGui.addFolder("Map");
  mapFolder.add(
    {
      "Current Map": () => {
        if (selectedMap) {
          alert(
            `Current Map: ${selectedMap.name}\n${selectedMap.userData.description}\n\nUnlimited driving is enabled - no boundaries!`
          );
        }
      },
    },
    "Current Map"
  );

  // Add info about unlimited driving
  mapFolder.add(
    {
      "Driving Mode": () => {
        alert(
          "Unlimited Driving Mode: You can drive anywhere without boundaries!"
        );
      },
    },
    "Driving Mode"
  );

  mapFolder.add(
    {
      "Next Map": () => {
        switchMap("next");
      },
    },
    "Next Map"
  );
  mapFolder.add(
    {
      "Previous Map": () => {
        switchMap("prev");
      },
    },
    "Previous Map"
  );

  const audioFolder = settingsGui.addFolder("Audio");
  audioFolder.add({ Music: musicEnabled }, "Music").onChange((value) => {
    if (value !== musicEnabled) {
      toggleMusic();
    }
  });
  audioFolder
    .add({ Volume: musicVolume * 100 }, "Volume", 0, 100, 1)
    .onChange((value) => {
      musicVolume = value / 100;
      if (backgroundMusic) {
        backgroundMusic.setVolume(musicVolume);
      }
      // Also update the slider in the music player
      document.getElementById("volumeSlider").value = value;
    });
  audioFolder.add(
    {
      "Current Track": () => {
        alert(`Now Playing: ${currentTrackInfo}`);
      },
    },
    "Current Track"
  );

  // Add Next/Previous track controls to the GUI
  audioFolder.add(
    {
      "Next Track": () => {
        if (!document.getElementById("nextTrack").disabled) {
          changeTrack("next");
        }
      },
    },
    "Next Track"
  );

  audioFolder.add(
    {
      "Previous Track": () => {
        if (!document.getElementById("prevTrack").disabled) {
          changeTrack("prev");
        }
      },
    },
    "Previous Track"
  );

  // Open folders by default
  carFolder.open();
  cameraFolder.open();
  mapFolder.open();
  audioFolder.open();
}

// No boundaries - allowing unlimited driving
// Define an empty boundary with extreme values so we don't get errors
const cityBoundary = {
  minX: -1000000,
  maxX: 1000000,
  minZ: -1000000,
  maxZ: 1000000,
};

function updateCarMovement() {
  if (!selectedCar) return;

  // Apply acceleration/deceleration
  if (carControls.forward) {
    carSpeed += carAcceleration;
  } else if (carControls.backward) {
    carSpeed -= carAcceleration;
  } else {
    // Apply natural deceleration when no input
    if (carSpeed > 0) {
      carSpeed -= carDeceleration;
    } else if (carSpeed < 0) {
      carSpeed += carDeceleration;
    }
    // Stop completely at very low speeds
    if (Math.abs(carSpeed) < 0.1) {
      carSpeed = 0;
    }
  }
  // Apply braking - more gradual braking
  if (carControls.brake) {
    carSpeed *= 0.95; // Changed from 0.9 to 0.95 for slower, more realistic braking
  }

  // Limit speed
  carSpeed = Math.max(-carMaxSpeed / 2, Math.min(carMaxSpeed, carSpeed));
  // No city area speed regulations anymore - unlimited driving

  // Update speedometer
  updateSpeedometer();

  // Calculate adaptive turn speed (less responsive at high speeds for realism)
  const adaptiveTurnSpeed =
    carTurnSpeed * (1 - (Math.abs(carSpeed) / carMaxSpeed) * 0.5);

  // Apply turning (only when moving)
  if (Math.abs(carSpeed) > 0.1) {
    if (carControls.left) {
      selectedCar.rotation.y += adaptiveTurnSpeed * Math.sign(carSpeed);
    }
    if (carControls.right) {
      selectedCar.rotation.y -= adaptiveTurnSpeed * Math.sign(carSpeed);
    }
  }
  // Update direction vector based on car rotation
  const direction = new THREE.Vector3(0, 0, 1);
  direction.applyQuaternion(selectedCar.quaternion);
  direction.y = 0; // Keep on ground
  direction.normalize();
  selectedCar.userData.direction.copy(direction);

  // Calculate movement vector
  const moveVector = selectedCar.userData.direction
    .clone()
    .multiplyScalar(carSpeed);

  // Move the car (no boundary restrictions)
  selectedCar.position.add(moveVector);

  // Keep car at proper height above ground
  selectedCar.position.y = 5;

  // Wheel rotation animation
  if (selectedCar.userData.wheels && selectedCar.userData.wheels.length > 0) {
    selectedCar.userData.wheels.forEach((wheel) => {
      wheel.rotation.x += carSpeed * 0.01;
    });
  }
}

function updateSpeedometer() {
  const speedValue = document.querySelector(".speed-value");
  const displaySpeed = Math.abs(Math.round(carSpeed * 10));
  speedValue.textContent = displaySpeed;

  // Add visual effect for high speeds
  if (displaySpeed > 100) {
    speedValue.classList.add("high-speed");
  } else {
    speedValue.classList.remove("high-speed");
  }
}

function updateCarFollowCamera(instant = false) {
  if (!selectedCar) return;

  // Calculate camera position behind car
  const carDirection = selectedCar.userData.direction.clone();

  // Create offset for camera position
  const cameraOffset = carDirection
    .clone()
    .multiplyScalar(-thirdPersonCameraDistance);
  cameraOffset.y = thirdPersonCameraHeight;

  const targetPosition = selectedCar.position.clone().add(cameraOffset);

  // Initialize or smoothly transition camera position
  if (instant || prevCameraTarget.lengthSq() === 0) {
    camera.position.copy(targetPosition);
    prevCameraTarget.copy(targetPosition);
    prevLookAtPoint.copy(selectedCar.position);
  } else {
    // Calculate dynamic smoothing factor based on speed
    const speedFactor = Math.min(Math.abs(carSpeed) / carMaxSpeed, 1);

    // Use a more stable lerp factor for high speeds and turning
    let dynamicLerpFactor;
    const isTurning = carControls.left || carControls.right;
    if (isTurning && speedFactor > 0.5) {
      // More stable when turning at high speeds
      dynamicLerpFactor = cameraLerpFactor * 0.2;
    } else {
      dynamicLerpFactor = THREE.MathUtils.lerp(
        cameraLerpFactor * 0.8, // More responsive at low speeds
        cameraLerpFactor * 0.2, // More stable at high speeds
        speedFactor
      );
    }

    // Apply smooth interpolation to camera movement
    prevCameraTarget.lerp(targetPosition, dynamicLerpFactor);
    camera.position.copy(prevCameraTarget);
  }

  // Calculate turn influence for camera with reduced intensity
  let targetTurnInfluence = 0;
  if (carControls.left) {
    targetTurnInfluence = (Math.abs(carSpeed) / carMaxSpeed) * 10; // Reduced from 15
  } else if (carControls.right) {
    targetTurnInfluence = (-Math.abs(carSpeed) / carMaxSpeed) * 10; // Reduced from 15
  }

  // Smooth the turn influence with a more gradual transition
  currentTurnInfluence = THREE.MathUtils.lerp(
    currentTurnInfluence,
    targetTurnInfluence,
    0.03 // More gentle transition (reduced from 0.05)
  );

  // Create dynamic look-at target with dampened side movement
  const lookAtTarget = selectedCar.position
    .clone()
    .add(
      new THREE.Vector3(
        currentTurnInfluence * 0.8,
        thirdPersonCameraHeight * 0.2,
        0
      )
    ); // Smooth the look-at transition with a more stable factor
  if (instant || prevLookAtPoint.lengthSq() === 0) {
    prevLookAtPoint.copy(lookAtTarget);
  } else {
    // Get speed factor again for look-at calculations
    const speedFactor = Math.min(Math.abs(carSpeed) / carMaxSpeed, 1);

    // Smoother camera when turning at high speeds
    const isTurning = carControls.left || carControls.right;
    const lookAtLerpFactor =
      isTurning && speedFactor > 0.6
        ? 0.08 // Very stable for high-speed turns
        : Math.min(cameraLerpFactor * 0.8, 0.12); // More stable overall

    prevLookAtPoint.lerp(lookAtTarget, lookAtLerpFactor);
  }

  // Point camera at smooth target
  camera.lookAt(prevLookAtPoint);

  // Apply reduced camera tilt during turns
  const tiltFactor =
    Math.abs(carSpeed) > 2
      ? 0.015 * Math.min(Math.abs(carSpeed) / carMaxSpeed, 1) // Reduced from 0.02
      : 0;
  const newTargetRotationZ = -currentTurnInfluence * 0.0008 * tiltFactor; // Reduced from 0.001

  // Extra smooth rotation transition
  targetCameraRotationZ = THREE.MathUtils.lerp(
    targetCameraRotationZ,
    newTargetRotationZ,
    0.03 // More gentle transition (reduced from 0.05)
  );
  camera.rotation.z = THREE.MathUtils.lerp(
    camera.rotation.z,
    targetCameraRotationZ,
    0.02 // More gentle rotation (reduced from 0.03)
  );
}

function exitDrivingMode() {
  // Return to main scene
  window.location.href = "index.html";
}

function updateMapCamera() {
  if (!selectedCar) return;
  // Get the minimap wrapper dimensions to maintain proper aspect ratio
  const wrapper = document.getElementById("minimapWrapper");
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;

  // Calculate the aspect ratio and apply a zoom factor
  const aspectRatio = width / height;
  const zoom = 2000; // Increased zoom to see more of the map around the car

  // Update orthoCamera with the correct aspect ratio
  orthoCamera.left = -zoom * aspectRatio;
  orthoCamera.right = zoom * aspectRatio;
  orthoCamera.top = zoom;
  orthoCamera.bottom = -zoom;

  // Copy position from the car to minimap camera
  orthoCamera.position.x = selectedCar.position.x;
  orthoCamera.position.z = selectedCar.position.z;
  orthoCamera.position.y = 1000; // Fixed height

  // Get car direction
  const dir = selectedCar.userData.direction.clone();
  dir.y = 0;
  dir.normalize();

  // Look ahead of the car
  const target = new THREE.Vector3(
    selectedCar.position.x + dir.x,
    0,
    selectedCar.position.z + dir.z
  );

  orthoCamera.lookAt(target);
  orthoCamera.updateProjectionMatrix();
}

function renderMap() {
  const wrapper = document.getElementById("minimapWrapper");
  const width = wrapper.clientWidth;
  const height = wrapper.clientHeight;

  // Set size without updating CSS (false parameter)
  minimapRenderer.setSize(width, height, false);

  // Clear the viewport
  minimapRenderer.clear();

  // Render the scene from the orthographic camera
  minimapRenderer.render(scene, orthoCamera);
}

// Switch to the next or previous map
function switchMap(direction) {
  if (maps.length === 0) return;

  // Remove current map from scene
  if (selectedMap) {
    scene.remove(selectedMap);
  }

  // Calculate new map index
  if (direction === "next") {
    currentMapIndex = (currentMapIndex + 1) % maps.length;
  } else if (direction === "prev") {
    currentMapIndex = (currentMapIndex - 1 + maps.length) % maps.length;
  }

  // Add new map to scene
  selectedMap = maps[currentMapIndex];
  scene.add(selectedMap);

  // Reset car position when changing maps
  if (selectedCar) {
    selectedCar.position.set(0, 5, 0);
    updateCarFollowCamera(true);
  }
  // Update map name display
  document.getElementById("current-map-name").textContent = selectedMap.name;
  document.getElementById("map-description").textContent =
    selectedMap.userData.description;
  // Show map notification with unlimited driving info
  const mapNotification = document.getElementById("map-notification");
  mapNotification.textContent = `Switched to ${selectedMap.name} - Drive anywhere without limits!`;
  mapNotification.style.opacity = 1;
  mapNotification.style.color = "#00cc00";

  // Hide notification after 3 seconds
  setTimeout(() => {
    mapNotification.style.opacity = 0;
  }, 3000);

  console.log(`Switched to map: ${selectedMap.name}`);
}

function animate() {
  requestAnimationFrame(animate);

  // Update car movement
  updateCarMovement();

  // Update camera position
  updateCarFollowCamera();

  // Update minimap
  updateMapCamera();

  // Render scene with post-processing
  renderer.render(scene, camera);

  // Render minimap
  renderMap();

  // Update stats
  stats.update();
}

// Start the app
init();
