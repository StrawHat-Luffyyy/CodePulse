import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="text-white">
      <h1 className="text-2xl font-bold mb-2">Welcome to CodePulse</h1>
      <p className="text-gray-400 mb-6">Your AI code review dashboard</p>

      {/* Show session data so you can verify OAuth worked */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 max-w-md space-y-3">
        <p className="text-gray-400 text-sm mb-2">Logged in as:</p>

        <div className="flex items-center gap-3">
          {session.user.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.image}
              alt={session.user.username ?? "avatar"}
              width={40}
              height={40}
              className="rounded-full"
            />
          )}
          <div>
            <p className="text-white font-medium">
              @{session.user.username ?? session.user.name}
            </p>
            <p className="text-gray-400 text-xs">
              GitHub ID: {session.user.githubId}
            </p>
          </div>
        </div>

        <pre className="text-green-400 text-xs overflow-auto">
          {JSON.stringify(session.user, null, 2)}
        </pre>
      </div>
    </div>
  );
}