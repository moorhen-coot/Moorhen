export function loadScript(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve(src);
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

export const windowCootCCP4Loader = (src: string) => {
    // Prevent multiple executions using a custom property
    if (window._cootModuleLoading) {
        return;
    }
    window._cootModuleLoading = true;

    if (window.cootModule) {
        delete window._cootModuleLoading;
        return;
    }

    const memory64 = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1]));
    const isChromeLinux = navigator.appVersion.indexOf("Linux") != -1 && navigator.appVersion.indexOf("Chrome") != -1;

    const onModuleLoaded = (returnedModule: any) => {
        window.cootModule = returnedModule as any;
        window.CCP4Module = returnedModule as any;
        const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
        document.dispatchEvent(cootModuleAttachedEvent);
        delete (window as any)._cootModuleLoading;
    };

    const onModuleError = (e: any) => {
        console.debug(e);
        delete window._cootModuleLoading;
    };

    if (memory64 && !isChromeLinux) {
        loadScript(`${src}/moorhen64.js`)
            .then(src => {
                console.debug(src + " loaded 64-bit successfully.");
                /* eslint-disable no-undef */
                createCoot64Module({
                    print(t) {
                        console.debug(["output", t]);
                    },
                    printErr(t) {
                        console.error(["output", t]);
                    },
                })
                    .then(onModuleLoaded)
                    .catch(onModuleError);
            })
            .catch(error => {
                console.error(error.message);
                console.debug("Trying 32-bit fallback");
                loadScript(`${src}/moorhen.js`).then(src => {
                    console.debug(src + " loaded 32-bit successfully (fallback).");
                    /* eslint-disable no-undef */
                    createCootModule({
                        /* eslint-enable no-undef */
                        print(t) {
                            console.debug(["output", t]);
                        },
                        printErr(t) {
                            console.debug(["output", t]);
                        },
                    })
                        .then(onModuleLoaded)
                        .catch(onModuleError);
                });
            });
    } else {
        loadScript(`${src}/moorhen.js`).then(src => {
            console.debug(src + " loaded 32-bit successfully.");
            /* eslint-disable no-undef */
            createCootModule({
                print(t) {
                    console.debug(["output", t]);
                },
                printErr(t) {
                    console.debug(["output", t]);
                },
            })
                .then(onModuleLoaded)
                .catch(onModuleError);
        });
    }
    if (window.cootModule) {
        console.log("Coot module loaded on window.");
    }
    if (window.CCP4Module) {
        console.log("CCP4 module loaded on window.");
    }
};
