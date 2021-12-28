"use strict";
/*
 * Copyright (c) 2019, salesforce.com, inc.
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
const lightning_lsp_common_1 = require("@salesforce/lightning-lsp-common");
const src_1 = require("@salesforce/salesforcedx-utils-vscode/out/src");
const path = require("path");
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
const messages_1 = require("./messages");
const EXTENSION_NAME = 'salesforcedx-vscode-lightning';
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
exports.code2ProtocolConverter = code2ProtocolConverter;
function protocol2CodeConverter(value) {
    return vscode_1.Uri.parse(value);
}
function getActivationMode() {
    const config = vscode_1.workspace.getConfiguration('salesforcedx-vscode-lightning');
    return config.get('activationMode') || 'autodetect'; // default to autodetect
}
function activate(context) {
    return __awaiter(this, void 0, void 0, function* () {
        const extensionHRStart = process.hrtime();
        console.log('Activation Mode: ' + getActivationMode());
        // Run our auto detection routine before we activate
        // 1) If activationMode is off, don't startup no matter what
        if (getActivationMode() === 'off') {
            console.log('Aura Language Server activationMode set to off, exiting...');
            return;
        }
        // 2) if we have no workspace folders, exit
        if (!vscode_1.workspace.workspaceFolders) {
            console.log('No workspace, exiting extension');
            return;
        }
        // Pass the workspace folder URIs to the language server
        const workspaceUris = [];
        vscode_1.workspace.workspaceFolders.forEach(folder => {
            workspaceUris.push(folder.uri.fsPath);
        });
        // 3) If activationMode is autodetect or always, check workspaceType before startup
        const workspaceType = lightning_lsp_common_1.shared.detectWorkspaceType(workspaceUris);
        // Check if we have a valid project structure
        if (getActivationMode() === 'autodetect' && !lightning_lsp_common_1.shared.isLWC(workspaceType)) {
            // If activationMode === autodetect and we don't have a valid workspace type, exit
            console.log('Aura LSP - autodetect did not find a valid project structure, exiting....');
            console.log('WorkspaceType detected: ' + workspaceType);
            return;
        }
        // If activationMode === always, ignore workspace type and continue activating
        // 4) If we get here, we either passed autodetect validation or activationMode == always
        console.log('Aura Components Extension Activated');
        console.log('WorkspaceType detected: ' + workspaceType);
        // Initialize telemetry service
        const extensionPackage = require(context.asAbsolutePath('./package.json'));
        yield src_1.TelemetryService.getInstance().initializeService(context, EXTENSION_NAME, extensionPackage.aiKey, extensionPackage.version);
        // Start the Aura Language Server
        // Setup the language server
        const serverModule = context.asAbsolutePath(path.join('node_modules', '@salesforce', 'aura-language-server', 'lib', 'server.js'));
        // The debug options for the server
        const debugOptions = {
            execArgv: ['--nolazy', '--inspect=6020']
        };
        // If the extension is launched in debug mode then the debug server options are used
        // Otherwise the run options are used
        const serverOptions = {
            run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
            debug: {
                module: serverModule,
                transport: vscode_languageclient_1.TransportKind.ipc,
                options: debugOptions
            }
        };
        // Setup our fileSystemWatchers
        const clientOptions = {
            outputChannelName: messages_1.nls.localize('channel_name'),
            documentSelector: [
                {
                    language: 'html',
                    scheme: 'file'
                },
                {
                    language: 'html',
                    scheme: 'untitled'
                },
                { language: 'javascript', scheme: 'file' },
                { language: 'javascript', scheme: 'untitled' }
            ],
            synchronize: {
                fileEvents: [
                    vscode_1.workspace.createFileSystemWatcher('**/*.resource'),
                    vscode_1.workspace.createFileSystemWatcher('**/labels/CustomLabels.labels-meta.xml'),
                    vscode_1.workspace.createFileSystemWatcher('**/aura/*/*.{cmp,app,intf,evt,js}'),
                    vscode_1.workspace.createFileSystemWatcher('**/components/*/*/*.{cmp,app,intf,evt,lib,js}'),
                    // need to watch for directory deletions as no events are created for contents or deleted directories
                    vscode_1.workspace.createFileSystemWatcher('**/', true, true, false),
                    // these need to be handled because we also maintain a lwc index for interop
                    vscode_1.workspace.createFileSystemWatcher('**/staticresources/*.resource-meta.xml'),
                    vscode_1.workspace.createFileSystemWatcher('**/contentassets/*.asset-meta.xml'),
                    vscode_1.workspace.createFileSystemWatcher('**/lwc/*/*.js'),
                    vscode_1.workspace.createFileSystemWatcher('**/modules/*/*/*.js')
                ]
            },
            uriConverters: {
                code2Protocol: code2ProtocolConverter,
                protocol2Code: protocol2CodeConverter
            }
        };
        // Create the language client and start the client.
        const client = new vscode_languageclient_1.LanguageClient('auraLanguageServer', messages_1.nls.localize('client_name'), serverOptions, clientOptions);
        client
            .onReady()
            .then(() => {
            client.onNotification('salesforce/indexingStarted', startIndexing);
            client.onNotification('salesforce/indexingEnded', endIndexing);
        })
            .catch();
        // Start the language server
        const disp = client.start();
        // Push the disposable to the context's subscriptions so that the
        // client can be deactivated on extension deactivation
        context.subscriptions.push(disp);
        // Notify telemetry that our extension is now active
        src_1.TelemetryService.getInstance().sendExtensionActivationEvent(extensionHRStart);
    });
}
exports.activate = activate;
let indexingResolve;
function startIndexing() {
    const indexingPromise = new Promise(resolve => {
        indexingResolve = resolve;
    });
    reportIndexing(indexingPromise);
}
function endIndexing() {
    indexingResolve(undefined);
}
function reportIndexing(indexingPromise) {
    vscode_1.window.withProgress({
        location: vscode_1.ProgressLocation.Window,
        title: messages_1.nls.localize('index_components_text'),
        cancellable: true
    }, () => {
        return indexingPromise;
    });
}
function deactivate() {
    console.log('Aura Components Extension Deactivated');
    src_1.TelemetryService.getInstance().sendExtensionDeactivationEvent();
}
exports.deactivate = deactivate;
//# sourceMappingURL=index.js.map