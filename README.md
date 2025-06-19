<h1 align="center">
	<img src="https://github.com/user-attachments/assets/fe407108-3a8d-411f-aa82-7ea6c39ae2b7" width="150px"><br>
    FTP Mini
</h1>
<p align="center">
	Simple FTP/SFTP Extension for VSCode.
</p>

<p align="center">
	<a href="https://marketplace.visualstudio.com/items?itemName=faith6.ftp-mini">
		<img src="https://img.shields.io/vscode-marketplace/d/faith6.ftp-mini?label=installs" alt="VSCode Marketplace"/>
	</a>
	<a href="https://marketplace.visualstudio.com/items?itemName=faith6.ftp-mini">
		<img src="https://img.shields.io/vscode-marketplace/v/faith6.ftp-mini" alt="Version"/>
	</a>
</p>

<p align="center">
	<strong><a href="https://marketplace.visualstudio.com/items?itemName=faith6.ftp-mini">📦 Install from VSCode Marketplace</a></strong>
</p>

<h2 align="left">Features</h2>

- Automatic FTP/SFTP server connection and file deployment
- Support for both FTP and SFTP protocols with custom port configuration
- Automatic upload when saving files
- Server synchronization when deleting files
- Support for moving and renaming files/folders
- Automatic synchronization when creating new folders
- Automatic retry on upload failure (up to 3 times)
- Work status check via status bar
- Remote server and local file synchronization options
- Reliable connection management (independent connections per task)
- Option to open browser after uploading web files (.html, .css, .js)
- Improved extension activation and command registration for better reliability

<h2 align="left">Installation</h2>

1. Launch VSCode
2. Open Extensions tab (Ctrl+Shift+X or Cmd+Shift+X)
3. Search for "ftp-mini"
4. Click Install

<h2 align="left">Usage</h2>

<h3 align="left">FTP/SFTP Connection Setup</h3>

1. Open Command Palette (Ctrl+Shift+P or Cmd+Shift+P)
2. Select "FTP Mini: Configure Connection"
3. Choose protocol (FTP or SFTP)
4. Enter required information:
  - FTP/SFTP host address (example: example.dothome.co.kr)
  - Port number (FTP default: 21, SFTP default: 22)
  - Username
  - Password
  - Remote working directory (default: /html)
5. Choose whether to synchronize with remote server after setup

<h3 align="left">Auto Upload</h3>

- Files are automatically uploaded to the FTP/SFTP server when saved
- Upload progress status can be checked in the status bar
- Automatic retry up to 3 times on upload failure
- Web files can be immediately checked in browser after upload

<h3 align="left">File Operations</h3>

- Automatic synchronization when moving and renaming files/folders
- New folders are automatically created on the remote server
- Files are automatically deleted from the remote server when deleted locally

<h3 align="left">Quick Menu</h3>

Click the FTP Mini icon in the status bar to access the following menu:
- Connect/Reconnect
- Settings
- View Logs
- Disconnect

<h3 align="left">Configuration</h3>

- If existing settings are present, confirmation to reconfigure when running connection setup
- Setup process can be canceled at any time with ESC key
- Existing settings are retained when canceled
- Synchronization exclusion patterns can be configured (defaults: .git, node_modules)

<h3 align="left">Deactivation</h3>

- Select "FTP Mini: Deactivate Connection" from Command Palette
- After confirmation, all FTP settings are reset and connection is terminated
- New connection setup is required to use again

<h2 align="left">Support</h2>

- Bug reports: Report via GitHub Issues
- Feature suggestions: Suggest via GitHub Issues

<h2 align="left">Contributing</h2>

<h3 align="left">Development Environment Setup</h3>

1. Fork and clone the repository
~~~bash
git clone https://github.com/lambda0x63/ftp-mini.git
cd ftp-mini
~~~
2. Install dependencies
~~~bash
npm install
~~~

<h3 align="left">Local Development</h3>

1. Run development server
~~~bash
npm run watch
~~~
2. Debugging in VS Code
- Press F5 to launch extension in a new window
- Code changes are automatically recompiled

<h3 align="left">How to Contribute</h3>

1. Create a new branch
~~~bash
git checkout -b feature/feature-name
~~~
2. Pull Request
- Create PR with description

<h2 align="left">License</h2>

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
