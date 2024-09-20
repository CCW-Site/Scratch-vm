const {test} = require('tap');

// Simulate the network being down or filtered
// Run this before fetch-with-timeout.js is gets loaded.
global.fetch = () => Promise.reject(new Error('Simulated network error'));

const Scratch3TranslateBlocks = require('../../src/extensions/scratch3_translate/index');

// Node 21 and later defines a navigator object, but we want to override that for the test
Object.defineProperty(global, 'navigator', {
    value: {
        language: 'en-US'
    }
});

// Translate tries to access AbortController from window, but does not require it to exist.
global.window = {};

test('translate returns original string on network error', t => {
    t.plan(1);

    const extension = new Scratch3TranslateBlocks();
    extension.getTranslate({WORDS: 'My message 123123', LANGUAGE: 'es'})
        .then(message => {
            t.equal(message, 'My message 123123');
            t.end();
        });
});
