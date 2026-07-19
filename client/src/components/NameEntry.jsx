import React, { useState } from 'react';

/**
 * NameEntry Component
 * Collects a guest player's display name, enforces a 2-20 characters limit.
 * Designed to be embedded directly into the LandingPage card layout.
 * 
 * @param {object} props
 * @param {function} props.onSubmit Callback when a valid name is submitted
 */
export default function NameEntry({ onSubmit }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = name.trim();

    if (cleanName.length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }

    if (cleanName.length > 20) {
      setError('Name must be 20 characters or less.');
      return;
    }

    setError('');
    onSubmit(cleanName);
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-bold tracking-widest text-[#00C9A7] mb-2 uppercase text-center">
        Identify Seeker
      </h2>
      <p className="text-xs text-gray-400 mb-6 text-center">
        Enter your identity to enter the Lumina network.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5 text-left">
          <label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
            Seeker Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="Name (2-20 chars)..."
            maxLength={20}
            className="px-4 py-3 bg-[#0D1B2A]/90 border border-[#00C9A7]/40 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#F4A828] focus:ring-1 focus:ring-[#F4A828] transition-all duration-150 text-sm"
            autoFocus
          />
          {error && (
            <p className="text-[11px] text-[#E63946] font-semibold mt-1">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="py-3 px-6 bg-[#00C9A7] hover:bg-[#00C9A7]/80 text-[#0D0D0D] font-bold rounded-md uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-[0_4px_12px_rgba(0,201,167,0.3)] text-sm"
        >
          Register Identity
        </button>
      </form>
    </div>
  );
}
