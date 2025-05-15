/**
 * Responsible for the R3F <Canvas> element, global lighting, and environment masp
 * import Suspense, which is used to delay rendering parts of the component until some async resource (like models or textures) is ready.
 * Canvas is the main 3D scene container from React Three Fiber. It behaves like the <canvas> element in regular WebGL but with React declarative structure.
 * various drei helper components
Stats: Displays a small FPS counter.

Preload: Preloads all async assets before rendering the scene.

CubeCamera: Can be used for reflections (not used in this snippet).

Environment: Loads an environment map for skybox/lighting reflections.
 * Imports the core 3D content of the scene — models, animations, logic, etc. This is where your interactive objects likely live.
 * Imports a custom post-processing effect to render outlines around selected/hovered objects.
*/
import React, { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stats, Preload, CubeCamera, Environment } from '@react-three/drei'
import Experience from './Experience'
import OutlineEffect from './Effects/OutlineEffect'

function CanvasWrapper() {
    return (
        <Canvas 
            shadows // enable shadows
            camera={{
                position: [300, 100, 1000], 
                fov: 75, // like zoom level
                near: 1.0, // The renderable depth range of the camera.
                far: 10000 // The renderable depth range of the camera.
            }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                background: '#4287f5'
            }}>
            {/* Wraps the environment in Suspense in case the textures take time to load. */}
            <Suspense fallback={null}>
                {/* Environment: Loads a cube map using 6 .bmp files to create a skybox and provide ambient lighting/reflections.*/}
                <Environment
                    background // sets the environment as the scene backgrounf 
                    files={[
                        '/BoxPieces/px.bmp',
                        '/BoxPieces/nx.bmp',
                        '/BoxPieces/py.bmp',
                        '/BoxPieces/ny.bmp',
                        '/BoxPieces/pz.bmp',
                        '/BoxPieces/nz.bmp'
                    ]}
                />
                {/*<Skybox /> create component here */}
            </Suspense>

            {/* Global light:
            Simulates sunlight coming from a specific direction.
            */}
            <ambientLight intensity={0.3} />
            <directionalLight
                position={[500, 766, -1200]}
                intensity={0.8}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-near={100}
                shadow-camera-far={2000}
                shadow-camera-left={-1000}
                shadow-camera-right={1000}
                shadow-camera-top={1000}
                shadow-camera-bottom={-1000}
            />
            {/* <directionalLightHelper args={[/* light ref * /, 5]} /> Needs light ref */}


            <Suspense fallback={null}> {/* For async loading of models within Experience */}
                <Experience />
            </Suspense>

            {/* Post-processing Effects */}
            <OutlineEffect />

            <Preload all /> {/* Preload assets */}
            <Stats />
        </Canvas>
    )
}

export default CanvasWrapper