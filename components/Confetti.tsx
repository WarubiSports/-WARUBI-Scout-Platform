
import React, { useEffect, useRef } from 'react';

interface ConfettiProps {
  onComplete: () => void;
}

const Confetti: React.FC<ConfettiProps> = ({ onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#10b981', '#fbbf24', '#ffffff', '#34d399', '#f59e0b']; // Warubi Brand Colors
    const particles: any[] = [];
    const particleCount = 200;

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 5,
        h: Math.random() * 10 + 5,
        dx: Math.random() * 4 - 2, // Horizontal drift
        dy: Math.random() * 5 + 3, // Fall speed
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10,
        tiltAngleIncremental: Math.random() * 0.07 + 0.05,
        tiltAngle: 0
      });
    }

    let animationId: number;
    let startTime = Date.now();
    const duration = 4000; // 4 seconds

    const animate = () => {
      const now = Date.now();
      const timeElapsed = now - startTime;

      if (timeElapsed > duration) {
        onComplete();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        ctx.beginPath();
        ctx.lineWidth = p.w;
        ctx.strokeStyle = p.color;
        // Simulate 3D rotation with tilt
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += p.dy;
        p.x += Math.sin(p.tiltAngle) * 2; 
        p.tilt = Math.sin(p.tiltAngle) * 15;

        ctx.moveTo(p.x + p.tilt + p.w / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.h);
        ctx.stroke();

        // Respawn if out of view (only for first 3 seconds)
        if (p.y > canvas.height && timeElapsed < duration - 1000) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [onComplete]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[100]"
    />
  );
};

export default Confetti;
