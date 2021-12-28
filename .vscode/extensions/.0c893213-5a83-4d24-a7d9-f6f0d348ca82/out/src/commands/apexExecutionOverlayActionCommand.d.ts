import { BaseCommand } from '@salesforce/salesforcedx-apex-replay-debugger/node_modules/@salesforce/salesforcedx-utils-vscode/out/src/requestService';
export interface ApexExecutionOverlayFailureResult {
    message: string;
    errorCode: string;
    fields: string[];
}
export interface ApexExecutionOverlaySuccessResult {
    id: string;
    success: boolean;
    errors: string[];
    warnings: string[];
}
export declare class ApexExecutionOverlayActionCommand extends BaseCommand {
    private readonly commandName;
    private readonly requestString;
    private readonly actionObjectId;
    constructor(requestString?: string, actionObjectId?: string, queryString?: string);
    getCommandUrl(): string;
    getRequest(): string | undefined;
}
