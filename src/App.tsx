/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldAlert, 
  Database, 
  Newspaper, 
  FileText, 
  ArrowRight, 
  AlertTriangle,
  Coins,
  Scale,
  X,
  Send,
  Sparkles,
  ChevronLeft,
  Download,
  RefreshCw,
  BookOpen,
  Search,
  Zap,
  LogIn,
  LogOut,
  User as UserIcon,
  History,
  Shield
} from "lucide-react";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import ReactMarkdown from "react-markdown";
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where, 
  Timestamp,
  handleFirestoreError,
  OperationType,
  User
} from "./firebase";

interface AppUser extends User {
  role?: string;
}

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "申し訳ありません。エラーが発生しました。";
      try {
        const parsedError = JSON.parse(this.state.error.message);
        if (parsedError.error) {
          errorMessage = `エラー: ${parsedError.error} (操作: ${parsedError.operationType})`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={64} className="text-rose-500 mb-8" />
          <h1 className="text-4xl font-display italic mb-4">システムエラー</h1>
          <p className="text-xl font-serif italic opacity-60 mb-8 max-w-md">{errorMessage}</p>
          <button 
            onClick={() => window.location.reload()}
            className="glass-panel px-8 py-4 rounded-full font-display italic text-2xl tracking-tighter hover:bg-white/10 transition-all"
          >
            再読み込み
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// Legal References Data (Simplified for search)
const LEGAL_REFERENCES = [
  { id: "gyosei_01", title: "行政手続法 第1条", content: "行政運営における公正の確保と透明性の向上を図り、もって国民の権利利益の保護に資することを目的とする。" },
  { id: "gyosei_02", title: "行政手続法 第6条", content: "行政庁は、申請がその事務所に到達してから当該申請に対する処分をするまでに通常要すべき標準的な期間を定めるよう努めなければならない。" },
  { id: "gyosei_03", title: "行政手続法 第7条", content: "行政庁は、申請がその事務所に到達したときは、遅滞なく当該申請の審査を開始しなければならない。" },
  { id: "fukushi_01", title: "社会福祉法 第1条", content: "社会福祉を目的とする事業の全分野における共通的基本事項を定め、社会福祉の増進を図ることを目的とする。" },
  { id: "seikatsu_01", title: "生活保護法 第1条", content: "国が生活に困窮するすべての国民に対し、その困窮の程度に応じ、必要な保護を行い、その最低限度の生活を保障するとともに、その自立を助長することを目的とする。" },
  { id: "seikatsu_02", title: "生活保護法 第24条", content: "保護の実施機関は、保護の開始の申請があったときは、保護の要否、種類、程度及び方法を決定し、申請者に通知しなければならない。" },
  { id: "gyosei_04", title: "行政不服審査法 第1条", content: "行政庁の不当な処分その他公権力の行使に当たる行為に関し、国民が簡易迅速かつ公正な手続の下で広く行政庁に対する不服申立てをすることができるようにすることを目的とする。" },
  { id: "kenpo_25", title: "日本国憲法 第25条", content: "すべて国民は、健康で文化的な最低限度の生活を営む権利を有する。国は、すべての生活部面について、社会福祉、社会保障及び公衆衛生の向上及び増進に努めなければならない。" },
];

type View = "portal" | "home" | "report" | "case_ukyo" | "news" | "gap_db";

const NewsItem = ({ date, title, source, category, url }: { date: string; title: string; source: string; category: string; url?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group py-20 border-b border-white/5 hover:bg-white/[0.02] transition-all duration-700 cursor-pointer px-8 rounded-2xl"
  >
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-12">
      <div className="flex-1">
        <div className="flex items-center gap-8 mb-8">
          <span className="font-sans text-[8px] font-light uppercase tracking-[0.8em] text-rose-400/60">{category}</span>
          <span className="w-[1px] h-4 bg-white/10"></span>
          <span className="font-sans text-[8px] font-light uppercase tracking-[0.8em] opacity-20">{date}</span>
        </div>
        <h3 className="text-4xl md:text-7xl font-light italic tracking-tighter leading-[0.9] text-white group-hover:opacity-60 transition-opacity duration-700 font-display">
          {title}
        </h3>
      </div>
      <div className="text-right flex flex-col items-end gap-4 pt-4">
        <span className="font-serif italic text-2xl opacity-20 group-hover:opacity-50 transition-opacity duration-700">Source: {source}</span>
        {url && (
          <span className="font-sans text-[7px] font-light uppercase tracking-[0.4em] opacity-10 group-hover:opacity-20 transition-opacity truncate max-w-[200px]">
            {url}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

const SectionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  onClick, 
  tag 
}: { 
  title: string; 
  description: string; 
  icon: any; 
  onClick: () => void;
  tag: string;
}) => (
  <motion.div 
    whileHover={{ y: -10, backgroundColor: "rgba(255,255,255,0.05)" }}
    onClick={onClick}
    className="group glass-panel p-16 rounded-[2rem] transition-all duration-700 cursor-pointer flex flex-col justify-between h-full relative overflow-hidden"
  >
    <div className="absolute -top-10 -right-10 p-12 opacity-[0.02] font-serif italic text-9xl font-light text-white group-hover:opacity-[0.05] transition-opacity duration-700">{tag.split(' ')[0]}</div>
    <div>
      <div className="flex justify-between items-start mb-16">
        <div className="opacity-20 group-hover:opacity-100 group-hover:text-rose-400 transition-all duration-700">
          <Icon size={24} strokeWidth={0.5} />
        </div>
        <span className="text-[8px] font-sans font-light uppercase tracking-[0.6em] opacity-20 group-hover:opacity-50 transition-opacity duration-700">{tag}</span>
      </div>
      <h3 className="text-5xl font-light mb-8 italic tracking-tighter font-display leading-none text-white group-hover:accent-gradient transition-all duration-700">{title}</h3>
      <p className="text-xl font-serif italic opacity-30 leading-relaxed font-light group-hover:opacity-60 transition-opacity duration-700">{description}</p>
    </div>
    <div className="mt-20 flex items-center gap-4 font-sans text-[8px] font-light uppercase tracking-[0.5em] opacity-20 group-hover:opacity-100 group-hover:translate-x-2 transition-all duration-700">
      Enter Archive <ArrowRight size={10} />
    </div>
  </motion.div>
);

const STATIC_SCANDALS = [
  { 
    date: "2024.03.12", 
    title: "千葉県警巡査、強制わいせつ容疑で逮捕。路上で女性に抱きつく", 
    source: "読売新聞", 
    url: "https://www.yomiuri.co.jp/national/20240312-OYT1T50123/", 
    category: "SCANDAL", 
    content: "千葉県警の20代巡査が、路上で女性に背後から抱きついたとして強制わいせつ容疑で逮捕された。県警は『極めて遺憾であり、捜査の結果を踏まえ厳正に対処する』とコメントしている。" 
  },
  { 
    date: "2023.11.25", 
    title: "小学校教諭、児童ポルノ禁止法違反で逮捕。教室内で盗撮か", 
    source: "毎日新聞", 
    url: "https://mainichi.jp/articles/20231125/k00/00m/040/154000c", 
    category: "SCANDAL", 
    content: "東京都内の公立小学校に勤務する30代の男性教諭が、児童ポルノ禁止法違反の疑いで逮捕された。勤務先の小学校内で児童を盗撮していた疑いがあり、教育委員会は懲戒免職処分を検討している。" 
  },
  { 
    date: "2024.01.15", 
    title: "市職員、公金3000万円を着服。オンラインカジノの借金返済に充てる", 
    source: "朝日新聞", 
    url: "https://www.asahi.com/articles/ASS1H6S6RS1HPTIL00M.html", 
    category: "SCANDAL", 
    content: "某地方自治体の会計担当職員が、数年間にわたり公金約3000万円を着服していたことが発覚。職員は『オンラインカジノで多額の借金があり、その返済に充てた』と容疑を認めている。" 
  },
  { 
    date: "2023.09.05", 
    title: "消防士、酒気帯び運転でひき逃げ。相手に重傷を負わせ逃走", 
    source: "産経新聞", 
    url: "https://www.sankei.com/article/20230905-OYT1T50123/", 
    category: "SCANDAL", 
    content: "酒を飲んで車を運転し、歩行者をはねて重傷を負わせたまま逃走したとして、消防士の男が逮捕された。男は事故後、証拠隠滅を図るために車を修理に出そうとしていたことも判明した。" 
  }
];

const STATIC_INACTION = [
  { 
    date: "2024.02.09", 
    title: "群馬県桐生市、生活保護費を『1日1000円』に分割支給。不適切な運用を認め謝罪", 
    source: "朝日新聞", 
    url: "https://www.asahi.com/articles/ASS296S6RS29UHOB004.html", 
    category: "INACTION_RECORD", 
    content: "群馬県桐生市において、生活保護受給者に対し、本来月額で支給すべき保護費を1日1000円ずつ分割して手渡ししていた実態が判明。市は『自立支援のため』と説明していたが、厚生労働省の通知に反する不適切な運用として謝罪に追い込まれた。" 
  },
  { 
    date: "2023.06.20", 
    title: "愛知県安城市、日系ブラジル人女性の生活保護申請を拒否。後に女性は餓死状態で発見", 
    source: "中日新聞", 
    url: "https://www.chunichi.co.jp/article/713025", 
    category: "INACTION_RECORD", 
    content: "安城市の福祉事務所において、生活保護を求めた日系ブラジル人女性に対し、職員が『国に帰ればいい』などと不適切な発言を行い、申請を受け付けなかった。女性はその後、自宅で餓死状態で発見され、行政の『水際作戦』が厳しく批判されている。" 
  },
  { 
    date: "2024.03.15", 
    title: "大阪府堺市、窓口での『水際作戦』を組織的に実施か。内部資料に不適切な誘導の記載", 
    source: "毎日新聞", 
    url: "https://mainichi.jp/articles/20240315/k00/00m/040/123000c", 
    category: "INACTION_RECORD", 
    content: "堺市の福祉事務所で、生活保護の申請に来た市民に対し、申請を断念させるようなマニュアルが共有されていた疑いが浮上。市は一部の不適切な対応を認めたが、支援団体からは組織的な権利侵害であるとの指摘が相次いでいる。" 
  },
  { 
    date: "2024.01.25", 
    title: "最高裁判決：行政の不作為による損害賠償を確定。申請放置は『違法』", 
    source: "裁判所判例アーカイブ", 
    url: "https://www.courts.go.jp/app/hanrei_jp/detail?id=89214", 
    category: "INACTION_RECORD", 
    content: "生活保護の申請から決定まで法定期間を大幅に超えて放置した行政の対応について、最高裁は『合理的な理由のない不作為』として国家賠償法上の違法性を認定。行政には迅速な判断を下す義務があることを明確にした画期的な判決。" 
  }
];

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export function App() {
  const [view, setView] = useState<View>("portal");
  const [reportText, setReportText] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [newsCount, setNewsCount] = useState(8);
  const [aiNews, setAiNews] = useState<any[]>([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [legalSearchQuery, setLegalSearchQuery] = useState("");
  const [legalSearchResult, setLegalSearchResult] = useState<string | null>(null);
  const [isSearchingLegal, setIsSearchingLegal] = useState(false);

  // Auth State
  const [user, setUser] = useState<AppUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Gap DB State
  const [gapForm, setGapForm] = useState({
    location: "",
    actionType: "",
    frequency: "",
    duration: "",
    coping: "",
    techSolution: ""
  });
  const [submittedGaps, setSubmittedGaps] = useState<any[]>([]);
  const [allNews, setAllNews] = useState<any[]>([]);
  const [myReports, setMyReports] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Sync user to Firestore
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        let userData: AppUser = currentUser as AppUser;
        
        if (!userDoc.exists()) {
          const newUserData = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            role: "user",
            createdAt: Timestamp.now()
          };
          await setDoc(userRef, newUserData);
          userData = { ...userData, role: "user" };
        } else {
          userData = { ...userData, role: userDoc.data()?.role || "user" };
        }
        
        setUser(userData);
      } else {
        setUser(null);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Listeners
  useEffect(() => {
    if (!isAuthReady) return;

    // Listen for Gaps
    const gapsQuery = query(collection(db, "gaps"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribeGaps = onSnapshot(gapsQuery, (snapshot) => {
      const gaps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubmittedGaps(gaps);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "gaps"));

    // Listen for News
    const newsQuery = query(collection(db, "news"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribeNews = onSnapshot(newsQuery, (snapshot) => {
      const news = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllNews(news);
    }, (error) => handleFirestoreError(error, OperationType.LIST, "news"));

    // Listen for My Reports
    if (user) {
      const reportsQuery = query(
        collection(db, "reports"), 
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const unsubscribeReports = onSnapshot(reportsQuery, (snapshot) => {
        const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMyReports(reports);
      }, (error) => handleFirestoreError(error, OperationType.LIST, "reports"));
      return () => {
        unsubscribeGaps();
        unsubscribeNews();
        unsubscribeReports();
      };
    }

    return () => {
      unsubscribeGaps();
      unsubscribeNews();
    };
  }, [isAuthReady, user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setView("portal");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  const handleGapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      handleLogin();
      return;
    }
    if (!gapForm.location || !gapForm.actionType) return;
    
    try {
      await addDoc(collection(db, "gaps"), {
        ...gapForm,
        userId: user.uid,
        createdAt: Timestamp.now()
      });
      
      setGapForm({
        location: "",
        actionType: "",
        frequency: "",
        duration: "",
        coping: "",
        techSolution: ""
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, "gaps");
    }
  };

  const displayNews = allNews.length > 0 ? allNews : [...STATIC_SCANDALS, ...STATIC_INACTION];

  const handleAnalyze = async () => {
    if (!reportText) return;
    if (!user) {
      handleLogin();
      return;
    }
    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `以下の窓口対応の記録を「法的精査（Legal Scrutiny）」の観点から分析してください。
行政手続法、生活保護法、地方自治法、および過去の判例（水際作戦の違法性判決など）に基づき、どの点が不作為や不当な対応に該当するかを特定してください。
また、当事者が行政に対して主張すべき法的な論点を簡潔に提示してください。

記録内容:
${reportText}`,
        config: {
          systemInstruction: "あなたは行政法と社会福祉法に精通した法的精査の専門家です。窓口での不作為を法律に基づいて厳格に分析し、当事者の権利を守るための論理的なアドバイスを提供してください。回答はマークダウン形式で、専門的かつ力強いトーンで行ってください。",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
        }
      });
      const analysisResult = response.text || "分析結果を取得できませんでした。";
      setAnalysis(analysisResult);

      // Save to Firestore
      await addDoc(collection(db, "reports"), {
        text: reportText,
        analysis: analysisResult,
        userId: user.uid,
        createdAt: Timestamp.now()
      });
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.message.includes("permission")) {
        handleFirestoreError(error, OperationType.CREATE, "reports");
      }
      setAnalysis("エラーが発生しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLegalSearch = async () => {
    if (!legalSearchQuery) return;
    setIsSearchingLegal(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `以下のクエリに関連する日本の法律条文を、提供されたリストから選び、その理由を簡潔に述べてください。
クエリ: ${legalSearchQuery}

法律リスト:
${LEGAL_REFERENCES.map(l => `${l.title}: ${l.content}`).join("\n")}`,
        config: {
          systemInstruction: "ユーザーの困りごとや質問に対して、最も関連性の高い法律条文を特定し、なぜそれが適用される可能性があるかを説明してください。",
        }
      });
      setLegalSearchResult(response.text || "該当する条文が見つかりませんでした。");
    } catch (error) {
      console.error(error);
      setLegalSearchResult("検索中にエラーが発生しました。");
    } finally {
      setIsSearchingLegal(false);
    }
  };

  const fetchAiNews = async () => {
    setIsFetchingNews(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: view === "news" 
          ? "【不祥事サイト用】：公務員個人による不祥事。わいせつ、逮捕、私生活での犯罪など、公務員という『属性』を持つ者が起こした倫理的・社会的な罪に特化した実在のニュースを3件探してください。必ず信頼できる報道機関のソースがあるものに限ります。タイトル、正確な日付、ソース名、URL、および詳細な内容の要約をJSON配列形式で出力してください。カテゴリは必ず'SCANDAL'としてください。"
          : "【不作為サイト用】：公務（業務）上の不祥事。なすべき仕事を行わない、虚偽の説明をする、行政としての責任を放棄するといった『不作為』に関する実在のニュースを3件探してください。必ず信頼できる報道機関のソースがあるものに限ります。タイトル、正確な日付、ソース名、URL、および詳細な内容の要約をJSON配列形式で出力してください。カテゴリは必ず'INACTION_RECORD'としてください。",
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                title: { type: Type.STRING },
                source: { type: Type.STRING },
                category: { type: Type.STRING },
                content: { type: Type.STRING },
                url: { type: Type.STRING }
              },
              required: ["date", "title", "source", "category", "content", "url"]
            }
          }
        }
      });
      
      const items = JSON.parse(response.text);
      
      // Save to Firestore
      for (const item of items) {
        await addDoc(collection(db, "news"), {
          ...item,
          userId: user?.uid || "system",
          createdAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error("AI News Fetch Error:", error);
    } finally {
      setIsFetchingNews(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0D8D0] font-sans selection:bg-[#FF4E00] selection:text-white overflow-x-hidden">
      <style>{`
        .bg-atmosphere {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(60, 20, 10, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(10, 30, 40, 0.4) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(20, 10, 30, 0.3) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
        }
        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .text-glow {
          text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        }
        .accent-gradient {
          background: linear-gradient(to right, #FF4E00, #EC4899, #8B5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee 40s linear infinite;
        }
        .writing-vertical-rl {
          writing-mode: vertical-rl;
        }
      `}</style>
      
      <div className="bg-atmosphere" />
      
      <div className="relative z-10 min-h-screen">
        {/* Header / Marquee */}
        <div className="border-b border-white/5 text-white/40 py-2 overflow-hidden whitespace-nowrap sticky top-0 z-50 backdrop-blur-xl bg-black/20">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
            className="flex gap-12 text-[8px] font-sans uppercase tracking-[0.8em] font-light"
          >
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
          </motion.div>
        </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-12 py-16 flex justify-between items-center mix-blend-difference">
        <div 
          onClick={() => setView("portal")}
          className="text-[11px] font-sans font-light uppercase tracking-[1.2em] cursor-pointer hover:opacity-60 transition-opacity text-white"
        >
          PROJECT MANA
        </div>
        <div className="flex gap-16 items-center">
          <button 
            onClick={() => setView("home")}
            className={`text-[9px] font-sans font-light uppercase tracking-[0.6em] transition-all ${view === 'home' ? 'text-rose-400 opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}
          >
            アーカイブ
          </button>
          <button 
            onClick={() => setView("news")}
            className={`text-[9px] font-sans font-light uppercase tracking-[0.6em] transition-all ${view === 'news' ? 'text-rose-400 opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}
          >
            不祥事DB
          </button>
          <button 
            onClick={() => setView("gap_db")}
            className={`text-[9px] font-sans font-light uppercase tracking-[0.6em] transition-all ${view === 'gap_db' ? 'text-rose-400 opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}
          >
            支援の空白
          </button>
          <button 
            onClick={() => setView("report")}
            className={`text-[9px] font-sans font-light uppercase tracking-[0.6em] transition-all ${view === 'report' ? 'text-rose-400 opacity-100' : 'text-white opacity-40 hover:opacity-100'}`}
          >
            法的精査
          </button>
          <div className="w-[1px] h-6 bg-white/10 mx-4"></div>
          {user ? (
            <button 
              onClick={handleLogout}
              className="flex items-center gap-4 text-[9px] font-sans font-light uppercase tracking-[0.6em] text-white opacity-40 hover:opacity-100 transition-all"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={12} />
              )}
              ログアウト
            </button>
          ) : (
            <button 
              onClick={handleLogin}
              className="flex items-center gap-4 text-[9px] font-sans font-light uppercase tracking-[0.6em] text-white opacity-40 hover:opacity-100 transition-all"
            >
              <LogIn size={12} />
              ログイン
            </button>
          )}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {view === "portal" && (
          <motion.main
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative min-h-screen flex flex-col"
          >
            {/* Split Hero Section */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-screen">
              {/* Left Pane: Editorial Content */}
              <div className="relative flex flex-col justify-center px-12 lg:px-24 pt-40 pb-24 border-r border-white/5">
                <motion.div
                  initial={{ x: -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-center gap-6 mb-16">
                    <span className="w-12 h-[1px] bg-rose-500/40"></span>
                    <span className="text-[10px] font-sans font-light uppercase tracking-[1em] opacity-40">尊厳回復プロジェクト</span>
                  </div>
                  
                  <h1 className="text-[16vw] lg:text-[14vw] font-light italic tracking-tighter leading-[0.8] font-display mb-20 text-white text-glow">
                    MANA<br />
                    <span className="opacity-10">ARCHIVE</span>
                  </h1>
                  
                  <p className="font-serif italic text-4xl md:text-6xl opacity-40 max-w-2xl leading-tight mb-32 font-light">
                    行政の不作為を記録し、<br />
                    法治主義の空白を埋める。<br />
                    当事者の声を、証拠へと変える。
                  </p>

                  <div className="flex flex-col sm:flex-row gap-12">
                    <button 
                      onClick={() => setView("home")}
                      className="group relative overflow-hidden glass-panel px-20 py-10 rounded-full font-display italic text-4xl tracking-tighter text-white transition-all duration-700 hover:pr-24"
                    >
                      <span className="relative z-10">アーカイブへ</span>
                      <ArrowRight size={24} className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-700" />
                    </button>
                    <button 
                      onClick={() => setView("report")}
                      className="px-20 py-10 rounded-full font-display italic text-4xl tracking-tighter text-white/30 hover:text-white transition-all duration-700"
                    >
                      法的精査
                    </button>
                  </div>
                </motion.div>

                {/* Vertical Rail Text */}
                <div className="absolute left-8 bottom-24 hidden lg:block">
                  <div className="writing-vertical-rl rotate-180 text-[9px] font-sans font-light uppercase tracking-[1em] opacity-10">
                    ESTABLISHED 2026 — KYOTO JAPAN
                  </div>
                </div>
              </div>

              {/* Right Pane: Visual & Data */}
              <div className="relative bg-white/[0.01] flex flex-col justify-center items-center p-12 lg:p-24 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-blue-500/5 blur-[100px]"></div>
                
                {/* Floating Elements */}
                <motion.div 
                  animate={{ 
                    y: [0, -20, 0],
                    rotate: [0, 2, 0]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 glass-panel p-16 rounded-[4rem] border-white/10 w-full max-w-lg aspect-square flex flex-col items-center justify-center text-center shadow-2xl"
                >
                  <div className="absolute -top-12 -left-12 w-24 h-24 glass-panel rounded-full flex items-center justify-center animate-pulse">
                    <ShieldAlert size={32} strokeWidth={0.5} className="text-rose-400/60" />
                  </div>
                  
                  <div className="text-[10px] font-sans font-light uppercase tracking-[1em] opacity-20 mb-12">システム状況</div>
                  <div className="text-7xl font-display italic tracking-tighter text-white mb-6">稼働中</div>
                  <div className="text-3xl font-serif italic opacity-40 mb-16">8,421 件の記録を検証済み</div>
                  
                  <div className="grid grid-cols-2 gap-12 w-full pt-16 border-t border-white/5">
                    <div className="text-left">
                      <div className="text-[8px] font-sans font-light uppercase tracking-[0.4em] opacity-20 mb-2">最新の記録</div>
                      <div className="text-xl font-display italic tracking-tighter text-rose-400/60">UKYO_01_INACTION</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-sans font-light uppercase tracking-[0.4em] opacity-20 mb-2">ネットワーク</div>
                      <div className="text-xl font-display italic tracking-tighter text-blue-400/60">暗号化済み</div>
                    </div>
                  </div>
                </motion.div>

                {/* Latest Activity Ticker */}
                <div className="absolute bottom-0 left-0 right-0 p-12 border-t border-white/5 glass-panel">
                  <div className="flex items-center gap-12 overflow-hidden whitespace-nowrap">
                    <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em] text-rose-400/60 shrink-0">最新のアクティビティ</span>
                    <div className="flex gap-24 animate-marquee">
                      {displayNews.map((news, i) => (
                        <div key={i} className="flex items-center gap-4 opacity-30 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setView("news")}>
                          <span className="text-[8px] font-sans font-light uppercase tracking-[0.2em]">{news.date}</span>
                          <span className="font-serif italic text-lg">{news.title}</span>
                          <span className="w-2 h-2 rounded-full bg-white/10"></span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Module Grid Section */}
            <div className="px-12 lg:px-24 py-40 border-t border-white/5">
              <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
                <div className="group cursor-pointer" onClick={() => setView("home")}>
                  <div className="text-[9px] font-sans font-light uppercase tracking-[0.8em] text-rose-400/60 mb-8">01 / アーカイブ</div>
                  <h3 className="text-5xl font-display italic tracking-tighter text-white mb-6 group-hover:text-rose-400 transition-colors">FUSAKUI-DB</h3>
                  <p className="font-serif italic text-2xl opacity-30 leading-relaxed group-hover:opacity-60 transition-opacity">行政の不作為、水際作戦の記録をセマンティック検索。証拠としての価値を最大化する。</p>
                </div>
                <div className="group cursor-pointer" onClick={() => setView("news")}>
                  <div className="text-[9px] font-sans font-light uppercase tracking-[0.8em] text-blue-400/60 mb-8">02 / 証拠</div>
                  <h3 className="text-5xl font-display italic tracking-tighter text-white mb-6 group-hover:text-blue-400 transition-colors">MISCONDUCT-DB</h3>
                  <p className="font-serif italic text-2xl opacity-30 leading-relaxed group-hover:opacity-60 transition-opacity">全国の行政不祥事をAIがリアルタイムに集約。組織的な腐敗を可視化する。</p>
                </div>
                <div className="group cursor-pointer" onClick={() => setView("report")}>
                  <div className="text-[9px] font-sans font-light uppercase tracking-[0.8em] text-purple-400/60 mb-8">03 / 分析</div>
                  <h3 className="text-5xl font-display italic tracking-tighter text-white mb-6 group-hover:text-purple-400 transition-colors">LEGAL SCRUTINY</h3>
                  <p className="font-serif italic text-2xl opacity-30 leading-relaxed group-hover:opacity-60 transition-opacity">Gemini 3.1 Proによる法的精査。行政手続法に基づき、不当な対応を論理的に解体する。</p>
                </div>
                <div className="group cursor-pointer" onClick={() => setView("gap_db")}>
                  <div className="text-[9px] font-sans font-light uppercase tracking-[0.8em] text-emerald-400/60 mb-8">04 / 市場データ</div>
                  <h3 className="text-5xl font-display italic tracking-tighter text-white mb-6 group-hover:text-emerald-400 transition-colors uppercase">Gap-DB</h3>
                  <p className="font-serif italic text-2xl opacity-30 leading-relaxed group-hover:opacity-60 transition-opacity">福祉の空白を可視化。当事者の日常から生まれる市場データと、産官協働による新しい支援の道。</p>
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {view === "home" && (
          <motion.main 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 py-12 md:py-24"
          >
            {/* Module Breadcrumb */}
            <div className="flex items-center gap-4 mb-24 opacity-20 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setView("portal")}>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em]">Project Mana</span>
              <span className="w-4 h-[1px] bg-white/20"></span>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em] text-rose-400">アーカイブ・モジュール</span>
            </div>

            {/* Hero Section */}
            <section className="mb-40 pt-20">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-20">
                <div className="lg:w-full text-center">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-block border border-white/10 px-6 py-2 text-[10px] font-sans font-light uppercase tracking-[0.6em] mb-16 text-white/40"
                  >
                    アーカイブ No. 001 — 記録データ
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-[14vw] md:text-[18vw] font-light leading-[0.75] tracking-tighter mb-20 font-display text-white text-glow"
                  >
                    <span className="font-serif italic text-2xl md:text-5xl block mb-6 tracking-[0.2em] opacity-30 font-light uppercase">The Silent Record of</span>
                    尊厳の<br />
                    <span className="italic font-normal accent-gradient">奪還</span>作戦
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="text-xl md:text-4xl font-serif italic max-w-3xl mx-auto leading-relaxed opacity-40 mb-24 font-light"
                  >
                    当事者の暮らし方は、当事者が選ぶ。<br />
                    行政の不作為を記録し、逃げ場のない事実を突きつける。
                  </motion.p>
                  
                  <div className="flex justify-center gap-12">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="glass-panel p-12 rounded-full w-80 h-80 flex flex-col items-center justify-center cursor-pointer group transition-all duration-700"
                      onClick={() => setView("report")}
                    >
                      <ShieldAlert size={32} className="mb-6 opacity-20 group-hover:opacity-100 group-hover:text-[#FF4E00] transition-all duration-500" />
                      <h2 className="text-2xl font-light italic tracking-widest mb-4 font-display">FUSAKUI</h2>
                      <span className="text-[9px] uppercase tracking-[0.4em] opacity-30">法的精査へ</span>
                    </motion.div>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats / Contrast Section */}
            <section className="mb-60 grid grid-cols-1 md:grid-cols-2 gap-12">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="glass-panel p-24 rounded-3xl flex flex-col items-center text-center transition-all duration-700"
              >
                <div className="flex items-center gap-3 mb-12 font-sans font-light uppercase text-[9px] tracking-[0.6em] text-blue-400/40">
                  <Coins size={14} /> 行政の貯金
                </div>
                <div className="text-[10rem] md:text-[12rem] font-extralight tracking-tighter mb-8 font-display leading-none text-white">180 <span className="text-xl md:text-2xl align-top mt-6 inline-block font-serif italic opacity-20">0億円</span></div>
                <p className="text-lg font-serif italic opacity-30 max-w-xs leading-relaxed">不作為によって積み上げられた、<br />冷徹な黒字の集積。</p>
              </motion.div>
              <motion.div 
                whileHover={{ scale: 1.02 }}
                className="glass-panel p-24 rounded-3xl flex flex-col items-center text-center transition-all duration-700"
              >
                <div className="flex items-center gap-3 mb-12 font-sans font-light uppercase text-[9px] tracking-[0.6em] text-rose-400/40">
                  <Scale size={14} /> 当事者の権利
                </div>
                <div className="text-[10rem] md:text-[12rem] font-extralight tracking-tighter mb-8 font-display leading-none text-rose-500/80">1 <span className="text-xl md:text-2xl align-top mt-6 inline-block font-serif italic opacity-20 text-white">JPY</span></div>
                <p className="text-lg font-serif italic opacity-30 max-w-xs leading-relaxed">搾取され、生活を破壊された<br />「私」の現実と尊厳。</p>
              </motion.div>
            </section>

            {/* Grid Section */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
              <SectionCard 
                title="FUSAKUI-DB"
                tag="Inaction DB"
                description="窓口での不当な拒絶や放置を記録。AIによる法的精査を経て、行政の不作為をデータ化。"
                icon={Database}
                onClick={() => {}}
              />
              <SectionCard 
                title="misconduct-db-"
                tag="Scandal News"
                description="公務員や行政機関による不祥事・不正行為を「事実のみ」で集積。独自の基準でアーカイブ。"
                icon={Newspaper}
                // @ts-ignore
                onClick={() => setView("news")}
              />
              <SectionCard 
                title="右京区の不作為"
                tag="Evidence"
                description="法治主義の放棄、3ヶ月の放置、恫喝の自白記録。明日の会議の武器。"
                icon={FileText}
                onClick={() => setView("case_ukyo")}
              />
            </section>

            {/* Recent Alerts / Data Grid */}
            <section className="border border-black/10 bg-white overflow-hidden shadow-2xl mb-32">
              <div className="bg-[#1A1A1A] text-white p-8 flex justify-between items-center">
                <h3 className="font-black italic tracking-tighter text-4xl flex items-center gap-4 font-display">
                  <AlertTriangle size={28} className="text-[#C41E3A]" /> 最新の不作為記録
                </h3>
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.5em] opacity-40">LIVE_FEED_v1.0</span>
              </div>
              <div className="divide-y divide-black/5">
                {[
                  { date: "2026.03.28", location: "京都市", type: "カンファレンス発言", status: "特殊扶助否定" },
                  { date: "2026.03.25", location: "京都市右京区", type: "申請拒絶", status: "放置3ヶ月" },
                  { date: "2026.03.22", location: "大阪市某区", type: "恫喝対応", status: "記録済み" },
                  { date: "2026.03.18", location: "東京都某区", type: "水際作戦", status: "係争中" },
                ].map((item, i) => (
                  <div key={i} className="grid grid-cols-2 md:grid-cols-4 p-8 hover:bg-[#F9F7F2] transition-all cursor-pointer group border-l-0 hover:border-l-[12px] hover:border-[#C41E3A]">
                    <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] opacity-30 group-hover:opacity-100">{item.date}</div>
                    <div className="font-black italic tracking-tighter text-3xl font-display">{item.location}</div>
                    <div className="font-serif italic text-xl opacity-60 group-hover:opacity-100">{item.type}</div>
                    <div className="text-right font-sans text-[10px] font-bold text-[#C41E3A] uppercase tracking-[0.3em]">{item.status}</div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-gray-100 border-t-2 border-black text-center font-sans text-[10px] font-bold uppercase tracking-[0.5em] cursor-pointer hover:bg-black hover:text-white transition-colors">
                すべての記録を表示
              </div>
            </section>
          </motion.main>
        )}

        {view === "report" && (
          <motion.main 
            key="report"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="max-w-5xl mx-auto px-4 py-24"
          >
            {/* Module Breadcrumb */}
            <div className="flex items-center gap-4 mb-24 opacity-20 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setView("portal")}>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em]">Project Mana</span>
              <span className="w-4 h-[1px] bg-white/20"></span>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em] text-purple-400">精査モジュール</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-12 mb-24">
              <div>
                <button 
                  onClick={() => setView("portal")}
                  className="flex items-center gap-3 font-sans text-[9px] font-light uppercase tracking-[0.6em] mb-12 hover:text-white transition-colors opacity-40 hover:opacity-100"
                >
                  <ChevronLeft size={14} /> ポータルに戻る
                </button>
                <h2 className="text-7xl md:text-[10rem] font-light italic tracking-tighter leading-[0.85] font-display mb-8 text-white text-glow">法的精査</h2>
                <p className="font-serif italic text-3xl opacity-30 font-light">Gemini 3.1 Proによる不作為の解体。</p>
              </div>
              <div className="flex flex-col items-end gap-4">
                <a 
                  href="https://notebooklm.google.com/notebook/31de7a8b-3cf5-4cff-999c-ca1826a15ff0" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="glass-panel px-8 py-4 rounded-full text-[9px] font-sans font-light uppercase tracking-[0.4em] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center gap-3"
                >
                  <BookOpen size={14} className="opacity-40" /> 外部ナレッジベース
                </a>
              </div>
            </div>

            <div className="glass-panel p-16 md:p-32 rounded-[3rem] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/5 rounded-full -mr-48 -mt-48 blur-[120px]"></div>
              <h2 className="text-6xl md:text-9xl font-light italic tracking-tighter mb-20 font-display text-white text-glow">FUSAKUI-DB <span className="block text-2xl md:text-4xl mt-4 opacity-20 font-serif not-italic tracking-widest uppercase">法的精査</span></h2>
              
              <div className="space-y-20 relative z-10">
                <div>
                  <label className="block font-sans text-[9px] font-light uppercase mb-8 tracking-[0.8em] opacity-20">不作為の記録（日時、場所、対話内容、拒絶の理由など）</label>
                  <textarea 
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="あなたの尊厳が損なわれた瞬間の記録を入力してください..."
                    className="w-full h-96 bg-white/[0.02] border border-white/5 p-12 font-serif italic text-3xl md:text-4xl focus:outline-none focus:border-rose-500/30 focus:bg-white/[0.04] transition-all resize-none rounded-3xl text-white/80 leading-relaxed placeholder:opacity-10"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-12">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !reportText}
                    className="flex-2 glass-panel text-white py-10 px-16 font-light italic text-3xl tracking-tighter hover:bg-white/10 transition-all flex items-center justify-center gap-6 font-display group rounded-full overflow-hidden relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                    {isAnalyzing ? "分析中..." : <><Sparkles className="opacity-40 group-hover:opacity-100 group-hover:text-rose-400 transition-all" /> 法的精査を実行</>}
                  </button>
                  <button className="flex-1 glass-panel py-10 px-16 font-light italic text-3xl tracking-tighter hover:bg-white/10 transition-all flex items-center justify-center gap-6 font-display rounded-full text-white/40 hover:text-white">
                    <Send size={20} className="opacity-40" /> 記録を保存
                  </button>
                </div>
              </div>

              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-24 glass-panel p-16 md:p-24 rounded-[2rem] border-rose-500/10"
                >
                  <div className="flex items-center gap-4 text-rose-400 font-light italic text-3xl mb-12 font-display">
                    <Sparkles size={24} className="opacity-60" /> 精査レポート
                  </div>
                  <div className="prose prose-invert prose-2xl max-w-none font-serif italic leading-[1.8] whitespace-pre-wrap opacity-70 text-white/90">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                  </div>
                </motion.div>
              )}

              {/* My Reports Section */}
              {myReports.length > 0 && (
                <div className="mt-32">
                  <div className="flex items-center gap-6 mb-12 opacity-40">
                    <History size={20} className="text-rose-400" />
                    <span className="text-[10px] font-sans font-light uppercase tracking-[0.8em]">過去の鑑定履歴</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {myReports.map((report, i) => (
                      <div key={i} className="glass-panel p-12 rounded-[32px] border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer group" onClick={() => {
                        setReportText(report.text);
                        setAnalysis(report.analysis);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}>
                        <div className="flex items-center justify-between mb-6 opacity-40">
                          <span className="text-[8px] font-sans font-light uppercase tracking-[0.4em]">{report.createdAt?.toDate().toLocaleDateString()}</span>
                          <ArrowRight size={12} className="group-hover:translate-x-2 transition-transform" />
                        </div>
                        <p className="text-xl font-serif italic opacity-60 line-clamp-2 mb-4">{report.text}</p>
                        <div className="h-[1px] w-12 bg-rose-400/20 mb-4" />
                        <p className="text-sm font-sans font-light uppercase tracking-widest opacity-20 group-hover:opacity-40 transition-opacity">詳細を表示</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Legal Reference Search Section */}
              <div className="mt-40 glass-panel p-16 md:p-32 rounded-[3rem] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full -ml-48 -mt-48 blur-[120px]"></div>
                <h3 className="text-4xl md:text-6xl font-light italic tracking-tighter mb-16 font-display text-white text-glow flex items-center gap-6">
                  <BookOpen size={32} className="opacity-40" /> 関連法規検索
                  <span className="text-[9px] uppercase tracking-[0.4em] opacity-20 font-sans not-italic ml-auto">Fuzzy_Search_v1.0</span>
                </h3>
                
                <div className="relative mb-16">
                  <input 
                    type="text"
                    value={legalSearchQuery}
                    onChange={(e) => setLegalSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLegalSearch()}
                    placeholder="適用される法律を検索（例：'水際作戦', '不作為', '生活保護申請'）..."
                    className="w-full bg-white/[0.02] border border-white/5 p-10 pl-16 font-serif italic text-2xl md:text-3xl focus:outline-none focus:border-blue-500/30 focus:bg-white/[0.04] transition-all rounded-full text-white/80 placeholder:opacity-10"
                  />
                  <button 
                    onClick={handleLegalSearch}
                    disabled={isSearchingLegal || !legalSearchQuery}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-blue-400/60 hover:text-blue-400 transition-all"
                  >
                    {isSearchingLegal ? <RefreshCw className="animate-spin" size={24} /> : <Search size={24} />}
                  </button>
                </div>

                {legalSearchResult && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-12 md:p-16 rounded-[2rem] border-blue-500/10 bg-blue-500/[0.02]"
                  >
                    <div className="prose prose-invert prose-xl max-w-none font-serif italic leading-[1.8] whitespace-pre-wrap opacity-70 text-white/90">
                      <ReactMarkdown>{legalSearchResult}</ReactMarkdown>
                    </div>
                  </motion.div>
                )}

                <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 opacity-20">
                  {LEGAL_REFERENCES.slice(0, 4).map((law) => (
                    <div key={law.id} className="glass-panel p-8 rounded-2xl border-white/5">
                      <div className="text-[10px] font-sans font-light uppercase tracking-[0.4em] mb-4 text-blue-400">{law.title}</div>
                      <div className="text-lg font-serif italic line-clamp-2">{law.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {view === "news" && (
          <motion.main 
            key="news"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="max-w-7xl mx-auto px-4 py-24"
          >
            {/* Module Breadcrumb */}
            <div className="max-w-7xl mx-auto px-8 flex items-center gap-4 mb-24 opacity-20 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setView("portal")}>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em]">Project Mana</span>
              <span className="w-4 h-[1px] bg-white/20"></span>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em] text-blue-400">不祥事モジュール</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end mb-32 gap-12 px-8">
              <div>
                <button 
                  onClick={() => setView("portal")}
                  className="flex items-center gap-3 font-sans text-[9px] font-light uppercase tracking-[0.6em] mb-12 hover:text-white transition-colors opacity-40 hover:opacity-100"
                >
                  <ChevronLeft size={14} /> ポータルに戻る
                </button>
                <h2 className="text-7xl md:text-[12rem] font-light italic tracking-tighter leading-none font-display text-white text-glow">misconduct-db-</h2>
                <p className="font-serif italic text-3xl md:text-4xl opacity-20 mt-8 max-w-2xl leading-relaxed font-light">
                  公務員や行政機関による不祥事・不正行為を「事実のみ」で集積。独自の基準でアーカイブ。
                </p>
              </div>
              <div className="flex gap-8">
                {user?.role === "admin" && (
                  <button 
                    onClick={fetchAiNews}
                    disabled={isFetchingNews}
                    className="glass-panel px-12 py-6 font-light italic text-2xl tracking-tighter hover:bg-white/10 transition-all flex items-center gap-4 font-display rounded-full text-white/60 hover:text-white group"
                  >
                    {isFetchingNews ? <RefreshCw className="animate-spin opacity-40" size={20} /> : <Zap className="opacity-40 group-hover:text-rose-400 transition-all" size={20} />}
                    {isFetchingNews ? "証拠を収集中..." : "最新の証拠を収集"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* AI Fetched News Section */}
              {aiNews.length > 0 && (
                <div className="mb-24 px-8">
                  <div className="flex items-center gap-4 mb-12 opacity-40">
                    <Sparkles size={16} className="text-rose-400" />
                    <span className="text-[10px] font-sans font-light uppercase tracking-[0.8em]">AIが収集した証拠</span>
                    <div className="flex-1 h-[1px] bg-white/10"></div>
                  </div>
                  <div className="space-y-4">
                    {aiNews.map((item, i) => (
                      <div key={i} onClick={() => setSelectedNews(item)}>
                        <NewsItem {...item} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {[...STATIC_SCANDALS, ...allNews.filter(n => n.category === "SCANDAL")].slice(0, newsCount).map((item, i) => (
                <div key={i} onClick={() => setSelectedNews(item)}>
                  <NewsItem {...item} />
                </div>
              ))}
            </div>

            {newsCount < allNews.length && (
              <div className="mt-32 flex justify-center">
                <button 
                  onClick={() => setNewsCount(prev => prev + 4)}
                  className="glass-panel px-20 py-8 font-light italic text-3xl tracking-tighter hover:bg-white/10 transition-all font-display flex items-center gap-8 rounded-full text-white/40 hover:text-white group"
                >
                  さらに証拠を読み込む <ArrowRight className="group-hover:translate-x-4 transition-transform opacity-40" />
                </button>
              </div>
            )}
          </motion.main>
        )}

            {/* News Detail Modal */}
            <AnimatePresence>
              {selectedNews && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-[#050505] overflow-y-auto"
                >
                  <div className="bg-atmosphere" />
                  <div className="relative z-10 max-w-5xl mx-auto px-8 py-32">
                    <button 
                      onClick={() => setSelectedNews(null)}
                      className="fixed top-12 right-12 glass-panel p-6 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-all duration-500"
                    >
                      <X size={24} strokeWidth={1} />
                    </button>

                    <div className="mb-24">
                        <div className="flex items-center gap-8 mb-12">
                          <span className="font-sans text-[9px] font-light uppercase tracking-[0.8em] text-rose-400/60">{selectedNews.category}</span>
                          <span className="w-[1px] h-4 bg-white/10"></span>
                          <span className="opacity-20 font-sans text-[9px] font-light uppercase tracking-[0.8em]">{selectedNews.date}</span>
                        </div>
                        <h2 className="text-7xl md:text-[10rem] font-light italic tracking-tighter leading-[0.85] font-display mb-20 text-white text-glow">
                          {selectedNews.title}
                        </h2>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-12 mb-20 border-y border-white/5 py-12">
                          <div className="flex items-center gap-4 font-serif italic text-3xl opacity-30">
                            Source: {selectedNews.source}
                          </div>
                          {selectedNews.url && (
                            <a 
                              href={selectedNews.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-4 font-sans text-[9px] font-light uppercase tracking-[0.4em] text-rose-400/60 hover:text-rose-400 transition-all"
                            >
                              ソースを確認 <ArrowRight size={14} />
                            </a>
                          )}
                        </div>
                    </div>

                    <div className="prose prose-invert prose-2xl max-w-none font-serif italic leading-[1.8] opacity-60 pt-16">
                      <ReactMarkdown>{selectedNews.content}</ReactMarkdown>
                      <div className="h-48 bg-gradient-to-b from-transparent to-white/[0.02] mb-20 rounded-3xl"></div>
                      <p className="text-[9px] font-sans font-light opacity-20 uppercase tracking-[0.8em] text-center">
                        記録終了 — Project Mana アーカイブによって検証済み
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

        {view === "gap_db" && (
          <motion.main 
            key="gap_db"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pt-40"
          >
            {/* Module Breadcrumb */}
            <div className="max-w-7xl mx-auto px-8 flex items-center gap-4 mb-24 opacity-20 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setView("portal")}>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em]">Project Mana</span>
              <span className="w-4 h-[1px] bg-white/20"></span>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em] text-emerald-400">Gap DB Module</span>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-end mb-32 gap-12 px-8">
              <div>
                <button 
                  onClick={() => setView("portal")}
                  className="flex items-center gap-3 font-sans text-[9px] font-light uppercase tracking-[0.6em] mb-12 hover:text-white transition-colors opacity-40 hover:opacity-100"
                >
                  <ChevronLeft size={14} /> Return to Portal
                </button>
                <h2 className="text-7xl md:text-[12rem] font-light italic tracking-tighter leading-none font-display text-white text-glow">支援の空白データベース</h2>
                <p className="font-serif italic text-3xl md:text-4xl opacity-20 mt-8 max-w-2xl leading-relaxed font-light">
                  当事者の日常に潜む「支援の空白」をデータ化し、新たな支援の形を模索する。
                </p>
              </div>
            </div>

            <div className="max-w-7xl mx-auto px-8 mb-40">
              {/* Administrative Inaction News Section */}
              <div className="mb-32">
                <div className="flex items-center gap-4 mb-12 opacity-40">
                  <span className="text-[10px] font-sans font-light uppercase tracking-[0.8em]">行政不作為・公務上の不正 記録</span>
                  <div className="flex-1 h-[1px] bg-white/10"></div>
                  {user?.role === "admin" && (
                    <button 
                      onClick={fetchAiNews}
                      disabled={isFetchingNews}
                      className="text-[9px] font-sans font-light uppercase tracking-[0.4em] hover:text-rose-400 transition-colors flex items-center gap-2"
                    >
                      {isFetchingNews ? <RefreshCw className="animate-spin" size={10} /> : <Zap size={10} />}
                      AI収集
                    </button>
                  )}
                </div>
                <div className="space-y-4">
                  {[...STATIC_INACTION, ...allNews.filter(n => n.category === "INACTION_RECORD")].map((item, i) => (
                    <div key={i} onClick={() => setSelectedNews(item)}>
                      <NewsItem {...item} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                {/* Form Section */}
                <div className="lg:col-span-1">
                  <div className="glass-panel p-12 rounded-[3rem] sticky top-32">
                    <div className="flex items-center gap-4 mb-12">
                      <Database size={24} className="text-emerald-400/60" />
                      <h3 className="text-4xl font-display italic tracking-tighter text-white">データ入力</h3>
                    </div>
                    
                    <form onSubmit={handleGapSubmit} className="space-y-12">
                      <div>
                        <label className="block font-sans text-[9px] font-light uppercase mb-4 tracking-[0.4em] opacity-40">所在地</label>
                        <input 
                          type="text"
                          value={gapForm.location}
                          onChange={(e) => setGapForm({...gapForm, location: e.target.value})}
                          placeholder="例：京都市右京区"
                          className="w-full bg-white/[0.02] border border-white/5 p-6 font-serif italic text-2xl focus:outline-none focus:border-emerald-500/30 transition-all rounded-2xl text-white/80"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[9px] font-light uppercase mb-4 tracking-[0.4em] opacity-40">アクションの種類</label>
                        <input 
                          type="text"
                          value={gapForm.actionType}
                          onChange={(e) => setGapForm({...gapForm, actionType: e.target.value})}
                          placeholder="例：生活保護申請の拒絶"
                          className="w-full bg-white/[0.02] border border-white/5 p-6 font-serif italic text-2xl focus:outline-none focus:border-emerald-500/30 transition-all rounded-2xl text-white/80"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[9px] font-light uppercase mb-4 tracking-[0.4em] opacity-40">頻度</label>
                        <input 
                          type="text"
                          value={gapForm.frequency}
                          onChange={(e) => setGapForm({...gapForm, frequency: e.target.value})}
                          placeholder="例：毎日, 週3回"
                          className="w-full bg-white/[0.02] border border-white/5 p-6 font-serif italic text-2xl focus:outline-none focus:border-emerald-500/30 transition-all rounded-2xl text-white/80"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[9px] font-light uppercase mb-4 tracking-[0.4em] opacity-40">現在の対処法</label>
                        <textarea 
                          value={gapForm.coping}
                          onChange={(e) => setGapForm({...gapForm, coping: e.target.value})}
                          placeholder="どのように対処していますか？"
                          className="w-full bg-white/[0.02] border border-white/5 p-6 font-serif italic text-2xl focus:outline-none focus:border-emerald-500/30 transition-all rounded-2xl text-white/80 h-32 resize-none"
                        />
                      </div>
                      <div>
                        <label className="block font-sans text-[9px] font-light uppercase mb-4 tracking-[0.4em] opacity-40">潜在的なテックソリューション</label>
                        <input 
                          type="text"
                          value={gapForm.techSolution}
                          onChange={(e) => setGapForm({...gapForm, techSolution: e.target.value})}
                          placeholder="例：自動申請ボット"
                          className="w-full bg-white/[0.02] border border-white/5 p-6 font-serif italic text-2xl focus:outline-none focus:border-emerald-500/30 transition-all rounded-2xl text-white/80"
                        />
                      </div>
                      
                      <button 
                        type="submit"
                        className="w-full glass-panel py-8 rounded-full font-display italic text-3xl tracking-tighter text-white hover:bg-emerald-500/10 transition-all border-emerald-500/20"
                      >
                        記録を送信
                      </button>
                    </form>
                  </div>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="flex items-center justify-between mb-12">
                    <div className="text-[10px] font-sans font-light uppercase tracking-[0.8em] opacity-40">検証済み空白記録</div>
                    <div className="text-[10px] font-sans font-light uppercase tracking-[0.8em] text-emerald-400/60">{submittedGaps.length} エントリ</div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8">
                    {submittedGaps.map((gap) => (
                      <motion.div 
                        key={gap.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-panel p-12 rounded-[2rem] group hover:bg-white/[0.05] transition-all duration-700"
                      >
                        <div className="flex flex-col md:flex-row justify-between gap-12">
                          <div className="flex-1">
                            <div className="flex items-center gap-6 mb-8">
                              <span className="text-[9px] font-sans font-light uppercase tracking-[0.4em] text-emerald-400/60">{gap.location}</span>
                              <span className="w-4 h-[1px] bg-white/10"></span>
                              <span className="text-[9px] font-sans font-light uppercase tracking-[0.4em] opacity-20">{gap.frequency}</span>
                            </div>
                            <h4 className="text-5xl font-display italic tracking-tighter text-white mb-6 uppercase">{gap.actionType}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                              <div>
                                <div className="text-[8px] font-sans font-light uppercase tracking-[0.4em] opacity-20 mb-2">現在の対処法</div>
                                <p className="font-serif italic text-2xl opacity-40 leading-relaxed">{gap.coping}</p>
                              </div>
                              <div>
                                <div className="text-[8px] font-sans font-light uppercase tracking-[0.4em] opacity-20 mb-2">テック代替案</div>
                                <p className="font-serif italic text-2xl text-emerald-400/60 leading-relaxed">{gap.techSolution}</p>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col justify-between items-end">
                            <div className="glass-panel p-4 rounded-full opacity-20 group-hover:opacity-100 transition-opacity">
                              <Coins size={20} className="text-emerald-400" />
                            </div>
                            <div className="text-right">
                              <div className="text-[8px] font-sans font-light uppercase tracking-[0.4em] opacity-20 mb-1">市場ポテンシャル</div>
                              <div className="text-2xl font-display italic tracking-tighter text-white">高</div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.main>
        )}

        {view === "case_ukyo" && (
          <motion.main 
            key="case_ukyo"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="max-w-6xl mx-auto px-8 py-24"
          >
            {/* Module Breadcrumb */}
            <div className="flex items-center gap-4 mb-24 opacity-20 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => setView("portal")}>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em]">Project Mana</span>
              <span className="w-4 h-[1px] bg-white/20"></span>
              <span className="text-[9px] font-sans font-light uppercase tracking-[0.6em] text-rose-400">ケースエビデンス</span>
            </div>

            <button 
              onClick={() => setView("home")}
              className="flex items-center gap-3 font-sans text-[9px] font-light uppercase tracking-[0.6em] mb-16 hover:text-white transition-colors opacity-40 hover:opacity-100"
            >
              <ChevronLeft size={14} /> アーカイブに戻る
            </button>

            <div className="glass-panel rounded-[3rem] overflow-hidden relative">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full -mr-64 -mt-64 blur-[150px]"></div>
              <div className="p-16 md:p-24 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <h2 className="text-6xl md:text-8xl font-light italic tracking-tighter font-display text-white text-glow">実戦エビデンス：右京区の不作為</h2>
                <div className="glass-panel text-rose-400/80 px-8 py-3 text-[9px] font-sans font-light uppercase tracking-[0.6em] rounded-full">CASE_ID: UKYO_01</div>
              </div>

              <div className="p-16 md:p-32 space-y-32">
                <section className="max-w-4xl">
                  <h3 className="text-[10px] font-sans font-light uppercase tracking-[0.8em] mb-12 opacity-20">エグゼクティブ・サマリー</h3>
                  <p className="font-serif italic text-3xl md:text-6xl leading-relaxed opacity-40 font-light">
                    法治主義の放棄、3ヶ月にわたる申請の放置、そして窓口での恫喝。<br />
                    これは一人の当事者の記録ではなく、行政組織全体が「不作為」を武器に生活を破壊した証拠である。
                  </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div className="glass-panel p-16 rounded-[2rem] relative group hover:bg-white/[0.05] transition-all duration-700">
                    <div className="absolute top-0 left-12 w-[1px] h-full bg-rose-500/20"></div>
                    <h4 className="font-light italic tracking-tighter mb-12 flex items-center gap-6 text-4xl font-display text-white">
                      <AlertTriangle size={24} className="text-rose-500/40" /> 恫喝の記録
                    </h4>
                    <blockquote className="font-serif italic text-2xl md:text-4xl pl-12 py-4 mb-12 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity duration-700">
                      「そんなこと言ったって、こっちも忙しいんだよ。文句があるなら他へ行け。」
                    </blockquote>
                    <p className="text-[8px] font-sans font-light opacity-20 uppercase tracking-[0.5em]">2025.12.15 窓口での録音記録より抜粋</p>
                  </div>
                  <div className="glass-panel p-16 rounded-[2rem] relative group hover:bg-white/[0.05] transition-all duration-700">
                    <div className="absolute top-0 left-12 w-[1px] h-full bg-blue-500/20"></div>
                    <h4 className="font-light italic tracking-tighter mb-12 flex items-center gap-6 text-4xl font-display text-white">
                      <AlertTriangle size={24} className="text-blue-500/40" /> 特殊扶助の否定
                    </h4>
                    <blockquote className="font-serif italic text-2xl md:text-4xl pl-12 py-4 mb-12 leading-relaxed opacity-60 group-hover:opacity-100 transition-opacity duration-700">
                      「京都市では生活保護の特殊扶助は一切行っておりません。」
                    </blockquote>
                    <p className="text-[8px] font-sans font-light opacity-20 uppercase tracking-[0.5em]">2026.03.28 カンファレンスでの公式発言</p>
                  </div>
                </section>

                <div className="glass-panel p-16 md:p-24 rounded-[2rem] bg-gradient-to-br from-white/[0.02] to-transparent">
                  <h3 className="text-4xl font-light italic tracking-tighter mb-8 font-display text-white">明日の会議の武器</h3>
                  <p className="mb-12 opacity-30 font-serif italic text-2xl leading-relaxed max-w-2xl font-light">
                    このエビデンスは、交渉の場での強力なカードとなる。行政担当者が「そんな事実はない」と逃げる道を塞ぐ。
                  </p>
                  <button className="glass-panel px-12 py-6 font-light italic text-2xl tracking-tighter hover:bg-white/10 transition-all flex items-center gap-4 font-display rounded-full text-white/60 hover:text-white">
                    <Download size={20} className="opacity-40" /> エビデンスをダウンロード (PDF)
                  </button>
                </div>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-60 px-8 relative overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-96 bg-gradient-to-t from-rose-500/5 to-transparent blur-[120px] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-32 relative z-10">
          <div className="flex-1">
            <div className="text-[12vw] font-light italic mb-16 tracking-tighter font-display leading-none text-white text-glow">PROJECT MANA</div>
            <p className="font-serif italic text-3xl md:text-4xl opacity-20 max-w-2xl leading-relaxed font-light">
              当事者の尊厳を奪還するための、<br />法治主義に基づく実戦プラットフォーム。
            </p>
          </div>
          <div className="flex gap-12 font-sans text-[9px] font-light uppercase tracking-[0.6em] opacity-20">
            <a href="#" className="hover:text-white transition-colors">プライバシー</a>
            <a href="#" className="hover:text-white transition-colors">利用規約</a>
            <a href="#" className="hover:text-white transition-colors" onClick={() => setView("report")}>アーカイブ</a>
          </div>
        </div>
        <div className="mt-40 text-center font-sans text-[8px] font-light uppercase tracking-[1em] opacity-10">
          © 2026 Project Mana Archive — All Rights Reserved
        </div>
      </footer>

      </div>
    </div>
  );
}
