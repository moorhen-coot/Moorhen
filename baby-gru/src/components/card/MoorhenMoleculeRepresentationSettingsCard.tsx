import { Stack } from "react-bootstrap";
import { IconButton, Popover, Slider } from '@mui/material';
import MoorhenSlider from '../misc/MoorhenSlider';
import { AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import { moorhen } from "../../types/moorhen";
import { webGL } from '../../types/mgWebGL';

export const MoorhenMoleculeRepresentationSettingsCard = (props: {
    setShow: React.Dispatch<React.SetStateAction<boolean>>;
    show: boolean; anchorEl: React.RefObject<HTMLDivElement>;
    molecule: moorhen.Molecule;
    isDark: boolean;
    molecules: moorhen.Molecule[];
    urlPrefix: string;
    glRef: React.RefObject<webGL.MGWebGL>;
    bondSettingsProps: {
        bondWidth: number;
        setBondWidth: React.Dispatch<React.SetStateAction<number>>;
        atomRadiusBondRatio: number;
        setAtomRadiusBondRatio: React.Dispatch<React.SetStateAction<number>>;
        bondSmoothness: number;
        setBondSmoothness: React.Dispatch<React.SetStateAction<number>>;
    };
}) => {

    const {
        bondWidth, setBondWidth, atomRadiusBondRatio,
        setAtomRadiusBondRatio, bondSmoothness, setBondSmoothness
    } = props.bondSettingsProps

    const increaseWidthButton = <IconButton onClick={() => setBondWidth(bondWidth + 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseWidthButton = <IconButton onClick={() => setBondWidth(bondWidth - 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>
    const increaseRatioButton = <IconButton onClick={() => setAtomRadiusBondRatio(atomRadiusBondRatio + 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <AddCircleOutline/>
                                </IconButton>
    const decreaseRatioButton = <IconButton onClick={() => setAtomRadiusBondRatio(atomRadiusBondRatio - 0.1)} style={{padding: 0, color: props.isDark ? 'white' : 'grey'}}>
                                    <RemoveCircleOutline/>
                                </IconButton>

    return <Popover
                onClose={() => props.setShow(false)}
                open={props.show}
                anchorEl={props.anchorEl.current}
                anchorOrigin={{ vertical: 'center', horizontal: 'center' }}
                transformOrigin={{ vertical: 'center', horizontal: 'center', }}
                sx={{'& .MuiPaper-root': {backgroundColor: props.isDark ? 'grey' : 'white', marginTop: '0.1rem'}}}
                
            >
            <Stack gap={2} direction='vertical' style={{width: '25rem', margin: '0.5rem'}}>
                <div style={{marginLeft: '2rem', marginRight: '2rem'}}>
                <MoorhenSlider showMinMaxVal={false} decrementButton={decreaseWidthButton} incrementButton={increaseWidthButton} minVal={0.05} maxVal={0.5} logScale={false} sliderTitle="Bond width" initialValue={bondWidth} externalValue={bondWidth} setExternalValue={setBondWidth}/>
                <MoorhenSlider showMinMaxVal={false} decrementButton={decreaseRatioButton} incrementButton={increaseRatioButton} minVal={1.0} maxVal={3.5} logScale={false} sliderTitle="Radius-Bond ratio" initialValue={atomRadiusBondRatio} externalValue={atomRadiusBondRatio} setExternalValue={setAtomRadiusBondRatio} />
                <span>Bond Smoothness</span>        
                <Slider
                    aria-label="Smoothness"
                    value={bondSmoothness}
                    onChange={(evt, value: number) => { setBondSmoothness(value) }}
                    valueLabelFormat={(value) => {
                        switch(value) {
                            case 1:
                                return "Coarse"
                            case 50:
                                return "Nice"
                            default: 
                                return "Smooth"
                        }
                    }}
                    getAriaValueText={(value) => {
                        switch(value) {
                            case 1:
                                return "Coarse"
                            case 50:
                                return "Nice"
                            default: 
                                return "Smooth"
                        }
                    }}
                    step={null}
                    valueLabelDisplay="auto"
                    marks={[
                        {value: 1, label: 'Coarse'},
                        {value: 50, label: 'Nice'},
                        {value: 100, label: 'Smooth'}
                    ]}
                />
                </div>
            </Stack>
        </Popover>
 
}
