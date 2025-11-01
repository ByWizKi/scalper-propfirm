module.exports = {
  // Lint and format TypeScript and JavaScript files
  "**/*.{ts,tsx,js,jsx}": (filenames) => [
    `eslint --fix --max-warnings 0 ${filenames.join(" ")}`,
    `prettier --write ${filenames.join(" ")}`,
  ],

  // Format other files
  "**/*.{json,md,yml,yaml}": (filenames) => [
    `prettier --write ${filenames.join(" ")}`,
  ],
};

