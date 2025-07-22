'use client';
import { useState } from 'react';
import PreferencesForm from '../preferences/PreferencesForm';

export default function ProfileForm({ user }) {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: submit logic
    console.log({ name, email });
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-green-800 p-6 rounded-lg shadow-md border border-green-700">
      <h2 className="text-2xl font-semibold text-white mb-4">Edit Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-green-200 text-sm mb-1">Name</label>
          <input
            type="text"
            className="w-full rounded-md px-3 py-2 bg-green-900 border border-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="block text-green-200 text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-md px-3 py-2 bg-green-900 border border-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-600 text-white py-2 rounded-md transition"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
}
