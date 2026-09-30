"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function QuickLock() {
  const [roomStatus, setRoomStatus] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isSending, setIsSending] = useState(false);
  
  const [myRoom, setMyRoom] = useState(null); 
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  
  const router = useRouter();

  // 🔒 SECURITY CHECK & ROOM ASSIGNMENT
  useEffect(() => {
    const checkUserAndRoom = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); 
        return;
      }

      const userEmail = session.user.email;

      const { data, error } = await supabase
        .from('room_status')
        .select('id, needs_password_change')
        .eq('assigned_email', userEmail)
        .single(); 

      if (data) {
        setMyRoom(data.id);
        // Check if they need to change their password
        if (data.needs_password_change) {
          setNeedsPasswordChange(true);
        }
      } else {
        alert(`No room assigned to ${userEmail} yet. Contact CDRRMO.`);
      }
    };
    checkUserAndRoom();
  }, [router]);

  const statuses = [
    { id: "secure", label: "SECURE: Locked, students ok", color: "bg-green-600 hover:bg-green-500", icon: "🟢" },
    { id: "medical", label: "MEDICAL NEEDED: Injury in room", color: "bg-yellow-600 hover:bg-yellow-500", icon: "🟡" },
    { id: "breach", label: "DANGER / BREACHED: Threat close", color: "bg-red-600 hover:bg-red-500", icon: "🔴" },
  ];

  const handleUpdateStatus = async (statusId) => {
    if (!myRoom) return;
    setIsSending(true);
    setRoomStatus(statusId);
    
    const { error } = await supabase
      .from('room_status')
      .upsert({ id: myRoom, status: statusId });
      
    if (!error) {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: myRoom.toUpperCase(), status: statusId }),
      });
    }
    setIsSending(false);
  };

  // 🔐 HANDLE FORCED PASSWORD CHANGE
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    
    setIsUpdatingPassword(true);

    // 1. Update password in Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (authError) {
      alert("Failed to update password: " + authError.message);
      setIsUpdatingPassword(false);
      return;
    }

    // 2. Mark the flag as false in our database so they don't get asked again
    const { error: dbError } = await supabase
      .from('room_status')
      .update({ needs_password_change: false })
      .eq('id', myRoom);

    if (!dbError) {
      setNeedsPasswordChange(false); // Removes the screen and shows the dashboard!
    }
    setIsUpdatingPassword(false);
  };

  // 📺 UI 1: FORCED PASSWORD CHANGE SCREEN
  if (needsPasswordChange) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex justify-center items-center p-6 font-sans">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Security Required</h2>
          <p className="text-gray-400 mb-6 text-sm">
            You are currently using a default setup password. For security purposes, you must create a new private password before accessing the emergency system.
          </p>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 uppercase tracking-wider">New Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isUpdatingPassword}
              className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 text-white font-bold py-3 rounded transition-colors mt-2"
            >
              {isUpdatingPassword ? 'Updating Security...' : 'Save & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 📺 UI 2: THE MAIN LOCKDOWN DASHBOARD
  if (!myRoom) return <div className="min-h-screen bg-gray-950 text-white p-10">Authenticating Room...</div>;

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

        <div className="px-5 mb-4 flex justify-between items-end">
          <div>
            <p className="text-gray-400 text-sm">YOUR LOCATION:</p>
            <div className="bg-gray-800 px-4 py-3 rounded-md mt-1 font-mono text-lg border border-gray-700 uppercase flex items-center gap-3">
              {myRoom.replace('-', ' ')}
              {isSending && <span className="text-xs text-blue-400 animate-pulse">Sending...</span>}
            </div>
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
      </div>
    </div>
  );
}