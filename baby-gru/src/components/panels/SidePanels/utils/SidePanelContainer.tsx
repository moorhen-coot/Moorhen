import React from "react";
import { MoorhenStack } from "@/components/interface-base";
import "../side-panels.css";

export const SidePanelContainer = (props: {
    title: string;
    extraControls?: React.JSX.Element;
    children: React.JSX.Element | React.ReactNode;
}) => {
    const { title, extraControls, children } = props;
    return (
        <MoorhenStack style={{ minWidth: "0" }}>
            <div className="moorhen__panel-inner-container-title-bar">
                <span style={{ flex: "1" }}>{title}</span>
                <div>{extraControls}</div>
            </div>
            <div className="moorhen__panel-inner-container">{children}</div>
        </MoorhenStack>
    );
};
