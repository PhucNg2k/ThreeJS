// src/components/Models/Garage.jsx
import React, { useRef, useEffect } from 'react';
import { useFBX } from '@react-three/drei';
import * as THREE from 'three'; // Import THREE

const Garage = ({ position, rotation, scale, onClick, onPointerOver, onPointerOut, name }) => {
    // Assuming your garage model is at public/Garage/Garage.fbx
    const fbx = useFBX('/Garage/Garage.fbx');
    const groupRef = useRef();

    useEffect(() => {
        if (fbx) {
            fbx.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;    // Parts of the garage can cast shadows
                    child.receiveShadow = true; // Garage surfaces can receive shadows
                
                }
            });
        }
    }, [fbx]);

    return (
        <primitive
            ref={groupRef}
            object={fbx}
            position={position || [0, 0, 0]}
            rotation={rotation || [0, 0, 0]}
            scale={scale || [1, 1, 1]} // Adjust default scale if needed
            onClick={onClick}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            name={name || 'Garage'}
        />
    );
};

export default Garage;