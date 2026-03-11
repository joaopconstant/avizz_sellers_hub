export type InsightType =
  | "validasVsUpsells"
  | "mom"
  | "clientProfile"
  | "prazoComposition"
  | "saleOrigins"
  | "topProducts";

export type InsightsData = {
  validasVsUpsells: {
    valid: { count: number; total: number };
    upsell: { count: number; total: number };
  };
  mom: { month: string; cashRealized: number; delta: number | null }[];
  clientProfile: { tier: string; count: number; total: number }[];
  prazoComposition: { months: number; count: number; tme: number }[];
  saleOrigins: { origin: string; count: number; total: number }[];
  topProducts: { productName: string; count: number; total: number }[];
};
