
insigne
=======

[![Build Status](https://travis-ci.org/agj/insigne.svg?branch=master)](https://travis-ci.org/agj/insigne)
[![Dependency Status](https://david-dm.org/agj/insigne.svg)](https://david-dm.org/agj/insigne)

A [Node][node] command line utility for mass file renaming, using your preferred text editor.

It works by creating a temporary text file with the names of the files you choose, which it monitors for changes you make to it, renaming the files accordingly.

[node]: https://nodejs.org/


## Installation

With [Node][node] installed, type into the command line:

```sh
npm install -g insigne
```

This will install the package globally, so you can access it anywhere.


## How to use

In the command line, just pass it a list of filenames.

```
insigne "file 1.txt" "other file.jpg"
```

Your OS's default editor for plain text files will open, displaying one filename per line.

