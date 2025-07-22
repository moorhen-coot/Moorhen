import { forwardRef } from "react";
import { Stack } from "react-bootstrap";
import { LinearProgress } from "@mui/material";
import { SnackbarContent } from "notistack";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";

export const MoorhenLongJobSnackBar = forwardRef<HTMLDivElement, { commandCentre: React.RefObject<moorhen.CommandCentre> }>((props, ref) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    return  <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? 'grey' : 'white'}}>
                <Stack gap={1} direction='vertical'>
                    <span>Please wait...</span>
                    <LinearProgress/>
                </Stack>
            </SnackbarContent>
})