import { config } from 'dotenv'
import * as core from '@actions/core'
import * as github from '@actions/github'
import type { PullRequestEvent } from '@octokit/webhooks-definitions/schema.js'
import { ChatOpenAI } from 'langchain/chat_models'
import { BaseChatModel } from 'langchain/chat_models'
import { Effect, Layer, Match, pipe, Exit } from 'effect'
import { CodeReview, CodeReviewClass, DetectLanguage, octokitTag, PullRequest, PullRequestClass } from './helpers.js'

config()
let isBlockExecuted = false; // Flag to ensure the block runs only once
export const run = async (): Promise<void> => {
    if (isBlockExecuted) return; // Exit if the block has already been executed
    isBlockExecuted = true; // Set the flag to true
  const openAIApiKey = core.getInput('openai_api_key')
  const githubToken = core.getInput('github_token')
  const modelName = core.getInput('model_name')
  const temperature = parseInt(core.getInput('model_temperature'))
//   const azureOpenAIApiKey = core.getInput('azure_openai_api_key')
//   const azureOpenAIApiInstanceName = core.getInput('azure_openai_api_instance_name')
//   const azureOpenAIApiDeploymentName = core.getInput('azure_openai_api_deployment_name')
//   const azureOpenAIApiVersion = core.getInput('azure_openai_api_version')

  const context = github.context
  const { owner, repo } = context.repo

  const model: BaseChatModel = new ChatOpenAI({
    temperature,
    openAIApiKey,
    modelName,
    // azureOpenAIApiKey,
    // azureOpenAIApiInstanceName,
    // azureOpenAIApiDeploymentName,
    // azureOpenAIApiVersion
  })

  const MainLive = init(model, githubToken)
  core.info(`Debug: MainLive object: ${JSON.stringify(MainLive, null, 2)}`); // Debug statement for MainLive

  const program = Match.value(context.eventName).pipe(
    Match.when('pull_request', () => {
        const excludeFilePatterns = pipe(
            Effect.sync(() => github.context.payload as PullRequestEvent),
            Effect.tap(pullRequestPayload =>
                Effect.sync(() => {
                    core.info(
                        `repoName: ${repo} pull_number: ${context.payload.number} owner: ${owner} sha: ${pullRequestPayload.pull_request.head.sha}`
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
            Effect.flatMap(filePattens =>
                PullRequest.pipe(
                    Effect.flatMap(PullRequest =>
                        PullRequest.getFilesForReview(owner, repo, context.payload.number, filePattens)
                    ),
                    Effect.flatMap(files => Effect.sync(() => files.filter(file => file.patch !== undefined))),
                    Effect.flatMap(files =>
                        Effect.forEach(files, file =>
                            CodeReview.pipe(
                                Effect.flatMap(CodeReview => CodeReview.codeReviewFor(file)),
                                Effect.flatMap(res => {
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
                            )
                        )
                    )
                )
            )
        );

        return a;
    }),

    Match.orElse(eventName =>
        Effect.sync(() => {
            core.setFailed(`This action only works on pull_request events. Got: ${eventName}`);
        })
    )
);

core.info(`Debug: Program object: ${JSON.stringify(program, null, 2)}`); // Debug statement for program

const runnable = Effect.provide(program, MainLive);
core.info(`Debug: Runnable object: ${JSON.stringify(runnable, null, 2)}`); // Debug statement for runnable

const result = await Effect.runPromiseExit(runnable);
core.info(`Debug: result: ${JSON.stringify(result, null, 2)}`);

if (Exit.isFailure(result)) {
    core.setFailed(result.cause.toString());
} else {
    core.info("Debug: Program executed successfully."); // Debug statement for successful execution
}
}

const init = (model: BaseChatModel, githubToken: string) => {
  const CodeReviewLive = Layer.effect(
    CodeReview,
    Effect.map(DetectLanguage, _ => CodeReview.of(new CodeReviewClass(model)))
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