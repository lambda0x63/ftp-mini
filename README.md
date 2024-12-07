# FTP Mini(WIP)

VSCode를 위한 간단한 FTP Extension.

## Features

- FTP 서버 자동 연결 및 파일 배포
- 파일 저장 시 자동 업로드
- 파일 삭제 시 서버 동기화
- 업로드 실패 시 자동 재시도 (최대 3회)
- 상태바를 통한 작업 상태 확인
- 원격 서버와 로컬 파일 동기화 옵션
- 안정적인 연결 관리 (작업별 독립 연결)

## Installation

1. VSCode 실행
2. Extensions 탭 열기 (Ctrl+Shift+X or Cmd+Shift+X)
3. "ftp-mini" 검색
4. Install 클릭

## Usage

### FTP Connection Setup

1. Command Palette 열기 (Ctrl+Shift+P or Cmd+Shift+P)
2. "FTP Mini: 연결 설정" 선택
3. 필요 정보 입력:
   - FTP 호스트 주소 (예: example.dothome.co.kr)
   - FTP 아이디
   - FTP 비밀번호
   - 원격 작업 디렉토리 (기본값: /html)
4. 설정 완료 후 원격 서버와 동기화 여부 선택

### Auto Upload

- 파일 저장 시 자동으로 FTP 서버에 업로드
- 상태바에서 업로드 진행 상태 확인 가능
- 업로드 실패 시 자동으로 최대 3회 재시도

### Configuration

- 기존 설정이 있는 경우, 연결 설정 실행 시 재설정 여부 확인
- 설정 과정 중 언제든 ESC 키로 취소 가능
- 취소 시 기존 설정 유지

### Deactivation

- Command Palette에서 "FTP Mini: 연결 비활성화" 선택
- 확인 후 모든 FTP 설정이 초기화되고 연결이 종료됨
- 다시 사용하려면 새로 연결 설정을 해야 함

## Support

- 버그 리포트: GitHub Issues를 통해 제보
- 기능 제안: GitHub Issues를 통해 제안

## Contributing

### Development Environment Setup

1. 저장소 포크 및 복제
~~~bash
git clone https://github.com/root39293/ftp-mini.git
cd ftp-mini
~~~

2. 의존성 설치
~~~bash
npm install
~~~

### Local Development

1. 개발 서버 실행
~~~bash
npm run watch
~~~

2. VS Code에서 디버깅
- F5를 눌러 새 창에서 익스텐션 실행
- 코드 수정 시 자동으로 다시 컴파일

### How to Contribute

1. 새로운 브랜치 생성
~~~bash
git checkout -b feature/feature-name
~~~

2. 풀 리퀘스트
- 설명과 함께 PR 생성

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.