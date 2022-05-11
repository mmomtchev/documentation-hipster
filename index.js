const fs = require('fs');
const path = require('path');
const process = require('process');
const File = require('vinyl');
const vfs = require('vinyl-fs');
const concat = require('concat-stream');
const map = require('map-stream');
const slugger = new require('github-slugger')();
const Handlebars = require('handlebars');

const index = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'hbs', 'index.handlebars'), 'utf8'), {preventIndent: true});
for (const templ of fs.readdirSync(path.join(__dirname, 'hbs')).filter(f => f.match(/\.handlebars/))) {
    const partial = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'hbs', templ), 'utf8'), {preventIndent: true});
    Handlebars.registerPartial(templ.split('.')[0], partial);
}
Handlebars.registerHelper('switch', function (value, options) {
    this.switch_value = value;
    this.switch_break = false;
    return options.fn(this);
});

Handlebars.registerHelper('case', function (value, options) {
    if (value == this.switch_value) {
        this.switch_break = true;
        return options.fn(this);
    }
});

Handlebars.registerHelper('default', function (options) {
    if (this.switch_break == false) {
        return options.fn(this);
    }
});

const crossLinks = {};
let externalCrossLinks = () => undefined;
let crossLinksDupeWarning = true;

Handlebars.registerHelper('crossLink', function (value) {
    const ext = externalCrossLinks(value);
    if (ext)
        return `<a href="${ext}">${value}</a>`;
    if (crossLinks[value])
        return `<a href="#${crossLinks[value]}">${value}</a>`;
    return value;
});

Handlebars.registerHelper('crossLinkUrl', function (value) {
    const ext = externalCrossLinks(value);
    if (ext)
        return ext;
    if (crossLinks[value])
        return '#' + crossLinks[value];
    return value;
});


Handlebars.registerHelper('debug', function (value, options) {
    return JSON.stringify(value);
});


function slugify(block) {
    block.slug = slugger.slug(block.name);
    Object.keys(block.members).forEach((m) => block.members[m].forEach(slugify));
}

// Finds interfaces with React properties and injects them into their components
function propsify(props, block) {
    const idx = props.findIndex((p) => block.name === p.tags.find((t) => t.title === 'propsfor').description);

    if (idx >= 0) {
        const p = props[idx];
        props.splice(idx, 1);
        block.props = p;
    }

    Object.keys(block.members).forEach((m) => block.members[m].forEach(propsify.bind(null, props)));
}

function crossify(list, block) {
    if (list[block.name] === undefined) {
        list[block.name] = block.slug;
    } else {
        if (crossLinksDupeWarning)
            console.warn('Warning, duplicate names, disabling cross-links: ', block.name);
        list[block.name] = null;
    }
    Object.keys(block.members).forEach((m) => block.members[m].forEach(crossify.bind(null, list)));
}


module.exports = function (comments, config) {
    const themeConfig = config['documentation-stylist'];
    if (themeConfig) {
        if (themeConfig.externalCrossLinks)
            externalCrossLinks = require(path.resolve(process.cwd(), themeConfig.externalCrossLinks));
        if (themeConfig.dumpAST)
            fs.writeFileSync(themeConfig.dumpAST, JSON.stringify(comments));
        if (themeConfig.crossLinksDupeWarning !== undefined)
            crossLinksDupeWarning = themeConfig.crossLinksDupeWarning;
    }

    comments.forEach(slugify);

    // find static members whose unknown tags list contains propsfor
    const props = comments.filter((m) => (m.tags || []).map((t) => t.title).includes('propsfor'));
    // remove them from the normal flow
    comments = comments.filter((m) => !(m.tags || []).map((t) => t.title).includes('propsfor'));
    // and attach them in their respective components
    comments.forEach(propsify.bind(null, props));

    // create automatic cross-links
    comments.forEach(crossify.bind(null, crossLinks));

    const generated = index({ config, comments });

    const assets = [
        require.resolve('bootstrap/dist/js/bootstrap.bundle.min.js'),
        require.resolve('bootstrap/dist/css/bootstrap.min.css'),
        path.join(__dirname, 'stylist.css')
    ];

    if (typeof process.mainModule === 'undefined') {
        // documentation.js >= 14

        if (!config.output) {
            return Promise.resolve(generated);
        }

        return fs.promises.mkdir(config.output, { recursive: true })
            .then(() => Promise.all(
                assets.map((asset) =>
                    fs.promises.copyFile(asset, path.join(config.output, path.basename(asset))))))
            .then(() => fs.promises.writeFile(path.join(config.output, 'index.html'), generated, 'utf8'));
    } else {
        // documentation.js <= 13.x

        // push assets into the pipeline as well.
        return new Promise((resolve) => {
            vfs.src(assets, { base: __dirname })
                .pipe(map((file, cb) => {
                    file.base = path.dirname(file.path);
                    cb(null, file);
                }))
                .pipe(
                    concat(function (files) {
                        resolve(
                            files.concat(
                                new File({
                                    path: 'index.html',
                                    contents: Buffer.from(generated,
                                        'utf8')
                                })
                            )
                        );
                    })
                );
        });
    }
}
