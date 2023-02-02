import * as core from '@actions/core'
import * as github from '@actions/github'
const { Octokit } = require("@octokit/rest");
import {computeCoverage} from './computeCoverage'

const KEY_COVERAGE_REPORT_PATH = 'coverage_report_path'
const IDENTIFIER = "513410c6-a258-11ed-a8fc-0242ac120002"

async function run(): Promise<void> {
  try {
    const coverageReportPath: string = core.getInput(KEY_COVERAGE_REPORT_PATH)
    core.info(`Coverage report path: ${coverageReportPath}.`)

    if (!coverageReportPath) {
      core.setFailed('❌ Coverage report path not provided')
      return
    }

    const annotations = await computeCoverage(coverageReportPath)

    const token = core.getInput('github_token') || process.env.GITHUB_TOKEN

    if (!token) {
      core.setFailed('❌ Missing Github token')
      return
    }

    const pullRequest = github.context.payload.pull_request
    const headSha = (pullRequest && pullRequest.head.sha) || github.context.sha
    const link = (pullRequest && pullRequest.html_url) || github.context.ref
    const isSuccessful = annotations.length === 0
    const conclusion: 'success' | 'failure' = isSuccessful
      ? 'success'
      : 'failure'
    const summary = isSuccessful
      ? 'Coverage stayed at 100%'
      : 'Coverage dropped'
    const status: 'completed' = 'completed'
    core.info(
      `ℹ️ Posting status '${status}' with conclusion '${conclusion}' to ${link} (sha: ${headSha})`
    )

    const createCheckRequest = {
      ...github.context.repo,
      name: 'Code Coverage',
      head_sha: headSha,
      status,
      conclusion,
      output: {
        title: 'Coverage check',
        summary,
        annotations: annotations.slice(0, 50)
      }
    }

    const octokit = github.getOctokit(token)
    const checkRequest = await octokit.checks.create(createCheckRequest);

    if (pullRequest) {
        const {
            repo: {repo: repoName, owner: repoOwner},
            runId: runId
        } = github.context
        const defaultParameter = {
            repo: repoName,
            owner: repoOwner
        }
        // Find unique comments
        const {data: comments} = await octokit.issues.listComments({
            ...defaultParameter,
            issue_number: pullRequest.number
        })
        const targetComment = comments.find(c => {
            return c.body.includes(IDENTIFIER)
        })
        // Delete previous comment if exist
        if (targetComment) {
            await octokit.issues.deleteComment({
                ...defaultParameter,
                comment_id: targetComment.id
            })
            core.info("Comment successfully delete for id: " + targetComment.id)
        }
        if (!isSuccessful) {
            const checkId = checkRequest.data.id
            // Create comment
            await octokit.issues.createComment({
                ...defaultParameter,
                issue_number: pullRequest.number,
                body: "Uh-oh! Coverage dropped: https://github.com/" + repoOwner + "/" + repoName + "/runs/" + checkId + " <!--  " + IDENTIFIER + " -->"
            })
        }
    }
    if (!isSuccessful) {
      core.setFailed('❌ Coverage dropped')
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
