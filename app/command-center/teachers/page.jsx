"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabase';

export default function TeacherManagement() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [newRoom, setNewRoom] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [teacherEmail, setTeacherEmail] = useState('');
  
  // 🕒 Live Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // 🕒 LIVE CLOCK TICKER
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 🔒 SECURITY CHECK & INITIAL FETCH
  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login'); 
        return;
      }
      fetchRooms();
    };
    
    checkUserAndFetch();
  }, [router]);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('room_status')
      .select('*')
      .order('id', { ascending: true });
    
    if (data) setRooms(data);
    setLoading(false);
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.trim() || !teacherEmail.trim()) return;
    
    setIsSubmitting(true);
    const formattedId = newRoom.trim().toLowerCase().replace(/\s+/g, '-');

    const { error } = await supabase
      .from('room_status')
      .insert([{ 
        id: formattedId, 
        status: 'secure',
        assigned_email: teacherEmail.trim().toLowerCase() 
      }]);

    if (error) {
      console.error("Error adding room:", error);
      alert("Failed to add room. It might already exist.");
    } else {
      setNewRoom('');
      setTeacherEmail('');
      fetchRooms();
    }
    setIsSubmitting(false);
  };

  const handleDeleteRoom = async (roomId) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove ${roomId}?`);
    if (!confirmDelete) return;

    const { error } = await supabase
      .from('room_status')
      .delete()
      .match({ id: roomId });

    if (error) {
      console.error("Error deleting room:", error);
    } else {
      fetchRooms(); 
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white p-10 font-mono">Loading Database...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans">
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-blue-500">CDRRMO Admin</h1>
          <h2 className="text-xl text-gray-400 mt-1">Classroom Provisioning & Management</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* 🕒 LIVE CLOCK DISPLAY */}
          <div className="text-right bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg">
            <div className="text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-sm font-mono text-green-400 font-bold mt-0.5 flex items-center justify-end gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              {currentTime.toLocaleTimeString()}
            </div>
          </div>

          <button 
            onClick={() => router.push('/command-center')}
            className="bg-gray-800 hover:bg-gray-700 text-white py-2.5 px-4 rounded border border-gray-700 transition-colors h-fit text-sm font-bold"
          >
            ⬅ Back to Live Feed
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* ADD NEW ROOM PANEL */}
        <div className="col-span-1 bg-gray-900 p-6 rounded-lg border border-gray-800 h-fit">
          <h3 className="text-lg font-bold text-gray-300 mb-4 uppercase tracking-wider">➕ Provision New Room</h3>
          <form onSubmit={handleAddRoom} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Room Identifier (e.g. Room 101)</label>
              <input 
                type="text" 
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                placeholder="Enter room name..."
                className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Teacher's Assigned Email</label>
              <input 
                type="email" 
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="teacher@talisay.edu.ph"
                className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-700 hover:bg-blue-600 disabled:bg-blue-900 text-white font-bold py-3 rounded transition-colors"
            >
              {isSubmitting ? 'Provisioning...' : 'Add Classroom'}
            </button>
          </form>
        </div>

        {/* ACTIVE ROOMS LIST */}
        <div className="col-span-1 md:col-span-2 bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h3 className="text-lg font-bold text-gray-300 mb-4 uppercase tracking-wider">📋 Active Pilot Classrooms</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-sm">
                  <th className="pb-3 pl-2">Room ID</th>
                  <th className="pb-3">Current Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-gray-600 font-mono text-sm">
                      No classrooms provisioned yet.
                    </td>
                  </tr>
                ) : (
                  rooms.map((room) => (
                    <tr key={room.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-4 pl-2 font-mono text-gray-300">{room.id}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold tracking-wider ${room.status === 'secure' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2">
                        <button 
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-red-500 hover:text-red-400 text-sm font-bold bg-red-900/20 hover:bg-red-900/40 px-3 py-1 rounded transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}