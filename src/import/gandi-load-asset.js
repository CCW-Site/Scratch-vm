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
    const DataFormat = runtime.storage.DataFormat;
    const assetType = (ext === DataFormat.PYTHON) ? AssetType.Python : AssetType.Json;

    const filePromise = runtime.storage.load(assetType, md5, ext);
    if (!filePromise) {
        log.error(`Couldn't fetch costume asset: ${md5ext}`);
        return;
    }

    return filePromise.then(res => {
        gandiAsset.asset = res;
        return gandiAsset;
    });
};

module.exports = {
    loadGandiAsset
};