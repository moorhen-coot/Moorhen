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

export class MoorhenHelper extends HTMLElement {
    public src: string;
    static get observedAttributes() {
        return ["src"];
    }
    constructor() {
        super();
        this.src = this.getAttribute("src") || ".";
    }

    public async connectedCallback() {
        const memory64 = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1]));
        const isChromeLinux = navigator.appVersion.indexOf("Linux") != -1 && navigator.appVersion.indexOf("Chrome") != -1;

        if (memory64 && !isChromeLinux) {
            loadScript(`${this.src}/moorhen64.js`)
                .then(src => {
                    console.debug(src + " loaded 64-bit successfully.");
                    /* eslint-disable no-undef */
                    createCoot64Module({
                        /* eslint-enable no-undef */
                        print(t) {
                            console.debug(["output", t]);
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
                            console.debug(e);
                            console.debug("There was a problem creating Coot64Module...");
                        });
                })
                .catch(error => {
                    console.error(error.message);
                    console.debug("Trying 32-bit fallback");
                    loadScript(`${this.src}/moorhen.js`).then(src => {
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
                            .then(returnedModule => {
                                window.cootModule = returnedModule as any;
                                window.CCP4Module = returnedModule as any;
                                const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                                document.dispatchEvent(cootModuleAttachedEvent);
                            })
                            .catch(e => {
                                console.debug(e);
                            });
                    });
                });
        } else {
            loadScript(`${this.src}/moorhen.js`).then(src => {
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
                    .then(returnedModule => {
                        window.cootModule = returnedModule as any;
                        window.CCP4Module = returnedModule as any;
                        const cootModuleAttachedEvent = new CustomEvent("cootModuleAttached", {});
                        document.dispatchEvent(cootModuleAttachedEvent);
                    })
                    .catch(e => {
                        console.debug(e);
                    });
            });
        }
    }
}
