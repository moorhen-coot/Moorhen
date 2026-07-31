import { MoorhenSelect } from "../../../../inputs";
import { representationLabelMapping } from "../../../../../utils/enums";
import { moorhen } from "../../../../../types/moorhen";
import { RepresentationStyles } from "../../../../../utils/MoorhenMoleculeRepresentation";

interface StyleSelectorProps {
    value: moorhen.RepresentationStyles;
    onChange: (style: moorhen.RepresentationStyles) => void;
    mode: "add" | "edit";
    adaptBondOOF: RepresentationStyles;
    setAdaptBondOOF: React.Dispatch<React.SetStateAction<RepresentationStyles>>;
}

export const StyleSelector = (props: StyleSelectorProps) => {
    const { value, onChange, mode, adaptBondOOF, setAdaptBondOOF } = props;

    return (
        <>
            <MoorhenSelect
                value={value}
                label={"Style"}
                onChange={evt => {
                    onChange(evt.target.value as moorhen.RepresentationStyles);
                }}
            >
                {[
                    "CBs",
                    "CAs",
                    "CRs",
                    "gaussian",
                    "MolecularSurface",
                    "VdwSpheres",
                    "MetaBalls",
                    "residue_environment",
                    "allHBonds",
                    "adaptativeBonds",
                ]
                    .filter(key => (mode === "edit" ? !["residue_environment", "adaptativeBonds"].includes(key) : true))
                    .map(key => (
                        <option value={key} key={key}>
                            {representationLabelMapping[key]}
                        </option>
                    ))}
            </MoorhenSelect>
            {value === "adaptativeBonds" && (
                <MoorhenSelect label="Out of Focus Style" setValue={setAdaptBondOOF}>
                    <option value="CRs" key="CRs">
                        Ribbons
                    </option>
                    <option value="CAs" key="CAs">
                        C-alpha
                    </option>
                </MoorhenSelect>
            )}
        </>
    );
};
