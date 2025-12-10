import React, { useState } from 'react';
import { Activity, Globe, Zap, Search, AlertTriangle, Database, Cpu, Download, ChevronRight, ChevronLeft } from 'lucide-react';
import { AppSection, AsteroidData, MiningAnalysis, ThreatAssessment, ExoplanetCandidate } from './types';
import { analyzeAsteroidResources, assessThreat, analyzeExoplanetTic, fetchAsteroidData } from './services/gemini';
import { simulateLightCurve } from './services/physics';
import OrbitViz3D from './components/OrbitViz3D';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// --- FORMATTING UTILITY ---
const formatNumber = (value: number | string | undefined | null): string => {
  if (value === undefined || value === null) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return typeof value === 'string' ? value : '-';

  if (Math.abs(num) >= 1 || num === 0) {
    // Format with commas, max 2 decimal places, remove trailing zeros if integer-like
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  } else {
    // Small numbers: expand fully, no scientific notation
    // toFixed(20) provides enough precision for most physical constants we deal with here
    // regex strips trailing zeros after the decimal point
    return num.toFixed(20).replace(/\.?0+$/, "");
  }
};

// --- MOCK DATA FOR DEMO PURPOSES IF NO INPUT ---
const MOCK_ASTEROID: AsteroidData = {
  id: "3542519",
  name: "Apophis",
  designation: "99942",
  absolute_magnitude_h: 19.09,
  diameter_km_est_min: 0.29,
  diameter_km_est_max: 0.65,
  is_potentially_hazardous: true,
  close_approach_data: [{
    close_approach_date: "2029-04-13",
    relative_velocity: { kilometers_per_second: "7.43" },
    miss_distance: { astronomical: "0.00025", lunar: "0.1" },
    orbiting_body: "Earth"
  }],
  orbital_data: { a: 0.922, e: 0.191, i: 3.33, om: 204.4, w: 126.4, ma: 99.3, per: 323.5 }
};

// --- COMPONENTS MOVED OUTSIDE APP TO PREVENT RE-RENDERS ---

const StatCard = ({ label, value, unit, color = "text-white" }: any) => (
  <div className="bg-space-800 p-4 rounded-lg border border-space-700">
    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
    <div className={`text-2xl font-mono font-bold ${color}`}>
      {value} <span className="text-sm text-gray-400 font-normal">{unit}</span>
    </div>
  </div>
);

interface HeaderProps {
  section: AppSection;
  setSection: (s: AppSection) => void;
  hasApiKey: boolean;
}

const Header = ({ section, setSection, hasApiKey }: HeaderProps) => (
  <header className="sticky top-0 z-50 bg-space-900/80 backdrop-blur-md border-b border-space-700 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-space-accent/10 rounded-lg flex items-center justify-center border border-space-accent/20">
        <Globe className="text-space-accent w-6 h-6" />
      </div>
      <div>
        <h1 className="text-xl font-bold font-mono tracking-tight text-white">ASTROGUARD <span className="text-space-accent">SYSTEMS</span></h1>
        <p className="text-[10px] text-gray-400 tracking-widest uppercase">Planetary Defense & Resource Initiative</p>
      </div>
    </div>
    <nav className="hidden md:flex items-center gap-1 bg-space-800 p-1 rounded-lg border border-space-700">
      {[
        { id: AppSection.DASHBOARD, icon: Activity, label: 'Mission Control' },
        { id: AppSection.ASTEROID_ANALYSIS, icon: AlertTriangle, label: 'Threat & Mining' },
        { id: AppSection.EXOPLANET_PIPELINE, icon: Search, label: 'Exo-Discovery' },
        { id: AppSection.REPORTS, icon: Database, label: 'Reports' },
      ].map(item => (
        <button
          key={item.id}
          onClick={() => setSection(item.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            section === item.id 
              ? 'bg-space-600 text-white shadow-sm' 
              : 'text-gray-400 hover:text-white hover:bg-space-700'
          }`}
        >
          <item.icon size={16} />
          {item.label}
        </button>
      ))}
    </nav>
    <div className="flex items-center gap-4">
      { hasApiKey ? (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-green-400 font-mono">SYSTEM ONLINE</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-xs text-red-400 font-mono">API KEY MISSING</span>
        </div>
      )}
    </div>
  </header>
);

function App() {
  const [section, setSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [asteroidQuery, setAsteroidQuery] = useState('Apophis');
  const [asteroidData, setAsteroidData] = useState<AsteroidData | null>(null);
  const [miningData, setMiningData] = useState<MiningAnalysis | null>(null);
  const [threatData, setThreatData] = useState<ThreatAssessment | null>(null);
  
  const [ticQuery, setTicQuery] = useState('261136679'); // TIC ID for TOI 700
  const [exoplanetData, setExoplanetData] = useState<ExoplanetCandidate | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Handlers ---

  const handleFetchAsteroid = async () => {
    setLoading(true);
    setError(null);
    try {
      if(!process.env.API_KEY) throw new Error("Please set API_KEY");

      // Use the centralized service instead of inline fetching
      const data = await fetchAsteroidData(asteroidQuery);
      setAsteroidData(data);

      // Now run analyses
      const [mining, threat] = await Promise.all([
        analyzeAsteroidResources(data),
        assessThreat(data)
      ]);
      setMiningData(mining);
      setThreatData(threat);

    } catch (e) {
      console.error(e);
      setError("Failed to fetch asteroid data. Check API Key or try 'Apophis'.");
      if (asteroidQuery.toLowerCase().includes('apophis')) {
         setAsteroidData(MOCK_ASTEROID);
         const [mining, threat] = await Promise.all([
          analyzeAsteroidResources(MOCK_ASTEROID),
          assessThreat(MOCK_ASTEROID)
        ]);
        setMiningData(mining);
        setThreatData(threat);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFetchExoplanet = async () => {
    setLoading(true);
    try {
      const basicData = await analyzeExoplanetTic(ticQuery);
      // Simulate light curve based on parameters
      const lc = simulateLightCurve(basicData.period, basicData.transitDepth / 100, 2.5); // 2.5 hr duration approx
      setExoplanetData({ ...basicData, lightCurveData: lc });
    } catch (e) {
      console.error(e);
      setError("Exoplanet analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // --- Render Functions (Converted from nested components to avoid remounting issues) ---

  const renderAsteroidView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-space-800 p-6 rounded-xl border border-space-700">
           <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <Search className="text-space-accent" size={20} />
             Target Acquisition
           </h2>
           <div className="flex gap-2">
             <input 
               type="text" 
               value={asteroidQuery}
               onChange={(e) => setAsteroidQuery(e.target.value)}
               className="flex-1 bg-space-900 border border-space-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-space-accent font-mono"
               placeholder="Enter designation (e.g., Apophis, Bennu)"
             />
             <button 
               onClick={handleFetchAsteroid}
               disabled={loading}
               className="bg-space-accent hover:bg-cyan-400 text-space-900 font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
             >
               {loading ? <Activity className="animate-spin" /> : <Zap size={18} />}
               ANALYZE
             </button>
           </div>
        </div>
      </div>

      {asteroidData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Col: Visuals & Stats */}
          <div className="lg:col-span-2 space-y-6">
            <OrbitViz3D orbitalData={asteroidData.orbital_data} targetName={asteroidData.name} />
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <StatCard label="Est. Diameter" value={formatNumber(asteroidData.diameter_km_est_min)} unit="km" />
               <StatCard label="Abs. Magnitude" value={formatNumber(asteroidData.absolute_magnitude_h)} unit="H" />
               {/* Fixed: Added optional chaining to prevent crash if close_approach_data is undefined or empty */}
               <StatCard label="Relative Vel." value={formatNumber(asteroidData.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second)} unit="km/s" />
               <StatCard label="Period" value={formatNumber(asteroidData.orbital_data?.a ? asteroidData.orbital_data.a ** 1.5 * 365.25 : 0)} unit="days" />
            </div>

            <div className="bg-space-800 p-6 rounded-xl border border-space-700">
               <h3 className="text-md font-bold text-space-accent mb-4 font-mono">AI STRATEGIC ANALYSIS</h3>
               <div className="prose prose-invert max-w-none text-sm text-gray-300">
                 <p>{miningData?.scientificReasoning || "Analysis pending..."}</p>
               </div>
            </div>
          </div>

          {/* Right Col: Assessment Cards */}
          <div className="space-y-6">
            {/* Threat Level */}
            <div className={`p-6 rounded-xl border ${threatData?.threatLevel === 'High' || threatData?.threatLevel === 'Critical' ? 'bg-red-900/20 border-red-500/50' : 'bg-space-800 border-space-700'}`}>
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-white flex items-center gap-2">
                   <AlertTriangle className={threatData?.threatLevel === 'High' ? 'text-red-500' : 'text-yellow-500'} />
                   THREAT ASSESSMENT
                 </h3>
                 <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                   threatData?.threatLevel === 'None' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                 }`}>
                   LEVEL: {threatData?.threatLevel || 'CALCULATING'}
                 </span>
               </div>
               <div className="space-y-3 font-mono text-sm">
                 <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-gray-400">Torino Scale</span>
                   <span className="text-white">{formatNumber(threatData?.torinoScale)}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-gray-400">Palermo Scale</span>
                   <span className="text-white">{formatNumber(threatData?.palermoScale)}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-gray-400">Impact Prob.</span>
                   <span className="text-white">{formatNumber((threatData?.impactProbability ?? 0) * 100)}%</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-400">MOID (AU)</span>
                   <span className="text-white">{formatNumber(threatData?.moid)}</span>
                 </div>
               </div>
            </div>

            {/* Mining Assessment */}
            <div className="bg-space-800 p-6 rounded-xl border border-space-700">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-white flex items-center gap-2">
                   <Cpu className="text-space-accent" />
                   RESOURCE POTENTIAL
                 </h3>
                 <span className="text-xs text-space-accent font-mono">{miningData?.compositionType || 'Scanning...'}</span>
               </div>
               
               <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1 text-gray-400">
                    <span>FEASIBILITY SCORE</span>
                    <span>{formatNumber(miningData?.miningFeasibility || 0)}/100</span>
                  </div>
                  <div className="h-2 bg-space-900 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-space-accent transition-all duration-1000" 
                      style={{ width: `${miningData?.miningFeasibility || 0}%` }}
                    />
                  </div>
               </div>

               <div className="space-y-3 font-mono text-sm">
                 <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-gray-400">Est. Value</span>
                   <span className="text-green-400">${formatNumber(miningData?.estimatedValueUSD)}</span>
                 </div>
                 <div className="flex justify-between border-b border-white/10 pb-2">
                   <span className="text-gray-400">Delta-V Score</span>
                   <span className="text-white">{formatNumber(miningData?.accessibilityScore)}/100</span>
                 </div>
                 <div className="pt-2">
                   <span className="text-gray-400 block mb-2">Key Elements:</span>
                   <div className="flex flex-wrap gap-2">
                     {miningData?.resources.map(r => (
                       <span key={r} className="text-xs bg-space-700 px-2 py-1 rounded text-gray-300">{r}</span>
                     )) || <span className="text-xs text-gray-600">Analyzing spectra...</span>}
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderExoplanetView = () => (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-space-800 p-6 rounded-xl border border-space-700">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Globe className="text-purple-400" size={20} />
          Exoplanet Pipeline (TESS Data Stream)
        </h2>
        <div className="flex gap-2 max-w-xl">
            <input 
              type="text" 
              value={ticQuery}
              onChange={(e) => setTicQuery(e.target.value)}
              className="flex-1 bg-space-900 border border-space-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-mono"
              placeholder="Enter TIC ID (e.g., 261136679)"
            />
            <button 
              onClick={handleFetchExoplanet}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              {loading ? <Activity className="animate-spin" /> : <Search size={18} />}
              PIPELINE EXEC
            </button>
        </div>
      </div>

      {exoplanetData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-space-800 p-6 rounded-xl border border-space-700">
             <h3 className="text-sm font-bold text-gray-400 mb-4 font-mono uppercase">Phase-Folded Light Curve</h3>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <LineChart data={exoplanetData.lightCurveData}>
                   <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                   <XAxis dataKey="time" stroke="#666" label={{ value: 'Time (days)', position: 'insideBottom', offset: -5 }} />
                   <YAxis domain={['auto', 'auto']} stroke="#666" label={{ value: 'Norm. Flux', angle: -90, position: 'insideLeft' }} />
                   <RechartsTooltip 
                     contentStyle={{ backgroundColor: '#151725', borderColor: '#343A52', color: '#fff' }}
                     itemStyle={{ color: '#A855F7' }}
                   />
                   <Line type="monotone" dataKey="flux" stroke="#A855F7" dot={false} strokeWidth={2} />
                 </LineChart>
               </ResponsiveContainer>
             </div>
          </div>

          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <StatCard label="Orbital Period" value={formatNumber(exoplanetData.period)} unit="days" color="text-purple-400" />
                <StatCard label="Radius" value={formatNumber(exoplanetData.radius)} unit="R⊕" color="text-purple-400" />
                <StatCard label="Stellar Temp" value={formatNumber(exoplanetData.stellarTemp)} unit="K" color="text-orange-400" />
                <StatCard label="Transit Depth" value={formatNumber(exoplanetData.transitDepth)} unit="%" color="text-gray-300" />
             </div>

             <div className="bg-space-800 p-6 rounded-xl border border-space-700 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Globe size={100} />
                </div>
                <h3 className="font-bold text-white mb-2">HABITABILITY INDEX</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-4xl font-mono font-bold ${exoplanetData.habitabilityScore > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {formatNumber(exoplanetData.habitabilityScore)}
                  </span>
                  <span className="text-gray-500 mb-1">/ 100</span>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  {exoplanetData.isHabitableZone ? "Planet resides within the circumstellar habitable zone." : "Planet orbit falls outside the calculated habitable zone."}
                </p>
                <div className="text-xs text-gray-500 font-mono border-t border-white/10 pt-4">
                  {exoplanetData.notes}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderReportView = () => (
    <div className="max-w-4xl mx-auto bg-white text-black p-12 shadow-xl animate-fadeIn">
      <div className="border-b-2 border-black pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-mono">MISSION REPORT</h1>
          <p className="text-sm text-gray-600 mt-2">GENERATED BY ASTROGUARD SYSTEM</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-mono">{new Date().toLocaleDateString()}</div>
          <div className="text-sm font-mono">CONFIDENTIAL // SCIENTIFIC USE</div>
        </div>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2">1. TARGET SUMMARY</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
             <div className="bg-gray-100 p-4 rounded">
               <span className="block font-bold">Designation</span>
               {asteroidData ? `${asteroidData.name} (${asteroidData.designation})` : 'N/A'}
             </div>
             <div className="bg-gray-100 p-4 rounded">
               <span className="block font-bold">Analysis Timestamp</span>
               {new Date().toISOString()}
             </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2">2. THREAT ASSESSMENT</h2>
          {threatData ? (
             <div className="text-sm space-y-2">
               <p><span className="font-bold">Threat Level:</span> {threatData.threatLevel}</p>
               <p><span className="font-bold">Impact Probability:</span> {formatNumber(threatData.impactProbability * 100)}%</p>
               <p className="italic bg-red-50 p-4 rounded border-l-4 border-red-500 mt-4">{threatData.summary}</p>
             </div>
          ) : <p className="text-gray-500">No threat data loaded.</p>}
        </section>

        <section>
          <h2 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2">3. RESOURCE EVALUATION</h2>
          {miningData ? (
             <div className="text-sm space-y-2">
               <p><span className="font-bold">Type:</span> {miningData.compositionType}</p>
               <p><span className="font-bold">Est. Value:</span> ${formatNumber(miningData.estimatedValueUSD)}</p>
               <p className="mt-4">{miningData.scientificReasoning}</p>
             </div>
          ) : <p className="text-gray-500">No mining data loaded.</p>}
        </section>
      </div>

      <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500 font-mono">
        ASTROGUARD // MIT LICENSE // DO NOT DISTRIBUTE WITHOUT CLEARANCE
      </div>

      <div className="fixed bottom-8 right-8 print:hidden flex gap-4">
        <button 
          onClick={() => setSection(AppSection.DASHBOARD)}
          className="bg-gray-100 text-gray-900 px-6 py-3 rounded-full shadow-lg hover:bg-gray-200 border border-gray-300 transition-colors flex items-center gap-2 font-medium"
        >
          <ChevronLeft size={18} />
          Back to Dashboard
        </button>
        <button 
          onClick={handlePrint}
          className="bg-black text-white px-6 py-3 rounded-full shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
        >
          <Download size={18} />
          Print / Save PDF
        </button>
      </div>
    </div>
  );

  const renderLandingView = () => (
    <div className="text-center py-20 animate-fadeIn">
      <div className="inline-block p-4 rounded-full bg-space-800 mb-6 border border-space-600">
        <Globe size={48} className="text-space-accent animate-pulse" />
      </div>
      <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Planetary Defense & <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-space-accent to-purple-500">Extra-Solar Exploration</span></h2>
      <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg">
        A unified platform for asteroid threat assessment, resource feasibility analysis, and exoplanet candidate validation using advanced AI reasoning and NASA datasets.
      </p>
      
      <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
        <div 
          onClick={() => setSection(AppSection.ASTEROID_ANALYSIS)}
          className="bg-space-800 p-6 rounded-xl border border-space-700 hover:border-space-accent transition-colors cursor-pointer group"
        >
          <AlertTriangle className="text-red-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-xl font-bold text-white mb-2">Asteroid Defense</h3>
          <p className="text-sm text-gray-400">Real-time tracking of PHAs (Potentially Hazardous Asteroids) and impact risk analysis.</p>
          <div className="mt-4 flex items-center text-space-accent text-sm font-bold">
            LAUNCH MODULE <ChevronRight size={16} />
          </div>
        </div>

        <div 
           onClick={() => setSection(AppSection.ASTEROID_ANALYSIS)}
           className="bg-space-800 p-6 rounded-xl border border-space-700 hover:border-green-400 transition-colors cursor-pointer group"
        >
          <Cpu className="text-green-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-xl font-bold text-white mb-2">Resource Mining</h3>
          <p className="text-sm text-gray-400">Spectroscopic analysis and Delta-V calculations for in-situ resource utilization.</p>
          <div className="mt-4 flex items-center text-green-400 text-sm font-bold">
            LAUNCH MODULE <ChevronRight size={16} />
          </div>
        </div>

        <div 
           onClick={() => setSection(AppSection.EXOPLANET_PIPELINE)}
           className="bg-space-800 p-6 rounded-xl border border-space-700 hover:border-purple-400 transition-colors cursor-pointer group"
        >
          <Search className="text-purple-400 mb-4 group-hover:scale-110 transition-transform" size={32} />
          <h3 className="text-xl font-bold text-white mb-2">Exo-Discovery</h3>
          <p className="text-sm text-gray-400">TESS light curve pipeline analysis and habitability probability scoring.</p>
          <div className="mt-4 flex items-center text-purple-400 text-sm font-bold">
            LAUNCH MODULE <ChevronRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-space-900 text-gray-100 font-sans selection:bg-space-accent selection:text-space-900">
      {section !== AppSection.REPORTS && <Header section={section} setSection={setSection} hasApiKey={!!process.env.API_KEY} />}
      
      <main className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertTriangle size={20} />
            {error}
          </div>
        )}

        {section === AppSection.DASHBOARD && renderLandingView()}
        {section === AppSection.ASTEROID_ANALYSIS && renderAsteroidView()}
        {section === AppSection.EXOPLANET_PIPELINE && renderExoplanetView()}
        {section === AppSection.REPORTS && renderReportView()}
      </main>
      
      {section !== AppSection.REPORTS && (
        <footer className="border-t border-space-800 mt-20 py-8 text-center text-gray-600 text-sm">
          <p>Data provided by NASA NeoWs & Exoplanet Archive • Created by Namann Alwaikar</p>
        </footer>
      )}
    </div>
  );
}

export default App;