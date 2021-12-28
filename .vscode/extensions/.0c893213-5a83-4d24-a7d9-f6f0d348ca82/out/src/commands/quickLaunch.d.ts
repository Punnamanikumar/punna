import { LibraryCommandletExecutor } from '@salesforce/salesforcedx-utils-vscode/out/src';
import { ContinueResponse } from '@salesforce/salesforcedx-utils-vscode/out/src/types';
export declare class QuickLaunch {
    debugTest(testClass: string, testName?: string): Promise<boolean>;
    private runSingleTest;
    private retrieveLogFile;
}
export declare class TestDebuggerExecutor extends LibraryCommandletExecutor<string[]> {
    constructor();
    run(response: ContinueResponse<string[]>): Promise<boolean>;
}
export declare function setupAndDebugTests(className: string, methodName?: string): Promise<void>;
