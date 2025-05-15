// src/components/Models/Car.jsx
import React, { useRef, useEffect, useMemo } from 'react';
import { useFBX } from '@react-three/drei';

const Car = ({ 
    filePath,
    position, 
    rotation, 
    scale, 
    onClick, 
    onPointerOver, 
    onPointerOut, 
    name }) => {
    const originalFbx = useFBX(filePath); // drei's hook for FBX
    const groupRef = useRef();

    const fbx = useMemo(() => {
        if (originalFbx) {
            return originalFbx.clone(); // deep clone
        }
        return null;
    }, [originalFbx]); 
    useEffect(() => {
        if (fbx) { // check if 'fbx' model has been succesfully loaded
            fbx.traverse((child) => {
                // an febx file can contain multiple objects (meshes, lights, cameras) arranged in a parent-child hierachy
                // fbx.traverse() visits every objects (node) within the loaded 'fbx' group
                if (child.isMesh) { // check if the current 'child' is a 3d mesh (a renderable)
                    child.castShadow = true;
                    child.receiveShadow = false;
                    // if (child.material) {
                    //     child.material = child.material.clone();  // clone the material to avoid modifying the original
                    // }
                }
            });
        }
    }, [fbx]);

    if (!fbx) {
        return null; // if fbx is still loading or cloning fail, render nothing or a placeholder
    }
    return (
        <primitive
            ref={groupRef}
            object={fbx}
            position={position || [0, 0, 0]}
            rotation={rotation || [0, 0, 0]}
            scale={scale || [1, 1, 1]} // Adjust default scale as needed for your car model
            onClick={onClick}
            onPointerOver={onPointerOver}
            onPointerOut={onPointerOut}
            name={name || 'Car'} // For identification
        />
    );
};

export default Car;
// Create similar components for Garage.jsx, Ground.jsx