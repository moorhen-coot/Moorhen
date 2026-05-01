import { useDispatch, useSelector } from "react-redux";
import { useEffect, useRef, useState } from "react";
import { setShortCuts } from "../../store/shortCutsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenButton } from "../inputs";
import { MoorhenDraggableModalBase, MoorhenStack } from "../interface-base";
import { ModalComponentProps } from "../interface-base/ModalBase/ModalsContainer";
import { OverlayModal } from "../interface-base/ModalBase/OverlayModal";
import { Preferences } from "../managers/preferences/MoorhenPreferences";

export const MoorhenShortcutConfigModal = (props: ModalComponentProps) => {
    const dispatch = useDispatch();
    const _shortCuts = useSelector((state: moorhen.State) => state.shortcutSettings.shortCuts);
    const shortCuts = JSON.parse(_shortCuts as string);
    const [waitingNewShortCut, setWaitingNewShortCut] = useState<boolean | string>(false);
    const waitingNewShortCutRef = useRef<boolean | string>(false);
    const [stagedShortCuts, setStagedShortCuts] = useState(shortCuts);
    const [shortCutMessage, setShortCutMessage] = useState<string>("... Press something ...");
    const newModifiers = useState<string[]>([]);
    const newShortcut = useState<string>("");

    const cancelChanges = () => {
        setStagedShortCuts(shortCuts);
    };

    const restoreDefaults = () => {
        const defaultValues = Preferences.defaultPreferencesValues;
        console.log(defaultValues.shortCuts);
        setStagedShortCuts(defaultValues.shortCuts);
    };

    const handleSaveChanges = () => {
        dispatch(setShortCuts(JSON.stringify(stagedShortCuts)));
    };

    const handleKeyUp = (evt: KeyboardEvent): void => {
        const modifiers: string[] = [];
        if (evt.shiftKey) modifiers.push("shiftKey");
        if (evt.ctrlKey) modifiers.push("ctrlKey");
        if (evt.metaKey) modifiers.push("metaKey");
        if (evt.altKey) modifiers.push("altKey");

        setStagedShortCuts(prev => {
            return {
                ...prev,
                [waitingNewShortCutRef.current as string]: {
                    ...prev[waitingNewShortCutRef.current as string],
                    keyPress: evt.key.toLowerCase(),
                    modifiers: modifiers,
                },
            };
        });

        handleChangeShortcut(null);
        setShortCutMessage("... Press something ...");
    };

    const handleKeyDown = (evt: KeyboardEvent): void => {
        const modifiers: string[] = [];
        if (evt.shiftKey) modifiers.push("<Shift>");
        if (evt.ctrlKey) modifiers.push("<Ctrl>");
        if (evt.metaKey) modifiers.push("<Meta>");
        if (evt.altKey) modifiers.push("<Alt>");
        if (evt.key === " ") modifiers.push("<Space>");

        setShortCutMessage(`${modifiers.join("-")} ${evt.key.toLowerCase()}`);
    };

    const handleChangeShortcut = (key: string | null) => {
        if (key) {
            waitingNewShortCutRef.current = key;
            document.addEventListener("keydown", handleKeyDown);
            document.addEventListener("keyup", handleKeyUp);
            setWaitingNewShortCut(key);
        } else {
            waitingNewShortCutRef.current = false;
            document.removeEventListener("keydown", handleKeyDown);
            document.removeEventListener("keyup", handleKeyUp);
            setWaitingNewShortCut(false);
            setShortCutMessage("... Press something ...");
        }
    };

    const modalBody = (
        <OverlayModal
            isShown={waitingNewShortCut === false ? false : true}
            overlay={
                <MoorhenStack
                    card
                    align="center"
                    justify="center"
                    style={{ backgroundColor: "var(--moorhen-background)", color: "var(--moorhen-primary)" }}
                >
                    {`Setting shortcut for ${waitingNewShortCut}`} <br />
                    <br /> {shortCutMessage}
                    <MoorhenButton variant="secondary" onClick={() => handleChangeShortcut(null)}>
                        Cancel
                    </MoorhenButton>
                </MoorhenStack>
            }
        >
            <>
                {Object.keys(stagedShortCuts).map(key => {
                    const modifiers = [];
                    if (stagedShortCuts[key].modifiers.includes("shiftKey")) modifiers.push("<Shift>");
                    if (stagedShortCuts[key].modifiers.includes("ctrlKey")) modifiers.push("<Ctrl>");
                    if (stagedShortCuts[key].modifiers.includes("metaKey")) modifiers.push("<Meta>");
                    if (stagedShortCuts[key].modifiers.includes("altKey")) modifiers.push("<Alt>");
                    if (stagedShortCuts[key].keyPress === " ") modifiers.push("<Space>");
                    return (
                        <MoorhenStack direction="line" align="center" inputGrid key={key} card>
                            <div style={{ justifyContent: "left", display: "flex" }}>
                                <span style={{ fontWeight: "bold" }}>{`${stagedShortCuts[key].label}`}</span>
                                <i>{`: ${modifiers.join("-")} ${stagedShortCuts[key].keyPress} `}</i>
                            </div>
                            <div style={{ justifyContent: "right", display: "flex" }}>
                                <MoorhenButton
                                    value={key}
                                    onClick={() => {
                                        handleChangeShortcut(key);
                                    }}
                                >
                                    Change
                                </MoorhenButton>
                            </div>
                        </MoorhenStack>
                    );
                })}
            </>
        </OverlayModal>
    );
    const modalFooter = (
        <>
            <MoorhenButton variant="secondary" onClick={restoreDefaults}>
                Restore Defaults
            </MoorhenButton>
            <MoorhenButton variant="primary" onClick={handleSaveChanges}>
                Save Changes
            </MoorhenButton>
            <MoorhenButton variant="danger" onClick={cancelChanges}>
                Cancel
            </MoorhenButton>{" "}
        </>
    );

    return (
        <MoorhenDraggableModalBase
            body={modalBody}
            allowDocking
            footer={modalFooter}
            modalId="config-shortcuts"
            headerTitle="Config Shortcuts"
        />
    );
};
