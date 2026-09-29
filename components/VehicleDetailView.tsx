// components/VehicleDetailView.tsx
"use client";

import { useState, useRef } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit,
  Plus,
  Car,
  IndianRupee,
  Coins,
  LayoutList,
  Receipt,
  Tag,
  Users,
  Trash2,
  CheckCircle2,
  Phone,
  ArrowUpDown,
} from "lucide-react";
import { formatMoney, computeSettlement } from "@/lib/calculations";
import {
  addExpense,
  deleteExpense,
  updateVehicleSale,
  reopenVehicleSale,
  addVehiclePartner,
  removeVehiclePartner,
  markVehicleSettled,
  reopenSettlement,
} from "@/app/actions";

const EXPENSE_CATEGORIES = [
  "Purchase",
  "Service",
  "Tyres",
  "Insurance",
  "Parts",
  "Transfer",
  "Registration",
  "Appearance",
  "Other",
];

type VehicleImage = { id: string; url: string };
type PartnerOnVehicle = {
  vehiclePartnerId: string;
  id: string;
  name: string;
  phone: string | null;
  purchase_contribution: number;
};
type Expense = {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category: string | null;
  paid_by: string | null;
};

type Vehicle = {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  variant: string | null;
  fuel_type: string | null;
  transmission: string | null;
  color: string | null;
  year: number | null;
  km_reading: number | null;
  purchase_price: number;
  purchase_date: string;
  seller_name: string | null;
  purchase_notes: string | null;
  status: "in_stock" | "sold" | "not_for_sale";
  sold_price: number | null;
  sold_date: string | null;
  buyer_name: string | null;
  buyer_phone: string | null;
  notes: string | null;
  settled: boolean;
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutList },
  { key: "expenses", label: "Expenses", icon: Receipt },
  { key: "sale", label: "Sale Details", icon: Tag },
  { key: "settlement", label: "Partner Settlement", icon: Users },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function VehicleDetailView({
  vehicle,
  images,
  partnersOnVehicle,
  expenses,
  availablePartners,
}: {
  vehicle: Vehicle;
  images: VehicleImage[];
  partnersOnVehicle: PartnerOnVehicle[];
  expenses: Expense[];
  availablePartners: { id: string; name: string }[];
}) {
  const [activeImage, setActiveImage] = useState(0);
  const [tab, setTab] = useState<TabKey>("overview");
  const today = new Date().toISOString().slice(0, 10);

  const settlement = computeSettlement({
    purchase_price: vehicle.purchase_price,
    sold_price: vehicle.sold_price,
    expenses,
    partners: partnersOnVehicle,
  });

  const statusLabel =
    vehicle.status === "sold"
      ? "Sold"
      : vehicle.status === "not_for_sale"
      ? "Not for Sale"
      : "In Stock";
  const statusClass =
    vehicle.status === "sold"
      ? "bg-good/10 text-good"
      : vehicle.status === "not_for_sale"
      ? "bg-ink/10 text-ink/60"
      : "bg-accent/10 text-accent";

  const boundAddExpense = addExpense.bind(null, vehicle.id);
  const boundDeleteExpense = deleteExpense.bind(null, vehicle.id);
  const boundUpdateVehicleSale = updateVehicleSale.bind(null, vehicle.id);
  const boundReopenVehicleSale = reopenVehicleSale.bind(null, vehicle.id);
  const boundAddVehiclePartner = addVehiclePartner.bind(null, vehicle.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/vehicles"
            className="mb-1 flex items-center gap-1 text-sm text-ink/50 hover:text-accent"
          >
            <ArrowLeft size={14} /> Back to Vehicles
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              {[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "Vehicle"}
            </h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <p className="text-sm text-ink/50">
            {[
              vehicle.registration_number,
              vehicle.year,
              [vehicle.variant, vehicle.fuel_type].filter(Boolean).join(" "),
              vehicle.make,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/vehicles/${vehicle.id}/edit`} className="btn-secondary">
            <Edit size={15} className="mr-1.5" /> Edit Vehicle
          </Link>
        </div>
      </div>

      {/* Top row: Gallery | Vehicle Info | Financial Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Gallery */}
        <div className="card p-3">
          {images.length ? (
            <>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-paper">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[activeImage]?.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setActiveImage((i) => (i - 1 + images.length) % images.length)
                      }
                      className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImage((i) => (i + 1) % images.length)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`aspect-square overflow-hidden rounded-md border-2 ${
                        i === activeImage ? "border-accent" : "border-transparent"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-paper text-ink/30">
              <Car size={48} />
            </div>
          )}
        </div>

        {/* Vehicle Information */}
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Vehicle Information</h2>
          </div>
          <dl className="space-y-2 text-sm">
            <Row label="Registration No." value={vehicle.registration_number} />
            <Row
              label="Brand / Model"
              value={[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}
            />
            <Row label="Year" value={vehicle.year ?? "—"} />
            <Row label="Variant" value={vehicle.variant ?? "—"} />
            <Row label="Fuel Type" value={vehicle.fuel_type ?? "—"} />
            <Row label="Transmission" value={vehicle.transmission ?? "—"} />
            <Row label="Color" value={vehicle.color ?? "—"} />
            <Row
              label="KM Reading (Purchase)"
              value={vehicle.km_reading != null ? `${vehicle.km_reading.toLocaleString("en-IN")} km` : "—"}
            />
            <Row label="Purchase Date" value={vehicle.purchase_date} />
            <Row label="Purchase Price" value={formatMoney(vehicle.purchase_price)} />
            {vehicle.status === "sold" && (
              <>
                <Row label="Sale Date" value={vehicle.sold_date ?? "—"} />
                <Row label="Sale Price" value={formatMoney(vehicle.sold_price ?? 0)} />
              </>
            )}
            {(vehicle.notes || vehicle.purchase_notes) && (
              <Row label="Notes" value={vehicle.notes || vehicle.purchase_notes || "—"} />
            )}
          </dl>
        </div>

        {/* Financial Summary */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Financial Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <SummaryStat icon={Car} label="Purchase Price" value={formatMoney(vehicle.purchase_price)} />
            <SummaryStat icon={Receipt} label="Total Expenses" value={formatMoney(settlement.total_expenses)} />
            <SummaryStat
              icon={IndianRupee}
              label="Sale Price"
              value={vehicle.sold_price != null ? formatMoney(vehicle.sold_price) : "—"}
            />
            <SummaryStat
              icon={Coins}
              label="Net Profit"
              value={settlement.net_profit != null ? formatMoney(settlement.net_profit) : "—"}
              highlight={settlement.net_profit != null && settlement.net_profit >= 0}
            />
          </div>

            {settlement.share_per_person != null && (
            <div className="mt-4 border-t border-line pt-3">
                <p className="mb-2 text-xs font-medium text-ink/50">
                Final Settlement ({settlement.shares}-way, adjusted for who paid what)
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                <div>
                    <div className="text-ink/50">You</div>
                    <div className="font-semibold">{formatMoney(settlement.admin_net!)}</div>
                </div>
                {settlement.partners.map((p) => (
                    <div key={p.partner_id}>
                    <div className="text-ink/50">{p.name}</div>
                    <div className="font-semibold">{formatMoney(p.balance_owed_to_them)}</div>
                    </div>
                ))}
                </div>
                <p className="mt-1 text-[11px] text-ink/40">
                Final amount is their total invested capital plus an equal profit share of {formatMoney(settlement.share_per_person)} each (assuming you collect the sale proceeds).
                </p>
            </div>
            )}
        </div>
      </div>

      {/* Tabs + content */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[200px_1fr_300px]">
        {/* Tab list */}
        <div className="card flex overflow-x-auto p-1.5 lg:flex-col lg:overflow-visible lg:p-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex whitespace-nowrap items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${
                tab === t.key ? "bg-accent/10 text-accent" : "text-ink/60 hover:bg-paper"
              }`}
            >
              <t.icon size={16} className="shrink-0" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="card p-5">
          {tab === "overview" && (
            <OverviewTab expenses={expenses} partnersOnVehicle={partnersOnVehicle} settlement={settlement} />
          )}

          {tab === "expenses" && (
            <ExpensesTab
              expenses={expenses}
              partnersOnVehicle={partnersOnVehicle}
              today={today}
              isSettled={vehicle.settled}
              boundAddExpense={boundAddExpense}
              boundDeleteExpense={boundDeleteExpense}
            />
          )}

          {tab === "sale" && (
              <SaleDetailsTab
                vehicle={vehicle}
                today={today}
                boundUpdateVehicleSale={boundUpdateVehicleSale}
                boundReopenVehicleSale={boundReopenVehicleSale}
              />
          )}

          {tab === "settlement" && (
            <SettlementTab
              vehicleId={vehicle.id}
              vehicle={vehicle}
              settlement={settlement}
              partnersOnVehicle={partnersOnVehicle}
              availablePartners={availablePartners}
              boundAddVehiclePartner={boundAddVehiclePartner}
            />
          )}
        </div>

        {/* Right: Partner Information */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users size={16} className="text-accent" /> Partner Information
              </h2>
            </div>
            {partnersOnVehicle.length ? (
              <div className="space-y-3">
                {partnersOnVehicle.map((p) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      {p.phone && (
                        <div className="flex items-center gap-1 text-xs text-ink/50">
                          <Phone size={11} /> {p.phone}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
              </div>
            ) : (
              <p className="text-sm text-ink/50">No partner on this deal — you keep 100%.</p>
            )}
          </div>

          {vehicle.status === "sold" && (
            <div
              className={`card p-5 ${vehicle.settled ? "border-good/40 bg-good/5" : ""}`}
            >
              <h2 className="mb-2 text-sm font-semibold">Settlement Status</h2>
              {vehicle.settled ? (
                <p className="flex items-center gap-2 text-sm text-good">
                  <CheckCircle2 size={16} /> Settled
                </p>
              ) : (
                <p className="text-sm text-ink/50">Not yet settled with partners.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Small building blocks ──────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          highlight ? "bg-good/15 text-good" : "bg-accent/15 text-accent"
        }`}
      >
        <Icon size={16} />
      </span>
      <div>
        <div className="text-xs text-ink/50">{label}</div>
        <div className={`text-sm font-semibold ${highlight ? "text-good" : ""}`}>{value}</div>
      </div>
    </div>
  );
}

// ── Overview tab ────────────────────────────────────

function OverviewTab({
  expenses,
  partnersOnVehicle,
  settlement,
}: {
  expenses: Expense[];
  partnersOnVehicle: PartnerOnVehicle[];
  settlement: ReturnType<typeof computeSettlement>;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Receipt size={18} className="text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Overview</h2>
          <p className="text-xs text-ink/50">All expenses related to this vehicle</p>
        </div>
      </div>
      <ExpenseTable expenses={expenses} partnersOnVehicle={partnersOnVehicle} readOnly />
    </div>
  );
}

// ── Expenses tab ─────────────────────────────────────

function ExpenseSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="btn-primary col-span-2 bg-accent hover:bg-accent/90 sm:col-span-6 disabled:opacity-50"
      type="submit"
      disabled={pending}
    >
      {pending ? (
        "Adding..."
      ) : (
        <>
          <Plus size={15} className="mr-1.5" /> Add Expense
        </>
      )}
    </button>
  );
}

function ExpensesTab({
  expenses,
  partnersOnVehicle,
  today,
  isSettled,
  boundAddExpense,
  boundDeleteExpense,
}: {
  expenses: Expense[];
  partnersOnVehicle: PartnerOnVehicle[];
  today: string;
  isSettled: boolean;
  boundAddExpense: (formData: FormData) => Promise<void>;
  boundDeleteExpense: (expenseId: string) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (formData: FormData) => {
    await boundAddExpense(formData);
    formRef.current?.reset();
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Receipt size={18} className="text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Expenses</h2>
          <p className="text-xs text-ink/50">Add and manage expenses for this vehicle</p>
        </div>
      </div>

      {isSettled ? (
        <div className="mb-5 rounded-lg border border-line bg-paper/40 p-4 text-sm text-ink/60">
          This vehicle is settled. You cannot add or modify expenses.
        </div>
      ) : (
        <form
          ref={formRef}
          action={handleSubmit}
          className="mb-5 grid grid-cols-2 gap-2 rounded-lg border border-line bg-paper/40 p-3 sm:grid-cols-6"
        >
          <input className="input sm:col-span-2" name="description" placeholder="Description" required />
          <input className="input" name="amount" type="number" step="0.01" placeholder="Amount" required />
          <select className="input" name="category" defaultValue="">
            <option value="" disabled>
              Category
            </option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select className="input" name="paid_by" defaultValue="">
            <option value="">Paid by: You</option>
            {partnersOnVehicle.map((p) => (
              <option key={p.id} value={p.id}>
                Paid by: {p.name}
              </option>
            ))}
          </select>
          <input className="input" name="expense_date" type="date" defaultValue={today} />
          <ExpenseSubmitButton />
        </form>
      )}

      <ExpenseTable 
        expenses={expenses} 
        partnersOnVehicle={partnersOnVehicle} 
        onDelete={boundDeleteExpense} 
        readOnly={isSettled} 
      />
    </div>
  );
}

function ExpenseTable({
  expenses,
  partnersOnVehicle,
  onDelete,
  readOnly,
}: {
  expenses: Expense[];
  partnersOnVehicle: PartnerOnVehicle[];
  onDelete?: (expenseId: string) => Promise<void>;
  readOnly?: boolean;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortPaidBy, setSortPaidBy] = useState<"asc" | "desc" | null>(null);
  
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const displayedExpenses = [...expenses];
  if (sortPaidBy) {
    displayedExpenses.sort((a, b) => {
      const payerA = a.paid_by
        ? partnersOnVehicle.find((p) => p.id === a.paid_by)?.name ?? "Partner"
        : "You";
      const payerB = b.paid_by
        ? partnersOnVehicle.find((p) => p.id === b.paid_by)?.name ?? "Partner"
        : "You";
      if (sortPaidBy === "asc") return payerA.localeCompare(payerB);
      return payerB.localeCompare(payerA);
    });
  }

  const confirmDelete = async () => {
    if (!deleteId || !onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(deleteId);
      setDeleteId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-ink/50">
            <th className="py-2 pr-3 font-medium">#</th>
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Description</th>
            <th className="py-2 pr-3 font-medium">Amount</th>
            <th className="py-2 pr-3 font-medium">Category</th>
            <th className="py-2 pr-3 font-medium">
              <button 
                type="button" 
                className="flex items-center gap-1 hover:text-ink transition-colors"
                onClick={() => setSortPaidBy(prev => prev === "asc" ? "desc" : prev === "desc" ? null : "asc")}
              >
                Paid By
                <ArrowUpDown size={12} className={sortPaidBy ? "text-accent opacity-100" : "opacity-40"} />
              </button>
            </th>
            {!readOnly && <th className="py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {displayedExpenses.length ? (
            displayedExpenses.map((e, i) => {
              const payer = e.paid_by
                ? partnersOnVehicle.find((p) => p.id === e.paid_by)?.name ?? "Partner"
                : "You";
              return (
                <tr key={e.id}>
                  <td className="py-2.5 pr-3 text-ink/50">{i + 1}</td>
                  <td className="py-2.5 pr-3">{e.expense_date}</td>
                  <td className="py-2.5 pr-3">{e.description}</td>
                  <td className="py-2.5 pr-3 font-medium">{formatMoney(e.amount)}</td>
                  <td className="py-2.5 pr-3 text-ink/60">{e.category ?? "—"}</td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        payer === "You" ? "bg-accent/10 text-accent" : "bg-gold/15 text-gold-dark"
                      }`}
                    >
                      {payer}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="py-2.5">
                      <button 
                        type="button" 
                        onClick={() => setDeleteId(e.id)}
                        className="text-ink/30 hover:text-bad"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} className="py-6 text-center text-ink/50">
                No expenses logged yet.
              </td>
            </tr>
          )}
        </tbody>
        {expenses.length > 0 && (
          <tfoot>
            <tr className="border-t border-line font-semibold">
              <td colSpan={3} className="py-2.5 pr-3">
                Total Expenses
              </td>
              <td className="py-2.5 pr-3">{formatMoney(total)}</td>
              <td colSpan={readOnly ? 2 : 3} />
            </tr>
          </tfoot>
        )}
      </table>
      </div>

      {deleteId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" 
          onClick={() => !isDeleting && setDeleteId(null)}
        >
          <div className="card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-lg font-semibold">Delete Expense</h3>
            <p className="mb-4 text-sm text-ink/70">
              Are you sure you want to delete this expense? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setDeleteId(null)} 
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={confirmDelete} 
                className="btn-primary bg-bad hover:bg-bad/90 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Sale Details tab ─────────────────────────────────

function SaleDetailsTab({
  vehicle,
  today,
  boundUpdateVehicleSale,
  boundReopenVehicleSale,
}: {
  vehicle: Vehicle;
  today: string;
  boundUpdateVehicleSale: (formData: FormData) => Promise<void>;
  boundReopenVehicleSale: () => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  const handleReopen = async () => {
    setIsReopening(true);
    try {
      await boundReopenVehicleSale();
      setShowReopenModal(false);
    } finally {
      setIsReopening(false);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    try {
      await boundUpdateVehicleSale(formData);
      setIsEditing(false);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Tag size={18} className="text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Sale Details</h2>
          <p className="text-xs text-ink/50">Record or review how this vehicle was sold</p>
        </div>
      </div>

      {vehicle.status === "sold" ? (
        <div className="max-w-md">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <div className="text-ink/50 mb-1">Sold Price</div>
              <div className="font-medium">{formatMoney(vehicle.sold_price ?? 0)}</div>
            </div>
            <div>
              <div className="text-ink/50 mb-1">Sold Date</div>
              <div className="font-medium">{vehicle.sold_date ?? "—"}</div>
            </div>
            <div>
              <div className="text-ink/50 mb-1">Buyer Name</div>
              <div className="font-medium">{vehicle.buyer_name ?? "—"}</div>
            </div>
            <div>
              <div className="text-ink/50 mb-1">Buyer Phone</div>
              <div className="font-medium">{vehicle.buyer_phone ?? "—"}</div>
            </div>
          </div>
          <div className="pt-5 flex gap-3">
            <button 
              className="btn-secondary" 
              type="button" 
              onClick={() => setIsEditing(true)}
            >
              <Edit size={14} className="mr-1.5" /> Edit Sale Details
            </button>
            <button 
              className="text-sm font-medium text-ink/60 hover:text-bad" 
              type="button" 
              onClick={() => setShowReopenModal(true)}
            >
              Reopen Vehicle
            </button>
          </div>
        </div>
      ) : (
        <div className="py-4">
          <p className="mb-4 text-sm text-ink/60">This vehicle is currently in stock and has not been sold yet.</p>
          <button 
            className="btn-primary bg-accent hover:bg-accent/90" 
            type="button" 
            onClick={() => setIsEditing(true)}
          >
            Mark as Sold
          </button>
        </div>
      )}

      {isEditing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isPending && setIsEditing(false)}
        >
          <div className="card w-full max-w-lg p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold">{vehicle.status === "sold" ? "Edit Sale Details" : "Mark as Sold"}</h3>
            <form action={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sold_price" className="text-sm font-medium text-ink/80">Sold Price (₹)</label>
                  <input className="input mt-1.5" name="sold_price" id="sold_price" type="number" step="0.01" defaultValue={vehicle.sold_price ?? ""} required={vehicle.status === "sold"} />
                </div>
                <div>
                  <label htmlFor="sold_date" className="text-sm font-medium text-ink/80">Sold Date</label>
                  <input className="input mt-1.5" name="sold_date" id="sold_date" type="date" defaultValue={vehicle.sold_date ?? today} />
                </div>
                <div>
                  <label htmlFor="buyer_name" className="text-sm font-medium text-ink/80">Buyer Name</label>
                  <input className="input mt-1.5" name="buyer_name" id="buyer_name" defaultValue={vehicle.buyer_name ?? ""} />
                </div>
                <div>
                  <label htmlFor="buyer_phone" className="text-sm font-medium text-ink/80">Buyer Phone</label>
                  <input className="input mt-1.5" name="buyer_phone" id="buyer_phone" defaultValue={vehicle.buyer_phone ?? ""} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2 border-t border-line">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => setIsEditing(false)}
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary bg-accent hover:bg-accent/90 disabled:opacity-50"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReopenModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !isReopening && setShowReopenModal(false)}
        >
          <div className="card w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold text-bad">Reopen Vehicle</h3>
            <p className="mb-6 text-sm text-ink/70">
              Are you sure you want to reopen this vehicle? This will mark it as "In Stock" and clear the current sale details (sold price, date, buyer info).
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowReopenModal(false)}
                disabled={isReopening}
              >
                Cancel
              </button>
              <form action={handleReopen}>
                <button 
                  type="submit" 
                  className="btn-primary bg-bad hover:bg-bad/90 disabled:opacity-50"
                  disabled={isReopening}
                >
                  {isReopening ? "Reopening..." : "Confirm Reopen"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Partner Settlement tab ───────────────────────────

function SettlementTab({
  vehicleId,
  vehicle,
  settlement,
  partnersOnVehicle,
  availablePartners,
  boundAddVehiclePartner,
}: {
  vehicleId: string;
  vehicle: Vehicle;
  settlement: ReturnType<typeof computeSettlement>;
  partnersOnVehicle: PartnerOnVehicle[];
  availablePartners: { id: string; name: string }[];
  boundAddVehiclePartner: (formData: FormData) => Promise<void>;
}) {
  const boundMarkSettled = markVehicleSettled.bind(null, vehicleId);
  const boundReopenSettlement = reopenSettlement.bind(null, vehicleId);
  const boundRemovePartner = removeVehiclePartner.bind(null, vehicleId);
  const [confirmAction, setConfirmAction] = useState<"settle" | "reopen" | null>(null);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Users size={18} className="text-accent" />
        <div>
          <h2 className="text-sm font-semibold">Partner Settlement</h2>
          <p className="text-xs text-ink/50">
            Profit share and cost-contribution reimbursement for each partner
          </p>
        </div>
      </div>

      {partnersOnVehicle.length === 0 ? (
        <p className="text-sm text-ink/50">
          No partner attached to this vehicle — you keep 100% of the profit.
        </p>
      ) : (
        <>
          <div className="mb-4 rounded-lg border border-line bg-paper/40 p-3 text-sm text-ink/60">
            Total Vehicle Cost (purchase + all expenses):{" "}
            <span className="font-semibold text-ink">{formatMoney(settlement.total_cost)}</span>
          </div>

          {settlement.net_profit === null ? (
            <p className="text-sm text-ink/50">
              Settlement will be calculated once the vehicle is marked as sold, in the Sale
              Details tab. You can still record each partner's contribution to the purchase
              price below.
            </p>
          ) : (
            <div className="space-y-4">
              {settlement.partners.map((p) => (
                <div key={p.partner_id} className="rounded-lg border border-line p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-lg">{p.name}</span>
                    <span
                      className={`text-sm font-semibold ${
                        p.balance_owed_to_them >= 0 ? "text-good" : "text-bad"
                      }`}
                    >
                      {p.balance_owed_to_them >= 0
                        ? `You owe them ${formatMoney(p.balance_owed_to_them)}`
                        : `They owe you ${formatMoney(-p.balance_owed_to_them)}`}
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-ink/70">
                    <div className="flex justify-between">
                      <span>Total Expenses He Paid:</span>
                      <span className="font-medium text-ink">{formatMoney(p.total_contribution)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Share:</span>
                      <span className="font-medium text-ink">{formatMoney(p.profit_share)}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-line/50 pt-2 font-medium">
                      <span>Amount you need to give:</span>
                      <span className="text-ink">{formatMoney(p.balance_owed_to_them)}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-lg border border-line bg-paper/40 p-4 text-xs text-ink/60">
                <div className="flex items-center justify-between">
                  <span>Your total contribution (purchase + expenses you paid)</span>
                  <span className="font-medium text-ink">
                    {formatMoney(settlement.admin_total_contribution)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Your final settlement amount</span>
                  <span className="font-semibold text-ink">
                    {formatMoney(settlement.admin_net!)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-line pt-4">
                {vehicle.settled ? (
                  <>
                    <span className="flex items-center gap-1.5 text-sm text-good">
                      <CheckCircle2 size={16} /> Settled with all partners
                    </span>
                    <button 
                      className="text-xs text-ink/50 underline" 
                      type="button"
                      onClick={() => setConfirmAction("reopen")}
                    >
                      Reopen
                    </button>
                  </>
                ) : (
                  <button 
                    className="btn-primary bg-good hover:bg-good/90" 
                    type="button"
                    onClick={() => setConfirmAction("settle")}
                  >
                    <CheckCircle2 size={15} className="mr-1.5" /> Mark as Settled
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {confirmAction && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div className="card w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h3 className="mb-3 text-lg font-semibold">
              {confirmAction === "settle" ? "Confirm Settlement" : "Reopen Settlement"}
            </h3>
            <p className="mb-6 text-sm text-ink/70">
              {confirmAction === "settle" 
                ? "Are you sure you want to mark this vehicle as fully settled with all partners? Make sure all payouts have been made."
                : "Are you sure you want to reopen the settlement? This will mark the vehicle as unsettled again."}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setConfirmAction(null)}
              >
                Cancel
              </button>
              <form action={confirmAction === "settle" ? boundMarkSettled : boundReopenSettlement}>
                <button 
                  type="submit" 
                  className={`btn-primary ${confirmAction === "settle" ? "bg-good hover:bg-good/90" : "bg-accent hover:bg-accent/90"}`}
                  onClick={() => setTimeout(() => setConfirmAction(null), 10)}
                >
                  Confirm
                </button>
              </form>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}