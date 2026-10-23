# AFTERCASE prototype guide

## What the prototype is

AFTERCASE is a personal archive for organizing public real-world cases, sources, people, evidence, timelines, and private research notes. The prototype emphasizes a calm, readable case-file workflow. Sign-in is a local demonstration only: any nonempty username and password work, no password is saved, and the session expires after 12 hours or 30 days when “Keep me signed in” is selected.

## Screens and files

- `login.html` — sign in or continue as a guest.
- `home.html` — dashboard, archive counts, quick actions, ongoing investigations, and recent cases.
- `index.html` — explore and search cases, filter by real-world status, switch grid/list, import and export backups.
- `case.html` — case overview, timeline, people, evidence, sources, notes, watchlist, edit, and delete actions.
- `case-form.html` — add or edit a case, including transcript/text preparation and structured details.
- `my-archive.html` — watchlist and personal notes.

Navigation is shared across signed-in pages. A first sign-in adds four clearly marked SAMPLE case files only when the local archive is empty. Those examples use invented names and places. “Remove them” deletes only sample records and records the choice in this browser.

## 90-second walkthrough

1. Open `login.html`, enter any username and password, and choose **Sign in**. You can also continue as Guest.
2. On the Dashboard, review the four archive counts and the sample case callout.
3. Choose **Explore Cases**, search or filter, then open a sample case.
4. From its Case File, inspect the timeline and evidence, add it to the watchlist, and use **Edit Case** or **Explore Cases** to return.
5. Choose **Add Case**, enter a title and real-world status, and save. You can paste transcript notes into the preparation area to preview extracted details before applying them.
6. Visit **My Archive**, then use the account menu to sign out.

For a responsive presentation, repeat the navigation and case flow at a narrow mobile width. Use Tab and Enter to follow links and buttons; Escape closes the mobile navigation and account disclosure.

## Design system

The visual language combines archival paper, restrained amber accents, thin file-rule borders, and a subtle grain texture. The palette is centralized in `style.css` under `:root`: deep green-black (`#111412`), raised surfaces (`#191e1b`, `#202622`), warm text (`#e9e4d9`), muted text (`#a5ada4`), and amber (`#d9a96c`). Status and reliability chips also use text labels and distinct markers, so color is not their only cue.

Typography uses Inter for body copy, Playfair Display for prominent case headings and counts, and IBM Plex Mono for labels, case numbers, and dates. A four-pixel spacing scale, consistent border radii, 44-pixel minimum controls, a single 1120-pixel content width, focus outlines, and reduced-motion handling keep the interface consistent and usable.

## Run locally

The prototype is static and uses browser modules and IndexedDB. From the project directory, start any static HTTP server, for example:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/login.html`. Opening the HTML file directly may block module loading. Google Fonts are the only remote design dependency; the rest of the prototype runs locally. To publish, upload the project files to a static host such as GitHub Pages and set the project root as the site source.

## Prototype limits

There is no real account service, authentication, server, or cross-device sync. Login accepts any nonempty values. Case records stay in this browser’s IndexedDB, and local browser data can be cleared by the browser. The prototype is for interaction and presentation, not production case management or verification of case facts.
