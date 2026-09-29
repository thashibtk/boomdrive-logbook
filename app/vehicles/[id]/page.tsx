import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import VehicleDetailView from "@/components/VehicleDetailView";

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id } = await params;

  const [
    { data: vehicle },
    { data: images },
    { data: vehiclePartners },
    { data: expenses },
    { data: allPartners },
  ] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single(),
    supabase
      .from("vehicle_images")
      .select("*")
      .eq("vehicle_id", id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("vehicle_partners")
      .select("id, partner_id, purchase_contribution, partners(id, name, phone)")
      .eq("vehicle_id", id),
    supabase
      .from("expenses")
      .select("*")
      .eq("vehicle_id", id)
      .order("expense_date", { ascending: false }),
    supabase.from("partners").select("id, name").order("name"),
  ]);

  if (!vehicle) notFound();

  const partnersOnVehicle = (vehiclePartners ?? []).map((vp: any) => ({
    vehiclePartnerId: vp.id,
    id: vp.partners.id,
    name: vp.partners.name,
    phone: vp.partners.phone as string | null,
    purchase_contribution: Number(vp.purchase_contribution || 0),
  }));

  const availablePartners = (allPartners ?? []).filter(
    (p) => !partnersOnVehicle.some((vp) => vp.id === p.id)
  );

  return (
    <VehicleDetailView
      vehicle={vehicle}
      images={images ?? []}
      partnersOnVehicle={partnersOnVehicle}
      expenses={expenses ?? []}
      availablePartners={availablePartners}
    />
  );
}