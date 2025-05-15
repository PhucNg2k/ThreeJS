// src/components/Effects/OutlineEffect.jsx
import React from 'react';
import { EffectComposer, Outline } from '@react-three/postprocessing';
import useAppStore from '../../store/useAppStore';

const OutlineEffect = () => {
    const selectedObject = useAppStore((state) => state.selectedObject);

    // The selectedObject from the store should be the actual mesh or group reference
    // that Outline can use.
    const selection = selectedObject ? [selectedObject] : [];


    return (
        <EffectComposer autoClear={false}>
            <Outline
                selection={selection} // Objects to outline
                visibleEdgeColor="red"
                hiddenEdgeColor="red"
                edgeStrength={5}
                blur={false} // Set true for a softer glow
                width={1024} // Render width
                height={1024} // Render height
            />
        </EffectComposer>
    );
};

export default OutlineEffect;