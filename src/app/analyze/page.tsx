"use client";

import {
  useState,
  useRef,
  FormEvent,
  ChangeEvent,
  DragEvent,
  useEffect,
} from "react";
import * as XLSX from "xlsx";
import {
  FileText,
  Upload,
  Download,
  Edit3,
  Save,
  MessageCircle,
  Send,
  Menu,
  X,
  Plus,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Settings,
  User,
} from "lucide-react";

// Interfaces remain the same
interface RopaCell {
  value: string | null;
  source: "initial" | "manual" | "ai";
}

interface RopaData {
  no_aktivitas: RopaCell;
  nama_aktivitas: RopaCell;
  unit_kerja: RopaCell;
  departemen: RopaCell;
  penanggung_jawab: RopaCell;
  kedudukan_pemilik_proses: RopaCell;
  tujuan_pemrosesan: RopaCell;
  kebijakan_rujukan: RopaCell;
  bentuk_data_pribadi: RopaCell;
  subjek_data_pribadi: RopaCell;
  jenis_data_pribadi: RopaCell;
  data_pribadi_spesifik: RopaCell;
  sumber_data: RopaCell;
  penyimpanan_data: RopaCell;
  metode_pemrosesan: RopaCell;
  dasar_pemrosesan: RopaCell;
  masa_retensi: RopaCell;
  langkah_teknis_pengamanan: RopaCell;
  langkah_organisasi_pengamanan: RopaCell;
  kategori_penerima: RopaCell;
  profil_penerima: RopaCell;
  asesmen_risiko: RopaCell;
  proses_sebelumnya: RopaCell;
  proses_setelahnya: RopaCell;
  keterangan_tambahan: RopaCell;
  saran_ai: string;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  results: RopaResult[];
  createdAt: Date;
  lastModified: Date;
}

interface RopaResult extends RopaData {
  fileName: string;
}

const transformApiDataToState = (data: any): RopaData => {
  const transformed: Partial<RopaData> = {};
  const allKeys: (keyof Omit<RopaData, "saran_ai">)[] = [
    "no_aktivitas",
    "nama_aktivitas",
    "unit_kerja",
    "departemen",
    "penanggung_jawab",
    "kedudukan_pemilik_proses",
    "tujuan_pemrosesan",
    "kebijakan_rujukan",
    "bentuk_data_pribadi",
    "subjek_data_pribadi",
    "jenis_data_pribadi",
    "data_pribadi_spesifik",
    "sumber_data",
    "penyimpanan_data",
    "metode_pemrosesan",
    "dasar_pemrosesan",
    "masa_retensi",
    "langkah_teknis_pengamanan",
    "langkah_organisasi_pengamanan",
    "kategori_penerima",
    "profil_penerima",
    "asesmen_risiko",
    "proses_sebelumnya",
    "proses_setelahnya",
    "keterangan_tambahan",
  ];

  allKeys.forEach((key) => {
    transformed[key] = { value: data[key] || null, source: "initial" };
  });
  transformed.saran_ai = data.saran_ai || "";
  return transformed as RopaData;
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export default function RopaAnalyzerPage() {
  // Theme state
  const [isDark, setIsDark] = useState(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Chat sessions
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // Current session data
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<RopaResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Theme toggle
  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Create new chat session
  const createNewSession = () => {
    const newSession: ChatSession = {
      id: generateId(),
      title: `New Analysis ${chatSessions.length + 1}`,
      messages: [],
      results: [],
      createdAt: new Date(),
      lastModified: new Date(),
    };

    setChatSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSession.id);

    // Reset current state
    setFiles([]);
    setResults([]);
    setChatHistory([]);
    setError(null);
    setIsEditMode(false);
  };

  // Switch to existing session
  const switchToSession = (sessionId: string) => {
    const session = chatSessions.find((s) => s.id === sessionId);
    if (!session) return;

    setCurrentSessionId(sessionId);
    setChatHistory(session.messages);
    setResults(session.results);
    setFiles([]);
    setIsEditMode(false);
  };

  // Update current session
  const updateCurrentSession = (updates: Partial<ChatSession>) => {
    if (!currentSessionId) return;

    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === currentSessionId
          ? { ...session, ...updates, lastModified: new Date() }
          : session
      )
    );
  };

  // Delete session
  const deleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));

    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      setFiles([]);
      setResults([]);
      setChatHistory([]);
      setError(null);
    }
  };

  const handleFiles = (selectedFiles: FileList | null) => {
    if (selectedFiles && selectedFiles.length > 0) {
      setFiles(Array.from(selectedFiles));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) =>
    handleFiles(e.target.files);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) {
      setError("Silakan pilih satu atau lebih file terlebih dahulu.");
      return;
    }

    if (!currentSessionId) {
      createNewSession();
    }

    setIsLoading(true);
    setError(null);
    setResults([]);
    setIsEditMode(false);

    try {
      const promises = files.map((file) => {
        const formData = new FormData();
        formData.append("datanya", file);
        return fetch("/api/analyze", {
          method: "POST",
          body: formData,
        })
          .then((response) => {
            if (!response.ok) {
              return response
                .json()
                .then((err) =>
                  Promise.reject({ fileName: file.name, error: err.error })
                );
            }
            return response.json();
          })
          .then((dataArray) => {
            const rawResult = dataArray[0];
            return {
              ...transformApiDataToState(rawResult),
              fileName: file.name,
            };
          });
      });

      const allResults = await Promise.all(promises);
      setResults(allResults);

      // Update session with results
      if (currentSessionId) {
        updateCurrentSession({
          results: allResults,
          title: `Analysis: ${allResults[0]?.fileName || "Files"}`,
        });
      }
    } catch (err: any) {
      setError(
        `Gagal memproses file "${err.fileName}": ${
          err.error || "Terjadi kesalahan tidak diketahui."
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEdit = (
    resultIndex: number,
    fieldName: keyof RopaData,
    newValue: string
  ) => {
    const newResults = [...results];
    if (fieldName in newResults[resultIndex]) {
      const targetCell = newResults[resultIndex][fieldName] as RopaCell;
      if (targetCell) {
        targetCell.value = newValue;
        targetCell.source = "manual";
        setResults(newResults);

        // Update session
        if (currentSessionId) {
          updateCurrentSession({ results: newResults });
        }
      }
    }
  };

  const handleDownloadExcel = () => {
    if (results.length === 0) return;

    const dataToExport = results.map((result) => ({
      "File Asal": result.fileName,
      "No Aktivitas": result.no_aktivitas.value || "N/A",
      "Nama Aktivitas": result.nama_aktivitas.value || "N/A",
      "Unit Kerja / Divisi": result.unit_kerja.value || "N/A",
      "Departemen / Sub-Departemen": result.departemen.value || "N/A",
      "Penanggung Jawab Proses": result.penanggung_jawab.value || "N/A",
      "Kedudukan Pemilik Proses":
        result.kedudukan_pemilik_proses.value || "N/A",
      "Tujuan Pemrosesan": result.tujuan_pemrosesan.value || "N/A",
      "Kebijakan/SOP/IK/Dokumen Rujukan":
        result.kebijakan_rujukan.value || "N/A",
      "Bentuk Data Pribadi": result.bentuk_data_pribadi.value || "N/A",
      "Subjek Data Pribadi": result.subjek_data_pribadi.value || "N/A",
      "Jenis Data Pribadi": result.jenis_data_pribadi.value || "N/A",
      "Data Pribadi Spesifik": result.data_pribadi_spesifik.value || "N/A",
      "Sumber Pemerolehan Data Pribadi": result.sumber_data.value || "N/A",
      "Penyimpanan Data Pribadi": result.penyimpanan_data.value || "N/A",
      "Metode Pemrosesan Data Pribadi": result.metode_pemrosesan.value || "N/A",
      "Dasar Pemrosesan": result.dasar_pemrosesan.value || "N/A",
      "Masa Retensi": result.masa_retensi.value || "N/A",
      "Langkah Teknis Pengamanan Data Pribadi":
        result.langkah_teknis_pengamanan.value || "N/A",
      "Langkah Organisasi Pengamanan Data Pribadi":
        result.langkah_organisasi_pengamanan.value || "N/A",
      "Kategori dan Jenis Penerima Data Pribadi":
        result.kategori_penerima.value || "N/A",
      "Profil Penerima Data Pribadi": result.profil_penerima.value || "N/A",
      "Asesmen Risiko": result.asesmen_risiko.value || "N/A",
      "Proses / Kegiatan Sebelumnya": result.proses_sebelumnya.value || "N/A",
      "Proses / Kegiatan Setelahnya": result.proses_setelahnya.value || "N/A",
      "Keterangan / Catatan Tambahan":
        result.keterangan_tambahan.value || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "RoPA_Data");
    worksheet["!cols"] = Array(26).fill({ wch: 35 });
    XLSX.writeFile(workbook, "Hasil_Analisis_Multi-File.xlsx");
  };

  const handleChatSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!chatInput.trim() || results.length === 0) return;

    const userMessage: ChatMessage = {
      sender: "user",
      text: chatInput,
      timestamp: new Date(),
    };

    const newChatHistory = [...chatHistory, userMessage];
    setChatHistory(newChatHistory);
    setChatInput("");

    try {
      const response = await fetch("/api/brainstorming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: chatInput, context: results }),
      });

      if (!response.ok) throw new Error("Gagal mendapatkan respons dari AI.");

      const res = await response.json();
      const aiMessage: ChatMessage = {
        sender: "ai",
        text: res.answer,
        timestamp: new Date(),
      };

      const finalChatHistory = [...newChatHistory, aiMessage];
      setChatHistory(finalChatHistory);

      // Update session
      if (currentSessionId) {
        updateCurrentSession({ messages: finalChatHistory });
      }

      if (res.updatedData && Array.isArray(res.updatedData)) {
        const newResults = [...results];
        res.updatedData.forEach(
          (update: { fileName: string; field: string; value: string }) => {
            const resultIndex = newResults.findIndex(
              (r) => r.fileName === update.fileName
            );
            if (resultIndex !== -1) {
              const fieldName = update.field as keyof RopaData;
              const targetCell = newResults[resultIndex][fieldName] as RopaCell;
              if (targetCell) {
                targetCell.value = update.value;
                targetCell.source = "ai";
              }
            }
          }
        );
        setResults(newResults);

        if (currentSessionId) {
          updateCurrentSession({ results: newResults });
        }
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        sender: "ai",
        text: `Maaf, terjadi kesalahan: ${err.message}`,
        timestamp: new Date(),
      };
      setChatHistory((prev) => [...prev, errorMessage]);
    }
  };

  const tableFields: (keyof Omit<RopaData, "saran_ai">)[] = [
    "no_aktivitas",
    "nama_aktivitas",
    "unit_kerja",
    "departemen",
    "penanggung_jawab",
    "kedudukan_pemilik_proses",
    "tujuan_pemrosesan",
    "kebijakan_rujukan",
    "bentuk_data_pribadi",
    "subjek_data_pribadi",
    "jenis_data_pribadi",
    "data_pribadi_spesifik",
    "sumber_data",
    "penyimpanan_data",
    "metode_pemrosesan",
    "dasar_pemrosesan",
    "masa_retensi",
    "langkah_teknis_pengamanan",
    "langkah_organisasi_pengamanan",
    "kategori_penerima",
    "profil_penerima",
    "asesmen_risiko",
    "proses_sebelumnya",
    "proses_setelahnya",
    "keterangan_tambahan",
  ];

  const formatFieldName = (field: string) => {
    return field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
        {/* Sidebar */}
        <div
          className={`${
            sidebarOpen ? (sidebarCollapsed ? "w-16" : "w-80") : "w-0"
          } bg-white dark:bg-gray-800 border-r border-border dark:border-gray-700 transition-all duration-300 flex flex-col overflow-hidden`}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-border dark:border-gray-700">
            {!sidebarCollapsed && (
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                RoPA Sessions
              </h2>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                {sidebarCollapsed ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )}
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button
              onClick={createNewSession}
              className={`w-full flex items-center gap-3 p-3 rounded-lg bg-primary hover:bg-blue-700 text-primary-foreground transition-colors ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              <Plus size={16} />
              {!sidebarCollapsed && <span>New Analysis</span>}
            </button>
          </div>

          {/* Chat Sessions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => switchToSession(session.id)}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentSessionId === session.id
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <FileText size={16} className="flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {session.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 transition-all"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Sidebar Footer */}
          <div className="border-t border-border dark:border-gray-700 p-4 space-y-2">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors ${
                sidebarCollapsed ? "justify-center" : ""
              }`}
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              {!sidebarCollapsed && (
                <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
              )}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    RoPA AI Analyzer
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload and analyze your documents with AI assistance
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-8">
              {/* File Upload Section */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                      isDragging
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/png, image/jpeg, application/pdf"
                      multiple
                    />
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
                      {files.length > 0
                        ? `${files.length} file(s) selected`
                        : "Click or drag files here"}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Support PNG, JPEG, PDF files
                    </p>
                    {files.length > 0 && (
                      <div className="mt-4 space-y-1">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-3 py-1 inline-block mr-2 mb-2"
                          >
                            {file.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || files.length === 0}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-colors"
                  >
                    <FileText size={16} />
                    {isLoading
                      ? `Processing ${files.length} file(s)...`
                      : "Analyze Documents"}
                  </button>
                </form>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}
              </div>

              {/* Results Section */}
              {results.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-6 space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      Analysis Results
                    </h2>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-primary-foreground transition-colors ${
                          isEditMode
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-primary hover:bg-blue-700"
                        }`}
                      >
                        {isEditMode ? <Save size={16} /> : <Edit3 size={16} />}
                        {isEditMode ? "Save Changes" : "Edit Data"}
                      </button>
                      <button
                        onClick={handleDownloadExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-800 text-primary-foreground font-semibold rounded-lg transition-colors"
                      >
                        <Download size={16} />
                        Export Excel
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white dark:bg-gray-800 text-sm border border-border dark:border-gray-700 rounded-lg">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-border dark:border-gray-600">
                            Source File
                          </th>
                          {tableFields.map((field) => (
                            <th
                              key={field}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-border dark:border-gray-600 last:border-r-0"
                            >
                              {formatFieldName(field)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {results.map((result, resultIndex) => (
                          <tr
                            key={resultIndex}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100 border-r border-border dark:border-gray-600">
                              <div className="flex items-center gap-2">
                                <FileText size={14} className="text-gray-500" />
                                <span className="truncate max-w-32">
                                  {result.fileName}
                                </span>
                              </div>
                            </td>
                            {tableFields.map((fieldName) => {
                              const cell = result[fieldName];
                              if (!cell)
                                return (
                                  <td
                                    key={fieldName}
                                    className="p-4 bg-red-50 dark:bg-red-900/20 border-r border-border dark:border-gray-600 last:border-r-0"
                                  >
                                    <span className="text-red-500">Error</span>
                                  </td>
                                );

                              const bgColor =
                                cell.source === "manual"
                                  ? "bg-edit-manual-bg dark:bg-green-900/20"
                                  : cell.source === "ai"
                                  ? "bg-edit-ai-bg dark:bg-blue-900/20"
                                  : "bg-transparent";

                              const ringColor =
                                cell.source === "manual"
                                  ? "focus:ring-green-500"
                                  : cell.source === "ai"
                                  ? "focus:ring-blue-500"
                                  : "focus:ring-gray-500";

                              return (
                                <td
                                  key={fieldName}
                                  className="p-0 border-r border-border dark:border-gray-600 last:border-r-0"
                                >
                                  {isEditMode ? (
                                    <input
                                      type="text"
                                      value={cell.value || ""}
                                      onChange={(e) =>
                                        handleManualEdit(
                                          resultIndex,
                                          fieldName,
                                          e.target.value
                                        )
                                      }
                                      className={`w-full h-full p-4 border-none outline-none focus:ring-2 ${ringColor} transition-colors text-gray-700 dark:text-gray-200 ${bgColor} dark:bg-opacity-50`}
                                    />
                                  ) : (
                                    <div
                                      className={`px-4 py-4 w-full h-full ${bgColor} dark:bg-opacity-50`}
                                    >
                                      {cell.value || (
                                        <span className="text-red-500 dark:text-red-400 italic">
                                          N/A
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* AI Suggestions */}
                  <div className="space-y-4">
                    {results.map((result, index) =>
                      result.saran_ai ? (
                        <div
                          key={index}
                          className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-400 dark:border-amber-500 rounded-r-lg"
                        >
                          <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-2">
                            AI Suggestion for{" "}
                            <span className="font-mono text-sm bg-amber-100 dark:bg-amber-800/50 px-2 py-1 rounded">
                              {result.fileName}
                            </span>
                          </h4>
                          <p className="text-sm text-amber-700 dark:text-amber-200">
                            {result.saran_ai}
                          </p>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Chat Section */}
              {results.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <MessageCircle
                      className="text-blue-600 dark:text-blue-400"
                      size={20}
                    />
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      AI Assistant
                    </h3>
                  </div>

                  {/* Chat Messages */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-border dark:border-gray-700 h-80 overflow-y-auto p-4 mb-4 space-y-4">
                    {chatHistory.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                          <MessageCircle
                            size={48}
                            className="mx-auto mb-4 opacity-50"
                          />
                          <p>Start a conversation about your data analysis</p>
                        </div>
                      </div>
                    ) : (
                      chatHistory.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex ${
                            msg.sender === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                              msg.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border border-border dark:border-gray-600"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">
                              {msg.text}
                            </p>
                            <p
                              className={`text-xs mt-2 opacity-70 ${
                                msg.sender === "user"
                                  ? "text-blue-100"
                                  : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {msg.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <form onSubmit={handleChatSubmit} className="flex gap-3">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask something about your data analysis..."
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                      disabled={results.length === 0}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || results.length === 0}
                      className="px-6 py-3 bg-primary hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-primary-foreground font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Send size={16} />
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* Legend */}
              {results.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border dark:border-gray-700 p-4">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Data Source Legend:
                  </h4>
                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Manual Edit
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        AI Updated
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">
                        Original
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
