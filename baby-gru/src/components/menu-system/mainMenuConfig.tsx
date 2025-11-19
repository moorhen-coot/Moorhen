import React from "react";
import { ModalKey } from "../../store/modalsSlice";
import { MoorhenIcon } from "../icons";
import { MoorhenHistoryMenu } from "./HistoryMenu";
import { MoorhenDevMenu } from "./MoorhenDevMenu";
import "./main-menu.css";

export type MainMenuEntrySubMenu = {
    type: "sub-menu";
    label: string;
    icon: string;
    menu: string;
    align?: number;
};

export type MainMenuEntryModal = {
    type: "modal";
    label: string;
    icon: string;
    modal: ModalKey;
};

export type MainMenuEntryJSX = {
    type: "jsx";
    label: string;
    icon: string;
    component: React.JSX.Element;
    props?: {};
    align?: number;
};

export type MainMenuType = MainMenuEntrySubMenu | MainMenuEntryModal | MainMenuEntryJSX;

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
        type: "modal",
        label: "Models",
        icon: `menu-models`,
        modal: "models",
    },
    8: {
        type: "modal",
        label: "Maps",
        icon: `menu-maps`,
        modal: "maps",
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
};
