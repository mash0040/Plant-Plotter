'use client';
import { useState } from 'react';

export default function PreferencesForm({ preferences }) {
  const [language, setLanguage] = useState(preferences?.language || 'en');
  const [theme, setTheme] = useState(preferences?.theme || 'dark');

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Save preferences
    console.log({ language, theme });
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-green-800 p-6 rounded-lg shadow-md border border-green-700">
      <h2 className="text-2xl font-semibold text-white mb-4">Preferences</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-green-200 text-sm mb-1">Language</label>
          <select
            className="w-full rounded-md px-3 py-2 bg-green-900 border border-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="fr">French</option>
          </select>
        </div>
        <div>
          <label className="block text-green-200 text-sm mb-1">Theme</label>
          <select
            className="w-full rounded-md px-3 py-2 bg-green-900 border border-green-700 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-green-700 hover:bg-green-600 text-white py-2 rounded-md transition"
        >
          Save Preferences
        </button>
      </form>
    </div>
  );
}
