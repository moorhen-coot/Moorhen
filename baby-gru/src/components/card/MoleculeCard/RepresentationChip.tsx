import { useDispatch, useSelector } from "react-redux";
import { useCallback, useState, useEffect } from "react";
import { MoorhenButton, MoorhenNumberInput, MoorhenPopoverButton } from "@/components/inputs";
import { MoorhenStack, MoorhenTooltip } from "@/components/interface-base";
import { usePaths } from "../../../InstanceManager";
import { RootState } from "../../../store/MoorhenReduxStore";
import { removeCustomRepresentation } from "../../../store/moleculesSlice";
import { ColourRule } from "../../../utils/MoorhenColourRule";
import type { MoorhenMolecule } from "../../../utils/MoorhenMolecule";
import type { MoleculeRepresentation } from "../../../utils/Representation/MoorhenMoleculeRepresentation";
import { representationLabelMapping } from "../../../utils/enums";
import { AddCustomRepresentationCard } from "./addRepresentation/AddRepresentationCard";
import "./representation.css";
import { parseCid } from "@/utils/utils";
import { useCommandCentre } from "../../../InstanceManager";
import { useMoleculeChanged } from "@/hooks/usMolleculeChange";

export const CustomRepresentationChip = (props: {
    addColourRulesAnchorDivRef: React.RefObject<HTMLDivElement>;
    molecule: MoorhenMolecule;
    representation: MoleculeRepresentation;
}) => {
    const { representation, molecule } = props;
    const urlPrefix = usePaths().urlPrefix;
    if (representation.interfaceOption.visible === undefined) {
        representation.interfaceOption.visible = representation.visible;
    }
    const commandCentre = useCommandCentre()
    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(representation.interfaceOption.visible);
    const [reload, setReload] = useState<boolean>(false);
    const [monomersWarning, setMonomersWarning] = useState<string>("");
    const modelSelector = representation.cid.split("/")[1] !== "*" ? parseInt(representation.cid.split("/")[1]) : 0;

    const models = molecule.numberOfModels;

    const dispatch = useDispatch();
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const isMoleculeVisible = useSelector((state: RootState) => state.molecules.visibleMolecules.some(molNo => molNo === molecule.molNo));
    const chipStyle = getChipStyle(representation.colourRules, representationIsVisible && isMoleculeVisible, isDark);
    if (!isMoleculeVisible) chipStyle["opacity"] = "0.3";

    const moleculeChange = useMoleculeChanged();

    const handleVisibility = useCallback(() => {
        if (isMoleculeVisible) {
            !representationIsVisible ? representation.show() : representation.hide();
            representation.interfaceOption.visible = !representationIsVisible;
            setRepresentationIsVisible(!representationIsVisible);
        }
    }, [isMoleculeVisible, representationIsVisible]);

    useEffect(() => {
        const checkMonomerStatus = async() => {
            const unknownMonomersStatus = await commandCentre.current.cootCommand(
                {
                    returnType: "string_array",
                    command: "get_residue_names_with_no_dictionary",
                    commandArgs: [molecule.molNo ],
                },
                false
            );
            const unknownMonomers = unknownMonomersStatus.data.result.result
            if(unknownMonomers.length>0){
                setMonomersWarning(" (missing dictionary)")
            } else {
                setMonomersWarning("")
            }
        }
        checkMonomerStatus()
    }, [molecule.ligandDicts,moleculeChange]);

    const handleDelete = useCallback(() => {
        if (representation.style === "adaptativeBonds") {
            props.molecule.setDrawAdaptativeBonds(false);
        } else {
            molecule.removeRepresentation(representation.uniqueId);
        }
        dispatch(removeCustomRepresentation(representation));
        props.molecule.clearBuffersOfStyle("environment");
    }, [molecule, representation]);

    let selectionName: React.ReactNode = representation.cid;
    if (representation.style === "adaptativeBonds") {
        selectionName = "Adaptative Bonds";
    } else {
        const nameParts: React.ReactNode[] = [representation.cid];
        const allLigCID = props.molecule.ligands?.map(ligand => ligand.cid).join("||");

        if (
            representation.cid === "//*//:*" ||
            representation.cid === "/*/*/*/*:*" ||
            representation.interfaceOption.selectionType === "molecule"
        ) {
            nameParts[0] = "All Chains";
        }

        if (representation.interfaceOption.selectionType === "ligands") {
            nameParts[0] = representation.cid === allLigCID ? "All Ligands" : `Ligand ${representation.cid}`;
        }

        if (representation.interfaceOption.selectionType === "chain") {
            nameParts[0] = `Chain: ${parseCid(representation.cid).chain}`;
        }

        if (representation.restrictToNeighbours) {

            if (representation.neighboursCid === allLigCID) {
                nameParts[0] = "Neighb. of Ligands";
            } else {
            nameParts[0] = (<>Neighb. of {representation.neighboursCid}</>);}
        }

        if (representation.cid.includes("!O,C,N")) {
            nameParts.push(<div className="moorhen__representation-chip-box">SC</div>);
        }

        if (representation.hbondedTo) {
            nameParts.push(<>H-Bonded to {representation.hbondedToCid === allLigCID ? "Ligands" : representation.hbondedToCid}</>);
        }

        if (representation.cid.includes("[!H]")) {
            nameParts.push(<div className="moorhen__representation-chip-strike-box">H</div>);
        }

        if (representation.cid.includes("(!HOH)")) {
            nameParts.push(<div className="moorhen__representation-chip-strike-box">HOH</div>);
        }

        selectionName = (
            <>
                {nameParts.map((part, i) => (
                    <span key={i}>{i > 0 && " "}{part}</span>
                ))}
            </>
        );
    }

    const onChangeModelSelector = modelIndex => {
        representation.setShownMultimodel(modelIndex);
        setReload(!reload);
    };

    return (
        <div className="moorhen__representation-chip" style={chipStyle}>
            <MoorhenStack align="center" direction="row" justify="center" gap="0.2rem">
                <div style={{ flexGrow: 1, textAlign: "left", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    <b>{`${representationLabelMapping[representation.style]}${monomersWarning}`}</b>
                    <br />
                    <MoorhenTooltip tooltip={<>{selectionName}</>}>
                        <div style={{ flexGrow: 1, textAlign: "left", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                            {selectionName}
                        </div>
                    </MoorhenTooltip>
                </div>
                <MoorhenStack direction="row" align="center" gap="0.1rem" flex={0}>
                    {models > 1 && (
                        <MoorhenNumberInput
                            value={modelSelector}
                            setValue={onChangeModelSelector}
                            integer
                            type="number"
                            allowNegativeValues={false}
                            style={{ backgroundColor: "transparent" }}
                            width={"6ch"}
                            tooltip={"Model Selector"}
                            minMax={[0, models]}
                            className="moorhen__model-selector-input"
                        />
                    )}
                    <MoorhenButton
                        onClick={handleVisibility}
                        type="icon-only"
                        icon={representationIsVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}
                        size="accordion"
                        tooltip={representationIsVisible ? "Hide Representation" : "Show Representation"}
                    ></MoorhenButton>
                    <MoorhenPopoverButton icon="MatSymEdit" size="accordion" tooltip="Edit Representation">
                        <AddCustomRepresentationCard
                            mode="edit"
                            urlPrefix={urlPrefix}
                            molecule={props.molecule}
                            representation={props.representation}
                            onApply={() => setReload(!reload)}
                        />
                    </MoorhenPopoverButton>
                    <MoorhenPopoverButton type="icon-only" icon="MatSymDelete" size="accordion" tooltip="delete Representation">
                        <MoorhenButton variant="danger" onClick={handleDelete}>
                            Delete Representation
                        </MoorhenButton>
                    </MoorhenPopoverButton>
                </MoorhenStack>
            </MoorhenStack>
        </div>
    );
};

export const getChipStyle = (colourRules: ColourRule[], repIsVisible: boolean, isDark: boolean, width?: string) => {
    const chipStyle = {};

    if (width) {
        chipStyle["width"] = width;
    }

    if (isDark) {
        chipStyle["color"] = "white";
    }

    let [r, g, b, _a]: number[] = [214, 214, 214, 1];
    if (colourRules?.length > 0) {
        if (colourRules[0].isMultiColourRule) {
            const alphaHex = repIsVisible ? "99" : "33";
            chipStyle["background"] =
                `linear-gradient( to right, #264CFF${alphaHex}, #3FA0FF${alphaHex}, #72D8FF${alphaHex}, #AAF7FF${alphaHex}, #E0FFFF${alphaHex}, #FFFFBF${alphaHex}, #FFE099${alphaHex}, #FFAD72${alphaHex}, #F76D5E${alphaHex}, #D82632${alphaHex}, #A50021${alphaHex} )`;
        } else {
            [r, g, b, _a] = ColourRule.parseHexToRgba(colourRules[0].color);
            chipStyle["backgroundColor"] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`;
        }
    } else {
        chipStyle["backgroundColor"] = `rgba(${r}, ${g}, ${b}, ${repIsVisible ? 0.5 : 0.1})`;
    }

    chipStyle["borderColor"] = `rgb(${r}, ${g}, ${b})`;

    return chipStyle;
};
