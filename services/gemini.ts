import { GoogleGenAI, Type } from '@google/genai';
import { AsteroidData, MiningAnalysis, ThreatAssessment, ExoplanetCandidate } from '../types';

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const fetchAsteroidData = async (query: string): Promise<AsteroidData> => {
  try {
    const ai = getAI();
    const model = "gemini-2.5-flash";

    const prompt = `Generate a valid JSON object matching the 'AsteroidData' interface for asteroid named "${query}". 
      Use real orbital elements (a, e, i, om, w, ma) if known, otherwise approximate. 

      CRITICAL REQUIREMENTS:
      1. You MUST provide numerical estimates for 'absolute_magnitude_h', 'diameter_km_est_min', and 'diameter_km_est_max'. If unknown, calculate/estimate based on standard type.
      2. You MUST include at least one entry in 'close_approach_data' with a valid 'relative_velocity' and 'miss_distance'. Do not return an empty array.
      
      Interface: { id, name, designation, absolute_magnitude_h, diameter_km_est_min, diameter_km_est_max, is_potentially_hazardous, orbital_data: {a, e, i, om, w, ma}, close_approach_data: [{close_approach_date, relative_velocity: {kilometers_per_second}, miss_distance: {astronomical}}] }`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            designation: { type: Type.STRING },
            absolute_magnitude_h: { type: Type.NUMBER },
            diameter_km_est_min: { type: Type.NUMBER },
            diameter_km_est_max: { type: Type.NUMBER },
            is_potentially_hazardous: { type: Type.BOOLEAN },
            close_approach_data: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  close_approach_date: { type: Type.STRING },
                  relative_velocity: {
                    type: Type.OBJECT,
                    properties: { kilometers_per_second: { type: Type.STRING } }
                  },
                  miss_distance: {
                    type: Type.OBJECT,
                    properties: { astronomical: { type: Type.STRING }, lunar: { type: Type.STRING } }
                  },
                  orbiting_body: { type: Type.STRING }
                }
              }
            },
            orbital_data: {
              type: Type.OBJECT,
              properties: {
                a: { type: Type.NUMBER },
                e: { type: Type.NUMBER },
                i: { type: Type.NUMBER },
                om: { type: Type.NUMBER },
                w: { type: Type.NUMBER },
                ma: { type: Type.NUMBER },
                per: { type: Type.NUMBER }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}') as AsteroidData;
  } catch (error) {
    console.error("Asteroid fetch failed:", error);
    throw error;
  }
};

export const analyzeAsteroidResources = async (data: AsteroidData): Promise<MiningAnalysis> => {
  try {
    const ai = getAI();
    const model = "gemini-2.5-flash";
    
    const prompt = `
      Analyze the following asteroid data and provide a scientific assessment of its mining feasibility and composition.
      Asteroid: ${data.name} (Designation: ${data.designation})
      Absolute Magnitude (H): ${data.absolute_magnitude_h}
      Estimated Diameter (max): ${data.diameter_km_est_max} km
      Orbital Elements: Semi-major axis (a)=${data.orbital_data.a} AU, Eccentricity (e)=${data.orbital_data.e}, Inclination (i)=${data.orbital_data.i} deg.
      
      Infer the likely spectral type (C, S, or M) based on its orbital population (e.g., NEO vs Main Belt) and diameter.
      Estimate the potential economic value in USD (order of magnitude).
      Calculate a heuristic "Accessibility Score" (0-100) based on how difficult it is to reach (delta-v proxy: low inclination and eccentricity is better).
      Calculate a "Mining Feasibility Score" (0-100) combining value and accessibility.
      Provide a concise scientific reasoning paragraph.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            compositionType: { type: Type.STRING, enum: ["C-Type", "S-Type", "M-Type", "Unknown"] },
            estimatedValueUSD: { type: Type.NUMBER },
            accessibilityScore: { type: Type.NUMBER },
            miningFeasibility: { type: Type.NUMBER },
            resources: { type: Type.ARRAY, items: { type: Type.STRING } },
            scientificReasoning: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}') as MiningAnalysis;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    // Fallback mock
    return {
      compositionType: 'Unknown',
      estimatedValueUSD: 0,
      accessibilityScore: 0,
      miningFeasibility: 0,
      resources: [],
      scientificReasoning: "AI analysis unavailable. Please check API key."
    };
  }
};

export const assessThreat = async (data: AsteroidData): Promise<ThreatAssessment> => {
  try {
    const ai = getAI();
    const model = "gemini-2.5-flash";

    const prompt = `
      Perform a planetary defense threat assessment for asteroid ${data.name}.
      Is Potentially Hazardous: ${data.is_potentially_hazardous}
      Closest Approach: ${JSON.stringify(data.close_approach_data?.[0] || {})}
      Orbit: a=${data.orbital_data.a}, e=${data.orbital_data.e}, i=${data.orbital_data.i}.
      
      Estimate Torino and Palermo scales (assume 0 if no impact predicted).
      Provide a probability of impact (0-1).
      Determine threat level.
      Write a brief defense analyst summary.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moid: { type: Type.NUMBER },
            torinoScale: { type: Type.NUMBER },
            palermoScale: { type: Type.NUMBER },
            impactProbability: { type: Type.NUMBER },
            threatLevel: { type: Type.STRING, enum: ['None', 'Low', 'Medium', 'High', 'Critical'] },
            summary: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}') as ThreatAssessment;
  } catch (error) {
    console.error("Threat assessment failed", error);
    return {
      moid: 0,
      torinoScale: 0,
      palermoScale: -2,
      impactProbability: 0,
      threatLevel: 'None',
      summary: "Assessment unavailable."
    };
  }
};

export const analyzeExoplanetTic = async (ticId: string): Promise<Omit<ExoplanetCandidate, 'lightCurveData'>> => {
  try {
    const ai = getAI();
    const model = "gemini-2.5-flash";

    const prompt = `
      Analyze TESS Input Catalog (TIC) ID: ${ticId}.
      If this is a known exoplanet or candidate, retrieve its parameters.
      If it is a hypothetical ID, simulate plausible parameters for a transiting exoplanet system (e.g., a Hot Jupiter or Super Earth).
      
      Return:
      - Orbital Period (days)
      - Transit Depth (percent, e.g., 1.2 for 1.2%)
      - Planet Radius (Earth radii)
      - Stellar Temperature (Kelvin)
      - Habitability Score (0-100)
      - Is in Habitable Zone?
      - Scientific notes explaining the classification.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            ticId: { type: Type.STRING },
            period: { type: Type.NUMBER },
            transitDepth: { type: Type.NUMBER },
            radius: { type: Type.NUMBER },
            stellarTemp: { type: Type.NUMBER },
            habitabilityScore: { type: Type.NUMBER },
            isHabitableZone: { type: Type.BOOLEAN },
            notes: { type: Type.STRING }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Exoplanet analysis failed", error);
    return {
      ticId,
      period: 3.5,
      transitDepth: 1.2,
      radius: 1.4,
      stellarTemp: 5200,
      habitabilityScore: 45,
      isHabitableZone: false,
      notes: "Simulation fallback active."
    };
  }
};