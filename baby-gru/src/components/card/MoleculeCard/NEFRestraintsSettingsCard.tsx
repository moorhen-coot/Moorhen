import { useEffect, useState } from "react";
import { MoleculeRepresentation, MoorhenMolecule } from "@/utils";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { MoorhenToggle } from "../../inputs";
import { MoorhenStack } from "../../interface-base";

type MoleculeSettingPanelProps =
    | { molecule: MoorhenMolecule; representation?: never }
    | { molecule?: never; representation: MoleculeRepresentation };

export const NEFRestraintsSettingsPanel = (props: MoleculeSettingPanelProps) => {
    const { molecule, representation } = props;

	    const [showNEF, setShowNEF] = useState<boolean>(
        molecule ? molecule.defaultResidueEnvironmentOptions.showNEF : representation.residueEnvironmentOptions.showNEF
    );

    useEffect(() => {
        const updateNEFEnvironment = async () => {
            if ([showNEF].some(item => item === null)) {
                return;
            }

            if (
                showNEF !==
                    (molecule
                        ? molecule.defaultResidueEnvironmentOptions.showNEF
                        : representation.residueEnvironmentOptions.showNEF)
            ) {
                let representations: MoleculeRepresentation[];
                const otherSettings = molecule
                    ? { ...molecule.defaultResidueEnvironmentOptions }
                    : { ...representation.residueEnvironmentOptions };
                const residueEnvironmentOptions = {
                    ...otherSettings,
                    showNEF: showNEF,
                };
                if (props.molecule) {
                    representations = props.molecule.representations.filter(
                        representation =>
                            representation.useDefaultResidueEnvironmentOptions &&
                            representation.visible &&
                            representation.style === "NEFRestraints"
                    );

                    props.molecule.defaultResidueEnvironmentOptions = residueEnvironmentOptions;
                    props.molecule.environmentRepresentation.residueEnvironmentOptions = residueEnvironmentOptions;
                } else {
                    representations = [representation];
                    representation.residueEnvironmentOptions = residueEnvironmentOptions;
                }

                await props.molecule.drawNEFRestraints();
            }
        };

        updateNEFEnvironment();
    }, [showNEF, molecule, representation]);

    return (
        <MoorhenStack>
            <MoorhenToggle type="switch" checked={showNEF} onChange={() => setShowNEF(prev => !prev)} label="Show NEF" />

        </MoorhenStack>
    );
};
