import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationConfig, Particle } from '../types';

interface SimulationCanvasProps {
  config: SimulationConfig;
  onParticleLand: (y: number) => void;
  isRunning: boolean;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const SOURCE_X = 50;
const SLIT_X = 250;
const SCREEN_X = 750;

// Physics constants for visualization scaling
const L = SCREEN_X - SLIT_X; // Distance from slit to screen

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ config, onParticleLand, isRunning }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const particleIdCounter = useRef(0);

  // Helper to calculate probability distribution based on current config
  const getProbabilityAtY = useCallback((y: number, slitDist: number, lambda: number, observer: boolean) => {
    // Center y around 0
    const relativeY = y - CANVAS_HEIGHT / 2;
    
    // Envelope (diffraction from single slit width) - keeps particles somewhat centered
    const sigma = 80; 
    const envelope = Math.exp(-(relativeY * relativeY) / (2 * sigma * sigma));

    if (observer) {
      // Classical / Particle-like: Sum of two Gaussians
      const topPeak = Math.exp(-Math.pow(relativeY - slitDist/2, 2) / 1000);
      const botPeak = Math.exp(-Math.pow(relativeY + slitDist/2, 2) / 1000);
      return (topPeak + botPeak) * envelope;
    } else {
      // Quantum / Wave-like: Interference Pattern
      // I ~ cos^2( (pi * d * sin(theta)) / lambda )
      // sin(theta) ~ y / L
      const phase = (Math.PI * slitDist * relativeY) / (lambda * L * 0.05); // 0.05 scaling factor
      return Math.pow(Math.cos(phase), 2) * envelope;
    }
  }, []);

  // Rejection Sampling to pick a landing spot based on probability
  const generateTargetY = useCallback(() => {
    let y = 0;
    let maxIter = 100;
    
    do {
      // Random Y within canvas height
      y = Math.random() * CANVAS_HEIGHT;
      // Calculate probability for this Y
      const prob = getProbabilityAtY(y, config.slitDistance, config.wavelength, config.observerActive);
      // Rejection check
      if (Math.random() < prob) {
        return y;
      }
      maxIter--;
    } while (maxIter > 0);

    // Fallback to center if sampling fails
    return CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 50;
  }, [config, getProbabilityAtY]);

  const spawnParticle = useCallback(() => {
    if (!isRunning) return;

    const particleColor = config.observerActive ? '#ef4444' : '#22d3ee'; // Red for observed, Cyan for quantum

    if (config.observerActive) {
      // ============================================
      // DETECTOR LIGADO - Comportamento de Partícula
      // ============================================
      // A partícula JÁ ESCOLHE O CAMINHO imediatamente ao sair da fonte
      const originSlit = Math.random() > 0.5 ? 'top' : 'bottom';
      
      // A partícula já nasce NA LINHA DIREITA em direção à fenda escolhida
      // Não tem linha contínua - já é um ponto individual desde a origem
      const slitY = CANVAS_HEIGHT / 2 + (originSlit === 'top' ? -config.slitDistance / 2 : config.slitDistance / 2);
      
      // Calcula a inclinação para ir direto para a fenda escolhida
      const dx = SLIT_X - SOURCE_X;
      const dy = slitY - CANVAS_HEIGHT / 2;
      const timeToSlit = dx / 4; // vx = 4
      const vy = dy / timeToSlit;

      const newParticle: Particle = {
        id: particleIdCounter.current++,
        x: SOURCE_X,
        y: CANVAS_HEIGHT / 2, // Começa no centro da fonte
        vx: 4,
        vy: vy, // Velocidade vertical calculada para ir direto à fenda
        targetY: generateTargetY(),
        color: particleColor,
        phase: 'source-to-slit',
        originSlit: originSlit,
        twinId: undefined
      };
      
      particlesRef.current.push(newParticle);
    } else {
      // ============================================
      // DETECTOR DESLIGADO - Comportamento Ondulatório
      // ============================================
      // Cria DUAS partículas (representando a onda passando pelas duas fendas)
      const baseId = particleIdCounter.current;
      
      // Calcula as velocidades para cada caminho
      const dx = SLIT_X - SOURCE_X;
      const timeToSlit = dx / 4; // vx = 4
      
      // Posições Y das fendas
      const topSlitY = CANVAS_HEIGHT / 2 - config.slitDistance / 2;
      const bottomSlitY = CANVAS_HEIGHT / 2 + config.slitDistance / 2;
      
      // Velocidades verticais para cada caminho
      const topVy = (topSlitY - CANVAS_HEIGHT / 2) / timeToSlit;
      const bottomVy = (bottomSlitY - CANVAS_HEIGHT / 2) / timeToSlit;
      
      // Partícula da fenda superior
      const topParticle: Particle = {
        id: baseId,
        x: SOURCE_X,
        y: CANVAS_HEIGHT / 2, // Começa no centro da fonte
        vx: 4,
        vy: topVy, // Velocidade calculada para ir à fenda superior
        targetY: generateTargetY(),
        color: particleColor,
        phase: 'source-to-slit',
        originSlit: 'top',
        twinId: baseId + 1
      };
      
      // Partícula da fenda inferior
      const bottomParticle: Particle = {
        id: baseId + 1,
        x: SOURCE_X,
        y: CANVAS_HEIGHT / 2, // Começa no centro da fonte
        vx: 4,
        vy: bottomVy, // Velocidade calculada para ir à fenda inferior
        targetY: generateTargetY(),
        color: particleColor,
        phase: 'source-to-slit',
        originSlit: 'bottom',
        twinId: baseId
      };
      
      particleIdCounter.current += 2;
      particlesRef.current.push(topParticle, bottomParticle);
    }
  }, [config, isRunning, generateTargetY]);

  const updateParticles = useCallback(() => {
    const particles = particlesRef.current;
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Movement Logic
      if (p.phase === 'source-to-slit') {
        p.x += p.vx;
        p.y += p.vy; // Atualiza Y com a velocidade vertical
        
        // Approaching Slit
        if (p.x >= SLIT_X) {
          p.phase = 'slit-to-screen';
          
          // Ajusta posição Y para exatamente a fenda (correção de pequenos erros)
          if (p.originSlit === 'top') {
            p.y = CANVAS_HEIGHT / 2 - config.slitDistance / 2;
          } else if (p.originSlit === 'bottom') {
            p.y = CANVAS_HEIGHT / 2 + config.slitDistance / 2;
          }

          // Calculate velocity vector to hit targetY at SCREEN_X
          const dx = SCREEN_X - SLIT_X;
          const dy = p.targetY - p.y;
          const timeToHit = dx / p.vx;
          p.vy = dy / timeToHit;
        }
      } else if (p.phase === 'slit-to-screen') {
        p.x += p.vx;
        p.y += p.vy;

        // Hit Screen
        if (p.x >= SCREEN_X) {
          // Para detector desligado: apenas uma das partículas gêmeas conta
          // Para detector ligado: todas contam
          if (!config.observerActive) {
            // Detector desligado: só conta partículas com ID par
            if (p.id % 2 === 0) {
              onParticleLand(p.y);
            }
          } else {
            // Detector ligado: todas contam
            onParticleLand(p.y);
          }
          
          // Remove esta partícula
          particles.splice(i, 1);
          
          // Se existir uma partícula gêmea (detector desligado), remove também
          if (p.twinId !== undefined) {
            const twinIndex = particles.findIndex(part => part.id === p.twinId);
            if (twinIndex !== -1) {
              particles.splice(twinIndex, 1);
            }
          }
        }
      }
    }
  }, [config, onParticleLand]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    // Clear Canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Source
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(SOURCE_X, CANVAS_HEIGHT / 2, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw "Gun" barrel
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(SOURCE_X - 10, CANVAS_HEIGHT/2);
    ctx.lineTo(SOURCE_X + 10, CANVAS_HEIGHT/2);
    ctx.stroke();

    // Draw Slit Barrier
    ctx.fillStyle = '#334155';
    const barrierW = 10;
    const slitH = 20;
    const d = config.slitDistance;

    // Top Barrier Part
    ctx.fillRect(SLIT_X, 0, barrierW, CANVAS_HEIGHT / 2 - d / 2 - slitH / 2);
    // Middle Barrier Part
    ctx.fillRect(SLIT_X, CANVAS_HEIGHT / 2 - d / 2 + slitH / 2, barrierW, d - slitH);
    // Bottom Barrier Part
    ctx.fillRect(SLIT_X, CANVAS_HEIGHT / 2 + d / 2 + slitH / 2, barrierW, CANVAS_HEIGHT / 2 - d / 2 - slitH / 2);

    // Draw Observer (Eye/Detector) if active
    if (config.observerActive) {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(SLIT_X + 20, CANVAS_HEIGHT / 2 - d/2 - 30, 10, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(SLIT_X + 20, CANVAS_HEIGHT / 2 - d/2 - 30);
      ctx.lineTo(SLIT_X + 5, CANVAS_HEIGHT / 2 - d/2);
      ctx.moveTo(SLIT_X + 20, CANVAS_HEIGHT / 2 - d/2 - 30);
      ctx.lineTo(SLIT_X + 5, CANVAS_HEIGHT / 2 + d/2);
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = '10px sans-serif';
      ctx.fillText("DETECTOR", SLIT_X - 10, CANVAS_HEIGHT / 2 - d/2 - 45);
    }

    // Draw Screen
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(SCREEN_X, 10, 10, CANVAS_HEIGHT - 20);

    // Draw Wavefronts (Optional visualization)
    if (config.showWaves && !config.observerActive) {
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.1)';
        ctx.lineWidth = 2;
        const time = Date.now() / 200;
        
        // Source waves - DUAS FRENTES DE ONDA (superior e inferior)
        for(let r=0; r<SLIT_X - SOURCE_X; r+=20) {
            const radius = (r + time * 10) % (SLIT_X - SOURCE_X);
            if (radius < 10) continue;
            
            // Onda superior
            ctx.beginPath();
            ctx.arc(SOURCE_X, CANVAS_HEIGHT/2, radius, -0.5, 0.5);
            ctx.stroke();
            
            // Onda inferior (apenas para mostrar a dualidade)
            ctx.beginPath();
            ctx.arc(SOURCE_X, CANVAS_HEIGHT/2, radius, 0.5, 1.5);
            ctx.stroke();
        }

        // Slit waves (Interference area)
        for(let r=0; r<SCREEN_X - SLIT_X; r+=25) {
            const radius = (r + time * 10) % (SCREEN_X - SLIT_X);
             // Top slit
             ctx.beginPath();
             ctx.arc(SLIT_X, CANVAS_HEIGHT/2 - d/2, radius, -1, 1);
             ctx.stroke();
             // Bottom slit
             ctx.beginPath();
             ctx.arc(SLIT_X, CANVAS_HEIGHT/2 + d/2, radius, -1, 1);
             ctx.stroke();
        }
    }

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw subtle guide lines (opcional, para referência)
    ctx.strokeStyle = config.observerActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 211, 238, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Linhas dos caminhos possíveis
    ctx.beginPath();
    ctx.moveTo(SOURCE_X, CANVAS_HEIGHT/2);
    ctx.lineTo(SLIT_X, CANVAS_HEIGHT/2 - d/2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(SOURCE_X, CANVAS_HEIGHT/2);
    ctx.lineTo(SLIT_X, CANVAS_HEIGHT/2 + d/2);
    ctx.stroke();
    
    ctx.setLineDash([]);

  }, [config]);

  // Main Loop
  useEffect(() => {
    let lastSpawnTime = 0;

    const loop = (timestamp: number) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;

      if (timestamp - lastSpawnTime > (1000 / (config.emissionRate * 60))) {
        spawnParticle();
        lastSpawnTime = timestamp;
      }

      updateParticles();
      draw(ctx);
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [spawnParticle, updateParticles, draw, config.emissionRate]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="w-full h-auto bg-slate-900 cursor-crosshair"
      />
      <div className="absolute top-4 left-4 text-xs text-slate-400 font-mono pointer-events-none">
        <div>FONTE: Elétrons/Fótons</div>
        <div>DISTÂNCIA TELA: {L}px</div>
      </div>
      <div className="absolute top-4 left-[240px] text-xs text-slate-400 font-mono pointer-events-none">
        <div>BARREIRA</div>
        <div>d = {config.slitDistance}px</div>
      </div>
      <div className="absolute top-4 right-4 text-xs text-slate-400 font-mono pointer-events-none">
        <div>DETECTOR (TELA)</div>
      </div>
    </div>
  );
};

export default SimulationCanvas;