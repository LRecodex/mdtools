# Changelog

## 1.12.3 - 2026-09-22

- Reworked the integrated terminal to match the VS Code terminal layout with tabs, profile/actions, compact prompt controls, and a dedicated terminal surface.
- Added terminal command history navigation with the Up and Down arrows and a New Terminal action.

## 1.12.2 - 2026-09-21

- Terminal now accepts input for interactive Claude, Codex, and other CLI sessions.
- `clear` works from the Windows terminal panel, and running processes can be stopped or sent input.
- Outline panel can now be resized, hidden, shown, and configured from Settings like the file sidebar.

## 1.12.0 - 2026-09-21

- Outline entries now navigate to the matching heading in both the editor and rendered preview.
- Added a title-bar/sidebar-friendly terminal panel for running Claude, Codex, npm, Git, and other workspace commands.
- Terminal output streams live with stop, clear, and Ctrl+J toggle controls.

## 1.12.1 - 2026-09-21

- Update checks now repeat automatically every 10 minutes while the app is running.
- Added a persistent status-bar shortcut for manually opening the update checker.

## 1.11.1 - 2026-09-18

- Fixed Excel preview contrast so text remains readable on bright spreadsheet fills.
- Used Excel-formatted dates and numbers to prevent raw values from overflowing cells.
- Constrained excessively wide columns for a compact preview while preserving the sheet structure.
- Frozen rows and columns now stay visible while scrolling. Zoom controls use finer steps and support Ctrl + mouse wheel.

## 1.11.0 - 2026-09-18

- Excel previews now retain workbook formatting, merged cells, row heights, column widths, and hidden rows and columns.
- Added clear saved-pane and protection indicators, including access to hidden worksheets when needed.
- Added spreadsheet zoom controls and a direct cell jump field for navigating long schedules.
- Open the workbook at its saved active cell and zoom level for a more familiar Excel view.

## 1.10.0 - 2026-09-18

- Made Excel previews easier to navigate with visible row and column labels.
- Added a formula inspector: select any cell to view its value or calculation.
- Formula references are now color-coded and their source cells are highlighted with matching colors, making calculations easy to trace.

## 1.9.1 - 2026-09-17

- Added a top toolbar Wiki link button that inserts `[[Page name]]` with the page name selected for easy replacement.
- Added a Wiki link chooser for selecting existing Markdown pages instead of typing link targets manually.
- Fixed a CodeMirror selection update used when syncing external document changes.

## 1.9.0 - 2026-09-17

- Added a command palette with workspace, search, settings, update, theme, and help commands.
- Reworked the empty state into a welcome dashboard with recent workspaces and quick actions.
- Added a Markdown insights panel with document outline, wiki links, and backlinks.
- Added `[[Page Name]]` wiki links that open existing Markdown pages or create new ones.
- Added rendered Markdown export to standalone HTML alongside PDF.
- Added a Settings dialog for theme, editor mode, sidebar layout, and update status.
- Added an update dialog with latest release notes and explicit Download / Restart actions.

## 1.8.2 - 2026-09-17

- Reworked packaged-app updates into a user-controlled status bar flow: check in the background, show an update button, download on request, then restart to install.

## 1.8.1 - 2026-09-17

- Focused the Support LRecodex donation image on the scannable QR code and improved its dialog presentation.
- Added packaged-app update checks against the GitHub Releases feed so installed builds can download the latest release automatically.

## 1.8.0 - 2026-09-17

- Extended workspace Quick Open: Ctrl+P now searches file and folder names, paths, and contents of Markdown, text, JSON, code, and CSV files.
- Content results show a short matching excerpt so the right document is easy to identify before opening it.
- Added a Support LRecodex section in the sidebar with a Maybank donation QR code.

## 1.7.0 - 2026-09-17

- Fixed status bar alignment: long paths truncate, counters stay on one line, and secondary counters hide as the window narrows.
- Added a visible sidebar search button and extended Ctrl+P to find files and folders by name or relative path, including multi-word queries.
- Selecting a folder search result expands its ancestors and reveals the folder in the sidebar.
- Added Ctrl+F and a search toolbar button for the current document in Source, Split, and Preview modes.
- Preview search highlights matches, displays a match counter, and supports case sensitivity, next/previous, Enter/Shift+Enter, F3/Shift+F3, and Escape.
- Source and Split search include find/replace, whole-word matching, and regular expressions through CodeMirror.
- Added loading, empty, error, result-limit, and keyboard navigation handling for workspace search.
- Added Electron integration coverage for search, replacement, folder navigation, and responsive status bar layout.

## 1.6.0 - 2026-09-01

- Added tab right-click actions for closing the current tab, other tabs, tabs to the right, saved tabs, or all tabs.
- Added tab utilities to copy a file path or reveal the file in Explorer.
- Added persisted sidebar resizing by dragging the explorer edge, with double-click reset.
- Added visible version and "Made by LRecodex" credit in the sidebar footer and status bar.
- Added `Ctrl+Shift+W` to close all tabs and `Ctrl+PageUp` / `Ctrl+PageDown` to move between tabs.

## 1.5.1 - 2026-08-20

- Previous Windows release.
