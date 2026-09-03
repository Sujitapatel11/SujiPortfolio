import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';

export default function PlaceholderCube({ position = [0, 0, 0], color = '#00f2fe' }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.5;
      meshRef.current.rotation.y += delta * 0.8;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={hovered ? 1.25 : 1.0}
      onClick={() => setClicked(!clicked)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1.5, 1.5, 1.5]} />
      <meshStandardMaterial
        color={clicked ? '#ff007f' : (hovered ? '#ffffff' : color)}
        metalness={0.6}
        roughness={0.2}
        wireframe={false}
      />
    </mesh>
  );
}
