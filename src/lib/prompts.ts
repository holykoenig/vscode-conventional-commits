/**
 * @since 2020-03-25 09:09
 * @author vivaxy
 */
const conventionalCommitsTypes: any = {
  types: {
    feat: {
      description: 'A new feature',
      title: 'Features',
    },
    fix: {
      description: 'A bug fix',
      title: 'Bug Fixes',
    },
    docs: {
      description: 'Documentation only changes',
      title: 'Documentation',
    },
    style: {
      description:
        'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
      title: 'Styles',
    },
    refactor: {
      description: 'A code change that neither fixes a bug nor adds a feature',
      title: 'Code Refactoring',
    },
    perf: {
      description: 'A code change that improves performance',
      title: 'Performance Improvements',
    },
    test: {
      description: 'Adding missing tests or correcting existing tests',
      title: 'Tests',
    },
    build: {
      description:
        'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
      title: 'Builds',
    },
    ci: {
      description:
        'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
      title: 'Continuous Integrations',
    },
    chore: {
      description: "Other changes that don't modify src or test files",
      title: 'Chores',
    },
    revert: {
      description: 'Reverts a previous commit',
      title: 'Reverts',
    },
    e2e: {
      description: 'End-2-End Test',
      title: 'e2e',
    },
  },
};

import * as configuration from './configuration';
import promptTypes, { PROMPT_TYPES, Prompt } from './prompts/prompt-types';
import * as names from '../configs/names';
import CommitMessage from './commit-message';
import commitlint from './commitlint';
import * as output from './output';
import { updateConventionalCommits } from './conventional-commits';

export default async function prompts(
  {
    lineBreak,
  }: {
    lineBreak: string;
  },
  repo: any,
): Promise<CommitMessage> {
  debugger;
  console.log(conventionalCommitsTypes);
  const branch = repo.state.HEAD.name;
  const getBranchName = (): string => {
    const regBranch = /.*(TUB-\d+).*/;
    return new RegExp(regBranch).test(branch)
      ? branch.match(regBranch)[1]
      : 'NO-TICKET';
  };

  const getType = (): string => {
    if (branch.includes('feature')) {
      return 'feat';
    } else if (branch.includes('bugfix')) {
      return 'fix';
    }
    return '';
  };

  function lineBreakFormatter(input: string): string {
    if (lineBreak) {
      return input.replace(
        new RegExp(lineBreak.replace(/\\/g, '\\\\'), 'g'),
        '\n',
      );
    }
    return input;
  }

  function getTypeItems() {
    const typeEnum = commitlint.getTypeEnum();
    if (typeEnum.length === 0) {
      return Object.keys(conventionalCommitsTypes.types).map(function (type) {
        const { title } = conventionalCommitsTypes.types[type];
        return {
          label: type,
          description: title,
        };
      });
    }
    return typeEnum.map(function (type) {
      if (type in conventionalCommitsTypes.types) {
        const { title } = conventionalCommitsTypes.types[type];
        return {
          label: type,
          description: title,
        };
      }
      return {
        label: type,
        description: names.DESCRIPTION_OF_AN_ITEM_FROM_COMMITLINT_CONFIG,
      };
    });
  }

  function getScopePrompt() {
    const name = 'scope';
    const placeholder = 'Select the scope of this change.';
    const scopeEnum = commitlint.getScopeEnum();
    if (scopeEnum.length) {
      return {
        type: PROMPT_TYPES.QUICK_PICK,
        name,
        placeholder,
        items: scopeEnum.map(function (scope) {
          return {
            label: scope,
            description: names.DESCRIPTION_OF_AN_ITEM_FROM_COMMITLINT_CONFIG,
            detail: names.DETAIL_OF_AN_ITEM_FROM_COMMITLINT_CONFIG,
          };
        }),
        noneItem: {
          label: 'None',
          description: '',
          detail: 'No scope.',
          alwaysShow: true,
        },
      };
    }

    return {
      type: PROMPT_TYPES.CONFIGURIABLE_QUICK_PICK,
      name,
      placeholder,
      configurationKey: names.SCOPES as keyof configuration.Configuration,
      newItem: {
        label: 'New scope',
        description: '',
        detail:
          'Add a workspace scope. (You can manage scopes in workspace `settings.json`.)',
        alwaysShow: true,
      },
      noneItem: {
        label: 'None',
        description: '',
        detail: 'No scope.',
        alwaysShow: true,
      },
      newItemPlaceholder: 'Create a new scope.',
      validate(input: string) {
        return commitlint.lintScope(input);
      },
    };
  }
  const questions: any = [
    {
      type: PROMPT_TYPES.QUICK_PICK,
      name: 'type',
      placeholder: "Select the type of change that you're committing.",
      value: getType(),
      items: getTypeItems(),
      validate(input: string) {
        return commitlint.lintType(input);
      },
    },
    getScopePrompt(),
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: 'subject',
      placeholder: 'Write a short, imperative tense description of the change.',
      validate(input: string) {
        return commitlint.lintSubject(input);
      },
      format: lineBreakFormatter,
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: 'footer',
      value: getBranchName(),
      validate(input: string) {
        return commitlint.lintFooter(input);
      },
      format: lineBreakFormatter,
    },
  ].map(function (question, index, array) {
    return {
      ...question,
      step: index + 1,
      totalSteps: array.length,
    };
  });

  const commitMessage: CommitMessage = {
    type: '',
    scope: '',
    subject: '',
    footer: '',
  };

  for (const question of questions) {
    // @ts-ignore
    commitMessage[question.name as keyof CommitMessage] = await promptTypes[
      question.type
    ](
      // @ts-ignore
      question,
    );

    updateConventionalCommits(commitMessage);
  }
  return commitMessage;
}
