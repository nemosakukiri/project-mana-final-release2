/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
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
  Download
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

type View = "home" | "report" | "case_ukyo" | "news";

const NewsItem = ({ date, title, source, category, url }: { date: string; title: string; source: string; category: string; url?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="group py-12 border-b border-black/10 hover:bg-white transition-all cursor-pointer px-4"
  >
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-4">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.5em] text-[#C41E3A]">{category}</span>
          <span className="w-1 h-1 bg-black/20 rounded-full"></span>
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.5em] opacity-40">{date}</span>
        </div>
        <h3 className="text-4xl md:text-6xl font-black italic tracking-tighter leading-[0.85] group-hover:text-[#C41E3A] transition-colors font-display">
          {title}
        </h3>
      </div>
      <div className="text-right flex flex-col items-end gap-2">
        <span className="font-serif italic text-2xl opacity-40 group-hover:opacity-100 transition-opacity">Source: {source}</span>
        {url && (
          <span className="font-sans text-[8px] font-bold uppercase tracking-[0.2em] opacity-20 group-hover:opacity-60 transition-opacity truncate max-w-[200px]">
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
    whileHover={{ y: -8 }}
    onClick={onClick}
    className="group border border-black/10 p-10 bg-white hover:border-[#C41E3A] transition-all cursor-pointer flex flex-col justify-between h-full shadow-sm hover:shadow-2xl relative overflow-hidden"
  >
    <div className="absolute top-0 right-0 p-4 opacity-5 font-mono text-4xl font-black">{tag.split(' ')[0]}</div>
    <div>
      <div className="flex justify-between items-start mb-8">
        <div className="p-3 bg-[#1A1A1A] text-white group-hover:bg-[#C41E3A] transition-colors">
          <Icon size={24} />
        </div>
        <span className="text-[10px] font-sans font-bold uppercase tracking-[0.3em] opacity-40">{tag}</span>
      </div>
      <h3 className="text-4xl font-black mb-4 italic tracking-tighter font-display leading-none">{title}</h3>
      <p className="text-xl font-serif italic opacity-70 leading-relaxed">{description}</p>
    </div>
    <div className="mt-12 flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.3em] group-hover:text-[#C41E3A] transition-colors">
      View Archive <ArrowRight size={12} />
    </div>
  </motion.div>
);

export default function App() {
  const [view, setView] = useState<View>("home");
  const [reportText, setReportText] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const [newsCount, setNewsCount] = useState(8);

  const allNews = [
    { date: "2026.03.28", title: "某自治体職員、生活保護費1,200万円を着服。組織的な隠蔽工作か", source: "Internal Archive", url: "https://mana-archive.org/reports/2026/embezzlement-01", category: "SCANDAL", content: "某自治体の福祉事務所において、担当職員が受給者の生活保護費を長期間にわたり着服していたことが判明した。内部監査の目をかいくぐるための虚偽の書類作成が行われており、組織的な管理体制の不備が指摘されている。" },
    { date: "2026.03.27", title: "行政幹部による収賄容疑、福祉施設選定を巡る不正が発覚", source: "Evidence Archive", url: "https://mana-archive.org/evidence/bribery-case-2026", category: "SCANDAL", content: "福祉施設の指定管理者の選定において、行政幹部が特定の業者から多額の現金を受け取っていた疑いで逮捕された。選定基準の恣意的な変更や、非公開情報の漏洩が行われていた実態が浮き彫りになった。" },
    { date: "2026.03.26", title: "個人情報数万件が流出、行政委託先のセキュリティ管理に重大な欠陥", source: "Legal Records", url: "https://mana-archive.org/reports/2026/data-leak", category: "SCANDAL", content: "住民基本台帳を含む数万件の個人情報が、行政の委託先企業から流出した。パスワードの不適切な管理や、アクセスログの未取得など、基本的なセキュリティ対策が放置されていたことが原因とされる。" },
    { date: "2026.03.25", title: "公文書偽造による予算不正受給、複数の部署で常態化の疑い", source: "Data Analysis", url: "https://mana-archive.org/data/document-falsification", category: "SCANDAL", content: "国からの補助金を受け取るために、実績を水増しした公文書を偽造していた実態が明らかになった。複数の部署で同様の手法が共有されており、行政組織全体の倫理観が問われる事態となっている。" },
    { date: "2026.03.24", title: "窓口での恫喝対応、録音データにより不適切な発言が発覚", source: "Evidence Archive", url: "https://mana-archive.org/evidence/ukyo-audio-transcript-20251215", category: "INACTION_RECORD", content: "某自治体の福祉事務所において、相談者に対して『文句があるなら他へ行け』『お前の代わりはいくらでもいる』といった恫喝に近い発言があったことが、提出された録音データにより確認された。" },
    { date: "2026.03.23", title: "生活保護申請の「水際作戦」が常態化、全国30自治体で調査", source: "Internal Archive", url: "https://mana-archive.org/reports/2026/national-survey-01", category: "INACTION_RECORD", content: "全国30以上の自治体において、生活保護の申請を窓口で事実上拒否する「水際作戦」が組織的に行われている疑いがあることが、当アーカイブの独自調査で判明した。" },
    { date: "2026.03.22", title: "行政不作為による損害賠償請求、地裁が原告の訴えを一部認める", source: "Legal Records", url: "https://courts.go.jp/app/hanrei_jp/detail?id=89214", category: "INACTION_RECORD", content: "申請から3ヶ月以上にわたり決定を放置した行政の対応について、地方裁判所は『著しく合理性を欠く不作為』として、原告への損害賠償を命じる判決を下した。" },
    { date: "2026.03.21", title: "特殊扶助の運用実態、自治体間で大きな格差が判明", source: "Data Analysis", url: "https://mana-archive.org/data/welfare-disparity-2026", category: "INACTION_RECORD", content: "生活保護法に基づく特殊扶助の支給実績を調査した結果、自治体によって支給率に数十倍の開きがあることが明らかになった。" },
  ];

  const handleAnalyze = async () => {
    if (!reportText) return;
    setIsAnalyzing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `以下の窓口対応の記録を「法的精査（Legal Scrutiny）」の観点から分析してください。
行政手続法、生活保護法、地方自治法、および過去の判例（水際作戦の違法性判決など）に基づき、どの点が不作為や不当な対応に該当するかを特定してください。
また、当事者が行政に対して主張すべき法的な論点を簡潔に提示してください。

記録内容:
${reportText}`,
        config: {
          systemInstruction: "あなたは行政法と社会福祉法に精通した法的精査の専門家です。窓口での不作為を法律に基づいて厳格に分析し、当事者の権利を守るための論理的なアドバイスを提供してください。",
        }
      });
      setAnalysis(response.text || "分析結果を取得できませんでした。");
    } catch (error) {
      console.error(error);
      setAnalysis("エラーが発生しました。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] font-sans selection:bg-[#C41E3A] selection:text-white">
      <style>{`
        .bg-grid {
          background-image: radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .text-outline {
          -webkit-text-stroke: 1px #1A1A1A;
          color: transparent;
        }
      `}</style>
      <div className="bg-grid min-h-screen">
        {/* Header / Marquee */}
        <div className="bg-[#1A1A1A] text-white py-3 overflow-hidden whitespace-nowrap sticky top-0 z-50">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-12 text-[10px] font-sans uppercase tracking-[0.5em] font-bold"
          >
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
            <span>Project Mana — misconduct-db- — FUSAKUI-DB — Evidence Archive</span>
          </motion.div>
        </div>

      <AnimatePresence mode="wait">
        {view === "home" && (
          <motion.main 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="max-w-7xl mx-auto px-4 py-12 md:py-24"
          >
            {/* Hero Section */}
            <section className="mb-24">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-end">
                <div>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="inline-block bg-[#C41E3A] text-white px-4 py-1 text-[10px] font-sans font-bold uppercase tracking-[0.3em] mb-8"
                  >
                    STATUS: ACTIVE_RECLAMATION
                  </motion.div>
                  <motion.h1 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-8xl md:text-[14rem] font-black leading-[0.75] italic tracking-tighter mb-12 font-display"
                  >
                    <span className="font-serif italic text-4xl md:text-7xl block mb-6 normal-case tracking-normal opacity-20">Operation</span>
                    尊厳の<br />
                    <span className="text-[#C41E3A]">奪還</span>作戦
                  </motion.h1>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-2xl md:text-4xl font-serif italic max-w-xl leading-relaxed opacity-60 mb-12"
                  >
                    当事者の暮らし方は、当事者が選ぶ。<br />
                    行政の不作為を記録し、逃げ場のない事実を突きつける。
                  </motion.p>
                </div>
                
                <div className="border border-black/10 p-12 bg-white shadow-2xl relative">
                  <div className="absolute -top-4 -left-4 bg-[#C41E3A] text-white p-4 shadow-lg">
                    <ShieldAlert size={32} />
                  </div>
                  <div className="mt-4">
                    <h2 className="text-5xl font-black italic tracking-tighter mb-6 font-display">FUSAKUI-DB 法的精査</h2>
                    <p className="font-serif italic text-xl mb-10 opacity-60 leading-relaxed">
                      窓口での申請拒絶、水際作戦、恫喝。AIが法的な観点から不作為を自動精査し、交渉の武器を生成します。
                    </p>
                    <button 
                      onClick={() => setView("report")}
                      className="w-full bg-[#1A1A1A] text-white py-6 font-black text-2xl uppercase tracking-tighter hover:bg-[#C41E3A] transition-all flex items-center justify-center gap-4 font-display group"
                    >
                      精査を開始する <ArrowRight className="group-hover:translate-x-2 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats / Contrast Section */}
            <section className="mb-32 grid grid-cols-1 md:grid-cols-2 gap-0 border border-black/10 shadow-2xl overflow-hidden">
              <div className="p-20 bg-white border-b md:border-b-0 md:border-r border-black/10">
                <div className="flex items-center gap-3 mb-8 font-mono font-bold uppercase text-[10px] tracking-[0.3em] opacity-40">
                  <Coins size={16} /> 行政の貯金
                </div>
                <div className="text-9xl md:text-[13rem] font-black tracking-tighter mb-6 font-display leading-none">180 <span className="text-2xl md:text-4xl align-top mt-4 inline-block font-serif italic">億円</span></div>
                <p className="text-2xl font-serif italic opacity-50">不作為によって積み上げられた、不当な黒字。</p>
              </div>
              <div className="p-20 bg-[#1A1A1A] text-white">
                <div className="flex items-center gap-3 mb-8 font-mono font-bold uppercase text-[10px] tracking-[0.3em] text-[#C41E3A]">
                  <Scale size={16} /> 当事者の権利
                </div>
                <div className="text-9xl md:text-[13rem] font-black tracking-tighter mb-6 font-display leading-none text-[#C41E3A]">1 <span className="text-2xl md:text-4xl align-top mt-4 inline-block font-serif italic text-white/40">円</span></div>
                <p className="text-2xl font-serif italic opacity-40">搾取され、生活を破壊された「私」の現実。</p>
              </div>
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="max-w-4xl mx-auto px-4 py-12"
          >
            <button 
              onClick={() => setView("home")}
              className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.3em] mb-8 hover:text-[#C41E3A] transition-colors"
            >
              <ChevronLeft size={14} /> Back to Dashboard
            </button>

            <div className="border border-black/10 bg-white p-12 md:p-24 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#C41E3A]/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <h2 className="text-7xl md:text-9xl font-black italic tracking-tighter mb-12 font-display">FUSAKUI-DB 法的精査</h2>
              
              <div className="space-y-12 relative z-10">
                <div>
                  <label className="block font-sans text-[10px] font-bold uppercase mb-4 tracking-[0.5em] opacity-30">窓口対応の記録（日時、場所、担当者の発言、拒絶の理由など）</label>
                  <textarea 
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="例：2026年3月10日、〇〇福祉事務所にて生活保護の申請を求めたが、『住所がないと無理』『まずはハローワークへ行け』と言われ、申請書の受取を拒否された..."
                    className="w-full h-96 border border-black/10 p-10 font-serif italic text-3xl focus:outline-none focus:border-[#C41E3A] focus:bg-[#FAF9F6] transition-all resize-none shadow-inner leading-relaxed"
                  />
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !reportText}
                    className="flex-2 bg-[#C41E3A] text-white py-8 px-12 font-black italic text-3xl tracking-tighter hover:bg-[#1A1A1A] transition-all flex items-center justify-center gap-4 font-display group"
                  >
                    {isAnalyzing ? "精査中..." : <><Sparkles /> AIで法的精査を実行</>}
                  </button>
                  <button className="flex-1 border border-black/20 py-8 font-black italic text-3xl tracking-tighter hover:bg-[#1A1A1A] hover:text-white transition-all flex items-center justify-center gap-4 font-display">
                    <Send size={20} /> 精査結果を保存
                  </button>
                </div>
              </div>

              {analysis && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-12 border-4 border-[#C41E3A] p-12 bg-[#FAF9F6]"
                >
                  <div className="flex items-center gap-2 text-[#C41E3A] font-black italic text-2xl mb-8 font-display">
                    <Sparkles size={24} /> 法的精査レポート
                  </div>
                  <div className="prose prose-2xl max-w-none font-serif italic leading-relaxed whitespace-pre-wrap opacity-90">
                    {analysis}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.main>
        )}

        {view === "news" && (
          <motion.main 
            key="news"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen bg-white"
          >
            <div className="max-w-7xl mx-auto px-4 py-12">
              <div className="flex justify-between items-center mb-16">
                <button 
                  onClick={() => setView("home")}
                  className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.3em] hover:text-[#C41E3A] transition-colors"
                >
                  <ChevronLeft size={14} /> Back to Archive
                </button>
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.5em] opacity-30">Archive No. 2026-N-001</div>
              </div>

              <div className="mb-32">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-8">
                    <h2 className="text-[10vw] md:text-[14vw] font-black italic tracking-tighter leading-[0.75] font-display mb-8">
                      misconduct-db-<br /><span className="text-[#C41E3A]">ARCHIVE</span>
                    </h2>
                  </div>
                  <div className="lg:col-span-4 border-l border-black/10 pl-12 py-4">
                    <p className="font-serif italic text-3xl md:text-4xl opacity-60 leading-relaxed mb-8">
                      公務員・行政機関による不祥事、不正行為、不当な権利侵害を「事実のみ」で集積。<br />
                      権力の腐敗を監視し、透明性を要求するためのアーカイブ。
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-sans font-bold uppercase tracking-[0.3em]">
                      <span className="text-[#C41E3A]">● LIVE UPDATE</span>
                      <span className="opacity-30">Updated 14:47 UTC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Featured News */}
              <div className="mb-32">
                <div className="border border-black p-1 bg-[#1A1A1A] text-white overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-12 md:p-20 border-b md:border-b-0 md:border-r border-white/10">
                      <span className="inline-block bg-[#C41E3A] text-white px-4 py-1 text-[10px] font-sans font-bold uppercase tracking-[0.5em] mb-8">Major Scandal Archive</span>
                      <h3 className="text-5xl md:text-8xl font-black italic tracking-tighter leading-[0.85] mb-8 font-display">
                        生活保護費<br />1,200万円を<br />職員が着服
                      </h3>
                      <p className="font-serif italic text-2xl opacity-60 leading-relaxed mb-12">
                        某自治体の福祉事務所において、担当職員が受給者の生活保護費を長期間にわたり着服していたことが判明。組織的な隠蔽工作の実態を独自入手した内部資料から暴く。
                      </p>
                      <button className="flex items-center gap-3 font-sans text-[10px] font-bold uppercase tracking-[0.3em] hover:text-[#C41E3A] transition-colors">
                        Read Full Evidence <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="bg-[#FAF9F6] p-12 md:p-20 flex flex-col justify-center">
                      <div className="space-y-12">
                        {[
                          { date: "MAR 27", title: "行政幹部による収賄容疑" },
                          { date: "MAR 26", title: "個人情報数万件の流出事件" },
                          { date: "MAR 25", title: "公文書偽造による予算不正受給" },
                        ].map((item, i) => (
                          <div key={i} className="group cursor-pointer">
                            <div className="font-sans text-[10px] font-bold text-[#C41E3A] uppercase tracking-[0.3em] mb-2">{item.date}</div>
                            <h4 className="text-3xl font-black italic tracking-tighter group-hover:underline font-display text-black leading-none">{item.title}</h4>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-black/10">
                {allNews.slice(0, newsCount).map((news, i) => (
                  <div key={i} onClick={() => setSelectedNews(news)}>
                    <NewsItem {...news} />
                  </div>
                ))}
              </div>

              {newsCount < allNews.length && (
                <div className="mt-24 flex justify-center">
                  <button 
                    onClick={() => setNewsCount(prev => prev + 4)}
                    className="group border-2 border-black px-16 py-8 font-black italic text-4xl tracking-tighter hover:bg-black hover:text-white transition-all font-display flex items-center gap-6"
                  >
                    Load More Evidence <ArrowRight className="group-hover:translate-x-4 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            {/* News Detail Modal */}
            <AnimatePresence>
              {selectedNews && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-white overflow-y-auto"
                >
                  <div className="max-w-4xl mx-auto px-4 py-24">
                    <button 
                      onClick={() => setSelectedNews(null)}
                      className="fixed top-8 right-8 p-4 bg-black text-white hover:bg-[#C41E3A] transition-colors"
                    >
                      <X size={24} />
                    </button>

                    <div className="mb-16">
                        <div className="flex items-center gap-4 mb-8">
                          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.5em] text-[#C41E3A]">{selectedNews.category}</span>
                          <span className="opacity-30 font-sans text-[10px] font-bold uppercase tracking-[0.5em]">{selectedNews.date}</span>
                        </div>
                        <h2 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-[0.85] font-display mb-12">
                          {selectedNews.title}
                        </h2>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                          <div className="flex items-center gap-2 font-serif italic text-3xl opacity-40">
                            Source: {selectedNews.source}
                          </div>
                          {selectedNews.url && (
                            <a 
                              href={selectedNews.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.3em] text-[#C41E3A] hover:underline"
                            >
                              Visit Source <ArrowRight size={14} />
                            </a>
                          )}
                        </div>
                    </div>

                    <div className="prose prose-2xl max-w-none font-serif italic leading-relaxed opacity-90 border-t border-black/10 pt-16">
                      <p className="mb-12 text-3xl md:text-4xl leading-relaxed">
                        {selectedNews.content}
                      </p>
                      <div className="h-32 bg-gradient-to-b from-transparent to-[#FAF9F6]/10 mb-12"></div>
                      <p className="text-[10px] font-sans font-bold opacity-40 uppercase tracking-[0.5em]">
                        End of Record — Verified by Project Mana Archive
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.main>
        )}

        {view === "case_ukyo" && (
          <motion.main 
            key="case_ukyo"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="max-w-5xl mx-auto px-4 py-12"
          >
            <button 
              onClick={() => setView("home")}
              className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.3em] mb-8 hover:text-[#C41E3A] transition-colors"
            >
              <ChevronLeft size={14} /> Back to Dashboard
            </button>

            <div className="bg-white border border-black/10 shadow-2xl overflow-hidden relative">
              <div className="bg-[#1A1A1A] text-white p-12 flex justify-between items-center">
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter font-display">実戦エビデンス：右京区の不作為</h2>
                <div className="bg-[#C41E3A] text-white px-6 py-2 text-[10px] font-sans font-bold uppercase tracking-[0.5em]">CASE_ID: UKYO_01</div>
              </div>

              <div className="p-12 md:p-32 space-y-24">
                <section className="max-w-4xl">
                  <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-8 border-b border-black/10 pb-6 font-display">概要</h3>
                  <p className="font-serif italic text-3xl md:text-5xl leading-relaxed opacity-90">
                    法治主義の放棄、3ヶ月にわたる申請の放置、そして窓口での恫喝。
                    これは一人の当事者の記録ではなく、行政組織全体が「不作為」を武器に生活を破壊した証拠である。
                  </p>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div className="border border-black/5 p-12 bg-[#FAF9F6] relative">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#C41E3A]"></div>
                    <h4 className="font-black italic tracking-tighter mb-8 flex items-center gap-4 text-4xl font-display">
                      <AlertTriangle size={28} className="text-[#C41E3A]" /> 恫喝の記録
                    </h4>
                    <blockquote className="font-serif italic font-bold text-2xl md:text-4xl pl-8 py-4 mb-8 leading-relaxed opacity-90">
                      「そんなこと言ったって、こっちも忙しいんだよ。文句があるなら他へ行け。」
                    </blockquote>
                    <p className="text-[10px] font-sans font-bold opacity-30 uppercase tracking-[0.5em]">2025.12.15 窓口での録音記録より抜粋</p>
                  </div>
                  <div className="border border-black/5 p-12 bg-[#FAF9F6] relative">
                    <div className="absolute top-0 left-0 w-2 h-full bg-[#C41E3A]"></div>
                    <h4 className="font-black italic tracking-tighter mb-8 flex items-center gap-4 text-4xl font-display">
                      <AlertTriangle size={28} className="text-[#C41E3A]" /> 特殊扶助の否定
                    </h4>
                    <blockquote className="font-serif italic font-bold text-2xl md:text-4xl pl-8 py-4 mb-8 leading-relaxed opacity-90">
                      「京都市では生活保護の特殊扶助は一切行っておりません。」
                    </blockquote>
                    <p className="text-[10px] font-sans font-bold opacity-30 uppercase tracking-[0.5em]">2026.03.28 カンファレンスでの公式発言</p>
                  </div>
                </section>

                <div className="bg-black text-white p-12">
                  <h3 className="text-3xl md:text-4xl font-black italic tracking-tighter mb-6 font-display">明日の会議の武器</h3>
                  <p className="mb-8 opacity-80 font-serif italic text-xl">
                    このエビデンスは、交渉の場での強力なカードとなる。行政担当者が「そんな事実はない」と逃げる道を塞ぐ。
                  </p>
                  <button className="bg-white text-black px-8 py-4 font-black italic text-xl hover:bg-[#C41E3A] hover:text-white transition-all flex items-center gap-2 font-display">
                    <Download size={18} /> エビデンスをダウンロード (PDF)
                  </button>
                </div>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#1A1A1A] text-white py-48 px-4 border-t-[32px] border-[#C41E3A] mt-48">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-24">
          <div>
            <div className="text-9xl font-black italic mb-12 tracking-tighter font-display">PROJECT MANA</div>
            <p className="font-serif italic text-3xl opacity-30 max-w-xl leading-relaxed">
              当事者の尊厳を奪還するための、法治主義に基づく実戦プラットフォーム。
            </p>
          </div>
          <div className="flex gap-8 font-sans text-[10px] font-bold uppercase tracking-[0.3em]">
            <a href="#" className="hover:text-[#C41E3A]">Privacy</a>
            <a href="#" className="hover:text-[#C41E3A]">Terms</a>
            <a href="#" className="hover:text-[#C41E3A]">Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        .text-outline-black {
          -webkit-text-stroke: 2px black;
        }
        .bg-grid {
          background-image: radial-gradient(rgba(0,0,0,0.05) 1px, transparent 1px);
          background-size: 32px 32px;
        }
        @media (max-width: 768px) {
          .text-outline-black {
            -webkit-text-stroke: 1px black;
          }
        }
      `}</style>
      </div>
    </div>
  );
}
