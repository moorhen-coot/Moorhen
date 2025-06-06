# Moorhen
A JavaScript molecular graphics program

### For 0.23.0
- [ ] Fix SSAO.
- [ ] Fix multiview with depth blur.
- [ ] Fix multiview with SSAO.
- [ ] Fix multiview with edge detect.
- [ ] Ability to set origin/zoom/individual rotation in "Multiple views for different molecules".
- [ ] Remove glRef from all component props and class constructor args.

### For 0.22.0
- [x] Fix multiview origins only sometimes correct.
- [x] Fix multiview screenshots scaling.
- [ ] Fix axes scaling with multiview screenshots.
- [ ] Fix multiview with transparency.
  - [x] Get multiview and transparent basic rendering correct.
  - [x] Fix transparency messing up one-view-per-molecule.
  - [x] Fix screenshots with transparent multiviews.
  - [x] Fix cross-hairs with transparent multiviews.
  - [ ] Consider origin shift when doing transparent multiviews.
  - [ ] Fix axes with transparent multiviews.
- [x] Get scale bar useful with multiviews.
- [x] Fix atom info toast gets rid of clipper points widget.
- [x] Fix MrParse sequences not redrawing if component closed and re-opened.
- [x] Deprecate glRef method usage.
   - [x] Eliminate glRef usage outside of MoorhenWebMG.
   - [x] Fix custom object opacity not working.
   - [x] Fix env. labels flickering.
   - [x] Fix orientation not being correct if doing fast repeat of "space" next residue.
   - [x] Fix no text on WebGL1.
   - [x] Fix lines (maps) drawing broken on WebGL1.
   - [x] Fix maps surface drawing broken on WebGL1 and WebGL2.
   - [x] Fix completely broken rendering on WebGL1.
   - [x] Add a getPixels method to gl widget and use this in screenshot.
   - [x] Restore animated zooming.
   - [x] Fix map recontouring when alt-click centering.
   - [x] Fix atom dragging not being animated.
   - [x] Fix wrong size spheres when atom hovering.
   - [x] Fix env. labels not being drawn.
   - [x] Fix completely broken atom hovering.
   - [x] Fix spheres being flat and not facing camera properly.
   - [x] Fix distance lines not being drawn.

### For 0.21.0
- [x] Fix 64-bit test in CootWorker, it looks a bit dodgy.
- [x] User choice on multiview layout.
- [x] Fix MrParse UI in dark mode.
- [x] Speed up one-view-per molecule.
- [x] Drag and drop file load.
  - [x] PDB/MMCIF
  - [x] Put loading from async [File] into utility function
  - [x] Only accept supported types
  - [x] Auto Mtz
  - [x] Session data
  - [x] Work out why enqueueSnackbar does not work inside useDropzone
  - [x] Drag and drop JSON validation
  - [x] Drag and drop MrParse results

### Todo
- [ ] Do not pull whole monomer library - we never use it.
- [ ] Fitting 5-letter ligand truncates name, e.g. A1LU6
- [ ] Get Structure factors if no map download available.
- [ ] Undo button on a molecule loaded from SMILES/PubChem with name > 3 letters breaks the structure.
- [ ] "Somehow" determine PLDDT vs B-factor in SliceNDice
- [ ] Add Zoom to "Show controls"
- [ ] Prosmart (this is complicated because of the subprocess model).
  - [ ] Results parsing for starters.
- [ ] CCP4MG/MrBump. As above results parsing would be good start.
- [ ] Coloured sequences: https://ebi-webcomponents.github.io/nightingale/#/coloured-sequence
- [ ] Sequence alignments: https://ebi-webcomponents.github.io/nightingale/#/msa
- [ ] Secondary structure annotation and other kinds of annotation: https://ebi-webcomponents.github.io/nightingale/#/track
- [ ] Highlight things other than balls.
- [ ] Auto scaled shadow box
- [ ] Lipid cartoons
- [ ] Images/Legends
- [ ] Generate Helices
- [ ] Normal modes
    - [ ] Experimental vs. Theoretical B-values
    - [ ] Cross correlation plot
    - [ ] List normal modes
    - [ ] Animate normal modes
