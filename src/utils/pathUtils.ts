/**
 * FTP Mini - 경로 유틸리티
 * 로컬/원격 경로 변환 함수
 */

/**
 * 로컬 파일 경로를 원격 FTP 경로로 변환
 * @param localPath 로컬 파일의 절대 경로
 * @param workspacePath 워크스페이스 루트 경로
 * @returns 원격 경로 (워크스페이스 기준 상대 경로) 또는 null (워크스페이스 외부 파일인 경우)
 */
export function getRemotePath(localPath: string, workspacePath: string | undefined): string | null {
    if (!workspacePath) {
        return null;
    }

    // 워크스페이스 외부 파일 체크
    if (!localPath.startsWith(workspacePath)) {
        return null;
    }

    // 워크스페이스 경로 제거 후 슬래시 정규화
    let relativePath = localPath.replace(workspacePath, '');

    // Windows 백슬래시를 포워드 슬래시로 변환
    relativePath = relativePath.replace(/\\/g, '/');

    // 선행 슬래시 제거
    relativePath = relativePath.replace(/^\//, '');

    return relativePath;
}

/**
 * 원격 경로의 디렉토리 부분 추출
 * @param remotePath 원격 파일 경로
 * @returns 디렉토리 경로
 */
export function getRemoteDirectory(remotePath: string): string {
    const lastSlash = remotePath.lastIndexOf('/');
    if (lastSlash === -1) {
        return '.';
    }
    return remotePath.substring(0, lastSlash) || '.';
}

/**
 * 경로에서 파일명 추출
 * @param filePath 파일 경로
 * @returns 파일명
 */
export function getFileName(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    const lastSlash = normalized.lastIndexOf('/');
    return lastSlash === -1 ? normalized : normalized.substring(lastSlash + 1);
}
