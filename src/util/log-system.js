/* eslint-disable no-console */
const log = require('./log');

class LogSystem {
    /**
     * Set font color
     */
    setColor () {}

    /**
     * Display UI interface
     */
    show () {}

    /**
     * Hide UI interface
     */
    hide () {}

    /**
     * Outputs a message to the web console.
     */
    log () {
        log(...arguments);
    }

    /**
     * Outputs a warning message to the Web console.
     */
    warn () {
        log.warn(...arguments);
    }

    /**
     * Outputs an informational message to the Web console.
     */
    info () {
        log.info(...arguments);
    }

    /**
     * Outputs an error message to the Web console.
     */
    error () {
        log.error(...arguments);
    }

    /**
     * The method clears the console if the console allows it.
     */
    clear () {
        console.clear();
    }
}

module.exports = LogSystem;
