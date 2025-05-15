// src/hooks/useKeyboardInput.js
// this file tell which key is being pressed down right now.
import { useState, useEffect } from 'react';

export default function useKeyboardInput(targetKey) {
    const [pressed, setPressed] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.code === targetKey) setPressed(true);
        };
        const handleKeyUp = (event) => {
            if (event.code === targetKey) setPressed(false);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [targetKey]);
    return pressed;
}