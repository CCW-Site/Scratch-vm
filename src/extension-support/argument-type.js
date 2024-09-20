/**
 * Block argument types
 * @enum {string}
 */
const ArgumentType = {
    /**
     * Numeric value with angle picker
     */
    ANGLE: 'angle',

    /**
     * Boolean value with hexagonal placeholder
     */
    BOOLEAN: 'Boolean',

    /**
     * Numeric value with color picker
     */
    COLOR: 'color',

    /**
     * Numeric value with text field
     */
    NUMBER: 'number',

    /**
     * String value with text field
     */
    STRING: 'string',

    /**
     * String value with matrix field
     */
    MATRIX: 'matrix',

    /**
     * MIDI note number with note picker (piano) field
     */
    NOTE: 'note',

    /**
     * Inline image on block (as part of the label)
     */
    IMAGE: 'image',

    /**
     * for 12*12 Led board
     */
    XIGUA_MATRIX: 'xigua_matrix',

    /**
     *  MIDI note number with note picker (piano)
     */
    XIGUA_WHITE_BOARD_NOTE: 'xigua_white_board_note',

    /**
     * CCW_HAT_PARAMETER, use in hat block
     */
    CCW_HAT_PARAMETER: 'ccw_hat_parameter',

    /**
     * Name of costume in the current target
     */
    COSTUME: 'costume',

    /**
     * Name of sound in the current target
     */
    SOUND: 'sound'
};

module.exports = ArgumentType;
