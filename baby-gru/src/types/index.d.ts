import { libcootApi } from "./libcoot";

export {};

declare global {
    namespace JSX {
        interface IntrinsicElements {
          "nightingale-manager": NightingaleManager;
          "nightingale-sequence": NightingaleSequence;
          "nightingale-navigation": NightingaleNavigation;
          "nightingale-track": NightingaleTrack;
        }
    }    
    interface Window {
        CCP4Module: libcootApi.CCP4ModuleType;
        cootModule: libcootApi.CCP4ModuleType;
    }
}

