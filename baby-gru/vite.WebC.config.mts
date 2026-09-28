import { defineConfig, mergeConfig } from "vite";
import mainConfig from "./vite.config.mts";

const webComponentConfig = defineConfig({
    publicDir: "dist/public",
});

export default mergeConfig(webComponentConfig, mainConfig);