import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';

export default function Gallery() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group position={[6, 0.5, 0]}>
      {/* Bright Studio Showcase Lighting */}
      <spotLight position={[0, 6, 3]} intensity={4.0} color="#ffffff" angle={0.5} penumbra={0.3} />
      <pointLight position={[2, 2, 2]} intensity={2.0} color="#60a5fa" />

      <Float speed={2} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[1.1, 0]} />
          <meshStandardMaterial
            color="#3b82f6"
            wireframe
            emissive="#1d4ed8"
            emissiveIntensity={0.5}
          />
        </mesh>
      </Float>

      {/* Spatial 3D Labels */}
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.5}
        color="#60a5fa"
        anchorX="center"
        anchorY="middle"
      >
        GALLERY ZONE
      </Text>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.22}
        color="#93c5fd"
        anchorX="center"
        anchorY="middle"
      >
        Interactive 3D Graphics & Visual Shaders Showcase
      </Text>
    </group>
  );
}
