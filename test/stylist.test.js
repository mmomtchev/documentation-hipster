const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function perform(test, command) {
    const expected = path.join(__dirname, `expected-${test}`);
    if (process.env.MOCHA_REGEN) {
        console.log('Replacing expected output');
        fs.rmSync(expected, { recursive: true, force: true });
        cp.execSync(command + ` -o=${expected}`);
    }

    const output = path.join(__dirname, 'output');
    try {
        fs.rmSync(output, { recursive: true, force: true });
        cp.execSync(command + ` -o=${output}`);
        cp.execSync(`diff -burN ${path.join(__dirname, `expected-${test}`)} ${path.join(__dirname, 'output')}`);
        fs.rmSync(path.join(__dirname, 'output'), { recursive: true, force: true });
    } catch (e) {
        console.log(command + ` -o=${output}`);
        console.log(`diff -burN ${path.join(__dirname, `expected-${test}`)} ${path.join(__dirname, 'output')}`);
        throw e;
    }
}

const theme = path.resolve(__dirname, '..', 'index.js');
const build = 'npx documentation build --f=html --theme=' + theme;

describe('React Component with TypeScript', () => {
    const tsxBuild = build + ' --parse-extension=tsx --require-extension=tsx';
    const input = path.join(__dirname, 'data', 'RMap.tsx');
    it('no configuration', () => {
        perform('React-noconf', `${tsxBuild} -c=${path.join(__dirname, 'React-noconf.yml')} ${input}`);
    });

    it('w/externalLinks', () => {
        perform('React-externalLinks', `${tsxBuild} -c=${path.join(__dirname, 'React-externalLinks.yml')} ${input}`);
    });

    it('w/Css', () => {
        perform('React-CSS', `${tsxBuild} -c=${path.join(__dirname, 'React-CSS.yml')} ${input}`);
    });

    it('w/extraCss', () => {
        perform('React-extraCSS', `${tsxBuild} -c=${path.join(__dirname, 'React-extraCSS.yml')} ${input}`);
    });

    it('w/classes', () => {
        perform('React-classes', `${tsxBuild} -c=${path.join(__dirname, 'React-classes.yml')} ${input}`);
    });

});
