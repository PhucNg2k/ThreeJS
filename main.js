import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'dat.gui';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { LoopSubdivision } from 'three-subdivide';
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import * as BufferGeometryUtils from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { RectAreaLightHelper } from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// Initialize the RectAreaLight shader chunk support (required for RectAreaLight to work properly)
RectAreaLightUniformsLib.init();

const clock = new THREE.Clock();

const pointer = new THREE.Vector2();
let INTERSECTED = null;
let composer, outlinePass;

const globalScaleValue = 0.5;

let SceneObject = {}


async function init() {

    const gui = new GUI();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
   
    const stats = new Stats()

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

    const cubeTexture = new THREE.CubeTextureLoader()
    .setPath('BoxPieces/')
    .load(
        ['px.bmp', 'nx.bmp', 'py.bmp', 'ny.bmp', 'pz.bmp', 'nz.bmp'],
        (texture) => {
            console.log("Cube Map Loaded Successfully!", texture);
            /* 
            scene.background = texture;
            scene.backgroundBlurriness = 0.1;
            scene.background.needsUpdate = true;
            */
        },
        undefined,
        (error) => console.error("Error Loading Cube Map!", error)
    );

    
    //console.log(scene.background.source)

    scene.background = new THREE.Color(0x4287f5);

    scene.add(new THREE.AxesHelper(1000))

    // LIGHTING
    // Ambient Light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2); // Soft white light, moderate intensity
    scene.add(ambientLight);

    // Load the texture
    let groundTexture = new THREE.TextureLoader().load(
        "cracked-cement.jpg",
        () => console.log("groundTexture loaded successfully"),
        undefined,
        (err) => console.error("Error loading texture:", err)
    );
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;

    

    /* 
    const lightFolder = gui.addFolder('Lighting');
    lightFolder.add(ambientLight, 'intensity', 0, 1).name('Ambient Intensity');
    lightFolder.add(directionalLight, 'intensity', 0, 2).name('Directional Intensity');
    lightFolder.add(directionalLight.position, 'x', -1000, 1000).name('Dir Light X');
    lightFolder.add(directionalLight.position, 'y', -1000, 1000).name('Dir Light Y');
    lightFolder.add(directionalLight.position, 'z', -1000, 1000).name('Dir Light Z');
    
    lightFolder.open();
    */

    const controls = new PointerLockControls(camera, renderer.domElement)

    const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
   
    const onKeyDown = (event) => {
    if (keys.hasOwnProperty(event.code)) {
            //console.log(event.code)
            keys[event.code] = true;
            
        }
    };

    const onKeyUp = (event) => {
        if (keys.hasOwnProperty(event.code)) {
                keys[event.code] = false;
        }
    };

    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);

    const menuPanel = document.getElementById('menuPanel') 
    const startButton = document.getElementById('startButton')
    
    startButton.addEventListener(
      'click',
      function () {
        controls.lock()
      },
      false
    )

    //controls.addEventListener('change', () => console.log("Controls Change"))
    controls.addEventListener('lock', () => (menuPanel.style.display = 'none'))
    controls.addEventListener('unlock', () => (menuPanel.style.display = 'block'))


    // Enable shadows in the renderer
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const carObj1 = await loadFBXModel('Car/Car.fbx');
    const carObj2 = await loadFBXModel('Car/Car.fbx');
    
    /* 
    const carObj3 = await loadFBXModel('Car/Car.fbx');
    const carObj4 = await loadFBXModel('Car/Car.fbx');
    const carObj5 = await loadFBXModel('Car/Car.fbx');
    */
    
    
    

    let carSize = new THREE.Box3().setFromObject(carObj1);
    
    let carWidth = carSize.max.x - carSize.min.x;
    let carHeight = carSize.max.y - carSize.min.y;
    let carDepth = carSize.max.z - carSize.min.z;

    carObj1.position.set(0,0,0);
    carObj2.position.set(carWidth + 500,0,0);
    
    /*
    carObj3.position.set( carWidth + 1000,0,0);
    carObj4.position.set(-carWidth - 500,0,0);
    carObj5.position.set(-carWidth - 1000,0,0);
    */



    // After loading carObj1 and carObj2
    carObj1.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    carObj2.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    


    scene.add(carObj1)
    scene.add(carObj2)
    /* 
    
    scene.add(carObj3)
    scene.add(carObj4)
    scene.add(carObj5)
    */

    const garage = await loadFBXModel('Garage/Garage.fbx')
    garage.name = "Garage"
    garage.position.y = -50;
    garage.scale.set(0.4, 0.2, 0.4);
    
    // After loading garage
    garage.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    //scene.add(garage)
    
    let garageSize = new THREE.Box3().setFromObject(garage);
    let garageWidth = garageSize.max.x - garageSize.min.x;
    let garageHeight = garageSize.max.y - garageSize.min.y;
    let garageDepth = garageSize.max.z - garageSize.min.z;

    // 2. Spotlights (simulate ceiling spotlights)
    const numLights = 3;
    for (let i = 0; i < numLights; i++) {
        const spotLight = new THREE.SpotLight(0xffffff, 1.2);
        const spacing = garageWidth / (numLights + 1);
        const x = garageSize.min.x + spacing * (i + 1);
        const y = garageSize.max.y - 100; // slightly above garage
        const z = (garageSize.min.z + garageSize.max.z) / 2;

        spotLight.position.set(x, y, z);
        spotLight.angle = Math.PI / 6;
        spotLight.penumbra = 0.3;
        spotLight.decay = 2;
        spotLight.distance = garageHeight * 1.5;

        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 1024;
        spotLight.shadow.mapSize.height = 1024;
        spotLight.shadow.camera.near = 10;
        spotLight.shadow.camera.far = 5000;
        spotLight.shadow.camera.updateProjectionMatrix();

        let spotLightHelper = new THREE.SpotLightHelper( spotLight );
        scene.add( spotLightHelper );
        scene.add(spotLight);
        scene.add(spotLight.target)

        const shadowHelper = new THREE.CameraHelper(spotLight.shadow.camera);
        scene.add(shadowHelper);
    }

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(500, 1000, 500);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 100;
    directionalLight.shadow.camera.far = 2000;
    directionalLight.shadow.camera.left = -1000;
    directionalLight.shadow.camera.right = 1000;
    directionalLight.shadow.camera.top = 1000;
    directionalLight.shadow.camera.bottom = -1000;

    //scene.add(directionalLight);


    // Create the plane
    const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
    const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });
    planeMaterial.receiveShadow = true;
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.position.y = -5.0;
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;

    // Modify UVs to scale the texture instead of repeating it
    const uvAttribute = plane.geometry.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
        uvAttribute.setX(i, uvAttribute.getX(i) * 10); // Scale X
        uvAttribute.setY(i, uvAttribute.getY(i) * 10); // Scale Y
    }
    uvAttribute.needsUpdate = true;

    let tmpplane =getPlane(5000)
    tmpplane.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    tmpplane.receiveShadow = true;
    tmpplane.material.needsUpdate = true;
    tmpplane.position.y = -5.0;
    tmpplane.rotation.x = -Math.PI / 2;
    
    scene.add(tmpplane);


// Optional: RectAreaLight helper (for visualization)
  
      
    
    camera.position.x = 300;
    camera.position.y = carHeight - 50;
    camera.position.z = 1000;
    camera.lookAt(scene.position)
    scene.add(camera)

    for (let child of scene.children) {
        let child_uuid = child.uuid;
        SceneObject[child_uuid] = child;

    }

    // make dictionary store uuid - raycast_uuid



    const raycaster = new THREE.Raycaster();
    
    let { raycastObjects: RayCastObjects, rayCastMapping: RayCastMapping } = createRayCastObjects();



    //scaleGlobalAll(globalScaleValue)


    //////////////////////////////
    console.log("Scene objects Scene:", scene.children);
    console.log("Scene objects SceneObject:", SceneObject);
    console.log("RaycastObjects:", RayCastObjects);
    console.log("RayCastMapping: ", RayCastMapping)

    

    // windo event

    let isMouseClicked = false;

    window.addEventListener('mousedown', () => {
        isMouseClicked = true;
        //console.log('MOUSE DOWN! ', isMouseClicked)
        if (INTERSECTED) handleInteraction(INTERSECTED, isMouseClicked);
    });

    window.addEventListener('mouseup', () => {
        isMouseClicked = false;
        //console.log('MOUSE UP!' , isMouseClicked)
    });


    window.addEventListener("resize", windowResize)

    window.addEventListener( 'pointermove', onPointerMove );
    
    controls.addEventListener("change", ()=>{
        checkIntersectionWithOutline(RayCastObjects);
        
    
    } )


    

    // camera direction vector
    let dirCam = new THREE.Vector3();
    const camPoint = getSphereSimple();
    camPoint.name = "CamPoint"
    scene.add(camPoint)
    camera.getWorldDirection(dirCam);
    trackCameraPoint(camPoint);

    // outline selected object
    setupOutlineEffect(renderer, scene, camera)
    

    

    animate();

    function createRayCastObjects() {
        let raycastObjects = []
        let rayCastMapping = {}

        for (let child of scene.children) {
           
            if (child.isGroup) {

                if (checkMultiMeshesGroup(child)) {
                    const mergedMesh = mergeGroupIntoSingleMesh(child);
                    
                    mergedMesh.name = child.name + "_merged_collider";
                    mergedMesh.applyMatrix4( child.matrixWorld.clone().invert() )
                    child.add(mergedMesh)
                    raycastObjects.push(mergedMesh);
                    rayCastMapping[mergedMesh.uuid] = child.uuid;
                    console.log("MergedMesh: ", mergedMesh);

                    continue;
                }

                let colliderBox = getSimplifyCollider(child);
                colliderBox.name = child.name + "_collider"
                colliderBox.applyMatrix4(child.matrixWorld.clone().invert()); // apply local space to collider box before add parent

                raycastObjects.push(colliderBox)
                rayCastMapping[colliderBox.uuid] = child.uuid;
                
                child.add(colliderBox)
                
                const box = new THREE.BoxHelper( colliderBox, 0xffff00 );
                //scene.add( box );
            }
        }
        return {raycastObjects, rayCastMapping}
    }
    
    function checkMultiMeshesGroup(obj) {
        if (obj.isGroup){
            if (obj.children.length > 1) {
                return true
            }
        }
        return false
    }

    function scaleGlobalAll(scaleValue) {
        scene.traverse((child) => {
            child.scale.multiplyScalar(scaleValue);
        });
    }
    
    function scaleGlobalDirectChild(scaleValue) {
        for (let child of scene.children) {
            child.scale.multiplyScalar(scaleValue);
        }
    }

    function checkIntersectionWithOutline(objList) { // raycast only works with group Object
        raycaster.setFromCamera(pointer, camera);
 
        
        const intersectsList = raycaster.intersectObjects(objList, true);
        //console.log("Raycaster checking objects:", scene.children);
        
        if (intersectsList.length > 0) {
            let selectedObject = intersectsList[0].object;


            //while (selectedObject.parent && selectedObject.parent !== scene) {
              //  selectedObject = selectedObject.parent;
            //}
            
            if (selectedObject.type.includes("Helper")) return;
            //if (!selectedObject.name.includes("Mercedes")) return;
            
            // identical prev object
            if ( selectedObject === INTERSECTED) return;
            
            // the previous intersected object
            if (INTERSECTED) {
                removeOutline();
            }

        
            INTERSECTED = selectedObject; // Store new selection
            
            let collider_uuid = INTERSECTED.uuid
            let og_object_uuid = RayCastMapping[collider_uuid] 
        

            applyOutlineToMesh(retrieveObjectWithUUID(og_object_uuid));
            
            //console.log("INTERSECTING OBJECT:\n", INTERSECTED);
    
        } else {
            // Remove outline if no object is selected
            if (INTERSECTED) {
                removeOutline();
                INTERSECTED = null;
            }
        }

       
    }

    function updateCamera() {
        updateControlMove();
        updateCameraPoint(); 
    }


    function handleInteraction(mesh) {
        if (isMouseClicked) {
            console.log("🎯 Object clicked:", mesh);
            isMouseClicked = false
        }
        return;
    }
    
    function getSimplifyCollider(mesh) {
        const box = new THREE.Box3().setFromObject(mesh);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);

        const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const collider = new THREE.Mesh(boxGeo, new THREE.MeshBasicMaterial({ visible: false }));
        collider.position.copy(center);
        return collider
    }

    function retrieveObjectWithUUID(uuid) {
        let object = scene.getObjectByProperty('uuid', uuid)
        return object
    }

    function setupOutlineEffect(renderer, scene, camera) {
        const renderPass = new RenderPass(scene, camera);
        outlinePass = new OutlinePass(
            new THREE.Vector2(window.innerWidth, window.innerHeight), 
            scene, 
            camera);
    
        composer = new EffectComposer(renderer);
        composer.addPass(renderPass);
        composer.addPass(outlinePass);
    }

    function mergeGroupIntoSingleMesh(group) {
        let geometries = [];
        let material = null;
    
        group.traverse((child) => {
            if (child.isMesh) {
                const clonedGeometry = child.geometry.clone(); // Clone to avoid modifying the original -> should be BufferGeometry instance
                
                clonedGeometry.applyMatrix4(child.matrixWorld); // Apply transformations
                geometries.push(clonedGeometry);
    
                // Save the material (assuming all meshes have the same material)
                if (!material) material = child.material;
            }
        });
    
        if (geometries.length === 0) return null; // No meshes found, return null
    
        // Merge geometries into one
        const mergedGeometry = BufferGeometryUtils.mergeGeometries(geometries);

        const mergedMesh = new THREE.Mesh(mergedGeometry, material);
       
        return mergedMesh;
    }

    function applyOutlineToMesh(mesh) {


        outlinePass.selectedObjects = [mesh]; // Highlights the whole mesh
        outlinePass.edgeStrength = 8; // Adjust thickness
        outlinePass.edgeGlow = 0.5; 
        outlinePass.edgeThickness = 2.0;
        outlinePass.visibleEdgeColor.set(0xff0000); // Red outline

    }
    
    function removeOutline() {
        outlinePass.selectedObjects = [];
    }

    

    function onPointerMove( event ) {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components 
        pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    

        
    }
    
    function getCameraLookingAt(distance = 150){
        camera.getWorldDirection(dirCam);
        dirCam.normalize();
        const pointLookingAt = camera.position.clone().add(dirCam.multiplyScalar(distance));
        return pointLookingAt
    }

    function trackCameraPoint(sphere){
        const point = getCameraLookingAt()
        sphere.position.copy(point);
    }

    function getSphereSimple(size=1, color=0x27d321 ){
        const sphereGeometry = new THREE.SphereGeometry(size, size, size);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: color })
        
        const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        return mesh;
    }

    

    function updateControlMove() {
        const moveSpeed = 500;
        const delta = Math.min(clock.getDelta(), 0.1);;
        const speed = delta * moveSpeed;

        const direction = new THREE.Vector3();
        const right = new THREE.Vector3();

        camera.getWorldDirection(direction);
        direction.normalize(); // just in case

        right.crossVectors(camera.up, direction).normalize();

        if (keys.KeyW) camera.position.addScaledVector(direction, speed);
        if (keys.KeyS) camera.position.addScaledVector(direction, -speed);
        if (keys.KeyA) camera.position.addScaledVector(right, speed);
        if (keys.KeyD) camera.position.addScaledVector(right, -speed);
    }

   

    function updateCameraPoint(){
        trackCameraPoint(camPoint);
    }

    function updateCameraHelper(){
        let size = 150;
        camera.getWorldDirection(dirCam);
    
        dirCam.normalize();
    
        dirCameraHelper.position.copy(camera.position);
        dirCameraHelper.setDirection(dirCam); // must be unit vector

        dirCameraHelper.updateMatrixWorld(true);
    }

    function animate() {
        requestAnimationFrame(animate);
        updateCamera();
        render();
    }

    function windowResize(){

        const width = window.innerWidth;
		const height = window.innerHeight;
        camera.aspect = width/height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height)
        //renderer.render(scene, camera)
        render()
    }
    
    function render(){
        stats.update();
        //composer.render();
        renderer.render(scene, camera);
    }

    return scene;
}


function loadOBJModel(objPath, base_path){
    const onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            //console.log( percentComplete.toFixed( 2 ) + '% downloaded' );
        }
    }

    return new Promise((resolve, reject) => {
    
        new OBJLoader()
            .setPath(base_path)
            .load(objPath, (obj) => {
                resolve(obj)
            }, onProgress, reject)
            }
    )
}

function loadFBXModel(fbxPath) {
    const onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            //console.log(percentComplete.toFixed(2) + '% downloaded');
        }
    };

    return new Promise((resolve, reject) => {
        new FBXLoader()
            .load(fbxPath, (obj) => {
                resolve(obj);
            }, onProgress, reject);
    });
}


function loadOBJ_MTLModel(objPath, mtlPath, base_path) {

    const onProgress = function (xhr) {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100;
            //console.log( percentComplete.toFixed( 2 ) + '% downloaded' );
        }
    }

    return new Promise((resolve, reject) => {
        new MTLLoader()
            .setPath(base_path)
            .load(mtlPath, (materials) => {
                materials.preload();

                new OBJLoader()
                    .setMaterials(materials)
                    .setPath(base_path)
                    .load(objPath, (obj) => {


                        resolve(obj)
                    }, onProgress, reject)
            })
    })


}



function checkCollision(groupA, groupB) {
    let bboxA = new THREE.Box3.setFromObject(groupA);
    let bboxB = new THREE.Box3.setFromObject(groupB);

    return bboxA.intersectBox(bboxB);
}



function checkTextureExists(url) {
    return fetch(url, { method: "HEAD" })
        .then(response => response.ok) // Returns true if texture exists
        .catch(() => false); // Returns false if fetch fails
}


function getBox(w, h, d) {
    let geometry = new THREE.BoxGeometry(w, h, d);
    let material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
    });


    let mesh = new THREE.Mesh(
        geometry,
        material
    );

    return mesh;
}


function getPlane(size) {
    let geometry = new THREE.PlaneGeometry(size, size);
    let material = new THREE.MeshBasicMaterial({
        color: 0Xcfd6ce,
        side: THREE.DoubleSide
    });


    let mesh = new THREE.Mesh(
        geometry,
        material
    );

    return mesh;
}




let scene = init();

window.scene = scene