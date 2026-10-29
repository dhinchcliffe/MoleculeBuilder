# Molecule Builder

A public, responsive atomic playground for children. Drag elements into a real-time Three.js scene, inspect nuclei and electron shells, edit particles, and explore electrostatic attraction and repulsion.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm test
npm run build
```

Vercel: Vite preset, build `npm run build`, output `dist`. Every build runs the scientific model tests before bundling. Production branch: `main`.

## Scope and scientific conventions

- First 20 elements, up to 24 atoms per workspace. Protons determine element, neutrons determine isotope, protons minus electrons determines charge.
- Nucleons are large shaded 3D spheres; electrons are smaller spheres on schematic shell rings. Positions, speeds, sizes, forces and distances are educational illustrations, not physical scale.
- Shells use 2, 8, 8, 2 for the first 20 electrons (ground-state introductory model); no orbitals or electron clouds.
- `A` is mass number, not measured isotope mass. `wt` is the element's standard atomic weight, not the selected isotope's exact mass. Atomic weights are rounded educational values.
- Opposite ions attract; equal-sign ions repel; short-range repulsion prevents collapse. Neutral atoms do not bond automatically. This MVP does not simulate covalent bonding, valence, molecular geometries, nuclear stability/decay, or an ionic crystal lattice. The salt experiment is an isolated ion pair.
- Particle edits allow hypothetical/unstable configurations. Electron and proton counts are capped at 20, neutrons at 30.

## Controls

Drag or tap an element to add it. Drag atoms to move them. Select an atom and choose Zoom into atom. Drag a particle from the inspector into the scene to add it; drag a visible particle to the removal tray to subtract it. Plus/minus buttons provide keyboard/tap alternatives. Use zoom controls or mouse wheel. Clear is reversible using Undo. Presets replace the current scene and can be undone.

## Persistence and privacy

A dedicated Supabase project stores one workspace per browser session capability. A browser creates a cryptographically random 256-bit token in localStorage. Only SHA-256 of that token is persisted in the database; the token is sent in an HTTPS header and row-level security checks it on every request. There are no child names, emails or profiles. This is a browser-scoped guest session, not a Supabase Auth account. Clearing browser storage loses access; no cross-device login is included.

`src/storage.js` contains a public Supabase publishable key (safe for client use), never a service-role credential. The schema grants only select/insert/update and enforces session ownership for reads and writes. Saved scenes are capped at 24 atoms and 24KB. Local save remains available when cloud saving fails. Anonymous creation is open; production-scale usage should add rate limiting/CAPTCHA before broad promotion.

## Architecture

- `src/chemistry.js`: pure atomic model, validation, force integration.
- `src/scene.js`: Three.js scene, lighting, picking, labels and camera.
- `src/main.js`: pointer interactions, application state and inspector.
- `src/storage.js`: local fallback and private cloud workspace persistence.
- `src/style.css`: responsive dark interface.
- `database/schema.sql`: exact initial database schema and RLS policies.
- `tests/chemistry.test.js`: model invariants and force behavior.

## Changes and rollback

Make focused commits; run `npm test` and `npm run build`. Verify mouse/touch interactions, cloud isolation and responsive layouts after relevant changes. For a bad UI release, promote the last healthy deployment in Vercel and revert its Git commit. Avoid destructive schema changes; use additive migrations. Do not delete the Supabase project or workspace table to roll back frontend code.
