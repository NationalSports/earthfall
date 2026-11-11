# HUD repair validation

The final HUD preserves the current Orders, timed troop movements, construction, city close-up and 4K terrain while integrating combat effects and the accepted infestation shader.

Repaired Issue #11 assets:

- `texture-enamel.png`: valid 512×512 PNG; opposite decoded pixel edges match exactly.
- `topbar.png`: valid 512×64 enamel strip with a gold lower edge and no vertical dividers. Horizontal pixel checks tolerate only one color level of browser gradient dithering.
- `card-frame.png`: valid 160×160 PNG; all pixels in the center 140×140 area are fully transparent. All decoration lies within the 10px slice. Rendered rim is 5px; existing card padding clears it.

The theme is restored to its accepted override-only version, with bitmap rules in `src/frames.css`. All 11 PNGs are embedded once by `build.js` and referenced by CSS variable. The corrupt duplicate inline image is removed. Button plates, dialog and panel frames retain their accepted slice settings. Coach, help and selection-close controls have minimum 40px targets and visible keyboard focus.

Checks completed:

- All 11 PNG signatures, dimensions, checksums and decompressed payloads; a deliberately damaged copy is rejected.
- Two builds produce identical `dist/index.html` hashes.
- Browser checks at 1280×800, 820×1180, 390×780 and 780×390: all panel tabs, city zoom, board/globe missile, EMP and nuclear effects, eight drawn resource icons, six starting Orders, correct Orders charging, construction and march timing. No page/console errors, horizontal overflow or visible buttons shorter than 40px.
- Phone portrait run forced to WebGL1. Rendering used desktop Chrome software graphics, not a physical phone.
- Actual troop arrival and construction completion checked against the new timing rules; campaign and battle simulations run without errors. Rules files are unchanged by the art integration.
- Existing UI sample checked with production CSS at 1280, 820 and 390 pixels; sample captures included.

Game screenshots: [desktop](1280.png), [tablet](820.png), [phone portrait](390.png), [phone landscape](780.png). Dialog captures: [desktop](dialog-1280.png), [phone](dialog-390.png). Sample captures: [1280](sample-1280.png), [820](sample-820.png), [390](sample-390.png).

The broader HUD redesign in Issue #29 is a separate request.
