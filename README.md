# FTP Mini

VSCode를 위한 간단한 FTP 배포 확장 프로그램. 웹 개발 실습 환경에 최적화.

## 주요 기능

- FTP 서버 자동 연결 및 파일 배포
- 파일 저장 시 자동 업로드
- 파일 삭제 시 서버 동기화
- 업로드 실패 시 자동 재시도 (최대 3회)
- 상태바를 통한 작업 상태 확인
- 원격 서버와 로컬 파일 동기화 옵션

## 설치 방법

1. VSCode 실행
2. Extensions 탭 열기 (Ctrl+Shift+X or Cmd+Shift+X)
3. "ftp-mini" 검색
4. Install 클릭

## 사용 방법

### 초기 설정

1. Command Palette 열기 (Ctrl+Shift+P or Cmd+Shift+P)
2. "FTP Mini: Configure Settings" 선택
3. 필요 정보 입력:
   - FTP 호스트 주소
   - FTP 아이디
   - FTP 비밀번호
   - 원격 작업 디렉토리 (기본값: /html)

### 파일 업로드

- 파일 저장 시 자동 업로드
- 상태바에서 업로드 상태 확인 가능

### 설정 초기화

1. Command Palette 열기
2. "FTP Mini: Reset Configuration" 선택
3. 새로운 설정 정보 입력

## 주의사항

- 기본 원격 디렉토리는 '/html'로 설정
- 안전한 연결을 위해 FTP 자격 증명 정보는 로컬에 안전하게 저장
- 네트워크 오류 발생 시 최대 3회 자동 재시도

## 버전 정보

### 0.1.0
- 최초 릴리즈
- 기본 FTP 기능 구현
- 자동 업로드/삭제 기능
- 재시도 메커니즘 추가