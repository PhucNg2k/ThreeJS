/*
selectedObject: Info about the currently selected/hovered object (e.g., its ref or ID).
isPointerLocked: Boolean.
showStartPanel: Boolean.
showObjectInfoPanel: Boolean.
Camera parameters if they need to be controlled from UI outside canvas (near, far, fov).
*/
import {create} from 'zustand';

const useAppStore = create((set) => ({
    selectedObject: null,
    setSelectedObject: (object) => set({ selectedObject: object}),

    isPointerLocked: false,
    setPointerLocked: (locked) => set((state) => ({isPointerLocked: locked })),

    showStartPanel: true,
    setShowStartPanel: (show) => set({ showStartPanel: show}),
    
    showObjectInfoPanel: false,
    setShowObjectInfoPanel: (show) => set({ showObjectInfoPanel: show}),

}), )

export default useAppStore;