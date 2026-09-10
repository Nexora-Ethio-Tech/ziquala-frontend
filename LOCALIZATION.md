# Interface localization

The active frontend branch is `fix/complete-localization`.

English, Amharic (`am`), and Afaan Oromo (`om`) share one i18next preference across the public site, login, and every role. The old `ziquala_lang=or` preference remains compatible. Changes update the document language and title without remounting forms.

`src/locales/{en,am,om}.json` contains keyed translations. `copy.{am,om}.json` covers additional interface text and known server messages. `copy.en.json` supplies English for originally Amharic text. The catalogs are static: production does not contact a translation service. Existing translations were reused, missing copy was drafted with translation assistance, and common school terminology, calendar labels, and bilingual headings received manual corrections. Coverage checks do not replace a native-speaker review of linguistic quality.

Use `uiText` only for presentation text. Keep form option values and submitted data in their original representation. Use explicit placeholders for complete sentences and preserve names/IDs in interpolation values; translate status labels explicitly. Use `uiError` at error display boundaries, preserving original errors for application logic. Do not translate typed messages or user-authored content. Supplied demonstration library copy is translated only while it still matches the original catalog entry; staff edits are preserved.

`LocalizedValidation` translates browser validation messages, which otherwise use the browser's own language. Dates and times use the chosen locale. Printed system labels and exported column headings are localized; filenames, records, and document contents are preserved.

Run `npm run check:localization` and `npm run build`. The check follows imports from `src/main.tsx`, excludes unused historical screens, verifies keyed and copy catalog parity, checks interpolation placeholders, rejects raw JSX labels and visible attributes, guards against translating input values, and requires explicit option values.

For browser checks, serve the production build on port 5187 and run a headless Chrome instance with debugging port 9246. Then run:

```sh
node scripts/localization-browser-smoke.cjs all
# Or run individual groups:
node scripts/localization-browser-smoke.cjs am
node scripts/localization-browser-smoke.cjs om
node scripts/localization-browser-smoke.cjs en
node scripts/localization-browser-smoke.cjs am routes
node scripts/localization-browser-smoke.cjs om routes
node scripts/localization-browser-switch.cjs
```

Run browser checks sequentially because they share local storage. They intercept API calls with synthetic data. The checks cover public pages, nine role dashboards, management routes, language persistence, preserved form input, native validation messages, and a mobile landing viewport. They do not validate live database integrations or translate uploaded files, announcements, or arbitrary chatbot replies.

## Validation of this change

The source audit passed with 1,235 keyed messages, 3,768 supplemental copy entries, and visible interface labels across 139 reachable files. The sequential browser suite passed 127 page/language combinations with no uncaught errors. Switching languages preserved the same login form and typed password, updated native validation messages, persisted across reloads, and fit a 390px landing viewport. The attendance management page also now accepts the existing API response envelope instead of trying to render the envelope as a class array.
