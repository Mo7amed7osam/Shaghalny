const studentHasRequiredVerifiedSkills = (student, job) => {
    const requiredSkills = (job?.requiredSkills || []).map((skill) => skill.toString());
    if (requiredSkills.length === 0) {
        return true;
    }

    const verifiedSkills = new Set(
        (student?.verifiedSkills || []).map((entry) => entry?.skill?.toString()).filter(Boolean)
    );

    return requiredSkills.every((skillId) => verifiedSkills.has(skillId));
};

module.exports = {
    studentHasRequiredVerifiedSkills,
};
