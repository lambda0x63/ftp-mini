/**
 * FTP Mini - SFTP 클라이언트
 * ssh2-sftp-client 라이브러리 래퍼
 */

import SftpClient, { FileInfo as SftpFileInfo } from 'ssh2-sftp-client';
import { IProtocolClient, ConnectionConfig, FileInfo } from './index';
import { Logger } from '../logger';

export class SFTPClient implements IProtocolClient {
    private client: SftpClient | null = null;
    private connected: boolean = false;
    private currentConfig: ConnectionConfig | null = null;
    private currentDirectory: string = '/';

    async connect(config: ConnectionConfig): Promise<void> {
        // 기존 연결이 있으면 먼저 해제
        if (this.client) {
            await this.client.end();
            this.client = null;
        }

        this.client = new SftpClient();
        this.currentConfig = config;

        try {
            const port = config.port || 22;

            Logger.log(`SFTP 서버에 연결 시도 중... (${config.host}:${port})`);

            await this.client.connect({
                host: config.host,
                port: port,
                username: config.username,
                password: config.password
            });

            // 원격 루트 디렉토리로 이동
            if (config.remoteRoot) {
                this.currentDirectory = config.remoteRoot;
            }

            this.connected = true;
            Logger.log(`SFTP 서버에 성공적으로 연결되었습니다. (작업 디렉토리: ${config.remoteRoot})`);
        } catch (error) {
            this.connected = false;
            if (this.client) {
                await this.client.end().catch(() => {});
                this.client = null;
            }
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.end().catch(() => {});
            this.client = null;
        }
        this.connected = false;
        this.currentConfig = null;
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    private getFullPath(remotePath: string): string {
        if (remotePath.startsWith('/')) {
            return remotePath;
        }

        const root = this.currentConfig?.remoteRoot || '/';
        return `${root}/${remotePath}`.replace(/\/+/g, '/');
    }

    async upload(localPath: string, remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath);
        await this.client.put(localPath, fullPath);
    }

    async download(remotePath: string, localPath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath);
        await this.client.get(fullPath, localPath);
    }

    async delete(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath);
        await this.client.delete(fullPath);
    }

    async deleteEmptyDirectory(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath);
        await this.client.rmdir(fullPath, false);
    }

    async deleteDirectory(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath);
        await this.client.rmdir(fullPath, true);
    }

    async list(remotePath: string = ''): Promise<FileInfo[]> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath || '.');
        const items = await this.client.list(fullPath);

        return items
            .filter((item: SftpFileInfo) => item.name !== '.' && item.name !== '..')
            .map((item: SftpFileInfo) => ({
                name: item.name,
                type: item.type === 'd' ? 'directory' as const : 'file' as const,
                size: item.size,
                modifiedAt: new Date(item.modifyTime)
            }));
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullOldPath = this.getFullPath(oldPath);
        const fullNewPath = this.getFullPath(newPath);
        await this.client.rename(fullOldPath, fullNewPath);
    }

    async mkdir(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        const fullPath = this.getFullPath(remotePath);
        await this.client.mkdir(fullPath, true);
    }

    async pwd(): Promise<string> {
        return this.currentDirectory;
    }

    async cd(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP 클라이언트가 연결되지 않았습니다.');
        }

        // SFTP는 cd 개념이 없으므로 디렉토리 존재 여부만 확인
        const fullPath = remotePath.startsWith('/') ? remotePath : this.getFullPath(remotePath);

        const exists = await this.client.exists(fullPath);
        if (!exists) {
            throw new Error(`디렉토리가 존재하지 않습니다: ${fullPath}`);
        }

        this.currentDirectory = fullPath;
    }

    /**
     * 연결 상태 확인
     */
    async checkConnection(): Promise<boolean> {
        if (!this.client) {
            return false;
        }

        try {
            await this.client.list('/');
            return true;
        } catch {
            this.connected = false;
            return false;
        }
    }
}
