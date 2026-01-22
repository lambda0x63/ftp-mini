<div align="right">
  <a href="https://marketplace.visualstudio.com/items?itemName=lambda0x63.ftp-mini">VS Marketplace</a> | 
  <a href="https://open-vsx.org/extension/lambda0x63/ftp-mini">Open VSX</a>
</div>

<div align="center">
  <br/>
  <img src="images/icon.png" width="120" height="120" alt="FTP Mini Logo">
  <h1>FTP Mini</h1>
  <p><b>Lightweight & Real-time Deployment Tool for VS Code</b></p>
  <p>간결하면서 강력한 웹 개발용 FTP/FTPS/SFTP 동기화 도구</p>
  <br/>
</div>

<hr/>

## 📑 Overview

**FTP Mini**는 워크스페이스의 변화를 실시간으로 감지하여 원격 서버에 동기화하는 VS Code 전용 확장 프로그램입니다. 복잡한 UI 없이 저장과 동시에 배포되는 쾌적한 개발 경험을 제공합니다.

<br/>

## ✨ Key Features

- **Multi-Protocol Support**: FTP, FTPS(TLS), SFTP(SSH)를 모두 지원하는 통합 엔진 탑재
- **Real-time Synchronization**: 파일 저장, 생성, 이름 변경, 삭제 등 모든 워크스페이스 이벤트를 즉각 반영
- **Session-based Security**: 보안을 위해 비밀번호 등 민감한 정보는 세션 기반으로 관리되며 종료 시 자동 휘발
- **Unified Status Bar**: 하단 상태바를 통해 연결 상태 확인 및 주요 명령 실행 가능

<br/>

## 🚀 Quick Start

1. `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) 실행
2. `FTP Mini: 연결 설정` 선택 후 서버 정보 입력
3. 연결 성공 후 파일 저장 시 자동 업로드 시작

<br/>

## ⚙️ Configuration

`settings.json`에서 아래 옵션들을 상세하게 조정할 수 있습니다.

| Property | Type | Default | Description |
|:---|:---:|:---:|:---|
| `ftpMini.protocol` | `string` | `"ftp"` | 연결 방식 (`ftp`, `ftps`, `sftp`) |
| `ftpMini.host` | `string` | `""` | 서버 호스트 주소 |
| `ftpMini.username` | `string` | `""` | 접속 계정 ID |
| `ftpMini.password` | `string` | `""` | 접속 비밀번호 |
| `ftpMini.remoteRoot` | `string` | `"/html"` | 서버측 배포 루트 경로 |
| `ftpMini.syncOnConnect` | `boolean` | `true` | 연결 시 변경사항 체크 및 동기화 |
| `ftpMini.syncExclude` | `array` | `[".git", "node_modules"]` | 제외할 Glob 패턴 |

<br/>

## 🛠 Tech Stack

- **Engine**: Node.js & VS Code Extension API
- **Protocols**: `basic-ftp`, `ssh2-sftp-client`
- **Compiler**: TypeScript 5.1 & esbuild (Minified build)

<br/>

<hr/>

<div align="center">
  <p>Produced by <b>lambda0x63</b></p>
  <p><a href="LICENSE">MIT License</a></p>
</div>
