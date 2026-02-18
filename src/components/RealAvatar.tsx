'use client';

import { Suspense, useRef, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarState } from '@/hooks/useAvatar';
import { cn } from '@/lib/utils';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';

// ─── Ready Player Me avatar with ARKit morph targets ────────────
// Free, no API key. Photorealistic half-body model with 52 ARKit
// blend shapes + 15 Oculus visemes for lip-sync.

const RPM_AVATAR_URL =
  process.env.NEXT_PUBLIC_RPM_AVATAR_URL ||
  'https://models.readyplayer.me/6460d95f656bbfbf5a8e5ad3.glb?morphTargets=ARKit,Oculus+Visemes&textureAtlas=512&quality=medium';

// ─── Types ──────────────────────────────────────────────────────

interface RealAvatarProps {
  speaking?: boolean;
  lastText?: string;
  state?: AvatarState;
  className?: string;
}

// ─── Emotion Detection ──────────────────────────────────────────

type Emotion = 'happy' | 'warm' | 'concern' | 'neutral';

function detectEmotion(text: string): Emotion {
  const t = text.toLowerCase();
  if (/great|perfect|awesome|love|amazing|excellent|wonderful|fantastic/.test(t)) return 'happy';
  if (/welcome|thanks|thank you|happy|glad|sure|absolutely|of course/.test(t)) return 'warm';
  if (/sorry|refund|issue|problem|unfortunately|apologize|defect|wrong/.test(t)) return 'concern';
  return 'neutral';
}

// ─── Viseme sequence for natural speech ─────────────────────────

const VISEME_KEYS = [
  'viseme_aa', 'viseme_E', 'viseme_I', 'viseme_O', 'viseme_U',
  'viseme_FF', 'viseme_TH', 'viseme_DD', 'viseme_kk', 'viseme_CH',
  'viseme_SS', 'viseme_nn', 'viseme_RR', 'viseme_PP',
] as const;

// ─── Ready Player Me GLB Model ──────────────────────────────────

function RPMModel({ speaking, lastText = '' }: { speaking: boolean; lastText: string }) {
  const { scene } = useGLTF(RPM_AVATAR_URL);
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();
  const clockRef = useRef(new THREE.Clock());

  // Collect all skinned meshes with morph targets
  const morphMeshes = useRef<THREE.SkinnedMesh[]>([]);
  const morphMapRef = useRef<Record<string, { mesh: THREE.SkinnedMesh; index: number }>>({});

  // Blink timing
  const nextBlinkRef = useRef(Date.now() + 2000 + Math.random() * 4000);
  const blinkingRef = useRef(false);
  const blinkStartRef = useRef(0);

  // Viseme animation state
  const currentVisemeRef = useRef(0);
  const lastVisemeTimeRef = useRef(0);

  // Head bone reference
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const neckBoneRef = useRef<THREE.Bone | null>(null);

  useEffect(() => {
    const meshes: THREE.SkinnedMesh[] = [];
    const morphMap: Record<string, { mesh: THREE.SkinnedMesh; index: number }> = {};

    scene.traverse((child) => {
      const mesh = child as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh && mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
        meshes.push(mesh);
        // Map all morph target names to their mesh + index
        for (const [name, idx] of Object.entries(mesh.morphTargetDictionary)) {
          morphMap[name] = { mesh, index: idx };
        }
      }
      // Find head/neck bones for head tracking
      const bone = child as THREE.Bone;
      if (bone.isBone) {
        const n = bone.name.toLowerCase();
        if (n.includes('head') && !n.includes('top')) headBoneRef.current = bone;
        if (n.includes('neck')) neckBoneRef.current = bone;
      }
    });

    morphMeshes.current = meshes;
    morphMapRef.current = morphMap;
  }, [scene]);

  // Set a morph target value by name
  function setMorph(name: string, value: number) {
    const entry = morphMapRef.current[name];
    if (entry && entry.mesh.morphTargetInfluences) {
      entry.mesh.morphTargetInfluences[entry.index] = value;
    }
  }

  // Smoothly lerp a morph target
  function lerpMorph(name: string, target: number, speed: number) {
    const entry = morphMapRef.current[name];
    if (entry && entry.mesh.morphTargetInfluences) {
      const current = entry.mesh.morphTargetInfluences[entry.index];
      entry.mesh.morphTargetInfluences[entry.index] = THREE.MathUtils.lerp(current, target, speed);
    }
  }

  useFrame(() => {
    if (!groupRef.current) return;
    const time = clockRef.current.getElapsedTime();
    const now = Date.now();

    // ── Breathing ──
    groupRef.current.position.y = Math.sin(time * 1.5) * 0.003;

    // ── Head tracking via bones ──
    const headTarget = {
      x: -pointer.y * 0.08 + Math.sin(time * 0.7) * 0.02,
      y: pointer.x * 0.12 + Math.sin(time * 0.5) * 0.03,
      z: pointer.x * 0.03,
    };

    if (speaking) {
      headTarget.x += Math.sin(time * 2.5) * 0.02;
      headTarget.y += Math.sin(time * 1.8) * 0.015;
    }

    if (headBoneRef.current) {
      headBoneRef.current.rotation.x = THREE.MathUtils.lerp(headBoneRef.current.rotation.x, headTarget.x, 0.05);
      headBoneRef.current.rotation.y = THREE.MathUtils.lerp(headBoneRef.current.rotation.y, headTarget.y, 0.05);
      headBoneRef.current.rotation.z = THREE.MathUtils.lerp(headBoneRef.current.rotation.z, headTarget.z, 0.03);
    }

    if (neckBoneRef.current) {
      neckBoneRef.current.rotation.x = THREE.MathUtils.lerp(neckBoneRef.current.rotation.x, headTarget.x * 0.3, 0.04);
      neckBoneRef.current.rotation.y = THREE.MathUtils.lerp(neckBoneRef.current.rotation.y, headTarget.y * 0.3, 0.04);
    }

    // ── Natural blinking (ARKit blend shapes) ──
    if (!blinkingRef.current && now >= nextBlinkRef.current) {
      blinkingRef.current = true;
      blinkStartRef.current = now;
      nextBlinkRef.current = now + 2500 + Math.random() * 4500;
    }

    if (blinkingRef.current) {
      const elapsed = now - blinkStartRef.current;
      const blinkDuration = 150;
      if (elapsed < blinkDuration) {
        const progress = elapsed / blinkDuration;
        const blinkValue = progress < 0.5 ? progress * 2 : 2 - progress * 2;
        setMorph('eyeBlinkLeft', blinkValue);
        setMorph('eyeBlinkRight', blinkValue);
      } else {
        setMorph('eyeBlinkLeft', 0);
        setMorph('eyeBlinkRight', 0);
        blinkingRef.current = false;
      }
    }

    // ── Eye look direction ──
    lerpMorph('eyeLookOutLeft', Math.max(0, pointer.x * 0.4), 0.08);
    lerpMorph('eyeLookInLeft', Math.max(0, -pointer.x * 0.4), 0.08);
    lerpMorph('eyeLookOutRight', Math.max(0, -pointer.x * 0.4), 0.08);
    lerpMorph('eyeLookInRight', Math.max(0, pointer.x * 0.4), 0.08);
    lerpMorph('eyeLookUpLeft', Math.max(0, pointer.y * 0.3), 0.08);
    lerpMorph('eyeLookUpRight', Math.max(0, pointer.y * 0.3), 0.08);
    lerpMorph('eyeLookDownLeft', Math.max(0, -pointer.y * 0.3), 0.08);
    lerpMorph('eyeLookDownRight', Math.max(0, -pointer.y * 0.3), 0.08);

    // ── Emotion expressions ──
    const emotion = detectEmotion(lastText);

    if (emotion === 'happy') {
      lerpMorph('mouthSmileLeft', 0.7, 0.06);
      lerpMorph('mouthSmileRight', 0.7, 0.06);
      lerpMorph('cheekSquintLeft', 0.4, 0.05);
      lerpMorph('cheekSquintRight', 0.4, 0.05);
      lerpMorph('mouthFrownLeft', 0, 0.1);
      lerpMorph('mouthFrownRight', 0, 0.1);
      lerpMorph('browInnerUp', 0, 0.08);
    } else if (emotion === 'warm') {
      lerpMorph('mouthSmileLeft', 0.45, 0.06);
      lerpMorph('mouthSmileRight', 0.45, 0.06);
      lerpMorph('cheekSquintLeft', 0.2, 0.05);
      lerpMorph('cheekSquintRight', 0.2, 0.05);
      lerpMorph('mouthFrownLeft', 0, 0.1);
      lerpMorph('mouthFrownRight', 0, 0.1);
    } else if (emotion === 'concern') {
      lerpMorph('browInnerUp', 0.5, 0.05);
      lerpMorph('mouthFrownLeft', 0.3, 0.06);
      lerpMorph('mouthFrownRight', 0.3, 0.06);
      lerpMorph('mouthSmileLeft', 0, 0.1);
      lerpMorph('mouthSmileRight', 0, 0.1);
    } else {
      // Neutral — gentle resting smile
      lerpMorph('mouthSmileLeft', 0.15, 0.04);
      lerpMorph('mouthSmileRight', 0.15, 0.04);
      lerpMorph('mouthFrownLeft', 0, 0.06);
      lerpMorph('mouthFrownRight', 0, 0.06);
      lerpMorph('browInnerUp', 0, 0.06);
      lerpMorph('cheekSquintLeft', 0, 0.06);
      lerpMorph('cheekSquintRight', 0, 0.06);
    }

    // ── Lip-sync via Oculus visemes ──
    if (speaking) {
      // Cycle through visemes to simulate speech
      const visemeInterval = 120; // ms per viseme
      if (now - lastVisemeTimeRef.current > visemeInterval) {
        currentVisemeRef.current = (currentVisemeRef.current + 1) % VISEME_KEYS.length;
        lastVisemeTimeRef.current = now;
      }

      for (let i = 0; i < VISEME_KEYS.length; i++) {
        const key = VISEME_KEYS[i];
        if (i === currentVisemeRef.current) {
          // Active viseme: use varying intensity for natural feel
          const intensity = 0.4 + Math.sin(time * 6 + i) * 0.25;
          lerpMorph(key, intensity, 0.3);
        } else if (i === (currentVisemeRef.current + 1) % VISEME_KEYS.length) {
          // Next viseme: blend in slightly
          lerpMorph(key, 0.15, 0.2);
        } else {
          lerpMorph(key, 0, 0.2);
        }
      }

      // Add jaw movement for realism
      lerpMorph('jawOpen', 0.1 + Math.abs(Math.sin(time * 7)) * 0.2, 0.15);

      // Slight brow movement when emphasizing
      lerpMorph('browOuterUpLeft', Math.sin(time * 1.5) * 0.1 + 0.05, 0.05);
      lerpMorph('browOuterUpRight', Math.sin(time * 1.5 + 0.5) * 0.1 + 0.05, 0.05);
    } else {
      // Close mouth smoothly when not speaking
      for (const key of VISEME_KEYS) {
        lerpMorph(key, 0, 0.1);
      }
      lerpMorph('jawOpen', 0, 0.08);
      lerpMorph('browOuterUpLeft', 0, 0.05);
      lerpMorph('browOuterUpRight', 0, 0.05);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.6, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// ─── Fallback: SVG silhouette ───────────────────────────────────

function FallbackAvatar({ speaking, className }: { speaking: boolean; className?: string }) {
  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center bg-gradient-to-b from-violet-950/40 to-zinc-900/80',
        className
      )}
    >
      {/* Silhouette circle */}
      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-600/30 border-2 border-violet-500/40 flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-14 h-14 text-violet-300/70" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
        </svg>
      </div>

      {/* Speaking indicator */}
      {speaking && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-0.5 items-end">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-1 bg-violet-400 rounded-full animate-pulse"
              style={{
                height: `${6 + i * 2}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: `${0.4 + i * 0.08}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function RealAvatar({ speaking = false, lastText = '', state, className }: RealAvatarProps) {
  const [loadError, setLoadError] = useState(false);
  const isSpeaking = speaking || state === 'speaking';

  if (loadError) {
    return <FallbackAvatar speaking={isSpeaking} className={className} />;
  }

  const fallbackNode = <FallbackAvatar speaking={isSpeaking} className={className} />;

  return (
    <div className={cn('w-full h-full', className)}>
      <AvatarErrorBoundary fallback={fallbackNode}>
        <Canvas
          camera={{ position: [0, 0.1, 1.8], fov: 22 }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
          onError={() => setLoadError(true)}
        >
          {/* Realistic 3-point studio lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 4, 5]} intensity={1.6} castShadow color="#fff5ee" />
          <directionalLight position={[-2, 3, -1]} intensity={0.5} color="#e8e0ff" />
          <pointLight position={[0, -1, 3]} intensity={0.3} color="#ffffff" />
          <Environment preset="studio" />

          <Suspense fallback={null}>
            <RPMModel speaking={isSpeaking} lastText={lastText} />
          </Suspense>

          <OrbitControls
            enableZoom={false}
            enablePan={false}
            minPolarAngle={Math.PI / 2.2}
            maxPolarAngle={Math.PI / 1.9}
            minAzimuthAngle={-Math.PI / 12}
            maxAzimuthAngle={Math.PI / 12}
            target={[0, 0.1, 0]}
          />
        </Canvas>
      </AvatarErrorBoundary>
    </div>
  );
}

// Preload the model — wrapped in try/catch to prevent module-level crash
try {
  useGLTF.preload(RPM_AVATAR_URL);
} catch {
  // Silently ignore — avatar will fall back to static
}
