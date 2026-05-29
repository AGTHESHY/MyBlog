"use client";
import { useEffect, useRef } from 'react';

export default function ClickEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ripples: Ripple[] = [];
    let rafId: number | null = null;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize, { passive: true });
    resize();

    class Ripple {
      x: number;
      y: number;
      r: number;
      opacity: number;
      velocity: number;

      constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
        this.r = 0;
        this.opacity = 0.6;
        this.velocity = 2.5;
      }

      update() {
        this.r += this.velocity;
        this.velocity *= 0.96;
        this.opacity -= 0.015;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${this.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(129, 140, 248, ${this.opacity * 0.3})`;
        ctx.fill();
      }
    }

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.shadowBlur = 15;
      ctx.shadowColor = 'rgba(129, 140, 248, 0.5)';

      for (let i = ripples.length - 1; i >= 0; i--) {
        ripples[i].update();
        ripples[i].draw();
        if (ripples[i].opacity <= 0) {
          ripples.splice(i, 1);
        }
      }

      if (ripples.length > 0) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = null;
      }
    };

    const startLoop = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    };

    const handleClick = (e: MouseEvent) => {
      ripples.push(new Ripple(e.clientX, e.clientY));
      startLoop();
    };

    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('click', handleClick);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
    />
  );
}
