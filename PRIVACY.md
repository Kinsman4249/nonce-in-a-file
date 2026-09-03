# Privacy Policy

This project is designed so that nothing about your data ever leaves your
device unless you choose to send it yourself. Reading this file is the best way
to confirm that: everything below describes observable, code-level behavior,
not intent.

## Short version

- Opening and using the builder, and unlocking a protected file, happens
  entirely in your browser. No files, passwords, or content are uploaded.
- The project has no backend, no API routes, no database, and no analytics.
- The only network requests a generated output file can make are the footer
  links (legal, privacy, "Learn more"), which the visitor may or may not click.

## What the builder collects

Nothing. The builder is a single static HTML page. All file selection and
encryption happen locally using the browser's Web Crypto API. The file you
choose, the password you set, and the generated output are never transmitted.

## What a protected file collects

Nothing. A generated output file is a single self-contained HTML document. It
contains decrypt-and-download logic only and no network code of its own. When a
visitor enters the correct password, the original file is decrypted in their
browser and downloaded to their device; it is not sent anywhere.

## The only possible network requests

The footer of every generated file contains links to this project's legal,
privacy, and "Learn more" destinations. These are ordinary hyperlinks that open
in a new tab only if the visitor clicks them. There is no passive or background
request; the file works fully offline once loaded.

The "Learn more" destination is fixed by the builder and cannot be changed by a
visitor. The legal and privacy link destinations are chosen by whoever generated
the file, so a protected file you receive could point to that generator's own
pages rather than these defaults. Check the link targets before clicking if you
care where they lead.

## Data retention and deletion

There is nothing for the project to retain or delete. The project does not
store, process, or have access to any of your files, passwords, or generated
documents at any point.

## Changes to this policy

If this policy changes, the change will be made here in the repository, where it
can be reviewed under version control.

## Contact

For questions about this policy or the project's data handling, please open an
issue in this repository.