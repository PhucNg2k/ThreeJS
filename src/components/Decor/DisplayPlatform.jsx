// src/components/Decor/DisplayPlatform.jsx
import React from 'react';
import { Cylinder } from '@react-three/drei';

const DisplayPlatform = ({
    position = [0, 0, 0],
    radius = 250, // Default radius
    height = 10,  // Default height
    color = 0x333333,
    metalness = 0.4,
    roughness = 0.6,
    carToLiftRef // Optional: ref of a car to lift onto the platform
}) => {

    // If carToLiftRef is provided, you might adjust its y position in an effect
    // useEffect(() => {
    //     if (carToLiftRef && carToLiftRef.current) {
    //         carToLiftRef.current.position.y = position[1] + height / 2;
    //     }
    // }, [carToLiftRef, position, height]);


    return (
        <mesh
            position={position}
            castShadow
            receiveShadow
        >
            <cylinderGeometry args={[radius, radius, height, 32]} />
            <meshStandardMaterial
                color={color}
                metalness={metalness}
                roughness={roughness}
            />
        </mesh>
    );
};

export default DisplayPlatform;