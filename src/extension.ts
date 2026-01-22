import * as vscode from 'vscode';
import { FTPManager } from './ftpManager';
import { Logger } from './logger';

// NodeJS의 global 타입 확장
declare global {
    namespace NodeJS {
        interface Global {
            ftpManager: FTPManager;
        }
    }
}

const g = globalThis as unknown as NodeJS.Global;

export async function activate(context: vscode.ExtensionContext) {
    Logger.initialize();

    // 시작할 때 모든 설정 초기화
    const config = vscode.workspace.getConfiguration('ftpMini');
    await Promise.all([
        config.update('protocol', undefined, true),
        config.update('host', undefined, true),
        config.update('username', undefined, true),
        config.update('password', undefined, true),
        config.update('remoteRoot', undefined, true),
        config.update('syncOnConnect', undefined, true),
        config.update('syncExclude', undefined, true)
    ]);
    Logger.log('FTP Mini가 새로 시작되었습니다. 모든 이전 설정이 초기화되었습니다.');

    const ftpManager = new FTPManager();
    g.ftpManager = ftpManager;

    // 상태바는 FTPManager 내부에서 관리 (중복 제거)

    // 설정 명령어 (재설정 포함)
    const configureCommand = vscode.commands.registerCommand('ftp-mini.configure', async () => {
        const config = vscode.workspace.getConfiguration('ftpMini');
        const existingHost = config.get('host');

        if (existingHost) {
            const answer = await vscode.window.showInformationMessage(
                '기존 설정이 있습니다. 새로 설정하시겠습니까?',
                '예', '아니오'
            );

            if (answer !== '예') {
                Logger.log('재설정이 취소되었습니다.');
                return;
            }
            Logger.log('재설정을 시작합니다.');
        }

        await ftpManager.showSetupWizard();
    });

    // 비활성화 명령어
    const deactivateCommand = vscode.commands.registerCommand('ftp-mini.deactivate', async () => {
        const answer = await vscode.window.showWarningMessage(
            '연결을 비활성화하시겠습니까? 모든 설정이 초기화됩니다.',
            '예', '아니오'
        );

        if (answer === '예') {
            await ftpManager.deactivate();
            vscode.window.showInformationMessage('연결이 비활성화되었습니다.');
        }
    });

    // 파일 저장 시 자동 업로드
    const saveWatcher = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
        if (ftpManager.isActive()) {
            Logger.log(`파일 업로드 시작: ${document.uri.fsPath}`);
            await ftpManager.uploadFile(document.uri.fsPath);
        }
    });

    // 파일 삭제 감지
    const deleteWatcher = vscode.workspace.onDidDeleteFiles(async (event: vscode.FileDeleteEvent) => {
        if (ftpManager.isActive()) {
            for (const file of event.files) {
                Logger.log(`파일 삭제 시작: ${file.fsPath}`);
                await ftpManager.deleteFile(file.fsPath);
            }
        }
    });

    // 파일 생성 감지 (새 폴더 포함)
    const createWatcher = vscode.workspace.onDidCreateFiles(async (event: vscode.FileCreateEvent) => {
        if (ftpManager.isActive()) {
            for (const file of event.files) {
                const stat = await vscode.workspace.fs.stat(file);
                if (stat.type === vscode.FileType.Directory) {
                    Logger.log(`디렉토리 생성 시작: ${file.fsPath}`);
                    const remotePath = ftpManager.getRemotePath(file.fsPath);
                    // null 체크 추가
                    if (remotePath !== null) {
                        await ftpManager.createDirectory(remotePath);
                    } else {
                        Logger.log(`워크스페이스 외부 디렉토리 무시: ${file.fsPath}`);
                    }
                } else {
                    // 파일인 경우 직접 업로드 처리
                    Logger.log(`새 파일 생성 감지: ${file.fsPath}`);
                    await ftpManager.uploadFile(file.fsPath);
                }
            }
        }
    });

    // 파일 이동/이름변경 감지
    const renameWatcher = vscode.workspace.onDidRenameFiles(async (event: vscode.FileRenameEvent) => {
        if (ftpManager.isActive()) {
            for (const file of event.files) {
                Logger.log(`파일 이동 시작: ${file.oldUri.fsPath} -> ${file.newUri.fsPath}`);
                await ftpManager.moveFile(file.oldUri.fsPath, file.newUri.fsPath);
            }
        }
    });

    const showMenuCommand = vscode.commands.registerCommand('ftp-mini.showMenu', async () => {
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

    const showLogsCommand = vscode.commands.registerCommand('ftp-mini.showLogs', () => {
        Logger.show();
    });

    const reconnectCommand = vscode.commands.registerCommand('ftp-mini.reconnect', async () => {
        await ftpManager.connect();
    });

    context.subscriptions.push(
        configureCommand,
        deactivateCommand,
        saveWatcher,
        deleteWatcher,
        ftpManager,
        { dispose: () => Logger.dispose() },
        showMenuCommand,
        showLogsCommand,
        reconnectCommand,
        createWatcher,
        renameWatcher
    );
}

export async function deactivate() {
    try {
        // 전역 상태 저장소 초기화
        const config = vscode.workspace.getConfiguration('ftpMini');
        await Promise.all([
            config.update('protocol', undefined, true),
            config.update('host', undefined, true),
            config.update('username', undefined, true),
            config.update('password', undefined, true),
            config.update('remoteRoot', undefined, true),
            config.update('syncOnConnect', undefined, true),
            config.update('syncExclude', undefined, true)
        ]);

        // 메모리 상의 모든 FTP 관련 상태 초기화
        if (g.ftpManager) {
            await g.ftpManager.deactivate();
        }

        Logger.log('FTP Mini 익스텐션이 완전히 종료되고 모든 설정이 초기화되었습니다.');
        Logger.dispose();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
        Logger.log(`FTP Mini 종료 중 오류 발생: ${errorMessage}`);
    }
}
