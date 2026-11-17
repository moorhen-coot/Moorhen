import { setRequestDrawScene } from "@/store/glRefSlice";
import { setMoleculesVisible } from "@/store/moleculesSlice";
import type { MoorhenMolecule } from "./MoorhenMolecule";

/**
 * Show or hide a whole molecule, as the eye button of its card does: its representations (those
 * shown in the interface), its environment and NEF restraints if they are on, and its entry in
 * `molecules.visibleMolecules`.
 */
export const setMoleculeVisible = (molecule: MoorhenMolecule, visible: boolean, requestDraw: boolean = true): void =>
    setMoleculeListVisible([molecule], visible, requestDraw);

/**
 * Show or hide many molecules, as setMoleculeVisible does each, in a fixed number of store dispatches:
 * one for visibleMolecules and one redraw request, whatever the number of molecules. Showing or
 * hiding a thousand ligands one dispatch at a time (each running every selector and, in development,
 * walking the whole store) took seconds.
 * @param requestDraw - Ask for the redraw (default). Pass false to ask for it once yourself after
 * several calls in the same tick: setRequestDrawScene flips a switch, so two requests before React
 * renders cancel out and nothing is redrawn.
 */
export const setMoleculeListVisible = (molecules: MoorhenMolecule[], visible: boolean, requestDraw: boolean = true): void => {
    if (molecules.length === 0) return;
    const store = molecules[0].store;
    // Which molecules have their environment / NEF restraints on: looked up once, not per molecule
    const generalStyles = new Map<number, string[]>();
    if (visible) {
        for (const representation of store.getState().molecules.generalRepresentations) {
            const molNo = representation.parentMolecule?.molNo;
            if (molNo === undefined) continue;
            generalStyles.set(molNo, [...(generalStyles.get(molNo) ?? []), representation.style]);
        }
    }

    for (const molecule of molecules) {
        // The representations ask for no redraw each: one is asked for below
        molecule.representations.forEach(rep => (visible ? (rep.interfaceOption.visible ? rep.show(false) : null) : rep.hide(false)));
        if (!visible) {
            molecule.environmentRepresentation?.hide(false);
            molecule.NEFRestraintRepresentation?.hide(false);
            continue;
        }
        const styles = generalStyles.get(molecule.molNo) ?? [];
        if (styles.includes("environment")) {
            molecule.environmentRepresentation?.show(false);
            molecule.environmentRepresentation?.redraw();
        }
        if (styles.includes("NEFRestraints")) {
            molecule.NEFRestraintRepresentation?.show(false);
            molecule.NEFRestraintRepresentation?.redraw();
        }
    }
    store.dispatch(setMoleculesVisible({ molNos: molecules.map(molecule => molecule.molNo), visible }));
    if (requestDraw) store.dispatch(setRequestDrawScene(true));
};
