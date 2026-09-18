import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Float } from '@react-three/drei';

export default function Office() {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.2;
    }
  });

  return (
    <group position={[4, 0.5, -14]}>
      {/* Localized Emerald Studio Lighting */}
      <directionalLight position={[3, 5, 3]} intensity={2.5} color="#34d399" />
      <pointLight position={[-2, 1, 2]} intensity={2.0} color="#10b981" distance={10} />

      <Float speed={2.0} rotationIntensity={0.4} floatIntensity={0.5}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <boxGeometry args={[1.6, 1.6, 1.6]} />
          <meshStandardMaterial
            color="#10b981"
            roughness={0.2}
            metalness={0.6}
            emissive="#047857"
            emissiveIntensity={0.5}
          />
        </mesh>
      </Float>

      {/* Spatial 3D Labels */}
      <Text
        position={[0, 2.0, 0]}
        fontSize={0.5}
        color="#34d399"
        anchorX="center"
        anchorY="middle"
      >
        OFFICE / SERVICES ZONE
      </Text>
      <Text
        position={[0, 1.4, 0]}
        fontSize={0.22}
        color="#a7f3d0"
        anchorX="center"
        anchorY="middle"
      >
        Full-Stack Apps, Custom Backends, MVPs & AI Integrations
      </Text>
    </group>
  );
}
