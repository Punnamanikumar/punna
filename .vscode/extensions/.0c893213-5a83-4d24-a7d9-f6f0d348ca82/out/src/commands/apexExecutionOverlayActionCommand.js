"use strict";
/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
Object.defineProperty(exports, "__esModule", { value: true });
const requestService_1 = require("@salesforce/salesforcedx-apex-replay-debugger/node_modules/@salesforce/salesforcedx-utils-vscode/out/src/requestService");
const constants_1 = require("@salesforce/salesforcedx-apex-replay-debugger/out/src/constants");
class ApexExecutionOverlayActionCommand extends requestService_1.BaseCommand {
    constructor(requestString, actionObjectId, queryString) {
        super(queryString);
        this.commandName = 'ApexExecutionOverlayAction';
        this.requestString = requestString;
        this.actionObjectId = actionObjectId;
    }
    getCommandUrl() {
        if (this.actionObjectId) {
            const urlElements = [constants_1.SOBJECTS_URL, this.commandName, this.actionObjectId];
            return urlElements.join('/');
        }
        else {
            const urlElements = [constants_1.SOBJECTS_URL, this.commandName];
            return urlElements.join('/');
        }
    }
    getRequest() {
        return this.requestString;
    }
}
exports.ApexExecutionOverlayActionCommand = ApexExecutionOverlayActionCommand;
//# sourceMappingURL=apexExecutionOverlayActionCommand.js.map