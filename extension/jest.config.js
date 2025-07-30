module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json"
      }
    ]
  },
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts", "!src/test/**/*"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  moduleNameMapper: {
    "^lwc$": "<rootDir>/src/test/mocks/lwc.ts",
    "^vscode$": "<rootDir>/src/test/mocks/vscode.ts",
    "^child_process$": "<rootDir>/src/test/mocks/child_process.ts",
    "^../../modules/s/app/app$": "<rootDir>/src/test/mocks/app.ts",
    "^../../modules/s/cliElement/cliElement$":
      "<rootDir>/src/test/mocks/cliElement.ts",
    "^../../modules/s/header/header$": "<rootDir>/src/test/mocks/header.ts",
    "^../../modules/s/home/home$": "<rootDir>/src/test/mocks/home.ts",
    "^../../modules/s/orgListItem/orgListItem$":
      "<rootDir>/src/test/mocks/orgListItem.ts",
    "^../../modules/s/orgManager/orgManager$":
      "<rootDir>/src/test/mocks/orgManager.ts",
    "^../../modules/s/pipeline/pipeline$":
      "<rootDir>/src/test/mocks/pipeline.ts",
    "^../../modules/s/repoConfig/repoConfig$":
      "<rootDir>/src/test/mocks/repoConfig.ts",
    "^../../modules/s/metadataExplorer/metadataExplorer$":
      "<rootDir>/src/test/mocks/metadataExplorer.ts",
    "^../../modules/s/scratchOrgModal/scratchOrgModal$":
      "<rootDir>/src/test/mocks/scratchOrgModal.ts",
    "^lightning-base-components/src/lightning/toast/toast.js$":
      "<rootDir>/src/test/mocks/toast.ts"
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/"]
};
