const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/i;

const DURATION_MULTIPLIERS = {
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
  ms: 1,
  s: 1000,
};

function durationToMilliseconds(value) {
  const normalizedValue = String(value).trim();
  const match = normalizedValue.match(DURATION_PATTERN);

  if (!match) {
    throw new Error(
      `Unsupported duration format "${value}". Use values like 15m, 1h, or 30d.`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  return amount * DURATION_MULTIPLIERS[unit];
}

module.exports = { durationToMilliseconds };
