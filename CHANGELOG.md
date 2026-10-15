# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
### Added
- **Patient-Rooted Telemetry Architecture**:
  - Telemetry readings are now linked to `Patient` (`patientId`) rather than only `Device`.
  - Reassigning devices or replacing damaged machines preserves patient RPM data losslessly with zero false-positive contamination.
  - Telemetry from unassigned devices is stored as standalone hardware test data until reassigned.
  - Automatic, idempotent startup data migration hook to safely re-attribute existing telemetry events from assigned devices to their patients.
  - New patient-centric endpoints: `GET /patients/:id/telemetry`, `GET /patients/:id/telemetry/latest`, `GET /patients/:id/telemetry/export`, and `PATCH /patients/:id/telemetry/:eventId/communication`.
  - Added full Telemetry History section to `PatientDetailPage` with date filtering, pagination, PDF export, and clinician communication logging.
  - Added informational context headers to `DeviceDetailPage` indicating whether readings belong to the assigned patient or unassigned hardware.
- Implemented Dark Mode functionality across all pages.
  - Added `ThemeProvider` to manage light/dark/system theme state.
  - Added `ThemeToggle` component to the `AppLayout` header using a dropdown menu for easy switching between Light, Dark, and System modes.
  - Configured `main.tsx` to wrap the app with `ThemeProvider` prioritizing local storage preference.
- Initial Changelog creation to track project updates.
