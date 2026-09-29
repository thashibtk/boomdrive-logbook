// components/AddVehicleForm.tsx
"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  Wallet,
  Activity,
  Image as ImageIcon,
  Users,
  FileText,
  UploadCloud,
  Plus,
  Save,
  X,
  Loader2,
} from "lucide-react";
import { updateVehicle } from "@/app/actions";

const BRANDS = [
  "Maruti Suzuki",
  "Hyundai",
  "Honda",
  "Toyota",
  "Tata",
  "Mahindra",
  "Kia",
  "Renault",
  "Ford",
  "BMW",
  "Mercedes-Benz",
  "Audi",
  "Volkswagen",
  "Nissan",
  "Skoda",
  "MG",
  "Jeep",
  "Datsun",
  "Other",
];

const FUEL_TYPES = ["Petrol", "Diesel", "CNG", "Electric", "Hybrid"];
const TRANSMISSIONS = ["Manual", "Automatic", "AMT", "CVT"];

type Partner = { id: string; name: string };

// Resize to a max dimension and re-encode as WebP in the browser before
// upload, so we never send full-size camera photos to Supabase Storage.
function compressToWebp(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Image compression failed"));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not load image"));
    };

    img.src = objectUrl;
  });
}

export default function EditVehicleForm({
  partners,
  vehicle,
  existingImages = [],
  error,
}: {
  partners: Partner[];
  vehicle: any;
  existingImages?: { id: string; url: string }[];
  error?: string;
}) {
  const [images, setImages] = useState<File[]>([]);
  const [deletedImages, setDeletedImages] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [addPartner, setAddPartner] = useState(false);
  const [status, setStatus] = useState<"in_stock" | "sold" | "not_for_sale">(vehicle.status || "in_stock");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function syncInputFiles(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (fileInputRef.current) fileInputRef.current.files = dt.files;
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setCompressing(true);
    try {
      const incoming = Array.from(fileList).slice(0, 10 - images.length);
      const compressed = await Promise.all(incoming.map((f) => compressToWebp(f)));
      const next = [...images, ...compressed].slice(0, 10);
      setImages(next);
      syncInputFiles(next);
    } finally {
      setCompressing(false);
    }
  }

  function removeImage(idx: number) {
    const next = images.filter((_, i) => i !== idx);
    setImages(next);
    syncInputFiles(next);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/vehicles"
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white hover:border-accent"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Edit Vehicle</h1>
          <p className="text-sm text-ink/60">Update the vehicle details.</p>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-bad/10 px-4 py-2 text-sm text-bad">{error}</p>
      )}

      <form action={updateVehicle.bind(null, vehicle.id)} encType="multipart/form-data">
        {deletedImages.map((id) => (
          <input key={id} type="hidden" name="deleted_images" value={id} />
        ))}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="card p-5">
              <SectionHeader
                icon={Car}
                title="Basic Information"
                subtitle="Enter the main details of the vehicle."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Registration Number" required>
                  <input
                    className="input"
                    name="registration_number" defaultValue={vehicle.registration_number || ""}
                    placeholder="e.g. KL 58 AB 1234"
                    required
                  />
                </Field>
                <Field label="Brand" required>
                  <input
                    className="input"
                    name="make" defaultValue={vehicle.make || ""}
                    list="brand-options"
                    placeholder="e.g. Toyota"
                    autoComplete="off"
                    required
                  />
                  <datalist id="brand-options">
                    {BRANDS.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Model" required>
                  <input className="input" name="model" defaultValue={vehicle.model || ""} placeholder="e.g. Innova" required />
                </Field>

                <Field label="Year" required>
                  <input
                    className="input"
                    name="year" defaultValue={vehicle.year || ""}
                    type="number"
                    placeholder="e.g. 2018"
                    required
                  />
                </Field>
                <Field label="Variant">
                  <input className="input" name="variant" defaultValue={vehicle.variant || ""} placeholder="e.g. 2.4 G" />
                </Field>
                <Field label="Fuel Type">
                  <select className="input" name="fuel_type" defaultValue={vehicle.fuel_type || ""}>
                    <option value="" disabled>
                      Select Fuel Type
                    </option>
                    {FUEL_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Transmission">
                  <select className="input" name="transmission" defaultValue={vehicle.transmission || ""}>
                    <option value="" disabled>
                      Select Transmission
                    </option>
                    {TRANSMISSIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Color">
                  <input className="input" name="color" defaultValue={vehicle.color || ""} placeholder="e.g. White" />
                </Field>
                <Field label="KM Reading (at purchase)">
                  <input
                    className="input"
                    name="km_reading" defaultValue={vehicle.km_reading || ""}
                    type="number"
                    placeholder="e.g. 78000"
                  />
                </Field>
              </div>
            </div>

            {/* Purchase Information */}
            <div className="card p-5">
              <SectionHeader
                icon={Wallet}
                title="Purchase Information"
                subtitle="Enter purchase details of the vehicle."
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field label="Purchase Date" required>
                  <input
                    className="input"
                    name="purchase_date"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </Field>
                <Field label="Purchase Price" required>
                  <input
                    className="input"
                    name="purchase_price" defaultValue={vehicle.purchase_price || ""}
                    type="number"
                    step="0.01"
                    placeholder="0"
                    required
                  />
                </Field>
                <Field label="Seller Name (Optional)">
                  <input
                    className="input"
                    name="seller_name" defaultValue={vehicle.seller_name || ""}
                    placeholder="e.g. Individual / Dealer"
                  />
                </Field>

                <div className="sm:col-span-3">
                  <Field label="Notes (Purchase)">
                    <textarea
                      className="input"
                      name="purchase_notes"
                      rows={2}
                      defaultValue={vehicle.purchase_notes || ""}
                      placeholder="Any additional purchase notes..."
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="card p-5">
              <SectionHeader
                icon={Activity}
                title="Current Status"
                subtitle="Set the current status of the vehicle."
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatusOption
                  name="status"
                  value="in_stock"
                  checked={status === "in_stock"}
                  onChange={() => setStatus("in_stock")}
                  dotClass="bg-good"
                  title="In Stock"
                  desc="Vehicle is available for sale"
                />
                <StatusOption
                  name="status"
                  value="sold"
                  checked={status === "sold"}
                  onChange={() => setStatus("sold")}
                  dotClass="bg-accent"
                  title="Sold"
                  desc="Vehicle has been sold"
                />
                <StatusOption
                  name="status"
                  value="not_for_sale"
                  checked={status === "not_for_sale"}
                  onChange={() => setStatus("not_for_sale")}
                  dotClass="bg-ink/40"
                  title="Not for Sale"
                  desc="Keeping for personal use"
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* Vehicle Images */}
            <div className="card p-5">
              <SectionHeader
                icon={ImageIcon}
                title="Vehicle Images"
                subtitle="Upload clear images of the vehicle."
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors ${
                  dragOver ? "border-accent bg-accent/5" : "border-line bg-paper/40"
                }`}
              >
                {compressing ? (
                  <>
                    <Loader2 size={26} className="mb-2 animate-spin text-accent" />
                    <p className="text-sm font-medium">Compressing images…</p>
                  </>
                ) : (
                  <>
                    <UploadCloud size={26} className="mb-2 text-ink/40" />
                    <p className="text-sm font-medium">
                      Drag &amp; drop images here, or click to upload
                    </p>
                    <p className="text-xs text-ink/40">
                      You can upload multiple images (Max 10) — auto-compressed to WebP
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  name="images"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </div>

              {(existingImages.filter(img => !deletedImages.includes(img.id)).length > 0 || images.length > 0) && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {existingImages.filter(img => !deletedImages.includes(img.id)).map((img) => (
                    <div
                      key={img.id}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletedImages((prev) => [...prev, img.id]);
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  {images.map((file, i) => (
                    <div
                      key={i}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-line"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={URL.createObjectURL(file)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(i);
                        }}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  ))}
                  {(existingImages.length - deletedImages.length + images.length) < 10 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-ink/40 hover:border-accent hover:text-accent"
                    >
                      <Plus size={18} />
                      <span className="text-[11px]">Add More</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="card p-5">
              <SectionHeader
                icon={FileText}
                title="Additional Notes"
                subtitle="Any other important information about this vehicle."
              />
              <textarea
                className="input"
                name="notes"
                rows={4}
                defaultValue={vehicle.notes || ""}
                placeholder="e.g. Vehicle condition, special notes, expected selling price, etc..."
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 mt-6 flex justify-end gap-3 border-t border-line bg-paper py-4">
          <Link href="/vehicles" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={compressing}
            className="btn-primary bg-accent hover:bg-accent/90 disabled:opacity-50"
          >
            <Save size={16} className="mr-1.5" /> Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  noMargin,
}: {
  icon: any;
  title: string;
  subtitle: string;
  noMargin?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${noMargin ? "" : "mb-4"}`}>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Icon size={18} />
      </span>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-ink/50">{subtitle}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/70">
        {label} {required && <span className="text-bad">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatusOption({
  name,
  value,
  checked,
  onChange,
  dotClass,
  title,
  desc,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  dotClass: string;
  title: string;
  desc: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
        checked ? "border-accent bg-accent/5" : "border-line"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          checked ? "border-accent" : "border-line"
        }`}
      >
        {checked && <span className={`h-2 w-2 rounded-full ${dotClass}`} />}
      </span>
      <div>
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-ink/50">{desc}</div>
      </div>
    </label>
  );
}