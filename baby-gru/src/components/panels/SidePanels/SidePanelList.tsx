import React from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenSceneSettings } from "../../modal/MoorhenSceneSettingsModal";
import { MapsPanel } from "./MapsPanel";
import { ModelsPanel } from "./ModelsPanel";
import { SidePanelContainer } from "./utils/SidePanelContainer";

export type PanelIDs = "models" | "maps" | "sceneSettings";

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
};
