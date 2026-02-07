import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiEffectProps {
  active: boolean;
  duration?: number;
}

export default function ConfettiEffect({ active, duration = 5000 }: ConfettiEffectProps) {
  const [isActive, setIsActive] = useState(active);

  useEffect(() => {
    if (active) {
      setIsActive(true);
      
      const endTime = Date.now() + duration;
      
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        });
        
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        });
        
        if (Date.now() < endTime) {
          requestAnimationFrame(frame);
        }
      };
      
      frame();
      
      setTimeout(() => setIsActive(false), duration);
    }
  }, [active, duration]);

  if (!isActive) return null;

  return null;
}

export function triggerConfetti(options?: confetti.Options) {
  const defaults = {
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
  };
  
  confetti({
    ...defaults,
    ...options,
  });
}

export function triggerLevelUpConfetti() {
  const duration = 3000;
  const endTime = Date.now() + duration;
  
  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#FFD700', '#FFA500', '#FF6347'],
      shapes: ['circle', 'square'],
      scalar: 1.5,
    });
    
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#FFD700', '#FFA500', '#FF6347'],
      shapes: ['circle', 'square'],
      scalar: 1.5,
    });
    
    if (Date.now() < endTime) {
      requestAnimationFrame(frame);
    }
  };
  
  frame();
}

export function triggerBadgeConfetti() {
  confetti({
    particleCount: 50,
    spread: 100,
    origin: { y: 0.6 },
    colors: ['#FFD700', '#FFA500', '#FF6347', '#FF1493'],
    shapes: ['star'],
    scalar: 2,
  });
}

export function triggerLootBoxConfetti() {
  const duration = 2000;
  const endTime = Date.now() + duration;
  
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#FF1493', '#00CED1'];
  
  const frame = () => {
    confetti({
      particleCount: 8,
      spread: 100,
      origin: { y: 0.5 },
      colors: colors,
      shapes: ['circle', 'square'],
      scalar: 1.2,
      gravity: 0.8,
      drift: 0,
    });
    
    if (Date.now() < endTime) {
      requestAnimationFrame(frame);
    }
  };
  
  frame();
}
