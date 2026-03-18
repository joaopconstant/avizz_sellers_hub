import { api } from "@/trpc/react";
import {
  calculateCashValue,
  calculateFutureRevenue,
  calculateNetValue,
} from "@/lib/financials";

interface FinancialPreviewInput {
  payment_method: string;
  gateway_id?: string;
  installments?: number;
  contract_value: number;
  down_payment?: number;
}

interface FinancialPreviewResult {
  previewCash: number | null;
  previewNet: number | null;
  previewFuture: number | null;
}

/**
 * Calcula o preview financeiro (cash_value, net_value, future_revenue) no client.
 * Apenas para UX — o servidor sempre recalcula esses valores (RN-09).
 */
export function useFinancialPreview(
  values: FinancialPreviewInput,
): FinancialPreviewResult {
  const installmentsNum = values.installments ?? NaN;

  const { data: rateData } = api.gateways.getRate.useQuery(
    { gateway_id: values.gateway_id ?? "", installments: installmentsNum },
    {
      enabled:
        values.payment_method === "card" &&
        !!values.gateway_id &&
        !isNaN(installmentsNum) &&
        installmentsNum >= 1,
    },
  );

  const contractValue = values.contract_value;
  const downPayment = values.down_payment ?? 0;

  if (isNaN(contractValue) || contractValue <= 0) {
    return { previewCash: null, previewNet: null, previewFuture: null };
  }

  const pm = values.payment_method as "pix" | "card" | "boleto";

  const previewCash = calculateCashValue(pm, contractValue, downPayment);

  const previewNet =
    pm === "card" && rateData
      ? calculateNetValue("card", contractValue, rateData.rate_percent)
      : pm !== "card"
        ? calculateNetValue(pm, contractValue, null)
        : null;

  const previewFuture =
    previewCash !== null ? calculateFutureRevenue(contractValue, previewCash) : null;

  return { previewCash, previewNet, previewFuture };
}
