import {
    CenterFocusWeakOutlined,
    DownloadOutlined,
    ExpandLessOutlined,
    ExpandMoreOutlined,
    InfoOutlined,
    RedoOutlined,
    Settings,
    UndoOutlined,
    VisibilityOffOutlined,
    VisibilityOutlined,
} from "@mui/icons-material";
import { MenuItem } from "@mui/material";
import { Button, DropdownButton } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { hideMolecule, showMolecule } from "../../store/moleculesSlice";
import { moorhen } from "../../types/moorhen";
import { convertViewtoPx } from "../../utils/utils";
import { clickedResidueType } from "../card/MoleculeCard/MoorhenMoleculeCard";
import { MoorhenButton } from "../inputs";
import { MoorhenMenuItemPopover } from "../interface-base";
import { DeleteDisplayObject, GenerateAssembly, RenameDisplayObject } from "../menu-item";

type MoorhenMoleculeCardButtonBarPropsType = {
    handleCentering: () => void;
    handleCopyFragment: () => void;
    handleDownload: () => Promise<void>;
    handleRedo: () => Promise<void>;
    handleUndo: () => Promise<void>;
    handleShowInfo: () => void;
    molecule: moorhen.Molecule;
    sideBarWidth: number;
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    clickedResidue: clickedResidueType;
    selectedResidues: [number, number];
    currentDropdownMolNo: number;
    setCurrentDropdownMolNo: React.Dispatch<React.SetStateAction<number>>;
};

export const MoorhenMoleculeCardButtonBar = (props: MoorhenMoleculeCardButtonBarPropsType) => {
    const dropdownCardButtonRef = useRef<HTMLDivElement>(null);

    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false);
    const [currentName, setCurrentName] = useState<string>(props.molecule.name);

    const dispatch = useDispatch();
    const height = useSelector((state: moorhen.State) => state.sceneSettings.height);
    const makeBackups = useSelector((state: moorhen.State) => state.backupSettings.makeBackups);
    const isVisible = useSelector((state: moorhen.State) => state.molecules.visibleMolecules.includes(props.molecule.molNo));

    useMemo(() => {
        if (currentName === "") {
            return;
        }
        props.molecule.name = currentName;
    }, [currentName]);

    const handleVisibility = useCallback(() => {
        dispatch(isVisible ? hideMolecule(props.molecule) : showMolecule(props.molecule));
        props.setCurrentDropdownMolNo(-1);
    }, [isVisible]);

    const actionButtons: {
        [key: number]: { label: string; compressed: () => React.JSX.Element; expanded: null | (() => React.JSX.Element) };
    } = {
        1: {
            label: isVisible ? "Hide molecule" : "Show molecule",
            compressed: () => {
                return (
                    <MenuItem key={1} onClick={handleVisibility}>
                        {isVisible ? "Hide molecule" : "Show molecule"}
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <MoorhenButton key={1} size="sm" variant="outlined" onClick={handleVisibility}>
                        {isVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                    </MoorhenButton>
                );
            },
        },
        2: {
            label: "Undo last action",
            compressed: () => {
                return (
                    <MenuItem key={2} onClick={props.handleUndo} disabled={!makeBackups}>
                        Undo last action
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <MoorhenButton
                        key={2}
                        size="sm"
                        variant="outlined"
                        style={{ borderWidth: makeBackups ? "" : "0px" }}
                        onClick={props.handleUndo}
                        disabled={!makeBackups}
                    >
                        <UndoOutlined />
                    </MoorhenButton>
                );
            },
        },
        3: {
            label: "Redo previous action",
            compressed: () => {
                return (
                    <MenuItem key={3} onClick={props.handleRedo} disabled={!makeBackups}>
                        Redo previous action
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <MoorhenButton
                        key={3}
                        size="sm"
                        variant="outlined"
                        style={{ borderWidth: makeBackups ? "" : "0px" }}
                        onClick={props.handleRedo}
                        disabled={!makeBackups}
                    >
                        <RedoOutlined />
                    </MoorhenButton>
                );
            },
        },
        4: {
            label: "Center on molecule",
            compressed: () => {
                return (
                    <MenuItem key={4} onClick={props.handleCentering}>
                        Center on molecule
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <MoorhenButton key={4} size="sm" variant="outlined" onClick={props.handleCentering}>
                        <CenterFocusWeakOutlined />
                    </MoorhenButton>
                );
            },
        },
        5: {
            label: "Download Molecule",
            compressed: () => {
                return (
                    <MenuItem key={5} onClick={props.handleDownload}>
                        Download molecule
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <MoorhenButton key={5} size="sm" variant="outlined" onClick={props.handleDownload}>
                        <DownloadOutlined />
                    </MoorhenButton>
                );
            },
        },
        6: {
            label: "Header Info",
            compressed: () => {
                return (
                    <MenuItem
                        key={6}
                        onClick={() => {
                            document.body.click();
                            props.handleShowInfo();
                        }}
                    >
                        Header info
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <MoorhenButton key={6} size="sm" variant="outlined" onClick={props.handleShowInfo}>
                        <InfoOutlined />
                    </MoorhenButton>
                );
            },
        },
        7: {
            label: "Rename molecule",
            compressed: () => {
                return (
                    <MoorhenMenuItemPopover menuItemText="Rename Molecule">
                        <RenameDisplayObject key={7} setCurrentName={setCurrentName} item={props.molecule} />
                    </MoorhenMenuItemPopover>
                );
            },
            expanded: null,
        },
    };

    const bioMolButtons: {
        [key: number]: { label: string; compressed: () => React.JSX.Element; expanded: null | (() => React.JSX.Element) };
    } = {
        8: {
            label: "Generate assembly",
            compressed: () => {
                return (
                    <MoorhenMenuItemPopover menuItemText="Generate Assembly">
                        <GenerateAssembly
                            key={8}
                            setPopoverIsShown={setPopoverIsShown}
                            setCurrentName={setCurrentName}
                            item={props.molecule}
                        />
                    </MoorhenMenuItemPopover>
                );
            },
            expanded: null,
        },
    };

    const maximumAllowedWidth = props.sideBarWidth * 0.65;
    let currentlyUsedWidth = 0;
    const expandedButtons: React.JSX.Element[] = [];
    const compressedButtons: React.JSX.Element[] = [];

    Object.keys(actionButtons).forEach(key => {
        if (actionButtons[key].expanded === null) {
            compressedButtons.push(actionButtons[key].compressed());
        } else {
            currentlyUsedWidth += 60;
            if (currentlyUsedWidth < maximumAllowedWidth) {
                expandedButtons.push(actionButtons[key].expanded());
            } else {
                compressedButtons.push(actionButtons[key].compressed());
            }
        }
    });

    let showAssemblies = false;

    if (props.molecule.gemmiStructure) {
        try {
            const assemblies = props.molecule.gemmiStructure.assemblies;
            for (let i = 0; i < assemblies.size(); i++) {
                const assembly = assemblies.get(i);
                const generators = assembly.generators;
                const n_gen = generators.size();
                let n_tot_op = 0;
                for (let i_gen = 0; i_gen < n_gen; i_gen++) {
                    const gen = generators.get(i_gen);
                    const operators = gen.operators;
                    const n_op = operators.size();
                    n_tot_op += n_op;
                    gen.delete();
                    operators.delete();
                }
                assembly.delete();
                generators.delete();

                if (n_tot_op !== 60 && n_tot_op !== 1) {
                    showAssemblies = true;
                    break;
                }
            }
            assemblies.delete();
        } catch (e) {
            console.log("Some problem getting assembly info");
        }
    }

    if (showAssemblies) {
        Object.keys(bioMolButtons).forEach(key => {
            if (bioMolButtons[key].expanded === null) {
                compressedButtons.push(bioMolButtons[key].compressed());
            } else {
                currentlyUsedWidth += 60;
                if (currentlyUsedWidth < maximumAllowedWidth) {
                    expandedButtons.push(bioMolButtons[key].expanded());
                } else {
                    compressedButtons.push(bioMolButtons[key].compressed());
                }
            }
        });
    }

    compressedButtons.push(
        <MoorhenMenuItemPopover menuItemText="Delete Molecule">
            <DeleteDisplayObject key="deleteDisplayObjectMenuItem" item={props.molecule} />
        </MoorhenMenuItemPopover>
    );

    return (
        <Fragment>
            {expandedButtons}
            <DropdownButton
                ref={dropdownCardButtonRef}
                key="dropDownButton"
                title={<Settings />}
                size="sm"
                variant="outlined"
                autoClose={popoverIsShown ? false : "outside"}
                show={props.currentDropdownMolNo === props.molecule.molNo}
                onToggle={() => {
                    props.molecule.molNo !== props.currentDropdownMolNo
                        ? props.setCurrentDropdownMolNo(props.molecule.molNo)
                        : props.setCurrentDropdownMolNo(-1);
                }}
            >
                <div style={{ maxHeight: convertViewtoPx(50, height) * 0.5, overflowY: "auto" }}>{compressedButtons}</div>
            </DropdownButton>
            <MoorhenButton
                key="expandButton"
                size="sm"
                variant="outlined"
                onClick={() => {
                    props.setIsCollapsed(!props.isCollapsed);
                }}
            >
                {props.isCollapsed ? <ExpandMoreOutlined /> : <ExpandLessOutlined />}
            </MoorhenButton>
        </Fragment>
    );
};
