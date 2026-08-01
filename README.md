# Nixon FM - CSE 134B HW5

Nixon FM is my portfolio site for CSE 134B. The site uses a music-library theme to organize my engineering work into tracks, playlists, and project notes.

Deployed site: https://nixon-hw5.netlify.app  
Repository: https://github.com/NixonLesmana/cse134b-hw5


## Local Setup

Install dependencies:

```bash
npm install
```

Run a local dev server:

```bash
npm run dev
```

Build the site:

```bash
npm run build
```

The build output is generated into `_site/`. I didn't commit `_site/` or `node_modules/`.


## Part 1: Progressive Theme Picker

I chose Option A, the theme picker.

The no-JavaScript baseline is handled in CSS with `color-scheme` and `prefers-color-scheme`. If JavaScript is disabled, the site still has a working light or dark theme based on the user’s system preference. The theme picker control is hidden by default with the `hidden` attribute, so users without JavaScript do not see a control that silently does nothing.

When JavaScript is available, `js/theme-picker.js` reveals the picker and lets the user choose:
- Light
- Dark
- System

The control uses real radio buttons inside a `fieldset` and `legend`, so the selected state is exposed through the checked radio input. The selected theme is saved in `localStorage` and applied by setting `data-theme` on the root `<html>` element. System mode removes `data-theme`, returning control to the CSS system preference.

`localStorage` access is wrapped in `try/catch`, so the page still works if storage is blocked or unavailable.

To reduce incorrect-theme flash, the theme module is loaded in the document head and applies the saved `data-theme` as early as possible. The CSS baseline always provides a valid light or dark theme before JavaScript runs, so the page is never unstyled or unusable. A user with a saved override may briefly see the system theme before the module applies the override.


## Part 2: GitHub Activity Web Component

The custom element is:

```html
<github-activity username="NixonLesmana" count="3">
    <p>
        GitHub activity is unavailable right now. Visit
        <a href="https://github.com/NixonLesmana">my GitHub profile</a>
        to see recent work.
    </p>
</github-activity>
```

### Attributes

| Attribute | Default | Accepted values | Description |
| --- | --- | --- | --- |
| `username` | `NixonLesmana` | Any GitHub username | Chooses which user’s public activity to load. |
| `count` | `3` | Numbers from `1` to `8` | Controls how many recent events are shown. |

The component fetches from the GitHub public events API:

```text
https://api.github.com/users/{username}/events/public
```

It doesn't use an API key.

The component handles:
- idle
- loading
- success
- empty results
- error

It reflects state with `data-state`, such as `data-state="loading"`, `data-state="ready"`, and `data-state="error"`.

The component uses `connectedCallback`, `disconnectedCallback`, `observedAttributes`, and `attributeChangedCallback`. Changing `username` or `count` in DevTools reloads the component with new data. In-flight requests are canceled with `AbortController`, and requests also have a timeout so the widget does not stay loading forever.

Responses are cached in `sessionStorage` for 5 minutes. This keeps reloads from repeatedly hitting the GitHub API during development.

Remote data is rendered using a cloned `<template>`, `textContent`, `createElement`, and `replaceChildren`. I avoided `innerHTML` because remote API data should not be inserted as HTML. Treating remote strings as HTML could create an injection risk if the data source ever returned unexpected markup.


## Part 3: Static Site Generator

I used Eleventy because the original site was already plain HTML, CSS, and JavaScript. Eleventy let me keep that style while removing repeated markup.

The source files live in `src/`, and Eleventy builds the final site into `_site/`.

Important structure:

```text
src/
  _data/
    site.js
    projects.json
  _includes/
    head.njk
    header.njk
    footer.njk
    layouts/
      base.njk
  css/
  js/
  images/
  media/
```

The base layout owns the document shell, including `<!DOCTYPE>`, `<head>`, shared scripts, shared stylesheet, header, main page wrapper, footer, and the GitHub activity template.

Shared includes are used for:
- metadata/head
- site header and navigation
- site footer

Global site data is defined in `src/_data/site.js`. It contains the site title, author, navigation items, current year, deployed URL, and social links.

Project data is defined in `src/_data/projects.json`. The file powers the generated project pages. I generate more than three case-study pages from one template, `src/project.njk`.

The SSG conversion removed a lot of copy-pasted page chrome. The biggest benefit was that the header, footer, navigation, theme picker, scripts, and metadata now live in one place instead of being repeated across every HTML file. The cost is that the project has a build step now, so I have to think about source files and generated files separately.

I wouldn't use an SSG for a tiny one-page experiment or a throwaway prototype. For a multi-page portfolio like this, it makes sense because the shared layout and project data reduce repetition.


## Deployment

The site is deployed on Netlify.

Netlify uses the committed `netlify.toml` file:

```toml
[build]
  command = "npm run build"
  publish = "_site"
```

A push to GitHub triggers Netlify to install dependencies, run the build, and publish `_site/`.


## Extra Credit: Pagefind Search

I added full-text search with Pagefind.

The build script runs Eleventy first and then indexes the generated site:

```json
"build": "eleventy && pagefind --site _site"
```

Pagefind outputs its static search files into:

```text
_site/pagefind/
```

On my local build, the Pagefind index is about 820 KB.

The search page is available at:

```text
/search/
```

The search interface has a labeled `input type="search"` and a results region with `aria-live="polite"`. Search requires JavaScript, so the page includes a `<noscript>` message with links to the sitemap and project library.

I used Pagefind data attributes to control indexing:

- `data-pagefind-body` on the main content
- `data-pagefind-ignore` on header and footer

This keeps repeated navigation and footer text from being indexed on every page.

Pagefind doesn't need a search server. It builds a static index during deployment, and the browser searches that index with client-side JavaScript.