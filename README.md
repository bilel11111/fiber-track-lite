# FiberTrack Lite

A focused operations dashboard for tracking fiber-network assets, materials, and field activity.

## Overview

FiberTrack Lite is a lightweight web workspace for organizing network-related materials and visualizing operational information on an interactive map. The project combines authenticated access with a practical dashboard and a dedicated materials view.

## Highlights

- Authenticated sign-in and protected application routes.
- Map-based operational dashboard for geographic context.
- Materials inventory view for organizing field resources.
- Responsive layouts suitable for desktop and mobile use.
- Clear separation between route pages, map components, authentication, and data integrations.

## Technology

- React 19 and TypeScript
- TanStack Start and Vite
- Tailwind CSS
- Leaflet for interactive mapping
- Supabase authentication and data services
- Zod, date-fns, and Lucide React

## Local development

```bash
bun install
bun run dev
```

Copy `.env.example` to `.env` and provide the required public Supabase configuration. Keep all local environment files out of version control and never place service-role keys in browser code.

## Project structure

Application routes are located in `src/routes/`. The map experience is implemented in `src/components/map/`, while authentication and Supabase integrations are isolated under `src/hooks/` and `src/integrations/`.

## Status

This repository is a portfolio-ready prototype for authenticated network operations and materials tracking.

## License

No license has been declared yet. Add a license before accepting external contributions or redistributing the project.

## Author

**Bilel JM** — [GitHub](https://github.com/bilel11111)
