import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight, faXmark } from '@fortawesome/free-solid-svg-icons';
import { currentAcademicYear, type Language, type User, type Event } from '@truss/core';
import { useData } from '../../contexts/DataContext';
import { useLocalStorageDismissal } from '../../lib/use-local-storage-dismissal';
import { PwaInstallBanner } from './PwaInstallBanner';
import { PushPermissionPrompt } from './PushPermissionPrompt';
import { GradeConfirmNudge } from './GradeConfirmNudge';
import { PassportCover } from '../member/PassportCover';
import { NextJourneyTicket } from '../member/NextJourneyTicket';
import { BoardPreview, HomeSectionHeading, HomeSectionState, MemoryPreview } from '../member/HomePreviews';
import { selectHomeBoardPosts, selectNextEvent, selectRecentMemories } from '../member/home-content';

interface HomePageProps {
  language: Language;
  user: User;
  events: Event[];
  attendingEvents?: Set<number>;
  onNavigateToEvent: (eventId: number) => void;
  onNavigateToEvents: () => void;
  onNavigateToGallery: (photoId?: number, upload?: boolean) => void;
  onNavigateToBoard: (postId?: number) => void;
  onOpenProfile?: () => void;
  onReopenInitialRegistration?: () => void;
  onDismissReuploadNotification?: () => void;
  onOpenFeePayment?: () => void;
  onUpdateProfile?: (updates: Partial<User>) => Promise<{ error: Error | null }>;
}

export function HomePage({ language, user, events, attendingEvents, onNavigateToEvent, onNavigateToEvents, onNavigateToGallery, onNavigateToBoard, onOpenProfile, onOpenFeePayment, onUpdateProfile }: HomePageProps) {
  const { boardPosts, galleryPhotos, loading, galleryPhotosLoading, boardPostsLoading, homeLoadErrors, retryHomeSection } = useData();
  const [organizationsDismissed, dismissOrganizations] = useLocalStorageDismissal('truss-organizations-nudge-dismissed-v1');
  const nextEvent = selectNextEvent(events);
  const memories = user.approved ? selectRecentMemories(galleryPhotos) : [];
  const posts = selectHomeBoardPosts(boardPosts);
  const needsGradeConfirmation = user.approved && !!user.grade?.trim() && (user.gradeConfirmedFor ?? 0) < currentAcademicYear();
  const all = language === 'ja' ? 'すべて見る' : 'View all';
  const renewalRequired = user.category === 'japanese' && !user.feePaid && user.registrationStep === 'fully_active';

  return (
    <div className="member-home">
      <div className="home-passport-column">
        <PassportCover user={user} language={language} onOpen={onOpenProfile} />
      </div>
      <div className="home-journal-column">
        {renewalRequired && onOpenFeePayment && <div className="member-required-action">
          <span>{language === 'ja' ? (user.isRenewal ? '継続手続き' : '会費のお支払い') : (user.isRenewal ? 'Membership renewal' : 'Membership fee')}</span>
          <button type="button" onClick={onOpenFeePayment}>{language === 'ja' ? '手続きへ' : 'Continue'}<FontAwesomeIcon icon={faChevronRight} /></button>
        </div>}
        <section className="home-section home-next-journey" aria-label={language === 'ja' ? '次のJourney' : 'Next journey'}>
          <HomeSectionHeading title={language === 'ja' ? '次のJourney' : 'Next journey'} action={all} onClick={onNavigateToEvents} />
          {nextEvent ? <NextJourneyTicket event={nextEvent} language={language} registered={attendingEvents?.has(nextEvent.id) ?? false} onOpen={() => onNavigateToEvent(nextEvent.id)} /> : <HomeSectionState language={language} loading={loading} error={homeLoadErrors.events} retry={() => void retryHomeSection('events')} emptyText={language === 'ja' ? '次のイベントは準備中' : 'The next event is being planned'} />}
        </section>
        {user.approved && <section className="home-section" aria-label={language === 'ja' ? '最近の思い出' : 'Recent memories'}>
          <HomeSectionHeading title={language === 'ja' ? '最近の思い出' : 'Recent memories'} action={all} onClick={() => onNavigateToGallery()} />
          {memories.length ? <MemoryPreview photos={memories} language={language} onOpen={onNavigateToGallery} /> : <HomeSectionState language={language} loading={galleryPhotosLoading} error={homeLoadErrors.memories} retry={() => void retryHomeSection('memories')} emptyText={language === 'ja' ? 'まだ写真がありません' : 'No photos yet'} />}
          {!memories.length && !galleryPhotosLoading && !homeLoadErrors.memories && <button type="button" className="home-text-action" onClick={() => onNavigateToGallery(undefined, true)}>{language === 'ja' ? '写真を投稿' : 'Add a photo'}<FontAwesomeIcon icon={faChevronRight} /></button>}
        </section>}
        <section className="home-section" aria-label={language === 'ja' ? '掲示板' : 'Bulletin board'}>
          <HomeSectionHeading title={language === 'ja' ? '掲示板' : 'Bulletin board'} action={all} onClick={() => onNavigateToBoard()} />
          {posts.length ? <BoardPreview posts={posts} language={language} onOpen={onNavigateToBoard} /> : <HomeSectionState language={language} loading={boardPostsLoading} error={homeLoadErrors.board} retry={() => void retryHomeSection('board')} emptyText={language === 'ja' ? 'まだ投稿がありません' : 'No posts yet'} />}
        </section>
        <details className="home-settings">
          <summary><span>{language === 'ja' ? 'プロフィールとアプリ設定' : 'Profile and app settings'}{needsGradeConfirmation && <span className="home-settings-notice">{language === 'ja' ? '学年確認' : 'Confirm grade'}</span>}</span><FontAwesomeIcon icon={faChevronDown} /></summary>
          <div className="home-settings-content">
            {onUpdateProfile && <GradeConfirmNudge language={language} user={user} onUpdateProfile={onUpdateProfile} />}
            {user.approved && !user.organizations?.trim() && !organizationsDismissed && onOpenProfile && <div className="home-profile-nudge">
              <span>{language === 'ja' ? '他の所属団体を教えてください' : 'Add your other organizations'}</span>
              <button type="button" onClick={onOpenProfile}>{language === 'ja' ? 'プロフィール' : 'Profile'}</button>
              <button type="button" onClick={dismissOrganizations} aria-label={language === 'ja' ? '閉じる' : 'Close'}><FontAwesomeIcon icon={faXmark} /></button>
            </div>}
            <PwaInstallBanner language={language} />
            {user.approved && <PushPermissionPrompt user={user} language={language} />}
          </div>
        </details>
      </div>
    </div>
  );
}
