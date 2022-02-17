const { exec, execSync } = require('child_process');
const jsforce = require('jsforce');

const executeScript = (script, args = []) =>
    execSync(`${script} ${args.join(' ')}`, { stdio: ['pipe', 'pipe', 'ignore'] });

const executeScriptAsync = (script, args = []) =>
    new Promise((resolve, reject) => {
        exec(
            `${script} ${args.join(' ')}`,
            {
                stdio: ['pipe', 'pipe', 'ignore'],
            },
            (err, stdout, stderr) => {
                if (err) {
                    reject(err);
                } else if (stderr) {
                    reject(stderr);
                } else {
                    resolve(stdout);
                }
            },
        );
    });

const auth = () => {
    const { result } = JSON.parse(executeScript('sfdx force:org:display --json'));
    return new jsforce.Connection({
        instanceUrl: result.instanceUrl,
        accessToken: result.accessToken,
    });
};

module.exports = {
    executeScript,
    executeScriptAsync,
    auth,
};
