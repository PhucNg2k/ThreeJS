import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.157.0/examples/jsm/loaders/GLTFLoader.js";

// Create scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

// Add environmental lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Add directional lights for better visibility
const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
directionalLight1.position.set(5, 10, 7);
scene.add(directionalLight1);

const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight2.position.set(-5, 5, -7);
scene.add(directionalLight2);

// Camera setup
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(5, 3, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
// Fix outdated property
renderer.outputColorSpace = THREE.SRGBColorSpace; // Updated from outputEncoding
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.appendChild(renderer.domElement);

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 3;
controls.maxDistance = 20;

// Load the GLTF model
const loader = new GLTFLoader();
let car;

// Add loading indicator visibility control
const loadingElem = document.getElementById("loading");

loader.load(
  // Resource URL
  "scene.gltf",
  // Called when the resource is loaded
  function (gltf) {
    car = gltf.scene;

    // Center the model
    const box = new THREE.Box3().setFromObject(car);
    const center = box.getCenter(new THREE.Vector3());
    car.position.x = -center.x;
    car.position.y = -center.y;
    car.position.z = -center.z;

    // Add model to scene
    scene.add(car);

    // Optional: Focus camera on the car
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / Math.tan((Math.PI * camera.fov) / 360);
    controls.maxDistance = fitHeightDistance * 3;
    camera.position.set(
      fitHeightDistance,
      fitHeightDistance / 2,
      fitHeightDistance
    );
    controls.target.set(0, 0, 0);
    controls.update();

    // Hide loading indicator when model is loaded
    if (loadingElem) loadingElem.style.display = "none";
  },
  // Called while loading is progressing
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  // Called when loading has errors
  function (error) {
    console.error("An error happened during loading:", error);
    // Show error in loading element
    if (loadingElem) loadingElem.textContent = "Error loading model";
  }
);

// Handle window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // Required if damping is enabled
  renderer.render(scene, camera);
}

animate();
