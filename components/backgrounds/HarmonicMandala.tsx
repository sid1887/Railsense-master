'use client';

import React, { useEffect, useRef } from 'react';

// Global p5 instance (singleton pattern)
let globalP5Instance: any = null;
let containerElement: HTMLDivElement | null = null;
let instanceCount = 0;

export default function HarmonicMandala() {
  const divRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const instanceId = ++instanceCount;

    // Only the first component instance should initialize
    if (instanceId !== 1 || globalP5Instance) {
      return;
    }

    containerElement = divRef.current;
    let mounted = true;

    const initAnimation = async () => {
      if (!mounted || !containerElement) return;

      // Load p5.js if not already loaded
      if (!(window as any).p5) {
        await new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
          script.async = true;
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }

      if (!mounted || !containerElement) return;

      const p5 = (window as any).p5;
      if (!p5) return;

      const sketch = (p: any) => {
        let particles: any[] = [];
        let energyArcs: any[] = [];
        let hexConnectionPoints: any[] = [];
        let arcConnectionPoints: any[] = [];

        p.setup = function () {
          const w = window.innerWidth;
          const h = window.innerHeight;
          p.createCanvas(w, h);
          p.background(0, 255);
          p.angleMode(p.RADIANS);
          p.pixelDensity(1);
        };

        p.draw = function () {
          p.background(0, 12);
          p.translate(p.width / 2, p.height / 2);

          const time = p.frameCount * 0.008;
          const baseRadius = Math.min(p.width, p.height) / 2.4;

          hexConnectionPoints = [];
          arcConnectionPoints = [];

          drawPulsingBackgroundWaves(time, baseRadius);
          drawOuterOrbitalRings(time, baseRadius);
          drawRotatingSegmentedArcs(time, baseRadius);
          drawFibonacciSpiralParticles(time, baseRadius);
          drawCounterRotatingSquares(time, baseRadius);
          drawMidLayerHexagonalStructure(time, baseRadius);
          drawRadialFlowingLines(time, baseRadius);
          drawInnerRotatingMechanism(time, baseRadius);
          drawCentralMandalaFlower(time, baseRadius);
          drawAtmosphericInterferenceRings(time, baseRadius);

          updateAndDrawParticles();
          updateAndDrawEnergyArcs();

          if (p.random(1) < 0.05 && hexConnectionPoints.length > 0 && arcConnectionPoints.length > 0) {
            let p1 = p.random(hexConnectionPoints);
            let p2 = p.random(arcConnectionPoints);
            energyArcs.push(new EnergyArc(p1, p2));
          }
        };

        const drawPulsingBackgroundWaves = (time: number, baseRadius: number) => {
          for (let i = 0; i < 3; i++) {
            const pulseTime = time * 0.5 + i * Math.PI;
            const r = Math.pow(Math.sin(pulseTime % Math.PI), 2) * baseRadius * 2.5;
            const alpha = Math.pow(Math.cos(pulseTime % Math.PI), 4) * 3;
            p.noFill();
            p.stroke(100, 150, 255, alpha);
            p.strokeWeight(1.5);
            p.circle(0, 0, r);
          }
        };

        const drawOuterOrbitalRings = (time: number, baseRadius: number) => {
          p.push();
          p.rotate(time * 0.1);
          for (let i = 0; i < 4; i++) {
            const ringRadius = baseRadius * 0.95 + i * (baseRadius * 0.08);
            const segments = 150;
            p.noFill();
            p.stroke(100, 180, 255, 20 - i * 3);
            p.strokeWeight(0.7);
            p.beginShape();
            for (let j = 0; j <= segments; j++) {
              const angle = p.map(j, 0, segments, 0, p.TWO_PI);
              const wave1 = Math.sin(angle * 10 + time * 2.5 + i) * (baseRadius * 0.03);
              const wave2 = Math.cos(angle * 5 - time * 3.5) * (baseRadius * 0.025);
              const wave3 = Math.sin(angle * 20 + time * 1.5) * (baseRadius * 0.015);
              const r = ringRadius + wave1 + wave2 + wave3;
              p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            p.endShape(p.CLOSE);
          }
          p.pop();
        };

        const drawRotatingSegmentedArcs = (time: number, baseRadius: number) => {
          for (let seg = 0; seg < 10; seg++) {
            const segAngle = (seg / 10) * p.TWO_PI;
            const rotation = segAngle + time * 0.15;
            p.push();
            p.rotate(rotation);
            p.noFill();
            p.stroke(120, 200, 255, 35);
            p.strokeWeight(1);
            p.beginShape();
            for (let i = 0; i < 60; i++) {
              const t = i / 60;
              const angle = t * (p.TWO_PI / 10) - Math.PI / 20;
              const distance = baseRadius * 0.8 + Math.sin(t * Math.PI * 4 + time * 2) * (baseRadius * 0.07);
              p.vertex(Math.cos(angle) * distance, Math.sin(angle) * distance);
            }
            p.endShape();
            const endDist = baseRadius * 0.8 + Math.sin(time * 2) * (baseRadius * 0.07);
            const endAngle = p.TWO_PI / 10 - Math.PI / 20;
            const px = Math.cos(endAngle) * endDist;
            const py = Math.sin(endAngle) * endDist;

            const worldX = px * Math.cos(rotation) - py * Math.sin(rotation);
            const worldY = px * Math.sin(rotation) + py * Math.cos(rotation);
            arcConnectionPoints.push({ x: worldX, y: worldY });

            p.stroke(150, 220, 255, 80);
            p.strokeWeight(3);
            p.point(px, py);
            p.pop();
          }
        };

        const drawFibonacciSpiralParticles = (time: number, baseRadius: number) => {
          const goldenAngle = Math.PI * (3 - Math.sqrt(5));
          for (let i = 0; i < 250; i++) {
            const angle = i * goldenAngle + time * 0.4;
            const radius = Math.sqrt(i) * (baseRadius * 0.025);
            if (radius > baseRadius * 0.15 && radius < baseRadius * 0.75) {
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const size = p.map(Math.sin(i * 0.1 + time), -1, 1, 0.5, 2.5);
              const alpha = p.map(radius, baseRadius * 0.15, baseRadius * 0.75, 80, 10);
              p.stroke(120, 200, 255, alpha);
              p.strokeWeight(size);
              p.point(x, y);
            }
          }
        };

        const drawCounterRotatingSquares = (time: number, baseRadius: number) => {
          p.push();
          p.rotate(-time * 0.08);
          let previousVertices: any[] | null = null;

          for (let i = 0; i < 4; i++) {
            p.push();
            const r = baseRadius * (0.6 - i * 0.08);
            const rotation = time * 0.1 * (i + 1);
            p.rotate(rotation);

            let currentVertices = [];
            for (let j = 0; j < 4; j++) {
              const angle = Math.PI / 4 + (j * Math.PI) / 2;
              currentVertices.push({
                x: Math.cos(angle) * r * 0.707,
                y: Math.sin(angle) * r * 0.707,
              });
            }

            p.stroke(100, 180, 255, 25 - i * 3);
            p.strokeWeight(1.2 - i * 0.2);
            p.noFill();
            p.beginShape();
            for (const v of currentVertices) {
              p.vertex(v.x, v.y);
            }
            p.endShape(p.CLOSE);

            if (previousVertices) {
              p.stroke(100, 180, 255, 12 - i * 2);
              p.strokeWeight(0.5);
              for (let j = 0; j < 4; j++) {
                p.line(
                  previousVertices[j].x,
                  previousVertices[j].y,
                  currentVertices[j].x,
                  currentVertices[j].y
                );
              }
            }
            p.pop();

            let worldVertices = [];
            for (const v of currentVertices) {
              const worldX = v.x * Math.cos(rotation) - v.y * Math.sin(rotation);
              const worldY = v.x * Math.sin(rotation) + v.y * Math.cos(rotation);
              worldVertices.push({ x: worldX, y: worldY });
            }
            previousVertices = worldVertices;
          }
          p.pop();
        };

        const drawMidLayerHexagonalStructure = (time: number, baseRadius: number) => {
          p.push();
          const rotation = time * 0.12;
          p.rotate(rotation);
          for (let hexLayer = 0; hexLayer < 3; hexLayer++) {
            const hexRadius = baseRadius * 0.55 - hexLayer * (baseRadius * 0.11);
            const pulse = Math.sin(time * 2.5 + hexLayer * 0.7) * (baseRadius * 0.015);
            let vertices = [];
            for (let i = 0; i < 6; i++) {
              const angle = (i / 6) * p.TWO_PI;
              const modulation = Math.cos(angle * 6 - time * 1.5) * (baseRadius * 0.025);
              const r = hexRadius + pulse + modulation;
              vertices.push({
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
              });
            }
            p.noFill();
            p.stroke(100, 180, 255, 70 - hexLayer * 12);
            p.strokeWeight(1.8 - hexLayer * 0.3);
            p.beginShape();
            for (const v of vertices) {
              p.vertex(v.x, v.y);
            }
            p.endShape(p.CLOSE);

            if (hexLayer === 0) {
              for (let i = 0; i < vertices.length; i++) {
                let v = vertices[i];
                let worldX = v.x * Math.cos(rotation) - v.y * Math.sin(rotation);
                let worldY = v.x * Math.sin(rotation) + v.y * Math.cos(rotation);
                hexConnectionPoints.push({ x: worldX, y: worldY });

                if (p.frameCount % 5 === 0) {
                  let angle = Math.atan2(worldY, worldX);
                  let velocity = {
                    x: Math.cos(angle) * p.random(1, 2),
                    y: Math.sin(angle) * p.random(1, 2),
                  };
                  particles.push(new Particle(worldX, worldY, velocity));
                }
              }
            }
          }
          p.pop();
        };

        const drawRadialFlowingLines = (time: number, baseRadius: number) => {
          const numRays = 36;
          for (let i = 0; i < numRays; i++) {
            const angle = (i / numRays) * p.TWO_PI;
            p.push();
            p.rotate(angle + time * 0.2);
            p.noFill();
            p.stroke(100, 180, 255, 12);
            p.strokeWeight(0.7);
            p.beginShape();
            for (let d = baseRadius * 0.075; d < baseRadius * 0.5; d += 2) {
              const wave = Math.sin(d * 0.1 + time * 4.5) * (baseRadius * 0.018);
              const flow = Math.cos(d * 0.05 - time * 2.5) * (baseRadius * 0.012);
              p.vertex(wave + flow, d);
            }
            p.endShape();
            p.pop();
          }
        };

        const drawInnerRotatingMechanism = (time: number, baseRadius: number) => {
          p.push();
          p.rotate(-time * 0.25);
          const innerSides = 12;
          for (let layer = 0; layer < 5; layer++) {
            const innerRadius = baseRadius * 0.28 - layer * (baseRadius * 0.05);
            const breathe = Math.sin(time * 3 + layer * 0.8) * (baseRadius * 0.01);
            p.noFill();
            p.stroke(100, 180, 255, 80 - layer * 12);
            p.strokeWeight(1.2 - layer * 0.2);
            p.beginShape();
            for (let i = 0; i <= innerSides; i++) {
              const angle = (i / innerSides) * p.TWO_PI;
              const modulation = Math.sin(angle * (5 + layer) + time * 2.2) * (baseRadius * 0.018);
              const r = innerRadius + breathe + modulation;
              p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
            }
            p.endShape();
          }
          p.pop();
        };

        const drawCentralMandalaFlower = (time: number, baseRadius: number) => {
          p.push();
          p.rotate(time * 0.35);
          const coreRadius = baseRadius * 0.12;

          const bladeCount = 12;
          for (let i = 0; i < bladeCount; i++) {
            const angle = (i / bladeCount) * p.TWO_PI;
            const openness = Math.sin(time * 2 + Math.PI) * 0.5 + 0.5;
            const bladeLength = coreRadius * (1.2 + Math.sin(time * 2.5) * 0.2);
            const bladeStart = coreRadius * 0.5;

            p.push();
            p.rotate(angle);
            p.stroke(120, 200, 255, 90);
            p.strokeWeight(0.8);
            p.line(0, bladeStart, 0, bladeLength * openness);
            p.pop();
          }

          for (let layer = 0; layer < 4; layer++) {
            const layerRadius = coreRadius - layer * (baseRadius * 0.02);
            const pulse = Math.sin(time * 3.5 + layer * 0.5) * (baseRadius * 0.005);
            p.noFill();
            p.stroke(120, 200, 255, 140 - layer * 20);
            p.strokeWeight(2 - layer * 0.3);
            p.circle(0, 0, (layerRadius + pulse) * 2);
          }
          p.stroke(150, 220, 255, 200);
          p.strokeWeight(5);
          p.point(0, 0);
          p.pop();
        };

        const drawAtmosphericInterferenceRings = (time: number, baseRadius: number) => {
          for (let r = 0; r < 15; r++) {
            const ringRadius = baseRadius * 0.15 + r * (baseRadius * 0.065);
            p.noFill();
            p.stroke(100, 180, 255, 6);
            p.strokeWeight(0.4);
            p.beginShape();
            for (let i = 0; i <= 240; i++) {
              const angle = p.map(i, 0, 240, 0, p.TWO_PI);
              const wave1 = Math.sin(angle * 18 + time * 1.2 + r * 0.3) * (baseRadius * 0.008);
              const wave2 = Math.cos(angle * 9 - time * 1.8 + r * 0.5) * (baseRadius * 0.006);
              const finalRadius = ringRadius + wave1 + wave2;
              p.vertex(Math.cos(angle) * finalRadius, Math.sin(angle) * finalRadius);
            }
            p.endShape(p.CLOSE);
          }
        };

        const updateAndDrawParticles = () => {
          for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].display(p);
            if (particles[i].isDead()) {
              particles.splice(i, 1);
            }
          }
        };

        const updateAndDrawEnergyArcs = () => {
          for (let i = energyArcs.length - 1; i >= 0; i--) {
            energyArcs[i].update();
            energyArcs[i].display(p);
            if (energyArcs[i].isDead()) {
              energyArcs.splice(i, 1);
            }
          }
        };

        p.windowResized = function () {
          if (mounted) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            p.resizeCanvas(w, h);
          }
        };

        class Particle {
          pos: any;
          vel: any;
          lifespan: number;

          constructor(x: number, y: number, velocity: any) {
            this.pos = { x, y };
            this.vel = velocity;
            this.lifespan = 100;
          }

          update() {
            const perpX = -this.pos.y;
            const perpY = this.pos.x;
            const perpLen = Math.sqrt(perpX * perpX + perpY * perpY);
            const perpNormX = perpX / perpLen;
            const perpNormY = perpY / perpLen;

            this.vel.x += perpNormX * 0.05;
            this.vel.y += perpNormY * 0.05;
            this.vel.x *= 0.99;
            this.vel.y *= 0.99;
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;
            this.lifespan -= 2.5;
          }

          display(p: any) {
              p.stroke(100, 180, 255, this.lifespan);
              p.strokeWeight(1.5);
              p.point(this.pos.x, this.pos.y);
            }

          isDead() {
            return this.lifespan < 0;
          }
        }

        class EnergyArc {
          start: any;
          end: any;
          lifespan: number;
          maxLifespan: number;

          constructor(start: any, end: any) {
            this.start = start;
            this.end = end;
            this.lifespan = 50;
            this.maxLifespan = 50;
          }

          update() {
            this.lifespan -= 2;
          }

          display(p: any) {
            const alpha = p.map(this.lifespan, 0, this.maxLifespan, 0, 120);
            const sw = p.map(this.lifespan, 0, this.maxLifespan, 0, 1.5);
            p.noFill();
            p.stroke(120, 200, 255, alpha);
            p.strokeWeight(sw);

            const midX = (this.start.x + this.end.x) / 2;
            const midY = (this.start.y + this.end.y) / 2;
            const dist = Math.sqrt(
              (this.end.x - this.start.x) ** 2 + (this.end.y - this.start.y) ** 2
            );
            const normX = -(this.end.y - this.start.y);
            const normY = this.end.x - this.start.x;
            const normLen = Math.sqrt(normX * normX + normY * normY);
            const controlX = midX + (normX / normLen) * (dist * 0.2);
            const controlY = midY + (normY / normLen) * (dist * 0.2);

            p.beginShape();
            p.vertex(this.start.x, this.start.y);
            p.quadraticVertex(controlX, controlY, this.end.x, this.end.y);
            p.endShape();
          }

          isDead() {
            return this.lifespan < 0;
          }
        }
      };

      globalP5Instance = new p5(sketch);
    };

    initAnimation();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      ref={divRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
      }}
    />
  );
}
