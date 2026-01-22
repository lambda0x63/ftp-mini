/**
 * FTP Mini - FTP/FTPS 클라이언트
 * basic-ftp 라이브러리 래퍼
 */

import * as ftp from 'basic-ftp';
import { IProtocolClient, ConnectionConfig, FileInfo } from './index';
import { Logger } from '../logger';

export class FTPClient implements IProtocolClient {
    private client: ftp.Client | null = null;
    private connected: boolean = false;
    private currentConfig: ConnectionConfig | null = null;

    async connect(config: ConnectionConfig): Promise<void> {
        // 기존 연결이 있으면 먼저 해제
        if (this.client) {
            this.client.close();
            this.client = null;
        }

        this.client = new ftp.Client();
        this.client.ftp.verbose = true;
        this.currentConfig = config;

        try {
            const port = config.port || (config.protocol === 'ftps' ? 21 : 21);
            const secure = config.protocol === 'ftps';

            Logger.log(`FTP 서버에 연결 시도 중... (${config.host}:${port}, secure: ${secure})`);

            await this.client.access({
                host: config.host,
                port: port,
                user: config.username,
                password: config.password,
                secure: secure
            });

            // 원격 루트 디렉토리로 이동
            if (config.remoteRoot) {
                await this.client.cd(config.remoteRoot);
            }

            this.connected = true;
            Logger.log(`FTP 서버에 성공적으로 연결되었습니다. (작업 디렉토리: ${config.remoteRoot})`);
        } catch (error) {
            this.connected = false;
            if (this.client) {
                this.client.close();
                this.client = null;
            }
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.close();
            this.client = null;
        }
        this.connected = false;
        this.currentConfig = null;
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    async upload(localPath: string, remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        // 원격 루트로 이동 후 업로드
        if (this.currentConfig?.remoteRoot) {
            await this.client.cd(this.currentConfig.remoteRoot);
        }

        await this.client.uploadFrom(localPath, remotePath);
    }

    async download(remotePath: string, localPath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        await this.client.downloadTo(localPath, remotePath);
    }

    async delete(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        await this.client.remove(remotePath);
    }

    async deleteEmptyDirectory(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        await this.client.removeEmptyDir(remotePath);
    }

    async deleteDirectory(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        await this.client.removeDir(remotePath);
    }

    async list(remotePath: string = ''): Promise<FileInfo[]> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        const items = await this.client.list(remotePath);

        return items
            .filter(item => item.name !== '.' && item.name !== '..')
            .map(item => ({
                name: item.name,
                type: item.type === 2 ? 'directory' as const : 'file' as const,
                size: item.size,
                modifiedAt: item.modifiedAt
            }));
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        await this.client.rename(oldPath, newPath);
    }

    async mkdir(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        // 원격 루트로 이동 후 디렉토리 생성
        if (this.currentConfig?.remoteRoot) {
            await this.client.cd(this.currentConfig.remoteRoot);
        }

        await this.client.ensureDir(remotePath);

        // 다시 원격 루트로 이동
        if (this.currentConfig?.remoteRoot) {
            await this.client.cd(this.currentConfig.remoteRoot);
        }
    }

    async pwd(): Promise<string> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        return await this.client.pwd();
    }

    async cd(remotePath: string): Promise<void> {
        if (!this.client) {
            throw new Error('FTP 클라이언트가 연결되지 않았습니다.');
        }

        await this.client.cd(remotePath);
    }

    /**
     * 연결 상태 확인 (pwd 명령으로 테스트)
     */
    async checkConnection(): Promise<boolean> {
        if (!this.client) {
            return false;
        }

        try {
            await this.client.pwd();
            return true;
        } catch {
            this.connected = false;
            return false;
        }
    }
}
