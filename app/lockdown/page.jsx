"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../supabase";

export default function QuickLock() {
  const [isDispatched, setIsDispatched] = useState(false);
  const [roomStatus, setRoomStatus] = useState(null);
  const [elapsedTime, setElapsedTime] = useState("00:00");
  const [isSending, setIsSending] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [myRoom, setMyRoom] = useState(null); 
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  // Chat States
  const [chatMessage, setChatMessage] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false); // 🆕 Added state for image upload loading
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null); // 🆕 Added ref for the hidden file input
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());

useEffect(() => {
  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  return () => clearInterval(timer);
}, []);
  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // 🔒 SECURITY CHECK & SYNC
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
        .select('id, needs_password_change, status, is_dispatched, updated_at, chat_history')
        .eq('assigned_email', userEmail)
        .single(); 

      if (data) {
        setMyRoom(data.id);
        setRoomStatus(data.status !== 'clear' ? data.status : null);
        setIsDispatched(data.is_dispatched || false);
        setLastUpdated(data.updated_at);
        setChatHistory(data.chat_history || []); 
        
        if (data.needs_password_change) {
          setNeedsPasswordChange(true);
        }

        const channel = supabase
          .channel(`room-updates-${data.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'room_status', filter: `id=eq.${data.id}` },
            (payload) => {
              if (payload.new.is_dispatched !== undefined) setIsDispatched(payload.new.is_dispatched);
              if (payload.new.updated_at) setLastUpdated(payload.new.updated_at); 
              if (payload.new.chat_history) setChatHistory(payload.new.chat_history);
              
              if (payload.new.status === 'clear' || payload.new.status === 'secure') {
                setRoomStatus(null);
                setIsDispatched(false);
                setElapsedTime("00:00");
                setChatHistory([]); 
              }
            }
          )
          .subscribe();

        return () => supabase.removeChannel(channel);
      } else {
        alert(`No room assigned to ${userEmail} yet.`);
      }
    };
    checkUserAndRoom();
  }, [router]);

  // ⏱️ TIMER ENGINE
  useEffect(() => {
    let interval;
    if (roomStatus && lastUpdated) {
      interval = setInterval(() => {
        const start = new Date(lastUpdated).getTime();
        const diffInSeconds = Math.floor((Date.now() - start) / 1000);
        if (diffInSeconds >= 0) {
          const mins = Math.floor(diffInSeconds / 60).toString().padStart(2, '0');
          const secs = (diffInSeconds % 60).toString().padStart(2, '0');
          setElapsedTime(`${mins}:${secs}`);
        }
      }, 1000);
    } else {
      setElapsedTime("00:00");
    }
    return () => clearInterval(interval);
  }, [roomStatus, lastUpdated]);

  const statuses = [
    { id: "secure", label: "SECURE: Locked, students ok", color: "bg-green-600 hover:bg-green-500", icon: "🟢" },
    { id: "medical", label: "MEDICAL NEEDED: Injury in room", color: "bg-yellow-600 hover:bg-yellow-500", icon: "🟡" },
    { id: "breach", label: "DANGER / BREACHED: Threat close", color: "bg-red-600 hover:bg-red-500", icon: "🔴" },
  ];

  const handleUpdateStatus = async (statusId) => {
    if (!myRoom) return;
    setIsSending(true);
    setRoomStatus(statusId);
    
    const { data: { session } } = await supabase.auth.getSession();
    
    const { error } = await supabase
      .from('room_status')
      .upsert({ 
        id: myRoom, 
        status: statusId,
        user_id: session?.user?.id,
        updated_at: new Date().toISOString() 
      });
      
    if (!error) {
      await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: myRoom.toUpperCase(), status: statusId }),
      });
    }
    setIsSending(false);
  };

  const handleSendSilentMessage = async () => {
    if (!chatMessage.trim() || !myRoom) return;
    setIsSendingChat(true);

    const newMessage = {
      sender: 'teacher',
      type: 'text', // 🆕 Added type identifier
      text: chatMessage,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...chatHistory, newMessage];

    const { error } = await supabase
      .from('room_status')
      .update({ chat_history: updatedHistory })
      .eq('id', myRoom);

    if (!error) setChatMessage(""); 
    setIsSendingChat(false);
  };

  // 📷 🆕 IMAGE UPLOAD FUNCTION
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !myRoom) return;

    setIsUploadingImage(true);
    
    // Create a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${myRoom}-${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('incident-photos')
      .upload(fileName, file);

    if (uploadError) {
      alert("Failed to upload image. Make sure you created the 'incident-photos' public bucket in Supabase Storage.");
      console.error(uploadError);
      setIsUploadingImage(false);
      return;
    }

    // Get the public URL of the uploaded image
    const { data: { publicUrl } } = supabase.storage
      .from('incident-photos')
      .getPublicUrl(fileName);

    // Add it to the chat history
    const newMessage = {
      sender: 'teacher',
      type: 'image',
      url: publicUrl,
      timestamp: new Date().toISOString()
    };

    const updatedHistory = [...chatHistory, newMessage];
    await supabase.from('room_status').update({ chat_history: updatedHistory }).eq('id', myRoom);

    setIsUploadingImage(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return alert("Password must be at least 6 characters.");
    setIsUpdatingPassword(true);

    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      alert("Failed to update: " + authError.message);
      setIsUpdatingPassword(false);
      return;
    }

    const { error: dbError } = await supabase.from('room_status').update({ needs_password_change: false }).eq('id', myRoom);
    if (!dbError) setNeedsPasswordChange(false); 
    setIsUpdatingPassword(false);
  };

  // UI RENDERING
  if (needsPasswordChange) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex justify-center items-center p-6 font-sans">
        <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-2">Security Required</h2>
          <p className="text-gray-400 mb-6 text-sm">Create a new private password before accessing the emergency system.</p>
          <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (min 6 chars)" className="w-full bg-gray-950 border border-gray-700 rounded p-3 text-white" required />
            <button type="submit" disabled={isUpdatingPassword} className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded">{isUpdatingPassword ? 'Updating...' : 'Save & Continue'}</button>
          </form>
        </div>
      </div>
    );
  }

  if (!myRoom) return <div className="min-h-screen bg-gray-950 text-white p-10">Authenticating Room...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans flex justify-center">
      <div className="w-full max-w-md bg-gray-900 border-x border-gray-800 shadow-2xl flex flex-col h-screen">
        
        {roomStatus ? (
          (() => {
            const active = statuses.find(s => s.id === roomStatus);
            const bgColors = { secure: "bg-green-700", medical: "bg-yellow-600 animate-pulse", breach: "bg-red-700 animate-pulse" };
            return (
              <div className={`${bgColors[roomStatus]} p-4 border-b-4 transition-colors`}>
                <h1 className="text-xl font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <span>{active?.icon}</span> {active?.label}
                </h1>
                <p className="text-white/90 text-sm mt-1 font-medium">Elapsed: {elapsedTime} min | {isDispatched ? " PNP DISPATCHED" : "⏳ Awaiting Command..."}</p>
              </div>
            );
          })()
        ) : (
          <div className="bg-gray-800 p-4 border-b-4 border-gray-700">
            <h1 className="text-xl font-bold uppercase text-gray-400 flex items-center gap-2">SYSTEM READY</h1>
            <p className="text-gray-500 text-sm mt-1">Tap a status below to alert Command.</p>
          </div>
        )}
{/* 🕒 LIVE DATE & TIME TICKER BANNER */}
        <div className="px-5 mt-4 mb-1">
          <div className="bg-gray-800/90 border border-gray-700 p-3 rounded-lg flex justify-between items-center font-mono shadow">
            <div>
              <span className="text-[9px] text-gray-400 block uppercase tracking-wider">Date</span>
              <span className="text-xs text-gray-200 font-bold">
                {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[9px] text-gray-400 block uppercase tracking-wider">Time</span>
              <span className="text-sm text-green-400 font-bold">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
        <div className="p-5 bg-gray-800/50 m-4 rounded-lg border border-gray-700 text-sm space-y-2 text-gray-200">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Protocol!</p>
          <p> Barricade Doors! • Lights Off & Silence Phones! • Stay Away from Windows!</p>
        </div>

        <div className="px-5 mb-4">
          <p className="text-gray-400 text-sm">YOUR LOCATION:</p>
          <div className="bg-gray-800 px-4 py-3 rounded-md mt-1 font-mono text-lg border border-gray-700 uppercase">{myRoom.replace('-', ' ')}</div>
        </div>

        <div className="flex-1 px-5 pb-8 overflow-y-auto">
          <div className="space-y-3 mb-6">
            {statuses.map((status) => (
              <button key={status.id} onClick={() => handleUpdateStatus(status.id)} className={`w-full text-left px-5 py-4 rounded-lg font-bold flex items-center gap-3 ${roomStatus === status.id ? `${status.color} ring-4 ring-white/20` : "bg-gray-800 text-gray-300"}`}>
                <span className="text-xl">{status.icon}</span> {status.label}
              </button>
            ))}
          </div>

          {/* 💬 HISTORY CHAT INTERFACE */}
          {roomStatus && roomStatus !== 'secure' && roomStatus !== 'clear' && (
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <h3 className="text-gray-300 font-bold mb-3 flex items-center gap-2"><span>💬</span> Secure Comms Log</h3>
              
              {/* Chat History Window */}
              <div className="h-48 overflow-y-auto bg-gray-950 border border-gray-800 rounded p-3 mb-3 flex flex-col gap-2">
                {chatHistory.length === 0 && <p className="text-gray-600 text-xs text-center mt-4">No messages yet.</p>}
                
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === 'teacher' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] text-gray-500 mb-1">
                      {msg.sender === 'teacher' ? 'You' : 'Command Center'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className={`px-3 py-2 rounded-lg text-sm max-w-[85%] ${msg.sender === 'teacher' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-green-700 text-white rounded-bl-none'}`}>
                      
                      {/* 🆕 THIS IS WHAT DISPLAYS THE UPLOADED IMAGE */}
                      {msg.type === 'image' ? (
                        <a href={msg.url} target="_blank" rel="noopener noreferrer">
                          <img src={msg.url} alt="Attached incident" className="rounded max-w-full h-auto border border-white/20" />
                        </a>
                      ) : (
                        msg.text
                      )}
                      
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Area */}
              <div className="flex gap-2 items-center">
                
                {/* 📷 Hidden file input and Camera Button */}
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" // Prioritizes the back camera on mobile phones
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                />
                <button
                  onClick={() => fileInputRef.current.click()}
                  disabled={isUploadingImage}
                  className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded flex items-center justify-center border border-gray-600 transition-colors disabled:opacity-50"
                  title="Send Photo"
                >
                  {isUploadingImage ? '⏳' : '📷'}
                </button>

                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendSilentMessage()}
                  placeholder="Type situation details..."
                  className="flex-1 bg-gray-800 text-white p-3 rounded border border-gray-600 text-sm"
                />
                <button
                  onClick={handleSendSilentMessage}
                  disabled={isSendingChat || !chatMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}