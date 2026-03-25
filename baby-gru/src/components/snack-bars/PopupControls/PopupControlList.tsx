import React from "react";
import { moorhen } from "@/types/moorhen";
import { RepresentationStyles } from "@/utils";
import { AcceptRejectDragAtoms } from "./AcceptRejectDragAtoms";
import { AcceptRejectMatchingLigand } from "./AcceptRejectMatchingLigand";
import { AcceptRejectRotateTranslate } from "./AcceptRejectRotateTranslate";
import { AtomInfo } from "./AtomInfo";
import { GoToResidue } from "./GoToResidue";
import { MapContourLevel } from "./MapContourLevel";
import { ModelTrajectory } from "./ModelTrajectory";
import { ResidueSelectionControls } from "./ResidueSelection";
import { RotamerChange } from "./RotamerChange";
import { Screenshot } from "./ScreenshotControls";
import { VideoRecording } from "./VideoRecording";

type PayloadType = Record<string, string | string[] | number | number[] | boolean | boolean[] | moorhen.ResidueSpec>;

type ValidatePayloadMap<T extends Record<string, PayloadType | undefined>> = T;

type PayloadMap = ValidatePayloadMap<{
    screenshot: undefined;
    acceptRejectDraggingAtoms: { molNo: number; fragmentCid: string | string[]; drawSelectionOnClose?: boolean };
    acceptRejectRotateTranslate: { molNo: number; fragmentCid: string; drawSelectionOnClose?: boolean };
    selectionTools: undefined;
    atomInfo: { molNo: number; fragmentCid: string };
    changeRotamer: { molNo: number; chosenAtom: moorhen.ResidueSpec };
    videoRecorder: undefined;
    mapContourLvl: { molNo: number; mapPrecision: number };
    trajectory: { molNo: number; style: RepresentationStyles };
    acceptRejectMatchingLigand: { movingMolNo: number; refMolNo: number; movingLigandCid: string; refLigandCid: string };
    goToResidue: undefined;
}>;

type PopupControl = {
    name: string;
    component: React.JSX.Element;
};

export type ShownControl = {
    [K in keyof PayloadMap]: {
        name: K;
        payload?: PayloadMap[K];
    };
}[keyof PayloadMap];

export const PopupControlList: PopupControl[] = [
    {
        name: "screenshot",
        component: <Screenshot />,
    },
    {
        name: "acceptRejectDraggingAtoms",
        component: <AcceptRejectDragAtoms />,
    },
    {
        name: "acceptRejectRotateTranslate",
        component: <AcceptRejectRotateTranslate />,
    },
    {
        name: "selectionTools",
        component: <ResidueSelectionControls />,
    },
    {
        name: "changeRotamer",
        component: <RotamerChange />,
    },
    {
        name: "videoRecorder",
        component: <VideoRecording />,
    },
    {
        name: "atomInfo",
        component: <AtomInfo />,
    },
    {
        name: "mapContourLvl",
        component: <MapContourLevel />,
    },
    {
        name: "trajectory",
        component: <ModelTrajectory />,
    },
    {
        name: "acceptRejectMatchingLigand",
        component: <AcceptRejectMatchingLigand />,
    },
    {
        name: "goToResidue",
        component: <GoToResidue />,
    },
];
