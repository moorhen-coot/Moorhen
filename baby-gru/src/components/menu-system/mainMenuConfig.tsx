import React from "react";
import { ModalKey } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { MoorhenIcon } from "../icons";
import { MoorhenHistoryMenu } from "./HistoryMenu";
import { MoorhenDevMenu } from "./MoorhenDevMenu";
import {
    CalculateMenu,
    EditMenu,
    FileMenu,
    HelpMenu,
    LigandMenu,
    MapToolsMenu,
    PreferencesMenu,
    ValidationMenu,
    ViewMenu,
} from "./SubMenus";
import "./main-menu.css";

export type MainMenuEntrySubMenu = {
    type: "sub-menu";
    label: string;
    icon: React.JSX.Element;
    menu: string;
    align?: number;
};

export type MainMenuEntryModal = {
    type: "modal";
    label: string;
    icon: React.JSX.Element;
    modal: ModalKey;
};

export type MainMenuEntryJSX = {
    type: "jsx";
    label: string;
    icon: React.JSX.Element;
    component: React.JSX.Element;
    props?: {};
    align?: number;
};

export type MainMenuMap = {
    [key: number]: MainMenuEntrySubMenu | MainMenuEntryModal | MainMenuEntryJSX;
};

export const createMainMenu = (): MainMenuMap => ({
    1: {
        type: "sub-menu",
        label: "File",
        icon: <MoorhenIcon name={`MUISymbolFileOpen`} className="moorhen__icon__menu" alt="Ligand" />,
        menu: "file",
        align: -2,
    },
    2: {
        type: "sub-menu",
        label: "Edit",
        icon: <MoorhenIcon name={`MUISymbolEdit`} className="moorhen__icon__menu" alt="Edit" />,
        menu: "edit",
        align: 2,
    },
    3: {
        type: "sub-menu",
        label: "Calculate",
        icon: <MoorhenIcon name={`MUISymbolCalculate`} className="moorhen__icon__menu" alt="Calculate" />,
        menu: "calculate",
        align: 3,
    },
    4: {
        type: "sub-menu",
        label: "View",
        icon: <MoorhenIcon name={`MUISymbolVisibility`} className="moorhen__icon__menu" alt="View" />,
        menu: "view",
        align: 6,
    },
    5: {
        type: "sub-menu",
        label: "Validation",
        icon: <MoorhenIcon name={`MUISymbolFactCheck`} className="moorhen__icon__menu" alt="Validation" />,
        menu: "validation",
        align: 3,
    },
    6: {
        type: "sub-menu",
        label: "Ligand",
        icon: <MoorhenIcon name={`ligand`} className="moorhen__icon__menu" alt="Ligand" />,
        menu: "ligand",
        align: 8,
    },
    7: {
        type: "modal",
        label: "Models",
        icon: <MoorhenIcon name={`menu-models`} className="moorhen__icon__menu" alt="Models" />,
        modal: "models",
    },
    8: {
        type: "modal",
        label: "Maps",
        icon: <MoorhenIcon name={`menu-maps`} className="moorhen__icon__menu" alt="Maps" />,
        modal: "maps",
    },
    9: {
        type: "sub-menu",
        label: "Map Tools",
        icon: <MoorhenIcon name={`MUISymbolConstruction`} className="moorhen__icon__menu" alt="Map Tools" />,
        menu: "map-tools",
        align: 12,
    },
    10: {
        type: "jsx",
        label: "History",
        icon: <MoorhenIcon name={`MUISymbolHistory`} className="moorhen__icon__menu" alt="History" />,
        component: <MoorhenHistoryMenu />,
        align: -2,
    },
    11: {
        type: "sub-menu",
        label: "Preferences",
        icon: <MoorhenIcon name={`MUISymbolSettings`} className="moorhen__icon__menu" alt="Preferences" />,
        menu: "preferences",
        align: -2,
    },
    12: {
        type: "sub-menu",
        label: "Help",
        icon: <MoorhenIcon name={`MUISymbolHelp`} className="moorhen__icon__menu" alt="Help" />,
        menu: "help",
        align: 17,
    },
    13: {
        type: "jsx",
        label: "Dev tools",
        icon: <MoorhenIcon name={`MUISymbolExperiment`} className="moorhen__icon__menu" alt="Dev tools" />,
        component: <MoorhenDevMenu />,
        align: 15,
    },
});
