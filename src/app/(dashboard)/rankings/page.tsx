import { auth } from "@/server/auth";
import { redirect } from "next/navigation";
import { RankingsClient } from "./rankings-client";

export default async function RankingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <RankingsClient />;
}
