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
import { MoorhenPopoverButton, MoorhenPreciseInput, MoorhenSlider } from "../../inputs";
import { MoorhenButton } from "../../inputs";
import { MoorhenAccordion, MoorhenMenuItemPopover } from "../../interface-base";
import { MoorhenStack } from "../../interface-base";
import { MoorhenMenuItem } from "../../interface-base/MenuItems/MenuItem";
import { DeleteDisplayObject, SetMapWeight } from "../../menu-item";
import { ItemName } from "../utils/ItemName";
import { MapColourSelector } from "./MapColourSelector";
import { MapHistogramAccordion } from "./MapHistogramAccordion";
import { MapSettingsAccordion } from "./MapSettingsAccordion";
import { MoorhenMapInfoCard } from "./MoorhenMapInfoCard";

type MoorhenMapCardPropsInterface = {
    map: moorhen.Map;
    initialContour?: number;
    initialRadius?: number;
    modalWidth?: number;
    isOpen?: boolean;
    onCollapseToggle?: (key: number, isOpen: boolean) => void;
};

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

    const activeMap = useSelector((state: moorhen.State) => state.generalStates.activeMap);
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

    const cardTitle = useMemo(() => {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                <span style={{ flexShrink: 0 }}>#{props.map.molNo}</span>
                <MapColourSelector map={props.map} mapIsVisible={mapIsVisible} />
                <div style={{ minWidth: 0, flex: "1 1 0" }}>
                    <ItemName item={props.map} />
                </div>
            </div>
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
            icon={`${mapIsVisible ? "MatSymVisibility" : "MatSymVisibilityOff"}`}
            onClick={handleVisibility}
            type="icon-only"
            size="accordion"
            tooltip="Toggle visibility"
        />,
        <MoorhenButton
            key="centre on map"
            type="icon-only"
            icon={`MatSymTiltShiftFilter`}
            onClick={() => {
                props.map.centreOnMap();
            }}
            size="accordion"
            tooltip="Centre on map"
        />,
        <MoorhenButton
            key="download"
            type="icon-only"
            icon={`MatSymDownload`}
            onClick={handleDownload}
            size="accordion"
            tooltip="Save model file"
        />,
        <MoorhenPopoverButton size="accordion" popoverPlacement="left" tooltip="More">
            {dropDownMenu}
        </MoorhenPopoverButton>,
    ];

    return (
        <MoorhenAccordion
            title={cardTitle}
            type="card"
            defaultOpen={true}
            extraControls={extraControls}
            onChange={isOpen => (props.onCollapseToggle ? props.onCollapseToggle(props.map.molNo, isOpen) : () => {})}
            open={props.isOpen}
        >
            <MoorhenStack direction="vertical" gap={1}>
                <MoorhenStack direction="horizontal" gap="1rem" align="center">
                    <MoorhenButton
                        id={`active-map-toggle-${props.map.molNo}`}
                        style={{ minWidth: "6rem" }}
                        type="toggle"
                        checked={props.map === activeMap}
                        onClick={() => dispatch(setActiveMap(props.map))}
                        icon={props.map === activeMap ? "MatSymRadioButtonChecked" : "MatSymRadioButtonUnchecked"}
                    >
                        {props.map === activeMap ? "Active\u00A0\u00A0" : "Inactive"}
                    </MoorhenButton>
                    <MoorhenStack direction="vertical" style={{ justifyContent: "center" }}>
                        <MoorhenStack direction="row" justify="center" align="center">
                            <MoorhenPreciseInput
                                style={{ justifyContent: "center" }}
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
                                    style={{ justifyContent: "center" }}
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
