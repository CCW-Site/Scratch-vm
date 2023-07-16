/**
 * Serialize all the assets of the given type ('sounds' or 'costumes')
 * in the provided runtime into an array of file descriptors.
 * A file descriptor is an object containing the name of the file
 * to be written and the contents of the file, the serialized asset.
 * @param {Runtime} runtime The runtime with the assets to be serialized
 * @param {string} assetType The type of assets to be serialized: 'sounds' | 'costumes'
 * @param {string=} optTargetId Optional target id to serialize assets for
 * @returns {Array<object>} An array of file descriptors for each asset
 */
const serializeAssets = function (runtime, assetType, optTargetId) {
    const assetDescs = [];
    let targets;
    if (optTargetId) {
        const target = runtime.getTargetById(optTargetId);
        // The target may not exist.
        if (!target) return assetDescs;
        targets = [target];
    } else {
        targets = [...runtime.targets];
    }
    for (let i = 0; i < targets.length; i++) {
        const currTarget = targets[i];
        if (!currTarget || !currTarget.isOriginal) continue;
        // Got error report that currTarget may undefined sometimes
        // Possible cause: currTarget get a cloned target, and the clone was deleted in same time.
        // unlimited clone max number may cause this problem.
        // make sure currTarget is not undefined
        const currAssets = currTarget.sprite[assetType];
        for (let j = 0; j < currAssets.length; j++) {
            const currAsset = currAssets[j];
            if (currAsset.isRuntimeAsyncLoad) continue;
            const asset = currAsset.asset;
            if (asset) {
                assetDescs.push({
                    fileName: `${asset.assetId}.${asset.dataFormat}`,
                    fileContent: asset.data});
            }
        }
    }
    return assetDescs;
};

/**
 * Serialize all the sounds in the provided runtime or, if a target id is provided,
 * in the specified target into an array of file descriptors.
 * A file descriptor is an object containing the name of the file
 * to be written and the contents of the file, the serialized sound.
 * @param {Runtime} runtime The runtime with the sounds to be serialized
 * @param {string=} optTargetId Optional targetid for serializing sounds of a single target
 * @returns {Array<object>} An array of file descriptors for each sound
 */
const serializeSounds = function (runtime, optTargetId) {
    return serializeAssets(runtime, 'sounds', optTargetId);
};

/**
 * Serialize all the costumes in the provided runtime into an array of file
 * descriptors. A file descriptor is an object containing the name of the file
 * to be written and the contents of the file, the serialized costume.
 * @param {Runtime} runtime The runtime with the costumes to be serialized
 * @param {string} optTargetId Optional targetid for serializing costumes of a single target
 * @returns {Array<object>} An array of file descriptors for each costume
 */
const serializeCostumes = function (runtime, optTargetId) {
    return serializeAssets(runtime, 'costumes', optTargetId);
};

module.exports = {
    serializeSounds,
    serializeCostumes
};
