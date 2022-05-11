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

Handlebars.registerHelper('hasChildren', function (value, options) {
    const children = Object.keys(value).reduce((a, m) => a + value[m].length, 0);
    if (children > 0) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

const defaultClasses = {
    container: 'container d-flex flex-row',
    nav: 'position-sticky nav-section list',
    main: 'main-section ps-3',
    title: 'mt-2 mb-3 me-2',
    examples: 'ms-4',
    mainItem: 'me-1',
    navItem: 'd-flex flex-row align-items-center',
    navCollapse: 'btn btn-collapse m-0 me-2 p-0 align-items-center collapsed',
    navList: 'list-group',
    navListItem: 'list-group-item border-0',
    paramsTable: 'table table-light',
    paramsParameterHeader: 'col-2',
    paramsTypeHeader: 'col-4',
    paramsDescriptionHeader: 'col-6',
    paramsParameterData: '',
    paramsTypeData: '',
    paramsDescriptionData: '',
    returns: 'me-1',
    source: 'ms-4 fs-6 fw-lighter'
};
let userClasses = {};
function getClass(value) {
    if (userClasses[value] !== undefined)
        return userClasses[value];
    return defaultClasses[value];
}
Handlebars.registerHelper('className', getClass);

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

let srcLinkBase;

Handlebars.registerHelper('srcLink', function (value) {
    if (srcLinkBase && value) {
        const rel = path.relative(process.cwd(), value.file);
        const line = (value.loc && value.loc.start && value.loc.start.line !== undefined) ? '#L' + value.loc.start.line : '';
        return `<a class="${getClass('source')}" href="${srcLinkBase}${rel}${line}">source</a>`;
    }
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


module.exports = function documentationStylist(comments, config) {
    const themeConfig = config['documentation-stylist'];
    if (themeConfig) {
        if (themeConfig.externalCrossLinks)
            externalCrossLinks = require(path.resolve(process.cwd(), themeConfig.externalCrossLinks));
        if (themeConfig.dumpAST)
            fs.writeFileSync(themeConfig.dumpAST, JSON.stringify(comments));
        crossLinksDupeWarning = themeConfig.crossLinksDupeWarning;
        srcLinkBase = themeConfig.srcLinkBase;
        userClasses = themeConfig.classes || {};
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

    const assets = [
        require.resolve('bootstrap/dist/js/bootstrap.bundle.min.js'),
        require.resolve('bootstrap/dist/css/bootstrap.min.css'),
        themeConfig.css ? path.join(process.cwd(), themeConfig.css) : path.join(__dirname, 'stylist.css')
    ];
    if (themeConfig.extraCss) {
        assets.push(path.join(process.cwd(), themeConfig.extraCss));
        themeConfig.extraCss = path.basename(themeConfig.extraCss);
    }
    const generated = index({ config, comments });

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
