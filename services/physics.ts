import { OrbitalElements } from '../types';

export const calculateOrbitPath = (elements: OrbitalElements, points = 100): [number, number, number][] => {
  const path: [number, number, number][] = [];
  const { a, e, i, om, w } = elements;
  
  // Convert degrees to radians
  const d2r = Math.PI / 180;
  const iRad = i * d2r;
  const omRad = om * d2r;
  const wRad = w * d2r;

  for (let j = 0; j <= points; j++) {
    const E = (j / points) * 2 * Math.PI; // Eccentric anomaly (simplified for drawing ellipse)
    
    // Perifocal coordinates
    const P = a * (Math.cos(E) - e);
    const Q = a * Math.sqrt(1 - e * e) * Math.sin(E);

    // Rotate to Heliocentric Ecliptic coordinates
    const x = (Math.cos(wRad) * Math.cos(omRad) - Math.sin(wRad) * Math.sin(omRad) * Math.cos(iRad)) * P +
              (-Math.sin(wRad) * Math.cos(omRad) - Math.cos(wRad) * Math.sin(omRad) * Math.cos(iRad)) * Q;
              
    const y = (Math.cos(wRad) * Math.sin(omRad) + Math.sin(wRad) * Math.cos(omRad) * Math.cos(iRad)) * P +
              (-Math.sin(wRad) * Math.sin(omRad) + Math.cos(wRad) * Math.cos(omRad) * Math.cos(iRad)) * Q;
              
    const z = (Math.sin(wRad) * Math.sin(iRad)) * P +
              (Math.cos(wRad) * Math.sin(iRad)) * Q;

    // Scale down for visualization (1 AU = 10 units)
    const scale = 10;
    path.push([x * scale, z * scale, -y * scale]); // Swap Y/Z for Three.js coords (Y is up)
  }
  return path;
};

// Simplified simulator for Light Curves based on Transit Method
export const simulateLightCurve = (period: number, depth: number, durationHours: number): { time: number; flux: number }[] => {
  const data: { time: number; flux: number }[] = [];
  const totalPoints = 200;
  const durationDays = durationHours / 24;
  
  // Create a phase folded curve or time series
  // Let's do a time series for 2 periods
  const totalTime = period * 2;
  
  for (let i = 0; i < totalPoints; i++) {
    const time = (i / totalPoints) * totalTime;
    let flux = 1.0;
    
    // Transit occurs at period intervals, centered at 0.5 * period, 1.5 * period...
    const timeInPeriod = time % period;
    const transitCenter = period / 2;
    
    // Simple box-like transit with ingress/egress
    if (Math.abs(timeInPeriod - transitCenter) < (durationDays / 2)) {
      // Inside transit
      flux = 1.0 - depth;
      
      // Add simple V-shape noise/limb darkening approx (very rough)
      const distFromCenter = Math.abs(timeInPeriod - transitCenter);
      flux += (distFromCenter / (durationDays / 2)) * (depth * 0.1); 
    }
    
    // Add Gaussian noise
    flux += (Math.random() - 0.5) * 0.0005;
    
    data.push({ time, flux });
  }
  return data;
};