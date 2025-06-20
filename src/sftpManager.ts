import * as vscode from 'vscode';
import { Client, SFTPWrapper, Stats } from 'ssh2';
import { Logger } from './logger';
import * as path from 'path';
import * as fs from 'fs';

interface SFTPDirectoryEntry {
    filename: string;
    longname: string;
    attrs: Stats;
}

export class SFTPManager {
    private client: Client | null = null;
    private sftp: SFTPWrapper | null = null;
    private isConnected: boolean = false;
    private readonly MAX_RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY = 1000;

    async connect(host: string, port: string, username: string, password: string, remoteRoot: string): Promise<boolean> {
        try {
            if (this.isConnected && this.client && this.sftp) {
                return true;
            }

            if (this.client) {
                this.client.end();
                this.client = null;
                this.sftp = null;
            }

            Logger.log(`SFTP 서버에 연결 시도 중... (${host}:${port})`);

            return new Promise((resolve, reject) => {
                this.client = new Client();

                this.client.on('ready', async () => {
                    try {
                        this.client?.sftp((err: Error | null | undefined, sftp: SFTPWrapper) => {
                            if (err) {
                                reject(err);
                                return;
                            }
                            this.sftp = sftp;
                            this.isConnected = true;
                            Logger.log(`SFTP 서버에 성공적으로 연결되었습니다. (작업 디렉토리: ${remoteRoot})`);
                            resolve(true);
                        });
                    } catch (error) {
                        reject(error);
                    }
                });

                this.client.on('error', (err: Error) => {
                    reject(err);
                });

                this.client.connect({
                    host,
                    port: parseInt(port),
                    username,
                    password
                });
            });
        } catch (error) {
            this.isConnected = false;
            if (this.client) {
                this.client.end();
                this.client = null;
                this.sftp = null;
            }
            
            const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
            Logger.log(`SFTP 연결 실패: ${errorMessage}`);
            throw new Error(`SFTP 연결 실패: ${errorMessage}`);
        }
    }

    async uploadFile(localPath: string, remotePath: string): Promise<void> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        Logger.log(`SFTP 업로드 시도: ${localPath} -> ${remotePath}`);
        
        return new Promise((resolve, reject) => {
            this.sftp?.fastPut(localPath, remotePath, (err: Error | null | undefined) => {
                if (err) {
                    const errorMessage = err ? (err as any).message || (err as any).code || err.toString() : '알 수 없는 오류';
                    Logger.log(`SFTP 업로드 실패: ${errorMessage}`);
                    Logger.log(`  로컬 경로: ${localPath}`);
                    Logger.log(`  원격 경로: ${remotePath}`);
                    if ((err as any).code) {
                        Logger.log(`  오류 코드: ${(err as any).code}`);
                    }
                    reject(err);
                    return;
                }
                Logger.log(`SFTP 업로드 성공: ${remotePath}`);
                resolve();
            });
        });
    }

    async downloadFile(remotePath: string, localPath: string): Promise<void> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        return new Promise((resolve, reject) => {
            this.sftp?.fastGet(remotePath, localPath, (err: Error | null | undefined) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    async deleteFile(remotePath: string): Promise<void> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        return new Promise((resolve, reject) => {
            this.sftp?.unlink(remotePath, (err: Error | null | undefined) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    async createDirectory(remotePath: string): Promise<void> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        return new Promise((resolve, reject) => {
            this.sftp?.mkdir(remotePath, (err: Error | null | undefined) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    async listDirectory(remotePath: string): Promise<{ files: string[], directories: string[] }> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        return new Promise((resolve, reject) => {
            this.sftp?.readdir(remotePath, (err: Error | null | undefined, list: SFTPDirectoryEntry[]) => {
                if (err) {
                    reject(err);
                    return;
                }

                const files: string[] = [];
                const directories: string[] = [];

                for (const item of list) {
                    const itemPath = path.posix.join(remotePath, item.filename).replace(/\\/g, '/');
                    if (item.attrs.isDirectory()) {
                        directories.push(itemPath);
                    } else {
                        files.push(itemPath);
                    }
                }

                resolve({ files, directories });
            });
        });
    }

    async moveFile(oldPath: string, newPath: string): Promise<void> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        return new Promise((resolve, reject) => {
            this.sftp?.rename(oldPath, newPath, (err: Error | null | undefined) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }

    async getFileSize(remotePath: string): Promise<number> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        return new Promise((resolve, reject) => {
            this.sftp?.stat(remotePath, (err: Error | null | undefined, stats: Stats) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(stats.size);
            });
        });
    }

    async ensureDirectory(remotePath: string): Promise<void> {
        if (!this.isConnected || !this.sftp) {
            throw new Error('SFTP 연결이 되어있지 않습니다.');
        }

        const parts = remotePath.split('/').filter(Boolean);
        let currentPath = '';

        for (const part of parts) {
            currentPath += '/' + part;
            try {
                await this.createDirectory(currentPath);
                Logger.log(`디렉토리 생성 성공: ${currentPath}`);
            } catch (error: any) {
                // 디렉토리가 이미 존재하는 경우는 무시 (SFTP 오류 코드 4 = File already exists)
                if (error.code !== 4 && !error.message?.includes('already exists')) {
                    Logger.log(`디렉토리 생성 실패: ${currentPath} - ${error.message || error}`);
                    throw error;
                }
            }
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            this.client.end();
            this.client = null;
            this.sftp = null;
            this.isConnected = false;
        }
    }

    isActive(): boolean {
        return this.isConnected;
    }
} 