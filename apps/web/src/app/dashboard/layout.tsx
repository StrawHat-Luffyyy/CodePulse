import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-lg">⚡ CodePulse</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">Dashboard</span>
          <Link
            href="/signout"
            className="text-sm text-red-400 hover:text-red-300 transition-colors"
          >
            Sign out
          </Link>
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}