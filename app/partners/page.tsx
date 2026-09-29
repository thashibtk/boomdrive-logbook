import { createClient } from "@/lib/supabase/server";
import { computeSettlement } from "@/lib/calculations";
import PartnersView, {
  type PartnerData,
  type PartnerVehicle,
  type PartnerExpense,
} from "@/components/PartnersView";

export default async function PartnersPage() {
  const supabase = await createClient();

  const [
    { data: partners },
    { data: vehicles },
    { data: expenses },
    { data: links },
    { data: images },
  ] = await Promise.all([
    supabase.from("partners").select("*").order("name"),
    supabase
      .from("vehicles")
      .select(
        "id, registration_number, make, model, status, sold_price, sold_date, purchase_date, settled"
      ),
    supabase
      .from("expenses")
      .select("id, vehicle_id, description, amount, expense_date, category, paid_by"),
    supabase.from("vehicle_partners").select("vehicle_id, partner_id"),
    supabase
      .from("vehicle_images")
      .select("vehicle_id, url, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const partnerList = partners ?? [];
  const vehicleList = vehicles ?? [];
  const expenseList = expenses ?? [];

  const nameById = new Map<string, string>(partnerList.map((p: any) => [p.id, p.name]));
  const vehicleById = new Map<string, any>(vehicleList.map((v: any) => [v.id, v]));

  const imageByVehicle = new Map<string, string>();
  for (const img of images ?? []) {
    if (!imageByVehicle.has(img.vehicle_id)) imageByVehicle.set(img.vehicle_id, img.url);
  }

  const expensesByVehicle = new Map<string, any[]>();
  for (const e of expenseList) {
    const arr = expensesByVehicle.get(e.vehicle_id) ?? [];
    arr.push(e);
    expensesByVehicle.set(e.vehicle_id, arr);
  }

  const partnerIdsByVehicle = new Map<string, string[]>();
  for (const l of links ?? []) {
    const arr = partnerIdsByVehicle.get(l.vehicle_id) ?? [];
    arr.push(l.partner_id);
    partnerIdsByVehicle.set(l.vehicle_id, arr);
  }

  // Run the settlement math once per vehicle that has partners, then fan the
  // results out to each partner on it.
  const vehiclesByPartner = new Map<string, PartnerVehicle[]>();
  for (const [vehicleId, partnerIds] of Array.from(partnerIdsByVehicle.entries())) {
    const v = vehicleById.get(vehicleId);
    if (!v) continue;

    const isSold = v.status === "sold" && v.sold_price != null;
    const s = computeSettlement({
      purchase_price: 0,
      sold_price: isSold ? Number(v.sold_price) : null,
      expenses: (expensesByVehicle.get(vehicleId) ?? []).map((e) => ({
        ...e,
        amount: Number(e.amount),
      })),
      partners: partnerIds.map((id) => ({ 
        id, 
        name: nameById.get(id) ?? "Partner",
        purchase_contribution: 0 
      })),
    });

    for (const ps of s.partners) {
      const row: PartnerVehicle = {
        vehicleId,
        name: [v.make, v.model].filter(Boolean).join(" ") || "Vehicle",
        reg: v.registration_number,
        image: imageByVehicle.get(vehicleId) ?? null,
        isSold,
        soldDate: v.sold_date ?? null,
        purchaseDate: v.purchase_date ?? "",
        invested: ps.total_contribution,
        expenseShare: s.average_contribution,
        profitShare: isSold ? ps.profit_share : null,
        balance: isSold ? ps.balance_owed_to_them : null,
        settled: !!v.settled,
      };
      const arr = vehiclesByPartner.get(ps.partner_id) ?? [];
      arr.push(row);
      vehiclesByPartner.set(ps.partner_id, arr);
    }
  }

  const expensesByPartner = new Map<string, PartnerExpense[]>();
  for (const e of expenseList) {
    if (!e.paid_by) continue;
    const arr = expensesByPartner.get(e.paid_by) ?? [];
    arr.push({
      id: e.id,
      date: e.expense_date,
      vehicleId: e.vehicle_id,
      vehicleReg: vehicleById.get(e.vehicle_id)?.registration_number ?? "—",
      description: e.description,
      category: e.category ?? null,
      amount: Number(e.amount),
    });
    expensesByPartner.set(e.paid_by, arr);
  }

  const sum = (nums: number[]) => nums.reduce((a, b) => a + b, 0);

  const data: PartnerData[] = partnerList.map((p: any) => {
    const vs = (vehiclesByPartner.get(p.id) ?? []).sort((a, b) =>
      b.purchaseDate.localeCompare(a.purchaseDate)
    );
    const sold = vs.filter((v) => v.isSold);
    const pendingRows = sold.filter((v) => !v.settled);
    const settledRows = sold.filter((v) => v.settled);

    return {
      id: p.id,
      name: p.name,
      phone: p.phone ?? null,
      vehicles: vs,
      expenses: (expensesByPartner.get(p.id) ?? []).sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
      vehicleCount: vs.length,
      soldCount: sold.length,
      inStockCount: vs.length - sold.length,
      invested: sum(vs.map((v) => v.invested)),
      expenseShare: sum(vs.map((v) => v.expenseShare)),
      profitShare: sum(sold.map((v) => v.profitShare ?? 0)),
      pending: sum(pendingRows.map((v) => v.balance ?? 0)),
      settledAmount: sum(settledRows.map((v) => v.balance ?? 0)),
    };
  });

  return <PartnersView partners={data} />;
}