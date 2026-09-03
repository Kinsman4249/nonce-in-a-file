# Privacy Policy

This project is designed so that nothing about your data ever leaves your
device unless you choose to send it yourself. Reading this file is the best way
to confirm that: everything below describes observable, code-level behavior,
not intent.

## Short version

- Opening and using the builder, and unlocking a protected file, happens
  entirely in your browser. No files, passwords, or content are uploaded.
- The project has no backend, no API routes, no database, and no analytics.
- An optional, opt-in local address book can store the public keys you have
  generated or shared in this browser's local storage. It holds public
  material only, never private keys, and never leaves your device except when
  you explicitly export it as a JSON file.
- The only network requests a generated output file can make are the footer
  links (legal, privacy, "Learn more"), which the visitor may or may not click.

## What the builder collects

Nothing. The builder is a single static HTML page. All file selection and
encryption happen locally using the browser's Web Crypto API. The file you
choose, the password you set, and the generated output are never transmitted.

## The local ECDH address book (opt-in only)

The builder can remember the ECDH public keys you have generated or imported so
you can add them as recipients without pasting them again. This is an opt-in
feature: nothing is written to your device until you click "Save above public
key" or "Import keyring JSON", and it stores only public keys (never private
keys or passwords). The address book lives in your browser's local storage and
is not sent anywhere. The only way it leaves your device is a JSON file you
explicitly download with "Export keyring JSON".

## What a protected file collects

Nothing. A generated output file is a single self-contained HTML document. It
contains decrypt-and-download logic only and no network code of its own. When a
visitor enters the correct password, the original file is decrypted in their
browser and downloaded to their device; it is not sent anywhere.

Not even the filename is exposed: it is encrypted inside the payload alongside
the document, so there is no cleartext metadata in a generated file for anyone
to read.

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

A planned, optional "sponsor" build mode could add a distinctly styled region
to a generated page that fetches an external ad tag, but such a mode is not
implemented, is off by default, and can only ever be enabled explicitly when a
file is generated. If it ships, it would be the one case where a protected page
itself makes a background network request, and it would never touch decrypted
content. This policy will be amended before that mode is enabled on any build.

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