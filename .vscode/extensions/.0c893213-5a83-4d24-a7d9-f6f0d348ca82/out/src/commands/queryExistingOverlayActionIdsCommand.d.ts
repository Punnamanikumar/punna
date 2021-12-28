import { BaseCommand } from '@salesforce/salesforcedx-apex-replay-debugger/node_modules/@salesforce/salesforcedx-utils-vscode/out/src/requestService';
export interface QueryOverlayActionIdsSuccessResult {
    size: number;
    totalSize: number;
    done: boolean;
    queryLocator: any | null;
    entityTypeName: string;
    records: ApexExecutionOverlayActionRecord[];
}
export interface ApexExecutionOverlayActionRecord {
    attributes: ApexExecutionOverlayActionRecordAttribute;
    Id: string;
}
export interface ApexExecutionOverlayActionRecordAttribute {
    type: string;
    url: string;
}
export declare class QueryExistingOverlayActionIdsCommand extends BaseCommand {
    private readonly userId;
    constructor(userId: string);
    getCommandUrl(): string;
    getQueryString(): string | undefined;
    getRequest(): string | undefined;
}
