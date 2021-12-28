import * as vscode from 'vscode';
export declare enum VSCodeWindowTypeEnum {
    Error = 1,
    Informational = 2,
    Warning = 3
}
export declare function updateLastOpened(extensionContext: vscode.ExtensionContext, logPath: string): void;
export declare function getDebuggerType(session: vscode.DebugSession): Promise<string>;
export declare function activate(context: vscode.ExtensionContext): Promise<void>;
export declare function retrieveLineBreakpointInfo(): Promise<boolean>;
export declare function writeToDebuggerOutputWindow(output: string, showVSCodeWindow?: boolean, vsCodeWindowType?: VSCodeWindowTypeEnum): void;
export declare function deactivate(): void;
