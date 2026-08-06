# Ziquala Abo School Management System

Frontend for Ziquala Abo Monastery Kindergarten and Primary School in Bishoftu.

## Current scope

- Public school information and announcements
- A separate monastery section and monastery media gallery
- eLearning materials
- Academic and administrative portal
- Roles: Super Admin, Academic Manager, School Admin, Vice Principal, Teacher, Librarian, Parent, and Student

Finance, clinic, auditor, and driver roles are outside this project's scope.

## Local development

```bash
npm install
npm run dev
```

Development-only demo accounts use one of the IDs below with password `demo123`:

- `ZA-SUPER`
- `ZA-ACADEMIC`
- `ZA-SCHOOL`
- `ZA-VP`
- `ZA-TEACHER`
- `ZA-LIBRARY`
- `ZA-PARENT`
- `ZA-STUDENT`

## Backend configuration

No backend is configured by default. This prevents the frontend from contacting an unrelated school's server.

When the Ziquala backend is ready, configure only its URL:

```bash
VITE_API_URL=https://your-ziquala-host.example
```

For a local development proxy, use:

```bash
VITE_API_PROXY=http://127.0.0.1:3000
```

## Build

```bash
npm run build
```
