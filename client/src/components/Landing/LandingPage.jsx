import React from 'react';
import GlassPanel from './GlassPanel';
import TopBadge from './TopBadge';
import SettingsButtons from './SettingsButtons';
import LanguageSelector from './LanguageSelector';
import Footer from './Footer';
import PlayerNameInput from './PlayerNameInput';
import ColorPicker from './ColorPicker';
import PrimaryButton from './PrimaryButton';
import SecondaryButton from './SecondaryButton';

export default function LandingPage({ 
  playerName, 
  onNameChange, 
  selectedColorIndex, 
  onColorSelect, 
  onPlay, 
  onCreateRoom, 
  isJoining, 
  error 
}) {
  return (
    <div 
      className="min-h-[100dvh] w-full bg-black text-white flex flex-col items-center justify-center p-4 sm:p-8 font-sans bg-cover bg-center relative overflow-hidden" 
      style={{ backgroundImage: "url('/BGimg.png')" }}
    >
      {/* Background dark overlay for readability */}
      <div className="absolute inset-0 bg-[#020810]/40 mix-blend-multiply pointer-events-none" />

      {/* Floating particles effect (simulated with radial gradient) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.1)_0%,transparent_50%)] pointer-events-none animate-pulse duration-10000" />

      <TopBadge />
      <SettingsButtons />
      
      {/* Main Content Assembly */}
      <div className="w-full z-10 flex flex-col items-center justify-center animate-fade-in my-auto">
        
        {/* Title & Tagline */}
        <div className="text-center mb-8 relative z-10">
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-widest mb-3 bg-gradient-to-b from-white via-white to-[#a8b8d0] bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" style={{ fontFamily: 'Georgia, serif' }}>
            LUMINA
          </h1>
          <div className="flex items-center justify-center gap-2 md:gap-3 text-[9px] md:text-xs font-semibold tracking-[0.25em] text-cyan-500/80 text-center px-4">
            <span className="hidden sm:inline">◆</span>
            <span className="text-slate-300 drop-shadow-md">SEEK THE LIGHT. ESCAPE THE DARKNESS. <span className="text-cyan-400">TOGETHER.</span></span>
            <span className="hidden sm:inline">◆</span>
          </div>
        </div>

        {/* Central Glass Panel */}
        <GlassPanel>
          <PlayerNameInput 
            value={playerName} 
            onChange={onNameChange} 
          />
          
          <ColorPicker 
            selectedIndex={selectedColorIndex} 
            onSelect={onColorSelect} 
          />

          {error && (
            <div className="text-red-300 text-center text-xs font-semibold bg-red-900/30 p-2 rounded-lg border border-red-500/30 -mt-2">
              {error}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <PrimaryButton 
              onClick={onPlay} 
              disabled={isJoining} 
              loading={isJoining} 
            />
            <SecondaryButton 
              onClick={onCreateRoom} 
            />
          </div>
        </GlassPanel>

      </div>

      <LanguageSelector />
      <Footer />
    </div>
  );
}
