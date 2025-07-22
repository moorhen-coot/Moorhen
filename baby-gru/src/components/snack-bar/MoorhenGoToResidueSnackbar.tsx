import { Stack } from "react-bootstrap";
import { IconButton } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack"
import { useSelector } from "react-redux";
import { CheckOutlined, CloseOutlined } from "@mui/icons-material";
import { forwardRef, useCallback, useRef, useState } from "react";
import { MoorhenCidInputForm } from "../inputs/MoorhenCidInputForm";
import { moorhen } from "../../types/moorhen";
import { getCentreAtom } from "../../utils/utils";
import { webGL } from "../../types/mgWebGL";

export const MoorhenGoToResidueSnackbar = forwardRef<
    HTMLDivElement, 
    {
        commandCentre: React.RefObject<moorhen.CommandCentre>;
        glRef: React.RefObject<webGL.MGWebGL>;
        id: string;
    }
>((props, ref) => {
    
    const cidFormRef = useRef<null | HTMLInputElement>(null)

    const [invalidCid, setInvalidCid] = useState<boolean>(false)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const molecules = useSelector((state: moorhen.State) => state.molecules.moleculeList)

    const { closeSnackbar } = useSnackbar()

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
            closeSnackbar(props.id)
        } else {
            setInvalidCid(true)
        }
    }, [molecules])

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? 'grey' : 'white'}}>
        <Stack gap={2} direction='horizontal' style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <MoorhenCidInputForm ref={cidFormRef} invalidCid={invalidCid} allowUseCurrentSelection={false} label="" margin={'0px'} height="100%" width="70%" placeholder="Go to..."/>
            <div>
                <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey', }} onClick={centreOnSelection}>
                    <CheckOutlined />
                </IconButton>
                <IconButton style={{ padding: 0, color: isDark ? 'white' : 'grey' }} onClick={async () => {
                    closeSnackbar(props.id)
                }}>
                    <CloseOutlined />
                </IconButton>
            </div>
        </Stack>
    </SnackbarContent>
})