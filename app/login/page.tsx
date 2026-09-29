"use client";

import { useState } from 'react';
import { supabase } from '../supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      return;
    }

    // Redirect based on the test email you created
    if (email.includes('police') || email.includes('command')) {
      router.push('/command-center');
    } else {
      router.push('/lockdown');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white font-sans">
      <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center tracking-wider">BANTAY<span className="text-blue-500">PAARALAN</span></h1>
        
        {error && <p className="mb-4 text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900">{error}</p>}
        
        <div className="mb-4">
          <label className="block text-sm mb-2 text-gray-400">Authorized Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-white"
            required
          />
        </div>
        
        <div className="mb-8">
          <label className="block text-sm mb-2 text-gray-400">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-blue-500 text-white"
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded font-bold transition-colors uppercase tracking-widest text-sm"
        >
          Secure Login
        </button>
      </form>
    </div>
  );
}