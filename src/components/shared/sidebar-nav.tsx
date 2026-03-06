"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@/lib/generated/prisma/enums";

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["admin", "head", "closer", "sdr", "operational"],
  },
  {
    href: "/reports",
    label: "Relatórios",
    roles: ["admin", "head", "closer", "sdr"],
  },
  {
    href: "/rankings",
    label: "Ranking",
    roles: ["admin", "head", "closer", "sdr", "operational"],
  },
  {
    href: "/tools/roi",
    label: "Calculadora ROI",
    roles: ["admin", "head", "closer", "sdr", "operational"],
  },
  {
    href: "/tools/commission",
    label: "Simulador Comissão",
    roles: ["admin", "head", "closer", "sdr", "operational"],
  },
  {
    href: "/clients",
    label: "Clientes Ativos",
    roles: ["admin", "head", "operational"],
  },
  {
    href: "/management/goals",
    label: "Gestão de Metas",
    roles: ["admin", "head"],
  },
  {
    href: "/management/products",
    label: "Produtos",
    roles: ["admin"],
  },
  {
    href: "/management/users",
    label: "Usuários",
    roles: ["admin"],
  },
];

interface SidebarNavProps {
  role: UserRole;
}

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(role),
  );

  return (
    <nav className="flex-1 space-y-1 px-3 py-2">
      {visibleItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
