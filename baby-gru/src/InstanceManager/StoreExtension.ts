import { setShownControl } from "@/store";
import { MoorhenInstance } from "./MoorhenInstance";

export class MoorhenInstanceStoreExtension extends MoorhenInstance {
    public setShownControl() {
        this.getDispatch()(setShownControl(null));
    }
}
