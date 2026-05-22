import z, { regexes } from 'zod';

const AuthorSchema = z
  .object({
    name: z.string().default('github-actions[bot]').describe('Name to use for release commits.'),
    email: z
      .email({
        pattern: regexes.unicodeEmail,
      })
      .default('41898282+github-actions[bot]@users.noreply.github.com')
      .describe('Email to use for release commits.'),
  })
  .partial()
  .describe(
    'Overrides Git author identity ONLY for release commits (does not modify global Git config).',
  );

export const GitSchema = z
  .object({
    enable: z.boolean().default(true).describe('Enable or disable Git integration.'),

    cleanWorkingDirectory: z
      .boolean()
      .default(true)
      .describe(
        'If true, Revola will check for a clean working directory before performing versioning operations.',
      ),

    upstream: z
      .boolean()
      .default(true)
      .describe(
        'If true, Revola will check for an upstream branch and push to it by default when pushing new versions.',
      ),

    author: AuthorSchema.default(AuthorSchema.parse({})),

    targetBranch: z
      .string()
      .default('main')
      .describe('The branch on which to perform versioning operations.'),

    add: z
      .boolean()
      .default(true)
      .describe('If true, Revola will stage all changes before committing the new version.'),

    commit: z.boolean().default(true).describe('If true, Revola will commit the new version.'),

    commitMessage: z.string().default('Release {{REVOLA_VERSION}}'),

    push: z
      .boolean()
      .default(true)
      .describe('If true, Revola will push the new version to the remote repository.'),

    tag: z
      .boolean()
      .default(true)
      .describe('If true, Revola will create a Git tag for the new version (e.g: v1.2.3).'),

    tagFormat: z.string().default('v{{REVOLA_VERSION}}').describe('Template for Git tag names.'),

    tagAnnotation: z
      .string()
      .default('Release {{REVOLA_VERSION}}')
      .describe('The annotation to use for Git tags created by Revola.'),

    tagMajor: z
      .boolean()
      .default(false)
      .describe(
        'If true, Revola will create a Git tag for major version releases (e.g: v1.2.3 -> v1).',
      ),

    tagMinor: z
      .boolean()
      .default(false)
      .describe(
        'If true, Revola will create a Git tag for minor version releases (e.g: v1.2.3 -> v1.2).',
      ),
  })
  .partial()
  .describe('Configuration for Git-related settings in Revola.');
