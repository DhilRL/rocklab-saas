export function normalizePayrollMode(payModel) {
  if (payModel === "rank_only") return "rank_only";

  if (
    payModel === "rank_only_with_milestones" ||
    payModel === "milestone_only"
  ) {
    return "rank_only_with_milestones";
  }

  if (payModel === "shift_override") return "shift_override";

  if (
    payModel === "shift_override_with_milestones" ||
    payModel === "shift_override_with_milestone"
  ) {
    return "shift_override_with_milestones";
  }

  return "rank_only";
}

export function getRankConfig(payrollSettings, staffRank) {
  return payrollSettings?.ranks?.[staffRank] || {
    baseRate: 0,
    milestones: [],
  };
}

export function getShiftOverrideRate(shiftTypes = [], shiftTypeId, staffRank) {
  const shiftType = shiftTypes.find((item) => item.id === shiftTypeId);
  if (!shiftType) return null;

  const raw = shiftType?.overrideRates?.[staffRank];
  if (raw === "" || raw === null || raw === undefined) return null;

  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function getMatchedMilestone(rankConfig, monthlyHours) {
  const milestones = Array.isArray(rankConfig?.milestones)
    ? [...rankConfig.milestones]
    : [];

  milestones.sort((a, b) => Number(a.minHours || 0) - Number(b.minHours || 0));

  let matched = null;

  for (const milestone of milestones) {
    const minHours = Number(milestone?.minHours || 0);
    if (monthlyHours >= minHours) {
      matched = {
        minHours,
        rate: Number(milestone?.rate || 0),
      };
    }
  }

  return matched;
}

export function resolveShiftHourlyRate({
  payrollSettings,
  shiftTypes = [],
  shiftTypeId,
  staffRank,
  monthlyHours = 0,
}) {
  const payModel = normalizePayrollMode(payrollSettings?.payModel);
  const rankConfig = getRankConfig(payrollSettings, staffRank);

  const baseRate = Number(rankConfig?.baseRate || 0);
  const shiftOverrideRate = getShiftOverrideRate(shiftTypes, shiftTypeId, staffRank);
  const matchedMilestone = getMatchedMilestone(rankConfig, monthlyHours);

  let resolvedHourlyRate = baseRate;
  let resolvedPayMode = payModel;
  let resolutionSource = "rank_base";

  if (payModel === "rank_only") {
    resolvedHourlyRate = baseRate;
    resolutionSource = "rank_base";
  }

  if (payModel === "rank_only_with_milestones") {
    resolvedHourlyRate = baseRate;
    resolutionSource = "rank_base";

    if (matchedMilestone) {
      resolvedHourlyRate = matchedMilestone.rate;
      resolutionSource = "rank_milestone";
    }
  }

  if (payModel === "shift_override") {
    if (shiftOverrideRate !== null) {
      resolvedHourlyRate = shiftOverrideRate;
      resolutionSource = "shift_override";
    } else {
      resolvedHourlyRate = baseRate;
      resolutionSource = "rank_base";
    }
  }

  if (payModel === "shift_override_with_milestones") {
    if (shiftOverrideRate !== null) {
      resolvedHourlyRate = shiftOverrideRate;
      resolutionSource = "shift_override";
    } else {
      resolvedHourlyRate = baseRate;
      resolutionSource = "rank_base";
    }

    if (matchedMilestone) {
      resolvedHourlyRate = matchedMilestone.rate;
      resolutionSource = "milestone_replaced_final_rate";
    }
  }

  return {
    resolvedHourlyRate,
    resolvedPayMode,
    resolutionSource,
    baseRate,
    shiftOverrideRate,
    matchedMilestone,
    resolvedFromRank: staffRank || "",
    resolvedFromShiftType: shiftTypeId || "",
    resolvedMilestoneHours: matchedMilestone?.minHours ?? null,
    resolvedMilestoneRate: matchedMilestone?.rate ?? null,
  };
}