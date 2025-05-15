// src/components/UI/ControlHints.jsx
import React from 'react';
import useAppStore from '../../store/useAppStore'; // To show hints only when pointer is locked or game started
import styles from './UIStyles.module.css'; // We can reuse or create new styles

const ControlHints = () => {
    const isPointerLocked = useAppStore((state) => state.isPointerLocked);
    const showStartPanel = useAppStore((state) => state.showStartPanel);

    // Only show hints if the game has started (start panel is hidden)
    // And potentially only when pointer is locked, or always after start.
    if (showStartPanel) {
        return null; // Don't show hints on the start panel
    }

    return (
        <div className={styles.controlHintsContainer}> {/* You'll need to add this style */}
            <p><strong>Controls:</strong></p>
            <ul>
                <li><strong>W, A, S, D:</strong> Move Camera</li>
                <li><strong>Mouse:</strong> Look Around (when locked)</li>
                <li><strong>Click:</strong> Interact / Select Object</li>
                <li><strong>P:</strong> Unlock Mouse / Pause</li>
            </ul>
            {/* Add more hints as needed */}
        </div>
    );
};

export default ControlHints;