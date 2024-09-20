// If a project uses an extension but does not specify a URL, it will default to
// the URLs given here, if it exists. This is useful for compatibility with other mods.

const defaults = new Map();

// Box2D (`griffpatch`) is not listed here because our extension is not actually
// compatible with the original version due to fields vs inputs.

// Scratch Lab Animated Text - https://lab.scratch.mit.edu/text/
defaults.set('text', 'https://extensions.turbowarp.org/lab/text.js');

// Turboloader's AudioStream
defaults.set('audiostr', 'https://extensions.turbowarp.org/turboloader/audiostream.js');

module.exports = defaults;
