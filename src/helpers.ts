import { GitHub } from '@actions/github/lib/utils.js'
import type { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods/dist-types/generated/parameters-and-response-types.js'
import { minimatch } from 'minimatch'
import * as core from '@actions/core'
import {extensionToLanguageMap} from './constants.js'
import { Effect, Context, Option, Layer, Schedule } from 'effect'
import { ChatPromptTemplate, HumanMessagePromptTemplate, SystemMessagePromptTemplate } from 'langchain/prompts'
import {LLMChain} from 'langchain/chains'
import { BaseChatModel } from 'langchain/chat_models'
import type { ChainValues } from 'langchain/schema'
import parseDiff from 'parse-diff'
import { NoSuchElementException, UnknownException } from 'effect/Cause'
import { constant } from 'effect/Function'
import { systemPromptDotNetReviewer, systemPromptJavaReviewer, systemPromptReactReduxReviewer, systemPromptPythonReviewer,
    systemPromptTypeScriptReviewer, systemPromptSecurityScannerCSharp, systemPromptSecurityScannerJava, systemPromptSecurityScannerPython } from './constants.js'

/**
 * Returns the corresponding systemPrompt based on the given systemProfile.
 * @param systemProfile - The profile name (e.g., 'dotnet', 'java', 'react-redux').
 * @returns The corresponding systemPrompt string.
 */
export const getSystemPrompt = (systemProfile: string): string => {
    switch (systemProfile.toLowerCase()) {
        case 'dot_net_reviewer':
            return systemPromptDotNetReviewer;
        case 'java_reviewer':
            return systemPromptJavaReviewer;
        case 'react_redux_reviewer':
            return systemPromptReactReduxReviewer;
        case 'python_reviewer':
              return systemPromptPythonReviewer;
        case 'typescript_reviewer':
              return systemPromptTypeScriptReviewer;
        case 'security_scanner_csharp':
            return systemPromptSecurityScannerCSharp;
        case 'security_scanner_java':
            return systemPromptSecurityScannerJava;
        case 'security_scanner_python':
              return systemPromptSecurityScannerPython;
        default:
            throw new Error(`Unsupported system profile: ${systemProfile}`);
    }
};

export type PullRequestFileResponse = RestEndpointMethodTypes['pulls']['listFiles']['response']

export type PullRequestFile = ArrElement<PullRequestFileResponse['data']>
type CreateReviewCommentRequest = RestEndpointMethodTypes['pulls']['createReviewComment']['parameters']

type CreateReviewRequest = RestEndpointMethodTypes['pulls']['createReview']['parameters']
export type prCommitId = string | null

export interface PullRequest {
  getFilesForReview: (
    owner: string,
    repo: string,
    pullNumber: number,
    excludeFilePatterns: string[]
  ) => Effect.Effect<PullRequestFile[], UnknownException, InstanceType<typeof GitHub>>
  createReviewComment: (
    requestOptions: CreateReviewCommentRequest
  ) => Effect.Effect<void, unknown, InstanceType<typeof GitHub>>
  createReview: (requestOptions: CreateReviewRequest) => Effect.Effect<void, unknown, InstanceType<typeof GitHub>>
  getPullRequestCommitId: (
    owner: string,
    repo: string,
    pull_number: number
  ) => Effect.Effect<prCommitId, UnknownException, InstanceType<typeof GitHub>>
}

export const octokitTag = Context.GenericTag<InstanceType<typeof GitHub>>('octokit')

export const PullRequest = Context.GenericTag<PullRequest>('PullRequest')
export class PullRequestClass implements PullRequest {
  getFilesForReview = (
    owner: string,
    repo: string,
    pullNumber: number,
    excludeFilePatterns: string[]
  ): Effect.Effect<PullRequestFile[], UnknownException, InstanceType<typeof GitHub>> => {
    const program = octokitTag.pipe(
      Effect.flatMap(octokit =>
        Effect.retry(
          Effect.tryPromise(() =>
            octokit.rest.pulls.listFiles({ owner, repo, pull_number: pullNumber, per_page: 100 })
          ),
          exponentialBackoffWithJitter(3)
        )
      ),
      Effect.tap(pullRequestFiles =>
        Effect.sync(() =>
          core.info(
            `Original files for review ${pullRequestFiles.data.length}: ${pullRequestFiles.data.map(_ => _.filename)}`
          )
        )
      ),
      Effect.flatMap(pullRequestFiles =>
        Effect.sync(() =>
          pullRequestFiles.data.filter(file => {
            return (
              excludeFilePatterns.every(pattern => !minimatch(file.filename, pattern, { matchBase: true })) &&
              (file.status === 'modified' || file.status === 'added' || file.status === 'changed')
            )
          })
        )
      ),
      Effect.tap(filteredFiles =>
        Effect.sync(() =>
          core.info(`Filtered files for review ${filteredFiles.length}: ${filteredFiles.map(_ => _.filename)}`)
        )
      )
    )

    return program
  }

  createReviewComment = (
    requestOptions: CreateReviewCommentRequest
  ): Effect.Effect<void, Error, InstanceType<typeof GitHub>> =>
    octokitTag.pipe(
      Effect.tap(_ => core.info(`Creating review comment: ${JSON.stringify(requestOptions)}`)),
      Effect.flatMap(octokit =>
        Effect.retry(
          Effect.tryPromise(() => octokit.rest.pulls.createReviewComment(requestOptions)),
          exponentialBackoffWithJitter(3)
        )
      )
    )

  createReview = (requestOptions: CreateReviewRequest): Effect.Effect<void, Error, InstanceType<typeof GitHub>> =>
    octokitTag.pipe(
      Effect.flatMap(octokit =>
        Effect.retry(
          Effect.tryPromise(() => octokit.rest.pulls.createReview(requestOptions)),
          exponentialBackoffWithJitter(3)
        )
      )
    )

    getPullRequestCommitId = (
    owner: string,
    repo: string,
    pull_number: number
  ): Effect.Effect<prCommitId, UnknownException, InstanceType<typeof GitHub>> => {
    const commitid = octokitTag.pipe(
      Effect.flatMap(octokit =>
        Effect.retry(
          Effect.tryPromise(() => octokit.rest.pulls.get({ owner, repo, pull_number })).pipe(
            Effect.map(response => response.data.head.sha)
          ),
          exponentialBackoffWithJitter(3)
        )
      )
    )
    return commitid
  }

}


const LanguageDetection = Effect.sync(() => {
  return {
    detectLanguage: (filename: string): Option.Option<Language> => {
      const extension = getFileExtension(filename)
      return Option.fromNullable(extensionToLanguageMap[extension as LanguageKey])
    }
  }
})

export class DetectLanguage extends Context.Tag('DetectLanguage')<
  DetectLanguage,
  Effect.Effect.Success<typeof LanguageDetection>
>() {
  static Live = Layer.effect(this, LanguageDetection)
}

const getFileExtension = (filename: string): string => {
  const extension = filename.split('.').pop()
  return extension ? extension : ''
}


type LanguageKey = keyof typeof extensionToLanguageMap
export type Language = (typeof extensionToLanguageMap)[LanguageKey]



export interface CodeReview {
  codeReviewFor(
    file: PullRequestFile
  ): Effect.Effect<ChainValues, NoSuchElementException | UnknownException, DetectLanguage>

}

export const CodeReview = Context.GenericTag<CodeReview>('CodeReview')

export class CodeReviewClass implements CodeReview {
    private llm: BaseChatModel
    private chatPrompt: ChatPromptTemplate
    private chain: LLMChain<string>
    private instructionsPrompt: string
    private systemPrompt: string

    constructor(llm: BaseChatModel, instructionsPrompt: string, systemPrompt: string ) {
        this.llm = llm
        this.instructionsPrompt = instructionsPrompt
        this.systemPrompt = systemPrompt
        core.info(`System prompt: ${this.systemPrompt}`)
        this.chatPrompt = ChatPromptTemplate.fromPromptMessages([
            SystemMessagePromptTemplate.fromTemplate(this.systemPrompt),
            HumanMessagePromptTemplate.fromTemplate(this.instructionsPrompt)
        ])
        this.chain = new LLMChain({
            prompt: this.chatPrompt,
            llm: this.llm
        })
    }

    codeReviewFor = (
        file: PullRequestFile
    ): Effect.Effect<ChainValues, NoSuchElementException | UnknownException, DetectLanguage> =>
        DetectLanguage.pipe(
            Effect.flatMap(DetectLanguage => DetectLanguage.detectLanguage(file.filename)),
            Effect.flatMap(lang =>
                Effect.retry(
                    Effect.tryPromise(() => this.chain.call({ lang, diff: file.patch })),
                    exponentialBackoffWithJitter(3)
                )
            )
        )
}

export type ArrElement<ArrType> = ArrType extends readonly (infer ElementType)[] ? ElementType : never

export const exponentialBackoffWithJitter = (retries = 3) =>
    Schedule.recurs(retries).pipe(Schedule.compose(Schedule.exponential(1000, 2)), Schedule.jittered)

  const RETRIES = 3

  export const retryWithBackoff = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
    Effect.retry(effect, exponentialBackoffWithJitter(RETRIES))
