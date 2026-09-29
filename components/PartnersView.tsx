"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  IndianRupee,
  TrendingUp,
  Clock,
  Search,
  ChevronDown,
  Download,
  Filter,
  Plus,
  X,
  Pencil,
  MoreVertical,
  Car,
  Wallet,
  Coins,
  CheckCircle2,
  Phone,
  Receipt,
  ChevronRight,
} from "lucide-react";
import { formatMoney } from "@/lib/calculations";
import { addPartner, updatePartner } from "@/app/actions";

// ── Types (shared with app/partners/page.tsx) ─────────

export type PartnerVehicle = {
  vehicleId: string;
  name: string;
  reg: string;
  image: string | null;
  isSold: boolean;
  soldDate: string | null;
  purchaseDate: string;
  invested: number; // expenses this partner personally paid on this vehicle
  expenseShare: number; // their fair (equal) share of this vehicle's total expenses
  profitShare: number | null; // null until sold
  balance: number | null; // + = you owe them, - = they owe you; null until sold
  settled: boolean;
};

export type PartnerExpense = {
  id: string;
  date: string;
  vehicleId: string;
  vehicleReg: string;
  description: string;
  category: string | null;
  amount: number;
};

export type PartnerData = {
  id: string;
  name: string;
  phone: string | null;
  vehicles: PartnerVehicle[];
  expenses: PartnerExpense[];
  vehicleCount: number;
  soldCount: number;
  inStockCount: number;
  invested: number;
  expenseShare: number;
  profitShare: number;
  pending: number;
  settledAmount: number;
};

type TabKey = "overview" | "vehicles" | "expenses" | "settlements";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "vehicles", label: "Vehicles" },
  { key: "expenses", label: "Expenses" },
  { key: "settlements", label: "Settlements" },
];

type ModalState = { mode: "add" } | { mode: "edit"; partner: PartnerData } | null;

const SORTERS: Record<string, (a: PartnerData, b: PartnerData) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  pending: (a, b) => b.pending - a.pending,
  invested: (a, b) => b.invested - a.invested,
  profit: (a, b) => b.profitShare - a.profitShare,
};

// ── Main component ───────────────────────────────────

export default function PartnersView({ partners }: { partners: PartnerData[] }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [showSort, setShowSort] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const selected = partners.find((p) => p.id === selectedId) ?? null;

  const totals = useMemo(() => {
    const vehicleIds = new Set<string>();
    partners.forEach((p) => p.vehicles.forEach((v) => vehicleIds.add(v.vehicleId)));
    return {
      invested: partners.reduce((s, p) => s + p.invested, 0),
      profitShare: partners.reduce((s, p) => s + p.profitShare, 0),
      toPay: partners.reduce((s, p) => s + Math.max(p.pending, 0), 0),
      owedToYou: partners.reduce((s, p) => s + Math.max(-p.pending, 0), 0),
      pendingPartners: partners.filter((p) => p.pending > 0).length,
      vehicleCount: vehicleIds.size,
    };
  }, [partners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return partners
      .filter((p) => {
        if (q) {
          const hay = [p.name, p.phone, ...p.vehicles.flatMap((v) => [v.reg, v.name])]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort(SORTERS[sortBy] ?? SORTERS.name);
  }, [partners, search, sortBy]);

  function select(id: string) {
    setSelectedId(id);
    setTab("overview");
  }

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ id, top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  const menuPartner = menu ? partners.find((p) => p.id === menu.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-sm text-ink/60 mt-1">
            Manage your business partners and track their investments, expenses and settlements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "add" })}
          className="btn-primary bg-accent hover:bg-accent/90 w-full sm:w-auto whitespace-nowrap"
        >
          <Plus size={16} className="mr-1.5" /> Add Partner
        </button>
      </div>

      <div
        className={`grid gap-6 ${selected ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""}`}
      >
        {/* LEFT: stats + filters + table */}
        <div className="min-w-0 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              icon={Users}
              tone="accent"
              label="Total Partners"
              value={String(partners.length)}
            />
            <StatCard
              icon={IndianRupee}
              tone="accent"
              label="Total Investment"
              value={formatMoney(totals.invested)}
              sub={`Across ${totals.vehicleCount} vehicle${totals.vehicleCount === 1 ? "" : "s"}`}
            />
            <StatCard
              icon={TrendingUp}
              tone="good"
              label="Total Partner Share"
              value={formatMoney(totals.profitShare)}
              sub="From sold vehicles"
            />
            <StatCard
              icon={Clock}
              tone="bad"
              label="Pending to Settle"
              value={formatMoney(totals.toPay)}
              sub={`${totals.pendingPartners} partner${totals.pendingPartners === 1 ? "" : "s"}${
                totals.owedToYou > 0 ? ` · ${formatMoney(totals.owedToYou)} owed to you` : ""
              }`}
              subClass="text-bad"
            />
          </div>

          {/* Filters */}
          <div className="card space-y-3 p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
              <div className="relative col-span-2 sm:col-span-1 min-w-[200px] flex-1">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
                />
                <input
                  className="w-full rounded-lg border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-ink/40 focus:border-accent"
                  placeholder="Search partners, phone or vehicle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <button
                type="button"
                onClick={() => exportCsv(filtered)}
                className="btn-secondary py-2.5 col-span-1"
              >
                <Download size={15} className="mr-1.5" /> Export
              </button>

              <button
                type="button"
                onClick={() => setShowSort((v) => !v)}
                aria-label="Sort options"
                className={`flex w-full h-[42px] col-span-1 items-center justify-center rounded-lg border bg-white ${
                  showSort ? "border-accent text-accent" : "border-line text-ink/60"
                }`}
              >
                <Filter size={16} />
              </button>
            </div>

            {showSort && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink/50">Sort by</span>
                <select
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name">Name (A–Z)</option>
                  <option value="pending">Pending balance (high → low)</option>
                  <option value="invested">Total invested (high → low)</option>
                  <option value="profit">Profit share (high → low)</option>
                </select>
              </div>
            )}
          </div>

          {/* Table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-paper/50 text-xs text-ink/50">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Partner</th>
                  <th className="px-2 py-3 font-medium">Vehicles</th>
                  <th className="px-2 py-3 font-medium">Total Invested</th>
                  <th className="px-2 py-3 font-medium">Total Expense Share</th>
                  <th className="px-2 py-3 font-medium">Profit Share</th>
                  <th className="px-2 py-3 font-medium">Pending Balance</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.length ? (
                  filtered.map((p, i) => (
                    <tr
                      key={p.id}
                      onClick={() => select(p.id)}
                      className={`cursor-pointer hover:bg-paper/60 ${
                        p.id === selectedId ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-ink/50">{i + 1}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={p.name} />
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              {p.name}
                            </div>
                            <div className="text-xs text-ink/50">{p.phone ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <div className="font-medium">{p.vehicleCount}</div>
                        <div className="text-xs text-ink/50">{p.soldCount} sold</div>
                      </td>
                      <td className="px-2 py-3">{formatMoney(p.invested)}</td>
                      <td className="px-2 py-3">{formatMoney(p.expenseShare)}</td>
                      <td className="px-2 py-3">{formatMoney(p.profitShare)}</td>
                      <td className="px-2 py-3">
                        <Balance value={p.pending} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              select(p.id);
                            }}
                            className="btn-secondary py-1.5 text-xs"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openMenu(e, p.id)}
                            aria-label="More actions"
                            className="rounded-md p-1.5 text-ink/40 hover:bg-paper"
                          >
                            <MoreVertical size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-ink/50">
                      {partners.length
                        ? "No partners match your filters."
                        : "No partners yet. Add your first partner to get started."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: detail panel */}
        {selected && (
          <aside className="card h-fit p-5 lg:sticky lg:top-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar name={selected.name} size="lg" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{selected.name}</h2>
                  </div>
                  {selected.phone && (
                    <div className="mt-0.5 flex items-center gap-1 text-sm text-ink/50">
                      <Phone size={12} /> {selected.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setModal({ mode: "edit", partner: selected })}
                  className="btn-secondary py-1.5 text-xs"
                >
                  <Pencil size={13} className="mr-1" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Close"
                  className="rounded-md p-1.5 text-ink/40 hover:bg-paper"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 flex gap-1 rounded-lg bg-paper p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium ${
                    tab === t.key ? "bg-accent/15 text-accent" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {tab === "overview" && (
                <OverviewTab
                  p={selected}
                  onEdit={() => setModal({ mode: "edit", partner: selected })}
                  onViewAll={() => setTab("vehicles")}
                />
              )}
              {tab === "vehicles" && <VehiclesTab p={selected} />}
              {tab === "expenses" && <ExpensesTab p={selected} />}
              {tab === "settlements" && <SettlementsTab p={selected} />}
            </div>
          </aside>
        )}
      </div>

      {/* Row actions menu (fixed so the table's scroll container can't clip it) */}
      {menu && menuPartner && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-44 rounded-lg border border-line bg-white p-1 shadow-lg"
            style={{ top: menu.top, right: menu.right }}
          >
            <MenuItem
              onClick={() => {
                select(menuPartner.id);
                setMenu(null);
              }}
            >
              View details
            </MenuItem>
            <MenuItem
              onClick={() => {
                setModal({ mode: "edit", partner: menuPartner });
                setMenu(null);
              }}
            >
              Edit
            </MenuItem>
          </div>
        </>
      )}

      {modal && (
        <PartnerModal
          mode={modal.mode}
          partner={modal.mode === "edit" ? modal.partner : undefined}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ── Export ───────────────────────────────────────────

function exportCsv(rows: PartnerData[]) {
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const header = [
    "Partner",
    "Phone",
    "Vehicles",
    "Sold",
    "Total Invested",
    "Total Expense Share",
    "Profit Share",
    "Pending Balance",
  ];
  const lines = [
    header,
    ...rows.map((p) => [
      p.name,
      p.phone ?? "",
      p.vehicleCount,
      p.soldCount,
      r2(p.invested),
      r2(p.expenseShare),
      r2(p.profitShare),
      r2(p.pending),
    ]),
  ];
  const csv = lines
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "partners.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ── Small building blocks ────────────────────────────

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-14 w-14 text-xl" : "h-10 w-10 text-sm";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-[#7C8594] font-semibold text-white ${cls}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Thumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-9 w-12 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-md bg-paper text-ink/30">
      <Car size={16} />
    </span>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  sub,
  subClass,
}: {
  icon: any;
  tone: "accent" | "good" | "bad";
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  const toneCls =
    tone === "good"
      ? "bg-good/10 text-good"
      : tone === "bad"
      ? "bg-bad/10 text-bad"
      : "bg-accent/15 text-accent";
  return (
    <div className="card flex items-start gap-3 p-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${toneCls}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-ink/60">{label}</div>
        <div className="truncate text-xl font-bold">{value}</div>
        {sub && <div className={`text-xs ${subClass ?? "text-ink/50"}`}>{sub}</div>}
      </div>
    </div>
  );
}

// + = you owe them (red), - = they owe you (amber), 0 = clear
function Balance({ value }: { value: number }) {
  if (Math.abs(value) < 0.005) return <span className="text-good">₹0</span>;
  if (value > 0) return <span className="font-medium text-bad">{formatMoney(value)}</span>;
  return (
    <span className="font-medium text-gold-dark" title="They owe you">
      {formatMoney(value)}
    </span>
  );
}

function VehicleStatusBadge({ sold }: { sold: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        sold ? "bg-good/10 text-good" : "bg-accent/10 text-accent"
      }`}
    >
      {sold ? "Sold" : "In Stock"}
    </span>
  );
}

function MenuItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper"
    >
      {children}
    </button>
  );
}

// ── Panel tabs ───────────────────────────────────────

function MiniStat({
  icon: Icon,
  label,
  value,
  sub,
  valueClass,
  tone = "accent",
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  tone?: "accent" | "good" | "bad";
}) {
  const toneCls =
    tone === "good"
      ? "bg-good/10 text-good"
      : tone === "bad"
      ? "bg-bad/10 text-bad"
      : "bg-accent/15 text-accent";
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-line p-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneCls}`}
      >
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-ink/50">{label}</div>
        <div className={`truncate text-base font-bold ${valueClass ?? ""}`}>{value}</div>
        {sub && <div className="text-[11px] text-ink/50">{sub}</div>}
      </div>
    </div>
  );
}

function OverviewTab({
  p,
  onEdit,
  onViewAll,
}: {
  p: PartnerData;
  onEdit: () => void;
  onViewAll: () => void;
}) {
  const pendingSub =
    Math.abs(p.pending) < 0.005 ? "All clear" : p.pending > 0 ? "You owe them" : "They owe you";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <MiniStat
          icon={Car}
          label="Total Vehicles"
          value={String(p.vehicleCount)}
          sub={`${p.soldCount} sold, ${p.inStockCount} in stock`}
        />
        <MiniStat icon={Wallet} label="Total Invested" value={formatMoney(p.invested)} />
        <MiniStat
          icon={Receipt}
          label="Total Expense Share"
          value={formatMoney(p.expenseShare)}
        />
        <MiniStat
          icon={TrendingUp}
          tone="good"
          label="Total Profit Share"
          value={formatMoney(p.profitShare)}
        />
        <MiniStat
          icon={Clock}
          tone="bad"
          label="Pending Balance"
          value={formatMoney(p.pending)}
          valueClass={p.pending > 0 ? "text-bad" : ""}
          sub={pendingSub}
        />
        <MiniStat
          icon={CheckCircle2}
          tone="good"
          label="Settled Amount"
          value={formatMoney(p.settledAmount)}
          valueClass="text-good"
        />
      </div>

      <div className="rounded-lg border border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Contact Information</h3>
          <button type="button" onClick={onEdit} className="btn-secondary py-1 text-xs">
            <Pencil size={12} className="mr-1" /> Edit
          </button>
        </div>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Name" value={p.name} />
          <InfoRow label="Phone" value={p.phone ?? "—"} />
        </dl>
      </div>

      <div className="rounded-lg border border-line p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Car size={15} className="text-accent" /> Recent Vehicles
          </h3>
          <button type="button" onClick={onViewAll} className="btn-secondary py-1 text-xs">
            View All
          </button>
        </div>
        {p.vehicles.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-ink/50">
                  <th className="pb-2 pr-2 font-medium">#</th>
                  <th className="pb-2 pr-2 font-medium">Vehicle</th>
                  <th className="pb-2 pr-2 font-medium">Reg. No.</th>
                  <th className="pb-2 pr-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Profit Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {p.vehicles.slice(0, 3).map((v, i) => (
                  <tr key={v.vehicleId}>
                    <td className="py-2 pr-2 text-ink/50">{i + 1}</td>
                    <td className="py-2 pr-2">
                      <Link
                        href={`/vehicles/${v.vehicleId}`}
                        className="flex items-center gap-2 hover:text-accent"
                      >
                        <Thumb src={v.image} />
                        <span className="font-medium">{v.name}</span>
                      </Link>
                    </td>
                    <td className="py-2 pr-2 whitespace-nowrap">{v.reg}</td>
                    <td className="py-2 pr-2">
                      <VehicleStatusBadge sold={v.isSold} />
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {v.profitShare != null ? formatMoney(v.profitShare) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-ink/50">Not attached to any vehicle yet.</p>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="text-ink/50">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function VehiclesTab({ p }: { p: PartnerData }) {
  if (!p.vehicles.length) {
    return <p className="text-sm text-ink/50">Not attached to any vehicle yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line text-ink/50">
            <th className="pb-2 pr-2 font-medium">Vehicle</th>
            <th className="pb-2 pr-2 font-medium">Status</th>
            <th className="pb-2 pr-2 font-medium">Invested</th>
            <th className="pb-2 pr-2 font-medium">Profit Share</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {p.vehicles.map((v) => (
            <tr key={v.vehicleId}>
              <td className="py-2 pr-2">
                <div className="flex items-center gap-2">
                  <Thumb src={v.image} />
                  <div>
                    <div className="font-medium">{v.name}</div>
                    <div className="text-ink/50">{v.reg}</div>
                  </div>
                </div>
              </td>
              <td className="py-2 pr-2">
                <VehicleStatusBadge sold={v.isSold} />
              </td>
              <td className="py-2 pr-2 whitespace-nowrap">{formatMoney(v.invested)}</td>
              <td className="py-2 pr-2 whitespace-nowrap">
                {v.profitShare != null ? formatMoney(v.profitShare) : "-"}
              </td>
              <td className="py-2">
                <Link
                  href={`/vehicles/${v.vehicleId}`}
                  className="flex items-center text-accent hover:underline"
                >
                  Open <ChevronRight size={12} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExpensesTab({ p }: { p: PartnerData }) {
  if (!p.expenses.length) {
    return (
      <p className="text-sm text-ink/50">
        No expenses paid by {p.name} yet. Expenses show here when logged with "Paid by: {p.name}".
      </p>
    );
  }
  const total = p.expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line text-ink/50">
            <th className="pb-2 pr-2 font-medium">Date</th>
            <th className="pb-2 pr-2 font-medium">Vehicle</th>
            <th className="pb-2 pr-2 font-medium">Description</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {p.expenses.map((e) => (
            <tr key={e.id}>
              <td className="py-2 pr-2 whitespace-nowrap">{e.date}</td>
              <td className="py-2 pr-2 whitespace-nowrap">
                <Link href={`/vehicles/${e.vehicleId}`} className="hover:text-accent">
                  {e.vehicleReg}
                </Link>
              </td>
              <td className="py-2 pr-2">
                {e.description}
                {e.category && <span className="ml-1 text-ink/40">· {e.category}</span>}
              </td>
              <td className="py-2 text-right font-medium whitespace-nowrap">
                {formatMoney(e.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-semibold">
            <td colSpan={3} className="py-2 pr-2">
              Total paid
            </td>
            <td className="py-2 text-right whitespace-nowrap">{formatMoney(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SettlementsTab({ p }: { p: PartnerData }) {
  const sold = p.vehicles.filter((v) => v.isSold);
  if (!sold.length) {
    return <p className="text-sm text-ink/50">No sold vehicles yet — nothing to settle.</p>;
  }
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink/50">
        Settlement is marked per vehicle. Open a vehicle and use its Partner Settlement tab to
        mark it settled.
      </p>
      {sold.map((v) => {
        const bal = v.balance ?? 0;
        return (
          <div key={v.vehicleId} className="rounded-lg border border-line p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Thumb src={v.image} />
                <div>
                  <div className="text-sm font-medium">{v.name}</div>
                  <div className="text-xs text-ink/50">
                    {v.reg}
                    {v.soldDate ? ` · sold ${v.soldDate}` : ""}
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  v.settled ? "bg-good/10 text-good" : "bg-bad/10 text-bad"
                }`}
              >
                {v.settled ? "Settled" : "Pending"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs text-ink/60">
              <div>
                <div>Profit share</div>
                <div className="font-medium text-ink">{formatMoney(v.profitShare ?? 0)}</div>
              </div>
              <div>
                <div>They paid</div>
                <div className="font-medium text-ink">{formatMoney(v.invested)}</div>
              </div>
              <div>
                <div>{bal >= 0 ? "You owe them" : "They owe you"}</div>
                <div className={`font-semibold ${bal >= 0 ? "text-bad" : "text-gold-dark"}`}>
                  {formatMoney(Math.abs(bal))}
                </div>
              </div>
            </div>
            <Link
              href={`/vehicles/${v.vehicleId}`}
              className="mt-2 inline-flex items-center text-xs font-medium text-accent hover:underline"
            >
              Open vehicle <ChevronRight size={12} />
            </Link>
          </div>
        );
      })}
    </div>
  );
}

// ── Add / Edit modal ─────────────────────────────────

function PartnerModal({
  mode,
  partner,
  onClose,
}: {
  mode: "add" | "edit";
  partner?: PartnerData;
  onClose: () => void;
}) {
  const isEdit = mode === "edit" && !!partner;

  async function handleSubmit(formData: FormData) {
    if (isEdit && partner) await updatePartner(partner.id, formData);
    else await addPartner(formData);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{isEdit ? "Edit Partner" : "Add Partner"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink/40 hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>

        <form action={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="pm-name">Name *</label>
            <input
              id="pm-name"
              name="name"
              className="input mt-1"
              defaultValue={partner?.name ?? ""}
              required
            />
          </div>
          <div>
            <label htmlFor="pm-phone">Phone</label>
            <input
              id="pm-phone"
              name="phone"
              className="input mt-1"
              defaultValue={partner?.phone ?? ""}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary bg-accent hover:bg-accent/90">
              {isEdit ? "Save Changes" : "Add Partner"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}