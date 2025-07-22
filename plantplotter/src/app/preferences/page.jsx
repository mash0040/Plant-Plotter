// src/app/profile/page.jsx
import PreferencesForm from './PreferencesForm';

export default function ProfilePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-2xl font-bold text-green-700">Profile Settings</h1>
      <PreferencesForm />
    </div>
  );
}
