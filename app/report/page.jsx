"use client";

import React, { useState } from "react";

export default function SumbongSafe() {
  const [step, setStep] = useState(1);
  const [trackingKey, setTrackingKey] = useState("");

  const handleQuickExit = () => {
    window.location.replace("https://www.google.com");
  };

  // If using TypeScript (.tsx), change this line to: 
  // const handleSubmit = (e: React.FormEvent) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const generatedKey = `BP-${Math.floor(1000 + Math.random() * 9000)}-TAL`;
    setTrackingKey(generatedKey);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex justify-center">
      <div className="w-full max-w-md bg-white shadow-xl flex flex-col h-screen relative">
        
        <div className="bg-slate-800 p-4 flex justify-between items-center">
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <span>🛡️</span> BantayPaaralan
          </h1>
          <button 
            onClick={handleQuickExit}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-bold shadow"
          >
            ✖ QUICK EXIT
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded text-sm">
                <p className="font-bold text-red-800">⚠️ ACTIVE ATTACK?</p>
                <p className="text-red-700 mt-1">If there is gunfire or immediate danger right now, do not use this form.</p>
                <a href="tel:911" className="block text-center mt-3 bg-red-600 text-white font-bold py-2 rounded">
                  🚨 CALL 911 (FREE)
                </a>
              </div>

              <div>
                <h2 className="font-bold text-xl mb-1">Ligtas at Anonymous</h2>
                <p className="text-sm text-gray-600">No name required. Your IP address is hidden. Select an incident category to begin.</p>
              </div>

              <div className="space-y-3">
                {[
                  { icon: "🔫", label: "Weapon / Gun Sighted on Campus" },
                  { icon: "💬", label: 'Threats to "Shoot Up" / Attack' },
                  { icon: "🏠", label: "Unsecured Firearm at Home" },
                  { icon: "💔", label: "Severe Bullying / Self-Harm" },
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setStep(2)}
                    className="w-full text-left bg-white border border-gray-300 hover:border-slate-500 p-4 rounded shadow-sm flex items-center gap-3 transition-all"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="font-semibold text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-slate-500 font-semibold mb-2"
              >
                ← Back to categories
              </button>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Target Campus:</label>
                <select required className="w-full border border-gray-300 p-3 rounded bg-white">
                  <option value="">Select a school...</option>
                  <option value="talisay-national">Talisay National High School</option>
                  <option value="rafael-lacson">Rafael B. Lacson Memorial</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">What did you see or hear?</label>
                <textarea 
                  required
                  rows={4} 
                  placeholder="Describe the threat. You can use Tagalog, Hiligaynon, or English..."
                  className="w-full border border-gray-300 p-3 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Attach Proof (Optional):</label>
                <div className="border-2 border-dashed border-gray-300 p-4 rounded text-center bg-gray-50 text-sm text-gray-500">
                  📁 Tap to upload screenshot/photo
                  <p className="text-xs mt-1">Location data is automatically scrubbed.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="urgent" className="w-4 h-4 text-slate-800" />
                <label htmlFor="urgent" className="text-sm font-bold text-red-600">Flag as High Priority / Urgent</label>
              </div>

              <button type="submit" className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-4 rounded shadow-lg mt-6">
                SUBMIT ANONYMOUS REPORT
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 pt-10">
              <div className="text-5xl">✅</div>
              <h2 className="text-2xl font-bold text-slate-800">Report Sent</h2>
              
              <p className="text-sm text-gray-600 px-4">
                Your identity is protected. Use this secret key to check the status or chat with guidance counselors. 
                <strong className="block text-red-600 mt-2">If you lose this key, you cannot recover this report.</strong>
              </p>

              <div className="bg-slate-100 border border-slate-300 p-4 rounded mx-4">
                <p className="text-xs text-slate-500 uppercase font-bold mb-1">Your Secret Key:</p>
                <p className="font-mono text-xl font-bold tracking-widest text-slate-800">{trackingKey}</p>
              </div>

              <div className="space-y-3 px-4 pt-4">
                <button 
                  type="button"
                  className="w-full bg-slate-800 text-white font-bold py-3 rounded"
                >
                  📋 COPY KEY
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded"
                >
                  CLEAR AND CLOSE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}