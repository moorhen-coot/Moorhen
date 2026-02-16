import React from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenSceneSettings } from "../../modal/MoorhenSceneSettingsModal";
import { MoorhenSlidersSettings } from "../../modal/MoorhenSceneSlidersModal";
import { MapsPanel } from "./MapsPanel";
import { ModelsPanel } from "./ModelsPanel";
import { SidePanelContainer } from "./utils/SidePanelContainer";

export type PanelIDs = "models" | "maps" | "sceneSettings" | "sceneSettingsII";

export type MoorhenPanel = { icon: MoorhenSVG; label: string; panelContent: React.JSX.Element };

export const PanelsList: Partial<Record<PanelIDs, MoorhenPanel>> = {
    maps: { icon: "menuMaps", label: "Maps", panelContent: <MapsPanel /> },
    models: { icon: "menuModels", label: "Models", panelContent: <ModelsPanel /> },
    sceneSettings: {
        icon: "MatSymVisibility",
        label: "SceneSettings",
        panelContent: (
            <SidePanelContainer title="Scene Settings">
                <MoorhenSceneSettings stackDirection="vertical" />
            </SidePanelContainer>
        ),
    },
    sceneSettingsII: {
        icon: "MatSymVisibility",
        label: "SceneSettingsII",
        panelContent: (
            <SidePanelContainer title="Side on sliders">
                <MoorhenSlidersSettings stackDirection="vertical" />
            </SidePanelContainer>
        ),
    },
};
