import { RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import { useMemo, useState } from "react";
import { useFastContourMode } from "../../../hooks/useFastContourMode";
import { setActiveMap } from "../../../store/generalStatesSlice";
import { setRequestDrawScene } from "../../../store/glRefSlice";
import { hideMap, showMap } from "../../../store/mapContourSettingsSlice";
import { setContourLevel } from "../../../store/mapContourSettingsSlice";
import { addMap } from "../../../store/mapsSlice";
import { moorhen } from "../../../types/moorhen";
import { convertPxToRem, convertRemToPx } from "../../../utils/utils";
import { doDownload } from "../../../utils/utils";
import { MoorhenPopoverButton, MoorhenPreciseInput, MoorhenSlider, MoorhenToggle } from "../../inputs";
import { MoorhenButton } from "../../inputs";
import { MoorhenAccordion, MoorhenMenuItemPopover } from "../../interface-base";
import { MoorhenStack } from "../../interface-base";
import { MoorhenMenuItem } from "../../interface-base/MenuItems/MenuItem";
import { DeleteDisplayObject, RenameDisplayObject, ScaleMap, SetMapWeight } from "../../menu-item";
import { getNameLabel } from "../cardUtils";
import { MapColourSelector } from "./MapColourSelector";
import { MapHistogramAccordion } from "./MapHistogramAccordion";
import { MapSettingsAccordion } from "./MapSettingsAccordion";
import { MoorhenMapInfoCard } from "./MoorhenMapInfoCard";

interface MoorhenMapCardPropsInterface {
    map: moorhen.Map;
    initialContour?: number;
    initialRadius?: number;
    modalWidth?: number;
    isCollapsed?: boolean;
    onCollapseToggle?: (key: number) => void;
}

export const MoorhenMapCard = (props: MoorhenMapCardPropsInterface) => {
    const { initialContour = 0.8, initialRadius = 13 } = props;

    const mapRadius = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapRadii.find(item => item.molNo === props.map.molNo);
        if (map) {
            return map.radius;
        } else {
            return initialRadius;
        }
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.contourLevels.find(item => item.molNo === props.map.molNo);
        if (map) {
            return map.contourLevel;
        } else {
            return initialContour;
        }
    });
    const mapStyle = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapStyles.find(item => item.molNo === props.map.molNo);
        if (map) {
            return map.style;
        } else {
            return state.mapContourSettings.defaultMapSurface
                ? "solid"
                : state.mapContourSettings.defaultMapLitLines
                  ? "lit-lines"
                  : "lines";
        }
    });

    const mapOpacity = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapAlpha.find(item => item.molNo === props.map.molNo);
        if (map) {
            return map.alpha;
        } else {
            return 1.0;
        }
    });

    const handleCollapseToggle = () => {
        if (props.onCollapseToggle) {
            props.onCollapseToggle(props.map.molNo);
        }
    };

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
    const mapIsVisible = useSelector((state: moorhen.State) => state.mapContourSettings.visibleMaps.includes(props.map.molNo));
    const dispatch = useDispatch();

    const [lastCall, setLastCall] = useState<number>(0);

    const { fastMapContourLevel } = useFastContourMode({
        map: props.map,
        mapRadius,
        radiusThreshold: 25,
        fastRadius: "auto",
        timeoutDelay: 1000,
    });

    const handleContourLevelChange = (newContourLevel: number) => {
        if (!props.map) return;
        if (Date.now() - lastCall < 500) {
            fastMapContourLevel(newContourLevel);
        } else {
            dispatch(setContourLevel({ molNo: props.map.molNo, contourLevel: newContourLevel }));
        }
        setLastCall(Date.now());
    };

    const [, setCurrentName] = useState<string>(props.map.name);

    const getLabelAndActionButtonSpace = () => {
        const buttonToShow = 4;
        let labelSpace = 0;
        let actionButtonSpace = 120;
        const labelLength = props.map.name.length;

        if (props.modalWidth < buttonToShow * 50 + convertRemToPx(18) + 120 && labelLength > 16) {
            labelSpace = convertRemToPx(18);
            actionButtonSpace = props.modalWidth - labelSpace - 120;
        } else {
            actionButtonSpace = buttonToShow * 50;
            labelSpace = props.modalWidth - actionButtonSpace - 100;
        }

        labelSpace = convertPxToRem(labelSpace) * 1.25;
        return [labelSpace, actionButtonSpace];
    };
    const [labelSpace, actionButtonSpace] = getLabelAndActionButtonSpace();
    {
        getNameLabel(props.map, labelSpace);
    }

    const cardTitle = useMemo(() => {
        return (
            <MoorhenStack align="center" direction="line">
                #{props.map.molNo}
                <MapColourSelector map={props.map} mapIsVisible={mapIsVisible} />
                &nbsp;&nbsp;{getNameLabel(props.map, labelSpace)}
            </MoorhenStack>
        );
    }, [props.map]);

    const handleDownload = async () => {
        const response = await props.map.getMap();
        doDownload([response.data.result.mapData], `${props.map.name.replace(".mtz", ".map")}`);
    };

    const handleVisibility = () => {
        dispatch(mapIsVisible ? hideMap(props.map) : showMap(props.map));
        dispatch(setRequestDrawScene()); //this is annoying idk why the map manager doesn't redraw here
    };

    const handleCopyMap = async () => {
        const newMap = await props.map.copyMap();
        dispatch(addMap(newMap));
    };
    const dropDownMenu: React.JSX.Element = (
        <div style={{ display: "flex", flexDirection: "column", width: "150px" }}>
            <MoorhenMenuItem onClick={handleCopyMap}>Copy Map</MoorhenMenuItem>
            <MoorhenMapInfoCard key="info-map" disabled={!mapIsVisible} map={props.map} />
            <MoorhenMenuItemPopover disabled={!mapIsVisible} menuItemText="Set Map Weight">
                <SetMapWeight key="set-map-weight" map={props.map} />
            </MoorhenMenuItemPopover>
            <MoorhenMenuItemPopover menuItemText="Delete Map">
                <DeleteDisplayObject key="delete-map" item={props.map} />
            </MoorhenMenuItemPopover>
        </div>
    );

    const extraControls: React.JSX.Element[] = [
        <MoorhenButton
            key="visibility"
            icon={`${mapIsVisible ? "MUISymbolVisibility" : "MUISymbolVisibilityOff"}`}
            onClick={handleVisibility}
            type="icon-only"
            size="accordion"
            tooltip="Toggle visibility"
        />,
        <MoorhenButton
            key="centre on map"
            type="icon-only"
            icon={`MUISymbolTiltShiftFilter`}
            onClick={() => {
                props.map.centreOnMap();
            }}
            size="accordion"
            tooltip="Centre on map"
        />,
        <MoorhenButton
            key="download"
            type="icon-only"
            icon={`MUISymbolDownload`}
            onClick={handleDownload}
            size="accordion"
            tooltip="Save model file"
        />,
        <MoorhenPopoverButton size="accordion" popoverPlacement="left" tooltip="More">
            {dropDownMenu}
        </MoorhenPopoverButton>,
    ];

    return (
        <MoorhenAccordion title={cardTitle} type="card" defaultOpen={true} extraControls={extraControls}>
            <MoorhenStack direction="vertical" gap={1}>
                <MoorhenStack direction="horizontal" gap={4} align="center">
                    <MoorhenButton
                        id={`active-map-toggle-${props.map.molNo}`}
                        type="toggle"
                        checked={props.map === activeMap}
                        onClick={() => dispatch(setActiveMap(props.map))}
                        style={{ width: "6rem" }}
                        icon={props.map === activeMap ? "MUISymbolRadioButtonChecked" : "MUISymbolRadioButtonUnchecked"}
                    >
                        {props.map === activeMap ? "Active\u00A0\u00A0" : "Inactive"}
                    </MoorhenButton>
                    <MoorhenStack direction="vertical" style={{ justifyContent: "center" }}>
                        <MoorhenStack direction="row" gap={3} justify="center">
                            <MoorhenPreciseInput
                                value={mapContourLevel}
                                setValue={newVal => {
                                    handleContourLevelChange(+newVal);
                                }}
                                label={"Level:"}
                                decimalDigits={props.map.isEM ? Math.abs(Math.floor(Math.log10(props.map.levelRange[0]))) : 2}
                                allowNegativeValues={true}
                                disabled={!mapIsVisible}
                                waitReturn={true}
                            />
                            &nbsp;
                            {props.map.mapRmsd && (
                                <MoorhenPreciseInput
                                    allowNegativeValues={true}
                                    value={mapContourLevel / props.map.mapRmsd}
                                    setValue={newVal => {
                                        handleContourLevelChange(+newVal * props.map.mapRmsd);
                                    }}
                                    label={"RMSD:"}
                                    decimalDigits={2}
                                    disabled={!mapIsVisible}
                                    waitReturn={true}
                                />
                            )}
                        </MoorhenStack>
                        <MoorhenSlider
                            minVal={props.map.isEM ? props.map.levelRange[0] * 10 : 0.01}
                            maxVal={props.map.levelRange[1]}
                            showMinMaxVal={false}
                            decimalPlaces={props.map.isEM ? Math.abs(Math.floor(Math.log10(props.map.levelRange[0]))) : 2}
                            showButtons={true}
                            logScale={true}
                            isDisabled={!mapIsVisible}
                            externalValue={mapContourLevel}
                            setExternalValue={newVal => {
                                handleContourLevelChange(newVal);
                            }}
                            piWaitReturn={true}
                        />
                    </MoorhenStack>
                </MoorhenStack>
                <MapHistogramAccordion map={props.map} currentContourLevel={mapContourLevel} />
                <MapSettingsAccordion
                    map={props.map}
                    mapIsVisible={mapIsVisible}
                    mapStyle={mapStyle}
                    mapRadius={mapRadius}
                    mapOpacity={mapOpacity}
                />
            </MoorhenStack>
        </MoorhenAccordion>
    );
};
