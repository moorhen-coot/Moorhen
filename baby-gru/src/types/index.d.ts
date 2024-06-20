import { libcootApi } from "./libcoot";

export {};

declare global {
    namespace JSX {
        interface IntrinsicElements {
          "protvista-manager": ProtvistaManager;
          "protvista-sequence": ProtvistaSequence;
          "protvista-navigation": ProtvistaNavigation;
          "protvista-track": ProtvistaTrack;
        }
    }    
    interface Window {
        CCP4Module: libcootApi.CCP4ModuleType;
        cootModule: libcootApi.CCP4ModuleType;
    }
}

