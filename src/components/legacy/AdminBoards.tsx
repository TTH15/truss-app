import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { EyeOff, User, MessageSquare, Trash2, RotateCcw, ArrowLeft } from 'lucide-react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Checkbox } from '../ui/checkbox';
import type { Language, BoardPost } from '../../domain/types/app';

interface AdminBoardsProps {
  language: Language;
  boardPosts?: BoardPost[];
  onUpdateBoardPosts?: (posts: BoardPost[]) => void;
  onDeleteBoardPost?: (postId: number) => Promise<void>;
}

const translations = {
  ja: { title: '掲示板管理', allPosts: 'すべての投稿', hidden: '非表示', delete: '削除する', restore: '復元する', deleteReason: '削除する理由', reasonInappropriate: '内容が不適切だと判断されたため。', reasonDuplicate: '同じ内容の掲示板が存在するため。', confirmRestore: 'この投稿を復元しますか？', back: '戻る', trash: 'ゴミ箱' },
  en: { title: 'Board Management', allPosts: 'All Posts', hidden: 'Hidden', delete: 'Delete', restore: 'Restore', deleteReason: 'Reason for deletion', reasonInappropriate: 'Judged as inappropriate content.', reasonDuplicate: 'Duplicate post exists.', confirmRestore: 'Do you want to restore this post?', back: 'Back', trash: 'Trash' }
};

export function AdminBoards({ language, boardPosts = [], onUpdateBoardPosts = () => {}, onDeleteBoardPost }: AdminBoardsProps) {
  const t = translations[language];
  const [showTrash, setShowTrash] = useState(false);
  const [deleteReasons, setDeleteReasons] = useState({ inappropriate: false, duplicate: false });
  const [posts, setPosts] = useState(boardPosts);
  const [dialogState, setDialogState] = useState<{ isOpen: boolean; postId: number | null; action: 'delete' | 'restore' | null; }>({ isOpen: false, postId: null, action: null });
  const openDialog = (postId: number, action: 'delete' | 'restore') => { if (action === 'delete') setDeleteReasons({ inappropriate: false, duplicate: false }); setDialogState({ isOpen: true, postId, action }); };
  const closeDialog = () => { setDialogState({ isOpen: false, postId: null, action: null }); setDeleteReasons({ inappropriate: false, duplicate: false }); };

  const handleConfirmAction = async () => {
    if (dialogState.postId === null) return;
    if (dialogState.action === 'delete') {
      if (onDeleteBoardPost) await onDeleteBoardPost(dialogState.postId);
      else {
        const updated = posts.map((p) => p.id === dialogState.postId ? { ...p, isDeleted: true } : p);
        setPosts(updated); onUpdateBoardPosts(updated);
      }
    } else if (dialogState.action === 'restore') {
      const updated = posts.map((p) => p.id === dialogState.postId ? { ...p, isDeleted: false } : p);
      setPosts(updated); onUpdateBoardPosts(updated);
    }
    closeDialog();
  };

  const getCategoryColor = (category: string) => category === 'japanese' ? 'bg-blue-100 text-blue-800' : category === 'regular-international' ? 'bg-purple-100 text-purple-800' : category === 'exchange' ? 'bg-pink-100 text-pink-800' : 'bg-gray-100 text-gray-800';
  const getCategoryLabel = (category: string) => category === 'japanese' ? (language === 'ja' ? '日本人学生・国内学生' : 'Japanese') : category === 'regular-international' ? (language === 'ja' ? '正規留学生' : 'Regular') : category === 'exchange' ? (language === 'ja' ? '交換留学生' : 'Exchange') : '';
  const activePosts = posts.filter((p) => !p.isDeleted);
  const deletedPosts = posts.filter((p) => p.isDeleted);
  const displayPosts = showTrash ? deletedPosts : activePosts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setShowTrash(!showTrash)} className={showTrash ? "text-[#3D3D4E] bg-white hover:bg-gray-100 border-gray-300" : "bg-[#49B1E4] hover:bg-[#3A9BD4] text-white border-none"}>
          {showTrash ? <><ArrowLeft className="w-4 h-4 mr-1" />{t.back}</> : <><Trash2 className="w-4 h-4" />{deletedPosts.length > 0 && <Badge className="ml-2 bg-red-500 text-white">{deletedPosts.length}</Badge>}</>}
        </Button>
        <Badge variant="outline">{displayPosts.length} {showTrash ? t.trash : t.allPosts}</Badge>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {displayPosts.map((post) => (
          <Card key={post.id} className={`hover:shadow-lg transition-shadow ${post.isHidden ? 'bg-gray-50 border-gray-300' : ''} ${showTrash ? 'bg-red-50 border-red-200' : ''}`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className={post.isHidden ? 'text-gray-500' : ''}>{post.title}</CardTitle>
                    {post.isHidden && <Badge variant="secondary" className="bg-gray-200 text-gray-700"><EyeOff className="w-3 h-3 mr-1" />{t.hidden}</Badge>}
                  </div>
                  <CardDescription className={post.isHidden ? 'line-through' : ''}>{post.content}</CardDescription>
                </div>
                <div className="ml-2 shrink-0">
                  {showTrash ? <Button variant="outline" size="sm" onClick={() => openDialog(post.id, 'restore')} className="border-green-300 text-green-700 hover:bg-green-50"><RotateCcw className="w-4 h-4" /></Button> : <Button variant="outline" size="sm" onClick={() => openDialog(post.id, 'delete')} className="border-[#A5D8F3] text-[#49B1E4] hover:bg-[#E8F6FC]"><Trash2 className="w-4 h-4" /></Button>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1"><User className="w-4 h-4" />{post.author}</div>
                <Badge className={getCategoryColor(post.category ?? 'other')}>{getCategoryLabel(post.category ?? 'other')}</Badge>
                <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{post.date}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogState.isOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogState.action === 'delete' ? t.deleteReason : t.confirmRestore}</DialogTitle></DialogHeader>
          {dialogState.action === 'delete' && (
            <div className="space-y-4 py-4">
              <div className="flex items-start space-x-3"><Checkbox id="inappropriate" checked={deleteReasons.inappropriate} onCheckedChange={(checked) => setDeleteReasons((prev) => ({ ...prev, inappropriate: checked as boolean }))} className="mt-1 data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]" /><label htmlFor="inappropriate" className="text-sm leading-relaxed cursor-pointer">{t.reasonInappropriate}</label></div>
              <div className="flex items-start space-x-3"><Checkbox id="duplicate" checked={deleteReasons.duplicate} onCheckedChange={(checked) => setDeleteReasons((prev) => ({ ...prev, duplicate: checked as boolean }))} className="mt-1 data-[state=checked]:bg-[#49B1E4] data-[state=checked]:border-[#49B1E4]" /><label htmlFor="duplicate" className="text-sm leading-relaxed cursor-pointer">{t.reasonDuplicate}</label></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleConfirmAction} className="bg-[#49B1E4] hover:bg-[#3A9BD4] text-white">{dialogState.action === 'delete' ? t.delete : t.restore}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
