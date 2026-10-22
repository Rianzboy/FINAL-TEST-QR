# QR-ATT — Graphite Edition

This project is based on the provided QR-ATT_FINALS-master Expo app.

Includes the redesigned Graphite screens and a floating top navigation bar with the AppDrawer menu, while keeping the original Expo QR and Supabase logic. Additional screens: Reminders and Rewards. Teacher/Admin routes remain role gated.

Intentionally excluded: Vercel deployment configuration, browser-specific check-in URL generation, forgot-password and reset-password screens.

Setup: copy .env.example to .env, supply EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then npm install and npx expo start.

## Graphite visual system

- `constants/colors.ts` defines the shared **Graphite** palette: neutral charcoal backgrounds (`#0C0D10`, `#141519`), graphite panels (`#181A1F`), white/gray surfaces and borders, and a light-gray accent (`#D4D4D8`).
- Brand accents, success states and navigation highlights are intentionally monochrome gray. Destructive actions remain red for clarity.
- `components/CampusBackground.tsx` renders a faint graphite grid with neutral corner glows.
- Auth, profile, scanner, teacher/admin consoles, tables and the drawer all use the same palette.

## Layout

- The **Explore** opener is a floating, rounded top capsule inset from the screen edges. It carries the QR-ATT brand and the navigation button, and remains part of the tab layout so it never overlaps page content.
- The drawer still slides up from the bottom and can be dragged down to dismiss.
- Page content starts directly below the floating app bar; screens were re-padded so there are no double safe-area gaps.
- `components/DataTable.tsx` is a presentation table: card header with icon/title/row count, built-in search, sortable columns, zebra rows, hover/press states, selection highlight, responsive column widths with horizontal scrolling on narrow screens, skeleton loading, friendly empty states, and "Show more / Show all" pagination.
- `components/PageHeader.tsx` has a working back button, an inline count badge, an optional right-side action slot, and a responsive title row.
- Home uses a split desktop dashboard: hero on the left, a compact quick-access panel on the right, a full-width stat strip below, then the recent check-ins table and a two-up tip/developer footer. On phones everything stacks.
- Login uses a split-screen brand panel with feature highlights on wide screens and a stacked card on phones.
- Attendance History, Reminders and Rewards use full-width scrollable layouts, summary stat cards, consistent section headers, and titled/searchable tables. History's teacher attendee drill-down is an inline detail card.
