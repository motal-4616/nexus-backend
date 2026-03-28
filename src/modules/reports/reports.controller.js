const Report = require("../../models/Report.model");
const { sendResponse, sendError } = require("../../utils/response.util");

const createReport = async (req, res) => {
    try {
        const { targetType, targetId, reason } = req.body;
        if (!targetType || !targetId || !reason) {
            return sendError(res, 400, "targetType, targetId and reason are required");
        }

        const reportData = {
            reporter: req.user._id,
            targetType,
            reason,
        };

        if (targetType === "post") reportData.targetPost = targetId;
        else if (targetType === "user") reportData.targetUser = targetId;
        else return sendError(res, 400, "targetType must be 'post' or 'user'");

        const report = await Report.create(reportData);
        sendResponse(res, 201, "Report submitted", report);
    } catch (err) {
        sendError(res, 500, err.message);
    }
};

module.exports = { createReport };
