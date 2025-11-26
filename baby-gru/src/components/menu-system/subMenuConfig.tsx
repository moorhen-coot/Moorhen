import { ActionCreatorWithOptionalPayload } from "@reduxjs/toolkit";
import React from "react";
import { RootState } from "../../store/MoorhenReduxStore";
import { setMakeBackups } from "../../store/backupSettingsSlice";
import { setDefaultExpandDisplayCards, setDevMode, setTransparentModalsOnMouseOut } from "../../store/generalStatesSlice";
import { setAtomLabelDepthMode } from "../../store/labelSettingsSlice";
import type { ModalKey } from "../../store/modalsSlice";
import { setShortcutOnHoveredAtom, setShowShortcutToast } from "../../store/shortCutsSlice";
import * as MenuItems from "../menu-item";

// export type SubMenus = "file" | "calculate" | "edit" | "help" | "ligand" | "map-tool" | "validation" | "view" | "preferences";

export type BaseMenuItem = {
    id: string;
    label: string;
    keywords?: string[];
    description?: string;
    devOnly?: boolean;
    specialType?: "script" | "upload";
};

export type MenuItemPopover = BaseMenuItem & {
    type: "popover";
    content: () => React.ReactElement;
};

export type MenuItem = BaseMenuItem & {
    type: "item";
    onClick: () => void;
};

export type MenuItemShowModal = BaseMenuItem & {
    type: "showModal";
    modal: ModalKey;
};

export type MenuItemCustomJSX = BaseMenuItem & {
    type: "customJSX";
    jsx: (aeg0: any) => React.JSX.Element;
};

export type MenuItemSubMenu = BaseMenuItem & {
    type: "subMenu";
    menu: string;
};

export type PreferenceSwitch = BaseMenuItem & {
    type: "preferenceSwitch";
    selector: (state: RootState) => boolean;
    action: ActionCreatorWithOptionalPayload<boolean>;
};

export type Separator = {
    type: "separator";
    label?: string;
};

export type MenuItemType =
    | MenuItem
    | MenuItemPopover
    | MenuItemShowModal
    | MenuItemCustomJSX
    | PreferenceSwitch
    | MenuItemSubMenu
    | Separator;

export type SubMenu = {
    label: string;
    items: MenuItemType[];
};

export type SubMenuMap = {
    [submenu: string]: SubMenu;
};

export const subMenuMap: SubMenuMap = {
    file: {
        label: "Files",
        items: [
            {
                id: "auto-load",
                label: "Auto load files",
                type: "customJSX",
                keywords: ["upload", "load", "pdb"],
                description: "Upload and open files",
                jsx: MenuItems.AutoLoadFiles,
                specialType: "upload",
            },
            { type: "separator" },
            {
                id: "fetch-online",
                label: "Fetch from online service",
                type: "customJSX",
                keywords: ["upload", "load", "pdb"],
                description: "fetch files from online resources",
                jsx: MenuItems.FetchOnlineSources,
            },
            { type: "separator" },
            {
                id: "manage-sessions",
                label: "Session",
                type: "customJSX",
                keywords: ["session"],
                description: "session manager",
                jsx: MenuItems.ManageSession,
            },
            { type: "separator" },
            {
                id: "query-online-services-sequence",
                label: "Query online services with a sequence...",
                type: "showModal",
                modal: "query-seq",
            },
            {
                id: "associate-reflections-to-map",
                label: "Associate reflections to map...",
                type: "popover",
                specialType: "upload",
                content: MenuItems.AssociateReflectionsToMap,
            },
            {
                id: "auto-open-mtz",
                label: "Auto open MTZ...",
                type: "popover",
                specialType: "upload",
                content: MenuItems.AutoOpenMtz,
            },
            {
                id: "import-map-coefficients",
                label: "Import map coefficients...",
                type: "popover",
                specialType: "upload",
                content: MenuItems.ImportMapCoefficients,
            },
            {
                id: "import-map",
                label: "Import map...",
                type: "popover",
                specialType: "upload",
                content: MenuItems.ImportMap,
            },
            {
                id: "import-fsigf",
                label: "Import F/SigF...",
                type: "popover",
                content: MenuItems.ImportFSigF,
            },
            {
                id: "load-tutorial-data",
                label: "Load tutorial data...",
                type: "popover",
                content: MenuItems.LoadTutorialData,
            },
            {
                id: "record-video",
                label: "Record a video",
                type: "customJSX",
                jsx: MenuItems.RecordVideo,
            },
            {
                id: "export gltf",
                label: "Export scene as gltf",
                type: "customJSX",
                jsx: MenuItems.ExportGltf,
            },
            {
                id: "load-mrbump",
                label: "MrBump results...",
                type: "showModal",
                modal: "mrbump",
                devOnly: true,
                specialType: "upload",
            },
            {
                id: "load-mrparse",
                label: "MrParse results...",
                type: "showModal",
                modal: "mrparse",
                devOnly: true,
                specialType: "upload",
            },
            { type: "separator" },
            {
                id: "delete-everything",
                label: "Delete Everything ... ",
                type: "popover",
                content: MenuItems.DeleteEverything,
            },
        ],
    },
    calculate: {
        label: "Calculate",
        items: [
            {
                id: "add-waters",
                label: "Add Water...",
                type: "popover",
                keywords: ["water"],
                description: "automatically add water in the map",
                content: MenuItems.AddWaters,
            },
            {
                id: "superpose",
                label: "Superpose structures...",
                type: "showModal",
                modal: "superpose",
            },
            {
                id: "multiply-bfactor",
                label: "Multiply molecule B-factors...",
                type: "popover",
                keywords: ["B-factors", "B factors", "Multiply"],
                description: "Multiply all B-factors by a set amount",
                content: MenuItems.MultiplyBfactor,
            },
            {
                id: "shift-field-bfactor",
                label: "Shift field B-factor refinement...",
                type: "popover",
                keywords: ["B-factors", "B factors", "refinement"],
                description: "Use Shift Field to refine B factors",
                content: MenuItems.ShiftFieldBFactor,
            },
            {
                id: "calculate-trajectory",
                label: "Animate multi-model trajectory...",
                type: "popover",
                keywords: ["animate", "trajectory"],
                description: "",
                content: MenuItems.CalculateTrajectory,
            },
            {
                id: "self-restraints",
                label: "Generate self-restraints...",
                type: "popover",
                keywords: ["restraints", "self", "generate"],
                description: "",
                content: MenuItems.SelfRestraints,
            },
            {
                id: "clear-self-restraints",
                label: "Clear self-restraints...",
                type: "popover",
                keywords: ["animate", "trajectory"],
                description: "",
                content: MenuItems.ClearSelfRestraints,
            },
            {
                id: "jiggle-fit",
                label: "Jiggle Fit with Fourier Filtering...",
                type: "popover",
                keywords: ["fit", "fourrier", "jiggle"],
                description: "",
                content: MenuItems.RandomJiggleBlur,
            },
            {
                id: "slice-n-dice",
                label: "Slice-n-Dice...",
                type: "showModal",
                modal: "slice-n-dice",
            },
            {
                id: "load-script",
                label: "Load and execute script...",
                type: "popover",
                keywords: ["script"],
                description: "",
                content: MenuItems.LoadScript,
                specialType: "script",
            },
            {
                id: "interactive-scripting",
                label: "Interactive scripting...",
                type: "showModal",
                modal: "scripting",
                specialType: "script",
            },
        ],
    },
    edit: {
        label: "Edit",
        items: [
            {
                id: "add-simple",
                label: "Add simple...",
                type: "popover",
                keywords: ["add", "simple"],
                description: "Add simple molecule",
                content: MenuItems.AddSimple,
            },
            {
                id: "add-remove-hydrogen",
                label: "Add/Remove hydrogen atoms...",
                type: "popover",
                keywords: ["hydrogen", "add", "remove"],
                description: "Add or remove hydrogen atoms",
                content: MenuItems.AddRemoveHydrogenAtoms,
            },
            {
                id: "merge-molecules",
                label: "Merge molecules...",
                type: "popover",
                keywords: ["merge", "combine"],
                description: "Merge multiple molecules",
                content: MenuItems.MergeMolecules,
            },
            {
                id: "move-molecule",
                label: "Move molecule here...",
                type: "popover",
                keywords: ["move", "translate"],
                description: "Move molecule to current position",
                content: MenuItems.MoveMoleculeHere,
            },
            {
                id: "change-chain-id",
                label: "Change chain ID...",
                type: "popover",
                keywords: ["chain", "rename"],
                description: "Change chain identifier",
                content: MenuItems.ChangeChainId,
            },
            {
                id: "set-occupancy",
                label: "Set occupancy...",
                type: "popover",
                keywords: ["occupancy"],
                description: "Set atom occupancy",
                content: MenuItems.SetOccupancy,
            },
            {
                id: "split-models",
                label: "Split models...",
                type: "popover",
                keywords: ["split", "models"],
                description: "Split multi-model structure",
                content: MenuItems.SplitModels,
            },
            {
                id: "delete-cid",
                label: "Delete using CID...",
                type: "popover",
                keywords: ["delete", "remove", "cid"],
                description: "Delete atoms using CID selection",
                content: MenuItems.DeleteUsingCid,
            },
            {
                id: "create-selection",
                label: "Create selection...",
                type: "popover",
                keywords: ["selection", "create"],
                description: "Create atom selection",
                content: MenuItems.CreateSelection,
            },
            {
                id: "copy-fragment",
                label: "Copy fragment using CID...",
                type: "popover",
                keywords: ["copy", "fragment", "cid"],
                description: "Copy fragment using CID selection",
                content: MenuItems.CopyFragmentUsingCid,
            },
            {
                id: "goto",
                label: "Go to CID...",
                type: "popover",
                keywords: ["goto", "navigate", "cid"],
                description: "Navigate to CID location",
                content: MenuItems.GoTo,
            },
            {
                id: "covalent-link",
                label: "Create covalent link between two atoms...",
                type: "showModal",
                modal: "acedrg",
                devOnly: true,
            },
        ],
    },
    validation: {
        label: "Validation",
        items: [
            {
                id: "diff-map-peaks",
                label: "Difference map peaks...",
                type: "showModal",
                modal: "diff-map-peaks",
            },
            {
                id: "rama-plot",
                label: "Ramachandran plot...",
                type: "showModal",
                modal: "rama-plot",
            },
            {
                id: "validation-plot",
                label: "Validation plot...",
                type: "showModal",
                modal: "validation-plot",
            },
            {
                id: "lig-validation",
                label: "Ligand validation...",
                type: "showModal",
                modal: "lig-validation",
            },
            {
                id: "carb-validation",
                label: "Carbohydrate validation...",
                type: "showModal",
                modal: "carb-validation",
            },
            {
                id: "pepflips",
                label: "Peptide flips using difference map...",
                type: "showModal",
                modal: "pepflips",
            },
            {
                id: "fill-partial-residues",
                label: "Fill partial residues...",
                type: "showModal",
                modal: "fill-partial-residues",
            },
            {
                id: "unmodelled-blobs",
                label: "Unmodelled blobs...",
                type: "showModal",
                modal: "unmodelled-blobs",
            },
            {
                id: "mmrrcc",
                label: "MMRRCC plot...",
                type: "showModal",
                modal: "mmrrcc",
            },
            {
                id: "qscore",
                label: "Calculate Q-Score",
                type: "showModal",
                modal: "qscore",
            },
            {
                id: "water-validation",
                label: "Water validation...",
                type: "showModal",
                modal: "water-validation",
            },
            {
                id: "pae-plot",
                label: "Alphafold PAE Plot...",
                type: "showModal",
                modal: "pae-plot",
                devOnly: true,
            },
            {
                id: "json-validation",
                label: "Interesting bits JSON validation...",
                type: "showModal",
                modal: "json-validation",
                devOnly: true,
            },
        ],
    },
    "map-tools": {
        label: "Map Tools",
        items: [
            {
                id: "sharpen-blur",
                label: "Sharpen/Blur map...",
                type: "popover",
                keywords: ["sharpen", "blur", "map"],
                description: "Sharpen or blur map",
                content: MenuItems.SharpenBlurMap,
            },
            {
                id: "map-masking",
                label: "Map masking...",
                type: "popover",
                keywords: ["mask", "masking", "map"],
                description: "Apply mask to map",
                content: MenuItems.MapMasking,
            },
            {
                id: "flip-map-hand",
                label: "Flip map hand...",
                type: "popover",
                keywords: ["flip", "hand", "map"],
                description: "Flip map hand",
                content: MenuItems.FlipMapHand,
            },
            {
                id: "masked-maps-chain",
                label: "Make masked maps split by chain...",
                type: "popover",
                keywords: ["masked", "maps", "chain", "split"],
                description: "Create masked maps split by chain",
                content: MenuItems.MakeMaskedMapsSplitByChain,
            },
            {
                id: "colour-map",
                label: "Color map by another map...",
                type: "showModal",
                modal: "colour-map-by-map",
            },
            {
                id: "dedust-map",
                label: "De-dust map...",
                type: "popover",
                keywords: ["dedust", "dust", "map", "clean"],
                description: "Remove dust from map",
                content: MenuItems.DedustMap,
            },
        ],
    },
    view: {
        label: "View",
        items: [
            {
                id: "scene-preset",
                label: "Scene preset...",
                type: "popover",
                keywords: ["scene", "preset"],
                description: "Apply scene preset",
                content: MenuItems.ScenePreset,
            },
            {
                id: "scene-settings",
                label: "Scene settings...",
                type: "showModal",
                modal: "scene-settings",
            },
            {
                id: "other-scene-settings",
                label: "Other scene settings...",
                type: "subMenu",
                keywords: ["scene", "settings", "other"],
                description: "Other scene settings",
                menu: "other-scene-settings",
            },
            {
                id: "layout-settings",
                label: "Layout settings...",
                type: "popover",
                keywords: ["layout", "settings"],
                description: "Layout settings",
                content: MenuItems.LayoutSettings,
            },
        ],
    },
    ligand: {
        label: "Ligand",
        items: [
            {
                id: "get-monomer",
                label: "Get monomer...",
                type: "popover",
                keywords: ["monomer", "get"],
                description: "Get monomer from library",
                content: MenuItems.GetMonomer,
            },
            {
                id: "import-dictionary",
                label: "Import dictionary...",
                type: "popover",
                keywords: ["dictionary", "import"],
                description: "Import ligand dictionary",
                content: MenuItems.ImportDictionary,
                specialType: "upload",
            },
            {
                id: "smiles-to-ligand",
                label: "SMILES to ligand...",
                type: "popover",
                keywords: ["SMILES", "ligand"],
                description: "Convert SMILES to ligand",
                content: MenuItems.SMILESToLigand,
            },
            {
                id: "centre-on-ligand",
                label: "Centre on ligand...",
                type: "popover",
                keywords: ["centre", "ligand", "center"],
                description: "Centre view on ligand",
                content: MenuItems.CentreOnLigand,
            },
            {
                id: "minimize-energy",
                label: "Minimize energy...",
                type: "popover",
                keywords: ["minimize", "energy"],
                description: "Minimize ligand energy",
                content: MenuItems.MinimizeEnergy,
            },
            {
                id: "match-ligands",
                label: "Match ligands...",
                type: "popover",
                keywords: ["match", "ligands"],
                description: "Match ligands",
                content: MenuItems.MatchLigands,
            },
            {
                id: "open-lhasa",
                label: "Open Lhasa...",
                type: "popover",
                keywords: ["lhasa", "open"],
                description: "Open Lhasa",
                content: MenuItems.OpenLhasa,
            },
            {
                id: "find-ligand",
                label: "Find ligand...",
                type: "showModal",
                modal: "fit-ligand",
            },
        ],
    },
    preferences: {
        label: "Preferences",
        items: [
            {
                id: "expand-display-cards",
                label: "Expand display cards after file upload",
                type: "preferenceSwitch",
                action: setDefaultExpandDisplayCards,
                selector: (state: RootState) => state.generalStates.defaultExpandDisplayCards,
            },
            {
                id: "transparent-modal",
                label: "Make modals transparent on mouse out",
                type: "preferenceSwitch",
                action: setTransparentModalsOnMouseOut,
                selector: (state: RootState) => state.generalStates.transparentModalsOnMouseOut,
            },
            {
                id: "atom-label-depth",
                label: "Depth cue atom labels",
                type: "preferenceSwitch",
                action: setAtomLabelDepthMode,
                selector: (state: RootState) => state.labelSettings.atomLabelDepthMode,
            },
            {
                id: "shortcut-toast",
                label: "Show shortcut popup",
                type: "preferenceSwitch",
                action: setShowShortcutToast,
                selector: (state: RootState) => state.shortcutSettings.showShortcutToast,
            },
            {
                id: "make-backups",
                label: "Enable molecule undo/redo backups",
                type: "preferenceSwitch",
                action: setMakeBackups,
                selector: (state: RootState) => state.backupSettings.makeBackups,
            },
            {
                id: "shortcut-hovered-atom",
                label: "Hover on residue to use shortcuts",
                type: "preferenceSwitch",
                action: setShortcutOnHoveredAtom,
                selector: (state: RootState) => state.shortcutSettings.shortcutOnHoveredAtom,
            },
            {
                id: "dev-mode",
                label: "Developer mode",
                type: "preferenceSwitch",
                action: setDevMode,
                selector: (state: RootState) => state.generalStates.devMode,
            },
            {
                type: "separator",
            },
            {
                id: "mouse-sensitivity",
                label: "Mouse sensitivity...",
                type: "popover",
                content: MenuItems.MouseSensitivitySettings,
            },
            {
                id: "backup-preferences",
                label: "Backup preferences...",
                type: "popover",
                content: MenuItems.BackupPreferences,
            },
            {
                id: "scores-toast",
                label: "Scores toast preferences...",
                type: "popover",
                content: MenuItems.ScoresToastPreferences,
            },
            {
                id: "bond-smoothness",
                label: "Default bond smoothness...",
                type: "popover",
                content: MenuItems.DefaultBondSmoothnessPreferences,
            },
            {
                id: "view-layout",
                label: "View layout...",
                type: "popover",
                content: MenuItems.ViewLayoutPreferences,
            },
            {
                id: "map-contour",
                label: "Map contour settings...",
                type: "popover",
                content: MenuItems.MapContourSettings,
            },
            {
                id: "refinement-settings",
                label: "Refinement settings...",
                type: "popover",
                content: MenuItems.RefinementSettings,
            },
            {
                id: "configure-shortcuts",
                label: "Configure shortcuts...",
                type: "customJSX",
                jsx: MenuItems.ShowShortcutModal,
            },
            {
                id: "labels-font",
                label: "Labels font...",
                keywords: ["size", "labels", "fonts"],
                type: "popover",
                content: MenuItems.GLFont,
            },
        ],
    },
};

export const HELP_MENU: SubMenuMap = {
    help: {
        label: "Help",
        items: [
            {
                id: "wiki",
                label: "Go to Moorhen wiki...",
                type: "item",
                keywords: ["wiki", "documentation", "help"],
                description: "Open Moorhen wiki documentation",
                onClick: () => window.open("https://moorhen-coot.github.io/wiki/"),
            },
            {
                id: "show-controls",
                label: "Show controls...",
                type: "showModal",
                modal: "show-controls",
            },
            {
                id: "contact",
                label: "Contact...",
                type: "popover",
                keywords: ["contact", "support"],
                description: "Contact information",
                content: MenuItems.Contact,
            },
            {
                id: "about",
                label: "About...",
                type: "popover",
                keywords: ["about", "version"],
                description: "About Moorhen",
                content: MenuItems.About,
            },
            {
                id: "references",
                label: "References...",
                type: "popover",
                keywords: ["references", "citations"],
                description: "Moorhen references",
                content: MenuItems.References,
            },
        ],
    },
};
