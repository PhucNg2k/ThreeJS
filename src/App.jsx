/**
 * This will render the UI panels and the CanvasWrapper
 */
import React from 'react';
import CanvasWrapper from './components/CanvasWrapper';
import ObjectInfoPanel from './components/UI/ObjectInfoPanel';
import StartPanel from './components/UI/StartPanel';
import ControlHints from './components/UI/ControlHints';
import useAppStore from './store/useAppStore';
import './App.css';


function App() {
  const showStartPanel = useAppStore((state) => state.showStartPanel);
  const showObjectInfoPanel = useAppStore((state) => state.showObjectInfoPanel);

  return (
    <>
    <CanvasWrapper />
    {showStartPanel && <StartPanel/>}
    {showObjectInfoPanel && <ObjectInfoPanel />}
    <ControlHints />
    </>
  );
}

export default App;
