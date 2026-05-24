import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { getDistance } from "geolib";
import {
  technicians as initialTechs,
  bpis,
  fdts,
  routes,
  SOUKRA_CENTER,
  type Technician,
} from "@/lib/mock-network";

// Fix default Leaflet icon URLs (Vite bundling)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function divIcon(bg: string, label: string, size = 28) {
  return L.divIcon({
    className: "fti-icon",
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;box-shadow:0 4px 12px rgba(0,0,0,.25);border:2px solid #fff">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

const techIcon = (s: Technician["status"]) =>
  divIcon(s === "online" ? "#10b981" : s === "busy" ? "#f59e0b" : "#6b7280", "T");

const bpiIcon = (s: string) =>
  divIcon(s === "ok" ? "#0ea5e9" : s === "warning" ? "#f59e0b" : "#ef4444", "B", 22);

const fdtIcon = () => divIcon("#8b5cf6", "F", 30);

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 0.8 });
  }, [center, map]);
  return null;
}

type LayerKey = "technicians" | "bpi" | "fdt" | "routes";

export function MapDashboard() {
  const [techs, setTechs] = useState<Technician[]>(initialTechs);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    technicians: true, bpi: true, fdt: true, routes: true,
  });
  const [statusFilter, setStatusFilter] = useState<"all" | Technician["status"]>("all");
  const [ticketPoint, setTicketPoint] = useState<[number, number] | null>(null);
  const [recenterTarget, setRecenterTarget] = useState<[number, number]>(SOUKRA_CENTER);

  // Simulate live technician movement
  useEffect(() => {
    const id = setInterval(() => {
      setTechs((prev) =>
        prev.map((t) =>
          t.status === "online"
            ? { ...t, lat: t.lat + (Math.random() - 0.5) * 0.0008, lng: t.lng + (Math.random() - 0.5) * 0.0008 }
            : t
        )
      );
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const filteredTechs = useMemo(
    () => techs.filter((t) => statusFilter === "all" || t.status === statusFilter),
    [techs, statusFilter]
  );

  const nearest = useMemo(() => {
    if (!ticketPoint) return null;
    const onlineTechs = techs.filter((t) => t.status !== "offline");
    if (!onlineTechs.length) return null;
    const sorted = [...onlineTechs].sort(
      (a, b) =>
        getDistance({ latitude: ticketPoint[0], longitude: ticketPoint[1] }, { latitude: a.lat, longitude: a.lng }) -
        getDistance({ latitude: ticketPoint[0], longitude: ticketPoint[1] }, { latitude: b.lat, longitude: b.lng })
    );
    return {
      tech: sorted[0],
      distanceM: getDistance(
        { latitude: ticketPoint[0], longitude: ticketPoint[1] },
        { latitude: sorted[0].lat, longitude: sorted[0].lng }
      ),
    };
  }, [ticketPoint, techs]);

  const counts = {
    online: techs.filter((t) => t.status === "online").length,
    busy: techs.filter((t) => t.status === "busy").length,
    offline: techs.filter((t) => t.status === "offline").length,
    faults: bpis.filter((b) => b.status === "fault").length,
    warnings: bpis.filter((b) => b.status === "warning").length,
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="absolute left-4 top-4 z-[1000] w-80 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">F</div>
          <div>
            <h1 className="text-base font-bold tracking-tight">FiberTrack IQ</h1>
            <p className="text-xs text-muted-foreground">Soukra · Tunisia</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Kpi label="Online" value={counts.online} color="bg-emerald-500" />
          <Kpi label="Busy" value={counts.busy} color="bg-amber-500" />
          <Kpi label="Offline" value={counts.offline} color="bg-gray-400" />
          <Kpi label="BPI Faults" value={counts.faults} color="bg-red-500" />
          <Kpi label="Warnings" value={counts.warnings} color="bg-amber-500" />
          <Kpi label="FDTs" value={fdts.length} color="bg-violet-500" />
        </div>

        {/* Layers */}
        <div className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Layers</h2>
          <div className="mt-2 space-y-1.5">
            {(["technicians", "bpi", "fdt", "routes"] as LayerKey[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 hover:bg-accent">
                <span className="text-sm capitalize">{k}</span>
                <input
                  type="checkbox"
                  checked={layers[k]}
                  onChange={() => setLayers((s) => ({ ...s, [k]: !s[k] }))}
                  className="h-4 w-4 accent-primary"
                />
              </label>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Technician status</h2>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {(["all", "online", "busy", "offline"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Nearest tech finder */}
        <div className="mt-5 rounded-xl border border-border bg-background/60 p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nearest technician</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {ticketPoint
              ? "Click map to move the ticket point."
              : "Click anywhere on the map to drop a ticket location."}
          </p>
          {nearest && (
            <div className="mt-2 rounded-lg bg-primary/10 p-2 text-xs">
              <div className="font-semibold">{nearest.tech.name}</div>
              <div className="text-muted-foreground">
                {(nearest.distanceM / 1000).toFixed(2)} km · {nearest.tech.status}
              </div>
              <button
                onClick={() => setRecenterTarget([nearest.tech.lat, nearest.tech.lng])}
                className="mt-1.5 text-primary hover:underline"
              >
                Fly to technician →
              </button>
            </div>
          )}
          {ticketPoint && (
            <button
              onClick={() => setTicketPoint(null)}
              className="mt-2 w-full rounded-md bg-secondary px-2 py-1 text-xs hover:bg-accent"
            >
              Clear ticket
            </button>
          )}
        </div>

        {/* Tech list */}
        <div className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Technicians ({filteredTechs.length})
          </h2>
          <div className="mt-2 space-y-1">
            {filteredTechs.map((t) => (
              <button
                key={t.id}
                onClick={() => setRecenterTarget([t.lat, t.lng])}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      t.status === "online" ? "bg-emerald-500" : t.status === "busy" ? "bg-amber-500" : "bg-gray-400"
                    }`}
                  />
                  <span className="truncate">{t.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">{t.lastSeen}</span>
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] text-muted-foreground">
          Frontend MVP · OpenStreetMap tiles · Mock data
        </p>
      </aside>

      <MapContainer
        center={SOUKRA_CENTER}
        zoom={14}
        className="h-full w-full"
        zoomControl={false}
        
      >
        <ClickCatcher onClick={(latlng) => setTicketPoint(latlng)} />
        <Recenter center={recenterTarget} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {layers.routes &&
          routes.map((r) => (
            <Polyline key={r.id} positions={r.path} pathOptions={{ color: r.color, weight: 4, opacity: 0.75 }} />
          ))}

        {layers.fdt && (
          <MarkerClusterGroup chunkedLoading>
            {fdts.map((f) => (
              <Marker key={f.id} position={[f.lat, f.lng]} icon={fdtIcon()}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold">{f.name}</div>
                    <div className="text-xs opacity-70">Sector {f.sectorId}</div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {layers.bpi && (
          <MarkerClusterGroup chunkedLoading>
            {bpis.map((b) => (
              <Marker key={b.id} position={[b.lat, b.lng]} icon={bpiIcon(b.status)}>
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold">{b.posBpi}</div>
                    <div className="text-xs opacity-70">{b.id} · Sector {b.sectorId}</div>
                    <div className="mt-1 text-xs">
                      Status: <span className="font-semibold capitalize">{b.status}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

        {layers.technicians &&
          filteredTechs.map((t) => (
            <Marker key={t.id} position={[t.lat, t.lng]} icon={techIcon(t.status)}>
              <Popup>
                <div className="text-sm">
                  <div className="font-bold">{t.name}</div>
                  <div className="text-xs opacity-70">{t.id} · {t.phone}</div>
                  <div className="mt-1 text-xs capitalize">
                    Status: <span className="font-semibold">{t.status}</span> · {t.lastSeen}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {ticketPoint && (
          <>
            <CircleMarker
              center={ticketPoint}
              radius={10}
              pathOptions={{ color: "#ef4444", fillColor: "#ef4444", fillOpacity: 0.9 }}
            >
              <Popup>Ticket location</Popup>
            </CircleMarker>
            {nearest && (
              <Polyline
                positions={[ticketPoint, [nearest.tech.lat, nearest.tech.lng]]}
                pathOptions={{ color: "#ef4444", weight: 3, dashArray: "8 6" }}
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] rounded-xl border border-border bg-card/95 p-3 text-xs shadow-xl backdrop-blur-sm">
        <div className="mb-1.5 font-semibold uppercase tracking-wider text-muted-foreground">Legend</div>
        <LegendRow color="#10b981" label="Tech online" />
        <LegendRow color="#f59e0b" label="Tech busy / BPI warning" />
        <LegendRow color="#6b7280" label="Tech offline" />
        <LegendRow color="#0ea5e9" label="BPI ok" />
        <LegendRow color="#ef4444" label="BPI fault / ticket" />
        <LegendRow color="#8b5cf6" label="FDT" />
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-2">
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

import { useMapEvents } from "react-leaflet";
function ClickCatcher({ onClick }: { onClick: (latlng: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}
