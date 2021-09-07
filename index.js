const _ = require('underscore')
const core = require('@actions/core');
const github = require('@actions/github');
const { IncomingWebhook } = require('@slack/webhook');

const sha = process.env.GITHUB_SHA;
const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
const actor = process.env.GITHUB_ACTOR;
const ref = process.env.GITHUB_REF;
const runID = process.env.GITHUB_RUN_ID;
const workflow = process.env.GITHUB_WORKFLOW
const job = process.env.GITHUB_JOB
const event = process.env.GITHUB_EVENT_NAME

const token = process.env.GITHUB_TOKEN;

const statusMap = {
  "success": "Completed",
  "failure": "Failed",
  "cancelled": "Canceled"
};

/**
 * Are we runnign inside jest (testing)
 * @return {boolean} If we are in jest or not.
 */
function areWeTestingWithJest() {
  return process.env.JEST_WORKER_ID !== undefined;
}

/**
 * Get tag, string based check on git ref
 * @return {string} v1.0.01.
 */
function getTag(ref) {
  if (ref.includes("refs/tags")) {
    const tag = ref.split('/').pop();
    return tag
  }

  return false
}

/**
 * Get environment, string based check on git ref
 * @return {string} Prod/Dev or Branch.
 */
function getEnvironment(ref) {
  if (ref.includes("refs/tags")) {
    return 'Prod'
  } else if (ref.includes("refs/heads/main")) {
    return 'Dev'
  } else if (ref.includes("refs/heads/master")) {
    return 'Dev'
  } else {
    return 'Branch'
  }
}

/**
 * Get the job id (Attempt to make it clean)
 * @param {string} job
 * @return {string} The job id .
 */
function getJobName(job) {
  let words = job.split('_');

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    words[i] = word.charAt(0).toUpperCase() + word.slice(1);
  }

  return words.join(' ');
}

/**
 * Get the repo title from the repo string (Attempt to make it clean)
 * @param {string} repo
 * @return {string} The name of the repo.
 */
function getRepositoryTitle(repo) {
  let words = repo.split('-');

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    words[i] = word.charAt(0).toUpperCase() + word.slice(1);
  }

  return words.join(' ');
}

/**
 * Get the short SHA from the full SHA.
 * @param {string} fullSha
 * @return {string} The short SHA.
 */
function getShaShort(fullSha) {
  return fullSha ? fullSha.substring(0, 7) : null;
}

/**
 * Ellipsis a string if over length
 * @param {string} string
 * @param {string} length
 * @return {string} The commit msg ellipsis (ommited)
 */
function ellipsis(string, length) {
  string = string.replace(/\s+/g, ' ').trim();
  if (length == null) {
    length = 100;
  }
  if (string.length > length) {
    return string.substring(0, length - 3) + '...';
  } else {
    return string;
  }
}

/**
 * Get the status code of the github action string.
 * @param {string} status
 * @return {int} An int representation of the status.
 */
function getStatusCode(status) {
  switch (status) {
    case "success":
      return 1;
    case "cancelled":
      return 2;
    case "failure":
      return 3;
    default:
      // return 2 as neutral result
      return 2;
  }
}

/**
 * Get all the commmit/pr messages
 * @param {string} msg
 * @return {Array} messages
 */
async function getCommitMessages() {
  const messages = []

  switch (event) {
    case 'pull_request': {
      const pr_title = github.context.payload.pull_request.title
      const pr_number = github.context.payload.pull_request.number

      const octokit = github.getOctokit(token)

      const commitMessages = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pr_number}/commits', {
        owner,
        repo,
        pr_number,
      })

      if (commitMessages.data[0]) {
        messages[0] = commitMessages.data[commitMessages.data.length - 1].commit.message
      }

      // Push the title of the PR
      messages[1] = pr_title
      break
    }
    case 'push': {
      if (github.context.payload.commits[0]) {
        messages[0] = github.context.payload.commits[github.context.payload.commits.length - 1].message
      }
      messages[1] = ""
      break
    }
  }

  return messages
}

async function run() {

  let url = core.getInput('slack_webhook')
  let status = core.getInput('status')
  let matrix = core.getInput('matrix')

  let matrixSuffix = matrix ? ` (${matrix})` : ''

  let statusCode = getStatusCode(status);

  var buttonStyle = ''
  var emojiIcon = ':o:'

  if (statusCode === 1) {
    buttonStyle = "primary"
    emojiIcon = ":rocket:"
  } else if (statusCode === 3) {
    buttonStyle = "danger"
    emojiIcon = ":x:"
  }

  let environment = getEnvironment(ref);
  let version = getTag(ref);

  const repoTitle = getRepositoryTitle(repo)

  const jobName = getJobName(job)
  const [commit_msg, pr_title] = await getCommitMessages()

  let messageTemplate = ''
  if (pr_title != "") {
    const pr_number = github.context.payload.pull_request.number
    messageTemplate = `<https://github.com/${owner}/${repo}/pull/${pr_number}| *${pr_title}* > \n _${ellipsis(commit_msg, 100)}_`
  } else {
    messageTemplate = `<https://github.com/${owner}/${repo}/commit/${sha}| *${ellipsis(commit_msg, 100)}* >`
  }

  let hasVersion = true;

  // Initialize with defaults
  const webhook = new IncomingWebhook(url, {});

  const msg = {
    "text": `${emojiIcon} ${repoTitle} - ${statusMap[status]} - ${environment} ${matrixSuffix} `,
    "blocks": [
      {
        "type": "header",
        "text": {
          "type": "plain_text",
          "text": `${emojiIcon} ${repoTitle} - ${statusMap[status]} ${matrixSuffix}`
        }
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `${messageTemplate}`
        }
      },
      {
        "type": "context",
        "elements": [
          {
            "text": `*Environment*: ${environment}`,
            "type": "mrkdwn",
            ...version && {
              "text": `*Version*: ${version}`,
              "type": "mrkdwn"
            },
          },
          {
            "text": `*Commit*: ${getShaShort(sha)}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Author*: ${actor}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Workflow*: ${workflow}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Job*: ${jobName}`,
            "type": "mrkdwn"
          },
          {
            "text": `*Run ID*: ${runID}`,
            "type": "mrkdwn"
          }
        ]
      },
      {
        "type": "actions",
        "elements": [{
          "type": "button",
          "url": `https://github.com/${owner}/${repo}/actions/runs/${runID}`,
          "text": {
            "type": "plain_text",
            "emoji": true,
            "text": statusCode === 1 ? 'View Log' : 'View Log'
          },
          ...buttonStyle && {
            "style": buttonStyle,
          },
        }
        ]
      }
    ]
  };

  // Send the notification
  (async () => {
    await webhook.send(msg);
  })();
}

run();
