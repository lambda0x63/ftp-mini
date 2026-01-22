# FTP Mini

<p align="left">
  <img src="images/icon.png" width="128" alt="FTP Mini Logo">
</p>

웹 개발자를 위한 경량 FTP/FTPS/SFTP 배포 도구입니다. VS Code 워크스페이스 이벤트와 연동되어 실시간 파일 동기화를 지원하며, 별도의 복잡한 설정 없이 즉각적인 배포 환경을 제공합니다.

### Marketplace Links
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/lambda0x63.ftp-mini?logo=visual-studio-code&label=Version)](https://marketplace.visualstudio.com/items?itemName=lambda0x63.ftp-mini)
[![Open VSX Version](https://img.shields.io/open-vsx/v/lambda0x63/ftp-mini?logo=open-vsx&label=Version)](https://open-vsx.org/extension/lambda0x63/ftp-mini)

## 시스템 개요

### 핵심 기능
**다중 프로토콜 지원**
- FTP, FTPS (Explicit TLS), SFTP (SSH File Transfer Protocol) 지원
- `basic-ftp` 및 `ssh2-sftp-client` 기반의 안정적인 전송 엔진

**실시간 자동 동기화**
- 워크스페이스 내 파일 저장, 생성, 삭제, 이동, 이름 변경 이벤트 실시간 감지
- `onDidSaveTextDocument` 및 `onDidCreateFiles` 등 VS Code API 기반 동작

**세션 및 보안 관리**
- 보안 관리를 위해 VS Code 종료 시 세션 정보(비밀번호 등) 휘발성 처리
- 하단 상태바(Status Bar)를 통한 연결 상태 모니터링 및 제어 메뉴 제공

### 주요 명령어
- **FTP Mini: 연결 설정**: 프로토콜 및 서버 정보 설정을 위한 대화형 대시보드 실행
- **FTP Mini: 연결 비활성화**: 현재 활성화된 세션 종료 및 설정 초기화
- **FTP Mini: 로그 확인**: 실시간 전송 내역 및 디버그 메시지 출력

## 설정항목 (Configuration)

### 기본 설정 (`ftpMini.*`)
| 항목 | 타입 | 설명 |
|:---|:---:|:---|
| `protocol` | `string` | 연결 프로토콜 (`ftp`, `ftps`, `sftp`) |
| `host` | `string` | 원격 서버 호스트 주소 |
| `username` | `string` | 접속 계정 ID |
| `password` | `string` | 접속 비밀번호 |
| `remoteRoot` | `string` | 서버측 배포 루트 디렉토리 (기본값: `/html`) |
| `syncOnConnect` | `boolean` | 연결 시 원격지 파일 자동 동기화 여부 |
| `syncExclude` | `array` | 동기화 제외 대상 Glob 패턴 (`.git`, `node_modules` 등) |

## 기술 스택
- **Extension Engine**: VS Code Extension API (1.80.0+)
- **Language**: TypeScript 5.1
- **Bundler**: esbuild (Production Minified)
- **Dependencies**: `basic-ftp`, `ssh2-sftp-client`, `minimatch`

## 개발 및 빌드
```bash
# 의존성 설치
npm install

# 프로덕션 빌드 (Packaging)
npm run package

# 개발 모드 (Watch)
npm run watch
```

## 라이선스
[MIT License](LICENSE)
