const Runtime = require('../../src/engine/runtime');
const sb2 = require('../../src/serialization/sb2');
const {test} = require('tap');

test('importing ScratchX/.sbx project', async t => {
    const rt = new Runtime();

    const deserialized = await sb2.deserialize(
        {
            objName: 'Stage',
            scripts: [
                [0, 0, [['Text to Speech.speak_text', 'Hello!']]],
                [788, 33, [['Spotify\u001feveryBar']]],
                [100, 10, [['Weather extension\u001fgetWeather', 'temperature', 'Cambridge, MA']]],
                [60, 40, [['Synth Extension.setEffect', 'glide', 10]]]
            ],
            sounds: [],
            costumes: [],
            children: [],
            info: {
                savedExtensions: [
                    {
                        menus: {
                            // not important for this test
                        },
                        extensionName: 'Spotify',
                        javascriptURL: 'https://ericrosenbaum.github.io/spotify-extension/extension.js',
                        blockSpecs: [
                            // not important for this test
                        ]
                    },
                    {
                        extensionName: 'Weather extension',
                        javascriptURL: 'http://khanning.github.io/scratch-weather-extension/weather_extension.js'
                    }
                ]
            }
        },
        rt
    );

    const extensionIDs = deserialized.extensions.extensionIDs;
    t.equal(extensionIDs.size, 4);
    t.ok(extensionIDs.has('sbxtexttospeech'));
    t.ok(extensionIDs.has('sbxspotify'));
    t.ok(extensionIDs.has('sbxweatherextension'));
    t.ok(extensionIDs.has('sbxsynthextension'));

    const extensionURLs = deserialized.extensions.extensionURLs;
    t.equal(extensionURLs.size, 2);
    t.equal(extensionURLs.get('sbxspotify'), 'https://ericrosenbaum.github.io/spotify-extension/extension.js');
    t.equal(extensionURLs.get('sbxweatherextension'), 'http://khanning.github.io/scratch-weather-extension/weather_extension.js');

    const stage = deserialized.targets[0];
    const blocks = Object.values(stage.blocks._blocks);

    const textToSpeech = blocks.find(i => i.opcode === 'sbxtexttospeech_speak_text');
    t.type(textToSpeech, 'object');
    t.type(textToSpeech.inputs['0'], 'object');
    t.type(textToSpeech.inputs['1'], 'undefined');

    const spotify = blocks.find(i => i.opcode === 'sbxspotify_everyBar');
    t.type(spotify, 'object');
    t.type(spotify.inputs['0'], 'undefined');

    const weather = blocks.find(i => i.opcode === 'sbxweatherextension_getWeather');
    t.type(weather, 'object');
    t.type(weather.inputs['0'], 'object');
    t.type(weather.inputs['1'], 'object');
    t.type(weather.inputs['2'], 'undefined');

    const synth = blocks.find(i => i.opcode === 'sbxsynthextension_setEffect');
    t.type(synth, 'object');
    t.type(synth.inputs['0'], 'object');
    t.type(synth.inputs['1'], 'object');
    t.type(synth.inputs['2'], 'undefined');

    t.end();
});
