"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Pencil } from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/enums";
import type { UserItem } from "./user-modal";
import { ROLE_LABELS, ROLE_BADGE_CLASSES } from "@/lib/role-config";

// Dialog loaded on demand — not needed in the initial bundle
const UserModal = dynamic(
  () => import("./user-modal").then((m) => m.UserModal),
  { ssr: false },
);

interface UsersClientProps {
  currentUserId: string;
}

export function UsersClient({ currentUserId }: UsersClientProps) {
  const { data, isLoading, refetch } = api.users.list.useQuery();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const toggleActiveMutation = api.users.toggleActive.useMutation({
    onSuccess: () => {
      setToggleError(null);
      void refetch();
    },
    onError: (e) => setToggleError(e.message),
  });

  function openCreate() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditingUser(user);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Gestão de Usuários
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Cadastre e gerencie os membros da equipe
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5 shrink-0">
          + Novo Usuário
        </Button>
      </div>

      {/* Toggle error */}
      {toggleError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {toggleError}
        </div>
      ) : null}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Carregando usuários...</span>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                <th className="py-2.5 px-4 text-left">Usuário</th>
                <th className="py-2.5 px-4 text-left hidden sm:table-cell">
                  E-mail
                </th>
                <th className="py-2.5 px-4 text-center">Cargo</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(data as UserItem[]).map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-medium leading-tight">
                            {user.name}
                            {isSelf && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (você)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground hidden sm:table-cell">
                      {user.email}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        className={`text-xs border ${ROLE_BADGE_CLASSES[user.role]}`}
                        variant="outline"
                      >
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          if (!isSelf) {
                            setToggleError(null);
                            toggleActiveMutation.mutate({ userId: user.id });
                          }
                        }}
                        disabled={
                          isSelf || toggleActiveMutation.isPending
                        }
                        className="disabled:cursor-not-allowed"
                        title={
                          isSelf
                            ? "Você não pode desativar sua própria conta"
                            : undefined
                        }
                      >
                        <Badge
                          variant={user.is_active ? "default" : "secondary"}
                          className={`text-xs cursor-pointer hover:opacity-80 transition-opacity ${isSelf ? "cursor-not-allowed" : ""}`}
                        >
                          {user.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => openEdit(user)}
                          title="Editar cargo"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <UserModal
        key={editingUser?.id ?? "new"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void refetch();
        }}
        existing={editingUser}
        currentUserId={currentUserId}
      />
    </div>
  );
}
