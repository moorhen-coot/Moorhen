import { doDownload } from "../../../utils/utils";
import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { hideMap, showMap } from "../../../store/mapContourSettingsSlice";
import { addMap } from "../../../store/mapsSlice";
import { MoorhenRenameDisplayObjectMenuItem } from "../../menu-item/MoorhenRenameDisplayObjectMenuItem";
import { MoorhenDeleteDisplayObjectMenuItem } from "../../menu-item/MoorhenDeleteDisplayObjectMenuItem";
import { MoorhenSetMapWeight } from "../../menu-item/MoorhenSetMapWeight";
import { MoorhenScaleMap } from "../../menu-item/MoorhenScaleMap";
import { MoorhenMapInfoCard } from "../../card/MoorhenMapInfoCard";
import { MenuItem } from "@mui/material";
import { Button, DropdownButton } from "react-bootstrap";
import {
    VisibilityOffOutlined,
    VisibilityOutlined,
    ExpandMoreOutlined,
    ExpandLessOutlined,
    DownloadOutlined,
    Settings,
    FileCopyOutlined,
    FilterTiltShiftOutlined,
} from "@mui/icons-material";
import { moorhen } from "../../../types/moorhen";
import { webGL } from "../../../types/mgWebGL";
import Tooltip from "@mui/material/Tooltip";
import { setRequestDrawScene } from "../../../store/glRefSlice";

interface ActionButtonPropsType {
    map: moorhen.Map;
    mapIsVisible?: boolean;
    isCollapsed: boolean;
    onCollapseToggle?: () => void;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
    glRef: React.MutableRefObject<null | webGL.MGWebGL>;
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
    const [popoverIsShown, setPopoverIsShown] = useState<boolean>(false);
    const handleDownload = async () => {
        let response = await props.map.getMap();
        doDownload([response.data.result.mapData], `${props.map.name.replace(".mtz", ".map")}`);
    };

    const handleVisibility = useCallback(() => {
        dispatch(props.mapIsVisible ? hideMap(props.map) : showMap(props.map));
        dispatch(setRequestDrawScene());
    }, [props.mapIsVisible]);

    const handleCopyMap = async () => {
        const newMap = await props.map.copyMap();
        dispatch(addMap(newMap));
    };

    const actionButtons: { [key: number]: ActionButtonType | MenuItemType } = {
        1: {
            label: props.mapIsVisible ? "Hide map" : "Show map",
            key: "hide-show-map",
            action: handleVisibility,
            icon: props.mapIsVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />,
            disabled: false,
        },

        2: {
            label: "Centre on map",
            key: "centre-on-map",
            action: () => {
                props.map.centreOnMap();
            },
            icon: <FilterTiltShiftOutlined />,
            disabled: !props.mapIsVisible,
        },
        3: {
            label: "Rename map",
            key: "Rename-map",
            menuItem: (
                <MoorhenRenameDisplayObjectMenuItem
                    key="rename-map"
                    setPopoverIsShown={setPopoverIsShown}
                    item={props.map}
                    setCurrentName={props.setCurrentName}
                />
            ),
        },

        4: {
            label: "Copy map",
            key: "copy-map",
            action: handleCopyMap,
            icon: <FileCopyOutlined />,
        },
        5: {
            label: "Download Map",
            key: "download-map",
            action: handleDownload,
            icon: <DownloadOutlined />,
        },

        6: {
            label: "Set map weight...",
            key: "set-map-weight",
            menuItem: <MoorhenSetMapWeight key="set-map-weight" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />,
        },
        7: {
            label: "Set map scale...",
            key: "scale-map",
            menuItem: <MoorhenScaleMap key="scale-map" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />,
        },
        8: {
            label: "Map information...",
            key: "info-map",
            menuItem: <MoorhenMapInfoCard key="info-map" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />,
        },
        99: {
            label: "Delete map",
            key: "delete-map",
            menuItem: <MoorhenDeleteDisplayObjectMenuItem key="delete-map" setPopoverIsShown={setPopoverIsShown} glRef={props.glRef} item={props.map} />,
        },
    };

    const maximumAllowedWidth = props.maxWidth;
    let currentlyUsedWidth = 0;
    let expandedButtons:React.JSX.Element[] = [];
    let compressedButtons:React.JSX.Element[] = [];

    Object.keys(actionButtons).forEach((key) => {
        if ("menuItem" in actionButtons[key]) {
            compressedButtons.push(actionButtons[key].menuItem as React.JSX.Element);
        } else if ("icon" in actionButtons[key] && currentlyUsedWidth < maximumAllowedWidth) {
            currentlyUsedWidth += 60;
            const button = (
                <Tooltip key={`tooltip-${key}`} title={actionButtons[key].label} placement="top">
                    <Button
                        key={`button-${key}`}
                        size="sm"
                        variant="outlined"
                        onClick={() => {
                            actionButtons[key].action?.();
                        }}
                        disabled={actionButtons[key].disabled}
                    >
                        {actionButtons[key].icon}
                    </Button>
                </Tooltip>
            );
            expandedButtons.push(button as React.JSX.Element);
        } else {
            const menuItem = (
                <MenuItem
                    key={`menu-${key}`}
                    onClick={() => {
                        actionButtons[key].action?.();
                    }}
                >
                    {actionButtons[key].label}
                </MenuItem>
            );
            compressedButtons.push(menuItem as React.JSX.Element);
        }
    });
    
    return (
        <>
            {expandedButtons}
            <DropdownButton title={<Settings />} size="sm" variant="outlined" autoClose={popoverIsShown ? false : "outside"}>
                {compressedButtons}
            </DropdownButton>

            <Button
                size="sm"
                variant="outlined"
                onClick={() => {
                    props.onCollapseToggle();
                }}
            >
                {props.isCollapsed ? <ExpandMoreOutlined /> : <ExpandLessOutlined />}
            </Button>
        </>
    );
};
