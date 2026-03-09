/**
 * Cálculos financeiros centralizados — RN-02, RN-03, RN-04.
 * SEMPRE executados no servidor. Nunca aceitar esses valores como input do cliente.
 */

type PaymentMethod = "pix" | "card" | "boleto";

/**
 * RN-02 — Calcula cash_value (valor que entra no caixa no ato da venda).
 *
 * | Pagamento | Condição       | cash_value      |
 * |-----------|----------------|-----------------|
 * | PIX       | sempre         | = contract_value|
 * | Cartão    | sem entrada    | = 0             |
 * | Cartão    | com entrada    | = down_payment  |
 * | Boleto    | sempre         | = down_payment  |
 */
export function calculateCashValue(
  paymentMethod: PaymentMethod,
  contractValue: number,
  downPayment: number,
): number {
  if (paymentMethod === "pix") return contractValue;
  if (paymentMethod === "card") return downPayment;
  // boleto
  return downPayment;
}

/**
 * RN-03 — Calcula net_value (valor líquido após taxas de gateway).
 *
 * | Pagamento         | net_value                                      |
 * |-------------------|------------------------------------------------|
 * | PIX ou Boleto     | = contract_value                               |
 * | Cartão            | = contract_value × (1 − ratePercent / 100)     |
 *
 * @param ratePercent Taxa do gateway em percentual (ex: 2.5 para 2,5%). Requerido para cartão.
 */
export function calculateNetValue(
  paymentMethod: PaymentMethod,
  contractValue: number,
  ratePercent: number | null,
): number {
  if (paymentMethod === "pix" || paymentMethod === "boleto") {
    return contractValue;
  }
  // card — deve ter taxa de gateway
  if (ratePercent === null) {
    throw new Error("Taxa do gateway obrigatória para pagamento com cartão.");
  }
  return contractValue * (1 - ratePercent / 100);
}

/**
 * RN-04 — Calcula future_revenue (receita futura — parcelas não recebidas no ato).
 *
 * future_revenue = contract_value − cash_value
 */
export function calculateFutureRevenue(
  contractValue: number,
  cashValue: number,
): number {
  return contractValue - cashValue;
}
