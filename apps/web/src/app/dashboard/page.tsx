import { getServerSession } from 'next-auth'

export default async function DashboardPage() {
  const session = await getServerSession()

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-2">Welcome to CodePulse</h1>
      <p className="text-gray-400 mb-6">Your AI code review dashboard</p>

      {/* Show session data so you can verify OAuth worked */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 max-w-md">
        <p className="text-gray-400 text-sm mb-2">Logged in as:</p>
        <pre className="text-green-400 text-sm">
          {JSON.stringify(session?.user, null, 2)}
        </pre>
      </div>
    </div>
  )
}