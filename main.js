import * as THREE from "three";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import Stats from "three/addons/libs/stats.module.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
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
const globalScaleValue = 0.5;
let SceneObject = {};


let scene ,camera, orthoCamera, minimapRenderer;

// Car driving variables
let cars = [];
let selectedCar = null;
let isCarSelected = false;
let isDriving = false;
let carSpeed = 0;
let carMaxSpeed = 15;
let carAcceleration = 0.2;
let carDeceleration = 0.1;
let carTurnSpeed = 0.03;
let thirdPersonCameraDistance = 200;
let thirdPersonCameraHeight = 100;
let cameraLerpFactor = 0.1;
let carControls = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  brake: false,
};

async function init() {
  minimapRenderer = new THREE.WebGLRenderer({ alpha: true, canvas: document.getElementById("minimapCanvas") });
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
  camera.layers.enable(0); // Default layer
  camera.layers.enable(1); // Include helpers

  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);

  scene = new THREE.Scene();
  const cubeTexture = new THREE.CubeTextureLoader().setPath("BoxPieces/").load(
    ["px.bmp", "nx.bmp", "py.bmp", "ny.bmp", "pz.bmp", "nz.bmp"],
    (texture) => {
      console.log("Cube Map Loaded Successfully!", texture);
    },
    undefined,
    (error) => console.error("Error Loading Cube Map!", error)
  );
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
  orthoCamera = new THREE.OrthographicCamera(-width, width, height, -height, 1, 2000);
  orthoCamera.position.set(0, 1000, 0);
  orthoCamera.lookAt(0, 0, 0);
  orthoCamera.layers.enable(0);  // Default objects
  orthoCamera.layers.disable(1); // Hide helpers

  scene.add(orthoCamera);


  const controls = new PointerLockControls(camera, renderer.domElement);
  const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
  function resetKeys() {
    for (let key in keys) {
      keys[key] = false;
    }
  }

  
  let cameraFlyMode = 'fly';
  // Updated key controls for both walking and driving
  const onKeyDown = (event) => {
    if (controls.isLocked) {
      if (event.code == "KeyH") {
        cameraFlyMode = (cameraFlyMode === 'fly') ? 'strict' : 'fly';     
      }
      
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

 

  

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Load cars and add them to our cars array for tracking
  const carObj1 = await loadFBXModel("Car/Car.fbx");
  const carObj2 = await loadFBXModel("Car/Car.fbx");

  // Setup car physics properties
  carObj1.name = "Car1";
  carObj1.userData.velocity = new THREE.Vector3();
  carObj1.userData.acceleration = new THREE.Vector3();
  carObj1.userData.direction = new THREE.Vector3(0, 0, 1);

  carObj2.name = "Car2";
  carObj2.userData.velocity = new THREE.Vector3();
  carObj2.userData.acceleration = new THREE.Vector3();
  carObj2.userData.direction = new THREE.Vector3(0, 0, 1);

  let carSize = new THREE.Box3().setFromObject(carObj1);
  let carWidth = carSize.max.x - carSize.min.x;
  let carHeight = carSize.max.y - carSize.min.y;
  let carDepth = carSize.max.z - carSize.min.z;

  carObj1.position.set(0, 0, 0);
  carObj2.position.set(carWidth + 500, 0, 0);

  carObj1.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  carObj2.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = false;
    }
  });

  scene.add(carObj1);
  scene.add(carObj2);

  // Add cars to array for tracking and selection
  cars.push(carObj1);
  cars.push(carObj2);

  const garage = await loadFBXModel("Garage/Garage.fbx");
  garage.name = "Garage";
  garage.position.y = -50;
  garage.scale.set(0.4, 0.2, 0.4);
  garage.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(garage);

  let garageSize = new THREE.Box3().setFromObject(garage);
  let garageWidth = garageSize.max.x - garageSize.min.x;
  let garageHeight = garageSize.max.y - garageSize.min.y;
  let garageDepth = garageSize.max.z - garageSize.min.z;

  const numLights = 1;
  for (let i = 0; i < numLights; i++) {
    const spotLight = new THREE.SpotLight(0xffff00, 10000);
    const spacing = garageWidth / (numLights + 1) + 500;
    const x = garageSize.min.x + spacing * (i + 1);
    const y = garageSize.max.y - 300;
    const z = (garageSize.min.z + garageSize.max.z) / 2 - 1200;
    spotLight.position.set(x, y, z);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.3;
    spotLight.decay = 2;
    spotLight.distance = garageHeight * 2;
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

    let spotLightHelper = new THREE.SpotLightHelper(spotLight);
    const shadowHelper = new THREE.CameraHelper(spotLight.shadow.camera);
  }

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
  let helper = new THREE.DirectionalLightHelper(directionalLight, 5);
  helper.layers.set(1)
  //scene.add(helper);

  const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
  const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
  planeMaterial.receiveShadow = true;
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.position.y = -5.0;
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;

  const uvAttribute = plane.geometry.attributes.uv;
  for (let i = 0; i < uvAttribute.count; i++) {
    uvAttribute.setX(i, uvAttribute.getX(i) * 10);
    uvAttribute.setY(i, uvAttribute.getY(i) * 10);
  }
  uvAttribute.needsUpdate = true;

  let tmpplane = getPlane(5000);
  tmpplane.receiveShadow = true;
  tmpplane.material.needsUpdate = true;
  tmpplane.position.y = -5.0;
  tmpplane.rotation.x = -Math.PI / 2;
  scene.add(plane);

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
    console.log("(LOCK) EVENT")
    startPanel.style.display = "none";
  });

  
  controls.addEventListener("unlock", (event) => {
    console.log("(UNLOCK) EVENT")
    resetKeys();

    if (savedCameraState) {
        camera.position.copy(savedCameraState.position);
        camera.quaternion.copy(savedCameraState.quaternion);
        renderer.render(scene, camera);
        //savedCameraState = null; // Clear after restoring
    }
    
  });

  let isMouseClicked = false;

  window.addEventListener("mouseup", () => {
    console.log("MOUSE UP EVENT")
    isMouseClicked = false;
  });


  window.addEventListener("mousedown", (event) => {
    console.log("MOUSE DOWN EVENT")
    

    const guiPanel = document.getElementById("objectInfoPanel");
    const clickedInsideGUI = guiPanel.contains(event.target);
    if (clickedInsideGUI) return;

    // unlock and click outside GUI -> to resume
    if (!controls.isLocked && !isDriving) {
        
        
        controls.lock();
        clearGuiPanel(guiPanel);
      return;
    }

    checkIntersection(RayCastObjects);
    isMouseClicked = true;

    let lookAtPos = new THREE.Vector3();
    camera.getWorldDirection(lookAtPos);
    console.log("Looking at (MOUSE DOWN): ", lookAtPos);


    if (INTERSECTED) {
      handleInteraction(INTERSECTED, isMouseClicked);
    } else {
      clearGuiPanel(guiPanel);
      removeOutline();
    }
  });

  function clearGuiPanel(guiPanel) {
        if (guiPanel) {
            guiPanel.style.display = "none";
        }
    }

  

  window.addEventListener("resize", windowResize);
  window.addEventListener("pointermove", onPointerMove);

  controls.addEventListener("change", () => {
    checkIntersection(RayCastObjects);
  });

  
  const camPoint = getSphereSimple();
  camPoint.name = "CamPoint";
  scene.add(camPoint);
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

        const boxHelper = new THREE.BoxHelper(colliderBox, 0xffff00);
        colliderBox.userData.helper = boxHelper;
        boxHelper.layers.set(1);
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
      applyOutlineToMesh(retrieveObjectWithUUID(og_object_uuid));
    } else {
      if (INTERSECTED) {
        removeOutline();
        INTERSECTED = null;
      }
    }
  }

  function updateCamera() {
    savedCameraState = {
        position: camera.position.clone(),
        quaternion: camera.quaternion.clone(),
    };
    updateControlMove(keys);
    updateCameraPoint();
    
  }

  function enterCarDriving(car) {
    isDriving = true;
    selectedCar = car.children[0];
    controls.unlock();

    if (!selectedCar.userData.direction) {
      selectedCar.userData.velocity = new THREE.Vector3();
      selectedCar.userData.acceleration = new THREE.Vector3();
      selectedCar.userData.direction = new THREE.Vector3(0, 0, 1);
    }


    // Reset car controls
    carControls.forward = false;
    carControls.backward = false;
    carControls.left = false;
    carControls.right = false;
    carControls.brake = false;
    carSpeed = 0;

    selectedCar.quaternion.set(0, 0, 0, 1); // Reset the car's orientation
    selectedCar.rotation.y = 0; // Preserve only the Y-axis rotation if needed
    selectedCar.up.set(0, 1, 0); // Align the car's "up" vector with the world's Y-axis

    // Create driving GUI
    createDrivingGUI();

    // Setup initial camera position behind the car
    updateCarFollowCamera(true);

    console.log(`Now driving: ${selectedCar.name}`);
  }
  function exitCarDriving() {
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

    selectedCar = null;

    // Remove driving GUI
    removeDrivingGUI();

    console.log("Exited driving mode");

    // Return to normal controls
    setTimeout(() => {
      controls.lock();
    }, 100);
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

    drivingGui.add({ "Exit Car": exitCarDriving }, "Exit Car");

    const carFolder = drivingGui.addFolder("Car Controls");
    carFolder
      .add({ "Max Speed": carMaxSpeed }, "Max Speed", 5, 30)
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
      .add({ Smoothing: cameraLerpFactor }, "Smoothing", 0.01, 1)
      .onChange((value) => {
        cameraLerpFactor = value;
      });

    const instructions = document.createElement("div");
    instructions.innerHTML = `
      <div style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.5); color: white; padding: 10px; border-radius: 5px;">
        <h3>Driving Controls:</h3>
        <p>W/↑ - Accelerate</p>
        <p>S/↓ - Reverse</p>
        <p>A/← - Turn Left</p>
        <p>D/→ - Turn Right</p>
        <p>Space - Brake</p>
        <p>P/Esc - Exit Car</p>
      </div>
    `;
    document.body.appendChild(instructions);
    instructions.id = "drivingInstructions";

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

    // Apply acceleration
    if (carControls.forward) {
      carSpeed += carAcceleration;
    } else if (carControls.backward) {
      carSpeed -= carAcceleration;
    } else {
      // Natural deceleration
      if (carSpeed > 0) {
        carSpeed -= carDeceleration;
      } else if (carSpeed < 0) {
        carSpeed += carDeceleration;
      }

      // Prevent tiny oscillations
      if (Math.abs(carSpeed) < 0.1) {
        carSpeed = 0;
      }
    }

    // Apply braking
    if (carControls.brake) {
      carSpeed *= 0.9;
    }

    // Clamp speed
    carSpeed = Math.max(-carMaxSpeed / 2, Math.min(carMaxSpeed, carSpeed));

    // Apply turning
    if (carSpeed !== 0) {
      if (carControls.left) {
        selectedCar.rotation.y += carTurnSpeed * Math.sign(carSpeed);
      }
      if (carControls.right) {
        selectedCar.rotation.y -= carTurnSpeed * Math.sign(carSpeed);
      }
    }

    // Update direction vector based on car's rotation
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(selectedCar.quaternion);
    selectedCar.userData.direction.copy(direction);

    // Update position based on speed and direction
    selectedCar.position.add(
      selectedCar.userData.direction.clone().multiplyScalar(carSpeed)
    );

    // Ground constraint
    selectedCar.position.y = 0;

    // Allow some tilt but prevent extreme rotation to avoid flipping
    // Only constrain if tilting too much
    const maxTiltAngle = 0.3; // About 17 degrees max tilt
    if (Math.abs(selectedCar.rotation.x) > maxTiltAngle) {
      selectedCar.rotation.x = Math.sign(selectedCar.rotation.x) * maxTiltAngle;
    }
    if (Math.abs(selectedCar.rotation.z) > maxTiltAngle) {
      selectedCar.rotation.z = Math.sign(selectedCar.rotation.z) * maxTiltAngle;
    }
  }
  function updateCarFollowCamera(instant = false) {
    if (!selectedCar || !isDriving) return;

    // Calculate ideal camera position
    const cameraOffset = selectedCar.userData.direction
      .clone()
      .multiplyScalar(-thirdPersonCameraDistance);
    cameraOffset.y = thirdPersonCameraHeight;

    const targetPosition = selectedCar.position.clone().add(cameraOffset);

    if (instant) {
      // Instantly set camera position
      camera.position.copy(targetPosition);
    } else {
      // Smoothly transition camera position
      camera.position.lerp(targetPosition, cameraLerpFactor);
    }

    // Look at the car
    camera.lookAt(
      selectedCar.position
        .clone()
        .add(new THREE.Vector3(0, thirdPersonCameraHeight * 0.3, 0))
    );
  }

  function handleInteraction(mesh, isMouseClicked) {
    if (isMouseClicked) {
  
      controls.unlock();
      
      console.log("🎯 Object clicked:", mesh);


      const collider_uuid = mesh.uuid;
      const original_uuid = RayCastMapping[collider_uuid];
      const targetObject = retrieveObjectWithUUID(original_uuid);

      if (targetObject) {
        console.log("TARGET OBJECT: ", targetObject);
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


  let cameraOrienState = new THREE.Vector3(); // for direction


  function onPointerMove(event) {
    if (isMouseClicked) return; // debounce pointer
    if (controls.isLocked) {
      pointer.set(0, 0);
    } else {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

      camera.getWorldDirection(cameraOrienState); // Save live facing
    }
  }

  function getCameraLookingAt(distance = 150) {
    let dirCam = new THREE.Vector3();
    camera.getWorldDirection(dirCam);
    dirCam.normalize();
    const pointLookingAt = camera.position.clone().add(dirCam.multiplyScalar(distance));
    return pointLookingAt;
  }

  function trackCameraPoint(sphere) {
    const point = getCameraLookingAt(150);
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
    if (cameraFlyMode === 'strict') {
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

    if (cameraFlyMode === 'strict') {
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
    orthoCamera.updateProjectionMatrix() 
    render();
  }

  function render() {
    stats.update();
    UpdateBoxHelper(RayCastObjects);

    // Use the composer for rendering when outlining is needed
    if (outlinePass.selectedObjects.length < 0) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  return scene;
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

function UpdateBoxHelper(raycastObjects) {
  raycastObjects.forEach((obj) => {
    if (obj.userData.helper) {
      obj.userData.helper.update();
    }
  });
}

function loadOBJModel(objPath, base_path) {
  const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
    }
  };

  return new Promise((resolve, reject) => {
    new OBJLoader().setPath(base_path).load(
      objPath,
      (obj) => {
        resolve(obj);
      },
      onProgress,
      reject
    );
  });
}

function loadFBXModel(fbxPath) {
  const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
    }
  };

  return new Promise((resolve, reject) => {
    new FBXLoader().load(
      fbxPath,
      (obj) => {
        resolve(obj);
      },
      onProgress,
      reject
    );
  });
}

function loadOBJ_MTLModel(objPath, mtlPath, base_path) {
  const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
    }
  };

  return new Promise((resolve, reject) => {
    new MTLLoader().setPath(base_path).load(mtlPath, (materials) => {
      materials.preload();
      new OBJLoader()
        .setMaterials(materials)
        .setPath(base_path)
        .load(
          objPath,
          (obj) => {
            resolve(obj);
          },
          onProgress,
          reject
        );
    });
  });
}

function checkCollision(groupA, groupB) {
  let bboxA = new THREE.Box3.setFromObject(groupA);
  let bboxB = new THREE.Box3.setFromObject(groupB);
  return bboxA.intersectBox(bboxB);
}

function getBox(w, h, d) {
  let geometry = new THREE.BoxGeometry(w, h, d);
  let material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

function getPlane(size) {
  let geometry = new THREE.PlaneGeometry(size, size);
  let material = new THREE.MeshStandardMaterial({
    color: 0x5ab3c6,
    side: THREE.DoubleSide,
  });
  let mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

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
    `;

    document.body.appendChild(drivingInstructions);
  }
});

init();

