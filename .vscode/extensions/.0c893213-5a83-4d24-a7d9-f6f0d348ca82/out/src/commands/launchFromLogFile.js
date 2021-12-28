"use strict";
/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const debugConfigurationProvider_1 = require("../adapter/debugConfigurationProvider");
function launchFromLogFile(logFile, stopOnEntry = true) {
    if (!vscode.debug.activeDebugSession &&
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders[0]) {
        vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], debugConfigurationProvider_1.DebugConfigurationProvider.getConfig(logFile, stopOnEntry));
    }
}
exports.launchFromLogFile = launchFromLogFile;
//# sourceMappingURL=launchFromLogFile.js.map