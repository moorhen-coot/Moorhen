* User interface changes:
    - Many floating widgets changed to side panels.
    - Searchable menus.
    - Multi-model selector in molecule card.
    - Atom picking functionality in atom selection input form.
    - Add .ccp4 to list of files supported by File->Open Files.
    - New clip, fog and blur widget.
    - Conkit interface.
    - User interface to display lists of outliers identified by MolProbity (or
      other software).
    - XPID/XH-Pi interactions.
    - Picture Wizards and atom neighbourhood selections.
    - AlphaFold PAE plot viewer.
    - Improved map display controls.
    - NEF file loading and restraints visualisation.
    - Sequence Viewer Validation, including Gemmi-based Rotamer and Ramachandran calculation.
* Interoperability:
    - Major change of styling/theming/general code design to allow Moorhen
      to be used as a generic web component. Projects using Moorhen
      are no longer required to be written in React.
    - Changes to the way preferences are stored to avoid issues
      including browser local storage overfill, etc.
* Lhasa improvements:
    - Lhasa now built into Moorhen the same way as other dependencies.
    - Better communication with 'main Moorhen program'.
    - IO extensions and button rearrangements.
    - Dynamic resizing
* Performance improvements:
    - Split program into separare executable code and data blobs. The loading of
      data files is deferred from start time to when they are actually required.
    - Drastically Reduce size of executable code in main user interface thread.
    - Defer loading of some JS dependencies.
    - Metaballs surface calculation now much faster.
* Gemmi used for all PDB/mmCIF file reading/writing.
* Improved map drawing, better header info handling.
* Improved rendering:
    - Modernise SSAO, fix shadow maps, and improve lighting.
    - Improve edge detection shader and scale G-buffer to display.
* Various bug fixes, including:
    - Drag atoms, rotate/translate zone bug fixes.
    - Remove restriction for 64bit in chrome under linux.
    - Fix for null.cif in ligand name.
    - Fix custom representation creation state reuse in model card.
    - Fix sequence viewer tick mark alignment.
    - Fix representation opacity lost on redraw.
    - Fix selection and colour rules problems with some representations.
    - Vectors state and atom name fixes.
    - Fix the atom pick event so that the label is actually passed.
    - MrParse interface fixes.
* Dependencies updated:
    - Rdkit 2025.09.6
    - CoordGen 3.0.2
    - LibEigen 5.0.1
    - MaeParser 1.3.3
    - Boost 1.91.0-1
    - Gemmi 0.7.0
    - GSL 2.8
    - FFTW 3.3.10
    - LibSigCpp 3.8.0
    - ZLib 1.3.2
    - LibPNG 1.6.55
    - FreeType 2.14.3
    - JsonCpp 1.9.6
    - Coot 1.3.2 (6d06347f504c1097033135e1ac0689f6ba776e6a)
    - Lhasa ??
    - Emscripten 6.0.0
