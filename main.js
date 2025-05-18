import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import GUI from "lil-gui";
RectAreaLightUniformsLib.init();
const clock = new THREE.Clock();
const pointer = new THREE.Vector2();
let INTERSECTED = null;
let composer, outlinePass;
let SceneObject = {};

// Car driving variables
let cars = [];
let selectedCar = null;
let isDriving = false;
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

async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  const stats = new Stats();
  document.getElementById("webgl").appendChild(stats.dom);
  document.getElementById("webgl").appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    1.0,
    10000
  );
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4287f5);
  scene.add(new THREE.AxesHelper(1000));
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

  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  function resetKeys() {
    for (let key in keys) {
      keys[key] = false;
    }
  }

  // Updated key controls for both walking and driving
  const onKeyDown = (event) => {
    if (controls.isLocked) {
      if (event.code === "KeyP") {
        controls.unlock();
        startPanel.style.display = "block";
      }
      if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
      }
    }

    // Car controls
    if (isDriving) {
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
        case "KeyP":
        case "Escape":
          exitCarDriving();
          break;
      }
    }
  };

  const onKeyUp = (event) => {
    if (controls.isLocked) {
      if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
      }
    }

    // Car controls
    if (isDriving) {
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
  };

  document.addEventListener("keydown", onKeyDown, false);
  document.addEventListener("keyup", onKeyUp, false);

  const startPanel = document.getElementById("startPanel");
  const startButton = document.getElementById("startButton");
  startButton.addEventListener(
    "click",
    () => {
      controls.lock();
      startPanel.style.display = "none";
    },
    false
  );
  controls.addEventListener("lock", (event) => {
    startPanel.style.display = "none";
  });
  controls.addEventListener("unlock", (event) => {
    resetKeys();
  });
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Load cars and add them to our cars array for tracking
  const mclarenCar = await loadGLTFModel("mclaren/draco/chassis.gltf");

  // Load Aspark Owl car model
  const asparkCar = await loadGLTFModel(
    "mclaren/aspark_owl_2020__www.vecarz.com/scene.gltf"
  );
  asparkCar.name = "AsparkOwl";

  const bugattiCar = await loadGLTFModel(
    "mclaren/bugatti_bolide_2024__www.vecarz.com/scene.gltf"
  );
  bugattiCar.name = "BugattiBolide";

  const ferrariCar = await loadGLTFModel(
    "mclaren/ferrari_monza_sp1_2019__www.vecarz.com/scene.gltf"
  );
  ferrariCar.name = "FerrariMonzaSP1";

  // Load wheels for each car
  const wheelFrontLeft1 = await loadGLTFModel("mclaren/draco/wheel.gltf");
  const wheelFrontRight1 = await loadGLTFModel("mclaren/draco/wheel.gltf");
  const wheelBackLeft1 = await loadGLTFModel("mclaren/draco/wheel.gltf");
  const wheelBackRight1 = await loadGLTFModel("mclaren/draco/wheel.gltf");
  // Scale wheels appropriately - reduced wheel scale to match chassis
  const wheelScale = 1; // Reduced from 20 to make wheels proportional to chassis
  const wheels = [
    wheelFrontLeft1,
    wheelFrontRight1,
    wheelBackLeft1,
    wheelBackRight1,
  ];

  wheels.forEach((wheel) => {
    wheel.scale.set(wheelScale, wheelScale, wheelScale);
    wheel.castShadow = true;
    mclarenCar.add(wheel);
  });

  wheelFrontLeft1.position.set(
    0.78 * wheelScale,
    0.3 * wheelScale,
    1.25 * wheelScale
  );
  wheelFrontRight1.position.set(
    -0.78 * wheelScale,
    0.3 * wheelScale,
    1.25 * wheelScale
  );
  wheelBackLeft1.position.set(
    0.75 * wheelScale,
    0.3 * wheelScale,
    -1.32 * wheelScale
  );
  wheelBackRight1.position.set(
    -0.75 * wheelScale,
    0.3 * wheelScale,
    -1.32 * wheelScale
  ); // Position wheels for Car 2

  // Keep track of wheels in the car objects for rotation during driving
  mclarenCar.userData.wheels = wheels;

  // Setup car physics properties
  mclarenCar.name = "MclarenDraco";
  mclarenCar.userData.velocity = new THREE.Vector3();
  mclarenCar.userData.acceleration = new THREE.Vector3();
  mclarenCar.userData.direction = new THREE.Vector3(0, 0, 1);

  // Setup Aspark Owl physics properties
  asparkCar.userData.velocity = new THREE.Vector3();
  asparkCar.userData.acceleration = new THREE.Vector3();
  asparkCar.userData.direction = new THREE.Vector3(0, 0, 1);
  // Add wheels property to Aspark car (even if it's empty - this prevents errors)
  asparkCar.userData.wheels = [];

  bugattiCar.userData.velocity = new THREE.Vector3();
  bugattiCar.userData.acceleration = new THREE.Vector3();
  bugattiCar.userData.direction = new THREE.Vector3(0, 0, 1);
  // Add wheels property to Bugatti car
  bugattiCar.userData.wheels = [];

  ferrariCar.userData.velocity = new THREE.Vector3();
  ferrariCar.userData.acceleration = new THREE.Vector3();
  ferrariCar.userData.direction = new THREE.Vector3(0, 0, 1);
  // Add wheels property to Ferrari car
  ferrariCar.userData.wheels = [];

  // Scale the McLaren models appropriately - significantly increased to make chassis larger relative to wheels
  mclarenCar.scale.set(150, 150, 150);
  // Scale the Aspark model to match the size of the other cars
  asparkCar.scale.set(150, 150, 150);
  bugattiCar.scale.set(150, 150, 150);
  ferrariCar.scale.set(14000, 14000, 14000);

  // Get car size after scaling
  let carSize = new THREE.Box3().setFromObject(mclarenCar);
  let carWidth = carSize.max.x - carSize.min.x;
  let carHeight = carSize.max.y - carSize.min.y;

  // Position cars
  mclarenCar.position.set(0, 0, 0);
  asparkCar.position.set(carWidth + 500, 0, 0);
  bugattiCar.position.set(-(carWidth + 500), 0, 0);
  ferrariCar.position.set(-(carWidth + 1000), 0, 0);

  // Rotate cars to face forward (adjust as needed for the McLaren model)
  mclarenCar.rotation.y = Math.PI;
  asparkCar.rotation.y = Math.PI; // Adjust as needed for the Aspark model
  bugattiCar.rotation.y = Math.PI;
  ferrariCar.rotation.y = Math.PI;

  mclarenCar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  asparkCar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  bugattiCar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  ferrariCar.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  scene.add(mclarenCar);
  scene.add(asparkCar); // Add the Aspark car to the scene
  scene.add(bugattiCar); // Add the Bugatti car to the scene
  scene.add(ferrariCar); // Add the Ferrari car to the scene

  // Add cars to array for tracking and selection
  cars.push(mclarenCar);
  cars.push(asparkCar); // Add the Aspark car to the cars array
  cars.push(bugattiCar); // Add the Bugatti car to the cars array
  cars.push(ferrariCar); // Add the Ferrari car to the cars array

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
  scene.add(helper);
  // Create a much larger ground plane for infinite-like appearance
  const planeGeometry = new THREE.PlaneGeometry(50000, 50000);
  const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
  planeMaterial.receiveShadow = true;
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.y = -5.0;
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;

  // Set texture to repeat many times for a tiled effect
  groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(100, 100); // Significantly increase repeat
  groundTexture.anisotropy = 16; // Better texture quality at angles
  groundTexture.needsUpdate = true;

  scene.add(plane);
  mclarenCar.position.y = 10; // Raise car slightly above ground level
  asparkCar.position.y = 5; // Raise Aspark car slightly above ground level
  bugattiCar.position.y = 5; // Raise Bugatti car slightly above ground level
  ferrariCar.position.y = 5; // Raise Ferrari car slightly above ground level

  camera.position.x = 300;
  camera.position.y = carHeight - 50;
  camera.position.z = 1000;
  camera.lookAt(scene.position);
  scene.add(camera);

  for (let child of scene.children) {
    let child_uuid = child.uuid;
    SceneObject[child_uuid] = child;
  }

  const raycaster = new THREE.Raycaster();
  let { raycastObjects: RayCastObjects, rayCastMapping: RayCastMapping } =
    createRayCastObjects();

  console.log("Scene objects Scene:", scene.children);
  console.log("Scene objects SceneObject:", SceneObject);
  console.log("RaycastObjects:", RayCastObjects);
  console.log("RayCastMapping: ", RayCastMapping);

  let isMouseClicked = false;
  window.addEventListener("mousedown", (event) => {
    const guiPanel = document.getElementById("objectInfoPanel");
    const clickedInsideGUI = guiPanel.contains(event.target);
    if (clickedInsideGUI) return;

    if (!controls.isLocked && !isDriving) {
      setTimeout(() => {
        controls.lock();
        clearGuiPanel(guiPanel);
      }, 0);
      return;
    }

    // Make sure we check for intersections before handling interaction
    checkIntersection(RayCastObjects);
    isMouseClicked = true;

    console.log(
      "Mouse down, INTERSECTED:",
      INTERSECTED ? INTERSECTED.uuid : "none"
    );

    if (INTERSECTED) {
      handleInteraction(INTERSECTED, isMouseClicked);
    } else {
      clearGuiPanel(guiPanel);
      removeOutline();
    }
  });

  function clearGuiPanel(guiPanel) {
    guiPanel.style.display = "none";
    if (objectGui) {
      objectGui.destroy?.();
      objectGui = null;
    }
  }

  window.addEventListener("mouseup", () => {
    isMouseClicked = false;
  });

  window.addEventListener("resize", windowResize);
  window.addEventListener("pointermove", onPointerMove);
  controls.addEventListener("change", () => {
    // Only check intersections when not in driving mode
    if (!isDriving) {
      checkIntersection(RayCastObjects);
    }
  });
  // Additionally listen for unlock event which happens when exiting car
  controls.addEventListener("unlock", () => {
    // Give the controls time to stabilize before checking intersections again
    if (!isDriving) {
      // Force pointer reset to ensure clean state after unlocking
      pointer.set(0, 0);

      // Allow a moment before checking for intersections
      setTimeout(() => {
        checkIntersection(RayCastObjects);
      }, 300);
    }
  });

  let dirCam = new THREE.Vector3();
  const camPoint = getSphereSimple();
  camPoint.name = "CamPoint";
  scene.add(camPoint);
  camera.getWorldDirection(dirCam);
  trackCameraPoint(camPoint);

  setupOutlineEffect(renderer, scene, camera);

  animate();

  function createRayCastObjects() {
    let raycastObjects = [];
    let rayCastMapping = {};

    for (let child of scene.children) {
      if (child.isGroup) {
        if (checkMultiMeshesGroup(child)) {
          const mergedMesh = mergeGroupIntoSingleMesh(child);
          mergedMesh.name = child.name + "_merged_collider";
          mergedMesh.applyMatrix4(child.matrixWorld.clone().invert());
          child.add(mergedMesh);
          raycastObjects.push(mergedMesh);
          rayCastMapping[mergedMesh.uuid] = child.uuid;
          console.log("MergedMesh: ", mergedMesh);
          continue;
        }
        let colliderBox = getSimplifyCollider(child);
        colliderBox.name = child.name + "_collider";
        colliderBox.applyMatrix4(child.matrixWorld.clone().invert());
        raycastObjects.push(colliderBox);
        rayCastMapping[colliderBox.uuid] = child.uuid;
        child.add(colliderBox);

        // Store reference to collider in the original object userData
        // This helps with proper car selection later
        child.userData.collider = colliderBox;

        // Create box helper but don't show it (set visible to false)
        const boxHelper = new THREE.BoxHelper(colliderBox, 0xffff00);
        boxHelper.visible = false; // Hide the yellow bounding boxes
        colliderBox.userData.helper = boxHelper;
        scene.add(boxHelper);
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

  function updateCamera() {
    if (isDriving) {
      updateCarDriving();
      updateCarFollowCamera();
    } else {
      updateControlMove(keys);
      updateCameraPoint();
    }
  }
  function enterCarDriving(car) {
    // Set global state
    isDriving = true;
    selectedCar = car;
    controls.unlock();

    console.log(`Entering car driving mode for: ${selectedCar.name}`);

    // Always ensure all car physics properties exist and are properly initialized
    selectedCar.userData.velocity = new THREE.Vector3();
    selectedCar.userData.acceleration = new THREE.Vector3();

    // Initialize direction vector based on car's current rotation
    selectedCar.userData.direction = new THREE.Vector3(0, 0, 1);
    selectedCar.userData.direction.applyQuaternion(selectedCar.quaternion);
    selectedCar.userData.direction.normalize();

    // Make sure car has wheels property to prevent "wheelS" error
    if (!selectedCar.userData.wheels) {
      selectedCar.userData.wheels = [];
      console.log(`Created empty wheels array for ${selectedCar.name}`);
    }

    // Reset car controls
    carControls.forward = false;
    carControls.backward = false;
    carControls.left = false;
    carControls.right = false;
    carControls.brake = false;
    carSpeed = 0;

    // Create driving GUI
    createDrivingGUI();

    // Setup initial camera position behind the car
    updateCarFollowCamera(true);

    // Hide the outline when driving
    removeOutline();

    console.log(`Now driving: ${selectedCar.name}`);

    // Show driving instructions with current car name
    const drivingInstructions = document.getElementById("drivingInstructions");
    if (drivingInstructions) {
      drivingInstructions.style.display = "block";

      // Update the car name in the driving instructions
      const carNameDisplay = document.getElementById("current-car-name");
      if (carNameDisplay) {
        carNameDisplay.textContent = `Currently driving: ${selectedCar.name}`;
      }
    }
  }
  function exitCarDriving() {
    if (!isDriving || !selectedCar) return;

    isDriving = false;
    carSpeed = 0;

    // Reset camera position to be behind the car
    const behindCar = new THREE.Vector3();
    selectedCar.getWorldDirection(behindCar);
    behindCar.multiplyScalar(-300); // Move 300 units behind car
    behindCar.add(selectedCar.position);
    behindCar.y = selectedCar.position.y + 100; // Slightly above car

    camera.position.copy(behindCar);
    camera.lookAt(selectedCar.position);

    // Reset car controls
    carControls.forward = false;
    carControls.backward = false;
    carControls.left = false;
    carControls.right = false;
    carControls.brake = false;

    // Make sure car physics values are reset
    if (selectedCar) {
      // Reset any car-specific properties
      selectedCar.userData.velocity.set(0, 0, 0);
      selectedCar.userData.acceleration.set(0, 0, 0);

      // Important: Ensure the car's direction is correctly reset
      // This is crucial for other cars to be properly handled
      selectedCar.userData.direction.set(0, 0, 1);
      selectedCar.userData.direction.applyQuaternion(selectedCar.quaternion);
      selectedCar.userData.direction.normalize();

      console.log("Exited driving mode for: " + selectedCar.name);

      // Save reference to car before clearing selectedCar
      const lastCar = selectedCar;

      // Clear the selected car
      selectedCar = null;

      // Remove driving GUI
      removeDrivingGUI();

      // Hide driving instructions
      const drivingInstructions = document.getElementById(
        "drivingInstructions"
      );
      if (drivingInstructions) {
        drivingInstructions.style.display = "none";
      }

      // Return to normal controls after a short delay
      setTimeout(() => {
        controls.lock();

        // Reset pointer to center so raycasting works again after exiting car
        pointer.set(0, 0);

        // Make sure the INTERSECTED is cleared so we can detect cars again
        INTERSECTED = null;

        // Force a check for intersections after returning to walking mode
        setTimeout(() => {
          checkIntersection(RayCastObjects);
        }, 300);
      }, 100);

      return lastCar; // Return the car that was just exited
    }
  }

  let drivingGui = null;
  function createDrivingGUI() {
    if (drivingGui) {
      drivingGui.destroy?.();
    }

    const guiContainer = document.createElement("div");
    guiContainer.id = "drivingGUI";
    guiContainer.style.position = "absolute";
    guiContainer.style.right = "10px";
    guiContainer.style.top = "10px";
    document.body.appendChild(guiContainer);

    drivingGui = new GUI({ autoPlace: false, width: 300 });
    drivingGui.domElement.style.position = "absolute";
    drivingGui.domElement.style.right = "10px";
    drivingGui.domElement.style.top = "10px";
    guiContainer.appendChild(drivingGui.domElement);
    // Add car name to GUI title with the actual selected car model
    drivingGui.title(`Driving ${selectedCar.name}`);

    drivingGui.add({ "Exit Car": exitCarDriving }, "Exit Car");

    const carFolder = drivingGui.addFolder("Performance Settings");
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

    const cameraFolder = drivingGui.addFolder("Camera Settings");
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

    // Create or update driving instructions
    let instructions = document.getElementById("drivingInstructions");
    if (!instructions) {
      instructions = document.createElement("div");
      instructions.id = "drivingInstructions";
      document.body.appendChild(instructions);
    }

    instructions.innerHTML = `      <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 15px; border-radius: 5px; font-family: Arial, sans-serif;">
        <h3 style="margin-top: 0; margin-bottom: 10px;">${selectedCar.name} Controls:</h3>
        <div style="display: grid; grid-template-columns: auto auto; gap: 8px; align-items: center;">
          <div><strong>W/↑</strong></div><div>Accelerate</div>
          <div><strong>S/↓</strong></div><div>Reverse</div>
          <div><strong>A/←</strong></div><div>Turn Left</div>
          <div><strong>D/→</strong></div><div>Turn Right</div>
          <div><strong>Space</strong></div><div>Brake</div>
          <div><strong>P/Esc</strong></div><div>Exit Vehicle</div>
        </div>
      </div>
    `;
    instructions.style.display = "block";

    carFolder.open();
    cameraFolder.open();
  }

  function removeDrivingGUI() {
    if (drivingGui) {
      drivingGui.destroy?.();
      drivingGui = null;

      const guiContainer = document.getElementById("drivingGUI");
      if (guiContainer) {
        guiContainer.remove();
      }

      const instructions = document.getElementById("drivingInstructions");
      if (instructions) {
        instructions.remove();
      }
    }
  }
  function updateCarDriving() {
    if (!selectedCar || !isDriving) return;

    // Apply acceleration with smoother handling
    if (carControls.forward) {
      carSpeed += carAcceleration;
    } else if (carControls.backward) {
      carSpeed -= carAcceleration;
    } else {
      if (carSpeed > 0) {
        carSpeed -= carDeceleration;
      } else if (carSpeed < 0) {
        carSpeed += carDeceleration;
      }
      if (Math.abs(carSpeed) < 0.1) {
        carSpeed = 0;
      }
    }

    // Apply braking
    if (carControls.brake) {
      carSpeed *= 0.9;
    }

    // Limit speed
    carSpeed = Math.max(-carMaxSpeed / 2, Math.min(carMaxSpeed, carSpeed));

    // Calculate turn speed based on car speed
    // Slower rotation at high speeds for stability, faster rotation at low speeds for maneuverability
    const adaptiveTurnSpeed =
      carTurnSpeed * (1 - (Math.abs(carSpeed) / carMaxSpeed) * 0.5);

    // Apply turning (only when car is moving)
    if (Math.abs(carSpeed) > 0.1) {
      // Apply smoother turning with easing
      if (carControls.left) {
        selectedCar.rotation.y += adaptiveTurnSpeed * Math.sign(carSpeed);
      }
      if (carControls.right) {
        selectedCar.rotation.y -= adaptiveTurnSpeed * Math.sign(carSpeed);
      }
    }

    // Update direction vector based on car's rotation
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(selectedCar.quaternion);
    direction.y = 0; // Keep car on the ground
    direction.normalize();
    selectedCar.userData.direction.copy(direction);

    // Update car position based on direction and speed
    const moveVector = selectedCar.userData.direction
      .clone()
      .multiplyScalar(carSpeed);
    selectedCar.position.add(moveVector); // Apply ground constraint - keep car slightly above ground to prevent wheel clipping
    selectedCar.position.y = 5;

    // Update car's collider if it exists
    if (selectedCar.userData.collider) {
      selectedCar.userData.collider.position.copy(selectedCar.position);
      selectedCar.userData.collider.rotation.copy(selectedCar.rotation);
    }

    // If the car is moving slowly, apply some damping to eventually stop it
    if (
      Math.abs(carSpeed) < 1 &&
      !carControls.forward &&
      !carControls.backward
    ) {
      carSpeed = 0;
    }

    // Simulate wheel rotation based on speed
    // Check if the car has wheels and rotate them
    if (selectedCar.userData.wheels && selectedCar.userData.wheels.length > 0) {
      selectedCar.userData.wheels.forEach((wheel) => {
        wheel.rotation.x += carSpeed * 0.01;
      });
    }
  } // Store previous camera data for smooth transitions
  let prevCameraTarget = new THREE.Vector3();
  let prevLookAtPoint = new THREE.Vector3();
  let targetCameraRotationZ = 0;
  let currentTurnInfluence = 0; // Track current turn influence for smoother transitions

  function updateCarFollowCamera(instant = false) {
    if (!selectedCar || !isDriving) return;

    // Create a dampened direction that's more stable during sharp turns
    const carDirection = selectedCar.userData.direction.clone();

    // Create a smoother camera path by calculating a target behind the car
    // that considers both position and orientation
    const cameraOffset = carDirection
      .clone()
      .multiplyScalar(-thirdPersonCameraDistance);
    cameraOffset.y = thirdPersonCameraHeight;

    const targetPosition = selectedCar.position.clone().add(cameraOffset);

    // Initialize previous positions if this is the first update
    if (instant || prevCameraTarget.lengthSq() === 0) {
      camera.position.copy(targetPosition);
      prevCameraTarget.copy(targetPosition);
      prevLookAtPoint.copy(selectedCar.position);
    } else {
      // Use variable smoothing based on speed to prevent jerkiness
      // Slower speeds = more responsive camera
      // Higher speeds = more stable camera
      const speedFactor = Math.min(Math.abs(carSpeed) / carMaxSpeed, 1);

      // More aggressive smoothing to reduce shake - reduce the max value
      const dynamicLerpFactor = THREE.MathUtils.lerp(
        cameraLerpFactor * 1.2,
        cameraLerpFactor * 0.3, // More smoothing at high speeds
        speedFactor
      );

      // Use exponential smoothing to follow the car
      prevCameraTarget.lerp(targetPosition, dynamicLerpFactor);
      camera.position.copy(prevCameraTarget);
    }

    // Calculate a smooth turning offset that gradually changes
    // This prevents camera jerks when turning starts/stops
    let targetTurnInfluence = 0;

    // Calculate turn influence based on steering input AND actual car rotation rate
    // to make it more realistic and smooth
    if (carControls.left) {
      targetTurnInfluence = (Math.abs(carSpeed) / carMaxSpeed) * 15; // Reduced from 20
    } else if (carControls.right) {
      targetTurnInfluence = (-Math.abs(carSpeed) / carMaxSpeed) * 15; // Reduced from 20
    }

    // Smooth the turn influence transition - key to reducing camera shake
    currentTurnInfluence = THREE.MathUtils.lerp(
      currentTurnInfluence,
      targetTurnInfluence,
      0.05 // Very gentle transition for turn influence
    );

    // Create a look-at point that smoothly tracks in front of the car
    const lookAtTarget = selectedCar.position
      .clone()
      .add(
        new THREE.Vector3(
          currentTurnInfluence,
          thirdPersonCameraHeight * 0.2,
          0
        )
      );

    // Smooth the look-at point transition
    if (instant || prevLookAtPoint.lengthSq() === 0) {
      prevLookAtPoint.copy(lookAtTarget);
    } else {
      // Use slightly faster lerp for look-at to keep focus on car
      // But still slow enough to reduce shake
      prevLookAtPoint.lerp(
        lookAtTarget,
        Math.min(cameraLerpFactor * 1.2, 0.15)
      );
    }

    camera.lookAt(prevLookAtPoint);

    // Apply a smooth camera tilt during turns with proper damping
    // Calculate target tilt based on turn influence for consistency
    const tiltFactor =
      Math.abs(carSpeed) > 2
        ? 0.02 * Math.min(Math.abs(carSpeed) / carMaxSpeed, 1)
        : 0;
    const newTargetRotationZ = -currentTurnInfluence * 0.001 * tiltFactor;

    // Even smoother damping for camera rotation
    targetCameraRotationZ = THREE.MathUtils.lerp(
      targetCameraRotationZ,
      newTargetRotationZ,
      0.05 // Gentle transition for tilt
    );

    // Apply smooth tilt transition
    camera.rotation.z = THREE.MathUtils.lerp(
      camera.rotation.z,
      targetCameraRotationZ,
      0.03
    );
  }
  function handleInteraction(mesh, isMouseClicked) {
    if (isMouseClicked) {
      controls.unlock();
      console.log("🎯 Object clicked:", mesh);
      isMouseClicked = false;

      const collider_uuid = mesh.uuid;
      const original_uuid = RayCastMapping[collider_uuid];
      const targetObject = retrieveObjectWithUUID(original_uuid);

      if (targetObject) {
        console.log("TARGET OBJECT: ", targetObject);

        // Check if it's one of our cars
        if (cars.includes(targetObject)) {
          console.log("Car clicked:", targetObject.name);

          // Ask user if they want to drive this car
          if (confirm(`Do you want to drive the ${targetObject.name}?`)) {
            // Force reset of any existing state that might interfere with car selection
            INTERSECTED = null;
            removeOutline();

            // Ensure clean car entry
            enterCarDriving(targetObject);
            return;
          }
        }

        setupObjectGUI(targetObject);
      } else {
        console.warn("Original object not found for UUID:", original_uuid);
      }
    }
    return;
  }

  let objectGui;

  function setupObjectGUI(mesh) {
    const panel = document.getElementById("objectInfoPanel");
    const details = document.getElementById("objectDetails");
    const guiContainer = document.getElementById("objectGui");
    guiContainer.innerHTML = "";

    if (objectGui) {
      objectGui.destroy?.();
      objectGui = null;
    }

    const info = `
            <strong>Name:</strong> ${mesh.name}<br/>
            <strong>UUID:</strong> ${mesh.uuid}<br/>
        `;
    details.innerHTML = info;
    panel.style.display = "block";

    objectGui = new GUI({ autoPlace: false, width: 300 });
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

    // Assign the collider to the mesh's userData
    mesh.userData.collider = collider;

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
    // Skip the merge process entirely and use a simplified box collider approach
    // This avoids issues with incompatible geometry attributes and morphAttributes
    const box = new THREE.Box3().setFromObject(group);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const collider = new THREE.Mesh(
      boxGeo,
      new THREE.MeshBasicMaterial({
        color: 0xff0000,
        wireframe: true,
        visible: false,
      })
    );
    collider.position.copy(center);

    // Add userData to help with debugging
    collider.userData.isCollider = true;
    collider.userData.originalObject = group;

    return collider;
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
    if (controls.isLocked) {
      // When pointer is locked (walking mode), center the pointer
      pointer.set(0, 0);
    } else {
      // When pointer is free (selection mode), use the actual pointer position
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Check for intersection when pointer moves and not in driving mode
      if (!isDriving) {
        checkIntersection(RayCastObjects);
      }
    }
  }

  function getCameraLookingAt(pointer, distance = 150, usePointer = false) {
    if (usePointer && !controls.isLocked) {
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const direction = raycaster.ray.direction.clone().normalize();
      const pointLookingAt = camera.position
        .clone()
        .add(direction.multiplyScalar(distance));
      return pointLookingAt;
    } else {
      camera.getWorldDirection(dirCam);
      dirCam.normalize();
      const pointLookingAt = camera.position
        .clone()
        .add(dirCam.multiplyScalar(distance));
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
    return mesh;
  }

  function updateControlMove(keys) {
    const moveSpeed = 500;
    const delta = Math.min(clock.getDelta(), 0.1);
    const speed = delta * moveSpeed;
    const direction = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.normalize();
    right.crossVectors(camera.up, direction).normalize();
    if (keys.KeyW) camera.position.addScaledVector(direction, speed);
    if (keys.KeyS) camera.position.addScaledVector(direction, -speed);
    if (keys.KeyA) camera.position.addScaledVector(right, speed);
    if (keys.KeyD) camera.position.addScaledVector(right, -speed);
  }

  function updateCameraPoint() {
    trackCameraPoint(camPoint);
  }

  function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    UpdateBoxHelper(RayCastObjects);
    render();
  }

  function windowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    render();
  }

  function render() {
    stats.update();
    UpdateBoxHelper(RayCastObjects);

    // Use the composer for rendering when outlining is needed
    if (outlinePass.selectedObjects.length > 0) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
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

// getPlane function has been removed as it's no longer used

// Add HTML for driving UI
document.addEventListener("DOMContentLoaded", function () {
  // Add a container for driving instructions if it doesn't exist
  if (!document.getElementById("drivingInstructions")) {
    const drivingInstructions = document.createElement("div");
    drivingInstructions.id = "drivingInstructions";
    drivingInstructions.style.display = "none";
    drivingInstructions.style.position = "absolute";
    drivingInstructions.style.bottom = "20px";
    drivingInstructions.style.left = "20px";
    drivingInstructions.style.backgroundColor = "rgba(0,0,0,0.7)";
    drivingInstructions.style.color = "white";
    drivingInstructions.style.padding = "15px";
    drivingInstructions.style.borderRadius = "5px";
    drivingInstructions.style.fontFamily = "Arial, sans-serif";
    drivingInstructions.innerHTML = `
      <h3 style="margin-top: 0">Car Controls:</h3>
      <div style="display: grid; grid-template-columns: auto auto; gap: 5px;">
        <div>W/↑:</div><div>Accelerate</div>
        <div>S/↓:</div><div>Reverse</div>
        <div>A/←:</div><div>Turn Left</div>
        <div>D/→:</div><div>Turn Right</div>
        <div>Space:</div><div>Brake</div>
        <div>P/Esc:</div><div>Exit Vehicle</div>
      </div>
      <div id="current-car-name" style="margin-top: 10px; font-style: italic;"></div>
    `;

    document.body.appendChild(drivingInstructions);
  }
});

let scene = init();
window.scene = scene;
