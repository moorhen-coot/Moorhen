import { libcootApi } from "./libcoot";

export {};

declare global {
    declare module "*.module.css";
    namespace JSX {
    }    
    interface Window {
        CCP4Module: libcootApi.CCP4ModuleType;
        cootModule: libcootApi.CCP4ModuleType;
        MathJax: any;
    }
}

