# Moorhen
A JavaScript molecular graphics program

### For 0.20.2
- [ ] Ability to set origin/zoom/individual rotation in "Multiple views for different molecules".

### For 0.20.1
- [x] Fix 64-bit test in CootWorker, it looks a bit dodgy.
- [x] User choice on multiview layout.
- [x] Fix MrParse UI in dark mode.
- [x] Speed up one-view-per molecule.
- [ ] Drag and drop file load.
  - [x] PDB/MMCIF
  - [x] Put loading from async [File] into utility function
  - [x] Only accept supported types
  - [x] Auto Mtz
  - [x] Session data
  - [ ] MrParse results
  - [ ] Json validation
  - [ ] Work out why enqueueSnackbar does not work inside useDropzone

### Todo
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
