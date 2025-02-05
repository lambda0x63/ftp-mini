import * as vscode from 'vscode';
import * as ftp from 'basic-ftp';
import { Logger } from './logger';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export class FTPManager {
    private client: ftp.Client | null = null;
    private statusBar: vscode.StatusBarItem;
    private isConnected: boolean = false;
    private isEnabled: boolean = false;
    private readonly DEFAULT_REMOTE_ROOT = '/html';
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY = 1000;
    private isUploading: boolean = false;
    private uploadQueue: Array<{localPath: string, retryCount: number}> = [];
    private isProcessingQueue = false;

    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBar.text = "FTP Mini";
        this.statusBar.command = 'ftp-mini.configure';
        this.statusBar.show();
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

        // 비밀번호 입력
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

        // 원격 작업 디렉토리 입력 추가
        const remoteRoot = await vscode.window.showInputBox({
            prompt: '원격 작업 디렉토리를 입력하세요',
            placeHolder: '예: /html',
            value: await this.getCurrentSetting('remoteRoot') || this.DEFAULT_REMOTE_ROOT,
            validateInput: (value) => {
                if (!value) return '작업 디렉토리는 필수입니다';
                if (!value.startsWith('/')) return '경로는 /로 시작해야 합니다';
                if (!this.validatePath(value)) return '올바른 경로를 입력하세요';
                return null;
            }
        });

        if (!remoteRoot) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 설정 저장
        const config = vscode.workspace.getConfiguration('ftpMini');
        await config.update('host', host, true);
        await config.update('username', username, true);
        await config.update('password', password, true);
        await config.update('remoteRoot', remoteRoot, true);

        Logger.log('FTP 설정이 저장되었습니다:');
        Logger.log(`- 호스트: ${host}`);
        Logger.log(`- 사용자: ${username}`);
        Logger.log(`- 원격 디렉토리: ${remoteRoot}`);

        // 연결 테스트
        const connected = await this.connect();
        if (connected) {
            this.isEnabled = true;
            Logger.log('FTP 서버에 성공적으로 연결되었습니다.');
            
            // 동기화 바로 시작
            Logger.log('파일 동기화를 시작합니다...');
            await this.initialSync();

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
        // 큐에 추가
        this.uploadQueue.push({localPath, retryCount});
        
        // 큐 처리가 실행 중이 아니라면 시작
        if (!this.isProcessingQueue) {
            await this.processQueue();
        }
    }

    // 큐 처리를 위한 새로운 private 메서드
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.uploadQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.uploadQueue.length > 0) {
                const {localPath, retryCount} = this.uploadQueue[0];
                const fileName = path.basename(localPath);

                try {
                    if (!this.isEnabled) {
                        this.uploadQueue.shift();
                        continue;
                    }

                    this.updateStatusBar('업로드 중', '🔄');
                    
                    if (!await this.ensureConnection()) {
                        throw new Error('FTP 서버 연결에 실패했습니다.');
                    }

                    const remotePath = this.getRemotePath(localPath);
                    const remoteDir = path.dirname(remotePath);

                    // 설정에서 remoteRoot 가져오기
                    const config = vscode.workspace.getConfiguration('ftpMini');
                    const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;

                    // 먼저 루트 디렉토리로 이동
                    await this.client?.cd(remoteRoot);
                    
                    // 원격 디렉토리 생성 시도
                    if (remoteDir !== '.') {
                        await this.client?.ensureDir(remoteDir);
                        await this.client?.cd(remoteRoot);
                    }

                    // 파일 업로드
                    await this.client?.uploadFrom(localPath, remotePath);
                    
                    this.updateStatusBar('연결됨', '✅');
                    Logger.log(`파일 업로드 성공: ${fileName}`);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
                    
                    if (errorMessage.includes('control socket') && retryCount < this.MAX_RETRY_ATTEMPTS) {
                        Logger.log(`연결 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`);
                        this.client = null;
                        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                        this.uploadQueue[0].retryCount++;
                        continue;
                    }

                    this.updateStatusBar('연결 실패', '❌');
                    Logger.log(`파일 업로드 실패: ${fileName} - ${errorMessage}`);
                    vscode.window.showErrorMessage(`${fileName} 업로드 실패: ${errorMessage}`);
                }

                // 처리 완료된 항목 제거
                this.uploadQueue.shift();
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    public getRemotePath(localPath: string): string {
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
            Logger.log('원격 서버와 동기화를 시작합니다...');
            Logger.show();

            if (!this.client) {
                throw new Error('FTP 클라이언트가 초기화되지 않았습니다.');
            }

            const config = vscode.workspace.getConfiguration('ftpMini');
            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;

            // 원격 디렉토리로 이동 전에 현재 위치 확인
            const currentDir = await this.client.pwd();
            Logger.log(`현재 FTP 디렉토리: ${currentDir}`);

            // 원격 디렉토리로 이동
            try {
                await this.client.cd(remoteRoot);
                Logger.log(`원격 디렉토리(${remoteRoot})로 이동했습니다.`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
                Logger.log(`원격 디렉토리(${remoteRoot}) 접근 실패: ${errorMessage}`);
                vscode.window.showErrorMessage(`원격 디렉토리 접근 실패: ${errorMessage}`);
                throw error;
            }

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

                // 원격 파일 및 디렉토리 목록 가져오기
                Logger.log('원격 서버의 파일 목록을 가져오는 중...');
                const { files, directories } = await this.listRemoteFiles('');
                const totalItems = files.length + directories.length;
                Logger.log(`총 ${files.length}개의 파일과 ${directories.length}개의 디렉토리가 발견되었습니다.`);
                let processedItems = 0;

                // 먼저 모든 디렉토리 생성
                for (const dir of directories) {
                    if (token.isCancellationRequested) {
                        Logger.log('동기화가 취소되었습니다.');
                        break;
                    }

                    if (excludePatterns.some(pattern => dir.includes(pattern))) {
                        Logger.log(`제외된 디렉토리: ${dir}`);
                        continue;
                    }

                    const localDirPath = vscode.Uri.joinPath(workspaceFolder.uri, dir);
                    try {
                        await vscode.workspace.fs.createDirectory(localDirPath);
                        Logger.log(`디렉토리 생성 완료: ${dir}`);
                        processedItems++;
                        progress.report({
                            message: `${processedItems}/${totalItems} 항목 동기화 중...`,
                            increment: (100 / totalItems)
                        });
                    } catch (err) {
                        Logger.log(`디렉토리 생성 실패: ${dir} - ${err}`);
                    }
                }

                // 그 다음 파일 다운로드
                for (const file of files) {
                    if (token.isCancellationRequested) {
                        Logger.log('동기화가 취소되었습니다.');
                        break;
                    }

                    if (excludePatterns.some(pattern => file.includes(pattern))) {
                        Logger.log(`제외된 파일: ${file}`);
                        continue;
                    }

                    try {
                        const localPath = vscode.Uri.joinPath(workspaceFolder.uri, file).fsPath;
                        Logger.log(`파일 다운로드 시작: ${file} -> ${localPath}`);
                        await this.client?.downloadTo(localPath, file);
                        processedItems++;
                        
                        progress.report({
                            message: `${processedItems}/${totalItems} 항목 동기화 중...`,
                            increment: (100 / totalItems)
                        });
                        
                        Logger.log(`파일 다운로드 완료: ${file}`);
                    } catch (err) {
                        Logger.log(`파일 다운로드 실패: ${file} - ${err}`);
                    }
                }

                Logger.log(`동기화 완료: 총 ${processedItems}개 항목이 동기화되었습니다.`);
            });
            Logger.log('동기화가 완료되었습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`동기화 중 오류 발생: ${errorMessage}`);
            Logger.show();
            vscode.window.showErrorMessage(`동기화 중 오류 발생: ${errorMessage}`);
            throw error;
        }
    }

    private async listRemoteFiles(currentPath: string): Promise<{files: string[], directories: string[]}> {
        const files: string[] = [];
        const directories: string[] = [];
        
        try {
            if (!this.client) {
                throw new Error('FTP 클라이언트가 초기화되지 않았습니다.');
            }
            
            Logger.log(`디렉토리 목록 조회 중: ${currentPath || '/'}`);
            const list = await this.client.list(currentPath);
            Logger.log(`${list.length}개의 항목이 발견되었습니다.`);
            
            for (const item of list) {
                // 현재 디렉토리(.)와 상위 디렉토리(..) 제외
                if (item.name === '.' || item.name === '..') {
                    continue;
                }

                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                
                if (item.type === 2) { // 디렉토리
                    Logger.log(`하위 디렉토리 발견: ${itemPath}`);
                    directories.push(itemPath);
                    const subItems = await this.listRemoteFiles(itemPath);
                    files.push(...subItems.files);
                    directories.push(...subItems.directories);
                } else if (item.type === 1) { // 파일
                    Logger.log(`파일 발견: ${itemPath}`);
                    files.push(itemPath);
                }
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : String(err);
            Logger.log(`디렉토리 목록 조회 실패 (${currentPath}): ${errorMessage}`);
            throw err;
        }
        
        return { files, directories };
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
            
            // 파일의 상태를 확인하여 디렉토리인지 파일인지 판단
            try {
                const list = await this.client?.list(remotePath);
                if (list && list.length > 0) {
                    // 디렉토리인 경우
                    await this.client?.removeDir(remotePath);
                    Logger.log(`디렉토리 삭제 성공: ${localPath}`);
                }
            } catch {
                // 파일인 경우
                await this.client?.remove(remotePath);
                Logger.log(`파일 삭제 성공: ${localPath}`);
            }
            
            this.updateStatusBar('삭제 완료', '✅');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            
            if (errorMessage.includes('control socket') && retryCount < this.MAX_RETRY_ATTEMPTS) {
                this.updateStatusBar(`삭제 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`, '🔄');
                this.client = null;
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.deleteFile(localPath, retryCount + 1);
            }

            vscode.window.showErrorMessage(`삭제 실패: ${errorMessage}`);
            this.updateStatusBar('삭제 실패', '❌');
            Logger.log(`삭제 실패: ${localPath} - ${errorMessage}`);
        } finally {
            if (this.client && !this.isConnected) {
                await this.client.close();
                this.client = null;
            }
        }
    }

    async deactivate() {
        try {
            this.isEnabled = false;
            this.isConnected = false;
            this.isUploading = false;
            
            // FTP 클라이언트 종료
            if (this.client) {
                await this.client.close();
                this.client = null;
            }

            // 모든 설정 초기화
            const config = vscode.workspace.getConfiguration('ftpMini');
            await config.update('host', undefined, true);
            await config.update('username', undefined, true);
            await config.update('password', undefined, true);
            await config.update('remoteRoot', undefined, true);
            await config.update('syncOnConnect', undefined, true);
            await config.update('syncExclude', undefined, true);

            this.updateStatusBar('비활성화됨', '');
            Logger.log('FTP 연결이 완전히 비활성화되고 모든 설정이 초기화되었습니다.');
            
            // 상태바 초기화
            this.statusBar.text = "FTP Mini";
            this.statusBar.show();
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`설정 초기화 중 오류 발생: ${errorMessage}`);
            vscode.window.showErrorMessage(`설정 초기화 중 오류 발생: ${errorMessage}`);
        }
    }

    // 유효성 검사 함수
    private validateHost(host: string): boolean {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
        
        return ipRegex.test(host) || domainRegex.test(host);
    }

    private validatePort(port: string): boolean {
        const portNum = parseInt(port);
        return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
    }

    private validatePath(path: string): boolean {
        return path.startsWith('/') && !/[<>:"|?*]/.test(path);
    }

    isActive(): boolean {
        return this.isEnabled;
    }

    async createDirectory(remotePath: string): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        try {
            if (!await this.ensureConnection()) {
                throw new Error('FTP 서버 연결에 실패했습니다.');
            }

            const config = vscode.workspace.getConfiguration('ftpMini');
            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;

            await this.client?.cd(remoteRoot);
            
            await this.client?.ensureDir(remotePath);
            
            await this.client?.cd(remoteRoot);
            
            Logger.log(`디렉토리 생성 성공: ${remotePath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`디렉토리 생성 실패: ${remotePath} - ${errorMessage}`);
            vscode.window.showErrorMessage(`디렉토리 생성 실패: ${errorMessage}`);
        }
    }

    async moveFile(oldPath: string, newPath: string, retryCount = 0): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        try {
            if (!await this.ensureConnection()) {
                throw new Error('FTP 서버 연결에 실패했습니다.');
            }

            const oldRemotePath = this.getRemotePath(oldPath);
            const newRemotePath = this.getRemotePath(newPath);
            
            Logger.log(`원격 파일 이동: ${oldRemotePath} -> ${newRemotePath}`);

            const newDir = path.dirname(newRemotePath);
            if (newDir !== '.') {
                try {
                    await this.client?.ensureDir(newDir);
                    Logger.log(`원격 디렉토리 생성 완료: ${newDir}`);
                } catch (error) {
                    Logger.log(`원격 디렉토리 생성 중 오류 (무시됨): ${error}`);
                }
            }

            const config = vscode.workspace.getConfiguration('ftpMini');
            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;
            await this.client?.cd(remoteRoot);
            Logger.log(`루트 디렉토리로 이동: ${remoteRoot}`);

            try {
                await this.client?.rename(oldRemotePath, newRemotePath);
                Logger.log(`파일 이동 성공: ${oldRemotePath} -> ${newRemotePath}`);
                this.updateStatusBar('파일 이동 완료', '✅');
            } catch (error) {
                Logger.log(`rename 실패, 복사 후 삭제 시도: ${error}`);
                
                const tempFilePath = path.join(os.tmpdir(), `ftp-mini-${Date.now()}`);
                
                try {
                    await this.client?.downloadTo(tempFilePath, oldRemotePath);
                    await this.client?.uploadFrom(tempFilePath, newRemotePath);
                    await this.client?.remove(oldRemotePath);
                    await fs.promises.unlink(tempFilePath);
                    
                    Logger.log(`복사 후 삭제 방식으로 이동 완료`);
                } catch (innerError) {
                    Logger.log(`복사 후 삭제 방식 실패: ${innerError}`);
                    throw innerError;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            
            if (errorMessage.includes('control socket') && retryCount < this.MAX_RETRY_ATTEMPTS) {
                this.updateStatusBar(`이동 재시도 중... (${retryCount + 1}/${this.MAX_RETRY_ATTEMPTS})`, '🔄');
                this.client = null;
                await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
                return this.moveFile(oldPath, newPath, retryCount + 1);
            }

            this.updateStatusBar('파일 이동 실패', '❌');
            Logger.log(`파일 이동 실패: ${oldPath} -> ${newPath} - ${errorMessage}`);
            vscode.window.showErrorMessage(`파일 이동 실패: ${errorMessage}`);
        }
    }

    private async syncDirectory(localDirPath: string): Promise<void> {
        try {
            if (!this.isEnabled || !this.client) {
                return;
            }

            Logger.log(`디렉토리 동기화 시작: ${localDirPath}`);
            
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                throw new Error('워크스페이스가 열려있지 않습니다.');
            }

            const remoteDirPath = this.getRemotePath(localDirPath);
            
            await this.ensureRemoteDirectory(remoteDirPath);

            const files = await vscode.workspace.fs.readDirectory(vscode.Uri.file(localDirPath));
            
            for (const [name, type] of files) {
                const localPath = path.join(localDirPath, name);
                
                if (type === vscode.FileType.Directory) {
                    await this.syncDirectory(localPath);
                } else {
                    await this.syncFile(localPath);
                }
            }
            
            Logger.log(`디렉토리 동기화 완료: ${localDirPath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            Logger.log(`디렉토리 동기화 실패: ${localDirPath} - ${errorMessage}`);
            throw error;
        }
    }

    private async syncFile(localPath: string): Promise<void> {
        try {
            const remotePath = this.getRemotePath(localPath);
            
            const localStat = await vscode.workspace.fs.stat(vscode.Uri.file(localPath));
            
            try {
                const remoteSize = await this.getRemoteFileSize(remotePath);
                
                if (localStat.size !== remoteSize) {
                    Logger.log(`파일 크기 불일치. 업로드 시작: ${localPath}`);
                    await this.uploadFile(localPath);
                }
            } catch (error) {
                Logger.log(`새 파일 업로드: ${localPath}`);
                await this.uploadFile(localPath);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            Logger.log(`파일 동기화 실패: ${localPath} - ${errorMessage}`);
            throw error;
        }
    }

    private async getRemoteFileSize(remotePath: string): Promise<number> {
        try {
            const list = await this.client?.list(remotePath);
            if (!list || list.length === 0) {
                throw new Error('파일을 찾을 수 없습니다.');
            }
            return list[0].size;
        } catch (error) {
            throw error;
        }
    }

    private async ensureRemoteDirectory(remotePath: string): Promise<void> {
        try {
            const config = vscode.workspace.getConfiguration('ftpMini');
            const remoteRoot = config.get('remoteRoot', this.DEFAULT_REMOTE_ROOT) as string;
            
            await this.client?.cd(remoteRoot);
            
            await this.client?.ensureDir(remotePath);
            
            await this.client?.cd(remoteRoot);
            
            Logger.log(`원격 디렉토리 생성/확인 완료: ${remotePath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
            Logger.log(`원격 디렉토리 생성 실패: ${remotePath} - ${errorMessage}`);
            throw error;
        }
    }
}