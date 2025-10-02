import { useDispatch } from 'react-redux';
import { showModal } from '../../store/modalsSlice';
import { modalKeys } from '../../utils/enums';
import { MoorhenDedustMapMenuItem } from '../menu-item/DeDustMap';
import { MoorhenMenuItem } from '../menu-item/MenuItem';
import { MoorhenFlipMapHandMenuItem } from '../menu-item/MoorhenFlipMapHandMenuItem';
import { MoorhenMakeMaskedMapsSplitByChainMenuItem } from '../menu-item/MoorhenMakeMaskedMapsSplitByChainMenuItem';
import { MoorhenMapMaskingMenuItem } from '../menu-item/MoorhenMapMaskingMenuItem';
import { MoorhenSharpenBlurMapMenuItem } from '../menu-item/MoorhenSharpenBlurMapMenuItem';

export const MoorhenMapToolsMenu = () => {
    const dispatch = useDispatch();

    return (
        <>
            <MoorhenSharpenBlurMapMenuItem />
            <MoorhenMapMaskingMenuItem />
            <MoorhenFlipMapHandMenuItem />
            <MoorhenMakeMaskedMapsSplitByChainMenuItem />
            <MoorhenMenuItem
                onClick={() => {
                    dispatch(showModal(modalKeys.COLOR_MAP_BY_MAP));
                    document.body.click();
                }}
            >
                Color map by another map...
            </MoorhenMenuItem>
            <MoorhenDedustMapMenuItem />
        </>
    );
};
