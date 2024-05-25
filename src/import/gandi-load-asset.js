const StringUtil = require('../util/string-util');
const log = require('../util/log');

/**
 * Load a Gandi's extended asset into memory asynchronously.
 * @property {string} md5ext - the MD5 and extension of the sound to be loaded.
 * @property {Buffer} gandiAsset - asset data will be written here once loaded.
 * @param {!Runtime} runtime - Scratch runtime, used to access the storage module.

 * @returns {!Promise} - a promise which will resolve to the sound when ready.
 */
const loadGandiAsset = (md5ext, gandiAsset, runtime) => {
    const idParts = StringUtil.splitFirst(md5ext, '.');
    const md5 = idParts[0];
    const ext = idParts[1].toLowerCase();
    gandiAsset.dataFormat = ext;

    // TODO: Gandi support upload local file
    // if (gandiAsset.asset) {
    //     // Costume comes with asset. It could be coming from image upload, drag and drop, or file
    //     return loadCostumeFromAsset(costume, runtime, optVersion);
    // }

    // Need to load the costume from storage. The server should have a reference to this md5.
    if (!runtime.storage) {
        log.error('No storage module present; cannot load costume asset: ', md5ext);
        return Promise.resolve(gandiAsset);
    }

    // if (!runtime.storage.defaultAssetId) {
    //     log.error(`No default assets found`);
    //     return Promise.resolve(gandiAsset);
    // }
    const AssetType = runtime.storage.AssetType;
    let assetType = null;
    switch (ext) {
    case AssetType.Python.runtimeFormat:
        assetType = AssetType.Python;
        break;
    case AssetType.Json.runtimeFormat:
        assetType = AssetType.Json;
        break;
    case AssetType.JavaScript.runtimeFormat:
        // extension file  is .js, use reserved name to check if it is an extension asset
        // reserved file name: 'extension' , case insensitive
        assetType = gandiAsset.name.toLowerCase() === AssetType.Extension.name.toLowerCase() ? AssetType.Extension : AssetType.JavaScript;
        break;
    case AssetType.GLSL.runtimeFormat:
        assetType = AssetType.GLSL;
        break;
    default:
        log.warn('Gandi asset did not match any assetType, treat it as AssetType.Json', gandiAsset);
        assetType = AssetType.Json;
        break;
    }

    gandiAsset.assetType = assetType;

    const isSupported = runtime.gandi.supportedAssetTypes.some(type => type.name === assetType.name);
    if (!isSupported && !runtime.isPlayerOnly) {
        log.error(`unsupported assets type: ${assetType.name} ${md5ext}`);
        return Promise.resolve(gandiAsset);
    }

    const filePromise = runtime.storage.load(assetType, md5, ext);
    if (!filePromise) {
        log.error(`Couldn't fetch costume asset: ${md5ext}`);
        return Promise.resolve(gandiAsset);
    }

    return filePromise.then(asset => {
        if (!asset) {
            log.error(`Couldn't fetch asset: ${md5ext}, fileName: ${gandiAsset.name}.${gandiAsset.dataFormat}`);
        }
        runtime.emit('LOAD_ASSETS_PROGRESS', gandiAsset);
        gandiAsset.asset = asset;
        return gandiAsset;
    });
};

module.exports = {
    loadGandiAsset
};
