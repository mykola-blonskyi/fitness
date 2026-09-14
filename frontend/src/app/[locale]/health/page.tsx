// CI's deploy gate reads this to prove a push reached production. 'unknown'
// means Coolify's "Include Source Commit in Build" toggle (ADR-006) is off.
// Not ??: Next drops an empty-string `other` value, emitting no tag at all,
// and an empty SENTRY_RELEASE is a failure this project has already had once.
export const metadata = {
  other: { release: process.env.SENTRY_RELEASE || 'unknown' },
};

export default function HealthPage() {
  return <p>ok</p>;
}
