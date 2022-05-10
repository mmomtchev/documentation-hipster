const fs = require('fs');
const path = require('path');
const File = require('vinyl');
const vfs = require('vinyl-fs');
const concat = require('concat-stream');
const map = require('map-stream');
const slugger = new require('github-slugger')();
const Handlebars = require('handlebars');

const index = require('./hbs/index.handlebars');
for (const templ of fs.readdirSync(path.join(__dirname, 'hbs')).filter(f => f.match(/\.handlebars/))) {
    Handlebars.registerPartial(templ.split('.')[0], require(path.join(__dirname, 'hbs', templ)));
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


module.exports = function (comments, config) {
    comments.forEach(slugify);

    // find static members whose unknown tags list contains propsfor
    const props = comments.filter((m) => (m.tags || []).map((t) => t.title).includes('propsfor'));
    // remove them from the normal flow
    comments = comments.filter((m) => !(m.tags || []).map((t) => t.title).includes('propsfor'));
    // and attach them in their respective components
    comments.forEach(propsify.bind(null, props))

    // push assets into the pipeline as well.
    return new Promise((resolve) => {
        vfs.src([
            __dirname + '/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js',
            __dirname + '/node_modules/bootstrap/dist/css/bootstrap.min.css',
            __dirname + '/stylist.css'
        ], { base: __dirname })
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
                                contents: Buffer.from(index({ config, comments }),
                                    'utf8')
                            })
                        )
                    );
                })
            );
    });
}
