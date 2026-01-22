<div align="right">
  <a href="https://marketplace.visualstudio.com/items?itemName=lambda0x63.ftp-mini">VS Marketplace</a> | 
  <a href="https://open-vsx.org/extension/lambda0x63/ftp-mini">Open VSX</a>
</div>

<div align="center">
  <br/>
  <img src="images/icon.png" width="120" height="120" alt="FTP Mini Logo">
  <h1>FTP Mini</h1>
  <p><b>Lightweight & Real-time Deployment Tool for VS Code</b></p>
  <p>웹 개발용 FTP/FTPS/SFTP 동기화 도구</p>
  <br/>
</div>

<hr/>

## Overview

워크스페이스 변경 사항의 실시간 서버 동기화 기능 제공. 별도 UI 조작 없이 저장과 동시에 배포되는 개발 환경 구현.

<br/>

## Key Features

- **Multi-Protocol Support**: FTP, FTPS(TLS), SFTP(SSH) 통합 지원.
- **Real-time Synchronization**: 파일 저장, 생성, 변경, 삭제 등 워크스페이스 이벤트 실시간 감지 및 반영.
- **Session-based Security**: 비밀번호 등 민감 정보의 세션 기반 관리 및 자동 휘발 처리.
- **Unified Status Bar**: 상태바를 통한 연결 상태 모니터링 및 주요 명령 실행 기능.

<br/>

## Quick Start

1. `Ctrl+Shift+P` (macOS: `Cmd+Shift+P`) 실행.
2. `FTP Mini: 연결 설정` 선택 후 서버 정보 입력.
3. 연결 성공 시 자동 업로드 활성화.

<br/>

## Configuration

| Property | Type | Default | Description |
|:---|:---:|:---:|:---|
| `ftpMini.protocol` | `string` | `"ftp"` | 연결 방식 (`ftp`, `ftps`, `sftp`) |
| `ftpMini.host` | `string` | `""` | 서버 호스트 주소 |
| `ftpMini.username` | `string` | `""` | 접속 계정 ID |
| `ftpMini.password` | `string` | `""` | 접속 비밀번호 |
| `ftpMini.remoteRoot` | `string` | `"/html"` | 서버측 배포 루트 경로 |
| `ftpMini.syncOnConnect` | `boolean` | `true` | 연결 시 변경사항 체크 및 동기화 |
| `ftpMini.syncExclude` | `array` | `[".git", "node_modules"]` | 제외 대상 Glob 패턴 |

<br/>

## Tech Stack

- **Engine**: Node.js & VS Code Extension API.
- **Protocols**: `basic-ftp`, `ssh2-sftp-client`.
- **Compiler**: TypeScript 5.1 & esbuild.

<br/>

<hr/>

<div align="center">
  <p>Produced by <b>lambda0x63</b></p>
  <p><a href="LICENSE">MIT License</a></p>
</div>
