import { useRef, useState } from "react";
import { DEFAULT_REPRESENTATION_STYLE } from "@/InstanceManager/MoorhenInstance";
import { useMoorhenInstance } from "@/hooks";
import type { RepresentationBackup } from "@/utils/Representation/RepresentationBuilder";
import { MoorhenMenuItem, MoorhenPopover } from "../../interface-base";
import "./scene-selector.css";

const userScenes = ["Default", "Model Building"] as const;
type Scene = (typeof userScenes)[number];

type SceneBackupEntry = { moleculeUniqueId: string; params: RepresentationBackup };

export const UserSceneSelector = () => {
    const [scene, setScene] = useState<Scene>("Default");
    const [isShown, setIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const moorhenInstance = useMoorhenInstance();

    const [representationBackup, setRepresentationBackup] = useState<SceneBackupEntry[]>([]);

    // Only custom reps are swapped between scenes; non-custom ones are left untouched
    const deleteCustomRepresentations = async () => {
        for (const molecule of moorhenInstance.getMoleculeList()) {
            for (const representation of moorhenInstance.representation.getList(molecule.uniqueId)) {
                await moorhenInstance.representation.delete(representation.uniqueId);
            }
        }
    };

    const handleSceneChange = async (newScene: Scene) => {
        if (newScene === scene) return;
        setScene(newScene);

        if (newScene === "Default") {
            // eslint-disable-next-line
            moorhenInstance.representation.defaultStyle = DEFAULT_REPRESENTATION_STYLE;
            await deleteCustomRepresentations();
            for (const { moleculeUniqueId, params } of representationBackup) {
                // The molecule may have been closed while in the model building scene
                if (!moorhenInstance.getMolecule(moleculeUniqueId)) continue;
                await moorhenInstance.representation.create(
                    moleculeUniqueId,
                    params as Parameters<typeof moorhenInstance.representation.create>[1]
                );
            }
            setRepresentationBackup([]);
        }
        if (newScene === "Model Building") {
            // eslint-disable-next-line
            moorhenInstance.representation.defaultStyle = "CBs";
            // Back up every molecule before deleting anything
            const backup: SceneBackupEntry[] = [];
            for (const molecule of moorhenInstance.getMoleculeList()) {
                for (const representation of moorhenInstance.representation.getList(molecule.uniqueId)) {
                    backup.push({ moleculeUniqueId: molecule.uniqueId, params: representation.backup() });
                }
            }
            setRepresentationBackup(backup);
            await deleteCustomRepresentations();
            for (const molecule of moorhenInstance.getMoleculeList()) {
                // deleteExisting would also remove the non-custom reps, so don't let the wizard delete
                await moorhenInstance.representation.wizard(molecule.uniqueId, "bonds", false);
            }
        }
    };

    const link = (
        <button
            ref={buttonRef}
            className={`moorhen__main-menu-button moorhen__scene-selector${isShown ? " open" : ""}`}
            onClick={() => setIsShown(!isShown)}
            aria-haspopup="menu"
            aria-expanded={isShown}
        >
            Scene: {scene}
        </button>
    );

    return (
        <MoorhenPopover
            link={link}
            linkRef={buttonRef}
            isShown={isShown}
            setIsShown={setIsShown}
            popoverPlacement="bottom-left"
            type="custom"
        >
            <div className="moorhen__scene-selector-menu" role="menu">
                {userScenes.map(s => (
                    <MoorhenMenuItem
                        key={s}
                        selected={s === scene}
                        onClick={() => {
                            handleSceneChange(s);
                            setIsShown(false);
                        }}
                    >
                        {s}
                    </MoorhenMenuItem>
                ))}
            </div>
        </MoorhenPopover>
    );
};
