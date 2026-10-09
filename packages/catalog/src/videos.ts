/**
 * Exercises with a real video demo (files in apps/web/public/exercises/<id>.mp4,
 * .webp and .jpg, made with apps/web/scripts/exercise-video.sh). The others
 * keep the drawn animation.
 */
export const exerciseVideos: ReadonlySet<string> = new Set(["squat", "fentes"]);

/** Paths of the video files, relative to the website root. */
export function exerciseVideo(id: string): { mp4: string; webp: string; poster: string } | null {
  if (!exerciseVideos.has(id)) return null;
  return { mp4: `/exercises/${id}.mp4`, webp: `/exercises/${id}.webp`, poster: `/exercises/${id}.jpg` };
}
