# Open VSX 배포 가이드

FTP Mini를 Open VSX에 배포하는 방법입니다.

## 준비사항

1. Open VSX 계정 생성 (https://open-vsx.org/)
2. 개인 액세스 토큰 생성
   - Open VSX에 로그인
   - 프로필 → Settings → Access Tokens
   - "Generate New Token" 클릭
   - 토큰 안전하게 보관

## 배포 단계

### 1. ovsx CLI 설치
```bash
npm install -g ovsx
```

### 2. 토큰 설정
```bash
ovsx create-namespace lambda0x63 -p <YOUR_TOKEN>
```

### 3. 익스텐션 배포
```bash
ovsx publish ftp-mini-0.3.5.vsix -p <YOUR_TOKEN>
```

또는 소스에서 직접 배포:
```bash
ovsx publish -p <YOUR_TOKEN>
```

### 4. 메타데이터 업데이트 (선택사항)
```bash
ovsx publish --packagePath ftp-mini-0.3.5.vsix \
  --description "Simple FTP deployment for web development" \
  --keywords "ftp,deploy,upload,sync" \
  -p <YOUR_TOKEN>
```

## 확인사항

- package.json의 모든 필수 필드가 채워져 있는지 확인
  - name ✓
  - displayName ✓
  - description ✓
  - version ✓
  - publisher ✓
  - license ✓
  - repository ✓
  - icon ✓

## 배포 후 확인

https://open-vsx.org/extension/lambda0x63/ftp-mini 에서 확인 가능합니다.

## 업데이트 배포

버전을 package.json에서 업데이트 후:
1. `npm run package`
2. `ovsx publish -p <YOUR_TOKEN>`