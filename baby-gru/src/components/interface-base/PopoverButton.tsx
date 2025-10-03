import { useRef, useState } from 'react';
import { MoorhenButton } from '../inputs';
import { MoorhenPopover } from './Popover';

type MoorhenPopoverButtonType = {
    popoverContent?: React.JSX.Element;
    disabled?: boolean;
    size?: 'small' | 'medium' | 'large';
    icon?: 'string';
    popoverPlacement?: 'left' | 'right' | 'top' | 'bottom';
    children?: React.ReactNode;
};
export const MoorhenPopoverButton = (props: MoorhenPopoverButtonType) => {
    const [popoverIsShown, setPopOverIsShown] = useState<boolean>(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const popOverLink = (
        <MoorhenButton
            type="icon-only"
            icon={props.icon ? props.icon : 'MUISymbolSettings'}
            size={props.size}
            ref={buttonRef}
            onClick={() => setPopOverIsShown(!popoverIsShown)}
        />
    );

    return (
        <>
            <MoorhenPopover
                link={popOverLink}
                linkRef={buttonRef}
                isShown={popoverIsShown}
                popoverContent={props.children}
                setIsShown={setPopOverIsShown}
            />
        </>
    );
};
