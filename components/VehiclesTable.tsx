// components/VehiclesTable.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Car,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar,
} from "lucide-react";
import { formatMoney } from "@/lib/calculations";

export type VehicleRow = {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  year: number | null;
  purchase_price: number;
  purchase_date: string;
  status: "in_stock" | "sold";
  sold_price: number | null;
  sold_date: string | null;
  total_expenses: number;
  partner: string;
  profit: number | null;
  image: string | null;
};

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

const PAGE_SIZE = 10;

export default function VehiclesTable({
  rows,
  brands,
  partnerNames,
}: {
  rows: VehicleRow[];
  brands: string[];
  partnerNames: string[];
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [brand, setBrand] = useState("all");
  const [partner, setPartner] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (brand !== "all" && r.make !== brand) return false;
      if (partner !== "all" && r.partner !== partner) return false;
      if (fromDate && r.purchase_date < fromDate) return false;
      if (toDate && r.purchase_date > toDate) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = [r.registration_number, r.make, r.model]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, status, brand, partner, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const total = rows.length;
  const inStockCount = rows.filter((r) => r.status === "in_stock").length;
  const soldCount = rows.filter((r) => r.status === "sold").length;

  function resetFilters() {
    setSearch("");
    setStatus("all");
    setBrand("all");
    setPartner("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-sm text-ink/60">Manage all vehicles in your business inventory.</p>
        </div>
        <Link href="/vehicles/new" className="btn-primary bg-accent hover:bg-accent/90">
          <Plus size={16} className="mr-1" /> Add Vehicle
        </Link>
      </div>

      {/* Simple summary section (replaces the 4-card stats) */}
      <div className="card flex flex-wrap items-center gap-4 sm:gap-8 justify-between sm:justify-start p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Car size={20} />
          </span>
          <div>
            <div className="text-xl font-bold">{total}</div>
            <div className="text-xs text-ink/50">Total Vehicles</div>
          </div>
        </div>
        <div className="h-10 w-px bg-line" />
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" />
          <div>
            <div className="text-lg font-semibold">{inStockCount}</div>
            <div className="text-xs text-ink/50">In Stock</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-good" />
          <div>
            <div className="text-lg font-semibold">{soldCount}</div>
            <div className="text-xs text-ink/50">Sold</div>
          </div>
        </div>
      </div>

    <div className="card grid grid-cols-2 sm:flex sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 p-3 sm:p-4">
    {/* Search */}
    <div className="relative col-span-2 sm:col-span-1 min-w-[220px] flex-1">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40" />
        <input
        className="w-full rounded-lg border border-line bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-ink/40 focus:border-accent"
        placeholder="Search vehicles..."
        value={search}
        onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
        }}
        />
    </div>

    {/* Status */}
    <div className="relative w-full sm:w-auto">
        <select
        className="appearance-none w-full rounded-lg border border-line bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-accent"
        value={status}
        onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
        }}
        >
        <option value="all">All Status</option>
        <option value="in_stock">In Stock</option>
        <option value="sold">Sold</option>
        </select>
        <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40"
        />
    </div>

    {/* Brand */}
    <div className="relative w-full sm:w-auto">
        <select
        className="appearance-none w-full rounded-lg border border-line bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-accent"
        value={brand}
        onChange={(e) => {
            setBrand(e.target.value);
            setPage(1);
        }}
        >
        <option value="all">All Brands</option>
        {brands.map((b) => (
            <option key={b} value={b}>
            {b}
            </option>
        ))}
        </select>
        <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40"
        />
    </div>

    {/* Partner */}
    <div className="relative col-span-2 sm:col-span-1 w-full sm:w-auto">
        <select
        className="appearance-none w-full rounded-lg border border-line bg-white py-2.5 pl-3 pr-8 text-sm outline-none focus:border-accent"
        value={partner}
        onChange={(e) => {
            setPartner(e.target.value);
            setPage(1);
        }}
        >
        <option value="all">All Partners</option>
        {partnerNames.map((p) => (
            <option key={p} value={p}>
            {p}
            </option>
        ))}
        </select>
        <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink/40"
        />
    </div>

    {/* Date range */}
    <div className="flex col-span-2 sm:col-span-1 w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-lg border border-line bg-white px-3 py-2">
        <Calendar size={15} className="text-ink/40" />
        <input
        type="date"
        className="border-0 bg-transparent p-0 text-sm text-ink/70 outline-none"
        value={fromDate}
        onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1);
        }}
        />
        <span className="text-ink/30">→</span>
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
          className="rounded-lg bg-accent flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium text-white hover:bg-accent/90 whitespace-nowrap"
          onClick={() => setPage(1)}
          type="button"
      >
          Filter
      </button>
    </div>
    </div>

      {/* Table */}
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink/50">
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-2 py-3 font-medium">Vehicle</th>
              <th className="px-2 py-3 font-medium">Registration No.</th>
              <th className="px-2 py-3 font-medium">Year</th>
              <th className="px-2 py-3 font-medium">Purchase Price</th>
              <th className="px-2 py-3 font-medium">Total Expenses</th>
              <th className="px-2 py-3 font-medium">Current Status</th>
              <th className="px-2 py-3 font-medium">Partner</th>
              <th className="px-2 py-3 font-medium">Profit</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pageRows.length ? (
              pageRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-ink/50">
                    {(page - 1) * PAGE_SIZE + i + 1}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      <Thumb src={r.image} />
                      <div>
                        <div className="font-medium">
                          {[r.make, r.model].filter(Boolean).join(" ") || "Vehicle"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 py-3">{r.registration_number}</td>
                  <td className="px-2 py-3">{r.year ?? "—"}</td>
                  <td className="px-2 py-3">{formatMoney(r.purchase_price)}</td>
                  <td className="px-2 py-3">{formatMoney(r.total_expenses)}</td>
                  <td className="px-2 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === "sold"
                          ? "bg-good/10 text-good"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {r.status === "sold" ? "Sold" : "In Stock"}
                    </span>
                    {r.status === "sold" && r.sold_date && (
                      <div className="mt-0.5 text-[11px] text-ink/40">{r.sold_date}</div>
                    )}
                  </td>
                  <td className="px-2 py-3">{r.partner}</td>
                  <td className="px-2 py-3 font-medium">
                    {r.profit != null ? (
                      <span className={r.profit >= 0 ? "text-good" : "text-bad"}>
                        {formatMoney(r.profit)}
                      </span>
                    ) : (
                      <span className="text-ink/30">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/vehicles/${r.id}`} className="btn-secondary py-1.5 text-xs">
                        View
                      </Link>
                      
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-ink/50">
                  No vehicles match your filters.
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
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} vehicles
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded-lg border border-line bg-white p-2 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
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
                  p === page ? "bg-accent text-white" : "border border-line bg-white"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              className="rounded-lg border border-line bg-white p-2 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              type="button"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}