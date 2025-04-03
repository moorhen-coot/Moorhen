# Moorhen
A JavaScript molecular graphics program

### For 0.19.1
- [ ] MrParse results viewing.
- [ ] Side-by-side, cross-eyed, anaglyph stereo.

### For 0.19.0
- [x] Fix that info button on models shows nothing.
- [x] Add a maps info button.
- [x] Option to not embed data in session file - useful in CCPEM context.
- [x] Fix 4oo8 symmetry.

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
