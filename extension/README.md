# Skyline

## Overview

Skyline serves as a bridge between your local development environment and Salesforce orgs, enabling teams to:

- Manage metadata across different environments seamlessly
- Configure repository settings for different branches
- Explore and retrieve Salesforce metadata through an intuitive interface
- Validate system prerequisites and project setup

## Features

### 🏠 Home Dashboard

- System health checks and setup validation
- Automatic verification of essential tools:
  - Git installation
  - Salesforce CLI
  - Repository configuration
- Visual progress indicators for quick status overview

### 🔍 Metadata Explorer

- User-friendly interface for browsing Salesforce metadata
- Advanced filtering capabilities:
  - Component name search
  - Last modified date ranges
  - Modified by user
- Hierarchical metadata visualization
- One-click metadata retrieval
- Timezone-aware date handling

### ⚙️ Pipeline Configuration

- Branch-specific environment configurations
- Visual configuration editor
- Environment validation
- Deployment settings management
- Test level configuration per environment

## Who Is This For?

- **Developers**: Streamline your workflow with quick access to metadata and repository settings
- **Administrators**: Interact with metadata and configurations through a familiar interface
- **Technical Leads**: Manage environment configurations and deployment settings
- **Team Members**: Collaborate effectively with a unified tool for org management

## Prerequisites

Before using Skyline, ensure you have:

- Visual Studio Code 1.95.0 or later
- Git installed locally
- Salesforce CLI (sf) installed
- A Git repository initialized in your project
- Node.js and npm

## Installation

1. Download the VSIX file from the releases page
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the "..." menu at the top of the Extensions view
5. Select "Install from VSIX..."
6. Choose the downloaded VSIX file

## Usage

1. Open the command palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Type "Skyline" and select it to launch
3. The Skyline interface will open in a new panel

### Metadata Explorer

1. Select a metadata type from the dropdown
2. Use filters to narrow down results:
   - Search by component name
   - Filter by date range
   - Filter by last modified user
3. Select metadata components
4. Click "Retrieve" to download to your project

### Pipeline Configuration

1. Select or create a branch configuration
2. Configure environment-specific settings:
   - Instance URLs
   - Authentication details
   - Test levels for deployments
3. Save and manage configurations per branch

## Development

### Setup

```bash
# Install dependencies
npm install

# Compile the extension
npm run compile

# Watch for changes during development
npm run watch
```

### Project Structure

```
src/
├── extension.ts          # VS Code extension entry point
├── index.ts             # LWC application entry point
├── modules/             # LWC components
│   └── s/
│       ├── app/         # Main application component
│       ├── home/        # Home dashboard
│       ├── metadataExplorer/  # Metadata browser
│       └── repoConfig/  # Pipeline configuration
├── test/                # Test files
└── types/               # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Dependencies

- [@salesforce-ux/design-system](https://www.npmjs.com/package/@salesforce-ux/design-system) - ^2.25.3
- [lightning-base-components](https://www.npmjs.com/package/lightning-base-components) - ^1.22.1-alpha
- Various development dependencies for TypeScript, Webpack, and testing

## Support

For support, please open an issue in the GitHub repository or contact the maintainers.
