import "./main-menu.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { MoorhenIcon } from "../icons";
import {
    CalculateOutlined,
    DescriptionOutlined,
    EditOutlined,
    VisibilityOutlined,
    FactCheckOutlined,
    HelpOutlineOutlined,
    MenuOutlined,
    ScienceOutlined,
    SettingsSuggestOutlined,
    CloseOutlined,
    HistoryOutlined,
    ConstructionOutlined,
    VpnLock,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { convertRemToPx, convertViewtoPx } from "../../utils/utils";
import { moorhen } from "../../types/moorhen";
import { showModal } from "../../store/modalsSlice";
import { modalKeys } from "../../utils/enums";
import { useMoorhenGlobalInstance } from "../../InstanceManager";
import { MoorhenFileMenu } from "./MoorhenFileMenu";
import { MoorhenPreferencesMenu } from "./MoorhenPreferencesMenu";
import { MoorhenHelpMenu } from "./MoorhenHelpMenu";
import { MoorhenViewMenu } from "./MoorhenViewMenu";
import { MoorhenLigandMenu } from "./MoorhenLigandMenu";
import { MoorhenHistoryMenu } from "./MoorhenHistoryMenu";
import { MoorhenEditMenu } from "./MoorhenEditMenu";
import { MoorhenDevMenu } from "./MoorhenDevMenu";
import { MoorhenMapToolsMenu } from "./MoorhenMapToolsMenu";
import { MoorhenValidationMenu } from "./MoorhenValidationMenu";
import { MoorhenCalculateMenu } from "./MoorhenCalculateMenu";
import { ClickAwayListener } from "@mui/material";

export type MenuEntry<T = unknown> = {
    label: string;
    icon: React.JSX.Element;
    component: React.ElementType | string;
    props?: { [key: string]: unknown };
};

export type MenuMap = {
    [key: number]: MenuEntry;
};

const MAIN_MENU_CONFIG = {
    1: {
        label: "File",
        icon: <DescriptionOutlined />,
        component: MoorhenFileMenu,
        props: { dropdownId: "file-menu" },
    },
    2: {
        label: "Edit",
        icon: <EditOutlined />,
        component: MoorhenEditMenu,
        props: { dropdownId: "edit-menu" },
    },
    3: {
        label: "Calculate",
        icon: <CalculateOutlined />,
        component: MoorhenCalculateMenu,
        props: { dropdownId: "calculate-menu" },
    },
    4: {
        label: "View",
        icon: <VisibilityOutlined />,
        component: MoorhenViewMenu,
        props: { dropdownId: "view-menu" },
    },
    5: {
        label: "Validation",
        icon: <FactCheckOutlined />,
        component: MoorhenValidationMenu,
        props: { dropdownId: "validation-menu" },
    },
    6: {
        label: "Ligand",
        icon: <MoorhenIcon name={`menu-ligands`} size="medium" alt="Ligand" />,
        component: MoorhenLigandMenu,
        props: { dropdownId: "ligand-menu" },
    },
    7: {
        label: "Map Tools",
        icon: <ConstructionOutlined />,
        component: MoorhenMapToolsMenu,
        props: { dropdownId: "map-tools-menu" },
    },
    8: {
        label: "Models",
        icon: <MoorhenIcon name={`menu-models`} size="medium" alt="Models" />,
        component: "MoorhenModelsMenu",
        props: { dropdownId: "models-menu" },
    },
    9: {
        label: "Maps",
        icon: <MoorhenIcon name={`menu-maps`} size="medium" alt="Maps" />,
        component: "MoorhenMapsMenu",
        props: { dropdownId: "maps-menu" },
    },
    10: {
        label: "History",
        icon: <HistoryOutlined />,
        component: MoorhenHistoryMenu,
        props: { dropdownId: "history-menu" },
    },
    11: {
        label: "Preferences",
        icon: <SettingsSuggestOutlined />,
        component: MoorhenPreferencesMenu,
        props: { dropdownId: "preferences-menu" },
    },
    12: {
        label: "Help",
        icon: <HelpOutlineOutlined />,
        component: MoorhenHelpMenu,
        props: { dropdownId: "help-menu" },
    },
};

export const MoorhenMainMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    const subMenu = useMemo(() => {
        if (!activeMenu) return null;
        const menu = Object.values(MAIN_MENU_CONFIG).find((m) => m.label === activeMenu);
        return menu ? <menu.component {...menu.props} /> : null;
    }, [activeMenu]);

    const menu = useMemo(() => {
        if (!isOpen) return null;
        return (
            <div className="moorhen__main-menu">
                {Object.entries(MAIN_MENU_CONFIG).map(([key, menu]) => (
                    <MenuComponent
                        key={key}
                        icon={menu.icon}
                        label={menu.label}
                        onClick={() => setActiveMenu(menu.label)}
                    />
                ))}
            </div>
        );
    }, [isOpen]);

    return (
        <ClickAwayListener onClickAway={() => setActiveMenu(null)}>
            <div className="moorhen__main-menu-container">
                <div className="moorhen__main-menu-buttons-container">
                    <button className="moorhen__main-menu-toggle" onClick={() => setIsOpen(!isOpen)}>
                        <MenuOutlined />
                        &nbsp;&nbsp;
                        <MoorhenIcon name={`MoorhenLogo`} size="medium" alt="Maps" className="moorhen__main-logo" />
                    </button>
                    {menu}
                </div>
                <div className="moorhen__sub-menu-container">{subMenu}</div>
            </div>
        </ClickAwayListener>
    );
};

const MenuComponent = (props: { icon: React.JSX.Element; label: string; onClick: () => void }) => {
    return (
        <button className="moorhen__main-menu-button" onClick={props.onClick}>
            {props.icon}
            &nbsp;&nbsp;&nbsp;
            {props.label}
        </button>
    );
};
