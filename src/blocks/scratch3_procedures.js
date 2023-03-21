class Scratch3ProcedureBlocks {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;
    }

    /**
     * Retrieve the block primitives implemented by this package.
     * @return {object.<string, Function>} Mapping of opcode to Function.
     */
    getPrimitives () {
        return {
            procedures_definition: this.definition,
            procedures_call: this.call,
            procedures_call_with_return: this.callWithReturn,
            argument_reporter_string_number: this.argumentReporterStringNumber,
            argument_reporter_boolean: this.argumentReporterBoolean,
            // CCW customize
            procedures_return: this.proceduresReturn,
            ccw_hat_parameter: this.ccwHatParameter
        };
    }

    proceduresReturn (args) {
        return args.RETURN;
    }

    definition () {
        // No-op: execute the blocks.
    }

    _callProcedure (args, util, canNestedCall = false) {
        const procedureCode = args.mutation.proccode;
        const isGlobal = args.mutation.isglobal === 'true';
        let paramNamesIdsAndDefaults;
        let globalTarget;
        if (util.stackFrame.globalTarget && !isGlobal) {
            // CCW: if we are in the process of a global procedure call,
            //      1. we are now calling a non-global procedure, find ParamNamesIds in global target
            [paramNamesIdsAndDefaults] = util.stackFrame.globalTarget.blocks.getProcedureParamNamesIdsAndDefaults(procedureCode, isGlobal);
            //      2. put it in to results as global procedure call, cuz this local procedure is defined in the global target.
            globalTarget = util.stackFrame.globalTarget;
        } else {
            [paramNamesIdsAndDefaults, globalTarget] = util.getProcedureParamNamesIdsAndDefaults(procedureCode, isGlobal);
        }
        // If null, procedure could not be found, which can happen if custom
        // block is dragged between sprites without the definition.
        // Match Scratch 2.0 behavior and noop.
        if (paramNamesIdsAndDefaults === null) {
            return;
        }

        const [paramNames, paramIds, paramDefaults] = paramNamesIdsAndDefaults;

        // Initialize params for the current stackFrame to {}, even if the procedure does
        // not take any arguments. This is so that `getParam` down the line does not look
        // at earlier stack frames for the values of a given parameter (#1729)
        util.initParams();
        for (let i = 0; i < paramIds.length; i++) {
            if (args.hasOwnProperty(paramIds[i])) {
                util.pushParam(paramNames[i], args[paramIds[i]]);
            } else {
                util.pushParam(paramNames[i], paramDefaults[i]);
            }
        }
        if (!canNestedCall) {
            // reporter procedure call can be nested in same stackFrame
            // statement procedure call cannot be nested in same stackFrame
            util.stackFrame.executed = true;
        }
        // CCW: pass global target to procedure if isGlobal === true
        util.startProcedure(procedureCode, globalTarget);
    }

    callWithReturn (args, util) {
        if (!util.stackFrame.executed) {
            this._callProcedure(args, util, true);
        }
    }

    call (args, util) {
        if (!util.stackFrame.executed) {
            this._callProcedure(args, util);
        }
    }

    argumentReporterStringNumber (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // tw: support legacy block
            if (String(args.VALUE).toLowerCase() === 'last key pressed') {
                return util.ioQuery('keyboard', 'getLastKeyPressed');
            }
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return value;
    }

    argumentReporterBoolean (args, util) {
        const value = util.getParam(args.VALUE);
        if (value === null) {
            // tw: implement is compiled? and is turbowarp?
            const lowercaseValue = String(args.VALUE).toLowerCase();
            if (util.target.runtime.compilerOptions.enabled && lowercaseValue === 'is compiled?') {
                return true;
            }
            if (lowercaseValue === 'is turbowarp?') {
                return true;
            }
            // When the parameter is not found in the most recent procedure
            // call, the default is always 0.
            return 0;
        }
        return value;
    }

    ccwHatParameter (args, util) {
        const value = util.getHatParam(args.VALUE);
        return value;
    }
}

module.exports = Scratch3ProcedureBlocks;
