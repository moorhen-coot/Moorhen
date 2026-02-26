import React, { Activity, ReactNode, createContext, useState } from "react";
import "./tabs.css";

// Context to share state between TabContainer and Tab
type TabContextType = {
    activeId: string;
    setActiveId: (id: string) => void;
};

const TabContext = createContext<TabContextType | undefined>(undefined);

type TabContainerProps = {
    children: React.ReactElement<TabProps>[];
    defaultActiveId?: string;
    onChange?: (activeId: string) => void;
    className?: string;
};

export const MoorhenTabContainer = (props: TabContainerProps) => {
    const { children, defaultActiveId, onChange, className } = props;

    const firstTabId = children[0]?.props.id || "0";
    const [activeId, setActiveId] = useState<string>(defaultActiveId || firstTabId);

    const handleSetActiveId = (id: string) => {
        setActiveId(id);
        onChange?.(id);
    };

    return (
        <div className={`moorhen__tabs-container ${className}`}>
            <div className="moorhen__tabs-header">
                {React.Children.map(children, child => (
                    <button
                        key={child.props.id}
                        className={`moorhen__tab-button ${activeId === child.props.id ? "active" : ""}`}
                        onClick={() => handleSetActiveId(child.props.id)}
                        role="tab"
                        aria-selected={activeId === child.props.id}
                    >
                        {child.props.label}
                    </button>
                ))}
            </div>

            {children.map(child => (
                <Activity mode={activeId === child.props.id ? "visible" : "hidden"} key={`${child.props.id}-tab-panel`}>
                    <div className="moorhen__tab-panel">{child}</div>
                </Activity>
            ))}
        </div>
    );
};

interface TabProps {
    id: string;
    label: string;
    children: ReactNode;
}

export const MoorhenTab: React.FC<TabProps> = ({ children }) => {
    return <>{children}</>;
};
