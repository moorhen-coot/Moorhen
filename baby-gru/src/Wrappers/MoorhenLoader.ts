function loadScript(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.onload = () => resolve(src);
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

let MathJax = null;

export class MoorhenLoader extends HTMLElement {
    constructor() {
        super();
    }

    public async connectedCallback() {
        const memory64 = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1]));
        const isChromeLinux = navigator.appVersion.indexOf("Linux") != -1 && navigator.appVersion.indexOf("Chrome") != -1;

        if (memory64 && !isChromeLinux) {
            loadScript("/moorhen64.js")
                .then(src => {
                    console.log(src + " loaded 64-bit successfully.");
                    /* eslint-disable no-undef */
                    createCoot64Module({
                        /* eslint-enable no-undef */
                        print(t) {
                            console.log(["output", t]);
                        },
                        printErr(t) {
                            console.error(["output", t]);
                        },
                    })
                        .then(returnedModule => {
                            window.cootModule = returnedModule as any;
                            window.CCP4Module = returnedModule as any;
                            const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                            document.dispatchEvent(cootModuleAttachedEvent);
                        })
                        .catch(e => {
                            console.log(e);
                            console.log("There was a problem creating Coot64Module...");
                        });
                })
                .catch(error => {
                    console.error(error.message);
                    console.log("Trying 32-bit fallback");
                    loadScript("/moorhen.js").then(src => {
                        console.log(src + " loaded 32-bit successfully (fallback).");
                        /* eslint-disable no-undef */
                        createCootModule({
                            /* eslint-enable no-undef */
                            print(t) {
                                console.log(["output", t]);
                            },
                            printErr(t) {
                                console.log(["output", t]);
                            },
                        })
                            .then(returnedModule => {
                                window.cootModule = returnedModule as any;
                                window.CCP4Module = returnedModule as any;
                                const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                                document.dispatchEvent(cootModuleAttachedEvent);
                            })
                            .catch(e => {
                                console.log(e);
                            });
                    });
                });
        } else {
            loadScript("/moorhen.js").then(src => {
                console.log(src + " loaded 32-bit successfully.");
                /* eslint-disable no-undef */
                createCootModule({
                    print(t) {
                        console.log(["output", t]);
                    },
                    printErr(t) {
                        console.log(["output", t]);
                    },
                })
                    .then(returnedModule => {
                        window.cootModule = returnedModule as any;
                        window.CCP4Module = returnedModule as any;
                        const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                        document.dispatchEvent(cootModuleAttachedEvent);
                    })
                    .catch(e => {
                        console.log(e);
                    });
            });
        }
    }
}
