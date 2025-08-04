# Skyline DevOps

Skyline DevOps is a comprehensive Salesforce DevOps toolkit that provides a powerful VS Code extension for streamlining Salesforce development workflows. Built with Lightning Web Components (LWC) and integrated with Salesforce CLI, it offers an intuitive interface for managing Salesforce metadata, organizations, and development pipelines.

## Features

### 🏠 **Home Dashboard**

- **Prerequisites Verification**: Automatically checks for Git installation, Salesforce CLI, and Git repository status
- **Environment Validation**: Ensures your development environment is properly configured before proceeding
- **Status Indicators**: Clear visual feedback on system requirements and setup status

### 🏢 **Org Manager**

- **Multi-Org Management**: View and manage all your Salesforce organizations in one place
- **Organization Types**: Supports Dev Hubs, Scratch Orgs, Sandboxes, and Production orgs
- **Scratch Org Creation**: Create new scratch orgs with custom definition files
- **Org Authentication**: Authenticate to new orgs directly from the interface
- **Org Operations**: Open orgs in browser, remove orgs, and manage org connections

### 📁 **Metadata Explorer**

- **Hierarchical Metadata View**: Browse Salesforce metadata in an organized tree structure
- **Advanced Filtering**: Filter by component name, user, and date ranges
- **Metadata Retrieval**: Select and retrieve specific metadata components to your local project
- **Standard Fields Support**: Explore standard and custom fields for SObjects
- **Folder-based Metadata**: Handle folder-based metadata types like Reports and Dashboards
- **Real-time Search**: Fuzzy search capabilities across metadata components

### ⚙️ **Project Configuration**

- **Branch-based Configuration**: Manage different Salesforce environment configurations per Git branch
- **Environment Settings**: Configure test levels, deployment targets, and org connections
- **Ticketing System Integration**: Set up integration with Jira, GitHub Issues, or custom ticketing systems
- **Configuration Templates**: Use predefined templates for common Salesforce project setups
- **Dynamic Branch Management**: Add, remove, and reorder branch configurations

### 🔄 **Pipeline Management**

- **Pull Request Tracking**: Monitor pull requests across different branches
- **GitHub Integration**: Search and display PRs with detailed information
- **Branch-based Organization**: Group PRs by branch with custom labeling
- **PR Details**: View PR titles, descriptions, files changed, and status
- **Pipeline Visualization**: Visual representation of your development pipeline

### 🌐 **REST Explorer**

- **API Testing**: Test Salesforce REST API endpoints directly from the interface
- **Multiple HTTP Methods**: Support for GET, POST, PUT, PATCH, and DELETE requests
- **Authentication Integration**: Uses your authenticated Salesforce org for API calls
- **Response Analysis**: View response status, headers, and body content
- **Request Body Support**: Send JSON payloads with your API requests

### 🕒 **Time Zone Management**

- **Time Zone Conversion**: Convert timestamps between different time zones
- **Salesforce Time Zone Support**: Handle Salesforce-specific time zone requirements

### 🔧 **CLI Integration**

- **Direct CLI Access**: Execute Salesforce CLI commands directly from the interface
- **Command History**: Track and manage CLI command execution
- **Real-time Output**: View command results in real-time

## Prerequisites

- **Node.js** (v20 or later)
- **Visual Studio Code** (v1.95.0 or later) or **Cursor**
- **Git** (installed and configured)
- **Salesforce CLI** (installed and authenticated)

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/mitchspano/skyline.git
   cd skyline
   ```

2. **Install dependencies**:

   ```bash
   npm --prefix extension install
   ```

3. **Build the extension**:
   ```bash
   npm --prefix extension run compile
   ```

## Development Setup

### Local Development

1. **Clean and install dependencies**:

   ```bash
   [ -d "extension/dist" ] && rm -rf extension/dist
   [ -d "extension/node_modules" ] && rm -rf extension/node_modules
   npm --prefix extension install
   ```

2. **Start the extension in development mode**:

   ```bash
   # Terminal 1: Start the extension watcher
   npm --prefix extension run watch

   # Terminal 2: Launch VS Code/Cursor with the extension
   cursor --inspect-extensions --extensionDevelopmentPath=$(pwd)/extension
   ```

### Building for Production

Build the extension for production deployment:

```bash
npm --prefix extension run package
```

This command:

- Compiles the TypeScript code
- Bundles the LWC components
- Copies Salesforce Lightning Design System assets
- Prepares template files for distribution

### Testing

Run the test suite:

```bash
npm --prefix extension test
```

Run tests with coverage:

```bash
npm --prefix extension run test:coverage
```

Run tests in watch mode:

```bash
npm --prefix extension run test:watch
```

### Code Quality

Lint the codebase:

```bash
npm --prefix extension run lint
```

Format code with Prettier:

```bash
npm --prefix extension run format
```

## Usage

1. **Launch the Extension**: Use the command palette (`Cmd/Ctrl + Shift + P`) and type "Skyline" to launch the extension
2. **Verify Prerequisites**: The home dashboard will check your environment setup
3. **Configure Your Project**: Set up your Salesforce environment configurations in the Project Configuration section
4. **Manage Orgs**: Use the Org Manager to connect to and manage your Salesforce organizations
5. **Explore Metadata**: Browse and retrieve Salesforce metadata using the Metadata Explorer
6. **Monitor Pipeline**: Track your development pipeline and pull requests
7. **Test APIs**: Use the REST Explorer to test Salesforce APIs

## Configuration

The extension uses a `skyline.config.json` file to store project-specific configurations. This file supports:

- **Branch-based environments**: Different configurations for different Git branches
- **Salesforce org connections**: Connection details for various org types
- **Deployment settings**: Test levels and deployment preferences
- **Ticketing system integration**: Jira, GitHub Issues, or custom system configurations

### Configuration Template

The extension includes a template configuration file that provides:

- **Multi-environment setup**: Production, UAT, and Development environments
- **Test level configuration**: Different test strategies per environment
- **Security integration**: Support for connected apps and certificates
- **Pipeline ordering**: Define the flow of deployments across branches

## Architecture

### Frontend Components

- **Lightning Web Components (LWC)**: Modern web component framework for UI
- **Salesforce Lightning Design System**: Consistent Salesforce UI/UX
- **TypeScript**: Type-safe JavaScript development
- **Webpack**: Module bundling and asset management

### Backend Integration

- **VS Code Extension API**: Native VS Code integration
- **Node.js**: Server-side execution environment
- **Salesforce CLI**: Direct CLI command execution
- **Git Integration**: Native Git operations for branch management

### Build System

- **Webpack**: Dual configuration for extension and LWC components
- **LWC Webpack Plugin**: Specialized bundling for Lightning Web Components
- **Babel**: TypeScript and decorator support
- **Copy Webpack Plugin**: Asset management for SLDS and templates

### Testing Framework

- **Jest**: Comprehensive testing framework
- **JSDOM**: DOM simulation for component testing
- **TypeScript Testing**: Full TypeScript support in tests
- **Mock System**: Extensive mocking for VS Code and LWC APIs

## Project Structure

```
extension/
├── src/
│   ├── modules/s/           # Lightning Web Components
│   │   ├── app/            # Main application component
│   │   ├── home/           # Home dashboard
│   │   ├── orgManager/     # Organization management
│   │   ├── metadataExplorer/ # Metadata browsing
│   │   ├── pipeline/       # Pipeline management
│   │   ├── repoConfig/     # Repository configuration
│   │   ├── restExplorer/   # REST API testing
│   │   ├── timeZone/       # Time zone utilities
│   │   ├── cliElement/     # CLI integration
│   │   ├── header/         # Application header
│   │   ├── orgListItem/    # Organization list items
│   │   ├── branchModal/    # Branch configuration modal
│   │   └── scratchOrgModal/ # Scratch org creation modal
│   ├── templates/          # Configuration templates
│   ├── test/              # Test files and mocks
│   ├── types/             # TypeScript type definitions
│   ├── extension.ts       # VS Code extension entry point
│   └── index.ts           # LWC application entry point
├── scripts/               # Build and utility scripts
├── test/                  # Test configuration and mocks
├── dist/                  # Built extension files
└── images/                # Extension icons and assets
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write comprehensive tests for new features
- Use the existing LWC component structure
- Follow the established naming conventions
- Ensure all tests pass before submitting PRs

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/mitchspano/skyline).

## Changelog

### Version 0.0.12

- Enhanced VS Code integration with improved webview handling
- Added comprehensive testing framework with Jest and JSDOM
- Implemented LWC-based architecture for modern UI components
- Added Salesforce Lightning Design System integration
- Improved build system with Webpack and Babel support
