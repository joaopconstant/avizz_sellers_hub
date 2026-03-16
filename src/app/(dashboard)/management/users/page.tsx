import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { UsersClient } from "@/components/users/users-client";

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return <UsersClient currentUserId={session.user.id} />;
}
