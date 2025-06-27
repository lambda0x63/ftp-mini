// FTP Mini 동시성 테스트 스크립트
// 여러 파일을 동시에 저장하여 동시성 문제를 테스트합니다.

const fs = require('fs');
const path = require('path');

// 테스트 파일 생성 및 동시 수정
async function testConcurrency() {
    console.log('동시성 테스트 시작...\n');
    
    // 1. 여러 파일 동시 생성
    console.log('1. 여러 파일 동시 생성 테스트');
    const testFiles = [];
    for (let i = 1; i <= 5; i++) {
        const fileName = `test-file-${i}.txt`;
        testFiles.push(fileName);
        fs.writeFileSync(fileName, `Initial content for file ${i}`);
    }
    console.log('5개 파일 생성 완료\n');
    
    // 2. 모든 파일을 동시에 수정
    console.log('2. 동시 파일 수정 테스트');
    const updatePromises = testFiles.map((file, index) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                fs.writeFileSync(file, `Updated content ${index} at ${new Date().toISOString()}`);
                console.log(`수정 완료: ${file}`);
                resolve();
            }, Math.random() * 100); // 랜덤 지연으로 동시성 상황 재현
        });
    });
    
    await Promise.all(updatePromises);
    console.log('모든 파일 수정 완료\n');
    
    // 3. 파일 삭제와 생성을 동시에
    console.log('3. 파일 삭제와 생성 동시 실행 테스트');
    
    // vendor 폴더 생성
    if (!fs.existsSync('vendor')) {
        fs.mkdirSync('vendor');
        fs.writeFileSync('vendor/test.txt', 'vendor test file');
    }
    
    // 삭제와 생성을 동시에 실행
    const deletePromise = new Promise((resolve) => {
        setTimeout(() => {
            if (fs.existsSync('vendor')) {
                fs.rmSync('vendor', { recursive: true, force: true });
                console.log('vendor 폴더 삭제 완료');
            }
            resolve();
        }, 50);
    });
    
    const createPromise = new Promise((resolve) => {
        setTimeout(() => {
            fs.writeFileSync('new-file-during-delete.txt', 'Created during delete operation');
            console.log('새 파일 생성 완료');
            resolve();
        }, 60);
    });
    
    await Promise.all([deletePromise, createPromise]);
    console.log('삭제와 생성 동시 실행 완료\n');
    
    // 4. 정리
    console.log('4. 테스트 파일 정리');
    testFiles.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
    if (fs.existsSync('new-file-during-delete.txt')) {
        fs.unlinkSync('new-file-during-delete.txt');
    }
    
    console.log('\n테스트 완료!');
    console.log('FTP Mini 로그를 확인하여 동시성 처리가 올바르게 되었는지 확인하세요.');
}

// 테스트 실행
testConcurrency().catch(console.error);