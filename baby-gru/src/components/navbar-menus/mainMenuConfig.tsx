import "./main-menu.css";
import { MoorhenIcon } from "../icons";
import { modalKeys } from "../../utils/enums";
import { MoorhenFileMenu } from "./MoorhenFileMenu";
import { MoorhenPreferencesMenu } from "./MoorhenPreferencesMenu";
import { MoorhenHelpMenu } from "./MoorhenHelpMenu";
import { MoorhenViewMenu } from "./MoorhenViewMenu";
import { MoorhenLigandMenu } from "./MoorhenLigandMenu";
import { MoorhenHistoryMenu } from "./MoorhenHistoryMenu";
import { MoorhenEditMenu } from "./MoorhenEditMenu";
import { MoorhenMapToolsMenu } from "./MoorhenMapToolsMenu";
import { MoorhenValidationMenu } from "./MoorhenValidationMenu";
import { MoorhenCalculateMenu } from "./MoorhenCalculateMenu";
import { MoorhenDevMenu } from "./MoorhenDevMenu";

export type MenuEntry = {
    label: string;
    icon: React.JSX.Element;
    component: React.ElementType | string;
    props?: { [key: string]: unknown };
    align?: number;
};

export type MenuMap = {
    [key: number]: MenuEntry;
};

export const MAIN_MENU_CONFIG: MenuMap = {
    1: {
        label: "File",
        icon: <MoorhenIcon name={`MUISymbolFileOpen`} className="moorhen__icon__menu" alt="Ligand" />,
        component: MoorhenFileMenu,
        props: { dropdownId: "file-menu" },
        align: -2,
    },
    2: {
        label: "Edit",
        icon: <MoorhenIcon name={`MUISymbolEdit`} className="moorhen__icon__menu" alt="Edit" />,
        component: MoorhenEditMenu,
        props: { dropdownId: "edit-menu" },
        align: 2,
    },
    3: {
        label: "Calculate",
        icon: <MoorhenIcon name={`MUISymbolCalculate`} className="moorhen__icon__menu" alt="Calculate" />,
        component: MoorhenCalculateMenu,
        props: { dropdownId: "calculate-menu" },
        align: 3,
    },
    4: {
        label: "View",
        icon: <MoorhenIcon name={`MUISymbolVisibility`} className="moorhen__icon__menu" alt="View" />,
        component: MoorhenViewMenu,
        props: { dropdownId: "view-menu" },
        align: 6,
    },
    5: {
        label: "Validation",
        icon: <MoorhenIcon name={`MUISymbolFactCheck`} className="moorhen__icon__menu" alt="Validation" />,
        component: MoorhenValidationMenu,
        props: { dropdownId: "validation-menu" },
        align: 3,
    },
    6: {
        label: "Ligand",
        icon: <MoorhenIcon name={`ligand`} className="moorhen__icon__menu" alt="Ligand" />,
        component: MoorhenLigandMenu,
        props: { dropdownId: "ligand-menu" },
        align: 8,
    },
    7: {
        label: "Map Tools",
        icon: <MoorhenIcon name={`MUISymbolConstruction`} className="moorhen__icon__menu" alt="Map Tools" />,
        component: MoorhenMapToolsMenu,
        props: { dropdownId: "map-tools-menu" },
        align: 12,
    },
    8: {
        label: "Models",
        icon: <MoorhenIcon name={`menu-models`} className="moorhen__icon__menu" alt="Models" />,
        component: modalKeys.MODELS,
        props: { dropdownId: "models-menu" },
    },
    9: {
        label: "Maps",
        icon: <MoorhenIcon name={`menu-maps`} className="moorhen__icon__menu" alt="Maps" />,
        component: modalKeys.MAPS,
        props: { dropdownId: "maps-menu" },
    },
    10: {
        label: "History",
        icon: <MoorhenIcon name={`MUISymbolHistory`} className="moorhen__icon__menu" alt="History" />,
        component: MoorhenHistoryMenu,
        props: { dropdownId: "history-menu" },
        align: -2,
    },
    11: {
        label: "Preferences",
        icon: <MoorhenIcon name={`MUISymbolSettings`} className="moorhen__icon__menu" alt="Preferences" />,
        component: MoorhenPreferencesMenu,
        props: { dropdownId: "preferences-menu" },
        align: -2,
    },
    12: {
        label: "Help",
        icon: <MoorhenIcon name={`MUISymbolHelp`} className="moorhen__icon__menu" alt="Help" />,
        component: MoorhenHelpMenu,
        props: { dropdownId: "help-menu" },
        align: 18,
    },
    13: {
        label: "Dev tools",
        icon: <MoorhenIcon name={`MUISymbolExperiment`} className="moorhen__icon__menu" alt="Dev tools" />,
        component: MoorhenDevMenu,
        props: { dropdownId: "dev-tools-menu" },
        align: 18,
    },
};
