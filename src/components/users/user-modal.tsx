"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/role-config";

export type UserItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  avatar_url: string | null;
  created_at: Date;
};

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  existing: UserItem | null;
  currentUserId: string;
}

export function UserModal({
  open,
  onClose,
  onSaved,
  existing,
  currentUserId,
}: UserModalProps) {
  const [name, setName] = useState(() => existing?.name ?? "");
  const [email, setEmail] = useState(() => existing?.email ?? "");
  const [role, setRole] = useState<UserRole>(() => existing?.role ?? "closer");
  const [error, setError] = useState("");

  const createMutation = api.users.create.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });

  const updateRoleMutation = api.users.updateRole.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });

  const isLoading = createMutation.isPending || updateRoleMutation.isPending;
  const isSelf = existing?.id === currentUserId;

  function handleSubmit() {
    setError("");
    if (existing) {
      updateRoleMutation.mutate({ userId: existing.id, role });
    } else {
      if (!name.trim()) {
        setError("Nome é obrigatório.");
        return;
      }
      if (!email.trim()) {
        setError("E-mail é obrigatório.");
        return;
      }
      createMutation.mutate({ name: name.trim(), email: email.trim(), role });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Editar Usuário" : "Novo Usuário"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isSelf && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs">
                Você está editando sua própria conta. Remover o cargo de admin
                irá revogar seu acesso de administrador.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="user-name">Nome</Label>
            <Input
              id="user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              disabled={!!existing}
            />
            {existing && (
              <p className="text-xs text-muted-foreground">
                Nome não pode ser alterado (vinculado ao Google OAuth)
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-email">E-mail</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@avizz.com.br"
              disabled={!!existing}
            />
            {existing && (
              <p className="text-xs text-muted-foreground">
                E-mail não pode ser alterado (identidade Google OAuth)
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="user-role">Cargo</Label>
            <select
              id="user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Salvando..." : existing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
