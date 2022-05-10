# documentation-stylist

`documentation-stylist` is a `react-styleguidist`-inspired theme for [documentation.js](https://documentation.js.org) with support for TypeScript and React components

![Style by Andre from NounProject.com](https://raw.githubusercontent.com/mmomtchev/documentation-stylist/main/stylist.svg)
*Logo **Style by Andre** from NounProject.com*

You can check an example documentation that uses it here: [rlayers](https://mmomtchev.github.io/rlayers/api)

![rlayers API screenshot](https://raw.githubusercontent.com/mmomtchev/documentation-stylist/main/screenshot.png)

# Usage

First:
```
npm i --save-dev documentation-stylist
```

Then:
```
documentation build ... --theme=node_modules/documentation-stylist
```

# Customization

`documentation-stylist` uses [Bootstrap](https://getbootstrap.com) and [Handlebars](https://handlebarsjs.com). Simply copy the `documentation-stylist` directory to your project and edit the templates in `./hbs`.
