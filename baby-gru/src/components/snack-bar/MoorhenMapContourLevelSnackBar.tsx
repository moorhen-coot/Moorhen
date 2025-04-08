import { SnackbarContent } from "notistack";
import { forwardRef, useCallback, useEffect, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { moorhen } from "../../types/moorhen";
import { useSnackbar } from "notistack";

export const MoorhenMapContourLevelSnackBar = forwardRef<
    HTMLDivElement,
    {
        mapMolNo: number;
        id: string;
    }
>((props, ref) => {
    
    const lastContourLevelChangeRef = useRef<number | null>(null)
    const currentContourLevelRef = useRef<number | null>(null)

    const isDark = useSelector((state: moorhen.State) => state.sceneSettings.isDark)
    const maps = useSelector((state: moorhen.State) => state.maps)
    const contourLevel = useSelector((state: moorhen.State) => state.mapContourSettings.contourLevels.find(item => item.molNo === props.mapMolNo)?.contourLevel)
    
    const selectedMap = useMemo(() => maps.find(map => map.molNo === props.mapMolNo), [props.mapMolNo, maps])

    const { closeSnackbar } = useSnackbar()

    const closeIfNoChange = useCallback(() => {
        if (lastContourLevelChangeRef.current === currentContourLevelRef.current) {
            closeSnackbar(props.id)
        } else {
            lastContourLevelChangeRef.current = currentContourLevelRef.current
            setTimeout(() => closeIfNoChange(), 1500)
        }
    }, [])

    useEffect(() => {
        lastContourLevelChangeRef.current = contourLevel
        setTimeout(() => closeIfNoChange(), 1500)
    }, [])

    useEffect(() => {
        currentContourLevelRef.current = contourLevel
    }, [contourLevel])

    return <SnackbarContent ref={ref} className="moorhen-notification-div" style={{ backgroundColor: isDark ? 'grey' : 'white', color: isDark ? 'white' : 'grey' }}>
        {`Level: ${contourLevel?.toFixed(selectedMap?.isEM ? 4 : 2)} ${selectedMap?.mapRmsd ? '(' + (contourLevel / selectedMap?.mapRmsd).toFixed(2) + ' rmsd)' : ''}`}
    </SnackbarContent>
})