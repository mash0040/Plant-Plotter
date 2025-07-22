'use client';

import ProfileForm from './ProfileForm';

export default function Page() {
  const dummyUser = {
    name: 'John Doe',
    email: 'john@example.com',
    bio: 'Linguist, philosopher, and web developer.',
    avatarUrl: '/avatar-placeholder.png',
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Profile Settings</h1>
      <ProfileForm user={dummyUser} />
    </div>
  );
}
