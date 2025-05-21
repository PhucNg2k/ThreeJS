import * as THREE from "three";
import Stats from "three/addons/libs/stats.module.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
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

let scene, camera, orthoCamera, minimapRenderer;
let cameraFlyMode = "fly";
let outlineMode = false;

// Car array for tracking cars in the scene
let cars = [];

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

  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  function resetKeys() {
    for (let key in keys) {
      keys[key] = false;
    }
  }

  // Key controls for walking only (driving controls moved to driving.js)
  const onKeyDown = (event) => {
    if (controls.isLocked) {
      if (event.code == "KeyH") {
        cameraFlyMode = cameraFlyMode === "fly" ? "strict" : "fly";
      }
      if (event.code === "KeyP") {
        controls.unlock();
        startPanel.style.display = "block";
      }
      if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = true;
      }
    }
  };

  const onKeyUp = (event) => {
    if (controls.isLocked) {
      if (keys.hasOwnProperty(event.code)) {
        keys[event.code] = false;
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

  /*
  LOCK EVENT:
-> MOUSE UP 

-> MOUSE DOWN -> REGISTER CAMERA
-> OBJECT
-> UNLOCK EVENT  -> RESUME CAMERA


UNLOCK EVENT:
-> MOUSE UP 
(WILL NOT REGISTER MOUSE DOWN EVENT)
-> LOCK EVENT  

  */

  let savedCameraState = null;
  controls.addEventListener("lock", (event) => {
    console.log("(LOCK) EVENT");
    startPanel.style.display = "none";

    let carOptionPanel = document.getElementById("carOptionPanel");
    carOptionPanel.style.display = "none";
  });

  controls.addEventListener("unlock", (event) => {
    console.log("(UNLOCK) EVENT");
    resetKeys();

    if (savedCameraState) {
      camera.position.copy(savedCameraState.position);
      camera.quaternion.copy(savedCameraState.quaternion);
      renderer.render(scene, camera);
      //savedCameraState = null; // Clear after restoring
    }
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

  //scene.add(mclarenCar);
  scene.add(asparkCar); // Add the Aspark car to the scene
  scene.add(bugattiCar); // Add the Bugatti car to the scene
  scene.add(ferrariCar); // Add the Ferrari car to the scene

  // Add cars to array for tracking and selection
  //cars.push(mclarenCar);
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
  //scene.add(helper);

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

  // Listen for unlock event
  controls.addEventListener("unlock", () => {
    // Force pointer reset to ensure clean state after unlocking
    pointer.set(0, 0);

    // Allow a moment before checking for intersections
    setTimeout(() => {
      checkIntersection(RayCastObjects);
    }, 300);
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
        //scene.add(boxHelper);
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
    // Driving is now handled in driving.js, so we only need the non-driving updates here
    updateControlMove(keys);
    updateCameraPoint();
  }

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
  // Helper function to get the model path and display name based on car name
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
    } else if (carName.includes("FerrariMonzaSP1")) {
      return {
        path: "mclaren/ferrari_monza_sp1_2019__www.vecarz.com/scene.gltf",
        displayName: "Ferrari Monza SP1",
      };
    } else if (carName.includes("MclarenDraco")) {
      return {
        path: "mclaren/draco/chassis.gltf",
        displayName: "McLaren",
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
    cancelButton = cancelClone; // Add event listeners
    viewButton.addEventListener("click", () => {
      console.log(`Viewing ${targetObject.name} on podium`);

      // Get car info including path and simplified name for podium.js
      const carInfo = getCarModelPath(targetObject.name);

      // Save the selected car information to localStorage
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
      carOptionPanel.style.display = "none";
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

    movement.normalize().multiplyScalar(speed);
    camera.position.add(movement);

    if (cameraFlyMode === "strict") {
      camera.position.y = carHeight - 50;
    }
  }

  function updateCameraPoint() {
    trackCameraPoint(camPoint);
  }

  function animate() {
    requestAnimationFrame(animate);
    updateCamera();
    updateMapCamera();
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
    //UpdateBoxHelper(RayCastObjects);

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

  function updateMapCamera() {
    // Copy XZ position from main camera
    orthoCamera.position.x = camera.position.x;
    orthoCamera.position.z = camera.position.z;
    orthoCamera.position.y = 1000;

    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    dir.y = 0;
    dir.normalize();

    const target = new THREE.Vector3(
      camera.position.x + dir.x,
      0,
      camera.position.z + dir.z
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
}

init();
