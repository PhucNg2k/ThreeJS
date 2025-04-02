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



const allObjects = []


const clock = new THREE.Clock();




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

    scene.background = cubeTexture;scene.backgroundBlurriness = 0.5;
    scene.background.needsUpdate = true;
    console.log(scene.background.source)

    //scene.background = new THREE.Color(0x4287f5);

    scene.add(new THREE.AxesHelper(1000))

    // LIGHT
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d8d8d, 3);
    hemiLight.position.set(0, 20, 0);
    
    const ambientLight = new THREE.AmbientLight(0xeb75d9);

    scene.add(hemiLight);
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

    scene.add(plane);

    let planeBox = new THREE.BoxHelper(plane, 0x000000)
    scene.add(planeBox)


    const controls = new PointerLockControls(camera, renderer.domElement)

    const onKeyDown = function (event) {
        switch (event.code) {
          case 'KeyW':
            controls.moveForward(50)
            break
          case 'KeyA':
            controls.moveRight(-50)
            break
          case 'KeyS':
            controls.moveForward(-50)
            break
          case 'KeyD':
            controls.moveRight(50)
            break
        }
      }
    document.addEventListener('keydown', onKeyDown, false)

    const menuPanel = document.getElementById('menuPanel') 
    const startButton = document.getElementById('startButton')
    
    startButton.addEventListener(
      'click',
      function () {
        controls.lock()
      },
      false
    )

    controls.addEventListener('change', () => console.log("Controls Change"))
    controls.addEventListener('lock', () => (menuPanel.style.display = 'none'))
    controls.addEventListener('unlock', () => (menuPanel.style.display = 'block'))




    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.0;

    const textureloader = new THREE.TextureLoader()
    const carObj1 = await loadFBXModel('Car/Car.fbx');
    const carObj2 = await loadFBXModel('Car/Car.fbx');
    const carObj3 = await loadFBXModel('Car/Car.fbx');
    const carObj4 = await loadFBXModel('Car/Car.fbx');
    const carObj5 = await loadFBXModel('Car/Car.fbx');
    const garage = await loadFBXModel('Garage/Garage.fbx')
    

    let carSize = new THREE.Box3().setFromObject(carObj1);
    console.log(carSize);
    let carWidth = carSize.max.x - carSize.min.x;
    let carHeight = carSize.max.y - carSize.min.y;
    let carDepth = carSize.max.z - carSize.min.z;

    carObj1.position.set(0,0,0);
    carObj2.position.set(carWidth + 500,0,0);
    carObj3.position.set( carWidth + 1000,0,0);
    carObj4.position.set(-carWidth - 500,0,0);
    carObj5.position.set(-carWidth - 1000,0,0);

    let carBox = new THREE.BoxHelper(carObj1, 0xffff00)
    scene.add(carBox)

    scene.add(carObj1)
    scene.add(carObj2)
    scene.add(carObj3)
    scene.add(carObj4)
    scene.add(carObj5)

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

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.render(scene, camera)
    })


    scene.traverse((child) => {
        if (child.isGroup)
            allObjects.push(child);
    })

    console.log(allObjects);

    updateFrame();

    function updateFrame() {
        renderer.render(scene, camera);
        stats.update()

        //updateBoundingBox()

        requestAnimationFrame(function () {
            updateFrame();
        })
    }

    function updateBoundingBox() {
        bboxHelper.update();
    }

    return scene;
}

function render(){
    renderer.render(camera, scene);
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