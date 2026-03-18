"use client";

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
  payment_method: "pix" | "card" | "boleto";
  gateway_id: string;
  installments: string;
  down_payment: string;
  sale_origin: string;
  is_recovered: boolean;
  sale_date: string;
  sdr_id: string;
};

type SaleFormProps = {
  mode?: "create" | "convert";
  advance_id?: string;
  prefill?: {
    client_name?: string;
    client_company?: string;
    sdr_id?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
};

// ─── Payment method selector ──────────────────────────────────────────────────

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX" },
  { value: "card", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
] as const;

// ─── Main component ───────────────────────────────────────────────────────────

export function SaleForm({
  mode = "create",
  advance_id,
  prefill,
  onSuccess,
  onCancel,
}: SaleFormProps) {
  const utils = api.useUtils();

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
      payment_method: "pix",
      gateway_id: "",
      installments: "",
      down_payment: "",
      sale_origin: mode === "convert" ? "advance" : "organic",
      is_recovered: false,
      sale_date: today,
      sdr_id: prefill?.sdr_id ?? "",
    },
  });

  // ─── Data queries ───────────────────────────────────────────────────────────

  const { data: products = [] } = api.products.listActive.useQuery();
  const { data: gateways = [] } = api.gateways.listActive.useQuery();
  const { data: sdrs = [] } = api.sales.listSdrs.useQuery();

  // Watch for conditional rendering
  const paymentMethod = watch("payment_method");
  const gatewayId = watch("gateway_id");
  const installmentsStr = watch("installments");

  // Live preview of net_value (UX only — server recalculates)
  const installmentsNum = parseInt(installmentsStr, 10);
  const { data: rateData } = api.gateways.getRate.useQuery(
    {
      gateway_id: gatewayId,
      installments: installmentsNum,
    },
    {
      enabled:
        paymentMethod === "card" &&
        !!gatewayId &&
        !isNaN(installmentsNum) &&
        installmentsNum >= 1,
    },
  );

  const contractValueNum = parseFloat(watch("contract_value"));
  const downPaymentNum = parseFloat(watch("down_payment")) || 0;

  const previewNetValue =
    paymentMethod === "card" && rateData && !isNaN(contractValueNum)
      ? calculateNetValue("card", contractValueNum, rateData.rate_percent)
      : null;

  const previewCashValue =
    !isNaN(contractValueNum)
      ? calculateCashValue(paymentMethod, contractValueNum, downPaymentNum)
      : null;

  const previewFutureRevenue =
    previewCashValue !== null && !isNaN(contractValueNum)
      ? calculateFutureRevenue(contractValueNum, previewCashValue)
      : null;

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
    const downPayment = parseFloat(values.down_payment) || undefined;
    const installments =
      values.installments ? parseInt(values.installments, 10) : undefined;

    if (isNaN(contractValue) || contractValue <= 0) return;
    if (isNaN(contractMonths) || contractMonths < 1) return;
    if (downPayment !== undefined && downPayment > contractValue) return;

    const salePayload = {
      product_id: values.product_id,
      client_name: values.client_name,
      client_company: values.client_company,
      client_revenue_tier: values.client_revenue_tier as "small" | "medium" | "large" | "enterprise",
      contract_value: contractValue,
      contract_months: contractMonths,
      payment_method: values.payment_method,
      gateway_id: values.gateway_id || undefined,
      installments,
      down_payment: downPayment,
      sale_origin: (mode === "convert" ? "advance" : values.sale_origin) as
        | "organic"
        | "referral"
        | "outbound"
        | "advance",
      is_recovered: values.is_recovered,
      sale_date: values.sale_date,
      sdr_id: values.sdr_id || undefined,
    };

    if (mode === "convert" && advance_id) {
      convertToSale.mutate({ advance_id, sale: salePayload });
    } else {
      createSale.mutate(salePayload);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const showGateway = paymentMethod === "card";
  const showDownPayment = paymentMethod === "card" || paymentMethod === "boleto";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

      {/* ── Seção 1: Produto e Contrato ─────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Produto e Contrato
        </p>

        {/* Produto */}
        <div className="space-y-1.5">
          <Label className="text-xs">Produto *</Label>
          <Select
            value={watch("product_id")}
            onValueChange={(v) => setValue("product_id", v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione o produto..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                  {!p.counts_as_sale && (
                    <span className="ml-1 text-muted-foreground">(Upsell)</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Valor e Meses */}
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

        {/* Forma de Pagamento */}
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
                  "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                  paymentMethod === pm.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-input text-foreground",
                )}
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Campos condicionais — Cartão */}
        {showGateway && (
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Entrada — Cartão ou Boleto */}
        {showDownPayment && (
          <div className="space-y-1.5">
            <Label htmlFor="down_payment" className="text-xs">
              Entrada (R$)
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
          </div>
        )}

        {/* Preview financeiro (UX only) */}
        {!isNaN(contractValueNum) && contractValueNum > 0 && (
          <div className="rounded-md bg-muted/50 border border-border p-3 space-y-1 text-xs">
            <p className="font-medium text-muted-foreground">Preview (calculado pelo servidor no envio)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-muted-foreground">Caixa</p>
                <p className="font-medium">
                  {previewCashValue !== null
                    ? formatCurrencyDecimal(previewCashValue)
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Líquido</p>
                <p className="font-medium">
                  {previewNetValue !== null
                    ? formatCurrencyDecimal(previewNetValue)
                    : paymentMethod !== "card"
                      ? formatCurrencyDecimal(contractValueNum)
                      : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Futuro</p>
                <p className="font-medium">
                  {previewFutureRevenue !== null
                    ? formatCurrencyDecimal(previewFutureRevenue)
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Seção 2: Cliente ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cliente
        </p>

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

      {/* ── Seção 3: Detalhes ─────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Detalhes
        </p>

        <div className="grid grid-cols-2 gap-3">
          {/* Origem — oculta em modo conversão */}
          {mode !== "convert" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Origem *</Label>
              <Select
                value={watch("sale_origin")}
                onValueChange={(v) => setValue("sale_origin", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione..." />
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

          {/* Data da Venda */}
          <div className="space-y-1.5">
            <Label htmlFor="sale_date" className="text-xs">
              Data da Venda *
            </Label>
            <Input
              id="sale_date"
              type="date"
              {...register("sale_date")}
            />
          </div>
        </div>

        {/* SDR (opcional) */}
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

        {/* Venda Recuperada */}
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

      {/* Erro */}
      {mutation.error && (
        <p className="text-xs text-destructive">{mutation.error.message}</p>
      )}

      {/* Ações */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
          disabled={isSubmitting || mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="flex-1"
          disabled={isSubmitting || mutation.isPending}
        >
          {mutation.isPending
            ? "Salvando..."
            : mode === "convert"
              ? "Converter em Venda"
              : "Registrar Venda"}
        </Button>
      </div>
    </form>
  );
}
