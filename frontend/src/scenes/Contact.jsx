import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';

export default function Contact() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += delta * 0.4;
      meshRef.current.rotation.y += delta * 0.6;
    }
  });

  return (
    <group position={[0, 0.5, -22]}>
      {/* Neon Intake Portal Ambient Light */}
      <pointLight position={[0, 4, 0]} intensity={3.5} color="#ec4899" distance={10} />
      <pointLight position={[0, -2, 2]} intensity={2.0} color="#f43f5e" distance={8} />

      <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.6}>
        <mesh ref={meshRef}>
          <dodecahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color="#ec4899"
            emissive="#9d174d"
            emissiveIntensity={0.6}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      </Float>

      {/* Spatial 3D Labels */}
      <Text
        position={[0, 2.2, 0]}
        fontSize={0.5}
        color="#f472b6"
        font="https://fonts.gstatic.com/s/spacegrotesk/v16/V8mQoBoA4D4g30yX28oe9_z55Y7q0r9.woff"
        anchorX="center"
        anchorY="middle"
      >
        CONTACT ZONE
      </Text>
      <Text
        position={[0, 1.7, 0]}
        fontSize={0.22}
        color="#fbcfe8"
        anchorX="center"
        anchorY="middle"
      >
        Direct Client Intake Terminal & Inquiry Dispatch
      </Text>
    </group>
  );
}
