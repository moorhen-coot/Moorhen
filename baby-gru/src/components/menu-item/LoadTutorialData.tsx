import { useDispatch, useSelector, useStore } from "react-redux";
import { useRef } from "react";
import { RootState } from "@/store";
import { useCommandCentre, useMoorhenInstance, usePaths } from "../../InstanceManager";
import { setActiveMap, setDefaultMoleculeRepresentation } from "../../store/generalStatesSlice";
import { addMapList } from "../../store/mapsSlice";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenMap } from "../../utils/MoorhenMap";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { MoorhenButton, MoorhenSelect } from "../inputs";

export const LoadTutorialData = () => {
    const dispatch = useDispatch();
    const store = useStore<RootState>();
    const commandCentre = useCommandCentre();
    const moorhenInstance = useMoorhenInstance()

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
        const oldRepresentation = store.getState().generalStates.defaultMoleculeRepresentation
        dispatch(setDefaultMoleculeRepresentation("CBs"));
        const tutorialNumber = tutorialNumberSelectorRef.current.value;
        const loadedFiles = await moorhenInstance.files.loadFiles([`${urlPrefix}/tutorials/moorhen-tutorial-structure-number-${tutorialNumber}.ent`,
             `${urlPrefix}/tutorials/moorhen-tutorial-map-number-${tutorialNumber}.mtz`])
        
        for (const file of loadedFiles) {
            console.log(file)
            if (file.type === "map"){
                const map = moorhenInstance.getMap(file.uniqueID) 
                map.name =`map-${tutorialNumber} ${map.isDifference ? "- diff" : ""}`}
            
            if (file.type === "molecule") {
                moorhenInstance.getMolecule(file.uniqueID).name = `mol-${tutorialNumber}`
            }
        }

        document.body.click();
        dispatch(setDefaultMoleculeRepresentation("CRs"));
    };

    return (
        <>
            <MoorhenSelect label="Select Tutorial Data" ref={tutorialNumberSelectorRef}>
                {allTutorialNumbers.map(tutorialNumber => {
                    return <option key={tutorialNumber} value={tutorialNumber}>{`Tutorial ${tutorialNumber}`}</option>;
                })}
            </MoorhenSelect>
            <MoorhenButton onClick={onCompleted}>Ok</MoorhenButton>
        </>
    );
};
