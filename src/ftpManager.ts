import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { minimatch } from 'minimatch';
import { Logger } from './logger';
import { IProtocolClient, createClient, ConnectionConfig, FileInfo } from './protocols';
import { validateHost, validatePath } from './utils/validators';
import { getRemotePath, getFileName, getRemoteDirectory } from './utils/pathUtils';

export class FTPManager {
    private client: IProtocolClient | null = null;
    private statusBar: vscode.StatusBarItem;
    private isConnected: boolean = false;
    private isEnabled: boolean = false;
    private currentConfig: ConnectionConfig | null = null;
    private readonly defaultRemoteRoot = '/html';
    private readonly maxRetryAttempts = 3;
    private readonly retryDelay = 1000;
    private uploadQueue: Array<{localPath: string, retryCount: number}> = [];
    private isProcessingQueue = false;
    private queueLock = Promise.resolve();
    private activeOperations = new Set<string>();

    constructor() {
        this.statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBar.text = "FTP Mini";
        this.statusBar.command = 'ftp-mini.configure';
        this.statusBar.show();
    }

    async showSetupWizard(): Promise<boolean | undefined> {
        Logger.log('FTP 설정 마법사 시작');

        // 프로토콜 선택
        const protocolAnswer = await vscode.window.showQuickPick(
            [
                { label: 'FTP', value: 'ftp', description: '일반 FTP (비보안)' },
                { label: 'FTPS', value: 'ftps', description: 'TLS 암호화 (권장)' },
                { label: 'SFTP', value: 'sftp', description: 'SSH 기반 (가장 안전)' }
            ],
            {
                placeHolder: '연결 프로토콜을 선택하세요'
            }
        );

        if (!protocolAnswer) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        const protocol = protocolAnswer.value as 'ftp' | 'ftps' | 'sftp';

        // 호스트 입력
        const host = await vscode.window.showInputBox({
            prompt: `${protocolAnswer.label} 서버 주소를 입력하세요`,
            placeHolder: 'ftp.myschool.com 또는 IP 주소',
            value: await this.getCurrentSetting('host') || '',
            validateInput: (value) => {
                if (!value) {return '서버 주소는 필수입니다';}
                if (!validateHost(value)) {return '올바른 도메인 또는 IP 주소를 입력하세요';}
                return null;
            }
        });

        if (!host) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 사용자 이름 입력
        const username = await vscode.window.showInputBox({
            prompt: '계정의 사용자 이름을 입력하세요',
            placeHolder: 'username',
            value: await this.getCurrentSetting('username') || '',
            validateInput: (value) => {
                if (!value) {return '사용자 이름은 필수입니다';}
                return null;
            }
        });

        if (!username) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 비밀번호 입력
        const password = await vscode.window.showInputBox({
            prompt: '계정의 비밀번호를 입력하세요',
            password: true,
            value: await this.getCurrentSetting('password') || '',
            validateInput: (value) => {
                if (!value) {return '비밀번호는 필수입니다';}
                return null;
            }
        });

        if (!password) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 원격 작업 디렉토리 입력
        const remoteRoot = await vscode.window.showInputBox({
            prompt: '원격 작업 디렉토리를 입력하세요',
            placeHolder: '예: /html',
            value: await this.getCurrentSetting('remoteRoot') || this.defaultRemoteRoot,
            validateInput: (value) => {
                if (!value) {return '작업 디렉토리는 필수입니다';}
                if (!value.startsWith('/')) {return '경로는 /로 시작해야 합니다';}
                if (!validatePath(value)) {return '올바른 경로를 입력하세요';}
                return null;
            }
        });

        if (!remoteRoot) {
            Logger.log('FTP 설정이 취소되었습니다.');
            return;
        }

        // 설정 저장
        const config = vscode.workspace.getConfiguration('ftpMini');
        await config.update('protocol', protocol, true);
        await config.update('host', host, true);
        await config.update('username', username, true);
        await config.update('password', password, true);
        await config.update('remoteRoot', remoteRoot, true);

        Logger.log('FTP 설정이 저장되었습니다:');
        Logger.log(`- 프로토콜: ${protocol.toUpperCase()}`);
        Logger.log(`- 호스트: ${host}`);
        Logger.log(`- 사용자: ${username}`);
        Logger.log(`- 원격 디렉토리: ${remoteRoot}`);

        // 연결 테스트
        const connected = await this.connect();
        if (connected) {
            Logger.log('서버에 성공적으로 연결되었습니다.');

            // syncOnConnect 설정 확인
            const syncOnConnect = config.get('syncOnConnect', true) as boolean;
            if (syncOnConnect) {
                Logger.log('파일 동기화를 시작합니다...');
                await this.initialSync();
            } else {
                Logger.log('syncOnConnect가 비활성화되어 초기 동기화를 건너뜁니다.');
            }

            Logger.show();
            vscode.window.showInformationMessage('연결이 설정되었습니다. 이제 파일을 저장하면 자동으로 업로드됩니다.');
        }

        return connected;
    }

    private async getCurrentSetting(key: string): Promise<string | undefined> {
        const config = vscode.workspace.getConfiguration('ftpMini');
        return config.get(key);
    }

    async connect(): Promise<boolean> {
        try {
            // 기존 연결이 유효한 경우 재사용
            if (this.isConnected && this.client) {
                return true;
            }

            // 기존 클라이언트 정리
            if (this.client) {
                await this.client.disconnect().catch(() => {});
                this.client = null;
            }

            const config = vscode.workspace.getConfiguration('ftpMini');
            const protocol = config.get('protocol', 'ftp') as 'ftp' | 'ftps' | 'sftp';
            const host = config.get('host') as string;
            const username = config.get('username') as string;
            const password = config.get('password') as string;
            const remoteRoot = config.get('remoteRoot', this.defaultRemoteRoot) as string;

            if (!host || !username || !password) {
                Logger.log('설정이 완료되지 않았습니다. 설정을 먼저 진행해주세요.');
                Logger.show();
                throw new Error('설정이 완료되지 않았습니다. 설정을 먼저 진행해주세요.');
            }

            Logger.log(`${protocol.toUpperCase()} 서버에 연결 시도 중... (${host})`);

            // 프로토콜에 맞는 클라이언트 생성
            this.client = createClient(protocol);

            this.currentConfig = {
                host,
                username,
                password,
                protocol,
                remoteRoot
            };

            await this.client.connect(this.currentConfig);

            // 버그 수정: connect 성공 시 isEnabled도 true로 설정
            this.isConnected = true;
            this.isEnabled = true;
            this.updateStatusBar('연결됨', '✅');
            Logger.log(`${protocol.toUpperCase()} 서버에 성공적으로 연결되었습니다. (작업 디렉토리: ${remoteRoot})`);
            return true;
        } catch (error) {
            this.isConnected = false;
            if (this.client) {
                await this.client.disconnect().catch(() => {});
                this.client = null;
            }

            this.updateStatusBar('연결 실패', '❌');
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`연결 실패: ${errorMessage}`);
            Logger.show();
            vscode.window.showErrorMessage(`연결 실패: ${errorMessage}`);
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
                // 버그 수정: 연결 끊김 시 상태 먼저 업데이트
                this.isConnected = false;
                this.client = null;
                return await this.connect();
            }
        } catch (error) {
            return false;
        }
    }

    async uploadFile(localPath: string, retryCount = 0): Promise<void> {
        // 이미 처리 중인 파일이면 무시
        if (this.activeOperations.has(localPath)) {
            Logger.log(`파일이 이미 처리 중입니다: ${localPath}`);
            return;
        }

        // 큐에 추가
        this.uploadQueue.push({localPath, retryCount});

        // 큐 처리를 순차적으로 실행
        this.queueLock = this.queueLock.then(async () => {
            if (!this.isProcessingQueue) {
                await this.processQueue();
            }
        });

        await this.queueLock;
    }

    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.uploadQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        try {
            while (this.uploadQueue.length > 0) {
                const {localPath, retryCount} = this.uploadQueue[0];
                const fileName = getFileName(localPath);

                // 작업 시작을 표시
                this.activeOperations.add(localPath);

                try {
                    if (!this.isEnabled) {
                        this.uploadQueue.shift();
                        continue;
                    }

                    this.updateStatusBar('업로드 중', '🔄');

                    if (!await this.ensureConnection()) {
                        throw new Error('서버 연결에 실패했습니다.');
                    }

                    // 버그 수정: getRemotePath null 체크
                    const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
                    const remotePath = getRemotePath(localPath, workspacePath);

                    if (remotePath === null) {
                        Logger.log(`워크스페이스 외부 파일 무시: ${localPath}`);
                        this.uploadQueue.shift();
                        this.activeOperations.delete(localPath);
                        continue;
                    }

                    // 원격 디렉토리 생성
                    const remoteDir = getRemoteDirectory(remotePath);
                    if (remoteDir !== '.') {
                        await this.client?.mkdir(remoteDir);
                    }

                    // 파일 업로드
                    await this.client?.upload(localPath, remotePath);

                    this.updateStatusBar('연결됨', '✅');
                    Logger.log(`파일 업로드 성공: ${fileName}`);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';

                    // 연결 오류 패턴
                    const isConnectionError = errorMessage.includes('control socket') ||
                                            errorMessage.includes('ECONNRESET') ||
                                            errorMessage.includes('timeout') ||
                                            errorMessage.includes('socket hang up') ||
                                            errorMessage.includes('ENOTCONN');

                    if (isConnectionError && retryCount < this.maxRetryAttempts) {
                        Logger.log(`연결 오류 발생, 재시도 중... (${retryCount + 1}/${this.maxRetryAttempts})`);
                        this.isConnected = false;
                        this.client = null;
                        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                        this.uploadQueue[0].retryCount++;
                        continue;
                    }

                    this.updateStatusBar('연결 실패', '❌');
                    Logger.log(`파일 업로드 실패: ${fileName} - ${errorMessage}`);

                    let userFriendlyMessage = errorMessage;
                    if (errorMessage.includes('User launched a task while another one is still running')) {
                        userFriendlyMessage = '동시에 여러 작업이 실행되었습니다. 잠시 후 다시 시도해주세요.';
                    } else if (isConnectionError) {
                        userFriendlyMessage = '연결이 끊겼습니다. 다시 연결해주세요.';
                    }

                    vscode.window.showErrorMessage(`${fileName} 업로드 실패: ${userFriendlyMessage}`);
                }

                // 처리 완료된 항목 제거
                this.uploadQueue.shift();
                this.activeOperations.delete(localPath);
            }
        } finally {
            this.isProcessingQueue = false;
        }
    }

    public getRemotePath(localPath: string): string | null {
        const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        return getRemotePath(localPath, workspacePath);
    }

    private updateStatusBar(text: string, icon: '✅' | '❌' | '🔄' | '') {
        const config = vscode.workspace.getConfiguration('ftpMini');
        const host = config.get('host') as string;
        const protocol = config.get('protocol', 'ftp') as string;

        if (host) {
            this.statusBar.text = `${protocol.toUpperCase()}: ${host} ${icon} ${text ? `(${text})` : ''}`;
        } else {
            this.statusBar.text = `FTP ${icon} ${text}`;
        }

        this.statusBar.command = 'ftp-mini.showMenu';
        this.statusBar.show();
    }

    dispose() {
        this.statusBar.dispose();
        if (this.client) {
            this.client.disconnect().catch(() => {});
            this.client = null;
        }
    }

    async initialSync() {
        try {
            Logger.log('원격 서버와 동기화를 시작합니다...');
            Logger.show();

            if (!this.client) {
                throw new Error('클라이언트가 초기화되지 않았습니다.');
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

                    // glob 패턴 매칭으로 변경
                    if (excludePatterns.some(pattern => minimatch(dir, pattern, { dot: true }))) {
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

                    // glob 패턴 매칭으로 변경
                    if (excludePatterns.some(pattern => minimatch(file, pattern, { dot: true }))) {
                        Logger.log(`제외된 파일: ${file}`);
                        continue;
                    }

                    try {
                        const localPath = vscode.Uri.joinPath(workspaceFolder.uri, file).fsPath;
                        Logger.log(`파일 다운로드 시작: ${file} -> ${localPath}`);
                        await this.client?.download(file, localPath);
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
                throw new Error('클라이언트가 초기화되지 않았습니다.');
            }

            Logger.log(`디렉토리 목록 조회 중: ${currentPath || '/'}`);
            const list = await this.client.list(currentPath);
            Logger.log(`${list.length}개의 항목이 발견되었습니다.`);

            for (const item of list) {
                const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;

                if (item.type === 'directory') {
                    Logger.log(`하위 디렉토리 발견: ${itemPath}`);
                    directories.push(itemPath);
                    const subItems = await this.listRemoteFiles(itemPath);
                    files.push(...subItems.files);
                    directories.push(...subItems.directories);
                } else {
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
                throw new Error('서버 연결에 실패했습니다.');
            }

            // 버그 수정: getRemotePath null 체크
            const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            const remotePath = getRemotePath(localPath, workspacePath);

            if (remotePath === null) {
                Logger.log(`워크스페이스 외부 파일 무시: ${localPath}`);
                return;
            }

            // 버그 수정: 디렉토리/파일 판단 및 빈 디렉토리 삭제 처리
            try {
                const list = await this.client?.list(remotePath);
                if (list !== undefined) {
                    // 디렉토리인 경우
                    if (list.length > 0) {
                        await this.client?.deleteDirectory(remotePath);
                    } else {
                        await this.client?.deleteEmptyDirectory(remotePath);
                    }
                    Logger.log(`디렉토리 삭제 성공: ${localPath}`);
                }
            } catch {
                // 파일인 경우
                await this.client?.delete(remotePath);
                Logger.log(`파일 삭제 성공: ${localPath}`);
            }

            this.updateStatusBar('삭제 완료', '✅');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';

            if (errorMessage.includes('control socket') && retryCount < this.maxRetryAttempts) {
                this.updateStatusBar(`삭제 재시도 중... (${retryCount + 1}/${this.maxRetryAttempts})`, '🔄');
                this.isConnected = false;
                this.client = null;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                return this.deleteFile(localPath, retryCount + 1);
            }

            vscode.window.showErrorMessage(`삭제 실패: ${errorMessage}`);
            this.updateStatusBar('삭제 실패', '❌');
            Logger.log(`삭제 실패: ${localPath} - ${errorMessage}`);
        }
        // 버그 수정: 불필요한 finally 블록 제거됨
    }

    async deactivate() {
        try {
            this.isEnabled = false;
            this.isConnected = false;

            // 클라이언트 종료
            if (this.client) {
                await this.client.disconnect().catch(() => {});
                this.client = null;
            }

            // 모든 설정 초기화
            const config = vscode.workspace.getConfiguration('ftpMini');
            await config.update('protocol', undefined, true);
            await config.update('host', undefined, true);
            await config.update('username', undefined, true);
            await config.update('password', undefined, true);
            await config.update('remoteRoot', undefined, true);
            await config.update('syncOnConnect', undefined, true);
            await config.update('syncExclude', undefined, true);

            this.updateStatusBar('비활성화됨', '');
            Logger.log('연결이 완전히 비활성화되고 모든 설정이 초기화되었습니다.');

            // 상태바 초기화
            this.statusBar.text = "FTP Mini";
            this.statusBar.show();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`설정 초기화 중 오류 발생: ${errorMessage}`);
            vscode.window.showErrorMessage(`설정 초기화 중 오류 발생: ${errorMessage}`);
        }
    }

    isActive(): boolean {
        return this.isEnabled;
    }

    async createDirectory(remotePath: string): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        // 중복 작업 방지
        const operationKey = `mkdir:${remotePath}`;
        if (this.activeOperations.has(operationKey)) {
            Logger.log(`디렉토리 생성이 이미 처리 중입니다: ${remotePath}`);
            return;
        }

        this.activeOperations.add(operationKey);

        try {
            if (!await this.ensureConnection()) {
                throw new Error('서버 연결에 실패했습니다.');
            }

            await this.client?.mkdir(remotePath);

            Logger.log(`디렉토리 생성 성공: ${remotePath}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`디렉토리 생성 실패: ${remotePath} - ${errorMessage}`);
            vscode.window.showErrorMessage(`디렉토리 생성 실패: ${errorMessage}`);
        } finally {
            this.activeOperations.delete(operationKey);
        }
    }

    async moveFile(oldPath: string, newPath: string, retryCount = 0): Promise<void> {
        if (!this.isEnabled) {
            return;
        }

        try {
            if (!await this.ensureConnection()) {
                throw new Error('서버 연결에 실패했습니다.');
            }

            // 버그 수정: getRemotePath null 체크
            const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            const oldRemotePath = getRemotePath(oldPath, workspacePath);
            const newRemotePath = getRemotePath(newPath, workspacePath);

            if (oldRemotePath === null || newRemotePath === null) {
                Logger.log(`워크스페이스 외부 파일 무시: ${oldPath} -> ${newPath}`);
                return;
            }

            Logger.log(`원격 파일 이동: ${oldRemotePath} -> ${newRemotePath}`);

            const newDir = getRemoteDirectory(newRemotePath);
            if (newDir !== '.') {
                try {
                    await this.client?.mkdir(newDir);
                    Logger.log(`원격 디렉토리 생성 완료: ${newDir}`);
                } catch (error) {
                    Logger.log(`원격 디렉토리 생성 중 오류 (무시됨): ${error}`);
                }
            }

            try {
                await this.client?.rename(oldRemotePath, newRemotePath);
                Logger.log(`파일 이동 성공: ${oldRemotePath} -> ${newRemotePath}`);
                this.updateStatusBar('파일 이동 완료', '✅');
            } catch (error) {
                Logger.log(`rename 실패, 복사 후 삭제 시도: ${error}`);

                const tempFilePath = path.join(os.tmpdir(), `ftp-mini-${Date.now()}`);

                try {
                    await this.client?.download(oldRemotePath, tempFilePath);
                    await this.client?.upload(tempFilePath, newRemotePath);
                    await this.client?.delete(oldRemotePath);
                    await fs.promises.unlink(tempFilePath);

                    Logger.log(`복사 후 삭제 방식으로 이동 완료`);
                } catch (innerError) {
                    Logger.log(`복사 후 삭제 방식 실패: ${innerError}`);
                    throw innerError;
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';

            if (errorMessage.includes('control socket') && retryCount < this.maxRetryAttempts) {
                this.updateStatusBar(`이동 재시도 중... (${retryCount + 1}/${this.maxRetryAttempts})`, '🔄');
                this.isConnected = false;
                this.client = null;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
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

            const remoteDirPath = getRemotePath(localDirPath, workspaceFolder.uri.fsPath);

            if (remoteDirPath === null) {
                Logger.log(`워크스페이스 외부 디렉토리 무시: ${localDirPath}`);
                return;
            }

            await this.client.mkdir(remoteDirPath);

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
            const workspacePath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            const remotePath = getRemotePath(localPath, workspacePath);

            if (remotePath === null) {
                Logger.log(`워크스페이스 외부 파일 무시: ${localPath}`);
                return;
            }

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
}
