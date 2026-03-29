import { useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';
import { Hand, Globe2, Calendar, MessageCircle, Send, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import type { Language, User } from '../../domain/types/app';

interface Reply { id: number; author: string; authorAvatar: string; content: string; time: string; }
interface Post { id: number; author: string; authorAvatar: string; title: string; content: string; language: string; peopleNeeded: number; interested: number; tag: 'languageExchange' | 'studyGroup' | 'event'; time: string; image?: string; expiryDate?: string; replies?: Reply[]; authorId?: string; }
interface BoardPostWithRepliesProps { post: Post; language: Language; user: User; onAddReply: (postId: number, content: string) => void; onToggleInterest?: (postId: number) => void; onDeletePost?: (postId: number) => void; canDelete?: boolean; translations: { until: string; replies: string; replyPlaceholder: string; sendReply: string; viewReplies: string; languageExchange: string; studyGroup: string; event: string; }; }

export function BoardPostWithReplies({ post, language, user, onAddReply, onToggleInterest, onDeletePost, canDelete = false, translations: t }: BoardPostWithRepliesProps) {
  const [showReplies, setShowReplies] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [replyInput, setReplyInput] = useState('');
  const canWrite = user.approved === true;
  const isAnnouncement = post.tag === 'event' && post.peopleNeeded === 0;
  const shouldShowExpandButton = post.content.length > 80;
  const formatPostTime = (raw: string) => {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    if (language === 'ja') {
      return `${year}年${month}月${day}日 ${hours}時${minutes}分`;
    }
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };
  const handleSendReply = () => {
    if (!canWrite) return;
    if (!replyInput.trim()) return;
    onAddReply(post.id, replyInput);
    setReplyInput('');
  };
  const replyCount = post.replies?.length || 0;
  return (
    <Card className={`p-4 hover:shadow-md transition-shadow ${isAnnouncement ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
      <div className="flex gap-4">
        {post.image && <div className="w-24 h-24 shrink-0"><img src={post.image} alt={post.title} className="w-full h-full object-cover rounded-lg" /></div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8"><AvatarFallback className="bg-linear-to-br from-blue-600 to-purple-600 text-white text-xs">{post.authorAvatar}</AvatarFallback></Avatar>
              <div><p className="text-sm text-[#3D3D4E]">{post.author}</p><p className="text-xs text-gray-500">{formatPostTime(post.time)}</p></div>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs ${isAnnouncement ? 'bg-amber-500 text-white' : 'bg-linear-to-r from-[#49B1E4] to-[#49B1E4] text-white'}`}>
              {isAnnouncement ? (language === 'ja' ? 'お知らせ' : 'Announcement') : (post.tag === 'languageExchange' ? t.languageExchange : post.tag === 'studyGroup' ? t.studyGroup : t.event)}
            </div>
          </div>
          <h3 className="text-[#3D3D4E] mb-1">{post.title}</h3>
          <p className={`text-sm text-gray-600 mb-1 ${isContentExpanded ? '' : 'line-clamp-2'}`}>{post.content}</p>
          {shouldShowExpandButton && (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 mb-3 text-[#49B1E4]"
              onClick={() => setIsContentExpanded((prev) => !prev)}
            >
              {isContentExpanded ? (language === 'ja' ? '閉じる' : 'Show less') : (language === 'ja' ? '全文を見る' : 'Read more')}
            </Button>
          )}
          {!shouldShowExpandButton && <div className="mb-3" />}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1"><Globe2 className="w-4 h-4" /><span>{post.language}</span></div>
              <div>{post.peopleNeeded} {language === 'ja' ? '人募集' : 'people needed'}</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onToggleInterest?.(post.id)}
                className="h-auto p-0 text-gray-600 hover:text-[#49B1E4] hover:bg-transparent"
              >
                <div className="flex items-center gap-1"><Hand className="w-4 h-4" /><span>{post.interested}</span></div>
              </Button>
              {post.expiryDate && <div className="flex items-center gap-1 text-xs text-[#49B1E4]"><Calendar className="w-3 h-3" /><span>{post.expiryDate} {t.until}</span></div>}
            </div>
            {canDelete && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDeletePost?.(post.id)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {language === 'ja' ? '削除' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="border-t pt-3 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setShowReplies(!showReplies)} className="text-gray-600 hover:text-[#49B1E4] mb-2"><MessageCircle className="w-4 h-4 mr-2" />{replyCount} {t.replies}{showReplies ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}</Button>
            <div className="flex gap-2 mb-3">
              <Avatar className="w-8 h-8 shrink-0"><AvatarFallback className="bg-linear-to-br from-blue-600 to-purple-600 text-white text-xs">{user.name.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder={t.replyPlaceholder}
                  value={replyInput}
                  disabled={!canWrite}
                  onChange={(e) => setReplyInput(e.target.value)}
                  onKeyPress={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={!canWrite || !replyInput.trim()}
                  size="sm"
                  className="bg-[#49B1E4] hover:bg-[#3A9FD3]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {showReplies && post.replies && post.replies.length > 0 && (
              <div className="space-y-3 mt-3">
                {post.replies.map((reply) => (
                  <div key={reply.id} className="flex gap-2 pl-4">
                    <Avatar className="w-7 h-7 shrink-0"><AvatarFallback className="bg-linear-to-br from-purple-500 to-pink-500 text-white text-xs">{reply.authorAvatar}</AvatarFallback></Avatar>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3"><div className="flex items-center justify-between mb-1"><p className="text-sm text-[#3D3D4E]">{reply.author}</p><p className="text-xs text-gray-500">{reply.time}</p></div><p className="text-sm text-gray-700">{reply.content}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
