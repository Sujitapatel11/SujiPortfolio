import React, { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useJourney } from '../lib/JourneyController';
import { animateCameraToZone } from '../lib/cameraPath';

import Origin from '../scenes/Origin';
import Workshop from '../scenes/Workshop';
import AILab from '../scenes/AILab';
import Gallery from '../scenes/Gallery';
import Office from '../scenes/Office';
import Contact from '../scenes/Contact';

function CameraUpdater() {
  const { activeZone } = useJourney();
  const { camera } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    animateCameraToZone(camera, controlsRef.current, activeZone, 1.8);
  }, [activeZone, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableRotate={false}
      enablePan={false}
      enableZoom={false}
      dampingFactor={0.05}
    />
  );
}

function DynamicMoodLighting() {
  const { currentZoneData } = useJourney();
  const { scene } = useThree();
  const mood = currentZoneData.mood;

  useFrame((state, delta) => {
    if (scene.fog) {
      scene.fog.color.lerp(new THREE.Color(mood.fogColor), delta * 3.0);
    }
  });

  return (
    <>
      <color attach="background" args={[mood.fogColor]} />
      <fog attach="fog" args={[mood.fogColor, 4, 30]} />
      <ambientLight intensity={mood.ambientIntensity} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={mood.lightIntensity}
        color={mood.lightColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <pointLight position={[-10, -5, -10]} intensity={0.8} color={currentZoneData.color} />
    </>
  );
}

export default function SceneCanvas() {
  const { activeIndex, zoneKeys } = useJourney();

  // Frustum & Performance Optimization: Only render active or adjacent zones
  const isZoneVisible = (index) => {
    return Math.abs(index - activeIndex) <= 1;
  };

  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 2, 8], fov: 60 }}
        shadows
        gl={{ antialias: true, alpha: false }}
      >
        <DynamicMoodLighting />

        {/* Spatial Grid Floor */}
        <Grid
          position={[0, -1.5, 0]}
          args={[60, 60]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1e293b"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#334155"
          fadeDistance={35}
          fadeStrength={1.5}
        />

        {/* 6 Guided Journey Zones with Adjacent Render Optimization */}
        {isZoneVisible(0) && <Origin />}
        {isZoneVisible(1) && <Workshop />}
        {isZoneVisible(2) && <AILab />}
        {isZoneVisible(3) && <Gallery />}
        {isZoneVisible(4) && <Office />}
        {isZoneVisible(5) && <Contact />}

        {/* Camera Control & Transition Manager */}
        <CameraUpdater />
      </Canvas>
    </div>
  );
}
