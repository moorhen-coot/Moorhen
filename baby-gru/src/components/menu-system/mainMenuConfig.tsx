import React from "react";
import { MoorhenSVG } from "../icons";
import { ModalComponentProps, ModalKey } from "../interface-base/ModalBase/ModalsContainer";
import { SidePanelIDs } from "../panels";
import { MoorhenDevMenu } from "./MoorhenDevMenu";
import "./main-menu.css";

type Icon = { icon: MoorhenSVG; iconSrc?: never } | { icon?: never; iconSrc: string };
export type MainMenuEntrySubMenu = {
    type: "sub-menu";
    label: string;
    ariaLabel?: string;
    menu: string;
    align?: number;
} & Icon;

export type MainMenuEntryModal = {
    type: "modal";
    label: string;
    ariaLabel?: string;
    modal: ModalKey;
    args?: ModalComponentProps;
} & Icon;

export type MainMenuEntryPanel = {
    type: "panel";
    label: string;
    ariaLabel?: string;
    panel: SidePanelIDs;
} & Icon;

export type MainMenuEntryJSX = {
    type: "jsx";
    label: string;
    ariaLabel?: string;
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
        ariaLabel: "File Menu",
        icon: `MatSymFileOpen`,
        menu: "file",
        align: -2,
    },
    2: {
        type: "sub-menu",
        label: "Edit",
        ariaLabel: "Edit Menu",
        icon: `MatSymEdit`,
        menu: "edit",
        align: 2,
    },
    3: {
        type: "sub-menu",
        ariaLabel: "Calculate Menu",
        label: "Calculate",
        icon: `MatSymCalculate`,
        menu: "calculate",
        align: 3,
    },
    4: {
        type: "sub-menu",
        ariaLabel: "View Menu",
        label: "View",
        icon: `MatSymVisibility`,
        menu: "view",
        align: 6,
    },
    5: {
        type: "sub-menu",
        ariaLabel: "Validation Menu",
        label: "Validation",
        icon: `MatSymFactCheck`,
        menu: "validation",
        align: 3,
    },
    6: {
        type: "sub-menu",
        ariaLabel: "Ligand Menu",
        label: "Ligand",
        icon: `ligand`,
        menu: "ligand",
        align: 8,
    },
    7: {
        type: "panel",
        label: "Models",
        ariaLabel: "Open Models Panel",
        icon: `menuModels`,
        panel: "models",
    },
    8: {
        type: "panel",
        label: "Maps",
        ariaLabel: "Open Maps Panel",
        icon: `menuMaps`,
        panel: "maps",
    },
    9: {
        type: "sub-menu",
        label: "Map Tools",
        icon: `MatSymConstruction`,
        menu: "map-tools",
        align: 12,
    },
    10: {
        type: "sub-menu",
        ariaLabel: "Preferences Menu",
        label: "Preferences",
        icon: `MatSymSettings`,
        menu: "preferences",
        align: -2,
    },
    11: {
        type: "sub-menu",
        ariaLabel: "Help Menu",
        label: "Help",
        icon: `MatSymHelp`,
        menu: "help",
        align: 17,
    },
    12: {
        type: "jsx",
        label: "Dev tools",
        ariaLabel: "Developer Tools Menu",
        icon: `MatSymExperiment`,
        component: <MoorhenDevMenu />,
        align: 15,
    },
} as const;
