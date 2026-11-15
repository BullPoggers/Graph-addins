# Equation Grapher: OneNote add-in

Type equations such as `y = x^2 - 2` and `y = sin(x)*3`, see an interactive graph
(drag to move, scroll to zoom), then insert it into the current OneNote page as a picture.

## Files
- `taskpane.html`, `grapher.js`, `parser.js`: the add-in itself (no dependencies except Office.js, loaded from Microsoft)
- `assets/`: icons
- `manifest.xml`: tells OneNote where the add-in lives

## Install (OneNote for the web, personal account)
1. Put this whole folder online over HTTPS. The easiest free way:
   - Create a GitHub repository, upload the files, then Settings > Pages > deploy from the main branch.
   - Your address will look like `https://YOURNAME.github.io/REPO`.
   - (Netlify Drop at app.netlify.com/drop also works: drag the folder in.)
2. Open `manifest.xml` and replace every `https://YOUR-HOST` with that address, with no trailing slash
   (for example `https://yourname.github.io/onenote-grapher`).
3. Open OneNote in the browser (onenote.com) and open a notebook.
4. Insert > Add-ins > More Add-ins > My Add-ins > Upload My Add-in, and choose `manifest.xml`.
   (If "Upload My Add-in" is missing, your account or organisation may block custom add-ins.)
5. A "Graph equation" button appears on the Home tab.

## Use
Write equations one per line as `y = ...`. Supported: + - * / ^, implicit multiplication (`2x`, `2(x+1)`),
sin cos tan asin acos atan sinh cosh tanh sqrt cbrt abs ln log exp floor ceil round sign, `pi`, `e`, `|x|`.
Equations in the form `x^2 + y^2 = 4` (circles etc.) are not supported.

If Insert in page fails, use Copy image or Download PNG and paste it in manually.
