# Change Log

All notable changes to the Imperial Test Suite Runner extension will be documented in this file.

## [1.2.1] - 2021-10-17
### Minor improvements
- Parser is now an importable nodejs submodule, which makes parsing faster

## [1.2.0] - 2021-10-15
### Fixed
- Parser is now compiled at build time into javascript, which should make it work on all platforms

### Minor changes
- Removed the fourth BSD clause from the license

## [1.1.1] - 2021-10-14
### Fixed
- Fixed parser source file not being included in the build

## [1.1.0] - 2021-10-14
### Added
- This changelog

### Fixed
- Fixed design error causing the extension to only work in linux environments

## [1.0.0] - 2021-10-14
### Added
- A two second timeout for all tests to avoid program hanging

### Fixed
- Requesting execution of a single test no longer executes all of them
- Test runs which encounter an error are now marked as "errored" instead of "skipped"
- Tests are no longer marked as passed if executing runghc returned an error

## [0.0.3] - 2021-10-14
### Added
- A demo gif in the README

## [0.0.2] - 2021-10-14
### Fixed
- A typo in the extension name

## [0.0.1] - 2021-10-14
### The initial release
