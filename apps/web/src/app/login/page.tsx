"use client";
import { signIn } from "next-auth/react";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg" />
          <h1 className="text-xl font-semibold text-white">CodePulse</h1>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
        <p className="text-gray-400 mb-8">
          Sign in to review your pull requests with AI
        </p>
        <Button
          className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600"
          onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
        >
          <GitHubLogoIcon className="w-4 h-4 mr-2" />
          Continue with GitHub
        </Button>
      </div>
    </div>
  );
}
