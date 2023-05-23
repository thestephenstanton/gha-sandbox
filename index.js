const core = require('@actions/core');
const github = require('@actions/github');


async function run() {
    try {
        console.log("starting...")
        // `who-to-greet` input defined in action metadata file
        const nameToGreet = core.getInput('who-to-greet');
        console.log(`Hello ${nameToGreet}!`);
        const time = (new Date()).toTimeString();
        core.setOutput("time", time);
        // Get the JSON webhook payload for the event that triggered the workflow
        //   const payload = JSON.stringify(github.context.payload, undefined, 2)
        //   console.log(`The event payload: ${payload}`);
        console.log("getting token")
        const githubToken = core.getInput("GITHUB_TOKEN")
    
        console.log("lenght of token", githubToken.length)
    
        const octokit = github.getOctokit(githubToken)

        await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
            ...github.context.repo,
            issue_number: github.context.issue.number,
            body: "Hello from Octokit!"
        });

        const release = "v6.6.6"
        const branch = "main"

        await octokit.request('POST /repos/{owner}/{repo}/releases', {
            ...github.context.repo,
            tag_name: release,
            target_commitish: branch,
            name: release,
            body: `Testing branch '${branch}'`,
            draft: false,
            prerelease: true,
            generate_release_notes: true,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })
    
        // octokit.rest.issues.createComment({
        //     ...github.context.repo,
        //     issue_number: github.context.issue.number,
        //     body: "Hello from Octokit!"
        // })
    
    } catch (error) {
        console.log("ah fuck", error)
        core.setFailed(error.message);
    }
}

run()