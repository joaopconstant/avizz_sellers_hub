import { auth } from "@/server/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted-foreground">
        Bem-vindo, {session?.user?.name}!
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Role: <span className="font-medium">{session?.user?.role}</span>
      </p>
    </div>
  );
}
