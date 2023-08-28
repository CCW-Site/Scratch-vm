const formatMessage = require('format-message');

/**
 * @param {Runtime|null} runtime
 * @returns {object}
 */
const createTranslate = runtime => {
    const namespace = formatMessage.namespace();

    const translate = (message, args) => {
        if (message && typeof message === 'object') {
            // already in the expected format
        } else if (typeof message === 'string') {
            message = {
                default: message
            };
        } else {
            throw new Error('unsupported data type in translate()');
        }
        return namespace(message, args);
    };

    const generateId = defaultMessage => `_${defaultMessage}`;

    const getLocale = () => formatMessage.setup().locale;

    let storedTranslations = {};
    translate.setup = newTranslations => {
        if (newTranslations) {
            storedTranslations = newTranslations;
        }
        namespace.setup({
            locale: getLocale(),
            missingTranslation: 'ignore',
            generateId,
            translations: storedTranslations
        });
    };

    translate.setup({});

    if (runtime) {
        runtime.on('LOCALE_CHANGED', () => {
            translate.setup(null);
        });
    }

    return translate;
};

module.exports = createTranslate;
