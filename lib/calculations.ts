// lib/calculations.ts — full file, replace entirely
// Category used for expense rows that represent a payment toward the
// vehicle's purchase price itself (e.g. "who paid how much of the
// ₹8,00,000 purchase"). These are excluded from Total Expenses and used
// only to figure out who contributed what toward the purchase, so the
// purchase price is never counted twice.
export const PURCHASE_EXPENSE_CATEGORY = "Purchase";

export type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string | null;
  paid_by: string | null; // partner id, or null = admin paid
};

export type PartnerRow = {
  id: string;
  name: string;
  // Manually-recorded contribution toward the purchase price (from the
  // Settlement tab). Additive with any "Purchase"-category expense rows —
  // most people will only use one or the other.
  purchase_contribution: number;
};

export type SettlementInput = {
  purchase_price: number;
  sold_price: number | null;
  expenses: ExpenseRow[];
  partners: PartnerRow[];
};

export type PartnerSettlement = {
  partner_id: string;
  name: string;
  purchase_contribution: number; // total paid toward the purchase price ("Purchase"-category expenses)
  expense_contribution: number; // operating expenses they personally paid (excludes "Purchase" category)
  total_contribution: number;
  profit_share: number;
  balance_owed_to_them: number; // final settlement amount (can be negative = they owe you)
};

export type Settlement = {
  total_expenses: number; // operating expenses only — excludes "Purchase"-category rows
  total_cost: number; // purchase expenses + total_expenses
  net_profit: number | null;
  shares: number;
  share_per_person: number | null;
  average_contribution: number; // total_cost / shares
  admin_purchase_contribution: number;
  admin_expense_contribution: number;
  admin_total_contribution: number;
  admin_net: number | null;
  partners: PartnerSettlement[];
};

export function computeSettlement(input: SettlementInput): Settlement {
  const purchaseExpenses = input.expenses.filter(
    (e) => e.category === PURCHASE_EXPENSE_CATEGORY
  );
  const operatingExpenses = input.expenses.filter(
    (e) => e.category !== PURCHASE_EXPENSE_CATEGORY
  );

  const total_expenses = operatingExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const purchase_total = purchaseExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  
  // Calculate total cost strictly from expenses
  const total_cost = purchase_total + total_expenses;
  const shares = 1 + input.partners.length;
  const average_contribution = total_cost / shares;

  const partnerBase = input.partners.map((p) => {
    // Only use expenses to determine contribution (ignore manual p.purchase_contribution)
    const purchase_contribution = purchaseExpenses
        .filter((e) => e.paid_by === p.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
        
    const expense_contribution = operatingExpenses
      .filter((e) => e.paid_by === p.id)
      .reduce((sum, e) => sum + Number(e.amount), 0);
      
    return {
      partner_id: p.id,
      name: p.name,
      purchase_contribution,
      expense_contribution,
      total_contribution: purchase_contribution + expense_contribution,
    };
  });

  const admin_purchase_contribution = purchaseExpenses
    .filter((e) => e.paid_by === null)
    .reduce((sum, e) => sum + Number(e.amount), 0);
    
  const admin_expense_contribution = operatingExpenses
    .filter((e) => e.paid_by === null)
    .reduce((sum, e) => sum + Number(e.amount), 0);
    
  const admin_total_contribution = admin_purchase_contribution + admin_expense_contribution;

  if (input.sold_price === null || input.sold_price === undefined) {
    return {
      total_expenses,
      total_cost,
      net_profit: null,
      shares,
      share_per_person: null,
      average_contribution,
      admin_purchase_contribution,
      admin_expense_contribution,
      admin_total_contribution,
      admin_net: null,
      partners: partnerBase.map((p) => ({ ...p, profit_share: 0, balance_owed_to_them: 0 })),
    };
  }

  const net_profit = input.sold_price - total_cost;
  const share_per_person = net_profit / shares;

  const partners: PartnerSettlement[] = partnerBase.map((p) => ({
    ...p,
    profit_share: share_per_person,
    balance_owed_to_them: share_per_person + p.total_contribution,
  }));

  const admin_net = share_per_person + admin_total_contribution;

  return {
    total_expenses,
    total_cost,
    net_profit,
    shares,
    share_per_person,
    average_contribution,
    admin_purchase_contribution,
    admin_expense_contribution,
    admin_total_contribution,
    admin_net,
    partners,
  };
}

export function formatMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}