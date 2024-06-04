import { SnackbarContent, useSnackbar } from "notistack";
import { forwardRef, useState } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { Stack } from "react-bootstrap";
import { IconButton } from "@mui/material";
import { CloseOutlined, UnfoldLessOutlined, UnfoldMoreOutlined } from "@mui/icons-material";

export const MoorhenSideBar = forwardRef<HTMLDivElement, { children: JSX.Element, id: string, title: string}>((props, ref) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)

    const [isCollapsed, setIsCollapsed] = useState<boolean>(false)

    const { closeSnackbar } = useSnackbar()

    return <SnackbarContent ref={ref} className="moorhen-sidebar-div" style={{ backgroundColor: isDark ? 'grey' : 'white' }}>
        <Stack direction="horizontal" gap={1} style={{ justifyContent: 'space-between', width: '90%' }}>
            <span>{props.title}</span>
            <Stack gap={1} direction="horizontal">
                <IconButton onClick={() => setIsCollapsed((prev) => !prev)}>
                    {isCollapsed ? <UnfoldMoreOutlined/> : <UnfoldLessOutlined/>}
                </IconButton>
                <IconButton onClick={() => closeSnackbar(props.id)}>
                    <CloseOutlined/>
                </IconButton>
            </Stack>
        </Stack>
        { !isCollapsed && props.children }
    </SnackbarContent>
})