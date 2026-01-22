import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        // 확장 프로그램 개발 경로
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');

        // 테스트 스위트 경로
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        // VS Code 테스트 실행
        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath
        });
    } catch (err) {
        console.error('Failed to run tests:', err);
        process.exit(1);
    }
}

main();
