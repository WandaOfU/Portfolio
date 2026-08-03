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
3. Site goes live at `https://wandaofu.github.io/Portfolio/` (usually within a minute or two).
4. Optional custom domain: add a `CNAME` file with the domain, point its DNS at GitHub Pages, then set the domain in the same Pages settings screen. If you do this, update the URLs in `sitemap.xml`, `robots.txt`, and the `<link rel="canonical">` / `og:url` tags in each page's `<head>` to the new domain.

## After it's live

- Submit `sitemap.xml` in [Google Search Console](https://search.google.com/search-console) and [Yandex Webmaster](https://webmaster.yandex.com) so both engines index it.
- To edit content going forward: just edit the HTML files directly (or ask Claude to).
