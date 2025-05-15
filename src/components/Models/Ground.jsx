// src/components/Models/Ground.jsx
import React from 'react';
import { Plane, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const Ground = (props) => {
    // useTexture can also take an onload callback where you can configure the texture
    const groundTexture = useTexture(
        '/textures/cracked-cement.jpg', (texture) => {
            if (texture) {
                // check if texture is loaded
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(10, 10);
                texture.anisotropy = 16 
                texture.needsUpdate = true; // sometimes necessary after changing properties
            }
        }
    );
    
    return (
        <Plane
            args={[5000, 5000]}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -5.0, 0]}
            receiveShadow // Ground receives shadows
            {...props} // Pass down event handlers
        >
            <meshStandardMaterial map={groundTexture instanceof THREE.Texture ? groundTexture : undefined} />
        </Plane>
    );
};
export default Ground;