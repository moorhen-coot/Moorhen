import { useDispatch, useSelector } from "react-redux";
import { setGLLabelsFontFamily, setGLLabelsFontSize } from "../../store/labelSettingsSlice";
import { moorhen } from "../../types/moorhen";
import { MoorhenSelect } from "../inputs";
import { MoorhenStack } from "../interface-base";

export const GLFont = () => {
    const dispatch = useDispatch();
    const GLLabelsFontFamily = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontFamily);
    const GLLabelsFontSize = useSelector((state: moorhen.State) => state.labelSettings.GLLabelsFontSize);
    const availableFonts = useSelector((state: moorhen.State) => state.labelSettings.availableFonts);
    const fontSizes = [8, 9, 10, 11, 12, 13, 14, 18, 24, 30, 36, 48, 60, 72, 96];

    const menuItemText = "Fonts...";

    return (
        <MoorhenStack>
            <MoorhenSelect
                label="Graphics labels font"
                value={GLLabelsFontFamily}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    dispatch(setGLLabelsFontFamily(e.target.value));
                }}
            >
                {availableFonts.map(item => {
                    return (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    );
                })}
            </MoorhenSelect>
            <MoorhenSelect
                label="Graphics labels size"
                value={GLLabelsFontSize}
                onChange={e => {
                    dispatch(setGLLabelsFontSize(parseInt(e.target.value)));
                }}
            >
                {fontSizes.map(item => {
                    return (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    );
                })}
            </MoorhenSelect>
        </MoorhenStack>
    );
};
