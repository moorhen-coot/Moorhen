import { DeleteOutlined, EditOutlined } from "@mui/icons-material";
import { Box, Chip, CircularProgress } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useState } from "react";
import { usePaths } from "../../../InstanceManager";
import {
    type MoleculeRepresentation,
    addGeneralRepresentation,
    removeCustomRepresentation,
    removeGeneralRepresentation,
} from "../../../moorhen";
import { RootState } from "../../../store/MoorhenReduxStore";
import { moorhen } from "../../../types/moorhen";
import { ColourRule } from "../../../utils/MoorhenColourRule";
import type { MoorhenMolecule } from "../../../utils/MoorhenMolecule";
import { representationLabelMapping } from "../../../utils/enums";
import { convertRemToPx } from "../../../utils/utils";
import { MoorhenAddCustomRepresentationCard } from "../MoorhenAddCustomRepresentationCard";

export const CustomRepresentationChip = (props: {
    addColourRulesAnchorDivRef: React.RefObject<HTMLDivElement>;
    molecule: MoorhenMolecule;
    representation: MoleculeRepresentation;
}) => {
    const { representation, molecule } = props;
    const urlPrefix = usePaths().urlPrefix;
    const [representationIsVisible, setRepresentationIsVisible] = useState<boolean>(true);
    const [showEditRepresentation, setShowEditRepresentation] = useState<boolean>(false);

    const dispatch = useDispatch();
    const isDark = useSelector((state: RootState) => state.sceneSettings.isDark);
    const isVisible = useSelector((state: RootState) => state.molecules.visibleMolecules.some(molNo => molNo === molecule.molNo));

    const chipStyle = getChipStyle(representation.colourRules, representationIsVisible && isVisible, isDark);
    if (!isVisible) chipStyle["opacity"] = "0.3";

    useEffect(() => {
        if (!isVisible) {
            representation.hide();
        } else if (representationIsVisible) {
            representation.show();
        }
    }, [isVisible]);

    useEffect(() => {
        representationIsVisible ? representation.show() : representation.hide();
    }, [representationIsVisible]);

    const handleVisibility = useCallback(() => {
        if (isVisible) {
            setRepresentationIsVisible(!representationIsVisible);
        }
    }, [isVisible, representationIsVisible]);

    const handleDelete = useCallback(() => {
        molecule.removeRepresentation(representation.uniqueId);
        dispatch(removeCustomRepresentation(representation));
    }, [molecule, representation]);

    return (
        <Box sx={{ marginLeft: "0.2rem", marginBottom: "0.2rem", position: "relative" }}>
            <Chip
                style={chipStyle}
                variant={"outlined"}
                label={`${representationLabelMapping[representation.style]} ${
                    representation.cid.length > 21 ? `${representation.cid.slice(0, 20)} ...` : representation.cid
                }`}
                deleteIcon={
                    <div>
                        <EditOutlined style={{ color: isDark ? "white" : "#696969" }} onClick={() => setShowEditRepresentation(true)} />
                        <DeleteOutlined style={{ color: isDark ? "white" : "#696969" }} onClick={handleDelete} />
                        <MoorhenAddCustomRepresentationCard
                            mode="edit"
                            urlPrefix={urlPrefix}
                            molecule={props.molecule}
                            anchorEl={props.addColourRulesAnchorDivRef}
                            representation={props.representation}
                            show={showEditRepresentation}
                            setShow={setShowEditRepresentation}
                        />
                    </div>
                }
                onClick={handleVisibility}
                onDelete={() => {}}
            />
        </Box>
    );
};

export const RepresentationCheckbox = (props: { style: moorhen.RepresentationStyles; isVisible: boolean; molecule: MoorhenMolecule }) => {
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
    );
};

export const getChipStyle = (colourRules: moorhen.ColourRule[], repIsVisible: boolean, isDark: boolean, width?: string) => {
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
