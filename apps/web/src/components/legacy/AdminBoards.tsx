import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EyeOff, User, MessageSquare, Trash2, Plus, Pin, GripVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { Language, BoardPost, CreateBoardPostInput } from '@truss/core';
import { normalizeBoardContent } from '@truss/core';
import { linkifyText } from '../../lib/linkify';

interface AdminBoardsProps {
  language: Language;
  adminUserId?: string;
  adminName?: string;
  boardPosts?: BoardPost[];
  onUpdateBoardPosts?: (posts: BoardPost[]) => void;
  onCreateBoardPost?: (post: CreateBoardPostInput) => Promise<void>;
  onDeleteBoardPost?: (postId: number) => Promise<void>;
  onTogglePinBoardPost?: (postId: number, pinned: boolean) => Promise<void>;
  onReorderPinnedBoardPosts?: (orderedPostIds: number[]) => Promise<void>;
}

const translations = {
  ja: { title: '掲示板管理', allPosts: 'すべての投稿', pinnedSection: 'ピン留め', pinnedEmpty: 'ピン留めされた投稿はありません', pinnedHint: 'ドラッグで表示順を入れ替えられます', hidden: '非表示', delete: '削除する', pin: 'ピン留め', unpin: 'ピン解除', deleteReason: '削除する理由', reasonInappropriate: '内容が不適切だと判断されたため。', reasonDuplicate: '同じ内容の掲示板が存在するため。', createPost: '運営投稿', postTitle: 'タイトル', postContent: '内容', uploadImage: '画像をアップロード（任意）', submit: '投稿する', cancel: 'キャンセル' },
  en: { title: 'Board Management', allPosts: 'All Posts', pinnedSection: 'Pinned', pinnedEmpty: 'No pinned posts yet', pinnedHint: 'Drag to reorder', hidden: 'Hidden', delete: 'Delete', pin: 'Pin', unpin: 'Unpin', deleteReason: 'Reason for deletion', reasonInappropriate: 'Judged as inappropriate content.', reasonDuplicate: 'Duplicate post exists.', createPost: 'Admin Post', postTitle: 'Title', postContent: 'Content', uploadImage: 'Upload Image (optional)', submit: 'Submit', cancel: 'Cancel' }
};

export function AdminBoards({ language, adminUserId = 'admin', adminName, boardPosts = [], onUpdateBoardPosts = () => {}, onCreateBoardPost, onDeleteBoardPost, onTogglePinBoardPost, onReorderPinnedBoardPosts }: AdminBoardsProps) {
  const t = translations[language];
  const [deleteReasons, setDeleteReasons] = useState({ inappropriate: false, duplicate: false });
  const [posts, setPosts] = useState(boardPosts);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; postId: number | null; action: 'delete' | null; }>({ isOpen: false, postId: null, action: null });
  const [draggingPostId, setDraggingPostId] = useState<number | null>(null);
  const [dragOverPostId, setDragOverPostId] = useState<number | null>(null);
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
    const postPayload: CreateBoardPostInput = {
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
      imageFile: selectedFile ?? undefined,
      displayType: 'board',
      expiryDate: '',
      isHidden: false,
      isDeleted: false,
    };
    if (onCreateBoardPost) {
      await onCreateBoardPost(postPayload);
    } else {
      const { imageFile: _imageFile, ...postWithoutFile } = postPayload;
      const localPost: BoardPost = {
        ...postWithoutFile,
        image: previewUrl,
        id: (posts.length ? Math.max(...posts.map((p) => p.id)) : 0) + 1,
        replies: [],
      };
      const updated = [localPost, ...posts];
      setPosts(updated);
      onUpdateBoardPosts(updated);
    }
    setNewPost({ title: '', content: '' });
    setSelectedFile(null);
    setPreviewUrl('');
    setIsCreateDialogOpen(false);
  };

  const handleTogglePin = async (post: BoardPost) => {
    const nextPinned = !post.isPinned;
    if (onTogglePinBoardPost) {
      await onTogglePinBoardPost(post.id, nextPinned);
      return;
    }
    const maxOrder = posts.reduce((acc, p) => (p.pinOrder ?? -1) > acc ? (p.pinOrder ?? -1) : acc, -1);
    const updated = posts.map((p) => p.id === post.id
      ? { ...p, isPinned: nextPinned, pinOrder: nextPinned ? maxOrder + 1 : null }
      : p);
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

  const visiblePosts = useMemo(() => posts.filter((p) => !p.isDeleted), [posts]);
  const pinnedPosts = useMemo(() => visiblePosts
    .filter((p) => p.isPinned)
    .sort((a, b) => (a.pinOrder ?? Number.MAX_SAFE_INTEGER) - (b.pinOrder ?? Number.MAX_SAFE_INTEGER)),
  [visiblePosts]);
  const unpinnedPosts = useMemo(() => visiblePosts
    .filter((p) => !p.isPinned)
    .sort((a, b) => {
      const announcementDiff = Number(isAnnouncementPost(b)) - Number(isAnnouncementPost(a));
      if (announcementDiff !== 0) return announcementDiff;
      return getPostTimeValue(b) - getPostTimeValue(a);
    }),
  [visiblePosts]);

  const commitPinnedOrder = async (orderedIds: number[]) => {
    const orderById = new Map(orderedIds.map((id, idx) => [id, idx]));
    const updated = posts.map((p) => orderById.has(p.id) ? { ...p, pinOrder: orderById.get(p.id) ?? null } : p);
    setPosts(updated);
    if (onReorderPinnedBoardPosts) {
      await onReorderPinnedBoardPosts(orderedIds);
    } else {
      onUpdateBoardPosts(updated);
    }
  };

  const handleDragStart = (postId: number) => (e: React.DragEvent<HTMLElement>) => {
    setDraggingPostId(postId);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(postId));
    } catch {
      // some browsers throw when data type is not allowed
    }
  };
  const handleDragOver = (postId: number) => (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (postId !== dragOverPostId) setDragOverPostId(postId);
  };
  const handleDragLeave = () => {
    setDragOverPostId(null);
  };
  const handleDrop = (targetPostId: number) => async (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    const sourceId = draggingPostId;
    setDraggingPostId(null);
    setDragOverPostId(null);
    if (sourceId === null || sourceId === targetPostId) return;
    const ids = pinnedPosts.map((p) => p.id);
    const fromIndex = ids.indexOf(sourceId);
    const toIndex = ids.indexOf(targetPostId);
    if (fromIndex < 0 || toIndex < 0) return;
    const reordered = [...ids];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    await commitPinnedOrder(reordered);
  };
  const handleDragEnd = () => {
    setDraggingPostId(null);
    setDragOverPostId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{visiblePosts.length} {t.allPosts}</Badge>
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
              <div className="space-y-2">
                <p className="text-sm text-[#6B6B7A]">{t.uploadImage}</p>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }
                  }}
                />
                {previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover rounded-md" />}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>{t.cancel}</Button>
              <Button className="bg-[#49B1E4] hover:bg-[#3A9FD3] text-white" onClick={handleCreatePost}>{t.submit}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <section className="space-y-3 rounded-lg border border-dashed border-[#A5D8F3] bg-[#F4FAFD] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-[#3D3D4E]">
            <Pin className="w-4 h-4 fill-[#3D3D4E]" />
            <span>{t.pinnedSection}</span>
            <Badge variant="secondary" className="bg-white text-[#3D3D4E]">{pinnedPosts.length}</Badge>
          </div>
          {pinnedPosts.length > 1 && <span className="text-xs text-gray-500">{t.pinnedHint}</span>}
        </div>
        {pinnedPosts.length === 0 ? (
          <p className="text-sm text-gray-500">{t.pinnedEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {pinnedPosts.map((post, index) => (
              <li
                key={post.id}
                draggable
                onDragStart={handleDragStart(post.id)}
                onDragOver={handleDragOver(post.id)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(post.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 rounded-md border bg-white p-3 transition-shadow ${draggingPostId === post.id ? 'opacity-60' : ''} ${dragOverPostId === post.id && draggingPostId !== post.id ? 'border-[#49B1E4] shadow-md' : 'border-gray-200'}`}
              >
                <span className="cursor-grab text-gray-400 active:cursor-grabbing" aria-label="drag handle"><GripVertical className="w-4 h-4" /></span>
                <span className="w-6 text-center text-xs font-medium text-gray-500">{index + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-[#3D3D4E]">{post.title}</p>
                  <p className="truncate text-xs text-gray-500">{post.author}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleTogglePin(post)}
                  aria-label={t.unpin}
                  title={t.unpin}
                  className="border-[#3D3D4E] text-[#3D3D4E] hover:bg-gray-100 px-2"
                >
                  <Pin className="w-4 h-4 fill-[#3D3D4E]" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        {[...pinnedPosts, ...unpinnedPosts].map((post) => (
          <Card key={post.id} className={`min-w-0 hover:shadow-lg transition-shadow ${post.isHidden ? 'bg-gray-50 border-gray-300' : ''} ${post.tag === 'event' && post.peopleNeeded === 0 ? 'bg-amber-50 border-amber-200' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 min-w-0">
                    <CardTitle className={`min-w-0 break-words [overflow-wrap:anywhere] ${post.isHidden ? 'text-gray-500' : ''}`}>{post.title}</CardTitle>
                    {post.isPinned && <Pin className="w-4 h-4 text-[#3D3D4E] fill-[#3D3D4E]" />}
                    {post.tag === 'event' && post.peopleNeeded === 0 && <Badge className="bg-amber-500 text-white">{language === 'ja' ? 'お知らせ' : 'Announcement'}</Badge>}
                    {post.isHidden && <Badge variant="secondary" className="bg-gray-200 text-gray-700"><EyeOff className="w-3 h-3 mr-1" />{t.hidden}</Badge>}
                  </div>
                  <CardDescription className={`whitespace-pre-line break-words [overflow-wrap:anywhere] ${post.isHidden ? 'line-through' : ''}`}>{linkifyText(normalizeBoardContent(post.content))}</CardDescription>
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
