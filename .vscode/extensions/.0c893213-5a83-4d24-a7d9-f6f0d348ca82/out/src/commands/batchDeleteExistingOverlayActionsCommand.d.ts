import { BaseCommand, RestHttpMethodEnum } from '@salesforce/salesforcedx-apex-replay-debugger/node_modules/@salesforce/salesforcedx-utils-vscode/out/src/requestService';
export interface BatchRequests {
    batchRequests: BatchRequest[];
}
export interface BatchRequest {
    method: RestHttpMethodEnum;
    url: string;
}
export interface BatchDeleteResponse {
    hasErrors: boolean;
    results: BatchDeleteResult[];
}
export interface BatchDeleteResult {
    statusCode: number;
    result: SingleResult[] | null;
}
export interface SingleResult {
    errorCode: string;
    message: string;
}
export declare class BatchDeleteExistingOverlayActionCommand extends BaseCommand {
    private readonly requests;
    constructor(requests: BatchRequests);
    getCommandUrl(): string;
    getRequest(): string | undefined;
}
