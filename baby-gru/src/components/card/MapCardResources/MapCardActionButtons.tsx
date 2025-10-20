import {
    DownloadOutlined,
    FileCopyOutlined,
    FilterTiltShiftOutlined,
    Settings,
    VisibilityOffOutlined,
    VisibilityOutlined,
} from "@mui/icons-material";
import { MenuItem } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { Button, DropdownButton } from "react-bootstrap";
import { useDispatch } from "react-redux";
import { addMap } from "../../../store/mapsSlice";
import { moorhen } from "../../../types/moorhen";
import { MoorhenMapInfoCard } from "./MoorhenMapInfoCard";
import { MoorhenDeleteDisplayObjectMenuItem } from "../../menu-item/MoorhenDeleteDisplayObjectMenuItem";
import { MoorhenRenameDisplayObjectMenuItem } from "../../menu-item/MoorhenRenameDisplayObjectMenuItem";
import { MoorhenScaleMap } from "../../menu-item/MoorhenScaleMap";
import { MoorhenSetMapWeight } from "../../menu-item/MoorhenSetMapWeight";

interface ActionButtonPropsType {
    map: moorhen.Map;
    mapIsVisible?: boolean;
    isCollapsed: boolean;
    onCollapseToggle?: () => void;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
    maxWidth: number;
}

type ActionButtonType = {
    label: string;
    key: string;
    action: () => void;
    icon?: React.JSX.Element;
    disabled: boolean;
};

type MenuItemType = {
    label: string;
    key: string;
    menuItem?: React.JSX.Element;
};

export const MapCardActionButtons = (props: ActionButtonPropsType) => {
    const dispatch = useDispatch();
    false;

    const handleCopyMap = async () => {
        const newMap = await props.map.copyMap();
        dispatch(addMap(newMap));
    };

    // const actionButtons: { [key: number]: MenuItemType } = {

    //     4: {
    //         label: "Copy map",
    //         key: "copy-map",
    //         action: handleCopyMap,
    //     },
    //     5: {
    //         label: "Download Map",
    //         key: "download-map",
    //         action: handleDownload,
    //     },

    //     6: {
    //         label: "Set map weight...",
    //         key: "set-map-weight",
    //         menuItem: (

    //         ),
    //     },
    //     7: {
    //         label: "Set map scale...",
    //         key: "scale-map",
    //         menuItem: (
    //             <MoorhenScaleMap key="scale-map" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />
    //         ),
    //     },
    //     8: {
    //         label: "Map information...",
    //         key: "info-map",
    //         menuItem: (
    //             <MoorhenMapInfoCard key="info-map" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />
    //         ),
    //     },
    //     99: {
    //         label: "Delete map",
    //         key: "delete-map",
    //         menuItem: <MoorhenDeleteDisplayObjectMenuItem key="delete-map" setPopoverIsShown={setPopoverIsShown} item={props.map} />,
    //     },
    };

    const maximumAllowedWidth = props.maxWidth;
    let currentlyUsedWidth = 0;
    const expandedButtons: React.JSX.Element[] = [];
    const compressedButtons: React.JSX.Element[] = [];


    return (
        <>
            <DropdownButton title={<Settings />} size="sm" variant="outlined" autoClose={popoverIsShown ? false : "outside"}>
                {compressedButtons}
            </DropdownButton>
        </>
    );
};
