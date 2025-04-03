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
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';

const allObjects = []


const clock = new THREE.Clock();

const pointer = new THREE.Vector2();
let INTERSECTED = null;
let selectedObjects = [];
let composer, outlinePass;

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
    .load(['px.bmp', 'nx.bmp', 'py.bmp', 'ny.bmp', 'pz.bmp', 'nz.bmp'], function(texture) {
        console.log("Cube Map Loaded Successfully!", texture);
    }, undefined, function(error) {
        console.error("Error Loading Cube Map!", error);
    });

    scene.background = cubeTexture;
    scene.backgroundBlurriness = 0.1;
    scene.background.needsUpdate = true;
    console.log(scene.background.source)

    //scene.background = new THREE.Color(0x4287f5);

    scene.add(new THREE.AxesHelper(1000))

    // LIGHT
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
    hemiLight.position.set(0, 20, 0);
    
    const ambientLight = new THREE.AmbientLight(0xffffff);

    //scene.add(hemiLight);
    scene.add(ambientLight);


    // Load the texture
    let groundTexture = new THREE.TextureLoader().load("cracked-cement.jpg");
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.anisotropy = 16;
    groundTexture.encoding = THREE.sRGBEncoding;

    // Create the plane
    const planeGeometry = new THREE.PlaneGeometry(5000, 5000);
    const planeMaterial = new THREE.MeshStandardMaterial({ map: groundTexture });

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

    //scene.add(plane);

    let planeBox = new THREE.BoxHelper(plane, 0x000000)
    //scene.add(planeBox)


    const controls = new PointerLockControls(camera, renderer.domElement)

    const keys = { KeyW: false, KeyA: false, KeyS: false, KeyD: false };
   
    const onKeyDown = (event) => {
    if (keys.hasOwnProperty(event.code)) {
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




    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.0;

    
    const carObj1 = await loadFBXModel('Car/Car.fbx');
    
    const carObj2 = await loadFBXModel('Car/Car.fbx');
    
    /* 
    const carObj3 = await loadFBXModel('Car/Car.fbx');
    const carObj4 = await loadFBXModel('Car/Car.fbx');
    const carObj5 = await loadFBXModel('Car/Car.fbx');
    */
    
    const garage = await loadFBXModel('Garage/Garage.fbx')
    

    let carSize = new THREE.Box3().setFromObject(carObj1);
    console.log(carSize);
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

    let carBox = new THREE.BoxHelper(carObj1, 0xffff00)
    scene.add(carBox)

    scene.add(carObj1)
    scene.add(carObj2)
    /* 
    
    scene.add(carObj3)
    scene.add(carObj4)
    scene.add(carObj5)
    */

    garage.position.y = -50;
    garage.scale.set(0.4, 0.2, 0.4);


    let garageBox = new THREE.BoxHelper(garage, 0xffff00)
    scene.add(garageBox)
    scene.add(garage)
    
    
    camera.position.x = 300;
    camera.position.y = carHeight - 50;
    camera.position.z = 1000;
    camera.lookAt(scene.position)
    scene.add(camera)



    const raycaster = new THREE.Raycaster();
    
    scene.traverse((child) => {
        if (child.isGroup)
            allObjects.push(child);
    })

    console.log(allObjects);

    // windo event
    window.addEventListener("resize", windowResize)

    window.addEventListener( 'pointermove', onPointerMove );

    controls.addEventListener("change", ()=>{
        updateControlMove();
        updateCameraPoint();
        checkIntersectionWithOutline();
        //castRay();
    } )


    // camera direction vector
    let dirCam = new THREE.Vector3();
    const camPoint = getSphereSimple();
    camera.getWorldDirection(dirCam);
    trackCameraPoint(camPoint);

    // outline selected object
    setupOutlineEffect(renderer, scene, camera)
    

    

    animate();

    function castRay() {
        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObjects(scene.children, true); // 'true' to check all children
    
        let bbColor = 0xff0000;
    
        if (intersects.length > 0) {
            let object = intersects[0].object;
    
            // 🔹 Get the top-level parent (group) if it exists
            while (object.parent && object.parent !== scene) {
                if (object.parent.isGroup){
                    object = object.parent;
                    break;
                }
                object = object.parent;
            }
            console.log(object);
    
            // ❌ Skip helper objects
            if (object.type.includes("Helper")) return;

            if (!object.name.includes("Mercedes")) return;
    
            // If it's the same group as before, do nothing
            if (INTERSECTED === object) return;
    
            // Reset previous object's emissive color
            if (INTERSECTED) {
                if (INTERSECTED.isMesh) { // Single mesh case
                    resetEmissiveColor(INTERSECTED);
                } else { // Group case
                    INTERSECTED.traverse((child) => {
                        if (child.isMesh) {
                            resetEmissiveColor(child);
                        }
                    });
                }
            }
    
            INTERSECTED = object; // Store the new top-level object
    
            // 🔹 Apply emissive change to the new selection
            if (INTERSECTED.isMesh) {
                applyEmissiveColor(INTERSECTED, bbColor);
            } else {
                INTERSECTED.traverse((child) => {
                    if (child.isMesh) {
                        applyEmissiveColor(child, bbColor);
                    }
                });
            }
    
            //console.log("Top-Level Intersected Object:", INTERSECTED);
        } else {
            // Reset the color of the last intersected object
            if (INTERSECTED) {
                if (INTERSECTED.isMesh) {
                    resetEmissiveColor(INTERSECTED);
                } else {
                    INTERSECTED.traverse((child) => {
                        if (child.isMesh) {
                            resetEmissiveColor(child);
                        }
                    });
                }
            }
    
            INTERSECTED = null;
        }
    }
    
    
    function addSelectedObject( object ) {

        selectedObjects = [];
        selectedObjects.push( object );

    }
    
    function checkIntersectionWithOutline() {
        raycaster.setFromCamera(pointer, camera);
 
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            let selectedObject = intersects[0].object;
            
            while (selectedObject.parent && selectedObject.parent !== scene) {
                selectedObject = selectedObject.parent;
            }
            
            if (selectedObject.type.includes("Helper")) return;
            //if (!selectedObject.name.includes("Mercedes")) return;
            
            // identical prev object
            if ( selectedObject === INTERSECTED) return;
            
            // the previous intersected object
            if (INTERSECTED) {
                removeOutline();
            }

        
            INTERSECTED = selectedObject; // Store new selection

            applyOutlineToMesh(selectedObject);
            handleInteraction(INTERSECTED, true);
            console.log("INTERSECTING OBJECT:\n", INTERSECTED);
    
        } else {
            // Remove outline if no object is selected
            if (INTERSECTED) {
                removeOutline();
                handleInteraction(INTERSECTED, false);
                INTERSECTED = null;
            }
        }




        function handleInteraction(mesh, isActive) {
        
        }
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
                const clonedGeometry = child.geometry.clone(); // Clone to avoid modifying the original
                clonedGeometry.applyMatrix4(child.matrixWorld); // Apply transformations
                geometries.push(clonedGeometry);
    
                // Save the material (assuming all meshes have the same material)
                if (!material) material = child.material;
            }
        });
    
        if (geometries.length === 0) return null; // No meshes found, return null
    
        // Merge geometries into one
        const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
        const mergedMesh = new THREE.Mesh(mergedGeometry, material);
    
        return mergedMesh;
    }

    function applyOutlineToMesh(mesh) {
        let meshes = [];

        if (mesh.isGroup) {

            mesh.traverse((child) => {
                if (child.isMesh) {
                    //meshes.push(child);
                }
            });

            const mergedMesh = mergeGroupIntoSingleMesh(mesh);
            if (mergedMesh) {
                meshes.push(mergedMesh);
            }

        } else if (mesh.isMesh) {
            meshes.push(mesh);
        }
        
        if (meshes.length === 0) return;

        outlinePass.selectedObjects = meshes; // Highlights the whole mesh
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
        //sphere.updateMatrixWorld(true);
    }

    function getSphereSimple(size=1, color=0x27d321 ){
        const sphereGeometry = new THREE.SphereGeometry(size, size, size);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: color })
        
        const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
        scene.add(mesh);
        return mesh;
    }

    function updateControlMove(){
        const moveSpeed = 500
        const delta = clock.getDelta();
        const speed = delta * moveSpeed;

        const direction = new THREE.Vector3();
        camera.getWorldDirection(direction);
        const right = new THREE.Vector3();
        right.crossVectors(camera.up, direction).normalize() // set this vector to cross of 2 param

        if (keys.KeyW) camera.position.addScaledVector(direction, speed);  // Move forward
        if (keys.KeyS) camera.position.addScaledVector(direction, -speed); // Move backward
        if (keys.KeyA) camera.position.addScaledVector(right, speed);     // Move left
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
        render();
        requestAnimationFrame(() => animate());
    }

    function windowResize(){

        const width = window.innerWidth;
		const height = window.innerHeight;
        camera.aspect = width/height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height)
        //renderer.render(scene, camera)
        composer.render();
    }
    
    function render(){
        stats.update();
        composer.render();
        //renderer.render(scene, camera);
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

function checkCollisionWorld() {
    for (let i = 0; i < allObjects.length; i++) {
        let obj = allObjects[i];
        let bboxA = new THREE.Box3().setFromObject(allObjects[i]);

        for (let j = i + 1; j < allObjects.length; j++) {
            let bboxB = new THREE.Box3().setFromObject(allMeshes[j]);
            if (bboxA.intersectsBox(bboxB)) {
                console.log(`Collision detected between ${allMeshes[i].name} and ${allMeshes[j].name}`);
            }
        }

    }
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
        color: 0xff0000,
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