// src/components/Decor/InfoStand.jsx
import React from 'react';
import { Box, Cylinder, Plane, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const InfoStand = ({
    position = [0, 0, 0],
    textureUrl = '/textures/default_info_stand.png', // Create a default placeholder texture
    baseSize = [50, 5, 50], // width, height, depth
    poleHeight = 100,
    poleRadius = 5,
    boardSize = [60, 40], // width, height
    baseColor = 0x555555,
    poleColor = 0x777777,
    boardColor = 0xeeeeee // Fallback if texture fails
}) => {
    const displayTexture = useTexture(textureUrl);

    const poleY = baseSize[1] / 2 + poleHeight / 2;
    const boardY = baseSize[1] / 2 + poleHeight + boardSize[1] / 2 - 10; // Adjust for tilt
    const boardZOffset = -5; // How much the board is tilted forward/back at its base

    return (
        <group position={position}>
            {/* Base */}
            <mesh castShadow receiveShadow position={[0, baseSize[1] / 2, 0]}>
                <boxGeometry args={baseSize} />
                <meshStandardMaterial color={baseColor} />
            </mesh>

            {/* Pole */}
            <mesh castShadow receiveShadow position={[0, poleY, 0]}>
                <cylinderGeometry args={[poleRadius, poleRadius, poleHeight, 16]} />
                <meshStandardMaterial color={poleColor} metalness={0.6} roughness={0.4} />
            </mesh>

            {/* Display Board */}
            <mesh
                castShadow
                position={[0, boardY, boardZOffset - (boardSize[1]/2 * Math.sin(Math.PI / 6)) ]} // Adjust Z for tilt center
                rotation={[-Math.PI / 6, 0, 0]} // Tilt back
            >
                <planeGeometry args={boardSize} />
                <meshStandardMaterial
                    map={displayTexture}
                    color={!displayTexture ? boardColor : 0xffffff} // Show boardColor if texture fails
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
};

export default InfoStand;