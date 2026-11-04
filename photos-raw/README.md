# Raw photos go here

Drop his original photos in this folder, named after the slot they fill, then run `npm run images`.
They get resized, compressed and written to `site/images/` (EXIF and GPS data are stripped).
This folder is git-ignored, so originals never get published.

| File name (any extension)  | Where it shows                                    | Best shot                                   |
|----------------------------|---------------------------------------------------|---------------------------------------------|
| hero                       | Big background behind the headline and form       | Wide, landscape. Left side gets darkened.   |
| about                      | "Meet the plumber"                                | Portrait (4:5). Ideally James himself.      |
| cta                        | Background of the final "Need a plumber?" panel   | Anything; it's darkened heavily.            |
| work-1 ... work-6          | "On the tools" gallery, with captions in index.html | His real jobs, any orientation            |

The service cards use icons, not photos. `original/` holds the untouched photos from his Instagram (ignored by `npm run images`).
Adding a seventh job: add a `work-7` slot in `scripts/optimize-images.mjs` and copy a `<figure class="job">` block in `site/index.html`.

Not enough photos? Reuse one in two slots. Keep work-* his own real jobs.
