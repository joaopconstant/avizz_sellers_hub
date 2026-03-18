/**
 * Constantes compartilhadas entre client e server.
 */

export const ADVANCE_STATUS_FLAGS = [
  { value: "reuniao_agendada", label: "Reunião Agendada" },
  { value: "proposta_enviada", label: "Proposta Enviada" },
  { value: "em_negociacao", label: "Em Negociação" },
  { value: "aguardando_retorno", label: "Aguardando Retorno" },
  { value: "contrato_enviado", label: "Contrato Enviado" },
] as const;

export const REVENUE_TIER_OPTIONS = [
  { value: "small", label: "Pequeno (até R$1M)" },
  { value: "medium", label: "Médio (R$1M–R$10M)" },
  { value: "large", label: "Grande (R$10M–R$100M)" },
  { value: "enterprise", label: "Enterprise (R$100M+)" },
] as const;

export const SALE_ORIGIN_OPTIONS = [
  { value: "organic", label: "Orgânico" },
  { value: "referral", label: "Indicação" },
  { value: "outbound", label: "Outbound" },
] as const;

export const PAYMENT_LABELS: Record<string, string> = {
  pix: "PIX",
  card: "Cartão",
  boleto: "Boleto",
};

export const ORIGIN_LABELS: Record<string, string> = {
  organic: "Orgânico",
  referral: "Indicação",
  outbound: "Outbound",
  advance: "Avanço",
};
