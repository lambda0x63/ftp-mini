import * as vscode from 'vscode';
import { FTPManager } from './ftpManager'
import { Logger } from './logger';

export function activate(context: vscode.ExtensionContext) {
    Logger.initialize();
    const ftpManager = new FTPManager();
    
    // 설정 명령어 (재설정 포함)
    let configureCommand = vscode.commands.registerCommand('ftp-mini.configure', async () => {
        const config = vscode.workspace.getConfiguration('ftpMini');
        const existingHost = config.get('host');
        
        if (existingHost) {
            const answer = await vscode.window.showInformationMessage(
                '기존 FTP 설정이 있습니다. 새로 설정하시겠습니까?',
                '예', '아니오'
            );
            
            if (answer !== '예') {
                Logger.log('FTP 재설정이 취소되었습니다.');
                return;
            }
            Logger.log('FTP 재설정을 시작합니다.');
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
        if (ftpManager.isActive()) {
            Logger.log(`파일 업로드 시작: ${document.uri.fsPath}`);
            ftpManager.uploadFile(document.uri.fsPath);
        }
    });

    // 파일 삭제 감지
    let deleteWatcher = vscode.workspace.onDidDeleteFiles(async event => {
        if (ftpManager.isActive()) {
            for (const file of event.files) {
                Logger.log(`파일 삭제 시작: ${file.fsPath}`);
                await ftpManager.deleteFile(file.fsPath);
            }
        }
    });

    // 상태바 아이템
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = "FTP Mini";
    statusBarItem.command = 'ftp-mini.configure';
    statusBarItem.show();

    let showMenuCommand = vscode.commands.registerCommand('ftp-mini.showMenu', async () => {
        const items = [
            { label: '$(plug) 연결/재연결', command: 'ftp-mini.reconnect' },
            { label: '$(gear) 설정', command: 'ftp-mini.configure' },
            { label: '$(output) 로그 보기', command: 'ftp-mini.showLogs' },
            { label: '$(sign-out) 연결 해제', command: 'ftp-mini.deactivate' }
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'FTP Mini 메뉴'
        });

        if (selected) {
            vscode.commands.executeCommand(selected.command);
        }
    });

    let showLogsCommand = vscode.commands.registerCommand('ftp-mini.showLogs', () => {
        Logger.show();
    });

    let reconnectCommand = vscode.commands.registerCommand('ftp-mini.reconnect', async () => {
        await ftpManager.connect();
    });

    context.subscriptions.push(
        configureCommand,
        deactivateCommand,
        saveWatcher,
        deleteWatcher,
        statusBarItem,
        ftpManager,
        { dispose: () => Logger.dispose() },
        showMenuCommand,
        showLogsCommand,
        reconnectCommand
    );
}

export function deactivate() {
    Logger.log('FTP Mini 익스텐션이 비활성화되었습니다.');
}