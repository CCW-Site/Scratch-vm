// output a Scratch Object contains APIs all extension needed
const BlockType = require("./block-type");
const ArgumentType = require("./argument-type");
const TargetType = require("./target-type");
const Cast = require("../util/cast");
const Color = require("../util/color");
const createTranslate = require("./tw-l10n");
const log = require("../util/log");

/**
 * @typedef {{ info: unknown, Extension?: Function, extensionInstance?: unknown }} RegisteredExtension
 */

/**
 * @typedef {{ result: RegisteredExtension[], source: 'iife' | 'tempExt' | 'ExtensionLib' | 'scratchExtensions'}} RegisterResult
 */

let openVM = null;
/** @type {{ resolve: (res: RegisterResult | undefined) => void, reject: (reason: unknown) => void, promise: Promise<RegisterResult | undefined>}=} */
let loadingPromise;
let globalScratch;

function initalizePromise() {
    const pm = {};
    pm.promise = new Promise((resolve, reject) => {
        [pm.resolve, pm.reject] = [resolve, reject];
    });
    return pm;
}

const clearScratchAPI = () => {
    if (globalScratch) {
        delete global.tempExt;
        delete global.ExtensionLib;
        delete global.scratchExt;
        if (global.Scratch) {
            global.Scratch = globalScratch;
            globalScratch = undefined;
        }
        if (loadingPromise) loadingPromise.resolve();
        loadingPromise = undefined;
    }
};

const setupScratchAPI = async (vm) => {
    if (loadingPromise) await loadingPromise.promise;
    loadingPromise = initalizePromise();

    const registerExt = (extensionInstance, optMetadata) => {
        const info = extensionInstance.getInfo();
        const extensionId = info.id;
        const extensionObject = {
            info: Object.assign(
                {
                    name: info.name,
                    extensionId,
                },
                optMetadata
            ),
            Extension: () => new Proxy(extensionInstance.constructor, {
                construct() {
                    return extensionInstance
                }
            }),
            extensionInstance: extensionInstance,
        };
        loadingPromise.resolve({ source: "iife", result: [extensionObject] });
        clearScratchAPI();
    };
    Object.defineProperty(global, "tempExt", {
        get() {},
        set(v) {
            loadingPromise.resolve(v);
            clearScratchAPI();
        },
        configurable: true,
    });
    Object.defineProperty(global, "ExtensionLib", {
        get() {},
        set(v) {
            v.then((lib) => {
                loadingPromise.resolve({
                    source: "ExtensionLib",
                    result: Object.values(lib),
                });
                clearScratchAPI();
            });
        },
    });
    Object.defineProperty(global, "scratchExtensions", {
        get() {},
        set(v) {
            const added = [];
            v.default().then(({ default: lib }) => {
                Object.entries(lib).forEach(([key, obj]) => {
                    if (!(obj.info && obj.info.extensionId)) {
                        // compatible with some legacy gandi extension service
                        obj.info = obj.info || {};
                        obj.info.extensionId = key;
                    }
                    if (obj.info) added.push(obj);
                });
                loadingPromise.resolve({
                    source: "scratchExtensions",
                    result: added,
                });
                clearScratchAPI();
            });
        },
    });

    if (!openVM) {
        const { runtime } = vm;
        if (runtime.ccwAPI && runtime.ccwAPI.getOpenVM) {
            openVM = runtime.ccwAPI.getOpenVM();
        } else openVM = vm;
    }

    const scratch = {
        ArgumentType,
        BlockType,
        TargetType,
        Cast,
        Color,
        translate: createTranslate(vm),
        extensions: {
            register: registerExt,
        },
        vm: openVM,
        runtime: openVM.runtime,
        renderer: openVM.runtime.renderer,
    };
    globalScratch = global.Scratch;
    global.Scratch = scratch;
};

/**
 *
 * @param {*} vm
 * @param {*} url
 * @returns {Promise<RegisterResult>}
 */
const loadExtension = async (vm, url) => {
    if (!url) {
        return onError("remote extension url is null");
    }
    await setupScratchAPI(vm);
    const pm = loadingPromise;

    if (!url) {
        return onError("remote extension url is null");
    }

    const script = document.createElement("script");
    const parsedURL = new URL(url);
    script.src =
        parsedURL.protocol === "data:"
            ? url
            : `${url + (url.includes("?") ? "&" : "?")}t=${Date.now()}`;
    script.id = url;
    script.defer = true;
    script.type = "module";

    let scriptError = null;
    const logError = (e) => {
        scriptError = e;
    };

    global.addEventListener("error", logError);

    const removeScript = () => {
        global.removeEventListener("error", logError);
        document.body.removeChild(script);
    };

    script.addEventListener("error", (e) => {
        pm.reject(e);
        loadingPromise = undefined;
    });

    try {
        document.body.appendChild(script);
    } catch (error) {
        pm.reject(e);
        loadingPromise = undefined;
        log.error("load custom extension error:", error);
    }

    return pm.promise
        .then((v) => {
            if (scriptError) {
                throw scriptError;
            }
            return v;
        })
        .finally(() => {
            loadingPromise = undefined;
            removeScript();
        });
};

module.exports = {
    setupScratchAPI,
    clearScratchAPI,
    loadExtension,
};
