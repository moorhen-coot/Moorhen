import { usePaths } from "@/InstanceManager";
import { modalKeys } from "../../utils/enums";
import { MoorhenInfoCard, MoorhenStack } from "../interface-base";
import { MoorhenDraggableModalBase } from "../interface-base/ModalBase/DraggableModalBase";
import { MoorhenConKit } from "../validation-tools/MoorhenConKit";

export const MoorhenConKitModal = () => {
    const path = usePaths().urlPrefix;

    const infoText = (
        <>
            <h1>ConKit</h1>
            Conkit is a method to validate structures by comparing them to predicted models. This is particularly useful for identifying
            register errors.
            <h2>Parameters</h2>
            <ul>
                <li>Reference structure: The structure you wish to validate</li>
                <li>Chain: The chain in the reference structure that you wish to validate</li>
                <li>Predicted model: A predicted model (e.g. AlphaFold) corresponding to your reference structure.</li>
                <li>
                    Specify predicted model chain (optional): The chain of the predicted model corresponding to the reference chain. Conkit
                    will attempt to automatically detect this chain but can be manually overridden if another chain is preferred.
                </li>
                <li>
                    Renumber to assist matching (optional): It is important that the numbering in your reference structure matches the
                    numbering in your predicted model. Conkit can attempt to automatically renumber the structure internally if these
                    differ.
                </li>
                <li>
                    Specify sequence (fasta) (optional): Conkit will automatically take the sequence from the reference structure, but the
                    user can provide a reference sequence if the reference structure is incomplete.
                </li>
            </ul>
            <h2>Output</h2>
            Conkit will output a table showing:
            <img src={`${path}/pixmaps/docs/conkit.png`} alt="ConKit table" style={{maxWidth: "32rem"}} />
            <ul>
                <li> Query: The sequence of the reference structure</li>
                <li>
                    {" "}
                    Register: Green suggests the register is correct and red suggests there may be a register error. Hovering over the
                    residue with a predicted register error will provide a suggested register change.
                </li>
                <li>
                    {" "}
                    PLDDT: The pLDDT score of the predicted model coloured on an orange- yellow-blue-dark blue scale, where dark blue is
                    highly confident. The predicted register errors are more likely when the model had a confident pLDDT score.
                </li>
                <li>
                    {" "}
                    Matches: The number of contacts found for each residue. The scale is white = 0, black = 15+, more contacts increase the
                    likelihood that a register error has been correctly detected.
                </li>
            </ul>
            <h2>Citation: </h2>
            <ul>
                <li>
                    <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5870551/" target="_blank" rel="noreferrer">
                        ConKit: a python interface to contact predictions
                    </a>
                </li>
            </ul>
        </>
    );
    const titleBar = (
        <>
            ConKit &nbsp; <MoorhenInfoCard infoText={infoText} large />
        </>
    );

    return (
        <MoorhenDraggableModalBase modalId={modalKeys.CONKIT} lockAspectRatio={false} headerTitle={titleBar} body={<MoorhenConKit />} />
    );
};
