import React from "react";
import "./side-panels.css";

export const PanelContainer = (props: {
    title: string;
    extraControls?: React.JSX.Element;
    children: React.JSX.Element | React.ReactNode;
}) => {
    const { title, extraControls, children } = props;
    return (
        <>
            <div className="moorhen__panel-inner-container-title-bar">
                <span style={{ flex: "1" }}>{title}</span>
                <div>{extraControls}</div>
            </div>
            <div className="moorhen__panel-inner-container">{children}</div>
        </>
    );
};
