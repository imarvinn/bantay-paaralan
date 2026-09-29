"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';

export default function CommandCenter() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔒 SECURITY CHECK: Keep unauthorized users out of the Police Dashboard
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); 
      }
    };
    checkUser();
  }, [router]);

  // 🔊 Play Alert Sound for emergencies
  const playAlertSound = () => {
    const audio = new Audio('/alert-siren.mp3');
    audio.play().catch(e => console.log("Audio play blocked by browser:", e));
  };

  // 📡 Fetch initial data and listen for real-time changes
  useEffect(() => {
    // 1. Fetch current statuses on initial load
    const fetchInitialRooms = async () => {
      const { data, error } = await supabase
        .from('room_status')
        .select('*');
      if (data) setRooms(data);
      setLoading(false);
    };

    fetchInitialRooms();

    // 2. Subscribe to real-time database changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_status' },
        (payload) => {
          console.log('Real-time update received!', payload);
          
          // Update the specific room in the UI state
          setRooms((currentRooms) => {
            const roomExists = currentRooms.some(r => r.id === payload.new.id);
            if (roomExists) {
              return currentRooms.map(r => r.id === payload.new.id ? payload.new : r);
            } else {
              return [...currentRooms, payload.new];
            }
          });

          // Trigger siren for emergencies (breach or medical)
          if (payload.new.status === 'breach' || payload.new.status === 'medical') {
            playAlertSound();
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Helper to format the UI based on the room's current status
  const getStatusDetails = (status) => {
    switch (status) {
      case 'secure': 
        return { label: 'SECURE', bg: 'bg-green-900/50', border: 'border-green-600', text: 'text-green-400', pulse: '' };
      case 'medical': 
        return { label: 'MEDICAL NEEDED', bg: 'bg-yellow-900/50', border: 'border-yellow-600', text: 'text-yellow-400', pulse: 'animate-pulse' };
      case 'breach': 
        return { label: 'CODE RED: BREACH', bg: 'bg-red-900/50', border: 'border-red-600', text: 'text-red-400', pulse: 'animate-pulse' };
      default: 
        return { label: 'UNKNOWN', bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-400', pulse: '' };
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-950 text-white p-10 font-mono">Initializing Tactical Feed...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-blue-500">Talisay CDRRMO</h1>
          <h2 className="text-xl text-gray-400 mt-1">Tactical Command Center - Live Feed</h2>
        </div>
        <div className="text-sm font-mono text-gray-500 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
          SYSTEM: ONLINE | RLS: SECURE
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {rooms.length === 0 ? (
          <p className="text-gray-500 font-mono">No active room telemetry data available.</p>
        ) : (
          rooms.map((room) => {
            const { label, bg, border, text, pulse } = getStatusDetails(room.status);
            
            return (
              <div key={room.id} className={`p-6 rounded-lg border-2 ${bg} ${border} shadow-lg transition-colors duration-300`}>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">{room.id.replace('-', ' ')}</h3>
                <p className={`text-lg font-bold tracking-wider ${text} ${pulse}`}>
                  {label}
                </p>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                  <span className="text-xs text-gray-400 font-mono">Timestamp</span>
                  <span className="text-xs text-gray-300 font-mono">
                    {room.updated_at ? new Date(room.updated_at).toLocaleTimeString() : "Just now"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}