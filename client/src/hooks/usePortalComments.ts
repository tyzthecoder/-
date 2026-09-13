import { useEffect, useState } from 'react';
import { getSocket } from './useSocket';
import { getComments, postComment, type CommentDTO } from '../api/client';

export function usePortalComments(templateId: string | null) {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getComments(templateId)
      .then((res) => {
        if (!cancelled) setComments(res.comments);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load comments.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const socket = getSocket();
    socket.emit('portal:subscribe', templateId);
    const onNew = (payload: { templateId: string; comment: CommentDTO }) => {
      if (payload.templateId !== templateId) return;
      setComments((prev) => {
        if (prev.some((c) => c.id === payload.comment.id)) return prev;
        return [...prev, payload.comment];
      });
    };
    socket.on('comment:new', onNew);

    return () => {
      cancelled = true;
      socket.emit('portal:unsubscribe', templateId);
      socket.off('comment:new', onNew);
    };
  }, [templateId]);

  async function submit(body: string) {
    if (!templateId) return;
    const res = await postComment(templateId, body);
    setComments((prev) => (prev.some((c) => c.id === res.comment.id) ? prev : [...prev, res.comment]));
    return res;
  }

  return { comments, loading, error, submit };
}
