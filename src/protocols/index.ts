/**
 * FTP Mini - 프로토콜 추상화
 * FTP, FTPS, SFTP 클라이언트의 공통 인터페이스
 */

/**
 * 연결 설정 인터페이스
 */
export interface ConnectionConfig {
    host: string;
    port?: number;
    username: string;
    password: string;
    protocol: 'ftp' | 'ftps' | 'sftp';
    remoteRoot: string;
}

/**
 * 파일/디렉토리 정보 인터페이스
 */
export interface FileInfo {
    name: string;
    type: 'file' | 'directory';
    size: number;
    modifiedAt?: Date;
}

/**
 * 프로토콜 클라이언트 인터페이스
 * 모든 프로토콜 클라이언트가 구현해야 하는 메서드 정의
 */
export interface IProtocolClient {
    /** 서버에 연결 */
    connect(config: ConnectionConfig): Promise<void>;

    /** 연결 해제 */
    disconnect(): Promise<void>;

    /** 연결 상태 확인 */
    isConnected(): boolean;

    /** 파일 업로드 */
    upload(localPath: string, remotePath: string): Promise<void>;

    /** 파일 다운로드 */
    download(remotePath: string, localPath: string): Promise<void>;

    /** 파일 삭제 */
    delete(remotePath: string): Promise<void>;

    /** 디렉토리 삭제 (비어있는 경우) */
    deleteEmptyDirectory(remotePath: string): Promise<void>;

    /** 디렉토리 삭제 (재귀적) */
    deleteDirectory(remotePath: string): Promise<void>;

    /** 디렉토리 목록 조회 */
    list(remotePath?: string): Promise<FileInfo[]>;

    /** 파일/디렉토리 이름 변경 또는 이동 */
    rename(oldPath: string, newPath: string): Promise<void>;

    /** 디렉토리 생성 (재귀적) */
    mkdir(remotePath: string): Promise<void>;

    /** 현재 작업 디렉토리 조회 */
    pwd(): Promise<string>;

    /** 작업 디렉토리 변경 */
    cd(remotePath: string): Promise<void>;
}

export { FTPClient } from './ftpClient';
export { SFTPClient } from './sftpClient';

/**
 * 프로토콜에 따른 클라이언트 팩토리
 * @param protocol 프로토콜 타입
 * @returns 해당 프로토콜의 클라이언트 인스턴스
 */
export function createClient(protocol: 'ftp' | 'ftps' | 'sftp'): IProtocolClient {
    if (protocol === 'sftp') {
        const { SFTPClient } = require('./sftpClient');
        return new SFTPClient();
    } else {
        const { FTPClient } = require('./ftpClient');
        return new FTPClient();
    }
}
