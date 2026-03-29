import { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Plus, X, MessageCircle, Send } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { BoardPostWithReplies } from './BoardPostWithReplies';
import type { Language, User, BoardPost, BoardPostReply } from '../../domain/types/app';

interface BulletinBoardProps {
  language: Language;
  user: User;
  onInterested: (post: { author: string; authorAvatar: string; title: string }) => void;
  boardPosts: BoardPost[];
  onUpdateBoardPosts: (posts: BoardPost[]) => void;
  onCreateBoardPost?: (post: Omit<BoardPost, 'id' | 'replies'>) => Promise<void>;
  onAddReply?: (postId: number, reply: Omit<BoardPostReply, 'id'>) => Promise<void>;
  onToggleInterest?: (postId: number) => Promise<void>;
  onDeleteBoardPost?: (postId: number) => Promise<void>;
}

const translations = {
  ja: { title: '掲示板', subtitle: '言語交換・学習パートナーを見つけよう', createPost: '新しい投稿', postTitle: 'タイトル', postContent: '内容', tags: 'タグ（任意）', tagsHint: 'タグを追加してください', addTag: 'タグを追加', commonTags: 'よく使うタグ', customTagPlaceholder: '自由記述タグを入力', selectedTags: '選択中タグ', peopleNeeded: '募集人数', uploadImage: '画像をアップロード', submit: '投稿する', cancel: 'キャンセル', languageExchange: '言語交換', studyGroup: '勉強会', event: 'イベント', displayType: '表示タイプ', storyDisplay: '1日のみ表示（ストーリー）', boardDisplay: 'ある期間まで表示（掲示板）', expiryDate: '表示期限', until: 'まで', replies: '件のリプライ', replyPlaceholder: 'リプライを入力...', sendReply: '返信', viewReplies: 'リプライを見る', addComment: 'コメントを追加...' },
  en: { title: 'Bulletin Board', subtitle: 'Find language exchange and study partners', createPost: 'New Post', postTitle: 'Title', postContent: 'Content', tags: 'Tags (optional)', tagsHint: 'Please add tags', addTag: 'Add tags', commonTags: 'Common tags', customTagPlaceholder: 'Type a custom tag', selectedTags: 'Selected tags', peopleNeeded: 'People Needed', uploadImage: 'Upload Image', submit: 'Submit', cancel: 'Cancel', languageExchange: 'Language Exchange', studyGroup: 'Study Group', event: 'Event', displayType: 'Display Type', storyDisplay: '1 day only (Story)', boardDisplay: 'Display until date (Board)', expiryDate: 'Expiry Date', until: 'until', replies: 'replies', replyPlaceholder: 'Write a reply...', sendReply: 'Send', viewReplies: 'View replies', addComment: 'Add a comment...' }
};
const presetTags = { ja: ['English', '日本語', '中国語', '韓国語'], en: ['English', 'Japanese', 'Chinese', 'Korean'] };

export function BulletinBoard({ language, user, onInterested, boardPosts, onUpdateBoardPosts, onCreateBoardPost, onAddReply, onToggleInterest, onDeleteBoardPost }: BulletinBoardProps) {
  const t = translations[language];
  const visiblePosts = boardPosts.filter((post) => !post.isHidden && !post.isDeleted);
  const canWrite = user.approved === true;
  const [selectedStory, setSelectedStory] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [replyInput, setReplyInput] = useState<Record<number, string>>({});
  const [customTagInput, setCustomTagInput] = useState('');
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', tags: [] as string[], peopleNeeded: 1, displayType: 'story' as 'story' | 'board', expiryDate: '' });

  const addTag = (tag: string) => {
    const normalized = tag.trim();
    if (!normalized) return;
    if (newPost.tags.includes(normalized)) return;
    setNewPost((prev) => ({ ...prev, tags: [...prev.tags, normalized] }));
  };
  const removeTag = (tag: string) => setNewPost((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  const addCustomTag = () => { if (customTagInput.trim()) { addTag(customTagInput); setCustomTagInput(''); } };
  useEffect(() => { if (selectedStory === null) return; const interval = setInterval(() => setStoryProgress((prev) => (prev >= 100 ? 0 : prev + 1)), 50); return () => clearInterval(interval); }, [selectedStory]);
  useEffect(() => { if (storyProgress < 100 || selectedStory === null) return; const i = visiblePosts.findIndex((p) => p.id === selectedStory); if (i < visiblePosts.length - 1) setSelectedStory(visiblePosts[i + 1].id); else setSelectedStory(null); setStoryProgress(0); }, [storyProgress, selectedStory, visiblePosts]);
  const handleAddReply = async (postId: number, content: string) => { const reply = { author: user.name, authorAvatar: user.name.substring(0, 2).toUpperCase(), content, time: language === 'ja' ? 'たった今' : 'just now' }; if (onAddReply) await onAddReply(postId, reply); else onUpdateBoardPosts(boardPosts.map((p) => p.id === postId ? { ...p, replies: [...(p.replies || []), { id: (p.replies?.length || 0) + 1, ...reply }] } : p)); };
  const handleToggleInterest = async (post: BoardPost) => {
    if (!onToggleInterest) return;
    await onToggleInterest(post.id);
    onInterested({ author: post.author, authorAvatar: post.authorAvatar, title: post.title });
  };
  const handleDeletePost = async (postId: number) => {
    if (onDeleteBoardPost) {
      await onDeleteBoardPost(postId);
      return;
    }
    onUpdateBoardPosts(boardPosts.map((p) => (p.id === postId ? { ...p, isDeleted: true } : p)));
  };
  const canDeletePost = (post: BoardPost) => post.authorId ? post.authorId === user.id : post.author === user.name;
  const getTagColor = () => 'from-[#49B1E4] to-[#49B1E4]';
  const isAnnouncementPost = (post: BoardPost) => post.tag === 'event' && post.peopleNeeded === 0;
  const getPostTimeValue = (post: BoardPost) => {
    const parsed = new Date(post.time).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const sortPostsForDisplay = (items: BoardPost[]) =>
    [...items].sort((a, b) => {
      const pinDiff = Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned));
      if (pinDiff !== 0) return pinDiff;
      const announcementDiff = Number(isAnnouncementPost(b)) - Number(isAnnouncementPost(a));
      if (announcementDiff !== 0) return announcementDiff;
      return getPostTimeValue(b) - getPostTimeValue(a);
    });
  const currentStory = visiblePosts.find((p) => p.id === selectedStory);
  const storyPosts = visiblePosts.filter((p) => p.displayType === 'story');
  const boardPostsList = sortPostsForDisplay(visiblePosts.filter((p) => p.displayType === 'board' || (p.displayType === 'story' && p.replies && p.replies.length > 0)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-gray-900">{t.title}</h1><p className="text-gray-600 mt-1 text-sm">{t.subtitle}</p></div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#49B1E4] hover:bg-[#3A9FD3]"
              disabled={!canWrite}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.createPost}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t.createPost}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label htmlFor="post-title">{t.postTitle}</Label><Input id="post-title" value={newPost.title} onChange={(e) => setNewPost({ ...newPost, title: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="post-content">{t.postContent}</Label><Textarea id="post-content" value={newPost.content} onChange={(e) => setNewPost({ ...newPost, content: e.target.value })} rows={4} /></div>
              <div className="space-y-2">
                <Label>{t.tags}</Label>
                <p className="text-xs text-gray-500">{t.tagsHint}</p>
                <div className="flex flex-wrap gap-2">
                  {newPost.tags.map((tag) => (
                    <button key={tag} type="button" onClick={() => removeTag(tag)} className="px-2 py-1 bg-[#E8F6FC] text-[#2D7EA8] text-xs rounded-full border border-[#BFE6F8]">
                      {tag} <span className="ml-1">×</span>
                    </button>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsTagDialogOpen(true)} className="h-7 px-2">
                    <Plus className="w-3 h-3 mr-1" />
                    {t.addTag}
                  </Button>
                </div>
                <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{t.addTag}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t.commonTags}</Label>
                        <div className="flex flex-wrap gap-2">
                          {presetTags[language].map((tag) => (
                            <button key={tag} type="button" onClick={() => addTag(tag)} className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-full transition-colors">
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="custom-tag">{t.customTagPlaceholder}</Label>
                        <div className="flex gap-2">
                          <Input id="custom-tag" value={customTagInput} onChange={(e) => setCustomTagInput(e.target.value)} />
                          <Button type="button" onClick={addCustomTag}>{t.addTag}</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{t.selectedTags}</Label>
                        <div className="flex flex-wrap gap-2">
                          {newPost.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-[#E8F6FC] text-[#2D7EA8] text-xs rounded-full border border-[#BFE6F8]">{tag}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsTagDialogOpen(false)}>{t.cancel}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="space-y-2"><Label htmlFor="people-needed">{t.peopleNeeded}</Label><Input id="people-needed" type="number" min="1" value={newPost.peopleNeeded} onChange={(e) => setNewPost({ ...newPost, peopleNeeded: parseInt(e.target.value) })} /></div>
              <div className="space-y-2"><Label htmlFor="upload-image">{t.uploadImage}</Label><Input id="upload-image" type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); } }} />{previewUrl && <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />}</div>
              <div className="space-y-2"><Label htmlFor="display-type">{t.displayType}</Label><RadioGroup id="display-type" value={newPost.displayType} onValueChange={(value) => setNewPost({ ...newPost, displayType: value as 'story' | 'board' })}><div className="flex items-center space-x-2"><RadioGroupItem value="story" /><Label>{t.storyDisplay}</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="board" /><Label>{t.boardDisplay}</Label></div></RadioGroup></div>
              {newPost.displayType === 'board' && <div className="space-y-2"><Label htmlFor="expiry-date">{t.expiryDate}</Label><Input id="expiry-date" type="date" value={newPost.expiryDate} onChange={(e) => setNewPost({ ...newPost, expiryDate: e.target.value })} min={new Date().toISOString().split('T')[0]} /></div>}
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    if (!canWrite) return;
                    const post = {
                      authorId: user.id,
                      author: user.name,
                      authorAvatar: user.name.substring(0, 2).toUpperCase(),
                      title: newPost.title,
                      content: newPost.content,
                      language: newPost.tags.join(', '),
                      peopleNeeded: newPost.peopleNeeded,
                      interested: 0,
                      tag: 'languageExchange' as const,
                      time: new Date().toISOString(),
                      image: previewUrl,
                      displayType: newPost.displayType,
                      expiryDate: newPost.displayType === 'board' ? newPost.expiryDate : '',
                      isHidden: false,
                      isDeleted: false,
                    };
                    if (onCreateBoardPost) await onCreateBoardPost(post);
                    else onUpdateBoardPosts([{ ...post, id: (boardPosts.length ? Math.max(...boardPosts.map((p) => p.id)) : 0) + 1, replies: [] }, ...boardPosts]);
                    setIsDialogOpen(false);
                  }}
                  className="flex-1 bg-[#49B1E4] hover:bg-[#3A9FD3]"
                >
                  {t.submit}
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">{t.cancel}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 pb-2"><div className="flex gap-4">{storyPosts.map((post) => <button key={post.id} onClick={() => { setSelectedStory(post.id); setStoryProgress(0); }} className="flex flex-col items-center gap-2 shrink-0"><div className={`p-1 rounded-full bg-linear-to-tr ${getTagColor()}`}><div className="bg-white p-0.5 rounded-full"><div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-linear-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center">{post.authorAvatar}</div></div></div><span className="text-xs text-gray-700 max-w-[80px] truncate">{post.author}</span></button>)}</div></div>
      {boardPostsList.length > 0 && <div className="space-y-4">{boardPostsList.map((post) => <BoardPostWithReplies key={post.id} post={post} language={language} user={user} onAddReply={handleAddReply} onToggleInterest={() => handleToggleInterest(post)} onDeletePost={handleDeletePost} canDelete={canDeletePost(post)} translations={t} />)}</div>}

      {currentStory && (
        <div className="fixed inset-0 bg-black z-100 flex items-center justify-center">
          <div className="absolute top-0 left-0 right-0 flex gap-1 p-4 z-10">{visiblePosts.map((post) => <div key={post.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"><div className="h-full bg-white transition-all duration-100" style={{ width: post.id === selectedStory ? `${storyProgress}%` : post.id < selectedStory! ? '100%' : '0%' }} /></div>)}</div>
          <button onClick={() => setSelectedStory(null)} className="absolute top-8 right-4 text-white z-20"><X className="w-6 h-6" /></button>
          <div className="w-full h-full max-w-lg mx-auto relative">
            {currentStory.image && <img src={currentStory.image} alt={currentStory.title} className="w-full h-full object-cover" />}
            <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 text-white z-30">
              <h2 className="text-2xl mb-3">{currentStory.title}</h2>
              <p className="text-white/90 text-sm mb-4 line-clamp-3">{currentStory.content}</p>
              <div className="flex gap-2 items-center bg-white/20 backdrop-blur-sm rounded-full p-2"><Input placeholder={t.addComment} value={replyInput[currentStory.id] || ''} onChange={(e) => setReplyInput({ ...replyInput, [currentStory.id]: e.target.value })} className="flex-1 bg-transparent border-none text-white placeholder:text-white/70 focus-visible:ring-0" /><Button size="sm" onClick={() => { if (replyInput[currentStory.id]?.trim()) { handleAddReply(currentStory.id, replyInput[currentStory.id]); setReplyInput({ ...replyInput, [currentStory.id]: '' }); } }} disabled={!replyInput[currentStory.id]?.trim()} className="bg-[#49B1E4] hover:bg-[#3A9FD3] rounded-full h-8 w-8 p-0"><Send className="w-4 h-4" /></Button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
