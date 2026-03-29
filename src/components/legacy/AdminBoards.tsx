import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EyeOff, User, MessageSquare, Trash2, Plus, Pin } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { Language, BoardPost } from '../../domain/types/app';

interface AdminBoardsProps {
  language: Language;
  adminUserId?: string;
  adminName?: string;
  boardPosts?: BoardPost[];
  onUpdateBoardPosts?: (posts: BoardPost[]) => void;
  onCreateBoardPost?: (post: Omit<BoardPost, 'id' | 'replies'>) => Promise<void>;
  onDeleteBoardPost?: (postId: number) => Promise<void>;
  onSetPinnedBoardPost?: (postId: number | null) => Promise<void>;
}

const translations = {
  ja: { title: '掲示板管理', allPosts: 'すべての投稿', hidden: '非表示', delete: '削除する', pin: 'ピン留め', unpin: 'ピン解除', deleteReason: '削除する理由', reasonInappropriate: '内容が不適切だと判断されたため。', reasonDuplicate: '同じ内容の掲示板が存在するため。', createPost: '運営投稿', postTitle: 'タイトル', postContent: '内容', submit: '投稿する', cancel: 'キャンセル' },
  en: { title: 'Board Management', allPosts: 'All Posts', hidden: 'Hidden', delete: 'Delete', pin: 'Pin', unpin: 'Unpin', deleteReason: 'Reason for deletion', reasonInappropriate: 'Judged as inappropriate content.', reasonDuplicate: 'Duplicate post exists.', createPost: 'Admin Post', postTitle: 'Title', postContent: 'Content', submit: 'Submit', cancel: 'Cancel' }
};

export function AdminBoards({ language, adminUserId = 'admin', adminName, boardPosts = [], onUpdateBoardPosts = () => {}, onCreateBoardPost, onDeleteBoardPost, onSetPinnedBoardPost }: AdminBoardsProps) {
  const t = translations[language];
  const [deleteReasons, setDeleteReasons] = useState({ inappropriate: false, duplicate: false });
  const [posts, setPosts] = useState(boardPosts);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; postId: number | null; action: 'delete' | null; }>({ isOpen: false, postId: null, action: null });
  const openDialog = (postId: number) => { setDeleteReasons({ inappropriate: false, duplicate: false }); setDialogState({ isOpen: true, postId, action: 'delete' }); };
  const closeDialog = () => { setDialogState({ isOpen: false, postId: null, action: null }); setDeleteReasons({ inappropriate: false, duplicate: false }); };

  useEffect(() => {
    setPosts(boardPosts);
  }, [boardPosts]);

  const handleConfirmAction = async () => {
    if (dialogState.postId === null) return;
    if (onDeleteBoardPost) await onDeleteBoardPost(dialogState.postId);
    else {
      const updated = posts.map((p) => p.id === dialogState.postId ? { ...p, isDeleted: true } : p);
      setPosts(updated); onUpdateBoardPosts(updated);
    }
    closeDialog();
  };

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    const postPayload: Omit<BoardPost, 'id' | 'replies'> = {
      authorId: adminUserId,
      author: adminName || (language === 'ja' ? '運営' : 'Admin'),
      authorAvatar: (adminName || 'AD').substring(0, 2).toUpperCase(),
      title: newPost.title.trim(),
      content: newPost.content.trim(),
      language: language === 'ja' ? '日本語' : 'English',
      peopleNeeded: 0,
      interested: 0,
      tag: 'event',
      time: new Date().toISOString(),
      displayType: 'board',
      expiryDate: '',
      isHidden: false,
      isDeleted: false,
    };
    if (onCreateBoardPost) {
      await onCreateBoardPost(postPayload);
    } else {
      const localPost: BoardPost = {
        ...postPayload,
        id: (posts.length ? Math.max(...posts.map((p) => p.id)) : 0) + 1,
        replies: [],
      };
      const updated = [localPost, ...posts];
      setPosts(updated);
      onUpdateBoardPosts(updated);
    }
    setNewPost({ title: '', content: '' });
    setIsCreateDialogOpen(false);
  };

  const handleTogglePin = async (post: BoardPost) => {
    const nextPinned = post.isPinned ? null : post.id;
    if (onSetPinnedBoardPost) {
      await onSetPinnedBoardPost(nextPinned);
      return;
    }
    const updated = posts.map((p) => ({ ...p, isPinned: p.id === nextPinned }));
    setPosts(updated);
    onUpdateBoardPosts(updated);
  };

  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-blue-100 text-blue-800' : category === 'regular-international' ? 'bg-purple-100 text-purple-800' : category === 'exchange' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800';
  const getCategoryLabel = (category: string) => category === 'japanese' ? (language === 'ja' ? '日本人学生・国内学生' : 'Japanese') : category === 'regular-international' ? (language === 'ja' ? '正規留学生' : 'Regular') : category === 'exchange' ? (language === 'ja' ? '交換留学生' : 'Exchange') : '';
  const isAnnouncementPost = (post: BoardPost) => post.tag === 'event' && post.peopleNeeded === 0;
  const getPostTimeValue = (post: BoardPost) => {
    const parsed = new Date(post.time).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const displayPosts = [...posts.filter((p) => !p.isDeleted)].sort((a, b) => {
    const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
    if (pinDiff !== 0) return pinDiff;
    const announcementDiff = Number(isAnnouncementPost(b)) - Number(isAnnouncementPost(a));
    if (announcementDiff !== 0) return announcementDiff;
    return getPostTimeValue(b) - getPostTimeValue(a);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{displayPosts.length} {t.allPosts}</Badge>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white">
              <Plus className="w-4 h-4 mr-2" />
              {t.createPost}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.createPost}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2"><Input placeholder={t.postTitle} value={newPost.title} onChange={(e) => setNewPost((prev) => ({ ...prev, title: e.target.value }))} /></div>
              <div className="space-y-2"><Textarea placeholder={t.postContent} value={newPost.content} rows={5} onChange={(e) => setNewPost((prev) => ({ ...prev, content: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t.cancel}</Button>
              <Button className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white" onClick={handleCreatePost}>{t.submit}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {displayPosts.map((post) => (
          <Card key={post.id} className={`hover:shadow-lg transition-shadow ${post.isHidden ? 'bg-gray-50 border-gray-300' : ''} ${post.tag === 'event' && post.peopleNeeded === 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className={post.isHidden ? 'text-gray-500' : ''}>{post.title}</CardTitle>
                    {post.isPinned && <Pin className="w-4 h-4 text-[#3D3D4E] fill-[#3D3D4E]" />}
                    {post.tag === 'event' && post.peopleNeeded === 0 && <Badge className="bg-amber-500 text-white">{language === 'ja' ? 'お知らせ' : 'Announcement'}</Badge>}
                    {post.isHidden && <Badge variant="secondary" className="bg-gray-200 text-gray-700"><EyeOff className="w-3 h-3 mr-1" />{t.hidden}</Badge>}
                  </div>
                  <CardDescription className={post.isHidden ? 'line-through' : ''}>{post.content}</CardDescription>
                </div>
                <div className="ml-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openDialog(post.id)} className="border-[#A5D8F3] text-[#49B1E4] hover:bg-[#E8F6FC]"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-1"><User className="w-4 h-4" />{post.author}</div>
                <Badge className={getCategoryColor(post.category ?? 'other')}>{getCategoryLabel(post.category ?? 'other')}</Badge>
                <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{post.date}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleTogglePin(post)}
                aria-label={post.isPinned ? t.unpin : t.pin}
                title={post.isPinned ? t.unpin : t.pin}
                className={post.isPinned ? 'border-[#3D3D4E] text-[#3D3D4E] hover:bg-gray-100 px-2' : 'border-gray-300 text-gray-700 px-2'}
              >
                <Pin className={`w-4 h-4 ${post.isPinned ? 'fill-[#3D3D4E]' : ''}`} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogState.isOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.deleteReason}</DialogTitle></DialogHeader>
          {dialogState.action === 'delete' && (
            <div className="space-y-4 py-4">
              <div className="flex items-start space-x-3"><Checkbox id="inappropriate" checked={deleteReasons.inappropriate} onCheckedChange={(checked) => setDeleteReasons((prev) => ({ ...prev, inappropriate: checked as boolean }))} className="mt-1 data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]" /><label htmlFor="inappropriate" className="text-sm leading-relaxed cursor-pointer">{t.reasonInappropriate}</label></div>
              <div className="flex items-start space-x-3"><Checkbox id="duplicate" checked={deleteReasons.duplicate} onCheckedChange={(checked) => setDeleteReasons((prev) => ({ ...prev, duplicate: checked as boolean }))} className="mt-1 data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]" /><label htmlFor="duplicate" className="text-sm leading-relaxed cursor-pointer">{t.reasonDuplicate}</label></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleConfirmAction} className="bg-[#49B1E4] hover:bg-[#3A9BD4] text-white">{t.delete}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
