import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
    // Mocha 인스턴스 생성
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000
    });

    const testsRoot = path.resolve(__dirname, '.');

    return new Promise((resolve, reject) => {
        glob('**/*.test.js', { cwd: testsRoot })
            .then(files => {
                // 테스트 파일 추가
                files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

                try {
                    // 테스트 실행
                    mocha.run((failures: number) => {
                        if (failures > 0) {
                            reject(new Error(`${failures} tests failed.`));
                        } else {
                            resolve();
                        }
                    });
                } catch (err) {
                    console.error(err);
                    reject(err);
                }
            })
            .catch(reject);
    });
}
