import { auth, signOut } from "@/server/auth";
import Image from "next/image";

export async function Header() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background px-4 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">
        Avizz Hub
      </div>

      <div className="flex items-center gap-3">
        {user?.image && (
          <Image
            src={user.image}
            alt={user.name ?? "Avatar"}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="text-sm font-medium">{user?.name}</span>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
