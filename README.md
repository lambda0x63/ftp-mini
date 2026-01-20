# ftp-mini

### Visual Studio Code Marketplace
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/lambda0x63.ftp-mini?logo=visual-studio-code&label=Version)](https://marketplace.visualstudio.com/items?itemName=lambda0x63.ftp-mini)
[![VS Code Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/lambda0x63.ftp-mini?logo=visual-studio-code&label=Installs)](https://marketplace.visualstudio.com/items?itemName=lambda0x63.ftp-mini)

### Open VSX Registry
[![Open VSX Version](https://img.shields.io/open-vsx/v/lambda0x63/ftp-mini?logo=open-vsx&label=Version)](https://open-vsx.org/extension/lambda0x63/ftp-mini)
[![Open VSX Downloads](https://img.shields.io/open-vsx/dt/lambda0x63/ftp-mini?logo=open-vsx&label=Downloads)](https://open-vsx.org/extension/lambda0x63/ftp-mini)

## 시스템 개요

### 핵심 기능
**자동 동기화 (Auto Sync)**
- 파일 저장 시 즉시 원격 서버 업로드
- 파일/폴더 생성 삭제 이동 실시간 반영
- `onDidSaveTextDocument` 등 VS Code 워크스페이스 이벤트 훅 기반 동작

**세션 기반 관리**
- VS Code 재시작 시 보안을 위해 설정 자동 초기화
- 전역 상태 관리 (`global.ftpManager`) 통한 연결 유지
- 상태바(Status Bar) 통합 제어 메뉴 제공

### 주요 명령
**연결 설정 (Configure)**
- `ftp-mini.configure` 명령으로 초기 설정 진입
- 호스트 사용자 비밀번호 루트 경로 대화형 입력

**메뉴 및 로그**
- `ftp-mini.showMenu` 연결 재설정 로그 확인 등 통합 메뉴
- `ftp-mini.showLogs` 연결 상태 및 전송 내역 출력

## 설정 옵션 (Configuration)

### 기본 설정
VS Code `settings.json` 내 `ftpMini` 네임스페이스 사용
- **ftpMini.host** FTP 서버 주소 (문자열)
- **ftpMini.username** 사용자 계정 (문자열)
- **ftpMini.password** 접속 비밀번호 (문자열)
- **ftpMini.remoteRoot** 원격 작업 디렉토리 (기본값 `/html`)

### 동기화 옵션
- **ftpMini.syncOnConnect** 연결 시 전체 동기화 여부 (Boolean)
- **ftpMini.syncExclude** 동기화 제외 패턴 배열
  - 기본값 `.git` `node_modules` 등

## 기술 스택 (Tech Stack)

### Core Integration
- **VS Code API** 1.80.0+
- **TypeScript** 5.1
- **Node.js** Runtime

### FTP Engine
- **basic-ftp** 5.0.5 (Promise 기반 FTP 클라이언트)
- **SSL/TLS** 보안 연결 지원

### Build & Bundle
- **esbuild** 고성능 번들링 및 압축
- **ESLint** 코드 품질 관리

## 설치 및 실행 (Installation)

### 마켓플레이스 설치
**Visual Studio Code Marketplace** 또는 **OpenVSX Registry** 공식 배포
- 확장 프로그램 마켓플레이스에서 **FTP Mini** 검색 및 설치
- `lambda0x63.ftp-mini` 식별자 확인

### 개발 환경 설정 (Development)
```bash
# 의존성 설치
npm install

# 확장 패키징
npm run package

# 개발 모드 실행 (Watch)
npm run watch
```

### 디버깅
1. VS Code에서 프로젝트 열기
2. `F5` 키로 **Extension Development Host** 실행
3. 명령 팔레트(`Ctrl+Shift+P`)에서 `FTP Mini: 연결 설정` 실행
