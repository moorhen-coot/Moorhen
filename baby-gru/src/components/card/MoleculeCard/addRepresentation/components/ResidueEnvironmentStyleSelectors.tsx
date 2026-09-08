import { MoorhenSelect } from "../../../../inputs";
import { MoorhenStack } from "../../../../interface-base";
import { representationLabelMapping } from "../../../../../utils/enums";
import { MoleculeRepresentation } from "../../../../../utils/Representation/MoorhenMoleculeRepresentation";

interface ResidueEnvironmentStyleSelectorsProps {
    representation: MoleculeRepresentation;
}

/**
 * Focus and background style selectors for residue_environment representations.
 */
export const ResidueEnvironmentStyleSelectors = (props: ResidueEnvironmentStyleSelectorsProps) => {
    const { representation } = props;

    return (
        <MoorhenStack direction="horizontal">
            <MoorhenSelect
                defaultValue={representation?.residueEnvironmentOptions.focusRepresentation ?? "CBs"}
                label={"Focus Style"}
            >
                {["CBs", "CAs", "CRs", "MolecularSurface", "VdwSpheres"].map(key => (
                    <option value={key} key={key}>
                        {representationLabelMapping[key]}
                    </option>
                ))}
            </MoorhenSelect>
            <MoorhenSelect
                defaultValue={representation?.residueEnvironmentOptions.backgroundRepresentation ?? "CRs"}
                label={"Background Style"}
            >
                {["CBs", "CAs", "CRs", "MolecularSurface", "VdwSpheres"].map(key => (
                    <option value={key} key={key}>
                        {representationLabelMapping[key]}
                    </option>
                ))}
            </MoorhenSelect>
        </MoorhenStack>
    );
};
