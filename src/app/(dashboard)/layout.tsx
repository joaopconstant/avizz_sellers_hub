import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/shared/header";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { SidebarGoalsPanel } from "@/components/shared/sidebar-goals-panel";
import { TRPCReactProvider } from "@/trpc/react";
import type { UserRole } from "@/lib/generated/prisma/enums";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as UserRole;
  const showGoalsPanel = role !== "operational";

  return (
    <TRPCReactProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-60 flex-shrink-0 flex-col border-r bg-sidebar">
          {/* Logo */}
          <div className="flex h-14 items-center border-b px-4">
            <span className="text-lg font-bold text-sidebar-foreground">
              Avizz Hub
            </span>
          </div>

          {/* Navigation */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            <SidebarNav role={role} />

            {/* Mini-painel de metas */}
            {showGoalsPanel && (
              <div className="p-3">
                <SidebarGoalsPanel />
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </TRPCReactProvider>
  );
}
