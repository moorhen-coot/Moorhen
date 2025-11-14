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

export const createMainMenu = (): MenuMap => ({
    1: {
        label: "File",
        icon: <MoorhenIcon name={`MUISymbolFileOpen`} className="moorhen__icon__menu" alt="Ligand" />,
        component: FileMenu,
        props: { dropdownId: "file-menu" },
        align: -2,
    },
    2: {
        label: "Edit",
        icon: <MoorhenIcon name={`MUISymbolEdit`} className="moorhen__icon__menu" alt="Edit" />,
        component: EditMenu,
        props: { dropdownId: "edit-menu" },
        align: 2,
    },
    3: {
        label: "Calculate",
        icon: <MoorhenIcon name={`MUISymbolCalculate`} className="moorhen__icon__menu" alt="Calculate" />,
        component: CalculateMenu,
        props: { dropdownId: "calculate-menu" },
        align: 3,
    },
    4: {
        label: "View",
        icon: <MoorhenIcon name={`MUISymbolVisibility`} className="moorhen__icon__menu" alt="View" />,
        component: ViewMenu,
        props: { dropdownId: "view-menu" },
        align: 6,
    },
    5: {
        label: "Validation",
        icon: <MoorhenIcon name={`MUISymbolFactCheck`} className="moorhen__icon__menu" alt="Validation" />,
        component: ValidationMenu,
        props: { dropdownId: "validation-menu" },
        align: 3,
    },
    6: {
        label: "Ligand",
        icon: <MoorhenIcon name={`ligand`} className="moorhen__icon__menu" alt="Ligand" />,
        component: LigandMenu,
        props: { dropdownId: "ligand-menu" },
        align: 8,
    },
    7: {
        label: "Models",
        icon: <MoorhenIcon name={`menu-models`} className="moorhen__icon__menu" alt="Models" />,
        component: modalKeys.MODELS,
        props: { dropdownId: "models-menu" },
    },
    8: {
        label: "Maps",
        icon: <MoorhenIcon name={`menu-maps`} className="moorhen__icon__menu" alt="Maps" />,
        component: modalKeys.MAPS,
        props: { dropdownId: "maps-menu" },
    },
    9: {
        label: "Map Tools",
        icon: <MoorhenIcon name={`MUISymbolConstruction`} className="moorhen__icon__menu" alt="Map Tools" />,
        component: MapToolsMenu,
        props: { dropdownId: "map-tools-menu" },
        align: 12,
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
        component: PreferencesMenu,
        props: { dropdownId: "preferences-menu" },
        align: -2,
    },
    12: {
        label: "Help",
        icon: <MoorhenIcon name={`MUISymbolHelp`} className="moorhen__icon__menu" alt="Help" />,
        component: HelpMenu,
        props: { dropdownId: "help-menu" },
        align: 17,
    },
    13: {
        label: "Dev tools",
        icon: <MoorhenIcon name={`MUISymbolExperiment`} className="moorhen__icon__menu" alt="Dev tools" />,
        component: MoorhenDevMenu,
        props: { dropdownId: "dev-tools-menu" },
        align: 15,
    },
});
