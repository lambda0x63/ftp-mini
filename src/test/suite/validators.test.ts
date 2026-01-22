import * as assert from 'assert';
import { validateHost, validatePath, validatePort } from '../../utils/validators';

suite('Validators Test Suite', () => {

    suite('validateHost', () => {
        test('유효한 IPv4 주소를 허용해야 함', () => {
            assert.strictEqual(validateHost('192.168.1.1'), true);
            assert.strictEqual(validateHost('10.0.0.1'), true);
            assert.strictEqual(validateHost('255.255.255.255'), true);
            assert.strictEqual(validateHost('0.0.0.0'), true);
            assert.strictEqual(validateHost('127.0.0.1'), true);
        });

        test('유효한 도메인을 허용해야 함', () => {
            assert.strictEqual(validateHost('ftp.example.com'), true);
            assert.strictEqual(validateHost('server.myschool.edu'), true);
            assert.strictEqual(validateHost('a.b.c.example.co.kr'), true);
            assert.strictEqual(validateHost('example.com'), true);
            assert.strictEqual(validateHost('sub-domain.example.org'), true);
        });

        test('잘못된 호스트를 거부해야 함', () => {
            assert.strictEqual(validateHost(''), false);
            assert.strictEqual(validateHost('   '), false);
            assert.strictEqual(validateHost('ftp server'), false);
            assert.strictEqual(validateHost('256.256.256.256'), false);
            assert.strictEqual(validateHost('ftp://example.com'), false);
            assert.strictEqual(validateHost('-invalid.com'), false);
            assert.strictEqual(validateHost('invalid-.com'), false);
            assert.strictEqual(validateHost('example'), false);
        });
    });

    suite('validatePath', () => {
        test('유효한 경로를 허용해야 함', () => {
            assert.strictEqual(validatePath('/html'), true);
            assert.strictEqual(validatePath('/home/user/public_html'), true);
            assert.strictEqual(validatePath('/var/www/html'), true);
            assert.strictEqual(validatePath('/'), true);
            assert.strictEqual(validatePath('/path/to/dir'), true);
        });

        test('/로 시작하지 않는 경로를 거부해야 함', () => {
            assert.strictEqual(validatePath('html'), false);
            assert.strictEqual(validatePath('home/user'), false);
            assert.strictEqual(validatePath('./relative'), false);
        });

        test('특수문자가 포함된 경로를 거부해야 함', () => {
            assert.strictEqual(validatePath('/path<invalid>'), false);
            assert.strictEqual(validatePath('/path:invalid'), false);
            assert.strictEqual(validatePath('/path|invalid'), false);
            assert.strictEqual(validatePath('/path"invalid'), false);
            assert.strictEqual(validatePath('/path?invalid'), false);
            assert.strictEqual(validatePath('/path*invalid'), false);
        });

        test('빈 경로를 거부해야 함', () => {
            assert.strictEqual(validatePath(''), false);
            assert.strictEqual(validatePath('   '), false);
        });
    });

    suite('validatePort', () => {
        test('유효한 포트 번호를 허용해야 함', () => {
            assert.strictEqual(validatePort(21), true);
            assert.strictEqual(validatePort(22), true);
            assert.strictEqual(validatePort(80), true);
            assert.strictEqual(validatePort(443), true);
            assert.strictEqual(validatePort(1), true);
            assert.strictEqual(validatePort(65535), true);
        });

        test('잘못된 포트 번호를 거부해야 함', () => {
            assert.strictEqual(validatePort(0), false);
            assert.strictEqual(validatePort(-1), false);
            assert.strictEqual(validatePort(65536), false);
            assert.strictEqual(validatePort(100000), false);
            assert.strictEqual(validatePort(1.5), false);
        });
    });
});
