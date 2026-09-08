import { useDispatch, useSelector } from "react-redux";
import { useCallback, useEffect, useRef } from "react";
import { enqueueSnackbar, RootState } from "@/store";
import { useCommandCentre } from "../../InstanceManager";
import { setHoveredAtom } from "../../store/hoveringStatesSlice";
import { triggerUpdate } from "../../store/moleculeMapUpdateSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton, MoorhenSelect } from "../inputs";
import { MoorhenStack } from "../interface-base";
import { ActionButtonSettings } from "./MoorhenContextMenu";
import "./context-menu.css";
import { MoorhenClickAwayListener } from "../interface-base/utils/ClickAwayListener";

const MoorhenPopoverOptions = (props: {
    showContextMenu: false | moorhen.AtomRightClickEventInfo;
    setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
    label: string;
    options: string[];
    extraInput?: (arg0: React.RefObject<any>) => React.JSX.Element;
    nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: string) => void;
    doEdit: (arg0: moorhen.cootCommandKwargs) => void;
    getCootCommandInput?: (
        arg0: moorhen.Molecule,
        arg2: moorhen.ResidueSpec,
        arg3: string,
        arg4?: React.RefObject<any>
    ) => moorhen.cootCommandKwargs;
    selectedMolecule: moorhen.Molecule;
    chosenAtom: moorhen.ResidueSpec;
    defaultValue?: string;
    setDefaultValue?: (arg0: string) => void;
}) => {
    const defaultProps = { defaultValue: "TRIPLE", nonCootCommand: null };

    const { defaultValue, nonCootCommand } = { ...defaultProps, ...props };

    const selectRef = useRef<HTMLSelectElement | null>(null);
    const extraInputRef = useRef(null);

    const handleRightClick = useCallback((e: moorhen.AtomRightClickEvent) => {
        if (props.showContextMenu) {
            props.setShowOverlay(false);
        }
    }, []);

    const handleClick = useCallback(() => {
        props.setDefaultValue?.(selectRef.current.value);
        if (!nonCootCommand) {
            props.doEdit(props.getCootCommandInput?.(props.selectedMolecule, props.chosenAtom, selectRef.current.value, extraInputRef));
        } else {
            nonCootCommand(props.selectedMolecule, props.chosenAtom, selectRef.current.value);
        }
    }, [props]);

    useEffect(() => {
        document.addEventListener("rightClick", handleRightClick);
        return () => {
            document.removeEventListener("rightClick", handleRightClick);
        };
    }, [handleRightClick]);

    return (
        <MoorhenClickAwayListener onClickAway={() => props.setShowOverlay(false)}>
            <MoorhenStack direction="vertical">
                <MoorhenSelect label={props.label} key={props.label} ref={selectRef} defaultValue={defaultValue}>
                    {props.options.map(optionName => {
                        return (
                            <option key={optionName} value={optionName}>
                                {optionName}
                            </option>
                        );
                    })}
                </MoorhenSelect>

                {props.extraInput?.(extraInputRef)}
                <MoorhenButton onClick={handleClick}>OK</MoorhenButton>
            </MoorhenStack>
        </MoorhenClickAwayListener>
    );
};

export type ContextButtonProps = {
    monomerLibraryPath: string;
    urlPrefix: string;
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    selectedMolecule: moorhen.Molecule;
    chosenAtom: moorhen.ResidueSpec;
    setOverlayContents: React.Dispatch<React.SetStateAction<React.JSX.Element>>;
    setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
    timeCapsuleRef: React.RefObject<moorhen.TimeCapsule>;
    setToolTip: React.Dispatch<React.SetStateAction<string>>;
    setShowContextMenu: React.Dispatch<React.SetStateAction<false | moorhen.AtomRightClickEventInfo>>;
    setOpacity: React.Dispatch<React.SetStateAction<number>>;
    setOverrideMenuContents: React.Dispatch<React.SetStateAction<React.JSX.Element | boolean>>;
    showContextMenu: false | moorhen.AtomRightClickEventInfo;
    defaultActionButtonSettings: ActionButtonSettings;
    setDefaultActionButtonSettings: (arg0: { key: string; value: string }) => void;
};

export const MoorhenContextButtonBase = (props: {
    selectedMolecule: moorhen.Molecule;
    chosenAtom: moorhen.ResidueSpec;
    refineAfterMod?: boolean;
    needsMapData?: boolean;
    ligandOnly?: boolean;
    needsAtomData?: boolean;
    nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2?: string) => Promise<void>;
    cootCommandInput?: moorhen.cootCommandKwargs;
    setOverlayContents: React.Dispatch<React.SetStateAction<React.JSX.Element>>;
    setShowOverlay: React.Dispatch<React.SetStateAction<boolean>>;
    setShowContextMenu: React.Dispatch<React.SetStateAction<false | moorhen.AtomRightClickEventInfo>>;
    onExit?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: any) => void;
    onCompleted?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec) => void;
    icon: React.JSX.Element;
    setToolTip: React.Dispatch<React.SetStateAction<string>>;
    toolTipLabel: string;
    showContextMenu: false | moorhen.AtomRightClickEventInfo;
    popoverSettings?: {
        label: string;
        options: string[];
        nonCootCommand?: (arg0: moorhen.Molecule, arg1: moorhen.ResidueSpec, arg2: string) => void;
        getCootCommandInput?: (arg0: moorhen.Molecule, arg2: moorhen.ResidueSpec, arg3: string) => moorhen.cootCommandKwargs;
        extraInput?: (arg0: React.RefObject<any>) => React.JSX.Element;
        defaultValue?: string;
        setDefaultValue?: (arg0: string) => void;
    };
}) => {

    const { refineAfterMod = true, needsAtomData = true, needsMapData = false, ligandOnly = false } = { ...props };

    const molecules = useSelector((state: RootState) => state.molecules.moleculeList);
    const enableRefineAfterMod = useSelector((state: RootState) => state.refinementSettings.enableRefineAfterMod);
    const activeMap = useSelector((state: RootState) => state.generalStates.activeMap);
    const animateRefine = useSelector((state: RootState) => state.refinementSettings.animateRefine);
    const commandCentre = useCommandCentre();

    const isLigand = !["ALA","CYS","ASP","GLU","PHE","GLY","HIS","ILE","LYS","LEU","MET","ASN","PRO","GLN","ARG","SER","THR","VAL","TRP","TYR","WAT","HOH","THP","SEP","TPO","TYP","PTR","OH2","H2O","G","C","U","A","T"].includes(props.chosenAtom.res_name);

    const dispatch = useDispatch();

    const doEdit = async (cootCommandInput: moorhen.cootCommandKwargs) => {
        dispatch(setHoveredAtom({ molecule: null, cid: null, atomInfo: null }));
        props.setShowContextMenu(false);

        const cootResult = await commandCentre.current.cootCommand(cootCommandInput, true);

        props.onCompleted?.(props.selectedMolecule, props.chosenAtom);

        if (refineAfterMod && enableRefineAfterMod && activeMap) {
            try {
                if (animateRefine) {
                    await props.selectedMolecule.refineResiduesUsingAtomCidAnimated(
                        `//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}`,
                        activeMap,
                        2,
                        true,
                        false
                    );
                } else {
                    await props.selectedMolecule.refineResiduesUsingAtomCid(
                        `//${props.chosenAtom.chain_id}/${props.chosenAtom.res_no}`,
                        "TRIPLE",
                        4000,
                        true
                    );
                }
            } catch (err) {
                console.log(`Exception raised in Refine [${err}]`);
            }
        } else {
            props.selectedMolecule.setAtomsDirty(true);
            await props.selectedMolecule.redraw();
        }

        dispatch(triggerUpdate(props.selectedMolecule.molNo));
        props.selectedMolecule.clearBuffersOfStyle("hover");

        props.onExit?.(props.selectedMolecule, props.chosenAtom, cootResult);
    };

    const handleClick = useCallback(async () => {
        if (props.popoverSettings) {
            props.setOverlayContents(
                <MoorhenPopoverOptions
                    {...props.popoverSettings}
                    chosenAtom={props.chosenAtom}
                    selectedMolecule={props.selectedMolecule}
                    showContextMenu={props.showContextMenu}
                    doEdit={doEdit}
                    setShowOverlay={props.setShowOverlay}
                />
            );
            setTimeout(() => props.setShowOverlay(true), 50);
        } else if (props.nonCootCommand) {
            try {
                await props.nonCootCommand(props.selectedMolecule, props.chosenAtom);
            } catch (err) {
                // Never leave the context menu stuck open with no feedback if the
                // action throws (e.g. a backend query fails mid-setup).
                console.error("Context menu action failed", err);
                dispatch(enqueueSnackbar({ message: "Action could not be completed", variant: "warning" }));
                props.setShowContextMenu(false);
            }
        } else if (props.cootCommandInput) {
            await doEdit(props.cootCommandInput);
        }
    }, [props]);

    const disabled = (needsMapData && !activeMap) || (needsAtomData && molecules.length === 0) || (ligandOnly && !isLigand);

    return (
        <>
            <MoorhenButton
                onClick={handleClick}
                className={`moorhen__context-menu-button ${disabled ? "disabled" : ""}`}
                // onMouseEnter={() => props.setToolTip(props.toolTipLabel)}
                disabled={disabled}
                tooltip={props.toolTipLabel}
                disabledTooltip={needsMapData ?"An active map is required" : ligandOnly ? "Only for ligand" : "No molecule loaded"}
            >
                {props.icon}
            </MoorhenButton>
        </>
    );
};
