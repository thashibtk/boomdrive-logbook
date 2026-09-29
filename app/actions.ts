// app/actions.ts — full file, replace entirely
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ── Auth ──────────────────────────────────────────
export async function signIn(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/vehicles");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Partners ──────────────────────────────────────
export async function addPartner(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("partners").insert({ name, phone });
  revalidatePath("/partners");
}

export async function updatePartner(partnerId: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  if (!name) return;
  const supabase = await createClient();
  await supabase
    .from("partners")
    .update({ name, phone })
    .eq("id", partnerId);
  revalidatePath("/partners");
}

// ── Vehicles ──────────────────────────────────────
export async function addVehicle(formData: FormData) {
  const registration_number = String(formData.get("registration_number") || "")
    .trim()
    .toUpperCase();
  const make = String(formData.get("make") || "").trim() || null;
  const model = String(formData.get("model") || "").trim() || null;
  const variant = String(formData.get("variant") || "").trim() || null;
  const fuel_type = String(formData.get("fuel_type") || "").trim() || null;
  const transmission = String(formData.get("transmission") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;
  const yearRaw = String(formData.get("year") || "").trim();
  const year = yearRaw ? Number(yearRaw) : null;
  const kmRaw = String(formData.get("km_reading") || "").trim();
  const km_reading = kmRaw ? Number(kmRaw) : null;

  const purchase_price = Number(formData.get("purchase_price") || 0);
  const purchase_date = String(
    formData.get("purchase_date") || new Date().toISOString().slice(0, 10)
  );
  const seller_name = String(formData.get("seller_name") || "").trim() || null;
  const purchase_notes = String(formData.get("purchase_notes") || "").trim() || null;

  const status = String(formData.get("status") || "in_stock");
  const notes = String(formData.get("notes") || "").trim() || null;

  const addPartnerFlag = formData.get("add_partner") === "on";
  const partner_id = String(formData.get("partner_id") || "");
  const partner_purchase_contribution = Number(
    formData.get("partner_purchase_contribution") || 0
  );

  if (!registration_number) return;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      registration_number,
      make,
      model,
      variant,
      fuel_type,
      transmission,
      color,
      year,
      km_reading,
      purchase_price,
      purchase_date,
      seller_name,
      purchase_notes,
      status,
      notes,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/vehicles/new?error=${encodeURIComponent(error?.message || "Could not add vehicle")}`);
  }

  const vehicleId = data.id;

  // Link partner if requested
  if (addPartnerFlag && partner_id) {
    await supabase.from("vehicle_partners").insert({
      vehicle_id: vehicleId,
      partner_id,
      purchase_contribution: partner_purchase_contribution,
    });
  }

  // Images arrive already compressed to WebP from the browser (see
  // components/AddVehicleForm.tsx), so this just uploads them as-is.
  const images = formData.getAll("images") as File[];
  const realImages = images.filter((f) => f && f.size > 0);
  if (realImages.length) {
    let order = 0;
    for (const file of realImages) {
      const path = `${vehicleId}/${Date.now()}-${order}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("vehicle-images")
        .upload(path, file, { contentType: "image/webp", upsert: false });

      if (!uploadError) {
        const { data: pub } = supabase.storage.from("vehicle-images").getPublicUrl(path);
        await supabase
          .from("vehicle_images")
          .insert({ vehicle_id: vehicleId, url: pub.publicUrl, sort_order: order });
      }
      order++;
    }
  }

  revalidatePath("/vehicles");
  redirect(`/vehicles/${vehicleId}`);
}

export async function updateVehicle(vehicleId: string, formData: FormData) {
  const registration_number = String(formData.get("registration_number") || "")
    .trim()
    .toUpperCase();
  const make = String(formData.get("make") || "").trim() || null;
  const model = String(formData.get("model") || "").trim() || null;
  const variant = String(formData.get("variant") || "").trim() || null;
  const fuel_type = String(formData.get("fuel_type") || "").trim() || null;
  const transmission = String(formData.get("transmission") || "").trim() || null;
  const color = String(formData.get("color") || "").trim() || null;
  const yearRaw = String(formData.get("year") || "").trim();
  const year = yearRaw ? Number(yearRaw) : null;
  const kmRaw = String(formData.get("km_reading") || "").trim();
  const km_reading = kmRaw ? Number(kmRaw) : null;

  const purchase_price = Number(formData.get("purchase_price") || 0);
  const purchase_date = String(
    formData.get("purchase_date") || new Date().toISOString().slice(0, 10)
  );
  const seller_name = String(formData.get("seller_name") || "").trim() || null;
  const purchase_notes = String(formData.get("purchase_notes") || "").trim() || null;

  const status = String(formData.get("status") || "in_stock");
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!registration_number) return;

  const supabase = await createClient();
  
  const updateData: any = {
    registration_number,
    make,
    model,
    variant,
    fuel_type,
    transmission,
    color,
    year,
    km_reading,
    purchase_price,
    purchase_date,
    seller_name,
    purchase_notes,
    status,
    notes,
  };

  if (status !== "sold") {
    updateData.sold_price = null;
    updateData.sold_date = null;
    updateData.buyer_name = null;
    updateData.buyer_phone = null;
  }

  const { error } = await supabase
    .from("vehicles")
    .update(updateData)
    .eq("id", vehicleId);

  if (error) {
    redirect(`/vehicles/${vehicleId}/edit?error=${encodeURIComponent(error.message)}`);
  }
  const deletedImagesIds = formData.getAll("deleted_images") as string[];
  if (deletedImagesIds.length > 0) {
    const { data: toDelete } = await supabase
      .from("vehicle_images")
      .select("url")
      .in("id", deletedImagesIds);

    if (toDelete && toDelete.length > 0) {
      const paths = toDelete.map(img => {
        const parts = img.url.split("/vehicle-images/");
        return parts.length === 2 ? parts[1] : null;
      }).filter(Boolean) as string[];

      if (paths.length > 0) {
        await supabase.storage.from("vehicle-images").remove(paths);
      }
    }
    await supabase.from("vehicle_images").delete().in("id", deletedImagesIds);
  }

  const images = formData.getAll("images") as File[];
  const realImages = images.filter((f) => f && f.size > 0);
  if (realImages.length) {
    const { data: existingImages } = await supabase
      .from("vehicle_images")
      .select("sort_order")
      .eq("vehicle_id", vehicleId)
      .order("sort_order", { ascending: false })
      .limit(1);
    
    let order = existingImages?.length ? existingImages[0].sort_order + 1 : 0;
    
    for (const file of realImages) {
      const path = `${vehicleId}/${Date.now()}-${order}.webp`;
      const { error: uploadError } = await supabase.storage
        .from("vehicle-images")
        .upload(path, file, { contentType: "image/webp", upsert: false });

      if (!uploadError) {
        const { data: pub } = supabase.storage.from("vehicle-images").getPublicUrl(path);
        await supabase
          .from("vehicle_images")
          .insert({ vehicle_id: vehicleId, url: pub.publicUrl, sort_order: order });
      }
      order++;
    }
  }

  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${vehicleId}`);
  redirect(`/vehicles/${vehicleId}`);
}

export async function updateVehicleSale(vehicleId: string, formData: FormData) {
  const sold_price = Number(formData.get("sold_price") || 0);
  const sold_date = String(formData.get("sold_date") || new Date().toISOString().slice(0, 10));
  const buyer_name = String(formData.get("buyer_name") || "").trim() || null;
  const buyer_phone = String(formData.get("buyer_phone") || "").trim() || null;

  const supabase = await createClient();
  await supabase
    .from("vehicles")
    .update({ sold_price, sold_date, buyer_name, buyer_phone, status: "sold" })
    .eq("id", vehicleId);

  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function reopenVehicleSale(vehicleId: string) {
  const supabase = await createClient();
  await supabase
    .from("vehicles")
    .update({ sold_price: null, sold_date: null, buyer_name: null, buyer_phone: null, status: "in_stock" })
    .eq("id", vehicleId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function addVehiclePartner(vehicleId: string, formData: FormData) {
  const partner_id = String(formData.get("partner_id") || "");
  const purchase_contribution = Number(formData.get("purchase_contribution") || 0);
  if (!partner_id) return;
  const supabase = await createClient();
  await supabase
    .from("vehicle_partners")
    .insert({ vehicle_id: vehicleId, partner_id, purchase_contribution });
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function updatePartnerContribution(
  vehicleId: string,
  vehiclePartnerId: string,
  formData: FormData
) {
  const purchase_contribution = Number(formData.get("purchase_contribution") || 0);
  const supabase = await createClient();
  await supabase
    .from("vehicle_partners")
    .update({ purchase_contribution })
    .eq("id", vehiclePartnerId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function removeVehiclePartner(vehicleId: string, vehiclePartnerId: string) {
  const supabase = await createClient();
  await supabase.from("vehicle_partners").delete().eq("id", vehiclePartnerId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

// ── Expenses ──────────────────────────────────────
export async function addExpense(vehicleId: string, formData: FormData) {
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const expense_date = String(formData.get("expense_date") || new Date().toISOString().slice(0, 10));
  const category = String(formData.get("category") || "").trim() || null;
  const paidByRaw = String(formData.get("paid_by") || "");
  const paid_by = paidByRaw === "" ? null : paidByRaw;

  if (!description || amount <= 0) return;

  const supabase = await createClient();
  await supabase.from("expenses").insert({
    vehicle_id: vehicleId,
    description,
    amount,
    expense_date,
    category,
    paid_by,
  });
  revalidatePath(`/vehicles/${vehicleId}`);
}

// ── Settlement ────────────────────────────────────
export async function markVehicleSettled(vehicleId: string) {
  const supabase = await createClient();
  await supabase
    .from("vehicles")
    .update({ settled: true, settled_at: new Date().toISOString() })
    .eq("id", vehicleId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function reopenSettlement(vehicleId: string) {
  const supabase = await createClient();
  await supabase
    .from("vehicles")
    .update({ settled: false, settled_at: null })
    .eq("id", vehicleId);
  revalidatePath(`/vehicles/${vehicleId}`);
}

export async function deleteExpense(vehicleId: string, expenseId: string) {
  const supabase = await createClient();
  await supabase.from("expenses").delete().eq("id", expenseId);
  revalidatePath(`/vehicles/${vehicleId}`);
}