import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const MapDashboard = lazy(() =>
  import("@/components/map/MapDashboard").then((m) => ({ default: m.MapDashboard }))
);

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Map — FiberTrack IQ" }] }),
  component: Index,
  ssr: false,
});

function Index() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center bg-background text-muted-foreground">Loading map…</div>}>
      <MapDashboard />
    </Suspense>
  );
}
