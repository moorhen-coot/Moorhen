import { LinearProgress } from "@mui/material";
import { SnackbarContent } from "notistack";
import { Stack } from "react-bootstrap";
import { useSelector } from "react-redux";
import { forwardRef } from "react";
import { moorhen } from "../../types/moorhen";
import { MoorhenStack } from "../interface-base";

export const MoorhenLongJobSnackBar = forwardRef<HTMLDivElement, { commandCentre: React.RefObject<moorhen.CommandCentre> }>(
    (props, ref) => {
        const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);

        return (
            <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? "grey" : "white" }}>
                <MoorhenStack gap={1} direction="vertical">
                    <span>Please wait...</span>
                    <LinearProgress />
                </MoorhenStack>
            </SnackbarContent>
        );
    }
);

MoorhenLongJobSnackBar.displayName = "MoorhenLongJobSnackBar";
