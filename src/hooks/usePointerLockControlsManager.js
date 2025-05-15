import { useEffect, useCallback } from 'react';
import useAppStore from '../store/useAppStore';

export default function usePointerLockControlsManager(controlsRef) {
    const { setPointerLocked, setShowStartPanel, isPointerLocked } = useAppStore();
    const lockControls = useCallback(() => {
        if (controlsRef && controlsRef.current) {
            controlsRef.current.lock();
        }
        else {
            console.warn("usePointerLockControlsMangager: lockControls called but controlsRef or .current is not ready.");
        }
    }, [controlsRef]);

    useEffect(() => {
        if (controlsRef && controlsRef.current) {
            const controls = controlsRef.current;
            const onLock = () => {
                // update global state to indicate the pointer (mouse) is currently locked (user is in "control mode")
                setPointerLocked(true);// when pointer is locked
                // controls the visibility of your start UI panel
                setShowStartPanel(false); // hide the start screen when entering pointer lock
            };
            const onUnlock = () => {
                setPointerLocked(false); // unlock the pointer lock
                setShowStartPanel(true); // show the startPanel again
            };

            controls.addEventListener('lock', onLock);
            controls.addEventListener('unlock', onUnlock);

            const handleKeyDown = (event) => {
                if (event.code === 'KeyP' && isPointerLocked) {
                    controls.unlock();
                }
            };

            window.addEventListener('keydown', handleKeyDown);
            return () => {
                controls.removeEventListener('lock', onLock);
                controls.removeEventListener('unlock', onUnlock);
                window.removeEventListener('keydown', handleKeyDown);
            };
        }   
    }, [controlsRef, controlsRef.current, setPointerLocked, setShowStartPanel, isPointerLocked]);
    return { lockControls };
}