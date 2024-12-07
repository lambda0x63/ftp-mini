import * as vscode from 'vscode';
import * as ftp from 'basic-ftp';

export class FTPManager {
    private client: ftp.Client | null = null;
    private statusBar: vscode.StatusBarItem;
    private isConnected: boolean = false;
    private readonly DEFAULT_REMOTE_ROOT = 'html';
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY = 1000;

    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.updateStatusBar('FTP: 연결 대기중');
    }

    async showSetupWizard() {
        const host = await vscode.window.showInputBox({
            prompt: 'FTP 서버 주소를 입력하세요',
            placeHolder: 'your.domain.com',
            value: await this.getCurrentSetting('host') || ''
        });

        if (!host) {
            vscode.window.showInformationMessage('FTP 설정이 취소되었습니다.');
            return;
        }

        const username = await vscode.window.showInputBox({
            prompt: 'FTP 사용자 이름을 입력하세요',
            placeHolder: 'username',
            value: await this.getCurrentSetting('username') || ''
        });

        if (!username) {
            vscode.window.showInformationMessage('FTP 설정이 취소되었습니다.');
            return;
        }

        const password = await vscode.window.showInputBox({
            prompt: 'FTP 비밀번호를 입력하세요',
            value: await this.getCurrentSetting('password') || ''
        });

        if (!password) {
            vscode.window.showInformationMessage('FTP 설정이 취소되었습니다.');
            return;
        }

        const customRemoteRoot = await vscode.window.showInputBox({
            prompt: '원격 작업 디렉토리 설정',
            placeHolder: '기본값: /html',
            value: await this.getCurrentSetting('remoteRoot') || '',
        });

        if (customRemoteRoot === undefined) {
            vscode.window.showInformationMessage('FTP 설정이 취소되었습니다.');
            return;
        }

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

    private async getCurrentSetting(key: string): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration('ftpMini');
        return config.get(key);
    }

    async connect() {
        try {
            if (this.isConnected && this.client) {
                return true;
            }

            if (this.client) {
                await this.client.close();
                this.client = null;
            }
            
            const config = vscode.workspace.getConfiguration('ftpMini');
            const host = config.get('host') as string;
            const username = config.get('username') as string;
            const password = config.get('password') as string;
            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;

            if (!host || !username || !password) {
                throw new Error('FTP 설정이 완료되지 않았습니다. 설정을 먼저 진행해주세요.');
            }

            this.client = new ftp.Client();
            this.client.ftp.verbose = true;

            await this.client.access({
                host,
                user: username,
                password,
                secure: false
            });

            if (this.client) {
                await this.client.cd(remoteRoot);
            }
            
            this.isConnected = true;
            this.updateStatusBar(`FTP: 연결됨 (${remoteRoot}) ✓`);
            return true;
        } catch (error) {
            this.isConnected = false;
            if (this.client) {
                await this.client.close();
                this.client = null;
            }
            
            this.updateStatusBar('FTP: 연결 실패 ✗');
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            vscode.window.showErrorMessage(`FTP 연결 실패: ${errorMessage}`);
            return false;
        }
    }

    async uploadFile(localPath: string, retryCount = 0): Promise<void> {
        let tempClient: ftp.Client | null = null;
        
        try {
            tempClient = new ftp.Client();
            tempClient.ftp.verbose = true;
            
            const config = vscode.workspace.getConfiguration('ftpMini');
            await tempClient.access({
                host: config.get('host') as string,
                user: config.get('username') as string,
                password: config.get('password') as string,
                secure: false
            });

            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;
            await tempClient.cd(remoteRoot);
            
            const remotePath = this.getRemotePath(localPath);
            await tempClient.uploadFrom(localPath, remotePath);
            
            this.updateStatusBar('FTP: 업로드 완료 ✓');
            setTimeout(() => {
                this.updateStatusBar(`FTP: 준비됨`);
            }, 2000);
        } catch (error) {
            if (retryCount < this.MAX_RETRY_ATTEMPTS) {
                this.updateStatusBar(`FTP: 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.uploadFile(localPath, retryCount + 1);
            }
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            vscode.window.showErrorMessage(`업로드 실패: ${errorMessage}`);
            this.updateStatusBar('FTP: 업로드 실패 ✗');
        } finally {
            if (tempClient) {
                await tempClient.close();
            }
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
        if (this.client) {
            this.client.close();
            this.client = null;
        }
    }

    async initialSync() {
        try {
            await this.connect();
            
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
                
                // 재귀적으로 원격 파일 목록록 가져오기
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
                        if (this.client) {
                            await this.client.downloadTo(localPath, remotePath);
                        }

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
        } finally {
            await this.client?.close();
            this.client = null;
        }
    }

    private async listRemoteFiles(currentPath: string): Promise<string[]> {
        const files: string[] = [];
        
        try {
            if (!this.client) {
                throw new Error('FTP 클라이언트가 초기화되지 않았습니다.');
            }
            
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

    async deleteFile(localPath: string, retryCount = 0): Promise<void> {
        try {
            await this.connect();
            
            const remotePath = this.getRemotePath(localPath);
            await this.client?.remove(remotePath);
            
            this.updateStatusBar('FTP: 파일 삭제 완료 ✓');
        } catch (error) {
            if (retryCount < this.MAX_RETRY_ATTEMPTS) {
                this.updateStatusBar(`FTP: 삭제 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.deleteFile(localPath, retryCount + 1);
            }
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            vscode.window.showErrorMessage(`파일 삭제 실패: ${errorMessage}`);
            this.updateStatusBar('FTP: 파일 삭제 실패 ✗');
        } finally {
            await this.client?.close();
            this.client = null;
        }
    }

    deactivate() {
        this.isConnected = false;
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        this.updateStatusBar('FTP: 비활성화됨');
    }
}