// src/components/UI/StartPanel.jsx
import React from 'react';
import useAppStore from '../../store/useAppStore';
import styles from './UIStyles.module.css';

const StartPanel = () => {
    const { setShowStartPanel } = useAppStore();
    
    const handleStartClick = () => {
        setShowStartPanel(false);
    };

    return (
        <div className={styles.startPanel}
         id="startPanel_root_element_for_styles">

            <h1>Welcome to the Car Showroom</h1>
            <p>Click Start to explore.</p>
            <button className={styles.startButton} onClick={handleStartClick}>
                Start
            </button>
        </div>
    );
};

export default StartPanel;
