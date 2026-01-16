import { Box, Chip, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import { MoorhenButton, MoorhenPopoverButton } from "@/components/inputs";
import { MoorhenStack } from "@/components/interface-base";
import { usePaths } from "../../../InstanceManager";
import { RootState } from "../../../store/MoorhenReduxStore";
import { addGeneralRepresentation, removeCustomRepresentation, removeGeneralRepresentation } from "../../../store/moleculesSlice";
import { ColourRule } from "../../../utils/MoorhenColourRule";
import type { MoorhenMolecule } from "../../../utils/MoorhenMolecule";
import type { MoleculeRepresentation, RepresentationStyles } from "../../../utils/MoorhenMoleculeRepresentation";
import { representationLabelMapping } from "../../../utils/enums";
import { convertRemToPx } from "../../../utils/utils";
import { AddCustomRepresentationCard } from "./AddCustomRepresentationCard";
import "./representation.css";

export const CustomRepresentationChip = (props: {
    addColourRulesAnchorDivRef: React.RefObject<HTMLDivElement>;
    molecule: MoorhenMolecule;
    representation: MoleculeRepresentation;
}) => {
    const { representation, molecule } = props;
    const urlPrefix = usePaths().urlPrefix;
    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(true);
    const [reload, setReload] = useState<boolean>(false);

    const dispatch = useDispatch();
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const isMoleculeVisible = useSelector((state: RootState) => state.molecules.visibleMolecules.some(molNo => molNo === molecule.molNo));
    const chipStyle = getChipStyle(representation.colourRules, representationIsVisible && isMoleculeVisible, isDark);
    if (!isMoleculeVisible) chipStyle["opacity"] = "0.3";

    // useEffect(() => { //this seem to just be a bug
    //     if (!isMoleculeVisible) {
    //         representation.hide();
    //     } else if (representationIsVisible) {
    //         representation.show();
    //     }
    // }, [isMoleculeVisible]);

    const handleVisibility = useCallback(() => {
        if (isMoleculeVisible) {
            !representationIsVisible ? representation.show() : representation.hide();
            setRepresentationIsVisible(!representationIsVisible);
        }
    }, [isMoleculeVisible, representationIsVisible]);

    const handleDelete = useCallback(() => {
        molecule.removeRepresentation(representation.uniqueId);
        dispatch(removeCustomRepresentation(representation));
    }, [molecule, representation]);

    let selectionName = representation.cid;
    if (representation.cid === "//*//:*" || representation.cid === "/*/*/*/*:*") selectionName = "All Molecule";
    return (
        <div className="moorhen__representation-chip" style={chipStyle}>
            <MoorhenStack align="center" direction="row" justify="center" gap="0.2rem">
                <div style={{ flexGrow: 1, textAlign: "left", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    <b>{`${representationLabelMapping[representation.style]}`}</b>
                    <br />
                    <span>{selectionName}</span>
                </div>
                <div style={{ flexShrink: "0" }}>
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
                </div>
            </MoorhenStack>
        </div>
    );
};

export const RepresentationCheckbox = (props: { style: RepresentationStyles; isVisible: boolean; molecule: MoorhenMolecule }) => {
    const [busyDrawingRepresentation, setBusyDrawingRepresentation] = useState<boolean>(false);
    const [isDisabled, setIsDisabled] = useState<boolean>(true);
    const [chipStyle, setChipStyle] = useState<any>({});

    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const showState = useSelector((state: RootState) =>
        state.molecules.generalRepresentations.some(
            item => item.parentMolecule?.molNo === props.molecule.molNo && item.style === props.style && !item.isCustom
        )
    );
    const updateSwitch = useSelector((state: RootState) => state.moleculeMapUpdate.moleculeUpdate.switch);

    const dispatch = useDispatch();

    useEffect(() => {
        setIsDisabled(
            !props.isVisible ||
                (props.style === "ligands" && props.molecule.ligands.length === 0) ||
                (props.style === "glycoBlocks" && !props.molecule.hasGlycans) ||
                (props.style === "restraints" && props.molecule.restraints.length === 0) ||
                (["rama", "rotamer"].includes(props.style) && props.molecule.sequences.every(sequence => [3, 4, 5].includes(sequence.type)))
        );
    }, [props.style, props.isVisible, props.molecule, updateSwitch]);

    useEffect(() => {
        setChipStyle({
            ...getChipStyle(props.molecule.defaultColourRules, showState, isDark, `${convertRemToPx(9.5)}px`),
            opacity: isDisabled ? 0.3 : 1.0,
        });
    }, [showState, isDark, isDisabled, props.molecule.defaultColourRules]);

    const handleClick = useCallback(() => {
        if (!isDisabled) {
            setBusyDrawingRepresentation(true);
            if (props.style === "adaptativeBonds") {
                props.molecule.setDrawAdaptativeBonds(!showState).then(_ => {
                    dispatch(
                        showState
                            ? removeGeneralRepresentation(props.molecule.adaptativeBondsRepresentation)
                            : addGeneralRepresentation(props.molecule.adaptativeBondsRepresentation)
                    );
                    setBusyDrawingRepresentation(false);
                });
            } else if (props.style === "environment") {
                if (showState) {
                    props.molecule.environmentRepresentation?.hide();
                    dispatch(removeGeneralRepresentation(props.molecule.environmentRepresentation));
                    setBusyDrawingRepresentation(false);
                } else {
                    props.molecule.drawEnvironment().then(_ => {
                        dispatch(addGeneralRepresentation(props.molecule.environmentRepresentation));
                        setBusyDrawingRepresentation(false);
                    });
                }
            } else if (showState) {
                const representation = props.molecule.hide(props.style);
                dispatch(removeGeneralRepresentation(representation));
                setBusyDrawingRepresentation(false);
            } else {
                props.molecule.show(props.style).then(representation => {
                    dispatch(addGeneralRepresentation(representation));
                    setBusyDrawingRepresentation(false);
                });
            }
        }
    }, [showState, isDisabled, props, busyDrawingRepresentation]);

    return (
        <Box sx={{ marginLeft: "0.2rem", marginBottom: "0.2rem", position: "relative" }}>
            <Chip
                disabled={busyDrawingRepresentation}
                style={chipStyle}
                variant={"outlined"}
                label={`${representationLabelMapping[props.style]}`}
                onClick={handleClick}
            />
            {busyDrawingRepresentation && (
                <CircularProgress
                    size={"1.5rem"}
                    disableShrink={true}
                    sx={{
                        color: chipStyle["borderColor"],
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        margin: "-0.74rem",
                    }}
                />
            )}
        </Box>
        // <div />
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
