"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const apex_node_1 = require("@salesforce/apex-node");
const src_1 = require("@salesforce/salesforcedx-utils-vscode/out/src");
const commands_1 = require("@salesforce/salesforcedx-utils-vscode/out/src/commands");
const helpers_1 = require("@salesforce/salesforcedx-utils-vscode/out/src/helpers");
const path = require("path");
const vscode_1 = require("vscode");
const breakpoints_1 = require("../breakpoints");
const checkpointService_1 = require("../breakpoints/checkpointService");
const channels_1 = require("../channels");
const context_1 = require("../context");
const messages_1 = require("../messages");
const utils_1 = require("../utils");
const launchFromLogFile_1 = require("./launchFromLogFile");
const traceFlags_1 = require("./traceFlags");
class QuickLaunch {
    debugTest(testClass, testName) {
        return __awaiter(this, void 0, void 0, function* () {
            const connection = yield context_1.workspaceContext.getConnection();
            const flags = new traceFlags_1.TraceFlags(connection);
            if (!(yield flags.ensureTraceFlags())) {
                return false;
            }
            const oneOrMoreCheckpoints = checkpointService_1.checkpointService.hasOneOrMoreActiveCheckpoints(true);
            if (oneOrMoreCheckpoints) {
                const createCheckpointsResult = yield breakpoints_1.sfdxCreateCheckpoints();
                if (!createCheckpointsResult) {
                    return false;
                }
            }
            const testResult = yield this.runSingleTest(connection, testClass, testName);
            if (testResult.success && testResult.logFileId) {
                const logFileRetrive = yield this.retrieveLogFile(connection, testResult.logFileId);
                if (logFileRetrive.success && logFileRetrive.filePath) {
                    launchFromLogFile_1.launchFromLogFile(logFileRetrive.filePath, false);
                    return true;
                }
            }
            else if (testResult.message) {
                commands_1.notificationService.showErrorMessage(testResult.message);
            }
            return false;
        });
    }
    runSingleTest(connection, testClass, testMethod) {
        return __awaiter(this, void 0, void 0, function* () {
            const testService = new apex_node_1.TestService(connection);
            try {
                const payload = yield testService.buildSyncPayload("RunSpecifiedTests" /* RunSpecifiedTests */, testMethod ? `${testClass}.${testMethod}` : undefined, testClass);
                const result = (yield testService.runTestSynchronous(payload, true));
                if (vscode_1.workspace && vscode_1.workspace.workspaceFolders) {
                    const apexTestResultsPath = helpers_1.getTestResultsFolder(src_1.getRootWorkspacePath(), 'apex');
                    yield testService.writeResultFiles(result, { dirPath: apexTestResultsPath, resultFormats: [apex_node_1.ResultFormat.json] }, utils_1.retrieveTestCodeCoverage());
                }
                const tests = result.tests;
                if (tests.length === 0) {
                    return {
                        success: false,
                        message: messages_1.nls.localize('debug_test_no_results_found')
                    };
                }
                if (!tests[0].apexLogId) {
                    return {
                        success: false,
                        message: messages_1.nls.localize('debug_test_no_debug_log')
                    };
                }
                return { logFileId: tests[0].apexLogId, success: true };
            }
            catch (e) {
                return { message: e.message, success: false };
            }
        });
    }
    retrieveLogFile(connection, logId) {
        return __awaiter(this, void 0, void 0, function* () {
            const logService = new apex_node_1.LogService(connection);
            const outputDir = src_1.getLogDirPath();
            yield logService.getLogs({ logId, outputDir });
            const logPath = path.join(outputDir, `${logId}.log`);
            return { filePath: logPath, success: true };
        });
    }
}
exports.QuickLaunch = QuickLaunch;
class TestDebuggerExecutor extends src_1.LibraryCommandletExecutor {
    constructor() {
        super(messages_1.nls.localize('debug_test_exec_name'), 'debug_test_replay_debugger', channels_1.OUTPUT_CHANNEL);
    }
    run(response) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!response.data) {
                return false;
            }
            const className = response.data[0];
            const methodName = response.data[1];
            const quickLaunch = new QuickLaunch();
            const success = yield quickLaunch.debugTest(className, methodName);
            return success;
        });
    }
}
exports.TestDebuggerExecutor = TestDebuggerExecutor;
function setupAndDebugTests(className, methodName) {
    return __awaiter(this, void 0, void 0, function* () {
        const executor = new TestDebuggerExecutor();
        const response = {
            type: 'CONTINUE',
            data: [className, methodName]
        };
        yield executor.execute(response);
    });
}
exports.setupAndDebugTests = setupAndDebugTests;
//# sourceMappingURL=quickLaunch.js.map