import { SnackbarContent, useSnackbar } from "notistack";
import { forwardRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { Stack } from "react-bootstrap";
import { IconButton } from "@mui/material";
import { CloseOutlined,  UnfoldLessOutlined, UnfoldMoreOutlined } from "@mui/icons-material";
import { attachModalToSideBar, collapseSideBarModal, detachModalFromSideBar, expandSideBarModal } from "../../store/modalsSlice";

export const MoorhenSideBar = forwardRef<HTMLDivElement, { children: JSX.Element, id: string, title: string, modalId: string}>((props, ref) => {

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const modalsAttachedToSideBar = useSelector((state: moorhen.State) => state.modals.modalsAttachedToSideBar)
    const isCollapsed = useSelector((state: moorhen.State) => state.modals.modalsAttachedToSideBar.find(item => item.key === props.modalId)?.isCollapsed)

    const { closeSnackbar } = useSnackbar()

    const dispatch = useDispatch()

    useEffect(() => {
        if (!modalsAttachedToSideBar.find(item => item.key === props.modalId)) {
            dispatch( attachModalToSideBar(props.modalId) )
        }
        return () => {
            dispatch( detachModalFromSideBar(props.modalId) )
        }
    }, [])

    return <SnackbarContent ref={ref} className="moorhen-sidebar-div" style={{ backgroundColor: isDark ? 'grey' : 'white' }}>
        <Stack direction="horizontal" gap={1} style={{ justifyContent: 'space-between', width: '90%' }}>
            <span>{props.title}</span>
            <Stack gap={1} direction="horizontal">
                <IconButton onClick={() => dispatch( isCollapsed ? expandSideBarModal(props.modalId) : collapseSideBarModal(props.modalId) )}>
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