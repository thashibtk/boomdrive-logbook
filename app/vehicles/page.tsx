import { createClient } from "@/lib/supabase/server";
import VehiclesTable, { type VehicleRow } from "@/components/VehiclesTable";
import { computeSettlement } from "@/lib/calculations";

export default async function VehiclesPage() {
  const supabase = await createClient();

  const [{ data: vehicles }, { data: expenses }, { data: vehiclePartners }, { data: images }] =
    await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("vehicle_id, id, description, amount, expense_date, category, paid_by"),
      supabase
        .from("vehicle_partners")
        .select("vehicle_id, purchase_contribution, partners(id, name)")
        .order("created_at", { ascending: true }),
      supabase.from("vehicle_images").select("*").order("sort_order", { ascending: true }),
    ]);

  const allVehicles = vehicles ?? [];

  const expensesByVehicle = new Map<string, any[]>();
  for (const e of expenses ?? []) {
    if (!expensesByVehicle.has(e.vehicle_id)) {
      expensesByVehicle.set(e.vehicle_id, []);
    }
    expensesByVehicle.get(e.vehicle_id)!.push(e);
  }

  const partnersByVehicle = new Map<string, any[]>();
  for (const vp of (vehiclePartners as any[]) ?? []) {
    if (!partnersByVehicle.has(vp.vehicle_id)) {
      partnersByVehicle.set(vp.vehicle_id, []);
    }
    if (vp.partners) {
      partnersByVehicle.get(vp.vehicle_id)!.push({
        id: vp.partners.id,
        name: vp.partners.name,
        purchase_contribution: vp.purchase_contribution ?? 0,
      });
    }
  }

  const imageByVehicle = new Map<string, string>();
  for (const img of images ?? []) {
    if (!imageByVehicle.has(img.vehicle_id)) {
      imageByVehicle.set(img.vehicle_id, img.url);
    }
  }

  const rows: VehicleRow[] = allVehicles.map((v) => {
    const vehicleExpenses = expensesByVehicle.get(v.id) ?? [];
    const vehiclePartners = partnersByVehicle.get(v.id) ?? [];

    const settlement = computeSettlement({
      purchase_price: Number(v.purchase_price),
      sold_price: v.sold_price != null ? Number(v.sold_price) : null,
      expenses: vehicleExpenses,
      partners: vehiclePartners,
    });

    return {
      id: v.id,
      registration_number: v.registration_number,
      make: v.make,
      model: v.model,
      year: v.year,
      purchase_price: Number(v.purchase_price),
      purchase_date: v.purchase_date,
      status: v.status,
      sold_price: v.sold_price != null ? Number(v.sold_price) : null,
      sold_date: v.sold_date,
      total_expenses: settlement.total_expenses, // operating expenses only
      partner: vehiclePartners.length > 0 ? vehiclePartners[0].name : "Self",
      profit: settlement.net_profit,
      image: imageByVehicle.get(v.id) ?? null,
    };
  });

  const brands = Array.from(new Set(rows.map((r) => r.make).filter(Boolean))) as string[];
  const partnerNames = Array.from(new Set(rows.map((r) => r.partner)));

  return <VehiclesTable rows={rows} brands={brands} partnerNames={partnerNames} />;
}