const formatMessage = require('format-message');
const dispatch = require('../dispatch/central-dispatch');
const log = require('../util/log');
const maybeFormatMessage = require('../util/maybe-format-message');

const BlockType = require('./block-type');

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

// const ENV = typeof DEPLOY_ENV === 'undefined' ? 'dev' : DEPLOY_ENV;
// if (ENV === 'dev' || ENV === 'qa') {
//     builtinExtensions.GandiSpineSkeleton = () => require('../blocks/gandi_skeleton/gandi_skeleton');
// }

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
/** 从外部注入的扩展 */
const injectExtensions = {};
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

class ExtensionManager {
    constructor (runtime) {
        /**
         * The ID number to provide to the next extension worker.
         * @type {int}
         */
        this.nextExtensionWorker = 0;

        this._customlExtensionInfo = {};

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
         * TODO: remove this in favor of extensions accessing the runtime as a service.
         * @type {Runtime}
         */
        this.runtime = runtime;

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
    }

    getPreviewExtension () {
        const GandiSpineSkeleton = {
            Extension: () => require('../blocks/gandi_skeleton/gandi_skeleton'),
            info: {
                name: 'GandiSpineSkeleton.extensionName',
                extensionId: 'GandiSpineSkeleton',
                iconURL: 'musicIconURL',
                insetIconURL: 'musicInsetIconURL',
                description: 'GandiSpineSkeleton.description',
                featured: true,
                tags: ['In Development']
                // doc: 'GandiSpineSkeleton.doc',
            },
            l10n: {
                'zh-cn': {
                    'GandiSpineSkeleton.extensionName': 'spine骨骼动画【开发中】',
                    'GandiSpineSkeleton.description': 'v0.01 仅供预览和反馈'
                //   'GandiSpineSkeleton.doc': 'https://dev.ccw.site/extensions/async_asset?minimal',
                },
                'en': {
                    'GandiSpineSkeleton.extensionName': 'spine skeleton animation【In Development】',
                    'GandiSpineSkeleton.description': 'v0.01 only for preview and feedback'
                //   'GandiSpineSkeleton.doc': 'https://getgandi.com/extensions/async_asset?minimal',
                }
            }
        };
        builtinExtensions.GandiSpineSkeleton = () => require('../blocks/gandi_skeleton/gandi_skeleton');
        return {GandiSpineSkeleton};
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
        log(`New extension loaded: ${extensionID} ${value}`);

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
        const registExt = extension => {
            /** @TODO dupe handling for non-builtin extensions. See commit 670e51d33580e8a2e852b3b038bb3afc282f81b9 */
            if (this.isExtensionLoaded(extensionURL)) {
                const message = `Rejecting attempt to load a second extension with ID ${extensionURL}`;
                log.warn(message);
                return Promise.resolve();
            }
            const extensionInstance = new extension(this.runtime);
            const serviceName =
                this._registerInternalExtension(extensionInstance);
            this.setLoadedExtension(extensionURL, serviceName);
            this.runtime.compilerRegisterExtension(
                extensionURL,
                extensionInstance
            );
            return Promise.resolve();
        };

        let extension = this.getLocalExtension(extensionURL);
        if (extension) {
            return registExt(extension);
        }

        // officialExtension
        await this.loadOfficialExtensionsLibrary();
        if (officialExtension[extensionURL]) {
            extension = await this.getOfficialExtension(extensionURL);
            if (extension) {
                this.runtime.emit('EXTENSION_DATA_LOADING', false);
                return registExt(extension.default || extension);
            }
        }

        log.warn(`ccw: [${extensionURL}] not found in remote extensions library,try load as URL`);


        if (!this.runtime.isPlayerOnly) {
            // customExtension.
            await this.loadCustomExtensionsLibrary(null, extensionURL);
            if (customExtension[extensionURL]) {
                extension = await this.getCustomExtension(extensionURL);
                if (extension) {
                    return registExt(extension.default || extension);
                }
                this.runtime.emit('EXTENSION_DATA_LOADING', true); // ccw start loading remote extension event
            }
        }

        // TW
        this.loadingAsyncExtensions++;
        return new Promise((resolve, reject) => {
            this.pendingExtensions.push({extensionURL, resolve, reject});
            this.createExtensionWorker()
                .then(worker => dispatch.addWorker(worker))
                .catch(error => {
                    this.runtime.emit('EXTENSION_NOT_FOUND', extensionURL);
                    return reject(error);
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
        const warningTipText = extensionInfo.warningTipText || this.runtime.getFormatMessage()({
            id: 'gui.extension.compatibilityWarning',
            default: 'This extension is incompatible with Scratch. Projects made with it cannot be uploaded to the Scratch website. You can share the project on Cocrea. Make sure before you use it.',
            description: 'Give a warning when an extension is not official in Scratch.'
        });
        if (!scratchExtension.includes(extensionInfo.id) && this.showCompatibilityWarning) {
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
                    if (typeof blockInfo === 'string' && blockInfo.startsWith('---')) {
                        result = blockInfo;
                    } else {
                        result = this._prepareBlockInfo(
                            serviceName,
                            blockInfo
                        );
                    }
                    // switch (blockInfo) {
                    // case '---': // separator
                    //     result = '---';
                    //     break;
                    // default:
                    //     // an ExtensionBlockMetadata object
                    //     result = this._prepareBlockInfo(
                    //         serviceName,
                    //         blockInfo
                    //     );
                    //     break;
                    // }
                    results.push(result);
                } catch (e) {
                    // TODO: more meaningful error reporting
                    log.error(`Error processing block: ${e.message}, Block:\n${JSON.stringify(blockInfo)}`);
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
                        return serviceObject[funcName](args, util, realBlockInfo);
                    }
                    log.error(`Warning: the method '${funcName}' in the ${
                        serviceObject.constructor.name} has not been implemented yet.`);
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
     * @param {?boolean} isRemoteOperation Whether this is a remote operation
     */
    registerGandiWildExtensions (id, url, isRemoteOperation) {
        if (this.runtime.gandi.wildExtensions[id]) {
            this.runtime.logSystem.warn(`registerGandiWildExtensions: extension id:${id} registered，will be replaced`);
        }
        if (!isRemoteOperation) {
            this.runtime.emitGandiWildExtensionsUpdate({data: {id, url}, type: 'add'});
        }
        this.runtime.gandi.wildExtensions[id] = {
            id,
            url
        };

    }

    shouldReplaceExtension (extensionId) {
        if (
            builtinExtensions.hasOwnProperty(extensionId) ||
            injectExtensions.hasOwnProperty(extensionId)
        ) {
            log.warn(`${extensionId} 已存在，将替换原有扩展`);
            // TODO:  处理重复扩展
        }
    }

    injectExtension (extensionId, extension) {
        this.shouldReplaceExtension(extensionId);
        injectExtensions[extensionId] = () => extension;
    }

    clearLoadedExtensions () {
        this._loadedExtensions.clear();
    }

    registOfficialExtensions (extensionId, extension) {
        this.shouldReplaceExtension(extensionId);
        officialExtension[extensionId] = extension;
    }

    registCustomExtensions (extensionId, extension) {
        this.shouldReplaceExtension(extensionId);
        customExtension[extensionId] = extension;
    }

    getLocalExtension (extensionId) {
        const func = builtinExtensions[extensionId] || injectExtensions[extensionId];
        return func && func();
    }

    async getOfficialExtension (extensionId) {
        const func = officialExtension[extensionId];
        return func && await Promise.resolve(func());
    }

    async getCustomExtension (extensionId) {
        const func = customExtension[extensionId];
        return func && await Promise.resolve(func());
    }

    loadOfficialExtensionsLibrary (serviceURL = '') {
        if (this._officialExtensionInfo) {
            return Promise.resolve(this._officialExtensionInfo);
        }
        let onlineScriptUrl = serviceURL;
        if (!onlineScriptUrl) {
            const ENV = typeof DEPLOY_ENV === 'undefined' ? void 0 : DEPLOY_ENV;
            const staticName = {
                dev: '-dev',
                qa: '-qa',
                prod: ''
            }[ENV];
            // const staticName = '-qa';
            // https://static-dev.xiguacity.cn/h1t86b7fg6c7k36wnt0cb30m/static/js/
            const scriptHost = staticName === void 0 ? '' : `https://static${staticName}.xiguacity.cn/h1t86b7fg6c7k36wnt0cb30m`;

            onlineScriptUrl = `${scriptHost}/static/js/main.js?_=${Date.now()}`;
        }

        if (this.runtime.ccwAPI && this.runtime.ccwAPI.getOnlineExtensionsConfig) {
            onlineScriptUrl = this.runtime.ccwAPI.getOnlineExtensionsConfig().fileSrc || onlineScriptUrl;
        }
        // use 'OfficialExtensions' as script tag dom id
        // make load remote script file only once

        return new Promise((resolve, reject) => this.loadRemoteExtensionWithURL('OfficialExtensions', onlineScriptUrl, async () => {
            if (window.scratchExtensions) {
                const {default: lib} = await window.scratchExtensions.default();
                Object.keys(lib).forEach(key => {
                    const obj = lib[key];
                    const id = (obj.info && obj.info.extensionId) || key;
                    this.registOfficialExtensions(id, obj.Extension);
                });
                this._officialExtensionInfo = lib;
            }
            resolve(this._officialExtensionInfo);
        }, reject));
    }

    loadCustomExtensionsLibrary (url, id) {
        return new Promise((resolve, reject) => {
            if (this._customlExtensionInfo[id]) {
                return resolve(this._customlExtensionInfo);
            }
            if (!url) {
                url = this.runtime.gandi.wildExtensions[id]?.url;
            }
            if (!url) {
                return resolve(this._customlExtensionInfo);
            }
            this.loadRemoteExtensionWithURL(url, url, async () => {
                if (window.ExtensionLib) {
                // where is ExtensionLib?
                // window.ExtensionLib is defined in CCW-Custom-Extension project which host is argument [url] in this function
                    const lib = await window.ExtensionLib;
                    Object.keys(lib).forEach(key => {
                        const obj = lib[key];
                        const extensionId = (obj.info && obj.info.extensionId) || key;
                        this.registCustomExtensions(extensionId, obj.Extension);
                        this.registerGandiWildExtensions(extensionId, url);
                        this._customlExtensionInfo = {...this._customlExtensionInfo, [extensionId]: obj};
                    });
                }
                resolve(this._customlExtensionInfo);
            }, reject);
        });
    }

    loadRemoteExtensionWithURL (uniqueId, url, onLoadSuccess, onLoadError) {
        if (!url) {
            log.warn('loadRemoteExtensionWithURL() url is null');
            return Promise.resolve(null);
        }
        const loader = this.createdScriptLoader(url, uniqueId);
        loader.successCallBack.push(onLoadSuccess);
        loader.failedCallBack.push(onLoadError);
    }

    createdScriptLoader (url, id) {
        const exist = document.getElementById(id);
        if (exist) {
            return exist;
        }
        if (!url) {
            log.warn('onlineScriptUrl is null');
        }
        const script = document.createElement('script');
        script.src = url;
        script.id = id;
        script.defer = true;

        script.successCallBack = [];
        script.failedCallBack = [];

        script.onload = () => {
            script.successCallBack.forEach(cb => cb());
            script.successCallBack = [];
            document.body.removeChild(script);
        };
        script.onerror = e => {
            script.failedCallBack.forEach(cb => cb?.(e));
            script.failedCallBack = [];
            document.body.removeChild(script);
        };
        document.body.append(script);
        return script;
    }

    // powered by xigua end
}

module.exports = ExtensionManager;
