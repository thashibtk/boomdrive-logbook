// app/vehicles/new/page.tsx
import { createClient } from "@/lib/supabase/server";
import AddVehicleForm from "@/components/AddVehicleForm";

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: partners } = await supabase.from("partners").select("id, name").order("name");

  return <AddVehicleForm partners={partners ?? []} error={error} />;
}