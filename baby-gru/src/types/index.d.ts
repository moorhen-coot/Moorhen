import { libcootApi } from "./libcoot";

export {};

declare global {
    declare module "*.module.css";
    namespace JSX {}
    interface Window {
        _cootModuleLoading: boolean;
        _mathJaxLoading: boolean;
        CCP4Module: libcootApi.CCP4ModuleType;
        cootModule: libcootApi.CCP4ModuleType;
        MathJax: any;
    }
    declare module "*.svg" {
        const SVGComponent: React.FC<React.SVGProps<SVGSVGElement>>;
        export default SVGComponent;
    }
}
