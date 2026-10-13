import { addUserScene, removeUserScene, renameUserScene, setSceneChanging, setSelectedScene } from "../store";
import type { UserScene } from "../store";
import type { RepresentationBackup } from "../utils/Representation/RepresentationBuilder";
import { DEFAULT_REPRESENTATION_STYLE, type MoorhenInstance } from "./MoorhenInstance";

type SceneBackupEntry = {
    representation: { moleculeUniqueId: string; params: RepresentationBackup }[];
    /** Molecules present when the scene was saved, so molecules loaded later can be told apart */
    moleculeUniqueIds: string[];
    sceneSettings: { [key: string]: unknown };
    name: string;
};

/** Scenes that ship with Moorhen and cannot be deleted */
const BUILT_IN_SCENES = ["Default", "Model Building"];

/**
 * Scene presets: named sets of representations the user can switch between.
 *
 * Switching scene saves the current custom representations of every molecule, deletes them,
 * then restores the representations saved for the new scene. A scene visited for the first
 * time starts as a copy of the current one, except "Model Building" which shows every molecule
 * as bonds. Access it through `moorhenInstance.userScene`.
 *
 * The scene list, the selected scene and whether a switch is running live in the `globalUI`
 * store slice (`userScenes`, `selectedScene`, `isSceneChanging`) so the UI can follow them.
 */
export class MoorhenUserSceneManager {
    private instance: MoorhenInstance;
    private backups: { [sceneId: string]: SceneBackupEntry } = {};
    // Not read from the store: two calls in the same tick must already see each other
    private isChanging: boolean = false;

    constructor(instance: MoorhenInstance) {
        this.instance = instance;
    }

    /** The available scenes, in menu order */
    public get list(): UserScene[] {
        return this.instance.store.getState().globalUI.userScenes;
    }

    /** The id of the scene currently shown */
    public get selected(): string {
        return this.instance.store.getState().globalUI.selectedScene;
    }

    /** Whether a scene switch is in progress (switching again is ignored until it ends) */
    public get isBusy(): boolean {
        return this.isChanging;
    }

    /**
     * Switch to another scene.
     * @param sceneId - The id of the scene to show.
     * @param saveCurrentScene - Save the current representations as the scene being left (default true).
     * @returns True if the switch ran, false if it was ignored (same scene, or a switch already running).
     * @example
     * await moorhenInstance.userScene.select("Model Building");
     */
    public async select(sceneId: string, saveCurrentScene: boolean = true): Promise<boolean> {
        if (sceneId === this.selected || this.isChanging) return false;
        this.setChanging(true);
        try {
            await this.changeScene(sceneId, saveCurrentScene);
        } catch (error) {
            console.error("Error changing scene:", error);
        } finally {
            this.instance.dispatch(setSelectedScene(sceneId));
            this.setChanging(false);
        }
        return true;
    }

    /**
     * Add a custom scene and switch to it. It starts as a copy of the current scene.
     * @param name - Display name (defaults to "Custom N").
     * @returns The id of the new scene.
     */
    public async create(name?: string): Promise<string> {
        // Use the highest existing number + 1 so a new id never collides with an existing scene
        const customNumbers = this.list.filter(scene => scene.id.startsWith("custom-")).map(scene => parseInt(scene.id.split("-")[1]));
        const customNumber = Math.max(0, ...customNumbers) + 1;
        const id = `custom-${customNumber}`;
        this.instance.dispatch(addUserScene({ id, name: name ?? `Custom ${customNumber}` }));
        await this.select(id);
        return id;
    }

    /**
     * Delete a custom scene and its saved representations. Deleting the current scene
     * switches back to "Default" first. Built-in scenes cannot be deleted.
     * @param sceneId - The id of the scene to delete.
     * @returns True if the scene was deleted.
     */
    public async delete(sceneId: string): Promise<boolean> {
        if (this.isChanging || BUILT_IN_SCENES.includes(sceneId)) return false;
        if (this.selected === sceneId) {
            // Leaving the deleted scene must not save it again
            await this.select("Default", false);
        }
        this.instance.dispatch(removeUserScene(sceneId));
        delete this.backups[sceneId];
        return true;
    }

    /**
     * Change the display name of a scene.
     * @param sceneId - The id of the scene to rename.
     * @param name - The new display name.
     */
    public rename(sceneId: string, name: string): void {
        this.instance.dispatch(renameUserScene({ id: sceneId, name }));
        if (this.backups[sceneId]) this.backups[sceneId].name = name;
    }

    private setChanging(value: boolean) {
        this.isChanging = value;
        this.instance.dispatch(setSceneChanging(value));
    }

    private async deleteCustomRepresentations() {
        for (const molecule of this.instance.getMoleculeList()) {
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                await this.instance.representation.delete(representation.uniqueId);
            }
        }
    }

    private backupScene(sceneId: string) {
        const backup: SceneBackupEntry = {
            representation: [],
            moleculeUniqueIds: [],
            sceneSettings: {},
            name: this.list.find(scene => scene.id === sceneId)?.name ?? sceneId,
        };
        for (const molecule of this.instance.getMoleculeList()) {
            backup.moleculeUniqueIds.push(molecule.uniqueId);
            for (const representation of this.instance.representation.getList(molecule.uniqueId)) {
                backup.representation.push({ moleculeUniqueId: molecule.uniqueId, params: representation.backup() });
            }
        }
        this.backups[sceneId] = backup;
    }

    private async restoreScene(backup: SceneBackupEntry, wizardType: "bonds" | typeof DEFAULT_REPRESENTATION_STYLE) {
        for (const { moleculeUniqueId, params } of backup.representation) {
            // The molecule may have been closed since the scene was saved
            if (!this.instance.getMolecule(moleculeUniqueId)) continue;
            await this.instance.representation.create(
                moleculeUniqueId,
                params as Parameters<typeof this.instance.representation.create>[1]
            );
        }
        // Molecules loaded since the scene was saved get the scene's default style
        for (const molecule of this.instance.getMoleculeList()) {
            if (!backup.moleculeUniqueIds.includes(molecule.uniqueId)) {
                await this.instance.representation.wizard(molecule.uniqueId, wizardType, false);
            }
        }
    }

    private async changeScene(sceneId: string, saveCurrentScene: boolean) {
        if (saveCurrentScene) this.backupScene(this.selected);
        const isModelBuilding = sceneId === "Model Building";
        const wizardType = isModelBuilding ? "bonds" : DEFAULT_REPRESENTATION_STYLE;
        this.instance.representation.defaultStyle = isModelBuilding ? "CBs" : DEFAULT_REPRESENTATION_STYLE;

        const savedScene = this.backups[sceneId];
        if (savedScene) {
            await this.deleteCustomRepresentations();
            await this.restoreScene(savedScene, wizardType);
        } else if (isModelBuilding) {
            await this.deleteCustomRepresentations();
            for (const molecule of this.instance.getMoleculeList()) {
                // deleteExisting would also remove the non-custom reps, so don't let the wizard delete
                await this.instance.representation.wizard(molecule.uniqueId, "bonds", false);
            }
        }
        // A scene visited for the first time (e.g. Custom) starts as a copy of the current one
    }
}
