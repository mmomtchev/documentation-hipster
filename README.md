# documentation-hipster

[![License: ISC](https://img.shields.io/github/license/mmomtchev/documentation-hipster)](https://github.com/mmomtchev/documentation-hipster/blob/main/LICENSE)
[![Node.js CI](https://github.com/mmomtchev/documentation-hipster/actions/workflows/node.js.yml/badge.svg)](https://github.com/mmomtchev/documentation-hipster/actions/workflows/node.js.yml)

`documentation-hipster` is a `react-styleguidist`-inspired theme for [documentation.js](https://documentation.js.org) with support for TypeScript and React components

![Style by Andre from NounProject.com](https://raw.githubusercontent.com/mmomtchev/documentation-hipster/main/hipster.svg)
*Logo **Style by Andre** from NounProject.com*

You can check an example documentation that uses it here: [rlayers](https://mmomtchev.github.io/rlayers/api)

![rlayers API screenshot](https://raw.githubusercontent.com/mmomtchev/documentation-hipster/main/screenshot.png)

# Usage

Install
```
npm i --save-dev documentation-hipster
```

Run
```
documentation build ... --theme=node_modules/documentation-hipster/index.js
```

# Using with React Components

`documentation-hipster` supports the non-standard JSDoc tag `@propsfor` that allows to link the properties interface definition to the component.

# Browse the Shops

(...in their next versions...stay tuned ...)

[rlayers](https://mmomtchev.github.io/rlayers/api) - React Component in TypeScript

[gdal-async](https://mmomtchev.github.io/node-gdal-async) - Node.js addon in C++/JS with [documentation-polyglot](https://github.com/mmomtchev/documentation-polyglot)

# Customization

## Configuration File

`documentation-hipster` supports the following options in the `documentation.yml` configuration file:
```yml
documentation-hipster:
  # Disable the warning that multiple elements share the same base name
  # and cannot have their automatic cross links resolved
  crossLinksDupeWarning: false
  # An external function that must be the default export of the following file
  # Will get called every time a symbol is resolved to allow linking to external documentations
  # Check the rlayers project for an example
  externalCrossLinks: scripts/externalCrossLinks.js
  # If present every element will link to its source code
  srcLinkBase: https://github.com/mmomtchev/node-gdal-async/blob/master/
  # All CSS classes may be changed from these defaults
  classes:
    container: 'container d-flex flex-row',
    nav: 'position-sticky nav-section list',
    main: 'main-section ps-3',
    title: 'mt-2 mb-3 me-2',
    examples: 'ms-4',
    mainItem: 'me-1',
    navItem: 'd-flex flex-row align-items-center',
    navCollapse: 'btn btn-collapse m-0 me-2 p-0 align-items-center',
    navList: 'list-group',
    navListItem: 'list-group-item border-0',
    navLink: 'text-decoration-none',
    navText: 'm-0',
    paramsTable: 'table table-light',
    paramsParameterHeader: 'col-2',
    paramsTypeHeader: 'col-4',
    paramsDescriptionHeader: 'col-6',
    paramsParameterData: '',
    paramsTypeData: '',
    paramsDescriptionData: '',
    returns: 'me-1',
    source: 'ms-4 fs-6 fw-lighter'
  # Completely replace the built-in CSS
  css: my.css
  # Add some classes to the built-in CSS
  extraCss: scripts/gdal-doc.css
```

## Total Conversions

`documentation-hipster` uses [Bootstrap](https://getbootstrap.com) and [Handlebars](https://handlebarsjs.com). Simply copy the `documentation-hipster` directory to your project and edit the templates in `./hbs`.
