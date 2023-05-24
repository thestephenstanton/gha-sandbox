const { getAllAlphaReleases, getNewAlphaNumber } = require('./index');

describe("getAllAlphaReleases", () => {
    it("list alpha releases that currently exist", () => {
        const comments = [
            "Created release v1-username-alpha.1",
            "Random comment",
            "Some response",
            "Created release v1-username-alpha.2",
            "Created release v1-username-alpha.3",
            "Cleaned up releases: {{list releases}}",
            "Some other comment",
            "Created release v1-username-alpha.4",
        ]

        const alphaReleases = getAllAlphaReleases(comments);

        expect(alphaReleases).toEqual([
            "v1-username-alpha.4",
        ]);
    });

    it("list all alpha releases that have been created", () => {
        const comments = [
            "Created release v1-username-alpha.1",
            "Random comment",
            "Some response",
            "Created release v1-username-alpha.2",
            "Created release v1-username-alpha.3",
            "Cleaned up releases: {{list releases}}",
            "Some other comment",
            "Created release v1-username-alpha.4",
        ]

        const alphaReleases = getAllAlphaReleases(comments, includeDeleted = true);

        expect(alphaReleases).toEqual([
            "v1-username-alpha.1",
            "v1-username-alpha.2",
            "v1-username-alpha.3",
            "v1-username-alpha.4",
        ]);
    });

    it("no release yet", () => {
        const comments = [
            "hey",
            "heyyy",
            "how are you?",
            "good",
            "wanna go out?",
            "you know this is a public PR right?",
            "its called rizz",
            "_claudia left the chat_",
        ]

        const alphaReleases = getAllAlphaReleases(comments);

        expect(alphaReleases).toEqual([]);
    });

    it("no comments", () => {
        const comments = []

        const alphaReleases = getAllAlphaReleases(comments, includeDeleted = true);

        expect(alphaReleases).toEqual([]);
    });

    it("hijack the comments", () => {
        const comments = [
            "Created release (written by someone else) v1-username-alpha.100",
        ]

        const alphaReleases = getAllAlphaReleases(comments);

        expect(alphaReleases).toEqual(["v1-username-alpha.100"]);
    });
});

describe("getNewAlphaNumber", () => {
    it("first time running test", () => {
        const comments = [
            "Random comment",
            "Some response",
            "test",
        ]

        const newAlphaNumber = getNewAlphaNumber(comments);

        expect(newAlphaNumber).toEqual(0);
    });

    it("get next alpha number", () => {
        const comments = [
            "Created release v1-username-alpha.1",
            "Random comment",
            "Some response",
            "Created release v1-username-alpha.2",
            "Created release v1-username-alpha.3",
            "Cleaned up releases: {{list releases}}",
            "Some other comment",
            "Created release v1-username-alpha.4",
        ]

        const newAlphaNumber = getNewAlphaNumber(comments);

        // even though we deleted 1 -> 3, we still increment
        expect(newAlphaNumber).toEqual(5);
    });
    
    it("hijack the comments", () => {
        const comments = [
            "Created release v1-username-alpha.1",
            "Random comment",
            "Some response",
            "Created release v1-username-alpha.2",
            "Created release v1-username-alpha.3",
            "Cleaned up releases: {{list releases}}",
            "Some other comment",
            "Created release lololololol v1-username-alpha.68",
        ]

        const newAlphaNumber = getNewAlphaNumber(comments);

        // even though we deleted 1 -> 3, we still increment
        expect(newAlphaNumber).toEqual(69);
    });
});