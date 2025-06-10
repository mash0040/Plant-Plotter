'use client';
import { useState } from 'react';

export default function Input({ onSubmit }) {
  const [input, setInput] = useState('');

  const handleSubmit = () => {
    if (!input.trim()) return;
    onSubmit(input.trim());
    setInput('');
  };

  return (
    <div className="flex gap-2 mt-4 mb-6 w-1/4">
      <input
        type="text"
        className="border border-gray-300 px-3 py-2 rounded w-full h-10"
        placeholder="Enter plant name (e.g. Tomato)"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        onClick={handleSubmit}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 h-10"
      >
        Add
      </button>
    </div>
  );
}
