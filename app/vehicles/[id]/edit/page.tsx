import { createClient } from "@/lib/supabase/server";
import EditVehicleForm from "@/components/EditVehicleForm";
import { notFound } from "next/navigation";

export default async function EditVehiclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: vehicle }, { data: partners }, { data: images }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single(),
    supabase.from("partners").select("id, name").order("name"),
    supabase.from("vehicle_images").select("id, url").eq("vehicle_id", id).order("sort_order"),
  ]);

  if (!vehicle) return notFound();

  return <EditVehicleForm vehicle={vehicle} partners={partners ?? []} existingImages={images ?? []} error={error} />;
}
