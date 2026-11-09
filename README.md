# Hikvision Field Reports (React + Vite + yarn)

Support-case and training reports that you fill in once, keep on the device, and download as a **PPTX** or **PDF** with your photos inside.

## Run it

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # production build in dist/ (deploy to Vercel/Netlify as a static site)
yarn preview    # serve the production build locally
```

## How photos work

| Step | What happens |
| --- | --- |
| Pick / take a photo | The **original file** is saved in the browser (IndexedDB, as a Blob). No resizing, no recompression. A small thumbnail is stored beside it only to keep the lists fast. |
| Preview | Shows the stored original. |
| Download PPTX | The original bytes are embedded in the .pptx. "Fill frame" is a PowerPoint crop of the full-size picture, so you can still re-crop it in PowerPoint. |
| Download PDF | A real vector PDF (selectable text). The original JPEG bytes are embedded as-is; PNGs are stored losslessly. |

Only two cases change pixels, because PowerPoint and PDF ignore the camera's rotation flag or can't read the format:

* a JPEG with an EXIF rotation (most portrait phone photos) is rotated upright at full size, JPEG quality 97;
* WebP/HEIC/AVIF/GIF/BMP files are converted to JPEG at full size, quality 95.

Each photo slot shows its pixel size and whether it is the untouched original.

## Data

* Everything lives in this browser's IndexedDB (`hik-field-reports`). The app asks the browser for persistent storage.
* **Back up data** downloads one JSON file containing the records **and** the original photos. **Restore** loads it on any browser/device.
* Backups made by the old single-file HTML app can be restored here too (their embedded photos are moved into the photo store).
* Deleting a record deletes its photos. Photos picked in a form you leave without saving are removed.

## Notes

* PDF text uses the built-in Helvetica (Arial-compatible). Characters outside Latin-1/WinAnsi are mapped to their base letter or `?`.
* The first launch adds one sample support case (same as the original app); delete it whenever you like.

## Layout

```
src/
  lib/db.js          IndexedDB (cases, trainings, photos, meta)
  lib/photos.js      ingest originals, EXIF check, thumbnails, export loading
  lib/geometry.js    report layout (shared by preview, PPTX and PDF)
  lib/exportPptx.js  pptxgenjs export
  lib/exportPdf.js   jsPDF vector export
  lib/backup.js      backup / restore (incl. old HTML-app backups)
  components/        form, list, photo slot, preview, slide renderer
```
