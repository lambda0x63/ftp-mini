<p align="center">
  <img src="images/icon.png" alt="FTP Mini Icon" width="128" height="128">
</p>

<h1 align="center">FTP Mini</h1>

<p align="center">
  <strong>Simple, reliable FTP deployment for VS Code</strong>
</p>

<p align="center">
  <a href="https://open-vsx.org/extension/lambda0x63/ftp-mini">
    <img src="https://img.shields.io/open-vsx/v/lambda0x63/ftp-mini?color=blue&label=Open%20VSX&logo=eclipse-ide" alt="Open VSX Version">
  </a>
  <a href="https://github.com/lambda0x63/ftp-mini/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
  </a>
  <a href="https://github.com/lambda0x63/ftp-mini/issues">
    <img src="https://img.shields.io/github/issues/lambda0x63/ftp-mini" alt="Issues">
  </a>
</p>

---

## ✨ Features

- 🚀 **Auto Upload** - Automatically upload files on save
- 🔄 **Smart Sync** - Sync local and remote files with one click
- 📁 **Full File Operations** - Create, delete, move, and rename files/folders
- 🔁 **Auto Retry** - Automatic retry on connection failures (up to 3 attempts)
- 📊 **Status Bar Integration** - Real-time upload status in VS Code status bar
- 🌐 **Browser Preview** - Open uploaded web files directly in browser
- 🎯 **Queue System** - Stable handling of multiple concurrent operations
- 🚫 **Exclude Patterns** - Customize sync exclusions (default: `.git`, `node_modules`)

## 📦 Installation

### From Open VSX Registry

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "FTP Mini"
4. Click Install

### Manual Installation

```bash
# Download the latest release
wget https://github.com/lambda0x63/ftp-mini/releases/latest/download/ftp-mini.vsix

# Install in VS Code
code --install-extension ftp-mini.vsix
```

## 🚀 Quick Start

### 1. Connect to FTP Server

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `FTP Mini: 연결 설정`
3. Enter your FTP credentials:
   - **Host**: Your FTP server address (e.g., `ftp.example.com`)
   - **Username**: Your FTP username
   - **Password**: Your FTP password
   - **Remote Directory**: Remote working directory (default: `/html`)

### 2. Start Working

Once connected, FTP Mini will:
- ✅ Upload files automatically when you save
- ✅ Sync file operations (create, delete, move, rename)
- ✅ Show upload status in the status bar
- ✅ Handle connection issues gracefully

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `FTP Mini: 연결 설정` | Configure and connect to FTP server |
| `FTP Mini: 연결 비활성화` | Disconnect and clear all settings |

## ⚙️ Configuration

FTP Mini stores your settings securely in VS Code. You can also configure:

```json
{
  "ftpMini.syncExclude": [".git", "node_modules", "*.log"],
  "ftpMini.syncOnConnect": true,
  "ftpMini.remoteRoot": "/public_html"
}
```

### Configuration Options

- **`ftpMini.host`**: FTP server address
- **`ftpMini.username`**: FTP username
- **`ftpMini.password`**: FTP password (stored securely)
- **`ftpMini.remoteRoot`**: Remote working directory
- **`ftpMini.syncOnConnect`**: Auto-sync on connection (default: `true`)
- **`ftpMini.syncExclude`**: Patterns to exclude from sync

## 🛡️ Security

- Credentials are stored in VS Code's secure storage
- All FTP connections use the latest security protocols
- Passwords are never logged or exposed

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Bug Reports

Found a bug? Please report it on our [GitHub Issues](https://github.com/lambda0x63/ftp-mini/issues) page.

## 👨‍💻 Author

**lambda0x63**

- GitHub: [@lambda0x63](https://github.com/lambda0x63)

---

<p align="center">
  Made with ❤️ for the VS Code community
</p>