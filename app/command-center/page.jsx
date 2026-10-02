"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabase';
import SirenAlert from '../components/SirenAlert';

export default function CommandCenter() {
  const router = useRouter();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedRoomId, setExpandedRoomId] = useState(null); // 🔍 Track expanded room for modal
  const [currentTime, setCurrentTime] = useState(new Date()); // 🕒 Live Clock State

  // 🕒 LIVE CLOCK TICKER
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) router.push('/login'); 
    };
    checkUser();
  }, [router]);

  useEffect(() => {
    const fetchInitialRooms = async () => {
      const { data } = await supabase.from('room_status').select('*');
      if (data) setRooms(data);
      setLoading(false);
    };
    fetchInitialRooms();

    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_status' }, (payload) => {
          setRooms((currentRooms) => {
            const exists = currentRooms.some(r => r.id === payload.new.id);
            return exists ? currentRooms.map(r => r.id === payload.new.id ? payload.new : r) : [...currentRooms, payload.new];
          });
      }).subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const getStatusDetails = (status) => {
    switch (status) {
      case 'secure': return { label: 'SECURE', bg: 'bg-green-900/50', border: 'border-green-600', text: 'text-green-400', pulse: '' };
      case 'medical': return { label: 'MEDICAL NEEDED', bg: 'bg-yellow-900/50', border: 'border-yellow-600', text: 'text-yellow-400', pulse: 'animate-pulse' };
      case 'breach': return { label: 'CODE RED: BREACH', bg: 'bg-red-900/50', border: 'border-red-600', text: 'text-red-400', pulse: 'animate-pulse' };
      default: return { label: 'UNKNOWN', bg: 'bg-gray-800', border: 'border-gray-700', text: 'text-gray-400', pulse: '' };
    }
  };

  const handleAllClear = async () => {
    if (!window.confirm("TACTICAL OVERRIDE: Declare ALL CLEAR?")) return;
    await supabase.from('room_status').update({ status: 'secure', is_dispatched: false, chat_history: [] }).neq('status', 'secure');
  };

  const isEmergencyActive = rooms.some(r => (r.status === 'breach' || r.status === 'medical') && !r.is_dispatched);

  const handleDispatchUnits = async (roomId) => {
    await supabase.from('room_status').update({ is_dispatched: true, updated_at: new Date().toISOString() }).eq('id', roomId);
  };

  const handleSendReply = async (roomId, currentHistory = []) => {
    const text = replyInputs[roomId];
    if (!text?.trim()) return;

    const newMessage = { sender: 'command', type: 'text', text: text, timestamp: new Date().toISOString() };
    const updatedHistory = [...(currentHistory || []), newMessage];

    const { error } = await supabase.from('room_status').update({ chat_history: updatedHistory }).eq('id', roomId);
    if (!error) setReplyInputs((prev) => ({ ...prev, [roomId]: '' })); 
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white p-10 font-mono">Initializing Tactical Feed...</div>;

  const expandedRoom = rooms.find(r => r.id === expandedRoomId);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 font-sans relative">
      <SirenAlert isEmergency={isEmergencyActive} />
      
      {/* HEADER WITH LIVE DATE, DAY, AND TIME */}
      <header className="mb-8 border-b border-gray-800 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-blue-500">Talisay CDRRMO</h1>
          <h2 className="text-xl text-gray-400 mt-1">Tactical Command Center - Live Feed</h2>
        </div>
        
        {/* 🕒 LIVE CLOCK DISPLAY */}
        <div className="text-right bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg">
          <div className="text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <div className="text-sm font-mono text-green-400 font-bold mt-0.5 flex items-center justify-end gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            {currentTime.toLocaleTimeString()} | SYSTEM ONLINE
          </div>
        </div>
      </header>

      {/* 🔍 EXPANDED CHAT MODAL OVERLAY */}
      {expandedRoom && (
        <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-xl p-6 shadow-2xl flex flex-col h-[80vh]">
            <div className="flex justify-between items-center border-b border-gray-800 pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold uppercase text-white">{expandedRoom.id.replace('-', ' ')} - Comms Log</h3>
                <span className="text-xs text-yellow-400 font-mono">{expandedRoom.status.toUpperCase()}</span>
              </div>
              <button 
                onClick={() => setExpandedRoomId(null)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm font-bold border border-gray-600"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-gray-950 border border-gray-800 rounded-lg p-4 mb-4 flex flex-col gap-3">
              {(expandedRoom.chat_history || []).length === 0 && (
                <p className="text-gray-500 text-center text-sm my-auto">No communication logs recorded for this room yet.</p>
              )}
              {(expandedRoom.chat_history || []).map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.sender === 'command' ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] text-gray-400 mb-1">
                    {msg.sender === 'command' ? 'Command Center' : 'Teacher'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div className={`p-3 rounded-lg max-w-[80%] text-sm ${msg.sender === 'command' ? 'bg-green-800 text-white' : 'bg-gray-800 text-blue-200 border border-gray-700'}`}>
                    {msg.type === 'image' ? (
                      <a href={msg.url} target="_blank" rel="noopener noreferrer">
                        <img src={msg.url} alt="Incident Report" className="rounded max-w-full h-auto max-h-96 object-contain border border-white/20 hover:opacity-90" />
                      </a>
                    ) : (
                      msg.text
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Type reply to classroom..."
                value={replyInputs[expandedRoom.id] || ""}
                onChange={(e) => setReplyInputs({ ...replyInputs, [expandedRoom.id]: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply(expandedRoom.id, expandedRoom.chat_history)}
                className="flex-1 bg-gray-800 text-white p-3 rounded-lg border border-gray-600 outline-none text-sm"
              />
              <button 
                onClick={() => handleSendReply(expandedRoom.id, expandedRoom.chat_history)} 
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 rounded-lg text-sm"
              >
                Send Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROOM CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {rooms.map((room) => {
          const { label, bg, border, text, pulse } = getStatusDetails(room.status);
          const history = room.chat_history || [];
          
          return (
            <div key={room.id} className={`p-6 rounded-lg border-2 ${bg} ${border} shadow-lg transition-colors flex flex-col justify-between`}>
              <div>
                <h3 className="text-2xl font-bold text-white mb-2 uppercase">{room.id.replace('-', ' ')}</h3>
                <p className={`text-lg font-bold tracking-wider ${text} ${pulse}`}>{label}</p>
              </div>
              
              {(room.status !== 'secure' && room.status !== 'clear') && (
                <div className="mt-4 bg-gray-950 p-3 rounded border border-gray-700 text-sm">
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-blue-400 font-bold">Comms Log:</span>
                    <button 
                      onClick={() => setExpandedRoomId(room.id)}
                      className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-0.5 rounded border border-gray-600 flex items-center gap-1 font-mono"
                      title="Enlarge Chat Room"
                    >
                      <span>⤢</span> Expand
                    </button>
                  </div>
                  
                  <div className="h-32 overflow-y-auto mb-3 bg-gray-900 border border-gray-800 p-2 rounded flex flex-col gap-2">
                    {history.length === 0 && <p className="text-xs text-gray-500 italic">No messages.</p>}
                    {history.map((msg, idx) => (
                      <div key={idx} className={msg.sender === 'command' ? 'text-right' : 'text-left'}>
                        <span className="text-[9px] text-gray-500 block">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                        <span className={`inline-block px-2 py-1 rounded text-xs ${msg.sender === 'command' ? 'bg-green-700 text-white' : 'bg-gray-700 text-blue-300'}`}>
                          {msg.type === 'image' ? (
                            <a href={msg.url} target="_blank" rel="noopener noreferrer">
                              <img src={msg.url} alt="Report" className="rounded max-w-full h-auto max-h-32 object-cover border border-gray-500 mt-1 cursor-pointer hover:opacity-80" />
                            </a>
                          ) : (
                            msg.text
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Reply..."
                      value={replyInputs[room.id] || ""}
                      onChange={(e) => setReplyInputs({ ...replyInputs, [room.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendReply(room.id, history)}
                      className="flex-1 bg-gray-800 text-white p-2 rounded border border-gray-600 outline-none text-xs"
                    />
                    <button onClick={() => handleSendReply(room.id, history)} className="bg-blue-700 hover:bg-blue-600 text-white font-bold px-3 rounded text-xs">
                      Send
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-4 pt-4 border-t border-white/10">
                {room.status !== 'secure' && room.status !== 'clear' && (
                  <div className="border-t border-white/10 pt-3">
                    {!room.is_dispatched ? (
                      <button onClick={() => handleDispatchUnits(room.id)} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-2 rounded">
                        Dispatch Units
                      </button>
                    ) : (
                      <div className="w-full text-center bg-gray-800 text-yellow-400 font-bold py-2 rounded border border-yellow-700/50">🚓 UNITS DISPATCHED</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-center mt-8 mb-8">
        <button onClick={handleAllClear} className="w-fit block mx-auto px-10 py-3 bg-blue-600 text-white font-bold rounded-lg">Declare All Clear</button>
      </div>
    </div>
  );
}