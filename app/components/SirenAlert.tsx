"use client";

import { useEffect, useRef, useState } from "react";

export default function SirenAlert({ isEmergency }: { isEmergency: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Initialize audio object on mount
  useEffect(() => {
    audioRef.current = new Audio("/alert-siren.mp3");
    audioRef.current.loop = true;
  }, []);

  // 🔓 THE FIX: Unlock the audio directly inside the physical click event
  const handleAcknowledge = () => {
    setAudioEnabled(true);
    
    if (audioRef.current) {
      // Force the browser to approve the audio by playing it immediately during the click
      audioRef.current.play().then(() => {
        // If there is no active emergency right now, immediately pause it again
        if (!isEmergency) {
          audioRef.current?.pause();
          if (audioRef.current) audioRef.current.currentTime = 0;
        }
      }).catch(err => console.error("Audio unlock failed:", err));
    }
  };

  // Watch for emergency state changes after audio is unlocked
  useEffect(() => {
    if (!audioRef.current || !audioEnabled) return;

    if (isEmergency) {
      audioRef.current.play().catch((err) => console.error("Autoplay blocked:", err));
    } else {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [isEmergency, audioEnabled]);

  if (!audioEnabled) {
    return (
      <div className="fixed top-0 left-0 w-full h-full bg-black/80 z-50 flex items-center justify-center">
        <div className="bg-gray-900 p-8 rounded-lg text-center border border-red-500 shadow-2xl shadow-red-900/50">
          <h2 className="text-2xl font-bold mb-4 text-white uppercase tracking-wider">System Audio Disabled</h2>
          <p className="text-gray-400 mb-6">Tactical Command requires audio enabled to broadcast emergency sirens.</p>
          <button 
            onClick={handleAcknowledge}
            className="bg-red-600 text-white px-8 py-4 rounded font-bold hover:bg-red-700 w-full transition-colors text-lg uppercase tracking-wide"
          >
            Acknowledge & Enable Audio
          </button>
        </div>
      </div>
    );
  }

  return null;
}