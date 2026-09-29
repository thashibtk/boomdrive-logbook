// app/dashboard/page.tsx
import Link from "next/link";
import {
  Car,
  Wallet,
  TrendingUp,
  Coins,
  BarChart3,
  Zap,
  Users,
  IndianRupee,
  Tag,
  ChevronRight,
  FileText,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, computeSettlement } from "@/lib/calculations";

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatLakh(n: number) {
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: vehicles }, { data: expenses }, { data: vehiclePartners }] =
    await Promise.all([
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
      supabase.from("expenses").select("vehicle_id, id, description, amount, expense_date, category, paid_by"),
      supabase
        .from("vehicle_partners")
        .select("vehicle_id, purchase_contribution, partners(id, name)")
        .order("created_at", { ascending: true }),
    ]);

  const allVehicles = vehicles ?? [];

  const expensesByVehicle = new Map<string, any[]>();
  for (const e of expenses ?? []) {
    if (!expensesByVehicle.has(e.vehicle_id)) expensesByVehicle.set(e.vehicle_id, []);
    expensesByVehicle.get(e.vehicle_id)!.push(e);
  }

  const partnersByVehicle = new Map<string, any[]>();
  const firstPartnerByVehicle = new Map<string, string>();
  for (const vp of (vehiclePartners as any[]) ?? []) {
    if (!partnersByVehicle.has(vp.vehicle_id)) partnersByVehicle.set(vp.vehicle_id, []);
    if (vp.partners) {
      partnersByVehicle.get(vp.vehicle_id)!.push({
        id: vp.partners.id,
        name: vp.partners.name,
        purchase_contribution: vp.purchase_contribution ?? 0,
      });
      if (!firstPartnerByVehicle.has(vp.vehicle_id)) {
        firstPartnerByVehicle.set(vp.vehicle_id, vp.partners.name);
      }
    }
  }

  const profitOf = (v: any) => {
    if (v.sold_price == null) return 0;
    const settlement = computeSettlement({
      purchase_price: Number(v.purchase_price),
      sold_price: Number(v.sold_price),
      expenses: expensesByVehicle.get(v.id) ?? [],
      partners: partnersByVehicle.get(v.id) ?? [],
    });
    return settlement.net_profit ?? 0;
  };

  // ── Top stat cards ──────────────────────────
  const now = new Date();
  const getLocalMonthKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const thisMonthKey = getLocalMonthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = getLocalMonthKey(lastMonthDate);

  const inStock = allVehicles.filter((v) => v.status === "in_stock");
  const inStockLastMonth = allVehicles.filter(
    (v) => v.status === "in_stock" && monthKey(v.purchase_date) <= lastMonthKey
  ).length;

  const costOf = (v: any) => {
    return (expensesByVehicle.get(v.id) ?? []).reduce((sum, e) => sum + Number(e.amount), 0);
  };

  const investedThisMonth = allVehicles
    .filter((v) => monthKey(v.purchase_date) === thisMonthKey)
    .reduce((s, v) => s + costOf(v), 0);
  const investedLastMonth = allVehicles
    .filter((v) => monthKey(v.purchase_date) === lastMonthKey)
    .reduce((s, v) => s + costOf(v), 0);

  const soldThisMonth = allVehicles.filter(
    (v) => v.status === "sold" && v.sold_date && monthKey(v.sold_date) === thisMonthKey
  );
  const soldLastMonth = allVehicles.filter(
    (v) => v.status === "sold" && v.sold_date && monthKey(v.sold_date) === lastMonthKey
  );
  const salesThisMonth = soldThisMonth.reduce((s, v) => s + Number(v.sold_price), 0);
  const salesLastMonth = soldLastMonth.reduce((s, v) => s + Number(v.sold_price), 0);
  const profitThisMonth = soldThisMonth.reduce((s, v) => s + profitOf(v), 0);
  const profitLastMonth = soldLastMonth.reduce((s, v) => s + profitOf(v), 0);

  const pctChange = (curr: number, prev: number) =>
    prev === 0 ? null : Math.round(((curr - prev) / Math.abs(prev)) * 100);

  const stats = [
    {
      label: "Total Vehicles in Stock",
      value: String(inStock.length),
      delta: `${inStock.length - inStockLastMonth >= 0 ? "+" : ""}${
        inStock.length - inStockLastMonth
      } from last month`,
      up: inStock.length >= inStockLastMonth,
      icon: Car,
      iconBg: "bg-accent/15 text-accent",
    },
    {
      label: "This Month Invested",
      value: formatMoney(investedThisMonth),
      delta:
        pctChange(investedThisMonth, investedLastMonth) === null
          ? "—"
          : `${pctChange(investedThisMonth, investedLastMonth)}% from last month`,
      up: investedThisMonth <= investedLastMonth, // spending less is "good" direction-wise, but colored red like the mock (cost)
      isCost: true,
      icon: Wallet,
      iconBg: "bg-bad/10 text-bad",
    },
    {
      label: "This Month Sales",
      value: formatMoney(salesThisMonth),
      delta:
        pctChange(salesThisMonth, salesLastMonth) === null
          ? "—"
          : `${pctChange(salesThisMonth, salesLastMonth)}% from last month`,
      up: salesThisMonth >= salesLastMonth,
      icon: TrendingUp,
      iconBg: "bg-good/10 text-good",
    },
    {
      label: "This Month Profit",
      value: formatMoney(profitThisMonth),
      delta:
        pctChange(profitThisMonth, profitLastMonth) === null
          ? "—"
          : `${pctChange(profitThisMonth, profitLastMonth)}% from last month`,
      up: profitThisMonth >= profitLastMonth,
      icon: Coins,
      iconBg: "bg-gold/15 text-gold-dark",
    },
  ];

  // ── Last 6 months chart ──────────────────────
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getLocalMonthKey(d));
  }
  const monthly = new Map<string, { investment: number; sales: number; profit: number }>();
  months.forEach((m) => monthly.set(m, { investment: 0, sales: 0, profit: 0 }));

  for (const v of allVehicles) {
    const pk = monthKey(v.purchase_date);
    if (monthly.has(pk)) monthly.get(pk)!.investment += costOf(v);
    if (v.status === "sold" && v.sold_date) {
      const sk = monthKey(v.sold_date);
      if (monthly.has(sk)) {
        monthly.get(sk)!.sales += Number(v.sold_price);
        monthly.get(sk)!.profit += profitOf(v);
      }
    }
  }

  const chartRows = months.map((m) => ({ month: m, ...monthly.get(m)! }));
  const maxVal = Math.max(
    1,
    ...chartRows.flatMap((r) => [r.investment, r.sales, Math.max(r.profit, 0)])
  );
  const chartMax = Math.ceil(maxVal / 500000) * 500000 || 500000;
  const gridLines = [4, 3, 2, 1, 0].map((n) => (chartMax / 4) * n);

  // ── Recent sales ─────────────────────────────
  const recentSales = allVehicles
    .filter((v) => v.status === "sold")
    .sort((a, b) => (b.sold_date ?? "").localeCompare(a.sold_date ?? ""))
    .slice(0, 5);

  const quickActions = [
    { label: "Add Vehicle", desc: "Add new vehicle to stock", href: "/vehicles/new", icon: Car },
    { label: "Add Partner", desc: "Add business partner", href: "/partners", icon: Users },
    {
      label: "Record Expense",
      desc: "Add your expense",
      href: "/vehicles",
      icon: IndianRupee,
    },
    { label: "Record Sale", desc: "Mark vehicle as sold", href: "/vehicles", icon: Tag },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back,</h1>
          <p className="text-sm text-ink/60">Here's an overview of your vehicle business.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink/70">
          <Calendar size={15} />
          {new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}{" "}
          –{" "}
          {new Date(now.getFullYear(), now.getMonth() + 1, 0).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card flex flex-col sm:flex-row items-start gap-2 sm:gap-3 p-3 sm:p-5">
            <div className={`flex h-8 w-8 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full ${s.iconBg}`}>
              <s.icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm text-ink/60">{s.label}</div>
              <div className="text-base sm:text-xl font-bold break-all">{s.value}</div>
              <div className={`mt-0.5 text-[10px] sm:text-xs leading-tight ${s.up ? "text-good" : "text-bad"}`}>
                {s.delta}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        {/* Chart */}
        <div className="card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-accent" />
              <div>
                <h2 className="text-sm font-semibold">Last 6 Months Overview</h2>
                <p className="text-xs text-ink/50">Investment, Sales and Profit</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs text-ink/60">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gold-light" /> Investment
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-accent" /> Sales
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-good" /> Profit
              </span>
            </div>
          </div>

          <div className="flex">
            {/* Y axis */}
            <div className="flex flex-col justify-between pr-3 text-right text-[11px] text-ink/40">
              {gridLines.map((v) => (
                <div key={v} style={{ height: "1px" }}>
                  {formatLakh(v)}
                </div>
              ))}
            </div>

            {/* Bars */}
            <div className="relative flex flex-1 items-end justify-between gap-2 border-l border-line pl-3">
              {gridLines.map((v, i) => (
                <div
                  key={i}
                  className="pointer-events-none absolute left-0 right-0 border-t border-line/60"
                  style={{ bottom: `${(v / chartMax) * 100}%` }}
                />
              ))}
              {chartRows.map((r) => (
                <div key={r.month} className="z-10 flex flex-1 flex-col items-center">
                  <div className="flex h-56 items-end gap-1">
                    <div
                      className="w-2 sm:w-3 rounded-t bg-gold-light"
                      style={{ height: `${(r.investment / chartMax) * 100}%` }}
                      title={`Investment: ${formatMoney(r.investment)}`}
                    />
                    <div
                      className="w-2 sm:w-3 rounded-t bg-accent"
                      style={{ height: `${(r.sales / chartMax) * 100}%` }}
                      title={`Sales: ${formatMoney(r.sales)}`}
                    />
                    <div
                      className="w-2 sm:w-3 rounded-t bg-good"
                      style={{ height: `${(Math.max(r.profit, 0) / chartMax) * 100}%` }}
                      title={`Profit: ${formatMoney(r.profit)}`}
                    />
                  </div>
                  <div className="mt-2 text-[11px] text-ink/50">{monthLabel(r.month)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Zap size={18} className="text-accent" />
            <div>
              <h2 className="text-sm font-semibold">Quick Actions</h2>
              <p className="text-xs text-ink/50">Common business operations</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="card flex flex-col gap-2 p-3 hover:border-accent"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <a.icon size={17} />
                  </span>
                  <ChevronRight size={15} className="text-ink/30" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{a.label}</div>
                  <div className="text-xs text-ink/50">{a.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent sales */}
      <div className="card p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-accent" />
            <div>
              <h2 className="text-sm font-semibold">Recent Sales</h2>
              <p className="text-xs text-ink/50">Your latest sold vehicles</p>
            </div>
          </div>
          <Link
            href="/vehicles"
            className="flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium hover:border-accent"
          >
            View All Sales <ChevronRight size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs text-ink/50">
                <th className="pb-2 pr-3 font-medium">#</th>
                <th className="pb-2 pr-3 font-medium">Vehicle</th>
                <th className="pb-2 pr-3 font-medium">Registration No.</th>
                <th className="pb-2 pr-3 font-medium">Sale Price</th>
                <th className="pb-2 pr-3 font-medium">Purchase Price</th>
                <th className="pb-2 pr-3 font-medium">Profit</th>
                <th className="pb-2 pr-3 font-medium">Partner</th>
                <th className="pb-2 pr-3 font-medium">Sale Date</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recentSales.length ? (
                recentSales.map((v, i) => (
                  <tr key={v.id}>
                    <td className="py-3 pr-3 text-ink/50">{i + 1}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-paper text-ink/40">
                          <Car size={16} />
                        </span>
                        <div>
                          <div className="font-medium">
                            {[v.make, v.model].filter(Boolean).join(" ") || "Vehicle"}
                          </div>
                          <div className="text-xs text-ink/50">
                            {[v.year, "Petrol"].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3">{v.registration_number}</td>
                    <td className="py-3 pr-3">{formatMoney(v.sold_price)}</td>
                    <td className="py-3 pr-3">{formatMoney(v.purchase_price)}</td>
                    <td className="py-3 pr-3 font-medium text-good">
                      {formatMoney(profitOf(v))}
                    </td>
                    <td className="py-3 pr-3">
                      {firstPartnerByVehicle.get(v.id) ?? "Self"}
                    </td>
                    <td className="py-3 pr-3">{v.sold_date}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-good/10 px-2 py-0.5 text-xs font-medium text-good">
                        Sold
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-ink/50">
                    No sales yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}