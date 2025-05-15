/**
 * Contains model, interactive elements, PointerLockControls
 */
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { PointerLockControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// model components
import Car from './Models/Car';
import Garage from './Models/Garage';
import Ground from './Models/Ground';

// decor items
import WallPoster from './Decor/WallPoster';
import DisplayPlatform from './Decor/DisplayPlatform';

// store and hooks
import useAppStore from '../store/useAppStore';
import useKeyboardInput from '../hooks/useKeyboardInput';
import usePointerLockControlsManager from '../hooks/usePointerLockControlsManager';

const Experience = () => {
    const { camera, scene } = useThree();
    const { showStartPanel, 
            setSelectedObject,
            isPointerLocked, 
            setShowObjectInfoPanel
    } = useAppStore();

    const controlsRef = useRef();
    const { lockControls } = usePointerLockControlsManager(controlsRef); // hook to manage lock/ unlock events;
    
    const moveForward = useKeyboardInput('KeyW');
    const moveBackward = useKeyboardInput('KeyS');
    const moveLeft = useKeyboardInput('KeyA');
    const moveRight = useKeyboardInput('KeyD');

    const [hovered, setHovered] = useState(null);

    const axesHelper = useMemo(() => new THREE.AxesHelper(1000), []);

    useEffect(() => {
        if (hovered && hovered.object) {
            setSelectedObject(hovered.object);
        }
        else {
            setSelectedObject(null);
        }
    }, [hovered, setSelectedObject]);
    
    // effect to lock controls when start panel is hidden
    useEffect(() => {
        if (!showStartPanel && controlsRef.current && !isPointerLocked) {
            if (lockControls) {
                lockControls();
            }
        }
    }, [showStartPanel, controlsRef, isPointerLocked, lockControls]);


    // frame loop for camera movement
    useFrame((state, delta) => {
        if (isPointerLocked && controlsRef.current) {
            const speed = 500 * delta;
            const direction = new THREE.Vector3()
            const right = new THREE.Vector3()
            camera.getWorldDirection(direction)
            direction.normalize()
            right.crossVectors(camera.up, direction).normalize();

            if (moveForward) controlsRef.current.moveForward(speed)
            if (moveBackward) controlsRef.current.moveForward(-speed)
            if (moveLeft) controlsRef.current.moveRight(-speed) // note: Drei's moveRight is positive for right
            if (moveRight) controlsRef.current.moveRight(speed)
            
        }
    });

    
    const handleObjectClick = (event) => {
        event.stopPropagation(); // Prevent click from bubbling to canvas if needed
        if (event.object) {
            let targetObject = event.object;
            setSelectedObject(targetObject); // Set the actual mesh
            setShowObjectInfoPanel(true);
            if(isPointerLocked && controlsRef.current) {
                // unlock to interact with UI panel
                controlsRef.current.unlock();
            }
            console.log("Clicked:", targetObject.name || targetObject.uuid);
        }
    };

    const handlePointerOver = (event) => {
        event.stopPropagation();
        setHovered(event); // store the whole event, contains event.object
        document.body.style.cursor = 'pointer';
    };

    const handlePointerOut = (event) => {
        event.stopPropagation();
        setHovered(null);
        document.body.style.cursor = 'auto';
    };


    return (
        <>
            <PointerLockControls ref={controlsRef} />
            <primitive object={axesHelper} />

            <Ground
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                // Ground usually isn't clickable for info panel
            />
            <Garage
                position={[0, -50, 0]} // from original code
                scale={[0.4, 0.2, 0.4]} // from original code
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleObjectClick}
                name="ShowroomGarage"
             />

            <Car
                filePath="/Car/Car.fbx"
                position={[0,0,0]}
                rotation={[-Math.PI/2, 0, 0]}
                scale={[1,1,1]}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleObjectClick}
                name="Car1"
            />
            <Car
                filePath="/Car/Car.fbx"
                position={[800 /*carWidth + 500*/, 0, 0]}
                rotation={[-Math.PI/2, 0, 0]}
                scale={[1,1,1]}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
                onClick={handleObjectClick}
                name="Car2"
            />

            {/* Decorative Elements */}
            <WallPoster
                imageUrl="/textures/cracked-cement.jpg" // Add a poster image to public/textures
                position={[-500, 150, -700]} // Adjust based on garage size
                size={[200,150]}
            />
             <DisplayPlatform 
                position={[0, -45, 0]} 
                carToLiftRef={null /* Pass car ref if needed */}
                radius={200}
                height={10} 
            />


            {/* More cars or other objects */}
        </>
    );
};

export default Experience;
