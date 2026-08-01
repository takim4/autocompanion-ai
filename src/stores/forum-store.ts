import { create } from "zustand";
import { persist } from "zustand/middleware";
import { FORUM_POSTS as SEED_POSTS, type ForumComment, type ForumPost } from "@/lib/forum-data";

const ME_AUTHOR = "sen";
const ME_AVATAR = "🙂";

interface ForumState {
  posts: ForumPost[];
  likedPostIds: string[];
  likedCommentIds: string[];
  followedUserIds: string[];
  addPost: (input: { title: string; body: string; image?: string }) => ForumPost;
  addComment: (postId: string, content: string) => void;
  toggleLike: (postId: string) => void;
  toggleCommentLike: (postId: string, commentId: string) => void;
  toggleFollow: (userId: string) => void;
}

export const useForumStore = create<ForumState>()(
  persist(
    (set, get) => ({
      posts: SEED_POSTS,
      likedPostIds: [],
      likedCommentIds: [],
      followedUserIds: [],

      addPost: ({ title, body, image }) => {
        const post: ForumPost = {
          id: `local-${Date.now()}`,
          title: title.trim() || body.trim().slice(0, 60),
          tags: [],
          author: ME_AUTHOR,
          avatar: ME_AVATAR,
          excerpt: body.trim().slice(0, 140),
          body: body.trim(),
          image: image ?? "📝",
          likes: 0,
          commentCount: 0,
          time: "şimdi",
          comments: [],
        };
        set({ posts: [post, ...get().posts] });
        return post;
      },

      addComment: (postId, content) => {
        const trimmed = content.trim();
        if (!trimmed) return;
        const comment: ForumComment = {
          id: `c-${Date.now()}`,
          author: ME_AUTHOR,
          avatar: ME_AVATAR,
          content: trimmed,
          time: "şimdi",
          likes: 0,
        };
        set({
          posts: get().posts.map((p) =>
            p.id === postId
              ? { ...p, comments: [...p.comments, comment], commentCount: p.commentCount + 1 }
              : p,
          ),
        });
      },

      toggleLike: (postId) => {
        const liked = get().likedPostIds.includes(postId);
        set({
          likedPostIds: liked
            ? get().likedPostIds.filter((id) => id !== postId)
            : [...get().likedPostIds, postId],
          posts: get().posts.map((p) =>
            p.id === postId ? { ...p, likes: Math.max(0, p.likes + (liked ? -1 : 1)) } : p,
          ),
        });
      },

      toggleCommentLike: (postId, commentId) => {
        const liked = get().likedCommentIds.includes(commentId);
        set({
          likedCommentIds: liked
            ? get().likedCommentIds.filter((id) => id !== commentId)
            : [...get().likedCommentIds, commentId],
          posts: get().posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.map((c) =>
                    c.id === commentId
                      ? { ...c, likes: Math.max(0, c.likes + (liked ? -1 : 1)) }
                      : c,
                  ),
                }
              : p,
          ),
        });
      },

      toggleFollow: (userId) => {
        const following = get().followedUserIds.includes(userId);
        set({
          followedUserIds: following
            ? get().followedUserIds.filter((id) => id !== userId)
            : [...get().followedUserIds, userId],
        });
      },
    }),
    { name: "autosocial-forum" },
  ),
);

export function isImageSrc(value: string) {
  return value.startsWith("blob:") || value.startsWith("http://") || value.startsWith("https://");
}
