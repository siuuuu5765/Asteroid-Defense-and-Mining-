export interface OrbitalElements {
  epoch?: number;
  e: number; // Eccentricity
  a: number; // Semi-major axis (AU)
  i: number; // Inclination (deg)
  om: number; // Longitude of Ascending Node (deg)
  w: number; // Argument of Perihelion (deg)
  ma: number; // Mean Anomaly (deg)
  n?: number; // Mean Motion
  per?: number; // Period
}

export interface AsteroidData {
  id: string;
  name: string;
  designation: string;
  absolute_magnitude_h: number;
  diameter_km_est_min: number;
  diameter_km_est_max: number;
  is_potentially_hazardous: boolean;
  close_approach_data: Array<{
    close_approach_date: string;
    relative_velocity: { kilometers_per_second: string };
    miss_distance: { astronomical: string; lunar: string };
    orbiting_body: string;
  }>;
  orbital_data: OrbitalElements;
}

export interface MiningAnalysis {
  compositionType: 'C-Type' | 'S-Type' | 'M-Type' | 'Unknown';
  estimatedValueUSD: number;
  accessibilityScore: number; // 0-100 based on Delta-V
  miningFeasibility: number; // 0-100
  resources: string[];
  scientificReasoning: string;
}

export interface ThreatAssessment {
  moid: number; // Minimum Orbit Intersection Distance
  torinoScale: number;
  palermoScale: number;
  impactProbability: number;
  threatLevel: 'None' | 'Low' | 'Medium' | 'High' | 'Critical';
  summary: string;
}

export interface ExoplanetCandidate {
  ticId: string;
  period: number; // days
  transitDepth: number; // ppm or percent
  radius: number; // Earth Radii
  stellarTemp: number; // Kelvin
  habitabilityScore: number; // 0-100
  isHabitableZone: boolean;
  notes: string;
  lightCurveData: Array<{ time: number; flux: number }>;
}

export enum AppSection {
  DASHBOARD = 'dashboard',
  ASTEROID_ANALYSIS = 'asteroid',
  EXOPLANET_PIPELINE = 'exoplanet',
  REPORTS = 'reports',
}