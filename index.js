const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
    const githubToken = core.getInput("gh-token")
    const action = core.getInput("action")

    const octokit = github.getOctokit(githubToken)

    switch (action) {
        case "create-release":
            return createRelease(octokit)
        case "clean-up":
        // TODO implement
        default:
            return core.setFailed(`Action ${action} not supported`)
    }
}

run().catch(error => {
    console.log("something went wrong", error)
    core.setFailed(error.message);
})

async function createRelease() {
    const owner = github.context.payload.repository.owner.login
    const repo = github.context.payload.repository.name
    const prNumber = github.context.payload.issue.number
    const username = github.context.payload.comment.user.login
    const commentsUrl = github.context.payload.issue.comments_url

    const release = await generateRelease(octokit, prNumber, username, commentsUrl)
    const message = "Created release " + release

    const { data } = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pr_number}', {
        owner: owner,
        repo: repo,
        pr_number: prNumber,
    })

    const branch = data.head.ref

    await octokit.request('POST /repos/{owner}/{repo}/releases', {
        owner: owner,
        repo: repo,
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

    await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: message,
        headers: {
            "x-github-api-version": "2022-11-28",
        },
    });
}

async function generateRelease(octokit, prNumber, username, commentUrl) {
    const comments = await octokit.paginate(
        `GET ${commentUrl}`,
        {},
        (response) => response.data.map((comment) => comment.body)
    )

    const alphaNumber = getNewAlphaNumber(comments)

    return `v${prNumber}-${username}-alpha.${alphaNumber}`
}

function getNewAlphaNumber(comments) {
    let latestComment;
    for (let i = comments.length - 1; i >= 0; i--) {
        const comment = comments[i]
        if (comment.includes("Created release")) {
            latestComment = comment
            break
        }
    }

    if (!latestComment) {
        return 0
    }

    const regex = /alpha\.(\d+)/
    const match = latestComment.match(regex)
    const alphaNumber = parseInt(match[1], 10)

    return alphaNumber + 1
}
