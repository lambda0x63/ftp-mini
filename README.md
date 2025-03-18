# FTP Mini

![Image](https://github.com/user-attachments/assets/fe407108-3a8d-411f-aa82-7ea6c39ae2b7)

Simple FTP Extension for VSCode.
## Features
- Automatic FTP server connection and file deployment
- Automatic upload when saving files
- Server synchronization when deleting files
- Support for moving and renaming files/folders
- Automatic synchronization when creating new folders
- Automatic retry on upload failure (up to 3 times)
- Work status check via status bar
- Remote server and local file synchronization options
- Reliable connection management (independent connections per task)
- Option to open browser after uploading web files (.html, .css, .js)
## Installation
1. Launch VSCode
2. Open Extensions tab (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "ftp-mini"
4. Click Install
## Usage
### FTP Connection Setup
1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Select "FTP Mini: Configure Connection"
3. Enter required information:
  - FTP host address (example: example.dothome.co.kr)
  - FTP username
  - FTP password
  - Remote working directory (default: /html)
4. Choose whether to synchronize with remote server after setup
### Auto Upload
- Files are automatically uploaded to the FTP server when saved
- Upload progress status can be checked in the status bar
- Automatic retry up to 3 times on upload failure
- Web files can be immediately checked in browser after upload
### File Operations
- Automatic synchronization when moving and renaming files/folders
- New folders are automatically created on the remote server
- Files are automatically deleted from the remote server when deleted locally
### Quick Menu
Click the FTP Mini icon in the status bar to access the following menu:
- Connect/Reconnect
- Settings
- View Logs
- Disconnect
### Configuration
- If existing settings are present, confirmation to reconfigure when running connection setup
- Setup process can be canceled at any time with ESC key
- Existing settings are retained when canceled
- Synchronization exclusion patterns can be configured (defaults: .git, node_modules)
### Deactivation
- Select "FTP Mini: Deactivate Connection" from Command Palette
- After confirmation, all FTP settings are reset and connection is terminated
- New connection setup is required to use again
## Support
- Bug reports: Report via GitHub Issues
- Feature suggestions: Suggest via GitHub Issues
## Contributing
### Development Environment Setup
1. Fork and clone the repository
~~~bash
git clone https://github.com/root39293/ftp-mini.git
cd ftp-mini
~~~
2. Install dependencies
~~~bash
npm install
~~~
### Local Development
1. Run development server
~~~bash
npm run watch
~~~
2. Debugging in VS Code
- Press F5 to launch extension in a new window
- Code changes are automatically recompiled
### How to Contribute
1. Create a new branch
~~~bash
git checkout -b feature/feature-name
~~~
2. Pull Request
- Create PR with description
## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
