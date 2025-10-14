import { CloseOutlined, OpenInNewOutlined, UnfoldLessOutlined, UnfoldMoreOutlined } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { SnackbarContent, useSnackbar } from "notistack";
import { Stack } from "react-bootstrap";
import { useDispatch, useSelector } from "react-redux";
import { forwardRef, useCallback, useEffect } from "react";
import {
    ModalKey,
    attachModalToSideBar,
    collapseSideBarModal,
    detachModalFromSideBar,
    expandSideBarModal,
    showModal,
} from "../../store/modalsSlice";
import { moorhen } from "../../types/moorhen";

export const MoorhenSideBar = forwardRef<HTMLDivElement, { children: React.JSX.Element; id: string; title: string; modalId: ModalKey }>(
    (props, ref) => {
        const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark);
        const modalsAttachedToSideBar = useSelector((state: moorhen.State) => state.modals.modalsAttachedToSideBar);
        const isCollapsed = useSelector(
            (state: moorhen.State) => state.modals.modalsAttachedToSideBar.find(item => item.key === props.modalId)?.isCollapsed
        );

        const { closeSnackbar } = useSnackbar();

        const dispatch = useDispatch();

        useEffect(() => {
            if (!modalsAttachedToSideBar.find(item => item.key === props.modalId)) {
                dispatch(attachModalToSideBar(props.modalId));
            }
            return () => {
                dispatch(detachModalFromSideBar(props.modalId));
            };
        }, []);

        const handleClose = useCallback(() => {
            closeSnackbar(props.id);
        }, [props.id]);

        const handleDetach = useCallback(() => {
            closeSnackbar(props.id);
            dispatch(showModal(props.modalId));
        }, [props.id, props.modalId]);

        return (
            <SnackbarContent ref={ref} className="moorhen-sidebar-div" style={{ backgroundColor: isDark ? "grey" : "white" }}>
                <Stack direction="horizontal" gap={1} style={{ justifyContent: "space-between", width: "90%" }}>
                    <span>{props.title}</span>
                    <Stack gap={1} direction="horizontal">
                        <IconButton
                            onClick={() => dispatch(isCollapsed ? expandSideBarModal(props.modalId) : collapseSideBarModal(props.modalId))}
                        >
                            {isCollapsed ? <UnfoldMoreOutlined /> : <UnfoldLessOutlined />}
                        </IconButton>
                        <IconButton onClick={handleDetach}>
                            <OpenInNewOutlined />
                        </IconButton>
                        <IconButton onClick={handleClose}>
                            <CloseOutlined />
                        </IconButton>
                    </Stack>
                </Stack>
                {!isCollapsed && props.children}
            </SnackbarContent>
        );
    }
);

MoorhenSideBar.displayName = "MoorhenSideBar";
