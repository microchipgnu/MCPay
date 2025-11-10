"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Environment } from "@react-three/drei"
import { ExtrudeGeometry, Shape } from "three"
import type * as THREE from "three"
import { cn } from "@/lib/utils"

function Logo3DScene() {
  const groupRef = useRef<THREE.Group>(null)

  const createLogoShape = () => {
    const pathData =
      "M598.3,258.9c5.8-0.4,11.4-2.7,15.7-6.7l0,0c28.7-28.8,57.5-57.4,86.5-85.8c8.1-7.9,16.3-15.7,24.7-23.6c5.2-4.9,1.7-13.5-5.5-13.5c0,0-0.1,0-0.1,0c-25.6-0.2-51.2-0.4-76.8,0.2c-9.1,0.2-11.7-2.5-11.5-11.6c0.6-35.6,0-71.2,0.4-106.8c0.1-8.4-2.2-11.4-11-11.1c-19.5,0.6-39,0.6-58.5,0c-8.1-0.2-13.5,2.7-19,8.2C506.5,45,469.6,81.6,432.6,118.1v0c-3.1,3.4-8.7,1.2-8.7-3.4v0c-0.1-34.1-0.4-68.2,0.2-102.3c0.2-9.9-3.4-12.5-12.6-12.3c-19.1,0.4-38.2,0.4-57.3,0c-2.8-0.1-5.6,0.3-8.3,1c0,0,0,0,0,0c-6.2,0.5-12,3.4-16.1,8.1C293.1,46,256.2,82.6,219.1,119.1l-0.4,0.4c-3.2,3-8.4,0.6-8.3-3.8v0c-0.1-34.1-0.4-68.2,0.2-102.3c0.2-9.9-3.4-12.5-12.6-12.3c-24.5,0-36.8,0-57.3,0l0,0c-7.5,0.1-14.7,3.1-20.1,8.4l-0.1,0.1C96.5,33.9,72.2,58,47.8,81.9c-12.1,11.9-24.5,23.5-37.3,35.7c-4.9,4.7-1.6,13,5.2,13h0c24.8,0.1,49.7,0.1,74.5,0c15.3,0,15.3,0,15.3,15.7c0,34.1,0.2,68.2-0.2,102.3c-0.1,8.1,1.8,11.7,10.8,11.4c20.1,0,36.9,0,60.8,0c2.8,0,5.7-0.5,8.3-1.7c2.6-1.1,4.9-2.8,6.8-4.9c37.7-37.5,75.4-75,113.3-112.3l0.3-0.2c3.2-2.5,7.9-0.1,7.8,4v0c0.1,34.5,0.4,68.9-0.2,103.4c-0.1,9.2,3,12,11.8,11.8c19.9-0.4,39.7-0.3,59.6,0c2.6,0.1,5.1-0.3,7.6-1.1c0,0,0,0,0,0c5.1-0.4,9.9-2.7,13.3-6.5c37.7-37.5,75.4-75,113.3-112.3l0.3-0.2c3.2-2.3,7.8,0,7.8,4v0c0.1,34.5,0.4,68.9-0.2,103.4c-0.1,9.2,3,12,11.8,11.8c21.7,0,39.4,0,59.6,0L598.3,258.9z"

    const shape = new Shape()
    const commands = pathData.match(/[a-zA-Z][^a-zA-Z]*/g) || []

    let currentX = 0
    let currentY = 0

    commands.forEach((cmd) => {
      const type = cmd[0]
      const coords = cmd
        .slice(1)
        .trim()
        .replace(/([^\s,])-/g, "$1,-") // Fix negative numbers without space
        .split(/[\s,]+/)
        .filter((s) => s.length > 0)
        .map(Number)

      const isRelative = type === type.toLowerCase()

      switch (type.toUpperCase()) {
        case "M":
          currentX = isRelative ? currentX + coords[0] : coords[0]
          currentY = isRelative ? currentY + coords[1] : coords[1]
          shape.moveTo(currentX, currentY)
          break

        case "L":
          for (let i = 0; i < coords.length; i += 2) {
            currentX = isRelative ? currentX + coords[i] : coords[i]
            currentY = isRelative ? currentY + coords[i + 1] : coords[i + 1]
            shape.lineTo(currentX, currentY)
          }
          break

        case "H":
          for (let i = 0; i < coords.length; i++) {
            currentX = isRelative ? currentX + coords[i] : coords[i]
            shape.lineTo(currentX, currentY)
          }
          break

        case "V":
          for (let i = 0; i < coords.length; i++) {
            currentY = isRelative ? currentY + coords[i] : coords[i]
            shape.lineTo(currentX, currentY)
          }
          break

        case "C":
          for (let i = 0; i < coords.length; i += 6) {
            if (isRelative) {
              const cp1x = currentX + coords[i]
              const cp1y = currentY + coords[i + 1]
              const cp2x = currentX + coords[i + 2]
              const cp2y = currentY + coords[i + 3]
              const x = currentX + coords[i + 4]
              const y = currentY + coords[i + 5]
              shape.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y)
              currentX = x
              currentY = y
            } else {
              shape.bezierCurveTo(coords[i], coords[i + 1], coords[i + 2], coords[i + 3], coords[i + 4], coords[i + 5])
              currentX = coords[i + 4]
              currentY = coords[i + 5]
            }
          }
          break

        case "Z":
          shape.closePath()
          break
      }
    })

    return shape
  }

  // Auto-rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3
    }
  })

  const extrudeSettings = {
    depth: 50, // Increased from 20 to 50 for a fatter extrusion
    bevelEnabled: true,
    bevelThickness: 2,
    bevelSize: 1,
    bevelSegments: 5,
  }

  const shape = createLogoShape()
  const geometry = new ExtrudeGeometry(shape, extrudeSettings)
  geometry.center()

  return (
    <group ref={groupRef} rotation={[Math.PI, 0, 0]} scale={0.01}>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#8a8a8a" metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  )
}

export default function Logo3D({ className }: { className?: string }) {
  return (
    <div className={cn("w-full h-full bg-card rounded-lg", className)}>
      <Canvas camera={{ position: [0, 0, 12], fov: 50 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.5} />
        <Logo3DScene />
        <OrbitControls enableZoom={true} enablePan={false} minDistance={5} maxDistance={15} />
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
