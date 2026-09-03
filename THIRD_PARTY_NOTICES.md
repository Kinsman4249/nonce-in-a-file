# Third-Party Notices

This project ships the Argon2id password hashing engine as a self-contained
WebAssembly bundle that is embedded inline in every generated, password
protected output file so recipients need no network access.

## argon2-browser

- Bundled version: 1.18.0 (2021-06-05)
- Project: https://github.com/antelle/argon2-browser
- npm: https://www.npmjs.com/package/argon2-browser
- License: MIT

The MIT License

Copyright (c) 2021 Antelle

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Reference implementation

argon2-browser compiles the reference Argon2 implementation
(https://github.com/P-H-C/phc-winner-argon2) to WebAssembly and bundles it.
That reference implementation is dual-licensed:

- CC0 1.0 Universal: https://creativecommons.org/publicdomain/zero/1.0/
- Apache License 2.0: https://www.apache.org/licenses/LICENSE-2.0