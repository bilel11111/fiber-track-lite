import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { Camera, Plus, Search, AlertTriangle, Package, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/materials")({
  head: () => ({ meta: [{ title: "Materials & Stock — FiberTrack IQ" }] }),
  component: MaterialsPage,
  ssr: false,
});

type Material = {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  stock_qty: number;
  min_stock: number;
};

const CATEGORIES = ["cable", "connector", "splice", "enclosure", "tool", "other"] as const;

function MaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [q, setQ] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [useFor, setUseFor] = useState<Material | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.from("materials").select("*").order("name");
    if (error) toast.error(error.message);
    else setMaterials(data as Material[]);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return materials;
    return materials.filter((m) => m.code.toLowerCase().includes(s) || m.name.toLowerCase().includes(s));
  }, [materials, q]);

  const lowCount = materials.filter((m) => m.stock_qty <= m.min_stock).length;

  const handleScanned = (code: string) => {
    setScanOpen(false);
    const m = materials.find((x) => x.code.toLowerCase() === code.toLowerCase());
    if (!m) {
      toast.error(`No material with code "${code}"`);
      return;
    }
    setUseFor(m);
  };

  const recordUsage = async (m: Material, quantity: number, bpiId: string, note: string) => {
    if (!user) return;
    if (quantity <= 0) { toast.error("Quantity must be > 0"); return; }
    if (quantity > m.stock_qty) { toast.error("Not enough stock"); return; }
    const { error } = await supabase.from("material_usages").insert({
      material_id: m.id, user_id: user.id, quantity, bpi_id: bpiId || null, note: note || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`Removed ${quantity} ${m.unit} of ${m.name}`);
    setUseFor(null);
    load();
  };

  return (
    <main className="h-screen w-screen overflow-y-auto bg-background">
      <div className="mx-auto max-w-5xl px-5 py-8 pt-20">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Materials & Stock</h1>
            <p className="text-sm text-muted-foreground">
              {materials.length} items
              {lowCount > 0 && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> {lowCount} low</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setScanOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              <Camera className="h-4 w-4" /> Scan QR
            </button>
            <button onClick={() => setAddOpen(true)} className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
              <Plus className="h-4 w-4" /> New material
            </button>
          </div>
        </header>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code or name…"
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Stock</th>
                <th className="px-4 py-2 text-right">Min</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const low = m.stock_qty <= m.min_stock;
                return (
                  <tr key={m.id} className="border-t border-border hover:bg-accent/40">
                    <td className="px-4 py-2.5 font-mono text-xs">{m.code}</td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-2"><Package className="h-3.5 w-3.5 text-muted-foreground" />{m.name}</span></td>
                    <td className="px-4 py-2.5 capitalize text-muted-foreground">{m.category}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${low ? "text-amber-600" : ""}`}>
                      {m.stock_qty} {m.unit}
                      {low && <AlertTriangle className="ml-1 inline h-3 w-3" />}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{m.min_stock}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setUseFor(m)} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium hover:bg-accent">
                        Use
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-sm text-muted-foreground">No materials found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {scanOpen && <Scanner onClose={() => setScanOpen(false)} onResult={handleScanned} />}
      {useFor && <UseDialog material={useFor} onClose={() => setUseFor(null)} onConfirm={recordUsage} />}
      {addOpen && <AddDialog onClose={() => setAddOpen(false)} onAdded={() => { setAddOpen(false); load(); }} />}
    </main>
  );
}

function Scanner({ onClose, onResult }: { onClose: () => void; onResult: (code: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const s = new Html5Qrcode(el.id);
    scannerRef.current = s;
    s.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (decoded) => { onResult(decoded); },
      () => {}
    ).catch((e) => { toast.error("Camera error: " + (e?.message ?? e)); });
    return () => { s.stop().catch(() => {}).finally(() => s.clear()); };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Scan material QR</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div id="qr-region" ref={ref} className="overflow-hidden rounded-lg bg-black" style={{ minHeight: 260 }} />
        <div className="mt-4">
          <label className="text-xs text-muted-foreground">Or enter code manually</label>
          <div className="mt-1 flex gap-2">
            <input
              value={manual} onChange={(e) => setManual(e.target.value)}
              placeholder="e.g. CBL-DROP-1F"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => manual.trim() && onResult(manual.trim())}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >Use</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UseDialog({ material, onClose, onConfirm }: { material: Material; onClose: () => void; onConfirm: (m: Material, q: number, b: string, n: string) => void }) {
  const [qty, setQty] = useState<number>(1);
  const [bpi, setBpi] = useState("");
  const [note, setNote] = useState("");
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Use material</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="font-semibold">{material.name}</div>
          <div className="font-mono text-xs text-muted-foreground">{material.code}</div>
          <div className="mt-1 text-xs">Stock: <span className="font-semibold">{material.stock_qty} {material.unit}</span></div>
        </div>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Quantity ({material.unit})</label>
            <input type="number" min={0.01} step="0.01" max={material.stock_qty} value={qty} onChange={(e) => setQty(parseFloat(e.target.value))}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">BPI / location (optional)</label>
            <input value={bpi} onChange={(e) => setBpi(e.target.value)} placeholder="e.g. BPI-A3"
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <button onClick={() => onConfirm(material, qty, bpi, note)}
          className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Remove from stock
        </button>
      </div>
    </div>
  );
}

function AddDialog({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("cable");
  const [unit, setUnit] = useState("pcs");
  const [stock, setStock] = useState(0);
  const [min, setMin] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("materials").insert({
      code: code.trim(), name: name.trim(), category, unit, stock_qty: stock, min_stock: min,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Material added");
    onAdded();
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">New material</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Code (unique, used for QR)"><input required value={code} onChange={(e) => setCode(e.target.value)} className={inp} /></Field>
          <Field label="Name"><input required value={name} onChange={(e) => setName(e.target.value)} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className={inp}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Unit"><input value={unit} onChange={(e) => setUnit(e.target.value)} className={inp} /></Field>
            <Field label="Initial stock"><input type="number" min={0} step="0.01" value={stock} onChange={(e) => setStock(parseFloat(e.target.value) || 0)} className={inp} /></Field>
            <Field label="Min stock alert"><input type="number" min={0} step="0.01" value={min} onChange={(e) => setMin(parseFloat(e.target.value) || 0)} className={inp} /></Field>
          </div>
        </div>
        <button disabled={busy} className="mt-4 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {busy ? "Adding…" : "Add material"}
        </button>
      </form>
    </div>
  );
}

const inp = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
