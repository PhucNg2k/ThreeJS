import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import GUI from "lil-gui";

RectAreaLightUniformsLib.init();
const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
let INTERSECTED = null;
let composer, outlinePass;

let controlMode = "fly";
let savedCameraState = null;

let scene, camera, orthoCamera, minimapRenderer, chaOrbitControls, controls;
let group, followGroup, skeleton, mixer, actions;
let model = null;
let cameraFlyMode = "fly";
let outlineMode = false;
let isModelLoaded = false;
let camPoint = null;

let debugBbox = true;

// Car array for tracking cars in the scene
let cars = [];

const PI = Math.PI;

const characterControls = {
  key: [0, 0],
  ease: new THREE.Vector3(),
  position: new THREE.Vector3(),
  up: new THREE.Vector3(0, 1, 0),
  rotate: new THREE.Quaternion(),
  current: "Idle",
  fadeDuration: 0.5,
  runVelocity: 800,
  walkVelocity: 500,
  rotateSpeed: 0.1,
  floorDecale: 0,
};

async function init() {
  minimapRenderer = new THREE.WebGLRenderer({
    alpha: true,
    canvas: document.getElementById("minimapCanvas"),
  });
  minimapRenderer.setPixelRatio(window.devicePixelRatio);
  minimapRenderer.setClearColor(0x000000, 0); // transparent background

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const stats = new Stats();
  document.getElementById("webgl").appendChild(stats.dom);
  document.getElementById("webgl").appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1.0,
    10000
  );
  camera.updateProjectionMatrix();
  camera.layers.enable(0); // Default layer
  camera.layers.enable(1); // Include helpers

  renderer.setPixelRatio(window.devicePixelRatio);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4287f5);

  let axesHelper = new THREE.AxesHelper(1000);
  axesHelper.layers.set(1);
  scene.add(axesHelper);

  if (controlMode === "fly") {
    camPoint = getSphereSimple();
    camPoint.name = "CamPoint";
    scene.add(camPoint);
    updateCameraPoint();
  }

  group = new THREE.Group();
  group.name = "CharacterGroup";
  scene.add(group);

  followGroup = new THREE.Group();
  followGroup.name = "FollowGroup";
  scene.add(followGroup);

  const dirLight = new THREE.DirectionalLight(0xffffff, 5);
  dirLight.position.set(-2, 5, -3);
  dirLight.castShadow = true;
  const cam = dirLight.shadow.camera;
  cam.top = cam.right = 2;
  cam.bottom = cam.left = -2;
  cam.near = 3;
  cam.far = 8;
  dirLight.shadow.bias = -0.005;
  dirLight.shadow.radius = 4;
  followGroup.add(dirLight);
  followGroup.add(dirLight.target);

  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  let groundTexture = new THREE.TextureLoader().load(
    "cracked-cement.jpg",
    () => console.log("groundTexture loaded successfully"),
    undefined,
    (err) => console.error("Error loading texture:", err)
  );
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.anisotropy = 16;
  groundTexture.encoding = THREE.sRGBEncoding;

  let width = window.innerWidth;
  let height = window.innerHeight;
  orthoCamera = new THREE.OrthographicCamera(
    -width,
    width,
    height,
    -height,
    1,
    2000
  );
  orthoCamera.position.set(0, 1000, 0);
  orthoCamera.lookAt(0, 0, 0);
  orthoCamera.layers.enable(0); // Default objects
  orthoCamera.layers.disable(1); // Hide helpers

  scene.add(orthoCamera);

  setupControls(renderer);

  // LOAD CHARACTER MODEL
  loadModel();

  console.log("Scene children: ", scene.children);

  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };

  function resetKeys() {
    characterControls.key = [0, 0];
    for (let key in keys) {
      keys[key] = false;
    }
  }

  // Key controls for walking only (driving controls moved to driving.js)
  const onKeyDown = (event) => {
    // Update keys regardless of lock state

    if (controls.isLocked) {
      if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
      }

      if (event.code == "KeyB") {
        debugBbox = debugBbox === true ? false : true;
        console.log("KeyB pressed");
        console.log("Debug: ", debugBbox);
      }

      if (event.code == "KeyH") {
        if (controlMode == "fly") {
          cameraFlyMode = cameraFlyMode === "fly" ? "strict" : "fly";
        }
      }
      if (event.code === "KeyC") {
        switchControlMode();
        return;
      }
      if (event.code === "KeyP") {
        if (controlMode == "fly") {
          controls.unlock();
        } else {
        }

        // Hide controls panel when showing start panel
        let controlsPanel = document.getElementById("controlsPanel");
        if (controlsPanel) {
          controlsPanel.style.display = "none";
        }

        startPanel.style.display = "block";
        return;
      }

      const key = characterControls.key;
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
        case "KeyZ":
          key[0] = -1;
          break;
        case "ArrowDown":
        case "KeyS":
          key[0] = 1;
          break;
        case "ArrowLeft":
        case "KeyA":
        case "KeyQ":
          key[1] = -1;
          break;
        case "ArrowRight":
        case "KeyD":
          key[1] = 1;
          break;
        case "ShiftLeft":
        case "ShiftRight":
          key[2] = 1;
          break;
      }
    }
  };

  const onKeyUp = (event) => {
    if (controls.isLocked) {
      if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
      }

      if (event.code == "KeyB") {
        debugBbox = debugBbox === true ? true : false;
      }

      const key = characterControls.key;
      switch (event.code) {
        case "ArrowUp":
        case "KeyW":
        case "KeyZ":
          key[0] = key[0] < 0 ? 0 : key[0];
          break;
        case "ArrowDown":
        case "KeyS":
          key[0] = key[0] > 0 ? 0 : key[0];
          break;
        case "ArrowLeft":
        case "KeyA":
        case "KeyQ":
          key[1] = key[1] < 0 ? 0 : key[1];
          break;
        case "ArrowRight":
        case "KeyD":
          key[1] = key[1] > 0 ? 0 : key[1];
          break;
        case "ShiftLeft":
        case "ShiftRight":
          key[2] = 0;
          break;
      }
    }
  };

  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);

  const startPanel = document.getElementById("startPanel");
  const startButton = document.getElementById("startButton");
  startButton.addEventListener(
    "click",
    () => {
      startPanel.style.display = "none";
      if (controlMode === "orbit") {
        // In orbit mode, update target before locking
        updateTarget();
      } else {
        if (savedCameraState) {
          // In free mode, restore saved camera state if exists
          camera.position.copy(savedCameraState.position);
          camera.quaternion.copy(savedCameraState.quaternion);
        }
      }

      controls.lock();
    },
    false
  );
  controls.addEventListener("lock", (event) => {
    console.log("(LOCK) EVENT");
    startPanel.style.display = "none";

    let carOptionPanel = document.getElementById("carOptionPanel");
    carOptionPanel.style.display = "none";

    // Show controls panel when controls are active
    let controlsPanel = document.getElementById("controlsPanel");
    if (controlsPanel) {
      controlsPanel.style.display = "block";
    }

    // If in free mode and we have a saved state, restore it
    if (controlMode === "fly" && savedCameraState) {
      // Recreate camPoint
      if (camPoint) scene.remove(camPoint);
      camPoint = getSphereSimple();
      camPoint.name = "CamPoint";
      scene.add(camPoint);
      updateCameraPoint();
    }
  });

  controls.addEventListener("unlock", (event) => {
    console.log("(UNLOCK) EVENT");
    resetKeys();

    // Hide controls panel when controls are inactive
    let controlsPanel = document.getElementById("controlsPanel");
    if (controlsPanel) {
      controlsPanel.style.display = "none";
    }

    // Save camera state when unlocking in free mode
    if (controlMode === "fly" && savedCameraState) {
      camera.position.copy(savedCameraState.position);
      camera.quaternion.copy(savedCameraState.quaternion);
      renderer.render(scene, camera);
    }
  });

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Function to create and setup a car
  async function createCar(
    modelPath,
    name,
    scale = [150, 150, 150],
    positionOffset = 0,
    rotation = Math.PI / 4
  ) {
    const car = await loadGLTFModel(modelPath);
    car.name = name + "Car";

    // Setup physics properties
    car.userData.velocity = new THREE.Vector3();
    car.userData.acceleration = new THREE.Vector3();
    car.userData.direction = new THREE.Vector3(0, 0, 1);
    car.userData.wheels = [];

    // Apply scale
    car.scale.set(scale[0], scale[1], scale[2]);

    // Set rotation to face forward
    car.rotation.y = rotation;

    // Setup shadows
    car.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    // Position car based on offset
    car.position.set(...positionOffset);

    // Add to scene and cars array
    scene.add(car);
    cars.push(car);

    return car;
  }

  // Car configuration array for easy management
  const carConfigs = [
    {
      path: "mclaren/aspark_owl_2020__www.vecarz.com/scene.gltf",
      name: "AsparkOwl",
      scale: [150, 150, 150],
      positionOffset: [1000, 5, 1000],
      rotation: Math.PI / 4 - Math.PI / 2,
    },
    {
      path: "mclaren/bugatti_bolide_2024__www.vecarz.com/scene.gltf",
      name: "BugattiBolide",
      scale: [150, 150, 150],
      positionOffset: [755, 5, 2000],
      rotation: Math.PI / 4 - Math.PI / 2,
    },
    {
      path: "mclaren/nilu_27_concept_2024__www.vecarz.com/scene.gltf",
      name: "Nilu27Concept",
      scale: [13000, 13000, 13000],
      positionOffset: [-755, 5, 2000],
      rotation: Math.PI / 4,
    },
    {
      path: "mclaren/ferrari_laferrari__www.vecarz.com/scene.gltf",
      name: "FerrariLaFerrari",
      scale: [150, 150, 150],
      positionOffset: [-1000, 5, 1000],
      rotation: Math.PI / 4,
    },
  ];

  // Load all cars using the configuration
  const loadedCars = {};
  for (const config of carConfigs) {
    const car = await createCar(
      config.path,
      config.name,
      config.scale,
      config.positionOffset,
      config.rotation
    );
    loadedCars[config.name] = car;
  }
  // Access individual cars if needed
  const asparkCar = loadedCars.AsparkOwl;
  const bugattiCar = loadedCars.BugattiBolide;
  const ferrariCar = loadedCars.FerrariMonzaSP1;

  // Load the showroom environment
  async function loadShowroom() {
    try {
      console.log("Loading showroom model...");
      const showroom = await loadGLTFModel("mclaren/car-showroom_1/scene.gltf");

      // Position and scale the showroom
      showroom.position.set(0, 0, 0); // Center the showroom
      showroom.scale.set(250, 250, 250); // Adjust scale as needed

      // Setup shadows for the showroom
      showroom.traverse((child) => {
        if (child.isMesh) {
          child.receiveShadow = true;
          child.castShadow = false; // Showroom shouldn't cast shadows on itself

          // Enhance material properties for better lighting
          if (child.material) {
            child.material.needsUpdate = true;
          }
        }
      });

      // Add the showroom to the scene
      scene.add(showroom);
      console.log("Showroom loaded successfully!");

      return showroom;
    } catch (error) {
      console.error("Failed to load showroom:", error);
      return null;
    }
  }
  // Load the showroom
  const showroom = await loadShowroom();

  // Add enhanced lighting for the showroom environment
  if (showroom) {
    // Add ambient light specifically for the showroom interior
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // Soft ambient light
    scene.add(ambientLight);

    // Add interior showroom lighting
    const interiorLight1 = new THREE.PointLight(0xffffff, 1.5, 800);
    interiorLight1.position.set(200, 400, 200);
    interiorLight1.castShadow = true;
    scene.add(interiorLight1);

    const interiorLight2 = new THREE.PointLight(0xffffff, 1.5, 800);
    interiorLight2.position.set(-200, 400, 200);
    interiorLight2.castShadow = true;
    scene.add(interiorLight2);

    const interiorLight3 = new THREE.PointLight(0xffffff, 1.5, 800);
    interiorLight3.position.set(0, 400, -200);
    interiorLight3.castShadow = true;
    scene.add(interiorLight3);
  }

  // Get car size for camera positioning
  let carSize = new THREE.Box3().setFromObject(asparkCar);
  let carHeight = carSize.max.y - carSize.min.y;

  // Add a spotlight for general illumination
  const spotLight = new THREE.SpotLight(0xffff00, 10000);
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
  spotLight.shadow.camera.left = -1000;
  spotLight.shadow.camera.right = 1000;
  spotLight.shadow.camera.top = 1000;
  spotLight.shadow.camera.bottom = -1000;
  spotLight.target.position.set(200, 300, 0);
  spotLight.shadow.camera.updateProjectionMatrix();
  scene.add(spotLight);
  scene.add(spotLight.target);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(500, 766, -1200);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.camera.near = 100;
  directionalLight.shadow.camera.far = 2000;
  directionalLight.shadow.camera.left = -1000;
  directionalLight.shadow.camera.right = 1000;
  directionalLight.shadow.camera.top = 1000;
  directionalLight.shadow.camera.bottom = -1000;
  scene.add(directionalLight);
  const helper = new THREE.DirectionalLightHelper(directionalLight, 5);
  //scene.add(helper);
  // Create a much larger ground plane for infinite-like appearance (but smaller if showroom is present)
  const planeSize = showroom ? 20000 : 50000; // Smaller ground if showroom is loaded
  const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
  const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
  planeMaterial.receiveShadow = true;
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.y = -5.0;
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;

  // Set texture to repeat many times for a tiled effect
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(showroom ? 50 : 100, showroom ? 50 : 100); // Adjust repeat based on showroom presence
  groundTexture.anisotropy = 16; // Better texture quality at angles
  groundTexture.needsUpdate = true;

  scene.add(plane);

  camera.position.x = 300;
  camera.position.y = carHeight - 50;
  camera.position.z = 1000;
  camera.lookAt(scene.position);
  scene.add(camera);

  let SceneObjectUUID = {};

  for (let child of scene.children) {
    let child_uuid = child.uuid;
    SceneObjectUUID[child_uuid] = child;
  }

  const raycaster = new THREE.Raycaster();
  let { raycastObjects: RayCastObjects, rayCastMapping: RayCastMapping } =
    createRayCastObjects();

  console.log("Scene objects:", scene.children);
  console.log("SceneObjectUUID:", SceneObjectUUID);
  console.log("RaycastObjects:", RayCastObjects);
  console.log("RayCastMapping: ", RayCastMapping);

  let isMouseClicked = false;
  window.addEventListener("mousedown", (event) => {
    console.log("MOUSE DOWN EVENT");

    savedCameraState = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
    };

    const guiPanel = document.getElementById("objectInfoPanel");
    const carOptionPanel = document.getElementById("carOptionPanel");
    const clickedInsideGUI =
      (guiPanel && guiPanel.contains(event.target)) ||
      (carOptionPanel && carOptionPanel.contains(event.target));
    if (clickedInsideGUI) {
      console.log(
        "Click inside GUI or car option panel, ignoring control lock"
      );
      return;
    }

    if (!controls.isLocked) {
      setTimeout(() => {
        controls.lock();
        clearGuiPanel(guiPanel);
        clearCarOptionPanel(carOptionPanel);
      }, 0);
      return;
    }

    // Make sure we check for intersections before handling interaction
    checkIntersection(RayCastObjects);
    isMouseClicked = true;

    let lookAtPos = new THREE.Vector3();
    camera.getWorldDirection(lookAtPos);
    console.log("Looking at (MOUSE DOWN): ", lookAtPos);

    if (INTERSECTED) {
      handleInteraction(INTERSECTED, isMouseClicked);
    } else {
      clearGuiPanel(guiPanel);
      // Only clear carOptionPanel if no car is selected
      if (
        !cars.includes(
          retrieveObjectWithUUID(RayCastMapping[INTERSECTED?.uuid])
        )
      ) {
        clearCarOptionPanel(carOptionPanel);
      }
      removeOutline();
    }
  });

  function clearGuiPanel(guiPanel) {
    if (guiPanel) {
      console.log("Clearing GUI panel");
      guiPanel.style.display = "none";
    }
  }

  function clearCarOptionPanel(carOptionPanel) {
    if (carOptionPanel) {
      console.log("Clearing car option panel");
      carOptionPanel.style.display = "none";
    }
  }

  window.addEventListener("mouseup", () => {
    console.log("MOUSE UP EVENT");
    isMouseClicked = false;
  });

  window.addEventListener("resize", windowResize);
  window.addEventListener("pointermove", onPointerMove);

  controls.addEventListener("change", () => {
    // Always check intersections since driving is now in a separate page
    checkIntersection(RayCastObjects);
  });

  controls.addEventListener("unlock", () => {
    // Force pointer reset to ensure clean state after unlocking
    resetKeys();
    pointer.set(0, 0);

    // Allow a moment before checking for intersections
    setTimeout(() => {
      checkIntersection(RayCastObjects);
    }, 300);

    if (controlMode === "obit") {
      controls.lock();
    }
  });

  let dirCam = new THREE.Vector3();

  camera.getWorldDirection(dirCam);
  trackCameraPoint(camPoint);

  setupOutlineEffect(renderer, scene, camera);

  animate();

  function createRayCastObjects() {
    let raycastObjects = [];
    let rayCastMapping = {};

    for (let child of scene.children) {
      if (child.name.includes("Car")) {
        if (child.isGroup) {
          console.log("CHILD:", child);

          if (checkMultiMeshesGroup(child)) {
            const mergedMesh = mergeGroupIntoSingleMesh(child);

            if (mergedMesh) {
              console.log("Merged mesh: ", mergedMesh);
              mergedMesh.name = child.name + "_merged_collider";
              mergedMesh.applyMatrix4(child.matrixWorld.clone().invert());
              child.add(mergedMesh);
              raycastObjects.push(mergedMesh);
              rayCastMapping[mergedMesh.uuid] = child.uuid;
              console.log("MergedMesh: ", mergedMesh);
              continue;
            }
          }

          if (!child.name.includes("Group")) {
            let colliderBox = getSimplifyCollider(child);
            if (colliderBox) {
              console.log("Child name: ", child.name);
              colliderBox.name = child.name + "_collider";
              colliderBox.applyMatrix4(child.matrixWorld.clone().invert());
              raycastObjects.push(colliderBox);
              rayCastMapping[colliderBox.uuid] = child.uuid;
              child.add(colliderBox);
              child.userData.collider = colliderBox;

              if (debugBbox) {
                const boxHelper = new THREE.BoxHelper(colliderBox, 0xffff00);
                boxHelper.visible = true; // Hide the yellow bounding boxes
                colliderBox.userData.helper = boxHelper;
                scene.add(boxHelper);
              }
            }
          }
        }
      }
    }

    return { raycastObjects, rayCastMapping };
  }

  function checkMultiMeshesGroup(obj) {
    if (obj.isGroup) {
      if (obj.children.length > 1) {
        return true;
      }
    }
    return false;
  }

  function createBbox(object) {
    let bbox = new THREE.Box3();
    bbox.setFromObject(object);
    return bbox;
  }

  function checkCollision(objList, pivot) {
    const offset = -5;

    // Get current pivot world position
    const pivotPos = new THREE.Vector3();
    pivot.getWorldPosition(pivotPos);

    // Get forward vector from pivot's rotation
    const pivotForward = new THREE.Vector3(0, 0, -1); // -Z is forward in Three.js
    pivotForward.applyQuaternion(pivot.quaternion);

    // Calculate future position
    const desiredPosition = pivotPos
      .clone()
      .add(pivotForward.multiplyScalar(offset));

    // Clone the pivot and move it to the desired position
    const pivotClone = pivot.clone();
    pivotClone.position.copy(desiredPosition);

    // Predictive bounding box at the future position
    const predictedBbox = createBbox(pivotClone);

    // Check for collision with objects
    for (let object of objList) {
      const bbox = createBbox(object);
      if (predictedBbox.intersectsBox(bbox)) {
        console.log("COLLISION DETECTED");
        return true; // Collided
      }
    }

    return false; // No collision
  }

  function checkIntersection(objList) {
    raycaster.setFromCamera(pointer, camera);
    const intersectsList = raycaster.intersectObjects(objList, true);

    if (intersectsList.length > 0) {
      let selectedObject = intersectsList[0].object;
      if (selectedObject.type.includes("Helper")) return;
      if (selectedObject === INTERSECTED) return;

      if (INTERSECTED) {
        removeOutline();
      }

      INTERSECTED = selectedObject;
      let collider_uuid = INTERSECTED.uuid;
      let og_object_uuid = RayCastMapping[collider_uuid];

      // If we have a valid uuid mapping, apply outline
      if (og_object_uuid) {
        const originalObject = retrieveObjectWithUUID(og_object_uuid);
        if (originalObject) {
          applyOutlineToMesh(originalObject);
        }
      }
    } else {
      if (INTERSECTED) {
        removeOutline();
        INTERSECTED = null;
      }
    }
  }

  //--------------------

  function loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      "models/gltf/Soldier.glb",
      function (gltf) {
        model = gltf.scene;
        group.add(model);

        // Scale the model 100 times bigger
        model.scale.set(100, 100, 100);

        model.rotation.y = PI;
        group.rotation.y = PI;

        model.traverse(function (object) {
          if (object.isMesh) {
            if (object.name == "vanguard_Mesh") {
              object.castShadow = true;
              object.receiveShadow = true;
              object.material.shadowSide = THREE.DoubleSide;
              object.material.metalness = 1.0;
              object.material.roughness = 0.2;
              object.material.color.set(1, 1, 1);
              object.material.metalnessMap = object.material.map;
            } else {
              object.material.metalness = 1;
              object.material.roughness = 0;
              object.material.transparent = true;
              object.material.opacity = 0.8;
              object.material.color.set(1, 1, 1);
            }
          }
        });

        skeleton = new THREE.SkeletonHelper(model);
        skeleton.visible = false;
        skeleton.layers.set(1);
        //scene.add( skeleton );

        const animations = gltf.animations;

        mixer = new THREE.AnimationMixer(model);
        if (!animations || animations.length === 0) {
          console.error("No animations found in Soldier.glb");
          return;
        }

        actions = {};

        const animationMap = {
          Idle: animations.find((anim) =>
            anim.name.toLowerCase().includes("idle")
          ),
          Walk: animations.find((anim) =>
            anim.name.toLowerCase().includes("walk")
          ),
          Run: animations.find((anim) =>
            anim.name.toLowerCase().includes("run")
          ),
        };
        for (const key in animationMap) {
          if (animationMap[key]) {
            actions[key] = mixer.clipAction(animationMap[key]);
            actions[key].enabled = true;
            actions[key].setEffectiveTimeScale(1);
            if (key !== "Idle") actions[key].setEffectiveWeight(0);
          } else {
            console.error(`Animation for ${key} not found in Soldier.glb`);
          }
        }

        if (actions.Idle) {
          actions.Idle.play();
        } else {
          console.error("Idle animation not found, cannot start animation");
        }

        isModelLoaded = true;
        console.log("Model loaded:", model);
        console.log("Actions:", actions);

        if (controlMode === "orbit") {
          updateOrbitTarget(); // Ensure camera is positioned correctly after model loads
        }
      },
      undefined,
      function (error) {
        console.error("Failed to load Soldier.glb:", error);
        isModelLoaded = false;
      }
    );
  }

  function updateCharacterAnimation(play) {
    if (characterControls.current !== play) {
      const toPlay = actions[play];
      const previous = actions[characterControls.current];

      if (previous && toPlay) {
        previous.fadeOut(characterControls.fadeDuration);
        toPlay
          .reset()
          .setEffectiveWeight(1)
          .fadeIn(characterControls.fadeDuration)
          .play();
      } else if (toPlay) {
        toPlay.reset().setEffectiveWeight(1).play();
      }

      characterControls.current = play;
    }
  }

  let lastValidPosition = new THREE.Vector3();
  let isColliding = false;

  function onControlsChange() {
    if (controlMode === "orbit") {
      const currentPos = group.position.clone();

      if (checkCollision(RayCastObjects, group)) {
        if (!isColliding) {
          // first collision
          lastValidPosition.copy(currentPos); // only update for the first collision
          isColliding = true;
        }
        group.position.copy(lastValidPosition);
        group.updateMatrixWorld();
        console.log("COLLIDING!!1");
      } else {
        lastValidPosition.copy(currentPos);
        isColliding = false;
      }
    }
  }

  function updateCharacter(delta) {
    if (!isModelLoaded) return;
    const key = characterControls.key;
    const up = characterControls.up;
    const ease = characterControls.ease;
    const rotate = characterControls.rotate;
    const position = characterControls.position;
    const azimuth = chaOrbitControls.getAzimuthalAngle();

    const active = key[0] !== 0 || key[1] !== 0;
    const play = active ? (key[2] ? "Run" : "Walk") : "Idle";

    // Always update animation regardless of collision
    updateCharacterAnimation(play);

    if (characterControls.current !== "Idle") {
      const velocity =
        characterControls.current === "Run"
          ? characterControls.runVelocity
          : characterControls.walkVelocity;
      ease.set(key[1], 0, key[0]).multiplyScalar(velocity * delta);

      const angle = unwrapRad(Math.atan2(ease.x, ease.z) + azimuth);
      rotate.setFromAxisAngle(up, angle);
      characterControls.ease.applyAxisAngle(up, azimuth);

      // Only update position if not colliding
      if (!isColliding) {
        position.add(ease);
        camera.position.add(ease);
        group.position.copy(position);
        followGroup.position.copy(position);
      }

      // Always update rotation regardless of collision
      group.quaternion.slerp(rotate, characterControls.rotateSpeed);
    }

    if (mixer && delta) {
      mixer.update(delta);
    }

    chaOrbitControls.update();
  }

  function unwrapRad(r) {
    return Math.atan2(Math.sin(r), Math.cos(r));
  }

  //---------------------

  function enterCarDriving(car) {
    // Instead of setting up driving in this page, redirect to the dedicated driving page
    // Find the index of the car in the cars array
    const carIndex = cars.indexOf(car);

    if (carIndex !== -1) {
      console.log(
        `Redirecting to driving page for car: ${car.name} (index: ${carIndex})`
      );
      // Navigate to the driving page with the car index as a parameter
      window.location.href = `driving.html?car=${carIndex}`;
    } else {
      console.error("Car not found in cars array:", car.name);
    }
  }

  function getCarModelPath(carName) {
    // Map car names to their model paths and display names
    if (carName.includes("AsparkOwl")) {
      return {
        path: "mclaren/aspark_owl_2020__www.vecarz.com/scene.gltf",
        displayName: "Aspark Owl",
      };
    } else if (carName.includes("BugattiBolide")) {
      return {
        path: "mclaren/bugatti_bolide_2024__www.vecarz.com/scene.gltf",
        displayName: "Bugatti Bolide",
      };
    } else if (carName.includes("Nilu27Concept")) {
      return {
        path: "mclaren/nilu_27_concept_2024__www.vecarz.com/scene.gltf",
        displayName: "Nilu 27 Concept",
      };
    } else if (carName.includes("FerrariLaFerrari")) {
      return {
        path: "mclaren/ferrari_laferrari__www.vecarz.com/scene.gltf",
        displayName: "Ferrari LaFerrari",
      };
    } else {
      // Default fallback path for unknown cars
      return {
        path: "Car/Car.fbx",
        displayName: "Default Car",
      };
    }
  }

  function optionGateway(targetObject) {
    if (!cars.includes(targetObject)) return;

    console.log("Car clicked:", targetObject.name);

    let carOptionPanel = document.getElementById("carOptionPanel");
    let carOptionTitle = document.getElementById("carOptionTitle");
    let viewButton = document.getElementById("viewCarButton");
    let driveButton = document.getElementById("driveCarButton");
    let cancelButton = document.getElementById("cancelButton");

    if (
      !carOptionPanel ||
      !carOptionTitle ||
      !viewButton ||
      !driveButton ||
      !cancelButton
    ) {
      console.error("Car option panel elements not found");
      return;
    }

    // Update panel title with car name
    carOptionTitle.innerText = `Select Option for ${targetObject.name}`;

    // Clear previous event listeners to prevent duplicates
    let viewClone = viewButton.cloneNode(true);
    let driveClone = driveButton.cloneNode(true);
    let cancelClone = cancelButton.cloneNode(true);
    viewButton.parentNode.replaceChild(viewClone, viewButton);
    driveButton.parentNode.replaceChild(driveClone, driveButton);
    cancelButton.parentNode.replaceChild(cancelClone, cancelButton);

    // Update references to new buttons
    viewButton = viewClone;
    driveButton = driveClone;
    cancelButton = cancelClone;

    // Add event listeners
    viewButton.addEventListener("click", () => {
      console.log(`Viewing ${targetObject.name} on podium`);
      // Get car info including path and simplified name for podium.js
      const carInfo = getCarModelPath(targetObject.name);

      const selectedCar = {
        name: carInfo.displayName, // Use the displayName that podium.js expects
        path: carInfo.path,
        originalName: targetObject.name, // Keep original name for reference
      };
      localStorage.setItem("selectedCar", JSON.stringify(selectedCar));

      window.location.replace("podium.html");
      carOptionPanel.style.display = "none";
    });

    driveButton.addEventListener("click", () => {
      console.log(`Driving ${targetObject.name}`);
      enterCarDriving(targetObject);
      carOptionPanel.style.display = "none";
    });

    cancelButton.addEventListener("click", () => {
      console.log("Action cancelled");
      const guiPanel = document.getElementById("objectInfoPanel");
      const carOptionPanel = document.getElementById("carOptionPanel");
      clearGuiPanel(guiPanel);
      clearCarOptionPanel(carOptionPanel);
      controls.lock(); // Resume controls
    });

    // Force display and trigger reflow
    carOptionPanel.style.display = "none"; // Reset to ensure reflow
    carOptionPanel.offsetHeight; // Trigger reflow
    carOptionPanel.style.display = "block";
    console.log("Car option panel displayed for:", targetObject.name);
    console.log("Panel: ", carOptionPanel);
  }

  function handleInteraction(mesh, isMouseClicked) {
    if (isMouseClicked) {
      controls.unlock();
      console.log("🎯 Object clicked:", mesh);
      isMouseClicked = false;

      const collider_uuid = mesh.uuid;
      const original_uuid = RayCastMapping[collider_uuid];
      const targetObject = retrieveObjectWithUUID(original_uuid);

      console.log("Clicked obj: ", mesh, "UUID: ", collider_uuid);
      console.log("Og object: ", targetObject, "UUID: ", original_uuid);

      if (targetObject) {
        console.log("TARGET OBJECT: ", targetObject); // Check if it's one of our cars
        console.log("TARGET OBJECT NAME:", targetObject.name);
        optionGateway(targetObject);

        console.log("Setting up GUI for:", targetObject);
        setupObjectGUI(targetObject);
      } else {
        console.warn("Original object not found for UUID:", original_uuid);
      }
    }
    return;
  }

  function setupObjectGUI(mesh) {
    const panel = document.getElementById("objectInfoPanel");
    const details = document.getElementById("objectDetails");
    const guiContainer = document.getElementById("objectGui");
    guiContainer.innerHTML = "";

    const info = `
            <strong>Name:</strong> ${mesh.name}<br/>
            <strong>UUID:</strong> ${mesh.uuid}<br/>
        `;
    details.innerHTML = info;
    panel.style.display = "block";

    let objectGui = new GUI({ autoPlace: false, width: 300 });
    guiContainer.appendChild(objectGui.domElement);

    // Add drive button if it's a car
    if (mesh.name.includes("Car")) {
      objectGui.add(
        {
          "Drive This Car": () => {
            enterCarDriving(mesh);
            clearGuiPanel(panel);
          },
        },
        "Drive This Car"
      );
    }

    const positionFolder = objectGui.addFolder("Position");
    positionFolder
      .add(mesh.position, "x", mesh.position.x - 500, mesh.position.x + 500)
      .step(1);
    positionFolder
      .add(mesh.position, "y", mesh.position.y - 500, mesh.position.y + 500)
      .step(1);
    positionFolder
      .add(mesh.position, "z", mesh.position.z - 500, mesh.position.z + 500)
      .step(1);
    positionFolder.open();

    const rotationFolder = objectGui.addFolder("Rotation");
    rotationFolder.add(mesh.rotation, "x", 0, Math.PI * 2).step(0.01);
    rotationFolder.add(mesh.rotation, "y", 0, Math.PI * 2).step(0.01);
    rotationFolder.add(mesh.rotation, "z", 0, Math.PI * 2).step(0.01);
    rotationFolder.open();

    const scaleFolder = objectGui.addFolder("Scale");
    scaleFolder.add(mesh.scale, "x", 0.1, 10).step(0.1);
    scaleFolder.add(mesh.scale, "y", 0.1, 10).step(0.1);
    scaleFolder.add(mesh.scale, "z", 0.1, 10).step(0.1);
    scaleFolder.open();
  }

  function getSimplifyCollider(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const collider = new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    collider.position.copy(center);
    return collider;
  }

  function retrieveObjectWithUUID(uuid) {
    let object = scene.getObjectByProperty("uuid", uuid);
    return object;
  }

  function setupOutlineEffect(renderer, scene, camera) {
    const renderPass = new RenderPass(scene, camera);
    outlinePass = new OutlinePass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      scene,
      camera
    );

    composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    composer.addPass(outlinePass);
  }

  function mergeGroupIntoSingleMesh(group) {
    let geometries = [];
    let material = null;
    group.traverse((child) => {
      if (child.isMesh) {
        const clonedGeometry = child.geometry.clone();
        clonedGeometry.applyMatrix4(child.matrixWorld);
        geometries.push(clonedGeometry);
        if (!material) material = child.material;
      }
    });
    if (geometries.length === 0) return null;
    const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);
    const mergedMesh = new THREE.Mesh(mergedGeometry, material);
    return mergedMesh;
  }

  function applyOutlineToMesh(mesh) {
    outlinePass.selectedObjects = [mesh];
    outlinePass.edgeStrength = 8;
    outlinePass.edgeGlow = 0.5;
    outlinePass.edgeThickness = 2.0;
    outlinePass.visibleEdgeColor.set(0xff0000);
  }

  function removeOutline() {
    outlinePass.selectedObjects = [];
  }

  function onPointerMove(event) {
    if (isMouseClicked) return; // debounce pointer
    if (controls.isLocked) {
      pointer.set(0, 0);
    } else {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }
  }

  function getCameraLookingAt(pointer, distance = 150, usePointer = false) {
    if (controlMode == "orbit") {
      if (model) {
      }
    }

    if (usePointer && !controls.isLocked) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const direction = raycaster.ray.direction.clone().normalize();
      const pointLookingAt = camera.position
        .clone()
        .add(direction.multiplyScalar(distance));
      return pointLookingAt;
    } else {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.normalize();
      const pointLookingAt = camera.position
        .clone()
        .add(direction.multiplyScalar(distance));
      return pointLookingAt;
    }
  }

  function trackCameraPoint(sphere) {
    const point = getCameraLookingAt(pointer, 150, false);
    sphere.position.copy(point);
  }

  function getSphereSimple(size = 1, color = 0x27d321) {
    const sphereGeometry = new THREE.SphereGeometry(size, size, size);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: color });
    const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    mesh.layers.set(1);
    return mesh;
  }

  function updateControlMove(keys) {
    const moveSpeed = 10; // Base speed value

    const delta = Math.min(clock.getDelta(), 0.1);
    const speed = delta * moveSpeed;

    // Get direction and right vector once
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);

    camera.getWorldDirection(forward).normalize();
    right.crossVectors(up, forward).normalize();

    // Project movement vectors to XZ plane if in 'strict' mode
    if (cameraFlyMode === "strict") {
      forward.y = 0;
      right.y = 0;
      forward.normalize();
      right.normalize();
    }

    const movement = new THREE.Vector3();

    if (keys.KeyW) movement.add(forward);
    if (keys.KeyS) movement.addScaledVector(forward, -1);
    if (keys.KeyA) movement.add(right);
    if (keys.KeyD) movement.addScaledVector(right, -1);

    // Only apply movement if there is any
    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(moveSpeed);
      camera.position.add(movement);
    }

    if (cameraFlyMode === "strict") {
      camera.position.y = carHeight - 50;
    }
  }

  function updateCameraPoint() {
    if (camPoint) {
      const point = getCameraLookingAt(pointer, 150, false);
      camPoint.position.copy(point);
    }
  }

  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (controlMode === "orbit") {
      updateCharacter(delta);
      updateOrbitTarget();
    } else if (controlMode === "fly" && controls.isLocked) {
      updateControlMove(keys);
      if (camPoint) updateCameraPoint();
    }

    updateMapCamera(group);
    render();
    renderMap();
  }

  function windowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    orthoCamera.updateProjectionMatrix();
    render();
  }

  function render() {
    stats.update();
    if (debugBbox) {
      UpdateBoxHelper(RayCastObjects);
    }
    // Use the composer for rendering when outlining is needed
    if (outlineMode && outlinePass.selectedObjects.length > 0) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
    return scene;
  }

  function UpdateBoxHelper(raycastObjects) {
    raycastObjects.forEach((obj) => {
      if (obj.userData.helper) {
        obj.userData.helper.update();
      }
      if (obj.userData.collider) {
        obj.userData.collider.position.copy(obj.position);
        obj.userData.collider.rotation.copy(obj.rotation);
      }
    });
  }

  function loadGLTFModel(gltfPath) {
    const onProgress = function (xhr) {
      if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log(`Loading model: ${percentComplete.toFixed(2)}%`);
      }
    };

    return new Promise((resolve, reject) => {
      // Setup DRACO decoder
      const dracoLoader = new DRACOLoader();
      // Use a more standard path to the draco decoder
      dracoLoader.setDecoderPath(
        "https://www.gstatic.com/draco/versioned/decoders/1.5.6/"
      );
      dracoLoader.setDecoderConfig({ type: "js" });

      // Setup GLTF loader
      const gltfLoader = new GLTFLoader();
      gltfLoader.setDRACOLoader(dracoLoader);

      gltfLoader.load(
        gltfPath,
        (gltf) => {
          const model = gltf.scene;
          resolve(model);
        },
        onProgress,
        (error) => {
          console.error(`Error loading model ${gltfPath}:`, error);
          reject(error);
        }
      );
    });
  }

  function updateMapCamera(pivot) {
    // Copy XZ position from main camera
    orthoCamera.position.x = pivot.position.x;
    orthoCamera.position.z = pivot.position.z;
    orthoCamera.position.y = 1000;

    const dir = new THREE.Vector3();
    pivot.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const target = new THREE.Vector3(
      pivot.position.x + dir.x,
      0,
      pivot.position.z + dir.z
    );

    orthoCamera.lookAt(target);
    orthoCamera.updateProjectionMatrix();
  }

  function renderMap() {
    const wrapper = document.getElementById("minimapWrapper");
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    minimapRenderer.setSize(width, height);
    minimapRenderer.setScissor(0, 0, width, height);
    minimapRenderer.setViewport(0, 0, width, height);
    minimapRenderer.setScissorTest(true);
    minimapRenderer.clear();
    minimapRenderer.render(scene, orthoCamera);
    minimapRenderer.setScissorTest(false);
  }

  function switchControlMode() {
    if (camPoint) {
      scene.remove(camPoint);
      camPoint = null;
    }

    if (controlMode === "orbit") {
      // Save camera state before switching to fly mode
      savedCameraState = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
        direction: new THREE.Vector3(),
      };
      camera.getWorldDirection(savedCameraState.direction);

      // Switch to fly mode
      controlMode = "fly";
      chaOrbitControls.enabled = false;
      chaOrbitControls.removeEventListener("change", onControlsChange);

      // Create new camPoint based on saved direction
      camPoint = getSphereSimple();
      camPoint.name = "CamPoint";
      scene.add(camPoint);
      updateCameraPoint();

      controls.lock();
      console.log("Switched to Free-Fly Camera");
    } else {
      // Switch back to orbit mode
      controlMode = "orbit";
      chaOrbitControls.enabled = true;
      chaOrbitControls.addEventListener("change", onControlsChange);

      camPoint = getSphereSimple();
      camPoint.name = "CamPoint";
      scene.add(camPoint);

      // Force camera to face model
      updateOrbitTarget();
      savedCameraState = null; // Clear saved state when switching to orbit

      console.log("Switched to Third-Person Orbit Camera");
    }
  }

  // Update the controls setup in init()
  function setupControls(renderer) {
    controls = new PointerLockControls(camera, renderer.domElement);

    chaOrbitControls = new OrbitControls(camera, renderer.domElement);
    chaOrbitControls.enableDamping = true;
    chaOrbitControls.enablePan = false;
    chaOrbitControls.maxPolarAngle = Math.PI / 2 - 0.05;
    chaOrbitControls.addEventListener("change", onControlsChange);
    if (controlMode === "fly") {
      chaOrbitControls.enabled = false;
    } else {
      chaOrbitControls.enabled = true;
      controls.unlock();
      updateOrbitTarget(); // Set initial camera position
    }
  }

  function updateOrbitTarget() {
    if (model) {
      // Get model's world position
      const modelPosition = new THREE.Vector3();
      model.getWorldPosition(modelPosition);

      // Position camera behind and above the model
      const distance = 300;

      const forwardOffset = 500;
      const xOffset = 30;
      const yOffset = 300;

      // Get model's forward direction (model faces Z initially due to rotation.y = Math.PI)
      const modelForward = new THREE.Vector3(0, 0, 1); // Corrected to -Z
      modelForward.applyQuaternion(group.quaternion); // Use group's quaternion for character rotation

      // Calculate desired camera position (behind and above the model)
      const desiredPosition = modelPosition
        .clone()
        .sub(modelForward.multiplyScalar(distance))
        .add(new THREE.Vector3(xOffset, yOffset, 0));

      // Smoothly interpolate camera position
      camera.position.lerp(desiredPosition, 0.1);

      // Set OrbitControls target to model's position with slight offset
      const targetPosition = modelPosition
        .clone()
        .add(modelForward.normalize().multiplyScalar(forwardOffset))
        .add(new THREE.Vector3(0, 50, 0)); // Look slightly above character
      chaOrbitControls.target.lerp(targetPosition, 0.1);

      // Align camera's rotation to model's facing direction
      const cameraForward = modelForward.clone().normalize();
      const cameraQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1), // Camera's default forward (-Z)
        cameraForward
      );
      camera.quaternion.rotateTowards(cameraQuaternion, 0); // Smoothly rotate camera

      chaOrbitControls.update();
      if (camPoint) {
        updateCameraPoint();
      }
    }
  }
}

init();
