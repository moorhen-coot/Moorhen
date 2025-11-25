import { enqueueSnackbar } from "notistack";
import { Button, Card, Col, Row } from "react-bootstrap";
import { useDispatch, useSelector, useStore } from "react-redux";
import { useCallback, useMemo } from "react";
import { useCommandCentre, usePaths } from "../../InstanceManager";
import { addMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { ColourRule } from "../../utils/MoorhenColourRule";
import { MoorhenMolecule } from "../../utils/MoorhenMolecule";
import { GetPolimerInfoQuery } from "../../utils/__graphql__/graphql";
import { getMultiColourRuleArgs } from "../../utils/utils";
import { MoorhenButton } from "../inputs";

export const MoorhenQueryHitCard = (props: { data: GetPolimerInfoQuery; idx: number; selectedMolNo: number; selectedChain: string }) => {
    const { selectedMolNo, data, idx, selectedChain } = props;

    const defaultBondSmoothness = useSelector((state: moorhen.State) => state.sceneSettings.defaultBondSmoothness);
    const backgroundColor = useSelector((state: moorhen.State) => state.sceneSettings.backgroundColor);
    const store = useStore();
    const commandCentre = useCommandCentre();
    const monomerLibraryPath = usePaths().monomerLibraryPath;

    const dispatch = useDispatch();

    const { entryInfo, entityInfo, label } = useMemo(() => {
        const entryInfo = data.entryInfo[idx];
        const entityInfo = data.entityInfo[idx];
        const depositionDate = new Date(entryInfo.accessionInfo.date);
        const depositionYear = depositionDate.getFullYear();

        let label: string;
        if (entryInfo.compModelInfo) {
            label = `${entryInfo.entryId} - ${entryInfo.compModelInfo.db} - (${depositionYear})`;
        } else {
            const chain = entityInfo.entityIds.authId[0];
            const resolution = entryInfo.info.resolution[0].toFixed(1);
            label = `${entryInfo.entryId}:${chain} - ${resolution}Å - (${depositionYear})`;
        }

        return {
            entryInfo,
            entityInfo,
            label,
        };
    }, [data, idx]);

    const fetchMoleculeFromURL = useCallback(
        async (url: RequestInfo | URL, molName: string): Promise<moorhen.Molecule> => {
            const newMolecule = new MoorhenMolecule(commandCentre, store, monomerLibraryPath);
            newMolecule.setBackgroundColour(backgroundColor);
            newMolecule.defaultBondOptions.smoothness = defaultBondSmoothness;
            try {
                await newMolecule.loadToCootFromURL(url, molName);
                if (newMolecule.molNo === -1) throw new Error("Cannot read the fetched molecule...");
                return newMolecule;
            } catch (err) {
                enqueueSnackbar("Failed to read molecule", { variant: "error" });
                console.warn(`Cannot fetch molecule from ${url}`);
            }
        },
        [backgroundColor, defaultBondSmoothness]
    );

    const fetchAndSuperpose = useCallback(async () => {
        const coordUrl = entryInfo.compModelInfo?.url ?? `https://files.rcsb.org/download/${entryInfo.entryId}.pdb`;
        const chainId = entityInfo.entityIds.authId[0];
        const newMolecule = await fetchMoleculeFromURL(coordUrl, entityInfo.entityId);
        if (!newMolecule) {
            return;
        }
        if (entryInfo.compModelInfo?.url) {
            const colourRule = new ColourRule("af2-plddt", "//*", "#ffffff", commandCentre, true);
            colourRule.setLabel("PLDDT");
            const ruleArgs = await getMultiColourRuleArgs(newMolecule, "af2-plddt");
            colourRule.setArgs([ruleArgs]);
            colourRule.setParentMolecule(newMolecule);
            newMolecule.defaultColourRules = [colourRule];
        }
        await commandCentre.current.cootCommand(
            {
                message: "coot_command",
                command: "SSM_superpose",
                returnType: "superpose_results",
                commandArgs: [selectedMolNo, selectedChain, newMolecule.molNo, chainId],
                changesMolecules: [newMolecule.molNo],
            },
            true
        );
        newMolecule.setAtomsDirty(true);
        await newMolecule.fetchIfDirtyAndDraw(newMolecule.atomCount >= 50000 ? "CRs" : "CBs");
        await newMolecule.centreOn("/*/*/*/*", true);
        dispatch(addMolecule(newMolecule));
    }, [entryInfo, entityInfo, fetchMoleculeFromURL, selectedChain, selectedMolNo]);

    return (
        <Card style={{ marginTop: "0.5rem" }}>
            <Card.Body style={{ padding: "0.5rem" }}>
                <Row style={{ display: "flex", justifyContent: "between" }}>
                    <Col style={{ alignItems: "center", justifyContent: "left", display: "flex" }}>
                        <span>{label}</span>
                    </Col>
                    <Col className="col-3" style={{ margin: "0", padding: "0", justifyContent: "right", display: "flex" }}>
                        <MoorhenButton style={{ marginRight: "0.5rem" }} onClick={fetchAndSuperpose}>
                            Fetch
                        </MoorhenButton>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};
