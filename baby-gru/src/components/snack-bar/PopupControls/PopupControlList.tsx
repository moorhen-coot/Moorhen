import React from "react";
import { moorhen } from "@/types/moorhen";
import { AcceptRejectDragAtoms } from "./AcceptRejectDragAtoms";
import { AcceptRejectRotateTranslate } from "./AcceptRejectRotateTranslate";
import { AtomInfo } from "./AtomInfo";
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
];
