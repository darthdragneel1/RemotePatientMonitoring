# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- Implemented Dark Mode functionality across all pages.
  - Added `ThemeProvider` to manage light/dark/system theme state.
  - Added `ThemeToggle` component to the `AppLayout` header using a dropdown menu for easy switching between Light, Dark, and System modes.
  - Configured `main.tsx` to wrap the app with `ThemeProvider` prioritizing local storage preference.
- Initial Changelog creation to track project updates.
