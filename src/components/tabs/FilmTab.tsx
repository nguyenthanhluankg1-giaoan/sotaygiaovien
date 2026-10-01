import React, { useState, useEffect, useRef } from 'react';
import {
  Swords,
  RotateCcw,
  Award,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Timer,
  Trophy,
  Users,
  Flame,
  Volume2,
  VolumeX,
  RefreshCw,
  Zap,
  Folder,
  GraduationCap,
  ChevronRight,
  BookOpen,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  Sliders,
  X,
  Check,
  Share2,
  Copy,
  Link,
  Laptop,
  Lock,
  ShieldCheck,
  Key,
  Dice5,
  LogOut,
  QrCode,
  Eye,
  Gamepad2,
  Camera,
  CameraOff,
  Shuffle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppState, Student, QuizQuestion } from '../../types';
import { Avatar } from '../Avatar';
import { uid } from '../../utils/helpers';
import { playCelebration, playBeep } from '../../utils/audio';
import { doc, onSnapshot, setDoc, getDoc, collection, getDocs, query } from 'firebase/firestore';
import { db } from '../../firebase';
import { CameraGestureDualZone } from './CameraGestureDualZone';

// Bulletproof helper to sanitize any Firestore payload (removes undefined values completely)
function cleanPayload<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanPayload(item)) as unknown as T;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = cleanPayload(value);
    }
  }
  return cleaned as T;
}

interface FilmTabProps {
  state: AppState;
  onUpdateState: (updater: (prev: AppState) => AppState) => void;
}

const DEFAULT_TUG_QUESTIONS: QuizQuestion[] = [
  {
    id: 'tug-q1',
    question: 'Số lớn nhất có hai chữ số là số nào?',
    options: ['89', '90', '99', '100'],
    correctIndex: 2,
    subject: 'Toán',
    grade: 'all',
    explanation: 'Số 99 là số lớn nhất có hai chữ số.'
  },
  {
    id: 'tug-q2',
    question: 'Từ nào sau đây là từ chỉ hoạt động?',
    options: ['Bông hoa', 'Chạy bộ', 'Ngôi nhà', 'Cái bàn'],
    correctIndex: 1,
    subject: 'Tiếng Việt',
    grade: 'all',
    explanation: '"Chạy bộ" là từ chỉ hoạt động của con người.'
  },
  {
    id: 'tug-q3',
    question: 'Mặt Trời mọc ở hướng nào?',
    options: ['Hướng Tây', 'Hướng Đông', 'Hướng Nam', 'Hướng Bắc'],
    correctIndex: 1,
    subject: 'Tự nhiên và Xã hội',
    grade: 'all',
    explanation: 'Mặt Trời mọc ở hướng Đông và lặn ở hướng Tây.'
  },
  {
    id: 'tug-q4',
    question: 'Phép tính nào sau đây có kết quả bằng 15?',
    options: ['7 + 8', '6 + 8', '9 + 5', '8 + 8'],
    correctIndex: 0,
    subject: 'Toán',
    grade: 'all',
    explanation: '7 + 8 = 15.'
  },
  {
    id: 'tug-q5',
    question: 'Thủ đô của Việt Nam tên là gì?',
    options: ['Đà Nẵng', 'Thành phố Hồ Chí Minh', 'Hà Nội', 'Hải Phòng'],
    correctIndex: 2,
    subject: 'Lịch sử và Địa lí',
    grade: 'all',
    explanation: 'Hà Nội là thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam.'
  },
  {
    id: 'tug-q6',
    question: 'Đâu là thiết bị xuất dữ liệu chính của máy tính?',
    options: ['Bàn phím', 'Con chuột', 'Màn hình', 'Micro'],
    correctIndex: 2,
    subject: 'Tin học',
    grade: 'all',
    explanation: 'Màn hình là thiết bị xuất hình ảnh và thông tin.'
  }
];

// Cartoon Tug of War Vector Stage matching elementary school drawing style
export const TugOfWarCartoonStage: React.FC<{
  ropePosition: number;
  pullingTeamAnimation: 'red' | 'blue' | null;
  isFullscreen?: boolean;
}> = ({ ropePosition, pullingTeamAnimation, isFullscreen }) => {
  // Convert ropePosition (-80 to +80) to SVG pixel shift (-140 to +140)
  const shiftX = ropePosition * 1.75;

  return (
    <div className={`relative w-full rounded-2xl bg-[#e0f2fe] border-4 border-sky-300 overflow-hidden shadow-inner flex flex-col items-center justify-center ${isFullscreen ? 'py-4 px-2 my-2 min-h-[300px]' : 'py-2 px-1 min-h-[220px]'}`}>
      <svg
        viewBox="0 0 800 240"
        className="w-full h-auto max-h-[280px] select-none"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f0f9ff" />
            <stop offset="100%" stopColor="#bae6fd" />
          </linearGradient>
          <filter id="shadowFx" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Sky / Backdrop */}
        <rect x="0" y="0" width="800" height="240" fill="url(#skyGrad)" rx="12" />

        {/* Center Vertical Dashed Green Marker Line */}
        <line
          x1="400"
          y1="0"
          x2="400"
          y2="240"
          stroke="#10b981"
          strokeWidth="3.5"
          strokeDasharray="8,6"
        />

        {/* Moving Rope & Both Teams Group (Shifted by ropePosition) */}
        <g
          style={{
            transform: `translateX(${shiftX}px)`,
            transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}
          className={pullingTeamAnimation ? 'animate-pulse' : ''}
        >
          {/* Main Tug Rope */}
          <line
            x1="20"
            y1="135"
            x2="780"
            y2="135"
            stroke="#27272a"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <line
            x1="20"
            y1="135"
            x2="780"
            y2="135"
            stroke="#fbbf24"
            strokeWidth="3"
            strokeDasharray="10,6"
            strokeLinecap="round"
          />

          {/* Center Red Ribbon Bow on Rope */}
          <g transform="translate(400, 135)" filter="url(#shadowFx)">
            <path d="M 0 0 C -15 -18, -30 -10, -20 0 C -30 10, -15 18, 0 0 Z" fill="#dc2626" />
            <path d="M 0 0 C 15 -18, 30 -10, 20 0 C 30 10, 15 18, 0 0 Z" fill="#dc2626" />
            <circle cx="0" cy="0" r="5" fill="#991b1b" stroke="#ffffff" strokeWidth="1.5" />
            <path d="M -2 3 L -12 25 L -4 22 L 0 3 Z" fill="#ef4444" />
            <path d="M 2 3 L 12 25 L 4 22 L 0 3 Z" fill="#ef4444" />
          </g>

          {/* ==================== 🔵 BLUE TEAM (LEFT SIDE - 3 KIDS) ==================== */}
          <g filter="url(#shadowFx)">
            {/* Blue Kid 1 (Back, x ~ 130) */}
            <g transform="translate(130, 0)">
              <line x1="45" y1="140" x2="20" y2="200" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" />
              <line x1="55" y1="140" x2="65" y2="200" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" />
              <ellipse cx="14" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
              <ellipse cx="69" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
              <path d="M 35 140 L 60 130 L 45 80 L 20 90 Z" fill="#3b82f6" />
              <line x1="35" y1="95" x2="80" y2="135" stroke="#3b82f6" strokeWidth="11" strokeLinecap="round" />
              <line x1="45" y1="100" x2="85" y2="135" stroke="#2563eb" strokeWidth="11" strokeLinecap="round" />
              <path d="M 25 82 L 35 88 L 22 105 L 18 85 Z" fill="#ef4444" />
              <circle cx="22" cy="65" r="18" fill="#fcd34d" />
              <path d="M 8 62 C 8 42, 36 42, 36 62 C 32 50, 12 50, 8 62 Z" fill="#1e293b" />
              <circle cx="16" cy="64" r="2.5" fill="#0f172a" />
              <path d="M 12 72 Q 18 78 24 72" stroke="#0f172a" strokeWidth="2" fill="none" />
            </g>

            {/* Blue Kid 2 (Middle - Girl with ponytail, x ~ 210) */}
            <g transform="translate(210, 0)">
              <line x1="45" y1="140" x2="20" y2="200" stroke="#1d4ed8" strokeWidth="13" strokeLinecap="round" />
              <line x1="55" y1="140" x2="65" y2="200" stroke="#1d4ed8" strokeWidth="13" strokeLinecap="round" />
              <ellipse cx="14" cy="202" rx="11" ry="6" fill="#f472b6" />
              <ellipse cx="69" cy="202" rx="11" ry="6" fill="#f472b6" />
              <path d="M 35 140 L 60 130 L 45 80 L 20 90 Z" fill="#3b82f6" />
              <line x1="35" y1="95" x2="80" y2="135" stroke="#3b82f6" strokeWidth="10" strokeLinecap="round" />
              <line x1="45" y1="100" x2="85" y2="135" stroke="#2563eb" strokeWidth="10" strokeLinecap="round" />
              <path d="M 25 82 L 35 88 L 22 105 L 18 85 Z" fill="#ef4444" />
              <circle cx="22" cy="65" r="17" fill="#fcd34d" />
              <path d="M 8 62 C 8 42, 36 42, 36 62 C 32 50, 12 50, 8 62 Z" fill="#0f172a" />
              <path d="M 8 60 C -5 50, -8 70, 2 72 Z" fill="#0f172a" />
              <circle cx="16" cy="64" r="2.5" fill="#0f172a" />
              <path d="M 12 72 Q 18 78 24 72" stroke="#0f172a" strokeWidth="2" fill="none" />
            </g>

            {/* Blue Kid 3 (Front, x ~ 290) */}
            <g transform="translate(290, 0)">
              <line x1="45" y1="140" x2="20" y2="200" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" />
              <line x1="55" y1="140" x2="65" y2="200" stroke="#1d4ed8" strokeWidth="14" strokeLinecap="round" />
              <ellipse cx="14" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
              <ellipse cx="69" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#0284c7" strokeWidth="2" />
              <path d="M 35 140 L 60 130 L 45 80 L 20 90 Z" fill="#2563eb" />
              <line x1="35" y1="95" x2="80" y2="135" stroke="#3b82f6" strokeWidth="11" strokeLinecap="round" />
              <line x1="45" y1="100" x2="85" y2="135" stroke="#1d4ed8" strokeWidth="11" strokeLinecap="round" />
              <path d="M 25 82 L 35 88 L 22 105 L 18 85 Z" fill="#ef4444" />
              <circle cx="22" cy="65" r="18" fill="#fcd34d" />
              <path d="M 8 62 C 8 42, 36 42, 36 62 C 32 50, 12 50, 8 62 Z" fill="#1e293b" />
              <circle cx="16" cy="64" r="2.5" fill="#0f172a" />
              <path d="M 12 72 Q 18 78 24 72" stroke="#0f172a" strokeWidth="2" fill="none" />
            </g>
          </g>

          {/* ==================== 🔴 RED TEAM (RIGHT SIDE - 3 KIDS) ==================== */}
          <g filter="url(#shadowFx)">
            {/* Red Kid 1 (Front, x ~ 420) */}
            <g transform="translate(420, 0)">
              <line x1="25" y1="140" x2="15" y2="200" stroke="#b91c1c" strokeWidth="14" strokeLinecap="round" />
              <line x1="35" y1="140" x2="60" y2="200" stroke="#b91c1c" strokeWidth="14" strokeLinecap="round" />
              <ellipse cx="11" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#dc2626" strokeWidth="2" />
              <ellipse cx="64" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#dc2626" strokeWidth="2" />
              <path d="M 45 140 L 20 130 L 35 80 L 60 90 Z" fill="#ef4444" />
              <line x1="45" y1="95" x2="0" y2="135" stroke="#ef4444" strokeWidth="11" strokeLinecap="round" />
              <line x1="35" y1="100" x2="-5" y2="135" stroke="#dc2626" strokeWidth="11" strokeLinecap="round" />
              <path d="M 55 82 L 45 88 L 58 105 L 62 85 Z" fill="#ef4444" />
              <circle cx="58" cy="65" r="18" fill="#fcd34d" />
              <path d="M 44 62 C 44 42, 72 42, 72 62 C 68 50, 48 50, 44 62 Z" fill="#1e293b" />
              <circle cx="64" cy="64" r="2.5" fill="#0f172a" />
              <path d="M 56 72 Q 62 78 68 72" stroke="#0f172a" strokeWidth="2" fill="none" />
            </g>

            {/* Red Kid 2 (Middle - Girl with ponytail, x ~ 500) */}
            <g transform="translate(500, 0)">
              <line x1="25" y1="140" x2="15" y2="200" stroke="#b91c1c" strokeWidth="13" strokeLinecap="round" />
              <line x1="35" y1="140" x2="60" y2="200" stroke="#b91c1c" strokeWidth="13" strokeLinecap="round" />
              <ellipse cx="11" cy="202" rx="11" ry="6" fill="#fb7185" />
              <ellipse cx="64" cy="202" rx="11" ry="6" fill="#fb7185" />
              <path d="M 45 140 L 20 130 L 35 80 L 60 90 Z" fill="#ef4444" />
              <line x1="45" y1="95" x2="0" y2="135" stroke="#ef4444" strokeWidth="10" strokeLinecap="round" />
              <line x1="35" y1="100" x2="-5" y2="135" stroke="#dc2626" strokeWidth="10" strokeLinecap="round" />
              <path d="M 55 82 L 45 88 L 58 105 L 62 85 Z" fill="#ef4444" />
              <circle cx="58" cy="65" r="17" fill="#fcd34d" />
              <path d="M 44 62 C 44 42, 72 42, 72 62 C 68 50, 48 50, 44 62 Z" fill="#0f172a" />
              <path d="M 72 60 C 85 50, 88 70, 78 72 Z" fill="#0f172a" />
              <circle cx="64" cy="64" r="2.5" fill="#0f172a" />
              <path d="M 56 72 Q 62 78 68 72" stroke="#0f172a" strokeWidth="2" fill="none" />
            </g>

            {/* Red Kid 3 (Back, x ~ 580) */}
            <g transform="translate(580, 0)">
              <line x1="25" y1="140" x2="15" y2="200" stroke="#b91c1c" strokeWidth="14" strokeLinecap="round" />
              <line x1="35" y1="140" x2="60" y2="200" stroke="#b91c1c" strokeWidth="14" strokeLinecap="round" />
              <ellipse cx="11" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#dc2626" strokeWidth="2" />
              <ellipse cx="64" cy="202" rx="12" ry="6" fill="#f8fafc" stroke="#dc2626" strokeWidth="2" />
              <path d="M 45 140 L 20 130 L 35 80 L 60 90 Z" fill="#dc2626" />
              <line x1="45" y1="95" x2="0" y2="135" stroke="#ef4444" strokeWidth="11" strokeLinecap="round" />
              <line x1="35" y1="100" x2="-5" y2="135" stroke="#b91c1c" strokeWidth="11" strokeLinecap="round" />
              <path d="M 55 82 L 45 88 L 58 105 L 62 85 Z" fill="#ef4444" />
              <circle cx="58" cy="65" r="18" fill="#fcd34d" />
              <path d="M 44 62 C 44 42, 72 42, 72 62 C 68 50, 48 50, 44 62 Z" fill="#1e293b" />
              <circle cx="64" cy="64" r="2.5" fill="#0f172a" />
              <path d="M 56 72 Q 62 78 68 72" stroke="#0f172a" strokeWidth="2" fill="none" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

export const FilmTab: React.FC<FilmTabProps> = ({ state, onUpdateState }) => {
  const activeClass = state.classes.find((c) => c.id === state.activeClassId) || state.classes[0];
  const allStudents = state.students.filter((s) => s.classId === state.activeClassId);

  // Container & Fullscreen State (Only for Arena & Quiz)
  const gameStageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (gameStageRef.current?.requestFullscreen) {
        gameStageRef.current.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
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

  // Teams & Players
  const [teamRed, setTeamRed] = useState<Student[]>([]);
  const [teamBlue, setTeamBlue] = useState<Student[]>([]);
  const [redPlayer, setRedPlayer] = useState<Student | null>(null);
  const [bluePlayer, setBluePlayer] = useState<Student | null>(null);
  const [teamSize, setTeamSize] = useState<number>(5);

  // Simultaneous Answer State
  const [redAnswerIndex, setRedAnswerIndex] = useState<number | null>(null);
  const [blueAnswerIndex, setBlueAnswerIndex] = useState<number | null>(null);
  const [redResult, setRedResult] = useState<'correct' | 'wrong' | null>(null);
  const [blueResult, setBlueResult] = useState<'correct' | 'wrong' | null>(null);

  // Game Engine State
  const [gameMode, setGameMode] = useState<'quiz' | 'manual'>('quiz');
  const [ropePosition, setRopePosition] = useState<number>(0); // -100 (Red Wins) to +100 (Blue Wins)
  const [redScore, setRedScore] = useState<number>(0);
  const [blueScore, setBlueScore] = useState<number>(0);
  const [showScoreboard, setShowScoreboard] = useState<boolean>(true);
  const [scoreNotice, setScoreNotice] = useState<string | null>(null);
  const [matchWinner, setMatchWinner] = useState<'red' | 'blue' | null>(null);
  const [awardAmount, setAwardAmount] = useState<number>(3);
  const [pullingTeamAnimation, setPullingTeamAnimation] = useState<'red' | 'blue' | null>(null);

  // Sound & Quiz Filter State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedSubject, setSelectedSubject] = useState<string>(state.wheelQuizSubject || 'all');
  const [selectedGrade, setSelectedGrade] = useState<string | number>(state.wheelQuizGrade || 'all');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(state.wheelQuizFolderId || 'all');
  const [isAutoShuffleOptions, setIsAutoShuffleOptions] = useState<boolean>(true);

  // Question State
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [questionIndex, setQuestionIndex] = useState<number>(0);

  // Independent Timer for Tug-of-War Game
  const [tugTimerSeconds, setTugTimerSeconds] = useState<number>(20); // Default 20s
  const [timeLeft, setTimeLeft] = useState<number>(tugTimerSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Track students who have already participated in 5v5 Tug-of-War rounds
  const [playedStudentIds, setPlayedStudentIds] = useState<string[]>([]);

  // Split 5 students per team without repeating until all have played
  const split5v5NoRepeat = () => {
    if (allStudents.length === 0) return;

    // Filter students who haven't played yet in current cycle
    let unplayed = allStudents.filter((s) => !playedStudentIds.includes(s.id));

    // If fewer than 10 students remain unplayed (or all available have played), reset cycle!
    if (unplayed.length < Math.min(10, allStudents.length)) {
      unplayed = [...allStudents];
      setPlayedStudentIds([]);
    }

    // Shuffle unplayed students
    const shuffled = [...unplayed].sort(() => Math.random() - 0.5);

    // Pick 5 for Team Red, 5 for Team Blue
    const redCount = Math.min(5, Math.ceil(shuffled.length / 2));
    const blueCount = Math.min(5, shuffled.length - redCount);

    const red = shuffled.slice(0, redCount);
    const blue = shuffled.slice(redCount, redCount + blueCount);

    setTeamRed(red);
    setTeamBlue(blue);
    setRedPlayer(red[0] || null);
    setBluePlayer(blue[0] || null);

    // Mark selected student IDs as played
    const selectedIds = [...red.map((s) => s.id), ...blue.map((s) => s.id)];
    setPlayedStudentIds((prev) => Array.from(new Set([...prev, ...selectedIds])));

    if (soundEnabled) playBeep(659, 0.2, 0.1);
  };

  const resetPlayedCycle = () => {
    setPlayedStudentIds([]);
    if (allStudents.length === 0) return;
    const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
    const redCount = Math.min(5, Math.ceil(shuffled.length / 2));
    const blueCount = Math.min(5, shuffled.length - redCount);
    const red = shuffled.slice(0, redCount);
    const blue = shuffled.slice(redCount, redCount + blueCount);
    setTeamRed(red);
    setTeamBlue(blue);
    setRedPlayer(red[0] || null);
    setBluePlayer(blue[0] || null);
    const selectedIds = [...red.map((s) => s.id), ...blue.map((s) => s.id)];
    setPlayedStudentIds(selectedIds);
    if (soundEnabled) playBeep(523, 0.15, 0.1);
  };

  // Initialize Teams on Class change
  useEffect(() => {
    setPlayedStudentIds([]);
    split5v5NoRepeat();
  }, [state.activeClassId]);

  // Active Shuffled Question Data
  interface ActiveQuestionData {
    id: string;
    question: string;
    options: string[];
    correctIndex: number;
    explanation?: string;
    subject?: string;
  }

  const [activeQuestion, setActiveQuestion] = useState<ActiveQuestionData | null>(null);
  const [isQuestionStarted, setIsQuestionStarted] = useState<boolean>(false);
  const [askedQuestionIds, setAskedQuestionIds] = useState<string[]>([]);

  // Game Configuration Options State
  const [questionsPerMatch, setQuestionsPerMatch] = useState<number>(5); // 3, 5, 10, 15, or -1 (Unlimited)
  const [playFormat, setPlayFormat] = useState<'simultaneous' | 'turns' | 'speed'>('simultaneous');
  const [pullForceCorrect, setPullForceCorrect] = useState<number>(25); // 15, 25, 35
  const [pullForcePenalty, setPullForcePenalty] = useState<number>(15); // 0, 10, 15, 25
  const [currentTurn, setCurrentTurn] = useState<'red' | 'blue'>('red'); // For 'turns' mode
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Camera AI Hand Gesture Recognition State
  const [isCameraGestureEnabled, setIsCameraGestureEnabled] = useState<boolean>(false);
  const [cameraHoldDuration, setCameraHoldDuration] = useState<number>(800); // 500, 800, 1200 ms

  // Helper to generate a unique 3-digit PIN code (100 - 999)
  const generateRandom3DigitPin = () => Math.floor(100 + Math.random() * 900).toString();

  // 3-digit PIN state for Team Red & Team Blue
  const [redPin, setRedPin] = useState<string>('382');
  const [bluePin, setBluePin] = useState<string>('749');

  // Student PIN entry modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [inputPin, setInputPin] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Multi-Device Link & Teacher Master Control State
  const [deviceTeam, setDeviceTeam] = useState<'teacher' | 'red' | 'blue' | 'view'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const teamParam = params.get('tugTeam') || params.get('team');
      if (teamParam === 'red') return 'red';
      if (teamParam === 'blue') return 'blue';
      if (teamParam === 'teacher') return 'teacher';
      if (teamParam === 'view') return 'view';
      // If opened via shared guest link, default to spectator/viewer
      if (params.get('page') === 'film') return 'view';
    }
    return 'teacher';
  });

  // Multi-Device Room ID: reliably extract target classId from URL param or state.activeClassId
  const urlClassId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('classId') : null;
  const targetRoomClassId = urlClassId || state.activeClassId || 'default';
  const roomDocId = `tug_room_${targetRoomClassId}`;

  // Dynamic active room document ID for student machines (locks onto teacher's room when PIN matches)
  const [activeRoomDocId, setActiveRoomDocId] = useState<string>(() => roomDocId);

  // Helper to broadcast room state updates across devices with strict Firestore sanitization
  const broadcastRoomState = (partialState: Record<string, any>) => {
    try {
      const payload = cleanPayload({
        ...partialState,
        redPin,
        bluePin,
        activeClassId: targetRoomClassId,
        updatedBy: deviceTeam,
        lastUpdated: new Date().toISOString()
      });

      const targetDocId = activeRoomDocId || roomDocId;

      // 1. Save to specific class room document
      const roomRef = doc(db, 'tug_of_war_rooms', targetDocId);
      setDoc(roomRef, payload, { merge: true }).catch((err) =>
        console.warn('Room sync broadcast error:', err)
      );

      // 2. ALWAYS also save to the primary active room document ('tug_room_active') for all updates (Teacher AND Students)
      const activeRoomRef = doc(db, 'tug_of_war_rooms', 'tug_room_active');
      setDoc(activeRoomRef, payload, { merge: true }).catch((err) =>
        console.warn('Active room sync broadcast error:', err)
      );
    } catch (e) {
      console.warn('Room sync broadcast error:', e);
    }
  };

  // Generate new 3-digit PINs (Teacher Only)
  const handleGenerateNewPins = () => {
    const newRed = generateRandom3DigitPin();
    let newBlue = generateRandom3DigitPin();
    while (newBlue === newRed) {
      newBlue = generateRandom3DigitPin();
    }
    setRedPin(newRed);
    setBluePin(newBlue);
    try {
      const payload = cleanPayload({
        redPin: newRed,
        bluePin: newBlue,
        activeClassId: targetRoomClassId,
        updatedBy: deviceTeam,
        lastUpdated: new Date().toISOString()
      });
      const roomRef = doc(db, 'tug_of_war_rooms', roomDocId);
      setDoc(roomRef, payload, { merge: true }).catch(console.warn);

      const activeRoomRef = doc(db, 'tug_of_war_rooms', 'tug_room_active');
      setDoc(activeRoomRef, payload, { merge: true }).catch(console.warn);
    } catch (e) {
      console.warn(e);
    }
    setCopySuccessMsg(`🎲 Đã tạo bộ mã 3 số mới: Đỏ [${newRed}] - Xanh [${newBlue}]!`);
    setTimeout(() => setCopySuccessMsg(null), 4000);
  };

  // Ref to track question start transition for audio & visual cue on student machines
  const prevIsQuestionStartedRef = useRef<boolean>(false);

  // Helper to force fetch and sync active room data directly from Firestore
  const fetchAndSyncActiveRoom = async () => {
    try {
      const targetDocId = activeRoomDocId || roomDocId;
      let activeDocSnap = await getDoc(doc(db, 'tug_of_war_rooms', targetDocId));
      if (!activeDocSnap.exists()) {
        activeDocSnap = await getDoc(doc(db, 'tug_of_war_rooms', 'tug_room_active'));
      }
      if (activeDocSnap.exists()) {
        const activeData = activeDocSnap.data();
        if (activeData) {
          if (activeData.redPin) setRedPin(String(activeData.redPin));
          if (activeData.bluePin) setBluePin(String(activeData.bluePin));
          if (typeof activeData.isQuestionStarted === 'boolean') setIsQuestionStarted(activeData.isQuestionStarted);
          if (Array.isArray(activeData.matchQuestions) && activeData.matchQuestions.length > 0) {
            setMatchQuestions(activeData.matchQuestions);
          }
          if (typeof activeData.redQuestionIdx === 'number') setRedQuestionIdx(activeData.redQuestionIdx);
          if (typeof activeData.blueQuestionIdx === 'number') setBlueQuestionIdx(activeData.blueQuestionIdx);
          if (typeof activeData.redScore === 'number') setRedScore(activeData.redScore);
          if (typeof activeData.blueScore === 'number') setBlueScore(activeData.blueScore);
          if (typeof activeData.redAnswerCount === 'number') setRedAnswerCount(activeData.redAnswerCount);
          if (typeof activeData.blueAnswerCount === 'number') setBlueAnswerCount(activeData.blueAnswerCount);
          if (typeof activeData.ropePosition === 'number') setRopePosition(activeData.ropePosition);
          if (activeData.matchWinner !== undefined) setMatchWinner(activeData.matchWinner);
          if (activeData.currentTurn) setCurrentTurn(activeData.currentTurn);
          if (activeData.playFormat) setPlayFormat(activeData.playFormat);
          if (activeData.redSelectedOption !== undefined) setRedSelectedOption(activeData.redSelectedOption);
          if (activeData.blueSelectedOption !== undefined) setBlueSelectedOption(activeData.blueSelectedOption);
          if (typeof activeData.speedAttemptedRed === 'boolean') setSpeedAttemptedRed(activeData.speedAttemptedRed);
          if (typeof activeData.speedAttemptedBlue === 'boolean') setSpeedAttemptedBlue(activeData.speedAttemptedBlue);
          if (activeData.scoreNotice) setScoreNotice(activeData.scoreNotice);
          if (typeof activeData.tugTimerSeconds === 'number') setTugTimerSeconds(activeData.tugTimerSeconds);
          if (typeof activeData.timeLeft === 'number') setTimeLeft(activeData.timeLeft);
          if (typeof activeData.isTimerRunning === 'boolean') setIsTimerRunning(activeData.isTimerRunning);
          if (typeof activeData.questionsPerMatch === 'number') setQuestionsPerMatch(activeData.questionsPerMatch);
          return activeData;
        }
      }
    } catch (e) {
      console.warn('Fetch and sync active room error:', e);
    }
    return null;
  };

  // Subscribe to real-time room state from Cloud Firestore across all devices
  useEffect(() => {
    const applyRoomData = (data: any) => {
      if (!data) return;
      if (data.redPin) setRedPin(String(data.redPin));
      if (data.bluePin) setBluePin(String(data.bluePin));

      // Trigger energetic start chime and confetti on student devices when teacher starts match
      if (data.isQuestionStarted === true && !prevIsQuestionStartedRef.current && deviceTeam !== 'teacher') {
        if (soundEnabled) playBeep(659, 0.25, 0.15);
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
      if (typeof data.isQuestionStarted === 'boolean') {
        prevIsQuestionStartedRef.current = data.isQuestionStarted;
      }

      // Sync match state unconditionally for student devices or when updated by another device
      if (deviceTeam !== 'teacher' || data.updatedBy !== deviceTeam || matchQuestions.length === 0) {
        if (typeof data.isQuestionStarted === 'boolean') setIsQuestionStarted(data.isQuestionStarted);
        if (Array.isArray(data.matchQuestions) && data.matchQuestions.length > 0) setMatchQuestions(data.matchQuestions);
        if (typeof data.redQuestionIdx === 'number') setRedQuestionIdx(data.redQuestionIdx);
        if (typeof data.blueQuestionIdx === 'number') setBlueQuestionIdx(data.blueQuestionIdx);
        if (typeof data.redScore === 'number') setRedScore(data.redScore);
        if (typeof data.blueScore === 'number') setBlueScore(data.blueScore);
        if (typeof data.redAnswerCount === 'number') setRedAnswerCount(data.redAnswerCount);
        if (typeof data.blueAnswerCount === 'number') setBlueAnswerCount(data.blueAnswerCount);
        if (typeof data.ropePosition === 'number') setRopePosition(data.ropePosition);
        if (data.matchWinner !== undefined) setMatchWinner(data.matchWinner);
        if (data.currentTurn) setCurrentTurn(data.currentTurn);
        if (data.playFormat) setPlayFormat(data.playFormat);
        if (data.redSelectedOption !== undefined) setRedSelectedOption(data.redSelectedOption);
        if (data.blueSelectedOption !== undefined) setBlueSelectedOption(data.blueSelectedOption);
        if (typeof data.speedAttemptedRed === 'boolean') setSpeedAttemptedRed(data.speedAttemptedRed);
        if (typeof data.speedAttemptedBlue === 'boolean') setSpeedAttemptedBlue(data.speedAttemptedBlue);
        if (data.scoreNotice) setScoreNotice(data.scoreNotice);
        if (typeof data.tugTimerSeconds === 'number') setTugTimerSeconds(data.tugTimerSeconds);
        if (typeof data.timeLeft === 'number') setTimeLeft(data.timeLeft);
        if (typeof data.isTimerRunning === 'boolean') setIsTimerRunning(data.isTimerRunning);
        if (typeof data.questionsPerMatch === 'number') setQuestionsPerMatch(data.questionsPerMatch);
        if (typeof data.isCameraGestureEnabled === 'boolean' && deviceTeam !== 'teacher') {
          setIsCameraGestureEnabled(data.isCameraGestureEnabled);
        }
      }
    };

    const currentListenRoomId = activeRoomDocId || roomDocId;

    // 1. Primary listener for target room
    const roomRef = doc(db, 'tug_of_war_rooms', currentListenRoomId);
    const unsubscribePrimary = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          applyRoomData(snapshot.data());
        } else if (deviceTeam === 'teacher') {
          // If room doesn't exist yet, teacher auto-generates 3-digit PINs
          const initRed = generateRandom3DigitPin();
          let initBlue = generateRandom3DigitPin();
          while (initBlue === initRed) {
            initBlue = generateRandom3DigitPin();
          }
          setRedPin(initRed);
          setBluePin(initBlue);
          const initPayload = cleanPayload({
            redPin: initRed,
            bluePin: initBlue,
            activeClassId: targetRoomClassId,
            updatedBy: 'teacher',
            isQuestionStarted: false,
            matchQuestions: [],
            lastUpdated: new Date().toISOString()
          });
          setDoc(roomRef, initPayload, { merge: true }).catch(console.warn);
          setDoc(doc(db, 'tug_of_war_rooms', 'tug_room_active'), initPayload, { merge: true }).catch(console.warn);
        }
      },
      (err) => console.warn('Firestore room sync warn:', err)
    );

    // 2. Secondary fallback listener for active room
    let unsubscribeActive = () => {};
    if (currentListenRoomId !== 'tug_room_active') {
      const activeRoomRef = doc(db, 'tug_of_war_rooms', 'tug_room_active');
      unsubscribeActive = onSnapshot(
        activeRoomRef,
        (snapshot) => {
          if (snapshot.exists()) {
            applyRoomData(snapshot.data());
          }
        },
        (err) => console.warn('Active room sync fallback warn:', err)
      );
    }

    return () => {
      unsubscribePrimary();
      unsubscribeActive();
    };
  }, [activeRoomDocId, roomDocId, deviceTeam]);

  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [copySuccessMsg, setCopySuccessMsg] = useState<string | null>(null);

  // Copy 1 Universal Link for all student machines / viewer
  const copyUniversalLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const url = `${baseUrl}?page=film&classId=${encodeURIComponent(targetRoomClassId)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopySuccessMsg('🎉 Đã sao chép 1 đường link chung duy nhất! Thầy/Cô gửi link này cho cả lớp mở trên máy tính.');
        setTimeout(() => setCopySuccessMsg(null), 4000);
      }).catch(() => {
        prompt('Đường link chung cho cả lớp:', url);
      });
    } else {
      prompt('Đường link chung cho cả lớp:', url);
    }
  };

  // Copy PIN code for Red or Blue
  const copyPinCode = (team: 'red' | 'blue') => {
    const code = team === 'red' ? redPin : bluePin;
    const teamName = team === 'red' ? 'Đội Đỏ 🔴' : 'Đội Xanh 🔵';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopySuccessMsg(`📋 Đã sao chép mã 3 số ${teamName}: [${code}]`);
        setTimeout(() => setCopySuccessMsg(null), 3000);
      }).catch(() => {
        prompt(`Mã 3 số ${teamName}:`, code);
      });
    } else {
      prompt(`Mã 3 số ${teamName}:`, code);
    }
  };

  // Verify entered 3-digit PIN to join team (with instant local check & resilient offline/online sync)
  const handleVerifyPin = async (pinToTest?: string) => {
    const targetPin = (pinToTest !== undefined ? pinToTest : inputPin).trim();
    setPinError(null);
    setPinSuccess(null);

    if (targetPin.length !== 3) {
      setPinError('Vui lòng nhập đủ 3 chữ số!');
      return;
    }

    let matchedTeam: 'red' | 'blue' | null = null;
    let matchedRoomId = activeRoomDocId || roomDocId;
    let matchedData: any = null;

    // Fast Check 1: Instant local state match (Zero latency / Offline resilient)
    if (targetPin === redPin) {
      matchedTeam = 'red';
    } else if (targetPin === bluePin) {
      matchedTeam = 'blue';
    }

    // Check 2: Query current bound room safely
    if (!matchedTeam) {
      try {
        const currentSnap = await getDoc(doc(db, 'tug_of_war_rooms', matchedRoomId));
        if (currentSnap.exists()) {
          const data = currentSnap.data();
          if (data && String(data.redPin) === targetPin) {
            matchedTeam = 'red';
            matchedData = data;
          } else if (data && String(data.bluePin) === targetPin) {
            matchedTeam = 'blue';
            matchedData = data;
          }
        }
      } catch (err) {
        console.warn('Check current room error:', err);
      }
    }

    // Check 3: Query active room safely
    if (!matchedTeam) {
      try {
        const activeSnap = await getDoc(doc(db, 'tug_of_war_rooms', 'tug_room_active'));
        if (activeSnap.exists()) {
          const data = activeSnap.data();
          if (data && String(data.redPin) === targetPin) {
            matchedTeam = 'red';
            matchedRoomId = data.activeClassId ? `tug_room_${data.activeClassId}` : 'tug_room_active';
            matchedData = data;
          } else if (data && String(data.bluePin) === targetPin) {
            matchedTeam = 'blue';
            matchedRoomId = data.activeClassId ? `tug_room_${data.activeClassId}` : 'tug_room_active';
            matchedData = data;
          }
        }
      } catch (err) {
        console.warn('Check active room error:', err);
      }
    }

    // Check 4: Query all rooms collection safely
    if (!matchedTeam) {
      try {
        const roomsQuery = query(collection(db, 'tug_of_war_rooms'));
        const querySnap = await getDocs(roomsQuery);
        querySnap.forEach((docSnap) => {
          if (!matchedTeam && docSnap.exists()) {
            const data = docSnap.data();
            if (data && String(data.redPin) === targetPin) {
              matchedTeam = 'red';
              matchedRoomId = docSnap.id;
              matchedData = data;
            } else if (data && String(data.bluePin) === targetPin) {
              matchedTeam = 'blue';
              matchedRoomId = docSnap.id;
              matchedData = data;
            }
          }
        });
      } catch (err) {
        console.warn('Query rooms collection error:', err);
      }
    }

    // If matched either locally or via Firestore:
    if (matchedTeam) {
      setActiveRoomDocId(matchedRoomId);
      setDeviceTeam(matchedTeam);

      if (matchedData) {
        if (matchedData.redPin) setRedPin(String(matchedData.redPin));
        if (matchedData.bluePin) setBluePin(String(matchedData.bluePin));
        if (typeof matchedData.isQuestionStarted === 'boolean') setIsQuestionStarted(matchedData.isQuestionStarted);
        if (Array.isArray(matchedData.matchQuestions) && matchedData.matchQuestions.length > 0) setMatchQuestions(matchedData.matchQuestions);
        if (typeof matchedData.redQuestionIdx === 'number') setRedQuestionIdx(matchedData.redQuestionIdx);
        if (typeof matchedData.blueQuestionIdx === 'number') setBlueQuestionIdx(matchedData.blueQuestionIdx);
        if (typeof matchedData.redScore === 'number') setRedScore(matchedData.redScore);
        if (typeof matchedData.blueScore === 'number') setBlueScore(matchedData.blueScore);
        if (typeof matchedData.redAnswerCount === 'number') setRedAnswerCount(matchedData.redAnswerCount);
        if (typeof matchedData.blueAnswerCount === 'number') setBlueAnswerCount(matchedData.blueAnswerCount);
        if (typeof matchedData.ropePosition === 'number') setRopePosition(matchedData.ropePosition);
        if (matchedData.matchWinner !== undefined) setMatchWinner(matchedData.matchWinner);
        if (matchedData.currentTurn) setCurrentTurn(matchedData.currentTurn);
        if (matchedData.playFormat) setPlayFormat(matchedData.playFormat);
      }

      const teamName = matchedTeam === 'red' ? 'Đội Đỏ 🔴' : 'Đội Xanh 🔵';
      setPinSuccess(`🎉 Đúng mã ${teamName}! Đã kết nối vào đội thành công!`);
      if (soundEnabled) playCelebration();
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

      setTimeout(() => {
        setIsPinModalOpen(false);
        setInputPin('');
        setPinSuccess(null);
      }, 500);
      return;
    }

    setPinError(`❌ Mã [${targetPin}] không chính xác! Vui lòng xem lại mã 3 chữ số trên máy Thầy/Cô.`);
    if (soundEnabled) playBeep(200, 0.3, 0.2);
  };

  // Option Highlight & Shared Speed Question Tracking
  const [redSelectedOption, setRedSelectedOption] = useState<{ idx: number; result: 'correct' | 'wrong' } | null>(null);
  const [blueSelectedOption, setBlueSelectedOption] = useState<{ idx: number; result: 'correct' | 'wrong' } | null>(null);
  const [speedAttemptedRed, setSpeedAttemptedRed] = useState<boolean>(false);
  const [speedAttemptedBlue, setSpeedAttemptedBlue] = useState<boolean>(false);
  const [isAdvancingSpeedQuestion, setIsAdvancingSpeedQuestion] = useState<boolean>(false);

  // Match Question State
  const [matchQuestions, setMatchQuestions] = useState<ActiveQuestionData[]>([]);
  const [redQuestionIdx, setRedQuestionIdx] = useState<number>(0);
  const [redAnswerCount, setRedAnswerCount] = useState<number>(0);
  const [redLastResult, setRedLastResult] = useState<'correct' | 'wrong' | null>(null);

  const [blueQuestionIdx, setBlueQuestionIdx] = useState<number>(0);
  const [blueAnswerCount, setBlueAnswerCount] = useState<number>(0);
  const [blueLastResult, setBlueLastResult] = useState<'correct' | 'wrong' | null>(null);

  // Filter available questions from AppState or Fallback
  const availableQuestions = React.useMemo(() => {
    const allQ = state.quizQuestions && state.quizQuestions.length > 0
      ? state.quizQuestions
      : DEFAULT_TUG_QUESTIONS;

    return allQ.filter((q) => {
      // Grade filter
      if (selectedGrade !== 'all') {
        const targetG = String(selectedGrade);
        const qG = String(q.grade || 'all');
        if (qG !== 'all' && qG !== targetG) return false;
      }
      // Subject filter
      if (selectedSubject !== 'all' && q.subject && q.subject !== selectedSubject) {
        return false;
      }
      // Folder filter
      if (selectedFolderId !== 'all') {
        if (selectedFolderId === 'uncategorized') {
          if (q.folderId) return false;
        } else if (q.folderId !== selectedFolderId) {
          return false;
        }
      }
      return true;
    });
  }, [state.quizQuestions, selectedGrade, selectedSubject, selectedFolderId]);

  // Track unasked questions pool to guarantee no duplicate questions
  const unaskedQuestions = React.useMemo(() => {
    return availableQuestions.filter((q) => !askedQuestionIds.includes(q.id));
  }, [availableQuestions, askedQuestionIds]);

  const totalAvailableCount = availableQuestions.length;
  const unaskedCount = unaskedQuestions.length;

  const allSubjectsList = React.useMemo(() => {
    const defaultSubjects = ['Tin học', 'Toán', 'Tiếng Việt', 'Tự nhiên và Xã hội', 'Lịch sử và Địa lí', 'Tiếng Anh', 'Công nghệ', 'Âm nhạc', 'Mĩ thuật', 'Đạo đức', 'Thể dục'];
    const customSubjects = state.subjects || [];
    return Array.from(new Set([...defaultSubjects, ...customSubjects]));
  }, [state.subjects]);

  const questionFoldersList = state.questionFolders || [];
  const allQuizQuestionsList = state.quizQuestions || [];
  const allQuizQuestionsCount = allQuizQuestionsList.length || DEFAULT_TUG_QUESTIONS.length;

  // Function to start a new match (Teacher Master Permission Required)
  const startRandomQuestion = () => {
    if (deviceTeam !== 'teacher') {
      alert('🔒 Chỉ máy Giáo viên mới có quyền bấm BẮT ĐẦU TRẬN ĐẤU hoặc TRẬN MỚI!');
      return;
    }

    const allQ = state.quizQuestions && state.quizQuestions.length > 0
      ? state.quizQuestions
      : DEFAULT_TUG_QUESTIONS;

    // Use availableQuestions if filtered pool has items, otherwise fallback to allQ
    let pool = availableQuestions.length > 0 ? availableQuestions : allQ;
    if (!pool || pool.length === 0) {
      pool = DEFAULT_TUG_QUESTIONS;
    }

    // Filter unasked questions first to ensure no repeats!
    let unaskedPool = pool.filter((q) => !askedQuestionIds.includes(q.id));
    if (unaskedPool.length === 0) {
      // Auto reset asked pool if exhausted!
      unaskedPool = [...pool];
      setAskedQuestionIds([]);
    }

    const shuffledPool = [...unaskedPool].sort(() => Math.random() - 0.5);
    const selectedQuestions: ActiveQuestionData[] = [];
    const targetCount = questionsPerMatch > 0 ? questionsPerMatch : Math.max(10, shuffledPool.length);

    const newlyAskedIds: string[] = [];

    for (let i = 0; i < targetCount; i++) {
      const rawQ = shuffledPool[i % shuffledPool.length];
      if (rawQ.id) newlyAskedIds.push(rawQ.id);

      const rawOpts = Array.isArray(rawQ.options) && rawQ.options.length > 0
        ? rawQ.options
        : ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'];

      const safeCorrectIdx =
        typeof rawQ.correctIndex === 'number' &&
        rawQ.correctIndex >= 0 &&
        rawQ.correctIndex < rawOpts.length
          ? rawQ.correctIndex
          : 0;

      let finalOpts = [...rawOpts];
      let newCorrectIdx = safeCorrectIdx;

      if (isAutoShuffleOptions) {
        const origText = rawOpts[safeCorrectIdx];
        finalOpts = [...rawOpts].sort(() => Math.random() - 0.5);
        newCorrectIdx = finalOpts.findIndex((opt) => opt === origText);
        if (newCorrectIdx < 0) newCorrectIdx = 0;
      }

      selectedQuestions.push({
        id: rawQ.id || uid('q'),
        question: rawQ.question || 'Câu hỏi trắc nghiệm',
        options: finalOpts,
        correctIndex: newCorrectIdx,
        explanation: rawQ.explanation || '',
        subject: rawQ.subject || 'Tổng hợp'
      });
    }

    setAskedQuestionIds((prev) => Array.from(new Set([...prev, ...newlyAskedIds])));

    setMatchQuestions(selectedQuestions);
    setRedQuestionIdx(0);
    setRedAnswerCount(0);
    setRedLastResult(null);

    setBlueQuestionIdx(0);
    setBlueAnswerCount(0);
    setBlueLastResult(null);

    setRedSelectedOption(null);
    setBlueSelectedOption(null);
    setSpeedAttemptedRed(false);
    setSpeedAttemptedBlue(false);
    setIsAdvancingSpeedQuestion(false);

    setRedScore(0);
    setBlueScore(0);
    setRopePosition(0);
    setMatchWinner(null);
    setCurrentTurn('red');
    setIsQuestionStarted(true);

    const timerVal = tugTimerSeconds > 0 ? tugTimerSeconds : 20;
    setTimeLeft(timerVal);
    setIsTimerRunning(tugTimerSeconds > 0);

    const formatDesc = playFormat === 'turns'
      ? 'Luân phiên lượt'
      : playFormat === 'speed'
      ? 'Chung câu hỏi tốc độ'
      : 'Song song độc lập';

    const qCountDesc = questionsPerMatch > 0 ? `${questionsPerMatch} câu` : 'Vô hạn';
    const noticeText = `🔥 Bắt đầu trận đấu ${qCountDesc} (${formatDesc})!`;

    setScoreNotice(noticeText);
    if (soundEnabled) playBeep(523, 0.2, 0.15);

    broadcastRoomState({
      isQuestionStarted: true,
      matchQuestions: selectedQuestions,
      redQuestionIdx: 0,
      blueQuestionIdx: 0,
      redAnswerCount: 0,
      blueAnswerCount: 0,
      redScore: 0,
      blueScore: 0,
      ropePosition: 0,
      matchWinner: null,
      currentTurn: 'red',
      redSelectedOption: null,
      blueSelectedOption: null,
      speedAttemptedRed: false,
      speedAttemptedBlue: false,
      scoreNotice: noticeText,
      tugTimerSeconds,
      timeLeft: timerVal,
      isTimerRunning: tugTimerSeconds > 0,
      questionsPerMatch,
      playFormat
    });
  };

  // Load Question on Index or Filter change
  useEffect(() => {
    if (availableQuestions.length > 0) {
      const q = availableQuestions[questionIndex % availableQuestions.length];
      setCurrentQuestion(q);
    } else {
      setCurrentQuestion(DEFAULT_TUG_QUESTIONS[0]);
    }
    setSelectedAnswerIndex(null);
    setIsAnswerRevealed(false);
    setTimeLeft(tugTimerSeconds);
    setIsTimerRunning(false);
  }, [availableQuestions, questionIndex, tugTimerSeconds]);

  // Countdown timer logic
  useEffect(() => {
    let timer: any = null;
    if (isTimerRunning && timeLeft > 0 && !isAnswerRevealed && !matchWinner) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (soundEnabled) playBeep(220, 0.4, 0.2);
            return 0;
          }
          if (prev <= 5 && soundEnabled) {
            playBeep(600, 0.1, 0.05);
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft, isAnswerRevealed, matchWinner, soundEnabled]);

  // Pull Rope Function
  const pullRope = (team: 'red' | 'blue', delta: number) => {
    if (matchWinner) return;

    setPullingTeamAnimation(team);
    setTimeout(() => setPullingTeamAnimation(null), 800);

    setRopePosition((prev) => {
      // Red is on the RIGHT (+), Blue is on the LEFT (-)
      const nextPos = team === 'red' ? prev + delta : prev - delta;
      
      // Check Winner Threshold (+80 for Red, -80 for Blue)
      if (nextPos >= 75) {
        setTimeout(() => triggerWinner('red'), 0);
        return 85;
      }
      if (nextPos <= -75) {
        setTimeout(() => triggerWinner('blue'), 0);
        return -85;
      }
      return nextPos;
    });
  };

  // Launch fireworks cannon sequence & celebration sound
  const launchFireworksSequence = (winnerTeam: 'red' | 'blue') => {
    if (soundEnabled) playCelebration();

    const colors = winnerTeam === 'red'
      ? ['#ef4444', '#f59e0b', '#dc2626', '#fbbf24', '#ffffff']
      : ['#0284c7', '#06b6d4', '#2563eb', '#fbbf24', '#ffffff'];

    // 1. Initial Grand Cannon Burst
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors
    });

    // 2. Continuous Fireworks Cannon Loop (5 seconds)
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }

      // Left Fireworks Cannon
      confetti({
        particleCount: 45,
        angle: 60,
        spread: 60,
        origin: { x: 0.05, y: 0.7 },
        colors
      });

      // Right Fireworks Cannon
      confetti({
        particleCount: 45,
        angle: 120,
        spread: 60,
        origin: { x: 0.95, y: 0.7 },
        colors
      });
    }, 650);
  };

  // Trigger Match Winner
  const triggerWinner = (winnerTeam: 'red' | 'blue') => {
    setMatchWinner(winnerTeam);
    setIsTimerRunning(false);

    if (winnerTeam === 'red') {
      setRedScore((s) => s + 1);
    } else {
      setBlueScore((s) => s + 1);
    }

    launchFireworksSequence(winnerTeam);

    // Record to history
    const winningStudent = winnerTeam === 'red' ? redPlayer : bluePlayer;
    const newHistory = {
      id: uid('tug'),
      classId: state.activeClassId,
      studentId: winningStudent?.id || uid('s'),
      studentName: `Đội ${winnerTeam === 'red' ? 'Đỏ 🔴' : 'Xanh 🔵'} (${winningStudent?.name || 'Toàn đội'})`,
      time: new Date().toISOString()
    };

    setTimeout(() => {
      onUpdateState((prev) => ({
        ...prev,
        filmHistory: [newHistory, ...prev.filmHistory]
      }));
    }, 0);
  };

  const checkMatchFinished = (rCount: number, bCount: number, rScore: number, bScore: number) => {
    const targetCount = questionsPerMatch > 0 ? questionsPerMatch : 999;
    if (rCount >= targetCount && bCount >= targetCount) {
      let winner: 'red' | 'blue' = 'red';
      if (rScore > bScore) {
        winner = 'red';
      } else if (bScore > rScore) {
        winner = 'blue';
      } else {
        winner = ropePosition >= 0 ? 'red' : 'blue';
      }
      setTimeout(() => {
        triggerWinner(winner);
      }, 400);
    }
  };

  // Handle Answers for Team Red
  const handleRedSelectAnswer = (optionIdx: number) => {
    if (deviceTeam === 'blue' || deviceTeam === 'view') {
      alert('🔒 Đây là máy Đội Xanh/Khán giả! Bạn không thể bấm chọn đáp án cho Đội Đỏ.');
      return;
    }
    const isSpeedMode = playFormat === 'speed' || isCameraGestureEnabled;
    const targetCount = questionsPerMatch > 0 ? questionsPerMatch : 999;
    if (matchWinner || redAnswerCount >= targetCount || matchQuestions.length === 0) return;
    if (playFormat === 'turns' && !isCameraGestureEnabled && currentTurn !== 'red') return;
    if (isSpeedMode && (speedAttemptedRed || isAdvancingSpeedQuestion)) return;

    const currentQ = matchQuestions[redQuestionIdx];
    if (!currentQ) return;

    const isCorrect = optionIdx === currentQ.correctIndex;
    let newRedScore = redScore;
    let newBlueScore = blueScore;

    if (isCorrect) {
      newRedScore = redScore + 1;
      setRedScore(newRedScore);
      setRedLastResult('correct');
      setRedSelectedOption({ idx: optionIdx, result: 'correct' });

      if (soundEnabled) playCelebration();
      const noticeText = `🔴 Đội Đỏ trả lời ĐÚNG! (+1đ, Kéo dây +${pullForceCorrect}px)`;
      setScoreNotice(noticeText);
      pullRope('red', pullForceCorrect);
      confetti({ particleCount: 30, spread: 45, origin: { x: 0.2, y: 0.7 } });

      const nextCount = redAnswerCount + 1;
      setRedAnswerCount(nextCount);

      if (isSpeedMode) {
        setBlueAnswerCount(nextCount);
        setIsAdvancingSpeedQuestion(true);
        broadcastRoomState({
          redScore: newRedScore,
          redAnswerCount: nextCount,
          blueAnswerCount: nextCount,
          redSelectedOption: { idx: optionIdx, result: 'correct' },
          scoreNotice: noticeText,
          ropePosition: Math.min(85, ropePosition + pullForceCorrect)
        });

        setTimeout(() => {
          setRedSelectedOption(null);
          setBlueSelectedOption(null);
          setSpeedAttemptedRed(false);
          setSpeedAttemptedBlue(false);
          setIsAdvancingSpeedQuestion(false);
          setRedQuestionIdx((prev) => prev + 1);
          setBlueQuestionIdx((prev) => prev + 1);

          broadcastRoomState({
            redSelectedOption: null,
            blueSelectedOption: null,
            speedAttemptedRed: false,
            speedAttemptedBlue: false,
            redQuestionIdx: redQuestionIdx + 1,
            blueQuestionIdx: blueQuestionIdx + 1
          });

          checkMatchFinished(nextCount, nextCount, newRedScore, newBlueScore);
        }, 1200);
      } else {
        broadcastRoomState({
          redScore: newRedScore,
          redAnswerCount: nextCount,
          redSelectedOption: { idx: optionIdx, result: 'correct' },
          scoreNotice: noticeText,
          ropePosition: Math.min(85, ropePosition + pullForceCorrect)
        });

        setTimeout(() => {
          setRedSelectedOption(null);
          const nextQIdx = nextCount < targetCount ? redQuestionIdx + 1 : redQuestionIdx;
          if (nextCount < targetCount) {
            setRedQuestionIdx((prev) => prev + 1);
          }
          if (playFormat === 'turns') {
            setCurrentTurn('blue');
          }

          broadcastRoomState({
            redSelectedOption: null,
            redQuestionIdx: nextQIdx,
            currentTurn: playFormat === 'turns' ? 'blue' : currentTurn
          });

          checkMatchFinished(nextCount, blueAnswerCount, newRedScore, newBlueScore);
        }, 1000);
      }
    } else {
      setRedLastResult('wrong');
      setRedSelectedOption({ idx: optionIdx, result: 'wrong' });
      if (soundEnabled) playBeep(200, 0.3, 0.15);

      const penaltyDelta = pullForcePenalty > 0 ? pullForcePenalty : 0;
      if (pullForcePenalty > 0) {
        pullRope('blue', pullForcePenalty);
      }

      if (isSpeedMode) {
        setSpeedAttemptedRed(true);
        let noticeText = `🔴 Đội Đỏ trả lời SAI (ô đỏ)! 🔵 Đội Xanh có quyền trả lời câu hỏi này!`;
        if (speedAttemptedBlue) {
          noticeText = `❌ Cả 2 đội đều trả lời SAI! Tự động chuyển câu tiếp theo...`;
        }
        setScoreNotice(noticeText);

        if (!speedAttemptedBlue) {
          broadcastRoomState({
            speedAttemptedRed: true,
            redSelectedOption: { idx: optionIdx, result: 'wrong' },
            scoreNotice: noticeText,
            ropePosition: Math.max(-85, ropePosition - penaltyDelta)
          });
        } else {
          setIsAdvancingSpeedQuestion(true);
          const nextCount = Math.max(redAnswerCount, blueAnswerCount) + 1;
          setRedAnswerCount(nextCount);
          setBlueAnswerCount(nextCount);

          broadcastRoomState({
            speedAttemptedRed: true,
            redSelectedOption: { idx: optionIdx, result: 'wrong' },
            scoreNotice: noticeText,
            redAnswerCount: nextCount,
            blueAnswerCount: nextCount,
            ropePosition: Math.max(-85, ropePosition - penaltyDelta)
          });

          setTimeout(() => {
            setRedSelectedOption(null);
            setBlueSelectedOption(null);
            setSpeedAttemptedRed(false);
            setSpeedAttemptedBlue(false);
            setIsAdvancingSpeedQuestion(false);
            setRedQuestionIdx((prev) => prev + 1);
            setBlueQuestionIdx((prev) => prev + 1);

            broadcastRoomState({
              redSelectedOption: null,
              blueSelectedOption: null,
              speedAttemptedRed: false,
              speedAttemptedBlue: false,
              redQuestionIdx: redQuestionIdx + 1,
              blueQuestionIdx: blueQuestionIdx + 1
            });

            checkMatchFinished(nextCount, nextCount, newRedScore, newBlueScore);
          }, 1400);
        }
      } else {
        const nextCount = redAnswerCount + 1;
        setRedAnswerCount(nextCount);
        const noticeText = `🔴 Đội Đỏ trả lời SAI!`;
        setScoreNotice(noticeText);

        broadcastRoomState({
          redAnswerCount: nextCount,
          redSelectedOption: { idx: optionIdx, result: 'wrong' },
          scoreNotice: noticeText,
          ropePosition: Math.max(-85, ropePosition - penaltyDelta)
        });

        setTimeout(() => {
          setRedSelectedOption(null);
          const nextQIdx = nextCount < targetCount ? redQuestionIdx + 1 : redQuestionIdx;
          if (nextCount < targetCount) {
            setRedQuestionIdx((prev) => prev + 1);
          }
          if (playFormat === 'turns') {
            setCurrentTurn('blue');
          }

          broadcastRoomState({
            redSelectedOption: null,
            redQuestionIdx: nextQIdx,
            currentTurn: playFormat === 'turns' ? 'blue' : currentTurn
          });

          checkMatchFinished(nextCount, blueAnswerCount, newRedScore, newBlueScore);
        }, 1000);
      }
    }
  };

  // Handle Answers for Team Blue
  const handleBlueSelectAnswer = (optionIdx: number) => {
    if (deviceTeam === 'red' || deviceTeam === 'view') {
      alert('🔒 Đây là máy Đội Đỏ/Khán giả! Bạn không thể bấm chọn đáp án cho Đội Xanh.');
      return;
    }
    const isSpeedMode = playFormat === 'speed' || isCameraGestureEnabled;
    const targetCount = questionsPerMatch > 0 ? questionsPerMatch : 999;
    if (matchWinner || blueAnswerCount >= targetCount || matchQuestions.length === 0) return;
    if (playFormat === 'turns' && !isCameraGestureEnabled && currentTurn !== 'blue') return;
    if (isSpeedMode && (speedAttemptedBlue || isAdvancingSpeedQuestion)) return;

    const currentQ = matchQuestions[blueQuestionIdx];
    if (!currentQ) return;

    const isCorrect = optionIdx === currentQ.correctIndex;
    let newRedScore = redScore;
    let newBlueScore = blueScore;

    if (isCorrect) {
      newBlueScore = blueScore + 1;
      setBlueScore(newBlueScore);
      setBlueLastResult('correct');
      setBlueSelectedOption({ idx: optionIdx, result: 'correct' });

      if (soundEnabled) playCelebration();
      const noticeText = `🔵 Đội Xanh trả lời ĐÚNG! (+1đ, Kéo dây +${pullForceCorrect}px)`;
      setScoreNotice(noticeText);
      pullRope('blue', pullForceCorrect);
      confetti({ particleCount: 30, spread: 45, origin: { x: 0.8, y: 0.7 } });

      const nextCount = blueAnswerCount + 1;
      setBlueAnswerCount(nextCount);

      if (isSpeedMode) {
        setRedAnswerCount(nextCount);
        setIsAdvancingSpeedQuestion(true);

        broadcastRoomState({
          blueScore: newBlueScore,
          blueAnswerCount: nextCount,
          redAnswerCount: nextCount,
          blueSelectedOption: { idx: optionIdx, result: 'correct' },
          scoreNotice: noticeText,
          ropePosition: Math.max(-85, ropePosition - pullForceCorrect)
        });

        setTimeout(() => {
          setRedSelectedOption(null);
          setBlueSelectedOption(null);
          setSpeedAttemptedRed(false);
          setSpeedAttemptedBlue(false);
          setIsAdvancingSpeedQuestion(false);
          setRedQuestionIdx((prev) => prev + 1);
          setBlueQuestionIdx((prev) => prev + 1);

          broadcastRoomState({
            redSelectedOption: null,
            blueSelectedOption: null,
            speedAttemptedRed: false,
            speedAttemptedBlue: false,
            redQuestionIdx: redQuestionIdx + 1,
            blueQuestionIdx: blueQuestionIdx + 1
          });

          checkMatchFinished(nextCount, nextCount, newRedScore, newBlueScore);
        }, 1200);
      } else {
        broadcastRoomState({
          blueScore: newBlueScore,
          blueAnswerCount: nextCount,
          blueSelectedOption: { idx: optionIdx, result: 'correct' },
          scoreNotice: noticeText,
          ropePosition: Math.max(-85, ropePosition - pullForceCorrect)
        });

        setTimeout(() => {
          setBlueSelectedOption(null);
          const nextQIdx = nextCount < targetCount ? blueQuestionIdx + 1 : blueQuestionIdx;
          if (nextCount < targetCount) {
            setBlueQuestionIdx((prev) => prev + 1);
          }
          if (playFormat === 'turns') {
            setCurrentTurn('red');
          }

          broadcastRoomState({
            blueSelectedOption: null,
            blueQuestionIdx: nextQIdx,
            currentTurn: playFormat === 'turns' ? 'red' : currentTurn
          });

          checkMatchFinished(redAnswerCount, nextCount, newRedScore, newBlueScore);
        }, 1000);
      }
    } else {
      setBlueLastResult('wrong');
      setBlueSelectedOption({ idx: optionIdx, result: 'wrong' });
      if (soundEnabled) playBeep(200, 0.3, 0.15);

      const penaltyDelta = pullForcePenalty > 0 ? pullForcePenalty : 0;
      if (pullForcePenalty > 0) {
        pullRope('red', pullForcePenalty);
      }

      if (isSpeedMode) {
        setSpeedAttemptedBlue(true);
        let noticeText = `🔵 Đội Xanh trả lời SAI (hiện ô đỏ)! 🔴 Đội Đỏ có quyền trả lời câu hỏi này!`;
        if (speedAttemptedRed) {
          noticeText = `❌ Cả 2 đội đều trả lời SAI câu hỏi này! Tự động chuyển câu tiếp theo...`;
        }
        setScoreNotice(noticeText);

        if (!speedAttemptedRed) {
          broadcastRoomState({
            speedAttemptedBlue: true,
            blueSelectedOption: { idx: optionIdx, result: 'wrong' },
            scoreNotice: noticeText,
            ropePosition: Math.min(85, ropePosition + penaltyDelta)
          });
        } else {
          setIsAdvancingSpeedQuestion(true);
          const nextCount = Math.max(redAnswerCount, blueAnswerCount) + 1;
          setRedAnswerCount(nextCount);
          setBlueAnswerCount(nextCount);

          broadcastRoomState({
            speedAttemptedBlue: true,
            blueSelectedOption: { idx: optionIdx, result: 'wrong' },
            scoreNotice: noticeText,
            redAnswerCount: nextCount,
            blueAnswerCount: nextCount,
            ropePosition: Math.min(85, ropePosition + penaltyDelta)
          });

          setTimeout(() => {
            setRedSelectedOption(null);
            setBlueSelectedOption(null);
            setSpeedAttemptedRed(false);
            setSpeedAttemptedBlue(false);
            setIsAdvancingSpeedQuestion(false);
            setRedQuestionIdx((prev) => prev + 1);
            setBlueQuestionIdx((prev) => prev + 1);

            broadcastRoomState({
              redSelectedOption: null,
              blueSelectedOption: null,
              speedAttemptedRed: false,
              speedAttemptedBlue: false,
              redQuestionIdx: redQuestionIdx + 1,
              blueQuestionIdx: blueQuestionIdx + 1
            });

            checkMatchFinished(nextCount, nextCount, newRedScore, newBlueScore);
          }, 1400);
        }
      } else {
        const nextCount = blueAnswerCount + 1;
        setBlueAnswerCount(nextCount);
        const noticeText = `🔵 Đội Xanh trả lời SAI!`;
        setScoreNotice(noticeText);

        broadcastRoomState({
          blueAnswerCount: nextCount,
          blueSelectedOption: { idx: optionIdx, result: 'wrong' },
          scoreNotice: noticeText,
          ropePosition: Math.min(85, ropePosition + penaltyDelta)
        });

        setTimeout(() => {
          setBlueSelectedOption(null);
          const nextQIdx = nextCount < targetCount ? blueQuestionIdx + 1 : blueQuestionIdx;
          if (nextCount < targetCount) {
            setBlueQuestionIdx((prev) => prev + 1);
          }
          if (playFormat === 'turns') {
            setCurrentTurn('red');
          }

          broadcastRoomState({
            blueSelectedOption: null,
            blueQuestionIdx: nextQIdx,
            currentTurn: playFormat === 'turns' ? 'red' : currentTurn
          });

          checkMatchFinished(redAnswerCount, nextCount, newRedScore, newBlueScore);
        }, 1000);
      }
    }
  };

  const handleAwardTeamPoint = (team: 'red' | 'blue') => {
    if (matchWinner) return;
    if (soundEnabled) playCelebration();

    if (team === 'red') {
      setRedScore((s) => s + 1);
      setScoreNotice('🔴 Đội Đỏ +1 điểm & Kéo dây +25px!');
      pullRope('red', 25);
    } else {
      setBlueScore((s) => s + 1);
      setScoreNotice('🔵 Đội Xanh +1 điểm & Kéo dây +25px!');
      pullRope('blue', 25);
    }

    confetti({
      particleCount: 35,
      spread: 45,
      origin: { y: 0.7 }
    });
  };

  // Next Question
  const handleNextQuestion = () => {
    setQuestionIndex((prev) => prev + 1);
    setRedAnswerIndex(null);
    setBlueAnswerIndex(null);
    setRedResult(null);
    setBlueResult(null);
    startRandomQuestion();
  };

  // Split Teams by Chosen Size (1v1, 2v2, 3v3, 4v4, 5v5, All)
  const splitTeamsBySize = (size: number) => {
    if (allStudents.length === 0) return;
    setTeamSize(size);
    let unplayed = allStudents.filter((s) => !playedStudentIds.includes(s.id));
    if (unplayed.length < Math.min(size * 2, allStudents.length)) {
      unplayed = [...allStudents];
      setPlayedStudentIds([]);
    }
    const shuffled = [...unplayed].sort(() => Math.random() - 0.5);
    const count = Math.min(size, Math.floor(shuffled.length / 2) || 1);
    const red = shuffled.slice(0, count);
    const blue = shuffled.slice(count, count + count);

    setTeamRed(red);
    setTeamBlue(blue);
    setRedPlayer(red[0] || null);
    setBluePlayer(blue[0] || null);

    const selectedIds = [...red.map((s) => s.id), ...blue.map((s) => s.id)];
    setPlayedStudentIds((prev) => Array.from(new Set([...prev, ...selectedIds])));
    if (soundEnabled) playBeep(659, 0.2, 0.1);
  };

  // Custom Toggle Student Team Membership
  const toggleStudentInTeam = (student: Student, targetTeam: 'red' | 'blue') => {
    if (targetTeam === 'red') {
      if (teamRed.some((s) => s.id === student.id)) {
        setTeamRed((prev) => prev.filter((s) => s.id !== student.id));
      } else {
        setTeamBlue((prev) => prev.filter((s) => s.id !== student.id));
        setTeamRed((prev) => [...prev, student]);
      }
    } else {
      if (teamBlue.some((s) => s.id === student.id)) {
        setTeamBlue((prev) => prev.filter((s) => s.id !== student.id));
      } else {
        setTeamRed((prev) => prev.filter((s) => s.id !== student.id));
        setTeamBlue((prev) => [...prev, student]);
      }
    }
  };

  // Randomize 2 Players
  const pickRandomPlayers = () => {
    if (teamRed.length > 0) {
      const r = teamRed[Math.floor(Math.random() * teamRed.length)];
      setRedPlayer(r);
    }
    if (teamBlue.length > 0) {
      const b = teamBlue[Math.floor(Math.random() * teamBlue.length)];
      setBluePlayer(b);
    }
    if (soundEnabled) playBeep(523, 0.15, 0.1);
  };

  // Auto Split Teams
  const autoSplitTeams = () => {
    if (allStudents.length === 0) return;
    const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
    const mid = Math.ceil(shuffled.length / 2);
    const red = shuffled.slice(0, mid);
    const blue = shuffled.slice(mid);
    setTeamRed(red);
    setTeamBlue(blue);
    setRedPlayer(red[0] || null);
    setBluePlayer(blue[0] || null);
    if (soundEnabled) playBeep(659, 0.2, 0.1);
  };

  // Complete Reset Match / Rope / Questions back to initial state
  const resetMatch = () => {
    setRopePosition(0);
    setRedScore(0);
    setBlueScore(0);
    setMatchWinner(null);
    setIsQuestionStarted(false);
    setActiveQuestion(null);
    setSelectedAnswerIndex(null);
    setIsAnswerRevealed(false);
    setTimeLeft(tugTimerSeconds);
    setIsTimerRunning(false);
    setAskedQuestionIds([]);
    const noticeText = '🔄 Đã đặt lại toàn bộ trận đấu Kéo co về trạng thái ban đầu!';
    setScoreNotice(noticeText);
    split5v5NoRepeat();
    if (soundEnabled) playBeep(440, 0.25, 0.15);

    broadcastRoomState({
      isQuestionStarted: false,
      ropePosition: 0,
      redScore: 0,
      blueScore: 0,
      matchWinner: null,
      redAnswerCount: 0,
      blueAnswerCount: 0,
      redQuestionIdx: 0,
      blueQuestionIdx: 0,
      redSelectedOption: null,
      blueSelectedOption: null,
      speedAttemptedRed: false,
      speedAttemptedBlue: false,
      scoreNotice: noticeText
    });
  };

  const resetScore = () => {
    setRedScore(0);
    setBlueScore(0);
    setScoreNotice('Đã đặt lại tỷ số về 0 - 0');
  };

  // Award Flowers to Winning Team / Student
  const handleAwardWinner = () => {
    if (!matchWinner) return;

    const winningTeam = matchWinner === 'red' ? teamRed : teamBlue;
    const targetStudentIds = winningTeam.map((s) => s.id);

    onUpdateState((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        targetStudentIds.includes(s.id) ? { ...s, coins: (s.coins || 0) + awardAmount } : s
      ),
      transactions: [
        {
          id: uid('tx'),
          classId: prev.activeClassId,
          studentId: matchWinner === 'red' ? (redPlayer?.id || 'team') : (bluePlayer?.id || 'team'),
          studentName: `Chiến thắng Kéo co (Đội ${matchWinner === 'red' ? 'Đỏ' : 'Xanh'})`,
          amount: awardAmount,
          reason: `Thưởng chiến thắng Trò chơi Kéo co (+${awardAmount} hoa/mỗi HS)`,
          subject: selectedSubject !== 'all' ? selectedSubject : 'Trò chơi Kéo co',
          time: new Date().toISOString()
        },
        ...prev.transactions
      ]
    }));

    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });

    alert(`🎉 Đã cộng +${awardAmount} bông hoa cho ${winningTeam.length} học sinh Đội ${matchWinner === 'red' ? 'Đỏ 🔴' : 'Xanh 🔵'}!`);
  };

  const clearHistory = () => {
    onUpdateState((prev) => ({
      ...prev,
      filmHistory: prev.filmHistory.filter((h) => h.classId !== prev.activeClassId)
    }));
  };

  const classHistory = state.filmHistory.filter((h) => h.classId === state.activeClassId);

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Top Banner & Control Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950/90 to-slate-900 rounded-2xl py-2 px-3 sm:px-4 text-white shadow-lg border border-slate-700/80">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* Title & Role Indicator */}
          <div className="flex items-center gap-2 text-center md:text-left flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Swords className="w-4 h-4 text-amber-300 stroke-[2.5]" />
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-100 flex items-center gap-1.5">
                <span>🚩 KÉO CO</span>
              </h2>
              {/* Role Badge */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                deviceTeam === 'teacher'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                  : deviceTeam === 'red'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-400/40'
                  : deviceTeam === 'blue'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400/40'
                  : 'bg-teal-500/20 text-teal-300 border-teal-400/40'
              }`}>
                {deviceTeam === 'teacher' && '👑 Giáo viên (Master)'}
                {deviceTeam === 'red' && `🔴 Đội Đỏ (Mã: ${redPin})`}
                {deviceTeam === 'blue' && `🔵 Đội Xanh (Mã: ${bluePin})`}
                {deviceTeam === 'view' && '📺 Khán giả (Chỉ xem)'}
              </span>

              {/* 3-Digit PIN Badges on Teacher Machine */}
              {deviceTeam === 'teacher' && (
                <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-700/80 rounded-xl px-2 py-0.5 text-[11px] font-bold">
                  <span className="text-rose-400">🔴 Mã: <strong className="font-mono text-white bg-rose-950 px-1 rounded border border-rose-600/50">{redPin}</strong></span>
                  <span className="text-slate-600">|</span>
                  <span className="text-sky-400">🔵 Mã: <strong className="font-mono text-white bg-sky-950 px-1 rounded border border-sky-600/50">{bluePin}</strong></span>
                  <button
                    onClick={handleGenerateNewPins}
                    className="p-1 text-slate-400 hover:text-amber-300 transition-all cursor-pointer"
                    title="🎲 Bấm để tự động tạo bộ mã 3 số mới cho cả lớp"
                  >
                    <Dice5 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-center">
            {deviceTeam === 'teacher' ? (
              <>
                <button
                  onClick={() => setIsShareModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer animate-pulse"
                  title="Sao chép 1 link chung và xem mã PIN 3 số cho học sinh"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>🔗 Chia sẻ 1 Link & Mã</span>
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Mở toàn màn hình Tivi"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'Thoát' : '🖥️ Tivi'}</span>
                </button>

                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 font-bold text-xs flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  title="Cấu hình thể thức, số câu hỏi, phạt kéo dây & phần thưởng"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>⚙️ Cấu hình</span>
                </button>

                <button
                  onClick={() => setIsCameraGestureEnabled(!isCameraGestureEnabled)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    isCameraGestureEnabled
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md animate-pulse ring-2 ring-amber-300/60'
                      : 'bg-white/10 text-slate-200 hover:bg-white/20'
                  }`}
                  title={isCameraGestureEnabled ? 'Đang bật Camera AI 2 đội (Bấm để tắt)' : 'Bật Camera AI nhận diện cử chỉ 2 đội'}
                >
                  {isCameraGestureEnabled ? <Camera className="w-3.5 h-3.5" /> : <CameraOff className="w-3.5 h-3.5 text-slate-400" />}
                  <span>📷 Camera AI</span>
                </button>

                <div className="h-4 w-px bg-slate-700/80 mx-0.5 hidden sm:block" />

                <button
                  onClick={() => setGameMode(gameMode === 'quiz' ? 'manual' : 'quiz')}
                  className={`px-2 py-1 rounded-lg font-bold text-xs flex items-center gap-1 transition-all cursor-pointer ${
                    gameMode === 'quiz'
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{gameMode === 'quiz' ? 'Trắc nghiệm' : 'Thủ công'}</span>
                </button>

                <button
                  onClick={() => setShowScoreboard(!showScoreboard)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                  title={showScoreboard ? 'Ẩn bảng tỷ số' : 'Hiện bảng tỷ số'}
                >
                  <span className="text-xs">{showScoreboard ? '👁️' : '🙈'}</span>
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                  title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                </button>

                <button
                  onClick={resetMatch}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                  title="Đặt lại vị trí dây kéo về mốc giữa"
                >
                  <RotateCcw className="w-3 h-3 text-sky-400" />
                  <span>Reset dây</span>
                </button>

                <button
                  onClick={resetScore}
                  className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer"
                  title="Đặt lại tỷ số về 0 - 0"
                >
                  <span>Xóa điểm</span>
                </button>
              </>
            ) : (
              /* Student or Viewer Quick Actions */
              <>
                <button
                  onClick={() => {
                    setInputPin('');
                    setPinError(null);
                    setPinSuccess(null);
                    setIsPinModalOpen(true);
                  }}
                  className="px-3 py-1 rounded-lg bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer animate-pulse"
                  title="Nhập mã số 3 chữ số để tham gia Đội Đỏ hoặc Đội Xanh"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{deviceTeam === 'view' ? '🔑 Nhập Mã 3 Số Vào Đội' : '🔑 Đổi Mã Đội'}</span>
                </button>

                {deviceTeam !== 'view' && (
                  <button
                    onClick={() => setDeviceTeam('view')}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                    title="Chuyển về chế độ khán giả chỉ xem"
                  >
                    <LogOut className="w-3 h-3 text-slate-400" />
                    <span>Rời đội</span>
                  </button>
                )}

                <button
                  onClick={toggleFullscreen}
                  className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs flex items-center gap-1 transition-all shadow-sm active:scale-95 cursor-pointer"
                  title="Mở toàn màn hình"
                >
                  {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isFullscreen ? 'Thoát' : '🖥️ Toàn màn hình'}</span>
                </button>

                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-all cursor-pointer"
                  title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Teacher Quick Quiz Selection & Filter Bar (Matching Attached Image) */}
      {deviceTeam === 'teacher' && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl py-2 px-3 text-xs flex flex-wrap items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
              <span>Bộ câu hỏi:</span>
            </span>

            {/* Khối lớp */}
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-purple-500/50 text-purple-200 font-bold text-xs focus:border-purple-400 focus:outline-hidden transition-all cursor-pointer"
            >
              <option value="all">🎓 Tất cả khối lớp</option>
              <option value="1">🎓 Khối 1</option>
              <option value="2">🎓 Khối 2</option>
              <option value="3">🎓 Khối 3</option>
              <option value="4">🎓 Khối 4</option>
              <option value="5">🎓 Khối 5</option>
            </select>

            {/* Môn học */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-teal-500/50 text-teal-200 font-bold text-xs focus:border-teal-400 focus:outline-hidden transition-all cursor-pointer"
            >
              <option value="all">📖 Tất cả môn học</option>
              {allSubjectsList.map((subj) => (
                <option key={subj} value={subj}>
                  📖 {subj}
                </option>
              ))}
            </select>

            {/* Thư mục */}
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              className="px-2.5 py-1 rounded-xl bg-slate-950 border border-amber-500/50 text-amber-200 font-bold text-xs focus:border-amber-400 focus:outline-hidden transition-all cursor-pointer max-w-[200px] truncate"
            >
              <option value="all">
                📁 Tất cả thư mục ({allQuizQuestionsCount} câu)
              </option>
              {questionFoldersList.map((f) => {
                const count = allQuizQuestionsList.filter((q) => q.folderId === f.id).length;
                return (
                  <option key={f.id} value={f.id}>
                    📁 {f.name} ({count} câu)
                  </option>
                );
              })}
              <option value="uncategorized">
                📁 Chưa phân loại
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Đảo đáp án Indicator */}
            <button
              type="button"
              onClick={() => setIsAutoShuffleOptions(!isAutoShuffleOptions)}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                isAutoShuffleOptions
                  ? 'bg-purple-950/80 text-purple-300 border-purple-400 shadow-xs'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Tự động đảo đáp án A, B, C, D"
            >
              <Shuffle className="w-3 h-3 text-purple-400" />
              <span>Đảo đáp án: {isAutoShuffleOptions ? 'ON' : 'OFF'}</span>
            </button>

            {/* Khả dụng / Chưa xuất hiện indicator */}
            <span className="px-2.5 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-extrabold text-[11px]">
              🟢 Còn {unaskedCount}/{totalAvailableCount} câu chưa xuất hiện
            </span>
          </div>
        </div>
      )}

      {/* Student/Viewer Interactive Guidance Banner */}
      {deviceTeam === 'view' && (
        <div className="bg-slate-900/90 border-2 border-teal-500/50 rounded-2xl py-2 px-3 sm:px-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-200 shadow-md">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <Eye className="w-4 h-4 text-teal-400 shrink-0 hidden sm:block" />
            <span>
              📺 <strong>Màn hình Khán giả (Chỉ xem):</strong> Xem diễn biến trận đấu trực tiếp mà không bấm được gì. Để máy này thi đấu, hãy bấm:
            </span>
          </div>
          <button
            onClick={() => {
              setInputPin('');
              setPinError(null);
              setPinSuccess(null);
              setIsPinModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer animate-pulse shrink-0"
          >
            <Key className="w-3.5 h-3.5" />
            <span>Nhập Mã 3 Số Vào Đội</span>
          </button>
        </div>
      )}

      {deviceTeam === 'red' && (
        <div className="bg-rose-950/80 border-2 border-rose-500/60 rounded-2xl py-2 px-3 sm:px-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-rose-100 shadow-md">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0 hidden sm:inline-block"></span>
            <span>
              🔴 <strong>Máy Đội Đỏ (Mã: {redPin}):</strong> Bạn được quyền bấm đáp án cho Đội Đỏ khi Giáo viên bắt đầu. Phía Đội Xanh và các nút điều khiển bị khóa.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setInputPin('');
                setPinError(null);
                setPinSuccess(null);
                setIsPinModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3 h-3" />
              <span>Đổi mã</span>
            </button>
            <button
              onClick={() => setDeviceTeam('view')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Rời đội</span>
            </button>
          </div>
        </div>
      )}

      {deviceTeam === 'blue' && (
        <div className="bg-sky-950/80 border-2 border-sky-500/60 rounded-2xl py-2 px-3 sm:px-4 text-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-sky-100 shadow-md">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-ping shrink-0 hidden sm:inline-block"></span>
            <span>
              🔵 <strong>Máy Đội Xanh (Mã: {bluePin}):</strong> Bạn được quyền bấm đáp án cho Đội Xanh khi Giáo viên bắt đầu. Phía Đội Đỏ và các nút điều khiển bị khóa.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setInputPin('');
                setPinError(null);
                setPinSuccess(null);
                setIsPinModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-800 hover:bg-sky-700 text-sky-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Key className="w-3 h-3" />
              <span>Đổi mã</span>
            </button>
            <button
              onClick={() => setDeviceTeam('view')}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <LogOut className="w-3 h-3" />
              <span>Rời đội</span>
            </button>
          </div>
        </div>
      )}

      {/* UNIFIED MATCH ARENA & QUIZ CARD */}
      <div
        ref={gameStageRef}
        className={`bg-slate-900 relative overflow-hidden text-white transition-all ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] bg-slate-950 p-4 sm:p-6 md:p-8 flex flex-col justify-between h-screen w-screen overflow-y-auto border-0 rounded-none space-y-4'
            : 'rounded-3xl p-3.5 sm:p-5 border-4 border-slate-800 shadow-2xl space-y-3'
        }`}
      >
        {/* Background Stadium Grid & Lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-90 pointer-events-none" />

        {/* 1. TOP HEADER & TIMER BAR (Ẩn khi đang mở Camera để tối ưu không gian màn hình Camera) */}
        {!isCameraGestureEnabled && (
          <div className={`relative z-10 flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-2 pb-1.5 sm:pb-2 border-b border-slate-700/60 ${isFullscreen ? 'px-1' : ''}`}>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Swords className={`text-amber-300 animate-bounce ${isFullscreen ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'}`} />
              <h3 className={`font-black uppercase text-amber-300 tracking-wide whitespace-nowrap ${isFullscreen ? 'text-sm sm:text-base md:text-lg' : 'text-xs sm:text-sm'}`}>
                TRÒ CHƠI KÉO CO HỌC TẬP
              </h3>
            </div>

            {/* Countdown Timer Badge & Fullscreen Exit Button (All in 1 Horizontal Row) */}
            <div className="flex flex-row items-center gap-1.5 sm:gap-2 flex-nowrap shrink-0">
              <button
                onClick={() => setIsConfigModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-teal-500/90 hover:bg-teal-400 text-slate-950 font-black text-xs shadow-md flex flex-row items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
                title="Cấu hình thể thức thi đấu"
              >
                <Settings className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">⚙️ Cấu hình</span>
              </button>

              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`px-3 py-1 rounded-xl font-black text-xs sm:text-sm border flex flex-row items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md active:scale-95 ${
                  isTimerRunning
                    ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse font-black'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
                title={isTimerRunning ? 'Bấm để dừng đếm ngược' : 'Bấm để chạy đồng hồ đếm ngược'}
              >
                <Timer className={`w-3.5 h-3.5 shrink-0 ${isTimerRunning ? 'text-slate-950 fill-current' : 'text-amber-400'}`} />
                <span className="whitespace-nowrap font-black">⏰ {timeLeft}s</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md flex flex-row items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 active:scale-95"
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 shrink-0" /> : <Maximize2 className="w-3.5 h-3.5 shrink-0" />}
                <span className="whitespace-nowrap">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. MAIN ARENA (Conditionally switches between Camera Gesture Dual Zone and Standard 3-Column Arena) */}
        {isCameraGestureEnabled ? (
          <CameraGestureDualZone
            isEnabled={isCameraGestureEnabled}
            isQuestionStarted={isQuestionStarted}
            playFormat={playFormat}
            currentTurn={currentTurn}
            matchWinner={matchWinner}
            onRedAnswer={handleRedSelectAnswer}
            onBlueAnswer={handleBlueSelectAnswer}
            redSelectedOption={redSelectedOption}
            blueSelectedOption={blueSelectedOption}
            currentRedQuestionIdx={redQuestionIdx}
            currentBlueQuestionIdx={blueQuestionIdx}
            holdDurationMs={cameraHoldDuration}
            onToggleCamera={() => setIsCameraGestureEnabled(false)}
            onStartMatch={startRandomQuestion}
            onToggleFullscreen={toggleFullscreen}
            onOpenConfig={() => setIsConfigModalOpen(true)}
            timeLeft={timeLeft}
            isTimerRunning={isTimerRunning}
            onToggleTimer={() => setIsTimerRunning(!isTimerRunning)}
            currentQuestion={matchQuestions[redQuestionIdx] || matchQuestions[0] || null}
            redScore={redScore}
            blueScore={blueScore}
            redAnswerCount={redAnswerCount}
            blueAnswerCount={blueAnswerCount}
            questionsPerMatch={questionsPerMatch}
            speedAttemptedRed={speedAttemptedRed}
            speedAttemptedBlue={speedAttemptedBlue}
            isAdvancingSpeedQuestion={isAdvancingSpeedQuestion}
            ropePosition={ropePosition}
            pullingTeamAnimation={pullingTeamAnimation}
            scoreNotice={scoreNotice}
            deviceTeam={deviceTeam}
            isFullscreen={isFullscreen}
          />
        ) : (
          <div className={`relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 items-stretch ${isFullscreen ? 'flex-1 pt-3' : 'pt-2'}`}>

          {/* ================= 🔵 LEFT COLUMN: ĐỘI XANH ================= */}
          <div className={`bg-gradient-to-b from-[#1e293b] to-[#0f172a] border-2 border-sky-500/60 rounded-3xl flex flex-col justify-between shadow-2xl space-y-4 ${
            isFullscreen ? 'p-5 sm:p-7 border-4' : 'p-3.5 sm:p-5'
          } lg:col-span-4`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-sky-500/30">
              <h3 className={`font-black text-sky-200 uppercase tracking-wider flex items-center gap-2 ${
                isFullscreen ? 'text-2xl sm:text-4xl' : 'text-lg sm:text-2xl'
              }`}>
                <span>🔵 Đội Xanh</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className={`font-black px-3 py-0.5 rounded-full bg-sky-600 text-white shadow-xs ${
                  isFullscreen ? 'text-sm sm:text-base' : 'text-xs'
                }`}>
                  {(questionsPerMatch > 0 && blueAnswerCount >= questionsPerMatch) ? '🎉 ĐÃ XONG' : `CÂU ${blueAnswerCount + 1}/${questionsPerMatch > 0 ? questionsPerMatch : '∞'}`}
                </span>
                <span className={`rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg ${
                  isFullscreen ? 'w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-4xl' : 'w-10 h-10 text-xl'
                }`}>
                  {blueScore}
                </span>
              </div>
            </div>

            {/* Turn Banner or Speed Mode Banner */}
            {playFormat === 'turns' && (
              <div className={`py-1 px-3 rounded-xl font-black text-center text-xs transition-all ${
                currentTurn === 'blue'
                  ? 'bg-sky-500 text-slate-950 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {currentTurn === 'blue' ? '👉 ĐẾN LƯỢT ĐỘI XANH TRẢ LỜI!' : '⏳ ĐANG LƯỢT ĐỘI ĐỎ...'}
              </div>
            )}

            {playFormat === 'speed' && (
              <div className={`py-1 px-3 rounded-xl font-black text-center text-xs transition-all ${
                speedAttemptedBlue
                  ? 'bg-rose-900/80 text-rose-200 border border-rose-500/50'
                  : 'bg-sky-500 text-slate-950 animate-pulse'
              }`}>
                {speedAttemptedBlue ? '❌ Đội Xanh đã trả lời sai câu này' : '⚡ BẤM NHANH TRẢ LỜI!'}
              </div>
            )}

            {/* Question Box & 2x2 Answer Grid */}
            {(questionsPerMatch <= 0 || blueAnswerCount < questionsPerMatch) && matchQuestions[blueQuestionIdx] ? (
              <div className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-6">
                <div className={`rounded-3xl bg-sky-950/90 border-2 border-sky-500/50 text-white flex flex-col justify-center shadow-lg ${
                  isFullscreen ? 'p-6 min-h-[140px] sm:min-h-[180px]' : 'p-4 min-h-[110px]'
                }`}>
                  <span className={`font-bold text-sky-300 block mb-1 ${
                    isFullscreen ? 'text-sm sm:text-base' : 'text-xs'
                  }`}>
                    ⚡ Câu {blueAnswerCount + 1}/{questionsPerMatch > 0 ? questionsPerMatch : '∞'}:
                  </span>
                  <h4 className={`font-black leading-snug ${
                    isFullscreen ? 'text-lg sm:text-2xl sm:leading-relaxed' : 'text-sm sm:text-base'
                  }`}>
                    {matchQuestions[blueQuestionIdx].question}
                  </h4>
                </div>

                {/* 2x2 Option Buttons */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {matchQuestions[blueQuestionIdx].options.map((opt, optionIdx) => {
                    const isSelected = blueSelectedOption?.idx === optionIdx;
                    const isCorrect = isSelected && blueSelectedOption?.result === 'correct';
                    const isWrong = isSelected && blueSelectedOption?.result === 'wrong';

                    return (
                      <button
                        key={optionIdx}
                        onClick={() => handleBlueSelectAnswer(optionIdx)}
                        disabled={
                          !!matchWinner ||
                          isAdvancingSpeedQuestion ||
                          (playFormat === 'turns' && currentTurn !== 'blue') ||
                          (playFormat === 'speed' && speedAttemptedBlue) ||
                          deviceTeam === 'red' ||
                          deviceTeam === 'view'
                        }
                        title={
                          deviceTeam === 'red'
                            ? '🔒 Đây là máy Đội Đỏ! Bạn không thể bấm chọn đáp án cho Đội Xanh.'
                            : deviceTeam === 'view'
                            ? '🔒 Màn hình khán giả chỉ dùng để xem.'
                            : 'Bấm chọn đáp án Đội Xanh'
                        }
                        className={`rounded-2xl font-black text-center shadow-xl border-2 transition-all flex items-center justify-center ${
                          deviceTeam === 'red' || deviceTeam === 'view'
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-300 text-slate-400'
                            : 'cursor-pointer active:scale-95'
                        } ${
                          isFullscreen
                            ? 'p-4 sm:p-6 text-base sm:text-xl min-h-[72px] sm:min-h-[90px]'
                            : 'p-3 text-xs sm:text-sm min-h-[52px]'
                        } ${
                          isCorrect
                            ? 'bg-emerald-500 border-4 border-emerald-300 text-white animate-pulse ring-4 ring-emerald-400/50 shadow-emerald-500/50'
                            : isWrong
                            ? 'bg-rose-600 border-4 border-rose-400 text-white animate-bounce shadow-rose-600/50'
                            : deviceTeam !== 'red' && deviceTeam !== 'view'
                            ? 'bg-white hover:bg-sky-50 text-slate-950 border-slate-200 hover:border-sky-500 disabled:opacity-50'
                            : ''
                        }`}
                      >
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-sky-200 space-y-2">
                <span className="text-5xl">🎉</span>
                <h4 className={`font-black text-sky-100 ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-base'}`}>
                  Đội Xanh đã hoàn thành {questionsPerMatch}/{questionsPerMatch} câu!
                </h4>
                <p className={`font-bold text-sky-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs'}`}>Đạt tổng {blueScore} câu đúng.</p>
              </div>
            )}
          </div>

          {/* ================= 🏆 CENTER COLUMN: SÂN KÉO CO (TUG OF WAR) ================= */}
          <div className={`bg-slate-900 border-2 border-slate-700 rounded-3xl flex flex-col justify-between shadow-2xl relative overflow-hidden ${
            isFullscreen ? 'p-5 border-4 min-h-[450px] sm:min-h-[520px]' : 'p-3 sm:p-4 min-h-[360px]'
          } lg:col-span-4`}>
            {/* Top Indicator */}
            <div className={`flex items-center justify-between font-black text-slate-300 pb-2 border-b border-slate-800 ${
              isFullscreen ? 'text-sm sm:text-base' : 'text-xs'
            }`}>
              <span className="text-sky-400">🔵 Đích Xanh (-80px)</span>
              <span className="text-emerald-400">⚖️ Vạch giữa</span>
              <span className="text-red-400">🔴 Đích Đỏ (+80px)</span>
            </div>

            {/* Vector Tug Stage */}
            {!isQuestionStarted || matchQuestions.length === 0 ? (
              deviceTeam === 'teacher' ? (
                <div className="py-12 text-center text-white space-y-4 my-auto">
                  <div className="w-20 h-20 mx-auto rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-bounce">
                    <Zap className="w-10 h-10 text-amber-300 fill-current" />
                  </div>
                  <h3 className={`font-black text-amber-200 uppercase ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-base'}`}>
                    TRẬN ĐẤU KÉO CO ({questionsPerMatch > 0 ? `${questionsPerMatch} CÂU` : 'VÔ HẠN'})
                  </h3>
                  <button
                    onClick={startRandomQuestion}
                    className={`rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer mx-auto flex items-center gap-2 ${
                      isFullscreen ? 'px-8 py-4 text-base sm:text-2xl' : 'px-6 py-3 text-sm'
                    }`}
                  >
                    <Play className="w-6 h-6 fill-current text-slate-950" />
                    <span>▶️ BẮT ĐẦU TRẬN ĐẤU</span>
                  </button>
                </div>
              ) : (
                <div className="py-10 text-center text-white space-y-3.5 my-auto px-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center animate-pulse">
                    <Lock className="w-8 h-8 text-amber-300" />
                  </div>
                  <h3 className={`font-black text-amber-200 uppercase ${isFullscreen ? 'text-lg sm:text-2xl' : 'text-base'}`}>
                    🔒 TRẬN ĐẤU CHƯA BẮT ĐẦU
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
                    Vui lòng chờ Thầy/Cô bấm <strong>"▶️ BẮT ĐẦU TRẬN ĐẤU"</strong> trên máy Giáo viên để mở khóa màn hình chơi...
                  </p>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-xs text-teal-300 font-bold animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Đã kết nối trực tiếp máy Giáo viên</span>
                  </div>
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col justify-between py-2 space-y-2">
                <TugOfWarCartoonStage
                  ropePosition={ropePosition}
                  pullingTeamAnimation={pullingTeamAnimation}
                  isFullscreen={isFullscreen}
                />

                {matchWinner && (
                  <div className={`rounded-2xl bg-amber-400 text-slate-950 font-black text-center animate-bounce shadow-2xl mt-2 ${
                    isFullscreen ? 'p-4 text-base sm:text-xl' : 'p-3 text-xs'
                  }`}>
                    🏆 {matchWinner === 'red' ? '🔴 ĐỘI ĐỎ CHIẾN THẮNG!' : '🔵 ĐỘI XANH CHIẾN THẮNG!'}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Match Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  if (deviceTeam !== 'teacher') {
                    alert('🔒 Chỉ máy Giáo viên mới có quyền Đặt lại dây!');
                    return;
                  }
                  resetMatch();
                }}
                disabled={deviceTeam !== 'teacher'}
                className={`rounded-xl font-bold flex items-center gap-1 transition-all ${
                  deviceTeam === 'teacher'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-50'
                } ${isFullscreen ? 'px-4 py-2 text-sm' : 'px-3 py-1.5 text-xs'}`}
                title={deviceTeam === 'teacher' ? 'Đặt lại dây' : '🔒 Chỉ máy Giáo viên mới có quyền đặt lại dây'}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Đặt lại dây</span>
              </button>

              <button
                onClick={() => {
                  if (deviceTeam !== 'teacher') {
                    alert('🔒 Chỉ máy Giáo viên mới có quyền bắt đầu Trận mới!');
                    return;
                  }
                  startRandomQuestion();
                }}
                disabled={deviceTeam !== 'teacher'}
                className={`rounded-xl font-black flex items-center gap-1 shadow-md transition-all ${
                  deviceTeam === 'teacher'
                    ? 'bg-teal-600 hover:bg-teal-500 text-white cursor-pointer'
                    : 'bg-slate-800/50 text-slate-500 cursor-not-allowed opacity-50'
                } ${isFullscreen ? 'px-5 py-2 text-sm sm:text-base' : 'px-3.5 py-1.5 text-xs'}`}
                title={deviceTeam === 'teacher' ? 'Trận mới' : '🔒 Chỉ máy Giáo viên mới có quyền bấm Trận mới'}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Trận mới</span>
              </button>
            </div>
          </div>

          {/* ================= 🔴 RIGHT COLUMN: ĐỘI ĐỎ ================= */}
          <div className={`bg-gradient-to-b from-[#450a0a] to-[#180505] border-2 border-red-500/60 rounded-3xl flex flex-col justify-between shadow-2xl space-y-4 ${
            isFullscreen ? 'p-5 sm:p-7 border-4' : 'p-3.5 sm:p-5'
          } lg:col-span-4`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-red-500/30">
              <h3 className={`font-black text-red-200 uppercase tracking-wider flex items-center gap-2 ${
                isFullscreen ? 'text-2xl sm:text-4xl' : 'text-lg sm:text-2xl'
              }`}>
                <span>🔴 Đội Đỏ</span>
              </h3>

              <div className="flex items-center gap-2">
                <span className={`font-black px-3 py-0.5 rounded-full bg-red-600 text-white shadow-xs ${
                  isFullscreen ? 'text-sm sm:text-base' : 'text-xs'
                }`}>
                  {(questionsPerMatch > 0 && redAnswerCount >= questionsPerMatch) ? '🎉 ĐÃ XONG' : `CÂU ${redAnswerCount + 1}/${questionsPerMatch > 0 ? questionsPerMatch : '∞'}`}
                </span>
                <span className={`rounded-2xl bg-amber-400 text-slate-950 font-black flex items-center justify-center shadow-lg ${
                  isFullscreen ? 'w-14 h-14 sm:w-16 sm:h-16 text-2xl sm:text-4xl' : 'w-10 h-10 text-xl'
                }`}>
                  {redScore}
                </span>
              </div>
            </div>

            {/* Turn Banner or Speed Mode Banner */}
            {playFormat === 'turns' && (
              <div className={`py-1 px-3 rounded-xl font-black text-center text-xs transition-all ${
                currentTurn === 'red'
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {currentTurn === 'red' ? '👉 ĐẾN LƯỢT ĐỘI ĐỎ TRẢ LỜI!' : '⏳ ĐANG LƯỢT ĐỘI XANH...'}
              </div>
            )}

            {playFormat === 'speed' && (
              <div className={`py-1 px-3 rounded-xl font-black text-center text-xs transition-all ${
                speedAttemptedRed
                  ? 'bg-rose-900/80 text-rose-200 border border-rose-500/50'
                  : 'bg-rose-500 text-white animate-pulse'
              }`}>
                {speedAttemptedRed ? '❌ Đội Đỏ đã trả lời sai câu này' : '⚡ BẤM NHANH TRẢ LỜI!'}
              </div>
            )}

            {/* Question Box & 2x2 Answer Grid */}
            {(questionsPerMatch <= 0 || redAnswerCount < questionsPerMatch) && matchQuestions[redQuestionIdx] ? (
              <div className="flex-1 flex flex-col justify-between space-y-4 sm:space-y-6">
                <div className={`rounded-3xl bg-red-950/90 border-2 border-red-500/50 text-white flex flex-col justify-center shadow-lg ${
                  isFullscreen ? 'p-6 min-h-[140px] sm:min-h-[180px]' : 'p-4 min-h-[110px]'
                }`}>
                  <span className={`font-bold text-red-300 block mb-1 ${
                    isFullscreen ? 'text-sm sm:text-base' : 'text-xs'
                  }`}>
                    ⚡ Câu {redAnswerCount + 1}/{questionsPerMatch > 0 ? questionsPerMatch : '∞'}:
                  </span>
                  <h4 className={`font-black leading-snug ${
                    isFullscreen ? 'text-lg sm:text-2xl sm:leading-relaxed' : 'text-sm sm:text-base'
                  }`}>
                    {matchQuestions[redQuestionIdx].question}
                  </h4>
                </div>

                {/* 2x2 Option Buttons */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {matchQuestions[redQuestionIdx].options.map((opt, optionIdx) => {
                    const isSelected = redSelectedOption?.idx === optionIdx;
                    const isCorrect = isSelected && redSelectedOption?.result === 'correct';
                    const isWrong = isSelected && redSelectedOption?.result === 'wrong';

                    return (
                      <button
                        key={optionIdx}
                        onClick={() => handleRedSelectAnswer(optionIdx)}
                        disabled={
                          !!matchWinner ||
                          isAdvancingSpeedQuestion ||
                          (playFormat === 'turns' && currentTurn !== 'red') ||
                          (playFormat === 'speed' && speedAttemptedRed) ||
                          deviceTeam === 'blue' ||
                          deviceTeam === 'view'
                        }
                        title={
                          deviceTeam === 'blue'
                            ? '🔒 Đây là máy Đội Xanh! Bạn không thể bấm chọn đáp án cho Đội Đỏ.'
                            : deviceTeam === 'view'
                            ? '🔒 Màn hình khán giả chỉ dùng để xem.'
                            : 'Bấm chọn đáp án Đội Đỏ'
                        }
                        className={`rounded-2xl font-black text-center shadow-xl border-2 transition-all flex items-center justify-center ${
                          deviceTeam === 'blue' || deviceTeam === 'view'
                            ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-300 text-slate-400'
                            : 'cursor-pointer active:scale-95'
                        } ${
                          isFullscreen
                            ? 'p-4 sm:p-6 text-base sm:text-xl min-h-[72px] sm:min-h-[90px]'
                            : 'p-3 text-xs sm:text-sm min-h-[52px]'
                        } ${
                          isCorrect
                            ? 'bg-emerald-500 border-4 border-emerald-300 text-white animate-pulse ring-4 ring-emerald-400/50 shadow-emerald-500/50'
                            : isWrong
                            ? 'bg-rose-600 border-4 border-rose-400 text-white animate-bounce shadow-rose-600/50'
                            : deviceTeam !== 'blue' && deviceTeam !== 'view'
                            ? 'bg-white hover:bg-rose-50 text-slate-950 border-slate-200 hover:border-red-500 disabled:opacity-50'
                            : ''
                        }`}
                      >
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-red-200 space-y-2">
                <span className="text-5xl">🎉</span>
                <h4 className={`font-black text-red-100 ${isFullscreen ? 'text-xl sm:text-3xl' : 'text-base'}`}>
                  Đội Đỏ đã hoàn thành {questionsPerMatch}/{questionsPerMatch} câu!
                </h4>
                <p className={`font-bold text-red-300 ${isFullscreen ? 'text-base sm:text-xl' : 'text-xs'}`}>Đạt tổng {redScore} câu đúng.</p>
              </div>
            )}
          </div>

        </div>
      )}
      </div>

      {/* GAME CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-teal-500/60 rounded-3xl w-full max-w-2xl text-white p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-teal-300 uppercase tracking-wide">
                    ⚙️ Cấu Hình Thể Thức Trận Đấu
                  </h3>
                  <p className="text-xs text-slate-400">Tùy chỉnh số câu hỏi, hình thức thi đấu và quy tắc kéo co</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Config Options */}
            <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
              {/* Option 1: Play Format */}
              <div className="space-y-2">
                <label className="text-xs font-black text-teal-400 uppercase tracking-wider block">
                  🎮 1. Hình thức thi đấu (Chế độ chơi)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() => setPlayFormat('simultaneous')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      playFormat === 'simultaneous'
                        ? 'bg-teal-950/80 border-teal-400 text-white ring-2 ring-teal-500/30'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-teal-200">⚡ Song song</span>
                      {playFormat === 'simultaneous' && <Check className="w-4 h-4 text-teal-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">2 đội có bộ câu hỏi riêng, thi đấu độc lập cực sôi động.</p>
                  </button>

                  <button
                    onClick={() => setPlayFormat('turns')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      playFormat === 'turns'
                        ? 'bg-amber-950/80 border-amber-400 text-white ring-2 ring-amber-500/30'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-amber-200">🔄 Luân phiên</span>
                      {playFormat === 'turns' && <Check className="w-4 h-4 text-amber-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">Đội Đỏ và Đội Xanh lần lượt thay phiên nhau trả lời.</p>
                  </button>

                  <button
                    onClick={() => setPlayFormat('speed')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      playFormat === 'speed'
                        ? 'bg-sky-950/80 border-sky-400 text-white ring-2 ring-sky-500/30'
                        : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-extrabold text-sm text-sky-200">🎯 Chung câu hỏi</span>
                      {playFormat === 'speed' && <Check className="w-4 h-4 text-sky-400" />}
                    </div>
                    <p className="text-[11px] text-slate-400">Dùng chung 1 câu hỏi, đội nào trả lời đúng trước được kéo dây.</p>
                  </button>
                </div>
              </div>

              {/* Option 2: Number of Questions */}
              <div className="space-y-2">
                <label className="text-xs font-black text-teal-400 uppercase tracking-wider block">
                  🔢 2. Số câu hỏi mỗi trận đấu
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { count: 3, label: '3 câu (Siêu tốc)' },
                    { count: 5, label: '5 câu (Chuẩn)' },
                    { count: 10, label: '10 câu (Trận dài)' },
                    { count: -1, label: 'Vô hạn (Tới ngã)' }
                  ].map((item) => (
                    <button
                      key={item.count}
                      onClick={() => setQuestionsPerMatch(item.count)}
                      className={`p-3 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer flex items-center justify-between ${
                        questionsPerMatch === item.count
                          ? 'bg-teal-600 border-teal-300 text-white shadow-lg'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      {questionsPerMatch === item.count && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 3: Timer per Question & Custom Timer Input */}
              <div className="space-y-2.5 p-4 rounded-2xl bg-slate-800/80 border border-slate-700">
                <label className="text-xs font-black text-teal-400 uppercase tracking-wider block">
                  ⏱️ 3. Thời gian suy nghĩ mỗi câu (Giây)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { sec: 10, label: '10 giây' },
                    { sec: 15, label: '15 giây' },
                    { sec: 20, label: '20s (Chuẩn)' },
                    { sec: 30, label: '30 giây' },
                    { sec: 60, label: '60s (Mở rộng)' }
                  ].map((item) => (
                    <button
                      key={item.sec}
                      type="button"
                      onClick={() => {
                        setTugTimerSeconds(item.sec);
                        setTimeLeft(item.sec);
                      }}
                      className={`p-2 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer text-center ${
                        tugTimerSeconds === item.sec
                          ? 'bg-amber-500 border-amber-200 text-slate-950 shadow-md font-black'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* Custom Timer Input Field (Matching Attached Screenshot) */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/80 text-xs">
                  <span className="font-extrabold text-slate-200 flex items-center gap-1">
                    Tự chỉnh:
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      max={300}
                      value={tugTimerSeconds}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        const val = isNaN(parsed) ? 0 : Math.max(0, Math.min(300, parsed));
                        setTugTimerSeconds(val);
                        setTimeLeft(val);
                      }}
                      className="w-24 pl-3 pr-9 py-1.5 rounded-xl bg-slate-900 border-2 border-teal-400/80 text-amber-300 font-black text-sm text-center focus:border-amber-400 focus:outline-hidden transition-all shadow-inner"
                      placeholder="60"
                    />
                    <span className="absolute right-3 text-xs font-bold text-slate-400 pointer-events-none">
                      giây
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 italic">
                    (Nhập 0s = Tắt đếm ngược. Mặc định: 20s - 60s)
                  </span>
                </div>
              </div>

              {/* Option 4: Quiz Category, Grade, Subject & Folder Filters (Matching Attached Image) */}
              <div className="space-y-3.5 p-4 rounded-2xl bg-teal-950/40 border-2 border-teal-500/50 shadow-md">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-teal-500/30">
                  <span className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-teal-400" />
                    <span>4. Khối lớp, Môn học & Thư mục câu hỏi</span>
                  </span>
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40">
                    Tổng {totalAvailableCount} câu khả dụng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Khối lớp xuất hiện */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-purple-400" />
                      <span>Khối lớp xuất hiện:</span>
                    </label>
                    <select
                      value={selectedGrade}
                      onChange={(e) => setSelectedGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-purple-500/50 text-white font-bold text-xs focus:border-purple-400 focus:outline-hidden transition-all cursor-pointer shadow-md"
                    >
                      <option value="all">Tất cả khối lớp</option>
                      <option value="1">Khối 1</option>
                      <option value="2">Khối 2</option>
                      <option value="3">Khối 3</option>
                      <option value="4">Khối 4</option>
                      <option value="5">Khối 5</option>
                    </select>
                  </div>

                  {/* Môn học xuất hiện */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-teal-400" />
                      <span>Môn học xuất hiện:</span>
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-teal-500/50 text-white font-bold text-xs focus:border-teal-400 focus:outline-hidden transition-all cursor-pointer shadow-md"
                    >
                      <option value="all">Tất cả môn học</option>
                      {allSubjectsList.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Thư mục câu hỏi */}
                  <div className="space-y-1 col-span-1 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Folder className="w-4 h-4 text-amber-400" />
                      <span>Thư mục câu hỏi:</span>
                    </label>
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border-2 border-amber-500/50 text-white font-bold text-xs focus:border-amber-400 focus:outline-hidden transition-all cursor-pointer shadow-md"
                    >
                      <option value="all">
                        📁 Tất cả thư mục ({allQuizQuestionsCount} câu)
                      </option>
                      {questionFoldersList.map((f) => {
                        const count = allQuizQuestionsList.filter((q) => q.folderId === f.id).length;
                        return (
                          <option key={f.id} value={f.id}>
                            📁 {f.name} ({count} câu)
                          </option>
                        );
                      })}
                      <option value="uncategorized">
                        📁 Chưa phân loại ({allQuizQuestionsList.filter((q) => !q.folderId).length} câu)
                      </option>
                    </select>
                  </div>
                </div>

                {/* Option 5: Tự động đảo đáp án (Matching Attached Screenshot Purple Card) */}
                <div className="p-3.5 rounded-2xl bg-purple-950/60 border-2 border-purple-400/60 shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-2xl bg-purple-600 text-white shadow-md shrink-0 mt-0.5">
                        <Shuffle className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-sm text-white">
                            Tự động đảo đáp án
                          </h5>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                              isAutoShuffleOptions
                                ? 'bg-purple-500/30 text-purple-200 border-purple-400 animate-pulse'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {isAutoShuffleOptions ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-200/80 leading-relaxed font-bold">
                          Đổi ngẫu nhiên vị trí A, B, C, D. Đảm bảo các câu không bị trùng chữ cái đáp án đúng.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={isAutoShuffleOptions}
                        onChange={(e) => setIsAutoShuffleOptions(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                {/* Option 6: Đảm bảo không trùng câu (Matching Attached Screenshot Light Green Card) */}
                <div className="p-3.5 rounded-2xl bg-emerald-950/60 border-2 border-emerald-400/70 shadow-md space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                      <h5 className="font-extrabold text-sm text-emerald-200">
                        Đảm bảo không trùng câu:
                      </h5>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setAskedQuestionIds([]);
                        if (soundEnabled) playBeep(523, 0.15, 0.1);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-100 border border-emerald-500/50 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                      title="Đặt lại danh sách câu hỏi đã hỏi để bắt đầu lượt mới"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Đặt lại kho câu</span>
                    </button>
                  </div>

                  <div className="text-xs font-extrabold text-emerald-100 flex items-center gap-1.5">
                    <span>
                      Còn <strong className="text-amber-300 text-sm">{unaskedCount}/{totalAvailableCount}</strong> câu chưa xuất hiện
                    </span>
                    {unaskedCount === 0 && totalAvailableCount > 0 && (
                      <span className="text-[11px] text-amber-300 italic font-bold">
                        (Đã xuất hiện hết! Trận tiếp theo sẽ tự động đặt lại kho)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Option 4: Pull Force on Correct */}
              <div className="space-y-2">
                <label className="text-xs font-black text-teal-400 uppercase tracking-wider block">
                  💪 4. Lực kéo khi trả lời ĐÚNG
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { force: 15, label: 'Nhẹ (+15px)' },
                    { force: 25, label: 'Chuẩn (+25px)' },
                    { force: 35, label: 'Mạnh (+35px)' }
                  ].map((item) => (
                    <button
                      key={item.force}
                      onClick={() => setPullForceCorrect(item.force)}
                      className={`p-2.5 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer text-center ${
                        pullForceCorrect === item.force
                          ? 'bg-emerald-600 border-emerald-300 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 5: Penalty Force on Wrong */}
              <div className="space-y-2">
                <label className="text-xs font-black text-teal-400 uppercase tracking-wider block">
                  🚫 5. Mức phạt kéo dây cho đối phương khi trả lời SAI
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { force: 0, label: 'Không phạt (0px)' },
                    { force: 10, label: 'Nhẹ (+10px)' },
                    { force: 15, label: 'Chuẩn (+15px)' },
                    { force: 25, label: 'Nặng (+25px)' }
                  ].map((item) => (
                    <button
                      key={item.force}
                      onClick={() => setPullForcePenalty(item.force)}
                      className={`p-2.5 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer text-center ${
                        pullForcePenalty === item.force
                          ? 'bg-rose-600 border-rose-300 text-white shadow-md'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 6: Winner Flower Award */}
              <div className="space-y-2">
                <label className="text-xs font-black text-teal-400 uppercase tracking-wider block">
                  🌺 6. Phần thưởng Bông hoa thi đua cho Đội Thắng
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 5, 10].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setAwardAmount(amt)}
                      className={`p-2.5 rounded-2xl border-2 font-bold text-xs transition-all cursor-pointer text-center ${
                        awardAmount === amt
                          ? 'bg-amber-400 border-amber-200 text-slate-950 shadow-md font-black'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      +{amt} 🌺 / em
                    </button>
                  ))}
                </div>
              </div>

              {/* Option 7: Camera AI Hand Gesture Recognition */}
              <div className="space-y-3 p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-400/50 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-amber-300 uppercase tracking-wider block">
                        📷 7. Chế độ thi đấu bằng Camera AI (Cử chỉ ngón tay)
                      </label>
                      <p className="text-[11px] text-slate-300">
                        Camera tự động phân chia 2 khung hình: Bên Trái = 🔵 Đội Xanh, Bên Phải = 🔴 Đội Đỏ
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => setIsCameraGestureEnabled(!isCameraGestureEnabled)}
                    className={`relative inline-flex h-7 w-14 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                      isCameraGestureEnabled ? 'bg-amber-400 ring-2 ring-amber-300/60' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-slate-950 font-black text-[9px] flex items-center justify-center transition-transform ${
                        isCameraGestureEnabled ? 'translate-x-8 text-amber-300' : 'translate-x-1 text-slate-400'
                      }`}
                    >
                      {isCameraGestureEnabled ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>

                {/* Gestures Reference Map */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { fingers: '👆 1 ngón', opt: 'Đáp án A' },
                    { fingers: '✌️ 2 ngón', opt: 'Đáp án B' },
                    { fingers: '🤟 3 ngón', opt: 'Đáp án C' },
                    { fingers: '🖖 4 ngón', opt: 'Đáp án D' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-2 rounded-xl bg-slate-900/90 border border-amber-400/30 text-center space-y-0.5">
                      <span className="font-black text-xs text-amber-300 block">{item.fingers}</span>
                      <span className="text-[10px] font-bold text-slate-300">{item.opt}</span>
                    </div>
                  ))}
                </div>

                {/* Hold Duration Selector */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20 text-xs">
                  <span className="text-slate-300 font-bold">⏱️ Tốc độ giữ xác nhận:</span>
                  <div className="flex items-center gap-1.5">
                    {[
                      { ms: 500, label: '0.5s (Nhanh)' },
                      { ms: 800, label: '0.8s (Chuẩn)' },
                      { ms: 1200, label: '1.2s (Chắc)' }
                    ].map((item) => (
                      <button
                        key={item.ms}
                        type="button"
                        onClick={() => setCameraHoldDuration(item.ms)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          cameraHoldDuration === item.ms
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
              <button
                onClick={() => setIsConfigModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setIsConfigModalOpen(false);
                  startRandomQuestion();
                }}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Áp dụng & Bắt đầu trận mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MULTI-DEVICE SHARE LINKS MODAL (1 UNIVERSAL LINK + 2 PIN CODES) */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-teal-500/60 rounded-3xl w-full max-w-xl text-white p-5 sm:p-7 space-y-5 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/40">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-teal-300 uppercase tracking-wide flex items-center gap-2">
                    <span>🔗 CHIA SẺ 1 LINK CHUNG & MÃ PIN 3 SỐ</span>
                  </h3>
                  <p className="text-xs text-slate-400">1 link chung cho cả lớp — Nhập đúng mã 3 số để mở quyền chơi</p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {copySuccessMsg && (
              <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 font-extrabold text-xs text-center animate-pulse shadow-md">
                {copySuccessMsg}
              </div>
            )}

            {/* Section 1: 1 Universal Link */}
            <div className="p-4 rounded-2xl bg-slate-800/90 border-2 border-teal-500/50 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-teal-400" />
                  <span>1. ĐƯỜNG LINK CHUNG DUY NHẤT CHO CẢ LỚP</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/40">
                  Mặc định: Chỉ xem
                </span>
              </div>
              
              <div className="p-2.5 bg-slate-950/90 rounded-xl border border-slate-700 text-xs font-mono text-slate-300 break-all select-all flex items-center justify-between gap-2">
                <span className="truncate">{typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}?page=film&classId=${state.activeClassId || 'default'}` : ''}</span>
              </div>

              <button
                onClick={copyUniversalLink}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 hover:from-teal-300 hover:to-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>📋 SAO CHÉP 1 LINK CHUNG GỬI CẢ LỚP</span>
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed italic">
                * Học sinh mở link này sẽ xem trực tiếp trận đấu. Chỉ máy nào nhập đúng mã 3 số mới được mở quyền bấm đáp án!
              </p>
            </div>

            {/* Section 2: 3-Digit PIN Codes */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  <span>2. MÃ 3 CHỮ SỐ MỞ KHÓA CHO 2 ĐỘI</span>
                </span>
                <button
                  onClick={handleGenerateNewPins}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Tự động tạo bộ 2 mã số 3 chữ số mới"
                >
                  <Dice5 className="w-3.5 h-3.5" />
                  <span>🎲 Đổi mã mới</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Red Team PIN Card */}
                <div className="p-4 rounded-2xl bg-rose-950/60 border-2 border-rose-500/60 flex flex-col justify-between items-center text-center space-y-2 shadow-lg">
                  <div className="flex items-center gap-1.5 text-xs font-black text-rose-200">
                    <span>🔴 MÃ ĐỘI ĐỎ</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-white bg-rose-900/90 px-5 py-2 rounded-2xl border-2 border-rose-400 shadow-inner">
                    {redPin}
                  </div>
                  <button
                    onClick={() => copyPinCode('red')}
                    className="w-full py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép mã Đỏ</span>
                  </button>
                </div>

                {/* Blue Team PIN Card */}
                <div className="p-4 rounded-2xl bg-sky-950/60 border-2 border-sky-500/60 flex flex-col justify-between items-center text-center space-y-2 shadow-lg">
                  <div className="flex items-center gap-1.5 text-xs font-black text-sky-200">
                    <span>🔵 MÃ ĐỘI XANH</span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-white bg-sky-900/90 px-5 py-2 rounded-2xl border-2 border-sky-400 shadow-inner">
                    {bluePin}
                  </div>
                  <button
                    onClick={() => copyPinCode('blue')}
                    className="w-full py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép mã Xanh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Section 3: Simple Instructions */}
            <div className="p-3.5 rounded-2xl bg-teal-950/60 border border-teal-500/30 text-teal-200 text-xs space-y-1.5">
              <div className="font-extrabold flex items-center gap-1.5 text-teal-300">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>Quy trình điều khiển của Giáo viên:</span>
              </div>
              <p className="text-[11px] text-teal-100/90 leading-relaxed">
                1. Gửi 1 đường link chung duy nhất cho tất cả các máy học sinh / máy chiếu.
                <br />
                2. Đọc mã <strong>[ {redPin} ]</strong> cho máy Đội Đỏ, mã <strong>[ {bluePin} ]</strong> cho máy Đội Xanh.
                <br />
                3. Học sinh bấm nút <strong>"🔑 Nhập mã 3 số"</strong> trên màn hình để vào đội.
                <br />
                4. Thầy/Cô bấm <strong>"▶️ BẮT ĐẦU TRẬN ĐẤU"</strong> trên máy Giáo viên để mở khóa câu hỏi thi đấu!
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-700">
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="px-5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT PIN ENTRY MODAL */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[10001] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl w-full max-w-md text-white p-5 sm:p-7 space-y-5 shadow-2xl relative my-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-400/20 text-amber-300 border border-amber-400/40">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-amber-300 uppercase tracking-wide">
                    🔑 NHẬP MÃ 3 CHỮ SỐ
                  </h3>
                  <p className="text-xs text-slate-400">Nhập mã do Thầy/Cô cung cấp để vào Đội thi đấu</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinError(null);
                  setPinSuccess(null);
                }}
                className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Feedback Alerts */}
            {pinError && (
              <div className="p-3 rounded-2xl bg-rose-950/90 border border-rose-500 text-rose-200 font-extrabold text-xs text-center animate-bounce shadow-md">
                {pinError}
              </div>
            )}
            {pinSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-extrabold text-xs text-center animate-pulse shadow-md">
                {pinSuccess}
              </div>
            )}

            {/* 3-Digit Display Boxes */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 py-2">
              {[0, 1, 2].map((idx) => {
                const digit = inputPin[idx];
                const isActive = inputPin.length === idx;
                return (
                  <div
                    key={idx}
                    className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-4 flex items-center justify-center font-mono font-black text-3xl sm:text-4xl shadow-inner transition-all ${
                      isActive
                        ? 'border-amber-400 bg-amber-950/50 text-amber-300 ring-4 ring-amber-400/30 scale-105'
                        : digit
                        ? 'border-teal-400 bg-slate-800 text-teal-300'
                        : 'border-slate-700 bg-slate-800/60 text-slate-500'
                    }`}
                  >
                    {digit || '•'}
                  </div>
                );
              })}
            </div>

            {/* Virtual Number Keypad (Touch / Mobile Friendly) */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (inputPin.length < 3) {
                      const next = inputPin + num.toString();
                      setInputPin(next);
                      setPinError(null);
                      if (next.length === 3) {
                        handleVerifyPin(next);
                      }
                    }
                  }}
                  className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 font-black text-xl text-white shadow-md border border-slate-700 transition-all cursor-pointer"
                >
                  {num}
                </button>
              ))}
              
              <button
                type="button"
                onClick={() => {
                  setInputPin('');
                  setPinError(null);
                }}
                className="py-3 rounded-2xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              >
                Xóa hết
              </button>

              <button
                type="button"
                onClick={() => {
                  if (inputPin.length < 3) {
                    const next = inputPin + '0';
                    setInputPin(next);
                    setPinError(null);
                    if (next.length === 3) {
                      handleVerifyPin(next);
                    }
                  }
                }}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 active:bg-amber-500 active:text-slate-950 font-black text-xl text-white shadow-md border border-slate-700 transition-all cursor-pointer"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputPin((prev) => prev.slice(0, -1));
                  setPinError(null);
                }}
                className="py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
              >
                ⌫ Xóa
              </button>
            </div>

            {/* Confirm & Cancel Actions */}
            <div className="space-y-2 pt-2 border-t border-slate-700">
              <button
                type="button"
                onClick={() => handleVerifyPin()}
                disabled={inputPin.length !== 3}
                className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl transition-all ${
                  inputPin.length === 3
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 cursor-pointer active:scale-95'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <Check className="w-5 h-5" />
                <span>XÁC NHẬN VÀO ĐỘI THI ĐẤU</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsPinModalOpen(false);
                  setPinError(null);
                  setPinSuccess(null);
                }}
                className="w-full py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs transition-all cursor-pointer"
              >
                Hủy / Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
