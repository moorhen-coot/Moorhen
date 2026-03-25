import { useDispatch, useSelector } from "react-redux";
import { useEffect } from "react";
import { RootState } from "@/store";
import { Snackbar, closeSnackbar } from "@/store/snackbarSlice";
import "./snack-bars.css";

/* to fix :
"stepped-refine"
enqueueSnackbar(modalKeys.CARB_VALIDATION,
"Move to side panel"
*/
export const SnackBars = () => {
    const snackBars = useSelector((state: RootState) => state.snackBars);
    const disaply = snackBars.map(snackbar => <SnackBar key={snackbar.uid} {...snackbar} />);

    return <div className="moorhen__snack-bars-container">{disaply}</div>;
};

export const SnackBar = (props: Snackbar) => {
    const dispatch = useDispatch();
    const duration = props.autoHideDuration ?? 6000;
    useEffect(() => {
        const timer = setTimeout(() => {
            dispatch(closeSnackbar({ uid: props.uid }));
        }, duration + 300);
        return () => clearTimeout(timer);
    }, []);
    return (
        <div
            className="moorhen__snack-bar-wrapper"
            style={{ animation: `moorhen__snack-bar-collapse 300ms ease-out forwards ${duration}ms` }}
        >
            <div
                className={`moorhen__snack-bar ${props.variant}`}
                style={{
                    animation: `moorhen__snack-bar-fadeIn 300ms ease-out, moorhen__snack-bar-fadeOut 300ms ease-out ${duration - 300}ms`,
                    animationFillMode: "forwards",
                    animationIterationCount: 1,
                }}
            >
                {props.message}
            </div>
        </div>
    );
};
