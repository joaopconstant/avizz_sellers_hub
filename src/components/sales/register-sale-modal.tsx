"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { format } from "date-fns";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatCurrencyDecimal } from "@/lib/formatting";
import { REVENUE_TIER_OPTIONS, SALE_ORIGIN_OPTIONS } from "@/lib/constants";
import {
  calculateCashValue,
  calculateFutureRevenue,
  calculateNetValue,
} from "@/lib/financials";

type FormValues = {
  product_id: string;
  client_name: string;
  client_company: string;
  client_revenue_tier: string;
  contract_value: string;
  contract_months: string;
  sale_origin: string;
  is_recovered: boolean;
  sale_date: string;
  sdr_id: string;
  payment_method: "pix" | "card" | "boleto";
  gateway_id: string;
  installments: string;
  down_payment: string;
};

type RegisterSaleModalProps = {
  mode?: "create" | "convert";
  advance_id?: string;
  prefill?: {
    client_name?: string;
    client_company?: string;
    sdr_id?: string;
  };
  report_id?: string;
  onSuccess: () => void;
  onClose: () => void;
};

// ─── Step config ──────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Produto" },
  { label: "Cliente" },
  { label: "Venda" },
  { label: "Pagamento" },
] as const;

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "card", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
] as const;

// ─── Step progress indicator ───────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-6">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "size-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
                  isDone
                    ? "bg-primary text-primary-foreground"
                    : isActive
                      ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-1"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {isDone ? "✓" : stepNum}
              </div>
              <span
                className={cn(
                  "text-[10px] whitespace-nowrap",
                  isActive ? "text-foreground font-medium" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1 mx-2 mb-4 transition-colors",
                  isDone ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RegisterSaleModal({
  mode = "create",
  advance_id,
  prefill,
  report_id,
  onSuccess,
  onClose,
}: RegisterSaleModalProps) {
  const utils = api.useUtils();
  const [step, setStep] = useState(1);

  const today = format(new Date(), "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      product_id: "",
      client_name: prefill?.client_name ?? "",
      client_company: prefill?.client_company ?? "",
      client_revenue_tier: "",
      contract_value: "",
      contract_months: "",
      sale_origin: mode === "convert" ? "advance" : "organic",
      is_recovered: false,
      sale_date: today,
      sdr_id: prefill?.sdr_id ?? "",
      payment_method: "pix",
      gateway_id: "",
      installments: "",
      down_payment: "",
    },
  });

  // ─── Data queries ───────────────────────────────────────────────────────────

  const { data: products = [] } = api.products.listActive.useQuery();
  const { data: gateways = [] } = api.gateways.listActive.useQuery();
  const { data: sdrs = [] } = api.sales.listSdrs.useQuery();

  // Watched values
  const productId = watch("product_id");
  const paymentMethod = watch("payment_method");
  const gatewayId = watch("gateway_id");
  const installmentsStr = watch("installments");
  const contractValueStr = watch("contract_value");
  const downPaymentStr = watch("down_payment");

  const selectedProduct = products.find((p) => p.id === productId);
  const contractValueNum = parseFloat(contractValueStr);
  const downPaymentNum = parseFloat(downPaymentStr) || 0;
  const installmentsNum = parseInt(installmentsStr, 10);

  // Live gateway rate query for card preview
  const { data: rateData } = api.gateways.getRate.useQuery(
    { gateway_id: gatewayId, installments: installmentsNum },
    {
      enabled:
        paymentMethod === "card" &&
        !!gatewayId &&
        !isNaN(installmentsNum) &&
        installmentsNum >= 1,
    },
  );

  // Financial previews (UX only — server recalculates)
  const previewCash =
    !isNaN(contractValueNum) && contractValueNum > 0
      ? calculateCashValue(paymentMethod, contractValueNum, downPaymentNum)
      : null;

  const previewNet =
    !isNaN(contractValueNum) && contractValueNum > 0
      ? paymentMethod === "card" && rateData
        ? calculateNetValue("card", contractValueNum, rateData.rate_percent)
        : paymentMethod !== "card"
          ? calculateNetValue(paymentMethod, contractValueNum, null)
          : null
      : null;

  const previewFuture =
    previewCash !== null && !isNaN(contractValueNum)
      ? calculateFutureRevenue(contractValueNum, previewCash)
      : null;

  // ─── Step validation ────────────────────────────────────────────────────────

  const canAdvance = (): boolean => {
    switch (step) {
      case 1:
        return !!productId;
      case 2:
        return (
          !!watch("client_name").trim() &&
          !!watch("client_company").trim() &&
          !!watch("client_revenue_tier")
        );
      case 3: {
        const cv = parseFloat(watch("contract_value"));
        const cm = parseInt(watch("contract_months"), 10);
        return !isNaN(cv) && cv > 0 && !isNaN(cm) && cm >= 1 && !!watch("sale_date");
      }
      case 4:
        if (paymentMethod === "card") {
          return !!gatewayId && !isNaN(installmentsNum) && installmentsNum >= 1;
        }
        return true;
      default:
        return true;
    }
  };

  // ─── Mutations ──────────────────────────────────────────────────────────────

  const createSale = api.sales.createSale.useMutation({
    onSuccess: async () => {
      await utils.sales.listSales.invalidate();
      await utils.dashboard.getMyGoalsSummary.invalidate();
      onSuccess();
    },
  });

  const convertToSale = api.advances.convertToSale.useMutation({
    onSuccess: async () => {
      await utils.advances.listAdvances.invalidate();
      await utils.sales.listSales.invalidate();
      await utils.dashboard.getMyGoalsSummary.invalidate();
      onSuccess();
    },
  });

  const mutation = mode === "convert" ? convertToSale : createSale;

  // ─── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = (values: FormValues) => {
    const contractValue = parseFloat(values.contract_value);
    const contractMonths = parseInt(values.contract_months, 10);
    const downPaymentRaw = parseFloat(values.down_payment);
    const downPayment = isNaN(downPaymentRaw) ? undefined : downPaymentRaw || undefined;
    if (downPayment !== undefined && downPayment > contractValue) return;
    const installments = values.installments
      ? parseInt(values.installments, 10)
      : undefined;

    const salePayload = {
      product_id: values.product_id,
      client_name: values.client_name,
      client_company: values.client_company,
      client_revenue_tier: values.client_revenue_tier as
        | "small"
        | "medium"
        | "large"
        | "enterprise",
      contract_value: contractValue,
      contract_months: contractMonths,
      payment_method: values.payment_method,
      gateway_id: values.gateway_id || undefined,
      installments,
      down_payment: downPayment,
      sale_origin: (mode === "convert"
        ? "advance"
        : values.sale_origin) as "organic" | "referral" | "outbound" | "advance",
      is_recovered: values.is_recovered,
      sale_date: values.sale_date,
      sdr_id: values.sdr_id || undefined,
      report_id: report_id ?? undefined,
    };

    if (mode === "convert" && advance_id) {
      convertToSale.mutate({ advance_id, sale: salePayload });
    } else {
      createSale.mutate(salePayload);
    }
  };

  // ─── Render per step ─────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── Step 1: Produto ────────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Produto *</Label>
              <Select
                value={productId}
                onValueChange={(v) => setValue("product_id", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o produto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProduct && (
              <div
                className={cn(
                  "rounded-lg border p-3 text-sm",
                  selectedProduct.counts_as_sale
                    ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                    : "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
                )}
              >
                <p className="font-medium">{selectedProduct.name}</p>
                <p
                  className={cn(
                    "text-xs mt-0.5",
                    selectedProduct.counts_as_sale
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-700 dark:text-amber-400",
                  )}
                >
                  {selectedProduct.counts_as_sale
                    ? "✓ Conta como Meta de Vendas"
                    : "Upsell — não incrementa meta de vendas"}
                </p>
              </div>
            )}

            {products.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum produto ativo cadastrado. Solicite ao administrador.
              </p>
            )}
          </div>
        );

      // ── Step 2: Cliente ────────────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="client_name" className="text-xs">
                  Nome do Cliente *
                </Label>
                <Input
                  id="client_name"
                  type="text"
                  placeholder="Nome completo"
                  {...register("client_name")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="client_company" className="text-xs">
                  Empresa *
                </Label>
                <Input
                  id="client_company"
                  type="text"
                  placeholder="Nome da empresa"
                  {...register("client_company")}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Porte da Empresa *</Label>
              <Select
                value={watch("client_revenue_tier")}
                onValueChange={(v) => setValue("client_revenue_tier", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione o porte..." />
                </SelectTrigger>
                <SelectContent>
                  {REVENUE_TIER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      // ── Step 3: Venda ──────────────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contract_value" className="text-xs">
                  Valor do Contrato (R$) *
                </Label>
                <Input
                  id="contract_value"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  {...register("contract_value")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contract_months" className="text-xs">
                  Meses de Contrato *
                </Label>
                <Input
                  id="contract_months"
                  type="number"
                  min={1}
                  placeholder="12"
                  {...register("contract_months")}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sale_date" className="text-xs">
                  Data da Venda *
                </Label>
                <Input id="sale_date" type="date" {...register("sale_date")} />
              </div>

              {/* Origem — oculta em conversão */}
              {mode !== "convert" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Origem *</Label>
                  <Select
                    value={watch("sale_origin")}
                    onValueChange={(v) => setValue("sale_origin", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SALE_ORIGIN_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* SDR */}
            {sdrs.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">SDR (opcional)</Label>
                <Select
                  value={watch("sdr_id")}
                  onValueChange={(v) => setValue("sdr_id", v === "__none" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nenhum SDR..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Nenhum</SelectItem>
                    {sdrs.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Venda recuperada */}
            <div className="flex items-center gap-2">
              <input
                id="is_recovered"
                type="checkbox"
                className="size-4 rounded border-input accent-primary"
                {...register("is_recovered")}
              />
              <Label htmlFor="is_recovered" className="text-sm cursor-pointer">
                Venda recuperada
              </Label>
            </div>
          </div>
        );

      // ── Step 4: Pagamento ──────────────────────────────────────────────────
      case 4:
        return (
          <div className="space-y-4">
            {/* Forma de pagamento */}
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de Pagamento *</Label>
              <div className="flex gap-1.5">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.value}
                    type="button"
                    onClick={() => {
                      setValue("payment_method", pm.value);
                      setValue("gateway_id", "");
                      setValue("installments", "");
                      setValue("down_payment", "");
                    }}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                      paymentMethod === pm.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-muted border-input",
                    )}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cartão: gateway + parcelas */}
            {paymentMethod === "card" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Gateway *</Label>
                  <Select
                    value={watch("gateway_id")}
                    onValueChange={(v) => setValue("gateway_id", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {gateways.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Parcelas *</Label>
                  <Select
                    value={watch("installments")}
                    onValueChange={(v) => setValue("installments", v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x
                          {rateData && n === installmentsNum && (
                            <span className="ml-1 text-muted-foreground text-xs">
                              ({rateData.rate_percent.toFixed(2)}%)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Entrada: cartão ou boleto */}
            {(paymentMethod === "card" || paymentMethod === "boleto") && (
              <div className="space-y-1.5">
                <Label htmlFor="down_payment" className="text-xs">
                  Entrada (R$)
                  {paymentMethod === "boleto" && (
                    <span className="ml-1 text-muted-foreground font-normal">
                      — obrigatório para boleto
                    </span>
                  )}
                </Label>
                <Input
                  id="down_payment"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0,00"
                  {...register("down_payment")}
                  max={!isNaN(contractValueNum) && contractValueNum > 0 ? contractValueNum : undefined}
                />
                {downPaymentNum > contractValueNum && contractValueNum > 0 && (
                  <p className="text-xs text-destructive">
                    A entrada não pode ser maior que o valor do contrato ({formatCurrencyDecimal(contractValueNum)}).
                  </p>
                )}
              </div>
            )}

            {/* Preview financeiro */}
            {!isNaN(contractValueNum) && contractValueNum > 0 && (
              <div className="rounded-lg bg-muted/50 border p-4 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Resumo financeiro
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Valor Contrato</p>
                    <p className="font-semibold text-sm">
                      {formatCurrencyDecimal(contractValueNum)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Caixa (entrada)</p>
                    <p className="font-semibold text-sm">
                      {previewCash !== null
                        ? formatCurrencyDecimal(previewCash)
                        : "—"}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Líquido</p>
                    <p className="font-semibold text-sm">
                      {previewNet !== null
                        ? formatCurrencyDecimal(previewNet)
                        : paymentMethod === "card"
                          ? "Selecione gateway"
                          : "—"}
                    </p>
                  </div>
                </div>
                {previewFuture !== null && previewFuture > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Receita futura (parcelas): {formatCurrencyDecimal(previewFuture)}
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground/70">
                  Calculado pelo servidor no momento do envio.
                </p>
              </div>
            )}

            {/* Resumo da venda */}
            {selectedProduct && (
              <div className="rounded-lg border border-dashed p-3 text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">Resumo</p>
                <p>Produto: {selectedProduct.name}</p>
                <p>
                  Cliente: {watch("client_name")} · {watch("client_company")}
                </p>
                <p>
                  Contrato: {watch("contract_months")} meses ·{" "}
                  {watch("sale_date")
                    ? format(new Date(watch("sale_date") + "T00:00:00"), "dd/MM/yy")
                    : ""}
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ─── Modal render ─────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 pb-8 px-4">
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-background ring-1 ring-foreground/10 rounded-xl w-full max-w-xl max-h-[calc(100vh-4rem)] overflow-y-auto shadow-md">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {mode === "convert" ? "Converter Avanço em Venda" : "Registrar Venda"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === "convert"
                ? "Preencha os dados da venda gerada pelo avanço."
                : "Registre uma nova venda."}
            </p>
          </div>

          {/* Step indicator */}
          <StepIndicator current={step} />

          {/* Step content — form sem onSubmit para evitar submit acidental via Enter ou troca de botão */}
          <form onSubmit={(e) => e.preventDefault()}>
            {renderStep()}

            {/* Error */}
            {mutation.error && (
              <p className="text-xs text-destructive mt-4">
                {mutation.error.message}
              </p>
            )}

            {/* Navigation */}
            <div className="flex gap-2 mt-6">
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={mutation.isPending}
                >
                  Voltar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={onClose}
                  disabled={mutation.isPending}
                >
                  Cancelar
                </Button>
              )}

              {step < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={() => canAdvance() && setStep((s) => s + 1)}
                  disabled={!canAdvance()}
                >
                  Próximo
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleSubmit(onSubmit)()}
                  disabled={!canAdvance() || isSubmitting || mutation.isPending || (downPaymentNum > contractValueNum && contractValueNum > 0)}
                >
                  {mutation.isPending
                    ? "Salvando..."
                    : mode === "convert"
                      ? "Converter em Venda"
                      : "Registrar Venda"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
