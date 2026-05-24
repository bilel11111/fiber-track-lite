import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const MapDashboard = lazy(() =>
  import("@/components/map/MapDashboard").then((m) => ({ default: m.MapDashboard }))
);

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FiberTrack IQ — FTTH Operations Map" },
      {
        name: "description",
        content:
          "Live FTTH operations dashboard for Soukra: technicians, BPI points, FDTs and fiber routes on OpenStreetMap.",
      },
      { property: "og:title", content: "FiberTrack IQ — FTTH Operations Map" },
      {
        property: "og:description",
        content: "Live map of technicians, BPI points, FDTs and fiber routes.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground">
          Loading map…
        </div>
      }
    >
      <MapDashboard />
    </Suspense>
  );
}
