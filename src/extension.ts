import * as vscode from 'vscode';
import { FTPManager } from './ftpManager'

export function activate(context: vscode.ExtensionContext) {
    const ftpManager = new FTPManager();
    
    // 설정 명령어
    let settingsCommand = vscode.commands.registerCommand('ftp-mini.settings', async () => {
        await ftpManager.showSetupWizard();
    });

    // 설정 초기화 명령어
    let resetCommand = vscode.commands.registerCommand('ftp-mini.resetConfig', async () => {
        const config = vscode.workspace.getConfiguration('ftpMini');
        await config.update('host', undefined, true);
        await config.update('username', undefined, true);
        await config.update('password', undefined, true);
        await config.update('remoteRoot', undefined, true);
        
        vscode.window.showInformationMessage('FTP Mini 설정이 초기화되었습니다. 새로운 설정을 입력해주세요.');
        await ftpManager.showSetupWizard();
    });

    // 파일 저장 시 자동 업로드
    let saveWatcher = vscode.workspace.onDidSaveTextDocument(document => {
        ftpManager.uploadFile(document.uri.fsPath);
    });

    // 파일 삭제 감지
    let deleteWatcher = vscode.workspace.onDidDeleteFiles(async event => {
        for (const file of event.files) {
            await ftpManager.deleteFile(file.fsPath);
        }
    });

    // 상태바 아이템
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "FTP Mini";
    statusBarItem.command = 'ftp-mini.settings';
    statusBarItem.show();

    context.subscriptions.push(
        settingsCommand,
        resetCommand,
        saveWatcher,
        deleteWatcher,
        statusBarItem,
        ftpManager
    );
}

export function deactivate() {}