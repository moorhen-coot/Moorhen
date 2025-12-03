import { useSnackbar } from "notistack";
import { MoorhenMenuItem } from "../interface-base";

export const Screenshot = () => {
    const { enqueueSnackbar } = useSnackbar();

    return (
        <MoorhenMenuItem
            onClick={() =>
                enqueueSnackbar("screenshot", {
                    variant: "screenshot",
                    persist: true,
                })
            }
        >
            Take Screenshot
        </MoorhenMenuItem>
    );
};
