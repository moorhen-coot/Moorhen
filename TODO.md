# Moorhen
A JavaScript molecular graphics program

### For 0.20.0
- [ ] Side-by-side, cross-eyed, anaglyph stereo.
  - [x] Basic 3-way view
  - [x] Basic Side-by-side/cross-eyed stereo
  - [x] Atom hovering, etc. working in 3-way view
  - [x] Atom hovering, etc. working in side-by-side, cross-eyed stereo
  - [x] Rotate working in 3-way view
  - [x] Basic Anaglyph stereo
  - [x] Disable 'a'-clicking in 3-way view and stereo.
  - [x] Have screenshot work with multiviews.
  - [ ] Fix axes in screenshot with multiviews.
  - [ ] Multiple views for different molecules.
  - [ ] User choice on multiview layout.

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
