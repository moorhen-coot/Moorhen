# Moorhen
A JavaScript molecular graphics program

### For 0.19.2
- [ ] Side-by-side, cross-eyed, anaglyph stereo.
  - [x] Basic 3-way view
  - [x] Basic Side-by-side/cross-eyed stereo
  - [x] Atom hovering, etc. working in 3-way view
  - [ ] Atom hovering, etc. working in side-by-side, cross-eyed stereo
  - [ ] Rotate/centre/etc. working in 3-way view
  - [ ] Rotate/centre/etc. working in side-by-side, cross-eyed stereo
  - [ ] Basic Anaglyph stereo
  - [ ] 'a'-clicking working in 3-way view
  - [ ] 'a'-clicking working in side-by-side, cross-eyed stereo

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
