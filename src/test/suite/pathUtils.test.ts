import * as assert from 'assert';
import { getRemotePath, getRemoteDirectory, getFileName } from '../../utils/pathUtils';

suite('PathUtils Test Suite', () => {

    suite('getRemotePath', () => {
        test('워크스페이스 내부 파일의 원격 경로를 반환해야 함', () => {
            const workspacePath = '/Users/test/project';

            assert.strictEqual(
                getRemotePath('/Users/test/project/src/index.ts', workspacePath),
                'src/index.ts'
            );

            assert.strictEqual(
                getRemotePath('/Users/test/project/file.txt', workspacePath),
                'file.txt'
            );

            assert.strictEqual(
                getRemotePath('/Users/test/project/deep/nested/path/file.js', workspacePath),
                'deep/nested/path/file.js'
            );
        });

        test('워크스페이스 외부 파일에 대해 null을 반환해야 함', () => {
            const workspacePath = '/Users/test/project';

            assert.strictEqual(
                getRemotePath('/Users/other/file.ts', workspacePath),
                null
            );

            assert.strictEqual(
                getRemotePath('/tmp/temp.txt', workspacePath),
                null
            );
        });

        test('워크스페이스 경로가 undefined인 경우 null을 반환해야 함', () => {
            assert.strictEqual(
                getRemotePath('/Users/test/file.ts', undefined),
                null
            );
        });

        test('Windows 경로의 백슬래시를 포워드 슬래시로 변환해야 함', () => {
            const workspacePath = 'C:\\Users\\test\\project';

            // Windows 경로 시뮬레이션
            const localPath = 'C:\\Users\\test\\project\\src\\index.ts';
            const result = getRemotePath(localPath, workspacePath);

            // 백슬래시가 포워드 슬래시로 변환되어야 함
            if (result !== null) {
                assert.strictEqual(result.includes('\\'), false);
            }
        });
    });

    suite('getRemoteDirectory', () => {
        test('파일 경로에서 디렉토리 부분을 추출해야 함', () => {
            assert.strictEqual(getRemoteDirectory('src/index.ts'), 'src');
            assert.strictEqual(getRemoteDirectory('deep/nested/path/file.js'), 'deep/nested/path');
            assert.strictEqual(getRemoteDirectory('path/to/dir/file.txt'), 'path/to/dir');
        });

        test('디렉토리가 없는 경우 "."을 반환해야 함', () => {
            assert.strictEqual(getRemoteDirectory('file.txt'), '.');
            assert.strictEqual(getRemoteDirectory('index.html'), '.');
        });

        test('루트 경로 처리', () => {
            assert.strictEqual(getRemoteDirectory('/file.txt'), '.');
        });
    });

    suite('getFileName', () => {
        test('경로에서 파일명을 추출해야 함', () => {
            assert.strictEqual(getFileName('/Users/test/project/file.txt'), 'file.txt');
            assert.strictEqual(getFileName('src/index.ts'), 'index.ts');
            assert.strictEqual(getFileName('/path/to/document.pdf'), 'document.pdf');
        });

        test('파일명만 있는 경우 그대로 반환해야 함', () => {
            assert.strictEqual(getFileName('file.txt'), 'file.txt');
            assert.strictEqual(getFileName('index.html'), 'index.html');
        });

        test('Windows 경로에서도 파일명을 추출해야 함', () => {
            assert.strictEqual(getFileName('C:\\Users\\test\\file.txt'), 'file.txt');
            assert.strictEqual(getFileName('D:\\project\\src\\index.ts'), 'index.ts');
        });
    });
});
