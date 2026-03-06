import React from "react";
import { MoorhenSVG } from "../../icons";
import { MoorhenSceneSettings } from "../../modal/MoorhenSceneSettingsModal";
import { MapsPanel } from "./MapsPanel";
import { ModelsPanel } from "./ModelsPanel";
import { SidePanelContainer } from "./utils/SidePanelContainer";

export type BuiltinPanelIDs = "models" | "maps" | "sceneSettings";
export type PanelIDs = BuiltinPanelIDs | (string & {});

export type MoorhenPanel = { icon: MoorhenSVG; label: string; panelContent: React.JSX.Element };

export const PanelsList: Record<string, MoorhenPanel> = {
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
