<p align="center">
  <img src="images/icon.png" width="128" height="128" alt="FTP Mini Logo">
</p>

# FTP Mini

웹 개발자를 위한 심플하고 강력한 FTP/FTPS/SFTP 배포 도구입니다. 복잡한 설정 없이 워크스페이스 이벤트와 연동되어 실시간으로 파일을 동기화합니다.

### Marketplace Links
[![VS Code Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/lambda0x63.ftp-mini?logo=visual-studio-code&label=VS%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=lambda0x63.ftp-mini)
[![Open VSX Version](https://img.shields.io/open-vsx/v/lambda0x63/ftp-mini?logo=open-vsx&label=Open%20VSX)](https://open-vsx.org/extension/lambda0x63/ftp-mini)
[![License](https://img.shields.io/github/license/lambda0x63/ftp-mini?color=blue)](LICENSE)

---

## 🚀 주요 기능

### 🌐 멀티 프로토콜 지원
- **FTP**: 표준 파일 전송 프로토콜
- **FTPS**: TLS/SSL 암호화를 통한 보안 FTP 연결
- **SFTP**: SSH 프로토콜 기반의 안전한 전송 (새로운 기능!)

### ⚡ 실시간 자동 동기화 (Auto Sync)
- **저장 시 업로드**: 파일 저장 즉시 원격 서버로 전송
- **파일 시스템 감지**: 파일/폴더의 생성, 삭제, 이동, 이름 변경을 실시간으로 감지하여 반영
- **스마트 필터**: `syncExclude` 설정을 통해 `.git`, `node_modules` 등 불필요한 동기화 방지

### 🔒 보안 및 관리
- **휘발성 세션**: 보안을 위해 VS Code 종료 시 세션 정보를 초기화 (보안 강화)
- **통합 상태바**: 하단 상태바를 통해 연결 상태 확인 및 빠른 설정 메뉴 접근 가능

---

## ⚙️ 설정 가이드

### 초기 설정 (Setup Wizard)
1. `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`)를 눌러 명령 팔레트를 엽니다.
2. `FTP Mini: 연결 설정`을 입력하여 마법사를 시작합니다.
3. 안내에 따라 프로토콜, 호스트, 계정 정보를 입력하세요.

### 상세 설정 (`settings.json`)
VS Code의 `settings.json`에서 아래 옵션들을 세밀하게 조정할 수 있습니다:

| 옵션 | 타입 | 기본값 | 설명 |
|:---|:---:|:---:|:---|
| `ftpMini.protocol` | `string` | `"ftp"` | `ftp`, `ftps`, `sftp` 중 선택 |
| `ftpMini.host` | `string` | `""` | 서버 호스트 주소 |
| `ftpMini.username` | `string` | `""` | 사용자 아이디 |
| `ftpMini.password` | `string` | `""` | 비밀번호 |
| `ftpMini.remoteRoot` | `string` | `"/html"` | 서버측 작업 디렉토리 경로 |
| `ftpMini.syncOnConnect` | `boolean` | `true` | 연결 시 변경사항 자동 확인 및 동기화 |
| `ftpMini.syncExclude` | `array` | `[".git", "node_modules"]` | 동기화에서 제외할 Glob 패턴 |

---

## 🛠 기술 스택

- **Runtime**: Node.js & VS Code Extension API
- **Protocols**: `basic-ftp` (FTP/FTPS), `ssh2-sftp-client` (SFTP)
- **Bundler**: `esbuild` (Fast & Minified)

---

## 📝 라이선스
이 프로젝트는 [MIT License](LICENSE)를 따릅니다.
