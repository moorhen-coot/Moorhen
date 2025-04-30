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
import { convertRemToPx } from "../../../utils/utils";
import { moorhen } from "../../../types/moorhen";
import { webGL } from "../../../types/mgWebGL";

interface ActionButtonPropsType {
    map: moorhen.Map;
    mapIsVisible?: boolean;
    setCurrentName: React.Dispatch<React.SetStateAction<string>>;
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
    glRef: React.MutableRefObject<null | webGL.MGWebGL>;
}

type ActionButtonType = {
    label: string;
    compressed: () => JSX.Element;
    expanded: null | (() => JSX.Element);
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
    }, [props.mapIsVisible]);

    const handleCopyMap = async () => {
        const newMap = await props.map.copyMap();
        dispatch(addMap(newMap));
    };

    const actionButtons: { [key: number]: ActionButtonType } = {
        1: {
            label: props.mapIsVisible ? "Hide map" : "Show map",
            compressed: () => {
                return (
                    <MenuItem key="hide-show-map" onClick={handleVisibility}>
                        {props.mapIsVisible ? "Hide map" : "Show map"}
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <Button key="hide-show-map" size="sm" variant="outlined" onClick={handleVisibility}>
                        {props.mapIsVisible ? <VisibilityOutlined /> : <VisibilityOffOutlined />}
                    </Button>
                );
            },
        },

        2: {
            label: "Centre on map",
            compressed: () => {
                return (
                    <MenuItem key="centre-on-map" onClick={() => props.map.centreOnMap()}>
                        Centre on map
                    </MenuItem>
                );
            },
            expanded: () => {
                return (
                    <Button key="centre-on-map" size="sm" variant="outlined" onClick={() => props.map.centreOnMap()} disabled={!props.mapIsVisible}>                
                        <FilterTiltShiftOutlined />
                    </Button>
                );
            },
        },
            3: {
                label: "Rename map",
                compressed: () => {
                    return (
                        <MoorhenRenameDisplayObjectMenuItem
                            key="rename-map"
                            setPopoverIsShown={setPopoverIsShown}
                            setCurrentName={props.setCurrentName}
                            item={props.map}
                        />
                    );
                },
                expanded: null,
            },

            4: {
                label: "Copy map",
                compressed: () => {
                    return (
                        <MenuItem key="copy-map" onClick={handleCopyMap}>
                            Copy map
                        </MenuItem>
                    );
                },
                expanded: () => {
                    return (
                        <Button key="copy-map" size="sm" variant="outlined" onClick={handleCopyMap}>
                            <FileCopyOutlined />
                        </Button>
                    );
                },
            },
            5: {
                label: "Download Map",
                compressed: () => {
                    return (
                        <MenuItem key="donwload-map" onClick={handleDownload}>
                            Download map
                        </MenuItem>
                    );
                },
                expanded: () => {
                    return (
                        <Button key="donwload-map" size="sm" variant="outlined" onClick={handleDownload}>
                            <DownloadOutlined />
                        </Button>
                    );
                },
            },
        6: {
            label: "Set map weight...",
            compressed: () => {
                return <MoorhenSetMapWeight key="set-map-weight" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />;
            },
            expanded: null,
        },
        7: {
            label: "Set map scale...",
            compressed: () => {
                return <MoorhenScaleMap key="scale-map" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />;
            },
            expanded: null,
        },
        8: {
            label: "Map information...",
            compressed: () => {
                return <MoorhenMapInfoCard key="info-map" disabled={!props.mapIsVisible} map={props.map} setPopoverIsShown={setPopoverIsShown} />;
            },
            expanded: null,
        },
    };

    const minWidth = convertRemToPx(28);
    const maximumAllowedWidth = minWidth * 0.55;
    let currentlyUsedWidth = 0;
    let expandedButtons: JSX.Element[] = [];
    let compressedButtons: JSX.Element[] = [];

    Object.keys(actionButtons).forEach((key) => {
        if (actionButtons[key].expanded === null) {
            compressedButtons.push(actionButtons[key].compressed());
        } else {
            currentlyUsedWidth += 60;
            if (currentlyUsedWidth < maximumAllowedWidth) {
                expandedButtons.push(actionButtons[key].expanded());
            } else {
                compressedButtons.push(actionButtons[key].compressed());
            }
        }
    });

    compressedButtons.push(<MoorhenDeleteDisplayObjectMenuItem key="delete-map" setPopoverIsShown={setPopoverIsShown} glRef={props.glRef} item={props.map} />);
    return (
        <>
            {expandedButtons}
            <DropdownButton
                title={<Settings />}
                size="sm"
                variant="outlined"
                autoClose={popoverIsShown ? false : "outside"}
            >
                {compressedButtons}
            </DropdownButton>
            <Button
                size="sm"
                variant="outlined"
                onClick={() => {
                    props.setIsCollapsed(!props.isCollapsed);
                }}
            >
                {props.isCollapsed ? <ExpandMoreOutlined /> : <ExpandLessOutlined />}
            </Button>
        </>
    );
};
