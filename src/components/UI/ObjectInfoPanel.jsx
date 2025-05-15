// src/components/UI/ObjectInfoPanel.jsx
import React, { useState, useEffect, useCallback } from 'react';
import useAppStore from '../../store/useAppStore';
import styles from './UIStyles.module.css'; // Create this CSS module

const ObjectInfoPanel = () => {
    const { selectedObject, setSelectedObject, showObjectInfoPanel, setShowObjectInfoPanel } = useAppStore();

    const [name, setName] = useState('');
    const [uuid, setUuid] = useState('');
    const [posX, setPosX] = useState(0);
    const [posY, setPosY] = useState(0);
    const [posZ, setPosZ] = useState(0);
    const [rotX, setRotX] = useState(0);
    const [rotY, setRotY] = useState(0);
    const [rotZ, setRotZ] = useState(0);
    const [scaleX, setScaleX] = useState(1);
    const [scaleY, setScaleY] = useState(1);
    const [scaleZ, setScaleZ] = useState(1);

    const updateLocalStateFromObject = useCallback((object) => {
        if (object) {
            setName(object.name || 'Unnamed Object');
            setUuid(object.uuid);

            setPosX(object.position.x);
            setPosY(object.position.y);
            setPosZ(object.position.z);

            setRotX(object.rotation.x);
            setRotY(object.rotation.y);
            setRotZ(object.rotation.z);

            setScaleX(object.scale.x);
            setScaleY(object.scale.y);
            setScaleZ(object.scale.z);
        }
    }, []);

    useEffect(() => {
        if (selectedObject) {
            updateLocalStateFromObject(selectedObject);
        }
    }, [selectedObject, updateLocalStateFromObject]);

    const handleClose = () => {
        setShowObjectInfoPanel(false);
        // Optionally deselect object when panel closes
        // setSelectedObject(null);
    };

    const handleInputChange = (setter, threeProperty, axis, isRotation = false) => (event) => {
        const value = parseFloat(event.target.value);
        setter(value);
        if (selectedObject && selectedObject[threeProperty]) {
            selectedObject[threeProperty][axis] = value;
            if (isRotation) {
                 // Ensure rotations are handled correctly, e.g. if using quaternions internally by Three.js
                 // For Euler, direct assignment is usually fine.
            }
        }
    };
    
    const handleScaleChange = (setter, axis) => (event) => {
        const value = parseFloat(event.target.value);
         setter(value);
        if (selectedObject && selectedObject.scale) {
            selectedObject.scale[axis] = value;
        }
    };


    if (!showObjectInfoPanel || !selectedObject) {
        return null;
    }

    return (
        <div className={styles.objectInfoPanel}>
            <div className={styles.panelHeader}>
                <h3>Object Properties</h3>
                <button onClick={handleClose} className={styles.closeButton}>×</button>
            </div>
            <div className={styles.panelContent}>
                <p><strong>Name:</strong> {name}</p>
                <p><strong>UUID:</strong> {uuid}</p>

                <fieldset>
                    <legend>Position</legend>
                    <label>X: <input type="number" step="10" value={posX.toFixed(2)} onChange={handleInputChange(setPosX, 'position', 'x')} /></label>
                    <label>Y: <input type="number" step="10" value={posY.toFixed(2)} onChange={handleInputChange(setPosY, 'position', 'y')} /></label>
                    <label>Z: <input type="number" step="10" value={posZ.toFixed(2)} onChange={handleInputChange(setPosZ, 'position', 'z')} /></label>
                </fieldset>

                <fieldset>
                    <legend>Rotation (Radians)</legend>
                    <label>X: <input type="number" step="0.01" value={rotX.toFixed(2)} onChange={handleInputChange(setRotX, 'rotation', 'x', true)} /></label>
                    <label>Y: <input type="number" step="0.01" value={rotY.toFixed(2)} onChange={handleInputChange(setRotY, 'rotation', 'y', true)} /></label>
                    <label>Z: <input type="number" step="0.01" value={rotZ.toFixed(2)} onChange={handleInputChange(setRotZ, 'rotation', 'z', true)} /></label>
                </fieldset>

                <fieldset>
                    <legend>Scale</legend>
                    <label>X: <input type="number" step="0.1" value={scaleX.toFixed(2)} onChange={handleScaleChange(setScaleX, 'x')} /></label>
                    <label>Y: <input type="number" step="0.1" value={scaleY.toFixed(2)} onChange={handleScaleChange(setScaleY, 'y')} /></label>
                    <label>Z: <input type="number" step="0.1" value={scaleZ.toFixed(2)} onChange={handleScaleChange(setScaleZ, 'z')} /></label>
                </fieldset>
            </div>
        </div>
    );
};

export default ObjectInfoPanel;