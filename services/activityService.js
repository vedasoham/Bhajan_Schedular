const ActivityLog = require("../models/ActivityLog");

exports.log = async (user, action, details = "") => {

    await ActivityLog.create({
        user,
        action,
        details
    });

};

exports.getRecent = async (limit = 10) => {

    return ActivityLog.findAll({
        limit,
        order: [["createdAt", "DESC"]]
    });

};