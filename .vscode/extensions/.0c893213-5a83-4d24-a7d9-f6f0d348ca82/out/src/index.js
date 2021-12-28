"use strict";
/*
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
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
const breakpoints_1 = require("@salesforce/salesforcedx-apex-replay-debugger/out/src/breakpoints");
const constants_1 = require("@salesforce/salesforcedx-apex-replay-debugger/out/src/constants");
const src_1 = require("@salesforce/salesforcedx-utils-vscode/out/src");
const path = require("path");
const pathExists = require("path-exists");
const vscode = require("vscode");
const debugConfigurationProvider_1 = require("./adapter/debugConfigurationProvider");
const checkpointService_1 = require("./breakpoints/checkpointService");
const channels_1 = require("./channels");
const launchFromLogFile_1 = require("./commands/launchFromLogFile");
const quickLaunch_1 = require("./commands/quickLaunch");
const context_1 = require("./context");
const messages_1 = require("./messages");
const telemetry_1 = require("./telemetry");
let extContext;
var VSCodeWindowTypeEnum;
(function (VSCodeWindowTypeEnum) {
    VSCodeWindowTypeEnum[VSCodeWindowTypeEnum["Error"] = 1] = "Error";
    VSCodeWindowTypeEnum[VSCodeWindowTypeEnum["Informational"] = 2] = "Informational";
    VSCodeWindowTypeEnum[VSCodeWindowTypeEnum["Warning"] = 3] = "Warning";
})(VSCodeWindowTypeEnum = exports.VSCodeWindowTypeEnum || (exports.VSCodeWindowTypeEnum = {}));
const sfdxCoreExtension = vscode.extensions.getExtension('salesforce.salesforcedx-vscode-core');
function registerCommands() {
    const promptForLogCmd = vscode.commands.registerCommand('extension.replay-debugger.getLogFileName', (config) => __awaiter(this, void 0, void 0, function* () {
        const fileUris = yield vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            defaultUri: getDialogStartingPath()
        });
        if (fileUris && fileUris.length === 1) {
            updateLastOpened(extContext, fileUris[0].fsPath);
            return fileUris[0].fsPath;
        }
    }));
    const launchFromLogFileCmd = vscode.commands.registerCommand('sfdx.launch.replay.debugger.logfile', editorUri => {
        let logFile;
        if (!editorUri) {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                editorUri = editor.document.uri;
            }
        }
        if (editorUri) {
            logFile = editorUri.fsPath;
            updateLastOpened(extContext, editorUri.fsPath);
        }
        return launchFromLogFile_1.launchFromLogFile(logFile);
    });
    const launchFromLastLogFileCmd = vscode.commands.registerCommand('sfdx.launch.replay.debugger.last.logfile', lastLogFileUri => {
        const lastOpenedLog = extContext.workspaceState.get(constants_1.LAST_OPENED_LOG_KEY);
        return launchFromLogFile_1.launchFromLogFile(lastOpenedLog);
    });
    const sfdxCreateCheckpointsCmd = vscode.commands.registerCommand('sfdx.create.checkpoints', checkpointService_1.sfdxCreateCheckpoints);
    const sfdxToggleCheckpointCmd = vscode.commands.registerCommand('sfdx.toggle.checkpoint', checkpointService_1.sfdxToggleCheckpoint);
    return vscode.Disposable.from(promptForLogCmd, launchFromLogFileCmd, launchFromLastLogFileCmd, sfdxCreateCheckpointsCmd, sfdxToggleCheckpointCmd);
}
function updateLastOpened(extensionContext, logPath) {
    extensionContext.workspaceState.update(constants_1.LAST_OPENED_LOG_KEY, logPath);
    extensionContext.workspaceState.update(constants_1.LAST_OPENED_LOG_FOLDER_KEY, path.dirname(logPath));
}
exports.updateLastOpened = updateLastOpened;
function getDebuggerType(session) {
    return __awaiter(this, void 0, void 0, function* () {
        let type = session.type;
        if (type === constants_1.LIVESHARE_DEBUGGER_TYPE) {
            type = yield session.customRequest(constants_1.LIVESHARE_DEBUG_TYPE_REQUEST);
        }
        return type;
    });
}
exports.getDebuggerType = getDebuggerType;
function registerDebugHandlers() {
    const customEventHandler = vscode.debug.onDidReceiveDebugSessionCustomEvent((event) => __awaiter(this, void 0, void 0, function* () {
        if (event && event.session) {
            const type = yield getDebuggerType(event.session);
            if (type !== constants_1.DEBUGGER_TYPE) {
                return;
            }
            if (event.event === constants_1.SEND_METRIC_LAUNCH_EVENT && event.body) {
                const metricLaunchArgs = event.body;
                telemetry_1.telemetryService.sendLaunchEvent(metricLaunchArgs.logSize.toString(), metricLaunchArgs.error.subject);
            }
            else if (event.event === constants_1.SEND_METRIC_ERROR_EVENT && event.body) {
                const metricErrorArgs = event.body;
                telemetry_1.telemetryService.sendErrorEvent(metricErrorArgs.subject, metricErrorArgs.callstack);
            }
        }
    }));
    return vscode.Disposable.from(customEventHandler);
}
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Apex Replay Debugger Extension Activated');
        const extensionHRStart = process.hrtime();
        extContext = context;
        const commands = registerCommands();
        const debugHandlers = registerDebugHandlers();
        const debugConfigProvider = vscode.debug.registerDebugConfigurationProvider('apex-replay', new debugConfigurationProvider_1.DebugConfigurationProvider());
        const checkpointsView = vscode.window.registerTreeDataProvider('sfdx.force.view.checkpoint', checkpointService_1.checkpointService);
        const breakpointsSub = vscode.debug.onDidChangeBreakpoints(checkpointService_1.processBreakpointChangedForCheckpoints);
        // Workspace Context
        yield context_1.workspaceContext.initialize(context);
        // Debug Tests command
        const debugTests = vscode.commands.registerCommand('sfdx.force.test.view.debugTests', (test) => __awaiter(this, void 0, void 0, function* () {
            yield quickLaunch_1.setupAndDebugTests(test.name);
        }));
        // Debug Single Test command
        const debugTest = vscode.commands.registerCommand('sfdx.force.test.view.debugSingleTest', (test) => __awaiter(this, void 0, void 0, function* () {
            const name = test.name.split('.');
            yield quickLaunch_1.setupAndDebugTests(name[0], name[1]);
        }));
        context.subscriptions.push(commands, debugHandlers, debugConfigProvider, checkpointsView, breakpointsSub, debugTests, debugTest);
        // Telemetry
        if (sfdxCoreExtension && sfdxCoreExtension.exports) {
            telemetry_1.telemetryService.initializeService(sfdxCoreExtension.exports.telemetryService.getReporter(), sfdxCoreExtension.exports.telemetryService.isTelemetryEnabled());
        }
        telemetry_1.telemetryService.sendExtensionActivationEvent(extensionHRStart);
    });
}
exports.activate = activate;
function getDialogStartingPath() {
    if (vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders[0]) {
        // If the user has already selected a document through getLogFileName then
        // use that path if it still exists.
        const lastOpenedLogFolder = extContext.workspaceState.get(constants_1.LAST_OPENED_LOG_FOLDER_KEY);
        if (lastOpenedLogFolder && pathExists.sync(lastOpenedLogFolder)) {
            return vscode.Uri.file(lastOpenedLogFolder);
        }
        // If lastOpenedLogFolder isn't defined or doesn't exist then use the
        // same directory that the SFDX download logs command would download to
        // if it exists.
        const sfdxCommandLogDir = src_1.getLogDirPath();
        if (pathExists.sync(sfdxCommandLogDir)) {
            return vscode.Uri.file(sfdxCommandLogDir);
        }
        // If all else fails, fallback to the .sfdx directory in the workspace
        return vscode.Uri.file(path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.sfdx'));
    }
}
function retrieveLineBreakpointInfo() {
    return __awaiter(this, void 0, void 0, function* () {
        const sfdxApex = vscode.extensions.getExtension('salesforce.salesforcedx-vscode-apex');
        if (sfdxApex && sfdxApex.exports) {
            let expired = false;
            let i = 0;
            while (!sfdxApex.exports.languageClientUtils.getStatus().isReady() &&
                !expired) {
                if (sfdxApex.exports.languageClientUtils.getStatus().failedToInitialize()) {
                    throw Error(sfdxApex.exports.languageClientUtils.getStatus().getStatusMessage());
                }
                yield imposeSlightDelay(100);
                if (i >= 30) {
                    expired = true;
                }
                i++;
            }
            if (expired) {
                const errorMessage = messages_1.nls.localize('language_client_not_ready');
                writeToDebuggerOutputWindow(errorMessage, true, VSCodeWindowTypeEnum.Error);
                return false;
            }
            else {
                const lineBpInfo = yield sfdxApex.exports.getLineBreakpointInfo();
                if (lineBpInfo && lineBpInfo.length > 0) {
                    console.log(messages_1.nls.localize('line_breakpoint_information_success'));
                    breakpoints_1.breakpointUtil.createMappingsFromLineBreakpointInfo(lineBpInfo);
                    return true;
                }
                else {
                    const errorMessage = messages_1.nls.localize('no_line_breakpoint_information_for_current_project');
                    writeToDebuggerOutputWindow(errorMessage, true, VSCodeWindowTypeEnum.Error);
                    return true;
                }
            }
        }
        else {
            const errorMessage = messages_1.nls.localize('session_language_server_error_text');
            writeToDebuggerOutputWindow(errorMessage, true, VSCodeWindowTypeEnum.Error);
            return false;
        }
    });
}
exports.retrieveLineBreakpointInfo = retrieveLineBreakpointInfo;
function imposeSlightDelay(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
}
function writeToDebuggerOutputWindow(output, showVSCodeWindow, vsCodeWindowType) {
    channels_1.channelService.appendLine(output);
    channels_1.channelService.showChannelOutput();
    if (showVSCodeWindow && vsCodeWindowType) {
        switch (vsCodeWindowType) {
            case VSCodeWindowTypeEnum.Error: {
                vscode.window.showErrorMessage(output);
                break;
            }
            case VSCodeWindowTypeEnum.Informational: {
                vscode.window.showInformationMessage(output);
                break;
            }
            case VSCodeWindowTypeEnum.Warning: {
                vscode.window.showWarningMessage(output);
                break;
            }
        }
    }
}
exports.writeToDebuggerOutputWindow = writeToDebuggerOutputWindow;
function deactivate() {
    console.log('Apex Replay Debugger Extension Deactivated');
    telemetry_1.telemetryService.sendExtensionDeactivationEvent();
}
exports.deactivate = deactivate;
//# sourceMappingURL=index.js.map