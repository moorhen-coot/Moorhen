import { MoorhenCidInputForm } from "../../../../inputs/Cid/MoorhenCidInputForm";
import { MoorhenToggle } from "../../../../inputs";
import { MoorhenNumberInput } from "../../../../inputs";

interface NeighbourhoodSettingsProps {
    restrictToNeighbours: boolean;
    neighboursCid: string;
    setNeighboursCid: (val: string) => void;
    excludeNeighbours: boolean;
    setExcludeNeighbours: (val: boolean) => void;
    neighboursDistance: number;
    setNeighboursDistance: (val: number) => void;
    hbondedTo: boolean;
    setHbondedTo: (val: boolean) => void;
    representationStyle: string;
    ruleType: string;
}

export const NeighbourhoodSettings = (props: NeighbourhoodSettingsProps) => {
    const {
        restrictToNeighbours,
        neighboursCid,
        setNeighboursCid,
        excludeNeighbours,
        setExcludeNeighbours,
        neighboursDistance,
        setNeighboursDistance,
        hbondedTo,
        setHbondedTo,
        representationStyle,
        ruleType,
    } = props;

    return (
        <>
            {restrictToNeighbours && (
                <>
                    <MoorhenCidInputForm
                        setValue={setNeighboursCid}
                        label="Atom selection"
                        defaultValue={neighboursCid}
                        allowUseCurrentSelection={true}
                        height="3rem"
                    />
                    <MoorhenToggle
                        type="switch"
                        label="invert selection"
                        checked={excludeNeighbours}
                        style={{ height: "2rem", margin: "0.1rem" }}
                        onChange={() => setExcludeNeighbours(!excludeNeighbours)}
                    />
                    <div></div>
                    <MoorhenNumberInput
                        value={neighboursDistance}
                        type="number"
                        label="Neighbours distance:"
                        onChange={evt => {
                            try {
                                setNeighboursDistance(Number(evt.target.value));
                            } catch (e) {
                                console.log("Problem setting neighbours distance");
                            }
                        }}
                    />
                </>
            )}
            {["CBs"].includes(representationStyle) && ruleType === "neighbourhood" && (
                <MoorhenToggle
                    type="switch"
                    label="Also included H-Bonded to selection"
                    checked={hbondedTo}
                    onChange={() => setHbondedTo(!hbondedTo)}
                />
            )}
        </>
    );
};
