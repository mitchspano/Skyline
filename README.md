# Skyline DevOps

Skyline DevOps is a comprehensive Salesforce DevOps toolkit that combines a VS Code extension with CLI tools to streamline Salesforce development workflows.

## Project Structure

The project is organized into multiple components:

### VS Code Extension (`/extension`)

A Visual Studio Code extension that provides:

- Intuitive UI for managing Salesforce metadata
- Repository configuration management
- Pipeline visualization and management
- Environment configuration tools

### CLI Tools (Coming Soon)

Future components will include:

- Command-line tools for automation
- CI/CD pipeline integration scripts
- Environment management utilities
- Deployment automation tools

## Development Setup

### Prerequisites

- Node.js (v20 or later)
- Visual Studio Code or Cursor
- Git

### Local Development

1. Clean and install dependencies:

```bash
[ -d "extension/dist" ] && rm -rf extension/dist
[ -d "extension/node_modules" ] && rm -rf extension/node_modules
npm --prefix extension install
```

2. Start the extension in development mode:

```bash
# Terminal 1: Start the extension watcher
npm --prefix extension run watch

# Terminal 2: Launch VS Code/Cursor with the extension
cursor --inspect-extensions --extensionDevelopmentPath=$(pwd)/extension
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
