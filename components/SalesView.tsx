"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  IndianRupee,
  BarChart3,
  Users,
  Plus,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  MoreVertical,
  X,
  Pencil,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Phone,
} from "lucide-react";
import { formatMoney } from "@/lib/calculations";
import {
  updateVehicleSale,
  markVehicleSettled,
  reopenSettlement,
} from "@/app/actions";

// ── Types (shared with app/sales/page.tsx) ───────────

export type SalePartner = {
  id: string;
  name: string;
  phone: string | null;
  paid: number; // expenses this partner personally paid on this vehicle
  profitShare: number; // equal cut of net profit
  balance: number; // + = you owe them, - = they owe you
};

export type SaleExpense = {
  id: string;
  date: string;
  description: string;
  category: string | null;
  paidBy: string;
  amount: number;
};

export type SaleRow = {
  id: string;
  name: string;
  make: string | null;
  reg: string;
  sub: string;
  image: string | null;
  soldDate: string | null;
  soldPrice: number;
  purchasePrice: number;
  totalExpenses: number;
  profit: number;
  buyerName: string | null;
  buyerPhone: string | null;
  notes: string | null;
  partners: SalePartner[];
  partnerLabel: string;
  shares: number;
  sharePerPerson: number;
  yourNet: number;
  yourPaid: number;
  hasPartners: boolean;
  settledFlag: boolean;
  status: "pending" | "settled";
  expenses: SaleExpense[];
};

export type SellableVehicle = { id: string; label: string };

type TabKey = "overview" | "expenses" | "partner";
const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "expenses", label: "Expenses" },
  { key: "partner", label: "Partner" },
];

type ModalState = { mode: "add" } | { mode: "edit"; sale: SaleRow } | null;

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function pctChange(curr: number, prev: number) {
  return prev === 0 ? null : Math.round(((curr - prev) / Math.abs(prev)) * 100);
}

// ── Main component ───────────────────────────────────

export default function SalesView({
  sales,
  sellable,
  thisMonth,
  lastMonth,
}: {
  sales: SaleRow[];
  sellable: SellableVehicle[];
  thisMonth: string;
  lastMonth: string;
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [partner, setPartner] = useState("all");
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [busy, setBusy] = useState(false);

  const selected = sales.find((s) => s.id === selectedId) ?? null;

  // ── Filter options ──
  const monthOptions = useMemo(
    () =>
      Array.from(
        new Set(sales.map((s) => s.soldDate?.slice(0, 7)).filter(Boolean) as string[])
      )
        .sort()
        .reverse(),
    [sales]
  );
  const brandOptions = useMemo(
    () => Array.from(new Set(sales.map((s) => s.make).filter(Boolean) as string[])).sort(),
    [sales]
  );
  const partnerOptions = useMemo(
    () =>
      Array.from(new Set(sales.flatMap((s) => s.partners.map((p) => p.name)))).sort(),
    [sales]
  );
  const hasSelfSales = sales.some((s) => !s.hasPartners);

  // ── Stat cards (always all sales, not the filtered view) ──
  const stats = useMemo(() => {
    const inMonth = (s: SaleRow, key: string) => s.soldDate?.slice(0, 7) === key;
    const cur = sales.filter((s) => inMonth(s, thisMonth));
    const prev = sales.filter((s) => inMonth(s, lastMonth));
    const sum = (arr: SaleRow[], f: (s: SaleRow) => number) =>
      arr.reduce((a, s) => a + f(s), 0);
    const pending = sales.filter((s) => s.status === "pending");
    return {
      count: sales.length,
      countDelta: cur.length - prev.length,
      value: sum(sales, (s) => s.soldPrice),
      valuePct: pctChange(
        sum(cur, (s) => s.soldPrice),
        sum(prev, (s) => s.soldPrice)
      ),
      profit: sum(sales, (s) => s.profit),
      profitPct: pctChange(
        sum(cur, (s) => s.profit),
        sum(prev, (s) => s.profit)
      ),
      pendingCount: pending.length,
      pendingAmount: pending.reduce(
        (a, s) => a + s.partners.reduce((b, p) => b + Math.max(p.balance, 0), 0),
        0
      ),
    };
  }, [sales, thisMonth, lastMonth]);

  // ── Filtering + pagination ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      if (month !== "all" && s.soldDate?.slice(0, 7) !== month) return false;
      if (brand !== "all" && s.make !== brand) return false;
      if (status !== "all" && s.status !== status) return false;
      if (partner !== "all") {
        if (partner === "__self") {
          if (s.hasPartners) return false;
        } else if (!s.partners.some((p) => p.name === partner)) return false;
      }
      if (fromDate && (s.soldDate ?? "") < fromDate) return false;
      if (toDate && (s.soldDate ?? "") > toDate) return false;
      if (q) {
        const hay = [s.name, s.reg, s.buyerName, s.partnerLabel, ...s.partners.map((p) => p.name)]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sales, search, month, brand, status, partner, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFilters() {
    setSearch("");
    setMonth("all");
    setPartner("all");
    setBrand("all");
    setStatus("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function select(id: string) {
    setSelectedId(id);
    setTab("overview");
  }

  function openMenu(e: React.MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setMenu({ id, top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  async function toggleSettled(sale: SaleRow) {
    setBusy(true);
    try {
      if (sale.settledFlag) await reopenSettlement(sale.id);
      else await markVehicleSettled(sale.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const menuSale = menu ? sales.find((s) => s.id === menu.id) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Sales</h1>
          <p className="text-sm text-ink/60 mt-1">
            Manage all sold vehicles and track profits, partner shares, and settlements.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ mode: "add" })}
          className="btn-primary bg-accent hover:bg-accent/90 w-full sm:w-auto whitespace-nowrap"
        >
          <Plus size={16} className="mr-1.5" /> Mark Vehicle as Sold
        </button>
      </div>

      <div className={`grid gap-6 ${selected ? "lg:grid-cols-[minmax(0,1fr)_420px]" : ""}`}>
        {/* LEFT */}
        <div className="min-w-0 space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard icon={Car} tone="accent" label="Total Sales" value={String(stats.count)}>
              <DeltaLine
                up={stats.countDelta >= 0}
                text={`${stats.countDelta >= 0 ? "+" : ""}${stats.countDelta} from last month`}
              />
            </StatCard>
            <StatCard
              icon={IndianRupee}
              tone="accent"
              label="Total Sales Value"
              value={formatMoney(stats.value)}
            >
              <PctLine pct={stats.valuePct} />
            </StatCard>
            <StatCard
              icon={BarChart3}
              tone="good"
              label="Total Profit"
              value={formatMoney(stats.profit)}
            >
              <PctLine pct={stats.profitPct} />
            </StatCard>
            <StatCard
              icon={Users}
              tone="accent"
              label="Pending Partner Settlement"
              value={String(stats.pendingCount)}
            >
              <div className="text-xs font-medium text-bad">
                {formatMoney(stats.pendingAmount)} pending
              </div>
            </StatCard>
          </div>

          {/* Filters */}
          <div className="card grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <div className="relative col-span-2 sm:col-span-1 min-w-[200px] flex-1">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
              />
              <input
                className="w-full rounded-lg border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-ink/40 focus:border-accent"
                placeholder="Search sold vehicles..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <FilterSelect
              value={month}
              onChange={(v) => {
                setMonth(v);
                setPage(1);
              }}
            >
              <option value="all">All Months</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={partner}
              onChange={(v) => {
                setPartner(v);
                setPage(1);
              }}
            >
              <option value="all">All Partners</option>
              {hasSelfSales && <option value="__self">Self</option>}
              {partnerOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={brand}
              onChange={(v) => {
                setBrand(v);
                setPage(1);
              }}
            >
              <option value="all">All Brands</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              value={status}
              onChange={(v) => {
                setStatus(v);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="settled">Settled</option>
            </FilterSelect>

            <div className="flex col-span-2 sm:col-span-1 w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-lg border border-line bg-white px-3 py-2">
              <Calendar size={15} className="text-ink/40 shrink-0 sm:shrink" />
              <input
                type="date"
                className="border-0 bg-transparent p-0 text-sm text-ink/70 outline-none"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
              <span className="text-ink/30 shrink-0 sm:shrink">→</span>
              <input
                type="date"
                className="border-0 bg-transparent p-0 text-sm text-ink/70 outline-none"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="flex col-span-2 sm:col-span-1 w-full sm:w-auto gap-2">
              <button className="btn-secondary flex-1 sm:flex-none whitespace-nowrap" onClick={resetFilters} type="button">
                Reset
              </button>
              <button
                className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 flex-1 sm:flex-none whitespace-nowrap"
                onClick={() => setPage(1)}
                type="button"
              >
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-paper/50 text-xs text-ink/50">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Vehicle</th>
                  <th className="px-2 py-3 font-medium">Reg. No.</th>
                  <th className="px-2 py-3 font-medium">Sale Date</th>
                  <th className="px-2 py-3 font-medium">Sale Price</th>
                  <th className="px-2 py-3 font-medium">Purchase Price</th>
                  <th className="px-2 py-3 font-medium">Total Expenses</th>
                  <th className="px-2 py-3 font-medium">Profit</th>
                  <th className="px-2 py-3 font-medium">Partner</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageRows.length ? (
                  pageRows.map((s, i) => (
                    <tr
                      key={s.id}
                      onClick={() => select(s.id)}
                      className={`cursor-pointer hover:bg-paper/60 ${
                        s.id === selectedId ? "bg-accent/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-ink/50">
                        {(currentPage - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2.5">
                          <Thumb src={s.image} />
                          <div>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-ink/50">{s.sub || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">{s.reg}</td>
                      <td className="whitespace-nowrap px-2 py-3">{fmtDate(s.soldDate)}</td>
                      <td className="whitespace-nowrap px-2 py-3">{formatMoney(s.soldPrice)}</td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {formatMoney(s.purchasePrice)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">
                        {formatMoney(s.totalExpenses)}
                      </td>
                      <td
                        className={`whitespace-nowrap px-2 py-3 font-semibold ${
                          s.profit >= 0 ? "text-good" : "text-bad"
                        }`}
                      >
                        {formatMoney(s.profit)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-3">{s.partnerLabel}</td>
                      <td className="px-2 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              select(s.id);
                            }}
                            className="btn-secondary py-1.5 text-xs"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openMenu(e, s.id)}
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
                    <td colSpan={11} className="px-4 py-10 text-center text-ink/50">
                      {sales.length
                        ? "No sales match your filters."
                        : "No sales yet. Use “Mark Vehicle as Sold” to record your first one."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between text-sm text-ink/60">
              <span>
                Showing {(currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} sales
              </span>
              <div className="flex items-center gap-1">
                <button
                  className="rounded-lg border border-line bg-white p-2 disabled:opacity-40"
                  onClick={() => setPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  type="button"
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    type="button"
                    className={`h-9 w-9 rounded-lg text-sm font-medium ${
                      p === currentPage ? "bg-accent text-white" : "border border-line bg-white"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className="rounded-lg border border-line bg-white p-2 disabled:opacity-40"
                  onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  type="button"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Sale details panel */}
        {selected && (
          <aside className="card h-fit p-5 lg:sticky lg:top-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold">Sale Details</h2>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Close"
                className="rounded-md p-1 text-ink/40 hover:bg-paper"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center gap-3">
              {selected.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.image}
                  alt=""
                  className="h-[72px] w-24 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="flex h-[72px] w-24 shrink-0 items-center justify-center rounded-lg bg-paper text-ink/30">
                  <Car size={28} />
                </span>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold">{selected.name}</h3>
                  <span className="rounded-full bg-good/10 px-2 py-0.5 text-xs font-medium text-good">
                    Sold
                  </span>
                </div>
                <div className="text-sm text-ink/60">
                  {[selected.reg, selected.sub].filter(Boolean).join(" · ")}
                </div>
                <div className="text-xs text-ink/50">Sold on {fmtDate(selected.soldDate)}</div>
              </div>
            </div>

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
                  s={selected}
                  busy={busy}
                  onEdit={() => setModal({ mode: "edit", sale: selected })}
                  onToggleSettled={() => toggleSettled(selected)}
                />
              )}
              {tab === "expenses" && <ExpensesTab s={selected} />}
              {tab === "partner" && <PartnerTab s={selected} />}
            </div>

            <Link
              href={`/vehicles/${selected.id}`}
              className="mt-4 flex items-center justify-center text-xs font-medium text-accent hover:underline"
            >
              Open full vehicle page <ChevronRight size={12} />
            </Link>
          </aside>
        )}
      </div>

      {/* Row actions menu (fixed so the table's scroll container can't clip it) */}
      {menu && menuSale && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenu(null)} />
          <div
            className="fixed z-50 w-48 rounded-lg border border-line bg-white p-1 shadow-lg"
            style={{ top: menu.top, right: menu.right }}
          >
            <MenuItem
              onClick={() => {
                select(menuSale.id);
                setMenu(null);
              }}
            >
              View details
            </MenuItem>
            <Link
              href={`/vehicles/${menuSale.id}`}
              className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-paper"
            >
              Open vehicle
            </Link>
            <MenuItem
              onClick={() => {
                setModal({ mode: "edit", sale: menuSale });
                setMenu(null);
              }}
            >
              Edit sale
            </MenuItem>
            {menuSale.hasPartners && (
              <MenuItem
                onClick={async () => {
                  setMenu(null);
                  await toggleSettled(menuSale);
                }}
              >
                {menuSale.settledFlag ? "Reopen settlement" : "Mark as settled"}
              </MenuItem>
            )}
          </div>
        </>
      )}

      {modal && (
        <SaleModal
          mode={modal.mode}
          sale={modal.mode === "edit" ? modal.sale : undefined}
          sellable={sellable}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// ── Small building blocks ────────────────────────────

function Thumb({ src }: { src: string | null }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className="h-10 w-14 shrink-0 rounded-md object-cover" />
  ) : (
    <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md bg-paper text-ink/30">
      <Car size={16} />
    </span>
  );
}

function StatCard({
  icon: Icon,
  tone,
  label,
  value,
  children,
}: {
  icon: any;
  tone: "accent" | "good";
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card flex items-start gap-3 p-4">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          tone === "good" ? "bg-good/10 text-good" : "bg-accent/15 text-accent"
        }`}
      >
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-ink/60">{label}</div>
        <div className="truncate text-xl font-bold">{value}</div>
        {children}
      </div>
    </div>
  );
}

function DeltaLine({ up, text }: { up: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${up ? "text-good" : "text-bad"}`}>
      {up ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
      {text}
    </div>
  );
}

function PctLine({ pct }: { pct: number | null }) {
  if (pct === null) return <div className="text-xs text-ink/40">No data for last month</div>;
  return <DeltaLine up={pct >= 0} text={`${pct >= 0 ? "+" : ""}${pct}% from last month`} />;
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full sm:w-auto">
      <select
        className="appearance-none w-full rounded-lg border border-line bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-accent"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40"
      />
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "settled" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "pending" ? "bg-bad/10 text-bad" : "bg-good/10 text-good"
      }`}
    >
      {status === "pending" ? "Pending" : "Settled"}
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[100px_1fr] gap-2">
      <dt className="text-ink/50">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Panel tabs ───────────────────────────────────────

function OverviewTab({
  s,
  busy,
  onEdit,
  onToggleSettled,
}: {
  s: SaleRow;
  busy: boolean;
  onEdit: () => void;
  onToggleSettled: () => void;
}) {
  return (
    <div className="space-y-4">
      <Section
        title="Sale Information"
        action={
          <button type="button" onClick={onEdit} className="btn-secondary py-1 text-xs">
            <Pencil size={12} className="mr-1" /> Edit
          </button>
        }
      >
        <dl className="space-y-2 text-sm">
          <InfoRow label="Sale Price" value={formatMoney(s.soldPrice)} />
          <InfoRow label="Sale Date" value={fmtDate(s.soldDate)} />
          <InfoRow label="Buyer Name" value={s.buyerName ?? "—"} />
          <InfoRow label="Buyer Phone" value={s.buyerPhone ?? "—"} />
          <InfoRow label="Notes" value={s.notes ?? "—"} />
        </dl>
      </Section>

      <Section title="Financial Summary">
        <div className="grid grid-cols-3 gap-2 text-xs text-ink/60">
          <div>
            <div>Purchase Price</div>
            <div className="text-sm font-bold text-ink">{formatMoney(s.purchasePrice)}</div>
          </div>
          <div>
            <div>Total Expenses</div>
            <div className="text-sm font-bold text-ink">{formatMoney(s.totalExpenses)}</div>
          </div>
          <div className={`rounded-md px-2 py-1 ${s.profit >= 0 ? "bg-good/10" : "bg-bad/10"}`}>
            <div>Net Profit</div>
            <div className={`text-sm font-bold ${s.profit >= 0 ? "text-good" : "text-bad"}`}>
              {formatMoney(s.profit)}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-ink/40">
          Purchase Price is for reference only — Net Profit is Sale Price minus the expenses
          logged for this vehicle.
        </p>
      </Section>

      <Section title={`Profit Sharing (${s.shares}-way equal split)`}>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <div>
            <div className="text-xs text-ink/50">Your Share</div>
            <div className="font-bold">{formatMoney(s.sharePerPerson)}</div>
          </div>
          {s.partners.map((p) => (
            <div key={p.id}>
              <div className="text-xs text-ink/50">{p.name}</div>
              <div className="font-bold">{formatMoney(p.profitShare)}</div>
            </div>
          ))}
        </div>
      </Section>

      {s.hasPartners ? (
        <Section title="Partner & Settlement">
          <div className="space-y-4 text-sm">
            {s.partners.map((p) => {
              const owesYou = p.balance < 0;
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-ink/50">Partner</span>
                    <span className="font-semibold">{p.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/50">Expenses paid by {p.name}</span>
                    <span className="font-medium">{formatMoney(p.paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/50">Equal profit share</span>
                    <span className="font-medium">{formatMoney(p.profitShare)}</span>
                  </div>
                  <div
                    className={`flex justify-between rounded-md px-3 py-2 font-semibold ${
                      owesYou ? "bg-gold/15" : "bg-gold/10"
                    }`}
                  >
                    <span>{owesYou ? `${p.name} Owes You` : `Amount to Give ${p.name}`}</span>
                    <span>{formatMoney(Math.abs(p.balance))}</span>
                  </div>
                </div>
              );
            })}

            <div className="flex justify-between border-t border-line pt-3">
              <span className="text-ink/50">Your final amount</span>
              <span className="font-semibold">{formatMoney(s.yourNet)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-ink/50">Settlement Status</span>
              <StatusBadge status={s.status} />
            </div>

            {s.settledFlag ? (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-good">
                  <CheckCircle2 size={15} /> Settled with all partners
                </span>
                <button
                  type="button"
                  onClick={onToggleSettled}
                  disabled={busy}
                  className="text-xs text-ink/50 underline disabled:opacity-50"
                >
                  Reopen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onToggleSettled}
                disabled={busy}
                className="btn-primary w-full bg-accent hover:bg-accent/90 disabled:opacity-50"
              >
                <CheckCircle2 size={15} className="mr-1.5" />
                {busy ? "Saving…" : "Mark as Settled"}
              </button>
            )}
          </div>
        </Section>
      ) : (
        <Section title="Partner & Settlement">
          <p className="text-sm text-ink/50">
            No partner on this deal — nothing to settle, the full profit is yours.
          </p>
        </Section>
      )}
    </div>
  );
}

function ExpensesTab({ s }: { s: SaleRow }) {
  if (!s.expenses.length) {
    return <p className="text-sm text-ink/50">No expenses logged for this vehicle.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-line text-ink/50">
            <th className="pb-2 pr-2 font-medium">Date</th>
            <th className="pb-2 pr-2 font-medium">Description</th>
            <th className="pb-2 pr-2 font-medium">Paid By</th>
            <th className="pb-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {s.expenses.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap py-2 pr-2">{e.date}</td>
              <td className="py-2 pr-2">
                {e.description}
                {e.category && <span className="ml-1 text-ink/40">· {e.category}</span>}
              </td>
              <td className="py-2 pr-2">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    e.paidBy === "You" ? "bg-accent/10 text-accent" : "bg-gold/15 text-gold-dark"
                  }`}
                >
                  {e.paidBy}
                </span>
              </td>
              <td className="whitespace-nowrap py-2 text-right font-medium">
                {formatMoney(e.amount)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line font-semibold">
            <td colSpan={3} className="py-2 pr-2">
              Total Expenses
            </td>
            <td className="whitespace-nowrap py-2 text-right">{formatMoney(s.totalExpenses)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PartnerTab({ s }: { s: SaleRow }) {
  if (!s.hasPartners) {
    return <p className="text-sm text-ink/50">No partner on this deal.</p>;
  }
  return (
    <div className="space-y-3">
      {s.partners.map((p) => (
        <div key={p.id} className="rounded-lg border border-line p-4">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7C8594] text-sm font-semibold text-white">
              {p.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <div className="font-medium">{p.name}</div>
              {p.phone && (
                <div className="flex items-center gap-1 text-xs text-ink/50">
                  <Phone size={11} /> {p.phone}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-ink/60">
            <div>
              <div>They paid</div>
              <div className="font-medium text-ink">{formatMoney(p.paid)}</div>
            </div>
            <div>
              <div>Profit share</div>
              <div className="font-medium text-ink">{formatMoney(p.profitShare)}</div>
            </div>
            <div>
              <div>{p.balance >= 0 ? "You owe them" : "They owe you"}</div>
              <div className={`font-semibold ${p.balance >= 0 ? "text-bad" : "text-gold-dark"}`}>
                {formatMoney(Math.abs(p.balance))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Mark as sold / edit sale modal ───────────────────

function SaleModal({
  mode,
  sale,
  sellable,
  onClose,
  onDone,
}: {
  mode: "add" | "edit";
  sale?: SaleRow;
  sellable: SellableVehicle[];
  onClose: () => void;
  onDone: () => void;
}) {
  const isEdit = mode === "edit" && !!sale;
  const today = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(formData: FormData) {
    const vehicleId = isEdit && sale ? sale.id : String(formData.get("vehicle_id") || "");
    if (!vehicleId) return;
    setSaving(true);
    try {
      await updateVehicleSale(vehicleId, formData);
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">
            {isEdit ? "Edit Sale" : "Mark Vehicle as Sold"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink/40 hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>

        {!isEdit && sellable.length === 0 ? (
          <div className="space-y-3 text-sm text-ink/60">
            <p>There are no unsold vehicles to mark as sold.</p>
            <Link href="/vehicles/new" className="btn-primary inline-flex bg-accent">
              Add a Vehicle
            </Link>
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-3">
            {isEdit && sale ? (
              <div className="rounded-lg bg-paper px-3 py-2 text-sm">
                <span className="font-medium">{sale.name}</span>{" "}
                <span className="text-ink/50">· {sale.reg}</span>
              </div>
            ) : (
              <div>
                <label htmlFor="sm-vehicle">Vehicle *</label>
                <select
                  id="sm-vehicle"
                  name="vehicle_id"
                  className="input mt-1"
                  defaultValue=""
                  required
                >
                  <option value="" disabled>
                    Select vehicle
                  </option>
                  {sellable.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isEdit && sale && sale.settledFlag && (
              <p className="rounded-lg bg-gold/10 px-3 py-2 text-xs text-ink/70">
                This deal is marked as settled. Changing the sale price changes what each
                partner is owed — reopen the settlement afterwards if the amounts need
                re-checking.
              </p>
            )}

            <div>
              <label htmlFor="sm-price">Sold Price (₹) *</label>
              <input
                id="sm-price"
                name="sold_price"
                type="number"
                step="0.01"
                className="input mt-1"
                defaultValue={sale?.soldPrice ?? ""}
                required
              />
            </div>
            <div>
              <label htmlFor="sm-date">Sold Date</label>
              <input
                id="sm-date"
                name="sold_date"
                type="date"
                className="input mt-1"
                defaultValue={sale?.soldDate ?? today}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="sm-buyer">Buyer Name</label>
                <input
                  id="sm-buyer"
                  name="buyer_name"
                  className="input mt-1"
                  defaultValue={sale?.buyerName ?? ""}
                />
              </div>
              <div>
                <label htmlFor="sm-phone">Buyer Phone</label>
                <input
                  id="sm-phone"
                  name="buyer_phone"
                  className="input mt-1"
                  defaultValue={sale?.buyerPhone ?? ""}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary bg-accent hover:bg-accent/90 disabled:opacity-50"
              >
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Mark as Sold"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}