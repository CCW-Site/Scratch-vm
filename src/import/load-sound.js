const StringUtil = require('../util/string-util');
const log = require('../util/log');
const uid = require('../util/uid');

/**
 * Initialize a sound from an asset asynchronously.
 * @param {!object} sound - the Scratch sound object.
 * @property {string=} id Optional uid for sound; a new one will be generated if
 *     not provided.
 * @property {string} md5 - the MD5 and extension of the sound to be loaded.
 * @property {Buffer} data - sound data will be written here once loaded.
 * @param {!Asset} soundAsset - the asset loaded from storage.
 * @param {!Runtime} runtime - Scratch runtime, used to access the storage module.
 * @param {SoundBank} soundBank - Scratch Audio SoundBank to add sounds to.
 * @returns {!Promise} - a promise which will resolve to the sound when ready.
 */
const loadSoundFromAsset = function (sound, soundAsset, runtime, soundBank) {
    sound.id = sound.id || uid();
    sound.assetId = soundAsset.assetId;
    if (!runtime.audioEngine) {
        log.error('No audio engine present; cannot load sound asset: ', sound.md5);
        return Promise.resolve(sound);
    }
    return runtime.audioEngine.decodeSoundPlayer(Object.assign(
        {},
        sound,
        {data: soundAsset.data}
    )).then(soundPlayer => {
        sound.soundId = soundPlayer.id;
        // Set the sound sample rate and sample count based on the
        // the audio buffer from the audio engine since the sound
        // gets resampled by the audio engine
        const soundBuffer = soundPlayer.buffer;
        sound.rate = soundBuffer.sampleRate;
        sound.sampleCount = soundBuffer.length;

        if (soundBank !== null) {
            soundBank.addSoundPlayer(soundPlayer);
        }
        runtime.emit('LOAD_ASSETS_PROGRESS', sound);
        return sound;
    });
};

/**
 * Handle sound loading errors by replacing the runtime sound with the
 * default sound from storage, but keeping track of the original sound metadata
 * in a `broken` field.
 *
 * @param {Object} sound - The sound object that failed to load.
 * @param {Object} runtime - The runtime environment.
 * @param {Object} runtime.storage - Storage related methods and properties.
 * @param {Function} runtime.emit - Function to emit events.
 * @param {Object} soundBank - The sound bank that manages loaded sounds.
 * @returns {Promise<Object>} A promise that resolves to the loaded sound.
 */
const handleSoundLoadError = function (sound, runtime, soundBank) {

    // Keep track of the old asset information until we're done loading the default sound
    const oldAsset = sound.asset; // could be null
    const oldAssetId = sound.assetId;
    const oldSample = sound.sampleCount;
    const oldRate = sound.rate;
    const oldFormat = sound.format;
    const oldDataFormat = sound.dataFormat;

    runtime.emit('LOAD_ASSET_FAILED', {assetType: 'sound', name: sound.name, assetId: sound.assetId});
                
    // Use default asset if original fails to load
    sound.assetId = runtime.storage.defaultAssetId.Sound;
    sound.asset = runtime.storage.get(sound.assetId);
    sound.md5 = `${sound.assetId}.${sound.asset.dataFormat}`;

    return loadSoundFromAsset(sound, sound.asset, runtime, soundBank).then(loadedSound => {
        loadedSound.broken = {};
        loadedSound.broken.assetId = oldAssetId;
        loadedSound.broken.md5 = `${oldAssetId}.${oldDataFormat}`;

        // Should be null if we got here because the sound was missing
        loadedSound.broken.asset = oldAsset;
        
        loadedSound.broken.sampleCount = oldSample;
        loadedSound.broken.rate = oldRate;
        loadedSound.broken.format = oldFormat;
        loadedSound.broken.dataFormat = oldDataFormat;
        
        return loadedSound;
    });
};

/**
 * Load a sound's asset into memory asynchronously.
 * @param {!object} sound - the Scratch sound object.
 * @property {string} md5 - the MD5 and extension of the sound to be loaded.
 * @property {Buffer} data - sound data will be written here once loaded.
 * @param {!Runtime} runtime - Scratch runtime, used to access the storage module.
 * @param {SoundBank} soundBank - Scratch Audio SoundBank to add sounds to.
 * @returns {!Promise} - a promise which will resolve to the sound when ready.
 */
const loadSound = function (sound, runtime, soundBank) {
    if (!runtime.storage) {
        log.error('No storage module present; cannot load sound asset: ', sound.md5);
        return Promise.resolve(sound);
    }
    if (!runtime.storage.defaultAssetId) {
        log.warn(`No default assets found`);
        return Promise.resolve(sound);
    }
    const idParts = StringUtil.splitFirst(sound.md5, '.');
    const md5 = idParts[0];
    const ext = idParts[1].toLowerCase();
    sound.dataFormat = ext;
    const loadSoundPromise = asyncLoading => (
        (sound.asset && !sound.assetUnInit && Promise.resolve(sound.asset)) ||
        runtime.storage.load(runtime.storage.AssetType.Sound, md5, ext)
    ).then(soundAsset => {
        if (!soundAsset) {
            log.warn('Failed to find sound data: ', sound.md5);
            return handleSoundLoadError(sound, runtime, soundBank);
        }
        sound.asset = soundAsset;
        sound.assetUnInit = false;
        if (asyncLoading) {
            return () => loadSoundFromAsset(sound, soundAsset, runtime, soundBank);
        }
        return loadSoundFromAsset(sound, soundAsset, runtime, soundBank);
    }).catch(e => {
        log.warn(`Failed to load sound: ${sound.md5} with error: ${e}`);
        return handleSoundLoadError(sound, runtime, soundBank);
    });
    if (runtime.isLoadProjectAssetsNonBlocking) {
        sound.assetUnInit = true;
        sound.asset = runtime.storage.createAsset(
            runtime.storage.AssetType.Sound,
            runtime.storage.DataFormat.WAV,
            new Uint8Array([0]),
            sound.assetId,
            false
        );
        runtime.addWaitingLoadCallback(loadSoundPromise);
        return Promise.resolve(sound);
    }
    return loadSoundPromise();
};

module.exports = {
    loadSound,
    loadSoundFromAsset
};
