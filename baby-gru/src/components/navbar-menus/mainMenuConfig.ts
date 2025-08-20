import React from "react";
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

export type MenuEntry<T = unknown> = {
    label: string;
    icon: React.JSX.Element;
    component: React.JSX.Element;
};

export type MenuMap = {
    [key: number]: MenuEntry;
};


export const MENU_CONFIG: MenuMap = {
    1: {label: "File", 
        icon: <DescriptionOutlined/>, 
        component: MoorhenFileMenu },
};