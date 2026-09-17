## What's Changed

- Fixed bottom status-bar alignment: paths truncate cleanly and word, character, reading-time, and cursor counters stay on one line. Secondary counters hide in narrow windows.
- Added sidebar search for files and folders. Use Ctrl+P to search names and relative paths, including multiple search terms. Choosing a nested folder reveals it in the sidebar.
- Added Ctrl+F and a Find button for the current document in Source, Split, and Preview modes.
- Preview search includes highlighted matches, a match counter, case sensitivity, next/previous controls, Enter/Shift+Enter, F3/Shift+F3, and Escape to close.
- Source and Split modes include find-and-replace, regular expressions, and whole-word matching.
- Toolbar controls collapse to icons in narrow windows, with labels available as tooltips.

## Downloads

- **MD-Tools-Setup-1.7.0.exe**: Windows x64 installer.
- **MD-Tools-Portable-1.7.0.exe**: Windows x64 portable application.
- Builds are unsigned, as in previous releases.

## Validation

- TypeScript checks and production build passed.
- Electron integration tests cover file/folder search, nested-folder navigation, Preview matching, Source replacement and saving, Split search, and layout at 760, 960, and 1280 pixels wide.
