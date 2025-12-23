import React from "react";
import { ModalKey } from "../../store/modalsSlice";
import { MoorhenSVG } from "../icons";
import { PanelIDs } from "../panels";
import { MoorhenHistoryMenu } from "./HistoryMenu";
import { MoorhenDevMenu } from "./MoorhenDevMenu";
import "./main-menu.css";

type Icon = { icon: MoorhenSVG; iconSrc?: never } | { icon?: never; iconSrc: string };
export type MainMenuEntrySubMenu = {
    type: "sub-menu";
    label: string;
    menu: string;
    align?: number;
} & Icon;

export type MainMenuEntryModal = {
    type: "modal";
    label: string;
    modal: ModalKey;
} & Icon;

export type MainMenuEntryPanel = {
    type: "panel";
    label: string;
    panel: PanelIDs;
} & Icon;

export type MainMenuEntryJSX = {
    type: "jsx";
    label: string;
    component: React.JSX.Element;
    props?: {};
    align?: number;
} & Icon;

export type MainMenuType = MainMenuEntrySubMenu | MainMenuEntryModal | MainMenuEntryJSX | MainMenuEntryPanel;

export type MainMenuMap = {
    [key: number]: MainMenuType;
};

export const MainMenu: MainMenuMap = {
    1: {
        type: "sub-menu",
        label: "File",
        icon: `MUISymbolFileOpen`,
        menu: "file",
        align: -2,
    },
    2: {
        type: "sub-menu",
        label: "Edit",
        icon: `MUISymbolEdit`,
        menu: "edit",
        align: 2,
    },
    3: {
        type: "sub-menu",
        label: "Calculate",
        icon: `MUISymbolCalculate`,
        menu: "calculate",
        align: 3,
    },
    4: {
        type: "sub-menu",
        label: "View",
        icon: `MUISymbolVisibility`,
        menu: "view",
        align: 6,
    },
    5: {
        type: "sub-menu",
        label: "Validation",
        icon: `MUISymbolFactCheck`,
        menu: "validation",
        align: 3,
    },
    6: {
        type: "sub-menu",
        label: "Ligand",
        icon: `ligand`,
        menu: "ligand",
        align: 8,
    },
    7: {
        type: "panel",
        label: "Models",
        icon: `menuModels`,
        panel: "models",
    },
    8: {
        type: "panel",
        label: "Maps",
        icon: `menuMaps`,
        panel: "maps",
    },
    9: {
        type: "sub-menu",
        label: "Map Tools",
        icon: `MUISymbolConstruction`,
        menu: "map-tools",
        align: 12,
    },
    10: {
        type: "jsx",
        label: "History",
        icon: `MUISymbolHistory`,
        component: <MoorhenHistoryMenu />,
        align: -2,
    },
    11: {
        type: "sub-menu",
        label: "Preferences",
        icon: `MUISymbolSettings`,
        menu: "preferences",
        align: -2,
    },
    12: {
        type: "sub-menu",
        label: "Help",
        icon: `MUISymbolHelp`,
        menu: "help",
        align: 17,
    },
    13: {
        type: "jsx",
        label: "Dev tools",
        icon: `MUISymbolExperiment`,
        component: <MoorhenDevMenu />,
        align: 15,
    },
} as const;
