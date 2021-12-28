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
class BatchDeleteExistingOverlayActionCommand extends requestService_1.BaseCommand {
    constructor(requests) {
        super(undefined);
        this.requests = requests;
    }
    getCommandUrl() {
        return constants_1.COMPOSITE_BATCH_URL;
    }
    getRequest() {
        return JSON.stringify(this.requests);
    }
}
exports.BatchDeleteExistingOverlayActionCommand = BatchDeleteExistingOverlayActionCommand;
//# sourceMappingURL=batchDeleteExistingOverlayActionsCommand.js.map