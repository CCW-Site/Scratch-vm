const dispatch = require('../dispatch/central-dispatch');
const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');
const formatMessage = require('format-message');
const BlockType = require('./block-type');
const ArgumentType = require('./argument-type');
const TargetType = require('./target-type');
const Cast = require('../util/cast');
const Color = require('../util/color');
const createTranslate = require('./tw-l10n');

// These extensions are currently built into the VM repository but should not be loaded at startup.
// TODO: move these out into a separate repository?
// TODO: change extension spec so that library info, including extension ID, can be collected through static methods

const builtinExtensions = {
    // This is an example that isn't loaded with the other core blocks,
    // but serves as a reference for loading core blocks as extensions.
    coreExample: () => require('../blocks/scratch3_core_example'),
    // These are the non-core built-in extensions.
    pen: () => require('../extensions/scratch3_pen'),
    wedo2: () => require('../extensions/scratch3_wedo2'),
    // powered by xigua start
    // music包太大了，放到异步扩展里去
    // music: () => require('../extensions/scratch3_music'),
    // powered by xigua end
    microbit: () => require('../extensions/scratch3_microbit'),
    text2speech: () => require('../extensions/scratch3_text2speech'),
    translate: () => require('../extensions/scratch3_translate'),
    videoSensing: () => require('../extensions/scratch3_video_sensing'),
    ev3: () => require('../extensions/scratch3_ev3'),
    makeymakey: () => require('../extensions/scratch3_makeymakey'),
    boost: () => require('../extensions/scratch3_boost'),
    gdxfor: () => require('../extensions/scratch3_gdx_for'),
    // tw: core extension
    tw: () => require('../extensions/tw')
};

const scratchExtension = [
    'music',
    'pen',
    'videoSensing',
    'text',
    'faceSensing',
    'microbit',
    'text2speech',
    'translate'
];

// powered by xigua start
/** Gandi官方的扩展 */
const officialExtension = {};
/** 用户加载的扩展 */
const customExtension = {};
// powered by xigua end

/**
 * @typedef {object} ArgumentInfo - Information about an extension block argument
 * @property {ArgumentType} type - the type of value this argument can take
 * @property {*|undefined} default - the default value of this argument (default: blank)
 */

/**
 * @typedef {object} ConvertedBlockInfo - Raw extension block data paired with processed data ready for scratch-blocks
 * @property {ExtensionBlockMetadata} info - the raw block info
 * @property {object} json - the scratch-blocks JSON definition for this block
 * @property {string} xml - the scratch-blocks XML definition for this block
 */

/**
 * @typedef {object} CategoryInfo - Information about a block category
 * @property {string} id - the unique ID of this category
 * @property {string} name - the human-readable name of this category
 * @property {string|undefined} blockIconURI - optional URI for the block icon image
 * @property {string} color1 - the primary color for this category, in '#rrggbb' format
 * @property {string} color2 - the secondary color for this category, in '#rrggbb' format
 * @property {string} color3 - the tertiary color for this category, in '#rrggbb' format
 * @property {Array.<ConvertedBlockInfo>} blocks - the blocks, separators, etc. in this category
 * @property {Array.<object>} menus - the menus provided by this category
 */

/**
 * @typedef {object} PendingExtensionWorker - Information about an extension worker still initializing
 * @property {string} extensionURL - the URL of the extension to be loaded by this worker
 * @property {Function} resolve - function to call on successful worker startup
 * @property {Function} reject - function to call on failed worker startup
 */

const createExtensionService = extensionManager => {
    const service = {};
    service.registerExtensionServiceSync =
        extensionManager.registerExtensionServiceSync.bind(extensionManager);
    service.allocateWorker =
        extensionManager.allocateWorker.bind(extensionManager);
    service.onWorkerInit = extensionManager.onWorkerInit.bind(extensionManager);
    service.registerExtensionService =
        extensionManager.registerExtensionService.bind(extensionManager);
    return service;
};

// check if func is a class
const isConstructor = value => {
    try {
        // eslint-disable-next-line no-new
        new new Proxy(value, {
            construct () {
                return {};
            }
        })();
        return true;
    } catch (err) {
        return false;
    }
};

class ExtensionManager {
    constructor (vm) {
        /**
         * The ID number to provide to the next extension worker.
         * @type {int}
         */
        this.nextExtensionWorker = 0;

        /**
         * FIFO queue of extensions which have been requested but not yet loaded in a worker,
         * along with promise resolution functions to call once the worker is ready or failed.
         *
         * @type {Array.<PendingExtensionWorker>}
         */
        this.pendingExtensions = [];

        /**
         * Map of worker ID to workers which have been allocated but have not yet finished initialization.
         * @type {Array.<PendingExtensionWorker>}
         */
        this.pendingWorkers = [];

        /**
         * Set of loaded extension URLs/IDs (equivalent for built-in extensions).
         * @type {Set.<string>}
         * @private
         */
        this._loadedExtensions = new Map();

        /**
         * Controls how remote custom extensions are loaded.
         * One of the strings:
         *  - "worker" (default)
         *  - "iframe"
         */
        this.workerMode = 'worker';

        /**
         * Whether to show a warning that extensions are officially incompatible with Scratch.
         * @type {boolean>}
         */
        this.showCompatibilityWarning = false;

        /**
         * Keep a reference to the runtime so we can construct internal extension objects.
         * @type {Runtime}
         */
        this.runtime = vm.runtime;
        this.vm = vm;

        this.loadingAsyncExtensions = 0;
        this.asyncExtensionsLoadedCallbacks = [];

        dispatch
            .setService('extensions', createExtensionService(this))
            .catch(e => {
                log.error(
                    `ExtensionManager was unable to register extension service: ${JSON.stringify(
                        e
                    )}`
                );
            });

        this._customExtensionInfo = {};
        this._officialExtensionInfo = {};
    }

    /**
     * Check whether an extension is registered or is in the process of loading. This is intended to control loading or
     * adding extensions so it may return `true` before the extension is ready to be used. Use the promise returned by
     * `loadExtensionURL` if you need to wait until the extension is truly ready.
     * @param {string} extensionID - the ID of the extension.
     * @returns {boolean} - true if loaded, false otherwise.
     */
    isExtensionLoaded (extensionID) {
        return this._loadedExtensions.has(extensionID);
    }

    setLoadedExtension (extensionID, value) {
        const customExt = this._customExtensionInfo[extensionID] || this._officialExtensionInfo[extensionID];
        if (customExt && customExt.url) {
            this.saveWildExtensionsURL(extensionID, customExt.url);
        }
        this._loadedExtensions.set(extensionID, value);
    }

    /**
     * Synchronously load an internal extension (core or non-core) by ID. This call will
     * fail if the provided id is not does not match an internal extension.
     * @param {string} extensionId - the ID of an internal extension
     */
    loadExtensionIdSync (extensionId) {
        if (!builtinExtensions.hasOwnProperty(extensionId)) {
            log.warn(
                `Could not find extension ${extensionId} in the built in extensions.`
            );
            return;
        }

        /** @TODO dupe handling for non-builtin extensions. See commit 670e51d33580e8a2e852b3b038bb3afc282f81b9 */
        if (this.isExtensionLoaded(extensionId)) {
            const message = `Rejecting attempt to load a second extension with ID ${extensionId}`;
            log.warn(message);
            return;
        }

        const extension = builtinExtensions[extensionId]();
        const extensionInstance = new extension(this.runtime);
        const serviceName = this._registerInternalExtension(extensionInstance);
        this.setLoadedExtension(extensionId, serviceName);
        this.runtime.compilerRegisterExtension(extensionId, extensionInstance);
    }

    /**
     * Load an extension by URL or internal extension ID
     * @param {string} extensionURL - the URL for the extension to load OR the ID of an internal extension
     * @returns {Promise} resolved once the extension is loaded and initialized or rejected on failure
     */
    async loadExtensionURL (extensionURL) {
        if (this.isBuiltinExtension(extensionURL)) {
            this.loadExtensionIdSync(extensionURL);
            return Promise.resolve();
        }

        if (this.isExternalExtension(extensionURL)) {
            return this.loadExternalExtensionById(extensionURL);
        }

        if (!this.isValidExtensionURL(extensionURL)) {
            const wildExt = this.runtime.gandi.wildExtensions[extensionURL];
            extensionURL = wildExt ? wildExt.url : '';
        }

        if (this.isValidExtensionURL(extensionURL)) {
            log.warn(
                `ccw: [${extensionURL}] not found in extensions library,try load as URL`
            );
            const res = await this.loadExternalExtensionToLibrary(extensionURL);
            const allLoader = res.map(extId => {
                if (this.isExtensionLoaded(extId)) {
                    return Promise.resolve();
                }
                return this.loadExternalExtensionById(extId);
            });
            return Promise.all(allLoader);
        }

        // try ask user to input url to load extension
        if (extensionURL && !extensionURL.startsWith('http')) {
            // eslint-disable-next-line no-alert
            const url = prompt(
                formatMessage(
                    {
                        id: 'gui.extension.custom.load.inputURLTip',
                        default: `input custom extension [${extensionURL}]'s URL`
                    },
                    {extName: `${extensionURL}\n`}
                )
            );
            if (!this.isValidExtensionURL(url)) {
                throw new Error(`Invalid extension URL: ${extensionURL}`);
            }
            return this.loadExtensionURL(extensionURL);
        }

        this.loadingAsyncExtensions++;
        return new Promise((resolve, reject) => {
            this.pendingExtensions.push({extensionURL, resolve, reject});
            this.createExtensionWorker()
                .then(worker => dispatch.addWorker(worker))
                .catch(_error => {
                    this.runtime.emit('EXTENSION_NOT_FOUND', extensionURL);
                    log.error(_error);
                    return reject(_error);
                });
        }).finally(() => this.runtime.emit('EXTENSION_DATA_LOADING', false));
    }

    /**
     * Wait until all async extensions have loaded
     * @returns {Promise} resolved when all async extensions have loaded
     */
    allAsyncExtensionsLoaded () {
        if (this.loadingAsyncExtensions === 0) {
            return;
        }
        return new Promise(resolve => {
            this.asyncExtensionsLoadedCallbacks.push(resolve);
        });
    }

    /**
     * Creates a new extension worker.
     * @returns {Promise}
     */
    createExtensionWorker () {
        if (this.workerMode === 'worker') {
            // eslint-disable-next-line max-len
            const ExtensionWorker = require('worker-loader?inline=true!./extension-worker');
            return Promise.resolve(new ExtensionWorker());
        } else if (this.workerMode === 'iframe') {
            return import(
                /* webpackChunkName: "iframe-extension-worker" */ './tw-iframe-extension-worker'
            ).then(mod => new mod.default());
        }
        return Promise.reject(new Error('Unknown extension worker mode'));
    }

    /**
     * Regenerate blockinfo for any loaded extensions
     * @returns {Promise} resolved once all the extensions have been reinitialized
     */
    refreshBlocks () {
        const allPromises = Array.from(this._loadedExtensions.values()).map(
            serviceName =>
                dispatch
                    .call(serviceName, 'getInfo')
                    .then(info => {
                        info = this._prepareExtensionInfo(serviceName, info);
                        dispatch.call(
                            'runtime',
                            '_refreshExtensionPrimitives',
                            info
                        );
                    })
                    .catch(e => {
                        log.error(
                            `Failed to refresh built-in extension primitives: ${JSON.stringify(
                                e
                            )}`
                        );
                    })
        );
        return Promise.all(allPromises);
    }

    allocateWorker () {
        const id = this.nextExtensionWorker++;
        const workerInfo = this.pendingExtensions.shift();
        this.pendingWorkers[id] = workerInfo;
        return [id, workerInfo.extensionURL];
    }

    /**
     * Synchronously collect extension metadata from the specified service and begin the extension registration process.
     * @param {string} serviceName - the name of the service hosting the extension.
     */
    registerExtensionServiceSync (serviceName) {
        const info = dispatch.callSync(serviceName, 'getInfo');
        this._registerExtensionInfo(serviceName, info);
    }

    /**
     * Collect extension metadata from the specified service and begin the extension registration process.
     * @param {string} serviceName - the name of the service hosting the extension.
     */
    registerExtensionService (serviceName) {
        dispatch.call(serviceName, 'getInfo').then(info => {
            this.setLoadedExtension(info.id, serviceName);
            this._registerExtensionInfo(serviceName, info);

            this.loadingAsyncExtensions--;
            if (this.loadingAsyncExtensions === 0) {
                this.asyncExtensionsLoadedCallbacks.forEach(i => i());
                this.asyncExtensionsLoadedCallbacks = [];
            }
        });
    }

    /**
     * Called by an extension worker to indicate that the worker has finished initialization.
     * @param {int} id - the worker ID.
     * @param {*?} e - the error encountered during initialization, if any.
     */
    onWorkerInit (id, e) {
        const workerInfo = this.pendingWorkers[id];
        delete this.pendingWorkers[id];
        if (e) {
            this.loadingAsyncExtensions = 0;
            workerInfo.reject(e);
        } else {
            workerInfo.resolve(id);
        }
    }

    /**
     * Register an internal (non-Worker) extension object
     * @param {object} extensionObject - the extension object to register
     * @returns {string} The name of the registered extension service
     */
    _registerInternalExtension (extensionObject) {
        const extensionInfo = extensionObject.getInfo();
        const fakeWorkerId = this.nextExtensionWorker++;
        const serviceName = `extension_${fakeWorkerId}_${extensionInfo.id}`;
        dispatch.setServiceSync(serviceName, extensionObject);
        dispatch.callSync(
            'extensions',
            'registerExtensionServiceSync',
            serviceName
        );
        return serviceName;
    }

    /**
     * Sanitize extension info then register its primitives with the VM.
     * @param {string} serviceName - the name of the service hosting the extension
     * @param {ExtensionInfo} extensionInfo - the extension's metadata
     * @private
     */
    _registerExtensionInfo (serviceName, extensionInfo) {
        extensionInfo = this._prepareExtensionInfo(serviceName, extensionInfo);
        dispatch
            .call('runtime', '_registerExtensionPrimitives', extensionInfo)
            .catch(e => {
                log.error(
                    `Failed to register primitives for extension on service ${serviceName}:`,
                    e
                );
            });
    }

    /**
     * Modify the provided text as necessary to ensure that it may be used as an attribute value in valid XML.
     * @param {string} text - the text to be sanitized
     * @returns {string} - the sanitized text
     * @private
     */
    _sanitizeID (text) {
        return text.toString().replace(/[<"&]/, '_');
    }

    /**
     * Apply minor cleanup and defaults for optional extension fields.
     * TODO: make the ID unique in cases where two copies of the same extension are loaded.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {ExtensionInfo} extensionInfo - the extension info to be sanitized
     * @returns {ExtensionInfo} - a new extension info object with cleaned-up values
     * @private
     */
    _prepareExtensionInfo (serviceName, extensionInfo) {
        extensionInfo = Object.assign({}, extensionInfo);
        // Allowed ID characters are those matching the regular expression [\w-.]: A-Z, a-z, 0-9, hyphen ("-") and dot (".") .
        if (/[^\w-.]/i.test(extensionInfo.id)) {
            throw new Error('Invalid extension id');
        }
        if (
            !scratchExtension.includes(extensionInfo.id) &&
            this.showCompatibilityWarning
        ) {

            const warningTipText =
                extensionInfo.warningTipText ||
                this.runtime.getFormatMessage()({
                    id: 'gui.extension.compatibilityWarning',
                    default:
                        'This extension is incompatible with Scratch. Projects made with it cannot be uploaded to the Scratch website. You can share the project on Cocrea. Make sure before you use it.',
                    description:
                        'Give a warning when an extension is not official in Scratch.'
                });
            extensionInfo.warningTipText = warningTipText;
        } else {
            delete extensionInfo.warningTipText;
        }
        extensionInfo.name = extensionInfo.name || extensionInfo.id;
        extensionInfo.blocks = extensionInfo.blocks || [];
        extensionInfo.targetTypes = extensionInfo.targetTypes || [];
        extensionInfo.blocks = extensionInfo.blocks.reduce(
            (results, blockInfo) => {
                try {
                    let result;
                    if (
                        typeof blockInfo === 'string' &&
                        blockInfo.startsWith('---')
                    ) {
                        result = blockInfo;
                    } else {
                        result = this._prepareBlockInfo(serviceName, blockInfo);
                    }
                    results.push(result);
                } catch (e) {
                    // TODO: more meaningful error reporting
                    log.error(
                        `Error processing block: ${e.message
                        }, Block:\n${JSON.stringify(blockInfo)}`
                    );
                }
                return results;
            },
            []
        );
        extensionInfo.menus = extensionInfo.menus || {};
        extensionInfo.menus = this._prepareMenuInfo(
            serviceName,
            extensionInfo.menus
        );
        return extensionInfo;
    }

    /**
     * Prepare extension menus. e.g. setup binding for dynamic menu functions.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {Array.<MenuInfo>} menus - the menu defined by the extension.
     * @returns {Array.<MenuInfo>} - a menuInfo object with all preprocessing done.
     * @private
     */
    _prepareMenuInfo (serviceName, menus) {
        const menuNames = Object.getOwnPropertyNames(menus);
        for (let i = 0; i < menuNames.length; i++) {
            const menuName = menuNames[i];
            let menuInfo = menus[menuName];

            // If the menu description is in short form (items only) then normalize it to general form: an object with
            // its items listed in an `items` property.
            if (!menuInfo.items) {
                menuInfo = {
                    items: menuInfo
                };
                menus[menuName] = menuInfo;
            }
            // If `items` is a string, it should be the name of a function in the extension object. Calling the
            // function should return an array of items to populate the menu when it is opened.
            if (typeof menuInfo.items === 'string') {
                const menuItemFunctionName = menuInfo.items;
                const serviceObject = dispatch.services[serviceName];
                // Bind the function here so we can pass a simple item generation function to Scratch Blocks later.
                menuInfo.items = this._getExtensionMenuItems.bind(
                    this,
                    serviceObject,
                    menuItemFunctionName
                );
            }
        }
        return menus;
    }

    /**
     * Fetch the items for a particular extension menu, providing the target ID for context.
     * @param {object} extensionObject - the extension object providing the menu.
     * @param {string} menuItemFunctionName - the name of the menu function to call.
     * @returns {Array} menu items ready for scratch-blocks.
     * @private
     */
    _getExtensionMenuItems (extensionObject, menuItemFunctionName) {
        // Fetch the items appropriate for the target currently being edited. This assumes that menus only
        // collect items when opened by the user while editing a particular target.
        const editingTarget =
            this.runtime.getEditingTarget() || this.runtime.getTargetForStage();
        const editingTargetID = editingTarget ? editingTarget.id : null;
        const extensionMessageContext =
            this.runtime.makeMessageContextForTarget(editingTarget);

        // TODO: Fix this to use dispatch.call when extensions are running in workers.
        const menuFunc = extensionObject[menuItemFunctionName];
        const menuItems = menuFunc
            .call(extensionObject, editingTargetID)
            // add dynamic menu items from gandi, such as custom skeleton or async asset
            .concat(
                this.runtime.gandi.dynamicMenuItems[menuItemFunctionName] ?? []
            )
            .map(item => {
                item = maybeFormatMessage(item, extensionMessageContext);
                switch (typeof item) {
                case 'object':
                    return [
                        maybeFormatMessage(
                            item.text,
                            extensionMessageContext
                        ),
                        item.value
                    ];
                case 'string':
                    return [item, item];
                default:
                    return item;
                }
            });

        if (!menuItems || menuItems.length < 1) {
            throw new Error(
                `Extension menu returned no items: ${menuItemFunctionName}`
            );
        }
        return menuItems;
    }

    /**
     * Apply defaults for optional block fields.
     * @param {string} serviceName - the name of the service hosting this extension block
     * @param {ExtensionBlockMetadata} blockInfo - the block info from the extension
     * @returns {ExtensionBlockMetadata} - a new block info object which has values for all relevant optional fields.
     * @private
     */
    _prepareBlockInfo (serviceName, blockInfo) {
        blockInfo = Object.assign(
            {},
            {
                blockType: BlockType.COMMAND,
                terminal: false,
                blockAllThreads: false,
                arguments: {}
            },
            blockInfo
        );
        blockInfo.opcode =
            blockInfo.opcode && this._sanitizeID(blockInfo.opcode);
        blockInfo.text = blockInfo.text || blockInfo.opcode;

        switch (blockInfo.blockType) {
        case BlockType.EVENT:
            if (blockInfo.func) {
                log.warn(
                    `Ignoring function "${blockInfo.func}" for event block ${blockInfo.opcode}`
                );
            }
            break;
        case BlockType.BUTTON:
            if (blockInfo.opcode) {
                log.warn(
                    `Ignoring opcode "${blockInfo.opcode}" for button with text: ${blockInfo.text}`
                );
            }
            break;
        case BlockType.LABEL:
            if (blockInfo.opcode) {
                log.warn(`Ignoring opcode "${blockInfo.opcode}" for label: ${blockInfo.text}`);
            }
            break;
        default: {
            if (!blockInfo.opcode) {
                throw new Error('Missing opcode for block');
            }

            const funcName = blockInfo.func ?
                this._sanitizeID(blockInfo.func) :
                blockInfo.opcode;

            const getBlockInfo = blockInfo.isDynamic ?
                args => args && args.mutation && args.mutation.blockInfo :
                () => blockInfo;
            const callBlockFunc = (() => {
                if (dispatch._isRemoteService(serviceName)) {
                    return (args, util, realBlockInfo) =>
                        dispatch.call(
                            serviceName,
                            funcName,
                            args,
                            util,
                            realBlockInfo
                        );
                }

                // avoid promise latency if we can call direct
                const serviceObject = dispatch.services[serviceName];
                if (!serviceObject[funcName]) {
                    // The function might show up later as a dynamic property of the service object
                    log.warn(
                        `Could not find extension block function called ${funcName}`
                    );
                }

                return (args, util, realBlockInfo) => {
                    if (serviceObject[funcName]) {
                        return serviceObject[funcName](
                            args,
                            util,
                            realBlockInfo
                        );
                    }
                    log.error(
                        `Warning: the method '${funcName}' in the ${serviceObject.constructor.name} has not been implemented yet.`
                    );
                };
            })();

            blockInfo.func = (args, util) => {
                const realBlockInfo = getBlockInfo(args);
                // TODO: filter args using the keys of realBlockInfo.arguments? maybe only if sandboxed?
                return callBlockFunc(args, util, realBlockInfo);
            };
            break;
        }
        }

        return blockInfo;
    }

    // powered by xigua start

    /**
     * @description register gandi extension when developer load custom extension
     * @param {string} id extension id
     * @param {string} url extension url
     */
    saveWildExtensionsURL (id, url) {
        if (this.runtime.gandi.wildExtensions[id]) return;

        this.runtime.gandi.wildExtensions[id] = {id, url};
        this.runtime.emitGandiWildExtensionsChanged(['add', id, {id, url}]);
    }

    async loadExternalExtensionById (extensionId) {
        const registerExt = extension => {
            if (this.isExtensionLoaded(extensionId)) {
                const message = `Rejecting attempt to load a second extension with ID ${extensionId}`;
                log.warn(message);
                return Promise.resolve();
            }
            const extensionInstance = new extension(this.runtime);
            const serviceName =
                this._registerInternalExtension(extensionInstance);
            this.setLoadedExtension(extensionId, serviceName);
            this.runtime.compilerRegisterExtension(
                extensionId,
                extensionInstance
            );
            return Promise.resolve();
        };

        const extension = await this.getExternalExtensionConstructor(
            extensionId
        );
        if (extension) {
            return registerExt(extension);
        }
        return Promise.reject(new Error(`Extension not found: ${extensionId}`));
    }

    isValidExtensionURL (extensionURL) {
        try {
            const parsedURL = new URL(extensionURL);
            return (
                parsedURL.protocol === 'https:' ||
                parsedURL.protocol === 'http:'
            );
        } catch (e) {
            return false;
        }
    }

    injectExtension (extensionId, extension) {
        builtinExtensions[extensionId] = () => extension;
    }

    isBuiltinExtension (extensionId) {
        return builtinExtensions.hasOwnProperty(extensionId);
    }

    isExternalExtension (extensionId) {
        return (
            officialExtension.hasOwnProperty(extensionId) ||
            customExtension.hasOwnProperty(extensionId)
        );
    }

    clearLoadedExtensions () {
        this._loadedExtensions.clear();
    }

    addOfficialExtensionInfo (obj) {
        const extensionId = obj.info && obj.info.extensionId;
        if (!extensionId) {
            throw new Error('extensionId not found, add extensionInfo failed');
        }
        this._officialExtensionInfo[extensionId] = obj;
        officialExtension[extensionId] = obj.Extension;
    }

    addCustomExtensionInfo (obj) {
        const extensionId = obj.info && obj.info.extensionId;
        if (!extensionId) {
            throw new Error('extensionId is null in extensionInfo');
        }
        this._customExtensionInfo[extensionId] = obj;
        if (isConstructor(obj.Extension)) {
            customExtension[extensionId] = () => obj.Extension;
        } else {
            customExtension[extensionId] = obj.Extension;
        }
    }

    async getExternalExtensionConstructor (extensionId) {
        const externalExt = {
            ...officialExtension,
            ...customExtension
        };
        const func = externalExt[extensionId];
        if (typeof func === 'function') {
            // all extension is warp in a function, so we need to call it to get the extension class
            // it returns has three possibility by different extension source or template
            let extClass = await func();
            if (
                extClass &&
                extClass.__esModule &&
                extClass.default &&
                isConstructor(extClass.default)
            ) {
                // 1. return a es modules which from gandi ext lib
                // cache the constructor
                externalExt[extensionId] = () => extClass.default;
                return extClass.default;
            } else if (isConstructor(extClass)) {
                // 2. return a constructor
                return extClass;
            }
            // 3. return a IIFE which called global Scratch.extensions.register to register
            //      it will replace officialExtension[extensionId] when register success
            //      so try get again;
            extClass = externalExt[extensionId];
            if (isConstructor(extClass)) {
                return extClass;
            }
        }
        throw new Error(`extension class not found: ${extensionId}`);
    }

    async getCustomExtensionClass (extensionId) {
        const func = customExtension[extensionId];
        if (typeof func === 'function') {
            if (isConstructor(func)) {
                return func;
            }
            const extClass = await func();
            if (extClass.default) {
                return extClass.default;
            }
        } else if (
            typeof func === 'object' &&
            typeof func.getInfo === 'function' &&
            /^class\s/.test(Function.prototype.toString.call(func.constructor))
        ) {
            return func.constructor;
        }
        throw new Error(`extension class not found: ${extensionId}`);
    }

    async loadExternalExtensionToLibrary (url) {
        return new Promise((resolve, reject) => {
            this.createdScriptLoader({
                url,
                onSuccess: async () => {
                    const res = [];
                    if (window.IIFEExtensionInfoList) {
                        // for those extension which registered by scratch.extensions.register in IIFE
                        window.IIFEExtensionInfoList.forEach(obj => {
                            obj.url = url;
                            this.addCustomExtensionInfo(obj);
                            res.push(obj.info.extensionId);
                        });
                        delete window.IIFEExtensionInfoList;
                    }
                    if (window.ExtensionLib) {
                        // for those extension which developed by user using ccw-customExt-tool
                        const lib = await window.ExtensionLib;
                        Object.keys(lib).forEach(key => {
                            const obj = lib[key];
                            obj.url = url;
                            this.addCustomExtensionInfo(obj);
                            res.push(obj.info.extensionId);
                        });
                        delete window.ExtensionLib;
                    }
                    if (window.tempExt) {
                        // for user developing custom extension
                        const obj = window.tempExt;
                        obj.url = url;
                        this.addCustomExtensionInfo(obj);
                        res.push(obj.info.extensionId);
                        delete window.tempExt;
                    }
                    if (window.scratchExtensions) {
                        // for Gandi extension service
                        const {default: lib} =
                            await window.scratchExtensions.default();
                        Object.entries(lib).forEach(([key, obj]) => {
                            if (!(obj.info && obj.info.extensionId)) {
                                // compatible with some legacy gandi extension service
                                obj.info = obj.info || {};
                                obj.info.extensionId = key;
                            }
                            this.addOfficialExtensionInfo(obj);
                            res.push(obj.info && obj.info.extensionId);
                        });
                        window.scratchExtensions = null;
                    }
                    if (res.length > 0) {
                        this.runtime.emit('EXTENSION_LIBRARY_UPDATED');
                    }
                    resolve(res);
                },
                onError: reject
            });
            // eslint-disable-next-line no-console
        }).catch(e => log.error('LoadRemoteExtensionError: ', e));
    }

    createdScriptLoader ({url, onSuccess, onError}) {
        if (!url) {
            return onError('remote extension url is null');
        }
        this.setupScratchAPIForExtension(this.vm);
        const exist = document.getElementById(url);
        if (exist) {
            log.warn(`${url} remote extension script already loaded before`);
            exist.successCallBack.push(onSuccess);
            exist.failedCallBack.push(onError);
            return exist;
        }
        if (!url) {
            log.warn('remote extension url is null');
        }
        const script = document.createElement('script');

        script.src = `${url + (url.includes('?') ? '&' : '?')}t=${Date.now()}`;
        script.id = url;
        script.defer = true;
        script.type = 'module';

        script.successCallBack = [onSuccess];
        script.failedCallBack = [onError];

        script.onload = () => {
            script.successCallBack.forEach(cb => cb(url));
            script.successCallBack = [];
            document.body.removeChild(script);
        };
        script.onerror = e => {
            script.failedCallBack.forEach(cb => cb?.(e));
            script.failedCallBack = [];
            document.body.removeChild(script);
        };
        try {
            document.body.append(script);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('load custom extension error:', error);
        }
        return script;
    }

    // output a Scratch Object contains APIs all extension needed
    setupScratchAPIForExtension (vm) {
        const registerExt = extensionInstance => {
            const info = extensionInstance.getInfo();
            const extensionId = info.id;
            if (this.isExtensionLoaded(extensionId)) {
                const message = `Rejecting attempt to load a second extension with ID ${extensionId}`;
                log.warn(message);
                return;
            }

            const serviceName =
                this._registerInternalExtension(extensionInstance);
            this.setLoadedExtension(extensionId, serviceName);
            this.runtime.compilerRegisterExtension(
                extensionId,
                extensionInstance
            );
            const extObj = {
                info: {
                    name: info.name,
                    extensionId
                },
                Extension: () => extensionInstance.constructor
            };
            window.IIFEExtensionInfoList = window.IIFEExtensionInfoList || [];
            window.IIFEExtensionInfoList.push(extObj);
            return;
        };
        const scratch = {
            get ArgumentType () {
                return ArgumentType;
            },
            get BlockType () {
                return BlockType;
            },
            get TargetType () {
                return TargetType;
            },
            get Cast () {
                return Cast;
            },
            get Color () {
                return Color;
            },
            get translate () {
                return createTranslate(vm.runtime);
            },
            get renderer () {
                return vm.runtime.renderer;
            },
            get runtime () {
                return vm.runtime;
            },
            get extensions () {
                return {
                    register: registerExt
                };
            }
        };
        global.Scratch = Object.assign(global.Scratch || {}, scratch);
    }

    /**
     * Remove all extensions from services.
     * If we don't do so, this will cause memory leak on Single Page Application.
     */
    disposeExtensionServices () {
        Object.keys(dispatch.services).forEach(serviceName => {
            if (/^extension_\d+_/.test(serviceName)) {
                delete dispatch.services[serviceName];
            }
        });
    }

    getLoadedExtensionURLs () {
        const loadURLs = this._loadedExtensions.keys().map(extId => {
            const ext = this._customExtensionInfo[extId] || this._officialExtensionInfo[extId];
            if (ext && ext.url) {
                return {[extId]: ext.url};
            }
            return null;
        })
            .filter(Boolean);
        return loadURLs;
    }
    // powered by xigua end
}

module.exports = ExtensionManager;
