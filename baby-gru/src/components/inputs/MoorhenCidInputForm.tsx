import { useSelector, useStore } from "react-redux";
import { moorhen } from "../../types/moorhen";
import "./MoorhenInput.css";
import { MoorhenStack } from "../interface-base/Stack/Stack";
import { MoorhenToggle } from "./MoorhenToggle/Toggle";
import React, { useState } from "react";
import { MoorhenButton } from "./MoorhenButton/MoorhenButton";
import {  RootState } from "@/store";
import { usePauseClickAwayListener } from "@/hooks/pauseClickAwayListener";
import { OverlayModal } from "../interface-base/ModalBase/OverlayModal";

type MoorhenCidInputFormPropsType = {
    height?: string;
    width?: string;
    margin?: string;
    label?: string;
    placeholder?: string;
    defaultValue?: string;
    onChange?: (arg0: React.ChangeEvent<HTMLInputElement>) => void;
    invalidCid?: boolean;
    allowUseCurrentSelection?: boolean;
    ref?: React.Ref<HTMLInputElement>;
    inline?: boolean
    setCid?: React.Dispatch<React.SetStateAction<string>>
    allowPickAtom?: boolean
};

export const MoorhenCidInputForm = (props: MoorhenCidInputFormPropsType) => {
    const {
    height = "4rem",
    width = "16rem",
    margin = "0.1rem",
    label = "Atom selection",
    placeholder = "",
    defaultValue = "",
    invalidCid = false,
    allowUseCurrentSelection = false,
    onChange,
    ref: cidFormRef,
    inline = true,
    allowPickAtom = true,
} = props
    const residueSelection = useSelector((state: moorhen.State) => state.generalStates.residueSelection);
    const showResidueSelection = useSelector((state: moorhen.State) => state.generalStates.showResidueSelection);
    const [selection, setSelection] = useState<string>(defaultValue)
    const [useSelection, setUseSelection] = useState(false)
    const [iseAtomPicking, setIsAtomPicking] = useState(false)
    const store = useStore<RootState>()
    const [pauseClickAwayListener, resumeClickAwayListener] = usePauseClickAwayListener();

    const handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
        if (onChange) {
            onChange(evt);     
        }
        setSelection(evt.target.value)
        props.setCid?.(evt.target.value)
    };

    const handlePickAtom = () => {
        document.addEventListener("atomClicked", atomClickedListener as EventListener)
        pauseClickAwayListener();
        setIsAtomPicking(true);
    }

    const stopPicking = () => {
        document.removeEventListener("atomClicked", atomClickedListener as EventListener)
        setIsAtomPicking(false);
        resumeClickAwayListener();
    }

    const atomClickedListener = (evt: Event) => {
        const hoveredAtom = store.getState().hoveringStates.hoveredAtom
        setSelection(hoveredAtom ? hoveredAtom.cid : "")
        stopPicking();
    }

    const handleFillCurrentSelection = () => {
        let cid: string = ""
        if (!useSelection) {
            if (residueSelection) {
                if (residueSelection.cid === null) {
                    cid = residueSelection.first
                } else {
                cid = Array.isArray(residueSelection.cid) ? residueSelection.cid[0] : residueSelection.cid}
            }
        } else {
            cid = ""
        }
        setSelection(cid)
        handleChange({ target: { value: cid }} as React.ChangeEvent<HTMLInputElement>)
        setUseSelection(!useSelection)}
        const pickingOverlay = <MoorhenStack justify="center" align="center">Click on an atom to select it, or  <MoorhenButton variant="danger" onClick={stopPicking}>Cancel</MoorhenButton ></MoorhenStack>

    return (
        <>
            <MoorhenStack  direction={inline? "line" : null} style={{ width: width, margin: margin, height: height }}>
                {label && <label style={{ display: "block", marginBottom: "0.25rem" }}>{label}</label>}
                <OverlayModal isShown={iseAtomPicking} overlay={pickingOverlay}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <input
                    type="text"
                    className={`${"moorhen__input"} ${invalidCid ? "moorhen__input.invalid" : ""}`}
                    placeholder={placeholder}
                    onChange={handleChange}
                    ref={cidFormRef}
                    style={{ width: "100%" }}
                    value={selection}
                />{allowPickAtom && <MoorhenButton onClick={handlePickAtom} type="icon-only" icon="MatSymMyLocation" tooltip="Pick Atom"/>}</div></OverlayModal>
            </MoorhenStack>
            {allowUseCurrentSelection && showResidueSelection && (
                <MoorhenToggle
                    label="Use Current Selection"
                    onChange={handleFillCurrentSelection} 
                    checked={useSelection}/>
            )}
        </>
    );
};
