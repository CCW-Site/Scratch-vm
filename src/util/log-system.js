/* eslint-disable no-console */
const log = require('./log');
const EventEmitter = require('events');

class LogSystem extends EventEmitter {
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

    /**
     * Event name for new log.
     * @const {string}
     */
    static get NEW_LOG_MESSAGE () {
        return 'NEW_LOG_MESSAGE';
    }
}

module.exports = LogSystem;
