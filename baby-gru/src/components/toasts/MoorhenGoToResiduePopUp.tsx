import { Stack } from "react-bootstrap";
import { moorhen } from "../../types/moorhen";
import { IconButton } from "@mui/material";
import { useSelector } from "react-redux";
import { MoorhenNotification } from "../misc/MoorhenNotification";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { MoorhenCidInputForm } from "../form/MoorhenCidInputForm";
import { useCallback, useRef, useState } from "react";
import { getCentreAtom } from "../../utils/MoorhenUtils";
import { webGL } from "../../types/mgWebGL";

export const MoorhenGoToResiduePopUp = (props: {
    commandCentre: React.RefObject<moorhen.CommandCentre>;
    glRef: React.RefObject<webGL.MGWebGL>;
    show: boolean;
    setShow: (arg: boolean) => void;
}) => {
    
    const cidFormRef = useRef<null | HTMLInputElement>(null)

    const [invalidCid, setInvalidCid] = useState<boolean>(false)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const centreOnSelection = useCallback(async () => {
        if (!cidFormRef.current?.value) {
            return
        }
        
        const [chosenMolecule, _residueCid] = await getCentreAtom(molecules, props.commandCentre, props.glRef)
        if (!chosenMolecule) {
            return
        }

        const isValidCid = await chosenMolecule.isValidSelection(cidFormRef.current.value)
        if (isValidCid) {
            setInvalidCid(false)
            await chosenMolecule.centreOn(cidFormRef.current.value, true, true)
            props.setShow(false)    
        } else {
            setInvalidCid(true)
        }
    }, [molecules])

    return <MoorhenNotification>
        <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <MoorhenCidInputForm ref={cidFormRef} invalidCid={invalidCid} allowUseCurrentSelection={false} label="" margin={'0px'} height="100%" width="70%" placeholder="Go to..."/>
            <div>
                <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={centreOnSelection}>
                    <CheckOutlined />
                </IconButton>
                <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                    props.setShow(false)
                }}>
                    <CloseOutlined />
                </IconButton>
            </div>
        </Stack>
    </MoorhenNotification>
}