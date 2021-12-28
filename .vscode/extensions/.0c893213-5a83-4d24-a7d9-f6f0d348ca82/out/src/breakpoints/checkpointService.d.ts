import { ActionScriptEnum } from '@salesforce/salesforcedx-apex-replay-debugger/out/src/commands';
import { Event, TreeDataProvider, TreeItem } from 'vscode';
import * as vscode from 'vscode';
export interface ApexExecutionOverlayAction {
    ActionScript: string;
    ActionScriptType: ActionScriptEnum;
    ExecutableEntityName: string | undefined;
    IsDumpingHeap: boolean;
    Iteration: number;
    Line: number;
}
export declare class CheckpointService implements TreeDataProvider<BaseNode> {
    private static instance;
    private checkpoints;
    private _onDidChangeTreeData;
    private myRequestService;
    private orgInfo;
    private sfdxProject;
    readonly onDidChangeTreeData: Event<BaseNode | undefined>;
    constructor();
    fireTreeChangedEvent(): void;
    retrieveOrgInfo(): Promise<boolean>;
    static getInstance(): CheckpointService;
    getTreeItem(element: BaseNode): TreeItem;
    getChildren(element?: BaseNode): BaseNode[];
    hasFiveOrLessActiveCheckpoints(displayError: boolean): boolean;
    hasOneOrMoreActiveCheckpoints(displayError: boolean): boolean;
    createCheckpointNode(breakpointIdInput: string, enabledInput: boolean, uriInput: string, sourceFileInput: string, checkpointOverlayAction: ApexExecutionOverlayAction): CheckpointNode;
    returnCheckpointNodeIfAlreadyExists(breakpointIdInput: string): CheckpointNode | undefined;
    deleteCheckpointNodeIfExists(breakpointIdInput: string): void;
    executeCreateApexExecutionOverlayActionCommand(theNode: CheckpointNode): Promise<boolean>;
    clearExistingCheckpoints(): Promise<boolean>;
}
export declare const checkpointService: CheckpointService;
export declare abstract class BaseNode extends TreeItem {
    abstract getChildren(): BaseNode[];
}
export declare class CheckpointNode extends BaseNode {
    private readonly children;
    private readonly breakpointId;
    private readonly checkpointOverlayAction;
    private uri;
    private enabled;
    private actionObjectId;
    constructor(breapointIdInput: string, enabledInput: boolean, uriInput: string, sourceFileInput: string, checkpointOverlayActionInput: ApexExecutionOverlayAction);
    createJSonStringForOverlayAction(): string;
    getBreakpointId(): string;
    isCheckpointEnabled(): boolean;
    getCheckpointLineNumber(): number;
    getCheckpointTypeRef(): string | undefined;
    setCheckpointTypeRef(typeRef: string | undefined): void;
    updateCheckpoint(enabledInput: boolean, uriInput: string, sourceFileInput: string, checkpointOverlayActionInput: ApexExecutionOverlayAction): void;
    private updateActionScript;
    private updateActionScriptType;
    private updateIterations;
    getIteration(): number;
    getActionScript(): string;
    getActionScriptType(): ActionScriptEnum;
    getCheckpointUri(): string;
    getChildren(): CheckpointInfoNode[];
    getActionCommandResultId(): string | undefined;
    setActionCommandResultId(actionObjectId: string | undefined): void;
}
export declare class CheckpointInfoNode extends BaseNode {
    getChildren(): BaseNode[];
}
export declare class CheckpointInfoActionScriptNode extends CheckpointInfoNode {
    private checkpointOverlayAction;
    constructor(cpOverlayActionInput: ApexExecutionOverlayAction);
    updateActionScript(actionScriptInput: string): void;
    getChildren(): BaseNode[];
}
export declare class CheckpointInfoActionScriptTypeNode extends CheckpointInfoNode {
    private checkpointOverlayAction;
    constructor(cpOverlayActionInput: ApexExecutionOverlayAction);
    updateActionScriptType(actionScriptTypeInput: ActionScriptEnum): void;
    getChildren(): BaseNode[];
}
export declare class CheckpointInfoIterationNode extends CheckpointInfoNode {
    private checkpointOverlayAction;
    constructor(cpOverlayActionInput: ApexExecutionOverlayAction);
    updateIterations(iterationInput: number): void;
    getChildren(): BaseNode[];
}
export declare function processBreakpointChangedForCheckpoints(breakpointsChangedEvent: vscode.BreakpointsChangeEvent): Promise<void>;
export declare function parseCheckpointInfoFromBreakpoint(breakpoint: vscode.SourceBreakpoint): ApexExecutionOverlayAction;
export declare function sfdxCreateCheckpoints(): Promise<boolean>;
export declare function sfdxToggleCheckpoint(): Promise<void>;
