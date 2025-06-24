'use client';
import AuthForm from '@/components/Login/AuthForm';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-green-50 dark:bg-neutral-900">
      <div className="w-full max-w-md p-8 bg-white dark:bg-neutral-800 rounded-xl shadow-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Welcome to PlantPlotter</h1>
        <AuthForm />
      </div>
    </main>
  );
}