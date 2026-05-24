export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-lg">⚡ CodePulse</span>
        <span className="text-gray-400 text-sm">Dashboard</span>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  )
}