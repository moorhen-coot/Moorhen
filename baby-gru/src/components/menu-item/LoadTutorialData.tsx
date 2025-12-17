import { useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { setActiveMap } from "../../store/generalStatesSlice";
import { addMapList } from "../../store/mapsSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenButton, MoorhenSelect } from "../inputs";

export const LoadTutorialData = () => {
    const dispatch = useDispatch();
    const store = useStore();
    const commandCentre = useCommandCentre();

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const tutorialNumberSelectorRef = useRef<HTMLSelectElement | null>(null);
    const { urlPrefix, monomerLibraryPath } = usePaths();

    const allTutorialNumbers = ["1", "2", "3"];
    const tutorialMtzColumnNames = {
        1: { Fobs: "FP", SigFobs: "SIGFP", FreeR: "FREE" },
        2: { Fobs: "FP", SigFobs: "SIGFP", FreeR: "FREE" },
        3: { Fobs: "F", SigFobs: "SIGF", FreeR: "FREER" },
    };

    const menuItemText = "Load tutorial data...";

    const onCompleted = async () => {
        if (tutorialNumberSelectorRef.current === null) {
            return;
        }
        const tutorialNumber = tutorialNumberSelectorRef.current.value;
        const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
        newMolecule.setBackgroundColour(backgroundColor);
        newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
        const newMap = new MoorhenMap(commandCentre, store);
        const newDiffMap = new MoorhenMap(commandCentre, store);
        await newMolecule.loadToCootFromURL(
            `${urlPrefix}/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.pdb`,
            `mol-${tutorialNumber}`
        );
        await newMolecule.fetchIfDirtyAndDraw("CBs");
        await newMolecule.centreOn("/*/*/*/*", true);
        await newMap.loadToCootFromMtzURL(
            `${urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `map-${tutorialNumber}`,
            {
                F: "FWT",
                PHI: "PHWT",
                isDifference: false,
                useWeight: false,
                calcStructFact: true,
                ...tutorialMtzColumnNames[tutorialNumber],
            }
        );
        await newDiffMap.loadToCootFromMtzURL(
            `${urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`,
            `diff-map-${tutorialNumber}`,
            {
                F: "DELFWT",
                PHI: "PHDELWT",
                isDifference: true,
                useWeight: false,
                calcStructFact: true,
                ...tutorialMtzColumnNames[tutorialNumber],
            }
        );
        dispatch(addMolecule(newMolecule));
        dispatch(addMapList([newMap, newDiffMap]));
        dispatch(setActiveMap(newMap));
    };

    return (
        <>
            <MoorhenSelect label="Select Tutorial Data">
                {allTutorialNumbers.map(tutorialNumber => {
                    return <option key={tutorialNumber} value={tutorialNumber}>{`Tutorial ${tutorialNumber}`}</option>;
                })}
            </MoorhenSelect>
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};
