import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SimulationConfig, Particle } from '../types';

interface SimulationCanvasProps {
  config: SimulationConfig;
  onParticleLand: (y: number) => void;
  isRunning: boolean;
}

/**
 * Largura do canvas em pixels
 * Define a área total de desenho da simulação
 * @constant {number}
 */
const CANVAS_WIDTH = 800;

/**
 * Altura do canvas em pixels
 * Define a área total de desenho da simulação
 * @constant {number}
 */
const CANVAS_HEIGHT = 400;

/**
 * Posição X da fonte de partículas (emissor)
 * Localizada no lado esquerdo do canvas
 * @constant {number}
 */
const SOURCE_X = 50;

/**
 * Posição X da barreira com as fendas duplas
 * Localizada a 1/3 do caminho entre a fonte e a tela
 * @constant {number}
 */
const SLIT_X = 250;

/**
 * Posição X da tela de detecção
 * Localizada no lado direito do canvas, onde as partículas são registradas
 * @constant {number}
 */
const SCREEN_X = 750;

/**
 * Distância entre as fendas e a tela
 * Calculada como SCREEN_X - SLIT_X
 * Usada nos cálculos de interferência (L na equação de dupla fenda)
 * @constant {number}
 */
const L = SCREEN_X - SLIT_X; // Distance from slit to screen



const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ config, onParticleLand, isRunning }) => {
  /**
 * Referência para o elemento canvas do DOM
 * Usada para obter o contexto 2D e desenhar a simulação
 * @type {React.RefObject<HTMLCanvasElement>}
 */
const canvasRef = useRef<HTMLCanvasElement>(null);

/**
 * Referência para o array de partículas ativas na simulação
 * 
 * ARMAZENA:
 * - Todas as partículas que ainda não atingiram a tela
 * - Partículas em ambas as fases (source-to-slit e slit-to-screen)
 * - Partículas gêmeas quando detector desligado
 * 
 * O uso de useRef permite modificar o array sem causar re-renderizações,
 * essencial para performance da animação em tempo real
 * 
 * @type {React.MutableRefObject<Particle[]>}
 */
const particlesRef = useRef<Particle[]>([]);

/**
 * Referência para o ID do frame de animação atual
 * 
 * FUNÇÃO:
 * - Armazena o ID retornado por requestAnimationFrame
 * - Permite cancelar a animação no cleanup do useEffect
 * - Previne memory leaks quando o componente é desmontado
 * 
 * @type {React.MutableRefObject<number | undefined>}
 */
const animationFrameRef = useRef<number>();

/**
 * Contador incremental para gerar IDs únicos para cada partícula
 * 
 * FUNÇÃO:
 * - Garante que cada partícula tenha um identificador único
 * - Usado para:
 *   - Rastrear partículas individualmente
 *   - Vincular partículas gêmeas (detector desligado)
 *   - Determinar quais partículas contam no histograma (ID par)
 * 
 * O valor persiste entre re-renderizações, mantendo a sequência de IDs
 * 
 * @type {React.MutableRefObject<number>}
 */
const particleIdCounter = useRef(0);

  /**
   * Calcula a probabilidade de uma partícula cair em determinada posição Y na tela
   * 
   * FUNDAMENTO FÍSICO:
   * - Com detector ligado: Comportamento clássico de partícula (soma de duas Gaussianas)
   * - Com detector desligado: Interferência quântica (padrão de ondas)
   * 
   * A função de onda |Ψ|² dá a probabilidade de encontrar a partícula em cada posição
   * 
   * @param y - Posição Y no canvas (0 a CANVAS_HEIGHT)
   * @param slitDist - Distância entre as fendas (config.slitDistance)
   * @param lambda - Comprimento de onda (config.wavelength)
   * @param observer - Estado do detector (true = ligado, false = desligado)
   * @returns Probabilidade normalizada (0 a 1) da partícula cair na posição Y
   */
  const getProbabilityAtY = useCallback((y: number, slitDist: number, lambda: number, observer: boolean) => {
    // Center y around 0
    const relativeY = y - CANVAS_HEIGHT / 2;
    
    // Envelope (diffraction from single slit width) - keeps particles somewhat centered
    const sigma = 80; 
    const envelope = Math.exp(-(relativeY * relativeY) / (2 * sigma * sigma));

    if (observer) {
      // DETECTOR LIGADO: Comportamento de Partícula (Clássico)
      // Soma de duas distribuições Gaussianas centradas em cada fenda
      // Representa partículas que passaram ou pela fenda superior ou pela inferior
      const topPeak = Math.exp(-Math.pow(relativeY - slitDist/2, 2) / 1000);
      const botPeak = Math.exp(-Math.pow(relativeY + slitDist/2, 2) / 1000);
      return (topPeak + botPeak) * envelope;
    } else {
      // DETECTOR DESLIGADO: Comportamento Ondulatório (Quântico)
      // Padrão de interferência de dupla fenda: I = I₀ cos²(π d y / λ L)
      // Onde:
      // - d = distância entre fendas
      // - y = posição na tela
      // - λ = comprimento de onda
      // - L = distância fendas-tela
      const phase = (Math.PI * slitDist * relativeY) / (lambda * L * 0.05); // 0.05 scaling factor
      return Math.pow(Math.cos(phase), 2) * envelope;
    }
  }, []);

  /**
   * Amostragem por rejeição (Rejection Sampling) para escolher posição Y de chegada
   * 
   * FUNCIONAMENTO:
   * 1. Gera um Y aleatório
   * 2. Calcula a probabilidade deste Y usando getProbabilityAtY()
   * 3. Se um número aleatório for menor que a probabilidade, ACEITA o Y
   * 4. Caso contrário, REJEITA e tenta novamente
   * 
   * Isso garante que a distribuição de partículas na tela siga exatamente
   * a função de probabilidade quântica |Ψ|²
   * 
   * @returns Posição Y escolhida para a partícula atingir a tela
   */
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

  /**
   * CRIA UMA NOVA PARTÍCULA (ou par de partículas) na fonte
   * 
   * COMPORTAMENTO DIFERENCIADO:
   * 
   * DETECTOR LIGADO (Vermelho):
   * - Cria UMA partícula que já escolheu um caminho (fenda superior OU inferior)
   * - A partícula já nasce com velocidade vertical calculada para ir direto à fenda escolhida
   * - Representa o COLAPSO DA FUNÇÃO DE ONDA pela observação
   * - Visualmente: pontos vermelhos individuais desde a origem
   * 
   * DETECTOR DESLIGADO (Azul/Ciano):
   * - Cria DUAS partículas GÊMEAS (uma para cada fenda)
   * - Representa a SUPERPOSIÇÃO QUÂNTICA (partícula passa pelas duas fendas simultaneamente)
   * - Ambas as partículas compartilham o mesmo targetY (mesmo ponto de impacto)
   * - Visualmente: duas linhas azuis separadas desde a origem
   */
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
        twinId: baseId + 1 // Referência para a partícula gêmea
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
        twinId: baseId // Referência para a partícula gêmea
      };
      
      particleIdCounter.current += 2;
      particlesRef.current.push(topParticle, bottomParticle);
    }
  }, [config, isRunning, generateTargetY]);

  /**
   * ATUALIZA A POSIÇÃO DE TODAS AS PARTÍCULAS (Física do movimento)
   * 
   * DUAS FASES:
   * 
   * 1. source-to-slit (Fonte → Fendas):
   *    - Partícula se move da fonte até as fendas
   *    - Velocidade vertical constante (vy calculada em spawnParticle)
   *    - Ao chegar nas fendas, recalcula vy para atingir targetY na tela
   * 
   * 2. slit-to-screen (Fendas → Tela):
   *    - Partícula se move das fendas até a tela
   *    - Velocidade vertical constante (vy recalculada para acertar targetY)
   *    - Ao atingir a tela, registra o impacto e remove a partícula
   * 
   * TRATAMENTO ESPECIAL PARA DETECTOR DESLIGADO:
   * - Partículas gêmeas compartilham o mesmo targetY
   * - Apenas UMA das duas (ID par) conta para o histograma
   * - Quando uma atinge a tela, ambas são removidas
   */
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

  /**
   * DESENHA TODOS OS ELEMENTOS VISUAIS NO CANVAS
   * 
   * ELEMENTOS:
   * 1. Fonte de partículas (círculo âmbar)
   * 2. Barreira com fendas duplas
   * 3. Detector (ícone e texto, quando ativo)
   * 4. Tela de detecção (barra cinza à direita)
   * 5. Frentes de onda (opcional, apenas com detector desligado)
   * 6. Partículas individuais
   * 7. Linhas guia sutis (para referência)
   * 
   * CORES:
   * - Vermelho (#ef4444): Partículas observadas (detector ligado)
   * - Ciano (#22d3ee): Partículas em superposição (detector desligado)
   * - Âmbar (#fbbf24): Fonte
   */
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

  // Main animation loop
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