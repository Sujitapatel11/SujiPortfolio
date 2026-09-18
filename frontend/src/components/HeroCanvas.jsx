import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import AvatarCore from './AvatarCore';

function AvatarFallback() {
  return (
    <mesh position={[0, 0.2, 0]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color="#5EEAD4" wireframe />
    </mesh>
  );
}

export default function HeroCanvas() {
  return (
    <div className="hero-canvas-wrapper">
      <Canvas
        camera={{ position: [0, 1.8, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 10, 5]} intensity={2.0} color="#5EEAD4" />
        <pointLight position={[-5, -2, -2]} intensity={1.2} color="#7C6CF0" />

        <Suspense fallback={<AvatarFallback />}>
          <AvatarCore position={[0, 0, 0]} />
        </Suspense>
      </Canvas>
    </div>
  );
}
