# Portfolio

Vladislav Sapelin's product design portfolio. Static site, no build step — plain HTML/CSS/JS.

## Structure

- `index.html` — home
- `projects/index.html` — case study carousel
- `about/index.html` — jobs & education
- `assets/` — shared stylesheet, script, fonts (self-hosted, no external font requests), and photo

## Deploy (GitHub Pages)

1. Push this repo to `main`.
2. On GitHub: **Settings → Pages → Source → Deploy from a branch → `main` / `/(root)`**.
3. Custom domain: `vladsapelin.com` (see `CNAME`). DNS must point A records at GitHub Pages' IPs (185.199.108.153, .109.153, .110.153, .111.153) and set the domain under Settings → Pages → Custom domain.
4. Site is live at `https://vladsapelin.com/`.

## After it's live

- Submit `sitemap.xml` in [Google Search Console](https://search.google.com/search-console) and [Yandex Webmaster](https://webmaster.yandex.com) so both engines index it.
- To edit content going forward: just edit the HTML files directly (or ask Claude to).
