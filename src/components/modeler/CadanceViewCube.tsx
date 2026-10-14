"use client";

import React, { useState, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useGizmoContext } from "@react-three/drei";

interface CadanceViewCubeProps {
  onSelectView: (direction: THREE.Vector3) => void;
}

// 6 Primary Orthographic Faces
const FACES = [
  { name: "FRONT",  dir: new THREE.Vector3(0, 0, 1),   pos: [0, 0, 0.44] as const,  rot: [0, 0, 0] as const },
  { name: "BACK",   dir: new THREE.Vector3(0, 0, -1),  pos: [0, 0, -0.44] as const, rot: [0, Math.PI, 0] as const },
  { name: "RIGHT",  dir: new THREE.Vector3(1, 0, 0),   pos: [0.44, 0, 0] as const,  rot: [0, Math.PI / 2, 0] as const },
  { name: "LEFT",   dir: new THREE.Vector3(-1, 0, 0),  pos: [-0.44, 0, 0] as const, rot: [0, -Math.PI / 2, 0] as const },
  { name: "TOP",    dir: new THREE.Vector3(0, 1, 0),   pos: [0, 0.44, 0] as const,  rot: [-Math.PI / 2, 0, 0] as const },
  { name: "BOTTOM", dir: new THREE.Vector3(0, -1, 0),  pos: [0, -0.44, 0] as const, rot: [Math.PI / 2, 0, 0] as const },
];

// 8 Isometric Corner Vertices
const CORNERS = [
  [1, 1, 1],
  [-1, 1, 1],
  [1, 1, -1],
  [-1, 1, -1],
  [1, -1, 1],
  [-1, -1, 1],
  [1, -1, -1],
  [-1, -1, -1],
].map(([x, y, z]) => ({
  dir: new THREE.Vector3(x, y, z).normalize(),
  pos: [x * 0.42, y * 0.42, z * 0.42] as [number, number, number],
}));

// 12 Edge Bevels for 45° Angle Views
const EDGES: {
  dir: THREE.Vector3;
  pos: [number, number, number];
  size: [number, number, number];
}[] = [];

// 4 along Z axis
for (const x of [-1, 1]) {
  for (const y of [-1, 1]) {
    EDGES.push({
      dir: new THREE.Vector3(x, y, 0).normalize(),
      pos: [x * 0.42, y * 0.42, 0],
      size: [0.18, 0.18, 0.62],
    });
  }
}
// 4 along Y axis
for (const x of [-1, 1]) {
  for (const z of [-1, 1]) {
    EDGES.push({
      dir: new THREE.Vector3(x, 0, z).normalize(),
      pos: [x * 0.42, 0, z * 0.42],
      size: [0.18, 0.62, 0.18],
    });
  }
}
// 4 along X axis
for (const y of [-1, 1]) {
  for (const z of [-1, 1]) {
    EDGES.push({
      dir: new THREE.Vector3(0, y, z).normalize(),
      pos: [0, y * 0.42, z * 0.42],
      size: [0.62, 0.18, 0.18],
    });
  }
}

export default function CadanceViewCube({ onSelectView }: CadanceViewCubeProps) {
  const gl = useThree((state) => state.gl);
  const { tweenCamera } = useGizmoContext();

  const [hoveredFace, setHoveredFace] = useState<number | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<number | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);

  // Restore cursor on unmount
  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  // Generate crisp textures for the 6 faces with Montserrat font
  const faceTextures = useMemo(() => {
    return FACES.map((face) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#161922";
      ctx.fillRect(0, 0, 128, 128);

      // Border frame
      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 120, 120);

      // Face label
      ctx.font = "bold 20px Montserrat, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#f4f4f5";
      ctx.fillText(face.name, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.anisotropy = gl.capabilities.getMaxAnisotropy() || 1;
      return texture;
    });
  }, [gl]);

  const handleTrigger = (dir: THREE.Vector3) => {
    if (tweenCamera) tweenCamera(dir);
    onSelectView(dir);
  };

  return (
    <group scale={[64, 64, 64]}>
      {/* 0. Solid Dark Core to back faces */}
      <mesh>
        <boxGeometry args={[0.78, 0.78, 0.78]} />
        <meshBasicMaterial color="#0e1017" />
      </mesh>

      {/* 1. 6 Orthographic Face Tiles */}
      {FACES.map((face, idx) => {
        const isHovered = hoveredFace === idx;
        return (
          <mesh
            key={`face-${idx}`}
            position={face.pos}
            rotation={face.rot}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredFace(idx);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredFace(null);
              document.body.style.cursor = "auto";
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              handleTrigger(face.dir);
            }}
          >
            <boxGeometry args={[0.66, 0.66, 0.08]} />
            <meshBasicMaterial
              map={faceTextures[idx]}
              color={isHovered ? "#2972f5" : "#ffffff"}
              transparent
              opacity={0.96}
            />
          </mesh>
        );
      })}

      {/* 2. 8 Corner Vertices for ISOMETRIC Views */}
      {CORNERS.map((corner, idx) => {
        const isHovered = hoveredCorner === idx;
        return (
          <mesh
            key={`corner-${idx}`}
            position={corner.pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredCorner(idx);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredCorner(null);
              document.body.style.cursor = "auto";
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              handleTrigger(corner.dir);
            }}
          >
            <boxGeometry args={[0.22, 0.22, 0.22]} />
            <meshBasicMaterial
              color={isHovered ? "#38bdf8" : "#2972f5"}
              transparent
              opacity={isHovered ? 0.95 : 0.55}
            />
          </mesh>
        );
      })}

      {/* 3. 12 Edge Bevels for 45° Angle Views */}
      {EDGES.map((edge, idx) => {
        const isHovered = hoveredEdge === idx;
        return (
          <mesh
            key={`edge-${idx}`}
            position={edge.pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredEdge(idx);
              document.body.style.cursor = "pointer";
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredEdge(null);
              document.body.style.cursor = "auto";
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              handleTrigger(edge.dir);
            }}
          >
            <boxGeometry args={edge.size} />
            <meshBasicMaterial
              color={isHovered ? "#60a5fa" : "#3b82f6"}
              transparent
              opacity={isHovered ? 0.85 : 0.28}
            />
          </mesh>
        );
      })}
    </group>
  );
}
