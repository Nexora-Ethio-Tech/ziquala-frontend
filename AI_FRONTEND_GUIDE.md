# Ziquala Frontend AI Guide

> **INCOMPLETE GUIDE**
>
> This document is a working guide for AI assistants contributing to the Ziquala frontend. It is intentionally incomplete and must be updated as the client approves content, visual direction, routes, permissions, and backend contracts.

## Purpose

Use this guide to make frontend changes without losing the project’s institutional boundaries, verified content, or existing portal behavior.

The product has three related but distinct parts:

1. A public school website.
2. A separate public monastery experience.
3. An authenticated academic and administrative portal for the school.

The public website may visually explain the relationship between the school and monastery, but it must not mix their content into one undifferentiated experience.

## Non-negotiable product boundaries

- Keep **School** and **Monastery** as clearly separated public experiences.
- School photographs, academic content, admissions information, staff, students, eLearning, and school news belong to the School experience.
- Monastery history, clergy, religious life, agriculture, heritage, projects, donations, and monastery media belong to the Monastery experience.
- The portal is for school academic and administrative work. It is not a monastery-management system.
- Use the term **eLearning** for the academic-file catalogue. Do not rename it to “Resources” without approval.
- Approved portal roles are Super Admin, Academic Manager, School Admin, Vice Principal, Teacher, Librarian, Parent, and Student.
- Finance, Clinic, Auditor, and Driver modules are outside the approved scope unless the client explicitly changes the scope.

## Current frontend stack

- React 19
- TypeScript
- Vite
- React Router
- Tailwind CSS
- Framer Motion
- Lucide React
- i18next
- Zustand
- Axios

Use the existing stack before introducing another library. Add a dependency only when it solves a clear problem that cannot be handled cleanly by what is already installed.

## Active application entry points

- `src/main.tsx` mounts the providers and application.
- `src/App.tsx` owns public/authenticated routing and role protection.
- `src/pages/LandingPage.tsx` is the currently imported public website.
- `src/data/ziqualaContent.ts` contains shared public identity and provisional content.
- `src/index.css` contains global tokens and reusable styles.
- `src/context/UserContext.tsx` controls authentication and role state.
- `src/layout/Layout.tsx` is the authenticated application shell.

There is also an older public-site implementation under `src/pages/LandingPage/` and older section components under `src/components/LandingSections.tsx` and `src/pages/LandingSections/`. Do not assume those files are active. Reuse individual ideas only after confirming that they fit the active `src/pages/LandingPage.tsx` implementation.

## Public information architecture

The current public routes are:

- `/` — institutional gateway
- `/school` — public school experience
- `/monastery` — public monastery experience
- `/elearning` — academic catalogue
- `/news` — public news and events
- `/portal` — explanation of portal scope
- `/login` — authentication

The intended direction is:

### Institutional gateway

The root page should introduce Ziquala and offer two unmistakable paths: School and Monastery. It should not become a long page where both institutions are mixed together.

### School experience

The school side should feel active, welcoming, educational, modern, and trustworthy. Likely content includes:

- School identity and introduction
- Vision, mission, and objectives
- Student life and learning
- Grade levels and academic programs
- School building and facilities
- Leadership and staff
- eLearning
- School news and events
- Contact or admissions information
- Portal login

### Monastery experience

The monastery side should feel calm, respectful, historic, cinematic, and grounded in place. Likely content includes:

- Monastery introduction and history
- Abbot and monastic community
- Church and sacred spaces
- Museum and heritage
- Reading and spiritual study
- Farming, food preparation, sewing, livestock, and other projects
- Documentary/media gallery
- Approved support or donation information

Do not use playful school interaction patterns for sacred or historically sensitive monastery content.

## Visual direction

Wesley College’s website is a reference for the quality of editorial composition, photography, motion, and interaction. It is not a design template to clone.

Take inspiration from principles such as:

- Large, confident typography
- Image-led storytelling
- Generous spacing
- Smooth reveal transitions
- Purposeful horizontal galleries
- Subtle parallax or scroll-linked movement
- Strong navigation transitions
- Clear calls to action
- Restrained, coherent color systems

Do not copy Wesley’s exact layout, copywriting, typefaces, assets, or animation sequence.

Use two related visual languages:

- **School:** green, cream, warm gold, brighter imagery, energetic but controlled motion.
- **Monastery:** earth, charcoal, muted green, sacred gold, slower motion, landscape and documentary imagery.

Avoid turning every piece of information into a rounded card. Prefer editorial layouts, full-width photography, intentional asymmetry, and meaningful changes in rhythm.

## Motion and interaction rules

- Motion must support hierarchy and storytelling, not decorate every element.
- Prefer transforms and opacity for smooth performance.
- Provide a reduced-motion experience using `prefers-reduced-motion` or Framer Motion’s reduced-motion support.
- Avoid scroll-jacking.
- Avoid long blocking intro animations.
- Keep navigation and primary actions usable before animations complete.
- Test interactions with keyboard input and touch, not only mouse hover.
- Do not hide essential content behind hover-only behavior.

## Source material

The supplied source archive is in `../static files/`. Treat it as read-only unless the user explicitly asks to reorganize it.

Important working documents include:

- `../static files/images_and_vid.txt`
- `../static files/school_related/data_about_the_school.txt`
- `../static files/short_story_about_the_monastery.txt`
- `../static files/ዝቋላ አቦ.docx`

Available media currently includes:

- School logo
- School building
- Students in assembly
- Individual student photograph
- Board, leadership, teacher, and staff portraits
- Church and monastery landscape
- Monks reading
- Monastery abbot portrait
- Enjera preparation
- Sewing activity
- Crop harvesting
- Ox farming
- Livestock
- Museum building

Some raw filenames contain spaces, punctuation, Amharic text, or literal line breaks. Do not bulk-rename or move them without explicit approval. For production use, copy only approved derivatives into a controlled frontend asset directory and give the derivatives stable, accessible filenames.

## Content truth and approval

Treat supplied files as source material, not automatically approved public copy.

- Do not invent establishment dates, enrollment totals, branch counts, names, titles, achievements, or contact details.
- Historical claims in the monastery story require client or authoritative-source approval before publication.
- The official school naming is not yet completely consistent across the supplied documents. Some material says Grade 1–8, while other material describes kindergarten and primary school. Preserve the ambiguity until the client confirms the canonical public name and grade range.
- Staff lists and roles may change. Do not present them as current without confirmation.
- Do not publish the monastery bank account simply because it appears in the image inventory. Donation details require explicit client approval and appropriate security/context.
- Do not expose internal rules, employment information, personal records, spreadsheets, or other administrative data on public pages.
- Public wording should eventually be approved in English, Amharic, and Afaan Oromo.

When content is not verified, either omit it or label the UI clearly as a development placeholder. Never make a placeholder look like a confirmed fact.

## Image and privacy rules

- Confirm publication permission for photographs of children, staff, clergy, and community members.
- Never infer a person’s identity from appearance. Use only supplied, approved name-to-image mappings.
- Use descriptive alt text based on visible content and confirmed context.
- Do not place a person’s unconfirmed name in alt text.
- Avoid publishing student names with identifiable photographs unless there is explicit approval.
- Preserve the dignity and religious context of monastery imagery.
- Do not remove embedded ownership marks or watermarks without permission.
- Optimize approved copies for the web; do not alter the read-only originals.
- Large videos should use an approved streaming host instead of being bundled into the frontend.

## Component and code guidance

- Prefer small, focused components with clear names.
- Keep route-level composition in page files and reusable behavior in components.
- Keep shared public content in a typed data layer until a backend or CMS contract exists.
- Do not duplicate the same public facts across several components.
- Use semantic HTML before adding ARIA.
- All buttons must have an accessible label.
- All forms must have visible labels, validation states, and keyboard support.
- Keep dark mode functional when changing shared UI.
- Preserve responsive behavior from small mobile screens through wide desktops.
- Avoid adding global CSS overrides when a scoped component style or Tailwind utility is sufficient.
- Use existing color variables (`--primary`, `--secondary`, and `--accent`) when working inside the shared school application.

## Authentication and role safety

- Do not weaken `ProtectedRoute` checks for visual convenience.
- Do not expose authenticated data on public routes.
- UI role checks are for presentation and routing only; backend authorization must enforce real access.
- Keep role normalization consistent with `src/App.tsx`.
- Do not add a role to navigation without adding and verifying its routing and authorization behavior.
- Demo accounts and mock data must never be treated as production authentication.

## Backend integration guidance

The frontend currently contains demo and provisional data. When connecting APIs:

- Use the configured `VITE_API_URL` or development proxy.
- Keep endpoint definitions in services/configuration rather than hardcoding URLs in components.
- Define response types.
- Handle loading, empty, error, and unauthorized states.
- Do not silently fall back to convincing fake data after a production API failure.
- Keep school news and monastery updates distinguishable in the data model.
- Preserve audit history for academic publishing and permission-sensitive eLearning operations.

## Validation checklist

Before handing off a frontend change:

1. Confirm that School and Monastery content remain separated.
2. Confirm that no unverified facts or private data were introduced.
3. Test the changed route on mobile and desktop widths.
4. Test keyboard navigation and visible focus states.
5. Test light and dark themes where supported.
6. Check loading, empty, and failure states for dynamic content.
7. Run `npm run build`.
8. Inspect the working tree and avoid including unrelated user changes.

## Known incomplete decisions

This guide cannot yet provide final answers for:

- Canonical school name and exact grade range
- Final multilingual copy
- Final logo and brand system
- Approved school and monastery image sets
- Photo and video publication permissions
- Confirmed historical citations
- Current leadership and staff information
- Branch names and verified statistics
- Admissions/contact workflow
- Donation presentation and approval
- Public CMS/backend contracts
- Final motion language and page-by-page designs

Until these decisions are approved, make reversible, well-labeled changes and avoid presenting assumptions as institutional facts.
