import { hideMolecule, showMolecule } from "@/store/moleculesSlice";
import type { MoorhenMolecule } from "./MoorhenMolecule";

/**
 * Show or hide a whole molecule, as the eye button of its card does: its representations (those
 * shown in the interface), its environment and NEF restraints if they are on, and its entry in
 * `molecules.visibleMolecules`.
 */
export const setMoleculeVisible = (molecule: MoorhenMolecule, visible: boolean): void => {
    molecule.representations.forEach(rep => (visible ? (rep.interfaceOption.visible ? rep.show() : null) : rep.hide()));
    molecule.store.dispatch(visible ? showMolecule(molecule) : hideMolecule(molecule));
    if (!visible) {
        molecule.environmentRepresentation?.hide();
        molecule.NEFRestraintRepresentation?.hide();
        return;
    }
    const generalStyles = molecule.store
        .getState()
        .molecules.generalRepresentations.filter(rep => rep.parentMolecule?.molNo === molecule.molNo)
        .map(rep => rep.style);
    if (generalStyles.includes("environment")) {
        molecule.environmentRepresentation?.show();
        molecule.environmentRepresentation?.redraw();
    }
    if (generalStyles.includes("NEFRestraints")) {
        molecule.NEFRestraintRepresentation?.show();
        molecule.NEFRestraintRepresentation?.redraw();
    }
};
