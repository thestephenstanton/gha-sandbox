const core = require('@actions/core');
const github = require('@actions/github');

// comment prefixes
const commentPrefix = {
    release: "Created release",
    cleanup: "Cleaned up releases",
}

async function run() {
    const githubToken = core.getInput("gh-token")
    const action = core.getInput("action")

    const octokit = github.getOctokit(githubToken)

    switch (action) {
        case "create-release":
            return createAlphaRelease(octokit)
        case "clean-up":
            return cleanUpAlphaReleases(octokit)
        default:
            return core.setFailed(`Action ${action} not supported`)
    }
}

async function createAlphaRelease(octokit) {
    const owner = github.context.payload.repository.owner.login
    const repo = github.context.payload.repository.name
    const prNumber = github.context.payload.issue.number
    const username = github.context.payload.comment.user.login
    const commentsUrl = github.context.payload.issue.comments_url

    const comments = await getAllCommentsFromPR(octokit, commentsUrl)

    const release = generateReleaseName(comments, prNumber, username)
    const message = `${commentPrefix.release} ${release}`

    // get some details about the PR
    const { data } = await autoRetry(octokit.request('GET /repos/{owner}/{repo}/pulls/{pr_number}', {
        owner: owner,
        repo: repo,
        pr_number: prNumber,
    }))

    const branch = data.head.ref

    // create the release
    await autoRetry(octokit.request('POST /repos/{owner}/{repo}/releases', {
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
    }))

    // comment on the PR
    await autoRetry(octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: message,
        headers: {
            "x-github-api-version": "2022-11-28",
        },
    }))
}

const cleanUpAlphaReleases = async (octokit) => {
    const owner = github.context.payload.repository.owner.login
    const repo = github.context.payload.repository.name
    const prNumber = github.context.payload.issue.number
    const commentsUrl = github.context.payload.issue.comments_url

    const comments = await getAllCommentsFromPR(octokit, commentsUrl)

    const releases = getAllAlphaReleases(comments)

    const releaseIdPromises = []

    // get all release ids
    for (const release of releases) {
        const id = autoRetry(octokit.request('GET /repos/{owner}/{repo}/releases/tags/{tag}', {
            owner: owner,
            repo: repo,
            tag: release,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        })).then((response) => response.data.id)

        releaseIdPromises.push(id)
    }

    const releaseIds = await Promise.all(releaseIdPromises)

    // delete all releases
    for (const releaseId of releaseIds) {
        await autoRetry(octokit.request("DELETE /repos/{owner}/{repo}/releases/{release_id}", {
            owner: owner,
            repo: repo,
            release_id: releaseId,
            headers: {
                "x-github-api-version": "2022-11-28",
            },
        }))
    }

    // comment on the PR
    await autoRetry(octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/comments", {
        owner: owner,
        repo: repo,
        issue_number: prNumber,
        body: `${commentPrefix.cleanup}: \n\n ${releases.join("\n")}`,
        headers: {
            "x-github-api-version": "2022-11-28",
        },
    }))
}

////////////////////////
// Helpers
////////////////////////

const getAllCommentsFromPR = async (octokit, commentsUrl) => {
    return autoRetry(octokit.paginate(
        `GET ${commentsUrl}`,
        {},
        (response) => response.data.map((comment) => comment.body)
    ))
}

const generateReleaseName = (comments, prNumber, username) => {
    const alphaNumber = getNewAlphaNumber(comments)

    return `v${prNumber}-${username}-alpha.${alphaNumber}`
}

const getAllAlphaReleases = (comments, includeDeleted = false) => {
    const releases = []

    for (let i = 0; i < comments.length; i++) {
        const comment = comments[i]
        if (comment.includes(commentPrefix.release)) {
            const words = comment.split(" ")
            const release = words[words.length - 1]
            releases.push(release)
        } else if (!includeDeleted && comment.includes(commentPrefix.cleanup)) {
            // reset releases because we have cleaned up
            releases.length = 0
        }
    }

    return releases
}

const getNewAlphaNumber = (comments) => {
    const releases = getAllAlphaReleases(comments, includeDeleted = true) // we include deleted just so we keep the count going up

    if (releases.length == 0) {
        return 0
    }

    const latestRelease = releases[releases.length - 1]

    console.log("found", latestRelease)

    const regex = /alpha\.(\d+)/
    const match = latestRelease.match(regex)
    console.log("mattttttchhhhh", match)
    const alphaNumber = parseInt(match[1], 10)

    return alphaNumber + 1
}

const autoRetry = async (func, retries = 3, delayMs = 100) => {
    let error = null
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await func()

            return result
        }
        catch (_error) {
            error = _error

            await wait(delayMs)
        }
    }
    if (error) {
        throw error
    }

    return null
}

run().catch(error => {
    console.log("something went wrong", error)
    core.setFailed(error.message);
})

// export all functions for testing
module.exports = {
    getAllAlphaReleases,
    getNewAlphaNumber,
}
