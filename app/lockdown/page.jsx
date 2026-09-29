"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function QuickLock() {
  const [roomStatus, setRoomStatus] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("02:45");
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  // 🔒 SECURITY CHECK: Kick unauthenticated users back to login
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); 
      }
    };
    checkUser();
  }, [router]);

  const statuses = [
    {
      id: "secure",
      label: "SECURE: Locked, 34 students ok",
      color: "bg-green-600 hover:bg-green-500",
      icon: "🟢",
    },
    {
      id: "medical",
      label: "MEDICAL NEEDED: Injury in room",
      color: "bg-yellow-600 hover:bg-yellow-500",
      icon: "🟡",
    },
    {
      id: "breach",
      label: "DANGER / BREACHED: Threat close",
      color: "bg-red-600 hover:bg-red-500",
      icon: "🔴",
    },
  ];

  const handleUpdateStatus = async (statusId) => {
    setIsSending(true);
    setRoomStatus(statusId);
    
    // This sends the update to your live Supabase database
    const { error } = await supabase
      .from('room_status')
      .upsert({ id: 'room-204', status: statusId });
      
    if (error) console.error("Error updating status:", JSON.stringify(error, null, 2));
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex justify-center">
      <div className="w-full max-w-md bg-gray-900 border-x border-gray-800 shadow-2xl flex flex-col h-screen">
        
        <div className="bg-red-700 p-4 border-b-4 border-red-900 animate-pulse">
          <h1 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <span>🔴</span> CODE RED: ACTIVE THREAT
          </h1>
          <p className="text-red-100 text-sm mt-1 font-medium">
            Elapsed: {elapsedTime} min | PNP Dispatched 🚓
          </p>
        </div>

        <div className="p-5 bg-gray-800/50 m-4 rounded-lg border border-gray-700">
          <h2 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">
            🤫 Protocol
          </h2>
          <ul className="text-sm space-y-2 font-medium text-gray-200">
            <li className="flex items-center gap-2"><span>🔒</span> BARRICADE DOORS</li>
            <li className="flex items-center gap-2"><span>💡</span> LIGHTS OFF / SILENCE PHONES</li>
            <li className="flex items-center gap-2"><span>🪟</span> STAY AWAY FROM WINDOWS</li>
          </ul>
        </div>

        <div className="px-5 mb-4">
          <p className="text-gray-400 text-sm">YOUR LOCATION:</p>
          <div className="bg-gray-800 px-4 py-3 rounded-md mt-1 font-mono text-lg border border-gray-700 flex justify-between">
            <span>Room 204 - Grade 10-A</span>
            {isSending && <span className="text-xs text-blue-400 animate-pulse">Sending...</span>}
          </div>
        </div>

        <div className="flex-1 px-5">
          <p className="text-gray-400 text-sm mb-3">TAP TO UPDATE STATUS (SILENT):</p>
          <div className="space-y-3">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => handleUpdateStatus(status.id)}
                className={`w-full text-left px-5 py-4 rounded-lg font-bold transition-all border border-transparent shadow-sm flex items-center gap-3 ${
                  roomStatus === status.id
                    ? `${status.color} ring-4 ring-white/20 scale-[1.02]`
                    : "bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300"
                }`}
              >
                <span className="text-xl">{status.icon}</span>
                {status.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-900 pb-8">
          <div className="text-xs text-center text-gray-500 mb-3 font-mono">
            Campus Roll-Call: [28 Secure | 1 Injured | 1 Threat]
          </div>
          <button className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
            <span>💬</span> Silent Text to Command / PNP
          </button>
        </div>
        
      </div>
    </div>
  );
}