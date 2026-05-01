import React from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenSceneSettings } from "../../modal/MoorhenSceneSettingsModal";
import { MoorhenSlidersSettings } from "../../modal/MoorhenSceneSlidersModal";
import { MoorhenVectors } from "../../modal/MoorhenVectorsModal";
import { Moorhen2DCanvasObjects } from "../../modal/Moorhen2DCanvasObjectsModal";
import { MapsPanel } from "./MapsPanel";
import { ModelsPanel } from "./ModelsPanel";
import { SidePanelContainer } from "./utils/SidePanelContainer";

export type SidePanelIDs = "models" | "maps" | "sceneSettings" | "vectors" | "overlay2DObjects" | (string & {});
export type MoorhenPanel = { icon: MoorhenSVG; label: string; panelContent: React.JSX.Element };
export const PanelsList: Partial<Record<SidePanelIDs, MoorhenPanel>> = {
    maps: { icon: "menuMaps", label: "Maps", panelContent: <MapsPanel /> },
    models: { icon: "menuModels", label: "Models", panelContent: <ModelsPanel /> },
    vectors: {
        icon: "menuVectors",
        label: "Vectors",
        panelContent: (
            <SidePanelContainer title="Vectors">
                <MoorhenVectors/>
            </SidePanelContainer>
        )
    },
    overlay2DObjects: {
        icon: "menu2DObjects",
        label: "2D Objects",
        panelContent: (
            <SidePanelContainer title="2D objects">
                <Moorhen2DCanvasObjects/>
            </SidePanelContainer>
        )
    },
    sceneSettings: {
        icon: "MatSymVisibility",
        label: "SceneSettings",
        panelContent: (
            <SidePanelContainer title="Scene Settings">
                <MoorhenSceneSettings stackDirection="vertical" />
            </SidePanelContainer>
        ),
    },
};
