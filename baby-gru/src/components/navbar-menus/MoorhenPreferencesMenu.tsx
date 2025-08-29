import { useState, useEffect } from "react";
import { Form, InputGroup } from "react-bootstrap";
import { MenuItem } from "@mui/material";
import { useSelector, useDispatch } from "react-redux";
import { MoorhenShortcutConfigModal } from "../modal/MoorhenShortcutConfigModal";
import { MoorhenGLFontMenuItem } from "../menu-item/MoorhenGLFontMenuItem";
import { MoorhenScoresToastPreferencesMenuItem } from "../menu-item/MoorhenScoresToastPreferencesMenuItem";
import { MoorhenBackupPreferencesMenuItem } from "../menu-item/MoorhenBackupPreferencesMenuItem";
import { MoorhenDefaultBondSmoothnessPreferencesMenuItem } from "../menu-item/MoorhenDefaultBondSmoothnessPreferencesMenuItem";
import { MoorhenViewLayoutPreferencesMenuItem } from "../menu-item/MoorhenViewLayoutPreferencesMenuItem";
import { MapContourSettingsMenuItem } from "../menu-item/MoorhenMapContourSettingsMenuItem";
import { MoorhenRefinementSettingsMenuItem } from "../menu-item/MoorhenRefinementSettingsMenuItem";
import { MoorhenMouseSensitivitySettingsMenuItem } from "../menu-item/MoorhenMouseSensitivitySettingsMenuItem";
import {
    setDefaultExpandDisplayCards,
    setTransparentModalsOnMouseOut,
    setDevMode,
} from "../../store/generalStatesSlice";
import { setAtomLabelDepthMode } from "../../store/labelSettingsSlice";
import { setShortcutOnHoveredAtom, setShowShortcutToast } from "../../store/shortCutsSlice";
import { setMakeBackups } from "../../store/backupSettingsSlice";
import { setElementsIndicesRestrict } from "../../store/glRefSlice";
import { useTimeCapsule } from "../../InstanceManager";
import { RootState } from "../../store/MoorhenReduxStore";

export const MoorhenPreferencesMenu = () => {
    const dispatch = useDispatch();
    const devMode = useSelector((state: RootState) => state.generalStates.devMode);
    const elementsIndicesRestrict = useSelector((state: RootState) => state.glRef.elementsIndicesRestrict);
    const enableTimeCapsule = useSelector((state: RootState) => state.backupSettings.enableTimeCapsule);
    const makeBackups = useSelector((state: RootState) => state.backupSettings.makeBackups);
    const maxBackupCount = useSelector((state: RootState) => state.backupSettings.maxBackupCount);
    const modificationCountBackupThreshold = useSelector(
        (state: RootState) => state.backupSettings.modificationCountBackupThreshold
    );
    const showShortcutToast = useSelector((state: RootState) => state.shortcutSettings.showShortcutToast);
    const shortcutOnHoveredAtom = useSelector((state: RootState) => state.shortcutSettings.shortcutOnHoveredAtom);
    const atomLabelDepthMode = useSelector((state: RootState) => state.labelSettings.atomLabelDepthMode);
    const defaultExpandDisplayCards = useSelector((state: RootState) => state.generalStates.defaultExpandDisplayCards);
    const transparentModalsOnMouseOut = useSelector(
        (state: RootState) => state.generalStates.transparentModalsOnMouseOut
    );

    const [showModal, setShowModal] = useState<boolean | null>(null);

    const timeCapsuleRef = useTimeCapsule();

    useEffect(() => {
        if (timeCapsuleRef.current) {
            timeCapsuleRef.current.disableBackups = !enableTimeCapsule;
            timeCapsuleRef.current.maxBackupCount = maxBackupCount;
            timeCapsuleRef.current.modificationCountBackupThreshold = modificationCountBackupThreshold;
        }
    }, [maxBackupCount, modificationCountBackupThreshold, enableTimeCapsule]);

    return (
        <>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    label="Expand display cards after file upload"
                    checked={defaultExpandDisplayCards}
                    onChange={() => {
                        dispatch(setDefaultExpandDisplayCards(!defaultExpandDisplayCards));
                    }}
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    label="Make modals transparent on mouse out"
                    checked={transparentModalsOnMouseOut}
                    onChange={() => {
                        dispatch(setTransparentModalsOnMouseOut(!transparentModalsOnMouseOut));
                    }}
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={atomLabelDepthMode}
                    onChange={() => {
                        dispatch(setAtomLabelDepthMode(!atomLabelDepthMode));
                    }}
                    label="Depth cue atom labels"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={showShortcutToast}
                    onChange={() => {
                        dispatch(setShowShortcutToast(!showShortcutToast));
                    }}
                    label="Show shortcut popup"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={makeBackups}
                    onChange={() => {
                        dispatch(setMakeBackups(!makeBackups));
                    }}
                    label="Enable molecule undo/redo backups"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={shortcutOnHoveredAtom}
                    onChange={() => {
                        dispatch(setShortcutOnHoveredAtom(!shortcutOnHoveredAtom));
                    }}
                    label="Hover on residue to use shortcuts"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={elementsIndicesRestrict}
                    onChange={() => {
                        dispatch(setElementsIndicesRestrict(!elementsIndicesRestrict));
                    }}
                    label="Restrict number of primitives drawn at once"
                />
            </InputGroup>
            <InputGroup className="moorhen-input-group-check">
                <Form.Check
                    type="switch"
                    checked={devMode}
                    onChange={() => {
                        dispatch(setDevMode(!devMode));
                    }}
                    label="Developer mode"
                />
            </InputGroup>
            <hr></hr>
            <MoorhenMouseSensitivitySettingsMenuItem />
            <MoorhenBackupPreferencesMenuItem />
            <MoorhenScoresToastPreferencesMenuItem />
            <MoorhenDefaultBondSmoothnessPreferencesMenuItem />
            <MoorhenViewLayoutPreferencesMenuItem />
            <MapContourSettingsMenuItem />
            <MoorhenRefinementSettingsMenuItem />
            <MenuItem
                id="configure-shortcuts-menu-item"
                onClick={() => setShowModal(true)}
                style={{ marginTop: "0rem" }}
            >
                Configure shortcuts...
            </MenuItem>
            <MoorhenShortcutConfigModal showModal={showModal} setShowModal={setShowModal} />
            <MoorhenGLFontMenuItem />
        </>
    );
};
