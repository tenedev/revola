import semver from 'semver';

export function resolveLatestVersion(
  v: (string | undefined | null)[],
  { r = '*', includePrerelease = true }: { r?: string; includePrerelease?: boolean } = {},
) {
  return semver.maxSatisfying(v.filter(Boolean) as string[], r, {
    includePrerelease,
  });
}
