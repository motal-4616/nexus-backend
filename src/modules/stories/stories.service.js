const Story = require("../../models/Story.model");
const Friendship = require("../../models/Friendship.model");

const createStory = async (authorId, file, duration, audience = "public") => {
    if (!file) {
        throw Object.assign(new Error("Story requires an image or video"), {
            status: 400,
        });
    }

    const hours = [1, 4, 8, 12, 24].includes(Number(duration))
        ? Number(duration)
        : 24;

    const media = {
        url: file.path,
        publicId: file.filename,
        type: file.mimetype?.startsWith("video") ? "video" : "image",
    };

    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    const validAudience = ["public", "friends", "private"].includes(audience)
        ? audience
        : "public";

    const story = await Story.create({
        author: authorId,
        media,
        duration: hours,
        expiresAt,
        audience: validAudience,
    });

    return Story.findById(story._id).populate("author", "name username avatar");
};

const getFeedStories = async (userId) => {
    // Get friend IDs
    const friendships = await Friendship.find({
        $or: [{ requester: userId }, { recipient: userId }],
        status: "accepted",
    }).lean();

    const friendIds = friendships.map((f) =>
        f.requester.toString() === userId.toString()
            ? f.recipient
            : f.requester,
    );

    // Include own stories
    friendIds.push(userId);

    const stories = await Story.find({
        author: { $in: friendIds },
        expiresAt: { $gt: new Date() },
        $or: [
            { audience: "public" },
            { audience: { $exists: false } },
            { audience: null },
            { audience: "friends" },
            { author: userId, audience: "private" },
        ],
    })
        .sort({ createdAt: -1 })
        .populate("author", "name username avatar")
        .lean();

    // Group by author
    const grouped = {};
    for (const story of stories) {
        const aid = story.author._id.toString();
        if (!grouped[aid]) {
            grouped[aid] = {
                user: story.author,
                stories: [],
            };
        }
        grouped[aid].stories.push({
            ...story,
            isViewed: story.views?.some(
                (id) => id.toString() === userId.toString(),
            ),
        });
    }

    return Object.values(grouped);
};

const viewStory = async (storyId, userId) => {
    const story = await Story.findById(storyId);
    if (!story) return null;

    if (!story.views.some((id) => id.toString() === userId.toString())) {
        story.views.push(userId);
        await story.save();
    }

    return { viewsCount: story.views.length };
};

module.exports = { createStory, getFeedStories, viewStory };
