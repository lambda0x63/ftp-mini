/**
 * FTP Mini - 검증 유틸리티
 * 호스트 및 경로 유효성 검사 함수
 */

/**
 * IP 주소 또는 도메인 유효성 검사
 * @param host 검증할 호스트 문자열
 * @returns 유효한 호스트인 경우 true
 */
export function validateHost(host: string): boolean {
    if (!host || host.trim().length === 0) {
        return false;
    }

    // IPv4 주소 정규식
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // 도메인 정규식 (서브도메인 포함)
    const domainRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

    return ipRegex.test(host) || domainRegex.test(host);
}

/**
 * FTP 경로 유효성 검사
 * @param path 검증할 경로 문자열
 * @returns 유효한 경로인 경우 true
 */
export function validatePath(path: string): boolean {
    if (!path || path.trim().length === 0) {
        return false;
    }

    // 경로는 /로 시작해야 함
    if (!path.startsWith('/')) {
        return false;
    }

    // Windows 특수문자 제외
    const invalidChars = /[<>:"|?*]/;
    return !invalidChars.test(path);
}

/**
 * 포트 번호 유효성 검사
 * @param port 검증할 포트 번호
 * @returns 유효한 포트인 경우 true
 */
export function validatePort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}
