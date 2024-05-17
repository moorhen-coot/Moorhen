import { SnackbarContent, useSnackbar } from "notistack";
import { forwardRef } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { Stack } from "react-bootstrap";
import { IconButton } from "@mui/material";
import { CloseOutlined } from "@mui/icons-material";

export const MoorhenSideBar = forwardRef<HTMLDivElement, { children: any, id: string, title: string}>((props, ref) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const { closeSnackbar } = useSnackbar()

    return <SnackbarContent ref={ref} className="moorhen-sidebar-div" style={{ backgroundColor: isDark ? 'grey' : 'white' }}>
        <Stack direction="horizontal" gap={1} style={{ justifyContent: 'space-between', width: '90%' }}>
            <span>{props.title}</span>
            <IconButton onClick={() => closeSnackbar(props.id)}>
                <CloseOutlined/>
            </IconButton>
        </Stack>
        { props.children }
    </SnackbarContent>
})