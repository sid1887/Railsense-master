'use client';

import React, { useEffect, useRef } from 'react';

export default function RailwayBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      opacity: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        color: ['#6366F1', '#8B5CF6', '#EC4899', '#10B981'][
          Math.floor(Math.random() * 4)
        ],
        opacity: Math.random() * 0.5 + 0.3,
      });
    }

    // Draw animated rails/lines
    const rails: Array<{ x: number; y: number; angle: number; length: number }> = [];
    for (let i = 0; i < 5; i++) {
      rails.push({
        x: (canvas.width / 6) * (i + 1),
        y: canvas.height,
        angle: -Math.PI / 4,
        length: 300,
      });
    }

    let animationFrameId: number;
    let time = 0;

    const animate = () => {
      // Clear canvas with gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(15, 23, 42, 0.9)');
      gradient.addColorStop(0.5, 'rgba(30, 41, 59, 0.8)');
      gradient.addColorStop(1, 'rgba(51, 65, 85, 0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.01;

      // Draw animated rails
      rails.forEach((rail, idx) => {
        const offset = (time * 50 + idx * 100) % 1000;

        ctx.strokeStyle = `rgba(99, 102, 241, 0.15)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 20]);
        ctx.lineDashOffset = -offset;
        ctx.beginPath();
        ctx.moveTo(rail.x, rail.y);
        ctx.lineTo(
          rail.x + Math.cos(rail.angle) * rail.length,
          rail.y + Math.sin(rail.angle) * rail.length
        );
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw floating train dots along rails
      rails.forEach((rail, idx) => {
        const trainOffset = (time * 100 + idx * 200) % 400;
        const trainX = rail.x + Math.cos(rail.angle) * trainOffset;
        const trainY = rail.y + Math.sin(rail.angle) * trainOffset;

        const trainGradient = ctx.createRadialGradient(trainX, trainY, 2, trainX, trainY, 8);
        trainGradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
        trainGradient.addColorStop(1, 'rgba(99, 102, 241, 0.1)');
        ctx.fillStyle = trainGradient;
        ctx.beginPath();
        ctx.arc(trainX, trainY, 8, 0, Math.PI * 2);
        ctx.fill();

        // Train core
        ctx.fillStyle = '#6366F1';
        ctx.beginPath();
        ctx.arc(trainX, trainY, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw particles
      particles.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.opacity += (Math.random() - 0.5) * 0.01;
        particle.opacity = Math.max(0, Math.min(1, particle.opacity));

        // Wrap around
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.fillStyle = particle.color + Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw center glow
      const centerGradient = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width
      );
      centerGradient.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      centerGradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
      ctx.fillStyle = centerGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: 'transparent' }}
    />
  );
}
