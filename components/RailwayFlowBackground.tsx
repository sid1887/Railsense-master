'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

type Signal = {
  mesh: THREE.Line;
  laneIndex: number;
  speed: number;
  progress: number;
  history: THREE.Vector3[];
  assignedColor: THREE.Color;
};

type RailwayFlowBackgroundProps = {
  className?: string;
  opacity?: number;
  tone?: 'home' | 'intelligence' | 'hub';
  focusSeed?: string | null;
};

const BASE_PARAMS = {
  colorBg: '#080a10',
  colorLine: '#344150',
  colorSignal: '#8fc9ff',
  colorSignal2: '#ff4d88',
  colorSignal3: '#ffcc00',
  useColor2: true,
  useColor3: true,
  lineCount: 64,
  spreadHeight: 32,
  spreadDepth: 20,
  curveLength: 58,
  straightLength: 106,
  curvePower: 0.84,
  waveSpeed: 2.25,
  waveHeight: 0.22,
  lineOpacity: 0.64,
  signalCount: 84,
  speedGlobal: 0.36,
  trailLength: 10,
  bloomStrength: 2.6,
  bloomRadius: 0.55,
  motionDrift: 0.33,
  colorDriftSpeed: 0.055,
};

const SEGMENT_COUNT = 150;
const byTone = {
  home: {
    lineCount: 64,
    signalCount: 84,
    lineOpacity: 0.64,
    bloomStrength: 2.6,
    motionDrift: 0.33,
  },
  intelligence: {
    lineCount: 56,
    signalCount: 68,
    lineOpacity: 0.5,
    bloomStrength: 2.1,
    motionDrift: 0.28,
  },
  hub: {
    lineCount: 52,
    signalCount: 64,
    lineOpacity: 0.46,
    bloomStrength: 2.0,
    motionDrift: 0.24,
  },
};

function sampleGradient(stops: THREE.Color[], t: number, out: THREE.Color) {
  const n = stops.length;
  if (n === 0) return out.set('#ffffff');
  if (n === 1) return out.copy(stops[0]);

  const wrapped = ((t % 1) + 1) % 1;
  const scaled = wrapped * (n - 1);
  const index = Math.floor(scaled);
  const localT = scaled - index;
  const c1 = stops[index];
  const c2 = stops[Math.min(n - 1, index + 1)];

  return out.copy(c1).lerp(c2, localT);
}

function hashToLane(seed: string, total: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % Math.max(1, total);
}

export function RailwayFlowBackground({
  className = '',
  opacity = 0.45,
  tone = 'home',
  focusSeed = null,
}: RailwayFlowBackgroundProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const params = { ...BASE_PARAMS, ...byTone[tone] };
  const positionX = (params.curveLength - params.straightLength) / 2;
  const focusLane = focusSeed ? hashToLane(focusSeed, params.lineCount) : null;
  const focusColor = new THREE.Color('#7fd9ff');

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(params.colorBg, 0.0032);

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, 90);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const contentGroup = new THREE.Group();
  contentGroup.position.set(positionX, 0, 0);
    scene.add(contentGroup);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    const bgMaterial = new THREE.LineBasicMaterial({
      color: params.colorLine,
      transparent: true,
      opacity: params.lineOpacity,
      depthWrite: false,
      linewidth: 1,
    });

    const signalMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
      transparent: true,
      linewidth: 2,
    });

    const signalColorObj1 = new THREE.Color(params.colorSignal);
    const signalColorObj2 = new THREE.Color(params.colorSignal2);
    const signalColorObj3 = new THREE.Color(params.colorSignal3);
    const lineGradientStops = [new THREE.Color('#2f3f54'), new THREE.Color('#5bb8ff'), new THREE.Color('#9a8bff')];
    const signalGradientStops = [new THREE.Color('#8fc9ff'), new THREE.Color('#7cf3db'), new THREE.Color('#b290ff')];
    const fogGradientStops = [new THREE.Color(params.colorBg), new THREE.Color('#0e1732'), new THREE.Color('#16143a')];
    const fogBaseColor = new THREE.Color(params.colorBg);
    const tempLineColor = new THREE.Color();
    const tempSignalColor = new THREE.Color();
    const tempFogColor = new THREE.Color();

    const backgroundLines: THREE.Line[] = [];
    const signals: Signal[] = [];

    const totalLen = params.curveLength + params.straightLength;

    const pickSignalColor = () => {
      const choices = [signalColorObj1];
      if (params.useColor2) choices.push(signalColorObj2);
      if (params.useColor3) choices.push(signalColorObj3);
      return choices[Math.floor(Math.random() * choices.length)];
    };

    const getPathPoint = (t: number, lineIndex: number, time: number, drift: number) => {
      const flowX = -params.curveLength + t * totalLen;
      const currentX = flowX + drift;

      let y = 0;
      let z = 0;
      const spreadFactor = (lineIndex / Math.max(1, params.lineCount - 1) - 0.5) * 2;
      const mirroredPhase = Math.abs(spreadFactor) * 4.2;

      if (currentX < 0) {
        const ratio = (currentX + params.curveLength) / params.curveLength;
        let shapeFactor = (Math.cos(ratio * Math.PI) + 1) / 2;
        shapeFactor = Math.pow(shapeFactor, params.curvePower);

        y = spreadFactor * params.spreadHeight * shapeFactor;
        z = spreadFactor * params.spreadDepth * shapeFactor;

        // Mirror wave phase on both sides so the flow remains balanced.
        const wave = Math.sin(time * params.waveSpeed + currentX * 0.12 + mirroredPhase) * params.waveHeight * shapeFactor;
        y += wave;
      }

      return new THREE.Vector3(currentX, y, z);
    };

    const createSignal = () => {
      const maxTrail = Math.max(24, params.trailLength + 20);
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(maxTrail * 3);
      const colors = new Float32Array(maxTrail * 3);

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mesh = new THREE.Line(geometry, signalMaterial);
      mesh.frustumCulled = false;
      mesh.renderOrder = 1;
      contentGroup.add(mesh);

      signals.push({
        mesh,
        laneIndex: Math.floor(Math.random() * params.lineCount),
        speed: 0.2 + Math.random() * 0.5,
        progress: Math.random(),
        history: [],
        assignedColor: pickSignalColor(),
      });
    };

    const rebuildSignals = () => {
      for (const s of signals) {
        contentGroup.remove(s.mesh);
        s.mesh.geometry.dispose();
      }
      signals.length = 0;
      for (let i = 0; i < params.signalCount; i += 1) createSignal();
    };

    const rebuildLines = () => {
      for (const l of backgroundLines) {
        contentGroup.remove(l);
        l.geometry.dispose();
      }
      backgroundLines.length = 0;

      for (let i = 0; i < params.lineCount; i += 1) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(SEGMENT_COUNT * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const line = new THREE.Line(geometry, bgMaterial);
        line.userData = { id: i };
        if (focusLane !== null) {
          const isFocus = i === focusLane;
          line.material = bgMaterial.clone();
          const lineMat = line.material as THREE.LineBasicMaterial;
          lineMat.color = isFocus ? focusColor.clone() : bgMaterial.color.clone();
          lineMat.opacity = isFocus ? Math.min(1, params.lineOpacity + 0.2) : Math.max(0.15, params.lineOpacity * 0.45);
        }
        line.renderOrder = 0;
        contentGroup.add(line);
        backgroundLines.push(line);
      }

      rebuildSignals();
    };

    rebuildLines();

    const clock = new THREE.Clock();
    let raf = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const drift = reduceMotion ? 0 : Math.sin(time * params.motionDrift * 0.55) * params.curveLength * 0.12;

      // Slow gradient drift across the whole flow field.
      const gradientPhase = (time * params.colorDriftSpeed) % 1;
      sampleGradient(fogGradientStops, gradientPhase * 0.8 + 0.1, tempFogColor);
      tempFogColor.lerp(fogBaseColor, 0.55);
      if (scene.fog) {
        scene.fog.color.copy(tempFogColor);
      }

      for (const line of backgroundLines) {
        const positions = line.geometry.attributes.position.array as Float32Array;
        const lineId = line.userData.id as number;
        for (let j = 0; j < SEGMENT_COUNT; j += 1) {
          const t = j / (SEGMENT_COUNT - 1);
          const vec = getPathPoint(t, lineId, time, drift);
          positions[j * 3] = vec.x;
          positions[j * 3 + 1] = vec.y;
          positions[j * 3 + 2] = vec.z;
        }
        line.geometry.attributes.position.needsUpdate = true;

        const lineMat = line.material as THREE.LineBasicMaterial;
        sampleGradient(lineGradientStops, gradientPhase + lineId / Math.max(1, params.lineCount) * 0.08, tempLineColor);
        lineMat.color.copy(tempLineColor);

        if (focusLane !== null) {
          const isFocus = lineId === focusLane;
          if (isFocus) {
            lineMat.opacity = Math.min(1, params.lineOpacity + 0.25);
          } else {
            lineMat.opacity = Math.max(0.15, params.lineOpacity * 0.42);
          }
        }
      }

      let convergenceHits = 0;
      for (const sig of signals) {
        sig.progress += sig.speed * 0.005 * params.speedGlobal;
        if (sig.progress > 1) {
          sig.progress = 0;
          sig.laneIndex = Math.floor(Math.random() * params.lineCount);
          sig.history = [];
          sig.assignedColor = pickSignalColor();
        }

        const pos = getPathPoint(sig.progress, sig.laneIndex, time, drift);
        sig.history.push(pos);
        if (sig.history.length > params.trailLength + 1) sig.history.shift();

        if (Math.abs(pos.x) < 2.2) convergenceHits += 1;

        const positions = sig.mesh.geometry.attributes.position.array as Float32Array;
        const colors = sig.mesh.geometry.attributes.color.array as Float32Array;

        const drawCount = Math.max(1, params.trailLength);
        const currentLen = sig.history.length;
        const pulse = Math.sin(time * 5.2 + sig.laneIndex * 0.2) * 0.5 + 0.5;
        const laneFocusBoost = focusLane === null ? 1 : (sig.laneIndex === focusLane ? 1.3 : 0.5);

        for (let i = 0; i < drawCount; i += 1) {
          let index = currentLen - 1 - i;
          if (index < 0) index = 0;

          const p = sig.history[index] || new THREE.Vector3();
          positions[i * 3] = p.x;
          positions[i * 3 + 1] = p.y;
          positions[i * 3 + 2] = p.z;

          let alpha = 1;
          if (params.trailLength > 0) alpha = Math.max(0, 1 - i / params.trailLength);

          const trailNorm = i / Math.max(1, drawCount - 1);
          sampleGradient(signalGradientStops, gradientPhase + trailNorm * 0.15 + sig.laneIndex * 0.01, tempSignalColor);
          tempSignalColor.lerp(sig.assignedColor, 0.45);

          colors[i * 3] = tempSignalColor.r * alpha * pulse * laneFocusBoost;
          colors[i * 3 + 1] = tempSignalColor.g * alpha * pulse * laneFocusBoost;
          colors[i * 3 + 2] = tempSignalColor.b * alpha * pulse * laneFocusBoost;
        }

        sig.mesh.geometry.setDrawRange(0, drawCount);
        sig.mesh.geometry.attributes.position.needsUpdate = true;
        sig.mesh.geometry.attributes.color.needsUpdate = true;
      }

      const convergenceBoost = Math.min(1.6, convergenceHits / 18);
      bloomPass.strength = params.bloomStrength + convergenceBoost;

      composer.render();
    };

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);
    animate();

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);

      for (const l of backgroundLines) {
        l.geometry.dispose();
        if (l.material !== bgMaterial) {
          (l.material as THREE.Material).dispose();
        }
      }
      for (const s of signals) {
        s.mesh.geometry.dispose();
      }
      bgMaterial.dispose();
      signalMaterial.dispose();

      composer.dispose();
      renderer.dispose();
      scene.clear();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [focusSeed, tone]);

  return <div ref={mountRef} className={`pointer-events-none fixed inset-0 z-0 ${className}`.trim()} style={{ opacity }} aria-hidden="true" />;
}
