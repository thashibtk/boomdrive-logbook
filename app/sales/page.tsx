import { createClient } from "@/lib/supabase/server";
import { computeSettlement } from "@/lib/calculations";
import SalesView, { type SaleRow, type SellableVehicle } from "@/components/SalesView";

export default async function SalesPage() {
  const supabase = await createClient();

  const [
    { data: allVehicles },
    { data: partners },
    { data: expenses },
    { data: links },
    { data: images },
  ] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, registration_number, make, model, status, sold_price, sold_date, purchase_date, settled, buyer_name, buyer_phone, notes")
      .order("sold_date", { ascending: false }),
    supabase.from("partners").select("*"),
    supabase.from("expenses").select("*"),
    supabase.from("vehicle_partners").select("*"),
    supabase.from("vehicle_images").select("*").order("sort_order", { ascending: true })
  ]);

  const vehicleList = allVehicles ?? [];
  const partnerList = partners ?? [];
  const expenseList = expenses ?? [];
  const linkList = links ?? [];
  const imageList = images ?? [];

  const nameById = new Map<string, string>(partnerList.map((p: any) => [p.id, p.name]));
  const phoneById = new Map<string, string | null>(partnerList.map((p: any) => [p.id, p.phone]));

  const imageByVehicle = new Map<string, string>();
  for (const img of imageList) {
    if (!imageByVehicle.has(img.vehicle_id)) imageByVehicle.set(img.vehicle_id, img.url);
  }

  const expensesByVehicle = new Map<string, any[]>();
  for (const e of expenseList) {
    const arr = expensesByVehicle.get(e.vehicle_id) ?? [];
    arr.push(e);
    expensesByVehicle.set(e.vehicle_id, arr);
  }

  const partnerIdsByVehicle = new Map<string, string[]>();
  for (const l of linkList) {
    const arr = partnerIdsByVehicle.get(l.vehicle_id) ?? [];
    arr.push(l.partner_id);
    partnerIdsByVehicle.set(l.vehicle_id, arr);
  }

  const soldVehicles = vehicleList.filter(v => v.status === "sold");
  const sellableVehicles = vehicleList.filter(v => v.status !== "sold").map(v => ({
    id: v.id,
    label: `${v.make ?? ""} ${v.model ?? ""} - ${v.registration_number}`.trim()
  }));

  const salesRows: SaleRow[] = soldVehicles.map(v => {
    const pIds = partnerIdsByVehicle.get(v.id) ?? [];
    const vExps = expensesByVehicle.get(v.id) ?? [];
    
    const s = computeSettlement({
      purchase_price: 0,
      sold_price: v.sold_price ? Number(v.sold_price) : 0,
      expenses: vExps.map(e => ({ ...e, amount: Number(e.amount) })),
      partners: pIds.map(id => ({ id, name: nameById.get(id) ?? "Partner", purchase_contribution: 0 })),
    });

    const partnerNames = pIds.map(id => nameById.get(id)).filter(Boolean);
    const partnerLabel = partnerNames.length > 0 
      ? (partnerNames.length === 1 ? partnerNames[0]! : `${partnerNames.length} Partners`)
      : "Self";

    const mappedPartners = s.partners.map(ps => ({
      id: ps.partner_id,
      name: ps.name,
      phone: phoneById.get(ps.partner_id) ?? null,
      paid: ps.total_contribution,
      profitShare: ps.profit_share,
      balance: ps.balance_owed_to_them
    }));

    const mappedExpenses = vExps.map(e => ({
      id: e.id,
      date: e.expense_date,
      description: e.description,
      category: e.category,
      paidBy: e.paid_by ? (nameById.get(e.paid_by) ?? "Unknown") : "You",
      amount: Number(e.amount)
    })).sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));

    const purchasePrice = s.total_cost - s.total_expenses;

    return {
      id: v.id,
      name: [v.make, v.model].filter(Boolean).join(" ") || "Vehicle",
      make: v.make,
      reg: v.registration_number,
      sub: "",
      image: imageByVehicle.get(v.id) ?? null,
      soldDate: v.sold_date,
      soldPrice: v.sold_price ? Number(v.sold_price) : 0,
      purchasePrice,
      totalExpenses: s.total_expenses,
      profit: s.net_profit ?? 0,
      buyerName: v.buyer_name ?? null,
      buyerPhone: v.buyer_phone ?? null,
      notes: v.notes ?? null,
      partners: mappedPartners,
      partnerLabel,
      shares: s.shares,
      sharePerPerson: s.share_per_person ?? 0,
      yourNet: s.admin_net ?? 0,
      yourPaid: s.admin_total_contribution,
      hasPartners: pIds.length > 0,
      settledFlag: !!v.settled,
      status: v.settled ? "settled" : (pIds.length > 0 ? "pending" : "settled"),
      expenses: mappedExpenses
    };
  });

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  now.setMonth(now.getMonth() - 1);
  const lastMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <SalesView 
      sales={salesRows} 
      sellable={sellableVehicles} 
      thisMonth={thisMonth} 
      lastMonth={lastMonth} 
    />
  );
}
