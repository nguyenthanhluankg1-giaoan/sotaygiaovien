import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Gamepad2,
  Play,
  RotateCcw,
  Trophy,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Download,
  Upload,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Timer,
  CheckCircle2,
  XCircle,
  Lightbulb,
  FolderPlus,
  HelpCircle,
  Move,
  Layers,
  ArrowRight,
  Filter,
  Check,
  Zap,
  Image as ImageIcon,
  Save,
  X,
  Star,
  Award,
  Link as LinkIcon,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Camera,
  CameraOff,
  Share2,
  Globe,
  QrCode,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState, DragDropGameItem, DragDropPair, DragDropTargetZone } from '../../types';
import { playBeep, playCelebration, playTick, playWrongSound, playApplauseSound } from '../../utils/audio';
import { DEFAULT_DRAG_DROP_GAMES, PRESET_CENTER_IMAGES, EDUCATIONAL_EMOJI_LIBRARY, EducationalEmojiItem } from '../../utils/dragDropPresets';
import { uid, compressImageFile } from '../../utils/helpers';
import { saveSharedGameToFirestore, fetchSharedGameFromFirestore } from '../../services/dbService';
import { HandGestureController } from './HandGestureController';

interface DragDropTabProps {
  state: AppState;
  onUpdateState: React.Dispatch<React.SetStateAction<AppState>>;
  onNavigate?: (page: string) => void;
}

export const DragDropTab: React.FC<DragDropTabProps> = ({
  state,
  onUpdateState,
  onNavigate
}) => {
  // 1. Game Collection Management
  const gamesList: DragDropGameItem[] = useMemo(() => {
    const userGames = state.dragDropGames;
    if (Array.isArray(userGames)) {
      return userGames;
    }
    return DEFAULT_DRAG_DROP_GAMES;
  }, [state.dragDropGames]);

  // Main View Mode: 'play' | 'manage' (Default to 'manage' - Tạo & Quản lý)
  const [activeTab, setActiveTab] = useState<'play' | 'manage'>('manage');

  // Share Game Modal States
  const [shareModalGame, setShareModalGame] = useState<DragDropGameItem | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isSharingLoading, setIsSharingLoading] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [sharedNoticeBanner, setSharedNoticeBanner] = useState<string | null>(null);

  // Check URL parameters on mount to load shared games automatically for multi-device play
  useEffect(() => {
    let active = true;
    async function checkSharedLink() {
      try {
        const params = new URLSearchParams(window.location.search);
        const shareId = params.get('shareId');
        const gameIdParam = params.get('gameId');

        if (shareId) {
          const fetchedGame = await fetchSharedGameFromFirestore(shareId);
          if (fetchedGame && active) {
            onUpdateState((prev) => {
              const existingIndex = (prev.dragDropGames || []).findIndex((g) => g.id === fetchedGame.id);
              let updatedGames = [...(prev.dragDropGames || [])];
              if (existingIndex >= 0) {
                updatedGames[existingIndex] = fetchedGame;
              } else {
                updatedGames = [fetchedGame, ...updatedGames];
              }
              return {
                ...prev,
                dragDropGames: updatedGames
              };
            });

            setSelectedGameId(fetchedGame.id);
            setActiveTab('play');
            setSharedNoticeBanner(`🎮 Bạn đã vào thành công trò chơi chia sẻ: "${fetchedGame.title}"!`);
            return;
          }
        }

        if (gameIdParam) {
          const found = gamesList.find((g) => g.id === gameIdParam);
          if (found && active) {
            setSelectedGameId(found.id);
            setActiveTab('play');
            setSharedNoticeBanner(`🎮 Đã chọn trò chơi chia sẻ: "${found.title}"!`);
            return;
          }
        }

        // Default to 'manage' (Tạo & Quản lý) if no share params
        setActiveTab('manage');
      } catch (err) {
        console.warn('Check shared link error:', err);
        setActiveTab('manage');
      }
    }

    checkSharedLink();
    return () => {
      active = false;
    };
  }, []);

  // Filter for selecting games
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // Filtered games list
  const filteredGames = useMemo(() => {
    return gamesList.filter((g) => {
      if (filterSubject !== 'all' && g.subject !== filterSubject) return false;
      if (filterGrade !== 'all' && g.grade !== filterGrade) return false;
      return true;
    });
  }, [gamesList, filterSubject, filterGrade]);

  // Active Game State
  const [selectedGameId, setSelectedGameId] = useState<string>(() => {
    return DEFAULT_DRAG_DROP_GAMES[0]?.id || '';
  });

  const activeGame = useMemo(() => {
    return gamesList.find((g) => g.id === selectedGameId) || filteredGames[0] || gamesList[0] || null;
  }, [gamesList, selectedGameId, filteredGames]);

  // 2. Play Session State
  // remaining draggable cards in the dock
  const [dockItems, setDockItems] = useState<DragDropPair[]>([]);
  // Placed matches: For matching mode: targetLabel -> DragDropPair
  // For sorting mode: targetGroupId -> DragDropPair[]
  const [placedMatches, setPlacedMatches] = useState<Record<string, any>>({});
  // Score and game status
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState<boolean>(false);
  const [awardedReward, setAwardedReward] = useState<boolean>(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState<number>(activeGame?.timerSeconds || 90);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Audio & Fullscreen & Caption visibility & Zoom/Scale & Camera Hand Gesture
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hideCaptionsInDock, setHideCaptionsInDock] = useState<boolean>(true);
  const [cardSize, setCardSize] = useState<'normal' | 'large' | 'huge'>('huge');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Dynamic dimensions based on selected card size
  const dockCardDimensions = useMemo(() => {
    if (cardSize === 'normal') return 'w-24 h-24 sm:w-28 sm:h-28';
    if (cardSize === 'large') return 'w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40';
    return 'w-36 h-36 sm:w-44 sm:h-44 md:w-52 md:h-52'; // 'huge'
  }, [cardSize]);

  const dockImageDimensions = useMemo(() => {
    if (cardSize === 'normal') return 'w-16 h-16 sm:w-20 sm:h-20';
    if (cardSize === 'large') return 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32';
    return 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44'; // 'huge'
  }, [cardSize]);

  const dockEmojiDimensions = useMemo(() => {
    if (cardSize === 'normal') return 'text-3xl sm:text-4xl';
    if (cardSize === 'large') return 'text-4xl sm:text-5xl';
    return 'text-5xl sm:text-6xl md:text-7xl'; // 'huge'
  }, [cardSize]);

  const targetSlotDimensions = useMemo(() => {
    if (cardSize === 'normal') return 'w-16 h-16 sm:w-20 sm:h-20';
    if (cardSize === 'large') return 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32';
    return 'w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44'; // 'huge'
  }, [cardSize]);

  const targetImageDimensions = useMemo(() => {
    if (cardSize === 'normal') return 'w-12 h-12 sm:w-16 sm:h-16';
    if (cardSize === 'large') return 'w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28';
    return 'w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40'; // 'huge'
  }, [cardSize]);

  const targetEmojiDimensions = useMemo(() => {
    if (cardSize === 'normal') return 'text-2xl sm:text-3xl';
    if (cardSize === 'large') return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl md:text-6xl'; // 'huge'
  }, [cardSize]);

  // Dragging / Selection state
  const [draggedItem, setDraggedItem] = useState<DragDropPair | null>(null);
  const [selectedTouchItem, setSelectedTouchItem] = useState<DragDropPair | null>(null);
  const [activeDropZoneId, setActiveDropZoneId] = useState<string | null>(null);
  const [hintItemId, setHintItemId] = useState<string | null>(null);
  const [feedbackFlash, setFeedbackFlash] = useState<{ zoneId: string; status: 'correct' | 'wrong' } | null>(null);

  // 3. Initialize or Reset Round
  const initRound = (game?: DragDropGameItem | null) => {
    const targetGame = game !== undefined ? game : activeGame;
    if (!targetGame) {
      setDockItems([]);
      setPlacedMatches({});
      setIsGameOver(false);
      setIsTimerRunning(false);
      return;
    }

    // Shuffle dock items
    const shuffled = [...(targetGame.pairs || [])].sort(() => Math.random() - 0.5);
    setDockItems(shuffled);

    if (targetGame.mode === 'matching') {
      setPlacedMatches({});
    } else {
      // Sorting mode: empty arrays for each bucket
      const initialBuckets: Record<string, DragDropPair[]> = {};
      (targetGame.targetZones || []).forEach((z) => {
        initialBuckets[z.id] = [];
      });
      setPlacedMatches(initialBuckets);
    }

    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setIsGameOver(false);
    setShowCelebrationModal(false);
    setAwardedReward(false);
    setSelectedTouchItem(null);
    setDraggedItem(null);
    setHintItemId(null);
    setFeedbackFlash(null);

    const initialTime = targetGame?.timerSeconds && targetGame.timerSeconds > 0 ? targetGame.timerSeconds : 0;
    setTimeLeft(initialTime);
    setIsTimerRunning(initialTime > 0);
  };

  useEffect(() => {
    initRound(activeGame);
  }, [activeGame?.id]);

  // Countdown timer effect
  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timeLeft > 0 && !isGameOver) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (soundEnabled) playBeep(260, 0.4, 0.15);
            return 0;
          }
          if (prev <= 5 && soundEnabled) {
            playTick();
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isGameOver, soundEnabled]);

  // Handle Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!arenaRef.current) return;
    if (!document.fullscreenElement) {
      arenaRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 4. Drop Verification & Matching Logic
  const handleAttemptMatch = (item: DragDropPair, targetId: string) => {
    if (isGameOver || !activeGame) return;

    let isCorrect = false;

    if (activeGame.mode === 'matching') {
      // 1-to-1 matching: targetId is the targetLabel
      isCorrect = item.targetLabel === targetId;

      if (isCorrect) {
        // Place item in target slot
        setPlacedMatches((prev) => ({
          ...prev,
          [targetId]: item
        }));
        // Remove from dock
        setDockItems((prev) => prev.filter((d) => d.id !== item.id));
        setCorrectCount((prev) => prev + 1);
        setScore((prev) => prev + 10);
        setSelectedTouchItem(null);
        setFeedbackFlash({ zoneId: targetId, status: 'correct' });

        // Play applause sound & multi-angle fireworks burst on correct match!
        if (soundEnabled) {
          playApplauseSound();
        }

        // Vibrant center-screen fireworks burst
        confetti({
          particleCount: 65,
          spread: 80,
          startVelocity: 40,
          origin: { y: 0.55 },
          colors: ['#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#f43f5e', '#fbbf24'],
          scalar: 1.15
        });

        // Secondary side pop for maximum excitement
        setTimeout(() => {
          confetti({
            particleCount: 35,
            angle: 60,
            spread: 55,
            origin: { x: 0.15, y: 0.65 },
            colors: ['#38bdf8', '#f43f5e', '#a855f7']
          });
          confetti({
            particleCount: 35,
            angle: 120,
            spread: 55,
            origin: { x: 0.85, y: 0.65 },
            colors: ['#34d399', '#fbbf24', '#e879f9']
          });
        }, 120);

        // Check if finished round
        const totalNeeded = activeGame.pairs?.length || 0;
        if (correctCount + 1 >= totalNeeded) {
          triggerVictory();
        }
      } else {
        // Wrong target: Play failure sound!
        setWrongCount((prev) => prev + 1);
        setSelectedTouchItem(null);
        setFeedbackFlash({ zoneId: targetId, status: 'wrong' });

        if (soundEnabled) {
          playWrongSound();
        }
      }
    } else {
      // Sorting mode: targetId is the targetGroupId
      isCorrect = item.targetGroupId === targetId;

      if (isCorrect) {
        // Add item to bucket
        setPlacedMatches((prev) => {
          const currentList = prev[targetId] || [];
          return {
            ...prev,
            [targetId]: [...currentList, item]
          };
        });
        // Remove from dock
        setDockItems((prev) => prev.filter((d) => d.id !== item.id));
        setCorrectCount((prev) => prev + 1);
        setScore((prev) => prev + 10);
        setSelectedTouchItem(null);
        setFeedbackFlash({ zoneId: targetId, status: 'correct' });

        // Play applause sound & multi-angle fireworks burst on correct match!
        if (soundEnabled) {
          playApplauseSound();
        }

        // Vibrant center-screen fireworks burst
        confetti({
          particleCount: 65,
          spread: 80,
          startVelocity: 40,
          origin: { y: 0.55 },
          colors: ['#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6', '#f43f5e', '#fbbf24'],
          scalar: 1.15
        });

        // Secondary side pop for maximum excitement
        setTimeout(() => {
          confetti({
            particleCount: 35,
            angle: 60,
            spread: 55,
            origin: { x: 0.15, y: 0.65 },
            colors: ['#38bdf8', '#f43f5e', '#a855f7']
          });
          confetti({
            particleCount: 35,
            angle: 120,
            spread: 55,
            origin: { x: 0.85, y: 0.65 },
            colors: ['#34d399', '#fbbf24', '#e879f9']
          });
        }, 120);

        // Check if finished
        const totalNeeded = activeGame.pairs?.length || 0;
        if (correctCount + 1 >= totalNeeded) {
          triggerVictory();
        }
      } else {
        // Wrong bucket: Play failure sound!
        setWrongCount((prev) => prev + 1);
        setSelectedTouchItem(null);
        setFeedbackFlash({ zoneId: targetId, status: 'wrong' });

        if (soundEnabled) {
          playWrongSound();
        }
      }
    }

    setTimeout(() => {
      setFeedbackFlash(null);
    }, 600);
  };

  // Trigger Victory Celebrations
  const triggerVictory = () => {
    setIsGameOver(true);
    setIsTimerRunning(false);
    setShowCelebrationModal(true);

    if (soundEnabled) {
      playCelebration();
    }

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
    setTimeout(() => {
      confetti({
        particleCount: 50,
        spread: 90,
        origin: { x: 0.2, y: 0.5 }
      });
      confetti({
        particleCount: 50,
        spread: 90,
        origin: { x: 0.8, y: 0.5 }
      });
    }, 350);
  };

  // Award flowers/coins to active class students
  const handleAwardFlowersToClass = () => {
    if (awardedReward || !activeGame) return;
    const amount = activeGame.rewardFlowers || 3;

    onUpdateState((prev) => {
      const activeClassStudents = prev.students.filter((s) => s.classId === prev.activeClassId);
      if (activeClassStudents.length === 0) return prev;

      const updatedStudents = prev.students.map((s) => {
        if (s.classId === prev.activeClassId) {
          return { ...s, coins: (s.coins || 0) + amount };
        }
        return s;
      });

      return {
        ...prev,
        students: updatedStudents
      };
    });

    setAwardedReward(true);
    if (soundEnabled) playBeep(880, 0.2, 0.2);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
  };

  // Provide a visual hint for an unmatched item
  const handleProvideHint = () => {
    if (dockItems.length === 0) return;
    const target = dockItems[0];
    setHintItemId(target.id);
    if (soundEnabled) playBeep(523, 0.15, 0.1);

    setTimeout(() => {
      setHintItemId(null);
    }, 3000);
  };

  // Return an already placed item back to dock (Undo placement)
  const handleReturnItemToDock = (item: DragDropPair, targetZoneId?: string) => {
    if (isGameOver || !activeGame) return;

    if (activeGame.mode === 'matching') {
      setPlacedMatches((prev) => {
        const copy = { ...prev };
        delete copy[item.targetLabel];
        return copy;
      });
    } else if (targetZoneId) {
      setPlacedMatches((prev) => {
        const currentList = prev[targetZoneId] || [];
        return {
          ...prev,
          [targetZoneId]: currentList.filter((x: DragDropPair) => x.id !== item.id)
        };
      });
    }

    setDockItems((prev) => [...prev, item]);
    setCorrectCount((prev) => Math.max(0, prev - 1));
    setScore((prev) => Math.max(0, prev - 10));
    if (soundEnabled) playTick();
  };

  // 4. Share Game Link for Multi-device Play
  const handleOpenShareModal = async (game: DragDropGameItem) => {
    setShareModalGame(game);
    setIsSharingLoading(true);
    setCopiedLink(false);

    try {
      // Use existing ID or generate a stable share ID
      const shareId = game.id || `share-${uid()}`;
      await saveSharedGameToFirestore(shareId, game);

      const baseUrl = window.location.origin + window.location.pathname;
      const fullUrl = `${baseUrl}?tab=dragdrop&shareId=${shareId}`;
      setShareUrl(fullUrl);
    } catch (e) {
      console.warn('Error saving shared game to Firestore:', e);
      const baseUrl = window.location.origin + window.location.pathname;
      setShareUrl(`${baseUrl}?tab=dragdrop&gameId=${game.id}`);
    } finally {
      setIsSharingLoading(false);
    }
  };

  const handleCopyShareUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // 5. Game Creator & Customizer State
  const [editingGame, setEditingGame] = useState<DragDropGameItem | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [activeHotspotIndex, setActiveHotspotIndex] = useState<number>(0);
  const [showEmojiPickerForIndex, setShowEmojiPickerForIndex] = useState<number | null>(null);
  const [emojiSearch, setEmojiSearch] = useState<string>('');
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const centerFileUploadRef = useRef<HTMLInputElement>(null);
  const [uploadIndexTarget, setUploadIndexTarget] = useState<number | null>(null);
  const [urlModalIndex, setUrlModalIndex] = useState<number | null>(null);
  const [inputImageUrl, setInputImageUrl] = useState<string>('');

  const handleUploadCenterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingGame) return;
    try {
      const compressedBase64 = await compressImageFile(file, 800, 0.85);
      setEditingGame({
        ...editingGame,
        centerImage: compressedBase64,
        centerImageCaption: editingGame.centerImageCaption || 'Mô hình trung tâm'
      });
    } catch (err) {
      console.error('Failed to compress center image', err);
    }
  };

  // Apply Quick Starter Templates for easy game creation
  const applyTemplateToEditor = (templateType: 'math' | 'vietnamese' | 'english' | 'science' | 'cs' | 'blank') => {
    if (!editingGame) return;
    if (templateType === 'math') {
      setEditingGame({
        ...editingGame,
        title: 'Nhận biết Hình Học & Khối Không Gian',
        description: 'Kéo thả các hình học và vật thể vào đúng tên gọi hình tương ứng.',
        subject: 'Toán',
        grade: 'Khối 2',
        mode: 'matching',
        timerSeconds: 90,
        rewardFlowers: 3,
        pairs: [
          { id: uid('p'), image: '⭕', imageType: 'emoji', caption: 'Hình tròn', targetLabel: 'Hình tròn', hint: 'Đường cong khép kín' },
          { id: uid('p'), image: '⬛', imageType: 'emoji', caption: 'Hình vuông', targetLabel: 'Hình vuông', hint: '4 cạnh bằng nhau' },
          { id: uid('p'), image: '🔺', imageType: 'emoji', caption: 'Hình tam giác', targetLabel: 'Hình tam giác', hint: '3 cạnh và 3 đỉnh' },
          { id: uid('p'), image: '🎲', imageType: 'emoji', caption: 'Xúc xắc', targetLabel: 'Khối lập phương', hint: '6 mặt hình vuông' },
          { id: uid('p'), image: '🥫', imageType: 'emoji', caption: 'Lon sữa', targetLabel: 'Khối trụ', hint: '2 mặt đáy hình tròn' }
        ]
      });
    } else if (templateType === 'vietnamese') {
      setEditingGame({
        ...editingGame,
        title: 'Phân Loại Từ Chỉ Sự Vật & Hoạt Động',
        description: 'Kéo thả các từ ngữ và hình ảnh vào đúng nhóm từ loại tương ứng.',
        subject: 'Tiếng Việt',
        grade: 'Khối 2',
        mode: 'sorting',
        timerSeconds: 120,
        rewardFlowers: 4,
        targetZones: [
          { id: 'cat-sv', label: 'Từ chỉ Sự vật', description: 'Tên người, đồ vật, cây cối, con vật', color: 'sky' },
          { id: 'cat-hd', label: 'Từ chỉ Hoạt động', description: 'Cử động, việc làm của người hoặc vật', color: 'emerald' }
        ],
        pairs: [
          { id: uid('p'), image: '🏫', imageType: 'emoji', caption: 'Ngôi trường', targetLabel: 'Từ chỉ Sự vật', targetGroupId: 'cat-sv' },
          { id: uid('p'), image: '📖', imageType: 'emoji', caption: 'Quyển sách', targetLabel: 'Từ chỉ Sự vật', targetGroupId: 'cat-sv' },
          { id: uid('p'), image: '🐶', imageType: 'emoji', caption: 'Con chó', targetLabel: 'Từ chỉ Sự vật', targetGroupId: 'cat-sv' },
          { id: uid('p'), image: '🏃', imageType: 'emoji', caption: 'Chạy bộ', targetLabel: 'Từ chỉ Hoạt động', targetGroupId: 'cat-hd' },
          { id: uid('p'), image: '🎤', imageType: 'emoji', caption: 'Ca hát', targetLabel: 'Từ chỉ Hoạt động', targetGroupId: 'cat-hd' },
          { id: uid('p'), image: '🏊', imageType: 'emoji', caption: 'Bơi lội', targetLabel: 'Từ chỉ Hoạt động', targetGroupId: 'cat-hd' }
        ]
      });
    } else if (templateType === 'english') {
      setEditingGame({
        ...editingGame,
        title: 'English Vocabulary: Animals & Fruits',
        description: 'Drag each picture to its correct English word and meaning.',
        subject: 'Tiếng Anh',
        grade: 'Khối 3',
        mode: 'matching',
        timerSeconds: 90,
        rewardFlowers: 3,
        pairs: [
          { id: uid('p'), image: '🐱', imageType: 'emoji', caption: 'Con mèo', targetLabel: 'Cat (Con mèo)', hint: 'Meow meow' },
          { id: uid('p'), image: '🐶', imageType: 'emoji', caption: 'Con chó', targetLabel: 'Dog (Con chó)', hint: 'Woof woof' },
          { id: uid('p'), image: '🍎', imageType: 'emoji', caption: 'Quả táo', targetLabel: 'Apple (Quả táo)', hint: 'Red sweet fruit' },
          { id: uid('p'), image: '🍌', imageType: 'emoji', caption: 'Quả chuối', targetLabel: 'Banana (Quả chuối)', hint: 'Yellow curved fruit' },
          { id: uid('p'), image: '🐘', imageType: 'emoji', caption: 'Con voi', targetLabel: 'Elephant (Con voi)', hint: 'Big animal with trunk' }
        ]
      });
    } else if (templateType === 'science') {
      setEditingGame({
        ...editingGame,
        title: 'Phân Loại Động Vật Đẻ Con & Đẻ Trứng',
        description: 'Kéo thả các con vật vào đúng nhóm hình thức sinh sản.',
        subject: 'Tự nhiên & Xã hội',
        grade: 'Khối 3',
        mode: 'sorting',
        timerSeconds: 100,
        rewardFlowers: 3,
        targetZones: [
          { id: 'cat-de-con', label: 'Động vật đẻ con', description: 'Nuôi con bằng sữa mẹ (Thú)', color: 'rose' },
          { id: 'cat-de-trung', label: 'Động vật đẻ trứng', description: 'Trứng nở thành con', color: 'amber' }
        ],
        pairs: [
          { id: uid('p'), image: '🐶', imageType: 'emoji', caption: 'Con Chó', targetLabel: 'Động vật đẻ con', targetGroupId: 'cat-de-con' },
          { id: uid('p'), image: '🐱', imageType: 'emoji', caption: 'Con Mèo', targetLabel: 'Động vật đẻ con', targetGroupId: 'cat-de-con' },
          { id: uid('p'), image: '🐔', imageType: 'emoji', caption: 'Con Gà', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-de-trung' },
          { id: uid('p'), image: '🦆', imageType: 'emoji', caption: 'Con Vịt', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-de-trung' },
          { id: uid('p'), image: '🕊️', imageType: 'emoji', caption: 'Bồ câu', targetLabel: 'Động vật đẻ trứng', targetGroupId: 'cat-de-trung' }
        ]
      });
    } else if (templateType === 'cs') {
      setEditingGame({
        ...editingGame,
        title: 'Thiết Bị Vào (Input) & Thiết Bị Ra (Output)',
        description: 'Kéo thả các bộ phận máy tính vào nhóm Thiết bị Vào hoặc Ra.',
        subject: 'Tin học',
        grade: 'Khối 4',
        mode: 'sorting',
        timerSeconds: 100,
        rewardFlowers: 3,
        targetZones: [
          { id: 'cat-in', label: 'Thiết Bị Vào (Input)', description: 'Thu nhận thông tin gửi vào máy tính', color: 'indigo' },
          { id: 'cat-out', label: 'Thiết Bị Ra (Output)', description: 'Xuất hoặc hiển thị thông tin ra ngoài', color: 'emerald' }
        ],
        pairs: [
          { id: uid('p'), image: '⌨️', imageType: 'emoji', caption: 'Bàn phím', targetLabel: 'Thiết Bị Vào (Input)', targetGroupId: 'cat-in' },
          { id: uid('p'), image: '🖱️', imageType: 'emoji', caption: 'Chuột máy tính', targetLabel: 'Thiết Bị Vào (Input)', targetGroupId: 'cat-in' },
          { id: uid('p'), image: '🖥️', imageType: 'emoji', caption: 'Màn hình', targetLabel: 'Thiết Bị Ra (Output)', targetGroupId: 'cat-out' },
          { id: uid('p'), image: '🖨️', imageType: 'emoji', caption: 'Máy in', targetLabel: 'Thiết Bị Ra (Output)', targetGroupId: 'cat-out' },
          { id: uid('p'), image: '🎧', imageType: 'emoji', caption: 'Loa / Tai nghe', targetLabel: 'Thiết Bị Ra (Output)', targetGroupId: 'cat-out' }
        ]
      });
    } else {
      setEditingGame({
        ...editingGame,
        title: 'Trò chơi kéo thả mới',
        description: 'Mô tả hướng dẫn trò chơi...',
        pairs: [
          { id: uid('p'), image: '⭐', imageType: 'emoji', caption: 'Hình 1', targetLabel: 'Đáp án 1' }
        ]
      });
    }
  };

  // Open Editor for Creating New Game
  const handleOpenNewGame = () => {
    const newGame: DragDropGameItem = {
      id: uid('game-custom'),
      title: 'Trò chơi kéo thả mới',
      description: 'Mô tả ngắn gọn quy tắc hoặc hướng dẫn chơi cho học sinh...',
      subject: 'Toán',
      grade: 'Khối 3',
      mode: 'matching',
      timerSeconds: 90,
      rewardFlowers: 3,
      createdAt: new Date().toISOString(),
      pairs: [
        { id: uid('p'), image: '⭕', imageType: 'emoji', caption: 'Hình tròn', targetLabel: 'Hình tròn', hint: 'Không có cạnh' },
        { id: uid('p'), image: '⬛', imageType: 'emoji', caption: 'Hình vuông', targetLabel: 'Hình vuông', hint: '4 cạnh bằng nhau' },
        { id: uid('p'), image: '🔺', imageType: 'emoji', caption: 'Hình tam giác', targetLabel: 'Hình tam giác', hint: '3 cạnh và 3 góc' }
      ]
    };
    setEditingGame(newGame);
    setIsEditorOpen(true);
  };

  // Open Editor for Modifying Game
  const handleEditGame = (game: DragDropGameItem) => {
    setEditingGame(JSON.parse(JSON.stringify(game)));
    setIsEditorOpen(true);
  };

  // Duplicate an existing game to quickly make variations
  const handleDuplicateGame = (game: DragDropGameItem) => {
    const duplicated: DragDropGameItem = {
      ...JSON.parse(JSON.stringify(game)),
      id: uid('game-copy'),
      title: `${game.title} (Bản sao)`,
      createdAt: new Date().toISOString(),
      isPreset: false
    };

    onUpdateState((prev) => {
      const existing = prev.dragDropGames || [];
      return {
        ...prev,
        dragDropGames: [duplicated, ...existing]
      };
    });

    setSelectedGameId(duplicated.id);
    if (soundEnabled) playBeep(659, 0.15, 0.1);
  };

  const [showConfirmDeleteAllModal, setShowConfirmDeleteAllModal] = useState<boolean>(false);

  // Delete a single game
  const handleDeleteGame = (gameId: string) => {
    if (!window.confirm('Thầy/Cô có chắc chắn muốn xóa trò chơi kéo thả này?')) return;

    const updated = gamesList.filter((g) => g.id !== gameId);
    onUpdateState((prev) => ({
      ...prev,
      dragDropGames: updated
    }));

    if (selectedGameId === gameId) {
      if (updated.length > 0) {
        setSelectedGameId(updated[0].id);
      }
    }
    if (soundEnabled) playTick();
  };

  // Delete All Drag & Drop Games
  const handleDeleteAllGames = () => {
    if (gamesList.length === 0) return;
    setShowConfirmDeleteAllModal(true);
  };

  const handleConfirmDeleteAll = () => {
    onUpdateState((prev) => ({
      ...prev,
      dragDropGames: []
    }));
    setShowConfirmDeleteAllModal(false);
    setSelectedGameId('');
    if (soundEnabled) playTick();
  };

  // Restore Default Preset Games
  const handleRestoreDefaultGames = () => {
    onUpdateState((prev) => ({
      ...prev,
      dragDropGames: [...DEFAULT_DRAG_DROP_GAMES]
    }));
    if (DEFAULT_DRAG_DROP_GAMES.length > 0) {
      setSelectedGameId(DEFAULT_DRAG_DROP_GAMES[0].id);
    }
    if (soundEnabled) playCelebration();
  };

  // Save Game from Editor
  const handleSaveGame = () => {
    if (!editingGame) return;
    if (!editingGame.title.trim()) {
      alert('Vui lòng nhập tiêu đề trò chơi!');
      return;
    }
    if (editingGame.pairs.length < 2) {
      alert('Trò chơi cần ít nhất 2 câu hỏi/cặp hình ảnh để bắt đầu!');
      return;
    }

    onUpdateState((prev) => {
      const existing = prev.dragDropGames || [];
      const idx = existing.findIndex((g) => g.id === editingGame.id);
      let updated: DragDropGameItem[];

      if (idx >= 0) {
        updated = [...existing];
        updated[idx] = editingGame;
      } else {
        updated = [editingGame, ...existing];
      }

      return {
        ...prev,
        dragDropGames: updated
      };
    });

    setSelectedGameId(editingGame.id);
    setIsEditorOpen(false);
    setEditingGame(null);
    if (soundEnabled) playCelebration();
  };

  // Handle Image File Upload for an item with automatic compression
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadIndexTarget === null || !editingGame) return;

    try {
      const base64 = await compressImageFile(file, 400, 0.85);
      if (base64) {
        const updatedPairs = [...editingGame.pairs];
        updatedPairs[uploadIndexTarget] = {
          ...updatedPairs[uploadIndexTarget],
          image: base64,
          imageType: 'upload'
        };
        setEditingGame({ ...editingGame, pairs: updatedPairs });
      }
    } catch {
      const reader = new FileReader();
      reader.onload = (event) => {
        const b64 = event.target?.result as string;
        if (b64) {
          const updatedPairs = [...editingGame.pairs];
          updatedPairs[uploadIndexTarget] = {
            ...updatedPairs[uploadIndexTarget],
            image: b64,
            imageType: 'upload'
          };
          setEditingGame({ ...editingGame, pairs: updatedPairs });
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
    setUploadIndexTarget(null);
  };

  // Apply image URL to an item
  const handleApplyImageUrl = (overrideUrl?: string) => {
    if (urlModalIndex === null || !editingGame) return;
    const urlToUse = (overrideUrl !== undefined ? overrideUrl : inputImageUrl).trim();
    if (!urlToUse) {
      alert('Vui lòng nhập đường link hình ảnh (URL)!');
      return;
    }
    const updatedPairs = [...editingGame.pairs];
    updatedPairs[urlModalIndex] = {
      ...updatedPairs[urlModalIndex],
      image: urlToUse,
      imageType: 'url'
    };
    setEditingGame({ ...editingGame, pairs: updatedPairs });
    setUrlModalIndex(null);
    setInputImageUrl('');
  };

  // Export Games to JSON file
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(gamesList, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `tro_choi_keo_tha_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
  };

  // Import Games from JSON file
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          onUpdateState((prev) => {
            const current = prev.dragDropGames || [];
            const merged = [...imported, ...current];
            return { ...prev, dragDropGames: merged };
          });
          alert(`Đã nhập thành công ${imported.length} trò chơi kéo thả!`);
        }
      } catch (err) {
        alert('File không hợp lệ hoặc sai định dạng JSON trò chơi!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered Emojis for picker
  const filteredEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return EDUCATIONAL_EMOJI_LIBRARY;
    const q = emojiSearch.toLowerCase();
    return EDUCATIONAL_EMOJI_LIBRARY.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }, [emojiSearch]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Header Banner & Mode Tabs */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 rounded-3xl p-5 sm:p-6 text-white shadow-xl shadow-orange-950/15 border border-amber-400/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-black uppercase tracking-wider">
              <Move className="w-3.5 h-3.5 text-amber-200" />
              <span>MINIGAME HỌC TẬP TƯƠNG TÁC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trò Chơi Kéo Thả Hình Ảnh & Đáp Án
            </h1>
            <p className="text-amber-100 text-xs sm:text-sm font-medium leading-relaxed">
              Kéo thả hình ảnh vào ô đáp án đúng, nối từ ngữ - khái niệm tương ứng. Hỗ trợ cảm ứng, chuột và tính năng tự tạo trò chơi cho Thầy/Cô.
            </p>
          </div>

          {/* Action Tabs & Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('play')}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                activeTab === 'play'
                  ? 'bg-white text-orange-900 shadow-white/20 scale-[1.02]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>🎮 Chơi Trò Chơi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('manage')}
              className={`px-4 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer ${
                activeTab === 'manage'
                  ? 'bg-white text-orange-900 shadow-white/20 scale-[1.02]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>🛠️ Tạo & Quản Lý ({gamesList.length})</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewGame}
              className="px-4 py-2.5 rounded-2xl bg-amber-300 hover:bg-amber-200 text-amber-950 font-black text-xs sm:text-sm transition-all shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Tạo Game Mới</span>
            </button>
          </div>
        </div>

        {/* Decorative background shape */}
        <div className="absolute -right-8 -bottom-10 opacity-10 pointer-events-none">
          <Gamepad2 className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* 2. TAB CONTENT: PLAY ARENA */}
      {activeTab === 'play' && (
        <div className="space-y-4">
          {/* Top Control Bar: Game Switcher & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Left: Quick Game Selector */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1 shrink-0">
                <Gamepad2 className="w-4 h-4 text-orange-500" />
                Chọn Game:
              </span>

              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-orange-500 cursor-pointer max-w-xs truncate"
              >
                {filteredGames.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({g.subject} - {g.grade})
                  </option>
                ))}
              </select>

              {/* Subject & Grade Filter Dropdowns */}
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">📚 Tất cả môn</option>
                <option value="Toán">Toán</option>
                <option value="Tiếng Việt">Tiếng Việt</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Tự nhiên & Xã hội">Tự nhiên & Xã hội</option>
                <option value="Tin học">Tin học</option>
                <option value="Khoa học">Khoa học</option>
              </select>

              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-hidden cursor-pointer"
              >
                <option value="all">🎓 Tất cả khối</option>
                <option value="Khối 1">Khối 1</option>
                <option value="Khối 2">Khối 2</option>
                <option value="Khối 3">Khối 3</option>
                <option value="Khối 4">Khối 4</option>
                <option value="Khối 5">Khối 5</option>
              </select>
            </div>

            {/* Right: Sound, Restart, Fullscreen */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              {/* Hint button */}
              <button
                type="button"
                onClick={handleProvideHint}
                disabled={dockItems.length === 0 || isGameOver}
                className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                title="Gợi ý vị trí tiếp theo"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">Gợi ý</span>
              </button>

              {/* Frame Size Selector Button Group */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setCardSize('normal')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    cardSize === 'normal'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Khung hình Nhỏ"
                >
                  Nhỏ
                </button>
                <button
                  type="button"
                  onClick={() => setCardSize('large')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                    cardSize === 'large'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Khung hình Vừa"
                >
                  Vừa
                </button>
                <button
                  type="button"
                  onClick={() => setCardSize('huge')}
                  className={`px-2 py-1 rounded-lg text-[11px] font-black cursor-pointer transition-all ${
                    cardSize === 'huge'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-700 hover:text-slate-900'
                  }`}
                  title="Khung hình Rất lớn (Phóng to sắc nét)"
                >
                  🔍 Rất lớn
                </button>
              </div>

              {/* Sound Toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  soundEnabled
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}
                title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Camera Hand Control Toggle Button */}
              <button
                type="button"
                onClick={() => setIsCameraActive(!isCameraActive)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  isCameraActive
                    ? 'bg-amber-400 border-amber-500 text-slate-950 ring-2 ring-amber-400/50 animate-pulse'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                }`}
                title={isCameraActive ? 'Tắt chế độ Camera cử chỉ bàn tay' : 'Bật chế độ điều khiển bằng bàn tay qua Camera'}
              >
                {isCameraActive ? <CameraOff className="w-4 h-4 text-slate-950" /> : <Camera className="w-4 h-4 text-emerald-700" />}
                <span>{isCameraActive ? '📹 Tắt Camera Tay' : '📹 Camera Nắm Tay'}</span>
              </button>

              {/* Hide/Show Captions Toggle Button */}
              <button
                type="button"
                onClick={() => setHideCaptionsInDock(!hideCaptionsInDock)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  hideCaptionsInDock
                    ? 'bg-amber-100/80 border-amber-300 text-amber-900 font-black'
                    : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
                title={hideCaptionsInDock ? 'Đang ẩn chú thích dưới hình (tránh học sinh biết đáp án)' : 'Đang hiện chú thích chữ dưới hình'}
              >
                {hideCaptionsInDock ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5 text-slate-600" />}
                <span className="hidden sm:inline">{hideCaptionsInDock ? 'Đã ẩn chú thích' : 'Hiện chú thích'}</span>
              </button>

              {/* Restart Round */}
              <button
                type="button"
                onClick={() => initRound(activeGame)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Bắt đầu lại màn này"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chơi lại</span>
              </button>

              {/* Share Game Link for Multi-device Play */}
              {activeGame && (
                <button
                  type="button"
                  onClick={() => handleOpenShareModal(activeGame)}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="Chia sẻ đường link trò chơi này cho nhiều máy tính chơi cùng lúc"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Chia sẻ link</span>
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span>{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
            </div>
          </div>

          {/* Shared Game Notice Banner */}
          {sharedNoticeBanner && (
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-3 rounded-2xl shadow-md flex items-center justify-between gap-3 text-xs sm:text-sm font-bold animate-in fade-in slide-in-from-top-2 border border-blue-400">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-white/20">
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                </div>
                <span>{sharedNoticeBanner}</span>
              </div>
              <button
                type="button"
                onClick={() => setSharedNoticeBanner(null)}
                className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white cursor-pointer transition-all"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* GAME ARENA CONTAINER */}
          {!activeGame ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-amber-300 p-8 sm:p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto text-slate-800">
                <h4 className="text-base sm:text-lg font-black">
                  Chưa Có Trò Chơi Nào Được Chọn
                </h4>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {gamesList.length === 0
                    ? 'Danh sách trò chơi đang trống. Vui lòng nạp lại bộ trò chơi mẫu hoặc tự tạo trò chơi mới!'
                    : 'Không tìm thấy trò chơi phù hợp với môn học và khối lớp đã chọn.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {gamesList.length === 0 ? (
                  <button
                    type="button"
                    onClick={handleRestoreDefaultGames}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Nạp lại bộ trò chơi mẫu</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSubject('all');
                      setFilterGrade('all');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleOpenNewGame}
                  className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Tạo trò chơi mới</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={arenaRef}
              className={`relative bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 rounded-3xl border-4 border-slate-800 shadow-2xl p-4 sm:p-6 text-white overflow-hidden transition-all ${
                isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0 h-screen w-screen flex flex-col justify-between overflow-y-auto' : ''
              } ${isCameraActive ? 'pb-36' : ''}`}
            >
            {/* Top Score, Progress & Timer Bar */}
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-amber-300 tracking-tight leading-tight">
                    {activeGame.title}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-bold">
                    {activeGame.subject} · {activeGame.grade} · {activeGame.mode === 'matching' ? 'Nối cặp 1-1' : 'Phân loại nhóm'}
                  </p>
                </div>
              </div>

              {/* Status Badges: Pairs Count & Timer */}
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Accuracy & Score Counter */}
                <div className="px-3 py-1.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs font-black flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Đúng: <strong className="text-emerald-300">{correctCount}</strong>/{activeGame.pairs.length}
                  </span>
                </div>

                {/* Score */}
                <div className="px-3 py-1.5 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black flex items-center gap-1">
                  <span>Điểm: {score}</span>
                </div>

                {/* Timer Badge */}
                {activeGame.timerSeconds && activeGame.timerSeconds > 0 ? (
                  <div
                    className={`px-3 py-1.5 rounded-2xl border text-xs font-black flex items-center gap-1.5 transition-all ${
                      timeLeft <= 10
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300 animate-pulse'
                        : 'bg-slate-800 border-slate-700 text-teal-300'
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                    <span>⏰ {timeLeft}s</span>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Instruction Guidance Banner */}
            <div className={`relative z-10 p-2.5 rounded-2xl border mb-5 flex items-center justify-between text-xs text-slate-300 transition-all ${
              isCameraActive
                ? 'bg-amber-950/70 border-amber-500/80 text-amber-200'
                : 'bg-slate-800/70 border-slate-700/80'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full animate-ping ${isCameraActive ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                <span className="font-bold">
                  {isCameraActive
                    ? '📹 CHẾ ĐỘ CAMERA TAY: Nắm cả bàn tay ✊ để nhấc hình (hoặc chụm 2 ngón), di chuyển đến ô đáp án & XÒE TAY 🖐 để thả!'
                    : selectedTouchItem
                    ? hideCaptionsInDock
                      ? `👉 Đang chọn [Hình #${dockItems.findIndex((i) => i.id === selectedTouchItem.id) + 1}]. Hãy bấm vào ô đáp án tương ứng để ghép!`
                      : `👉 Đang chọn [${selectedTouchItem.caption || selectedTouchItem.targetLabel}]. Hãy bấm vào ô đáp án tương ứng để ghép!`
                    : activeGame?.mode === 'matching'
                    ? '👉 Kéo hình ảnh thả vào ô đáp án đúng, hoặc chạm vào hình rồi chạm ô đáp án.'
                    : '👉 Kéo các hình ảnh vào đúng thùng/nhóm phân loại bên dưới.'}
                </span>
              </div>
              {selectedTouchItem && (
                <button
                  type="button"
                  onClick={() => setSelectedTouchItem(null)}
                  className="px-2 py-0.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[11px] cursor-pointer"
                >
                  Hủy chọn
                </button>
              )}
            </div>

            {/* Hand Gesture Camera Controller & Virtual Hand Pointer Overlay */}
            <HandGestureController
              isCameraActive={isCameraActive}
              onToggleCamera={() => setIsCameraActive(!isCameraActive)}
              dockItems={dockItems}
              onAttemptMatch={handleAttemptMatch}
              soundEnabled={soundEnabled}
              playTick={playTick}
              arenaRef={arenaRef}
            />

            {/* MAIN STAGE CONTENT */}
            <div className="relative z-10 flex-1 space-y-6">
              {activeGame.centerImage ? (
                /* ============================================================ */
                /* MODE A: CENTRAL BACKGROUND IMAGE HOTSPOT CANVAS (WITH 2 SIDE TRAYS) */
                /* ============================================================ */
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-black text-amber-300 uppercase tracking-wider bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{activeGame.centerImageCaption || 'Trò chơi Đính mảnh ghép lên mô hình trung tâm'}</span>
                    </div>
                    <span className="text-slate-300 text-[11px] font-bold">
                      {dockItems.length === 0 ? '🎉 Đã đính hoàn tất tất cả mảnh ghép!' : `Còn lại: ${dockItems.length} mảnh ghép`}
                    </span>
                  </div>

                  {/* 3-COLUMN SPLIT LAYOUT: LEFT TRAY | LARGE CENTRAL PICTURE WITH HOTSPOTS | RIGHT TRAY */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    {/* LEFT SIDE TRAY (Khay bên Trái ⬅️) */}
                    <div className="lg:col-span-3 xl:col-span-2 p-3.5 rounded-3xl bg-slate-800/80 border-2 border-slate-700/80 shadow-lg space-y-3 min-h-[220px]">
                      <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-700 pb-2">
                        <span>Khay Trái ({dockItems.filter((_, i) => i % 2 === 0).length})</span>
                        <span>⬅️</span>
                      </div>

                      <div className="flex flex-wrap lg:flex-col gap-3 items-center justify-center">
                        {dockItems.filter((_, i) => i % 2 === 0).map((item) => {
                          const isSelected = selectedTouchItem?.id === item.id;
                          const isHinted = hintItemId === item.id;

                          return (
                            <div
                              key={item.id}
                              data-dock-id={item.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedItem(item);
                                e.dataTransfer.setData('text/plain', item.id);
                              }}
                              onDragEnd={() => setDraggedItem(null)}
                              onClick={() => {
                                if (selectedTouchItem?.id === item.id) {
                                  setSelectedTouchItem(null);
                                } else {
                                  setSelectedTouchItem(item);
                                  if (soundEnabled) playTick();
                                }
                              }}
                              className={`dock-card-item group relative flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-grab active:cursor-grabbing select-none shadow-lg w-full max-w-[130px] lg:max-w-none ${
                                isSelected
                                  ? 'bg-amber-400/20 border-amber-400 ring-4 ring-amber-400/50 scale-105 shadow-amber-500/30'
                                  : isHinted
                                  ? 'bg-teal-400/30 border-teal-300 ring-4 ring-teal-400/60 animate-bounce'
                                  : 'bg-slate-700/80 hover:bg-slate-700 border-slate-600 hover:border-amber-400 hover:scale-105'
                              }`}
                            >
                              {item.imageType === 'upload' || (item.image && (item.image.startsWith('data:image') || item.image.startsWith('http'))) ? (
                                <img src={item.image} alt={item.caption || item.targetLabel} className="w-14 h-14 object-contain rounded-xl drop-shadow-md pointer-events-none" />
                              ) : (
                                <span className="text-3xl drop-shadow-md select-none pointer-events-none">{item.image}</span>
                              )}
                              {!hideCaptionsInDock && item.caption && (
                                <span className="text-[11px] font-bold text-slate-200 mt-1 text-center truncate max-w-full">{item.caption}</span>
                              )}
                              {isSelected && (
                                <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm animate-pulse">
                                  Đang chọn
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {dockItems.filter((_, i) => i % 2 === 0).length === 0 && (
                          <div className="text-xs text-slate-400 italic text-center py-4">Đã hết mảnh ở khay trái</div>
                        )}
                      </div>
                    </div>

                    {/* CENTRAL BACKGROUND IMAGE WITH OVERLAID HOTSPOT TARGET ZONES (WIDE & SPACIOUS) */}
                    <div className="lg:col-span-6 xl:col-span-8 p-4 sm:p-6 rounded-3xl bg-slate-900/95 border-4 border-amber-400/80 shadow-2xl flex flex-col items-center justify-center relative min-h-[460px] sm:min-h-[540px] lg:min-h-[620px] overflow-hidden">
                      <div className="relative w-full max-w-5xl min-h-[420px] sm:min-h-[500px] lg:min-h-[580px] rounded-2xl overflow-hidden bg-slate-950/90 border-2 border-slate-700/80 p-3 sm:p-4 shadow-inner flex items-center justify-center select-none">
                        <img
                          src={activeGame.centerImage}
                          alt={activeGame.centerImageCaption || activeGame.title}
                          className="max-h-[540px] w-full object-contain rounded-xl drop-shadow-2xl pointer-events-none"
                        />

                        {/* OVERLAID HOTSPOT TARGET DROP ZONES */}
                        {activeGame.pairs.map((pair, idx) => {
                          const matchedItem = placedMatches[pair.targetLabel] as DragDropPair | undefined;
                          const isFlashing = feedbackFlash?.zoneId === pair.targetLabel;
                          const isFlashCorrect = isFlashing && feedbackFlash?.status === 'correct';
                          const isFlashWrong = isFlashing && feedbackFlash?.status === 'wrong';
                          const isDragOver = activeDropZoneId === pair.targetLabel;

                          const posX = pair.xPercent ?? Math.min(85, Math.max(15, 20 + idx * 18));
                          const posY = pair.yPercent ?? Math.min(85, Math.max(15, 30 + (idx % 2) * 35));

                          return (
                            <div
                              key={pair.id}
                              data-target-id={pair.targetLabel}
                              style={{ left: `${posX}%`, top: `${posY}%` }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setActiveDropZoneId(pair.targetLabel);
                              }}
                              onDragLeave={() => setActiveDropZoneId(null)}
                              onDrop={(e) => {
                                e.preventDefault();
                                setActiveDropZoneId(null);
                                if (draggedItem) {
                                  handleAttemptMatch(draggedItem, pair.targetLabel);
                                  setDraggedItem(null);
                                }
                              }}
                              onClick={() => {
                                if (selectedTouchItem && !matchedItem) {
                                  handleAttemptMatch(selectedTouchItem, pair.targetLabel);
                                }
                              }}
                              className={`target-drop-zone absolute transform -translate-x-1/2 -translate-y-1/2 p-2 sm:p-3 rounded-2xl border-2 transition-all text-center flex flex-col items-center justify-center min-w-[100px] sm:min-w-[125px] shadow-2xl cursor-pointer ${
                                matchedItem
                                  ? 'bg-emerald-950/95 border-emerald-400 text-white ring-2 ring-emerald-400/60 scale-105'
                                  : isFlashCorrect
                                  ? 'bg-emerald-500 border-white text-slate-950 ring-8 ring-emerald-400/80 scale-125 z-30'
                                  : isFlashWrong
                                  ? 'bg-rose-600/90 border-rose-300 text-white ring-8 ring-rose-500/90 animate-shake scale-110 z-30'
                                  : isDragOver || (selectedTouchItem && !matchedItem)
                                  ? 'bg-amber-500/90 border-amber-200 text-slate-950 ring-4 ring-amber-300 scale-110 z-20'
                                  : 'bg-slate-900/95 border-amber-400/80 text-amber-200 hover:border-amber-300 hover:scale-105 z-10'
                              }`}
                            >
                              {matchedItem ? (
                                <div className="relative flex flex-col items-center justify-center w-full">
                                  {matchedItem.imageType === 'upload' || (matchedItem.image && (matchedItem.image.startsWith('data:image') || matchedItem.image.startsWith('http'))) ? (
                                    <img src={matchedItem.image} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-contain rounded-lg drop-shadow-sm" />
                                  ) : (
                                    <span className="text-2xl sm:text-3xl select-none">{matchedItem.image}</span>
                                  )}
                                  <span className="text-[10px] sm:text-xs font-black text-emerald-300 mt-0.5 leading-tight">{matchedItem.caption || matchedItem.targetLabel}</span>
                                  <span className="absolute -top-3 -right-3 p-1 rounded-full bg-emerald-500 text-white shadow-md">
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="text-[10px] sm:text-xs font-black tracking-wider block text-amber-300 uppercase">
                                    📍 {pair.targetLabel}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 block">
                                    {selectedTouchItem ? '👉 Chạm đính' : '📥 Thả vào đây'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RIGHT SIDE TRAY (Khay bên Phải ➡️) */}
                    <div className="lg:col-span-3 xl:col-span-2 p-3.5 rounded-3xl bg-slate-800/80 border-2 border-slate-700/80 shadow-lg space-y-3 min-h-[220px]">
                      <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center justify-between border-b border-slate-700 pb-2">
                        <span>Khay bên Phải ({dockItems.filter((_, i) => i % 2 === 1).length})</span>
                        <span>➡️</span>
                      </div>

                      <div className="flex flex-wrap lg:flex-col gap-3 items-center justify-center">
                        {dockItems.filter((_, i) => i % 2 === 1).map((item) => {
                          const isSelected = selectedTouchItem?.id === item.id;
                          const isHinted = hintItemId === item.id;

                          return (
                            <div
                              key={item.id}
                              data-dock-id={item.id}
                              draggable
                              onDragStart={(e) => {
                                setDraggedItem(item);
                                e.dataTransfer.setData('text/plain', item.id);
                              }}
                              onDragEnd={() => setDraggedItem(null)}
                              onClick={() => {
                                if (selectedTouchItem?.id === item.id) {
                                  setSelectedTouchItem(null);
                                } else {
                                  setSelectedTouchItem(item);
                                  if (soundEnabled) playTick();
                                }
                              }}
                              className={`dock-card-item group relative flex flex-col items-center justify-center p-2.5 rounded-2xl border-2 transition-all cursor-grab active:cursor-grabbing select-none shadow-lg w-full max-w-[130px] lg:max-w-none ${
                                isSelected
                                  ? 'bg-amber-400/20 border-amber-400 ring-4 ring-amber-400/50 scale-105 shadow-amber-500/30'
                                  : isHinted
                                  ? 'bg-teal-400/30 border-teal-300 ring-4 ring-teal-400/60 animate-bounce'
                                  : 'bg-slate-700/80 hover:bg-slate-700 border-slate-600 hover:border-amber-400 hover:scale-105'
                              }`}
                            >
                              {item.imageType === 'upload' || (item.image && (item.image.startsWith('data:image') || item.image.startsWith('http'))) ? (
                                <img src={item.image} alt={item.caption || item.targetLabel} className="w-14 h-14 object-contain rounded-xl drop-shadow-md pointer-events-none" />
                              ) : (
                                <span className="text-3xl drop-shadow-md select-none pointer-events-none">{item.image}</span>
                              )}
                              {!hideCaptionsInDock && item.caption && (
                                <span className="text-[11px] font-bold text-slate-200 mt-1 text-center truncate max-w-full">{item.caption}</span>
                              )}
                              {isSelected && (
                                <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm animate-pulse">
                                  Đang chọn
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {dockItems.filter((_, i) => i % 2 === 1).length === 0 && (
                          <div className="text-xs text-slate-400 italic text-center py-4">Đã hết mảnh ở khay phải</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* ============================================================ */
                /* MODE B: STANDARD GRID MATCHING / BUCKET LAYOUT WHEN NO CENTER IMAGE */
                /* ============================================================ */
                <>
                  {/* SECTION A: SOURCE DOCK (Khay hình ảnh cần kéo) */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-800/80 border-2 border-slate-700/80 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-amber-300 uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Khay hình ảnh cần kéo ({dockItems.length} hình còn lại)</span>
                  </div>
                  {dockItems.length === 0 && (
                    <span className="text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Đã ghép xong tất cả hình ảnh!
                    </span>
                  )}
                </div>

                {dockItems.length > 0 ? (
                  <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center p-2 min-h-[110px]">
                    {dockItems.map((item) => {
                      const isSelected = selectedTouchItem?.id === item.id;
                      const isHinted = hintItemId === item.id;

                      return (
                        <div
                          key={item.id}
                          data-dock-id={item.id}
                          draggable
                          onDragStart={(e) => {
                            setDraggedItem(item);
                            e.dataTransfer.setData('text/plain', item.id);
                          }}
                          onDragEnd={() => setDraggedItem(null)}
                          onClick={() => {
                            if (selectedTouchItem?.id === item.id) {
                              setSelectedTouchItem(null);
                            } else {
                              setSelectedTouchItem(item);
                              if (soundEnabled) playTick();
                            }
                          }}
                          className={`dock-card-item group relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-3xl border-2 transition-all cursor-grab active:cursor-grabbing select-none shadow-lg ${
                            isSelected
                              ? 'bg-amber-400/20 border-amber-400 ring-4 ring-amber-400/50 scale-105 shadow-amber-500/30'
                              : isHinted
                              ? 'bg-teal-400/30 border-teal-300 ring-4 ring-teal-400/60 animate-bounce'
                              : 'bg-slate-700/80 hover:bg-slate-700 border-slate-600 hover:border-amber-400 hover:scale-105'
                          } ${dockCardDimensions}`}
                          title="Kéo hoặc bấm để chọn hình này"
                        >
                          {/* Image or Emoji Display */}
                          {item.imageType === 'upload' || (item.image && item.image.startsWith('data:image')) || (item.image && item.image.startsWith('http')) ? (
                            <img
                              src={item.image}
                              alt={item.caption || item.targetLabel}
                              className={`${dockImageDimensions} object-contain rounded-2xl drop-shadow-md pointer-events-none`}
                            />
                          ) : (
                            <span className={`${dockEmojiDimensions} drop-shadow-md select-none pointer-events-none`}>
                              {item.image}
                            </span>
                          )}

                          {/* Caption (hidden by default during play to avoid spoiling answers) */}
                          {!hideCaptionsInDock && item.caption && (
                            <span className="text-[11px] sm:text-xs font-bold text-slate-200 mt-1 truncate max-w-full text-center px-1">
                              {item.caption}
                            </span>
                          )}

                          {/* Touch active pill */}
                          {isSelected && (
                            <span className="absolute -top-2 -right-2 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] shadow-sm animate-pulse">
                              Đang chọn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 font-bold text-xs space-y-1">
                    <p className="text-emerald-300 text-sm font-black">🎉 Hoàn thành xuất sắc khay hình ảnh!</p>
                    <p>Tất cả các hình đã được ghép đúng vào ô đáp án.</p>
                  </div>
                )}
              </div>

              {/* CENTRAL BACKGROUND ILLUSTRATION CANVAS (If centerImage is provided) */}
              {activeGame.centerImage && (
                <div className="relative mb-6 p-5 sm:p-7 rounded-3xl bg-slate-900/95 border-4 border-teal-400/80 ring-4 ring-teal-400/20 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 overflow-hidden">
                  <div className="flex items-center gap-2 text-teal-300 font-black text-xs sm:text-sm uppercase tracking-wider bg-teal-950/80 px-4 py-1.5 rounded-full border border-teal-400/40 shadow-sm">
                    <Sparkles className="w-4 h-4 text-teal-400 animate-spin" />
                    <span>{activeGame.centerImageCaption || 'Mô hình trung tâm - Kéo mảnh ghép đính lên'}</span>
                  </div>

                  {/* Big Central Image */}
                  <div className="relative max-w-xl w-full max-h-96 rounded-2xl overflow-hidden bg-slate-950/90 border-2 border-slate-700/80 p-3 shadow-inner flex items-center justify-center">
                    <img
                      src={activeGame.centerImage}
                      alt={activeGame.centerImageCaption || activeGame.title}
                      className="max-h-80 w-auto object-contain rounded-xl drop-shadow-2xl transition-all hover:scale-102"
                    />
                  </div>

                  <p className="text-xs text-teal-200/90 font-bold bg-slate-950/70 px-4 py-1.5 rounded-full border border-teal-500/30">
                    💡 Chọn các mảnh ghép từ khay phía trên và kéo thả đính vào các vị trí đáp án bên dưới!
                  </p>
                </div>
              )}

              {/* SECTION B: TARGET DROP ZONES */}
              {activeGame.mode === 'matching' ? (
                /* MODE 1: 1-to-1 MATCHING GRID */
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Các ô đáp án đích (Thả hình vào ô đáp án tương ứng)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
                    {activeGame.pairs.map((pair) => {
                      const matchedItem = placedMatches[pair.targetLabel] as DragDropPair | undefined;
                      const isFlashing = feedbackFlash?.zoneId === pair.targetLabel;
                      const isFlashCorrect = isFlashing && feedbackFlash?.status === 'correct';
                      const isFlashWrong = isFlashing && feedbackFlash?.status === 'wrong';
                      const isDragOver = activeDropZoneId === pair.targetLabel;

                      return (
                        <div
                          key={pair.id}
                          data-target-id={pair.targetLabel}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setActiveDropZoneId(pair.targetLabel);
                          }}
                          onDragLeave={() => setActiveDropZoneId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setActiveDropZoneId(null);
                            if (draggedItem) {
                              handleAttemptMatch(draggedItem, pair.targetLabel);
                              setDraggedItem(null);
                            }
                          }}
                          onClick={() => {
                            if (selectedTouchItem && !matchedItem) {
                              handleAttemptMatch(selectedTouchItem, pair.targetLabel);
                            }
                          }}
                          className={`target-drop-zone relative flex flex-col items-center justify-between p-4 sm:p-5 rounded-3xl border-2 transition-all text-center ${
                            matchedItem
                              ? 'bg-emerald-950/70 border-emerald-500/80 shadow-md shadow-emerald-950/30'
                              : isFlashCorrect
                              ? 'bg-emerald-600/40 border-emerald-400 ring-4 ring-emerald-400/50 scale-102'
                              : isFlashWrong
                              ? 'bg-rose-900/60 border-rose-500 ring-4 ring-rose-500/50 animate-shake'
                              : isDragOver || (selectedTouchItem && !matchedItem)
                              ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-400/50 scale-102 cursor-pointer'
                              : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          {/* TOP: Slot for Dropped Answer Image */}
                          <div
                            className={`${targetSlotDimensions} rounded-3xl border-2 border-dashed flex items-center justify-center shrink-0 transition-all ${
                              matchedItem
                                ? 'bg-emerald-900/60 border-emerald-400 shadow-inner'
                                : 'bg-slate-900/80 border-slate-600 hover:border-amber-400/60'
                            }`}
                          >
                            {matchedItem ? (
                              <div className="relative flex flex-col items-center justify-center w-full h-full p-1.5">
                                {matchedItem.imageType === 'upload' || (matchedItem.image && (matchedItem.image.startsWith('data:image') || matchedItem.image.startsWith('http'))) ? (
                                  <img
                                    src={matchedItem.image}
                                    alt={matchedItem.caption || matchedItem.targetLabel}
                                    className={`${targetImageDimensions} object-contain rounded-2xl drop-shadow-md`}
                                  />
                                ) : (
                                  <span className={`${targetEmojiDimensions} select-none drop-shadow-md`}>
                                    {matchedItem.image}
                                  </span>
                                )}

                                <span className="absolute -top-3 -right-3 p-1.5 rounded-full bg-emerald-500 text-white shadow-md">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </span>

                                {/* Return button to undo placement */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReturnItemToDock(matchedItem);
                                  }}
                                  className="text-[10px] sm:text-xs text-emerald-300 hover:text-emerald-200 hover:underline mt-1 font-bold cursor-pointer bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30"
                                  title="Gỡ hình này ra khay"
                                >
                                  Gỡ ra
                                </button>
                              </div>
                            ) : (
                              <div className="text-center p-2 space-y-1">
                                <span className="text-slate-400 text-xs sm:text-sm font-extrabold block">
                                  {selectedTouchItem ? '👉 Chạm để ghép' : '📥 Thả hình vào đây'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* BOTTOM: Target Answer Label located directly UNDERNEATH the dropped answer slot */}
                          <div className="mt-3.5 w-full pt-3 border-t border-slate-700/70 text-center space-y-1">
                            <span className="text-[10px] sm:text-xs font-black text-amber-300 uppercase tracking-wider block">
                              🎯 Đáp án đích
                            </span>
                            <h4 className="text-base sm:text-lg md:text-xl font-black text-white leading-tight">
                              {pair.targetLabel}
                            </h4>
                            {pair.hint && (
                              <p className="text-xs text-slate-400 italic font-medium">
                                💡 {pair.hint}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* MODE 2: BUCKET / CATEGORY SORTING */
                <div className="space-y-3">
                  <h3 className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Các nhóm phân loại (Kéo hình vào đúng thùng nhóm bên dưới)</span>
                  </h3>

                  <div className={`grid grid-cols-1 md:grid-cols-${Math.min(3, (activeGame.targetZones || []).length)} gap-4`}>
                    {(activeGame.targetZones || []).map((zone) => {
                      const bucketItems = (placedMatches[zone.id] as DragDropPair[]) || [];
                      const isFlashing = feedbackFlash?.zoneId === zone.id;
                      const isFlashCorrect = isFlashing && feedbackFlash?.status === 'correct';
                      const isFlashWrong = isFlashing && feedbackFlash?.status === 'wrong';
                      const isDragOver = activeDropZoneId === zone.id;

                      return (
                        <div
                          key={zone.id}
                          data-target-id={zone.id}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setActiveDropZoneId(zone.id);
                          }}
                          onDragLeave={() => setActiveDropZoneId(null)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setActiveDropZoneId(null);
                            if (draggedItem) {
                              handleAttemptMatch(draggedItem, zone.id);
                              setDraggedItem(null);
                            }
                          }}
                          onClick={() => {
                            if (selectedTouchItem) {
                              handleAttemptMatch(selectedTouchItem, zone.id);
                            }
                          }}
                          className={`target-drop-zone flex flex-col justify-between p-4 rounded-3xl border-2 transition-all min-h-[220px] ${
                            isFlashCorrect
                              ? 'bg-emerald-900/60 border-emerald-400 ring-4 ring-emerald-400/50 scale-102'
                              : isFlashWrong
                              ? 'bg-rose-900/60 border-rose-500 ring-4 ring-rose-500/50 animate-shake'
                              : isDragOver || selectedTouchItem
                              ? 'bg-teal-950/90 border-teal-400 ring-2 ring-teal-400/40 cursor-pointer'
                              : 'bg-slate-800/80 border-slate-700'
                          }`}
                        >
                          {/* Bucket Header */}
                          <div className="pb-2.5 border-b border-slate-700/80 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
                                Nhóm phân loại
                              </span>
                              <h4 className="text-base font-black text-white">
                                {zone.label}
                              </h4>
                              {zone.description && (
                                <p className="text-[11px] text-slate-400 font-medium">
                                  {zone.description}
                                </p>
                              )}
                            </div>
                            <span className="px-2.5 py-1 rounded-xl bg-slate-900 text-teal-300 font-black text-xs border border-slate-700">
                              {bucketItems.length} hình
                            </span>
                          </div>

                          {/* Items sorted inside this bucket */}
                          <div className="flex-1 py-3 flex flex-wrap gap-2.5 items-start content-start">
                            {bucketItems.length > 0 ? (
                              bucketItems.map((item) => (
                                <div
                                  key={item.id}
                                  className="relative group p-2 rounded-xl bg-slate-900/90 border border-slate-600 flex items-center gap-1.5 shadow-sm text-xs font-bold"
                                >
                                  {item.imageType === 'upload' || (item.image && item.image.startsWith('data:image')) || (item.image && item.image.startsWith('http')) ? (
                                    <img
                                      src={item.image}
                                      alt={item.caption || item.targetLabel}
                                      className="w-6 h-6 object-contain"
                                    />
                                  ) : (
                                    <span className="text-lg select-none">{item.image}</span>
                                  )}
                                  <span className="text-slate-200">{item.caption || item.targetLabel}</span>

                                  {/* Delete / remove from bucket */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReturnItemToDock(item, zone.id);
                                    }}
                                    className="p-0.5 rounded text-slate-400 hover:text-rose-400 ml-1 cursor-pointer"
                                    title="Gỡ hình về khay"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-center text-slate-500 text-xs font-medium italic border-2 border-dashed border-slate-700/60 rounded-2xl p-4">
                                {selectedTouchItem ? 'Chạm vào đây để đưa hình vào nhóm này' : 'Kéo các hình phù hợp thả vào nhóm này'}
                              </div>
                            )}
                          </div>

                          {/* Bucket footer cue */}
                          <div className="pt-2 border-t border-slate-700/60 text-[10px] text-slate-400 flex items-center justify-between">
                            <span>Sức chứa: Tự động</span>
                            <span className="text-emerald-400 font-bold">✓ Kéo thả tự do</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
                </>
              )}
            </div>

            {/* VICTORY CELEBRATION MODAL */}
            {showCelebrationModal && (
              <div className="fixed inset-0 z-[1000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-slate-900 border-4 border-amber-400 rounded-3xl max-w-md w-full p-6 sm:p-8 text-center space-y-5 text-white shadow-2xl relative">
                  <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/30 animate-bounce">
                    <Trophy className="w-10 h-10 fill-current" />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                      <Star className="w-5 h-5 fill-current" />
                      <Star className="w-6 h-6 fill-current" />
                      <Star className="w-5 h-5 fill-current" />
                    </div>
                    <h3 className="text-2xl font-black text-amber-300 uppercase tracking-tight">
                      XUẤT SẮC HOÀN THÀNH!
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 font-medium">
                      Bé đã kéo thả chính xác toàn bộ {activeGame.pairs.length}/{activeGame.pairs.length} câu hỏi của trò chơi!
                    </p>
                  </div>

                  {/* Score stats */}
                  <div className="grid grid-cols-2 gap-2 p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Tổng điểm</span>
                      <strong className="text-amber-300 text-lg font-black">{score} điểm</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Độ chính xác</span>
                      <strong className="text-emerald-400 text-lg font-black">
                        {Math.round((correctCount / Math.max(1, correctCount + wrongCount)) * 100)}%
                      </strong>
                    </div>
                  </div>

                  {/* Award Flowers to Class Action */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleAwardFlowersToClass}
                      disabled={awardedReward}
                      className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        awardedReward
                          ? 'bg-emerald-600 text-white cursor-default'
                          : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 active:scale-95'
                      }`}
                    >
                      <Award className="w-4 h-4" />
                      <span>
                        {awardedReward
                          ? `✓ Đã tặng +${activeGame.rewardFlowers || 3} Bông hoa cho cả lớp!`
                          : `🌺 Thưởng +${activeGame.rewardFlowers || 3} Bông hoa cho cả lớp`}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowCelebrationModal(false);
                          initRound(activeGame);
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs cursor-pointer"
                      >
                        Chơi lại màn này
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCelebrationModal(false);
                          // switch to next game if exists
                          const currentIdx = activeGame ? filteredGames.findIndex((g) => g.id === activeGame.id) : -1;
                          const nextGame = currentIdx >= 0 ? filteredGames[(currentIdx + 1) % filteredGames.length] : null;
                          if (nextGame) {
                            setSelectedGameId(nextGame.id);
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs cursor-pointer shadow-md"
                      >
                        Trò chơi tiếp theo ➔
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* 3. TAB CONTENT: MANAGE & CREATE GAMES */}
      {activeTab === 'manage' && (
        <div className="space-y-5">
          {/* Top Tools Bar: Import, Export, Restore, Delete All, Add */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-800">
                Danh sách Trò Chơi Kéo Thả ({gamesList.length})
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 font-bold">
                Tự tạo & Mẫu chuẩn
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJson}
                className="hidden"
                id="import-games-json"
              />
              <label
                htmlFor="import-games-json"
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Nhập JSON</span>
              </label>

              <button
                type="button"
                onClick={handleExportJson}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-300"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất JSON</span>
              </button>

              <button
                type="button"
                onClick={handleRestoreDefaultGames}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/90 text-amber-800 border border-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                title="Khôi phục các trò chơi mẫu mặc định"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Nạp lại game mẫu</span>
              </button>

              {gamesList.length > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteAllGames}
                  className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  title="Xóa toàn bộ danh sách trò chơi kéo thả"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa tất cả</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenNewGame}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Tạo Trò Chơi Mới</span>
              </button>
            </div>
          </div>

          {/* Games Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamesList.length === 0 ? (
              <div className="col-span-full bg-white rounded-3xl border-2 border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-4 shadow-xs">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                  <Trash2 className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-base sm:text-lg font-black text-slate-800">
                    Danh Sách Trò Chơi Đã Được Xóa Hết
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                    Hiện tại không có trò chơi kéo thả nào trong hệ thống. Thầy/Cô có thể tạo trò chơi mới hoặc nhấn Nạp lại game mẫu.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleRestoreDefaultGames}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Nạp lại bộ trò chơi mẫu</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenNewGame}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Tạo trò chơi mới</span>
                  </button>
                </div>
              </div>
            ) : (
              gamesList.map((game) => {
              const isSelected = selectedGameId === game.id;
              return (
                <div
                  key={game.id}
                  className={`bg-white rounded-3xl border-2 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                    isSelected ? 'border-orange-500 ring-2 ring-orange-400/30' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                          {game.subject}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px]">
                          {game.grade}
                        </span>
                        {game.isPreset && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[9px]">
                            Mẫu
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-bold text-slate-500">
                        {game.pairs.length} câu
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-2">
                      {game.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 font-medium">
                      {game.description || 'Chưa có mô tả'}
                    </p>

                    {/* Previews of items */}
                    <div className="flex items-center gap-1.5 pt-1 overflow-hidden">
                      {game.pairs.slice(0, 5).map((p, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-bold shrink-0"
                        >
                          {p.imageType === 'upload' || (p.image && p.image.startsWith('data:image')) || (p.image && p.image.startsWith('http')) ? (
                            <img src={p.image} alt="" className="w-5 h-5 object-contain" />
                          ) : (
                            <span>{p.image}</span>
                          )}
                        </div>
                      ))}
                      {game.pairs.length > 5 && (
                        <span className="text-[10px] font-bold text-slate-400">+{game.pairs.length - 5}</span>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenShareModal(game)}
                        className="px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer border border-blue-200"
                        title="Chia sẻ đường link trò chơi này cho nhiều máy tính chơi cùng lúc"
                      >
                        <Share2 className="w-3.5 h-3.5 text-blue-600" />
                        <span>Chia sẻ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDuplicateGame(game)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                        title="Tạo bản sao trò chơi này"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditGame(game)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
                        title="Chỉnh sửa trò chơi"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGame(game.id)}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-all cursor-pointer"
                        title="Xóa trò chơi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGameId(game.id);
                        setActiveTab('play');
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Chơi ngay</span>
                    </button>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* 4. GAME CREATOR & EDITOR MODAL */}
      {isEditorOpen && editingGame && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-orange-400 w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl relative my-auto overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/20">
                  <Gamepad2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black leading-none">
                    {editingGame.id.startsWith('game-custom') ? 'Tạo Trò Chơi Kéo Thả Mới' : 'Chỉnh Sửa Trò Chơi Kéo Thả'}
                  </h3>
                  <p className="text-xs text-orange-100 mt-0.5">
                    Cấu hình tiêu đề, các cặp hình ảnh và ô đáp án tương ứng
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingGame(null);
                }}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Scrollable Form */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
              {/* Form Row 1: Title & Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Tiêu đề trò chơi *
                  </label>
                  <input
                    type="text"
                    value={editingGame.title}
                    onChange={(e) => setEditingGame({ ...editingGame, title: e.target.value })}
                    placeholder="VD: Nối hình các con vật với tên tiếng Anh..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                    Mô tả / Hướng dẫn chơi
                  </label>
                  <input
                    type="text"
                    value={editingGame.description || ''}
                    onChange={(e) => setEditingGame({ ...editingGame, description: e.target.value })}
                    placeholder="VD: Kéo thả các hình vào ô tên gọi tương ứng..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-medium text-sm focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Form Row 2: Subject, Grade, Mode, Timer */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Môn học</label>
                  <select
                    value={editingGame.subject}
                    onChange={(e) => setEditingGame({ ...editingGame, subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 focus:outline-hidden"
                  >
                    <option value="Toán">Toán</option>
                    <option value="Tiếng Việt">Tiếng Việt</option>
                    <option value="Tiếng Anh">Tiếng Anh</option>
                    <option value="Tự nhiên & Xã hội">Tự nhiên & Xã hội</option>
                    <option value="Tin học">Tin học</option>
                    <option value="Khoa học">Khoa học</option>
                    <option value="Lịch sử & Địa lí">Lịch sử & Địa lí</option>
                    <option value="Công nghệ">Công nghệ</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Khối lớp</label>
                  <select
                    value={editingGame.grade}
                    onChange={(e) => setEditingGame({ ...editingGame, grade: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 focus:outline-hidden"
                  >
                    <option value="Khối 1">Khối 1</option>
                    <option value="Khối 2">Khối 2</option>
                    <option value="Khối 3">Khối 3</option>
                    <option value="Khối 4">Khối 4</option>
                    <option value="Khối 5">Khối 5</option>
                    <option value="Tất cả">Tất cả các khối</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Thể thức chơi</label>
                  <select
                    value={editingGame.mode}
                    onChange={(e) => {
                      const newMode = e.target.value as 'matching' | 'sorting';
                      const defaultZones: DragDropTargetZone[] = newMode === 'sorting' && (!editingGame.targetZones || editingGame.targetZones.length === 0)
                        ? [
                            { id: 'cat-1', label: 'Nhóm 1', color: 'sky' },
                            { id: 'cat-2', label: 'Nhóm 2', color: 'emerald' }
                          ]
                        : editingGame.targetZones || [];
                      setEditingGame({ ...editingGame, mode: newMode, targetZones: defaultZones });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 focus:outline-hidden"
                  >
                    <option value="matching">Nối đôi 1 - 1</option>
                    <option value="sorting">Phân loại nhóm/thùng</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 block">Thời gian (giây)</label>
                  <select
                    value={editingGame.timerSeconds || 0}
                    onChange={(e) => setEditingGame({ ...editingGame, timerSeconds: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs bg-slate-50 focus:outline-hidden"
                  >
                    <option value={0}>Không giới hạn</option>
                    <option value={45}>45 giây</option>
                    <option value={60}>60 giây (1 phút)</option>
                    <option value={90}>90 giây</option>
                    <option value={120}>120 giây (2 phút)</option>
                  </select>
                </div>
              </div>

              {/* Central Background Image Section (Hình nền trung tâm / Đính mảnh ghép) */}
              <div className="p-4 rounded-2xl bg-teal-50/80 border-2 border-teal-200/90 space-y-3 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-black text-teal-950 uppercase flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-teal-600" />
                      <span>Hình Ảnh Minh Họa Trung Tâm / Hình Nền Đính Mảnh Ghép (Tùy chọn)</span>
                    </h4>
                    <p className="text-[11px] text-teal-700">
                      Tải lên hình cái cây, sơ đồ cơ thể, mặt đồng hồ... để học sinh kéo thả các mảnh ghép (lá, hoa, quả...) đính lên!
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="file"
                      ref={centerFileUploadRef}
                      accept="image/*"
                      onChange={handleUploadCenterImage}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => centerFileUploadRef.current?.click()}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-xs transition-all active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Tải ảnh nền lên</span>
                    </button>

                    {editingGame.centerImage && (
                      <button
                        type="button"
                        onClick={() => setEditingGame({ ...editingGame, centerImage: undefined, centerImageCaption: undefined })}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa ảnh nền</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Preset Center Images */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] font-bold text-teal-900">Mẫu có sẵn:</span>
                  <button
                    type="button"
                    onClick={() => setEditingGame({ ...editingGame, centerImage: PRESET_CENTER_IMAGES.tree, centerImageCaption: '🌳 Cây xanh & Các bộ phận của cây' })}
                    className="px-2.5 py-1 rounded-lg bg-white border border-teal-300 text-teal-900 font-bold text-xs hover:bg-teal-100 cursor-pointer shadow-2xs transition-all"
                  >
                    🌳 Mô hình Cây xanh
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGame({ ...editingGame, centerImage: PRESET_CENTER_IMAGES.clock, centerImageCaption: '⏰ Mặt đồng hồ & Các kim số' })}
                    className="px-2.5 py-1 rounded-lg bg-white border border-teal-300 text-teal-900 font-bold text-xs hover:bg-teal-100 cursor-pointer shadow-2xs transition-all"
                  >
                    ⏰ Mặt đồng hồ
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingGame({ ...editingGame, centerImage: PRESET_CENTER_IMAGES.body, centerImageCaption: '👦 Sơ đồ cơ thể người' })}
                    className="px-2.5 py-1 rounded-lg bg-white border border-teal-300 text-teal-900 font-bold text-xs hover:bg-teal-100 cursor-pointer shadow-2xs transition-all"
                  >
                    👦 Cơ thể người
                  </button>
                </div>

                {/* Center Image Preview & Caption */}
                {editingGame.centerImage && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 bg-white rounded-xl border border-teal-200">
                      <img
                        src={editingGame.centerImage}
                        alt="Central illustration background"
                        className="w-28 h-28 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0 shadow-xs"
                      />
                      <div className="flex-1 space-y-1.5 w-full">
                        <label className="text-xs font-bold text-slate-700 block">Tên / Chú thích cho hình minh họa trung tâm</label>
                        <input
                          type="text"
                          value={editingGame.centerImageCaption || ''}
                          onChange={(e) => setEditingGame({ ...editingGame, centerImageCaption: e.target.value })}
                          placeholder="VD: Cây xanh & Các bộ phận của cây..."
                          className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-xs text-slate-800 focus:outline-hidden"
                        />
                        <p className="text-[11px] text-slate-500">
                          Hình này sẽ hiển thị ở trung tâm. Các thẻ mảnh ghép (lá, hoa, quả...) sẽ xuất hiện ở 2 bên khay để học sinh kéo đính lên!
                        </p>
                      </div>
                    </div>

                    {/* Interactive Click-to-Position Hotspot Canvas */}
                    <div className="p-3 bg-white rounded-xl border border-teal-200 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-100 pb-2">
                        <span className="text-xs font-black text-teal-900 uppercase flex items-center gap-1.5">
                          <Move className="w-3.5 h-3.5 text-teal-600" />
                          <span>📍 Đặt vị trí đáp án đính trên hình nền trung tâm:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">Đang đặt cho câu:</span>
                          <select
                            value={Math.min(activeHotspotIndex, Math.max(0, editingGame.pairs.length - 1))}
                            onChange={(e) => setActiveHotspotIndex(Number(e.target.value))}
                            className="px-2.5 py-1 rounded-lg border border-slate-300 font-bold text-xs bg-amber-50 text-amber-900 focus:outline-hidden"
                          >
                            {editingGame.pairs.map((p, idx) => (
                              <option key={p.id} value={idx}>
                                #{idx + 1}: {p.caption || p.targetLabel || `Câu ${idx + 1}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-[11px] text-teal-800 font-medium">
                        👉 **Thầy/Cô bấm trực tiếp lên bất kỳ điểm nào trên bức ảnh bên dưới** để đặt ô đáp án cho câu <strong>#{activeHotspotIndex + 1} ({editingGame.pairs[activeHotspotIndex]?.caption || editingGame.pairs[activeHotspotIndex]?.targetLabel})</strong>!
                      </p>

                      {/* Clickable Canvas Box (Spacious & Clear) */}
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const clickY = e.clientY - rect.top;
                          const xPercent = Math.round((clickX / rect.width) * 100);
                          const yPercent = Math.round((clickY / rect.height) * 100);

                          const updatedPairs = [...editingGame.pairs];
                          if (updatedPairs[activeHotspotIndex]) {
                            updatedPairs[activeHotspotIndex] = {
                              ...updatedPairs[activeHotspotIndex],
                              xPercent,
                              yPercent
                            };
                            setEditingGame({ ...editingGame, pairs: updatedPairs });
                          }
                        }}
                        className="relative max-w-4xl mx-auto w-full min-h-[400px] sm:min-h-[480px] rounded-2xl overflow-hidden bg-slate-950 border-2 border-dashed border-teal-400 cursor-crosshair group shadow-inner flex items-center justify-center p-3 select-none"
                        title="Bấm lên vị trí mong muốn trên hình để đặt điểm thả đáp án!"
                      >
                        <img
                          src={editingGame.centerImage}
                          alt="Central illustration background"
                          className="max-h-[480px] w-full object-contain pointer-events-none"
                        />

                        {/* Render Hotspot Pins for all pair questions */}
                        {editingGame.pairs.map((p, idx) => {
                          const isSelectedPair = idx === activeHotspotIndex;
                          const posX = p.xPercent ?? Math.min(85, Math.max(15, 20 + idx * 18));
                          const posY = p.yPercent ?? Math.min(85, Math.max(15, 30 + (idx % 2) * 35));

                          return (
                            <div
                              key={p.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveHotspotIndex(idx);
                              }}
                              style={{ left: `${posX}%`, top: `${posY}%` }}
                              className={`absolute transform -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl border-2 text-[11px] font-black shadow-lg cursor-pointer transition-all flex items-center gap-1 ${
                                isSelectedPair
                                  ? 'bg-amber-400 border-white text-slate-950 scale-110 ring-4 ring-amber-400/50 z-20 animate-bounce'
                                  : 'bg-slate-900/90 border-teal-400 text-teal-200 hover:scale-105 z-10'
                              }`}
                            >
                              <span>#{idx + 1}</span>
                              <span>{p.caption || p.targetLabel}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {editingGame.mode === 'sorting' && (
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-amber-900 uppercase">
                        Các nhóm / Thùng phân loại ({editingGame.targetZones?.length || 0})
                      </h4>
                      <p className="text-[11px] text-amber-700">
                        Học sinh sẽ phân loại các hình ảnh vào các thùng này
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const current = editingGame.targetZones || [];
                        const newZone: DragDropTargetZone = {
                          id: uid('cat'),
                          label: `Nhóm ${current.length + 1}`,
                          color: 'purple'
                        };
                        setEditingGame({ ...editingGame, targetZones: [...current, newZone] });
                      }}
                      className="px-2.5 py-1 rounded-xl bg-amber-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm nhóm</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {(editingGame.targetZones || []).map((zone, zIdx) => (
                      <div key={zone.id} className="p-2.5 rounded-xl bg-white border border-amber-200 space-y-1.5 shadow-xs">
                        <div className="flex items-center justify-between gap-1">
                          <input
                            type="text"
                            value={zone.label}
                            onChange={(e) => {
                              const updated = [...(editingGame.targetZones || [])];
                              updated[zIdx] = { ...updated[zIdx], label: e.target.value };
                              setEditingGame({ ...editingGame, targetZones: updated });
                            }}
                            placeholder="Tên nhóm..."
                            className="font-black text-xs text-slate-800 border-b border-slate-200 pb-0.5 focus:outline-hidden flex-1"
                          />
                          {(editingGame.targetZones || []).length > 2 && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (editingGame.targetZones || []).filter((_, i) => i !== zIdx);
                                setEditingGame({ ...editingGame, targetZones: updated });
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Xóa nhóm này"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <input
                          type="text"
                          value={zone.description || ''}
                          onChange={(e) => {
                            const updated = [...(editingGame.targetZones || [])];
                            updated[zIdx] = { ...updated[zIdx], description: e.target.value };
                            setEditingGame({ ...editingGame, targetZones: updated });
                          }}
                          placeholder="Mô tả nhóm (tùy chọn)..."
                          className="text-[11px] text-slate-600 w-full focus:outline-hidden"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LIST OF PAIRS / ITEMS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Danh sách cặp Hình Ảnh & Đáp Án ({editingGame.pairs.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mỗi dòng là một thẻ hình ảnh và câu trả lời tương ứng
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newPair: DragDropPair = {
                        id: uid('p'),
                        image: '⭐',
                        imageType: 'emoji',
                        caption: 'Hình mẫu',
                        targetLabel: editingGame.mode === 'matching' ? 'Đáp án mới' : (editingGame.targetZones?.[0]?.label || 'Nhóm 1'),
                        targetGroupId: editingGame.targetZones?.[0]?.id || ''
                      };
                      setEditingGame({ ...editingGame, pairs: [...editingGame.pairs, newPair] });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm câu hỏi / hình</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {editingGame.pairs.map((pair, pIdx) => (
                    <div
                      key={pair.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs"
                    >
                      {/* Image Preview & Selector */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-black text-slate-400 w-5">#{pIdx + 1}</span>

                        <div className="relative group w-14 h-14 rounded-2xl bg-white border-2 border-slate-300 flex items-center justify-center shadow-xs overflow-hidden">
                          {pair.imageType === 'upload' || (pair.image && pair.image.startsWith('data:image')) || (pair.image && pair.image.startsWith('http')) ? (
                            <img src={pair.image} alt="" className="w-10 h-10 object-contain" />
                          ) : (
                            <span className="text-3xl select-none">{pair.image}</span>
                          )}
                        </div>

                        {/* Image change actions */}
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEmojiPickerForIndex(pIdx);
                              setEmojiSearch('');
                            }}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                          >
                            <span>Chọn icon/emoji</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUploadIndexTarget(pIdx);
                              fileUploadRef.current?.click();
                            }}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                          >
                            <ImageIcon className="w-3 h-3 text-teal-600" />
                            <span>Tải ảnh lên</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setUrlModalIndex(pIdx);
                              setInputImageUrl(pair.image?.startsWith('http') ? pair.image : '');
                            }}
                            className="px-2 py-1 rounded-lg bg-white border border-slate-300 text-slate-700 text-[11px] font-bold hover:bg-slate-100 cursor-pointer flex items-center gap-1"
                          >
                            <LinkIcon className="w-3 h-3 text-blue-600" />
                            <span>Dán link ảnh</span>
                          </button>
                        </div>
                      </div>

                      {/* Item Inputs: Caption, Target Answer, Hint */}
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Chú thích hình</label>
                          <input
                            type="text"
                            value={pair.caption || ''}
                            onChange={(e) => {
                              const updated = [...editingGame.pairs];
                              updated[pIdx] = { ...updated[pIdx], caption: e.target.value };
                              setEditingGame({ ...editingGame, pairs: updated });
                            }}
                            placeholder="VD: Con mèo, Quả táo..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">
                            {editingGame.mode === 'matching' ? 'Đáp án đúng *' : 'Chọn nhóm đúng *'}
                          </label>
                          {editingGame.mode === 'matching' ? (
                            <input
                              type="text"
                              value={pair.targetLabel}
                              onChange={(e) => {
                                const updated = [...editingGame.pairs];
                                updated[pIdx] = { ...updated[pIdx], targetLabel: e.target.value };
                                setEditingGame({ ...editingGame, pairs: updated });
                              }}
                              placeholder="VD: Hình tròn, Cat..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-slate-800 bg-white"
                            />
                          ) : (
                            <select
                              value={pair.targetGroupId || ''}
                              onChange={(e) => {
                                const updated = [...editingGame.pairs];
                                const selectedZone = (editingGame.targetZones || []).find((z) => z.id === e.target.value);
                                updated[pIdx] = {
                                  ...updated[pIdx],
                                  targetGroupId: e.target.value,
                                  targetLabel: selectedZone?.label || ''
                                };
                                setEditingGame({ ...editingGame, pairs: updated });
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-black text-slate-800 bg-white"
                            >
                              {(editingGame.targetZones || []).map((z) => (
                                <option key={z.id} value={z.id}>
                                  {z.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block">Gợi ý (tùy chọn)</label>
                          <input
                            type="text"
                            value={pair.hint || ''}
                            onChange={(e) => {
                              const updated = [...editingGame.pairs];
                              updated[pIdx] = { ...updated[pIdx], hint: e.target.value };
                              setEditingGame({ ...editingGame, pairs: updated });
                            }}
                            placeholder="Gợi ý cho học sinh..."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white"
                          />
                        </div>
                      </div>

                      {/* Delete Item button */}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editingGame.pairs.filter((_, i) => i !== pIdx);
                          setEditingGame({ ...editingGame, pairs: updated });
                        }}
                        className="p-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shrink-0"
                        title="Xóa câu hỏi / phần đã chọn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingGame(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveGame}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Lưu Trò Chơi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EMOJI & ICON PICKER MODAL */}
      {showEmojiPickerForIndex !== null && editingGame && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="font-black text-sm text-slate-800">
                Thư Viện Biểu Tượng & Hình Ảnh Học Tập
              </h3>
              <button
                type="button"
                onClick={() => setShowEmojiPickerForIndex(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={emojiSearch}
              onChange={(e) => setEmojiSearch(e.target.value)}
              placeholder="🔍 Tìm kiếm biểu tượng (con chó, hình tròn, quả táo...)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-orange-500"
            />

            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 max-h-64 overflow-y-auto p-1">
              {filteredEmojis.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => {
                    const updated = [...editingGame.pairs];
                    updated[showEmojiPickerForIndex] = {
                      ...updated[showEmojiPickerForIndex],
                      image: e.emoji,
                      imageType: 'emoji',
                      caption: updated[showEmojiPickerForIndex].caption || e.name
                    };
                    setEditingGame({ ...editingGame, pairs: updated });
                    setShowEmojiPickerForIndex(null);
                  }}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                  title={e.name}
                >
                  <span className="text-2xl select-none">{e.emoji}</span>
                  <span className="text-[9px] font-bold text-slate-600 mt-0.5 truncate max-w-full">
                    {e.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. IMAGE URL INPUT MODAL */}
      {urlModalIndex !== null && editingGame && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full p-5 space-y-4 shadow-2xl relative text-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-600" />
                <h3 className="font-black text-sm text-slate-900">
                  Nhập Link Hình Ảnh Trực Tuyến (URL)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUrlModalIndex(null);
                  setInputImageUrl('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 block">
                Đường dẫn hình ảnh (https://...):
              </label>
              <input
                type="url"
                value={inputImageUrl}
                onChange={(e) => setInputImageUrl(e.target.value)}
                placeholder="https://example.com/hinh-anh.png hoặc jpeg..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* URL Image Preview if valid */}
            {inputImageUrl.trim() && (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
                <img
                  src={inputImageUrl.trim()}
                  alt="Xem trước"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-14 h-14 object-contain rounded-xl bg-white border border-slate-200 shadow-xs"
                />
                <div className="text-[11px] text-slate-600">
                  <span className="font-bold text-emerald-600 block">✓ Đã nạp hình ảnh xem trước</span>
                  <span>Nếu hình hiển thị đúng, nhấn nút Áp dụng bên dưới.</span>
                </div>
              </div>
            )}

            {/* Quick sample illustrations */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 block">
                Hoặc chọn nhanh ảnh mẫu giáo dục:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { name: 'Toán học', url: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Trái Đất', url: 'https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Sách vở', url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Đồng hồ', url: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?auto=format&fit=crop&w=200&q=80' },
                  { name: 'Bút màu', url: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?auto=format&fit=crop&w=200&q=80' }
                ].map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    type="button"
                    onClick={() => {
                      setInputImageUrl(sample.url);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setUrlModalIndex(null);
                  setInputImageUrl('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleApplyImageUrl()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md cursor-pointer"
              >
                Áp Dụng Hình Ảnh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. CONFIRM DELETE ALL GAMES MODAL */}
      {showConfirmDeleteAllModal && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border-2 border-rose-300 max-w-md w-full p-6 space-y-4 shadow-2xl relative text-slate-800 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <Trash2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-slate-900">
                Xác Nhận Xóa Tất Cả Trò Chơi Kéo Thả?
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                Hành động này sẽ xoá toàn bộ <span className="font-bold text-rose-600">{gamesList.length} trò chơi</span> trong thư mục kéo thả. Bạn có thể nạp lại bộ trò chơi mẫu bất kỳ lúc nào.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAllModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer active:scale-95"
              >
                Đồng ý Xóa Tất Cả
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. SHARE GAME MODAL (FOR MULTI-COMPUTER SIMULTANEOUS PLAY) */}
      {shareModalGame && (
        <div className="fixed inset-0 z-[1100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border-2 border-blue-400 max-w-xl w-full p-6 sm:p-8 space-y-6 text-slate-800 shadow-2xl relative">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-snug">
                    Chia Sẻ Trò Chơi Cho Nhiều Máy Tính
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Học sinh có thể tham gia và thực hành cùng lúc trên các máy tính/máy tính bảng khác nhau!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalGame(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Game Info Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-slate-400 block text-[10px]">Trò chơi được chọn:</span>
                <span className="font-black text-slate-900 text-sm">{shareModalGame.title}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold">
                  {shareModalGame.subject}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold">
                  {shareModalGame.grade}
                </span>
              </div>
            </div>

            {/* Loading state or Share Link & QR Code */}
            {isSharingLoading ? (
              <div className="py-10 text-center space-y-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-slate-600">
                  Đang khởi tạo liên kết chia sẻ trực tuyến trên Cloud Firestore...
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Direct Link Input & Copy Button */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-blue-600" />
                    Đường Link Trực Tiếp Cho Học Sinh:
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-slate-800 select-all focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareUrl}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0 ${
                        copiedLink
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                      }`}
                    >
                      {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedLink ? '✓ Đã Sao Chép!' : 'Sao chép Link'}</span>
                    </button>
                  </div>
                </div>

                {/* QR Code & Multi-computer Guide Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-2xl border border-blue-200/80">
                  {/* Left: QR Code */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center text-center space-y-1.5">
                    <div className="p-2 bg-white rounded-2xl shadow-md border border-slate-200">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                          shareUrl
                        )}&color=0f172a&bgcolor=ffffff`}
                        alt="QR Code Trò Chơi"
                        className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      Quét mã QR bằng Điện thoại / iPad
                    </span>
                  </div>

                  {/* Right: classroom computer guide */}
                  <div className="sm:col-span-7 space-y-2 text-xs text-slate-700">
                    <h4 className="font-black text-slate-900 flex items-center gap-1.5 text-sm">
                      💻 Hướng Dẫn Chơi Cùng Lúc
                    </h4>
                    <ul className="space-y-1.5 list-disc list-inside font-medium leading-relaxed text-[11px] text-slate-600">
                      <li>
                        Sao chép link và dán vào Zalo nhóm lớp, Google Classroom, hoặc máy tính học sinh.
                      </li>
                      <li>
                        Mỗi học sinh chỉ cần bấm đường link sẽ <strong>vào thẳng màn chơi</strong> ngay lập tức!
                      </li>
                      <li>
                        Tương thích hoàn hảo trên tất cả máy tính phòng tin học, máy tính bảng và điện thoại.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở thử link trên Tab mới</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => setShareModalGame(null)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Hoàn tất & Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden file input for uploading custom images */}
      <input
        type="file"
        ref={fileUploadRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
};
