export interface SimulationConfig {
  wavelength: number; // 300 to 700 (nm roughly mapped to pixels)
  slitDistance: number; // distance between slits
  observerActive: boolean;
  emissionRate: number; // particles per frame
  showWaves: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number; // Pre-calculated landing position based on probability
  color: string;
  phase: 'source-to-slit' | 'slit-to-screen' | 'landed';
  originSlit?: 'top' | 'bottom'; // Which slit it passed through (only known if observer active)
  twinId: any
}

export interface HistogramData {
  position: number;
  count: number;
  theoretical?: number;
}