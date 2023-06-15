class Joystick {
    constructor (runtime) {
        /**
         * Reference to the owning Runtime.
         * @type{!Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Joystick event handler.
     * @param  {object} data Data from custom joystick event.
     */
    postData (data) {
        this.runtime.startHatsWithParams('GandiMobileButtonConfig_whenJoystickMoved', {
            parameters: {direction: data.direction, distance: data.distance},
            fields: {JOYSTICK: data.id}
        });
    }
}

module.exports = Joystick;
