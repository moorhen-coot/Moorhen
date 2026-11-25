import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "@/store";

/*
 * Selectors shared by every molecule card. Each card used to scan the whole representation lists
 * (and one returned a new array every time, re-rendering every card on every store update), so
 * a store update cost (cards x representations). These index the lists once per change, for all
 * cards together; a card then looks up its own molecule.
 */

const EMPTY: never[] = [];

const groupByMolNo = <T extends { parentMolecule?: { molNo: number } }>(items: T[]): Map<number, T[]> => {
    const byMolNo = new Map<number, T[]>();
    for (const item of items) {
        const molNo = item.parentMolecule?.molNo;
        if (molNo === undefined) continue;
        const list = byMolNo.get(molNo);
        if (list) list.push(item);
        else byMolNo.set(molNo, [item]);
    }
    return byMolNo;
};

const selectVisibleMolNoSet = createSelector([(state: RootState) => state.molecules.visibleMolecules], molNos => new Set(molNos));
const selectCustomRepresentationsByMolNo = createSelector([(state: RootState) => state.molecules.customRepresentations], groupByMolNo);
const selectGeneralRepresentationsByMolNo = createSelector([(state: RootState) => state.molecules.generalRepresentations], groupByMolNo);

export const selectIsMoleculeVisible = (state: RootState, molNo: number): boolean => selectVisibleMolNoSet(state).has(molNo);

/** The molecule's custom representations. Use with shallowEqual, so the card only re-renders when they change. */
export const selectCustomRepresentations = (state: RootState, molNo: number) => selectCustomRepresentationsByMolNo(state).get(molNo) ?? EMPTY;

/** The molecule's general representations. Use with shallowEqual, so the card only re-renders when they change. */
export const selectGeneralRepresentations = (state: RootState, molNo: number) => selectGeneralRepresentationsByMolNo(state).get(molNo) ?? EMPTY;
