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
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
const cli_1 = require("@salesforce/salesforcedx-apex-replay-debugger/node_modules/@salesforce/salesforcedx-utils-vscode/out/src/cli");
const requestService_1 = require("@salesforce/salesforcedx-apex-replay-debugger/node_modules/@salesforce/salesforcedx-utils-vscode/out/src/requestService");
const breakpoints_1 = require("@salesforce/salesforcedx-apex-replay-debugger/out/src/breakpoints");
const commands_1 = require("@salesforce/salesforcedx-apex-replay-debugger/out/src/commands");
const constants_1 = require("@salesforce/salesforcedx-apex-replay-debugger/out/src/constants");
const AsyncLock = require("async-lock");
const vscode_1 = require("vscode");
const vscode = require("vscode");
const apexExecutionOverlayActionCommand_1 = require("../commands/apexExecutionOverlayActionCommand");
const batchDeleteExistingOverlayActionsCommand_1 = require("../commands/batchDeleteExistingOverlayActionsCommand");
const queryExistingOverlayActionIdsCommand_1 = require("../commands/queryExistingOverlayActionIdsCommand");
const index_1 = require("../index");
const messages_1 = require("../messages");
const telemetry_1 = require("../telemetry");
const EDITABLE_FIELD_LABEL_ITERATIONS = 'Iterations: ';
const EDITABLE_FIELD_LABEL_ACTION_SCRIPT = 'Script: ';
const EDITABLE_FIELD_LABEL_ACTION_SCRIPT_TYPE = 'Type: ';
class CheckpointService {
    constructor() {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.sfdxProject = null;
        this.onDidChangeTreeData = this
            ._onDidChangeTreeData.event;
        this.checkpoints = [];
        this.myRequestService = new requestService_1.RequestService();
    }
    fireTreeChangedEvent() {
        this._onDidChangeTreeData.fire(undefined);
    }
    retrieveOrgInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            if (vscode.workspace.workspaceFolders &&
                vscode.workspace.workspaceFolders[0]) {
                this.sfdxProject = vscode.workspace.workspaceFolders[0].uri.fsPath;
                try {
                    this.orgInfo = yield new cli_1.ForceOrgDisplay().getOrgInfo(this.sfdxProject);
                }
                catch (error) {
                    const result = JSON.parse(error);
                    const errorMessage = `${messages_1.nls.localize('unable_to_retrieve_org_info')} : ${result.message}`;
                    index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                    return false;
                }
                this.myRequestService.instanceUrl = this.orgInfo.instanceUrl;
                this.myRequestService.accessToken = this.orgInfo.accessToken;
                return true;
            }
            else {
                const errorMessage = messages_1.nls.localize('cannot_determine_workspace');
                index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                return false;
            }
        });
    }
    static getInstance() {
        if (!CheckpointService.instance) {
            CheckpointService.instance = new CheckpointService();
        }
        return CheckpointService.instance;
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            return this.checkpoints;
        }
        return element.getChildren();
    }
    hasFiveOrLessActiveCheckpoints(displayError) {
        let numEnabledCheckpoints = 0;
        for (const cpNode of this.getChildren()) {
            if (cpNode.isCheckpointEnabled()) {
                numEnabledCheckpoints++;
            }
        }
        const fiveOrLess = numEnabledCheckpoints <= constants_1.MAX_ALLOWED_CHECKPOINTS;
        if (!fiveOrLess && displayError) {
            const errorMessage = messages_1.nls.localize('up_to_five_checkpoints', numEnabledCheckpoints);
            index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
        }
        return fiveOrLess;
    }
    hasOneOrMoreActiveCheckpoints(displayError) {
        let numEnabledCheckpoints = 0;
        for (const cpNode of this.getChildren()) {
            if (cpNode.isCheckpointEnabled()) {
                numEnabledCheckpoints++;
            }
        }
        const oneOrMore = numEnabledCheckpoints > 0;
        if (!oneOrMore && displayError) {
            const errorMessage = messages_1.nls.localize('no_enabled_checkpoints');
            index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Warning);
        }
        return oneOrMore;
    }
    createCheckpointNode(breakpointIdInput, enabledInput, uriInput, sourceFileInput, checkpointOverlayAction) {
        const cpNode = new CheckpointNode(breakpointIdInput, enabledInput, uriInput, sourceFileInput, checkpointOverlayAction);
        this.checkpoints.push(cpNode);
        this.fireTreeChangedEvent();
        return cpNode;
    }
    returnCheckpointNodeIfAlreadyExists(breakpointIdInput) {
        for (const cp of this.checkpoints) {
            if (breakpointIdInput === cp.getBreakpointId()) {
                return cp;
            }
        }
        return undefined;
    }
    deleteCheckpointNodeIfExists(breakpointIdInput) {
        const cpNode = this.returnCheckpointNodeIfAlreadyExists(breakpointIdInput);
        if (cpNode) {
            const index = this.checkpoints.indexOf(cpNode, 0);
            if (index > -1) {
                this.checkpoints.splice(index, 1);
                this.fireTreeChangedEvent();
            }
        }
    }
    executeCreateApexExecutionOverlayActionCommand(theNode) {
        return __awaiter(this, void 0, void 0, function* () {
            // create the overlay action
            const overlayActionCommand = new apexExecutionOverlayActionCommand_1.ApexExecutionOverlayActionCommand(theNode.createJSonStringForOverlayAction());
            let errorString;
            let returnString;
            yield this.myRequestService.execute(overlayActionCommand).then(value => {
                returnString = value;
            }, reason => {
                errorString = reason;
            });
            // The resturn string will be the overlay Id and will end up being
            // used if the node is deleted
            if (returnString) {
                const result = JSON.parse(returnString);
                theNode.setActionCommandResultId(result.id);
                return true;
            }
            // Fun fact: the result is an array of 1 item OR the result message can be just a string. In the
            // case where the json string cannot be parsed into an ApexExecutionOverlayFailureResult then it'll
            // be treated as a string and reported to the user.
            if (errorString) {
                try {
                    const result = JSON.parse(errorString);
                    if (result[0].errorCode === constants_1.FIELD_INTEGRITY_EXCEPTION) {
                        const errorMessage = messages_1.nls.localize('local_source_is_out_of_sync_with_the_server');
                        index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                    }
                    else {
                        const errorMessage = `${result[0].message}. URI=${theNode.getCheckpointUri()}, Line=${theNode.getCheckpointLineNumber()}`;
                        index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                    }
                }
                catch (error) {
                    const errorMessage = `${errorString}. URI=${theNode.getCheckpointUri()}, Line=${theNode.getCheckpointLineNumber()}`;
                    index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                }
            }
            return false;
        });
    }
    // Make VS Code the source of truth for checkpoints
    clearExistingCheckpoints() {
        return __awaiter(this, void 0, void 0, function* () {
            const sfdxCore = vscode.extensions.getExtension('salesforce.salesforcedx-vscode-core');
            if (sfdxCore && sfdxCore.exports) {
                const userId = yield sfdxCore.exports.getUserId(this.sfdxProject);
                if (userId) {
                    const queryCommand = new queryExistingOverlayActionIdsCommand_1.QueryExistingOverlayActionIdsCommand(userId);
                    let errorString;
                    let returnString;
                    yield this.myRequestService
                        .execute(queryCommand, requestService_1.RestHttpMethodEnum.Get)
                        .then(value => {
                        returnString = value;
                    }, reason => {
                        errorString = reason;
                    });
                    if (returnString) {
                        const successResult = JSON.parse(returnString);
                        if (successResult) {
                            // If there are things to delete then create the batchRequest
                            if (successResult.records.length > 0) {
                                const requests = [];
                                for (const record of successResult.records) {
                                    const request = {
                                        method: requestService_1.RestHttpMethodEnum.Delete,
                                        url: constants_1.OVERLAY_ACTION_DELETE_URL + record.Id
                                    };
                                    requests.push(request);
                                }
                                const batchRequests = {
                                    batchRequests: requests
                                };
                                const batchDeleteCommand = new batchDeleteExistingOverlayActionsCommand_1.BatchDeleteExistingOverlayActionCommand(batchRequests);
                                let deleteError;
                                let deleteResult;
                                yield this.myRequestService
                                    .execute(batchDeleteCommand, requestService_1.RestHttpMethodEnum.Post)
                                    .then(value => {
                                    deleteResult = value;
                                }, reason => {
                                    deleteError = reason;
                                });
                                // Parse the result
                                if (deleteResult) {
                                    const result = JSON.parse(deleteResult);
                                    if (result.hasErrors) {
                                        const errorMessage = messages_1.nls.localize('cannot_delete_existing_checkpoint');
                                        index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                                    }
                                    else {
                                        // no errors, return true
                                        return true;
                                    }
                                }
                                // At this point a deleteError really means there was an error talking to the
                                // server. Actual failures from an individual command other issues are batched
                                // up in the result.
                                if (deleteError) {
                                    const errorMessage = `${messages_1.nls.localize('cannot_delete_existing_checkpoint')} : ${deleteError}`;
                                    index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                                    return false;
                                }
                            }
                            // no records to delete, just return true
                            return true;
                        }
                        else {
                            const errorMessage = messages_1.nls.localize('unable_to_parse_checkpoint_query_result');
                            index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                            return false;
                        }
                    }
                    else {
                        const errorMessage = `${messages_1.nls.localize('unable_to_query_for_existing_checkpoints')} Error: ${errorString}`;
                        index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                        return false;
                    }
                }
                else {
                    const errorMessage = messages_1.nls.localize('unable_to_retrieve_active_user_for_sfdx_project');
                    index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                    return false;
                }
            }
            else {
                const errorMessage = messages_1.nls.localize('unable_to_load_vscode_core_extension');
                index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                return false;
            }
        });
    }
}
exports.CheckpointService = CheckpointService;
exports.checkpointService = CheckpointService.getInstance();
class BaseNode extends vscode_1.TreeItem {
}
exports.BaseNode = BaseNode;
class CheckpointNode extends BaseNode {
    constructor(breapointIdInput, enabledInput, uriInput, sourceFileInput, checkpointOverlayActionInput) {
        super(sourceFileInput + ':' + checkpointOverlayActionInput.Line, vscode_1.TreeItemCollapsibleState.Expanded);
        this.children = [];
        this.uri = uriInput;
        this.breakpointId = breapointIdInput;
        this.enabled = enabledInput;
        this.checkpointOverlayAction = checkpointOverlayActionInput;
        this.actionObjectId = undefined;
        // Create the items that the user is going to be able to control (Type, Script, Iteration)
        const cpASTNode = new CheckpointInfoActionScriptTypeNode(this.checkpointOverlayAction);
        this.children.push(cpASTNode);
        const cpScriptNode = new CheckpointInfoActionScriptNode(this.checkpointOverlayAction);
        this.children.push(cpScriptNode);
        const cpIterationNode = new CheckpointInfoIterationNode(this.checkpointOverlayAction);
        this.children.push(cpIterationNode);
    }
    createJSonStringForOverlayAction() {
        return JSON.stringify(this.checkpointOverlayAction);
    }
    getBreakpointId() {
        return this.breakpointId;
    }
    isCheckpointEnabled() {
        return this.enabled;
    }
    getCheckpointLineNumber() {
        return this.checkpointOverlayAction.Line;
    }
    getCheckpointTypeRef() {
        return this.checkpointOverlayAction.ExecutableEntityName;
    }
    setCheckpointTypeRef(typeRef) {
        this.checkpointOverlayAction.ExecutableEntityName = typeRef;
    }
    updateCheckpoint(enabledInput, uriInput, sourceFileInput, checkpointOverlayActionInput) {
        // At this point we've got no idea what really changed, update
        // everything.
        this.enabled = enabledInput;
        this.uri = uriInput;
        this.checkpointOverlayAction.Line = checkpointOverlayActionInput.Line;
        this.checkpointOverlayAction.IsDumpingHeap =
            checkpointOverlayActionInput.IsDumpingHeap;
        // Instead of just refreshing the node's overlay action, these functions
        // need to be called because some of the information is in their label
        // which needs to get updated
        this.updateActionScript(checkpointOverlayActionInput.ActionScript);
        this.updateActionScriptType(checkpointOverlayActionInput.ActionScriptType);
        this.updateIterations(checkpointOverlayActionInput.Iteration);
        this.label = sourceFileInput + ':' + checkpointOverlayActionInput.Line;
        CheckpointService.getInstance().fireTreeChangedEvent();
    }
    updateActionScript(actionScriptInput) {
        for (const cpInfoNode of this.getChildren()) {
            if (cpInfoNode instanceof CheckpointInfoActionScriptNode) {
                return cpInfoNode.updateActionScript(actionScriptInput);
            }
        }
    }
    updateActionScriptType(actionScriptTypeInput) {
        for (const cpInfoNode of this.getChildren()) {
            if (cpInfoNode instanceof CheckpointInfoActionScriptTypeNode) {
                return cpInfoNode.updateActionScriptType(actionScriptTypeInput);
            }
        }
    }
    updateIterations(iterationInput) {
        for (const cpInfoNode of this.getChildren()) {
            if (cpInfoNode instanceof CheckpointInfoIterationNode) {
                return cpInfoNode.updateIterations(iterationInput);
            }
        }
    }
    getIteration() {
        return this.checkpointOverlayAction.Iteration;
    }
    getActionScript() {
        return this.checkpointOverlayAction.ActionScript;
    }
    getActionScriptType() {
        return this.checkpointOverlayAction.ActionScriptType;
    }
    getCheckpointUri() {
        return this.uri;
    }
    getChildren() {
        return this.children;
    }
    getActionCommandResultId() {
        return this.actionObjectId;
    }
    setActionCommandResultId(actionObjectId) {
        this.actionObjectId = actionObjectId;
    }
}
exports.CheckpointNode = CheckpointNode;
class CheckpointInfoNode extends BaseNode {
    getChildren() {
        return [];
    }
}
exports.CheckpointInfoNode = CheckpointInfoNode;
// Remove the tags when the nodes using the checkpointOverlayAction become editable.
class CheckpointInfoActionScriptNode extends CheckpointInfoNode {
    constructor(cpOverlayActionInput) {
        super(EDITABLE_FIELD_LABEL_ACTION_SCRIPT + cpOverlayActionInput.ActionScript);
        this.checkpointOverlayAction = cpOverlayActionInput;
    }
    updateActionScript(actionScriptInput) {
        this.checkpointOverlayAction.ActionScript = actionScriptInput;
        this.label = EDITABLE_FIELD_LABEL_ACTION_SCRIPT + actionScriptInput;
    }
    getChildren() {
        return [];
    }
}
exports.CheckpointInfoActionScriptNode = CheckpointInfoActionScriptNode;
class CheckpointInfoActionScriptTypeNode extends CheckpointInfoNode {
    constructor(cpOverlayActionInput) {
        super(EDITABLE_FIELD_LABEL_ACTION_SCRIPT_TYPE +
            cpOverlayActionInput.ActionScriptType);
        this.checkpointOverlayAction = cpOverlayActionInput;
    }
    updateActionScriptType(actionScriptTypeInput) {
        this.checkpointOverlayAction.ActionScriptType = actionScriptTypeInput;
        this.label =
            EDITABLE_FIELD_LABEL_ACTION_SCRIPT_TYPE + actionScriptTypeInput;
    }
    getChildren() {
        return [];
    }
}
exports.CheckpointInfoActionScriptTypeNode = CheckpointInfoActionScriptTypeNode;
class CheckpointInfoIterationNode extends CheckpointInfoNode {
    constructor(cpOverlayActionInput) {
        super(EDITABLE_FIELD_LABEL_ITERATIONS + cpOverlayActionInput.Iteration);
        this.checkpointOverlayAction = cpOverlayActionInput;
    }
    updateIterations(iterationInput) {
        this.checkpointOverlayAction.Iteration = iterationInput;
        this.label = EDITABLE_FIELD_LABEL_ITERATIONS + iterationInput;
    }
    getChildren() {
        return [];
    }
}
exports.CheckpointInfoIterationNode = CheckpointInfoIterationNode;
// The AsyncLock is necessary to prevent the user from deleting the underlying breakpoints
// associated with the checkpoints while checkpoints are being uploaded to the server.
const lock = new AsyncLock();
// This is the function registered for vscode.debug.onDidChangeBreakpoints. This
// particular event fires breakpoint events without an active debug session which
// allows us to manipulate checkpoints prior to the debug session.
function processBreakpointChangedForCheckpoints(breakpointsChangedEvent) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const bp of breakpointsChangedEvent.removed) {
            if (bp.condition && bp.condition.toLowerCase().indexOf(constants_1.CHECKPOINT) >= 0) {
                yield lock.acquire(constants_1.CHECKPOINTS_LOCK_STRING, () => __awaiter(this, void 0, void 0, function* () {
                    const breakpointId = bp._id;
                    exports.checkpointService.deleteCheckpointNodeIfExists(breakpointId);
                }));
            }
        }
        for (const bp of breakpointsChangedEvent.changed) {
            const breakpointId = bp._id;
            if (bp.condition &&
                bp.condition.toLowerCase().indexOf(constants_1.CHECKPOINT) >= 0 &&
                bp instanceof vscode.SourceBreakpoint) {
                const checkpointOverlayAction = parseCheckpointInfoFromBreakpoint(bp);
                const uri = code2ProtocolConverter(bp.location.uri);
                const filename = uri.substring(uri.lastIndexOf('/') + 1);
                const theNode = exports.checkpointService.returnCheckpointNodeIfAlreadyExists(breakpointId);
                yield lock.acquire(constants_1.CHECKPOINTS_LOCK_STRING, () => __awaiter(this, void 0, void 0, function* () {
                    // If the node exists then update it
                    if (theNode) {
                        theNode.updateCheckpoint(bp.enabled, uri, filename, checkpointOverlayAction);
                    }
                    else {
                        // else if the node didn't exist then create it
                        exports.checkpointService.createCheckpointNode(breakpointId, bp.enabled, uri, filename, checkpointOverlayAction);
                    }
                }));
            }
            else {
                // The breakpoint is no longer a SourceBreakpoint or is no longer a checkpoint. Call to delete it if it exists
                yield lock.acquire(constants_1.CHECKPOINTS_LOCK_STRING, () => __awaiter(this, void 0, void 0, function* () {
                    exports.checkpointService.deleteCheckpointNodeIfExists(breakpointId);
                }));
            }
        }
        for (const bp of breakpointsChangedEvent.added) {
            if (bp.condition &&
                bp.condition.toLowerCase().indexOf(constants_1.CHECKPOINT) >= 0 &&
                bp instanceof vscode.SourceBreakpoint) {
                yield lock.acquire(constants_1.CHECKPOINTS_LOCK_STRING, () => __awaiter(this, void 0, void 0, function* () {
                    const breakpointId = bp._id;
                    const checkpointOverlayAction = parseCheckpointInfoFromBreakpoint(bp);
                    const uri = code2ProtocolConverter(bp.location.uri);
                    const filename = uri.substring(uri.lastIndexOf('/') + 1);
                    exports.checkpointService.createCheckpointNode(breakpointId, bp.enabled, uri, filename, checkpointOverlayAction);
                }));
            }
        }
    });
}
exports.processBreakpointChangedForCheckpoints = processBreakpointChangedForCheckpoints;
function parseCheckpointInfoFromBreakpoint(breakpoint) {
    // declare the overlayAction with defaults
    const checkpointOverlayAction = {
        ActionScript: '',
        ActionScriptType: commands_1.ActionScriptEnum.None,
        ExecutableEntityName: undefined,
        IsDumpingHeap: true,
        Iteration: 1,
        Line: -1
    };
    checkpointOverlayAction.Line = breakpoint.location.range.start.line + 1; // need to add 1 since the lines are 0 based
    // if the hit condition is a number then use it
    if (breakpoint.hitCondition) {
        if (/\d/.test(breakpoint.hitCondition)) {
            checkpointOverlayAction.Iteration = Number(breakpoint.hitCondition);
        }
    }
    // If the log message is defined and isn't empty then set the action script
    // based upon whether or not the string starts with SELECT
    const logMessage = breakpoint.logMessage;
    if (logMessage && logMessage.length > 0) {
        if (logMessage.toLocaleLowerCase().startsWith('select')) {
            checkpointOverlayAction.ActionScriptType = commands_1.ActionScriptEnum.SOQL;
        }
        else {
            checkpointOverlayAction.ActionScriptType = commands_1.ActionScriptEnum.Apex;
        }
        checkpointOverlayAction.ActionScript = logMessage;
    }
    return checkpointOverlayAction;
}
exports.parseCheckpointInfoFromBreakpoint = parseCheckpointInfoFromBreakpoint;
function setTypeRefsForEnabledCheckpoints() {
    let everythingSet = true;
    for (const cpNode of exports.checkpointService.getChildren()) {
        if (cpNode.isCheckpointEnabled()) {
            const checkpointUri = cpNode.getCheckpointUri();
            const checkpointLine = cpNode.getCheckpointLineNumber();
            if (!breakpoints_1.breakpointUtil.canSetLineBreakpoint(checkpointUri, checkpointLine)) {
                const errorMessage = messages_1.nls.localize('checkpoints_can_only_be_on_valid_apex_source', checkpointUri, checkpointLine);
                index_1.writeToDebuggerOutputWindow(errorMessage, true, index_1.VSCodeWindowTypeEnum.Error);
                everythingSet = false;
            }
            const typeRef = breakpoints_1.breakpointUtil.getTopLevelTyperefForUri(cpNode.getCheckpointUri());
            cpNode.setCheckpointTypeRef(typeRef);
        }
    }
    return everythingSet;
}
// The order of operations here should be to
// 1. Get the source/line information
// 2. Validate the existing checkpoint information
//    a. validate there are only 5 active checkpoints
//    b. validate that the active checkpoint information is correct
//    c. set the typeRef on each checkpoint (requires the source/line information)
// 3. Remove any existing checkpoints
// 4. Create the new checkpoints
let creatingCheckpoints = false;
function sfdxCreateCheckpoints() {
    return __awaiter(this, void 0, void 0, function* () {
        // In-spite of waiting for the lock, we still want subsequent calls to immediately return
        // from this if checkpoints are already being created instead of stacking them up.
        if (!creatingCheckpoints) {
            creatingCheckpoints = true;
        }
        else {
            return false;
        }
        let updateError = false;
        // The status message isn't changing, call to localize it once and use the localized string in the
        // progress report.
        const localizedProgressMessage = messages_1.nls.localize('sfdx_update_checkpoints_in_org');
        // Wrap everything in a try/finally to ensure creatingCheckpoints gets set to false
        try {
            // The lock is necessary here to prevent the user from deleting the underlying breakpoint
            // attached to the checkpoint while they're being uploaded into the org.
            yield lock.acquire(constants_1.CHECKPOINTS_LOCK_STRING, () => __awaiter(this, void 0, void 0, function* () {
                index_1.writeToDebuggerOutputWindow(`${messages_1.nls.localize('long_command_start')} ${localizedProgressMessage}`);
                yield vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: localizedProgressMessage,
                    cancellable: false
                }, (progress, token) => __awaiter(this, void 0, void 0, function* () {
                    index_1.writeToDebuggerOutputWindow(`${localizedProgressMessage}, ${messages_1.nls.localize('checkpoint_creation_status_org_info')}`);
                    progress.report({ increment: 0, message: localizedProgressMessage });
                    const orgInfoRetrieved = yield exports.checkpointService.retrieveOrgInfo();
                    if (!orgInfoRetrieved) {
                        updateError = true;
                        return false;
                    }
                    index_1.writeToDebuggerOutputWindow(`${localizedProgressMessage}, ${messages_1.nls.localize('checkpoint_creation_status_source_line_info')}`);
                    progress.report({ increment: 20, message: localizedProgressMessage });
                    const sourceLineInfoRetrieved = yield index_1.retrieveLineBreakpointInfo();
                    // If we didn't get the source line information that'll be reported at that time, just return
                    if (!sourceLineInfoRetrieved) {
                        updateError = true;
                        return false;
                    }
                    // There can be a max of five active checkpoints
                    if (!exports.checkpointService.hasFiveOrLessActiveCheckpoints(true)) {
                        updateError = true;
                        return false;
                    }
                    index_1.writeToDebuggerOutputWindow(`${localizedProgressMessage}, ${messages_1.nls.localize('checkpoint_creation_status_setting_typeref')}`);
                    progress.report({ increment: 50, message: localizedProgressMessage });
                    // For the active checkpoints set the typeRefs using the source/line info
                    if (!setTypeRefsForEnabledCheckpoints()) {
                        updateError = true;
                        return false;
                    }
                    index_1.writeToDebuggerOutputWindow(`${localizedProgressMessage}, ${messages_1.nls.localize('checkpoint_creation_status_clearing_existing_checkpoints')}`);
                    progress.report({ increment: 50, message: localizedProgressMessage });
                    // remove any existing checkpoints on the server
                    const allRemoved = yield exports.checkpointService.clearExistingCheckpoints();
                    if (!allRemoved) {
                        updateError = true;
                        return false;
                    }
                    index_1.writeToDebuggerOutputWindow(`${localizedProgressMessage}, ${messages_1.nls.localize('checkpoint_creation_status_uploading_checkpoints')}`);
                    progress.report({ increment: 70, message: localizedProgressMessage });
                    // This should probably be batched but it makes dealing with errors kind of a pain
                    for (const cpNode of exports.checkpointService.getChildren()) {
                        if (cpNode.isCheckpointEnabled()) {
                            if (!(yield exports.checkpointService.executeCreateApexExecutionOverlayActionCommand(cpNode))) {
                                updateError = true;
                            }
                        }
                    }
                    progress.report({
                        increment: 100,
                        message: localizedProgressMessage
                    });
                    index_1.writeToDebuggerOutputWindow(`${localizedProgressMessage}, ${messages_1.nls.localize('checkpoint_creation_status_processing_complete_success')}`);
                }));
            }));
        }
        finally {
            index_1.writeToDebuggerOutputWindow(`${messages_1.nls.localize('long_command_end')} ${localizedProgressMessage}`);
            let errorMsg = '';
            if (updateError) {
                errorMsg = messages_1.nls.localize('checkpoint_upload_error_wrap_up_message', messages_1.nls.localize('sfdx_update_checkpoints_in_org'));
                index_1.writeToDebuggerOutputWindow(errorMsg, true, index_1.VSCodeWindowTypeEnum.Error);
            }
            telemetry_1.telemetryService.sendCheckpointEvent(errorMsg);
            creatingCheckpoints = false;
        }
        if (updateError) {
            return false;
        }
        return true;
    });
}
exports.sfdxCreateCheckpoints = sfdxCreateCheckpoints;
// A couple of important notes about this command's processing
// 1. There is no way to invoke a breakpoint change through vscode.debug
//    there is only add/delete.
// 2. A changed breakpoint has to first be deleted and then re-added.
// 3. Add/Delete breakpoints will go through the processBreakpointChangedForCheckpoints
//    event that's registered. That'll take care of all the checkpoint specific processing.
// 4. When a breakpoint already exists and it is being converted to a checkpoint, only
//    the hitCondition (which is really the hit count) is kept. The other pieces of information
//    that may be on the checkpoint are the condition (which needs to get set to Checkpoint)
//    and the logMessage. The logMessage is scrapped since this ends up being taken over by
//    checkpoints for user input SOQL or Apex.
function sfdxToggleCheckpoint() {
    return __awaiter(this, void 0, void 0, function* () {
        if (creatingCheckpoints) {
            index_1.writeToDebuggerOutputWindow(messages_1.nls.localize('checkpoint_upload_in_progress'), true, index_1.VSCodeWindowTypeEnum.Warning);
            return;
        }
        const bpAdd = [];
        const bpRemove = [];
        const uri = exports.fetchActiveEditorUri();
        const lineNumber = exports.fetchActiveSelectionLineNumber();
        if (uri && lineNumber) {
            // While selection could be passed directly into the location instead of creating
            // a new range, it ends up creating a weird secondary icon on the line with the
            // breakpoint which is due to the start/end characters being non-zero.
            let hitCondition;
            const bp = fetchExistingBreakpointForUriAndLineNumber(uri, lineNumber);
            // There's already a breakpoint at this line
            if (bp) {
                // If the breakpoint is a checkpoint then remove it and return
                if (bp.condition &&
                    bp.condition.toLowerCase().indexOf(constants_1.CHECKPOINT) >= 0) {
                    bpRemove.push(bp);
                    return yield vscode.debug.removeBreakpoints(bpRemove);
                }
                else {
                    // The only thing from the old breakpoint that is applicable to keep is the hitCondition
                    // which maps to iterations. Squirrel away hitCondition, remove the breakpoint and let
                    // processing go into the code to create a new breakpoint with the checkpoint condition
                    hitCondition = bp.hitCondition;
                    bpRemove.push(bp);
                    yield vscode.debug.removeBreakpoints(bpRemove);
                }
            }
            // Create a new checkpoint/breakpoint from scratch.
            const range = new vscode.Range(lineNumber, 0, lineNumber, 0);
            const location = new vscode.Location(uri, range);
            const newBreakpoint = new vscode.SourceBreakpoint(location, true, constants_1.CHECKPOINT, hitCondition);
            bpAdd.push(newBreakpoint);
            yield vscode.debug.addBreakpoints(bpAdd);
        }
        return;
    });
}
exports.sfdxToggleCheckpoint = sfdxToggleCheckpoint;
// This methods was broken out of sfdxToggleCheckpoint for testing purposes.
function fetchActiveEditorUri() {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
        return editor.document.uri;
    }
}
exports.fetchActiveEditorUri = fetchActiveEditorUri;
// This methods was broken out of sfdxToggleCheckpoint for testing purposes.
function fetchActiveSelectionLineNumber() {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.selection) {
        return editor.selection.start.line;
    }
    return undefined;
}
exports.fetchActiveSelectionLineNumber = fetchActiveSelectionLineNumber;
function fetchExistingBreakpointForUriAndLineNumber(uriInput, lineInput) {
    for (const bp of vscode.debug.breakpoints) {
        if (bp instanceof vscode.SourceBreakpoint) {
            // Uri comparison doesn't work even if they're contain the same
            // information. toString both URIs
            if (bp.location.uri.toString() === uriInput.toString() &&
                bp.location.range.start.line === lineInput) {
                return bp;
            }
        }
    }
    return undefined;
}
// See https://github.com/Microsoft/vscode-languageserver-node/issues/105
function code2ProtocolConverter(value) {
    if (/^win32/.test(process.platform)) {
        // The *first* : is also being encoded which is not the standard for URI on Windows
        // Here we transform it back to the standard way
        return value.toString().replace('%3A', ':');
    }
    else {
        return value.toString();
    }
}
//# sourceMappingURL=checkpointService.js.map