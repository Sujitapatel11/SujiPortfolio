import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';

export default function Workshop() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group position={[-6, 0.5, 0]}>
      {/* Warm Workshop Work-Light Spotlight */}
      <spotLight
        position={[0, 5, 2]}
        intensity={3.0}
        color="#fbbf24"
        angle={0.6}
        penumbra={0.5}
        castShadow
      />

      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color="#f59e0b"
            metalness={0.7}
            roughness={0.2}
            emissive="#78350f"
            emissiveIntensity={0.4}
          />
        </mesh>
      </Float>

      {/* Spatial 3D Labels */}
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.5}
        color="#fbbf24"
        font="https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoBoA4D4g30yX28oe9_z55Y7q0r9.woff"
        anchorX="center"
        anchorY="middle"
      >
        WORKSHOP ZONE
      </Text>
      <Text
        position={[0, 1.5, 0]}
        fontSize={0.22}
        color="#fcd34d"
        anchorX="center"
        anchorY="middle"
      >
        Crafted Engineering — SoulCare & AIEC Platforms
      </Text>
    </group>
  );
}
