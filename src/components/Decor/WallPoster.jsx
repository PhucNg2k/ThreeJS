// src/components/Decor/WallPoster.jsx
import React from 'react';
import { Plane, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const WallPoster = ({ imageUrl, position, rotation = [0,0,0], size = [100, 100] }) => {
    const texture = useTexture(imageUrl);

    return (
        <Plane args={size} position={position} rotation={rotation}>
            <meshStandardMaterial map={texture} side={THREE.DoubleSide} transparent={imageUrl.endsWith('.png')} />
        </Plane>
    );
};

export default WallPoster;
// Create DisplayPlatform.jsx and InfoStand.jsx similarly using Drei/R3F primitives.