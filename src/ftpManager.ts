import * as vscode from 'vscode';
import * as ftp from 'basic-ftp';

export class FTPManager {
    private client: ftp.Client;
    private statusBar: vscode.StatusBarItem;
    private isConnected: boolean = false;
    private readonly DEFAULT_REMOTE_ROOT = 'html';

    constructor() {
        this.client = new ftp.Client();
        this.client.ftp.verbose = false;
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.updateStatusBar('FTP: 연결 대기중');
    }

    async showSetupWizard() {
        const host = await vscode.window.showInputBox({
            prompt: 'FTP 호스트 주소를 입력하세요',
            placeHolder: 'example.dothome.co.kr',
            value: await this.getCurrentSetting('host') || ''
        });

        const username = await vscode.window.showInputBox({
            prompt: 'FTP 아이디를 입력하세요',
            placeHolder: '닷홈 아이디',
            value: await this.getCurrentSetting('username') || ''
        });

        const password = await vscode.window.showInputBox({
            prompt: 'FTP 비밀번호를 입력하세요',
            password: true
        });

        const customRemoteRoot = await vscode.window.showInputBox({
            prompt: '원격 작업 디렉토리 설정 (기본값: /html)',
            placeHolder: '비워두면 자동으로 /html로 설정됩니다',
            value: await this.getCurrentSetting('remoteRoot') || '',
        });

        if (host && username && password) {
            const config = vscode.workspace.getConfiguration('ftpMini');
            await config.update('host', host, true);
            await config.update('username', username, true);
            await config.update('password', password, true);
            await config.update('remoteRoot', customRemoteRoot || this.DEFAULT_REMOTE_ROOT, true);
            
            const shouldSync = await vscode.window.showInformationMessage(
                '원격 서버의 파일을 로컬로 다운로드하여 동기화하시겠습니까?',
                '예', '아니오'
            );
            
            if (shouldSync === '예') {
                await this.initialSync();
            }
            
            return this.connect();
        }
    }

    private async getCurrentSetting(key: string): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration('ftpMini');
        return config.get(key);
    }

    async connect() {
        try {
            const config = vscode.workspace.getConfiguration('ftpMini');
            await this.client.access({
                host: config.get('host'),
                user: config.get('username'),
                password: config.get('password'),
                secure: false
            });

            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT);
            await this.client.cd(remoteRoot);
            
            this.isConnected = true;
            this.updateStatusBar(`FTP: 연결됨 (${remoteRoot}) ✓`);
            return true;
        } catch (error) {
            this.isConnected = false;
            this.updateStatusBar('FTP: 연결 실패 ✗');
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            vscode.window.showErrorMessage(`FTP 연결 실패: ${errorMessage}`);
            return false;
        }
    }

    async uploadFile(localPath: string): Promise<void> {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const remotePath = this.getRemotePath(localPath);
            await this.client.uploadFrom(localPath, remotePath);
            
            this.updateStatusBar('FTP: 업로드 완료 ✓');
            setTimeout(() => {
                const config = vscode.workspace.getConfiguration('ftpMini');
                const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT);
                this.updateStatusBar(`FTP: 연결됨 (${remoteRoot}) ✓`);
            }, 2000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            vscode.window.showErrorMessage(`업로드 실패: ${errorMessage}`);
            this.updateStatusBar('FTP: 업로드 실패 ✗');
        }
    }

    private getRemotePath(localPath: string): string {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
        return localPath.replace(workspacePath, '').replace(/\\/g, '/').replace(/^\//, '');
    }

    private updateStatusBar(text: string) {
        this.statusBar.text = text;
        this.statusBar.show();
    }

    dispose() {
        this.statusBar.dispose();
        this.client.close();
    }

    async initialSync() {
        try {
            const config = vscode.workspace.getConfiguration('ftpMini');
            const remoteRoot = config.get('remoteRoot') || 'html';
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            
            if (!workspaceFolder) {
                throw new Error('워크스페이스가 열려있지 않습니다.');
            }

            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "원격 서버와 동기화 중...",
                cancellable: true
            }, async (progress) => {
                const excludePatterns: string[] = config.get('syncExclude') || ['.git', 'node_modules'];
                
                // 재귀적으로 원격 파일 목록 가져오기
                const fileList = await this.listRemoteFiles('');
                const totalFiles = fileList.length;
                let processedFiles = 0;

                for (const file of fileList) {
                    // 제외 패턴 확인
                    if (excludePatterns.some(pattern => file.startsWith(pattern))) {
                        continue;
                    }

                    try {
                        const localPath = vscode.Uri.joinPath(workspaceFolder.uri, file).fsPath;
                        const remotePath = file;

                        // 로컬 디렉토리 생성
                        await vscode.workspace.fs.createDirectory(
                            vscode.Uri.joinPath(workspaceFolder.uri, vscode.Uri.file(file).path, '..')
                        );

                        // 파일 다운로드
                        await this.client.downloadTo(localPath, remotePath);

                        // 진행상황 업데이트
                        processedFiles++;
                        progress.report({
                            message: `${processedFiles}/${totalFiles} 파일 동기화 중...`,
                            increment: (100 / totalFiles)
                        });

                    } catch (err) {
                        console.error(`Failed to download ${file}:`, err);
                    }
                }
            });

            vscode.window.showInformationMessage('원격 서버와 동기화가 완료되었습니다.');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error 
                ? error.message 
                : '알 수 없는 오류가 발생했습니다';
            vscode.window.showErrorMessage(`동기화 중 오류 발생: ${errorMessage}`);
        }
    }

    private async listRemoteFiles(currentPath: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            const list = await this.client.list(currentPath);
            
            for (const item of list) {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                
                if (item.type === 2) { 
                    const subFiles = await this.listRemoteFiles(itemPath);
                    files.push(...subFiles);
                } else if (item.type === 1) { 
                    files.push(itemPath);
                }
            }
        } catch (err) {
            console.error(`Failed to list ${currentPath}:`, err);
        }
        
        return files;
    }
}