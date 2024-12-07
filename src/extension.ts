import * as vscode from 'vscode';
import { FTPManager } from './ftpManager'

export function activate(context: vscode.ExtensionContext) {
    const ftpManager = new FTPManager();
    
    // 설정 명령어 (재설정 포함)
    let configureCommand = vscode.commands.registerCommand('ftp-mini.configure', async () => {
        // 이미 설정이 있는 경우 재설정 여부 확인
        const config = vscode.workspace.getConfiguration('ftpMini');
        const existingHost = config.get('host');
        
        if (existingHost) {
            const answer = await vscode.window.showInformationMessage(
                '기존 FTP 설정이 있습니다. 새로 설정하시겠습니까?',
                '예', '아니오'
            );
            
            if (answer !== '예') {
                return;
            }
        }
        
        await ftpManager.showSetupWizard();
    });

    // FTP 비활성화 명령어 추가
    let deactivateCommand = vscode.commands.registerCommand('ftp-mini.deactivate', async () => {
        const answer = await vscode.window.showWarningMessage(
            'FTP 연결을 비활성화하시겠습니까? 모든 설정이 초기화됩니다.',
            '예', '아니오'
        );
        
        if (answer === '예') {
            const config = vscode.workspace.getConfiguration('ftpMini');
            await config.update('host', undefined, true);
            await config.update('username', undefined, true);
            await config.update('password', undefined, true);
            await config.update('remoteRoot', undefined, true);
            
            ftpManager.deactivate();
            vscode.window.showInformationMessage('FTP 연결이 비활성화되었습니다.');
        }
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
    statusBarItem.command = 'ftp-mini.configure';
    statusBarItem.show();

    context.subscriptions.push(
        configureCommand,
        deactivateCommand,
        saveWatcher,
        deleteWatcher,
        statusBarItem,
        ftpManager
    );
}

export function deactivate() {}