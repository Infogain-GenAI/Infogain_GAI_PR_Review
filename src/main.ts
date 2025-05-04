import { config } from 'dotenv'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { PullRequestEvent } from '@octokit/webhooks-definitions/schema.js'
import { ChatOpenAI } from 'langchain/chat_models'
import { BaseChatModel } from 'langchain/chat_models'
import { Effect, Layer, Match, pipe, Exit } from 'effect'
import { CodeReview, CodeReviewClass, DetectLanguage, octokitTag, PullRequest, PullRequestClass } from './helpers.js'
import {instructionsPromptPrefix,instructionsPromptSuffix} from './constants.js'

config()
let isBlockExecuted = false; // Flag to ensure the block runs only once
export const run = async (): Promise<void> => {
    core.info("Step1: Starting the run function"); // Debug statement
    if (isBlockExecuted) {
        core.info("Step1.1: Block already executed, exiting."); // Debug statement
        return;
    }
    isBlockExecuted = true;
    core.info("Step1.2: Block execution flag set to true."); // Debug statement

    const openAIApiKey = core.getInput('openai_api_key');
    const githubToken = core.getInput('github_token');
    const modelName = core.getInput('model_name');
    const temperature = parseInt(core.getInput('model_temperature'));
    const instructionsFilePath = core.getInput('instructions_file_path');

    if (!githubToken) {
        core.setFailed('Step2: GitHub token is missing. Exiting.'); // Debug statement
        return;
    }

    core.info("Step3: Initializing GitHub context and octokit."); // Debug statement
    const context = github.context;
    const { owner, repo } = context.repo;
    const octokit = github.getOctokit(githubToken);

    core.info("Step4: Fetching instructions prompt."); // Debug statement
    const instructionsPromptMid = await fetchInstructionsPrompt(octokit, owner, repo, instructionsFilePath);
    const instructionsPrompt = instructionsPromptPrefix + instructionsPromptMid + instructionsPromptSuffix;

    core.info("Step5: Initializing the model and layers."); // Debug statement
    const model: BaseChatModel = new ChatOpenAI({
        temperature,
        openAIApiKey,
        modelName,
    });
    const MainLive = init(model, githubToken, instructionsPrompt);

    core.info("Step6: Matching event name."); // Debug statement
    const program = Match.value(context.eventName).pipe(
        Match.when('pull_request', () => {
            core.info("Step6.1: Handling pull_request event."); // Debug statement
            const excludeFilePatterns = pipe(
                Effect.sync(() => github.context.payload as PullRequestEvent),
                Effect.tap(pullRequestPayload =>
                    Effect.sync(() => {
                        core.info(
                            `Step6.2: repoName: ${repo}, pull_number: ${context.payload.number}, owner: ${owner}, sha: ${pullRequestPayload.pull_request.head.sha}`
                        );
                    })
                ),
                Effect.map(() =>
                    core
                        .getInput('exclude_files')
                        .split(',')
                        .map(_ => _.trim())
                )
            );

            const a = excludeFilePatterns.pipe(
                Effect.flatMap(filePatterns =>
                    PullRequest.pipe(
                        Effect.flatMap(PullRequest => {
                            core.info("Step6.3: Fetching files for review."); // Debug statement
                            return PullRequest.getFilesForReview(owner, repo, context.payload.number, filePatterns);
                        }),
                        Effect.flatMap(files => {
                            core.info(`Step6.4: Filtering files with patches. Total files: ${files.length}`); // Debug statement
                            return Effect.sync(() => files.filter(file => file.patch !== undefined));
                        }),
                        Effect.flatMap(files =>
                            Effect.forEach(files, file => {
                                core.info(`Step6.5: Processing file: ${file.filename}`); // Debug statement
                                return CodeReview.pipe(
                                    Effect.flatMap(CodeReview => CodeReview.codeReviewFor(file)),
                                    Effect.flatMap(res => {
                                        core.info(`Step6.6: Creating review comment for file: ${file.filename}`); // Debug statement
                                        return PullRequest.pipe(
                                            Effect.flatMap(PullRequest =>
                                                PullRequest.createReviewComment({
                                                    repo,
                                                    owner,
                                                    pull_number: context.payload.number,
                                                    commit_id: context.payload.pull_request?.head.sha,
                                                    path: file.filename,
                                                    body: res.text,
                                                    subject_type: 'file'
                                                })
                                            )
                                        );
                                    })
                                );
                            })
                        )
                    )
                )
            );

            return a;
        }),

        Match.orElse(eventName =>
            Effect.sync(() => {
                core.setFailed(`Step7: Unsupported event. Got: ${eventName}`); // Debug statement
            })
        )
    );

    core.info("Step8: Running the program."); // Debug statement
    const runnable = Effect.provide(program, MainLive);
    const result = await Effect.runPromiseExit(runnable);

    if (Exit.isFailure(result)) {
        core.setFailed(`Step9: Program failed with error: ${result.cause.toString()}`); // Debug statement
    } else {
        core.info("Step9: Program completed successfully."); // Debug statement
    }
};

// Function to fetch instructionsPrompt from a GitHub file
const fetchInstructionsPrompt = async (
    octokit: ReturnType<typeof github.getOctokit>,
    owner: string,
    repo: string,
    filePath: string
): Promise<string> => {
        const response = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: filePath,
        });

        // Log the response structure for debugging
        //core.info(`Response data: ${JSON.stringify(response.data)}`);
        //core.info(`${filePath}`);

        if (response.data && 'content' in response.data) {
            const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
            //core.info(`Fetched instructionsPrompt from ${filePath}:`);
            //core.info(content); // Log the actual content
            return content;
        } else {
            core.setFailed(`Unable to fetch content from ${filePath}. Response data: ${JSON.stringify(response.data)}`);
            return '';
        }
};

const init = (model: BaseChatModel, githubToken: string, instructionsPrompt: string) => {
    const CodeReviewLive = Layer.effect(
        CodeReview,
        Effect.map(DetectLanguage, _ => CodeReview.of(new CodeReviewClass(model, instructionsPrompt)))
    )

    const octokitLive = Layer.succeed(octokitTag, github.getOctokit(githubToken))

    const PullRequestLive = Layer.effect(
        PullRequest,
        Effect.map(octokitTag, _ => PullRequest.of(new PullRequestClass()))
    )

    const mainLive = CodeReviewLive.pipe(
        Layer.merge(PullRequestLive),
        Layer.merge(DetectLanguage.Live),
        Layer.merge(octokitLive),
        Layer.provide(DetectLanguage.Live),
        Layer.provide(octokitLive)
    )

    return mainLive
}

await run()
