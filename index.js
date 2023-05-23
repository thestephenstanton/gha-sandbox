const core = require('@actions/core');
const github = require('@actions/github');

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput('who-to-greet');
  console.log(`Hello ${nameToGreet}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
//   const payload = JSON.stringify(github.context.payload, undefined, 2)
//   console.log(`The event payload: ${payload}`);
    
    const githubToken = core.getInput("GITHUB_TOKEN")

    const octokit = github.getOctokit(githubToken)

    octokit.issues.createComment({
        ...github.context.repo,
        issue_number: github.context.issue.number,
        body: "Hello from Octokit!"
    })

} catch (error) {
  core.setFailed(error.message);
}