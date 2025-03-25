
import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'dat.gui';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';




async function init() {

    const gui = new GUI();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const stats = new Stats()

    document.getElementById("webgl").appendChild(stats.dom);
    document.getElementById("webgl").appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    //scene.background = new THREE.Color(0x4287f5);
    //scene.background = new THREE.Color("black");

    scene.add(new THREE.AxesHelper(1000))


    const plane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide }));
    plane.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2)
    scene.add(plane)


    scene.background = new THREE.CubeTextureLoader().setPath('https://sbcode.net/img/').load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png'])
    scene.backgroundBlurriness = 0.5;

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1500
    );


    const controls = new OrbitControls(camera, renderer.domElement)
    controls.minDistance = 20;
    controls.maxDistance = 1000;
    controls.enableDamping = true

    const ambientLight = new THREE.AmbientLight(0xeb75d9);

    const pointLight = new THREE.PointLight(0x769e73, 15);
    pointLight.position.set(-200, 300, 0);
    const pointLightHelper = new THREE.PointLightHelper(pointLight, 2);

    const spotLight = new THREE.SpotLight( 0xffffff, 10, pointLight.position.y);
    spotLight.position.copy(pointLight.position);
    spotLight.angle = Math.PI / 6; // Controls the cone spread
    spotLight.penumbra = 0.2; // Soft edges
    
    const spotLightHelper = new THREE.SpotLightHelper(spotLight);
    spotLightHelper.update();
    
    console.log("Spotlight Position:", spotLight.position);
    console.log("Spotlight Target:", spotLight.target.position);

    scene.add(ambientLight);
    scene.add(pointLight);
    scene.add(pointLightHelper);
    scene.add(spotLightHelper);

    {
        const skyColor = 0xB1E1EFF;
        const groundColor = 0xB97A20;
        const light = new THREE.HemisphereLight(skyColor, groundColor, 3);
        scene.add(light)
    }

    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 2.0;

    scene.add(camera)



    const textureloader = new THREE.TextureLoader()

    const textureBase = "Textures"
    const womanObject = await loadOBJModel("Woman/TrialFreya_OBJ.obj", "Woman/TrialFreya_OBJ_modified.mtl", "");

    womanObject.traverse(function (child) {
        if (child.isMesh) {
            let textureName = child.name;
            let texturePath = `${textureBase}/${textureName}.png`;

            // Check if texture exists before applying
            checkTextureExists(texturePath).then(textureExists => {
                if (textureExists) {
                    //console.log(texturePath)
                    let tmp_texture = textureloader.load(texturePath)

                    child.material.map = tmp_texture;
                    //console.log("Applied texture ", tmp_texture);

                } else {
                    console.warn(`Texture not found: ${texturePath}`);
                }
            });

            //console.log(child)
        }
    });





    let bbox = new THREE.Box3().setFromObject(womanObject)
    bbox.applyMatrix4(womanObject.matrixWorld)
    
    let bbox_size = new THREE.Vector3();
    bbox.getSize(bbox_size);

    let geometry = new THREE.BoxGeometry(bbox_size.x, bbox_size.y, bbox_size.z)
    const bboxMesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial( {color: 0x00ff00} ));
    scene.add(bboxMesh)

    const helper = new THREE.Box3Helper(bbox, 0xffff00);
    //scene.add(helper);

    let centerpoint = new THREE.Vector3()
    bbox.getCenter(centerpoint);

    // Recenter each mesh inside the group
    womanObject.children.forEach((child) => {
        if (child.isMesh) {
            //child.geometry.translate(-centerpoint.x, -centerpoint.y, -centerpoint.z);
            child.geometry.computeVertexNormals(); // Can improve rendering quality
            child.material.needsUpdate = true;

        }
    });




    let midbox = new THREE.Box3();
    let midboxHelper = new THREE.Box3Helper(midbox, 0xff0000); // Red wireframe box
    scene.add(midboxHelper);

    window.woman = womanObject;
    womanObject.position.set(0, 0, 0)
    womanObject.scale.setScalar(1);

    scene.add(womanObject)


    const ObjectFolder = gui.addFolder("Woman")
    const rotateFolder = ObjectFolder.addFolder("Rotate")
    rotateFolder.add(womanObject.rotation, "x", 0, Math.PI * 2).step(0.01).listen();
    rotateFolder.add(womanObject.rotation, "y", 0, Math.PI * 2).step(0.01).listen();
    rotateFolder.add(womanObject.rotation, "z", 0, Math.PI * 2).step(0.01).listen();
    rotateFolder.open()

    const translateFolder = ObjectFolder.addFolder("Translate")
    translateFolder.add(womanObject.position, "x", -100, 100).step(0.01).listen();
    translateFolder.add(womanObject.position, "y", -100, 100).step(0.01).listen();
    translateFolder.add(womanObject.position, "z", -100, 100).step(0.01).listen();
    translateFolder.open()

    {
        const color = 0xFFFFFF;
        const light = new THREE.DirectionalLight(color, 3);
        light.position.set(5, 10, 2);
        scene.add(light);
        console.log(light.target)
        //light.target = womanObject
        scene.add(light.target)
    }

    camera.position.x = 10;
    camera.position.y = 200;
    camera.position.z = 500;
    camera.lookAt(scene.position)
    controls.update()

    window.addEventListener("resize", () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight)
    })

    controls.addEventListener('change', () => {
        //updateFrame(); // render whenever the OrbitControls changes
    })


    console.log("Spotlight Position:", spotLight.position);
console.log("Spotlight Target:", spotLight.target.position);

    updateFrame();

    function updateFrame() {
        renderer.render(scene, camera);
        stats.update()
        controls.update()

        bbox.setFromObject(womanObject)
        helper.updateMatrixWorld(true)

        bbox.getCenter(centerpoint);
        bbox.getSize(bbox_size);

        bbox_size = bbox_size.divideScalar(8)

        midbox.set(
            new THREE.Vector3(centerpoint.x - bbox_size.x, centerpoint.y - bbox_size.y, centerpoint.z - bbox_size.z),
            new THREE.Vector3(centerpoint.x + bbox_size.x, centerpoint.y + bbox_size.y, centerpoint.z + bbox_size.z),
        )

        midboxHelper.box.copy(midbox);
        midboxHelper.updateMatrixWorld(true);



        requestAnimationFrame(function () {
            updateFrame();
        })
    }

    return scene;
}

/*
min: c
*/

function loadOBJModel(objPath, mtlPath, base_path) {

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