import * as vscode from 'vscode';
export declare class DebugConfigurationProvider implements vscode.DebugConfigurationProvider {
    private sfdxApex;
    static getConfig(logFile?: string, stopOnEntry?: boolean): vscode.DebugConfiguration;
    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]>;
    resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration>;
    private asyncDebugConfig;
    private isLanguageClientReady;
}
