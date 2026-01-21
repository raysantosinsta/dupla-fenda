import React from 'react';
import { SimulationConfig } from '../types';
import { BookOpen, AlertTriangle, Lightbulb } from 'lucide-react';

interface EducationalPanelProps {
  config: SimulationConfig;
}

const EducationalPanel: React.FC<EducationalPanelProps> = ({ config }) => {
  return (
    <div className="bg-slate-900 border-t border-slate-700 p-6 md:p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Dynamic Context */}
        <div>
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <Lightbulb size={24} />
            <h2 className="text-xl font-bold text-white">O que está acontecendo?</h2>
          </div>
          
          <div className="space-y-4 text-slate-300 leading-relaxed">
            {config.observerActive ? (
              // Scenario: Observer ON
              <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-red-500">
                <h3 className="font-bold text-red-400 mb-2">Comportamento de Partícula (Clássico)</h3>
                <p>
                  O <strong>detector está ligado</strong>. Ao tentarmos medir por qual fenda a partícula passa, forçamos a natureza a "escolher" um caminho definido.
                </p>
                <p className="mt-2">
                  Isso causa o <strong>Colapso da Função de Onda</strong>. A partícula deixa de agir como uma onda de probabilidade e passa a agir como um objeto sólido (como uma bala de gude). O padrão na tela é apenas a soma de dois montes, sem interferência.
                </p>
              </div>
            ) : (
              // Scenario: Observer OFF
              <div className="bg-slate-800/50 p-4 rounded-lg border-l-4 border-cyan-500">
                <h3 className="font-bold text-cyan-400 mb-2">Comportamento Ondulatório (Quântico)</h3>
                <p>
                  O <strong>detector está desligado</strong>. Não sabemos por qual fenda a partícula passou. Na mecânica quântica, isso significa que ela passou por <em>ambas</em> as fendas simultaneamente, como uma onda.
                </p>
                <p className="mt-2">
                  As ondas provenientes das duas fendas interagem entre si, criando <strong>Interferência</strong> (regiões construtivas e destrutivas). O padrão listrado na tela revela essa natureza ondulatória, mesmo atirando uma partícula de cada vez!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Core Concepts */}
        <div className="space-y-6">
           <div className="flex items-center gap-2 mb-2 text-slate-200">
            <BookOpen size={20} />
            <h3 className="font-bold">Conceitos Chave</h3>
          </div>
          
          <div className="grid gap-4">
            <details className="group bg-slate-800 rounded-lg p-3 cursor-pointer">
              <summary className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors list-none flex justify-between items-center">
                <span>Função de Onda (Ψ)</span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400">
                Descrição matemática do estado quântico. Não diz onde a partícula <em>está</em>, mas sim a <strong>probabilidade</strong> de encontrá-la em determinado lugar. Na simulação, a distribuição de onde as partículas caem representa o quadrado da função de onda (|Ψ|²).
              </p>
            </details>

            <details className="group bg-slate-800 rounded-lg p-3 cursor-pointer">
              <summary className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors list-none flex justify-between items-center">
                <span>Princípio da Superposição</span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400">
                Enquanto não observada, a partícula existe em uma superposição de estados (passando pela fenda A <strong>E</strong> pela fenda B). É essa superposição que permite a auto-interferência.
              </p>
            </details>

            <details className="group bg-slate-800 rounded-lg p-3 cursor-pointer">
              <summary className="font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors list-none flex justify-between items-center">
                <span>O Papel do Observador</span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400">
                Em quântica, "observar" não requer um humano consciente. Qualquer interação física irreversível que extraia informação do sistema (como um fóton batendo num elétron para detectá-lo) destrói a coerência quântica, eliminando a interferência.
              </p>
            </details>
          </div>

          <div className="flex items-start gap-3 text-xs text-amber-400 bg-amber-500/10 p-3 rounded border border-amber-500/20">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              Nota: Esta é uma simulação didática. As escalas de distância e comprimento de onda foram ajustadas para facilitar a visualização em uma tela pequena.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EducationalPanel;