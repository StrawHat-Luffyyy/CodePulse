"use client";

import { signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignOutPage() {
  const router = useRouter();

  function handleSignOut() {
    signOut({ callbackUrl: "/login" });
  }

  function handleCancel() {
    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 w-full max-w-md text-center">
        <div className="w-12 h-12 bg-red-600/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">👋</span>
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">Sign out?</h1>
        <p className="text-gray-400 text-sm mb-6">
          You will be redirected to the login page.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm text-gray-300 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
