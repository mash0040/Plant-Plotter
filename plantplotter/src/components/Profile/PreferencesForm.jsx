'use client';
import { Settings, Info } from 'lucide-react';

// Preferences UI is intentionally placeholder-only for the deployment.
// Each setting in the previous form was either decorative (no app behavior wired
// to it) or duplicated something already controlled per-garden/per-planner.
// Showing fake toggles + a "Saved successfully" message would mislead users,
// so this page now lists what's coming and where today's controls actually live.
const upcomingSettings = [
  { name: 'Language', note: 'App is currently English-only.' },
  { name: 'Theme', note: 'Light theme is the only fully styled mode today.' },
  { name: 'Email notifications', note: 'No email delivery is configured yet.' },
  { name: 'Garden reminders', note: 'Reminders will arrive with the notifications system.' },
  { name: 'Weather alerts', note: 'Weather currently uses a fixed location and rule-based advice.' },
  { name: 'Default units (m / ft)', note: 'Pick units per garden in the Garden form.' },
  { name: 'Public profile / Share gardens', note: 'Sharing is not part of this release.' }
];

const inAppToday = [
  { label: 'Garden units (m / ft)', where: 'Garden create/edit form' },
  { label: 'Planner grid & zoom', where: 'Planner toolbar (visual only, not stored)' },
  { label: 'Save planner changes', where: 'Explicit "Save Changes" button in the planner' }
];

export default function PreferencesForm() {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <Settings className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Preferences</h2>
          <p className="text-sm text-gray-500">Account-wide settings for PlantPlotter</p>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-900">
            Account-level preferences are coming soon.
          </p>
          <p className="text-sm text-amber-800 mt-1">
            We removed toggles that didn&apos;t change anything yet so the app stops claiming changes
            were saved when they weren&apos;t. Today the planner and garden forms hold the controls
            that actually affect the app.
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Where settings live today</h3>
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-gray-50">
          {inAppToday.map((item) => (
            <li key={item.label} className="flex justify-between gap-4 px-4 py-3 text-sm">
              <span className="font-medium text-gray-800">{item.label}</span>
              <span className="text-gray-500">{item.where}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Planned for a future release</h3>
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {upcomingSettings.map((item) => (
            <li key={item.name} className="px-4 py-3 text-sm">
              <div className="font-medium text-gray-800">{item.name}</div>
              <div className="text-gray-500 mt-0.5">{item.note}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
