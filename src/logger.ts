import * as vscode from 'vscode';

export class Logger {
    private static outputChannel: vscode.OutputChannel;

    static initialize() {
        this.outputChannel = vscode.window.createOutputChannel('FTP Mini');
    }

    static log(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    static show() {
        this.outputChannel.show();
    }

    static dispose() {
        this.outputChannel.dispose();
    }
} 