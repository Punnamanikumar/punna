"use strict";
/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
function retrieveTestCodeCoverage() {
    return vscode.workspace
        .getConfiguration('salesforcedx-vscode-core')
        .get('retrieve-test-code-coverage', false);
}
exports.retrieveTestCodeCoverage = retrieveTestCodeCoverage;
//# sourceMappingURL=settings.js.map