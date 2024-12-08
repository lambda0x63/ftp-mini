import * as vscode from 'vscode';
import * as ftp from 'basic-ftp';
import { Logger } from './logger';
import * as path from 'path';

export class FTPManager {
    private client: ftp.Client | null = null;
    private statusBar: vscode.StatusBarItem;
    private isConnected: boolean = false;
    private isEnabled: boolean = false;
    private readonly DEFAULT_REMOTE_ROOT = 'html';
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY = 1000;
    private isUploading: boolean = false;

    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.updateStatusBar('연결 대기중', '');
    }

    async showSetupWizard() {
        Logger.log('FTP 설정 마법사 시작');
        
        // 호스트 입력
        const host = await vscode.window.showInputBox({
            prompt: 'FTP 서버 주소를 입력하세요',
            placeHolder: 'ftp.myschool.com 또는 IP 주소',
            value: await this.getCurrentSetting('host') || '',
            validateInput: (value) => {
                if (!value) return '서버 주소는 필수입니다';
                if (!this.validateHost(value)) return '올바른 도메인 또는 IP 주소를 입력하세요';
                return null;
            }
        });

        if (!host) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 사용자 이름 입력
        const username = await vscode.window.showInputBox({
            prompt: 'FTP 계정의 사용자 이름을 입력하세요',
            placeHolder: 'username',
            value: await this.getCurrentSetting('username') || '',
            validateInput: (value) => {
                if (!value) return '사용자 이름은 필수입니다';
                return null;
            }
        });

        if (!username) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 비밀번호 입력 (일반 텍스트로 표시)
        const password = await vscode.window.showInputBox({
            prompt: 'FTP 계정의 비밀번호를 입력하세요',
            value: await this.getCurrentSetting('password') || '',
            validateInput: (value) => {
                if (!value) return '비밀번호는 필수입니다';
                return null;
            }
        });

        if (!password) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 설정 저장
        const config = vscode.workspace.getConfiguration('ftpMini');
        await config.update('host', host, true);
        await config.update('username', username, true);
        await config.update('password', password, true);
        await config.update('remoteRoot', this.DEFAULT_REMOTE_ROOT, true);

        Logger.log('FTP 설정이 저장되었습니다:');
        Logger.log(`- 호스트: ${host}`);
        Logger.log(`- 사용자: ${username}`);
        Logger.log(`- 원격 디렉토리: ${this.DEFAULT_REMOTE_ROOT}`);

        // 연결 테스트
        const connected = await this.connect();
        if (connected) {
            this.isEnabled = true;
            Logger.log('FTP 서버에 성공적으로 연결되었습니다.');
            
            // 동기화 설정 확인
            const config = vscode.workspace.getConfiguration('ftpMini');
            const shouldSync = config.get('syncOnConnect');
            
            if (shouldSync) {
                const answer = await vscode.window.showInformationMessage(
                    '원격 서버의 파일을 로컬로 다운로드하여 동기화하시겠습니까?',
                    '예', '아니오'
                );
                
                if (answer === '예') {
                    Logger.log('파일 동기화를 시작합니다...');
                    await this.initialSync();
                }
            }

            Logger.show();
            vscode.window.showInformationMessage('FTP 연결이 설정되었습니다. 이제 파일을 저장하면 자동으로 업로드됩니다.');
        }

        return connected;
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
                Logger.log('FTP 설정이 완료되지 않았습니다. 설정을 먼저 진행해주세요.');
                Logger.show();
                throw new Error('FTP 설정이 완료되지 않았습니다. 설정을 먼저 진행해주세요.');
            }

            Logger.log(`FTP 서버에 연결 시도 중... (${host})`);
            
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
            this.updateStatusBar('연결됨', '✅');
            Logger.log(`FTP 서버에 성공적으로 연결되었습니다. (작업 디렉토리: ${remoteRoot})`);
            return true;
        } catch (error) {
            this.isConnected = false;
            if (this.client) {
                await this.client.close();
                this.client = null;
            }
            
            this.updateStatusBar('연결 실패', '❌');
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`FTP 연결 실패: ${errorMessage}`);
            Logger.show();
            vscode.window.showErrorMessage(`FTP 연결 실패: ${errorMessage}`);
            return false;
        }
    }

    private async ensureConnection(): Promise<boolean> {
        try {
            if (!this.client) {
                return await this.connect();
            }

            // 연결 상태 확인
            try {
                await this.client.pwd();
                return true;
            } catch {
                // 연결이 끊어진 경우 재연결 시도
                this.client = null;
                return await this.connect();
            }
        } catch (error) {
            return false;
        }
    }

    async uploadFile(localPath: string, retryCount = 0): Promise<void> {
        if (!this.isEnabled || this.isUploading) {
            return;
        }

        const fileName = path.basename(localPath);
        
        try {
            this.isUploading = true;
            
            const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!workspacePath || !localPath.startsWith(workspacePath)) {
                return;
            }

            this.updateStatusBar('업로드 중', '🔄');
            
            if (!await this.ensureConnection()) {
                throw new Error('FTP 서버 연결에 실패했습니다.');
            }

            const remotePath = this.getRemotePath(localPath);
            await this.client?.uploadFrom(localPath, remotePath);
            
            this.updateStatusBar('연결됨', '✅');
            Logger.log(`파일 업로드 성공: ${fileName}`);
            
            if (/\.(html|css|js)$/i.test(fileName)) {
                const config = vscode.workspace.getConfiguration('ftpMini');
                const host = config.get('host') as string;
                const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;
                
                const openInBrowser = await vscode.window.showInformationMessage(
                    `${fileName} 업로드 완료. 브라우저에서 확인하시겠습니까?`,
                    '열기'
                );
                
                if (openInBrowser === '열기') {
                    const url = `http://${host}${remoteRoot}/${remotePath}`;
                    vscode.env.openExternal(vscode.Uri.parse(url));
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            
            if (errorMessage.includes('control socket') && retryCount < this.MAX_RETRY_ATTEMPTS) {
                Logger.log(`연결 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
                this.client = null;
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.uploadFile(localPath, retryCount + 1);
            }

            this.updateStatusBar('연결 실패', '❌');
            Logger.log(`파일 업로드 실패: ${fileName} - ${errorMessage}`);
            vscode.window.showErrorMessage(`${fileName} 업로드 실패: ${errorMessage}`);
        } finally {
            this.isUploading = false;
            if (this.client && !this.isConnected) {
                await this.client.close();
                this.client = null;
            }
        }
    }

    private getRemotePath(localPath: string): string {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!workspacePath || !localPath.startsWith(workspacePath)) {
            return '';
        }
        return localPath.replace(workspacePath, '').replace(/\\/g, '/').replace(/^\//, '');
    }

    private updateStatusBar(text: string, icon: '✅' | '❌' | '🔄' | '') {
        const config = vscode.workspace.getConfiguration('ftpMini');
        const host = config.get('host') as string;
        
        if (host) {
            this.statusBar.text = `FTP: ${host} ${icon} ${text ? `(${text})` : ''}`;
        } else {
            this.statusBar.text = `FTP ${icon} ${text}`;
        }
        
        this.statusBar.command = 'ftp-mini.showMenu';
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
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "원격 서버와 동기화 중...",
                cancellable: true
            }, async (progress, token) => {
                const config = vscode.workspace.getConfiguration('ftpMini');
                const excludePatterns: string[] = config.get('syncExclude') || ['.git', 'node_modules'];
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                
                if (!workspaceFolder) {
                    throw new Error('워크스페이스가 열려있지 않습니다.');
                }

                // 원격 파일 목록 가져오기
                Logger.log('원격 서버의 파일 목록을 가져오는 중...');
                const fileList = await this.listRemoteFiles('');
                const totalFiles = fileList.length;
                Logger.log(`총 ${totalFiles}개의 파일이 발견되었습니다.`);
                let processedFiles = 0;

                for (const file of fileList) {
                    if (token.isCancellationRequested) {
                        Logger.log('동기화가 취소되었습니다.');
                        break;
                    }

                    // 제외 패턴 확인
                    if (excludePatterns.some(pattern => file.includes(pattern))) {
                        Logger.log(`제외된 파일: ${file}`);
                        continue;
                    }

                    try {
                        const localPath = vscode.Uri.joinPath(workspaceFolder.uri, file).fsPath;
                        
                        // 로컬 디렉토리 생성
                        await vscode.workspace.fs.createDirectory(
                            vscode.Uri.joinPath(workspaceFolder.uri, path.dirname(file))
                        );

                        // 파일 다운로드
                        if (this.client) {
                            await this.client.downloadTo(localPath, file);
                            processedFiles++;
                            
                            // 진행률 업데이트
                            progress.report({
                                message: `${processedFiles}/${totalFiles} 파일 동기화 중...`,
                                increment: (100 / totalFiles)
                            });
                            
                            Logger.log(`파일 다운로드 완료: ${file}`);
                        }
                    } catch (err) {
                        Logger.log(`파일 다운로드 실패: ${file} - ${err}`);
                    }
                }

                Logger.log(`동기화 완료: 총 ${processedFiles}개 파일이 동기화되었습니다.`);
            });

            vscode.window.showInformationMessage('파일 동기화가 완료되었습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`동기화 중 오류 발생: ${errorMessage}`);
            vscode.window.showErrorMessage(`동기화 실패: ${errorMessage}`);
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
        if (!this.isEnabled) {
            return;
        }

        try {
            if (!await this.ensureConnection()) {
                throw new Error('FTP 서버 연결에 실패했습니다.');
            }
            
            const remotePath = this.getRemotePath(localPath);
            await this.client?.remove(remotePath);
            
            this.updateStatusBar('파일 삭제 완료', '✅');
            Logger.log(`파일 삭제 성공: ${localPath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            
            if (errorMessage.includes('control socket') && retryCount < this.MAX_RETRY_ATTEMPTS) {
                this.updateStatusBar(`삭제 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`, '🔄');
                this.client = null;
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.deleteFile(localPath, retryCount + 1);
            }

            vscode.window.showErrorMessage(`파일 삭제 실패: ${errorMessage}`);
            this.updateStatusBar('파일 삭제 실패', '❌');
            Logger.log(`파일 삭제 실패: ${localPath} - ${errorMessage}`);
        } finally {
            if (this.client && !this.isConnected) {
                await this.client.close();
                this.client = null;
            }
        }
    }

    deactivate() {
        this.isEnabled = false;
        this.isConnected = false;
        this.isUploading = false;
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        this.updateStatusBar('비활성화됨', '');
        Logger.log('FTP 연결이 비활성화되었습니다.');
    }

    // 유효성 검사 함수들 추가
    private validateHost(host: string): boolean {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
        return ipRegex.test(host) || domainRegex.test(host);
    }

    private validatePort(port: string): boolean {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
    }

    private validatePath(path: string): boolean {
        return !/[<>:"|?*]/.test(path);
    }

    isActive(): boolean {
        return this.isEnabled;
    }
}