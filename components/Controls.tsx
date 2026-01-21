import React from 'react';
import { SimulationConfig } from '../types';
import { Play, Pause, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface ControlsProps {
  config: SimulationConfig;
  setConfig: React.Dispatch<React.SetStateAction<SimulationConfig>>;
  isRunning: boolean;
  setIsRunning: (val: boolean) => void;
  onReset: () => void;
}

const Controls: React.FC<ControlsProps> = ({ config, setConfig, isRunning, setIsRunning, onReset }) => {
  
  const handleChange = (key: keyof SimulationConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 space-y-6">
      
      {/* Main Actions */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-colors ${
            isRunning 
              ? 'bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:bg-amber-500/30' 
              : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400'
          }`}
        >
          {isRunning ? <><Pause size={20} /> PAUSAR</> : <><Play size={20} /> INICIAR</>}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-3 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 border border-slate-600 transition-colors"
          title="Limpar Tela"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Observer Switch */}
      <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-300">Observador (Detector)</label>
          {config.observerActive ? <Eye className="text-red-500" size={20}/> : <EyeOff className="text-slate-500" size={20}/>}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Ativar o detector nas fendas causa o colapso da função de onda.
        </p>
        <button
          onClick={() => handleChange('observerActive', !config.observerActive)}
          className={`w-full py-2 rounded-md text-sm font-semibold transition-all ${
            config.observerActive
              ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }`}
        >
          {config.observerActive ? 'DETECTOR LIGADO' : 'DETECTOR DESLIGADO'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Slit Distance */}
        <div>
          <div className="flex justify-between text-sm mb-1 text-slate-300">
            <span>Distância entre Fendas (d)</span>
            <span className="font-mono text-cyan-400">{config.slitDistance} px</span>
          </div>
          <input
            type="range"
            min="40"
            max="120"
            value={config.slitDistance}
            onChange={(e) => handleChange('slitDistance', Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        {/* Wavelength */}
        <div>
          <div className="flex justify-between text-sm mb-1 text-slate-300">
            <span>Comprimento de Onda (λ)</span>
            <span className="font-mono text-purple-400">{config.wavelength} nm</span>
          </div>
          <input
            type="range"
            min="300"
            max="800"
            value={config.wavelength}
            onChange={(e) => handleChange('wavelength', Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Intensity */}
        <div>
          <div className="flex justify-between text-sm mb-1 text-slate-300">
            <span>Taxa de Disparo</span>
            <span className="font-mono text-emerald-400">{config.emissionRate} part/s</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={config.emissionRate}
            onChange={(e) => handleChange('emissionRate', Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
        
         {/* Show Waves Toggle */}
         <div className="flex items-center gap-3 pt-2">
            <input 
                id="showWaves"
                type="checkbox" 
                checked={config.showWaves}
                onChange={(e) => handleChange('showWaves', e.target.checked)}
                className="w-4 h-4 rounded bg-slate-700 border-slate-500 accent-cyan-500"
            />
            <label htmlFor="showWaves" className="text-sm text-slate-400 cursor-pointer select-none">Mostrar Ondas Guia</label>
        </div>
      </div>
    </div>
  );
};

export default Controls;