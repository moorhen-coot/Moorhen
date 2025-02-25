# Moorhen
A JavaScript molecular graphics program

### For 0.17.1
- [ ] 4oo8 symmetry is wrong.

### For 0.17.0
- [x] SMILES string is white on dark background.
- [x] Print out molecule info - B-factors, etc. This could be hover info, atom label, full print
      of ATOM cards, context menu option. Environment of temp factors.
- [x] Edit occupancy should be reflected in atom info card above. It only seems to work after some other edit.
- [x] Fix that updateLabels increases number of buffers.
- [x] Fix that turning on additional representations slows down panning, even if they are subsequently turned off.
- [x] Change ligand SVG to RDKit (for now).
- [x] Download SVG from ligand card.
- [x] Download SVG from carbohydrate card.
- [x] Copy SMILES button.
- [x] Dishy bases/sticks with selections.

### Todo
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
