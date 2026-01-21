import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';
import IntensityChart from './components/IntensityChart';
import EducationalPanel from './components/EducationalPanel';
import { SimulationConfig, HistogramData } from './types';
import { Atom } from 'lucide-react';

// Binning for the histogram
const SCREEN_HEIGHT = 400;
const BIN_SIZE = 5;
const NUM_BINS = SCREEN_HEIGHT / BIN_SIZE;

const App: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<SimulationConfig>({
    wavelength: 500, // roughly green/cyan
    slitDistance: 80,
    observerActive: false,
    emissionRate: 5,
    showWaves: true
  });

  // Histogram state
  const [histogram, setHistogram] = useState<number[]>(new Array(NUM_BINS).fill(0));

  // Reset simulation when critical parameters change significantly or user requests reset
  const handleReset = useCallback(() => {
    setHistogram(new Array(NUM_BINS).fill(0));
  }, []);

  // When Observer Toggles, we usually want to clear the screen to show the contrast clearly,
  // but keeping old dots can be educational too. Let's clear to make the transition obvious.
  useEffect(() => {
    handleReset();
  }, [config.observerActive, config.slitDistance, config.wavelength, handleReset]);

  // Handler when a particle hits the screen
  const handleParticleLand = useCallback((y: number) => {
    const binIndex = Math.floor(y / BIN_SIZE);
    if (binIndex >= 0 && binIndex < NUM_BINS) {
      setHistogram(prev => {
        const next = [...prev];
        next[binIndex] += 1;
        return next;
      });
    }
  }, []);

  // Prepare data for Recharts
  const chartData: HistogramData[] = useMemo(() => {
    return histogram.map((count, index) => ({
      position: index * BIN_SIZE - SCREEN_HEIGHT / 2, // Center 0
      count: count
    }));
  }, [histogram]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-lg text-cyan-400">
              <Atom size={32} />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Fotoquantum
              </h1>
              <p className="text-xs text-slate-400">Simulador da Experiência da Dupla Fenda</p>
            </div>
          </div>
          <div className="hidden md:block text-xs text-slate-500 text-right">
             <span className="block">Física Moderna Interativa</span>
             <span className="block">v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Visual Simulation (Takes up 2/3 on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-slate-200">Câmara de Experimento</h2>
                {config.observerActive && (
                    <span className="animate-pulse px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full font-bold border border-red-500/30">
                        COLAPSO DE FUNÇÃO DE ONDA ATIVO
                    </span>
                )}
            </div>
            
            <SimulationCanvas 
              config={config} 
              onParticleLand={handleParticleLand} 
              isRunning={isRunning} 
            />
            
            {/* Chart below canvas on mobile/tablet, or part of flow */}
            <IntensityChart data={chartData} observerActive={config.observerActive} />
          </div>

          {/* Right Column: Controls */}
          <div className="lg:col-span-1">
             <h2 className="text-lg font-semibold text-slate-200 mb-4">Painel de Controle</h2>
            <Controls 
              config={config} 
              setConfig={setConfig} 
              isRunning={isRunning} 
              setIsRunning={setIsRunning}
              onReset={handleReset}
            />

            <div className="mt-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
                <h4 className="text-purple-300 font-bold text-sm mb-2">Desafio Mental</h4>
                <p className="text-xs text-slate-400">
                    O que acontece se você diminuir muito a distância entre as fendas sem o observador? Observe como o padrão de interferência se expande!
                </p>
            </div>
          </div>

        </div>
      </main>

      {/* Footer / Educational Panel */}
      <EducationalPanel config={config} />
    </div>
  );
};

export default App;