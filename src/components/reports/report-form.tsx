"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { api } from "@/trpc/react";
import type { UserRole } from "@/lib/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { RegisterSaleModal } from "@/components/sales/register-sale-modal";
import { AdvanceForm } from "@/components/advances/advance-form";

// Validação real ocorre no servidor (reportInputSchema no router)
type FormValues = {
  work_location: "office" | "home" | "day_off";
  calls_total?: number;
  calls_answered?: number;
  meetings_scheduled?: number;
  meetings_held?: number;
  crm_activities?: number;
  bot_conversations?: number;
  reschedulings?: number;
  calls_done?: number;
  closer_no_shows?: number;
  disqualified?: number;
  crm_updated?: boolean;
};

type ExistingReport = {
  id?: string;
  work_location: string;
  calls_total: number | null;
  calls_answered: number | null;
  meetings_scheduled: number | null;
  meetings_held: number | null;
  crm_activities: number | null;
  bot_conversations: number | null;
  reschedulings: number | null;
  calls_done: number | null;
  closer_no_shows: number | null;
  disqualified: number | null;
  crm_updated: boolean | null;
};

type ReportFormProps = {
  date: string; // "YYYY-MM-DD"
  role: UserRole;
  existingReport: ExistingReport | null;
  isReadOnly?: boolean; // true quando admin/head vê relatório de outro usuário
  onSuccess: () => void;
};

const LOCATIONS = [
  { value: "office", label: "Presencial" },
  { value: "home", label: "Home Office" },
  { value: "day_off", label: "Folga" },
] as const;

function NumberField({
  label,
  name,
  register,
  readOnly,
  value,
}: {
  label: string;
  name: keyof FormValues;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  readOnly?: boolean;
  value?: number | null;
}) {
  if (readOnly) {
    return (
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs">
        {label}
      </Label>
      <Input
        id={name}
        type="number"
        min={0}
        className="h-8"
        {...register(name, { valueAsNumber: true })}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportForm({
  date,
  role,
  existingReport,
  isReadOnly = false,
  onSuccess,
}: ReportFormProps) {
  const utils = api.useUtils();
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      work_location:
        (existingReport?.work_location as FormValues["work_location"]) ??
        "office",
      calls_total: existingReport?.calls_total ?? undefined,
      calls_answered: existingReport?.calls_answered ?? undefined,
      meetings_scheduled: existingReport?.meetings_scheduled ?? undefined,
      meetings_held: existingReport?.meetings_held ?? undefined,
      crm_activities: existingReport?.crm_activities ?? undefined,
      bot_conversations: existingReport?.bot_conversations ?? undefined,
      reschedulings: existingReport?.reschedulings ?? undefined,
      calls_done: existingReport?.calls_done ?? undefined,
      closer_no_shows: existingReport?.closer_no_shows ?? undefined,
      disqualified: existingReport?.disqualified ?? undefined,
      crm_updated: existingReport?.crm_updated ?? false,
    },
  });

  // Reset to blank defaults immediately when date changes (before new data arrives)
  useEffect(() => {
    reset({
      work_location: "office",
      calls_total: undefined,
      calls_answered: undefined,
      meetings_scheduled: undefined,
      meetings_held: undefined,
      crm_activities: undefined,
      bot_conversations: undefined,
      reschedulings: undefined,
      calls_done: undefined,
      closer_no_shows: undefined,
      disqualified: undefined,
      crm_updated: false,
    });
  }, [date, reset]);

  // Fill form with existing report data once the query resolves
  useEffect(() => {
    if (!existingReport) return;
    reset({
      work_location:
        (existingReport.work_location as FormValues["work_location"]) ??
        "office",
      calls_total: existingReport.calls_total ?? undefined,
      calls_answered: existingReport.calls_answered ?? undefined,
      meetings_scheduled: existingReport.meetings_scheduled ?? undefined,
      meetings_held: existingReport.meetings_held ?? undefined,
      crm_activities: existingReport.crm_activities ?? undefined,
      bot_conversations: existingReport.bot_conversations ?? undefined,
      reschedulings: existingReport.reschedulings ?? undefined,
      calls_done: existingReport.calls_done ?? undefined,
      closer_no_shows: existingReport.closer_no_shows ?? undefined,
      disqualified: existingReport.disqualified ?? undefined,
      crm_updated: existingReport.crm_updated ?? false,
    });
  }, [existingReport, reset]);

  const upsert = api.reports.upsertReport.useMutation({
    onSuccess: async () => {
      await utils.reports.getMonthCalendar.invalidate();
      onSuccess();
    },
  });

  const workLocation = watch("work_location");
  const isDayOff = workLocation === "day_off";
  const isSdr = role === "sdr";

  const formattedDate = format(parseISO(date), "EEEE, d 'de' MMMM", {
    locale: ptBR,
  });

  const onSubmit = (values: FormValues) => {
    // valueAsNumber retorna NaN para campos vazios — converter para undefined
    const clean = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [
        k,
        typeof v === "number" && Number.isNaN(v) ? undefined : v,
      ]),
    ) as FormValues;
    upsert.mutate({ date, ...clean });
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        {/* Data */}
        <div>
          <p className="text-sm font-semibold capitalize">{formattedDate}</p>
          {existingReport && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isReadOnly
                ? "Relatório preenchido"
                : "Editando relatório existente"}
            </p>
          )}
        </div>

        {/* Local de trabalho */}
        <div className="space-y-1.5">
          <Label className="text-xs">Local de trabalho</Label>
          <div className="flex gap-1.5">
            {LOCATIONS.map((loc) => (
              <button
                key={loc.value}
                type="button"
                disabled={isReadOnly}
                onClick={() => setValue("work_location", loc.value)}
                className={cn(
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  workLocation === loc.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-input text-foreground",
                  isReadOnly && "cursor-default",
                )}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos específicos por role (ocultos em folga) */}
        {!isDayOff && (
          <div className="space-y-3">
            {isSdr ? (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Atividades SDR
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Ligações Realizadas"
                    name="calls_total"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.calls_total}
                  />
                  <NumberField
                    label="Ligações Atendidas"
                    name="calls_answered"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.calls_answered}
                  />
                  <NumberField
                    label="Reuniões Agendadas"
                    name="meetings_scheduled"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.meetings_scheduled}
                  />
                  <NumberField
                    label="Reuniões Realizadas"
                    name="meetings_held"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.meetings_held}
                  />
                  <NumberField
                    label="Atividades CRM"
                    name="crm_activities"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.crm_activities}
                  />
                  <NumberField
                    label="Conversas no Bot"
                    name="bot_conversations"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.bot_conversations}
                  />
                  <NumberField
                    label="Reagendamentos"
                    name="reschedulings"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.reschedulings}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Atividades Closer
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <NumberField
                    label="Ligações Realizadas"
                    name="calls_done"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.calls_done}
                  />
                  <NumberField
                    label="No-shows"
                    name="closer_no_shows"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.closer_no_shows}
                  />
                  <NumberField
                    label="Desqualificados"
                    name="disqualified"
                    register={register}
                    readOnly={isReadOnly}
                    value={existingReport?.disqualified}
                  />
                </div>
                {/* CRM atualizado */}
                {isReadOnly ? (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      CRM Atualizado
                    </Label>
                    <p className="text-sm font-medium">
                      {existingReport?.crm_updated ? "Sim" : "Não"}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      id="crm_updated"
                      type="checkbox"
                      className="size-4 rounded border-input accent-primary"
                      {...register("crm_updated")}
                    />
                    <Label
                      htmlFor="crm_updated"
                      className="text-sm cursor-pointer"
                    >
                      CRM atualizado
                    </Label>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Erro da mutation */}
        {upsert.error && (
          <p className="text-xs text-destructive">{upsert.error.message}</p>
        )}

        {/* Botão de submit */}
        {!isReadOnly && (
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || upsert.isPending}
            className="w-full"
          >
            {upsert.isPending
              ? "Salvando..."
              : existingReport
                ? "Atualizar relatório"
                : "Salvar relatório"}
          </Button>
        )}

        {/* Ações comerciais — apenas para Closers (não SDR, não read-only) */}
        {!isReadOnly && !isSdr && (
          <>
            <div className="relative my-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-2 text-[10px] text-muted-foreground">
                  ações comerciais
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowSaleModal(true)}
            >
              Registrar Venda
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAdvanceModal(true)}
            >
              Registrar Avanço
            </Button>
          </>
        )}
      </form>

      {/* Modal de registro de venda — fora do form, fixed overlay */}
      {showSaleModal && (
        <RegisterSaleModal
          report_id={existingReport?.id}
          onSuccess={() => setShowSaleModal(false)}
          onClose={() => setShowSaleModal(false)}
        />
      )}

      {/* Modal de registro de avanço — fora do form, fixed overlay */}
      {showAdvanceModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4">
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setShowAdvanceModal(false)}
          />
          <div className="relative z-10 bg-background ring-1 ring-foreground/10 rounded-xl w-full max-w-lg max-h-[calc(100vh-4rem)] overflow-y-auto shadow-md">
            <div className="p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Novo Avanço</h2>
                <p className="text-sm text-muted-foreground">
                  Registre um lead em negociação.
                </p>
              </div>
              <AdvanceForm
                report_id={existingReport?.id}
                onSuccess={() => setShowAdvanceModal(false)}
                onCancel={() => setShowAdvanceModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
