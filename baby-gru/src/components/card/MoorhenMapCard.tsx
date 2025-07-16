import { useState, useRef } from "react";
import { Card, Col, Stack, ToggleButton } from "react-bootstrap";
import { convertRemToPx, convertPxToRem } from "../../utils/utils";
import { getNameLabel } from "./cardUtils";
import { RadioButtonCheckedOutlined, RadioButtonUncheckedOutlined } from "@mui/icons-material";
import { MapHistogramAccordion } from "./MapCardResources/MapHistogramAccordion";
import { MoorhenSlider } from "../inputs/MoorhenSlider";
import { moorhen } from "../../types/moorhen";
import { useSelector, useDispatch, batch } from "react-redux";
import { setActiveMap } from "../../store/generalStatesSlice";
import { setContourLevel, setMapRadius } from "../../store/mapContourSettingsSlice";
import { useFastContourMode } from "../../hooks/useFastContourMode";
import { MoorhenPreciseInput } from "../inputs/MoorhenPreciseInput";
import { MapSettingsAccordion } from "./MapCardResources/MapSettingsAccordion";
import { MapColourSelector } from "./MapCardResources/MapColourSelector";
import { MapCardActionButtons } from "./MapCardResources/MapCardActionButtons";

interface MoorhenMapCardPropsInterface extends moorhen.CollectedProps {
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
        const map = state.mapContourSettings.mapRadii.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.radius;
        } else {
            return initialRadius;
        }
    });

    const mapContourLevel = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.contourLevels.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.contourLevel;
        } else {
            return initialContour;
        }
    });
    const mapStyle = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapStyles.find((item) => item.molNo === props.map.molNo);
        if (map) {
            return map.style;
        } else {
            return state.mapContourSettings.defaultMapSurface ? "solid" : state.mapContourSettings.defaultMapLitLines ? "lit-lines" : "lines";
        }
    });

    const mapOpacity = useSelector((state: moorhen.State) => {
        const map = state.mapContourSettings.mapAlpha.find((item) => item.molNo === props.map.molNo);
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
        fastRadius: 20,
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

    const [currentName, setCurrentName] = useState<string>(props.map.name);

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

    return (
        <>
            <Card
                className="px-0"
                style={{
                    display: "flex",
                    minWidth: convertRemToPx(28),
                    marginBottom: "0.5rem",
                    padding: "0",
                }}
                key={props.map.molNo}
            >
                <Card.Header style={{ padding: "0.1rem" }}>
                    <Stack gap={2} direction="horizontal">
                        <Col
                            className="align-items-center"
                            style={{
                                display: "flex",
                                justifyContent: "left",
                                color: isDark ? "white" : "black",
                            }}
                        >
                            {getNameLabel(props.map, labelSpace)}
                            <MapColourSelector map={props.map} mapIsVisible={mapIsVisible} />
                        </Col>
                        <Col style={{ display: "flex", justifyContent: "right" }}>
                            <MapCardActionButtons
                                map={props.map}
                                mapIsVisible={mapIsVisible}
                                isCollapsed={props.isCollapsed}
                                onCollapseToggle={handleCollapseToggle}
                                setCurrentName={setCurrentName}
                                glRef={props.glRef}
                                maxWidth={actionButtonSpace}
                            />
                        </Col>
                    </Stack>
                </Card.Header>
                <Card.Body
                    style={{
                        display: props.isCollapsed ? "none" : "",
                        padding: "0.5rem",
                    }}
                >
                    <Stack direction="vertical" gap={1}>
                        <Stack direction="horizontal" gap={4}>
                            <ToggleButton
                                id={`active-map-toggle-${props.map.molNo}`}
                                type="checkbox"
                                variant={isDark ? "outline-light" : "outline-primary"}
                                checked={props.map === activeMap}
                                style={{
                                    marginLeft: "0.1rem",
                                    marginRight: "0.5rem",
                                    justifyContent: "space-betweeen",
                                    display: "flex",
                                    width: "8rem",
                                }}
                                onClick={() => dispatch(setActiveMap(props.map))}
                                value={""}
                            >
                                {props.map === activeMap ? <RadioButtonCheckedOutlined /> : <RadioButtonUncheckedOutlined />}
                                <span style={{ marginLeft: "0.5rem" }}>{props.map === activeMap ? "Active" : "Inactive"}</span>
                            </ToggleButton>
                            <Stack direction="vertical" style={{ justifyContent: "center" }}>
                                <div className="moorhen__stack__row">
                                    <MoorhenPreciseInput
                                        value={mapContourLevel}
                                        setValue={(newVal) => {
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
                                            setValue={(newVal) => {
                                                handleContourLevelChange(+newVal * props.map.mapRmsd);
                                            }}
                                            label={"RMSD:"}
                                            decimalDigits={2}
                                            disabled={!mapIsVisible}
                                            waitReturn={true}
                                        />
                                    )}
                                </div>
                                <MoorhenSlider
                                    minVal={props.map.isEM ? props.map.levelRange[0] * 10 : 0.01}
                                    maxVal={props.map.levelRange[1]}
                                    showMinMaxVal={false}
                                    decimalPlaces={props.map.isEM ? Math.abs(Math.floor(Math.log10(props.map.levelRange[0]))) : 2}
                                    showButtons={true}
                                    logScale={true}
                                    isDisabled={!mapIsVisible}
                                    externalValue={mapContourLevel}
                                    setExternalValue={(newVal) => {
                                        handleContourLevelChange(newVal);
                                    }}
                                    piWaitReturn={true}
                                />
                            </Stack>
                        </Stack>
                        <MapHistogramAccordion map={props.map} currentContourLevel={mapContourLevel} />
                        <MapSettingsAccordion map={props.map} mapIsVisible={mapIsVisible} mapStyle={mapStyle} mapRadius={mapRadius} mapOpacity={mapOpacity} />
                    </Stack>
                </Card.Body>
            </Card>{" "}
        </>
    );
};
